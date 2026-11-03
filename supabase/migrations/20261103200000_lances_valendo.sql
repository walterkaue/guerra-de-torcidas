-- Lances do Jogo valendo pontos na pré-temporada (docs/jogo.md, seção 7.3). Só acrescenta: nenhuma coluna ou
-- tabela é apagada ou renomeada. A regra de checagem de partidas.minigame é trocada para aceitar 'lances'.
--
-- A partida dos Lances mora em `partidas` (minigame = 'lances'), jogada lance a lance pela função `lances`:
-- a semente e os gestos ficam no servidor (partidas_segredo), como nos pênaltis. Por estar em `partidas`, ela
-- já entra na Carreira (gatilho carreira_partida), na fila de suspeitas do #admin, em "ver meus dados", na
-- limpeza de contas paradas e no ranking de minuto em minuto (fechar_partida anota a semana).
--
-- O que muda:
--   1. minigame aceita 'lances'.
--   2. Teto do dia: pênaltis e Prova seguem nas 5 melhores; dos Lances conta só a melhor partida do dia, por
--      fora das 5. As duas usam conta_no_teto, então pontos_semana (e o ranking) não muda.
--   3. Posição na semana, recorde e liberar suspeita aceitam 'lances'.
--   4. Medalhas: lances_gols, um gol por linha, sem chave para partidas (o zerar-pre-temporada apaga as
--      partidas e as medalhas ficam). Leitura só por funções.
--   5. Limite de 6 partidas valendo por dia (lances_comecar, com trava) e números da detecção em config_deteccao.

-- ---------------------------------------------------------------------------
-- 1. minigame
-- ---------------------------------------------------------------------------
do $$
declare
  v_nome text;
begin
  for v_nome in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.partidas'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%minigame%'
  loop
    execute format('alter table public.partidas drop constraint %I', v_nome);
  end loop;
end;
$$;

alter table public.partidas
  add constraint partidas_minigame_check check (minigame in ('penaltis', 'prova', 'lances'));

-- ---------------------------------------------------------------------------
-- 2. Configuração (editável no Table Editor, sem nova migração)
-- ---------------------------------------------------------------------------
insert into public.config_deteccao (chave, valor, descricao) values
  ('lances_por_dia', 6, 'Lances do Jogo: partidas valendo que cada torcedor pode começar por dia (Brasília)'),
  ('lances_janela_gesto', 15, 'Lances: últimas N tentativas valendo do mesmo lance para o gesto de robô'),
  ('lances_espalhamento_max', 2, 'Lances: marca se direção e força variam no máximo isto na janela do gesto'),
  ('lances_janela_gols', 30, 'Lances: últimas N tentativas valendo em lances Difícil ou Craque'),
  ('lances_min_gols', 27, 'Lances: marca com pelo menos isto de gols na janela (a mira perfeita fica abaixo)')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Teto do dia: 5 melhores entre pênaltis e Prova, mais a melhor partida dos Lances.
--    Igual ao de 20261019200000_crava.sql, mais a vaga própria dos Lances.
-- ---------------------------------------------------------------------------
create or replace function public.atualizar_teto(p_torcedor uuid, p_dia date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.partidas p
  set conta_no_teto = p.id in (
    (
      select q.id
      from public.partidas q
      where q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
        and not q.sob_suspeita and not q.amistoso and q.minigame <> 'lances'
      order by q.pontos desc, q.fechada_em asc
      limit 5
    )
    union all
    (
      select q.id
      from public.partidas q
      where q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
        and not q.sob_suspeita and not q.amistoso and q.minigame = 'lances'
      order by q.pontos desc, q.fechada_em asc
      limit 1
    )
  )
  where p.torcedor_id = p_torcedor and p.dia = p_dia and p.fechada_em is not null;
$$;

-- ---------------------------------------------------------------------------
-- 4. Posição e recorde: iguais aos de 20261020300000_pre_temporada.sql, com 'lances' junto de pênaltis e
--    Prova (pela melhor partida da semana; recorde = melhor partida).
-- ---------------------------------------------------------------------------
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
    where p_minigame in ('penaltis', 'prova', 'lances') and p.minigame = p_minigame
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

create or replace function public.recorde_pessoal(p_torcedor uuid, p_minigame text, p_antes timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
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
  end;
$$;

create or replace function public.meus_recordes()
returns table (minigame text, recorde integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.minigame, public.recorde_pessoal(auth.uid(), m.minigame)
  from (values ('penaltis'), ('prova'), ('dia'), ('crava'), ('lances')) as m (minigame)
  where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- 5. Revisão de suspeitas: igual ao de 20261102100000_ranking_por_minuto.sql, com 'lances'. Liberar refaz
--    o teto (a partida pode virar a melhor do dia) e o gatilho das medalhas anota os gols dela.
-- ---------------------------------------------------------------------------
create or replace function public.suspeitas_decidir(p_minigame text, p_id text, p_liberar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_torcedor uuid;
  v_dia date;
  v_amistoso boolean;
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if p_minigame = 'dia' then
    if p_id !~ '^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$' then
      raise exception 'fora_da_fila';
    end if;
    update public.dia_partidas d
      set revisada_em = now(), sob_suspeita = not p_liberar
      where d.torcedor_id = split_part(p_id, ':', 1)::uuid and d.dia = split_part(p_id, ':', 2)::date
        and d.sob_suspeita and d.revisada_em is null and d.fechada_em is not null
      returning d.dia, d.amistoso into v_dia, v_amistoso;
    if not found then
      raise exception 'fora_da_fila';
    end if;
  elsif p_minigame in ('penaltis', 'prova', 'lances') then
    if p_id !~ '^[0-9a-f-]{36}$' then
      raise exception 'fora_da_fila';
    end if;
    update public.partidas p
      set revisada_em = now(), sob_suspeita = not p_liberar
      where p.id = p_id::uuid and p.minigame = p_minigame
        and p.sob_suspeita and p.revisada_em is null and p.fechada_em is not null
      returning p.torcedor_id, p.dia, p.amistoso into v_torcedor, v_dia, v_amistoso;
    if not found then
      raise exception 'fora_da_fila';
    end if;
    if p_liberar then
      perform public.atualizar_teto(v_torcedor, v_dia);
    end if;
  else
    raise exception 'fora_da_fila';
  end if;

  if p_liberar and not v_amistoso and not public.semana_confirmada(public.semana_de(v_dia)) then
    perform public.marcar_ranking(public.semana_de(v_dia));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Medalhas por lance (seção 7.3, "Medalhas e Conquistas"): só gols em partidas valendo, sem suspeita.
--    Nunca zeram: sem chave estrangeira para partidas, o zerar-pre-temporada não leva estas linhas.
--    Somem só com a conta da pessoa (apagar meus dados, contas paradas), pela chave de torcedores.
-- ---------------------------------------------------------------------------
create table public.lances_gols (
  partida_id uuid not null,
  -- Posição do lance na partida (0 a 2).
  i smallint not null check (i between 0 and 2),
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  -- Id do lance no catálogo (src/dados/lances.ts); nunca muda depois de publicado.
  lance_id text not null,
  recriou boolean not null,
  criado_em timestamptz not null default now(),
  primary key (partida_id, i)
);
create index lances_gols_torcedor on public.lances_gols (torcedor_id, lance_id);

alter table public.lances_gols enable row level security;
revoke all on public.lances_gols from anon, authenticated;
grant all on public.lances_gols to service_role;
-- O celular lê só pelas funções abaixo (as próprias medalhas e a soma por torcida).
create policy "lances_gols: ninguém pelo cliente" on public.lances_gols
  as restrictive for all to anon, authenticated using (false) with check (false);

-- Anota os gols de uma partida dos Lances que fechou sem suspeita, ou que foi liberada na revisão.
-- Partida que vira suspeita depois não tira gol (como na Carreira).
create or replace function public.lances_anotar_gols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou)
  select new.id, (x.ord - 1)::smallint, new.torcedor_id, x.l ->> 'lanceId', coalesce((x.l ->> 'recriou')::boolean, false)
  from jsonb_array_elements(coalesce(new.resultado -> 'lances', '[]'::jsonb)) with ordinality as x (l, ord)
  where x.l ->> 'desfecho' = 'gol' and x.l ->> 'lanceId' is not null and x.ord <= 3
  on conflict (partida_id, i) do nothing;
  return null;
end;
$$;

create trigger lances_gols after insert or update of fechada_em, sob_suspeita on public.partidas
  for each row when (new.minigame = 'lances' and new.fechada_em is not null and not new.sob_suspeita)
  execute function public.lances_anotar_gols();

-- Medalha de cada lance de uma pessoa. Mesmos números de MEDALHAS em src/jogo/lances.ts (bronze 5 gols,
-- prata 20, ouro 50 com 10 recriando): mudou lá, muda aqui.
create or replace function public.medalhas_de(p_torcedor uuid)
returns table (lance_id text, gols integer, recriados integer, medalha text)
language sql
stable
security definer
set search_path = ''
as $$
  select g.lance_id, count(*)::integer, (count(*) filter (where g.recriou))::integer,
    case
      when count(*) >= 50 and count(*) filter (where g.recriou) >= 10 then 'ouro'
      when count(*) >= 20 then 'prata'
      when count(*) >= 5 then 'bronze'
    end
  from public.lances_gols g
  where g.torcedor_id = p_torcedor
  group by g.lance_id;
$$;

create or replace function public.minhas_medalhas()
returns table (lance_id text, gols integer, recriados integer, medalha text)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.medalhas_de(auth.uid()) where auth.uid() is not null;
$$;

-- Vitrine: medalhas somadas por torcida (pelo time atual de quem ganhou), sem ninguém identificado.
create or replace function public.vitrine_medalhas()
returns table (time_id text, bronze integer, prata integer, ouro integer)
language sql
stable
security definer
set search_path = ''
as $$
  with por_lance as (
    select g.torcedor_id, count(*) as gols, count(*) filter (where g.recriou) as recriados
    from public.lances_gols g
    group by g.torcedor_id, g.lance_id
  )
  select t.time_id,
    (count(*) filter (where l.gols >= 5 and l.gols < 20))::integer,
    (count(*) filter (where l.gols >= 20 and not (l.gols >= 50 and l.recriados >= 10)))::integer,
    (count(*) filter (where l.gols >= 50 and l.recriados >= 10))::integer
  from por_lance l
  join public.torcedores t on t.id = l.torcedor_id
  join public.times tm on tm.id = t.time_id and tm.oficial
  where l.gols >= 5
  group by t.time_id;
$$;

-- Hoje nos Lances: partidas valendo começadas hoje (Brasília), o limite e a melhor do dia.
create or replace function public.lances_hoje(p_torcedor uuid)
returns table (feitas integer, limite integer, melhor integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.partidas p
      where p.torcedor_id = p_torcedor and p.minigame = 'lances'
        and (p.criada_em at time zone 'America/Sao_Paulo')::date = public.hoje_brasilia()),
    coalesce((select c.valor::integer from public.config_deteccao c where c.chave = 'lances_por_dia'), 6),
    -- Pelo dia em que começou, como `feitas` (a fechada até 00h05 conta no dia anterior e sai daqui também).
    (select max(p.pontos)::integer from public.partidas p
      where p.torcedor_id = p_torcedor and p.minigame = 'lances'
        and (p.criada_em at time zone 'America/Sao_Paulo')::date = public.hoje_brasilia()
        and p.fechada_em is not null and not p.sob_suspeita);
$$;

-- Começa uma partida dos Lances numa transação só, com trava por torcedor: o limite do dia e o de partidas
-- por minuto não passam com chamadas ao mesmo tempo, e a partida nunca fica sem a linha do segredo.
-- Erros: 'limite_do_dia' e 'muitas_partidas' (a função lances responde 429).
create or replace function public.lances_comecar(p_torcedor uuid, p_semente bigint, p_expira_em timestamptz, p_segredo jsonb)
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
  perform pg_advisory_xact_lock(hashtext('lances_comecar'), hashtext(p_torcedor::text));

  if (select count(*) from public.partidas p
      where p.torcedor_id = p_torcedor and p.criada_em >= now() - interval '1 minute')
     >= coalesce((select c.valor from public.config_deteccao c where c.chave = 'partidas_por_minuto'), 3) then
    raise exception 'muitas_partidas';
  end if;

  select h.feitas, h.limite into v_feitas, v_limite from public.lances_hoje(p_torcedor) h;
  if v_feitas >= v_limite then
    raise exception 'limite_do_dia';
  end if;

  -- Dificuldade fixa por lance (seção 7.3): a do dia não se aplica.
  insert into public.partidas (torcedor_id, minigame, modo, semente, dificuldade, expira_em)
  values (p_torcedor, 'lances', 'normal', p_semente, 0, p_expira_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, gestos)
  values (v_id, 0, true, p_segredo);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

create or replace function public.meus_lances_hoje()
returns table (feitas integer, limite integer, melhor integer)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.lances_hoje(auth.uid()) where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- 7. "Ver meus dados": igual ao de 20261102000100_termos_x_jogo.sql, mais os gols das medalhas (que
--    ficam depois do zerar). As partidas dos Lances já entram na contagem por minigame.
-- ---------------------------------------------------------------------------
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
    'gols_lances', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id),
    'avisos', (select count(*)::integer from public.push_inscricoes i where i.torcedor_id = eu.id),
    'mensagens', (
      select coalesce(jsonb_agg(jsonb_build_object('tipo', f.tipo, 'texto', f.texto, 'tela', f.tela, 'aparelho', f.aparelho, 'criado_em', f.criado_em)
        order by f.criado_em desc), '[]'::jsonb)
      from public.feedbacks f where f.usuario_id = eu.id
    )
  ) end
  from eu;
$$;

-- ---------------------------------------------------------------------------
-- 8. Permissões explícitas: as internas só para o servidor; as "minha_…"/"meus_…" e a vitrine para quem
--    tem sessão (o login anônimo também é authenticated).
-- ---------------------------------------------------------------------------
revoke execute on function public.lances_anotar_gols(), public.medalhas_de(uuid), public.minhas_medalhas(),
  public.vitrine_medalhas(), public.lances_hoje(uuid), public.meus_lances_hoje(),
  public.lances_comecar(uuid, bigint, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.medalhas_de(uuid), public.lances_hoje(uuid),
  public.lances_comecar(uuid, bigint, timestamptz, jsonb) to service_role;
grant execute on function public.minhas_medalhas(), public.vitrine_medalhas(), public.meus_lances_hoje()
  to authenticated;
