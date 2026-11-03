-- Travas da revisão de segurança de 02/11/2026 (limpeza de contas paradas e ranking de minuto em minuto). Só
-- acrescenta: nenhuma coluna ou tabela é apagada nem renomeada, e nenhuma conta muda.
--   1. apagar_contas_paradas: recusa prazo menor que 6 meses ou data no futuro (com 0 meses ou uma data
--      adiante, apagaria todas as contas anônimas), sai do alcance da chave secreta das funções (só o cron
--      chama) e calcula os pontos uma vez por semana, não uma vez por conta e semana.
--   2. fechar_semana: trava a semana antes de copiar o ranking, também quando não refaz a conta. Sem a trava,
--      uma rotina do minuto rodando junto na segunda 12h podia regravar ranking_semana depois da cópia, e o
--      fechamento travado ficaria diferente dele.

-- ---------------------------------------------------------------------------
-- 1. Igual ao de 20261103000000_contas_paradas.sql, mais a recusa no começo e os pontos por semana.
-- ---------------------------------------------------------------------------
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
  if coalesce(p_meses < 6 or p_agora > now(), true) then
    raise exception 'prazo_invalido' using errcode = '22023';
  end if;

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

  -- O mesmo total do apagar_meus_dados (20261102000100), para todas as contas de uma vez. As semanas são
  -- as das três fontes de pontos_semana; totais_semana roda uma vez por semana e serve a todas as contas.
  insert into public.pontos_apagados (semana, time_id, total, ultima)
  select s.semana, t.time_id, t.total, t.ultima
  from (
    select p.semana from public.partidas p where p.torcedor_id = any (v_uids) and p.semana is not null
    union
    select public.semana_de(d.dia) from public.dia_partidas d where d.torcedor_id = any (v_uids)
    union
    select c.semana from public.crava_pontos c where c.torcedor_id = any (v_uids)
  ) s
  cross join lateral public.totais_semana(s.semana) t
  join public.times tm on tm.id = t.time_id and tm.oficial
  where t.torcedor_id = any (v_uids) and t.total > 0;

  delete from public.feedbacks where usuario_id = any (v_uids);
  delete from auth.users where id = any (v_uids);

  insert into public.contas_paradas_apagadas (contas) values (v_n);
  return v_n;
end;
$$;

-- Só o cron (dono do banco) chama. Nenhuma função do servidor usa: a chave secreta também fica de fora.
revoke execute on function public.apagar_contas_paradas(integer, timestamptz)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Igual ao de 20261102100000_ranking_por_minuto.sql, mais a trava da semana depois de esvaziar a fila (a
--    mesma ordem de atualizar_rankings: fila, depois trava, para as duas nunca esperarem uma pela outra).
--    Com a trava, a rotina do minuto ou terminou antes da cópia, ou espera e encontra a semana travada.
--    Quem chegou junto e esperou encontra a semana já travada e sai sem gravar de novo.
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

  perform pg_advisory_xact_lock(hashtext('ranking_semana'), p_semana - date '2000-01-03');
  if public.semana_travada(p_semana) then
    return;
  end if;

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
