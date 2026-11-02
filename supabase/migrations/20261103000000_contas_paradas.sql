-- Contas paradas (parecer de 02/11/2026, docs/termos-x-jogo.md, ponto 1). Só acrescenta: nenhuma coluna ou
-- tabela é apagada nem renomeada.
--   Conta anônima sem jogar há mais de 6 meses é apagada uma vez por mês. "Jogar" = partida (Pênaltis e
--   Lances), Time do Dia, resposta da Prova ou palpite; abrir o site não conta. A carreira só reflete esses. Antes, os pontos dela viram
--   total anônimo em pontos_apagados, como no "Apagar meus dados", para o placar da torcida não mudar.
--   Conta de verdade (com e-mail) e administrador nunca entram.

-- Registro: só quando e quantas contas, nada que identifique alguém.
create table if not exists public.contas_paradas_apagadas (
  id bigint generated always as identity primary key,
  apagado_em timestamptz not null default now(),
  contas integer not null check (contas > 0)
);

alter table public.contas_paradas_apagadas enable row level security;
revoke all on public.contas_paradas_apagadas from anon, authenticated;
grant select, insert on public.contas_paradas_apagadas to service_role;

drop policy if exists "ninguém pelo cliente" on public.contas_paradas_apagadas;
create policy "ninguém pelo cliente" on public.contas_paradas_apagadas
  as restrictive for all to anon, authenticated using (false) with check (false);

-- Última vez que a pessoa jogou; nula se nunca jogou.
create or replace function public.ultima_atividade(p_uid uuid)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select max(m) from (
    select max(p.criada_em) as m from public.partidas p where p.torcedor_id = p_uid
    union all select max(d.criada_em) from public.dia_partidas d where d.torcedor_id = p_uid
    union all select max(r.respondida_em) from public.prova_respostas r where r.torcedor_id = p_uid
    union all select max(g.atualizado_em) from public.palpites g where g.torcedor_id = p_uid
  ) x;
$$;

-- Apaga as contas paradas e devolve quantas. Conta criada há menos do prazo nunca entra, mesmo sem jogar.
create or replace function public.apagar_contas_paradas(p_meses integer default 6, p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_corte timestamptz := p_agora - make_interval(months => p_meses);
  v_uids uuid[];
  v_n integer;
begin
  select coalesce(array_agg(u.id), '{}') into v_uids
  from auth.users u
  where u.is_anonymous
    and u.created_at < v_corte
    and not exists (select 1 from public.administradores a where a.usuario_id = u.id)
    and coalesce(public.ultima_atividade(u.id), u.created_at) < v_corte;

  v_n := coalesce(array_length(v_uids, 1), 0);
  if v_n = 0 then
    return 0;
  end if;

  -- O mesmo total do apagar_meus_dados (20261102000100), para todas as contas de uma vez.
  insert into public.pontos_apagados (semana, time_id, total, ultima)
  select s.semana, t.time_id, t.total, t.ultima
  from (
    select p.torcedor_id as uid, p.semana from public.partidas p where p.torcedor_id = any (v_uids) and p.semana is not null
    union
    select d.torcedor_id, public.semana_de(d.dia) from public.dia_partidas d where d.torcedor_id = any (v_uids)
    union
    select c.torcedor_id, c.semana from public.crava_pontos c where c.torcedor_id = any (v_uids)
  ) s
  cross join lateral public.totais_semana(s.semana) t
  join public.times tm on tm.id = t.time_id and tm.oficial
  where t.torcedor_id = s.uid and t.total > 0;

  delete from public.feedbacks where usuario_id = any (v_uids);
  delete from auth.users where id = any (v_uids);

  insert into public.contas_paradas_apagadas (contas) values (v_n);
  return v_n;
end;
$$;

-- Só o cron (dono do banco) chama.
revoke execute on function public.ultima_atividade(uuid), public.apagar_contas_paradas(integer, timestamptz)
  from public, anon, authenticated;

-- Todo dia 1º, às 4h de Brasília (7h UTC), longe da virada da semana e do fechamento do mês.
select cron.schedule('apagar-contas-paradas', '0 7 1 * *', 'select public.apagar_contas_paradas()');
