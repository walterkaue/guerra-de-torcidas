// Inscrições de push (20261026000300): o aparelho grava e apaga a própria inscrição pelas funções,
// nunca lê a tabela; no máximo 5 aparelhos por pessoa. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
const ANA = '00000000-0000-4000-8000-0000000000a1';
const BIA = '00000000-0000-4000-8000-0000000000b2';
const CAIO = '00000000-0000-4000-8000-0000000000c3';
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
const faixa = (uid: string, f: string) => como<{ achou: boolean }>(uid, 'select public.salvar_faixa_etaria($1) as achou', [f]);
const inscricoes = async (uid: string) =>
  (await db.query<{ endpoint: string }>('select endpoint from public.push_inscricoes where torcedor_id = $1 order by criada_em', [uid])).rows.map((r) => r.endpoint);

beforeAll(async () => {
  db = await bancoDeTeste();
  await db.query('insert into auth.users (id) values ($1), ($2), ($3)', [ANA, BIA, CAIO]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, 'bahia', '18_mais'), ($2, 'bahia', '18_mais')`, [ANA, BIA]);
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

describe('push só para 18+ (docs/jogo.md, seção 13)', () => {
  it('sem torcedor ou sem resposta da triagem, a inscrição é recusada', async () => {
    await expect(salvar(CAIO, ep(50))).rejects.toThrow(/so_18_mais/);
    expect(await faixa(CAIO, '18_mais')).toEqual([{ achou: false }]);
    await db.query(`insert into public.torcedores (id, time_id) values ($1, 'bahia')`, [CAIO]);
    await expect(salvar(CAIO, ep(50))).rejects.toThrow(/so_18_mais/);
  }, TEMPO);

  it('menos de 18 não se inscreve', async () => {
    for (const f of ['menos_16', '16_17']) {
      await faixa(CAIO, f);
      await expect(salvar(CAIO, ep(50))).rejects.toThrow(/so_18_mais/);
    }
    expect(await inscricoes(CAIO)).toEqual([]);
  }, TEMPO);

  it('18+ se inscreve, e quem deixa de ser 18+ é desinscrito', async () => {
    expect(await faixa(CAIO, '18_mais')).toEqual([{ achou: true }]);
    await salvar(CAIO, ep(50));
    expect(await inscricoes(CAIO)).toEqual([ep(50)]);
    await faixa(CAIO, '16_17');
    expect(await inscricoes(CAIO)).toEqual([]);
  }, TEMPO);

  it('só as três faixas valem, e só a própria pessoa grava', async () => {
    await expect(faixa(CAIO, 'adulto')).rejects.toThrow(/faixa_invalida/);
    await expect(como(CAIO, `update public.torcedores set faixa_etaria = '18_mais' where id = '${CAIO}'`)).rejects.toThrow(/permission denied/);
    await expect(db.query(`update public.torcedores set faixa_etaria = 'adulto' where id = $1`, [CAIO])).rejects.toThrow(/check/);
    await db.query(`select set_config('teste.uid', '', false)`);
    await db.exec('set role anon');
    try {
      await expect(db.query(`select public.salvar_faixa_etaria('18_mais')`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  }, TEMPO);
});
