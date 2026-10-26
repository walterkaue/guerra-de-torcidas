// Carreira do jogador (20261026200000): XP pelas partidas válidas, bônus, sequência, permissões e o
// zerar da pré-temporada, que não pode levar a carreira junto. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { xpDoDia } from '../../src/jogo/carreira';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261026200000_carreira.sql';

const SEMANA = '2026-10-19'; // segunda
const DIA = '2026-10-20';
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite, time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

/** Abre e fecha uma partida pelo caminho de verdade (fechar_partida). */
async function partida(db: PGlite, quem: string, pontos: number, o: { dia?: string; hora?: string; suspeita?: boolean } = {}) {
  const dia = o.dia ?? DIA;
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes')
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id,
    quem,
    rows[0].time_id,
    '{}',
    '{}',
    pontos,
    dia,
    SEMANA, // todos os dias dos testes são da semana de 19/10
    `${dia}T${o.hora ?? '12:00'}:00-03:00`,
    o.suspeita ? 'teste' : null,
    null,
    null,
  ]);
  return rows[0].id;
}

async function timeDoDia(db: PGlite, quem: string, pontos: number, o: { dia?: string; aberta?: boolean; suspeita?: boolean } = {}) {
  const dia = o.dia ?? DIA;
  await db.query(
    `insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, acertou, pontos, amistoso, sob_suspeita, fechada_em)
     values ($1, $2, (select time_id from public.torcedores where id = $1), '{x}', $3 > 0, $3, false, $4, $5)`,
    [quem, dia, pontos, o.suspeita ?? false, o.aberta ? null : `${dia}T12:00:00-03:00`],
  );
}

async function carreira(db: PGlite, quem: string) {
  const { rows } = await db.query<{ xp: number; partidas_hoje: number; sequencia: number; bonus_tipo: string | null }>(
    'select * from public.carreira_de($1)',
    [quem],
  );
  return rows[0];
}

const xpDe = async (db: PGlite, quem: string) => (await carreira(db, quem)).xp;

describe('conta do XP', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('carreira_xp_dia é a mesma conta de src/jogo/carreira.ts', async () => {
    const { rows } = await db.query<{ n: number; xp: number }>(
      'select n, public.carreira_xp_dia(n) as xp from generate_series(-1, 25) n',
    );
    for (const r of rows) expect(r.xp).toBe(xpDoDia(r.n));
  });

  it('partidas fechadas: 10 nas 5 primeiras, 5 depois; suspeita não conta', async () => {
    const a = await torcedor(db, 'bahia');
    for (let i = 0; i < 7; i++) await partida(db, a, 40, { hora: `1${i}:00` });
    await partida(db, a, 300, { suspeita: true });
    expect(await xpDe(db, a)).toBe(60);
    // Outro dia recomeça a conta.
    await partida(db, a, 10, { dia: '2026-10-21' });
    expect(await xpDe(db, a)).toBe(70);
  });

  it('teto de 15 por dia', async () => {
    const a = await torcedor(db, 'remo');
    for (let i = 0; i < 18; i++) await partida(db, a, 0);
    expect(await xpDe(db, a)).toBe(100);
  });

  it('Time do Dia conta como 1 partida quando termina, sem suspeita', async () => {
    const a = await torcedor(db, 'santos');
    await timeDoDia(db, a, 0);
    await timeDoDia(db, a, 80, { dia: '2026-10-21', suspeita: true });
    await timeDoDia(db, a, 0, { dia: '2026-10-22', aberta: true });
    expect(await xpDe(db, a)).toBe(10);
    // Terminou depois (fechar_dia de verdade): entra.
    await db.query(
      `select * from public.fechar_dia($1, '2026-10-22', 0, '{x,y}', true, 70::smallint, now(), false)`,
      [a],
    );
    expect(await xpDe(db, a)).toBe(20);
  });

  it('Crava: cada rodada palpitada conta 1 vez, não cada jogo', async () => {
    const a = await torcedor(db, 'vitoria');
    const jogos = await db.query<{ id: string; rodada: number }>(
      `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values
         (32, 'bahia', 'santos', now() + interval '1 day'),
         (32, 'remo', 'vitoria', now() + interval '1 day'),
         (33, 'bahia', 'remo', now() + interval '8 days')
       returning id, rodada`,
    );
    for (const j of jogos.rows) {
      await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 1, 0)', [a, j.id]);
    }
    // Apagar e palpitar de novo não conta outra vez.
    await db.query('delete from public.palpites where torcedor_id = $1 and jogo_id = $2', [a, jogos.rows[0].id]);
    await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 2, 2)', [a, jogos.rows[0].id]);
    const c = await carreira(db, a);
    expect(c.xp).toBe(20);
    expect(c.partidas_hoje).toBe(2);
  });

  it('fechar de novo ou mexer na partida depois não conta duas vezes', async () => {
    const a = await torcedor(db, 'mirassol');
    const id = await partida(db, a, 50);
    await db.query('update public.partidas set fechada_em = fechada_em + interval \'1 second\' where id = $1', [id]);
    await db.query('update public.partidas set sob_suspeita = true where id = $1', [id]);
    expect(await xpDe(db, a)).toBe(10);
  });

  it('suspeita tirada na revisão: a partida entra', async () => {
    const a = await torcedor(db, 'coritiba');
    const id = await partida(db, a, 50, { suspeita: true });
    expect(await xpDe(db, a)).toBe(0);
    await db.query('update public.partidas set sob_suspeita = false, revisada_em = now() where id = $1', [id]);
    expect(await xpDe(db, a)).toBe(10);
  });
});

describe('sequência de dias', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  const marcar = (quem: string, diasAtras: number[]) =>
    Promise.all(
      diasAtras.map((d) =>
        db.query(`select public.carreira_registrar($1, 'partida', $2, public.hoje_brasilia() - $3::integer)`, [quem, uuid(), d]),
      ),
    );

  it('conta os dias seguidos até hoje ou ontem; perder não tira XP', async () => {
    const a = await torcedor(db, 'bahia');
    await marcar(a, [0, 1, 2, 4]);
    expect((await carreira(db, a)).sequencia).toBe(3);
    const b = await torcedor(db, 'bahia');
    await marcar(b, [1, 2]);
    expect((await carreira(db, b)).sequencia).toBe(2);
    const c = await torcedor(db, 'bahia');
    await marcar(c, [2, 3, 4]);
    const cc = await carreira(db, c);
    expect(cc.sequencia).toBe(0);
    expect(cc.xp).toBe(30);
  });
});

describe('bônus', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('1º do dia entre todos: +100 uma vez só, empate para quem chegou primeiro', async () => {
    const a = await torcedor(db, 'bahia');
    const b = await torcedor(db, 'remo');
    const c = await torcedor(db, 'santos');
    await partida(db, a, 90, { hora: '10:00' });
    await partida(db, b, 60, { hora: '09:00' });
    await timeDoDia(db, b, 30); // 12:00: b chega a 90 depois de a
    await partida(db, c, 200, { suspeita: true });
    await db.query(`select public.carreira_bonus_dia($1)`, [DIA]);
    expect(await xpDe(db, a)).toBe(110);
    expect(await xpDe(db, b)).toBe(20);
    // Rodar de novo, mesmo com o dia mudando depois, não dá um segundo 1º.
    await partida(db, b, 100, { hora: '23:00' });
    await db.query(`select public.carreira_bonus_dia($1)`, [DIA]);
    expect(await xpDe(db, b)).toBe(30);
    const { rows } = await db.query(`select * from public.carreira_bonus where tipo = 'dia'`);
    expect(rows).toHaveLength(1);
  });

  it('dia sem ninguém pontuando: sem bônus', async () => {
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 0, { dia: '2026-10-23' });
    await db.query(`select public.carreira_bonus_dia('2026-10-23')`);
    expect(await xpDe(db, a)).toBe(10);
  });

  it('1º de cada torcida oficial na semana: +200', async () => {
    const a = await torcedor(db, 'vitoria');
    const b = await torcedor(db, 'vitoria');
    const c = await torcedor(db, 'mirassol');
    const outro = await torcedor(db, 'outro');
    await partida(db, a, 80, { dia: '2026-10-21' });
    await partida(db, b, 50, { dia: '2026-10-21' });
    await partida(db, c, 10, { dia: '2026-10-22' });
    await partida(db, outro, 500, { dia: '2026-10-22' });
    await db.query(`select public.carreira_bonus_semana($1)`, [SEMANA]);
    expect(await xpDe(db, a)).toBe(210);
    expect(await xpDe(db, b)).toBe(10);
    expect(await xpDe(db, c)).toBe(210);
    expect(await xpDe(db, outro)).toBe(10);
    // Mesmo da semana anterior: sem segunda leva.
    await partida(db, b, 400, { dia: '2026-10-23' });
    await db.query(`select public.carreira_bonus_semana($1)`, [SEMANA]);
    expect(await xpDe(db, b)).toBe(20);
  });

  it('carreira_fechar roda sem erro (cron)', async () => {
    await db.query('select public.carreira_fechar()');
  });
});

describe('permissões', () => {
  let db: PGlite;
  let a: string;
  let b: string;
  beforeAll(async () => {
    db = await bancoDeTeste();
    a = await torcedor(db, 'bahia');
    b = await torcedor(db, 'remo');
    await partida(db, a, 10);
    await partida(db, b, 10);
    await partida(db, b, 10);
  }, TEMPO);

  async function como<T>(uid: string | null, papel: 'authenticated' | 'anon', sql: string): Promise<T[]> {
    await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
    await db.exec(`set role ${papel}`);
    try {
      return (await db.query<T>(sql)).rows;
    } finally {
      await db.exec('reset role');
    }
  }

  it('minha_carreira devolve só a própria', async () => {
    const [eu] = await como<{ xp: number }>(a, 'authenticated', 'select * from public.minha_carreira()');
    expect(eu.xp).toBe(10);
    const linhas = await como<{ torcedor_id: string }>(a, 'authenticated', 'select torcedor_id from public.carreira_partidas');
    expect(linhas.map((l) => l.torcedor_id)).toEqual([a]);
  });

  it('o celular não grava XP nem lê a carreira dos outros', async () => {
    await expect(
      como(a, 'authenticated', `insert into public.carreira_partidas (torcedor_id, origem, referencia, dia) values ('${a}', 'partida', 'x', '2026-10-20')`),
    ).rejects.toThrow();
    await expect(como(a, 'authenticated', `select * from public.carreira_de('${b}')`)).rejects.toThrow();
    await expect(como(a, 'authenticated', `select public.carreira_bonus_dia('2026-10-20')`)).rejects.toThrow();
    await expect(como(null, 'anon', 'select * from public.minha_carreira()')).rejects.toThrow();
  });
});

describe('zerar da pré-temporada', () => {
  it('apaga partidas e ranking, mas a carreira fica', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 90);
    await timeDoDia(db, a, 50);
    await db.query(`select public.carreira_bonus_dia($1)`, [DIA]);
    expect(await xpDe(db, a)).toBe(120);

    await db.exec(readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8'));

    const { rows } = await db.query<{ n: number }>('select count(*)::integer as n from public.partidas');
    expect(rows[0].n).toBe(0);
    expect(await xpDe(db, a)).toBe(120);
  }, TEMPO);
});

describe('migração sobre a pré-temporada já jogada', () => {
  it('o que já foi jogado entra na carreira, com os bônus de dias que já terminaram', async () => {
    const db = await bancoDeTeste(MIGRACAO);
    const a = await torcedor(db, 'bahia');
    const b = await torcedor(db, 'remo');
    for (let i = 0; i < 6; i++) await partida(db, a, 30);
    await partida(db, b, 20);
    await partida(db, b, 999, { suspeita: true });
    await timeDoDia(db, b, 40);
    const { rows: jogos } = await db.query<{ id: string }>(
      `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values (32, 'bahia', 'remo', now() + interval '1 day') returning id`,
    );
    await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 1, 1)', [b, jogos[0].id]);

    await aplicarMigracao(db, MIGRACAO);
    // A semana de 19/10 só dá bônus depois da segunda seguinte (o Crava confirma até segunda 12h).
    const { rows } = await db.query<{ ok: boolean }>(
      `select $1::date <= public.semana_de(public.hoje_brasilia())
         - case when public.hoje_brasilia() - public.semana_de(public.hoje_brasilia()) >= 1 then 7 else 14 end as ok`,
      [SEMANA],
    );
    const semana = rows[0].ok ? 200 : 0;
    // a: 6 partidas (55) + 1º do dia 20/10 (100) + 1º do Bahia na semana. b: 2 partidas + 1 rodada + 1º do Remo.
    expect(await xpDe(db, a)).toBe(155 + semana);
    expect(await xpDe(db, b)).toBe(30 + semana);
  }, TEMPO);
});
