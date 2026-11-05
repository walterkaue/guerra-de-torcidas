-- Lances do Jogo unificados (docs/jogo.md, seção 14.7): Pênaltis, Faltas e Cara a cara num jogo só, a partir da
-- segunda 16/11/2026, 0h de Brasília, sempre pela data de criação da partida (ou pelo dia em que ela conta).
-- Nenhuma coluna ou tabela é apagada ou renomeada. As funções que mudam de assinatura são recriadas (drop + create).
-- Antes do corte, tudo continua como em 20261103200000_lances_valendo.sql: as funções escolhem a regra pela data.
--
--   1. Data de corte e configuração
--   2. Teto do dia com as duas regras (atualizar_teto)
--   3. Limite do dia somando pênaltis e Lances, com trava por torcedor (lances_hoje, lances_comecar, penaltis_comecar)
--   4. X1 dos Lances (lances_desafios, ver_desafio_lances) e fechar_partida
--   5. Medalhas dos pênaltis em lances_gols (gatilho e preenchimento desde 31/10)
--   6. Tentativas por lance, para corrigir a faixa pela taxa real (lances_tentativas, lances_taxa)
--   7. Posição, recorde e "meus lances hoje" com o recomeço no corte
--   8. "Ver meus dados"
--   9. Permissões
--  10. Moderação de apelido e junção de contas com as tabelas novas

-- ---------------------------------------------------------------------------
-- 1. Data de corte e configuração
-- ---------------------------------------------------------------------------
-- Igual a LANCES_UNIFICADOS_DESDE em src/jogo/regraLances.ts (o teste confere o texto desta migração).
create or replace function public.lances_unificados_desde()
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select timestamptz '2026-11-16 00:00:00-03';
$$;

-- O mesmo corte como dia de Brasília (DIA_DO_CORTE): o teto e a posição separam as regras pelo dia da partida.
-- Partida criada antes do corte e fechada depois conta no dia em que começou (periodoNoCorte, nas funções).
create or replace function public.lances_dia_do_corte()
returns date
language sql
immutable
set search_path = ''
as $$
  select date '2026-11-16';
$$;

insert into public.config_deteccao (chave, valor, descricao) values
  ('lances_unificados_por_dia', 10, 'Lances unificados (desde 16/11/2026): partidas valendo por dia, somando pênaltis, faltas e cara a cara (o X1 recebido conta)')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Teto do dia. Antes do corte: as 5 melhores de pênaltis e Prova e, à parte, a melhor dos Lances. A partir do
--    corte: as 3 melhores de Lances (pênaltis, faltas e cara a cara juntos) e as 3 melhores da Prova. A regra sai do
--    dia, então liberar uma suspeita de um dia antigo refaz aquele dia com a regra dele.
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
      where p_dia < public.lances_dia_do_corte()
        and q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
        and not q.sob_suspeita and not q.amistoso and q.minigame <> 'lances'
      order by q.pontos desc, q.fechada_em asc
      limit 5
    )
    union all
    (
      select q.id
      from public.partidas q
      where p_dia < public.lances_dia_do_corte()
        and q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
        and not q.sob_suspeita and not q.amistoso and q.minigame = 'lances'
      order by q.pontos desc, q.fechada_em asc
      limit 1
    )
    union all
    (
      select q.id
      from public.partidas q
      where p_dia >= public.lances_dia_do_corte()
        and q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
        and not q.sob_suspeita and not q.amistoso and q.minigame in ('penaltis', 'lances')
      order by q.pontos desc, q.fechada_em asc
      limit 3
    )
    union all
    (
      select q.id
      from public.partidas q
      where p_dia >= public.lances_dia_do_corte()
        and q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
        and not q.sob_suspeita and not q.amistoso and q.minigame = 'prova'
      order by q.pontos desc, q.fechada_em asc
      limit 3
    )
  )
  where p.torcedor_id = p_torcedor and p.dia = p_dia and p.fechada_em is not null;
$$;

-- ---------------------------------------------------------------------------
-- 3. Limite do dia. Antes do corte: só os Lances, 6 por dia (lances_por_dia). A partir do corte: pênaltis e Lances
--    somados, 10 por dia (lances_unificados_por_dia), contados ao começar, inclusive o X1 recebido. `melhores` são as
--    3 melhores partidas que contam hoje (só a regra nova; antes do corte vem vazio).
-- ---------------------------------------------------------------------------
drop function if exists public.meus_lances_hoje();
drop function if exists public.lances_hoje(uuid);

create function public.lances_hoje(p_torcedor uuid)
returns table (feitas integer, limite integer, melhor integer, melhores integer[])
language sql
stable
security definer
set search_path = ''
as $$
  with regra as (
    select public.hoje_brasilia() as hoje, public.hoje_brasilia() >= public.lances_dia_do_corte() as nova
  ),
  grupo as (
    select case when r.nova then array['penaltis', 'lances'] else array['lances'] end as minigames from regra r
  )
  select
    (select count(*)::integer from public.partidas p, regra r, grupo g
      where p.torcedor_id = p_torcedor and p.minigame = any (g.minigames)
        and (p.criada_em at time zone 'America/Sao_Paulo')::date = r.hoje),
    (select case when r.nova
       then coalesce((select c.valor::integer from public.config_deteccao c where c.chave = 'lances_unificados_por_dia'), 10)
       else coalesce((select c.valor::integer from public.config_deteccao c where c.chave = 'lances_por_dia'), 6)
     end from regra r),
    -- Pelo dia em que começou, como `feitas` (a fechada até 00h05 conta no dia anterior e sai daqui também).
    (select max(p.pontos)::integer from public.partidas p, regra r, grupo g
      where p.torcedor_id = p_torcedor and p.minigame = any (g.minigames)
        and (p.criada_em at time zone 'America/Sao_Paulo')::date = r.hoje
        and p.fechada_em is not null and not p.sob_suspeita),
    (select coalesce(array_agg(x.pontos order by x.pontos desc), '{}') from (
      select p.pontos from public.partidas p, regra r
      where r.nova and p.torcedor_id = p_torcedor and p.minigame in ('penaltis', 'lances')
        and p.dia = r.hoje and p.conta_no_teto and not p.sob_suspeita
      order by p.pontos desc, p.fechada_em asc
      limit 3) x);
$$;

create function public.meus_lances_hoje()
returns table (feitas integer, limite integer, melhor integer, melhores integer[])
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.lances_hoje(auth.uid()) where auth.uid() is not null;
$$;

-- Começa uma partida dos Lances (faltas e cara a cara) numa transação só, com trava por torcedor. Igual à de
-- 20261103200000, mais o X1 (p_modo 'desafio' e o código). A trava é a mesma da penaltis_comecar: os dois tipos
-- não passam juntos do limite. Erros: 'limite_do_dia' e 'muitas_partidas' (a função responde 429).
drop function if exists public.lances_comecar(uuid, bigint, timestamptz, jsonb);

create function public.lances_comecar(
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

  -- Dificuldade fixa por lance (seção 7.3): a do dia não se aplica. O código do X1 fica no segredo da partida:
  -- partidas.desafio_id aponta para os desafios dos pênaltis (como a Prova, que guarda o dela em prova_estado).
  if p_criada_em is null or abs(extract(epoch from (p_criada_em - now()))) > 60 then
    raise exception 'hora_invalida';
  end if;
  insert into public.partidas (torcedor_id, minigame, modo, semente, dificuldade, expira_em, criada_em)
  values (p_torcedor, 'lances', p_modo, p_semente, 0, p_expira_em, p_criada_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, gestos)
  values (v_id, 0, true, case when p_desafio is null then p_segredo else p_segredo || jsonb_build_object('desafio', p_desafio) end);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

-- Começa uma partida de pênaltis com a mesma trava e, a partir do corte, o mesmo limite do dia (antes do corte os
-- pênaltis não têm limite; o de partidas por minuto vale sempre, como na nova-partida de antes).
create function public.penaltis_comecar(
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
begin
  if p_modo not in ('normal', 'desafio') or (p_modo = 'desafio') <> (p_desafio is not null) then
    raise exception 'modo_invalido';
  end if;
  perform pg_advisory_xact_lock(hashtext('lances_comecar'), hashtext(p_torcedor::text));

  if (select count(*) from public.partidas p
      where p.torcedor_id = p_torcedor and p.criada_em >= now() - interval '1 minute')
     >= coalesce((select c.valor from public.config_deteccao c where c.chave = 'partidas_por_minuto'), 3) then
    raise exception 'muitas_partidas';
  end if;

  select h.feitas, h.limite into v_feitas, v_limite from public.lances_hoje(p_torcedor) h;
  if p_criada_em is null or abs(extract(epoch from (p_criada_em - now()))) > 60 then
    raise exception 'hora_invalida';
  end if;
  if p_criada_em >= public.lances_unificados_desde() and v_feitas >= v_limite then
    raise exception 'limite_do_dia';
  end if;

  insert into public.partidas (torcedor_id, minigame, modo, desafio_id, disputa_id, semente, dificuldade, expira_em, criada_em)
  values (p_torcedor, 'penaltis', p_modo, p_desafio, p_disputa, p_semente, p_dificuldade, p_expira_em, p_criada_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, sementes)
  values (v_id, p_numero_narrador, true, p_sementes);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. X1 dos Lances (seção 14.7): toda partida normal da regra nova vira um código. Quem aceita joga o mesmo lance,
--    com sementes novas; vence quem fizer mais pontos, e o empate fica com quem desafiou. Some com a partida
--    (zerar) ou com a conta, como os desafios dos pênaltis.
-- ---------------------------------------------------------------------------
create table public.lances_desafios (
  id text primary key check (id ~ '^[a-z0-9]{8}$'),
  partida_id uuid not null unique references public.partidas (id) on delete cascade,
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  time_id text not null references public.times (id),
  apelido text,
  lance_id text not null check (lance_id ~ '^[a-z0-9-]{3,80}$'),
  pontos integer not null check (pontos >= 0),
  gols smallint not null check (gols between 0 and 3),
  recriados smallint not null check (recriados between 0 and 3),
  -- A faixa com que quem desafiou jogou: quem aceita joga na mesma, mesmo que a faixa do lance mude depois.
  faixa text not null check (faixa in ('facil', 'media', 'dificil', 'craque')),
  criado_em timestamptz not null default now()
);
create index lances_desafios_torcedor on public.lances_desafios (torcedor_id);

alter table public.lances_desafios enable row level security;
revoke all on public.lances_desafios from anon, authenticated;
grant select on public.lances_desafios to authenticated;
grant all on public.lances_desafios to service_role;
create policy "lances_desafios: quem desafiou lê os seus" on public.lances_desafios
  for select to authenticated using (torcedor_id = (select auth.uid()));

-- Quem recebe o link vê só o resumo.
create or replace function public.ver_desafio_lances(p_id text)
returns table (id text, time_id text, apelido text, lance_id text, pontos integer, gols smallint, recriados smallint, faixa text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.lance_id, d.pontos, d.gols, d.recriados, d.faixa
  from public.lances_desafios d
  where d.id = lower(p_id);
$$;

-- Igual ao de 20261102100000_ranking_por_minuto.sql, mais o X1 dos Lances (p_desafio com lance_id, gols e recriados).
create or replace function public.fechar_partida(
  p_partida uuid,
  p_torcedor uuid,
  p_time text,
  p_gestos jsonb,
  p_resultado jsonb,
  p_pontos integer,
  p_dia date,
  p_semana date,
  p_fechada_em timestamptz,
  p_motivo_suspeita text,
  p_desafio jsonb,
  p_codigos text[]
)
returns table (teto boolean, suspeita boolean, codigo text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minigame text;
  v_amistoso boolean;
  v_apelido text;
  v_codigo text;
  v_inseridas integer;
begin
  update public.partidas p
  set fechada_em = p_fechada_em,
      time_id = p_time,
      gestos = p_gestos,
      resultado = p_resultado,
      pontos = p_pontos,
      dia = p_dia,
      semana = p_semana,
      sob_suspeita = p_motivo_suspeita is not null,
      motivo_suspeita = p_motivo_suspeita
  where p.id = p_partida and p.torcedor_id = p_torcedor and p.fechada_em is null
  returning p.minigame, p.amistoso into v_minigame, v_amistoso;
  if not found then
    return;
  end if;

  perform public.atualizar_teto(p_torcedor, p_dia);
  if not v_amistoso then
    perform public.marcar_ranking(p_semana);
  end if;

  if p_desafio is not null then
    select t.apelido into v_apelido from public.torcedores t where t.id = p_torcedor;
    foreach v_codigo in array coalesce(p_codigos, '{}') loop
      if v_minigame = 'prova' then
        insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, apelido, perguntas, pontos, escada, resumo)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido,
          array(select jsonb_array_elements_text(p_desafio -> 'perguntas')), p_pontos,
          p_desafio ->> 'escada', p_desafio ->> 'resumo')
        on conflict (id) do nothing;
      elsif v_minigame = 'lances' then
        insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, apelido, lance_id, pontos, gols, recriados, faixa)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido, p_desafio ->> 'lance_id', p_pontos,
          (p_desafio ->> 'gols')::smallint, (p_desafio ->> 'recriados')::smallint, p_desafio ->> 'faixa')
        on conflict (id) do nothing;
      else
        insert into public.desafios (id, partida_id, torcedor_id, time_id, apelido, cobrancas, gols_jogador, gols_maquina, pontos)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido, p_desafio -> 'cobrancas',
          (p_desafio ->> 'gols_jogador')::smallint, (p_desafio ->> 'gols_maquina')::smallint, p_pontos)
        on conflict (id) do nothing;
      end if;
      get diagnostics v_inseridas = row_count;
      exit when v_inseridas > 0;
      v_codigo := null; -- código repetido: tenta o próximo
    end loop;
  end if;

  return query
    select p.conta_no_teto, p.sob_suspeita, v_codigo from public.partidas p where p.id = p_partida;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Medalhas dos pênaltis (seção 14.7): por disputa histórica e pela Disputa livre, 10 · 50 · 100 gols e ouro com
--    10 vitórias. Moram em lances_gols, que já sobrevive ao zerar, vai junto na junção de contas e some com a conta:
--    lance_id 'penaltis:<disputa>' ou 'penaltis:livre' (o X1 conta como livre), i = a cobrança (0 a 7) e uma linha
--    i = 8 com vitoria = true quando a partida foi vencida. Mesmos números de MEDALHAS_PENALTIS (regraLances.ts).
-- ---------------------------------------------------------------------------
alter table public.lances_gols add column vitoria boolean not null default false;
alter table public.lances_gols drop constraint if exists lances_gols_i_check;
alter table public.lances_gols add constraint lances_gols_i_check check (i between 0 and 8);
alter table public.lances_gols add constraint lances_gols_vitoria_so_penaltis
  check (not vitoria or (i = 8 and lance_id like 'penaltis:%' and not recriou));

create or replace function public.penaltis_anotar_gols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item text := 'penaltis:' || coalesce(new.disputa_id, 'livre');
begin
  insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou, vitoria)
  select new.id, (x.ord - 1)::smallint, new.torcedor_id, v_item, false, false
  from jsonb_array_elements(coalesce(new.resultado -> 'cobrancas', '[]'::jsonb)) with ordinality as x (c, ord)
  where x.c ->> 'desfecho' = 'gol' and x.ord <= 8
  union all
  select new.id, 8::smallint, new.torcedor_id, v_item, false, true
  where coalesce((new.resultado ->> 'venceu')::boolean, false)
  on conflict (partida_id, i) do nothing;
  return null;
end;
$$;

-- Desde 31/10/2026 (quando a partida passou a guardar disputa_id). Partida que vira suspeita depois não tira gol.
create trigger penaltis_gols after insert or update of fechada_em, sob_suspeita on public.partidas
  for each row when (
    new.minigame = 'penaltis' and new.fechada_em is not null and not new.sob_suspeita
    and new.criada_em >= timestamptz '2026-10-31 00:00:00-03'
  )
  execute function public.penaltis_anotar_gols();

-- Preenchimento com o que já foi jogado (antes do zerar da pré-temporada, que apaga as partidas mas não as medalhas).
insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou, vitoria)
select p.id, (x.ord - 1)::smallint, p.torcedor_id, 'penaltis:' || coalesce(p.disputa_id, 'livre'), false, false
from public.partidas p
cross join lateral jsonb_array_elements(coalesce(p.resultado -> 'cobrancas', '[]'::jsonb)) with ordinality as x (c, ord)
where p.minigame = 'penaltis' and p.fechada_em is not null and not p.sob_suspeita
  and p.criada_em >= timestamptz '2026-10-31 00:00:00-03'
  and x.c ->> 'desfecho' = 'gol' and x.ord <= 8
on conflict (partida_id, i) do nothing;

insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou, vitoria)
select p.id, 8::smallint, p.torcedor_id, 'penaltis:' || coalesce(p.disputa_id, 'livre'), false, true
from public.partidas p
where p.minigame = 'penaltis' and p.fechada_em is not null and not p.sob_suspeita
  and p.criada_em >= timestamptz '2026-10-31 00:00:00-03'
  and coalesce((p.resultado ->> 'venceu')::boolean, false)
on conflict (partida_id, i) do nothing;

-- A medalha de cada item: lance (5 · 20 · 50 gols, ouro com 10 recriados) ou disputa de pênaltis (10 · 50 · 100,
-- ouro com 10 vitórias). Agora devolve também as vitórias.
drop function if exists public.minhas_medalhas();
drop function if exists public.medalhas_de(uuid);

create or replace function public.medalha_do_item(p_item text, p_gols integer, p_recriados integer, p_vitorias integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_item like 'penaltis:%' then
      case
        when p_gols >= 100 and p_vitorias >= 10 then 'ouro'
        when p_gols >= 50 then 'prata'
        when p_gols >= 10 then 'bronze'
      end
    else
      case
        when p_gols >= 50 and p_recriados >= 10 then 'ouro'
        when p_gols >= 20 then 'prata'
        when p_gols >= 5 then 'bronze'
      end
  end;
$$;

create function public.medalhas_de(p_torcedor uuid)
returns table (lance_id text, gols integer, recriados integer, vitorias integer, medalha text)
language sql
stable
security definer
set search_path = ''
as $$
  with soma as (
    select g.lance_id,
      (count(*) filter (where not g.vitoria))::integer as gols,
      (count(*) filter (where g.recriou))::integer as recriados,
      (count(*) filter (where g.vitoria))::integer as vitorias
    from public.lances_gols g
    where g.torcedor_id = p_torcedor
    group by g.lance_id
  )
  select s.lance_id, s.gols, s.recriados, s.vitorias, public.medalha_do_item(s.lance_id, s.gols, s.recriados, s.vitorias)
  from soma s;
$$;


create function public.minhas_medalhas()
returns table (lance_id text, gols integer, recriados integer, vitorias integer, medalha text)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.medalhas_de(auth.uid()) where auth.uid() is not null;
$$;

-- Vitrine: medalhas somadas por torcida (pelo time atual de quem ganhou), lances e pênaltis juntos.
create or replace function public.vitrine_medalhas()
returns table (time_id text, bronze integer, prata integer, ouro integer)
language sql
stable
security definer
set search_path = ''
as $$
  with por_item as (
    select g.torcedor_id,
      public.medalha_do_item(g.lance_id,
        (count(*) filter (where not g.vitoria))::integer,
        (count(*) filter (where g.recriou))::integer,
        (count(*) filter (where g.vitoria))::integer) as medalha
    from public.lances_gols g
    group by g.torcedor_id, g.lance_id
  )
  select t.time_id,
    (count(*) filter (where i.medalha = 'bronze'))::integer,
    (count(*) filter (where i.medalha = 'prata'))::integer,
    (count(*) filter (where i.medalha = 'ouro'))::integer
  from por_item i
  join public.torcedores t on t.id = i.torcedor_id
  join public.times tm on tm.id = t.time_id and tm.oficial
  where i.medalha is not null
  group by t.time_id;
$$;

-- ---------------------------------------------------------------------------
-- 6. Tentativas por lance (faltas e cara a cara), para corrigir a faixa pela taxa real a partir de 30 tentativas
--    valendo (seção 14.7). Como lances_gols: só partidas sem suspeita (ou liberadas), sem chave para partidas (o zerar
--    não leva) e some com a conta. Na junção de contas pelo código, as tentativas da conta de origem saem com ela
--    (risco aceito: a taxa perde umas poucas tentativas; nada de pontos depende disso).
-- ---------------------------------------------------------------------------
create table public.lances_tentativas (
  partida_id uuid not null,
  i smallint not null check (i between 0 and 2),
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  lance_id text not null,
  gol boolean not null,
  criado_em timestamptz not null default now(),
  primary key (partida_id, i)
);
create index lances_tentativas_lance on public.lances_tentativas (lance_id, torcedor_id, criado_em desc);
create index lances_tentativas_torcedor on public.lances_tentativas (torcedor_id);

alter table public.lances_tentativas enable row level security;
revoke all on public.lances_tentativas from anon, authenticated;
grant all on public.lances_tentativas to service_role;
create policy "lances_tentativas: ninguém pelo cliente" on public.lances_tentativas
  as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.lances_anotar_tentativas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lances_tentativas (partida_id, i, torcedor_id, lance_id, gol, criado_em)
  select new.id, (x.ord - 1)::smallint, new.torcedor_id, x.l ->> 'lanceId', x.l ->> 'desfecho' = 'gol', new.fechada_em
  from jsonb_array_elements(coalesce(new.resultado -> 'lances', '[]'::jsonb)) with ordinality as x (l, ord)
  where x.l ->> 'lanceId' is not null and x.ord <= 3
  on conflict (partida_id, i) do nothing;
  return null;
end;
$$;

create trigger lances_tentativas after insert or update of fechada_em, sob_suspeita on public.partidas
  for each row when (new.minigame = 'lances' and new.fechada_em is not null and not new.sob_suspeita)
  execute function public.lances_anotar_tentativas();

insert into public.lances_tentativas (partida_id, i, torcedor_id, lance_id, gol, criado_em)
select p.id, (x.ord - 1)::smallint, p.torcedor_id, x.l ->> 'lanceId', x.l ->> 'desfecho' = 'gol', p.fechada_em
from public.partidas p
cross join lateral jsonb_array_elements(coalesce(p.resultado -> 'lances', '[]'::jsonb)) with ordinality as x (l, ord)
where p.minigame = 'lances' and p.fechada_em is not null and not p.sob_suspeita
  and x.l ->> 'lanceId' is not null and x.ord <= 3
on conflict (partida_id, i) do nothing;

-- Taxa de um lance para a faixa corrigida: cada pessoa entra com no máximo as últimas 10 tentativas
-- (MAX_TENTATIVAS_POR_PESSOA), para ninguém mudar a faixa sozinho errando de propósito. A faixa sai da conta pura
-- (faixaCorrigida, com o mínimo de 30), na função lances, e fica gravada na partida.
create or replace function public.lances_taxa(p_lance text)
returns table (tentativas integer, gols integer, pessoas integer)
language sql
stable
security definer
set search_path = ''
as $$
  with ultimas as (
    select t.torcedor_id, t.gol,
      row_number() over (partition by t.torcedor_id order by t.criado_em desc, t.partida_id, t.i) as n
    from public.lances_tentativas t
    where t.lance_id = p_lance
  )
  select count(*)::integer, (count(*) filter (where u.gol))::integer, (count(distinct u.torcedor_id))::integer
  from ultimas u
  where u.n <= 10;
$$;

-- ---------------------------------------------------------------------------
-- 7. Posição e recorde. A partir do corte, "Lances" junta pênaltis, faltas e cara a cara (pela melhor partida da
--    semana) e o recorde recomeça: só partidas criadas desde o corte, e só recordes herdados desde então. Antes do
--    corte (semana anterior, partida fechada antes), tudo como era.
-- ---------------------------------------------------------------------------
create or replace function public.posicao_minigame(p_torcedor uuid, p_minigame text, p_data date)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with regra as (
    select p_minigame in ('penaltis', 'lances') and public.semana_de(p_data) >= public.lances_dia_do_corte() as unificada
  ),
  melhores as (
    select distinct on (p.torcedor_id) p.torcedor_id, p.pontos, p.fechada_em as quando
    from public.partidas p, regra r
    where p_minigame in ('penaltis', 'prova', 'lances')
      and (case when r.unificada then p.minigame in ('penaltis', 'lances') and p.criada_em >= public.lances_unificados_desde()
                else p.minigame = p_minigame end)
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

-- Igual ao de 20261103400000_codigo_torcedor.sql (com o recorde herdado), mais o recomeço dos Lances no corte.
create or replace function public.recorde_pessoal(p_torcedor uuid, p_minigame text, p_antes timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with regra as (
    select p_minigame in ('penaltis', 'lances') and coalesce(p_antes, now()) > public.lances_unificados_desde() as unificada
  )
  select greatest(
    case
      when (select r.unificada from regra r) then (
        select max(p.pontos) from public.partidas p
        where p.torcedor_id = p_torcedor and p.minigame in ('penaltis', 'lances') and p.fechada_em is not null
          and p.criada_em >= public.lances_unificados_desde()
          and not p.sob_suspeita and (p_antes is null or p.fechada_em < p_antes))
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
    (select max(h.recorde) from public.recordes_herdados h, regra r
     where h.torcedor_id = p_torcedor and (p_antes is null or h.herdado_em < p_antes)
       and (case when r.unificada then h.minigame in ('penaltis', 'lances') and h.herdado_em >= public.lances_unificados_desde()
                 else h.minigame = p_minigame end))
  );
$$;

-- ---------------------------------------------------------------------------
-- 8. "Ver meus dados": igual ao de 20261103400000_codigo_torcedor.sql, com os gols sem as linhas de vitória dos
--    pênaltis, as vitórias, as tentativas dos lances e os X1 dos Lances.
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
      + (select count(*) from public.lances_desafios d where d.torcedor_id = eu.id)
    )::integer,
    'palpites', (select count(*)::integer from public.palpites p where p.torcedor_id = eu.id),
    'carreira_xp', (select c.xp from public.carreira_de(eu.id) c),
    'gols_lances', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id and not g.vitoria),
    'vitorias_penaltis', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id and g.vitoria),
    'tentativas_lances', (select count(*)::integer from public.lances_tentativas t where t.torcedor_id = eu.id),
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
-- 9. Permissões explícitas: as internas só para o servidor; as "minha_…"/"meus_…", a vitrine e o resumo do X1 para
--    quem tem sessão (o login anônimo também é authenticated; o resumo do X1 também para anon, como ver_desafio).
-- ---------------------------------------------------------------------------
revoke execute on function public.lances_unificados_desde(), public.lances_dia_do_corte(),
  public.lances_hoje(uuid), public.meus_lances_hoje(),
  public.lances_comecar(uuid, bigint, timestamptz, jsonb, text, text, timestamptz),
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz),
  public.ver_desafio_lances(text), public.penaltis_anotar_gols(), public.medalhas_de(uuid),
  public.medalha_do_item(text, integer, integer, integer), public.minhas_medalhas(), public.vitrine_medalhas(),
  public.lances_anotar_tentativas(), public.lances_taxa(text)
  from public, anon, authenticated;
grant execute on function public.lances_hoje(uuid), public.lances_comecar(uuid, bigint, timestamptz, jsonb, text, text, timestamptz),
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz),
  public.medalhas_de(uuid), public.lances_taxa(text)
  to service_role;
grant execute on function public.meus_lances_hoje(), public.minhas_medalhas(), public.vitrine_medalhas()
  to authenticated;
grant execute on function public.ver_desafio_lances(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. Moderação e junção de contas com as tabelas novas.
--     apelido_apagar: igual ao de 20261102000100_termos_x_jogo.sql, mais o X1 dos Lances (o resumo é público).
--     juntar_torcedores: igual ao de 20261103400000_codigo_torcedor.sql, com uma diferença no recorde herdado: a
--     herança de pênaltis ou Lances de antes do corte não impede a de depois (a regra nova só lê heranças desde o
--     corte; sem isso, um 200 da tabela velha barraria um 90 da nova e o recorde da regra nova se perderia).
--     As medalhas (lances_gols, inclusive as dos pênaltis) já vão para o dono; as tentativas e os X1 dos Lances
--     da conta de origem saem com ela (risco aceito, seção 6 acima).
-- ---------------------------------------------------------------------------
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
  update public.lances_desafios d set apelido = null where d.apelido = v_apelido;

  if v_n > 0 then
    insert into public.apelidos_apagados (torcedores) values (v_n);
  end if;
  return v_n;
end;
$$;

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
      -- Herança de antes do corte é de outra tabela de pontos (e a regra nova a ignora): a nova sempre a substitui.
      where excluded.recorde > h.recorde
        or (h.minigame in ('penaltis', 'lances') and h.herdado_em < public.lances_unificados_desde());

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
