// "Apagar meus dados" (20261031100200): sai tudo da pessoa, em cascata, e os pontos que já foram para a
// torcida continuam no placar, sem nenhum id. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const SEMANA = '2026-10-19'; // segunda
const DIA = '2026-10-20';
const SEMANA_PASSADA = '2026-10-12';
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(db: PGlite, time: string, anonimo = true): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous) values ($1, $2)', [id, anonimo]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, $2, '18_mais')`, [id, time]);
  return id;
}

async function partida(db: PGlite, quem: string, pontos: number, o: { dia?: string; semana?: string; suspeita?: boolean; desafio?: string } = {}): Promise<string> {
  const dia = o.dia ?? DIA;
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, desafio_id, semente, dificuldade, expira_em)
     values ($1, $2, $3, 1, 0.5, now() + interval '15 minutes')
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem, o.desafio ? 'desafio' : 'normal', o.desafio ?? null],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id,
    quem,
    rows[0].time_id,
    '{}',
    '{}',
    pontos,
    dia,
    o.semana ?? SEMANA,
    `${dia}T12:00:00-03:00`,
    o.suspeita ? 'teste' : null,
    null,
    null,
  ]);
  return rows[0].id;
}

async function como<T>(uid: string | null, papel: 'authenticated' | 'anon', sql: string): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec('reset role');
  }
}

const apagar = (uid: string) => como(uid, 'authenticated', 'select public.apagar_meus_dados()');

async function placar(semana = SEMANA) {
  await db.query('select public.recalcular_ranking($1)', [semana]);
  const { rows } = await db.query<{ time_id: string; ativos: number; soma: number; media30: string; posicao_campeao: number }>(
    `select time_id, ativos, soma, media30, posicao_campeao from public.ranking_semana where semana = $1 and ativos > 0 order by time_id`,
    [semana],
  );
  return rows;
}

let db: PGlite;
let ana: string;
let bia: string;
let chave: string;
let antes: Awaited<ReturnType<typeof placar>>;
let antesDaSemanaPassada: Awaited<ReturnType<typeof placar>>;

beforeAll(async () => {
  db = await bancoDeTeste();
  ana = await torcedor(db, 'bahia');
  bia = await torcedor(db, 'bahia');
  const partidaAna = await partida(db, ana, 80);
  await partida(db, ana, 999, { suspeita: true });
  await partida(db, ana, 40, { dia: '2026-10-13', semana: SEMANA_PASSADA });
  await partida(db, bia, 30);

  await db.query(
    `insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, acertou, pontos, amistoso, sob_suspeita, fechada_em)
     values ($1, $2, 'bahia', '{x}', true, 55, false, false, now())`,
    [ana, DIA],
  );
  const { rows: jogo } = await db.query<{ id: string }>(
    `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values (33, 'bahia', 'remo', now() + interval '1 day') returning id`,
  );
  await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 1, 0)', [ana, jogo[0].id]);
  await db.query(`insert into public.crava_pontos (torcedor_id, jogo_id, rodada, time_id, semana, pontos) values ($1, $2, 33, 'bahia', $3, 20)`, [ana, jogo[0].id, SEMANA]);

  // Desafio de Ana que Bia aceitou: a partida de Bia continua, sem o vínculo.
  chave = 'abcd1234';
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos)
     values ($1, $2, $3, 'bahia', '[]', 3, 2, 80)`,
    [chave, partidaAna, ana],
  );
  await partida(db, bia, 25, { desafio: chave });

  await db.query(`insert into public.feedbacks (usuario_id, tipo, texto) values ($1, 'ideia', 'gostei do jogo')`, [ana]);
  await db.query(
    `insert into public.push_inscricoes (endpoint, p256dh, auth, torcedor_id) values ('https://fcm.googleapis.com/a', $1, $2, $3)`,
    ['B'.repeat(87), 'a'.repeat(22), ana],
  );

  antes = await placar();
  antesDaSemanaPassada = await placar(SEMANA_PASSADA);
  await apagar(ana);
}, TEMPO);

describe('apagar meus dados', () => {
  it('não sobra nada da pessoa em nenhuma tabela', async () => {
    const { rows: tabelas } = await db.query<{ t: string; c: string }>(
      `select table_name as t, column_name as c from information_schema.columns
       where table_schema = 'public' and data_type = 'uuid' and column_name in ('torcedor_id', 'usuario_id', 'id')`,
    );
    for (const { t, c } of tabelas) {
      const { rows } = await db.query<{ n: number }>(`select count(*)::integer as n from public.${t} where ${c} = $1`, [ana]);
      expect(rows[0].n, `${t}.${c}`).toBe(0);
    }
    const { rows } = await db.query<{ n: number }>('select count(*)::integer as n from auth.users where id = $1', [ana]);
    expect(rows[0].n).toBe(0);
  }, TEMPO);

  it('os pontos que já foram para a torcida continuam no placar, igual, mesmo recalculando', async () => {
    expect(await placar()).toEqual(antes);
    expect(await placar(SEMANA_PASSADA)).toEqual(antesDaSemanaPassada);
    expect(antes.find((l) => l.time_id === 'bahia')?.soma).toBe(80 + 55 + 20 + 30 + 25);
  }, TEMPO);

  it('o que fica guardado é só semana, time, total e hora, sem id da pessoa', async () => {
    const { rows } = await db.query<Record<string, unknown>>('select semana, time_id, total from public.pontos_apagados order by semana');
    expect(rows.map((r) => r.total)).toEqual([40, 155]);
    const { rows: colunas } = await db.query<{ c: string }>(
      `select column_name as c from information_schema.columns where table_schema = 'public' and table_name = 'pontos_apagados' order by 1`,
    );
    expect(colunas.map((r) => r.c)).toEqual(['id', 'semana', 'time_id', 'total', 'ultima']);
  }, TEMPO);

  it('partida sob suspeita não vira ponto guardado', async () => {
    const { rows } = await db.query<{ soma: number }>('select sum(total)::integer as soma from public.pontos_apagados');
    expect(rows[0].soma).toBe(195);
  }, TEMPO);

  it('o feedback fica, sem o usuário', async () => {
    const { rows } = await db.query<{ usuario_id: string | null }>(`select usuario_id from public.feedbacks where texto = 'gostei do jogo'`);
    expect(rows).toEqual([{ usuario_id: null }]);
  }, TEMPO);

  it('a outra pessoa não perde nada: a partida do desafio fica, sem o vínculo', async () => {
    const { rows } = await db.query<{ pontos: number; desafio_id: string | null }>(
      'select pontos, desafio_id from public.partidas where torcedor_id = $1 order by pontos',
      [bia],
    );
    expect(rows).toEqual([
      { pontos: 25, desafio_id: null },
      { pontos: 30, desafio_id: null },
    ]);
  }, TEMPO);

  it('apagar de novo com a sessão antiga não faz nada', async () => {
    await expect(apagar(ana)).resolves.toBeDefined();
    const { rows } = await db.query<{ n: number }>('select count(*)::integer as n from public.pontos_apagados');
    expect(rows[0].n).toBe(2);
  }, TEMPO);

  it('sem login é recusado, e conta que não é anônima não se apaga por aqui', async () => {
    await expect(como(null, 'anon', 'select public.apagar_meus_dados()')).rejects.toThrow(/permission denied/);
    await expect(como(null, 'authenticated', 'select public.apagar_meus_dados()')).rejects.toThrow(/sem_login/);

    const comEmail = await torcedor(db, 'remo', false);
    await expect(apagar(comEmail)).rejects.toThrow(/conta_nao_anonima/);
    const admin = await torcedor(db, 'remo');
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
    await expect(apagar(admin)).rejects.toThrow(/conta_nao_anonima/);
    const { rows } = await db.query<{ n: number }>('select count(*)::integer as n from auth.users where id in ($1, $2)', [comEmail, admin]);
    expect(rows[0].n).toBe(2);
  }, TEMPO);

  it('o celular não lê nem grava os pontos guardados', async () => {
    await expect(como(bia, 'authenticated', 'select * from public.pontos_apagados')).rejects.toThrow(/permission denied/);
    await expect(
      como(bia, 'authenticated', `insert into public.pontos_apagados (semana, time_id, total) values ('${SEMANA}', 'bahia', 999)`),
    ).rejects.toThrow(/permission denied/);
  }, TEMPO);

  it('o zerar da pré-temporada leva os pontos guardados junto', async () => {
    await db.exec(readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8'));
    const { rows } = await db.query<{ n: number }>('select count(*)::integer as n from public.pontos_apagados');
    expect(rows[0].n).toBe(0);
    expect(await placar()).toEqual([]);
  }, TEMPO);
});
