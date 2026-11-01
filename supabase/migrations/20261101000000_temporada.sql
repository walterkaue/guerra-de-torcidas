-- Temporada das torcidas (docs/jogo.md, seção 5, "A temporada"): a série de cada time em cada mês e o
-- fechamento do mês. Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada.
--
-- Os pontos do mês não são gravados: classificacao_temporada lê posicao_campeao das semanas travadas
-- de fechamento_semana, então a semana continua tendo uma cópia só. No fim do mês ficam a foto da
-- posição e o destino de cada time, que decidem a série do mês seguinte.
-- Nenhuma linha guarda quem jogou: só torcidas.

-- ---------------------------------------------------------------------------
-- 1. Tabelas. Zeram junto com a pré-temporada (scripts/zerar-pre-temporada.sql).
-- ---------------------------------------------------------------------------
create table public.temporada (
  -- Primeiro dia do mês. A semana é do mês da sua segunda-feira.
  mes date primary key check (extract(day from mes) = 1),
  -- O teste da pré-temporada: novembro nasce assim, o mês seguinte herda e o zerar apaga.
  pre_temporada boolean not null default false,
  -- Vazio = em andamento.
  fechada_em timestamptz,
  -- Só a estreia de verdade: o teste da pré-temporada não dá troféu (seção 5, "Longo prazo").
  campeao_estreia_id text references public.times (id)
);

create table public.temporada_serie (
  mes date not null references public.temporada (mes) on delete cascade,
  time_id text not null references public.times (id),
  serie text not null check (serie in ('unica', 'a', 'b')),
  -- Foto do fim do mês; vazias até fechar.
  posicao_final smallint,
  destino text check (destino in ('a', 'b')),
  primary key (mes, time_id)
);

alter table public.temporada enable row level security;
create policy "temporada: leitura para todos" on public.temporada
  for select to anon, authenticated using (true);

alter table public.temporada_serie enable row level security;
create policy "temporada_serie: leitura para todos" on public.temporada_serie
  for select to anon, authenticated using (true);
-- Sem política de escrita: só o fechamento do mês grava.

revoke all on public.temporada, public.temporada_serie from anon, authenticated;
grant select on public.temporada, public.temporada_serie to anon, authenticated;
grant all on public.temporada, public.temporada_serie to service_role;

-- ---------------------------------------------------------------------------
-- 2. Classificação do mês
-- ---------------------------------------------------------------------------
-- Série única: tabela de 20 posições (seção 5, "Longo prazo"). Divisão: 25, 18, 15… 1.
create function public.pontos_campeonato(p_serie text, p_posicao integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_serie = 'unica'
    then coalesce((array[25, 20, 17, 15, 14])[p_posicao], greatest(19 - p_posicao, 0))
    else coalesce((array[25, 18, 15, 12, 10, 8, 6, 4, 2, 1])[p_posicao], 0)
  end;
$$;

-- A posição da semana vale dentro da série. Torcida sem ninguém jogando não ganha ponto nem vitória,
-- mesmo com posição: sem isso, o desempate pela ordem da tabela daria pontos a quem não jogou.
-- Empate no mês: mais vitórias de semana, depois melhor última semana. Semana só conta travada.
create view public.classificacao_temporada with (security_invoker = true) as
with semanas as (
  select s.mes, s.time_id, s.serie, f.semana, f.ativos,
    row_number() over (partition by s.mes, s.serie, f.semana order by f.posicao_campeao)::integer as posicao
  from public.temporada_serie s
  join public.fechamento_semana f on f.time_id = s.time_id
    and f.semana >= s.mes and f.semana < s.mes + interval '1 month'
    and f.confirmada_em is not null
),
somas as (
  select o.mes, o.time_id,
    sum(case when o.ativos > 0 then public.pontos_campeonato(o.serie, o.posicao) else 0 end)::integer as pontos,
    count(*) filter (where o.ativos > 0 and o.posicao = 1)::integer as vitorias,
    (array_agg(o.posicao order by o.semana desc))[1] as ultima_posicao
  from semanas o
  group by o.mes, o.time_id
)
select s.mes, s.time_id, s.serie,
  row_number() over (
    partition by s.mes, s.serie
    order by coalesce(o.pontos, 0) desc, coalesce(o.vitorias, 0) desc, o.ultima_posicao asc nulls last, s.time_id
  )::integer as posicao,
  coalesce(o.pontos, 0) as pontos,
  coalesce(o.vitorias, 0) as vitorias,
  o.ultima_posicao
from public.temporada_serie s
left join somas o on o.mes = s.mes and o.time_id = s.time_id;

revoke all on public.classificacao_temporada from anon, authenticated;
grant select on public.classificacao_temporada to anon, authenticated;
grant all on public.classificacao_temporada to service_role;

-- ---------------------------------------------------------------------------
-- 3. Fechamento do mês
-- ---------------------------------------------------------------------------
-- Os 20 times juntos: o teste de novembro e a estreia depois do zerar.
create function public.abrir_serie_unica(p_mes date, p_pre_temporada boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.temporada (mes, pre_temporada) values (p_mes, p_pre_temporada);
  insert into public.temporada_serie (mes, time_id, serie)
  select p_mes, t.id, 'unica' from public.times t where t.oficial;
end;
$$;

-- O mês de estreia, que o zerar abre: o mês seguinte ao da semana atual, que sempre começa inteiro.
create function public.abrir_estreia(p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semana date := public.semana_de((p_agora at time zone 'America/Sao_Paulo')::date);
begin
  perform public.abrir_serie_unica((date_trunc('month', v_semana::timestamp) + interval '1 month')::date, false);
end;
$$;

-- Fecha quando todas as semanas do mês travaram, e abre o mês seguinte com o destino de cada time.
-- Quem decide é o registro da trava, não o relógio. As semanas passam por fechar_semana, da mais velha
-- para a mais nova, porque fechar_semanas só vê a última e as que têm ranking: se os crons caírem, a
-- foto não pode sair sem uma semana do meio, nem o mês pode ficar aberto para sempre.
-- p_agora existe para os testes.
create function public.fechar_temporada(p_mes date, p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proximo date := (p_mes + interval '1 month')::date;
  v_ultima date := public.semana_de(v_proximo - 1);
  v_semana date;
  v_pre_temporada boolean;
begin
  select t.pre_temporada into v_pre_temporada
  from public.temporada t
  where t.mes = p_mes and t.fechada_em is null
  for update;

  if not found then
    return;
  end if;

  for v_semana in
    select s::date
    from generate_series(public.semana_de(p_mes + 6)::timestamp, v_ultima::timestamp, interval '7 days') s
  loop
    perform public.fechar_semana(v_semana, p_agora);
    if not public.semana_travada(v_semana) then
      return;
    end if;
  end loop;

  update public.temporada_serie s set
    posicao_final = c.posicao,
    destino = case
      when s.serie = 'unica' and c.posicao <= 10 then 'a'
      when s.serie = 'a' and c.posicao <= 8 then 'a'
      when s.serie = 'b' and c.posicao <= 2 then 'a'
      else 'b'
    end
  from public.classificacao_temporada c
  where s.mes = p_mes and c.mes = p_mes and c.time_id = s.time_id;

  update public.temporada t set
    fechada_em = p_agora,
    campeao_estreia_id = (
      select s.time_id from public.temporada_serie s
      where s.mes = p_mes and s.serie = 'unica' and s.posicao_final = 1 and not t.pre_temporada
    )
  where t.mes = p_mes;

  insert into public.temporada (mes, pre_temporada) values (v_proximo, v_pre_temporada);
  insert into public.temporada_serie (mes, time_id, serie)
  select v_proximo, s.time_id, s.destino from public.temporada_serie s where s.mes = p_mes;
end;
$$;

create function public.fechar_temporadas(p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date;
begin
  for v_mes in
    select t.mes from public.temporada t where t.fechada_em is null order by t.mes
  loop
    perform public.fechar_temporada(v_mes, p_agora);
  end loop;
end;
$$;

-- Todo dia às 12h01 de Brasília (UTC−3), em rotina própria: erro no mês não desfaz a trava da semana
-- nem o bônus da Carreira, e uma trava atrasada (cron das 00h15) fecha o mês no mesmo dia.
select cron.schedule('fechar-temporada', '1 15 * * *', 'select public.fechar_temporadas()');

-- ---------------------------------------------------------------------------
-- 4. Teste da pré-temporada: novembro em série única (seção 5, "A temporada").
-- ---------------------------------------------------------------------------
select public.abrir_serie_unica('2026-11-01', true);

-- ---------------------------------------------------------------------------
-- 5. Permissões explícitas
-- ---------------------------------------------------------------------------
revoke execute on function public.pontos_campeonato(text, integer), public.abrir_serie_unica(date, boolean),
  public.abrir_estreia(timestamptz), public.fechar_temporada(date, timestamptz), public.fechar_temporadas(timestamptz)
  from public, anon, authenticated;
grant execute on function public.abrir_serie_unica(date, boolean), public.abrir_estreia(timestamptz),
  public.fechar_temporada(date, timestamptz), public.fechar_temporadas(timestamptz)
  to service_role;
-- A view roda com o papel de quem lê.
grant execute on function public.pontos_campeonato(text, integer) to anon, authenticated, service_role;
