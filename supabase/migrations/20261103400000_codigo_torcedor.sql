-- Código do torcedor (docs/jogo.md, seção 14.1): uma carreira em vários aparelhos, sem login e sem dado pessoal.
-- Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada.
--
-- Como o segundo aparelho entra na mesma conta: a função codigo-torcedor confere o código e entrega a ele um passe
-- de uso único (o link mágico da Supabase) da conta do primeiro. Para isso a conta ganha um e-mail técnico
-- (t.<32 hexadecimais sorteados>@torcedor.invalid, domínio reservado que não existe), e a Supabase passa a marcá-la
-- como não anônima. Por isso "Apagar meus dados" e a limpeza de contas paradas passam a reconhecer a conta de
-- torcedor por conta_de_torcedor, e não por is_anonymous.
--
-- O código nunca é gravado: só a impressão digital dele (HMAC-SHA256 com um segredo das funções). Tentativas
-- guardam a conta do aparelho e a hora, por 2 dias.
--
--   1. conta_de_torcedor e sessao_ativa
--   2. Tabelas: codigos_torcedor, codigo_tentativas, recordes_herdados, contas_juntadas
--   3. codigo_gerar e codigo_conferir (só a função codigo-torcedor)
--   4. juntar_torcedores (a junção, numa transação)
--   5. meu_codigo_status, meus_aparelhos e desconectar_aparelho (o celular)
--   6. recorde_pessoal com o recorde herdado
--   7. apagar_meus_dados, apagar_contas_paradas e ver_meus_dados
--   8. Aparelho desconectado não grava: salvar_torcedor, faixa, aviso de domingo, palpites, certezas e mensagens
--   9. Permissões

-- ---------------------------------------------------------------------------
-- 1. Conta de torcedor: anônima, ou ligada pelo código (e-mail técnico). Administrador nunca é.
-- ---------------------------------------------------------------------------
create or replace function public.conta_de_torcedor(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_uid
      and (u.is_anonymous or u.email ~ '^t\.[0-9a-f]{32}@torcedor\.invalid$')
  ) and not exists (select 1 from public.administradores a where a.usuario_id = p_uid);
$$;

-- A sessão do pedido ainda existe. Desconectar apaga a sessão, mas o passe (JWT) que o aparelho já tem vale até
-- vencer (1 h): tudo o que o celular grava confere aqui (seção 8), e as funções do servidor já conferem pelo Auth
-- (getUser). Só diz sim ou não sobre a própria sessão, então o celular pode chamar (as políticas precisam).
create or replace function public.sessao_ativa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid and s.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas. Nenhuma é lida ou gravada pelo celular: só pelas funções abaixo.
-- ---------------------------------------------------------------------------
create table public.codigos_torcedor (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null references auth.users (id) on delete cascade,
  -- HMAC-SHA256 do código, em hexadecimal (impressaoDoCodigo em src/jogo/codigoTorcedor.ts), com um segredo das
  -- funções: quem lê esta tabela não acha o código por força bruta.
  impressao text not null check (impressao ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  -- Aparelho que acertou o código e está escolhendo o time: o código fica só para ele.
  reservado_por uuid references auth.users (id) on delete set null,
  usado_em timestamptz,
  -- Gerar outro código mata o anterior.
  cancelado_em timestamptz
);
create unique index codigos_torcedor_impressao on public.codigos_torcedor (impressao);
create index codigos_torcedor_dono on public.codigos_torcedor (dono, criado_em desc);
create index codigos_torcedor_criado on public.codigos_torcedor (criado_em);

-- Sem chave para auth.users de propósito: apagar a conta não pode zerar o limite de tentativas nem o freio geral.
-- Some em 2 dias (faxina em codigo_gerar e codigo_conferir).
create table public.codigo_tentativas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null,
  em timestamptz not null default now(),
  acertou boolean not null
);
create index codigo_tentativas_usuario on public.codigo_tentativas (usuario_id, em);
create index codigo_tentativas_em on public.codigo_tentativas (em);

-- Recorde do aparelho que entrou na conta (a partida dele some na junção). Vale o maior, e zera junto com a
-- pré-temporada (scripts/zerar-pre-temporada.sql), como os recordes que saem das partidas.
create table public.recordes_herdados (
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  minigame text not null check (minigame in ('penaltis', 'prova', 'dia', 'crava', 'lances')),
  recorde integer not null check (recorde > 0),
  herdado_em timestamptz not null default now(),
  primary key (torcedor_id, minigame)
);

-- Só quando e se o aparelho que entrou tinha torcedor, para as métricas. Nenhum id de ninguém.
create table public.contas_juntadas (
  id bigint generated always as identity primary key,
  juntada_em timestamptz not null default now(),
  tinha_dados boolean not null
);

alter table public.codigos_torcedor enable row level security;
alter table public.codigo_tentativas enable row level security;
alter table public.recordes_herdados enable row level security;
alter table public.contas_juntadas enable row level security;
revoke all on public.codigos_torcedor, public.codigo_tentativas, public.recordes_herdados, public.contas_juntadas
  from anon, authenticated;
grant select, insert, update, delete
  on public.codigos_torcedor, public.codigo_tentativas, public.recordes_herdados, public.contas_juntadas
  to service_role;
create policy "ninguém pelo cliente" on public.codigos_torcedor
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "ninguém pelo cliente" on public.codigo_tentativas
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "ninguém pelo cliente" on public.recordes_herdados
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "ninguém pelo cliente" on public.contas_juntadas
  as restrictive for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 3. Gerar e conferir. Só a função codigo-torcedor chama (com a chave secreta), depois de conferir o login e,
--    ao conferir, o CAPTCHA. Os limites ficam aqui, com trava por conta, para chamadas ao mesmo tempo não passarem.
-- ---------------------------------------------------------------------------
-- Grava o código novo (só a impressão) e devolve quando ele vence. Um ativo por vez; até 5 por hora e 10 por dia.
create or replace function public.codigo_gerar(p_dono uuid, p_impressao text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expira timestamptz := now() + interval '10 minutes';
begin
  perform pg_advisory_xact_lock(hashtext('codigo_gerar'), hashtext(p_dono::text));
  if not public.conta_de_torcedor(p_dono) then
    raise exception 'conta_nao_anonima' using errcode = '42501';
  end if;
  if not exists (select 1 from public.torcedores t where t.id = p_dono) then
    raise exception 'sem_time' using errcode = 'P0001';
  end if;
  if (select count(*) from public.codigos_torcedor c where c.dono = p_dono and c.criado_em > now() - interval '1 hour') >= 5
    or (select count(*) from public.codigos_torcedor c where c.dono = p_dono and c.criado_em > now() - interval '1 day') >= 10 then
    raise exception 'muitos_codigos' using errcode = 'P0001';
  end if;

  -- Inclusive o reservado por quem estava escolhendo o time: o dono gerou outro, então aquele não vale mais.
  update public.codigos_torcedor c set cancelado_em = now()
  where c.dono = p_dono and c.usado_em is null and c.cancelado_em is null;
  insert into public.codigos_torcedor (dono, impressao, expira_em) values (p_dono, p_impressao, v_expira);

  delete from public.codigos_torcedor c where c.criado_em < now() - interval '2 days';
  delete from public.codigo_tentativas t where t.em < now() - interval '2 days';
  return v_expira;
end;
$$;

-- Confere o código digitado em outro aparelho (p_usuario). Situações:
--   'codigo_invalido'    não existe, venceu, foi usado, cancelado ou reservado por outro aparelho (conta um erro)
--   'muitas_tentativas'  5 erros em 15 min ou 20 em 24 h deste aparelho (não confere)
--   'pausa_geral'        200 erros em 10 min no jogo todo, de qualquer aparelho (não confere)
--   'proprio'            o código é da própria conta
--   'conta_nao_anonima'  quem digita é administrador
--   'valido'             fica reservado para este aparelho até vencer; devolve o dono e os dois times
create or replace function public.codigo_conferir(p_usuario uuid, p_impressao text)
returns table (situacao text, dono uuid, time_dono text, time_seu text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_codigo public.codigos_torcedor;
  v_erros_15 integer;
  v_erros_dia integer;
begin
  perform pg_advisory_xact_lock(hashtext('codigo_conferir'), hashtext(p_usuario::text));
  if not public.conta_de_torcedor(p_usuario) then
    return query select 'conta_nao_anonima'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select count(*) filter (where t.em > now() - interval '15 minutes'), count(*)
    into v_erros_15, v_erros_dia
  from public.codigo_tentativas t
  where t.usuario_id = p_usuario and not t.acertou and t.em > now() - interval '1 day';
  if v_erros_15 >= 5 or v_erros_dia >= 20 then
    return query select 'muitas_tentativas'::text, null::uuid, null::text, null::text;
    return;
  end if;
  -- Trava única do freio geral: rajadas de contas diferentes ao mesmo tempo não passam de 200 juntas.
  perform pg_advisory_xact_lock(hashtext('codigo_conferir_geral'));
  if (select count(*) from public.codigo_tentativas t where not t.acertou and t.em > now() - interval '10 minutes') >= 200 then
    return query select 'pausa_geral'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_codigo from public.codigos_torcedor c
  where c.impressao = p_impressao and c.usado_em is null and c.cancelado_em is null and c.expira_em > now()
    and (c.reservado_por is null or c.reservado_por = p_usuario)
  for update;

  if not found then
    insert into public.codigo_tentativas (usuario_id, acertou) values (p_usuario, false);
    delete from public.codigo_tentativas t where t.em < now() - interval '2 days';
    return query select 'codigo_invalido'::text, null::uuid, null::text, null::text;
    return;
  end if;
  if v_codigo.dono = p_usuario then
    return query select 'proprio'::text, null::uuid, null::text, null::text;
    return;
  end if;

  update public.codigos_torcedor c set reservado_por = p_usuario where c.id = v_codigo.id;
  insert into public.codigo_tentativas (usuario_id, acertou) values (p_usuario, true);
  return query select 'valido'::text, v_codigo.dono,
    (select t.time_id from public.torcedores t where t.id = v_codigo.dono),
    (select t.time_id from public.torcedores t where t.id = p_usuario);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. A junção: a conta do aparelho que entrou (p_origem) passa para a do dono do código e é apagada, tudo numa
--    transação. A função codigo-torcedor já gerou o passe do dono antes de chamar aqui; se algo falhar, nada muda e
--    o aparelho continua com a conta antiga. O que passa (seção 14.1):
--      - carreira: as partidas da carreira dos dois juntam e o XP sai da mesma conta por dia (carreira_de); Time do
--        Dia ou rodada do Crava repetidos no mesmo dia contam uma vez; bônus, um por dia e um por semana;
--      - medalhas: os gols por lance somam;
--      - recordes: fica o maior (recordes_herdados);
--      - time: igual fica; diferente, o que a pessoa escolheu (p_time). Apelido: o do dono, ou o da origem. Faixa:
--        a mais protetora das duas (decisão de 03/11/2026);
--      - Crava: a rodada inteira passa se nenhum jogo dela deu ponto à origem e o dono não palpitou nela;
--      - perguntas já vistas da Prova, aviso de domingo e mensagens do "Achei um erro".
--    Pontos que já entraram no ranking não mudam: vão para pontos_apagados como no "Apagar meus dados", e o ranking
--    os soma como um torcedor anônimo. Semana travada, temporada e fechamento não são tocados. Partidas, desafios por
--    link e Time do Dia ou Prova em andamento da origem somem com ela.
-- ---------------------------------------------------------------------------
create or replace function public.juntar_torcedores(p_impressao text, p_origem uuid, p_time text default null)
returns table (time_id text, apelido text, faixa_etaria text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_dono uuid;
  v_d public.torcedores;
  v_o public.torcedores;
  v_tem_origem boolean;
  v_time text;
  v_faixa text;
  v_ordem constant text[] := array['menos_16', '16_17', '18_mais'];
  v_rodadas smallint[];
begin
  select c.dono into v_dono from public.codigos_torcedor c where c.impressao = p_impressao;
  if v_dono is null then
    raise exception 'codigo_invalido' using errcode = 'P0001';
  end if;
  -- As duas contas, sempre na mesma ordem: duas junções com as mesmas contas nunca esperam uma pela outra em cruz.
  perform pg_advisory_xact_lock(hashtext('juntar_torcedores'), hashtext(least(v_dono::text, p_origem::text)));
  perform pg_advisory_xact_lock(hashtext('juntar_torcedores'), hashtext(greatest(v_dono::text, p_origem::text)));

  perform 1 from public.codigos_torcedor c
  where c.impressao = p_impressao and c.dono = v_dono and c.usado_em is null and c.cancelado_em is null
    and c.expira_em > now() and c.reservado_por = p_origem
  for update;
  if not found then
    raise exception 'codigo_invalido' using errcode = 'P0001';
  end if;
  if v_dono = p_origem then
    raise exception 'proprio' using errcode = 'P0001';
  end if;
  if not public.conta_de_torcedor(v_dono) or not public.conta_de_torcedor(p_origem) then
    raise exception 'conta_nao_anonima' using errcode = '42501';
  end if;

  select * into v_d from public.torcedores t where t.id = v_dono for update;
  if not found then
    raise exception 'codigo_invalido' using errcode = 'P0001';
  end if;
  select * into v_o from public.torcedores t where t.id = p_origem for update;
  v_tem_origem := found;

  update public.codigos_torcedor c set usado_em = now() where c.impressao = p_impressao;

  if v_tem_origem then
    if v_o.time_id = v_d.time_id then
      v_time := v_d.time_id;
    elsif p_time is not null and p_time in (v_d.time_id, v_o.time_id) then
      v_time := p_time;
    else
      raise exception 'escolher_time' using errcode = 'P0001';
    end if;
    v_faixa := case
      when v_d.faixa_etaria is null then v_o.faixa_etaria
      when v_o.faixa_etaria is null then v_d.faixa_etaria
      else v_ordem[least(array_position(v_ordem, v_d.faixa_etaria), array_position(v_ordem, v_o.faixa_etaria))]
    end;

    -- Os pontos da origem ficam no placar (igual ao apagar_meus_dados de 20261102000100).
    insert into public.pontos_apagados (semana, time_id, total, ultima)
    select s.semana, t.time_id, t.total, t.ultima
    from (
      select p.semana from public.partidas p where p.torcedor_id = p_origem and p.semana is not null
      union
      select public.semana_de(d.dia) from public.dia_partidas d where d.torcedor_id = p_origem
      union
      select c.semana from public.crava_pontos c where c.torcedor_id = p_origem
    ) s
    cross join lateral public.totais_semana(s.semana) t
    join public.times tm on tm.id = t.time_id and tm.oficial
    where t.torcedor_id = p_origem and t.total > 0;

    -- Recordes antes de mexer em qualquer coisa: recorde_pessoal lê as partidas da origem e o herdado dela.
    insert into public.recordes_herdados as h (torcedor_id, minigame, recorde)
    select v_dono, m.minigame, r.recorde
    from (values ('penaltis'), ('prova'), ('dia'), ('crava'), ('lances')) as m (minigame)
    cross join lateral (select public.recorde_pessoal(p_origem, m.minigame) as recorde) r
    where r.recorde > 0
    on conflict (torcedor_id, minigame) do update
      set recorde = excluded.recorde, herdado_em = now()
      where excluded.recorde > h.recorde;

    update public.torcedores t
      set time_id = v_time, apelido = coalesce(v_d.apelido, v_o.apelido), faixa_etaria = v_faixa, atualizado_em = now()
      where t.id = v_dono;

    insert into public.carreira_partidas (torcedor_id, origem, referencia, dia, criado_em)
    select v_dono, c.origem, c.referencia, c.dia, c.criado_em
    from public.carreira_partidas c where c.torcedor_id = p_origem
    on conflict do nothing;
    insert into public.carreira_bonus (torcedor_id, tipo, referencia, time_id, xp, criado_em)
    select v_dono, b.tipo, b.referencia, b.time_id, b.xp, b.criado_em
    from public.carreira_bonus b where b.torcedor_id = p_origem
    on conflict do nothing;

    update public.lances_gols g set torcedor_id = v_dono where g.torcedor_id = p_origem;

    select coalesce(array_agg(r.rodada), '{}') into v_rodadas
    from (
      select j.rodada from public.palpites p join public.jogos j on j.id = p.jogo_id where p.torcedor_id = p_origem
      union
      select c.rodada from public.certezas c where c.torcedor_id = p_origem
    ) r
    where not exists (select 1 from public.crava_pontos cp where cp.torcedor_id = p_origem and cp.rodada = r.rodada)
      and not exists (
        select 1 from public.palpites p join public.jogos j on j.id = p.jogo_id
        where p.torcedor_id = v_dono and j.rodada = r.rodada)
      and not exists (select 1 from public.certezas c where c.torcedor_id = v_dono and c.rodada = r.rodada);
    -- O gatilho do palpite grava o time de agora do dono (o escolhido acima).
    update public.palpites p set torcedor_id = v_dono
    from public.jogos j
    where j.id = p.jogo_id and p.torcedor_id = p_origem and j.rodada = any (v_rodadas);
    update public.certezas c set torcedor_id = v_dono where c.torcedor_id = p_origem and c.rodada = any (v_rodadas);

    insert into public.prova_vistas as v (torcedor_id, pergunta_id, vista_em)
    select v_dono, o.pergunta_id, o.vista_em from public.prova_vistas o where o.torcedor_id = p_origem
    on conflict (torcedor_id, pergunta_id) do update set vista_em = greatest(v.vista_em, excluded.vista_em);
  end if;

  update public.push_inscricoes i set torcedor_id = v_dono where i.torcedor_id = p_origem;
  -- No máximo 5 aparelhos por pessoa, como no salvar_inscricao_push (o mais antigo sai).
  delete from public.push_inscricoes i
  where i.torcedor_id = v_dono
    and i.endpoint not in (
      select x.endpoint from public.push_inscricoes x where x.torcedor_id = v_dono order by x.criada_em desc limit 5
    );
  update public.feedbacks f set usuario_id = v_dono where f.usuario_id = p_origem;
  -- Como no salvar_faixa_etaria: só 18+ recebe o aviso de domingo.
  if v_faixa is not null and v_faixa <> '18_mais' then
    delete from public.push_inscricoes i where i.torcedor_id = v_dono;
  end if;

  delete from auth.users where id = p_origem;
  insert into public.contas_juntadas (tinha_dados) values (v_tem_origem);

  return query select t.time_id, t.apelido, t.faixa_etaria from public.torcedores t where t.id = v_dono;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. O celular: status do último código, aparelhos ligados e desconectar.
-- ---------------------------------------------------------------------------
create or replace function public.meu_codigo_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.usado_em is not null then 'usado'
    when c.cancelado_em is not null or c.expira_em <= now() then 'vencido'
    else 'ativo'
  end
  from public.codigos_torcedor c
  where c.dono = auth.uid() and public.sessao_ativa()
  order by c.criado_em desc
  limit 1;
$$;

-- Cada sessão da conta é um aparelho (ou navegador). Sem o IP: só o que o navegador contou de si mesmo.
create or replace function public.meus_aparelhos()
returns table (id uuid, criado_em timestamptz, usado_em timestamptz, user_agent text, este boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  return query
  select s.id, s.created_at,
    greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'UTC'),
    left(s.user_agent, 300),
    s.id = (auth.jwt() ->> 'session_id')::uuid
  from auth.sessions s
  where s.user_id = auth.uid() and (s.not_after is null or s.not_after > now())
  order by 5 desc, 3 desc;
end;
$$;

-- Apagar a sessão tira do aparelho o direito de renovar o acesso; as funções que mexem na conta já o recusam
-- (sessao_ativa e getUser nas funções do servidor). O próprio aparelho não se desconecta por aqui.
create or replace function public.desconectar_aparelho(p_sessao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if p_sessao = (auth.jwt() ->> 'session_id')::uuid then
    raise exception 'este_aparelho' using errcode = 'P0001';
  end if;
  delete from auth.sessions s where s.id = p_sessao and s.user_id = auth.uid();
  if not found then
    raise exception 'nao_encontrado' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Igual ao de 20261103200000_lances_valendo.sql, mais o recorde herdado na junção (vale o maior).
-- ---------------------------------------------------------------------------
create or replace function public.recorde_pessoal(p_torcedor uuid, p_minigame text, p_antes timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    case
      when p_minigame in ('penaltis', 'prova', 'lances') then (
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
    end,
    (select h.recorde from public.recordes_herdados h
     where h.torcedor_id = p_torcedor and h.minigame = p_minigame and (p_antes is null or h.herdado_em < p_antes))
  );
$$;

-- ---------------------------------------------------------------------------
-- 7a. Igual ao de 20261102000100_termos_x_jogo.sql, com conta_de_torcedor no lugar de is_anonymous (a conta ligada
--     pelo código também se apaga) e a sessão conferida (aparelho desconectado não apaga a conta). Apaga a conta
--     em todos os aparelhos ligados: as sessões saem junto com o usuário.
-- ---------------------------------------------------------------------------
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
  -- Já apagada (sessão antiga de antes do apagar): nada a fazer, como antes.
  if not exists (select 1 from auth.users u where u.id = v_uid) then
    return;
  end if;
  if not public.conta_de_torcedor(v_uid) then
    raise exception 'conta_nao_anonima' using errcode = '42501';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
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

-- ---------------------------------------------------------------------------
-- 7b. Igual ao de 20261103000100_travas_limpeza_e_fechamento.sql, com conta_de_torcedor no lugar de is_anonymous e
--     do teste de administrador (que conta_de_torcedor já faz): a conta ligada pelo código também é limpa.
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
  where u.created_at < v_corte
    and public.conta_de_torcedor(u.id)
    and coalesce(public.ultima_atividade(u.id), u.created_at) < v_corte;

  v_n := coalesce(array_length(v_uids, 1), 0);
  if v_n = 0 then
    return 0;
  end if;

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

-- ---------------------------------------------------------------------------
-- 7c. Igual ao de 20261103200000_lances_valendo.sql, mais quantos aparelhos estão ligados à conta. Aparelho
--     desconectado não lê (as mensagens do "Achei um erro" têm texto livre).
-- ---------------------------------------------------------------------------
create or replace function public.ver_meus_dados()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eu as (select auth.uid() as id)
  select case when eu.id is null or not public.sessao_ativa() then null else jsonb_build_object(
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
    'gols_lances', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id),
    'avisos', (select count(*)::integer from public.push_inscricoes i where i.torcedor_id = eu.id),
    'aparelhos', (
      select count(*)::integer from auth.sessions s
      where s.user_id = eu.id and (s.not_after is null or s.not_after > now())
    ),
    'mensagens', (
      select coalesce(jsonb_agg(jsonb_build_object('tipo', f.tipo, 'texto', f.texto, 'tela', f.tela, 'aparelho', f.aparelho, 'criado_em', f.criado_em)
        order by f.criado_em desc), '[]'::jsonb)
      from public.feedbacks f where f.usuario_id = eu.id
    )
  ) end
  from eu;
$$;

-- ---------------------------------------------------------------------------
-- 8. Aparelho desconectado não grava na conta, nem com o passe que ainda vale (revisão de 03/11/2026). Funções:
--    iguais às anteriores, mais a sessão conferida. Tabelas: políticas restritivas novas, somadas às de antes.
-- ---------------------------------------------------------------------------
-- Igual ao de 20261019000000_base.sql, mais a sessão.
create or replace function public.salvar_torcedor(p_time text, p_apelido text default null)
returns public.torcedores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_apelido text := nullif(btrim(coalesce(p_apelido, '')), '');
  v_linha public.torcedores;
begin
  if v_uid is null then
    raise exception 'sem_login' using errcode = '28000';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if not exists (select 1 from public.times where id = p_time) then
    raise exception 'time_invalido' using errcode = '22023';
  end if;
  if v_apelido is not null then
    v_apelido := regexp_replace(v_apelido, '\s+', ' ', 'g');
    if char_length(v_apelido) > 20 then
      raise exception 'apelido_longo' using errcode = '22023';
    end if;
    if public.apelido_bloqueado(v_apelido) then
      raise exception 'apelido_bloqueado' using errcode = '22023';
    end if;
  end if;

  insert into public.torcedores (id, time_id, apelido)
  values (v_uid, p_time, v_apelido)
  on conflict (id) do update
    set time_id = excluded.time_id, apelido = excluded.apelido, atualizado_em = now()
  returning * into v_linha;
  return v_linha;
end;
$$;

-- Igual ao de 20261031100000_faixa_etaria.sql, mais a sessão.
create or replace function public.salvar_faixa_etaria(p_faixa text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achou boolean;
begin
  if auth.uid() is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if p_faixa is null or p_faixa not in ('menos_16', '16_17', '18_mais') then
    raise exception 'faixa_invalida' using errcode = '22023';
  end if;
  update public.torcedores set faixa_etaria = p_faixa where id = auth.uid();
  v_achou := found;
  if p_faixa <> '18_mais' then
    delete from public.push_inscricoes where torcedor_id = auth.uid();
  end if;
  return v_achou;
end;
$$;

-- Igual ao de 20261031100000_faixa_etaria.sql, mais a sessão.
create or replace function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if not exists (select 1 from public.torcedores t where t.id = auth.uid() and t.faixa_etaria = '18_mais') then
    raise exception 'so_18_mais' using errcode = '42501';
  end if;
  insert into public.push_inscricoes (endpoint, p256dh, auth, torcedor_id)
  values (p_endpoint, p_p256dh, p_auth, auth.uid())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, torcedor_id = excluded.torcedor_id, falhas = 0;
  -- No máximo 5 aparelhos por pessoa (o mais antigo sai).
  delete from public.push_inscricoes
  where torcedor_id = auth.uid()
    and endpoint not in (
      select endpoint from public.push_inscricoes where torcedor_id = auth.uid() order by criada_em desc limit 5
    );
end;
$$;

-- Igual ao de 20261026000300_push.sql, mais a sessão.
create or replace function public.remover_inscricao_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_inscricoes where endpoint = p_endpoint and torcedor_id = auth.uid() and public.sessao_ativa();
$$;

create policy "palpites: só com a sessão ativa (cria)" on public.palpites
  as restrictive for insert to authenticated with check ((select public.sessao_ativa()));
create policy "palpites: só com a sessão ativa (muda)" on public.palpites
  as restrictive for update to authenticated using ((select public.sessao_ativa())) with check ((select public.sessao_ativa()));
create policy "palpites: só com a sessão ativa (apaga)" on public.palpites
  as restrictive for delete to authenticated using ((select public.sessao_ativa()));
create policy "certezas: só com a sessão ativa (marca)" on public.certezas
  as restrictive for insert to authenticated with check ((select public.sessao_ativa()));
create policy "certezas: só com a sessão ativa (troca)" on public.certezas
  as restrictive for update to authenticated using ((select public.sessao_ativa())) with check ((select public.sessao_ativa()));
create policy "certezas: só com a sessão ativa (desmarca)" on public.certezas
  as restrictive for delete to authenticated using ((select public.sessao_ativa()));
create policy "feedbacks: só com a sessão ativa" on public.feedbacks
  as restrictive for insert to authenticated with check ((select public.sessao_ativa()));

-- ---------------------------------------------------------------------------
-- 9. Permissões explícitas. Internas: ninguém de fora (nem a chave secreta). Gerar, conferir e juntar: só a
--    função codigo-torcedor (chave secreta). Status, aparelhos e desconectar: quem tem sessão.
-- ---------------------------------------------------------------------------
revoke execute on function public.conta_de_torcedor(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.sessao_ativa() from public, anon, service_role;
grant execute on function public.sessao_ativa() to authenticated;
revoke execute on function public.codigo_gerar(uuid, text), public.codigo_conferir(uuid, text),
  public.juntar_torcedores(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.codigo_gerar(uuid, text), public.codigo_conferir(uuid, text),
  public.juntar_torcedores(text, uuid, text)
  to service_role;
revoke execute on function public.meu_codigo_status(), public.meus_aparelhos(), public.desconectar_aparelho(uuid)
  from public, anon;
grant execute on function public.meu_codigo_status(), public.meus_aparelhos(), public.desconectar_aparelho(uuid)
  to authenticated;
revoke execute on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;
revoke execute on function public.apagar_contas_paradas(integer, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function public.ver_meus_dados() from public, anon;
grant execute on function public.ver_meus_dados() to authenticated;
revoke execute on function public.salvar_torcedor(text, text), public.salvar_faixa_etaria(text),
  public.salvar_inscricao_push(text, text, text), public.remover_inscricao_push(text)
  from public, anon;
grant execute on function public.salvar_torcedor(text, text), public.salvar_faixa_etaria(text),
  public.salvar_inscricao_push(text, text, text), public.remover_inscricao_push(text)
  to authenticated;
