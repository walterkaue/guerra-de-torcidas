// Fechamento numa transação só (20261020400000): gravar a partida, teto, ranking e desafio entram
// juntos ou não entram. Em 20/10/2026 uma partida ficou fechada fora do teto e sem desafio porque a
// função do servidor quebrou entre a gravação e o teto. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const SEMANA = '2026-10-19'; // segunda
const DIA = '2026-10-20';
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite, time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, apelido) values ($1, $2, 'Zé')`, [id, time]);
  return id;
}

async function aberta(db: PGlite, quem: string, minigame: 'penaltis' | 'prova' = 'penaltis', amistoso = false): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, amistoso)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes', $2, $3) returning id`,
    [quem, minigame, amistoso],
  );
  return rows[0].id;
}

interface Fechar {
  time: string;
  pontos: number;
  hora?: string;
  motivo?: string | null;
  desafio?: object | null;
  codigos?: string[];
}

async function fechar(db: PGlite, partida: string, quem: string, f: Fechar) {
  const { rows } = await db.query<{ teto: boolean; suspeita: boolean; codigo: string | null }>(
    'select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
    [
      partida,
      quem,
      f.time,
      JSON.stringify({ cobrancas: [], defesas: [] }),
      JSON.stringify({ pontos: { total: f.pontos } }),
      f.pontos,
      DIA,
      SEMANA,
      `${DIA}T${f.hora ?? '12:00'}:00-03:00`,
      f.motivo ?? null,
      f.desafio === undefined ? JSON.stringify({ cobrancas: [{ dir: 1 }], gols_jogador: 3, gols_maquina: 2 }) : f.desafio && JSON.stringify(f.desafio),
      f.codigos ?? ['abcdefgh', 'bcdefghj', 'cdefghjk'],
    ],
  );
  return rows;
}

const soma = async (db: PGlite, time: string) =>
  (await db.query<{ soma: number }>('select soma from public.ranking_semana where semana = $1 and time_id = $2', [SEMANA, time])).rows[0]?.soma ?? 0;

const estado = async (db: PGlite, id: string) =>
  (await db.query<{ fechada_em: Date | null; conta_no_teto: boolean; sob_suspeita: boolean; motivo_suspeita: string | null; pontos: number | null }>(
    'select fechada_em, conta_no_teto, sob_suspeita, motivo_suspeita, pontos from public.partidas where id = $1',
    [id],
  )).rows[0];

describe('fechar_partida', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('pênaltis: grava, entra no teto, soma no ranking e cria o X1 de uma vez', async () => {
    const a = await torcedor(db, 'bahia');
    const p = await aberta(db, a);
    expect(await fechar(db, p, a, { time: 'bahia', pontos: 80 })).toEqual([{ teto: true, suspeita: false, codigo: 'abcdefgh' }]);
    expect(await estado(db, p)).toMatchObject({ conta_no_teto: true, sob_suspeita: false, pontos: 80 });
    expect(await soma(db, 'bahia')).toBe(80);
    const d = await db.query('select partida_id, torcedor_id, time_id, apelido, gols_jogador, gols_maquina, pontos, cobrancas from public.desafios where id = $1', ['abcdefgh']);
    expect(d.rows).toEqual([{ partida_id: p, torcedor_id: a, time_id: 'bahia', apelido: 'Zé', gols_jogador: 3, gols_maquina: 2, pontos: 80, cobrancas: [{ dir: 1 }] }]);
  });

  it('código do X1 repetido: fica o próximo da lista', async () => {
    const a = await torcedor(db, 'vitoria');
    const p = await aberta(db, a);
    const [l] = await fechar(db, p, a, { time: 'vitoria', pontos: 40, codigos: ['abcdefgh', 'mnpqrstu'] });
    expect(l.codigo).toBe('mnpqrstu');
  });

  it('fechar de novo (duas abas) não devolve nada e não mexe em nada', async () => {
    const a = await torcedor(db, 'remo');
    const p = await aberta(db, a);
    await fechar(db, p, a, { time: 'remo', pontos: 60, codigos: ['remo0001'] });
    expect(await fechar(db, p, a, { time: 'remo', pontos: 100, codigos: ['remo0002'] })).toEqual([]);
    expect((await estado(db, p)).pontos).toBe(60);
    expect(await soma(db, 'remo')).toBe(60);
    expect((await db.query(`select 1 from public.desafios where id = 'remo0002'`)).rows).toEqual([]);
  });

  it('não fecha partida de outra pessoa', async () => {
    const a = await torcedor(db, 'santos');
    const b = await torcedor(db, 'santos');
    const p = await aberta(db, a);
    expect(await fechar(db, p, b, { time: 'santos', pontos: 90, codigos: ['santos01'] })).toEqual([]);
    expect((await estado(db, p)).fechada_em).toBeNull();
  });

  it('se algo quebra no meio, nada fica gravado: a partida continua aberta e fora do ranking', async () => {
    const a = await torcedor(db, 'gremio');
    const p = await aberta(db, a);
    // Código fora do formato: o insert do desafio falha depois da partida gravada e do ranking.
    await expect(fechar(db, p, a, { time: 'gremio', pontos: 70, codigos: ['X'] })).rejects.toThrow();
    expect(await estado(db, p)).toMatchObject({ fechada_em: null, conta_no_teto: false, pontos: null });
    expect(await soma(db, 'gremio')).toBe(0);
    // E dá para fechar de novo, inteira.
    expect(await fechar(db, p, a, { time: 'gremio', pontos: 70, codigos: ['gremio01'] })).toEqual([{ teto: true, suspeita: false, codigo: 'gremio01' }]);
    expect(await soma(db, 'gremio')).toBe(70);
  });

  it('sob suspeita: grava o motivo, fica fora do teto e do ranking', async () => {
    const a = await torcedor(db, 'coritiba');
    const p = await aberta(db, a);
    expect(await fechar(db, p, a, { time: 'coritiba', pontos: 150, motivo: 'defesas: 28 de 30', codigos: ['corit001'] })).toEqual([
      { teto: false, suspeita: true, codigo: 'corit001' },
    ]);
    expect((await estado(db, p)).motivo_suspeita).toBe('defesas: 28 de 30');
    expect(await soma(db, 'coritiba')).toBe(0);
  });

  it('teto: a 6ª partida do dia só entra se for melhor que uma das 5', async () => {
    const a = await torcedor(db, 'mirassol');
    for (let i = 0; i < 5; i++) await fechar(db, await aberta(db, a), a, { time: 'mirassol', pontos: 20, hora: `0${i}:00`, desafio: null });
    const pior = await aberta(db, a);
    expect((await fechar(db, pior, a, { time: 'mirassol', pontos: 10, hora: '10:00', desafio: null }))[0].teto).toBe(false);
    const melhor = await aberta(db, a);
    expect((await fechar(db, melhor, a, { time: 'mirassol', pontos: 90, hora: '11:00', desafio: null }))[0].teto).toBe(true);
    expect(await soma(db, 'mirassol')).toBe(170);
  });

  it('partida de desafio (sem p_desafio) fecha sem criar X1', async () => {
    const a = await torcedor(db, 'chapecoense');
    const p = await aberta(db, a);
    expect(await fechar(db, p, a, { time: 'chapecoense', pontos: 30, desafio: null, codigos: ['chape001'] })).toEqual([
      { teto: true, suspeita: false, codigo: null },
    ]);
    expect((await db.query(`select 1 from public.desafios where partida_id = $1`, [p])).rows).toEqual([]);
  });

  it('Prova: cria o desafio na tabela da Prova, com as 8 perguntas', async () => {
    const a = await torcedor(db, 'vasco');
    const p = await aberta(db, a, 'prova');
    const perguntas = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const [l] = await fechar(db, p, a, { time: 'vasco', pontos: 51, desafio: { perguntas, escada: '🟩🟥', resumo: 'cheguei na 2ª' }, codigos: ['vasco001'] });
    expect(l).toEqual({ teto: true, suspeita: false, codigo: 'vasco001' });
    const d = await db.query('select partida_id, perguntas, pontos, escada, resumo, apelido from public.prova_desafios where id = $1', ['vasco001']);
    expect(d.rows).toEqual([{ partida_id: p, perguntas, pontos: 51, escada: '🟩🟥', resumo: 'cheguei na 2ª', apelido: 'Zé' }]);
    expect((await db.query('select 1 from public.desafios where partida_id = $1', [p])).rows).toEqual([]);
    expect(await soma(db, 'vasco')).toBe(51);
  });

  it('amistoso: fecha e cria o desafio, mas não ocupa vaga no teto', async () => {
    const a = await torcedor(db, 'cruzeiro');
    const p = await aberta(db, a, 'prova', true);
    const [l] = await fechar(db, p, a, { time: 'cruzeiro', pontos: 51, desafio: { perguntas: ['1', '2', '3', '4', '5', '6', '7', '8'], escada: '🟥', resumo: 'x' }, codigos: ['cruze001'] });
    expect(l).toEqual({ teto: false, suspeita: false, codigo: 'cruze001' });
  });
});

describe('fechar_dia', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  const comecar = async (quem: string, time: string, amistoso = false) =>
    db.query(`insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, amistoso, versao) values ($1, $2, $3, '{a}', $4, 1)`, [quem, DIA, time, amistoso]);

  const fecharDia = async (quem: string, versao: number, pontos: number, suspeita = false) =>
    (await db.query<{ fechada_em: Date | null; pontos: number; versao: number; tentativas: string[] }>(
      'select * from public.fechar_dia($1, $2, $3, $4, $5, $6, $7, $8)',
      [quem, DIA, versao, ['a', 'b'], pontos > 0, pontos, `${DIA}T12:00:00-03:00`, suspeita],
    )).rows;

  it('fecha o dia e soma na semana na mesma chamada', async () => {
    const a = await torcedor(db, 'bahia');
    await comecar(a, 'bahia');
    const [l] = await fecharDia(a, 1, 85);
    expect(l).toMatchObject({ pontos: 85, versao: 2, tentativas: ['a', 'b'] });
    expect(l.fechada_em).not.toBeNull();
    expect(await soma(db, 'bahia')).toBe(85);
  });

  it('versão velha (clique duplo) ou dia já fechado: nada', async () => {
    const a = await torcedor(db, 'remo');
    await comecar(a, 'remo');
    expect(await fecharDia(a, 0, 85)).toEqual([]);
    await fecharDia(a, 1, 55);
    expect(await fecharDia(a, 2, 100)).toEqual([]);
    expect(await soma(db, 'remo')).toBe(55);
  });

  it('sob suspeita ou amistoso: fecha, mas não soma', async () => {
    const a = await torcedor(db, 'santos');
    await comecar(a, 'santos');
    await fecharDia(a, 1, 100, true);
    const b = await torcedor(db, 'vitoria');
    await comecar(b, 'vitoria', true);
    expect(await fecharDia(b, 1, 100)).toHaveLength(1);
    expect(await soma(db, 'santos')).toBe(0);
    expect(await soma(db, 'vitoria')).toBe(0);
  });
});

describe('permissões do fechamento', () => {
  it('só o servidor (secret key) chama fechar_partida e fechar_dia', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'flamengo');
    const p = await aberta(db, a);
    await db.query(`select set_config('teste.uid', $1, false)`, [a]);
    for (const papel of ['authenticated', 'anon']) {
      await db.exec(`set role ${papel}`);
      try {
        await expect(fechar(db, p, a, { time: 'flamengo', pontos: 100 })).rejects.toThrow(/permission denied/);
        await expect(
          db.query('select * from public.fechar_dia($1::uuid, $2::date, 0, $3::text[], true, 100::smallint, now(), false)', [a, DIA, ['a']]),
        ).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec('reset role');
      }
    }
    await db.exec('set role service_role');
    try {
      expect(await fechar(db, p, a, { time: 'flamengo', pontos: 100 })).toHaveLength(1);
    } finally {
      await db.exec('reset role');
    }
  }, TEMPO);
});
