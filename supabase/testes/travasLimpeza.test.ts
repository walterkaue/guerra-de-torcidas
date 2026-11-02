// Travas da revisão de 02/11/2026 na limpeza de contas paradas (20261103000100): prazo inválido não apaga
// nada, a chave secreta das funções não chama, e várias contas na mesma semana viram um total cada, com o
// placar igual. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const AGORA = '2026-11-02T12:00:00-03:00';
const ANTIGA = '2026-03-01T12:00:00-03:00'; // 8 meses antes
const SEMANA_A = '2026-03-30';
const SEMANA_B = '2026-04-06';
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;

async function conta(time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous, created_at) values ($1, true, $2)', [id, ANTIGA]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, $2, '18_mais')`, [id, time]);
  return id;
}

async function partida(quem: string, time: string, semana: string, pontos: number): Promise<void> {
  const dia = semana.replace(/-30$/, '-31').replace(/-06$/, '-07');
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, criada_em, expira_em)
     values ($1, 'normal', 1, 0.5, $2, $2::timestamptz + interval '15 minutes') returning id`,
    [quem, `${dia}T12:00:00-03:00`],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id, quem, time, '{}', '{}', pontos, dia, semana, `${dia}T12:01:00-03:00`, null, null, null,
  ]);
}

async function placar(semana: string) {
  await db.query('select public.recalcular_ranking($1)', [semana]);
  return (
    await db.query<{ time_id: string; ativos: number; soma: number; media30: string; posicao_campeao: number }>(
      `select time_id, ativos, soma, media30::text, posicao_campeao from public.ranking_semana where semana = $1 order by time_id`,
      [semana],
    )
  ).rows;
}

const contas = async () => (await db.query<{ n: number }>('select count(*)::integer as n from auth.users')).rows[0].n;

let fica: string;

beforeAll(async () => {
  db = await bancoDeTeste();
  const a = await conta('bahia');
  await partida(a, 'bahia', SEMANA_A, 80);
  await partida(a, 'bahia', SEMANA_B, 40);
  const b = await conta('remo');
  await partida(b, 'remo', SEMANA_A, 50);
  // Quem trocou de time na semana deixa um total por time.
  await partida(b, 'bahia', SEMANA_A, 20);
  // Quem fica pontuou na mesma semana e palpitou há 2 meses: a parte dela no placar não pode mudar.
  fica = await conta('remo');
  await partida(fica, 'remo', SEMANA_A, 70);
  const { rows: jogo } = await db.query<{ id: string }>(
    `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values (33, 'bahia', 'remo', now() + interval '1 day') returning id`,
  );
  await db.query(
    `insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante, atualizado_em) values ($1, $2, 1, 0, '2026-09-01T12:00:00-03:00')`,
    [fica, jogo[0].id],
  );
}, TEMPO);

describe('travas da limpeza de contas paradas', () => {
  it('recusa prazo menor que 6 meses, data no futuro ou vazia, sem apagar nada', async () => {
    const antes = await contas();
    for (const [meses, agora] of [
      [0, AGORA],
      [5, AGORA],
      [6, '2099-01-01T00:00:00-03:00'],
      [null, AGORA],
      [6, null],
    ] as const) {
      await expect(db.query('select public.apagar_contas_paradas($1, $2)', [meses, agora])).rejects.toThrow(/prazo_invalido/);
    }
    expect(await contas()).toBe(antes);
  }, TEMPO);

  it('a chave secreta das funções não chama a limpeza', async () => {
    await db.exec('set role service_role');
    try {
      await expect(db.query('select public.apagar_contas_paradas()')).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  }, TEMPO);

  it('várias contas na mesma semana: um total por conta e time, e o placar das duas semanas fica igual', async () => {
    const antesA = await placar(SEMANA_A);
    const antesB = await placar(SEMANA_B);
    const n = (await db.query<{ n: number }>('select public.apagar_contas_paradas(6, $1) as n', [AGORA])).rows[0].n;
    expect(n).toBe(2);
    expect(await placar(SEMANA_A)).toEqual(antesA);
    expect(await placar(SEMANA_B)).toEqual(antesB);
    const { rows } = await db.query<{ semana: string; time_id: string; total: number }>(
      `select semana::text, time_id, total from public.pontos_apagados order by semana, time_id, total`,
    );
    expect(rows).toEqual([
      { semana: SEMANA_A, time_id: 'bahia', total: 20 },
      { semana: SEMANA_A, time_id: 'bahia', total: 80 },
      { semana: SEMANA_A, time_id: 'remo', total: 50 },
      { semana: SEMANA_B, time_id: 'bahia', total: 40 },
    ]);
    const { rows: ficou } = await db.query<{ n: number }>('select count(*)::integer as n from auth.users where id = $1', [fica]);
    expect(ficou[0].n).toBe(1);
  }, TEMPO);
});
