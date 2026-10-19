-- Prova de Boleiro, o quiz (docs/jogo.md, seção 7.1). Só acrescenta: nada é apagado ou renomeado.
-- Perguntas, gabaritos e o andamento de cada partida ficam em tabelas que o celular NÃO lê
-- (RLS sem leitura e sem grant). Tudo passa pela função "prova" do servidor (secret key).
-- A partida em si usa a tabela partidas (minigame = 'prova'), então o teto diário somado e o
-- amistoso já funcionam pelas regras de atualizar_teto.

-- ---------------------------------------------------------------------------
-- Banco de perguntas. Entra pelo `npm run importar-perguntas` (só pergunta revisada e com fonte).
-- ---------------------------------------------------------------------------
create table public.perguntas (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  -- Um dos 20 clubes oficiais, ou nulo para as gerais.
  clube text references public.times (id) check (clube is null or clube <> 'outro'),
  degrau smallint not null check (degrau between 1 and 4),
  tema text not null check (char_length(tema) <= 30),
  texto text not null check (char_length(texto) between 10 and 160),
  certa text not null check (char_length(certa) between 1 and 50),
  errada1 text not null check (char_length(errada1) between 1 and 50),
  errada2 text not null check (char_length(errada2) between 1 and 50),
  errada3 text not null check (char_length(errada3) between 1 and 50),
  fonte text not null check (fonte ~ '^https?://'),
  fonte2 text check (fonte2 is null or fonte2 ~ '^https?://'),
  verificada_em date not null,
  status text not null default 'ativa' check (status in ('rascunho', 'revisada', 'ativa', 'aposentada')),
  lote text,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index perguntas_sorteio on public.perguntas (degrau, clube) where status = 'ativa';

alter table public.perguntas enable row level security;
create policy "perguntas: ninguém lê pelo cliente" on public.perguntas
  for select to authenticated using (false);

-- ---------------------------------------------------------------------------
-- Desafio por link (?p=xxxxxxxx): as mesmas 8 perguntas, na mesma ordem.
-- Quem recebe o link vê só o resumo, por ver_prova_desafio (sem as perguntas).
-- ---------------------------------------------------------------------------
create table public.prova_desafios (
  id text primary key check (id ~ '^[a-z0-9]{8}$'),
  partida_id uuid not null unique references public.partidas (id) on delete cascade,
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  time_id text not null references public.times (id),
  apelido text,
  perguntas text[] not null check (array_length(perguntas, 1) = 8),
  pontos integer not null,
  -- A escada em emoji (🟩🟥⏹️🆘), sem o texto das perguntas.
  escada text not null,
  -- "cheguei na 6ª e parei"
  resumo text not null,
  criado_em timestamptz not null default now()
);
alter table public.prova_desafios enable row level security;
create policy "prova_desafios: ninguém lê pelo cliente" on public.prova_desafios
  for select to authenticated using (false);

create or replace function public.ver_prova_desafio(p_id text)
returns table (id text, time_id text, apelido text, pontos integer, escada text, resumo text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.pontos, d.escada, d.resumo
  from public.prova_desafios d
  where d.id = lower(p_id);
$$;

-- ---------------------------------------------------------------------------
-- Andamento de cada partida: a escada, a pergunta da vez, o mapa dos ids embaralhados
-- e a hora em que a pergunta saiu (o tempo é medido aqui, nunca no celular).
-- ---------------------------------------------------------------------------
create table public.prova_estado (
  partida_id uuid primary key references public.partidas (id) on delete cascade,
  desafio_id text references public.prova_desafios (id) on delete set null,
  -- [{ degrau, clube, perguntaId, trocadaDe? }] x 8
  escada jsonb not null,
  atual smallint not null default 0 check (atual between 0 and 7),
  fase text not null check (fase in ('aguardando', 'respondendo', 'fim')),
  enviada_em timestamptz,
  -- Pergunta da vez: [{ id, idx }] na ordem mostrada; idx 0 é a certa.
  alternativas jsonb,
  -- Ids tirados por Tira duas / Arquibancada ("tira uma") na pergunta da vez.
  removidas jsonb not null default '[]',
  -- { tira_duas, arquibancada, troca }: número da pergunta em que foi usada.
  ajudas jsonb not null default '{}',
  ajuda_na_atual boolean not null default false,
  -- [{ degrau, desfecho, ajuda, ms }]
  passos jsonb not null default '[]',
  -- Trava otimista: cada ação grava só se ninguém mexeu antes (clique duplo, duas abas).
  versao integer not null default 0
);
alter table public.prova_estado enable row level security;
create policy "prova_estado: ninguém lê pelo cliente" on public.prova_estado
  for select to authenticated using (false);

-- Sem repetir pergunta para a mesma pessoa em 30 dias (se o degrau esgotar, volta a mais antiga).
create table public.prova_vistas (
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  pergunta_id text not null references public.perguntas (id) on delete cascade,
  vista_em timestamptz not null default now(),
  primary key (torcedor_id, pergunta_id)
);
alter table public.prova_vistas enable row level security;
create policy "prova_vistas: ninguém lê pelo cliente" on public.prova_vistas
  for select to authenticated using (false);

-- Cada resposta: alimenta a Arquibancada, a calibragem do degrau e a detecção.
-- Zerar a pré-temporada apaga as partidas, mas mantém as respostas (calibragem).
create table public.prova_respostas (
  id bigint generated always as identity primary key,
  pergunta_id text not null references public.perguntas (id) on delete cascade,
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  partida_id uuid references public.partidas (id) on delete set null,
  -- Degrau da escada em que ela saiu (a pergunta pode mudar de degrau depois da calibragem).
  degrau smallint not null check (degrau between 1 and 4),
  -- 0 é a certa; nulo = tempo esgotado.
  escolha smallint check (escolha between 0 and 3),
  acertou boolean not null,
  ms integer not null check (ms >= 0),
  ajuda boolean not null default false,
  respondida_em timestamptz not null default now()
);
create index prova_respostas_pergunta on public.prova_respostas (pergunta_id);
create index prova_respostas_torcedor on public.prova_respostas (torcedor_id, respondida_em desc);
alter table public.prova_respostas enable row level security;
create policy "prova_respostas: ninguém lê pelo cliente" on public.prova_respostas
  for select to authenticated using (false);

-- Candidatas para uma vaga da escada (degrau + clube, ou geral com p_clube nulo), com a última
-- vez que esta pessoa viu cada uma. Só a função do servidor chama.
create or replace function public.prova_candidatas(p_torcedor uuid, p_degrau smallint, p_clube text)
returns table (id text, vista_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, v.vista_em
  from public.perguntas p
  left join public.prova_vistas v on v.pergunta_id = p.id and v.torcedor_id = p_torcedor
  where p.status = 'ativa' and p.degrau = p_degrau
    and (case when p_clube is null then p.clube is null else p.clube = p_clube end);
$$;

-- Arquibancada: como quem já respondeu escolheu (0 é a certa).
create or replace function public.prova_arquibancada(p_pergunta text)
returns table (escolha smallint, n integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.escolha, count(*)::integer
  from public.prova_respostas r
  where r.pergunta_id = p_pergunta and r.escolha is not null
  group by r.escolha;
$$;

-- ---------------------------------------------------------------------------
-- Configuração (mesma config_deteccao dos pênaltis; editável no Table Editor).
-- ---------------------------------------------------------------------------
insert into public.config_deteccao (chave, valor, descricao) values
  ('prova_amistoso', 1, 'Prova de Boleiro em amistoso (1 = não soma no ranking; 0 = entra no teto diário somado)'),
  ('prova_segundos', 15, 'Tempo de cada pergunta da Prova de Boleiro'),
  ('prova_tolerancia', 2, 'Segundos de tolerância (rede) antes de contar como tempo esgotado'),
  ('prova_dias_sem_repetir', 30, 'A mesma pessoa não recebe a mesma pergunta antes disto (se o degrau esgotar, volta a mais antiga)'),
  ('prova_min_arquibancada', 30, 'Com menos respostas que isto, a Arquibancada vira "tira uma"'),
  ('prova_janela', 40, 'Detecção: últimas N respostas difíceis e de craque'),
  ('prova_min_acerto', 0.9, 'Detecção: marca se acertou pelo menos esta fração da janela…'),
  ('prova_tempo_medio_ms', 2500, '…com tempo médio de resposta abaixo disto (ms)')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------------
-- Painel de cobertura (#admin): perguntas ativas por clube e degrau e acerto médio.
-- ---------------------------------------------------------------------------
create or replace function public.cobertura_perguntas()
returns table (clube text, degrau smallint, ativas integer, respostas integer, acerto numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(p.clube, 'geral') as clube,
    p.degrau,
    count(distinct p.id)::integer as ativas,
    count(r.id)::integer as respostas,
    round(100.0 * avg(case when r.acertou then 1 else 0 end) filter (where r.id is not null), 1) as acerto
  from public.perguntas p
  left join public.prova_respostas r on r.pergunta_id = p.id
  where p.status = 'ativa' and public.sou_admin()
  group by coalesce(p.clube, 'geral'), p.degrau
  order by 1, 2;
$$;

-- ---------------------------------------------------------------------------
-- Permissões explícitas. Tabelas novas podem nascer expostas: tira tudo do celular.
-- ---------------------------------------------------------------------------
revoke all on public.perguntas, public.prova_desafios, public.prova_estado, public.prova_vistas,
  public.prova_respostas from anon, authenticated;
grant all on public.perguntas, public.prova_desafios, public.prova_estado, public.prova_vistas,
  public.prova_respostas to service_role;

revoke execute on function public.ver_prova_desafio(text), public.cobertura_perguntas(),
  public.prova_candidatas(uuid, smallint, text), public.prova_arquibancada(text) from public, anon, authenticated;
grant execute on function public.ver_prova_desafio(text) to anon, authenticated;
grant execute on function public.cobertura_perguntas() to authenticated;
grant execute on function public.prova_candidatas(uuid, smallint, text), public.prova_arquibancada(text) to service_role;
