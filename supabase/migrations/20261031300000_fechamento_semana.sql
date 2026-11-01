-- Fechamento da semana gravado (docs/jogo.md, seção 5, "Fechamento da semana"): a classificação final
-- de cada semana, base da Série única, da Série A e B, da Galeria e das 52 semanas. Só acrescenta:
-- nenhuma coluna ou tabela é apagada ou renomeada.
--
-- Grava em duas etapas, porque jogo de domingo à noite só tem placar confirmado depois da virada:
--   segunda 00h05: copia ranking_semana como provisória, pontos do Crava ainda podem entrar;
--   segunda 12h:   copia de novo e trava (confirmada_em). A partir daí a semana não muda mais.
-- ranking_semana continua sendo a conta (com pontos_apagados e o teto), recalculada a cada evento;
-- esta tabela é só a cópia dela. Nenhuma linha guarda quem jogou: só torcidas.

-- ---------------------------------------------------------------------------
-- 1. Tabela. Zera junto com a pré-temporada (scripts/zerar-pre-temporada.sql).
-- ---------------------------------------------------------------------------
create table public.fechamento_semana (
  semana date not null,
  time_id text not null references public.times (id),
  ativos integer not null,
  soma integer not null,
  media30 numeric(10, 2) not null,
  chegou_em timestamptz,
  posicao_campeao smallint not null,
  posicao_soma smallint not null,
  gravado_em timestamptz not null,
  -- Vazio = provisória. Preenchido na segunda 12h e nunca mais mexido.
  confirmada_em timestamptz,
  primary key (semana, time_id)
);

alter table public.fechamento_semana enable row level security;
create policy "fechamento_semana: leitura para todos" on public.fechamento_semana
  for select to anon, authenticated using (true);
-- Sem política de escrita: só fechar_semana grava.

revoke all on public.fechamento_semana from anon, authenticated;
grant select on public.fechamento_semana to anon, authenticated;
grant all on public.fechamento_semana to service_role;

-- A semana já foi travada pelo fechamento. Quem decide é este registro, não o relógio de quem chama.
create or replace function public.semana_travada(p_semana date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.fechamento_semana f where f.semana = p_semana and f.confirmada_em is not null
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Ranking: igual ao de 20261031100200_apagar_meus_dados.sql, com duas mudanças:
--    semana travada não recalcula (semana fechada não reabre) e o empate entre torcidas sem ninguém
--    sai pela posição na semana anterior (na primeira, pela ordem da tabela: seção 5, "A temporada").
-- ---------------------------------------------------------------------------
create or replace function public.recalcular_ranking(p_semana date)
returns void
language sql
security definer
set search_path = ''
as $$
  with totais as (
    select t.* from public.totais_semana(p_semana) t
    join public.times tm on tm.id = t.time_id and tm.oficial
    union all
    select a.id, a.time_id, a.total, a.ultima from public.pontos_apagados a
    join public.times tm on tm.id = a.time_id and tm.oficial
    where a.semana = p_semana
  ),
  geral as (
    select coalesce(avg(total), 0) as media from totais
  ),
  ordenados as (
    select o.*, row_number() over (partition by o.time_id order by o.total desc, o.ultima asc) as n
    from totais o
  ),
  por_time as (
    select
      t.id as time_id,
      count(o.torcedor_id)::integer as ativos,
      coalesce(sum(o.total), 0)::integer as soma,
      coalesce(sum(o.total) filter (where o.n <= 30), 0) as soma30,
      count(o.torcedor_id) filter (where o.n <= 30) as n30,
      max(o.ultima) as chegou_em
    from public.times t
    left join ordenados o on o.time_id = t.id
    where t.oficial
    group by t.id
  ),
  calc as (
    select pt.*,
      case when pt.ativos = 0 then 0
           else (pt.soma30 + (30 - pt.n30) * 0.8 * g.media) / 30 end as media30
    from por_time pt cross join geral g
  )
  insert into public.ranking_semana as r
    (semana, time_id, ativos, soma, media30, chegou_em, posicao_campeao, posicao_soma, atualizado_em)
  select
    p_semana, c.time_id, c.ativos, c.soma, round(c.media30, 2), c.chegou_em,
    row_number() over (order by round(c.media30, 2) desc, c.chegou_em asc nulls last, a.posicao_campeao asc nulls last, c.time_id),
    row_number() over (order by c.soma desc, c.chegou_em asc nulls last, c.time_id),
    now()
  from calc c
  left join public.fechamento_semana a on a.semana = p_semana - 7 and a.time_id = c.time_id
  where not public.semana_travada(p_semana)
  on conflict (semana, time_id) do update set
    ativos = excluded.ativos,
    soma = excluded.soma,
    media30 = excluded.media30,
    chegou_em = excluded.chegou_em,
    posicao_campeao = excluded.posicao_campeao,
    posicao_soma = excluded.posicao_soma,
    atualizado_em = excluded.atualizado_em;
$$;

-- ---------------------------------------------------------------------------
-- 3. Crava: igual ao de 20261019200000_crava.sql, mas ponto calculado para uma semana que acabou de
--    travar (o placar saiu da função antes das 12h e chegou aqui depois) vai para a semana atual,
--    como placar confirmado depois da hora. Sem isso, ele ficaria fora do ranking das torcidas.
-- ---------------------------------------------------------------------------
create or replace function public.aplicar_pontos_crava(p_rodada smallint, p_alvos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semana date;
  v_semanas date[];
  v_gravados integer;
  v_semana_atual date := date_trunc('week', now() at time zone 'America/Sao_Paulo')::date;
begin
  perform pg_advisory_xact_lock(hashtext('crava_rodada'), p_rodada);

  with alvo as (
    select (a ->> 'torcedorId')::uuid as torcedor_id, (a ->> 'jogoId')::uuid as jogo_id,
           (a ->> 'pontos')::integer as pontos,
           case when public.semana_travada((a ->> 'semana')::date) then v_semana_atual
                else (a ->> 'semana')::date end as semana
    from jsonb_array_elements(p_alvos) a
  ),
  atual as (
    select c.torcedor_id, c.jogo_id, sum(c.pontos)::integer as pontos
    from public.crava_pontos c
    where c.rodada = p_rodada
    group by c.torcedor_id, c.jogo_id
  ),
  dif as (
    select coalesce(alvo.torcedor_id, atual.torcedor_id) as torcedor_id,
           coalesce(alvo.jogo_id, atual.jogo_id) as jogo_id,
           coalesce(alvo.pontos, 0) - coalesce(atual.pontos, 0) as pontos,
           coalesce(alvo.semana, v_semana_atual) as semana
    from alvo
    full join atual on atual.torcedor_id = alvo.torcedor_id and atual.jogo_id = alvo.jogo_id
  ),
  novos as (
    insert into public.crava_pontos (torcedor_id, jogo_id, rodada, time_id, semana, pontos)
    select d.torcedor_id, d.jogo_id, p_rodada, coalesce(pa.time_id, 'outro'), d.semana, d.pontos
    from dif d
    join public.jogos j on j.id = d.jogo_id and j.rodada = p_rodada
    left join public.palpites pa on pa.torcedor_id = d.torcedor_id and pa.jogo_id = d.jogo_id
    where d.pontos <> 0
    returning semana
  )
  select count(*)::integer, coalesce(array_agg(distinct n.semana), '{}') into v_gravados, v_semanas from novos n;

  foreach v_semana in array v_semanas loop
    perform public.recalcular_ranking(v_semana);
  end loop;
  return v_gravados;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Fechamento. p_agora existe para os testes percorrerem a segunda-feira; o cron usa o padrão.
-- ---------------------------------------------------------------------------
-- Uma semana que já terminou: provisória até segunda 12h, depois travada, e aí mais nada muda.
-- Na semana travada a classificação vem de ranking_semana como está: recalcular depois das 12h
-- (cron atrasado) traria de volta suspeita liberada tarde, que não entra no ranking das torcidas.
-- O bônus de 1º da torcida sai aqui, na mesma transação. Quem apagou os dados segue somando para a
-- torcida, mas sem XP para receber: o bônus fica com o 1º entre quem continua no jogo.
create or replace function public.fechar_semana(p_semana date, p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_confirmar boolean := v_agora >= (p_semana + 7)::timestamp + interval '12 hours';
begin
  if v_agora::date < p_semana + 7 or public.semana_travada(p_semana) then
    return;
  end if;

  if not v_confirmar or not exists (select 1 from public.ranking_semana r where r.semana = p_semana) then
    perform public.recalcular_ranking(p_semana);
  end if;

  insert into public.fechamento_semana as f
    (semana, time_id, ativos, soma, media30, chegou_em, posicao_campeao, posicao_soma, gravado_em, confirmada_em)
  select r.semana, r.time_id, r.ativos, r.soma, r.media30, r.chegou_em, r.posicao_campeao, r.posicao_soma,
    p_agora, case when v_confirmar then p_agora end
  from public.ranking_semana r
  where r.semana = p_semana
  on conflict (semana, time_id) do update set
    ativos = excluded.ativos,
    soma = excluded.soma,
    media30 = excluded.media30,
    chegou_em = excluded.chegou_em,
    posicao_campeao = excluded.posicao_campeao,
    posicao_soma = excluded.posicao_soma,
    gravado_em = excluded.gravado_em,
    confirmada_em = excluded.confirmada_em;

  if v_confirmar then
    perform public.carreira_bonus_semana(p_semana);
  end if;
end;
$$;

-- Todas as semanas que terminaram e ainda não travaram, da mais velha para a mais nova: a que acabou
-- de terminar (mesmo sem ninguém jogando, para a sequência de semanas não ter buraco) e as que um
-- cron perdido deixou para trás.
create or replace function public.fechar_semanas(p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual date := public.semana_de((p_agora at time zone 'America/Sao_Paulo')::date);
  v_semana date;
begin
  for v_semana in
    select s.semana from (
      select r.semana from public.ranking_semana r
      union select v_atual - 7
    ) s
    where s.semana < v_atual and not public.semana_travada(s.semana)
    order by 1
  loop
    perform public.fechar_semana(v_semana, p_agora);
  end loop;
end;
$$;

-- Segunda 00h05 e 12h de Brasília (UTC−3).
select cron.schedule('fechar-semana-virada', '5 3 * * 1', 'select public.fechar_semanas()');
select cron.schedule('fechar-semana-confirma', '0 15 * * 1', 'select public.fechar_semanas()');

-- ---------------------------------------------------------------------------
-- 5. Carreira: o bônus da semana passa a sair do fechamento. O cron diário (00h15) fica de rede de
--    segurança: se a confirmação de segunda 12h falhar, a semana trava aqui e o bônus sai.
-- ---------------------------------------------------------------------------
create or replace function public.carreira_fechar()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.carreira_bonus_dia(public.hoje_brasilia() - 1);
  perform public.fechar_semanas();
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Permissões explícitas
-- ---------------------------------------------------------------------------
revoke execute on function public.semana_travada(date), public.fechar_semana(date, timestamptz),
  public.fechar_semanas(timestamptz)
  from public, anon, authenticated;
grant execute on function public.semana_travada(date), public.fechar_semana(date, timestamptz),
  public.fechar_semanas(timestamptz)
  to service_role;
