// X1 dos pênaltis valendo uma vez por pessoa (20261105200000): penaltis_comecar recusa o mesmo código para quem já
// começou uma partida com ele (fechada ou não, e também as de antes da migração). Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261105200000_x1_penaltis_uma_vez.sql';
const SEMENTES = `'{"cobrancas":[1,2,3,4,5,6,7,8],"defesas":[1,2,3,4,5,6,7,8]}'::jsonb`;
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, 'sao-paulo', '18_mais')`, [id]);
  return id;
}

/** Um X1 de `quem`: a partida de origem e o código, como o fechar_partida deixa. */
async function x1De(db: PGlite, quem: string, codigo: string): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame)
     values ($1, 'normal', 1, 0, now() + interval '15 minutes', 'penaltis') returning id`,
    [quem],
  );
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos)
     values ($1, $2, $3, 'sao-paulo', '[]'::jsonb, 3, 2, 70)`,
    [codigo, rows[0].id, quem],
  );
}

const comecar = (db: PGlite, quem: string, codigo: string | null) =>
  db.query<{ partida_id: string }>(
    `select * from public.penaltis_comecar($1, 1, 0.5, now() + interval '15 minutes', $2, $3, null, 3::smallint, ${SEMENTES})`,
    [quem, codigo ? 'desafio' : 'normal', codigo],
  );

describe('X1 dos pênaltis: uma vez por pessoa', () => {
  let db: PGlite;
  let ana: string;
  let bia: string;
  let caio: string;

  beforeAll(async () => {
    db = await bancoDeTeste(MIGRACAO);
    // Sem o limite de partidas por minuto, para o teste olhar só o X1.
    await db.exec(`update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto'`);
    ana = await torcedor(db);
    bia = await torcedor(db);
    caio = await torcedor(db);
    await x1De(db, ana, 'aaaaaaaa');
    await x1De(db, ana, 'bbbbbbbb');
    // Caio aceitou o X1 'aaaaaaaa' antes da migração e largou no meio (a partida nunca fechou).
    await comecar(db, caio, 'aaaaaaaa');
    await aplicarMigracao(db, MIGRACAO);
  }, TEMPO);

  it('a segunda vez no mesmo código é recusada, mesmo com a primeira partida aberta', async () => {
    const { rows } = await comecar(db, bia, 'aaaaaaaa');
    expect(rows).toHaveLength(1);
    await expect(comecar(db, bia, 'aaaaaaaa')).rejects.toThrow(/desafio_ja_jogado/);
    await expect(comecar(db, bia, 'aaaaaaaa')).rejects.toThrow(/desafio_ja_jogado/);
    const { rows: n } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.partidas where torcedor_id = $1 and desafio_id = 'aaaaaaaa'`,
      [bia],
    );
    expect(n[0].n).toBe(1);
  }, TEMPO);

  it('partida começada antes da migração também conta', async () => {
    await expect(comecar(db, caio, 'aaaaaaaa')).rejects.toThrow(/desafio_ja_jogado/);
  }, TEMPO);

  it('outro código, outra pessoa e partida normal seguem valendo', async () => {
    await expect(comecar(db, bia, 'bbbbbbbb')).resolves.toBeDefined();
    await expect(comecar(db, caio, 'bbbbbbbb')).resolves.toBeDefined();
    await expect(comecar(db, bia, null)).resolves.toBeDefined();
    await expect(comecar(db, bia, null)).resolves.toBeDefined();
  }, TEMPO);

  it('o X1 repetido responde desafio_ja_jogado antes do limite do minuto e não grava partida', async () => {
    const dani = await torcedor(db);
    await comecar(db, dani, 'aaaaaaaa');
    await db.exec(`update public.config_deteccao set valor = 1 where chave = 'partidas_por_minuto'`);
    try {
      // O celular entende o código e pede a partida normal, que aí esbarra no limite do minuto.
      await expect(comecar(db, dani, 'aaaaaaaa')).rejects.toThrow(/desafio_ja_jogado/);
      await expect(comecar(db, dani, null)).rejects.toThrow(/muitas_partidas/);
      const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.partidas where torcedor_id = $1', [dani]);
      expect(rows[0].n).toBe(1);
    } finally {
      await db.exec(`update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto'`);
    }
  }, TEMPO);

  it('continua só para o servidor', async () => {
    for (const papel of ['authenticated', 'anon']) {
      await db.exec(`set role ${papel}`);
      try {
        await expect(comecar(db, bia, 'bbbbbbbb')).rejects.toThrow(/permission/);
      } finally {
        await db.exec('reset role');
      }
    }
  }, TEMPO);
});
