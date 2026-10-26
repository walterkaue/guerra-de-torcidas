// Toda tabela de public e staging_gt tem RLS ligada e pelo menos uma política escrita (CLAUDE.md).
// Tabela nova sem isso quebra este teste.

import { describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

describe('RLS e política explícita', () => {
  it('nenhuma tabela sem RLS ou sem política', async () => {
    const db = await bancoDeTeste();
    const { rows } = await db.query<{ tabela: string; rls: boolean; politicas: number }>(`
      select n.nspname || '.' || c.relname as tabela, c.relrowsecurity as rls,
        (select count(*)::int from pg_policies p where p.schemaname = n.nspname and p.tablename = c.relname) as politicas
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind = 'r' and n.nspname in ('public', 'staging_gt')
      order by 1`);
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.filter((r) => !r.rls || r.politicas === 0).map((r) => r.tabela)).toEqual([]);
  }, 60_000);
});
