// Corte dos Lances no domingo 08/11/2026 (20261107200000): o corte cai no meio da semana de 02/11, e a posição, o
// teto e o recorde separam as regras pelo dia (sábado na antiga, domingo na nova). Roda o SQL de verdade (PGlite),
// com a data de corte de verdade.

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, 'sao-paulo', '18_mais')`, [id]);
  return id;
}

/** Cria e fecha uma partida pelo fechar_partida de verdade, criada ao meio-dia do dia em que conta. Devolve o id. */
async function partida(db: PGlite, quem: string, pontos: number, dia: string, minigame = 'penaltis'): Promise<string> {
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, criada_em)
     values ($1, 'normal', 1, 0, now() + interval '15 minutes', $2, $3::timestamptz)
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem, minigame, `${dia}T12:00:00-03:00`],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id, quem, rows[0].time_id, '{}', '{}', pontos, dia, '2026-11-02', `${dia}T12:05:00-03:00`, null, null, null,
  ]);
  return rows[0].id;
}

async function como<T>(db: PGlite, uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

describe('corte no domingo 08/11, no meio da semana de 02/11', () => {
  let db: PGlite;
  let eu: string;
  let outro: string;
  let deSabado: string;
  let deDomingo: string;
  beforeAll(async () => {
    db = await bancoDeTeste();
    await db.query(`update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto'`);
    eu = await torcedor(db);
    outro = await torcedor(db);
    // Sábado (regra antiga): 140 nos pênaltis. Domingo (regra nova): pênaltis 90 e faltas 100; o outro faz 95.
    deSabado = await partida(db, eu, 140, '2026-11-07');
    await partida(db, eu, 90, '2026-11-08');
    deDomingo = await partida(db, eu, 100, '2026-11-08', 'lances');
    await partida(db, outro, 95, '2026-11-08', 'lances');
  }, TEMPO);

  it('a data de corte é domingo 08/11/2026, 0h de Brasília', async () => {
    const { rows } = await db.query<{ desde: Date; dia: string }>(
      `select public.lances_unificados_desde() as desde, public.lances_dia_do_corte()::text as dia`,
    );
    expect(rows[0].desde.toISOString()).toBe('2026-11-08T03:00:00.000Z');
    expect(rows[0].dia).toBe('2026-11-08');
  });

  it('no domingo, "penaltis" e "lances" são uma posição só, só com as partidas de domingo', async () => {
    for (const m of ['penaltis', 'lances']) {
      const [p] = await como(db, eu, 'select * from public.minha_posicao_minigame($1, $2)', [m, '2026-11-08']);
      expect(p).toEqual({ posicao: 1, total: 2, pontos: 100 });
    }
  });

  it('no sábado, a regra antiga, sem as partidas de domingo', async () => {
    const [pen] = await como(db, eu, 'select * from public.minha_posicao_minigame($1, $2)', ['penaltis', '2026-11-07']);
    expect(pen).toEqual({ posicao: 1, total: 1, pontos: 140 });
    const [lan] = await como(db, eu, 'select * from public.minha_posicao_minigame($1, $2)', ['lances', '2026-11-07']);
    expect(lan).toEqual({ posicao: null, total: 0, pontos: 0 });
  });

  it('a tela de resultado usa a regra do dia da partida', async () => {
    const desempenho = async (id: string) =>
      (await db.query('select posicao, total from public.desempenho_partida($1)', [id])).rows;
    expect(await desempenho(deDomingo)).toEqual([{ posicao: 1, total: 2 }]);
    expect(await desempenho(deSabado)).toEqual([{ posicao: 1, total: 1 }]);
  });

  it('o teto de domingo junta pênaltis e Lances; o de sábado segue o antigo', async () => {
    const { rows } = await db.query<{ dia: string; minigame: string; pontos: number }>(
      `select dia::text, minigame, pontos from public.partidas where torcedor_id = $1 and conta_no_teto order by dia, minigame`,
      [eu],
    );
    expect(rows).toEqual([
      { dia: '2026-11-07', minigame: 'penaltis', pontos: 140 },
      { dia: '2026-11-08', minigame: 'lances', pontos: 100 },
      { dia: '2026-11-08', minigame: 'penaltis', pontos: 90 },
    ]);
  });

  it('o recorde dos Lances recomeça no domingo', async () => {
    // p_antes no lugar do relógio: o teste roda antes do corte de verdade.
    const { rows } = await db.query<{ r: number }>(
      `select public.recorde_pessoal($1, 'penaltis', '2026-11-09T00:00:00-03:00') as r`,
      [eu],
    );
    expect(rows[0].r).toBe(100);
    const { rows: antes } = await db.query<{ r: number }>(
      `select public.recorde_pessoal($1, 'penaltis', '2026-11-07T23:00:00-03:00') as r`,
      [eu],
    );
    expect(antes[0].r).toBe(140);
  });
});
