// Pênaltis com uma semente por lance (20261103300000): a coluna nova em partidas_segredo, nula nas partidas
// antigas (que seguem com partidas.semente), e fora do alcance do celular.

import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261103300000_penaltis_semente_por_lance.sql';
const TEMPO = 60_000;
const ANA = '00000000-0000-4000-8000-0000000000a1';
const SEMENTES = { cobrancas: [1, 2, 3, 4, 5, 6, 7, 8], defesas: [9, 10, 11, 12, 13, 14, 15, 4294967295] };

let db: PGlite;
let antiga: string;

async function novaPartida(): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 123456, 0.5, now() + interval '15 minutes') returning id`,
    [ANA],
  );
  return rows[0].id;
}

describe('pênaltis: sementes por lance no banco', () => {
  beforeAll(async () => {
    db = await bancoDeTeste(MIGRACAO);
    await db.query('insert into auth.users (id) values ($1)', [ANA]);
    await db.query(`insert into public.torcedores (id, time_id) values ($1, 'flamengo')`, [ANA]);
    antiga = await novaPartida();
    await db.query(`insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance) values ($1, 3, true)`, [antiga]);
    await aplicarMigracao(db, MIGRACAO);
  }, TEMPO);

  afterEach(async () => {
    await db.exec('reset role');
  });

  it('partida aberta antes da migração fica sem sementes por lance (segue com a semente única)', async () => {
    const { rows } = await db.query<{ sementes: unknown; semente: string }>(
      `select s.sementes, p.semente from public.partidas_segredo s join public.partidas p on p.id = s.partida_id
       where s.partida_id = $1`,
      [antiga],
    );
    expect(rows[0].sementes).toBeNull();
    expect(Number(rows[0].semente)).toBe(123456);
  });

  it('partida nova guarda as sementes de cada lance', async () => {
    const id = await novaPartida();
    await db.query(
      `insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, sementes) values ($1, 2, true, $2)`,
      [id, JSON.stringify(SEMENTES)],
    );
    const { rows } = await db.query<{ sementes: unknown }>('select sementes from public.partidas_segredo where partida_id = $1', [id]);
    expect(rows[0].sementes).toEqual(SEMENTES);
  });

  it('recusa sementes fora do formato', async () => {
    const id = await novaPartida();
    const gravar = (v: unknown) =>
      db.query(
        `insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, sementes) values ($1, 2, true, $2)`,
        [id, JSON.stringify(v)],
      );
    await expect(gravar([1, 2, 3])).rejects.toThrow(/check/);
    await expect(gravar({ cobrancas: [1] })).rejects.toThrow(/check/);
    await expect(gravar({ cobrancas: 1, defesas: [] })).rejects.toThrow(/check/);
  });

  it('o celular não lê nem escreve as sementes', async () => {
    await db.query(`select set_config('teste.uid', $1, false)`, [ANA]);
    await db.exec('set role authenticated');
    await expect(db.query('select sementes from public.partidas_segredo')).rejects.toThrow(/permission denied/);
    await expect(db.query(`update public.partidas_segredo set sementes = null`)).rejects.toThrow(/permission denied/);
  });
});
