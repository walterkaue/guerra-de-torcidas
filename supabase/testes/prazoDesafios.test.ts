// Prazo dos desafios (20261109000000): todo desafio vale 7 dias, conferidos dentro da trava de quem começa a partida
// (pênaltis e Lances) com a hora gravada nela; o resumo diz se venceu; a rotina mensal apaga os de mais de 30 dias,
// conta os gerados antes e deixa as partidas de quem aceitou. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const SEMENTES = `'{"cobrancas":[1,2,3,4,5,6,7,8],"defesas":[1,2,3,4,5,6,7,8]}'::jsonb`;
const DIA = 86_400_000;
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const atras = (ms: number, de = Date.now()) => new Date(de - ms).toISOString();

let db: PGlite;
let ana: string;

async function torcedor(): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, 'sao-paulo', '18_mais')`, [id]);
  return id;
}

async function partidaDe(quem: string, minigame: string, criada: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, disputa_id, criada_em)
     values ($1, 'normal', 1, 0, $3::timestamptz + interval '15 minutes', $2, case when $2 = 'penaltis' then 'sao-paulo-2005-final' end, $3)
     returning id`,
    [quem, minigame, criada],
  );
  return rows[0].id;
}

/** Os três desafios de Ana com o mesmo código-base, criados em `criado`. */
async function desafios(base: string, criado: string): Promise<void> {
  const pen = await partidaDe(ana, 'penaltis', criado);
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos, criado_em)
     values ($1, $2, $3, 'sao-paulo', '[]'::jsonb, 3, 2, 70, $4)`,
    [`${base}p`, pen, ana, criado],
  );
  const lan = await partidaDe(ana, 'lances', criado);
  await db.query(
    `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, lance_id, pontos, gols, recriados, faixa, criado_em)
     values ($1, $2, $3, 'sao-paulo', 'gol-de-teste', 90, 2, 1, 'media', $4)`,
    [`${base}l`, lan, ana, criado],
  );
  const pro = await partidaDe(ana, 'prova', criado);
  await db.query(
    `insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, perguntas, pontos, escada, resumo, criado_em)
     values ($1, $2, $3, 'sao-paulo', array['a','b','c','d','e','f','g','h'], 58, '🟩🟩🟥', 'cheguei na 3ª', $4)`,
    [`${base}r`, pro, ana, criado],
  );
}

const penaltis = (quem: string, codigo: string, criada: string) =>
  db.query<{ partida_id: string }>(
    `select * from public.penaltis_comecar($1, 1, 0.5, now() + interval '15 minutes', 'desafio', $2, null, 3::smallint, ${SEMENTES}, $3)`,
    [quem, codigo, criada],
  );

const lances = (quem: string, codigo: string, criada: string) =>
  db.query<{ partida_id: string }>(
    `select * from public.lances_comecar($1, 1, now() + interval '15 minutes', '{"lances":["gol-de-teste"]}'::jsonb, 'desafio', $2, $3)`,
    [quem, codigo, criada],
  );

const conta = async (sql: string, params: unknown[] = []) => (await db.query<{ n: number }>(sql, params)).rows[0].n;

describe('desafio vale 7 dias', () => {
  // Hora de referência das partidas: a mesma em todos os casos, dentro do minuto que o banco aceita.
  let agora: number;

  beforeAll(async () => {
    db = await bancoDeTeste();
    await db.exec(`update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto'`);
    ana = await torcedor();
    agora = Date.now();
    await desafios('novo000', atras(DIA, agora)); // 1 dia
    await desafios('quase00', atras(7 * DIA - 1000, agora)); // falta 1 s
    await desafios('limite0', atras(7 * DIA, agora)); // 7 dias cravados
    await desafios('velho00', atras(8 * DIA, agora)); // 8 dias
  }, TEMPO);

  it('pênaltis: vale até 1 s antes dos 7 dias; nos 7 cravados e depois, desafio_expirado sem gravar partida', async () => {
    const quem = await torcedor();
    const hora = new Date(agora).toISOString();
    await expect(penaltis(quem, 'novo000p', hora)).resolves.toBeDefined();
    await expect(penaltis(quem, 'quase00p', hora)).resolves.toBeDefined();
    await expect(penaltis(quem, 'limite0p', hora)).rejects.toThrow(/desafio_expirado/);
    await expect(penaltis(quem, 'velho00p', hora)).rejects.toThrow(/desafio_expirado/);
    expect(await conta('select count(*)::int as n from public.partidas where torcedor_id = $1', [quem])).toBe(2);
  }, TEMPO);

  it('Lances: o mesmo prazo, e código que não existe também é desafio_expirado', async () => {
    const quem = await torcedor();
    const hora = new Date(agora).toISOString();
    await expect(lances(quem, 'novo000l', hora)).resolves.toBeDefined();
    await expect(lances(quem, 'quase00l', hora)).resolves.toBeDefined();
    await expect(lances(quem, 'limite0l', hora)).rejects.toThrow(/desafio_expirado/);
    await expect(lances(quem, 'velho00l', hora)).rejects.toThrow(/desafio_expirado/);
    await expect(lances(quem, 'sumiu000', hora)).rejects.toThrow(/desafio_expirado/);
    expect(await conta('select count(*)::int as n from public.partidas where torcedor_id = $1', [quem])).toBe(2);
  }, TEMPO);

  it('conta a hora gravada na partida, não o relógio do banco', async () => {
    // A partida "de 2 s atrás" ainda cabe no desafio que vence 1 s depois do agora de referência.
    const quem = await torcedor();
    await expect(lances(quem, 'quase00l', atras(2000, agora))).resolves.toBeDefined();
    await expect(lances(await torcedor(), 'quase00l', new Date(agora + 2000).toISOString())).rejects.toThrow(/desafio_expirado/);
  }, TEMPO);

  it('o resumo diz se venceu nos três jogos (a Home esconde o convite)', async () => {
    for (const [fn, sufixo] of [['ver_desafio', 'p'], ['ver_desafio_lances', 'l'], ['ver_prova_desafio', 'r']] as const) {
      const { rows } = await db.query<{ id: string; vencido: boolean }>(
        `select id, vencido from public.${fn}($1) union all select id, vencido from public.${fn}($2) order by id`,
        [`NOVO000${sufixo.toUpperCase()}`, `velho00${sufixo}`],
      );
      expect(rows).toEqual([
        { id: `novo000${sufixo}`, vencido: false },
        { id: `velho00${sufixo}`, vencido: true },
      ]);
    }
  }, TEMPO);

  it('o resumo continua aberto a quem recebe o link', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await db.exec(`set role ${papel}`);
      try {
        await expect(db.query(`select * from public.ver_desafio('velho00p')`)).resolves.toBeDefined();
        await expect(db.query(`select * from public.ver_desafio_lances('velho00l')`)).resolves.toBeDefined();
        await expect(db.query(`select * from public.ver_prova_desafio('velho00r')`)).resolves.toBeDefined();
      } finally {
        await db.exec('reset role');
      }
    }
  }, TEMPO);
});

describe('limpeza mensal dos desafios', () => {
  let bia: string;
  let partidaPenaltis: string;
  let partidaLances: string;
  let partidaProva: string;
  const DIA_ANTIGO = new Date(Date.now() - 40 * DIA);

  beforeAll(async () => {
    db = await bancoDeTeste();
    await db.exec(`update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto'`);
    ana = await torcedor();
    bia = await torcedor();
    await desafios('antigo0', DIA_ANTIGO.toISOString()); // 40 dias: sai
    await desafios('recente', atras(29 * DIA)); // 29 dias: fica
    // Bia aceitou os três desafios antigos quando ainda valiam (as partidas são de 39 dias atrás).
    const aceitou = atras(39 * DIA);
    const { rows: p } = await db.query<{ id: string }>(
      `insert into public.partidas (torcedor_id, modo, desafio_id, disputa_id, semente, dificuldade, expira_em, minigame, criada_em, fechada_em, pontos)
       values ($1, 'desafio', 'antigo0p', 'sao-paulo-2005-final', 1, 0, $2::timestamptz + interval '15 minutes', 'penaltis', $2, $2, 50)
       returning id`,
      [bia, aceitou],
    );
    partidaPenaltis = p[0].id;
    const { rows: l } = await db.query<{ id: string }>(
      `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, criada_em, fechada_em, pontos)
       values ($1, 'desafio', 1, 0, $2::timestamptz + interval '15 minutes', 'lances', $2, $2, 50) returning id`,
      [bia, aceitou],
    );
    partidaLances = l[0].id;
    await db.query(
      `insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, gestos) values ($1, 0, true, '{"desafio":"antigo0l"}'::jsonb)`,
      [partidaLances],
    );
    const { rows: r } = await db.query<{ id: string }>(
      `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, criada_em, fechada_em, pontos)
       values ($1, 'desafio', 1, 0, $2::timestamptz + interval '15 minutes', 'prova', $2, $2, 50) returning id`,
      [bia, aceitou],
    );
    partidaProva = r[0].id;
    await db.query(
      `insert into public.prova_estado (partida_id, desafio_id, escada, fase) values ($1, 'antigo0r', '[]'::jsonb, 'fim')`,
      [partidaProva],
    );
  }, TEMPO);

  it('recusa prazo menor que 30 dias, data no futuro ou vazia, sem apagar nada', async () => {
    const antes = await conta('select count(*)::int as n from public.desafios');
    for (const [dias, quando] of [
      [29, new Date().toISOString()],
      [0, new Date().toISOString()],
      [30, '2099-01-01T00:00:00-03:00'],
      [null, new Date().toISOString()],
      [30, null],
    ] as const) {
      await expect(db.query('select public.apagar_desafios_antigos($1, $2)', [dias, quando])).rejects.toThrow(/prazo_invalido/);
    }
    expect(await conta('select count(*)::int as n from public.desafios')).toBe(antes);
  }, TEMPO);

  it('só o cron chama: nem a chave secreta das funções, nem o celular', async () => {
    for (const papel of ['service_role', 'authenticated', 'anon']) {
      const { rows } = await db.query<{ pode: boolean }>(
        `select has_function_privilege($1, 'public.apagar_desafios_antigos(integer, timestamptz)', 'execute') as pode`,
        [papel],
      );
      expect(rows[0].pode).toBe(false);
    }
  }, TEMPO);

  it('apaga os de mais de 30 dias nos três jogos, conta os gerados antes e deixa as partidas de quem aceitou', async () => {
    expect(await conta('select public.apagar_desafios_antigos() as n')).toBe(3);

    // Saíram só os antigos.
    const { rows: ficaram } = await db.query<{ id: string }>(
      `select id from public.desafios union all select id from public.lances_desafios union all select id from public.prova_desafios order by id`,
    );
    expect(ficaram.map((x) => x.id)).toEqual(['recentel', 'recentep', 'recenter']);

    // Os gerados do dia antigo ficaram contados para sempre, um por jogo.
    const dia = (await db.query<{ d: string }>(`select ($1::timestamptz at time zone 'America/Sao_Paulo')::date::text as d`, [DIA_ANTIGO.toISOString()])).rows[0].d;
    const { rows: gerados } = await db.query<{ tipo: string; n: number }>(
      `select tipo, n from public.funil_contagem where evento = 'gerou' and dia = $1 order by tipo`,
      [dia],
    );
    expect(gerados).toEqual([
      { tipo: 'x1_lances', n: 1 },
      { tipo: 'x1_penaltis', n: 1 },
      { tipo: 'x1_prova', n: 1 },
    ]);

    // As partidas de quem aceitou ficam; nos pênaltis e na Prova o vínculo vira null, nos Lances o código fica no segredo.
    const { rows: pen } = await db.query<{ desafio_id: string | null; modo: string }>('select desafio_id, modo from public.partidas where id = $1', [partidaPenaltis]);
    expect(pen).toEqual([{ desafio_id: null, modo: 'desafio' }]);
    expect(await conta('select count(*)::int as n from public.partidas where id = $1', [partidaLances])).toBe(1);
    expect(await conta('select count(*)::int as n from public.partidas_segredo where partida_id = $1', [partidaLances])).toBe(1);
    const { rows: est } = await db.query<{ desafio_id: string | null }>('select desafio_id from public.prova_estado where partida_id = $1', [partidaProva]);
    expect(est).toEqual([{ desafio_id: null }]);
    // As partidas de quem chamou também ficam (o desafio é que sai).
    expect(await conta('select count(*)::int as n from public.partidas where torcedor_id = $1', [ana])).toBe(6);

    // Rodar de novo não apaga mais nada, e a contagem não muda.
    expect(await conta('select public.apagar_desafios_antigos() as n')).toBe(0);
    expect(await conta(`select sum(n)::int as n from public.funil_contagem where evento = 'gerou' and dia = $1`, [dia])).toBe(3);
  }, TEMPO);
});
