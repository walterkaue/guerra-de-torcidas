-- Ranking da semana de minuto em minuto (docs/jogo.md, seção 5, "A semana", e seção 12, "Antes de divulgar"). Só
-- acrescenta: nenhuma coluna ou tabela é apagada ou renomeada, e a conta do ranking não muda.
--
-- Antes, cada partida fechada (e cada Time do Dia, ponto do Crava e suspeita liberada) recalculava a
-- semana inteira dentro da própria transação. Com muita gente isso não aguenta:
--   - o recálculo lê todas as partidas da semana (350 ms com 10 mil pessoas, no teste local);
--   - as 20 linhas de ranking_semana ficavam presas até a partida terminar de gravar, e duas partidas
--     ao mesmo tempo gravavam uma por cima da outra com a conta de antes;
--   - cada recálculo regravava as 20 linhas, e o Realtime mandava 20 mensagens para cada tela aberta
--     (o plano Free aceita 100 por segundo e 2 milhões por mês).
-- Agora quem fecha só anota a semana numa fila. Uma rotina a cada minuto refaz as semanas anotadas com
-- a mesma conta de sempre, regrava só as linhas que mudaram e manda um aviso por semana para as telas.

-- ---------------------------------------------------------------------------
-- 1. Fila: uma linha por evento, sem chave única, para duas partidas nunca esperarem uma pela outra.
--    A rotina apaga o que vê e recalcula depois: evento que ela não viu fica para o minuto seguinte.
-- ---------------------------------------------------------------------------
create table public.ranking_fila (
  id bigint generated always as identity primary key,
  semana date not null,
  marcada_em timestamptz not null default now()
);

alter table public.ranking_fila enable row level security;
revoke all on public.ranking_fila from anon, authenticated;
grant all on public.ranking_fila to service_role;
-- O celular não lê nem grava a fila: só as funções do servidor.
create policy "ninguém pelo cliente" on public.ranking_fila
  as restrictive for all to anon, authenticated using (false) with check (false);

-- Aviso para as telas (Realtime): uma linha por semana, que muda quando alguma linha do ranking mudou.
-- Uma mensagem por tela a cada minuto com mudança, em vez de 20 a cada partida. atualizado_em é o
-- início da transação que recalculou, anterior à leitura da fila: a tela de resultado só confia na
-- tabela quando ele passa da hora em que a partida dela já estava gravada.
create table public.ranking_aviso (
  semana date primary key,
  versao bigint not null default 1,
  atualizado_em timestamptz not null default now()
);

alter table public.ranking_aviso enable row level security;
create policy "ranking_aviso: leitura para todos" on public.ranking_aviso
  for select to anon, authenticated using (true);
-- Sem política de escrita: só recalcular_ranking grava.
revoke all on public.ranking_aviso from anon, authenticated;
grant select on public.ranking_aviso to anon, authenticated;
grant all on public.ranking_aviso to service_role;

alter publication supabase_realtime add table public.ranking_aviso;

create or replace function public.marcar_ranking(p_semana date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ranking_fila (semana) values (p_semana);
$$;

-- ---------------------------------------------------------------------------
-- 2. Ranking: a conta é a mesma de 20261031300000_fechamento_semana.sql. Muda o jeito de gravar:
--    - uma semana por vez (trava por semana): a segunda conta espera a primeira e lê o que ela gravou;
--    - só regrava a linha que mudou, e então avisa as telas.
-- ---------------------------------------------------------------------------
create or replace function public.recalcular_ranking(p_semana date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mudou integer;
begin
  perform pg_advisory_xact_lock(hashtext('ranking_semana'), p_semana - date '2000-01-03');

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
    atualizado_em = excluded.atualizado_em
  where (r.ativos, r.soma, r.media30, r.chegou_em, r.posicao_campeao, r.posicao_soma)
    is distinct from (excluded.ativos, excluded.soma, excluded.media30, excluded.chegou_em,
                      excluded.posicao_campeao, excluded.posicao_soma);
  get diagnostics v_mudou = row_count;

  if v_mudou > 0 then
    insert into public.ranking_aviso as v (semana) values (p_semana)
    on conflict (semana) do update set versao = v.versao + 1, atualizado_em = now();
  end if;
end;
$$;

-- A rotina do minuto: refaz cada semana anotada, da mais velha para a mais nova, uma por vez (a
-- mesma ordem de fechar_semanas, para as duas nunca esperarem uma pela outra). Semana travada não muda
-- (recalcular_ranking já não grava nela); a anotação só sai da fila. Semana que dá erro volta inteira
-- para a fila, com aviso no log, sem segurar as outras. Devolve quantas refez.
create or replace function public.atualizar_rankings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semana date;
  v_feitas integer := 0;
begin
  for v_semana in select distinct f.semana from public.ranking_fila f order by 1 loop
    begin
      delete from public.ranking_fila f where f.semana = v_semana;
      perform public.recalcular_ranking(v_semana);
      v_feitas := v_feitas + 1;
    exception when others then
      raise warning 'ranking da semana % não refez: %', v_semana, sqlerrm;
    end;
  end loop;
  return v_feitas;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Quem antes recalculava passa a anotar. Cada função é igual à versão mais recente, só com
--    recalcular_ranking trocado por marcar_ranking.
-- ---------------------------------------------------------------------------

-- Igual ao de 20261020400000_fechamento_atomico.sql.
create or replace function public.fechar_partida(
  p_partida uuid,
  p_torcedor uuid,
  p_time text,
  p_gestos jsonb,
  p_resultado jsonb,
  p_pontos integer,
  p_dia date,
  p_semana date,
  p_fechada_em timestamptz,
  p_motivo_suspeita text,
  p_desafio jsonb,
  p_codigos text[]
)
returns table (teto boolean, suspeita boolean, codigo text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minigame text;
  v_amistoso boolean;
  v_apelido text;
  v_codigo text;
  v_inseridas integer;
begin
  update public.partidas p
  set fechada_em = p_fechada_em,
      time_id = p_time,
      gestos = p_gestos,
      resultado = p_resultado,
      pontos = p_pontos,
      dia = p_dia,
      semana = p_semana,
      sob_suspeita = p_motivo_suspeita is not null,
      motivo_suspeita = p_motivo_suspeita
  where p.id = p_partida and p.torcedor_id = p_torcedor and p.fechada_em is null
  returning p.minigame, p.amistoso into v_minigame, v_amistoso;
  if not found then
    return;
  end if;

  perform public.atualizar_teto(p_torcedor, p_dia);
  if not v_amistoso then
    perform public.marcar_ranking(p_semana);
  end if;

  if p_desafio is not null then
    select t.apelido into v_apelido from public.torcedores t where t.id = p_torcedor;
    foreach v_codigo in array coalesce(p_codigos, '{}') loop
      if v_minigame = 'prova' then
        insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, apelido, perguntas, pontos, escada, resumo)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido,
          array(select jsonb_array_elements_text(p_desafio -> 'perguntas')), p_pontos,
          p_desafio ->> 'escada', p_desafio ->> 'resumo')
        on conflict (id) do nothing;
      else
        insert into public.desafios (id, partida_id, torcedor_id, time_id, apelido, cobrancas, gols_jogador, gols_maquina, pontos)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido, p_desafio -> 'cobrancas',
          (p_desafio ->> 'gols_jogador')::smallint, (p_desafio ->> 'gols_maquina')::smallint, p_pontos)
        on conflict (id) do nothing;
      end if;
      get diagnostics v_inseridas = row_count;
      exit when v_inseridas > 0;
      v_codigo := null; -- código repetido: tenta o próximo
    end loop;
  end if;

  return query
    select p.conta_no_teto, p.sob_suspeita, v_codigo from public.partidas p where p.id = p_partida;
end;
$$;

-- Igual ao de 20261020400000_fechamento_atomico.sql.
create or replace function public.fechar_dia(
  p_torcedor uuid,
  p_dia date,
  p_versao integer,
  p_tentativas text[],
  p_acertou boolean,
  p_pontos smallint,
  p_fechada_em timestamptz,
  p_sob_suspeita boolean
)
returns setof public.dia_partidas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.dia_partidas;
begin
  update public.dia_partidas d
  set tentativas = p_tentativas,
      acertou = p_acertou,
      pontos = p_pontos,
      fechada_em = p_fechada_em,
      sob_suspeita = p_sob_suspeita,
      versao = p_versao + 1
  where d.torcedor_id = p_torcedor and d.dia = p_dia and d.versao = p_versao and d.fechada_em is null
  returning d.* into v_linha;
  if not found then
    return;
  end if;
  -- Fora do teto diário: soma por cima na semana do dia, no time de quando jogou.
  if not v_linha.amistoso then
    perform public.marcar_ranking(public.semana_de(p_dia));
  end if;
  return next v_linha;
end;
$$;

-- Igual ao de 20261031300000_fechamento_semana.sql.
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
    perform public.marcar_ranking(v_semana);
  end loop;
  return v_gravados;
end;
$$;

-- Igual ao de 20261027000200_revisao_suspeitas.sql.
create or replace function public.suspeitas_decidir(p_minigame text, p_id text, p_liberar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_torcedor uuid;
  v_dia date;
  v_amistoso boolean;
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if p_minigame = 'dia' then
    if p_id !~ '^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$' then
      raise exception 'fora_da_fila';
    end if;
    update public.dia_partidas d
      set revisada_em = now(), sob_suspeita = not p_liberar
      where d.torcedor_id = split_part(p_id, ':', 1)::uuid and d.dia = split_part(p_id, ':', 2)::date
        and d.sob_suspeita and d.revisada_em is null and d.fechada_em is not null
      returning d.dia, d.amistoso into v_dia, v_amistoso;
    if not found then
      raise exception 'fora_da_fila';
    end if;
  elsif p_minigame in ('penaltis', 'prova') then
    if p_id !~ '^[0-9a-f-]{36}$' then
      raise exception 'fora_da_fila';
    end if;
    update public.partidas p
      set revisada_em = now(), sob_suspeita = not p_liberar
      where p.id = p_id::uuid and p.minigame = p_minigame
        and p.sob_suspeita and p.revisada_em is null and p.fechada_em is not null
      returning p.torcedor_id, p.dia, p.amistoso into v_torcedor, v_dia, v_amistoso;
    if not found then
      raise exception 'fora_da_fila';
    end if;
    if p_liberar then
      perform public.atualizar_teto(v_torcedor, v_dia);
    end if;
  else
    raise exception 'fora_da_fila';
  end if;

  if p_liberar and not v_amistoso and not public.semana_confirmada(public.semana_de(v_dia)) then
    perform public.marcar_ranking(public.semana_de(v_dia));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Fechamento: igual ao de 20261031300000_fechamento_semana.sql, mais a fila. O que estava anotado
--    para a semana entra antes da cópia, nas duas etapas, e sai da fila. Na trava de segunda 12h a
--    semana só é refeita se havia anotação, como antes, quando cada evento até a trava recalculava na
--    hora; sem anotação, a cópia vem de ranking_semana como está.
-- ---------------------------------------------------------------------------
create or replace function public.fechar_semana(p_semana date, p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_confirmar boolean := v_agora >= (p_semana + 7)::timestamp + interval '12 hours';
  v_anotada boolean;
begin
  if v_agora::date < p_semana + 7 or public.semana_travada(p_semana) then
    return;
  end if;

  with feitas as (delete from public.ranking_fila f where f.semana = p_semana returning 1)
  select count(*) > 0 into v_anotada from feitas;

  if not v_confirmar or v_anotada or not exists (select 1 from public.ranking_semana r where r.semana = p_semana) then
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

-- Igual ao de 20261031300000_fechamento_semana.sql, mais as semanas que só estão na fila.
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
      union select f.semana from public.ranking_fila f
      union select v_atual - 7
    ) s
    where s.semana < v_atual and not public.semana_travada(s.semana)
    order by 1
  loop
    perform public.fechar_semana(v_semana, p_agora);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Rotinas. O histórico do pg_cron ganha 1.440 linhas por dia com a do minuto: fica só o de 14 dias.
-- ---------------------------------------------------------------------------
select cron.schedule('ranking-minuto', '* * * * *', 'select public.atualizar_rankings()');
select cron.schedule('limpar-historico-cron', '30 7 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '14 days'$$);

-- ---------------------------------------------------------------------------
-- 6. Permissões explícitas
-- ---------------------------------------------------------------------------
revoke execute on function public.marcar_ranking(date), public.atualizar_rankings(),
  public.recalcular_ranking(date)
  from public, anon, authenticated;
grant execute on function public.marcar_ranking(date), public.atualizar_rankings(),
  public.recalcular_ranking(date)
  to service_role;
