// Ranking da semana de minuto em minuto (20261102100000): o caminho novo (fila + atualizar_rankings)
// precisa dar exatamente o mesmo resultado da conta completa de antes. A referência é escrita aqui,
// como consulta só de leitura, igual ao CTE de recalcular_ranking. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const SEMANA = '2026-10-19'; // segunda
const SEMANA_B = '2026-10-26'; // segunda seguinte
const TEMPO = 120_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite, time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

/** Abre e fecha uma partida pelo caminho de verdade (fechar_partida). Devolve o id. */
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

/** Time do Dia fechado pelo caminho de verdade (fechar_dia). */
async function timeDoDia(db: PGlite, quem: string, pontos: number, dia: string) {
  await db.query(
    `insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, amistoso, versao)
     values ($1, $2, (select time_id from public.torcedores where id = $1), '{a}', false, 1)`,
    [quem, dia],
  );
  await db.query(`select * from public.fechar_dia($1, $2, 1, '{x,y}', true, $3::smallint, $4, false)`, [
    quem, dia, pontos, `${dia}T13:00:00-03:00`,
  ]);
}

/** Palpite num jogo novo e placar confirmado dando `pontos` para a semana (aplicar_pontos_crava). */
async function crava(db: PGlite, quem: string, pontos: number, semana: string, rodada: number) {
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

/** Uma pessoa por vez, como admin (suspeitas_decidir). */
async function decidirComoAdmin(db: PGlite, admin: string, id: string, liberar: boolean) {
  await db.query(`select set_config('teste.uid', $1, false)`, [admin]);
  await db.exec('set role authenticated');
  try {
    await db.query('select public.suspeitas_decidir($1, $2, $3)', ['penaltis', id, liberar]);
  } finally {
    await db.exec('reset role');
  }
}

async function apagarMeusDados(db: PGlite, uid: string) {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    await db.query('select public.apagar_meus_dados()');
  } finally {
    await db.exec('reset role');
  }
}

const rotina = (db: PGlite) => db.query('select public.atualizar_rankings()');

interface Linha {
  time_id: string;
  ativos: number;
  soma: number;
  media30: string;
  chegou_em: string | null;
  posicao_campeao: number;
  posicao_soma: number;
}

const COLUNAS = `time_id, ativos, soma, media30::text as media30, chegou_em::text as chegou_em, posicao_campeao, posicao_soma`;

/** A conta completa de antes, só leitura: igual ao CTE de recalcular_ranking. */
const REFERENCIA = `
  with totais as (
    select t.* from public.totais_semana($1::date) t
    join public.times tm on tm.id = t.time_id and tm.oficial
    union all
    select a.id, a.time_id, a.total, a.ultima from public.pontos_apagados a
    join public.times tm on tm.id = a.time_id and tm.oficial
    where a.semana = $1::date
  ),
  geral as (select coalesce(avg(total), 0) as media from totais),
  ordenados as (
    select o.*, row_number() over (partition by o.time_id order by o.total desc, o.ultima asc) as n from totais o
  ),
  por_time as (
    select t.id as time_id, count(o.torcedor_id)::integer as ativos, coalesce(sum(o.total), 0)::integer as soma,
      coalesce(sum(o.total) filter (where o.n <= 30), 0) as soma30,
      count(o.torcedor_id) filter (where o.n <= 30) as n30, max(o.ultima) as chegou_em
    from public.times t left join ordenados o on o.time_id = t.id
    where t.oficial group by t.id
  ),
  calc as (
    select pt.*, case when pt.ativos = 0 then 0 else (pt.soma30 + (30 - pt.n30) * 0.8 * g.media) / 30 end as media30
    from por_time pt cross join geral g
  ),
  ref as (
    select c.time_id, c.ativos, c.soma, round(c.media30, 2) as media30, c.chegou_em,
      row_number() over (order by round(c.media30, 2) desc, c.chegou_em asc nulls last, a.posicao_campeao asc nulls last, c.time_id)::integer as posicao_campeao,
      row_number() over (order by c.soma desc, c.chegou_em asc nulls last, c.time_id)::integer as posicao_soma
    from calc c
    left join public.fechamento_semana a on a.semana = $1::date - 7 and a.time_id = c.time_id
  )
  select ${COLUNAS} from ref order by time_id`;

const lerRanking = async (db: PGlite, semana: string) =>
  (await db.query<Linha>(`select ${COLUNAS} from public.ranking_semana where semana = $1 order by time_id`, [semana])).rows;

/** Roda a rotina e confere os 20 times contra a conta completa. Devolve as linhas do ranking. */
async function confere(db: PGlite, semana = SEMANA): Promise<Linha[]> {
  await rotina(db);
  const ref = (await db.query<Linha>(REFERENCIA, [semana])).rows;
  const atual = await lerRanking(db, semana);
  expect(ref).toHaveLength(20);
  expect(atual).toEqual(ref);
  return atual;
}

const por = (linhas: Linha[], time: string) => linhas.find((l) => l.time_id === time)!;
const fila = async (db: PGlite) => (await db.query<{ n: number }>('select count(*)::integer as n from public.ranking_fila')).rows[0].n;
const versao = async (db: PGlite, semana: string) =>
  (await db.query<{ versao: string }>('select versao::text from public.ranking_aviso where semana = $1', [semana])).rows[0]?.versao ?? '0';

describe('mesma conta do recálculo completo', () => {
  let db: PGlite;
  let admin: string;

  beforeAll(async () => {
    db = await bancoDeTeste();
    admin = uuid();
    await db.query('insert into auth.users (id) values ($1)', [admin]);
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
  }, TEMPO);

  it('várias partidas, Time do Dia e Crava de vários times: rotina só no fim = rotina entre as partidas', async () => {
    const pessoas = [
      await torcedor(db, 'bahia'), await torcedor(db, 'bahia'), await torcedor(db, 'remo'),
      await torcedor(db, 'vitoria'), await torcedor(db, 'athletico-pr'),
    ];
    await partida(db, pessoas[0], 80);
    await partida(db, pessoas[1], 55, { dia: '2026-10-21' });
    await partida(db, pessoas[2], 90, { dia: '2026-10-22' });
    await partida(db, pessoas[3], 40);
    await timeDoDia(db, pessoas[4], 70, '2026-10-23');
    await crava(db, pessoas[2], 120, SEMANA, 33);
    expect(await fila(db)).toBe(6);
    const fim = await confere(db);
    expect(por(fim, 'bahia').ativos).toBe(2);

    // Mesmas partidas com a rotina rodando entre elas, em outra semana: o ranking é o mesmo em forma.
    const outra = '2026-11-09';
    const meio: Linha[][] = [];
    for (const [i, quem] of pessoas.entries()) {
      await partida(db, quem, [80, 55, 90, 40, 70][i], { dia: '2026-11-10', semana: outra });
      meio.push(await confere(db, outra));
    }
    const final = meio[meio.length - 1];
    expect(por(final, 'remo').soma).toBe(90);
    expect(por(final, 'bahia').soma).toBe(135);
    // Mesmos pontos nas duas semanas (menos o Time do Dia e o Crava, que só entraram na primeira).
    expect(por(fim, 'bahia').soma).toBe(por(final, 'bahia').soma);
  }, TEMPO);

  it('suspeita fica fora; liberada por suspeitas_decidir volta depois da rotina', async () => {
    // suspeitas_decidir só anota semana ainda aberta pelo relógio: usa a semana de hoje.
    const dia = (await db.query<{ d: string }>(`select public.hoje_brasilia()::text as d`)).rows[0].d;
    const sem = (await db.query<{ d: string }>(`select public.semana_de(public.hoje_brasilia())::text as d`)).rows[0].d;
    const a = await torcedor(db, 'palmeiras');
    await partida(db, a, 30, { dia, semana: sem });
    const p = await partida(db, a, 500, { dia, semana: sem, suspeita: true });
    const antes = por(await confere(db, sem), 'palmeiras');
    await decidirComoAdmin(db, admin, p, true);
    expect(await fila(db)).toBe(1);
    const depois = por(await confere(db, sem), 'palmeiras');
    expect(depois.soma).toBe(antes.soma + 500);

    // Mantida fora: nada entra, e a conta segue igual.
    const b = await torcedor(db, 'palmeiras');
    const q = await partida(db, b, 300, { dia, semana: sem, suspeita: true });
    await confere(db, sem);
    await decidirComoAdmin(db, admin, q, false);
    expect(por(await confere(db, sem), 'palmeiras').soma).toBe(depois.soma);
  }, TEMPO);

  it('pontos apagados: apagar_meus_dados não muda o placar, e a soma continua dentro', async () => {
    const a = await torcedor(db, 'vasco');
    const b = await torcedor(db, 'vasco');
    await partida(db, a, 75);
    await partida(db, b, 25);
    await timeDoDia(db, a, 30, '2026-10-24');
    const antes = await confere(db);
    await apagarMeusDados(db, a);
    // Força a conta de novo depois de apagar: o placar tem de ser o mesmo.
    await db.query('select public.marcar_ranking($1)', [SEMANA]);
    const depois = await confere(db);
    expect(depois).toEqual(antes);
    expect(por(depois, 'vasco').soma).toBe(130);
    expect(por(depois, 'vasco').ativos).toBe(2);
  }, TEMPO);

  it('time não oficial (outro) fica fora do ranking', async () => {
    const a = await torcedor(db, 'outro');
    await partida(db, a, 999);
    const linhas = await confere(db);
    expect(linhas.some((l) => l.time_id === 'outro')).toBe(false);
  }, TEMPO);

  it('empate de média: decide quem chegou primeiro', async () => {
    // Em outra semana, para a conta ficar só com os dois times.
    const sem = '2026-11-16';
    const x = await torcedor(db, 'fluminense');
    const y = await torcedor(db, 'botafogo');
    await partida(db, y, 60, { dia: '2026-11-18', semana: sem }); // chegou depois
    await partida(db, x, 60, { dia: '2026-11-17', semana: sem }); // chegou antes
    const linhas = await confere(db, sem);
    expect(por(linhas, 'fluminense').media30).toBe(por(linhas, 'botafogo').media30);
    expect(por(linhas, 'fluminense').posicao_campeao).toBe(1);
    expect(por(linhas, 'botafogo').posicao_campeao).toBe(2);
  }, TEMPO);

  it('corte dos 30 melhores e vagas emprestadas a 80% da média geral', async () => {
    const sem = '2026-11-23';
    // 34 no Santos: só os 30 melhores contam na média; a soma leva todos.
    for (let i = 0; i < 34; i++) {
      await partida(db, await torcedor(db, 'santos'), 10 + i, { dia: '2026-11-24', semana: sem });
    }
    // 3 no Cruzeiro: faltam 27 vagas.
    for (const pts of [90, 50, 20]) {
      await partida(db, await torcedor(db, 'cruzeiro'), pts, { dia: '2026-11-24', semana: sem });
    }
    const linhas = await confere(db, sem);
    expect(por(linhas, 'santos').ativos).toBe(34);
    expect(por(linhas, 'cruzeiro').ativos).toBe(3);
    // Cruzeiro vale menos que a soma/30 cheia só por causa das vagas emprestadas, nunca zero.
    expect(Number(por(linhas, 'cruzeiro').media30)).toBeGreaterThan(160 / 30);
  }, TEMPO);
});

describe('semana virando, rotina vazia e fila', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  it('duas semanas na mesma fila: uma rotina refaz as duas; fechar_semana consome a fila sem rotina', async () => {
    const a = await torcedor(db, 'bahia');
    const b = await torcedor(db, 'remo');
    await partida(db, a, 100);
    await partida(db, b, 60);
    await partida(db, a, 40, { dia: '2026-10-28', semana: SEMANA_B });
    await partida(db, b, 70, { dia: '2026-10-28', semana: SEMANA_B });
    expect(await fila(db)).toBe(4);
    expect((await rotina(db)).rows[0]).toEqual({ atualizar_rankings: 2 });
    // A rotina já rodou: confere (que roda de novo, sem nada na fila) das duas semanas.
    await confere(db, SEMANA_B);
    await confere(db, SEMANA);

    // Provisória na segunda 00h05.
    await db.query('select public.fechar_semana($1, $2)', [SEMANA, '2026-10-26T00:05:00-03:00']);
    const provisoria = (await db.query<Linha>(`select ${COLUNAS} from public.fechamento_semana where semana = $1 order by time_id`, [SEMANA])).rows;
    expect(provisoria).toEqual(await lerRanking(db, SEMANA));

    // Evento anotado depois da provisória e antes da trava: a fila é consumida pelo fechamento.
    await partida(db, b, 80, { dia: '2026-10-25' });
    expect(await fila(db)).toBe(1);
    await db.query('select public.fechar_semana($1, $2)', [SEMANA, '2026-10-26T12:00:00-03:00']);
    expect(await fila(db)).toBe(0);
    const trava = (await db.query<Linha & { confirmada_em: string | null }>(
      `select ${COLUNAS}, confirmada_em from public.fechamento_semana where semana = $1 order by time_id`, [SEMANA])).rows;
    expect(trava.every((l) => l.confirmada_em !== null)).toBe(true);
    const ranking = await lerRanking(db, SEMANA);
    expect(trava.map(({ confirmada_em, ...l }) => l)).toEqual(ranking);
    expect(por(ranking, 'remo').soma).toBe(140);
    // E bate com a conta completa (a rotina não mexe em semana travada).
    await confere(db, SEMANA);
  }, TEMPO);

  it('rotina sem nada na fila não regrava nada; com mudança, a versão sobe 1 por rotina', async () => {
    const semana = '2026-11-02';
    const dia = '2026-11-03';
    const a = await torcedor(db, 'vasco');
    await partida(db, a, 50, { dia, semana });
    await rotina(db);
    const marca = async () =>
      (await db.query<{ time_id: string; atualizado_em: string }>(
        `select time_id, atualizado_em::text from public.ranking_semana where semana = $1 order by time_id`, [semana])).rows;
    const v0 = await versao(db, semana);
    const antes = await marca();

    // Nada na fila.
    expect(await fila(db)).toBe(0);
    await rotina(db);
    // Anotada mas sem mudança de verdade: recalcula e não regrava.
    await db.query('select public.marcar_ranking($1)', [semana]);
    await rotina(db);
    expect(await marca()).toEqual(antes);
    expect(await versao(db, semana)).toBe(v0);

    // Três partidas, uma rotina: versão sobe 1.
    for (const pts of [20, 30, 40]) await partida(db, await torcedor(db, 'vasco'), pts, { dia, semana });
    expect(await fila(db)).toBe(3);
    await rotina(db);
    expect(await versao(db, semana)).toBe(String(Number(v0) + 1));
    await confere(db, semana);
    expect(await versao(db, semana)).toBe(String(Number(v0) + 1));
  }, TEMPO);

  it('a fila esvazia depois da rotina; evento em transação desfeita não deixa linha', async () => {
    await partida(db, await torcedor(db, 'bahia'), 10);
    expect(await fila(db)).toBe(1);
    await rotina(db);
    expect(await fila(db)).toBe(0);

    await db.transaction(async (tx) => {
      await tx.query('select public.marcar_ranking($1)', [SEMANA]);
      expect((await tx.query<{ n: number }>('select count(*)::integer as n from public.ranking_fila')).rows[0].n).toBe(1);
      await tx.rollback();
    });
    expect(await fila(db)).toBe(0);
  }, TEMPO);
});
