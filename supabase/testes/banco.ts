// Banco de teste: Postgres de verdade (PGlite, em memória) com as migrações de supabase/migrations.
// O que é da Supabase e não existe aqui (auth, papéis, pg_cron, pg_net, Realtime) vira um esboço mínimo.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = join(import.meta.dirname, '..', 'migrations');

const ESBOCO_SUPABASE = `
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean not null default true, email text,
    created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('teste.uid', true), '')::uuid $$;
  -- Sessões (um aparelho cada). Cada usuário de teste nasce com uma, de id igual ao dele; o JWT do pedido usa
  -- teste.sessao ou, sem ela, essa sessão de nascença.
  create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(), updated_at timestamptz, not_after timestamptz,
    refreshed_at timestamp, user_agent text);
  create function auth.sessao_de_nascenca() returns trigger language plpgsql
    as $$ begin insert into auth.sessions (id, user_id) values (new.id, new.id); return new; end $$;
  create trigger sessao_de_nascenca after insert on auth.users for each row execute function auth.sessao_de_nascenca();
  create function auth.jwt() returns jsonb language sql stable
    as $$ select jsonb_build_object('sub', current_setting('teste.uid', true),
      'session_id', coalesce(nullif(current_setting('teste.sessao', true), ''), current_setting('teste.uid', true))) $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  create schema extensions;
  create function extensions.unaccent(t text) returns text language sql immutable as $$ select t $$;
  create schema cron;
  create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
  create table cron.job (jobid bigint primary key, jobname text, command text, active boolean default true);
  create function cron.alter_job(job_id bigint, schedule text default null, command text default null,
    database text default null, username text default null, active boolean default null) returns void language sql
    as $$ update cron.job set active = coalesce($6, active) where jobid = $1 $$;
  create publication supabase_realtime;
`;

/** Tira o que só existe na Supabase (extensões); o esboço acima faz o papel delas. */
const adaptar = (sql: string) => sql.replace(/^create extension[^;]*;/gim, '');

export const migracoes = () => readdirSync(PASTA).filter((a) => a.endsWith('.sql')).sort();

export async function aplicarMigracao(db: PGlite, arquivo: string): Promise<void> {
  try {
    await db.exec(adaptar(readFileSync(join(PASTA, arquivo), 'utf8')));
  } catch (e) {
    throw new Error(`migração ${arquivo}: ${(e as Error).message}`);
  }
}

/** Banco com as migrações em ordem; com `antesDe`, para antes dela (para testar a própria migração). */
export async function bancoDeTeste(antesDe?: string): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(ESBOCO_SUPABASE);
  for (const arquivo of migracoes()) {
    if (antesDe && arquivo >= antesDe) break;
    await aplicarMigracao(db, arquivo);
  }
  return db;
}

/**
 * Muda a data de corte dos Lances unificados (seção 14.7) só neste banco. As funções leem o corte a cada chamada, e
 * as partidas dos testes nascem com now(): sem isso, um teste da regra antiga quebra sozinho a partir do corte de
 * verdade (09/11/2026), só porque o relógio passou dele.
 */
export async function cortarLancesEm(db: PGlite, instante: string, dia: string): Promise<void> {
  await db.exec(`
    create or replace function public.lances_unificados_desde() returns timestamptz language sql immutable set search_path = ''
      as $$ select timestamptz '${instante}' $$;
    create or replace function public.lances_dia_do_corte() returns date language sql immutable set search_path = ''
      as $$ select date '${dia}' $$;
  `);
}

/** Regra antiga dos Lances em qualquer dia em que o teste rodar (corte em 2099). */
export const cortarLancesNoFuturo = (db: PGlite): Promise<void> => cortarLancesEm(db, '2099-01-05 00:00:00-03', '2099-01-05');
