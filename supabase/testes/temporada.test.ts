// Temporada das torcidas (20261101000000): pontos por posição, classificação do mês, desempate, fechamento,
// sobe e cai, estreia depois do zerar, permissões. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;

const NOVEMBRO = '2026-11-01';
const DEZEMBRO = '2026-12-01';
const JANEIRO = '2027-01-01';
const SEMANAS_NOVEMBRO = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
const SEMANAS_DEZEMBRO = ['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'];
const SEMANAS_JANEIRO = ['2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25'];

/** Segunda 12h em que a semana trava. */
const trava = (semana: string) => {
  const d = new Date(`${semana}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
};

interface Classificacao {
  time_id: string;
  serie: string;
  posicao: number;
  pontos: number;
  vitorias: number;
  ultima_posicao: number | null;
}

async function times(db: PGlite): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>('select id from public.times where oficial order by id');
  return rows.map((r) => r.id);
}

/** Grava uma semana travada com a ordem pedida; os times que faltam vêm depois, sem ninguém jogando. */
async function semana(db: PGlite, data: string, ordem: string[], o: { provisoria?: boolean } = {}) {
  const resto = (await times(db)).filter((t) => !ordem.includes(t));
  const linhas = [...ordem.map((t) => [t, 3]), ...resto.map((t) => [t, 0])] as [string, number][];
  for (const [i, [time, ativos]] of linhas.entries()) {
    await db.query(
      `insert into public.fechamento_semana
         (semana, time_id, ativos, soma, media30, posicao_campeao, posicao_soma, gravado_em, confirmada_em)
       values ($1, $2, $3, 0, 0, $4, $4, now(), $5)
       on conflict (semana, time_id) do update set
         ativos = excluded.ativos, posicao_campeao = excluded.posicao_campeao, confirmada_em = excluded.confirmada_em`,
      [data, time, ativos, i + 1, o.provisoria ? null : trava(data)],
    );
  }
}

async function classificacao(db: PGlite, mes: string): Promise<Record<string, Classificacao>> {
  const { rows } = await db.query<Classificacao>('select * from public.classificacao_temporada where mes = $1', [mes]);
  return Object.fromEntries(rows.map((r) => [r.time_id, r]));
}

async function series(db: PGlite, mes: string) {
  const { rows } = await db.query<{ time_id: string; serie: string; posicao_final: number | null; destino: string | null }>(
    'select time_id, serie, posicao_final, destino from public.temporada_serie where mes = $1',
    [mes],
  );
  return Object.fromEntries(rows.map((r) => [r.time_id, r]));
}

async function temporada(db: PGlite, mes: string) {
  const { rows } = await db.query<{ pre_temporada: boolean; fechada_em: string | null; campeao_estreia_id: string | null }>(
    'select pre_temporada, fechada_em, campeao_estreia_id from public.temporada where mes = $1',
    [mes],
  );
  return rows[0];
}

const fechar = (db: PGlite, agora: string) => db.query('select public.fechar_temporadas($1)', [agora]);

describe('pontos por posição', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  const tabela = async (serie: string, posicoes: number) => {
    const { rows } = await db.query<{ p: number }>(
      'select public.pontos_campeonato($1, n) as p from generate_series(1, $2::integer) n order by n',
      [serie, posicoes],
    );
    return rows.map((r) => r.p);
  };

  it('série única: tabela de 20 posições', async () => {
    expect(await tabela('unica', 20)).toEqual([25, 20, 17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]);
  });

  it('divisões: 25, 18… 1', async () => {
    expect(await tabela('a', 10)).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
    expect(await tabela('b', 10)).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
  });
});

describe('novembro em série única', () => {
  let db: PGlite;
  let todos: string[];

  beforeAll(async () => {
    db = await bancoDeTeste();
    todos = await times(db);
  }, TEMPO);

  it('a migração abre novembro com os 20 times, como teste da pré-temporada', async () => {
    expect((await temporada(db, NOVEMBRO)).pre_temporada).toBe(true);
    const linhas = await series(db, NOVEMBRO);
    expect(Object.keys(linhas)).toHaveLength(20);
    expect(linhas.outro).toBeUndefined();
    expect(Object.values(linhas).every((l) => l.serie === 'unica')).toBe(true);
  });

  it('semana provisória não conta', async () => {
    await semana(db, SEMANAS_NOVEMBRO[0], ['remo', 'bahia'], { provisoria: true });
    const c = await classificacao(db, NOVEMBRO);
    expect(c.remo.pontos).toBe(0);
    expect(c.remo.ultima_posicao).toBeNull();
  });

  it('semana travada soma pela tabela de 20 posições, e quem não jogou fica com 0', async () => {
    const ordem = todos.slice(0, 12);
    await semana(db, SEMANAS_NOVEMBRO[0], ordem);
    const c = await classificacao(db, NOVEMBRO);
    expect(c[ordem[0]].pontos).toBe(25);
    expect(c[ordem[0]].vitorias).toBe(1);
    expect(c[ordem[1]].pontos).toBe(20);
    expect(c[ordem[11]].pontos).toBe(7);
    // 13º da semana pela ordem da tabela, sem ninguém jogando: valeria 6.
    expect(c[todos[12]].pontos).toBe(0);
    expect(c[todos[12]].ultima_posicao).toBe(13);
  });

  it('semana de outro mês não entra: 26/10 é de outubro', async () => {
    await semana(db, '2026-10-26', [todos[19]]);
    expect((await classificacao(db, NOVEMBRO))[todos[19]].pontos).toBe(0);
  });

  it('não fecha enquanto a última semana não travar', async () => {
    for (const s of SEMANAS_NOVEMBRO.slice(1, 4)) await semana(db, s, todos.slice(0, 12));
    await semana(db, SEMANAS_NOVEMBRO[4], todos.slice(0, 12), { provisoria: true });
    await fechar(db, trava(SEMANAS_NOVEMBRO[3]));
    await fechar(db, '2026-12-07T00:05:00-03:00');
    expect((await temporada(db, NOVEMBRO)).fechada_em).toBeNull();
    expect(await temporada(db, DEZEMBRO)).toBeUndefined();
  });

  it('07/12 às 12h: fecha, os 10 primeiros vão para a Série A e dezembro abre', async () => {
    const ordem = todos.slice(0, 12);
    await semana(db, SEMANAS_NOVEMBRO[4], ordem);
    await fechar(db, '2026-12-07T12:01:00-03:00');

    expect((await temporada(db, NOVEMBRO)).fechada_em).not.toBeNull();
    const fim = await series(db, NOVEMBRO);
    expect(fim[ordem[0]].posicao_final).toBe(1);
    expect(fim[ordem[9]].destino).toBe('a');
    expect(fim[ordem[10]].destino).toBe('b');

    const dezembro = await series(db, DEZEMBRO);
    const contar = (s: string) => Object.values(dezembro).filter((l) => l.serie === s).length;
    expect(contar('a')).toBe(10);
    expect(contar('b')).toBe(10);
    expect(dezembro[ordem[9]].serie).toBe('a');
    expect(dezembro[ordem[10]].serie).toBe('b');
    expect(dezembro[ordem[0]].posicao_final).toBeNull();
  });

  it('o teste não dá Campeão da estreia, e dezembro herda a pré-temporada', async () => {
    expect((await temporada(db, NOVEMBRO)).campeao_estreia_id).toBeNull();
    expect((await temporada(db, DEZEMBRO)).pre_temporada).toBe(true);
  });

  it('rodar de novo não muda nada', async () => {
    const antes = await series(db, NOVEMBRO);
    const fechada = (await temporada(db, NOVEMBRO)).fechada_em;
    await fechar(db, '2026-12-08T12:01:00-03:00');
    expect(await series(db, NOVEMBRO)).toEqual(antes);
    expect((await temporada(db, NOVEMBRO)).fechada_em).toEqual(fechada);
    expect((await db.query('select 1 from public.temporada')).rows).toHaveLength(2);
  });

  it('dezembro: posição dentro da divisão, 2 caem e 2 sobem, e 04/01 abre janeiro', async () => {
    const dezembro = await series(db, DEZEMBRO);
    const a = todos.filter((t) => dezembro[t].serie === 'a');
    const b = todos.filter((t) => dezembro[t].serie === 'b');
    // Na semana geral, A e B intercaladas: o 2º geral é o 1º da B.
    const ordem = a.flatMap((t, i) => [t, b[i]]);
    // Na 1ª semana, os 3 últimos da B ficam sem ninguém: seguem em 8º, 9º e 10º da série, mas sem ponto.
    await semana(db, SEMANAS_DEZEMBRO[0], ordem.filter((t) => !b.slice(7).includes(t)));
    for (const s of SEMANAS_DEZEMBRO.slice(1)) await semana(db, s, ordem);

    const c = await classificacao(db, DEZEMBRO);
    expect(c[a[0]].pontos).toBe(100);
    expect(c[a[0]].vitorias).toBe(4);
    expect(c[b[0]].pontos).toBe(100);
    expect(c[b[0]].vitorias).toBe(4);
    expect(c[a[1]].pontos).toBe(72);
    expect(c[b[7]].pontos).toBe(12);
    expect(c[b[9]].pontos).toBe(3);
    expect(c[b[9]].posicao).toBe(10);

    // Semana de dezembro não entra em novembro: 5 vitórias, nada além.
    expect((await classificacao(db, NOVEMBRO))[a[0]].pontos).toBe(125);

    await fechar(db, '2027-01-04T12:01:00-03:00');
    const janeiro = await series(db, JANEIRO);
    expect(a.slice(0, 8).every((t) => janeiro[t].serie === 'a')).toBe(true);
    expect(janeiro[a[8]].serie).toBe('b');
    expect(janeiro[a[9]].serie).toBe('b');
    expect(janeiro[b[0]].serie).toBe('a');
    expect(janeiro[b[1]].serie).toBe('a');
    expect(b.slice(2).every((t) => janeiro[t].serie === 'b')).toBe(true);
    expect((await temporada(db, JANEIRO)).pre_temporada).toBe(true);
  });
});

describe('desempate no fim do mês', () => {
  let db: PGlite;
  let w: string;
  let v: string;
  let resto: string[];

  beforeAll(async () => {
    db = await bancoDeTeste();
    // w vem antes de v na ordem da tabela: se v ficar na frente, foi pelo desempate.
    [w, v, ...resto] = await times(db);
  }, TEMPO);

  it('mais vitórias de semana', async () => {
    await semana(db, SEMANAS_NOVEMBRO[0], [v, resto[0], resto[1], w]);
    await semana(db, SEMANAS_NOVEMBRO[1], [v, ...resto.slice(0, 7), w]);
    await semana(db, SEMANAS_NOVEMBRO[2], [w]);
    const c = await classificacao(db, NOVEMBRO);
    // v: 25 + 25 + 0, 2 vitórias. w: 15 + 10 + 25, 1 vitória.
    expect(c[v].pontos).toBe(50);
    expect(c[w].pontos).toBe(50);
    expect(c[v].vitorias).toBe(2);
    expect(c[w].vitorias).toBe(1);
    expect(c[v].posicao).toBeLessThan(c[w].posicao);
    await db.query('delete from public.fechamento_semana');
  });

  it('depois, a melhor última semana', async () => {
    await semana(db, SEMANAS_NOVEMBRO[0], [v, w]);
    await semana(db, SEMANAS_NOVEMBRO[1], [w, resto[0], resto[1], v]);
    await semana(db, SEMANAS_NOVEMBRO[2], [resto[0], v, resto[1], w]);
    const c = await classificacao(db, NOVEMBRO);
    // v: 25 + 15 + 20. w: 20 + 25 + 15. Uma vitória para cada.
    expect(c[v].pontos).toBe(60);
    expect(c[w].pontos).toBe(60);
    expect(c[v].vitorias).toBe(c[w].vitorias);
    expect(c[v].ultima_posicao).toBe(2);
    expect(c[v].posicao).toBeLessThan(c[w].posicao);
    await db.query('delete from public.fechamento_semana');
  });

  it('semana sem ninguém não dá ponto nem vitória a quem ficou em 1º pela semana anterior', async () => {
    await semana(db, SEMANAS_NOVEMBRO[0], []);
    const c = await classificacao(db, NOVEMBRO);
    expect(c[w].ultima_posicao).toBe(1);
    expect(c[w].vitorias).toBe(0);
    expect(c[w].pontos).toBe(0);
  });
});

describe('caminho de verdade', () => {
  it('fechar_semanas trava e a classificação lê a posição da torcida', async () => {
    const db = await bancoDeTeste();
    const id = '00000000-0000-4000-8000-000000000001';
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await db.query(`insert into public.torcedores (id, time_id) values ($1, 'remo')`, [id]);
    const { rows } = await db.query<{ id: string }>(
      `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
       values ($1, 'normal', 1, 0.5, now() + interval '15 minutes') returning id`,
      [id],
    );
    await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
      rows[0].id, id, 'remo', '{}', '{}', 80, '2026-11-03', SEMANAS_NOVEMBRO[0], '2026-11-03T12:00:00-03:00', null, null, null,
    ]);

    await db.query('select public.fechar_semanas($1)', ['2026-11-09T00:05:00-03:00']);
    expect((await classificacao(db, NOVEMBRO)).remo.pontos).toBe(0);

    await db.query('select public.fechar_semanas($1)', ['2026-11-09T12:00:00-03:00']);
    await fechar(db, '2026-11-09T12:01:00-03:00');
    const c = await classificacao(db, NOVEMBRO);
    expect(c.remo.pontos).toBe(25);
    expect(c.remo.posicao).toBe(1);
    expect(c.bahia.pontos).toBe(0);
    expect((await temporada(db, NOVEMBRO)).fechada_em).toBeNull();

    // Crons perdidos até 08/12: a rede de segurança das 00h15 trava 30/11, e 12h01 fecha o mês mesmo
    // com as semanas sem ninguém que ficaram para trás.
    await db.query('select public.fechar_semanas($1)', ['2026-12-08T00:15:00-03:00']);
    await fechar(db, '2026-12-08T12:01:00-03:00');
    expect((await temporada(db, NOVEMBRO)).fechada_em).not.toBeNull();
    expect((await series(db, NOVEMBRO)).remo.posicao_final).toBe(1);
    expect((await series(db, DEZEMBRO)).remo.serie).toBe('a');
  }, TEMPO);

  it('última semana sem linha e mais de uma semana de crons perdidos: o mês fecha assim mesmo', async () => {
    const db = await bancoDeTeste();
    await semana(db, SEMANAS_NOVEMBRO[3], ['remo']);
    await db.query('select public.fechar_semanas($1)', ['2026-12-14T12:00:00-03:00']);
    expect((await db.query(`select 1 from public.fechamento_semana where semana = $1`, [SEMANAS_NOVEMBRO[4]])).rows).toEqual([]);
    await fechar(db, '2026-12-14T12:01:00-03:00');
    expect((await temporada(db, NOVEMBRO)).fechada_em).not.toBeNull();
    expect((await series(db, NOVEMBRO)).remo.posicao_final).toBe(1);
  }, TEMPO);

});

describe('zerar da pré-temporada', () => {
  const zerar = (db: PGlite) =>
    db.exec(readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8'));
  const estreia = async (db: PGlite, agora: string) => {
    await db.query('delete from public.temporada');
    await db.query('select public.abrir_estreia($1)', [agora]);
    return (await db.query<{ mes: string }>('select mes::text from public.temporada')).rows.map((r) => r.mes);
  };

  it('leva as temporadas de teste e abre a estreia na mesma hora, com os 20 times', async () => {
    const db = await bancoDeTeste();
    await semana(db, SEMANAS_NOVEMBRO[4], ['bahia']);
    await fechar(db, '2026-12-07T12:01:00-03:00');
    await zerar(db);
    const { rows } = await db.query<{ mes: string; pre_temporada: boolean; series: string[] }>(
      `select t.mes::text, t.pre_temporada, array_agg(distinct s.serie) as series
       from public.temporada t join public.temporada_serie s on s.mes = t.mes group by t.mes, t.pre_temporada`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].pre_temporada).toBe(false);
    expect(rows[0].series).toEqual(['unica']);
    expect((await series(db, rows[0].mes)).bahia.posicao_final).toBeNull();
  }, TEMPO);

  it('a estreia sai do dia do zerar: o mês seguinte ao da semana, que começa inteiro', async () => {
    const db = await bancoDeTeste();
    expect(await estreia(db, '2026-12-16T15:00:00-03:00')).toEqual([JANEIRO]);
    // Domingo 06/12: a semana ainda é de 30/11, de novembro. Dezembro está inteiro.
    expect(await estreia(db, '2026-12-06T20:00:00-03:00')).toEqual([DEZEMBRO]);
    // Segunda 07/12: a primeira semana de dezembro já começou.
    expect(await estreia(db, '2026-12-07T00:30:00-03:00')).toEqual([JANEIRO]);
  }, TEMPO);

  it('a estreia de verdade dá o troféu e divide em A e B no mês seguinte', async () => {
    const db = await bancoDeTeste();
    await db.query('delete from public.temporada');
    await db.query('select public.abrir_estreia($1)', ['2026-12-16T15:00:00-03:00']);
    for (const s of SEMANAS_JANEIRO) await semana(db, s, ['remo', 'bahia']);
    await fechar(db, '2027-02-01T12:01:00-03:00');
    expect((await temporada(db, JANEIRO)).campeao_estreia_id).toBe('remo');
    const fevereiro = await series(db, '2027-02-01');
    expect(fevereiro.remo.serie).toBe('a');
    expect(Object.values(fevereiro).filter((l) => l.serie === 'b')).toHaveLength(10);
    expect((await temporada(db, '2027-02-01')).pre_temporada).toBe(false);
  }, TEMPO);
});

describe('permissões', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
    await semana(db, SEMANAS_NOVEMBRO[0], ['bahia']);
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
    expect(await como('anon', 'select * from public.temporada')).toHaveLength(1);
    expect(await como('anon', 'select * from public.temporada_serie')).toHaveLength(20);
    const c = await como<Classificacao>('anon', `select * from public.classificacao_temporada where time_id = 'bahia'`);
    expect(c[0].pontos).toBe(25);
    const { rows } = await db.query<{ c: string }>(
      `select column_name as c from information_schema.columns
       where table_schema = 'public' and table_name in ('temporada', 'temporada_serie', 'classificacao_temporada')`,
    );
    expect(rows.map((r) => r.c).filter((c) => /torcedor|apelido/.test(c))).toEqual([]);
  });

  it('RLS ligada, com política de leitura', async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relname in ('temporada', 'temporada_serie') order by 1`,
    );
    expect(rows.map((r) => r.relrowsecurity)).toEqual([true, true]);
  });

  it('o celular não grava nem fecha temporada', async () => {
    await expect(como('authenticated', `update public.temporada set pre_temporada = false`)).rejects.toThrow();
    await expect(como('authenticated', `update public.temporada_serie set serie = 'a'`)).rejects.toThrow();
    await expect(como('authenticated', `delete from public.temporada`)).rejects.toThrow();
    await expect(como('authenticated', `select public.fechar_temporada('${NOVEMBRO}')`)).rejects.toThrow();
    await expect(como('authenticated', `select public.fechar_temporadas()`)).rejects.toThrow();
    await expect(como('anon', `select public.abrir_serie_unica('2027-05-01', false)`)).rejects.toThrow();
    await expect(como('anon', `select public.abrir_estreia()`)).rejects.toThrow();
  });
});
