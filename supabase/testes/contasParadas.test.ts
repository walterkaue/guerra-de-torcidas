// Contas paradas (20261103000000): conta anônima sem jogar há mais de 6 meses sai, e os pontos dela ficam
// no placar como total anônimo. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const AGORA = '2026-11-02T12:00:00-03:00';
const ANTIGA = '2026-03-01T12:00:00-03:00'; // 8 meses antes
const SEMANA_VELHA = '2026-03-30';
const DIA_VELHO = '2026-03-31';
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;

async function conta(o: { criada?: string; anonima?: boolean; time?: string } = {}): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous, created_at) values ($1, $2, $3)', [id, o.anonima ?? true, o.criada ?? ANTIGA]);
  if (o.time !== undefined) {
    await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, $2, '18_mais')`, [id, o.time]);
  }
  return id;
}

async function partida(quem: string, pontos: number): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, criada_em, expira_em)
     values ($1, 'normal', 1, 0.5, $2, $2::timestamptz + interval '15 minutes') returning id`,
    [quem, `${DIA_VELHO}T12:00:00-03:00`],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id, quem, 'bahia', '{}', '{}', pontos, DIA_VELHO, SEMANA_VELHA, `${DIA_VELHO}T12:01:00-03:00`, null, null, null,
  ]);
}

const apagar = async () =>
  (await db.query<{ n: number }>('select public.apagar_contas_paradas(6, $1) as n', [AGORA])).rows[0].n;

async function placar() {
  await db.query('select public.recalcular_ranking($1)', [SEMANA_VELHA]);
  return (
    await db.query<{ time_id: string; ativos: number; soma: number }>(
      `select time_id, ativos, soma from public.ranking_semana where semana = $1 and ativos > 0 order by time_id`,
      [SEMANA_VELHA],
    )
  ).rows;
}

const existe = async (id: string) =>
  (await db.query<{ n: number }>('select count(*)::integer as n from auth.users where id = $1', [id])).rows[0].n === 1;

let parada: string;
let semTime: string;
let palpitou: string;
let nova: string;
let comEmail: string;
let admin: string;
let antes: Awaited<ReturnType<typeof placar>>;
let primeira: number;

beforeAll(async () => {
  db = await bancoDeTeste();
  parada = await conta({ time: 'bahia' });
  await partida(parada, 80);
  await db.query(`insert into public.feedbacks (usuario_id, tipo, texto) values ($1, 'ideia', 'texto da parada')`, [parada]);

  semTime = await conta();

  palpitou = await conta({ time: 'bahia' });
  await partida(palpitou, 30);
  const { rows: jogo } = await db.query<{ id: string }>(
    `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values (33, 'bahia', 'remo', now() + interval '1 day') returning id`,
  );
  await db.query(
    `insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante, atualizado_em) values ($1, $2, 1, 0, '2026-09-01T12:00:00-03:00')`,
    [palpitou, jogo[0].id],
  );

  nova = await conta({ criada: '2026-09-01T12:00:00-03:00', time: 'remo' });
  comEmail = await conta({ anonima: false, time: 'remo' });
  admin = await conta({ time: 'remo' });
  await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);

  antes = await placar();
  primeira = await apagar();
}, TEMPO);

describe('apagar contas paradas', () => {
  it('sai quem não joga há mais de 6 meses, com ou sem time', async () => {
    expect(primeira).toBe(2);
    expect(await existe(parada)).toBe(false);
    expect(await existe(semTime)).toBe(false);
  }, TEMPO);

  it('fica quem jogou nos últimos 6 meses (palpite conta), conta nova, conta com e-mail e administrador', async () => {
    for (const id of [palpitou, nova, comEmail, admin]) expect(await existe(id)).toBe(true);
  }, TEMPO);

  it('o placar da semana antiga continua igual, com os pontos da conta apagada como total anônimo', async () => {
    expect(await placar()).toEqual(antes);
    const { rows } = await db.query<{ total: number }>('select total from public.pontos_apagados where semana = $1', [SEMANA_VELHA]);
    expect(rows.map((r) => r.total)).toEqual([80]);
  }, TEMPO);

  it('a mensagem do "Achei um erro" some junto', async () => {
    const { rows } = await db.query<{ n: number }>(`select count(*)::integer as n from public.feedbacks where texto = 'texto da parada'`);
    expect(rows[0].n).toBe(0);
  }, TEMPO);

  it('o registro guarda só quando e quantas; rodar de novo não apaga nem registra nada', async () => {
    expect(await apagar()).toBe(0);
    const { rows } = await db.query<{ contas: number }>('select contas from public.contas_paradas_apagadas');
    expect(rows).toEqual([{ contas: 2 }]);
  }, TEMPO);

  it('o celular não chama a limpeza nem lê o registro', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await db.exec(`set role ${papel}`);
      try {
        await expect(db.query('select public.apagar_contas_paradas()')).rejects.toThrow(/permission denied/);
        await expect(db.query('select * from public.contas_paradas_apagadas')).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec('reset role');
      }
    }
  }, TEMPO);
});
