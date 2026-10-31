// Pênaltis lance a lance (20261027000000): a semente sai da leitura do celular e os gestos da partida
// aberta ficam em partidas_segredo, com trava contra dois envios ao mesmo tempo.

import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
const ANA = '00000000-0000-4000-8000-0000000000a1';

let db: PGlite;
let partida: string;

describe('pênaltis lance a lance no banco', () => {
  beforeAll(async () => {
    db = await bancoDeTeste();
    await db.query('insert into auth.users (id) values ($1)', [ANA]);
    await db.query(`insert into public.torcedores (id, time_id) values ($1, 'flamengo')`, [ANA]);
    const { rows } = await db.query<{ id: string }>(
      `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
       values ($1, 'normal', 123456, 0.5, now() + interval '15 minutes') returning id`,
      [ANA],
    );
    partida = rows[0].id;
    await db.query(`insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance) values ($1, 3, true)`, [partida]);
  }, TEMPO);

  afterEach(async () => {
    await db.exec('reset role');
  });

  it('o celular lê a própria partida, mas não a semente', async () => {
    await db.query(`select set_config('teste.uid', $1, false)`, [ANA]);
    await db.exec('set role authenticated');
    const { rows } = await db.query<{ id: string }>('select id, dia, amistoso, fechada_em from public.partidas');
    expect(rows.map((r) => r.id)).toEqual([partida]);
    await expect(db.query('select semente from public.partidas')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from public.partidas')).rejects.toThrow(/permission denied/);
  });

  it('o celular não lê nem escreve os gestos guardados', async () => {
    await db.query(`select set_config('teste.uid', $1, false)`, [ANA]);
    await db.exec('set role authenticated');
    await expect(db.query('select gestos from public.partidas_segredo')).rejects.toThrow(/permission denied/);
    await expect(db.query(`update public.partidas_segredo set lances = 1`)).rejects.toThrow(/permission denied/);
  });

  it('dois envios do mesmo lance: só o primeiro grava', async () => {
    // Como a função do servidor (a secret key ignora RLS; aqui, o dono do banco).
    const gravar = (n: number) =>
      db.query(
        `update public.partidas_segredo set gestos = $2, lances = $3 + 1 where partida_id = $1 and lances = $3 returning lances`,
        [partida, JSON.stringify({ cobrancas: [{ dir: 0, forca: 70, efeito: 0 }], defesas: [] }), n],
      );
    expect((await gravar(0)).rows).toHaveLength(1);
    expect((await gravar(0)).rows).toHaveLength(0);
  });
});
