-- staging_gt: caixa de entrada do conteúdo gerado pelas funções com Gemini (gerar-conteudo,
-- auditar-conteudo, corrigir-fontes). O esquema foi criado direto no painel; esta migração o
-- versiona como está (idempotente: não recria nem apaga nada que já exista) e fecha o acesso.
-- Nada daqui vai ao ar no jogo: o que for aproveitado passa pelos CSVs e validadores do repositório.

create schema if not exists staging_gt;

create table if not exists staging_gt.perguntas (
  id varchar(50) primary key,
  clube varchar(100) not null,
  degrau varchar(50) not null,
  tema varchar(100) not null,
  texto text not null,
  alternativa_a text not null,
  alternativa_b text not null,
  alternativa_c text not null,
  alternativa_d text not null,
  correta varchar(5) not null,
  fonte text,
  status varchar(50) default 'revisada',
  created_at timestamptz default now()
);

create table if not exists staging_gt.lances (
  id varchar(100) primary key,
  clube varchar(100) not null,
  tipo varchar(50) not null,
  titulo varchar(100) not null,
  ficha text not null,
  pessoas text,
  competicao varchar(150),
  data date,
  adversario varchar(100),
  estadio varchar(150),
  bola_x numeric,
  bola_z numeric,
  barreira integer,
  barreira_mira_x numeric,
  goleiro_saida numeric,
  canto varchar(50),
  chegada varchar(150),
  chegada_de varchar(50),
  faixa varchar(50),
  fonte text,
  fonte2 text,
  verificada_em date,
  status varchar(50) default 'revisada',
  observacao text,
  created_at timestamptz default now()
);

create table if not exists staging_gt.casa_clubes (
  id varchar(50) primary key,
  fundacao date,
  cidade varchar(100),
  uf varchar(10),
  apelidos text,
  historia_cores text,
  fonte text,
  fonte2 text,
  verificada_em date,
  status varchar(50) default 'revisada',
  observacao text,
  created_at timestamptz default now()
);

create table if not exists staging_gt.casa_estadios (
  id serial primary key,
  clube varchar(50) not null,
  nome varchar(150) not null,
  nome_popular varchar(100),
  inauguracao date,
  capacidade integer,
  formato varchar(50),
  gramado varchar(50),
  recorde_publico integer,
  recorde_tipo varchar(50),
  recorde_partida text,
  recorde_data date,
  fonte text,
  fonte_capacidade text,
  fonte_recorde text,
  verificada_em date,
  status varchar(50) default 'revisada',
  observacao text,
  created_at timestamptz default now()
);

create table if not exists staging_gt.casa_titulos (
  id serial primary key,
  clube varchar(50) not null,
  competicao varchar(100) not null,
  ano varchar(50) not null,
  oficial boolean default true,
  nota text,
  fonte text,
  verificada_em date,
  status varchar(50) default 'revisada',
  observacao text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Acesso: só o servidor (secret key). Visitante anônimo e usuário logado não leem nem escrevem
-- (antes tinham todos os privilégios nas tabelas, e as perguntas com a resposta certa eram
-- legíveis por qualquer um).
-- ---------------------------------------------------------------------------
alter table staging_gt.perguntas enable row level security;
alter table staging_gt.lances enable row level security;
alter table staging_gt.casa_clubes enable row level security;
alter table staging_gt.casa_estadios enable row level security;
alter table staging_gt.casa_titulos enable row level security;

drop policy if exists "Permitir leitura das perguntas" on staging_gt.perguntas;

revoke all on all tables in schema staging_gt from anon, authenticated;
revoke all on all sequences in schema staging_gt from anon, authenticated;
revoke all on schema staging_gt from anon, authenticated;
alter default privileges in schema staging_gt revoke all on tables from anon, authenticated;
alter default privileges in schema staging_gt revoke all on sequences from anon, authenticated;

grant usage on schema staging_gt to service_role;
grant select, insert, update, delete on all tables in schema staging_gt to service_role;
grant usage, select on all sequences in schema staging_gt to service_role;

-- ---------------------------------------------------------------------------
-- Pausa os crons que geram conteúdo e trocam fontes (consumiam a cota do Gemini e gravavam
-- conteúdo sem conferência). O de auditoria continua. Para religar:
--   select cron.alter_job(jobid, active := true) from cron.job where jobname = 'job_gerar_conteudo';
-- ---------------------------------------------------------------------------
do $$
declare
  v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname in ('job_gerar_conteudo', 'job_corrigir_fontes') loop
    perform cron.alter_job(v_job, active := false);
  end loop;
end;
$$;
