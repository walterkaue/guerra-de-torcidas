// Fechamento da semana gravado (20261031300000): provisória na segunda 00h05, travada às 12h, Crava de
// domingo, pontos_apagados, bônus da Carreira, desempate, permissões e zerar. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const SEMANA = '2026-10-19'; // segunda
const VIRADA = '2026-10-26T00:05:00-03:00';
const ANTES_DAS_12 = '2026-10-26T11:59:00-03:00';
const AS_12 = '2026-10-26T12:00:00-03:00';
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
async function partida(db: PGlite, quem: string, pontos: number, o: { dia?: string; semana?: string; suspeita?: boolean } = {}) {
  const dia = o.dia ?? '2026-10-20';
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes')
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id, quem, rows[0].time_id, '{}', '{}', pontos, dia, o.semana ?? SEMANA, `${dia}T12:00:00-03:00`,
    o.suspeita ? 'teste' : null, null, null,
  ]);
  return rows[0].id;
}

/** Palpite num jogo novo de domingo, e o placar confirmado dando `pontos` para a semana pedida. */
async function crava(db: PGlite, quem: string, pontos: number, semana: string, rodada = 33) {
  const jogo = uuid();
  await db.query(
    `insert into public.jogos (id, rodada, inicio, mandante_id, visitante_id) values ($1, $2, $3, 'bahia', 'vitoria')`,
    [jogo, rodada, `${semana}T00:00:00Z`],
  );
  await db.query(
    `insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante, time_id)
     values ($1, $2, 1, 0, (select time_id from public.torcedores where id = $1))`,
    [quem, jogo],
  );
  await db.query('select public.aplicar_pontos_crava($1, $2)', [
    rodada,
    JSON.stringify([{ torcedorId: quem, jogoId: jogo, pontos, semana }]),
  ]);
}

interface Linha {
  time_id: string;
  ativos: number;
  soma: number;
  media30: string;
  posicao_campeao: number;
  confirmada_em: string | null;
}

async function fechamento(db: PGlite, semana = SEMANA): Promise<Record<string, Linha>> {
  const { rows } = await db.query<Linha>('select * from public.fechamento_semana where semana = $1', [semana]);
  return Object.fromEntries(rows.map((r) => [r.time_id, r]));
}

const fechar = (db: PGlite, agora: string) => db.query('select public.fechar_semanas($1)', [agora]);
const bonus = async (db: PGlite, quem: string) =>
  (await db.query(`select 1 from public.carreira_bonus where tipo = 'semana' and torcedor_id = $1`, [quem])).rows.length;

describe('segunda-feira da virada', () => {
  let db: PGlite;
  let a: string;
  let b: string;

  beforeAll(async () => {
    db = await bancoDeTeste();
    a = await torcedor(db, 'bahia');
    b = await torcedor(db, 'remo');
    await partida(db, a, 100);
    await partida(db, b, 60);
  }, TEMPO);

  it('00h05: grava os 20 times como provisória', async () => {
    await fechar(db, VIRADA);
    const linhas = await fechamento(db);
    expect(Object.keys(linhas)).toHaveLength(20);
    expect(linhas.outro).toBeUndefined();
    expect(linhas.bahia.soma).toBe(100);
    expect(linhas.bahia.posicao_campeao).toBe(1);
    expect(linhas.remo.posicao_campeao).toBe(2);
    expect(Object.values(linhas).every((l) => l.confirmada_em === null)).toBe(true);
  });

  it('o bônus da Carreira ainda não saiu: o Crava pode mudar o 1º da torcida', async () => {
    expect(await bonus(db, a)).toBe(0);
  });

  it('jogo de domingo confirmado antes das 12h entra na semana e vira a classificação', async () => {
    await crava(db, b, 200, SEMANA);
    await fechar(db, ANTES_DAS_12);
    const linhas = await fechamento(db);
    expect(linhas.remo.soma).toBe(260);
    expect(linhas.remo.posicao_campeao).toBe(1);
    expect(linhas.remo.confirmada_em).toBeNull();
  });

  it('12h: trava e paga o bônus de 1º da torcida', async () => {
    await fechar(db, AS_12);
    const linhas = await fechamento(db);
    expect(linhas.remo.soma).toBe(260);
    expect(Object.values(linhas).every((l) => l.confirmada_em !== null)).toBe(true);
    expect(await bonus(db, a)).toBe(1);
    expect(await bonus(db, b)).toBe(1);
  });

  it('semana travada não muda mais: nem o fechamento, nem o ranking que a tela lê', async () => {
    const antes = await fechamento(db);
    // No jogo isso não acontece: partida e Time do Dia só valem na semana antiga até 00h05. Aqui é o
    // pior caso, para provar a trava.
    await partida(db, a, 500, { dia: '2026-10-25' });
    await db.query('select public.recalcular_ranking($1)', [SEMANA]);
    await db.query('select public.fechar_semana($1, $2)', [SEMANA, '2026-10-27T12:00:00-03:00']);
    expect(await fechamento(db)).toEqual(antes);
    const { rows } = await db.query<{ soma: number }>(`select soma from public.ranking_semana where semana = $1 and time_id = 'bahia'`, [SEMANA]);
    expect(rows[0].soma).toBe(100);
  });

  it('ponto que chega depois de travar vai para a semana atual, não some', async () => {
    await crava(db, a, 40, SEMANA, 34);
    const { rows } = await db.query<{ semana: string; atual: string }>(
      `select c.semana::text, public.semana_de(public.hoje_brasilia())::text as atual
       from public.crava_pontos c where c.rodada = 34`,
    );
    expect(rows[0].semana).toBe(rows[0].atual);
    expect((await fechamento(db)).bahia.soma).toBe(100);
    const { rows: atual } = await db.query<{ soma: number }>(
      `select soma from public.ranking_semana where semana = $1 and time_id = 'bahia'`,
      [rows[0].atual],
    );
    expect(atual[0].soma).toBe(40);
  });
});

describe('o que entra na conta', () => {
  it('pontos_apagados contam como no ranking', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 50);
    await db.query(`insert into public.pontos_apagados (semana, time_id, total) values ($1, 'bahia', 70)`, [SEMANA]);
    await fechar(db, VIRADA);
    const { bahia } = await fechamento(db);
    expect(bahia.soma).toBe(120);
    expect(bahia.ativos).toBe(2);
  }, TEMPO);

  it('quem apagou os dados soma para a torcida, e o bônus fica com o 1º entre quem continua no jogo', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 60);
    await db.query(`insert into public.pontos_apagados (semana, time_id, total) values ($1, 'bahia', 100)`, [SEMANA]);
    await fechar(db, VIRADA);
    await fechar(db, AS_12);
    expect((await fechamento(db)).bahia.soma).toBe(160);
    expect(await bonus(db, a)).toBe(1);
  }, TEMPO);

  it('partida sob suspeita fica fora; liberada depois de travar continua fora do fechamento', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 30);
    await partida(db, a, 900, { suspeita: true });
    await fechar(db, AS_12);
    await db.query(`update public.partidas set sob_suspeita = false where pontos = 900`);
    await db.query('select public.atualizar_teto($1, $2)', [a, '2026-10-20']);
    await db.query('select public.recalcular_ranking($1)', [SEMANA]);
    expect((await fechamento(db)).bahia.soma).toBe(30);
  }, TEMPO);
});

describe('desempate entre torcidas sem ninguém', () => {
  it('sai pela posição da semana anterior; na primeira, pela ordem da tabela', async () => {
    const db = await bancoDeTeste();
    // 1ª semana: só o Vitória joga. Os outros 19 ficam na ordem da tabela, e o Athletico-PR é o 2º.
    await partida(db, await torcedor(db, 'vitoria'), 80);
    await fechar(db, AS_12);
    const primeira = await fechamento(db);
    expect(primeira.vitoria.posicao_campeao).toBe(1);
    expect(primeira['athletico-pr'].posicao_campeao).toBe(2);
    expect(primeira.vasco.posicao_campeao).toBe(20);

    // 2ª semana: ninguém joga. Quem estava na frente segue na frente.
    await fechar(db, '2026-11-02T00:05:00-03:00');
    await fechar(db, '2026-11-02T12:00:00-03:00');
    const segunda = await fechamento(db, '2026-10-26');
    expect(Object.keys(segunda)).toHaveLength(20);
    expect(segunda.vitoria.ativos).toBe(0);
    expect(segunda.vitoria.posicao_campeao).toBe(1);
    expect(segunda['athletico-pr'].posicao_campeao).toBe(2);
  }, TEMPO);
});

describe('cron', () => {
  it('semana em andamento não fecha', async () => {
    const db = await bancoDeTeste();
    await partida(db, await torcedor(db, 'bahia'), 50);
    await db.query('select public.fechar_semana($1, $2)', [SEMANA, '2026-10-25T23:59:00-03:00']);
    expect(await fechamento(db)).toEqual({});
  }, TEMPO);

  it('cron perdido: a próxima rodada fecha as semanas que ficaram para trás, da mais velha para a mais nova', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 50);
    await partida(db, a, 70, { dia: '2026-10-28', semana: '2026-10-26' });
    await fechar(db, '2026-11-03T00:15:00-03:00');
    expect((await fechamento(db)).bahia.soma).toBe(50);
    expect((await fechamento(db, '2026-10-26')).bahia.soma).toBe(70);
    expect((await fechamento(db, '2026-10-26')).bahia.confirmada_em).not.toBeNull();
  }, TEMPO);

  it('carreira_fechar é a rede de segurança: trava a semana perdida e paga o bônus', async () => {
    const db = await bancoDeTeste();
    const a = await torcedor(db, 'bahia');
    await partida(db, a, 50);
    await db.query('select public.carreira_fechar()');
    expect((await fechamento(db)).bahia.confirmada_em).not.toBeNull();
    expect(await bonus(db, a)).toBe(1);
  }, TEMPO);
});

describe('permissões', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
    await partida(db, await torcedor(db, 'bahia'), 50);
    await fechar(db, AS_12);
  }, TEMPO);

  async function como<T>(papel: 'authenticated' | 'anon', sql: string): Promise<T[]> {
    await db.exec(`set role ${papel}`);
    try {
      return (await db.query<T>(sql)).rows;
    } finally {
      await db.exec('reset role');
    }
  }

  it('todo mundo lê: só tem torcidas', async () => {
    expect(await como('anon', 'select * from public.fechamento_semana')).toHaveLength(20);
    const { rows } = await db.query<{ c: string }>(
      `select column_name as c from information_schema.columns where table_schema = 'public' and table_name = 'fechamento_semana'`,
    );
    expect(rows.map((r) => r.c).filter((c) => /torcedor|apelido/.test(c))).toEqual([]);
  });

  it('o celular não grava nem fecha semana', async () => {
    await expect(como('authenticated', `update public.fechamento_semana set soma = 999`)).rejects.toThrow();
    await expect(como('authenticated', `delete from public.fechamento_semana`)).rejects.toThrow();
    await expect(como('authenticated', `select public.fechar_semana('${SEMANA}')`)).rejects.toThrow();
    await expect(como('authenticated', `select public.fechar_semanas()`)).rejects.toThrow();
    await expect(como('anon', `select public.semana_travada('${SEMANA}')`)).rejects.toThrow();
  });
});

describe('zerar da pré-temporada', () => {
  it('leva o fechamento junto', async () => {
    const db = await bancoDeTeste();
    await partida(db, await torcedor(db, 'bahia'), 50);
    await fechar(db, AS_12);
    await db.exec(readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8'));
    expect(await fechamento(db)).toEqual({});
  }, TEMPO);
});
