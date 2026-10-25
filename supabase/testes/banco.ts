// Banco de teste: Postgres de verdade (PGlite, em memória) com as migrações de supabase/migrations.
// O que é da Supabase e não existe aqui (auth, papéis, pg_cron, pg_net, Realtime) vira um esboço mínimo.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = join(import.meta.dirname, '..', 'migrations');

const ESBOCO_SUPABASE = `
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('teste.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
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
