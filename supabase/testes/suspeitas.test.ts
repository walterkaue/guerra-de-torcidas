// Revisão das partidas sob suspeita no #admin (20261027000200): a fila, liberar e manter fora.
// Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;
let hoje: string;
let semana: string;
let admin: string;

async function torcedor(time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id) values ($1, $2)`, [id, time]);
  return id;
}

/** Fecha uma partida de pênaltis pelo caminho de verdade (fechar_partida), com ou sem suspeita. */
async function partida(quem: string, time: string, pontos: number, dia: string, motivo: string | null): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes') returning id`,
    [quem],
  );
  const id = rows[0].id;
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, public.semana_de($7), $8, $9, null, null)', [
    id, quem, time, '{"cobrancas":[],"defesas":[]}', JSON.stringify({ pontos: { total: pontos } }), pontos, dia,
    new Date().toISOString(), motivo,
  ]);
  return id;
}

const soma = async (time: string, sem = semana) =>
  (await db.query<{ soma: number }>('select soma from public.ranking_semana where semana = $1 and time_id = $2', [sem, time])).rows[0]?.soma ?? 0;

async function comoAdmin<T>(fn: () => Promise<T>, uid = admin): Promise<T> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const fila = () =>
  comoAdmin(async () => (await db.query<{ minigame: string; id: string; pontos: number; motivo: string; partidas_do_torcedor: number; suspeitas_do_torcedor: number }>('select * from public.suspeitas_fila(30)')).rows);
const decidir = (minigame: string, id: string, liberar: boolean, uid = admin) =>
  comoAdmin(() => db.query('select public.suspeitas_decidir($1, $2, $3)', [minigame, id, liberar]), uid);

describe('revisão das suspeitas', () => {
  beforeAll(async () => {
    db = await bancoDeTeste();
    hoje = (await db.query<{ d: string }>(`select public.hoje_brasilia()::text as d`)).rows[0].d;
    semana = (await db.query<{ d: string }>(`select public.semana_de(public.hoje_brasilia())::text as d`)).rows[0].d;
    admin = uuid();
    await db.query('insert into auth.users (id) values ($1)', [admin]);
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
  }, TEMPO);

  afterEach(async () => {
    await db.exec('reset role');
  });

  it('liberar: a partida volta para o teto e para o ranking da semana', async () => {
    const a = await torcedor('bahia');
    await partida(a, 'bahia', 40, hoje, null);
    const p = await partida(a, 'bahia', 90, hoje, 'defesas: 28 de 30');
    expect(await soma('bahia')).toBe(40);
    const linha = (await fila()).find((l) => l.id === p)!;
    expect(linha).toMatchObject({ minigame: 'penaltis', pontos: 90, motivo: 'defesas: 28 de 30', partidas_do_torcedor: 2, suspeitas_do_torcedor: 1 });

    await decidir('penaltis', p, true);
    expect(await soma('bahia')).toBe(130);
    const r = await db.query<{ sob_suspeita: boolean; conta_no_teto: boolean; revisada_em: Date | null }>(
      'select sob_suspeita, conta_no_teto, revisada_em from public.partidas where id = $1', [p]);
    expect(r.rows[0]).toMatchObject({ sob_suspeita: false, conta_no_teto: true });
    expect(r.rows[0].revisada_em).not.toBeNull();
    expect((await fila()).some((l) => l.id === p)).toBe(false);
  });

  it('manter fora: sai da fila e continua fora do ranking', async () => {
    const a = await torcedor('remo');
    const p = await partida(a, 'remo', 70, hoje, 'cobranças: nenhuma no canto do goleiro em 40');
    await decidir('penaltis', p, false);
    expect(await soma('remo')).toBe(0);
    expect((await fila()).some((l) => l.id === p)).toBe(false);
    await expect(decidir('penaltis', p, true)).rejects.toThrow(/fora_da_fila/);
  });

  it('Time do Dia: liberar soma por cima na semana', async () => {
    const a = await torcedor('vitoria');
    await db.query(
      `insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, acertou, pontos, amistoso, sob_suspeita, fechada_em)
       values ($1, $2, 'vitoria', '{bahia}', true, 100, false, true, now())`, [a, hoje]);
    const id = `${a}:${hoje}`;
    expect((await fila()).find((l) => l.id === id)).toMatchObject({ minigame: 'dia', pontos: 100 });
    await decidir('dia', id, true);
    expect(await soma('vitoria')).toBe(100);
  });

  it('semana já confirmada não reabre: libera para a pessoa, mas o ranking daquela semana fica', async () => {
    const a = await torcedor('santos');
    const antiga = '2026-09-01';
    const semanaAntiga = (await db.query<{ d: string }>(`select public.semana_de($1::date)::text as d`, [antiga])).rows[0].d;
    const p = await partida(a, 'santos', 80, antiga, 'defesas: 27 de 30');
    await decidir('penaltis', p, true);
    expect(await soma('santos', semanaAntiga)).toBe(0);
    const r = await db.query<{ conta_no_teto: boolean }>('select conta_no_teto from public.partidas where id = $1', [p]);
    expect(r.rows[0].conta_no_teto).toBe(true);
  });

  it('só administrador vê a fila e decide', async () => {
    const a = await torcedor('gremio');
    const p = await partida(a, 'gremio', 50, hoje, 'defesas: 27 de 30');
    await expect(comoAdmin(() => db.query('select * from public.suspeitas_fila(30)'), a)).rejects.toThrow(/sem_permissao/);
    await expect(decidir('penaltis', p, true, a)).rejects.toThrow(/sem_permissao/);
    await comoAdmin(async () => {
      await db.exec('reset role');
      await db.exec('set role anon');
      await expect(db.query('select * from public.suspeitas_fila(30)')).rejects.toThrow(/permission denied/);
    });
  });

  it('id torto não quebra: só diz que saiu da fila', async () => {
    await expect(decidir('penaltis', 'nada', true)).rejects.toThrow(/fora_da_fila/);
    await expect(decidir('dia', 'x:y', true)).rejects.toThrow(/fora_da_fila/);
    await expect(decidir('crava', '00000000-0000-4000-8000-000000000001', true)).rejects.toThrow(/fora_da_fila/);
  });
});
