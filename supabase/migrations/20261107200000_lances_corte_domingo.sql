-- Corte dos Lances unificados antecipado para domingo 08/11/2026, 0h de Brasília (era segunda 09/11). Decisão do Kauê
-- em 07/11/2026, na pré-temporada: as pessoas que entram no domingo de manhã já veem a tela única (docs/jogo.md, 5 e 14.7).
-- Nenhuma coluna ou tabela é apagada ou renomeada.
--
--   1. Data de corte: igual a LANCES_UNIFICADOS_DESDE e DIA_DO_CORTE em src/jogo/regraLances.ts (o teste confere o
--      texto desta migração).
--   2. A posição dos Lances recomeça no dia do corte, não na semana. O corte deixa de cair numa virada de semana e cai
--      no domingo, dentro da semana de 02/11: posicao_minigame passa a escolher a regra pelo dia pedido (antes, pela
--      semana dele), e na regra antiga conta só partidas criadas antes do corte (a posição de sábado não mistura as
--      de domingo, de outra tabela de pontos). desempenho_partida (tela de resultado) passa o dia da partida em vez da
--      semana: a semana que a posição olha é a mesma (semana_de do dia), só a regra fica certa no domingo.
--      Fora da semana de 02/11 nada muda: dia e semana caem sempre do mesmo lado do corte.
--
-- Já decidiam pelo dia ou pela hora e não mudam: atualizar_teto, lances_hoje, a guarda acima_do_teto do fechar_partida,
-- recorde_pessoal e a junção de contas. O fechamento da semana de 02/11 soma as duas regras (aceito: é pré-temporada,
-- e a semana zera).
--
-- Publicação: esta migração primeiro, depois as funções nova-partida, lances, lance-penalti e fechar-partida (levam a
-- data nova em _shared/jogo/regraLances.ts) e o site, tudo antes de domingo 08/11, 0h.

-- ---------------------------------------------------------------------------
-- 1. Data de corte
-- ---------------------------------------------------------------------------
create or replace function public.lances_unificados_desde()
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select timestamptz '2026-11-08 00:00:00-03';
$$;

create or replace function public.lances_dia_do_corte()
returns date
language sql
immutable
set search_path = ''
as $$
  select date '2026-11-08';
$$;

update public.config_deteccao
set descricao = 'Lances unificados (desde 08/11/2026): partidas valendo por dia, somando pênaltis, faltas e cara a cara (o X1 recebido conta)'
where chave = 'lances_unificados_por_dia';

-- ---------------------------------------------------------------------------
-- 2. Posição pelo dia do corte. Igual à de 20261105100000_lances_unificados.sql, com a regra pelo dia (p_data) e, na
--    regra antiga, Pênaltis e Lances só com partidas criadas antes do corte.
-- ---------------------------------------------------------------------------
create or replace function public.posicao_minigame(p_torcedor uuid, p_minigame text, p_data date)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with regra as (
    select p_minigame in ('penaltis', 'lances') and p_data >= public.lances_dia_do_corte() as unificada
  ),
  melhores as (
    select distinct on (p.torcedor_id) p.torcedor_id, p.pontos, p.fechada_em as quando
    from public.partidas p, regra r
    where p_minigame in ('penaltis', 'prova', 'lances')
      and (case when r.unificada then p.minigame in ('penaltis', 'lances') and p.criada_em >= public.lances_unificados_desde()
                else p.minigame = p_minigame
                  and (p_minigame = 'prova' or p.criada_em < public.lances_unificados_desde()) end)
      and p.semana = public.semana_de(p_data) and p.fechada_em is not null and not p.sob_suspeita
    order by p.torcedor_id, p.pontos desc, p.fechada_em asc
  ),
  do_dia as (
    select d.torcedor_id, d.pontos::integer as pontos, d.fechada_em as quando
    from public.dia_partidas d
    where p_minigame = 'dia' and d.dia = p_data and d.fechada_em is not null and not d.sob_suspeita
  ),
  ord as (
    select x.*, row_number() over (order by x.pontos desc, x.quando asc, x.torcedor_id)::integer as posicao
    from (select * from melhores union all select * from do_dia) x
  )
  select
    (select o.posicao from ord o where o.torcedor_id = p_torcedor),
    (select count(*)::integer from ord),
    coalesce((select o.pontos from ord o where o.torcedor_id = p_torcedor), 0);
$$;

-- Igual à de 20261020300000_pre_temporada.sql, com p.dia no lugar de p.semana na posição (mesma semana, regra do dia).
create or replace function public.desempenho_partida(p_partida uuid)
returns table (posicao integer, total integer, recorde integer, novo_recorde boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select q.* from public.partidas q where q.id = p_partida and q.fechada_em is not null
  ),
  antes as (
    select public.recorde_pessoal(p.torcedor_id, p.minigame, p.fechada_em) as recorde from p
  )
  select pos.posicao, pos.total, public.recorde_pessoal(p.torcedor_id, p.minigame),
         (not p.sob_suspeita and a.recorde is not null and p.pontos > a.recorde)
  from p
  cross join antes a
  cross join lateral public.posicao_minigame(p.torcedor_id, p.minigame, p.dia) pos;
$$;
