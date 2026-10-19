-- Guerra de Torcidas: base do bloco B (torcedores, partidas, desafios, ranking da semana).
-- Regras: docs/jogo.md (seções 3, 5 e 6) e docs/rankings.md.
-- Toda tabela com RLS ligada e política explícita. O cliente NUNCA grava pontos:
-- partidas, desafios e ranking só são escritos pelas funções do servidor (secret key).

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Times (só os ids; nome, cores, artigo e rival ficam em src/dados/times.ts)
-- ---------------------------------------------------------------------------
create table public.times (
  id text primary key,
  -- "Outro time" não entra no ranking de times.
  oficial boolean not null default true
);

insert into public.times (id, oficial) values
  ('athletico-pr', true), ('atletico-mg', true), ('bahia', true), ('botafogo', true),
  ('bragantino', true), ('chapecoense', true), ('corinthians', true), ('coritiba', true),
  ('cruzeiro', true), ('flamengo', true), ('fluminense', true), ('gremio', true),
  ('internacional', true), ('mirassol', true), ('palmeiras', true), ('remo', true),
  ('santos', true), ('sao-paulo', true), ('vasco', true), ('vitoria', true),
  ('outro', false);

alter table public.times enable row level security;
create policy "times: leitura para todos" on public.times
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Torcedores (um por usuário anônimo). Escrita só pela função salvar_torcedor.
-- ---------------------------------------------------------------------------
create table public.torcedores (
  id uuid primary key references auth.users (id) on delete cascade,
  time_id text not null references public.times (id),
  apelido text check (apelido is null or char_length(apelido) between 1 and 20),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.torcedores enable row level security;
create policy "torcedores: cada um lê o seu" on public.torcedores
  for select to authenticated using (id = (select auth.uid()));
-- Sem política de insert/update/delete: só via salvar_torcedor (security definer).

-- Filtro simples de apelido (seção 3 do jogo.md). Lista editável sem nova migração.
create table public.palavras_bloqueadas (
  palavra text primary key check (palavra = lower(palavra))
);
alter table public.palavras_bloqueadas enable row level security;
create policy "palavras_bloqueadas: ninguém lê pelo cliente" on public.palavras_bloqueadas
  for select to authenticated using (false);

insert into public.palavras_bloqueadas (palavra) values
  -- palavrão
  ('merda'), ('porra'), ('caralho'), ('cacete'), ('buceta'), ('boceta'), ('xoxota'), ('piroca'),
  ('rola'), ('cu'), ('cuzao'), ('foda'), ('foder'), ('fodase'), ('puta'), ('puto'), ('putaria'),
  ('arrombado'), ('arrombada'), ('otario'), ('otaria'), ('fdp'), ('vsf'), ('pqp'), ('krl'),
  -- ofensas (racismo, homofobia, religião)
  ('viado'), ('veado'), ('bicha'), ('traveco'), ('sapatao'), ('macaco'), ('macaca'), ('crioulo'),
  ('crioula'), ('macumbeiro'), ('nazista'), ('nazi'), ('hitler'),
  -- zero aposta (seção 7 do jogo.md)
  ('aposta'), ('apostar'), ('bet'), ('odd'), ('odds'), ('cotacao');

-- Minúsculas, sem acento, com troca de números comuns por letras (p0rr4 -> porra).
create or replace function public.normalizar_apelido(p text)
returns text
language sql
stable
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(extensions.unaccent(coalesce(p, ''))), '013457@$', 'oieastas'),
    '[^a-z ]', ' ', 'g'
  );
$$;

-- Palavra curta (até 4 letras) só bloqueia como palavra inteira ("cu" não pega "Curitiba");
-- palavra longa bloqueia em qualquer lugar, mesmo com espaços no meio ("p o r r a").
create or replace function public.apelido_bloqueado(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with n as (select public.normalizar_apelido(p) as texto)
  select exists (
    select 1
    from public.palavras_bloqueadas b, n
    where case
      when char_length(b.palavra) <= 4
        then (' ' || regexp_replace(n.texto, ' +', ' ', 'g') || ' ') like ('% ' || b.palavra || ' %')
      else replace(n.texto, ' ', '') like ('%' || b.palavra || '%')
    end
  );
$$;

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

revoke execute on function public.salvar_torcedor(text, text) from public, anon;
grant execute on function public.salvar_torcedor(text, text) to authenticated;
revoke execute on function public.apelido_bloqueado(text) from public, anon, authenticated;
revoke execute on function public.normalizar_apelido(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Partidas. Criadas por nova-partida, fechadas por fechar-partida.
-- ---------------------------------------------------------------------------
create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  modo text not null check (modo in ('normal', 'desafio')),
  desafio_id text,
  semente bigint not null check (semente between 0 and 4294967295),
  -- Dificuldade do dia em que o servidor emitiu a semente (horário de Brasília).
  dificuldade numeric(5, 4) not null check (dificuldade between 0 and 1),
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null,
  fechada_em timestamptz,
  -- Time no momento em que a partida fechou (troca livre: os pontos ficam onde foram feitos).
  time_id text references public.times (id),
  gestos jsonb,
  resultado jsonb,
  pontos integer check (pontos is null or pontos >= 0),
  -- Segunda-feira da semana e dia (Brasília) em que a partida conta.
  semana date,
  dia date,
  -- Só as 5 melhores do dia contam (recalculado por atualizar_teto).
  conta_no_teto boolean not null default false,
  sob_suspeita boolean not null default false,
  motivo_suspeita text,
  revisada_em timestamptz,
  check ((fechada_em is null) = (pontos is null))
);

create index partidas_torcedor_criada on public.partidas (torcedor_id, criada_em desc);
create index partidas_torcedor_dia on public.partidas (torcedor_id, dia);
create index partidas_semana on public.partidas (semana) where conta_no_teto and not sob_suspeita;

alter table public.partidas enable row level security;
create policy "partidas: cada um lê as suas" on public.partidas
  for select to authenticated using (torcedor_id = (select auth.uid()));
-- Sem política de escrita: só as funções do servidor gravam.

-- Número do narrador no par ou ímpar: sorteado ao criar a partida e guardado onde o
-- celular não lê. Só é revelado na resposta do fechar-partida, depois da escolha.
create table public.partidas_segredo (
  partida_id uuid primary key references public.partidas (id) on delete cascade,
  numero_narrador smallint not null check (numero_narrador between 0 and 5)
);
alter table public.partidas_segredo enable row level security;
create policy "partidas_segredo: ninguém lê pelo cliente" on public.partidas_segredo
  for select to authenticated using (false);

-- ---------------------------------------------------------------------------
-- Desafios por link: as cobranças gravadas de quem desafiou.
-- ---------------------------------------------------------------------------
create table public.desafios (
  id text primary key check (id ~ '^[a-z0-9]{8}$'),
  partida_id uuid not null unique references public.partidas (id) on delete cascade,
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  time_id text not null references public.times (id),
  apelido text,
  cobrancas jsonb not null,
  gols_jogador smallint not null,
  gols_maquina smallint not null,
  pontos integer not null,
  criado_em timestamptz not null default now()
);

alter table public.desafios enable row level security;
create policy "desafios: quem desafiou lê os seus" on public.desafios
  for select to authenticated using (torcedor_id = (select auth.uid()));
-- Quem recebe o link vê só o resumo, por ver_desafio (sem as cobranças).

alter table public.partidas
  add constraint partidas_desafio_fk foreign key (desafio_id) references public.desafios (id) on delete set null;

create or replace function public.ver_desafio(p_id text)
returns table (id text, time_id text, apelido text, gols_jogador smallint, gols_maquina smallint, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.gols_jogador, d.gols_maquina, d.pontos
  from public.desafios d
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio(text) from public;
grant execute on function public.ver_desafio(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ranking da semana (MVP, antes das divisões): um só, com os 20 times oficiais.
-- Recalculado pelo servidor a cada partida fechada. Leitura pública e ao vivo.
-- Só torcidas: nenhum apelido aqui.
-- ---------------------------------------------------------------------------
create table public.ranking_semana (
  semana date not null,
  time_id text not null references public.times (id),
  ativos integer not null default 0,
  -- Maior torcida: soma de todo mundo.
  soma integer not null default 0,
  -- Campeão da semana: média dos 30 melhores, vagas vazias a 80% da média geral.
  media30 numeric(10, 2) not null default 0,
  -- Desempate: quem chegou primeiro àquela pontuação.
  chegou_em timestamptz,
  posicao_campeao smallint not null,
  posicao_soma smallint not null,
  atualizado_em timestamptz not null default now(),
  primary key (semana, time_id)
);

alter table public.ranking_semana enable row level security;
create policy "ranking_semana: leitura para todos" on public.ranking_semana
  for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.ranking_semana;

-- Teto diário: só as 5 melhores partidas do dia de cada torcedor contam
-- (empate de pontos: a que fechou primeiro). Partida sob suspeita não entra.
create or replace function public.atualizar_teto(p_torcedor uuid, p_dia date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.partidas p
  set conta_no_teto = p.id in (
    select q.id
    from public.partidas q
    where q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null and not q.sob_suspeita
    order by q.pontos desc, q.fechada_em asc
    limit 5
  )
  where p.torcedor_id = p_torcedor and p.dia = p_dia and p.fechada_em is not null;
$$;

create or replace function public.recalcular_ranking(p_semana date)
returns void
language sql
security definer
set search_path = ''
as $$
  with totais as (
    select p.torcedor_id, p.time_id, sum(p.pontos)::integer as total, max(p.fechada_em) as ultima
    from public.partidas p
    join public.times t on t.id = p.time_id and t.oficial
    where p.semana = p_semana and p.conta_no_teto and not p.sob_suspeita
    group by p.torcedor_id, p.time_id
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
      -- Time sem nenhum torcedor ativo fica com 0 (a "torcida emprestada" só completa quem já joga).
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

revoke execute on function public.atualizar_teto(uuid, date) from public, anon, authenticated;
revoke execute on function public.recalcular_ranking(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Detecção de partidas estatisticamente impossíveis (aprovada em 19/10/2026).
-- Números ajustáveis sem nova migração.
-- ---------------------------------------------------------------------------
create table public.config_deteccao (
  chave text primary key,
  valor numeric not null,
  descricao text not null
);
alter table public.config_deteccao enable row level security;
create policy "config_deteccao: ninguém lê pelo cliente" on public.config_deteccao
  for select to authenticated using (false);

insert into public.config_deteccao (chave, valor, descricao) values
  ('janela_defesas', 30, 'Últimas N defesas contra o batedor da máquina com chute no gol'),
  ('min_defesas', 27, 'Marca a partida se defendeu pelo menos isto dentro da janela'),
  ('janela_cobrancas', 40, 'Últimas N cobranças em que o goleiro da máquina pulou por sorteio; marca se nenhuma foi no canto dele'),
  ('partidas_por_minuto', 3, 'Limite de partidas criadas por minuto por torcedor'),
  ('minutos_validade_semente', 15, 'A semente expira depois disto');

-- ---------------------------------------------------------------------------
-- Permissões explícitas (não dependem da exposição automática de tabelas novas).
-- O RLS acima continua decidindo quais linhas cada um vê.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.times, public.ranking_semana to anon, authenticated;
grant select on public.torcedores, public.partidas, public.desafios to authenticated;
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.atualizar_teto(uuid, date), public.recalcular_ranking(date) to service_role;
