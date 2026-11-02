-- "Apagar meus dados" (docs/jogo.md, seção 13). Só acrescenta: nenhuma coluna ou tabela é apagada.
-- Apagar o usuário anônimo leva tudo em cascata (torcedor, partidas, desafios, palpites, Time do Dia,
-- Prova, carreira, inscrições de push), e os feedbacks ficam sem o usuário (on delete set null).
--
-- O ranking é recalculado a partir das partidas: sem cuidado, a cascata tiraria do placar os pontos
-- que já foram para a torcida. Por isso, antes de apagar, o total de cada semana e time vai para
-- pontos_apagados, sem nenhum id da pessoa, e o ranking soma essas linhas como um torcedor anônimo.

create table if not exists public.pontos_apagados (
  id uuid primary key default gen_random_uuid(),
  semana date not null,
  time_id text not null references public.times (id),
  total integer not null check (total >= 0),
  ultima timestamptz
);
create index if not exists pontos_apagados_semana on public.pontos_apagados (semana);

alter table public.pontos_apagados enable row level security;
revoke all on public.pontos_apagados from anon, authenticated;
grant select, insert, update, delete on public.pontos_apagados to service_role;

-- O celular não lê nem grava a tabela: só o ranking e a função abaixo usam.
drop policy if exists "ninguém pelo cliente" on public.pontos_apagados;
create policy "ninguém pelo cliente" on public.pontos_apagados
  as restrictive for all to anon, authenticated using (false) with check (false);

-- Igual ao de 20261020300000_pre_temporada.sql, mais as linhas de quem apagou os dados.
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

-- Tudo numa transação: ou os pontos ficam guardados e o usuário sai, ou nada muda.
-- Só conta anônima: conta com login de verdade (o painel #admin) não se apaga por aqui.
create or replace function public.apagar_meus_dados()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  if exists (select 1 from auth.users u where u.id = v_uid and not u.is_anonymous)
    or exists (select 1 from public.administradores a where a.usuario_id = v_uid) then
    raise exception 'conta_nao_anonima' using errcode = '42501';
  end if;

  insert into public.pontos_apagados (semana, time_id, total, ultima)
  select s.semana, t.time_id, t.total, t.ultima
  from (
    select p.semana from public.partidas p where p.torcedor_id = v_uid and p.semana is not null
    union
    select public.semana_de(d.dia) from public.dia_partidas d where d.torcedor_id = v_uid
    union
    select c.semana from public.crava_pontos c where c.torcedor_id = v_uid
  ) s
  cross join lateral public.totais_semana(s.semana) t
  join public.times tm on tm.id = t.time_id and tm.oficial
  where t.torcedor_id = v_uid and t.total > 0;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;
