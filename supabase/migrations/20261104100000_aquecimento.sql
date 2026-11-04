-- Aquecimento (docs/jogo.md, seção 14.4). Só acrescenta: nenhuma tabela ou coluna é apagada ou renomeada.
-- 1) +20 XP de Carreira uma vez por torcedor, ao completar o aquecimento (não mexe no ranking).
-- 2) Contagem para o npm run metricas: quantos completam, pulam ou param, e em qual estação. Só contagem:
--    a linha da contagem não guarda quem foi. Para cada pessoa contar uma vez só, aquecimento_contados guarda
--    só que aquela conta já entrou na contagem (some com a conta).

-- ---------------------------------------------------------------------------
-- 1. XP
-- ---------------------------------------------------------------------------
alter table public.carreira_bonus drop constraint carreira_bonus_tipo_check;
alter table public.carreira_bonus add constraint carreira_bonus_tipo_check
  check (tipo in ('dia', 'semana', 'aquecimento'));

-- Uma vez por torcedor, mesmo em dias diferentes. A junção de contas (juntar_torcedores) copia os bônus com
-- "on conflict do nothing", então quem aqueceu nos dois aparelhos fica com um só.
create unique index carreira_bonus_aquecimento_unico on public.carreira_bonus (torcedor_id) where tipo = 'aquecimento';

-- O "bônus recente" da Carreira (linha "+100 XP: 1º do dia…") é só de dia e semana: o do aquecimento aparece
-- na tela do fim do aquecimento. Mesmo formato de saída de 20261031100100, por isso basta substituir.
create or replace function public.carreira_de(p_torcedor uuid)
returns table (xp integer, partidas_hoje integer, bonus_tipo text, bonus_referencia date)
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
  bonus as (
    select b.tipo, b.referencia
    from public.carreira_bonus b
    where b.torcedor_id = p_torcedor and b.tipo in ('dia', 'semana') and b.criado_em >= now() - interval '7 days'
    order by b.criado_em desc
    limit 1
  )
  select
    (coalesce((select sum(public.carreira_xp_dia(p.n)) from por_dia p), 0)
      + coalesce((select sum(b.xp) from public.carreira_bonus b where b.torcedor_id = p_torcedor), 0))::integer,
    coalesce((select p.n from por_dia p, hoje h where p.dia = h.d), 0),
    (select b.tipo from bonus b),
    (select b.referencia from bonus b);
$$;

revoke execute on function public.carreira_de(uuid) from public, anon, authenticated;
grant execute on function public.carreira_de(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Contagem
-- ---------------------------------------------------------------------------
create table public.aquecimento_contagem (
  id bigint generated always as identity primary key,
  dia date not null default public.hoje_brasilia(),
  desfecho text not null check (desfecho in ('completou', 'pulou', 'parou')),
  -- Estação onde pulou ou parou (1 a 5). Null quando completou.
  estacao smallint check (estacao between 1 and 5),
  check ((desfecho = 'completou') = (estacao is null))
);
alter table public.aquecimento_contagem enable row level security;
-- O celular não lê nem grava: só a função abaixo e o npm run metricas (dono do banco).
create policy "ninguém pelo cliente" on public.aquecimento_contagem
  as restrictive for all to anon, authenticated using (false) with check (false);

create table public.aquecimento_contados (
  torcedor_id uuid primary key references public.torcedores (id) on delete cascade
);
alter table public.aquecimento_contados enable row level security;
create policy "ninguém pelo cliente" on public.aquecimento_contados
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on public.aquecimento_contagem, public.aquecimento_contados from anon, authenticated;
grant all on public.aquecimento_contagem, public.aquecimento_contados to service_role;

-- ---------------------------------------------------------------------------
-- 3. Função chamada pelo celular no fim (completou), no "Pular" (pulou) ou na abertura seguinte (parou)
-- ---------------------------------------------------------------------------
-- Devolve o XP ganho agora (20 ou 0). Sem torcedor ainda (o aparelho não sincronizou o time): 'sem_torcedor',
-- e o celular tenta de novo depois.
create or replace function public.aquecimento_registrar(p_desfecho text, p_estacao integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu uuid := auth.uid();
  v_xp integer := 0;
begin
  if v_eu is null or not public.sessao_ativa() then
    raise exception 'sem_sessao' using errcode = '42501';
  end if;
  if p_desfecho is null or p_desfecho not in ('completou', 'pulou', 'parou') then
    raise exception 'desfecho_invalido' using errcode = '22023';
  end if;
  if (p_desfecho = 'completou') <> (p_estacao is null) or (p_estacao is not null and p_estacao not between 1 and 5) then
    raise exception 'estacao_invalida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.torcedores t where t.id = v_eu) then
    raise exception 'sem_torcedor' using errcode = 'P0002';
  end if;

  -- Conta só o primeiro desfecho de cada pessoa ("Rever aquecimento" não entra de novo).
  insert into public.aquecimento_contados (torcedor_id) values (v_eu) on conflict do nothing;
  if found then
    insert into public.aquecimento_contagem (desfecho, estacao) values (p_desfecho, p_estacao::smallint);
  end if;

  if p_desfecho = 'completou' then
    insert into public.carreira_bonus (torcedor_id, tipo, referencia, xp)
    values (v_eu, 'aquecimento', public.hoje_brasilia(), 20)
    on conflict do nothing;
    if found then
      v_xp := 20;
    end if;
  end if;

  return v_xp;
end;
$$;

revoke execute on function public.aquecimento_registrar(text, integer) from public, anon;
grant execute on function public.aquecimento_registrar(text, integer) to authenticated;
