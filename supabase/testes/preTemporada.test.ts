// Migração da pré-temporada (20261020300000): Time do Dia no ranking da semana, posições, recorde,
// permissões e a reclassificação das partidas que nasceram amistoso. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261020300000_pre_temporada.sql';
const SEMANA = '2026-10-19'; // segunda
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite, time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

interface Partida {
  minigame?: 'penaltis' | 'prova';
  time?: string;
  pontos: number;
  dia?: string;
  /** Hora de Brasília em que fechou, "HH:MM". */
  hora?: string;
  amistoso?: boolean;
  suspeita?: boolean;
}

async function partida(db: PGlite, quem: string, p: Partida): Promise<string> {
  const dia = p.dia ?? '2026-10-20';
  const fechada = `${dia}T${p.hora ?? '12:00'}:00-03:00`;
  const time = p.time ?? (await db.query<{ time_id: string }>('select time_id from public.torcedores where id = $1', [quem])).rows[0].time_id;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, criada_em, expira_em, fechada_em, time_id,
       pontos, semana, dia, minigame, amistoso, sob_suspeita)
     values ($1, 'normal', 1, 0.5, $2::timestamptz - interval '1 minute', $2::timestamptz + interval '15 minutes', $2,
       $3, $4, date_trunc('week', $5::date)::date, $5, $6, $7, $8)
     returning id`,
    [quem, fechada, time, p.pontos, dia, p.minigame ?? 'penaltis', p.amistoso ?? false, p.suspeita ?? false],
  );
  await db.query('select public.atualizar_teto($1, $2)', [quem, dia]);
  return rows[0].id;
}

interface Dia {
  dia: string;
  pontos: number;
  time?: string;
  hora?: string;
  amistoso?: boolean;
  suspeita?: boolean;
  aberta?: boolean;
}

async function timeDoDia(db: PGlite, quem: string, d: Dia): Promise<void> {
  const time = d.time ?? (await db.query<{ time_id: string }>('select time_id from public.torcedores where id = $1', [quem])).rows[0].time_id;
  await db.query(
    `insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, acertou, pontos, amistoso, sob_suspeita, fechada_em)
     values ($1, $2, $3, '{x}', $4 > 0, $4, $5, $6, $7)`,
    [quem, d.dia, time, d.pontos, d.amistoso ?? false, d.suspeita ?? false, d.aberta ? null : `${d.dia}T${d.hora ?? '12:00'}:00-03:00`],
  );
}

async function ranking(db: PGlite, semana = SEMANA) {
  await db.query('select public.recalcular_ranking($1)', [semana]);
  const { rows } = await db.query<{ time_id: string; ativos: number; soma: number; media30: string; posicao_campeao: number }>(
    'select time_id, ativos, soma, media30, posicao_campeao from public.ranking_semana where semana = $1',
    [semana],
  );
  return Object.fromEntries(rows.map((r) => [r.time_id, r]));
}

async function como<T>(db: PGlite, uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
  return (await db.query<T>(sql, params)).rows;
}

describe('pré-temporada: configuração', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('Prova e Time do Dia fora do amistoso, Crava desde a 32ª', async () => {
    const { rows } = await db.query<{ chave: string; valor: string }>(
      `select chave, valor::text from public.config_deteccao where chave in ('prova_amistoso', 'dia_amistoso')
       union all select chave, valor::text from public.config_crava where chave = 'valendo_desde_rodada'`,
    );
    expect(Object.fromEntries(rows.map((r) => [r.chave, Number(r.valor)]))).toEqual({
      prova_amistoso: 0,
      dia_amistoso: 0,
      valendo_desde_rodada: 32,
    });
  });
});

describe('ranking da semana com o Time do Dia', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('soma o Time do Dia por cima das partidas, no time de quando jogou', async () => {
    const a = await torcedor(db, 'bahia');
    await partida(db, a, { pontos: 50 });
    await timeDoDia(db, a, { dia: '2026-10-20', pontos: 85 });
    // Trocou de time depois: o dia jogado pelo Vitória fica no Vitória.
    const b = await torcedor(db, 'remo');
    await timeDoDia(db, b, { dia: '2026-10-21', pontos: 70, time: 'vitoria' });

    const r = await ranking(db);
    expect(r.bahia.soma).toBe(135);
    expect(r.bahia.ativos).toBe(1);
    expect(r.vitoria.soma).toBe(70);
    expect(r.remo.ativos).toBe(0);
  });

  it('fica por fora do teto diário: 5 partidas + o dia contam inteiros', async () => {
    const a = await torcedor(db, 'mirassol');
    for (let i = 0; i < 7; i++) await partida(db, a, { pontos: 10 + i, hora: `1${i}:00` });
    await timeDoDia(db, a, { dia: '2026-10-20', pontos: 100 });
    // 5 melhores: 16+15+14+13+12 = 70, mais 100 do dia.
    expect((await ranking(db)).mirassol.soma).toBe(170);
  });

  it('não soma dia de outra semana, amistoso, sob suspeita ou sem terminar', async () => {
    const a = await torcedor(db, 'santos');
    await timeDoDia(db, a, { dia: '2026-10-18', pontos: 100 }); // domingo da semana anterior
    await timeDoDia(db, a, { dia: '2026-10-26', pontos: 100 }); // segunda da semana seguinte
    await timeDoDia(db, a, { dia: '2026-10-22', pontos: 55, amistoso: true });
    await timeDoDia(db, a, { dia: '2026-10-23', pontos: 40, suspeita: true });
    await timeDoDia(db, a, { dia: '2026-10-24', pontos: 0, aberta: true });
    await timeDoDia(db, a, { dia: '2026-10-25', pontos: 25 }); // domingo: ainda é a semana
    const r = await ranking(db);
    expect(r.santos.soma).toBe(25);
    expect((await ranking(db, '2026-10-12')).santos.soma).toBe(100);
  });

  it('dia sem acertar (0 ponto) conta como torcedor ativo', async () => {
    const a = await torcedor(db, 'chapecoense');
    await timeDoDia(db, a, { dia: '2026-10-20', pontos: 0 });
    expect((await ranking(db)).chapecoense.ativos).toBe(1);
  });

  it('Crava da 32ª em diante soma (×2 já gravado), por fora do teto', async () => {
    const a = await torcedor(db, 'coritiba');
    await db.query(`insert into public.jogos (id, rodada, mandante_id, visitante_id, inicio)
      values ('10000000-0000-4000-8000-000000000001', 32, 'coritiba', 'remo', '2026-10-23T19:00:00-03:00')`);
    await db.query(`insert into public.crava_pontos (torcedor_id, jogo_id, rodada, time_id, semana, pontos)
      values ($1, '10000000-0000-4000-8000-000000000001', 32, 'coritiba', $2, 20)`, [a, SEMANA]);
    await partida(db, a, { pontos: 30 });
    expect((await ranking(db)).coritiba.soma).toBe(50);
  });
});

describe('posições e recorde', () => {
  let db: PGlite;
  let ana: string;
  let beto: string;
  let caio: string;
  let duda: string;
  let novato: string;

  beforeAll(async () => {
    db = await bancoDeTeste();
    ana = await torcedor(db, 'flamengo');
    beto = await torcedor(db, 'palmeiras');
    caio = await torcedor(db, 'outro');
    duda = await torcedor(db, 'gremio');
    novato = await torcedor(db, 'gremio');
    // Semana: ana 60 + 40 (dia) = 100 às 13h; caio 100 às 15h (empata, chegou depois); beto 80; duda 20.
    await partida(db, ana, { pontos: 60, hora: '10:00' });
    await timeDoDia(db, ana, { dia: '2026-10-20', pontos: 40, hora: '13:00' });
    await partida(db, caio, { pontos: 100, hora: '15:00' });
    await partida(db, beto, { pontos: 30, minigame: 'prova', hora: '09:00' });
    await partida(db, beto, { pontos: 50, minigame: 'prova', hora: '11:00' });
    await partida(db, duda, { pontos: 20 });
    // Partida sob suspeita nunca entra em posição nem em recorde.
    await partida(db, duda, { pontos: 140, suspeita: true, hora: '18:00' });
  }, TEMPO);

  it('geral da semana: soma de tudo que conta, de todos os times, empate com quem chegou primeiro', async () => {
    const pos = async (uid: string) =>
      (await db.query<{ posicao: number | null; total: number; pontos: number }>('select * from public.posicao_semana($1, $2)', [uid, SEMANA])).rows[0];
    expect(await pos(ana)).toEqual({ posicao: 1, total: 4, pontos: 100 });
    expect(await pos(caio)).toEqual({ posicao: 2, total: 4, pontos: 100 });
    expect(await pos(beto)).toEqual({ posicao: 3, total: 4, pontos: 80 });
    expect(await pos(duda)).toEqual({ posicao: 4, total: 4, pontos: 20 });
    // Ainda não jogou: sem posição, mas sabe quantos estão na disputa.
    expect(await pos(novato)).toEqual({ posicao: null, total: 4, pontos: 0 });
  });

  it('por minigame: melhor partida da semana (pênaltis e Prova) e pontos do dia (Time do Dia)', async () => {
    const pos = async (uid: string, m: string, data: string) =>
      (await db.query<{ posicao: number | null; total: number; pontos: number }>('select * from public.posicao_minigame($1, $2, $3)', [uid, m, data])).rows[0];
    expect(await pos(caio, 'penaltis', '2026-10-22')).toEqual({ posicao: 1, total: 3, pontos: 100 });
    expect(await pos(ana, 'penaltis', '2026-10-22')).toEqual({ posicao: 2, total: 3, pontos: 60 });
    expect(await pos(duda, 'penaltis', '2026-10-22')).toEqual({ posicao: 3, total: 3, pontos: 20 });
    expect(await pos(beto, 'prova', SEMANA)).toEqual({ posicao: 1, total: 1, pontos: 50 });
    expect(await pos(ana, 'dia', '2026-10-20')).toEqual({ posicao: 1, total: 1, pontos: 40 });
    expect(await pos(ana, 'dia', '2026-10-21')).toEqual({ posicao: null, total: 0, pontos: 0 });
    // Outra semana: ninguém.
    expect(await pos(ana, 'penaltis', '2026-10-27')).toEqual({ posicao: null, total: 0, pontos: 0 });
  });

  it('só a própria pessoa: as "minha_…" usam a sessão e não recebem outro torcedor', async () => {
    const semana = await como(db, ana, 'select * from public.minha_posicao_semana($1)', [SEMANA]);
    expect(semana).toEqual([{ posicao: 1, total: 4, pontos: 100 }]);
    const mini = await como(db, beto, `select * from public.minha_posicao_minigame('prova', $1)`, [SEMANA]);
    expect(mini).toEqual([{ posicao: 1, total: 1, pontos: 50 }]);
    const recordes = await como<{ minigame: string; recorde: number | null }>(db, beto, 'select * from public.meus_recordes()');
    expect(Object.fromEntries(recordes.map((r) => [r.minigame, r.recorde]))).toEqual({ penaltis: null, prova: 50, dia: null, crava: null });
    expect(await como(db, null, 'select * from public.minha_posicao_semana($1)', [SEMANA])).toEqual([]);
  });

  it('permissões: o celular chama só as "minha_…"; as internas são do servidor', async () => {
    await db.query(`select set_config('teste.uid', $1, false)`, [ana]);
    await db.exec('set role authenticated');
    try {
      expect((await db.query('select * from public.minha_posicao_semana($1)', [SEMANA])).rows).toHaveLength(1);
      await expect(db.query('select * from public.posicao_semana($1, $2)', [beto, SEMANA])).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from public.desempenho_partida($1)', [beto])).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from public.pontos_semana($1)', [SEMANA])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
    await db.exec('set role anon');
    try {
      await expect(db.query('select * from public.minha_posicao_semana($1)', [SEMANA])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });
  it('recorde: a primeira não é recorde novo; passar o de antes é; empatar não é; suspeita não conta', async () => {
    const eva = await torcedor(db, 'vasco');
    const desempenho = async (id: string) =>
      (await db.query<{ posicao: number; total: number; recorde: number; novo_recorde: boolean }>('select * from public.desempenho_partida($1)', [id])).rows[0];

    const p1 = await partida(db, eva, { pontos: 40, dia: '2026-10-21', hora: '10:00' });
    expect(await desempenho(p1)).toMatchObject({ recorde: 40, novo_recorde: false });
    const p2 = await partida(db, eva, { pontos: 55, dia: '2026-10-21', hora: '11:00' });
    expect(await desempenho(p2)).toMatchObject({ recorde: 55, novo_recorde: true, posicao: 3, total: 4 });
    const p3 = await partida(db, eva, { pontos: 55, dia: '2026-10-21', hora: '12:00' });
    expect(await desempenho(p3)).toMatchObject({ recorde: 55, novo_recorde: false });
    const p4 = await partida(db, eva, { pontos: 150, dia: '2026-10-21', hora: '13:00', suspeita: true });
    expect(await desempenho(p4)).toMatchObject({ recorde: 55, novo_recorde: false });
    // Recorde é por minigame: a primeira Prova não herda o recorde dos pênaltis.
    const p5 = await partida(db, eva, { pontos: 90, minigame: 'prova', dia: '2026-10-21', hora: '14:00' });
    expect(await desempenho(p5)).toMatchObject({ recorde: 90, novo_recorde: false, posicao: 1, total: 2 });
  });

  it('recorde do Time do Dia pelo melhor dia, com posição do dia', async () => {
    const fred = await torcedor(db, 'cruzeiro');
    await timeDoDia(db, fred, { dia: '2026-10-21', pontos: 55 });
    await timeDoDia(db, fred, { dia: '2026-10-22', pontos: 85 });
    const d = (await db.query('select * from public.desempenho_dia($1, $2)', [fred, '2026-10-22'])).rows[0];
    expect(d).toEqual({ posicao: 1, total: 1, recorde: 85, novo_recorde: true });
    const antes = (await db.query('select * from public.desempenho_dia($1, $2)', [fred, '2026-10-21'])).rows[0];
    expect(antes).toEqual({ posicao: 1, total: 1, recorde: 85, novo_recorde: false });
  });

});

describe('reclassificação das partidas que nasceram amistoso', () => {
  it('a Prova fechada em amistoso passa a contar no teto e no ranking; a aberta fecha valendo', async () => {
    const db = await bancoDeTeste(MIGRACAO);
    const a = await torcedor(db, 'botafogo');
    // Antes da migração: Prova em amistoso não ocupa vaga no teto.
    for (let i = 0; i < 5; i++) await partida(db, a, { pontos: 20, hora: `0${i}:00` });
    const prova = await partida(db, a, { pontos: 90, minigame: 'prova', amistoso: true, hora: '10:00' });
    await db.query(`insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, amistoso)
      values ($1, 'normal', 1, 0.5, now() + interval '15 minutes', 'prova', true)`, [a]);
    await db.query('select public.recalcular_ranking($1)', [SEMANA]);
    const antes = await db.query<{ soma: number }>(`select soma from public.ranking_semana where semana = $1 and time_id = 'botafogo'`, [SEMANA]);
    expect(antes.rows[0].soma).toBe(100);

    await aplicarMigracao(db, MIGRACAO);

    const { rows } = await db.query<{ amistoso: boolean; n: number }>('select amistoso, count(*)::int as n from public.partidas group by amistoso');
    expect(rows).toEqual([{ amistoso: false, n: 7 }]);
    const p = await db.query<{ conta_no_teto: boolean }>('select conta_no_teto from public.partidas where id = $1', [prova]);
    expect(p.rows[0].conta_no_teto).toBe(true);
    // 90 + as 4 melhores de 20.
    const depois = await db.query<{ soma: number }>(`select soma from public.ranking_semana where semana = $1 and time_id = 'botafogo'`, [SEMANA]);
    expect(depois.rows[0].soma).toBe(170);
  }, TEMPO);
});
