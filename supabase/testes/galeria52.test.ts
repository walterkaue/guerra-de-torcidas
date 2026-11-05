// Ranking das 52 semanas e Galeria de Troféus/Cidades (20261106000000_galeria_52_semanas): funções de leitura.
// Escrito a partir da regra (docs/jogo.md, seção 5), não do SQL. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
const PONTOS = [25, 20, 17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];

let db: PGlite;
let todos: string[];

/** Segunda 12h em que a semana trava. */
const trava = (semana: string) => {
  const d = new Date(`${semana}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
};

/** A segunda-feira `n` semanas depois de `base`. */
const somarSemanas = (base: string, n: number) => {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return d.toISOString().slice(0, 10);
};

/** Ordem de 20 times com alguns fixados em posições (1 a 20); os outros preenchem os buracos em ordem de id. */
function ordemCom(fixos: Record<number, string>): string[] {
  const usados = new Set(Object.values(fixos));
  const livres = todos.filter((t) => !usados.has(t));
  return Array.from({ length: 20 }, (_, i) => fixos[i + 1] ?? livres.shift()!);
}

interface OpcoesSemana {
  provisoria?: boolean;
  /** Times com ativos = 0 (o resto da `ordem` tem 3). */
  semAtivos?: string[];
  /** Soma por time (padrão 0). */
  soma?: Record<string, number>;
  /** Ordem do ranking por soma; padrão = a própria `ordem`. */
  ordemSoma?: string[];
}

/**
 * Grava uma semana inteira (os 20 times). `ordem` é a posição geral (posicao_campeao), do 1º ao último;
 * quem não está nela vem depois, sem ninguém jogando.
 */
async function semana(data: string, ordem: string[], o: OpcoesSemana = {}) {
  const resto = todos.filter((t) => !ordem.includes(t));
  const completa = [...ordem, ...resto];
  const ordemSoma = o.ordemSoma ? [...o.ordemSoma, ...completa.filter((t) => !o.ordemSoma!.includes(t))] : completa;
  for (const [i, time] of completa.entries()) {
    const ativos = ordem.includes(time) && !o.semAtivos?.includes(time) ? 3 : 0;
    await db.query(
      `insert into public.fechamento_semana
         (semana, time_id, ativos, soma, media30, posicao_campeao, posicao_soma, gravado_em, confirmada_em)
       values ($1, $2, $3, $4, 0, $5, $6, now(), $7)`,
      [data, time, ativos, o.soma?.[time] ?? 0, i + 1, ordemSoma.indexOf(time) + 1, o.provisoria ? null : trava(data)],
    );
  }
}

interface OpcoesMes {
  pre?: boolean;
  fechada?: boolean;
  estreia?: string;
  /** Série de cada time; os que faltam ficam em 'unica'. */
  series?: Record<string, { serie: 'unica' | 'a' | 'b'; posicao_final?: number; destino?: 'a' | 'b' }>;
}

async function mes(data: string, o: OpcoesMes = {}) {
  await db.query(
    'insert into public.temporada (mes, pre_temporada, fechada_em, campeao_estreia_id) values ($1, $2, $3, $4)',
    [data, o.pre ?? false, o.fechada ? `${data}T12:00:00Z` : null, o.estreia ?? null],
  );
  for (const t of todos) {
    const s = o.series?.[t] ?? { serie: 'unica' as const };
    await db.query(
      'insert into public.temporada_serie (mes, time_id, serie, posicao_final, destino) values ($1, $2, $3, $4, $5)',
      [data, t, s.serie, s.posicao_final ?? null, s.destino ?? null],
    );
  }
}

interface Linha52 {
  posicao: number;
  time_id: string;
  pontos: number;
  vitorias: number;
  ultima_posicao: number | null;
  semanas: number;
  desde: string | null;
  ate: string | null;
}

const dia = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : (v as string | null));

async function ranking(): Promise<Linha52[]> {
  const { rows } = await db.query<Linha52>('select * from public.ranking_52_semanas()');
  return rows.map((r) => ({ ...r, desde: dia(r.desde), ate: dia(r.ate) }));
}

interface Trofeu {
  trofeu: string;
  prateleira: string;
  time_id: string;
  semana: string | null;
  mes: string | null;
  serie: string | null;
}

async function trofeus(time?: string): Promise<Trofeu[]> {
  const { rows } = await db.query<Trofeu>('select * from public.galeria_trofeus($1)', [time ?? null]);
  return rows.map((r) => ({ ...r, semana: dia(r.semana), mes: dia(r.mes) }));
}

const so = (l: Trofeu[], trofeu: string) => l.filter((t) => t.trofeu === trofeu);

beforeAll(async () => {
  db = await bancoDeTeste();
  todos = (await db.query<{ id: string }>('select id from public.times where oficial order by id')).rows.map((r) => r.id);
}, TEMPO);

beforeEach(async () => {
  await db.exec(`
    delete from public.fechamento_semana;
    delete from public.ranking_cidade_semana;
    delete from public.temporada;
  `);
});

describe('ranking_52_semanas', () => {
  it('sem semana travada: os 20 times com 0 ponto, em ordem de time_id, sem janela', async () => {
    const r = await ranking();
    expect(r).toHaveLength(20);
    expect(r.map((l) => l.time_id)).toEqual(todos);
    expect(r.map((l) => l.posicao)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const l of r) {
      expect(l.pontos).toBe(0);
      expect(l.vitorias).toBe(0);
      expect(l.semanas).toBe(0);
      expect(l.desde).toBeNull();
      expect(l.ate).toBeNull();
      expect(l.ultima_posicao).toBeNull();
    }
  }, TEMPO);

  it('semana provisória não conta', async () => {
    await semana('2027-01-04', todos, { provisoria: true });
    const r = await ranking();
    expect(r.every((l) => l.pontos === 0 && l.semanas === 0)).toBe(true);
  }, TEMPO);

  it('pontos pela posição geral (1º 25 … 19º e 20º 0), vitória só para o 1º', async () => {
    const ordem = [...todos].reverse();
    await semana('2027-01-04', ordem);
    const r = Object.fromEntries((await ranking()).map((l) => [l.time_id, l]));
    for (const [i, t] of ordem.entries()) {
      expect(r[t].pontos, `posição ${i + 1}`).toBe(PONTOS[i]);
      expect(r[t].vitorias).toBe(i === 0 ? 1 : 0);
      expect(r[t].ultima_posicao).toBe(i + 1);
      expect(r[t].semanas).toBe(1);
      expect(r[t].desde).toBe('2027-01-04');
      expect(r[t].ate).toBe('2027-01-04');
    }
    const lista = await ranking();
    expect(lista[0].time_id).toBe(ordem[0]);
    expect(lista.map((l) => l.pontos)).toEqual(PONTOS);
  }, TEMPO);

  it('soma as semanas travadas e ignora a provisória do meio', async () => {
    await semana('2027-01-04', todos);
    await semana('2027-01-11', todos, { provisoria: true });
    await semana('2027-01-18', todos);
    const l = (await ranking()).find((x) => x.time_id === todos[0])!;
    expect(l.pontos).toBe(50);
    expect(l.vitorias).toBe(2);
    expect(l.semanas).toBe(2);
    expect(l.desde).toBe('2027-01-04');
    expect(l.ate).toBe('2027-01-18');
  }, TEMPO);

  it('semana com ativos = 0 vale 0 ponto e não é vitória, mesmo em 1º; ultima_posicao continua valendo', async () => {
    const [a, b] = todos;
    await semana('2027-01-04', [a, b], { semAtivos: [a] });
    const r = Object.fromEntries((await ranking()).map((l) => [l.time_id, l]));
    expect(r[a].pontos).toBe(0);
    expect(r[a].vitorias).toBe(0);
    expect(r[a].ultima_posicao).toBe(1);
    expect(r[b].pontos).toBe(20);
  }, TEMPO);

  it('janela de 52 semanas: a 53ª mais antiga fica de fora', async () => {
    const [a, b] = todos;
    const datas = Array.from({ length: 53 }, (_, i) => somarSemanas('2027-01-04', i));
    await semana(datas[0], [a, b]); // a é 1º só na mais antiga
    for (const d of datas.slice(1)) await semana(d, [b, a]);
    const r = Object.fromEntries((await ranking()).map((l) => [l.time_id, l]));
    expect(r[a].semanas).toBe(52);
    expect(r[a].desde).toBe(datas[1]);
    expect(r[a].ate).toBe(datas[52]);
    expect(r[a].pontos).toBe(52 * 20);
    expect(r[a].vitorias).toBe(0);
    expect(r[b].pontos).toBe(52 * 25);
    expect(r[b].vitorias).toBe(52);
  }, TEMPO);

  it('com exatamente 52 semanas, todas entram', async () => {
    const datas = Array.from({ length: 52 }, (_, i) => somarSemanas('2027-01-04', i));
    for (const d of datas) await semana(d, todos);
    const l = (await ranking())[0];
    expect(l.semanas).toBe(52);
    expect(l.desde).toBe(datas[0]);
    expect(l.ate).toBe(datas[51]);
    expect(l.pontos).toBe(52 * 25);
  }, TEMPO);

  it('a janela conta semanas travadas, não semanas do calendário (a provisória não ocupa vaga)', async () => {
    const datas = Array.from({ length: 53 }, (_, i) => somarSemanas('2027-01-04', i));
    for (const d of datas.slice(0, 52)) await semana(d, todos);
    await semana(datas[52], todos, { provisoria: true });
    const l = (await ranking())[0];
    expect(l.semanas).toBe(52);
    expect(l.desde).toBe(datas[0]);
    expect(l.ate).toBe(datas[51]);
  }, TEMPO);

  it('empate em pontos: mais vitórias vence, mesmo com pior posição na última semana', async () => {
    const [p, q, r] = todos;
    // p: 1º (25) + 19º (0) = 25, 1 vitória, última 19º. q: 2º (20) + 14º (5) = 25, 0 vitória, última 14º.
    await semana('2027-01-04', ordemCom({ 1: p, 2: q }));
    await semana('2027-01-11', ordemCom({ 1: r, 14: q, 19: p }));
    const lista = await ranking();
    const lp = lista.find((l) => l.time_id === p)!;
    const lq = lista.find((l) => l.time_id === q)!;
    expect(lp.pontos).toBe(25);
    expect(lq.pontos).toBe(25);
    expect(lp.vitorias).toBe(1);
    expect(lq.vitorias).toBe(0);
    expect(lq.ultima_posicao).toBe(14);
    expect(lp.ultima_posicao).toBe(19);
    expect(lp.posicao).toBeLessThan(lq.posicao);
  }, TEMPO);

  it('empate em pontos e vitórias: melhor posição na última semana da janela', async () => {
    const [x, y] = todos;
    await semana('2027-01-04', ordemCom({ 1: x, 2: y }));
    await semana('2027-01-11', ordemCom({ 1: y, 2: x }));
    const lista = await ranking();
    const lx = lista.find((l) => l.time_id === x)!;
    const ly = lista.find((l) => l.time_id === y)!;
    expect([lx.pontos, ly.pontos]).toEqual([45, 45]);
    expect([lx.vitorias, ly.vitorias]).toEqual([1, 1]);
    expect(ly.ultima_posicao).toBe(1);
    expect(lx.ultima_posicao).toBe(2);
    expect(ly.posicao).toBe(1);
    expect(lx.posicao).toBe(2);
  }, TEMPO);

  it('ultima_posicao é a da semana mais recente da janela, não a da inserida por último', async () => {
    const [x, y] = todos;
    await semana('2027-01-11', ordemCom({ 1: y, 2: x })); // mais recente, gravada primeiro
    await semana('2027-01-04', ordemCom({ 1: x, 2: y }));
    const lista = await ranking();
    expect(lista.find((l) => l.time_id === x)!.ultima_posicao).toBe(2);
    expect(lista.find((l) => l.time_id === y)!.ultima_posicao).toBe(1);
  }, TEMPO);

  it('todos sem ativos: 0 ponto para todos, e a ordem segue a posição da última semana', async () => {
    // Todos com ativos = 0 em uma semana travada: 0 ponto, 0 vitória; ultima_posicao difere, então empata
    // de verdade só quando a posição é a mesma. Aqui as posições são distintas: a ordem segue ultima_posicao.
    const ordem = [...todos].reverse();
    await semana('2027-01-04', ordem, { semAtivos: ordem });
    const lista = await ranking();
    expect(lista.every((l) => l.pontos === 0 && l.vitorias === 0)).toBe(true);
    expect(lista.map((l) => l.time_id)).toEqual(ordem);
    expect(lista.map((l) => l.ultima_posicao)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  }, TEMPO);

  it('não depende de pré-temporada: conta qualquer semana travada', async () => {
    await mes('2026-11-01', { pre: true });
    await semana('2026-11-02', todos);
    expect((await ranking())[0].pontos).toBe(25);
  }, TEMPO);
});

describe('galeria_trofeus: campeão da semana', () => {
  it('mês em série única: o 1º geral, serie unica, só semana preenchida', async () => {
    await mes('2027-03-01');
    await semana('2027-03-08', todos);
    const l = await trofeus();
    expect(l).toEqual([
      { trofeu: 'campeao_semana', prateleira: 'trofeus', time_id: todos[0], semana: '2027-03-08', mes: null, serie: 'unica' },
    ]);
  }, TEMPO);

  it('sem linha de temporada para o mês: vale o 1º geral, serie unica', async () => {
    await semana('2027-03-08', todos);
    const c = so(await trofeus(), 'campeao_semana');
    expect(c).toHaveLength(1);
    expect(c[0].time_id).toBe(todos[0]);
    expect(c[0].serie).toBe('unica');
  }, TEMPO);

  it('mês com A e B: um campeão por série, o mais bem colocado no geral dentro dela', async () => {
    const a = todos.slice(0, 10);
    const b = todos.slice(10);
    const series = Object.fromEntries([
      ...a.map((t) => [t, { serie: 'a' as const }]),
      ...b.map((t) => [t, { serie: 'b' as const }]),
    ]);
    await mes('2027-02-01', { series });
    // Geral: b[3] em 1º, a[5] em 2º, depois o resto. O campeão da B é b[3], o da A é a[5].
    await semana('2027-02-08', ordemCom({ 1: b[3], 2: a[5] }));
    const c = so(await trofeus(), 'campeao_semana').sort((x, y) => (x.serie ?? '').localeCompare(y.serie ?? ''));
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ serie: 'a', time_id: a[5], semana: '2027-02-08', mes: null, prateleira: 'trofeus' });
    expect(c[1]).toMatchObject({ serie: 'b', time_id: b[3], semana: '2027-02-08', mes: null, prateleira: 'trofeus' });
  }, TEMPO);

  it('série sem ninguém jogando não tem campeão', async () => {
    const a = todos.slice(0, 10);
    const b = todos.slice(10);
    const series = Object.fromEntries([
      ...a.map((t) => [t, { serie: 'a' as const }]),
      ...b.map((t) => [t, { serie: 'b' as const }]),
    ]);
    await mes('2027-02-01', { series });
    await semana('2027-02-08', ordemCom({ 1: b[0], 2: b[1] }), { semAtivos: a });
    // Só os da B estão em `ordem`... os da A entram no resto com ativos 0 de qualquer forma.
    const c = so(await trofeus(), 'campeao_semana');
    expect(c).toHaveLength(1);
    expect(c[0].serie).toBe('b');
  }, TEMPO);

  it('semana em que ninguém jogou não dá campeão', async () => {
    await mes('2027-03-01');
    await semana('2027-03-08', [], {});
    expect(so(await trofeus(), 'campeao_semana')).toHaveLength(0);
  }, TEMPO);

  it('a série é a do mês da segunda-feira da semana: 29/03 é de março, mesmo terminando em abril', async () => {
    const a = todos.slice(0, 10);
    const b = todos.slice(10);
    const ab = Object.fromEntries([
      ...a.map((t) => [t, { serie: 'a' as const }]),
      ...b.map((t) => [t, { serie: 'b' as const }]),
    ]);
    await mes('2027-03-01', { series: ab });
    await mes('2027-04-01'); // abril em série única
    await semana('2027-03-29', ordemCom({ 1: b[0], 2: a[0] }));
    await semana('2027-04-05', ordemCom({ 1: b[0], 2: a[0] }));
    const l = so(await trofeus(), 'campeao_semana');
    expect(l.filter((t) => t.semana === '2027-03-29').map((t) => t.serie).sort()).toEqual(['a', 'b']);
    const abril = l.filter((t) => t.semana === '2027-04-05');
    expect(abril).toHaveLength(1);
    expect(abril[0]).toMatchObject({ serie: 'unica', time_id: b[0] });
  }, TEMPO);

  it('semana provisória não dá troféu (nem de campeão, nem de maior torcida)', async () => {
    await semana('2027-03-08', todos, { provisoria: true, soma: { [todos[0]]: 10 } });
    expect(await trofeus()).toEqual([]);
  }, TEMPO);
});

describe('galeria_trofeus: maior torcida (vitrine)', () => {
  it('um por semana, geral, só com soma > 0, prateleira vitrine e serie nula', async () => {
    const [a, b, c] = todos;
    await semana('2027-03-08', [a, b, c], { soma: { [b]: 500, [a]: 100 }, ordemSoma: [b, a] });
    await semana('2027-03-15', [a, b, c], { soma: {}, ordemSoma: [b, a] }); // posicao_soma 1 mas soma 0
    const v = so(await trofeus(), 'maior_torcida');
    expect(v).toEqual([
      { trofeu: 'maior_torcida', prateleira: 'vitrine', time_id: b, semana: '2027-03-08', mes: null, serie: null },
    ]);
    // O campeão da semana segue sendo o 1º geral, à parte.
    expect(so(await trofeus(), 'campeao_semana').map((t) => t.time_id)).toEqual([a, a]);
  }, TEMPO);

  it('em mês com A e B continua um só por semana', async () => {
    const a = todos.slice(0, 10);
    const b = todos.slice(10);
    const series = Object.fromEntries([
      ...a.map((t) => [t, { serie: 'a' as const }]),
      ...b.map((t) => [t, { serie: 'b' as const }]),
    ]);
    await mes('2027-02-01', { series });
    await semana('2027-02-08', todos, { soma: { [b[0]]: 9 }, ordemSoma: [b[0]] });
    expect(so(await trofeus(), 'maior_torcida')).toHaveLength(1);
  }, TEMPO);
});

describe('galeria_trofeus: troféus de mês', () => {
  const A = () => todos.slice(0, 10);
  const B = () => todos.slice(10);

  it('temporada fechada com A e B: campeão, campeão da B, acesso e rebaixamento', async () => {
    const a = A();
    const b = B();
    const series: OpcoesMes['series'] = {};
    a.forEach((t, i) => (series[t] = { serie: 'a', posicao_final: i + 1 }));
    b.forEach((t, i) => (series[t] = { serie: 'b', posicao_final: i + 1 }));
    series[b[0]].destino = 'a'; // sobe
    series[b[1]].destino = 'a'; // sobe
    series[a[9]].destino = 'b'; // cai
    await mes('2027-04-01', { fechada: true, series });
    const l = (await trofeus()).filter((t) => t.mes === '2027-04-01');
    const chave = (t: Trofeu) => `${t.trofeu}:${t.time_id}`;
    expect(l.map(chave).sort()).toEqual(
      [
        `campeao_temporada:${a[0]}`,
        `campeao_serie_b:${b[0]}`,
        `acesso:${b[0]}`,
        `acesso:${b[1]}`,
        `rebaixamento:${a[9]}`,
      ].sort(),
    );
    for (const t of l) {
      expect(t.semana).toBeNull();
      expect(t.prateleira).toBe('trofeus');
    }
    expect(l.find((t) => t.trofeu === 'campeao_temporada')!.serie).toBe('a');
    expect(l.find((t) => t.trofeu === 'campeao_serie_b')!.serie).toBe('b');
  }, TEMPO);

  it('temporada em andamento não dá troféu de mês', async () => {
    const series: OpcoesMes['series'] = {};
    A().forEach((t, i) => (series[t] = { serie: 'a', posicao_final: i + 1 }));
    B().forEach((t, i) => (series[t] = { serie: 'b', posicao_final: i + 1, destino: 'a' }));
    await mes('2027-04-01', { fechada: false, series });
    expect(await trofeus()).toEqual([]);
  }, TEMPO);

  it('temporada marcada pré-temporada não dá troféu de mês, nem fechada', async () => {
    const series: OpcoesMes['series'] = {};
    A().forEach((t, i) => (series[t] = { serie: 'a', posicao_final: i + 1 }));
    B().forEach((t, i) => (series[t] = { serie: 'b', posicao_final: i + 1, destino: 'a' }));
    await mes('2027-04-01', { fechada: true, pre: true, series });
    await mes('2027-05-01', { fechada: true, pre: true, estreia: todos[3] });
    expect((await trofeus()).filter((t) => t.mes !== null)).toEqual([]);
  }, TEMPO);

  it('estreia em série única: só o Campeão da estreia, sem acesso nem rebaixamento nem campeão de temporada', async () => {
    const series: OpcoesMes['series'] = {};
    todos.forEach((t, i) => (series[t] = { serie: 'unica', posicao_final: i + 1, destino: i < 10 ? 'a' : 'b' }));
    await mes('2027-04-01', { fechada: true, estreia: todos[0], series });
    const l = (await trofeus()).filter((t) => t.mes === '2027-04-01');
    expect(l).toEqual([
      { trofeu: 'campeao_estreia', prateleira: 'trofeus', time_id: todos[0], semana: null, mes: '2027-04-01', serie: 'unica' },
    ]);
  }, TEMPO);

  it('troféu de mês e de semana convivem, e a ordem é do mais recente para o mais antigo', async () => {
    const a = A();
    const b = B();
    const series: OpcoesMes['series'] = {};
    a.forEach((t, i) => (series[t] = { serie: 'a', posicao_final: i + 1 }));
    b.forEach((t, i) => (series[t] = { serie: 'b', posicao_final: i + 1 }));
    await mes('2027-04-01', { fechada: true, series });
    await mes('2027-05-01'); // série única
    await semana('2027-04-12', todos);
    await semana('2027-05-10', todos);
    const l = await trofeus();
    const datas = l.map((t) => t.semana ?? t.mes!);
    expect(datas).toEqual([...datas].sort().reverse());
    expect(datas[0]).toBe('2027-05-10');
    expect(datas).toContain('2027-04-01');
  }, TEMPO);
});

describe('galeria_trofeus: pré-temporada fora', () => {
  it('semanas antes ou dentro de mês pré-temporada não dão troféu; depois dão', async () => {
    await mes('2026-11-01', { pre: true });
    await mes('2026-12-01');
    await semana('2026-10-26', todos, { soma: { [todos[0]]: 10 } }); // antes da pré-temporada
    await semana('2026-11-09', todos, { soma: { [todos[0]]: 10 } }); // dentro
    await semana('2026-12-07', todos, { soma: { [todos[0]]: 10 } }); // depois
    const l = await trofeus();
    expect(l.map((t) => t.semana).sort()).toEqual(['2026-12-07', '2026-12-07']);
    expect(l.map((t) => t.trofeu).sort()).toEqual(['campeao_semana', 'maior_torcida']);
  }, TEMPO);

  it('com novembro de 2026 como a migração deixa (sem apagar), só o que vem depois conta', async () => {
    await db.exec('delete from public.temporada');
    await db.exec(`insert into public.temporada (mes, pre_temporada) values ('2026-11-01', true)`);
    await semana('2026-10-05', todos);
    await semana('2026-11-02', todos);
    expect(await trofeus()).toEqual([]);
  }, TEMPO);

  // O ciclo de scripts/zerar-pre-temporada.sql: antes, tudo é teste (novembro e o dezembro herdado); o zerar
  // apaga fechamento_semana e temporada e abre a estreia no mês seguinte ao da semana dele.
  it('ciclo do zerar: antes nada conta; depois, as semanas até a estreia e a da estreia contam, série única', async () => {
    await mes('2026-11-01', { pre: true, fechada: true });
    await mes('2026-12-01', { pre: true });
    await semana('2026-11-02', todos);
    await semana('2026-11-09', todos);
    expect(await trofeus()).toEqual([]);

    // Zerar numa quarta, 18/11 (semana de 16/11): a estreia abre em dezembro.
    await db.exec('delete from public.fechamento_semana; delete from public.temporada;');
    await db.query(`select public.abrir_estreia('2026-11-18T15:00:00Z')`);
    const { rows: meses } = await db.query<{ mes: unknown; pre_temporada: boolean }>(
      'select mes, pre_temporada from public.temporada',
    );
    expect(meses.map((m) => [dia(m.mes), m.pre_temporada])).toEqual([['2026-12-01', false]]);

    const depois = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    for (const s of depois) await semana(s, todos);
    const campeoes = so(await trofeus(), 'campeao_semana');
    expect(campeoes.map((t) => t.semana).sort()).toEqual(depois);
    expect(new Set(campeoes.map((t) => t.serie))).toEqual(new Set(['unica']));
    for (const s of depois) {
      const { rows } = await db.query<{ pre: boolean }>('select public.semana_pre_temporada($1) as pre', [s]);
      expect(rows[0].pre, s).toBe(false);
    }
  }, TEMPO);
});

describe('galeria_trofeus: filtro', () => {
  it('p_time_id filtra por time; nulo devolve todos', async () => {
    const [a, b] = todos;
    await semana('2027-03-08', [a, b], { soma: { [b]: 7 }, ordemSoma: [b] });
    await semana('2027-03-15', [b, a]);
    const todosT = await trofeus();
    expect(todosT).toHaveLength(3);
    const deB = await trofeus(b);
    expect(deB.every((t) => t.time_id === b)).toBe(true);
    expect(deB.map((t) => t.trofeu).sort()).toEqual(['campeao_semana', 'maior_torcida']);
    const deA = await trofeus(a);
    expect(deA).toHaveLength(1);
    expect(deA[0]).toMatchObject({ trofeu: 'campeao_semana', semana: '2027-03-08' });
    expect(await trofeus(todos[19])).toEqual([]);
  }, TEMPO);

  it('ordem: semana mais recente primeiro', async () => {
    await semana('2027-03-01', todos);
    await semana('2027-03-22', todos);
    await semana('2027-03-08', todos);
    expect((await trofeus()).map((t) => t.semana)).toEqual(['2027-03-22', '2027-03-08', '2027-03-01']);
  }, TEMPO);
});

describe('galeria_cidades', () => {
  const SP = 3550308;
  const CARAGUA = 3510500;
  const RIO = 3304557;
  const NITEROI = 3303302;

  beforeAll(async () => {
    await db.exec(`
      insert into public.municipios (codigo, nome, uf) values
        (${SP}, 'Cidade Paulista', 'SP'), (${CARAGUA}, 'Cidade Litorânea', 'SP'),
        (${RIO}, 'Cidade Carioca', 'RJ'), (${NITEROI}, 'Cidade Fluminense', 'RJ')
      on conflict (codigo) do update set nome = excluded.nome, uf = excluded.uf;
    `);
  }, TEMPO);

  async function linha(data: string, cidade: number, uf: string, posicao: number | null) {
    await db.query(
      `insert into public.ranking_cidade_semana (semana, cidade, uf, ativos, soma, media30, posicao_estado)
       values ($1, $2, $3, 6, 100, 10, $4)`,
      [data, cidade, uf, posicao],
    );
  }

  interface Cid {
    semana: string;
    uf: string;
    codigo: number;
    nome: string;
  }
  const cidades = async (uf?: string, codigo?: number): Promise<Cid[]> =>
    (await db.query<Cid>('select * from public.galeria_cidades($1, $2)', [uf ?? null, codigo ?? null])).rows.map(
      (r) => ({ ...r, semana: dia(r.semana) as string }),
    );

  it('por semana travada e UF, a cidade com posicao_estado = 1, com o nome do município', async () => {
    await semana('2027-03-08', todos);
    await linha('2027-03-08', SP, 'SP', 1);
    await linha('2027-03-08', CARAGUA, 'SP', 2);
    await linha('2027-03-08', RIO, 'RJ', 2);
    await linha('2027-03-08', NITEROI, 'RJ', 1);
    expect(await cidades()).toEqual([
      { semana: '2027-03-08', uf: 'RJ', codigo: NITEROI, nome: 'Cidade Fluminense' },
      { semana: '2027-03-08', uf: 'SP', codigo: SP, nome: 'Cidade Paulista' },
    ]);
  }, TEMPO);

  it('sem posição (menos de 5 jogadores) não ganha', async () => {
    await semana('2027-03-08', todos);
    await linha('2027-03-08', SP, 'SP', null);
    await linha('2027-03-08', CARAGUA, 'SP', 2);
    expect(await cidades()).toEqual([]);
  }, TEMPO);

  it('semana provisória, ou sem fechamento, não conta', async () => {
    await semana('2027-03-08', todos, { provisoria: true });
    await linha('2027-03-08', SP, 'SP', 1);
    await linha('2027-03-15', RIO, 'RJ', 1); // nem fechamento tem
    expect(await cidades()).toEqual([]);
  }, TEMPO);

  it('ordem: semana mais recente primeiro, depois uf', async () => {
    for (const s of ['2027-03-08', '2027-03-15']) {
      await semana(s, todos);
      await linha(s, SP, 'SP', 1);
      await linha(s, RIO, 'RJ', 1);
    }
    expect((await cidades()).map((c) => `${c.semana} ${c.uf}`)).toEqual([
      '2027-03-15 RJ',
      '2027-03-15 SP',
      '2027-03-08 RJ',
      '2027-03-08 SP',
    ]);
  }, TEMPO);

  it('filtros por UF (aceita minúscula) e por código', async () => {
    await semana('2027-03-08', todos);
    await linha('2027-03-08', SP, 'SP', 1);
    await linha('2027-03-08', RIO, 'RJ', 1);
    expect((await cidades('rj')).map((c) => c.codigo)).toEqual([RIO]);
    expect((await cidades('RJ')).map((c) => c.codigo)).toEqual([RIO]);
    expect((await cidades(undefined, SP)).map((c) => c.codigo)).toEqual([SP]);
    expect(await cidades('RJ', SP)).toEqual([]);
  }, TEMPO);

  it('pré-temporada fora: antes e dentro do mês marcado não contam; depois conta', async () => {
    await mes('2026-11-01', { pre: true });
    await mes('2026-12-01');
    for (const s of ['2026-10-26', '2026-11-09', '2026-12-07']) {
      await semana(s, todos);
      await linha(s, SP, 'SP', 1);
    }
    expect((await cidades()).map((c) => c.semana)).toEqual(['2026-12-07']);
  }, TEMPO);
});

describe('permissões', () => {
  const chamadas = [
    'select * from public.ranking_52_semanas()',
    'select * from public.galeria_trofeus(null)',
    'select * from public.galeria_cidades(null, null)',
  ];

  for (const papel of ['anon', 'authenticated']) {
    it(`${papel} executa as três funções`, async () => {
      await db.exec(`set role ${papel}`);
      try {
        for (const sql of chamadas) await db.query(sql);
      } finally {
        await db.exec('reset role');
      }
    }, TEMPO);
  }

  it('execute: anon, authenticated e service_role sim; public não', async () => {
    const assinaturas = [
      'public.ranking_52_semanas()',
      'public.galeria_trofeus(text)',
      'public.galeria_cidades(text, integer)',
    ];
    for (const f of assinaturas) {
      for (const papel of ['anon', 'authenticated', 'service_role']) {
        const { rows } = await db.query<{ ok: boolean }>('select has_function_privilege($1, $2::regprocedure, $3) as ok', [papel, f, 'execute']);
        expect(rows[0].ok, `${papel} em ${f}`).toBe(true);
      }
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from pg_proc p, aclexplode(p.proacl) a
          where p.oid = $1::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE'`,
        [f],
      );
      expect(rows[0].n, `public em ${f}`).toBe(0);
    }
  }, TEMPO);

  it('semana_pre_temporada é interna: anon e authenticated não; service_role e o papel de leitura sim', async () => {
    const f = 'public.semana_pre_temporada(date)';
    const pode = async (papel: string) =>
      (await db.query<{ ok: boolean }>('select has_function_privilege($1, $2::regprocedure, $3) as ok', [papel, f, 'execute']))
        .rows[0].ok;
    expect(await pode('anon')).toBe(false);
    expect(await pode('authenticated')).toBe(false);
    expect(await pode('service_role')).toBe(true);
    expect(await pode('supabase_read_only_user')).toBe(true);
  }, TEMPO);

  it('o papel de leitura do Supabase CLI executa as três funções públicas', async () => {
    for (const f of ['public.ranking_52_semanas()', 'public.galeria_trofeus(text)', 'public.galeria_cidades(text, integer)']) {
      const { rows } = await db.query<{ ok: boolean }>(
        'select has_function_privilege($1, $2::regprocedure, $3) as ok',
        ['supabase_read_only_user', f, 'execute'],
      );
      expect(rows[0].ok, f).toBe(true);
    }
  }, TEMPO);

  it('security definer com search_path vazio', async () => {
    const { rows } = await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] | null }>(
      `select proname, prosecdef, proconfig from pg_proc
        where proname in ('ranking_52_semanas', 'galeria_trofeus', 'galeria_cidades')`,
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.prosecdef, r.proname).toBe(true);
      const cfg = (r.proconfig ?? []).join(',').replace(/"/g, '');
      expect(cfg, r.proname).toMatch(/search_path=(,|$)/);
    }
  }, TEMPO);

  it('não gravam nada: rodam em transação somente leitura', async () => {
    await semana('2027-03-08', todos);
    await db.exec('begin; set transaction read only');
    try {
      for (const sql of chamadas) await db.query(sql);
    } finally {
      await db.exec('rollback');
    }
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.fechamento_semana');
    expect(rows[0].n).toBe(20);
  }, TEMPO);
});
