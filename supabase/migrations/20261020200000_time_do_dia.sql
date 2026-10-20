-- Time do Dia, o desafio diário (docs/jogo.md, seção 7.2). Só acrescenta: nada é apagado ou renomeado.
-- O clube do dia, os dados dos clubes e as tentativas ficam em tabelas que o celular NÃO lê
-- (RLS sem leitura e sem grant). Tudo passa pela função "time-do-dia" do servidor (secret key).
-- Não usa a tabela partidas: é uma por dia, fica fora do teto diário das 5 partidas e, no amistoso,
-- não soma no ranking.

-- ---------------------------------------------------------------------------
-- Os 60 clubes (Séries A, B e C de 2026). Entram pelo `npm run importar-clubes-do-dia`
-- (só linha revisada e com fonte; dados/clubes-do-dia.csv).
-- ---------------------------------------------------------------------------
create table public.dia_clubes (
  id text primary key check (id ~ '^[a-z0-9-]{2,30}$'),
  nome text not null check (char_length(nome) between 2 and 30),
  cidade text not null check (char_length(cidade) between 2 and 40),
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  regiao text not null check (regiao in ('Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul')),
  fundacao smallint not null check (fundacao between 1850 and 2100),
  titulos smallint not null check (titulos between 0 and 50),
  divisao text not null check (divisao in ('A', 'B', 'C')),
  cor1 text not null check (cor1 in ('branco', 'preto', 'vermelho', 'grená', 'verde', 'azul', 'amarelo', 'laranja')),
  cor2 text not null check (cor2 in ('branco', 'preto', 'vermelho', 'grená', 'verde', 'azul', 'amarelo', 'laranja')),
  capital boolean not null,
  fonte text not null check (fonte ~ '^https?://'),
  fonte2 text check (fonte2 is null or fonte2 ~ '^https?://'),
  fonte_titulos text not null check (fonte_titulos ~ '^https?://'),
  fonte_divisao text not null check (fonte_divisao ~ '^https?://'),
  verificada_em date not null,
  -- 'aposentada' tira o clube da lista e do sorteio (ex.: dados de 2027 ainda não conferidos).
  status text not null default 'ativa' check (status in ('ativa', 'aposentada')),
  atualizada_em timestamptz not null default now(),
  check (cor1 <> cor2)
);
alter table public.dia_clubes enable row level security;
create policy "dia_clubes: ninguém lê pelo cliente" on public.dia_clubes
  for select to authenticated using (false);

-- ---------------------------------------------------------------------------
-- O clube de cada dia (horário de Brasília). Sorteado pela função no 1º acesso do dia, sem
-- repetir clube dentro do ciclo (src/jogo/timeDoDia.ts, proximoClube). A chave primária
-- garante um clube só por dia, mesmo com dois acessos ao mesmo tempo na virada.
-- ---------------------------------------------------------------------------
create table public.dia_sorteio (
  dia date primary key,
  ciclo integer not null check (ciclo >= 1),
  clube_id text not null references public.dia_clubes (id),
  sorteado_em timestamptz not null default now()
);
alter table public.dia_sorteio enable row level security;
create policy "dia_sorteio: ninguém lê pelo cliente" on public.dia_sorteio
  for select to authenticated using (false);

-- ---------------------------------------------------------------------------
-- Uma partida por dia por torcedor. Apagar o app não recomeça o dia.
-- ---------------------------------------------------------------------------
create table public.dia_partidas (
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  dia date not null,
  -- Time do torcedor quando jogou (para somar na torcida quando sair do amistoso).
  time_id text not null references public.times (id),
  -- Ids dos clubes chutados, em ordem (as pistas são recalculadas a partir de dia_clubes).
  tentativas text[] not null default '{}' check (coalesce(array_length(tentativas, 1), 0) <= 6),
  acertou boolean not null default false,
  pontos smallint not null default 0 check (pontos between 0 and 100),
  amistoso boolean not null,
  sob_suspeita boolean not null default false,
  criada_em timestamptz not null default now(),
  fechada_em timestamptz,
  -- Trava otimista: cada tentativa grava só se ninguém mexeu antes (clique duplo, duas abas).
  versao integer not null default 0,
  primary key (torcedor_id, dia)
);
create index dia_partidas_dia on public.dia_partidas (dia);
alter table public.dia_partidas enable row level security;
create policy "dia_partidas: ninguém lê pelo cliente" on public.dia_partidas
  for select to authenticated using (false);

-- ---------------------------------------------------------------------------
-- Configuração (mesma config_deteccao; editável no Table Editor).
-- ---------------------------------------------------------------------------
insert into public.config_deteccao (chave, valor, descricao) values
  ('dia_amistoso', 1, 'Time do Dia em amistoso (1 = não soma no ranking; 0 = soma por cima, fora do teto diário)')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------------
-- Permissões explícitas. Tabelas novas podem nascer expostas: tira tudo do celular.
-- ---------------------------------------------------------------------------
revoke all on public.dia_clubes, public.dia_sorteio, public.dia_partidas from anon, authenticated;
grant all on public.dia_clubes, public.dia_sorteio, public.dia_partidas to service_role;
