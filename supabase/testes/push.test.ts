// Inscrições de push (20261026000300): o aparelho grava e apaga a própria inscrição pelas funções,
// nunca lê a tabela; no máximo 5 aparelhos por pessoa. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
const ANA = '00000000-0000-4000-8000-0000000000a1';
const BIA = '00000000-0000-4000-8000-0000000000b2';
const chaves = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) };
const ep = (n: number) => `https://fcm.googleapis.com/fcm/send/aparelho-${n}`;

let db: PGlite;

async function como<T>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}
const salvar = (uid: string, endpoint: string) =>
  como(uid, 'select public.salvar_inscricao_push($1, $2, $3)', [endpoint, chaves.p256dh, chaves.auth]);
const inscricoes = async (uid: string) =>
  (await db.query<{ endpoint: string }>('select endpoint from public.push_inscricoes where torcedor_id = $1 order by criada_em', [uid])).rows.map((r) => r.endpoint);

beforeAll(async () => {
  db = await bancoDeTeste();
  await db.query('insert into auth.users (id) values ($1), ($2)', [ANA, BIA]);
}, TEMPO);

describe('inscrições de push', () => {
  it('o aparelho liga o aviso e ligar de novo só atualiza', async () => {
    await salvar(ANA, ep(1));
    await salvar(ANA, ep(1));
    expect(await inscricoes(ANA)).toEqual([ep(1)]);
  }, TEMPO);

  it('o celular não lê a tabela', async () => {
    await expect(como(ANA, 'select * from public.push_inscricoes')).rejects.toThrow(/permission denied/);
  }, TEMPO);

  it('no máximo 5 aparelhos por pessoa: o mais antigo sai', async () => {
    for (let n = 2; n <= 6; n++) {
      await db.query(`select pg_sleep(0.01)`);
      await salvar(ANA, ep(n));
    }
    expect(await inscricoes(ANA)).toEqual([ep(2), ep(3), ep(4), ep(5), ep(6)]);
  }, TEMPO);

  it('desligar só apaga a própria inscrição', async () => {
    await salvar(BIA, ep(99));
    await como(ANA, 'select public.remover_inscricao_push($1)', [ep(99)]);
    expect(await inscricoes(BIA)).toEqual([ep(99)]);
    await como(BIA, 'select public.remover_inscricao_push($1)', [ep(99)]);
    expect(await inscricoes(BIA)).toEqual([]);
  }, TEMPO);

  it('endpoint que não é https é recusado', async () => {
    await expect(salvar(BIA, 'http://exemplo.com/x')).rejects.toThrow(/check/);
  }, TEMPO);
});
