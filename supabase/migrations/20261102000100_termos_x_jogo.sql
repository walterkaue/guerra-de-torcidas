-- Termos × jogo (decisões de 01/11/2026, docs/termos-x-jogo.md). Só acrescenta: nenhuma coluna ou tabela é
-- apagada nem renomeada.
--   1. "Ver meus dados": ver_meus_dados devolve, em leitura, o que o servidor guarda de quem chama.
--   2. "Apagar meus dados" passa a apagar também as mensagens do "Achei um erro" (antes ficavam sem o vínculo).
--   3. #admin "Apagar apelido": contar e limpar um apelido exato, com registro de quando, sem o apelido.

-- 1. Ver meus dados. Só auth.uid(): ninguém lê o de outro, nem o administrador por aqui. Função porque duas
-- das coisas (inscrição de aviso e mensagens) não têm leitura pelo celular, e abrir essas tabelas daria mais
-- do que o necessário.
create or replace function public.ver_meus_dados()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eu as (select auth.uid() as id)
  select case when eu.id is null then null else jsonb_build_object(
    'torcedor', (
      select jsonb_build_object('time_id', t.time_id, 'apelido', t.apelido, 'faixa_etaria', t.faixa_etaria, 'criado_em', t.criado_em)
      from public.torcedores t where t.id = eu.id
    ),
    'partidas', (
      select coalesce(jsonb_object_agg(x.minigame, x.n), '{}'::jsonb)
      from (
        select p.minigame, count(*)::integer as n from public.partidas p
        where p.torcedor_id = eu.id and p.fechada_em is not null
        group by p.minigame
      ) x
    ),
    'time_do_dia', (select count(*)::integer from public.dia_partidas d where d.torcedor_id = eu.id),
    'desafios', (
      (select count(*) from public.desafios d where d.torcedor_id = eu.id)
      + (select count(*) from public.prova_desafios d where d.torcedor_id = eu.id)
    )::integer,
    'palpites', (select count(*)::integer from public.palpites p where p.torcedor_id = eu.id),
    'carreira_xp', (select c.xp from public.carreira_de(eu.id) c),
    'avisos', (select count(*)::integer from public.push_inscricoes i where i.torcedor_id = eu.id),
    'mensagens', (
      select coalesce(jsonb_agg(jsonb_build_object('tipo', f.tipo, 'texto', f.texto, 'tela', f.tela, 'aparelho', f.aparelho, 'criado_em', f.criado_em)
        order by f.criado_em desc), '[]'::jsonb)
      from public.feedbacks f where f.usuario_id = eu.id
    )
  ) end
  from eu;
$$;

revoke execute on function public.ver_meus_dados() from public, anon;
grant execute on function public.ver_meus_dados() to authenticated;

-- 2. Igual ao de 20261031100200_apagar_meus_dados.sql, mais o delete das mensagens antes do usuário.
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

  -- O texto livre pode identificar a pessoa: some junto, em vez de ficar sem o vínculo.
  delete from public.feedbacks where usuario_id = v_uid;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;

-- 3. Apagar apelido (#admin). O registro guarda só quando e quantos torcedores, nunca o apelido.
create table if not exists public.apelidos_apagados (
  id bigint generated always as identity primary key,
  apagado_em timestamptz not null default now(),
  torcedores integer not null check (torcedores > 0)
);

alter table public.apelidos_apagados enable row level security;
revoke all on public.apelidos_apagados from anon, authenticated;
grant select, insert on public.apelidos_apagados to service_role;

drop policy if exists "ninguém pelo cliente" on public.apelidos_apagados;
create policy "ninguém pelo cliente" on public.apelidos_apagados
  as restrictive for all to anon, authenticated using (false) with check (false);

-- O mesmo ajuste de espaços do salvar_torcedor; fora isso, exato (maiúsculas contam).
create or replace function public.apelido_normalizado(p_apelido text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(btrim(coalesce(p_apelido, '')), '\s+', ' ', 'g'), '');
$$;

create or replace function public.apelido_contar(p_apelido text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_apelido text := public.apelido_normalizado(p_apelido);
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return (select count(*)::integer from public.torcedores t where v_apelido is not null and t.apelido = v_apelido);
end;
$$;

-- Limpa o apelido dos torcedores e dos desafios já criados (o link mostraria o apelido a quem abre).
-- Devolve quantos torcedores mudaram; sem nenhum, não registra nada.
create or replace function public.apelido_apagar(p_apelido text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apelido text := public.apelido_normalizado(p_apelido);
  v_n integer;
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if v_apelido is null then
    return 0;
  end if;

  update public.torcedores t set apelido = null, atualizado_em = now() where t.apelido = v_apelido;
  get diagnostics v_n = row_count;
  update public.desafios d set apelido = null where d.apelido = v_apelido;
  update public.prova_desafios d set apelido = null where d.apelido = v_apelido;

  if v_n > 0 then
    insert into public.apelidos_apagados (torcedores) values (v_n);
  end if;
  return v_n;
end;
$$;

revoke execute on function public.apelido_normalizado(text) from public, anon, authenticated;
revoke execute on function public.apelido_contar(text), public.apelido_apagar(text) from public, anon;
grant execute on function public.apelido_contar(text), public.apelido_apagar(text) to authenticated;
