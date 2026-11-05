// Migração dos Lances unificados (20261105100000): teto com as duas regras pelo dia, limite do dia somando pênaltis e
// Lances com trava, X1 dos Lances, medalhas dos pênaltis (com o preenchimento), tentativas por lance, posição e recorde
// que recomeçam no corte, e permissões. Roda o SQL de verdade (PGlite).
// O corte de verdade é 16/11/2026. Para testar o "depois" sem esperar, um segundo banco troca a data de corte.

import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261105100000_lances_unificados.sql';
/** Sementes por lance no formato que partidas_segredo aceita (8 + 8). */
const SEMENTES = `'{"cobrancas":[1,2,3,4,5,6,7,8],"defesas":[1,2,3,4,5,6,7,8]}'::jsonb`;
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

/** Troca a data de corte (as funções olham para ela a cada chamada). */
async function cortarEm(db: PGlite, instante: string, dia: string): Promise<void> {
  await db.exec(`
    create or replace function public.lances_unificados_desde() returns timestamptz language sql immutable set search_path = ''
      as $$ select timestamptz '${instante}' $$;
    create or replace function public.lances_dia_do_corte() returns date language sql immutable set search_path = ''
      as $$ select date '${dia}' $$;
    update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto';
  `);
}

async function torcedor(db: PGlite, time = 'sao-paulo'): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, $2, '18_mais')`, [id, time]);
  return id;
}

type Minigame = 'penaltis' | 'lances' | 'prova';
interface Opcoes {
  minigame?: Minigame;
  dia?: string;
  criada?: string;
  hora?: string;
  suspeita?: boolean;
  resultado?: unknown;
  disputa?: string | null;
  modo?: 'normal' | 'desafio';
  desafio?: unknown;
  codigos?: string[];
}

/** Cria e fecha uma partida pelo fechar_partida de verdade. Devolve o id e o código do X1 (se houver). */
async function partida(db: PGlite, quem: string, pontos: number, o: Opcoes = {}): Promise<{ id: string; codigo: string | null }> {
  const dia = o.dia ?? '2026-11-17';
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, disputa_id, criada_em)
     values ($1, $5, 1, 0, now() + interval '15 minutes', $2, $3, coalesce($4::timestamptz, now()))
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem, o.minigame ?? 'penaltis', o.disputa ?? null, o.criada ?? null, o.modo ?? 'normal'],
  );
  const semanaDe = (d: string) => {
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x.toISOString().slice(0, 10);
  };
  const { rows: r } = await db.query<{ codigo: string | null }>(
    'select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
    [
      rows[0].id,
      quem,
      rows[0].time_id,
      '{}',
      JSON.stringify(o.resultado ?? {}),
      pontos,
      dia,
      semanaDe(dia),
      `${dia}T${o.hora ?? '12:00'}:00-03:00`,
      o.suspeita ? 'teste' : null,
      o.desafio ? JSON.stringify(o.desafio) : null,
      o.codigos ?? null,
    ],
  );
  return { id: rows[0].id, codigo: r[0]?.codigo ?? null };
}

async function como<T>(db: PGlite, uid: string | null, papel: 'authenticated' | 'anon' | 'service_role', sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

const noTeto = async (db: PGlite, quem: string, dia: string) =>
  (
    await db.query<{ minigame: string; pontos: number }>(
      `select minigame, pontos from public.partidas where torcedor_id = $1 and dia = $2 and conta_no_teto order by minigame, pontos`,
      [quem, dia],
    )
  ).rows.map((x) => `${x.minigame}:${x.pontos}`);

/** Resultado de pênaltis com `gols` gols (nas primeiras cobranças) e a vitória. */
const penaltis = (gols: number, venceu: boolean, cobrancas = 5) => ({
  cobrancas: Array.from({ length: cobrancas }, (_, i) => ({ desfecho: i < gols ? 'gol' : 'defesa' })),
  venceu,
});
const lances = (id: string, desfechos: ('gol' | 'defesa')[]) => ({
  lances: desfechos.map((d) => ({ lanceId: id, faixa: 'media', desfecho: d, recriou: false, gesto: { dir: 0, forca: 60, efeito: 0 } })),
});

describe('corte pelo dia (data de corte de verdade, 16/11/2026)', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('a data de corte é segunda 16/11/2026, 0h de Brasília', async () => {
    const { rows } = await db.query<{ desde: Date; dia: string }>(
      `select public.lances_unificados_desde() as desde, public.lances_dia_do_corte()::text as dia`,
    );
    expect(rows[0].desde.toISOString()).toBe('2026-11-16T03:00:00.000Z');
    expect(rows[0].dia).toBe('2026-11-16');
  });

  it('antes do corte: 5 melhores de pênaltis e Prova, e a melhor dos Lances à parte', async () => {
    const eu = await torcedor(db);
    const dia = '2026-11-15';
    for (const p of [50, 60, 70, 80, 90]) await partida(db, eu, p, { dia, criada: '2026-11-15T12:00:00-03:00' });
    await partida(db, eu, 85, { minigame: 'prova', dia, criada: '2026-11-15T12:00:00-03:00' });
    await partida(db, eu, 40, { minigame: 'lances', dia, criada: '2026-11-15T12:00:00-03:00' });
    await partida(db, eu, 96, { minigame: 'lances', dia, criada: '2026-11-15T12:00:00-03:00' });
    expect(await noTeto(db, eu, dia)).toEqual(['lances:96', 'penaltis:60', 'penaltis:70', 'penaltis:80', 'penaltis:90', 'prova:85']);
  });

  it('a partir do corte: 3 melhores de pênaltis + Lances e 3 melhores da Prova', async () => {
    const eu = await torcedor(db);
    const dia = '2026-11-16';
    for (const p of [50, 60, 70]) await partida(db, eu, p, { dia });
    for (const p of [65, 120]) await partida(db, eu, p, { minigame: 'lances', dia });
    for (const p of [10, 20, 30, 40]) await partida(db, eu, p, { minigame: 'prova', dia });
    expect(await noTeto(db, eu, dia)).toEqual(['lances:65', 'lances:120', 'penaltis:70', 'prova:20', 'prova:30', 'prova:40']);
  });

  it('no dia da regra nova, partida de Lances acima de 150 não fecha (função velha no ar depois do corte)', async () => {
    const eu = await torcedor(db);
    await expect(partida(db, eu, 151, { dia: '2026-11-16' })).rejects.toThrow(/acima_do_teto/);
    await expect(partida(db, eu, 151, { minigame: 'lances', dia: '2026-11-17' })).rejects.toThrow(/acima_do_teto/);
    await expect(partida(db, eu, 150, { dia: '2026-11-16' })).resolves.toBeDefined();
    // Antes do corte a tabela velha passa de 150; a Prova tem a guarda dela.
    await expect(partida(db, eu, 190, { dia: '2026-11-15', criada: '2026-11-15T12:00:00-03:00' })).resolves.toBeDefined();
    await expect(partida(db, eu, 151, { minigame: 'prova', dia: '2026-11-16' })).resolves.toBeDefined();
  });

  it('liberar uma suspeita de um dia antigo refaz o teto com a regra daquele dia', async () => {
    const eu = await torcedor(db);
    const dia = '2026-11-14';
    for (const p of [10, 20, 30]) await partida(db, eu, p, { dia, criada: '2026-11-14T12:00:00-03:00' });
    const { id } = await partida(db, eu, 99, { minigame: 'lances', dia, criada: '2026-11-14T12:00:00-03:00', suspeita: true });
    await partida(db, eu, 50, { minigame: 'lances', dia, criada: '2026-11-14T12:00:00-03:00' });
    await db.query('update public.partidas set sob_suspeita = false where id = $1', [id]);
    await db.query('select public.atualizar_teto($1, $2)', [eu, dia]);
    // Regra de antes: os 3 pênaltis (cabem nas 5) e só a melhor dos Lances.
    expect(await noTeto(db, eu, dia)).toEqual(['lances:99', 'penaltis:10', 'penaltis:20', 'penaltis:30']);
  });
});

describe('limite do dia', () => {
  it('antes do corte: só os Lances, 6 por dia; os pênaltis não têm limite', async () => {
    const db = await bancoDeTeste();
    await cortarEm(db, '2099-01-05 00:00:00-03', '2099-01-05');
    const eu = await torcedor(db);
    const lance = (k: number) =>
      db.query(`select * from public.lances_comecar($1, $2, now() + interval '15 minutes', '{}'::jsonb)`, [eu, k]);
    const penalti = (k: number) =>
      db.query(
        `select * from public.penaltis_comecar($1, $2, 0.5, now() + interval '15 minutes', 'normal', null, null, 3::smallint, ${SEMENTES})`,
        [eu, k],
      );
    for (let k = 0; k < 12; k++) await penalti(k);
    for (let k = 0; k < 6; k++) await lance(k);
    await expect(lance(99)).rejects.toThrow(/limite_do_dia/);
    await expect(penalti(99)).resolves.toBeDefined();
  }, TEMPO);

  it('a partir do corte: 10 por dia somando pênaltis e Lances, com o X1 recebido contando', async () => {
    const db = await bancoDeTeste();
    await cortarEm(db, '2026-01-05 00:00:00-03', '2026-01-05');
    const eu = await torcedor(db);
    const outro = await torcedor(db);
    for (let k = 0; k < 4; k++) {
      await db.query(
        `select * from public.penaltis_comecar($1, $2, 0.5, now() + interval '15 minutes', 'normal', null, 'final-2018', 3::smallint, ${SEMENTES})`,
        [eu, k],
      );
    }
    const { codigo } = await partida(db, outro, 70, { resultado: penaltis(3, true), desafio: { cobrancas: [], gols_jogador: 3, gols_maquina: 2 }, codigos: ['abcdefgh'], dia: '2026-01-06' });
    expect(codigo).toBe('abcdefgh');
    await db.query(
      `select * from public.penaltis_comecar($1, 7, 0.5, now() + interval '15 minutes', 'desafio', 'abcdefgh', null, 3::smallint, ${SEMENTES})`,
      [eu],
    );
    for (let k = 0; k < 4; k++) await db.query(`select * from public.lances_comecar($1, $2, now() + interval '15 minutes', '{}'::jsonb)`, [eu, k]);
    const { rows } = await db.query<{ feitas: number; limite: number }>(
      `select * from public.lances_comecar($1, 9, now() + interval '15 minutes', '{}'::jsonb, 'desafio', 'zzzzzzzz')`,
      [eu],
    );
    expect(rows[0]).toMatchObject({ feitas: 10, limite: 10 });
    await expect(db.query(`select * from public.lances_comecar($1, 1, now() + interval '15 minutes', '{}'::jsonb)`, [eu])).rejects.toThrow(/limite_do_dia/);
    await expect(
      db.query(`select * from public.penaltis_comecar($1, 1, 0.5, now() + interval '15 minutes', 'normal', null, null, 3::smallint, ${SEMENTES})`, [eu]),
    ).rejects.toThrow(/limite_do_dia/);
    // Outra pessoa não é afetada; a partida guarda modo, desafio e disputa.
    await expect(db.query(`select * from public.lances_comecar($1, 1, now() + interval '15 minutes', '{}'::jsonb)`, [outro])).resolves.toBeDefined();
    const { rows: guardadas } = await db.query<{ modo: string; desafio_id: string | null; disputa_id: string | null; minigame: string }>(
      `select modo, desafio_id, disputa_id, minigame from public.partidas where torcedor_id = $1 and (modo = 'desafio' or disputa_id is not null) order by minigame, modo`,
      [eu],
    );
    expect(guardadas).toContainEqual({ modo: 'desafio', desafio_id: null, disputa_id: null, minigame: 'lances' });
    const { rows: segredo } = await db.query<{ gestos: { desafio?: string } }>(
      `select s.gestos from public.partidas_segredo s join public.partidas p on p.id = s.partida_id
       where p.torcedor_id = $1 and p.minigame = 'lances' and p.modo = 'desafio'`,
      [eu],
    );
    expect(segredo[0].gestos.desafio).toBe('zzzzzzzz');
    expect(guardadas).toContainEqual({ modo: 'desafio', desafio_id: 'abcdefgh', disputa_id: null, minigame: 'penaltis' });
    expect(guardadas.filter((g) => g.disputa_id === 'final-2018')).toHaveLength(4);
    // Modo e código têm de combinar.
    await expect(
      db.query(`select * from public.lances_comecar($1, 1, now() + interval '15 minutes', '{}'::jsonb, 'desafio', null)`, [outro]),
    ).rejects.toThrow(/modo_invalido/);
  }, TEMPO);

  it('o limite conta no dia da hora gravada na partida; hora fora de 1 minuto é recusada', async () => {
    const db = await bancoDeTeste();
    await cortarEm(db, '2026-01-05 00:00:00-03', '2026-01-05');
    const eu = await torcedor(db);
    // 10 partidas criadas ontem: o limite de ontem está cheio, o de hoje não.
    await db.query(
      `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, criada_em)
       select $1, 'normal', 1, 0, now(), 'penaltis', now() - interval '1 day' from generate_series(1, 10)`,
      [eu],
    );
    const [ontem] = (await db.query<{ feitas: number }>(`select * from public.lances_hoje($1, now() - interval '1 day')`, [eu])).rows;
    const [hoje] = (await db.query<{ feitas: number }>('select * from public.lances_hoje($1)', [eu])).rows;
    expect(ontem.feitas).toBe(10);
    expect(hoje.feitas).toBe(0);
    for (const quando of [`now() - interval '2 minutes'`, `now() + interval '2 minutes'`, 'null']) {
      await expect(
        db.query(`select * from public.lances_comecar($1, 1, now() + interval '15 minutes', '{}'::jsonb, 'normal', null, ${quando})`, [eu]),
      ).rejects.toThrow(/hora_invalida/);
      await expect(
        db.query(
          `select * from public.penaltis_comecar($1, 1, 0.5, now() + interval '15 minutes', 'normal', null, null, 3::smallint, ${SEMENTES}, ${quando})`,
          [eu],
        ),
      ).rejects.toThrow(/hora_invalida/);
    }
    const { rows } = await db.query<{ feitas: number }>(
      `select * from public.lances_comecar($1, 1, now() + interval '15 minutes', '{}'::jsonb, 'normal', null, now() - interval '30 seconds')`,
      [eu],
    );
    expect(rows[0].feitas).toBe(1);
  }, TEMPO);

  it('meus_lances_hoje: as 3 melhores que contam hoje, a partir do corte', async () => {
    const db = await bancoDeTeste();
    await cortarEm(db, '2026-01-05 00:00:00-03', '2026-01-05');
    const eu = await torcedor(db);
    const { rows: h } = await db.query<{ hoje: string }>(`select public.hoje_brasilia()::text as hoje`);
    const dia = h[0].hoje;
    for (const p of [30, 80, 50, 70]) await partida(db, eu, p, { dia });
    await partida(db, eu, 90, { minigame: 'lances', dia, suspeita: true });
    const [r] = await como<{ feitas: number; limite: number; melhor: number; melhores: number[] }>(db, eu, 'authenticated', 'select * from public.meus_lances_hoje()');
    expect(r).toMatchObject({ feitas: 5, limite: 10, melhor: 80, melhores: [80, 70, 50] });
  }, TEMPO);
});

describe('X1 dos Lances', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('a partida normal vira um código com o lance e os pontos; quem recebe vê só o resumo', async () => {
    const eu = await torcedor(db, 'palmeiras');
    const outro = await torcedor(db);
    const { codigo } = await partida(db, eu, 66, {
      minigame: 'lances',
      resultado: lances('gol-100', ['gol', 'gol', 'defesa']),
      desafio: { lance_id: 'gol-100', gols: 2, recriados: 1, faixa: 'media' },
      codigos: ['lancex1a', 'lancex1b'],
    });
    expect(codigo).toBe('lancex1a');
    const resumo = await como(db, null, 'anon', 'select * from public.ver_desafio_lances($1)', ['LANCEX1A']);
    expect(resumo).toEqual([{ id: 'lancex1a', time_id: 'palmeiras', apelido: null, lance_id: 'gol-100', pontos: 66, gols: 2, recriados: 1, faixa: 'media' }]);
    // Código repetido: tenta o próximo.
    const { codigo: segundo } = await partida(db, eu, 10, {
      minigame: 'lances',
      resultado: lances('gol-100', ['defesa', 'defesa', 'defesa']),
      desafio: { lance_id: 'gol-100', gols: 0, recriados: 0, faixa: 'media' },
      codigos: ['lancex1a', 'lancex1b'],
    });
    expect(segundo).toBe('lancex1b');
    // A tabela só se lê pelo dono.
    expect(await como(db, outro, 'authenticated', 'select id from public.lances_desafios')).toEqual([]);
    expect((await como<{ id: string }>(db, eu, 'authenticated', 'select id from public.lances_desafios order by id')).map((x) => x.id)).toEqual([
      'lancex1a',
      'lancex1b',
    ]);
    await expect(como(db, eu, 'authenticated', `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, lance_id, pontos, gols, recriados, faixa)
      values ('zzzzzzzz', gen_random_uuid(), $1, 'palmeiras', 'a-b-c', 1, 0, 0, 'media')`, [eu])).rejects.toThrow(/permission/);
  });

  it('apagar um apelido pelo #admin também limpa o resumo do X1 dos Lances', async () => {
    const eu = await torcedor(db, 'palmeiras');
    const admin = await torcedor(db);
    await db.query(`update public.torcedores set apelido = 'Zueiro' where id = $1`, [eu]);
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
    await partida(db, eu, 40, {
      minigame: 'lances',
      resultado: lances('gol-100', ['gol', 'defesa', 'defesa']),
      desafio: { lance_id: 'gol-100', gols: 1, recriados: 0, faixa: 'facil' },
      codigos: ['apelidox'],
    });
    expect((await como<{ apelido: string }>(db, null, 'anon', 'select apelido from public.ver_desafio_lances($1)', ['apelidox']))[0].apelido).toBe('Zueiro');
    await como(db, admin, 'authenticated', 'select public.apelido_apagar($1)', ['Zueiro']);
    expect((await como<{ apelido: string | null }>(db, null, 'anon', 'select apelido from public.ver_desafio_lances($1)', ['apelidox']))[0].apelido).toBeNull();
  });

  it('os pênaltis continuam gravando o desafio de sempre', async () => {
    const eu = await torcedor(db);
    const { codigo } = await partida(db, eu, 70, {
      resultado: penaltis(3, true),
      desafio: { cobrancas: [], gols_jogador: 3, gols_maquina: 2 },
      codigos: ['penalx1a'],
    });
    expect(codigo).toBe('penalx1a');
    const { rows } = await db.query('select gols_jogador, gols_maquina, pontos from public.desafios where id = $1', [codigo]);
    expect(rows).toEqual([{ gols_jogador: 3, gols_maquina: 2, pontos: 70 }]);
  });
});

describe('medalhas dos pênaltis', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('gols e vitórias por disputa e pela livre; 10 · 50 · 100 gols e ouro com 10 vitórias', async () => {
    const eu = await torcedor(db, 'gremio');
    // Disputa histórica: 2 partidas de 5 gols (bronze).
    for (let k = 0; k < 2; k++) await partida(db, eu, 70, { disputa: 'final-1995', resultado: penaltis(5, true) });
    // Livre: 20 partidas de 5 gols = 100 gols, 9 vitórias (prata, falta 1 vitória para o ouro).
    for (let k = 0; k < 20; k++) await partida(db, eu, 70, { resultado: penaltis(5, k < 9) });
    // Suspeita não conta; antes de 31/10 não conta.
    await partida(db, eu, 70, { resultado: penaltis(5, true), suspeita: true });
    await partida(db, eu, 70, { resultado: penaltis(5, true), criada: '2026-10-30T12:00:00-03:00' });
    const minhas = await como(db, eu, 'authenticated', 'select * from public.minhas_medalhas() order by lance_id');
    expect(minhas).toEqual([
      { lance_id: 'penaltis:final-1995', gols: 10, recriados: 0, vitorias: 2, medalha: 'bronze' },
      { lance_id: 'penaltis:livre', gols: 100, recriados: 0, vitorias: 9, medalha: 'prata' },
    ]);
    await partida(db, eu, 70, { resultado: penaltis(1, true) });
    const [ouro] = await como<{ medalha: string; vitorias: number }>(db, eu, 'authenticated', `select medalha, vitorias from public.minhas_medalhas() where lance_id = 'penaltis:livre'`);
    expect(ouro).toEqual({ medalha: 'ouro', vitorias: 10 });
    const vitrine = await como(db, eu, 'authenticated', `select * from public.vitrine_medalhas() where time_id = 'gremio'`);
    expect(vitrine).toEqual([{ time_id: 'gremio', bronze: 1, prata: 0, ouro: 1 }]);
    // Partida liberada na revisão passa a contar.
    const { id } = await partida(db, eu, 70, { disputa: 'final-1995', resultado: penaltis(5, true), suspeita: true });
    await db.query('update public.partidas set sob_suspeita = false where id = $1', [id]);
    const [d] = await como<{ gols: number }>(db, eu, 'authenticated', `select gols from public.minhas_medalhas() where lance_id = 'penaltis:final-1995'`);
    expect(d.gols).toBe(15);
  });

  it('as medalhas dos lances continuam com 5 · 20 · 50 e "Ver meus dados" separa gols e vitórias', async () => {
    const eu = await torcedor(db);
    for (let k = 0; k < 2; k++) await partida(db, eu, 30, { minigame: 'lances', resultado: lances('x', ['gol', 'gol', 'gol']) });
    await partida(db, eu, 70, { resultado: penaltis(4, true) });
    const minhas = await como(db, eu, 'authenticated', 'select * from public.minhas_medalhas() order by lance_id');
    expect(minhas).toEqual([
      { lance_id: 'penaltis:livre', gols: 4, recriados: 0, vitorias: 1, medalha: null },
      { lance_id: 'x', gols: 6, recriados: 0, vitorias: 0, medalha: 'bronze' },
    ]);
    const [dados] = await como<{ ver_meus_dados: Record<string, number> }>(db, eu, 'authenticated', 'select public.ver_meus_dados()');
    expect(dados.ver_meus_dados).toMatchObject({ gols_lances: 10, vitorias_penaltis: 1, tentativas_lances: 6 });
  });

  it('a migração preenche com as partidas fechadas desde 31/10, sem suspeita', async () => {
    const velho = await bancoDeTeste(MIGRACAO);
    const eu = await torcedor(velho);
    const fechar = async (criada: string, resultado: unknown, suspeita = false, disputa: string | null = null) => {
      await velho.query(
        `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, criada_em, fechada_em, pontos,
           resultado, sob_suspeita, disputa_id, dia, semana)
         values ($1, 'normal', 1, 0, now(), 'penaltis', $2, $2, 50, $3, $4, $5, '2026-11-02', '2026-11-02')`,
        [eu, criada, JSON.stringify(resultado), suspeita, disputa],
      );
    };
    await fechar('2026-11-01T12:00:00-03:00', penaltis(3, true), false, 'final-2018');
    await fechar('2026-11-01T13:00:00-03:00', penaltis(4, false));
    await fechar('2026-11-01T14:00:00-03:00', penaltis(5, true), true);
    await fechar('2026-10-30T14:00:00-03:00', penaltis(5, true));
    await aplicarMigracao(velho, MIGRACAO);
    const { rows } = await velho.query(
      `select lance_id, count(*) filter (where not vitoria)::int as gols, count(*) filter (where vitoria)::int as vitorias
       from public.lances_gols group by lance_id order by lance_id`,
    );
    expect(rows).toEqual([
      { lance_id: 'penaltis:final-2018', gols: 3, vitorias: 1 },
      { lance_id: 'penaltis:livre', gols: 4, vitorias: 0 },
    ]);
  }, TEMPO);
});

describe('tentativas por lance (faixa corrigida)', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('anota as 3 tentativas da partida sem suspeita; a taxa usa no máximo 10 por pessoa', async () => {
    const a = await torcedor(db);
    const b = await torcedor(db);
    // a: 6 partidas (18 tentativas), todas defesa; só as 10 últimas entram.
    for (let k = 0; k < 6; k++) await partida(db, a, 0, { minigame: 'lances', resultado: lances('t-1', ['defesa', 'defesa', 'defesa']), hora: `12:0${k}` });
    // b: 2 partidas, 4 gols em 6.
    await partida(db, b, 60, { minigame: 'lances', resultado: lances('t-1', ['gol', 'gol', 'defesa']) });
    await partida(db, b, 60, { minigame: 'lances', resultado: lances('t-1', ['gol', 'gol', 'defesa']) });
    await partida(db, b, 60, { minigame: 'lances', resultado: lances('t-1', ['gol', 'gol', 'gol']), suspeita: true });
    const taxa = await como(db, null, 'service_role', 'select * from public.lances_taxa($1)', ['t-1']);
    expect(taxa).toEqual([{ tentativas: 16, gols: 4, pessoas: 2 }]);
    await expect(como(db, a, 'authenticated', 'select * from public.lances_taxa($1)', ['t-1'])).rejects.toThrow(/permission/);
    await expect(como(db, a, 'authenticated', 'select * from public.lances_tentativas')).rejects.toThrow(/permission/);
  });
});

describe('posição e recorde dos Lances recomeçam no corte', () => {
  let db: PGlite;
  let eu: string;
  let outro: string;
  beforeAll(async () => {
    db = await bancoDeTeste();
    await cortarEm(db, '2026-11-02 00:00:00-03', '2026-11-02');
    eu = await torcedor(db);
    outro = await torcedor(db);
    // Antes do corte: 140 nos pênaltis (tabela velha). Depois: pênaltis 90 e faltas 100; o outro faz 95 nas faltas.
    await partida(db, eu, 140, { dia: '2026-11-01', criada: '2026-11-01T12:00:00-03:00' });
    await partida(db, eu, 90, { dia: '2026-11-03', criada: '2026-11-03T12:00:00-03:00' });
    await partida(db, eu, 100, { minigame: 'lances', dia: '2026-11-04', criada: '2026-11-04T12:00:00-03:00' });
    await partida(db, outro, 95, { minigame: 'lances', dia: '2026-11-04', criada: '2026-11-04T12:00:00-03:00' });
  }, TEMPO);

  it('na semana do corte, "penaltis" e "lances" são uma posição só', async () => {
    for (const m of ['penaltis', 'lances']) {
      const [p] = await como(db, eu, 'authenticated', 'select * from public.minha_posicao_minigame($1, $2)', [m, '2026-11-04']);
      expect(p).toEqual({ posicao: 1, total: 2, pontos: 100 });
    }
    const [antes] = await como(db, eu, 'authenticated', 'select * from public.minha_posicao_minigame($1, $2)', ['penaltis', '2026-11-01']);
    expect(antes).toEqual({ posicao: 1, total: 1, pontos: 140 });
  });

  it('o recorde ignora o que foi criado antes do corte, e a herança antiga também', async () => {
    await db.query(`insert into public.recordes_herdados (torcedor_id, minigame, recorde, herdado_em) values ($1, 'penaltis', 200, '2026-10-20')`, [eu]);
    const recordes = await como<{ minigame: string; recorde: number }>(db, eu, 'authenticated', 'select * from public.meus_recordes() order by minigame');
    expect(recordes.filter((r) => r.minigame === 'penaltis' || r.minigame === 'lances')).toEqual([
      { minigame: 'lances', recorde: 100 },
      { minigame: 'penaltis', recorde: 100 },
    ]);
    const { rows } = await db.query<{ r: number }>(`select public.recorde_pessoal($1, 'penaltis', '2026-11-01T23:00:00-03:00') as r`, [eu]);
    expect(rows[0].r).toBe(200);
  });

  it('na junção de contas, a herança de antes do corte não barra a de depois', async () => {
    const dono = await torcedor(db);
    const origem = await torcedor(db);
    await db.query(`insert into public.recordes_herdados (torcedor_id, minigame, recorde, herdado_em) values ($1, 'penaltis', 200, '2026-10-20')`, [dono]);
    await partida(db, origem, 90, { dia: '2026-11-04', criada: '2026-11-04T12:00:00-03:00' });
    const impressao = createHash('sha256').update('JJJJ2222').digest('hex');
    await como(db, null, 'service_role', 'select public.codigo_gerar($1, $2)', [dono, impressao]);
    await como(db, null, 'service_role', 'select * from public.codigo_conferir($1, $2)', [origem, impressao]);
    await como(db, null, 'service_role', 'select * from public.juntar_torcedores($1, $2, null)', [impressao, origem]);
    const { rows } = await db.query<{ recorde: number }>(
      `select recorde from public.recordes_herdados where torcedor_id = $1 and minigame = 'penaltis'`,
      [dono],
    );
    expect(rows).toEqual([{ recorde: 90 }]);
    const recordes = await como<{ minigame: string; recorde: number }>(db, dono, 'authenticated', 'select * from public.meus_recordes()');
    expect(recordes.find((r) => r.minigame === 'lances')?.recorde).toBe(90);
  });

  it('na junção antes do corte, uma herança menor não substitui a maior', async () => {
    const velho = await bancoDeTeste();
    await cortarEm(velho, '2099-01-05 00:00:00-03', '2099-01-05');
    const dono = await torcedor(velho);
    const origem = await torcedor(velho);
    await velho.query(`insert into public.recordes_herdados (torcedor_id, minigame, recorde, herdado_em) values ($1, 'penaltis', 200, '2026-10-20')`, [dono]);
    await partida(velho, origem, 90, { dia: '2026-11-04', criada: '2026-11-04T12:00:00-03:00' });
    const impressao = createHash('sha256').update('KKKK3333').digest('hex');
    await como(velho, null, 'service_role', 'select public.codigo_gerar($1, $2)', [dono, impressao]);
    await como(velho, null, 'service_role', 'select * from public.codigo_conferir($1, $2)', [origem, impressao]);
    await como(velho, null, 'service_role', 'select * from public.juntar_torcedores($1, $2, null)', [impressao, origem]);
    const { rows } = await velho.query<{ recorde: number }>(
      `select recorde from public.recordes_herdados where torcedor_id = $1 and minigame = 'penaltis'`,
      [dono],
    );
    expect(rows).toEqual([{ recorde: 200 }]);
  }, TEMPO);
});

describe('permissões', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('começar partida e medalhas de outra pessoa só pelo servidor', async () => {
    const eu = await torcedor(db);
    for (const sql of [
      `select * from public.lances_comecar($1, 1, now(), '{}'::jsonb)`,
      `select * from public.penaltis_comecar($1, 1, 0.5, now(), 'normal', null, null, 3::smallint, ${SEMENTES})`,
      'select * from public.lances_hoje($1)',
      'select * from public.lances_hoje($1, now())',
      'select * from public.medalhas_de($1)',
    ]) {
      await expect(como(db, eu, 'authenticated', sql, [eu])).rejects.toThrow(/permission/);
      await expect(como(db, null, 'anon', sql, [eu])).rejects.toThrow(/permission/);
    }
    await expect(como(db, null, 'anon', 'select * from public.meus_lances_hoje()')).rejects.toThrow(/permission/);
    await expect(como(db, null, 'anon', 'select * from public.ver_desafio_lances($1)', ['abcdefgh'])).resolves.toEqual([]);
  });
});
