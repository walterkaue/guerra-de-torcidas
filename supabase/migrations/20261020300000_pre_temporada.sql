-- Pré-temporada valendo (docs/jogo.md, seção 5, "Pré-temporada valendo" e "Sua posição e recorde
-- pessoal"). Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada.
-- 1. Todo minigame soma no ranking da semana: Prova de Boleiro e Time do Dia saem do amistoso e o
--    Crava soma desde a 32ª rodada.
-- 2. O ranking passa a ler o Time do Dia (dia_partidas), por fora do teto diário.
-- 3. Posição e recorde da própria pessoa (nunca a lista de outras pessoas nem apelidos).
-- 4. Partidas da Prova já fechadas como amistoso viram partidas normais e o ranking é recalculado.

-- ---------------------------------------------------------------------------
-- 1. Configuração
-- ---------------------------------------------------------------------------
update public.config_deteccao set valor = 0 where chave in ('prova_amistoso', 'dia_amistoso');

update public.config_crava
set valor = 32,
    descricao = 'Só rodadas a partir desta somam no ranking da semana. Na pré-temporada, 32 (tudo vale). 99 = nenhuma soma.'
where chave = 'valendo_desde_rodada';

-- ---------------------------------------------------------------------------
-- 2. Pontos que contam na semana, de todo mundo, linha a linha (fonte única do ranking e das posições):
--    partidas no teto diário (pênaltis e Prova), Time do Dia (fora do teto) e Crava (rodadas que valem).
--    Cada linha vem com o time de quando a pessoa jogou (troca livre: os pontos ficam onde foram feitos).
-- ---------------------------------------------------------------------------
create or replace function public.pontos_semana(p_semana date)
returns table (torcedor_id uuid, time_id text, minigame text, pontos integer, quando timestamptz, de_partida boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.torcedor_id, p.time_id, p.minigame, p.pontos, p.fechada_em, true
  from public.partidas p
  where p.semana = p_semana and p.conta_no_teto and not p.sob_suspeita
  union all
  -- Time do Dia: uma por dia, conta na semana do dia (o dia já respeita a tolerância de 00h05).
  select d.torcedor_id, d.time_id, 'dia', d.pontos::integer, d.fechada_em, true
  from public.dia_partidas d
  where d.dia between p_semana and p_semana + 6
    and d.fechada_em is not null and not d.amistoso and not d.sob_suspeita
  union all
  select c.torcedor_id, c.time_id, 'crava', c.pontos, c.criado_em, false
  from public.crava_pontos c
  where c.semana = p_semana
    and c.rodada >= coalesce((select k.valor from public.config_crava k where k.chave = 'valendo_desde_rodada'), 99);
$$;

-- Total da semana por pessoa e time. Quem só tem palpite e somou zero não conta como ativo.
create or replace function public.totais_semana(p_semana date)
returns table (torcedor_id uuid, time_id text, total integer, ultima timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.torcedor_id, x.time_id, greatest(sum(x.pontos), 0)::integer, max(x.quando)
  from public.pontos_semana(p_semana) x
  group by x.torcedor_id, x.time_id
  having bool_or(x.de_partida) or sum(x.pontos) > 0;
$$;

create or replace function public.recalcular_ranking(p_semana date)
returns void
language sql
security definer
set search_path = ''
as $$
  with totais as (
    select t.* from public.totais_semana(p_semana) t
    join public.times tm on tm.id = t.time_id and tm.oficial
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
    row_number() over (order by round(c.media30, 2) desc, c.chegou_em asc nulls last, c.time_id),
    row_number() over (order by c.soma desc, c.chegou_em asc nulls last, c.time_id),
    now()
  from calc c
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
-- 3. Posição e recorde. As funções "internas" recebem o torcedor e só o servidor (secret key) chama;
--    as "minha_…"/"meus_…" usam sempre auth.uid() e devolvem só a linha da própria pessoa.
--    Empate: fica na frente quem chegou primeiro àquela pontuação.
-- ---------------------------------------------------------------------------
create or replace function public.semana_de(p_data date)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_data - ((extract(isodow from p_data))::integer - 1));
$$;

create or replace function public.hoje_brasilia()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Geral da semana, somando todos os times (inclusive "Outro time"): "3º de 14".
-- Quem ainda não pontuou na semana recebe posicao nula e o total de quem já está na disputa.
create or replace function public.posicao_semana(p_torcedor uuid, p_semana date)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with pessoas as (
    select t.torcedor_id, sum(t.total)::integer as pontos, max(t.ultima) as ultima
    from public.totais_semana(p_semana) t
    group by t.torcedor_id
  ),
  ord as (
    select p.*, row_number() over (order by p.pontos desc, p.ultima asc, p.torcedor_id)::integer as posicao
    from pessoas p
  )
  select
    (select o.posicao from ord o where o.torcedor_id = p_torcedor),
    (select count(*)::integer from ord),
    coalesce((select o.pontos from ord o where o.torcedor_id = p_torcedor), 0);
$$;

-- Por minigame: pênaltis e Prova pela melhor partida da semana de p_data; Time do Dia pelos pontos
-- do dia p_data. (O Crava tem a própria: minha_posicao_crava, por rodada.)
create or replace function public.posicao_minigame(p_torcedor uuid, p_minigame text, p_data date)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with melhores as (
    select distinct on (p.torcedor_id) p.torcedor_id, p.pontos, p.fechada_em as quando
    from public.partidas p
    where p_minigame in ('penaltis', 'prova') and p.minigame = p_minigame
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

-- Recorde pessoal: melhor partida (pênaltis, Prova), melhor dia (Time do Dia) ou melhor rodada (Crava,
-- já com peso). Só o que fechou antes de p_antes (nulo = tudo). Partida sob suspeita não vale recorde.
-- Zera junto com a pré-temporada, porque sai das próprias partidas, dias e pontos do Crava.
create or replace function public.recorde_pessoal(p_torcedor uuid, p_minigame text, p_antes timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_minigame in ('penaltis', 'prova') then (
      select max(p.pontos) from public.partidas p
      where p.torcedor_id = p_torcedor and p.minigame = p_minigame and p.fechada_em is not null
        and not p.sob_suspeita and (p_antes is null or p.fechada_em < p_antes))
    when p_minigame = 'dia' then (
      select max(d.pontos)::integer from public.dia_partidas d
      where d.torcedor_id = p_torcedor and d.fechada_em is not null and not d.sob_suspeita
        and (p_antes is null or d.fechada_em < p_antes))
    when p_minigame = 'crava' then (
      select max(r.total)::integer from (
        select sum(c.pontos) as total from public.crava_pontos c
        where c.torcedor_id = p_torcedor and (p_antes is null or c.criado_em < p_antes)
        group by c.rodada
      ) r)
  end;
$$;

-- Tudo o que a tela de resultado precisa de uma partida fechada (pênaltis ou Prova).
-- novo_recorde: passou o recorde de antes (a primeira partida de todas não conta como recorde novo).
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
  cross join lateral public.posicao_minigame(p.torcedor_id, p.minigame, p.semana) pos;
$$;

-- O mesmo para o Time do Dia de uma pessoa num dia (só depois que o dia dela terminou).
create or replace function public.desempenho_dia(p_torcedor uuid, p_dia date)
returns table (posicao integer, total integer, recorde integer, novo_recorde boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select q.* from public.dia_partidas q
    where q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
  ),
  antes as (
    select public.recorde_pessoal(d.torcedor_id, 'dia', d.fechada_em) as recorde from d
  )
  select pos.posicao, pos.total, public.recorde_pessoal(d.torcedor_id, 'dia'),
         (not d.sob_suspeita and a.recorde is not null and d.pontos > a.recorde)
  from d
  cross join antes a
  cross join lateral public.posicao_minigame(d.torcedor_id, 'dia', d.dia) pos;
$$;

-- Leituras da própria pessoa (celular).
create or replace function public.minha_posicao_semana(p_semana date default null)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.posicao_semana(auth.uid(), coalesce(p_semana, public.semana_de(public.hoje_brasilia())))
  where auth.uid() is not null;
$$;

create or replace function public.minha_posicao_minigame(p_minigame text, p_data date default null)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.posicao_minigame(auth.uid(), p_minigame, coalesce(p_data, public.hoje_brasilia()))
  where auth.uid() is not null;
$$;

create or replace function public.meus_recordes()
returns table (minigame text, recorde integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.minigame, public.recorde_pessoal(auth.uid(), m.minigame)
  from (values ('penaltis'), ('prova'), ('dia'), ('crava')) as m (minigame)
  where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- Permissões explícitas: as internas só para o servidor; as "minha_…" só para quem tem sessão.
-- ---------------------------------------------------------------------------
revoke execute on function public.pontos_semana(date), public.totais_semana(date),
  public.posicao_semana(uuid, date), public.posicao_minigame(uuid, text, date),
  public.recorde_pessoal(uuid, text, timestamptz), public.desempenho_partida(uuid),
  public.desempenho_dia(uuid, date), public.minha_posicao_semana(date),
  public.minha_posicao_minigame(text, date), public.meus_recordes()
  from public, anon, authenticated;
grant execute on function public.pontos_semana(date), public.totais_semana(date),
  public.posicao_semana(uuid, date), public.posicao_minigame(uuid, text, date),
  public.recorde_pessoal(uuid, text, timestamptz), public.desempenho_partida(uuid),
  public.desempenho_dia(uuid, date)
  to service_role;
grant execute on function public.minha_posicao_semana(date), public.minha_posicao_minigame(text, date),
  public.meus_recordes()
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reclassificar o que nasceu amistoso na pré-temporada (Prova de Boleiro e Time do Dia, inclusive
--    partidas ainda abertas) e refazer teto e ranking das semanas que já têm pontos.
-- ---------------------------------------------------------------------------
do $$
declare
  v record;
  v_dias jsonb;
begin
  select jsonb_agg(distinct jsonb_build_object('t', p.torcedor_id, 'd', p.dia)) into v_dias
  from public.partidas p
  where p.amistoso and p.fechada_em is not null and p.dia is not null;

  update public.partidas set amistoso = false where amistoso;

  for v in
    select (e ->> 't')::uuid as torcedor_id, (e ->> 'd')::date as dia
    from jsonb_array_elements(coalesce(v_dias, '[]')) e
  loop
    perform public.atualizar_teto(v.torcedor_id, v.dia);
  end loop;

  update public.dia_partidas set amistoso = false where amistoso;

  for v in
    select s.semana from (
      select p.semana from public.partidas p where p.semana is not null
      union select public.semana_de(d.dia) from public.dia_partidas d
      union select c.semana from public.crava_pontos c
      union select r.semana from public.ranking_semana r
      union select public.semana_de(public.hoje_brasilia())
    ) s
  loop
    perform public.recalcular_ranking(v.semana);
  end loop;
end;
$$;
