-- Prazo de validade dos desafios (backlog C10, decisão do Kauê em 07/11/2026; docs/jogos/penaltis.md, "Desafio por
-- link"). Só acrescenta: nenhuma tabela ou coluna é apagada ou renomeada. As linhas que saem são só desafios com mais
-- de 30 dias, pela rotina mensal.
--
-- O que muda:
-- 1. desafio_vale_ate: todo desafio (desafios, lances_desafios, prova_desafios) vale 7 dias a partir da criação.
-- 2. penaltis_comecar e lances_comecar recusam desafio vencido com 'desafio_expirado' (410 nas funções), dentro da
--    mesma trava de quem começa a partida e com a hora gravada nela. A Prova não tem trava no banco: a função `prova`
--    confere o mesmo prazo, com a mesma hora que grava em criada_em.
-- 3. ver_desafio, ver_desafio_lances e ver_prova_desafio devolvem `vencido`. A Home não mostra o convite de desafio
--    vencido, mas a tela dos Lances e a dos pênaltis ainda leem o lance ou a disputa dele para jogar a partida normal
--    daquele desafio (com o aviso "Apitou o fim").
-- 4. apagar_desafios_antigos: no dia 1º, às 4h45, apaga os desafios criados há mais de 30 dias. Antes, conta os gerados
--    (funil_contar_gerados), que ficam para sempre em funil_contagem. Nada do funil aponta para as tabelas de desafio
--    (funil_eventos guarda só a impressão do código). As partidas de quem aceitou ficam: partidas.desafio_id (pênaltis)
--    e prova_estado.desafio_id são ON DELETE SET NULL, e o código do desafio dos Lances fica no segredo da partida,
--    sem chave estrangeira. Só o cron chama, e a função recusa prazo menor que 30 dias e data no futuro.
--
-- Site antigo com esta migração no ar: ignora `vencido` e mostra o convite. Nos pênaltis e nos Lances, ao aceitar,
-- recebe o 410 de hoje e joga a partida normal com o aviso antigo. Na Prova, o site antigo não conhece o 410: com a
-- função `prova` nova no ar, aceitar um desafio vencido cai na tela de erro até o site novo chegar. Ordem de
-- publicação: esta migração, as funções (nova-partida, lances, prova) e o site logo em seguida.

-- ---------------------------------------------------------------------------
-- 1. O prazo
-- ---------------------------------------------------------------------------
-- Vale de criado_em até, sem incluir, criado_em + 7 dias.
create or replace function public.desafio_vale_ate(p_criado_em timestamptz)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select p_criado_em + interval '7 days';
$$;
revoke execute on function public.desafio_vale_ate(timestamptz) from public, anon, authenticated;
grant execute on function public.desafio_vale_ate(timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Começar a partida de um desafio vencido: 'desafio_expirado'
-- ---------------------------------------------------------------------------
-- Igual ao de 20261105400000_lances_sem_livre.sql, mais o prazo depois da trava.
create or replace function public.penaltis_comecar(
  p_torcedor uuid,
  p_semente bigint,
  p_dificuldade numeric,
  p_expira_em timestamptz,
  p_modo text,
  p_desafio text,
  p_disputa text,
  p_numero_narrador smallint,
  p_sementes jsonb,
  p_criada_em timestamptz default now()
)
returns table (partida_id uuid, feitas integer, limite integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feitas integer;
  v_limite integer;
  v_id uuid;
  v_disputa text := p_disputa;
begin
  if p_modo not in ('normal', 'desafio') or (p_modo = 'desafio') <> (p_desafio is not null) then
    raise exception 'modo_invalido';
  end if;
  if p_criada_em is null or abs(extract(epoch from (p_criada_em - now()))) > 60 then
    raise exception 'hora_invalida';
  end if;

  -- X1: a partida joga a disputa de quem chamou, seja qual for a que veio no pedido (a medalha vai para ela).
  if p_modo = 'desafio' then
    select p.disputa_id into v_disputa
    from public.desafios d
    join public.partidas p on p.id = d.partida_id
    where d.id = p_desafio;
  end if;

  -- Sem Disputa livre a partir do corte. Um X1 sem disputa depois do corte só seria de antes dele (já expirado).
  if p_criada_em >= public.lances_unificados_desde() and v_disputa is null then
    if p_modo = 'desafio' then
      raise exception 'desafio_expirado';
    end if;
    raise exception 'disputa_obrigatoria';
  end if;

  perform pg_advisory_xact_lock(hashtext('lances_comecar'), hashtext(p_torcedor::text));

  -- Cada X1 dos pênaltis vale uma vez por pessoa: na segunda, as zonas das cobranças gravadas já seriam conhecidas.
  if p_modo = 'desafio' and exists (
    select 1 from public.partidas p
    where p.torcedor_id = p_torcedor and p.minigame = 'penaltis' and p.desafio_id = p_desafio
  ) then
    raise exception 'desafio_ja_jogado';
  end if;

  -- O desafio vale 7 dias, contados até a hora gravada na partida (e some depois de 30).
  if p_modo = 'desafio' and not exists (
    select 1 from public.desafios d where d.id = p_desafio and p_criada_em < public.desafio_vale_ate(d.criado_em)
  ) then
    raise exception 'desafio_expirado';
  end if;

  if (select count(*) from public.partidas p
      where p.torcedor_id = p_torcedor and p.criada_em >= now() - interval '1 minute')
     >= coalesce((select c.valor from public.config_deteccao c where c.chave = 'partidas_por_minuto'), 3) then
    raise exception 'muitas_partidas';
  end if;

  select h.feitas, h.limite into v_feitas, v_limite from public.lances_hoje(p_torcedor, p_criada_em) h;
  if p_criada_em >= public.lances_unificados_desde() and v_feitas >= v_limite then
    raise exception 'limite_do_dia';
  end if;

  insert into public.partidas (torcedor_id, minigame, modo, desafio_id, disputa_id, semente, dificuldade, expira_em, criada_em)
  values (p_torcedor, 'penaltis', p_modo, p_desafio, v_disputa, p_semente, p_dificuldade, p_expira_em, p_criada_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, sementes)
  values (v_id, p_numero_narrador, true, p_sementes);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

revoke execute on function
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz)
  to service_role;

-- Igual ao de 20261105100000_lances_unificados.sql, mais o prazo depois da trava.
create or replace function public.lances_comecar(
  p_torcedor uuid,
  p_semente bigint,
  p_expira_em timestamptz,
  p_segredo jsonb,
  p_modo text default 'normal',
  p_desafio text default null,
  -- A hora da partida decide a regra (antes ou depois do corte): a função passa a mesma que usou para decidir.
  p_criada_em timestamptz default now()
)
returns table (partida_id uuid, feitas integer, limite integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feitas integer;
  v_limite integer;
  v_id uuid;
begin
  if p_modo not in ('normal', 'desafio') or (p_modo = 'desafio') <> (p_desafio is not null) then
    raise exception 'modo_invalido';
  end if;
  -- A hora vem da função (só o servidor executa esta): no máximo 1 minuto de diferença do relógio do banco.
  if p_criada_em is null or abs(extract(epoch from (p_criada_em - now()))) > 60 then
    raise exception 'hora_invalida';
  end if;
  perform pg_advisory_xact_lock(hashtext('lances_comecar'), hashtext(p_torcedor::text));

  -- O desafio vale 7 dias, contados até a hora gravada na partida (e some depois de 30).
  if p_desafio is not null and not exists (
    select 1 from public.lances_desafios d where d.id = p_desafio and p_criada_em < public.desafio_vale_ate(d.criado_em)
  ) then
    raise exception 'desafio_expirado';
  end if;

  if (select count(*) from public.partidas p
      where p.torcedor_id = p_torcedor and p.criada_em >= now() - interval '1 minute')
     >= coalesce((select c.valor from public.config_deteccao c where c.chave = 'partidas_por_minuto'), 3) then
    raise exception 'muitas_partidas';
  end if;

  -- O limite do dia em que a partida vai ficar (o da hora gravada nela, não o do relógio do banco).
  select h.feitas, h.limite into v_feitas, v_limite from public.lances_hoje(p_torcedor, p_criada_em) h;
  if v_feitas >= v_limite then
    raise exception 'limite_do_dia';
  end if;

  -- Dificuldade fixa por lance (seção 7.3): a do dia não se aplica. O código do X1 fica no segredo da partida:
  -- partidas.desafio_id aponta para os desafios dos pênaltis (como a Prova, que guarda o dela em prova_estado).
  insert into public.partidas (torcedor_id, minigame, modo, semente, dificuldade, expira_em, criada_em)
  values (p_torcedor, 'lances', p_modo, p_semente, 0, p_expira_em, p_criada_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, gestos)
  values (v_id, 0, true, case when p_desafio is null then p_segredo else p_segredo || jsonb_build_object('desafio', p_desafio) end);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

revoke execute on function public.lances_comecar(uuid, bigint, timestamptz, jsonb, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.lances_comecar(uuid, bigint, timestamptz, jsonb, text, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. O resumo do desafio diz se ele venceu (o retorno muda: drop + create, com as mesmas permissões)
-- ---------------------------------------------------------------------------
-- Igual ao de 20261107000000_boneco_em_campo.sql, mais `vencido`.
drop function if exists public.ver_desafio(text);
create function public.ver_desafio(p_id text)
returns table (id text, time_id text, apelido text, gols_jogador smallint, gols_maquina smallint, pontos integer, disputa_id text,
  boneco jsonb, vencido boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.gols_jogador, d.gols_maquina, d.pontos, p.disputa_id, public.boneco_do_desafiante(d.torcedor_id),
    now() >= public.desafio_vale_ate(d.criado_em)
  from public.desafios d
  left join public.partidas p on p.id = d.partida_id
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio(text) from public;
grant execute on function public.ver_desafio(text) to anon, authenticated;

-- Igual ao de 20261107000000_boneco_em_campo.sql, mais `vencido`.
drop function if exists public.ver_desafio_lances(text);
create function public.ver_desafio_lances(p_id text)
returns table (id text, time_id text, apelido text, lance_id text, pontos integer, gols smallint, recriados smallint, faixa text,
  boneco jsonb, vencido boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.lance_id, d.pontos, d.gols, d.recriados, d.faixa, public.boneco_do_desafiante(d.torcedor_id),
    now() >= public.desafio_vale_ate(d.criado_em)
  from public.lances_desafios d
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio_lances(text) from public;
grant execute on function public.ver_desafio_lances(text) to anon, authenticated;

-- Igual ao de 20261020000000_prova.sql, mais `vencido`.
drop function if exists public.ver_prova_desafio(text);
create function public.ver_prova_desafio(p_id text)
returns table (id text, time_id text, apelido text, pontos integer, escada text, resumo text, vencido boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.pontos, d.escada, d.resumo, now() >= public.desafio_vale_ate(d.criado_em)
  from public.prova_desafios d
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_prova_desafio(text) from public;
grant execute on function public.ver_prova_desafio(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Limpeza mensal dos desafios com mais de 30 dias
-- ---------------------------------------------------------------------------
-- Devolve quantos saíram (somando os três jogos). Com menos de 30 dias ou uma data adiante, apagaria desafios que
-- ainda valem: recusa sem apagar nada, como apagar_contas_paradas.
create or replace function public.apagar_desafios_antigos(p_dias integer default 30, p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_corte timestamptz;
  v_n integer := 0;
  v_parte integer;
begin
  if coalesce(p_dias < 30 or p_agora > now(), true) then
    raise exception 'prazo_invalido' using errcode = '22023';
  end if;
  v_corte := p_agora - make_interval(days => p_dias);

  -- Os gerados ficam contados para sempre antes de as linhas saírem (até ontem; o corte é bem mais antigo).
  perform public.funil_contar_gerados();

  delete from public.desafios where criado_em < v_corte;
  get diagnostics v_parte = row_count;
  v_n := v_n + v_parte;
  delete from public.lances_desafios where criado_em < v_corte;
  get diagnostics v_parte = row_count;
  v_n := v_n + v_parte;
  delete from public.prova_desafios where criado_em < v_corte;
  get diagnostics v_parte = row_count;
  v_n := v_n + v_parte;

  return v_n;
end;
$$;

-- Só o cron (dono do banco) chama. Nenhuma função do servidor usa: a chave secreta também fica de fora.
revoke execute on function public.apagar_desafios_antigos(integer, timestamptz)
  from public, anon, authenticated, service_role;

-- Todo dia 1º, às 4h45 de Brasília (7h45 UTC). Não às 4h, com as contas paradas: apagar a conta apaga partidas e
-- depois desafios, e apagar o desafio trava a partida de quem aceitou (set null), na ordem inversa; no mesmo minuto,
-- as duas podiam se travar e uma perderia o mês. O limpar-historico-cron roda às 7h30 UTC.
select cron.schedule('apagar-desafios-antigos', '45 7 1 * *', 'select public.apagar_desafios_antigos()');
