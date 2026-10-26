-- Carreira do jogador (docs/jogo.md, seção 5, "Longo prazo"). Só acrescenta: nenhuma coluna ou tabela é
-- apagada ou renomeada, e nenhuma função existente muda (o registro entra por gatilhos).
--
-- O XP é calculado só aqui, a partir das partidas válidas; o celular só lê o próprio (minha_carreira).
-- Nunca zera, nem no zerar da pré-temporada: as duas tabelas não têm chave estrangeira para partidas,
-- dia_partidas ou crava_pontos, então apagar essas não leva a carreira junto (como as medalhas).
--
-- Conta (espelhada em src/jogo/carreira.ts): por dia de Brasília, 10 XP em cada uma das 5 primeiras
-- partidas válidas, 5 da 6ª à 15ª, zero depois. Time do Dia e cada rodada palpitada do Crava contam
-- como 1 partida. Bônus: +100 para o 1º do dia entre todos, +200 para o 1º de cada torcida na semana.

-- ---------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------
-- Uma linha por partida válida que já entrou na carreira. A chave impede contar duas vezes a mesma
-- partida (fechar de novo, gatilho repetido). Partida que vira suspeita depois não sai: a carreira
-- mede constância e já foi mostrada.
create table public.carreira_partidas (
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  origem text not null check (origem in ('partida', 'dia', 'crava')),
  -- Id da partida (pênaltis, Prova), dia do Time do Dia ou número da rodada do Crava.
  referencia text not null,
  -- Dia de Brasília em que conta (o mesmo da partida; no Crava, o dia do 1º palpite da rodada).
  dia date not null,
  criado_em timestamptz not null default now(),
  primary key (torcedor_id, origem, referencia)
);
create index carreira_partidas_dia on public.carreira_partidas (torcedor_id, dia);

alter table public.carreira_partidas enable row level security;
create policy "carreira_partidas: cada um lê as suas" on public.carreira_partidas
  for select to authenticated using (torcedor_id = (select auth.uid()));
-- Sem política de escrita: só os gatilhos e funções do servidor gravam.

-- Bônus: um por pessoa por dia ou semana (referencia = o dia, ou a segunda-feira da semana).
create table public.carreira_bonus (
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  tipo text not null check (tipo in ('dia', 'semana')),
  referencia date not null,
  -- Semana: a torcida em que a pessoa foi a 1ª.
  time_id text references public.times (id),
  xp integer not null check (xp > 0),
  criado_em timestamptz not null default now(),
  primary key (torcedor_id, tipo, referencia)
);
create index carreira_bonus_referencia on public.carreira_bonus (tipo, referencia);

alter table public.carreira_bonus enable row level security;
create policy "carreira_bonus: cada um lê os seus" on public.carreira_bonus
  for select to authenticated using (torcedor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Conta do XP
-- ---------------------------------------------------------------------------
create or replace function public.carreira_xp_dia(p_partidas integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(greatest(p_partidas, 0), 5) * 10 + greatest(least(greatest(p_partidas, 0), 15) - 5, 0) * 5;
$$;

-- Tudo da carreira de uma pessoa. Só o servidor chama com qualquer torcedor; o celular usa minha_carreira.
-- sequencia: dias seguidos com partida, terminando hoje ou ontem (perder não tira XP).
create or replace function public.carreira_de(p_torcedor uuid)
returns table (xp integer, partidas_hoje integer, sequencia integer, bonus_tipo text, bonus_referencia date)
language sql
stable
security definer
set search_path = ''
as $$
  with hoje as (select public.hoje_brasilia() as d),
  por_dia as (
    select c.dia, count(*)::integer as n
    from public.carreira_partidas c
    where c.torcedor_id = p_torcedor
    group by c.dia
  ),
  seguidos as (
    select p.dia, p.dia + (row_number() over (order by p.dia desc))::integer as grupo
    from por_dia p, hoje h
    where p.dia <= h.d
  ),
  ultimo as (
    select s.dia, s.grupo from seguidos s order by s.dia desc limit 1
  ),
  bonus as (
    select b.tipo, b.referencia
    from public.carreira_bonus b
    where b.torcedor_id = p_torcedor and b.criado_em >= now() - interval '7 days'
    order by b.criado_em desc
    limit 1
  )
  select
    (coalesce((select sum(public.carreira_xp_dia(p.n)) from por_dia p), 0)
      + coalesce((select sum(b.xp) from public.carreira_bonus b where b.torcedor_id = p_torcedor), 0))::integer,
    coalesce((select p.n from por_dia p, hoje h where p.dia = h.d), 0),
    coalesce((
      select count(*)::integer from seguidos s, ultimo u, hoje h
      where s.grupo = u.grupo and u.dia >= h.d - 1
    ), 0),
    (select b.tipo from bonus b),
    (select b.referencia from bonus b);
$$;

create or replace function public.minha_carreira()
returns table (xp integer, partidas_hoje integer, sequencia integer, bonus_tipo text, bonus_referencia date)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.carreira_de(auth.uid()) where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- 3. Registro das partidas válidas (gatilhos: entram na mesma transação do fechamento)
-- ---------------------------------------------------------------------------
create or replace function public.carreira_registrar(p_torcedor uuid, p_origem text, p_referencia text, p_dia date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.carreira_partidas (torcedor_id, origem, referencia, dia)
  values (p_torcedor, p_origem, p_referencia, p_dia)
  on conflict (torcedor_id, origem, referencia) do nothing;
$$;

-- Pênaltis e Prova (normal ou desafio): quando fecha sem suspeita (ou quando a suspeita é tirada na revisão).
create or replace function public.carreira_ao_fechar_partida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.carreira_registrar(new.torcedor_id, 'partida', new.id::text, new.dia);
  return null;
end;
$$;
create trigger carreira_partida after insert or update of fechada_em, sob_suspeita on public.partidas
  for each row when (new.fechada_em is not null and new.dia is not null and not new.sob_suspeita)
  execute function public.carreira_ao_fechar_partida();

-- Time do Dia: quando o dia da pessoa termina sem suspeita (acertando ou não).
create or replace function public.carreira_ao_fechar_dia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.carreira_registrar(new.torcedor_id, 'dia', new.dia::text, new.dia);
  return null;
end;
$$;
create trigger carreira_dia after insert or update of fechada_em, sob_suspeita on public.dia_partidas
  for each row when (new.fechada_em is not null and not new.sob_suspeita)
  execute function public.carreira_ao_fechar_dia();

-- Crava: o 1º palpite de cada rodada conta como 1 partida, no dia em que foi feito.
create or replace function public.carreira_ao_palpitar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.carreira_registrar(
    new.torcedor_id, 'crava', (select j.rodada::text from public.jogos j where j.id = new.jogo_id), public.hoje_brasilia());
  return null;
end;
$$;
create trigger carreira_palpite after insert on public.palpites
  for each row execute function public.carreira_ao_palpitar();

-- ---------------------------------------------------------------------------
-- 4. Bônus (cron diário). Cada dia e cada semana dão bônus uma vez só: se já há bônus daquela
--    referência, não recalcula (evita dois "1º" se uma partida for revista depois).
--    Empate: fica na frente quem chegou primeiro àquela pontuação.
-- ---------------------------------------------------------------------------
-- 1º do dia entre todos (de qualquer time): partidas no teto + Time do Dia daquele dia. O Crava fica
-- de fora: os pontos dele saem na confirmação do placar, não no dia em que se joga.
create or replace function public.carreira_bonus_dia(p_dia date)
returns void
language sql
security definer
set search_path = ''
as $$
  with pontos as (
    select p.torcedor_id, p.pontos, p.fechada_em as quando
    from public.partidas p
    where p.dia = p_dia and p.conta_no_teto and not p.sob_suspeita
    union all
    select d.torcedor_id, d.pontos::integer, d.fechada_em
    from public.dia_partidas d
    where d.dia = p_dia and d.fechada_em is not null and not d.amistoso and not d.sob_suspeita
  ),
  pessoas as (
    select x.torcedor_id, sum(x.pontos) as total, max(x.quando) as ultima
    from pontos x group by x.torcedor_id
  )
  insert into public.carreira_bonus (torcedor_id, tipo, referencia, xp)
  select p.torcedor_id, 'dia', p_dia, 100
  from pessoas p
  where p.total > 0
    and not exists (select 1 from public.carreira_bonus b where b.tipo = 'dia' and b.referencia = p_dia)
  order by p.total desc, p.ultima asc, p.torcedor_id
  limit 1
  on conflict do nothing;
$$;

-- 1º de cada torcida oficial na semana, pelo mesmo total do ranking (totais_semana). Quem trocou de
-- time no meio da semana e liderou duas torcidas recebe um bônus só.
create or replace function public.carreira_bonus_semana(p_semana date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.carreira_bonus (torcedor_id, tipo, referencia, time_id, xp)
  select distinct on (l.torcedor_id) l.torcedor_id, 'semana', p_semana, l.time_id, 200
  from (
    select distinct on (t.time_id) t.torcedor_id, t.time_id
    from public.totais_semana(p_semana) t
    join public.times tm on tm.id = t.time_id and tm.oficial
    where t.total > 0
    order by t.time_id, t.total desc, t.ultima asc, t.torcedor_id
  ) l
  where not exists (select 1 from public.carreira_bonus b where b.tipo = 'semana' and b.referencia = p_semana)
  order by l.torcedor_id, l.time_id
  on conflict do nothing;
$$;

-- Roda todo dia às 00h15 de Brasília (depois da tolerância de 00h05): bônus de ontem e, a partir de
-- terça, da semana anterior (na segunda até 12h o Crava ainda confirma pontos da semana que fechou).
-- Até o fechamento semanal gravado existir, a semana sai da conta ao vivo (totais_semana).
create or replace function public.carreira_fechar()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date := public.hoje_brasilia();
begin
  perform public.carreira_bonus_dia(v_hoje - 1);
  if v_hoje - public.semana_de(v_hoje) >= 1 then
    perform public.carreira_bonus_semana(public.semana_de(v_hoje) - 7);
  end if;
end;
$$;

select cron.schedule('carreira-fechar', '15 3 * * *', 'select public.carreira_fechar()');

-- ---------------------------------------------------------------------------
-- 5. Permissões explícitas
-- ---------------------------------------------------------------------------
revoke all on public.carreira_partidas, public.carreira_bonus from anon, authenticated;
grant select on public.carreira_partidas, public.carreira_bonus to authenticated;
grant all on public.carreira_partidas, public.carreira_bonus to service_role;

revoke execute on function public.carreira_xp_dia(integer), public.carreira_de(uuid), public.minha_carreira(),
  public.carreira_registrar(uuid, text, text, date), public.carreira_ao_fechar_partida(),
  public.carreira_ao_fechar_dia(), public.carreira_ao_palpitar(), public.carreira_bonus_dia(date),
  public.carreira_bonus_semana(date), public.carreira_fechar()
  from public, anon, authenticated;
grant execute on function public.carreira_xp_dia(integer), public.carreira_de(uuid),
  public.carreira_registrar(uuid, text, text, date), public.carreira_bonus_dia(date),
  public.carreira_bonus_semana(date), public.carreira_fechar()
  to service_role;
grant execute on function public.minha_carreira() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. O que já foi jogado na pré-temporada entra na carreira (inclusive os bônus dos dias e semanas
--    que já terminaram). Pode rodar de novo sem duplicar.
-- ---------------------------------------------------------------------------
insert into public.carreira_partidas (torcedor_id, origem, referencia, dia, criado_em)
select p.torcedor_id, 'partida', p.id::text, p.dia, p.fechada_em
from public.partidas p
where p.fechada_em is not null and p.dia is not null and not p.sob_suspeita
on conflict do nothing;

insert into public.carreira_partidas (torcedor_id, origem, referencia, dia, criado_em)
select d.torcedor_id, 'dia', d.dia::text, d.dia, d.fechada_em
from public.dia_partidas d
where d.fechada_em is not null and not d.sob_suspeita
on conflict do nothing;

insert into public.carreira_partidas (torcedor_id, origem, referencia, dia, criado_em)
select x.torcedor_id, 'crava', x.rodada::text, (x.primeiro at time zone 'America/Sao_Paulo')::date, x.primeiro
from (
  select pa.torcedor_id, j.rodada, min(pa.criado_em) as primeiro
  from public.palpites pa
  join public.jogos j on j.id = pa.jogo_id
  group by pa.torcedor_id, j.rodada
) x
on conflict do nothing;

do $$
declare
  v_dia date;
  v_semana date;
  v_hoje date := public.hoje_brasilia();
  -- Semanas que já podem dar bônus: até a anterior (a partir de terça) ou a retrasada (na segunda).
  v_ultima date := public.semana_de(v_hoje) - case when v_hoje - public.semana_de(v_hoje) >= 1 then 7 else 14 end;
begin
  for v_dia in
    select s.dia from (
      select p.dia from public.partidas p where p.dia is not null
      union select d.dia from public.dia_partidas d
    ) s
    where s.dia < v_hoje
    order by 1
  loop
    perform public.carreira_bonus_dia(v_dia);
  end loop;
  for v_semana in
    select s.semana from (
      select public.semana_de(p.dia) as semana from public.partidas p where p.dia is not null
      union select public.semana_de(d.dia) from public.dia_partidas d
    ) s
    where s.semana <= v_ultima
    order by 1
  loop
    perform public.carreira_bonus_semana(v_semana);
  end loop;
end;
$$;
