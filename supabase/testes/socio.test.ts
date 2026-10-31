// Cliques do "Seja sócio" (20261031000000): só a função soma, a tabela não tem como guardar quem
// clicou e o celular não lê nem grava nela. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;

let db: PGlite;

async function como<T>(papel: 'anon' | 'authenticated', sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}
const contar = (clube: string, papel: 'anon' | 'authenticated' = 'anon') => como(papel, 'select public.contar_clique_socio($1)', [clube]);
const cliques = async (clube: string) =>
  (await db.query<{ cliques: number }>('select cliques from public.socio_cliques where clube = $1', [clube])).rows.map((r) => r.cliques);

beforeAll(async () => {
  db = await bancoDeTeste();
}, TEMPO);

describe('cliques do Seja sócio', () => {
  it('soma por clube no mesmo dia, com ou sem login', async () => {
    await contar('flamengo');
    await contar('flamengo', 'authenticated');
    await contar('remo');
    expect(await cliques('flamengo')).toEqual([2]);
    expect(await cliques('remo')).toEqual([1]);
  }, TEMPO);

  it('o dia é o de Brasília', async () => {
    const { rows } = await db.query<{ certo: boolean }>(
      `select dia = (now() at time zone 'America/Sao_Paulo')::date as certo from public.socio_cliques where clube = 'flamengo'`,
    );
    expect(rows).toEqual([{ certo: true }]);
  }, TEMPO);

  it('recusa "Outro time" e clube que não existe', async () => {
    await expect(contar('outro')).rejects.toThrow('time_invalido');
    await expect(contar('clube-falso')).rejects.toThrow('time_invalido');
    expect(await cliques('outro')).toEqual([]);
  }, TEMPO);

  it('o celular não lê nem grava a tabela', async () => {
    for (const papel of ['anon', 'authenticated'] as const) {
      await expect(como(papel, 'select * from public.socio_cliques')).rejects.toThrow();
      await expect(como(papel, `insert into public.socio_cliques values ('bahia', current_date, 99)`)).rejects.toThrow();
      await expect(como(papel, 'update public.socio_cliques set cliques = 99')).rejects.toThrow();
    }
    expect(await cliques('bahia')).toEqual([]);
    expect(await cliques('flamengo')).toEqual([2]);
  }, TEMPO);

  it('a tabela não tem coluna de usuário', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'socio_cliques' order by 1`,
    );
    expect(rows.map((r) => r.column_name).sort()).toEqual(['cliques', 'clube', 'dia']);
  }, TEMPO);
});
