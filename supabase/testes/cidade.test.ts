// Cidade, a segunda camisa (20261105000000): cada ponto vai para a cidade que valia na hora dele, cidade e
// estado só entram com 5+, a conta é a da semana (30 melhores; 100 no estado; vagas a 80%), quem apaga os
// dados deixa os pontos e a semana travada não muda. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 120_000;

const SP = 3550308;
const CARAGUA = 3510500;
const UBATUBA = 3555406;
const RIO = 3304557;
const NITEROI = 3303302;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;

async function torcedor(time = 'flamengo'): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

/** Cidade escolhida a partir de `desde` (direto no histórico, para controlar a hora). */
async function cidade(quem: string, codigo: number | null, desde: string): Promise<void> {
  await db.query('insert into public.torcedor_cidades (torcedor_id, codigo, desde) values ($1, $2, $3)', [quem, codigo, desde]);
}

/** Abre e fecha uma partida pelo caminho de verdade (fechar_partida), no dia e na hora dados. */
async function partida(quem: string, pontos: number, semana: string, dia: string, hora = '12:00:00'): Promise<void> {
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes')
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id, quem, rows[0].time_id, '{}', '{}', pontos, dia, semana, `${dia}T${hora}-03:00`, null, null, null,
  ]);
}

async function comoUsuario<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
  await db.exec(uid ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('teste.uid', '', false)`);
  }
}

const rotina = () => db.query('select public.atualizar_rankings()');

interface LinhaCidade {
  posicao: number;
  codigo: number;
  nome: string;
  uf: string;
  ativos: number;
  media30: string;
}

const cidadesDoEstado = (semana: string, uf: string) =>
  comoUsuario(null, async () =>
    (await db.query<LinhaCidade>('select * from public.ranking_cidades($1, $2)', [semana, uf])).rows);

const estados = (semana: string) =>
  comoUsuario(null, async () =>
    (await db.query<{ posicao: number; uf: string; ativos: number; media30: string }>(
      'select * from public.ranking_estados($1)', [semana])).rows);

const minhaSemana = (uid: string, semana: string) =>
  comoUsuario(uid, async () =>
    (await db.query<Record<string, unknown>>('select * from public.minha_cidade_semana($1)', [semana])).rows[0]);

/** Um grupo de pessoas numa cidade, cada uma com uma partida de `pontos[i]` no dia. */
async function grupo(codigo: number, desde: string, semana: string, dia: string, pontos: number[]): Promise<string[]> {
  const ids: string[] = [];
  for (const p of pontos) {
    const id = await torcedor();
    await cidade(id, codigo, desde);
    await partida(id, p, semana, dia);
    ids.push(id);
  }
  return ids;
}

beforeAll(async () => {
  db = await bancoDeTeste();
  await db.exec(`
    insert into public.municipios (codigo, nome, uf) values
      (${SP}, 'São Paulo', 'SP'), (${CARAGUA}, 'Caraguatatuba', 'SP'), (${UBATUBA}, 'Ubatuba', 'SP'),
      (${RIO}, 'Rio de Janeiro', 'RJ'), (${NITEROI}, 'Niterói', 'RJ')
    on conflict (codigo) do nothing;
  `);
}, TEMPO);

describe('cidade', () => {
  it('o ponto vai para a cidade que valia na hora dele; antes de escolher não conta', async () => {
    const semana = '2026-09-28';
    const eu = await torcedor();
    await partida(eu, 10, semana, '2026-09-29');
    await cidade(eu, CARAGUA, '2026-09-30T00:00:00-03:00');
    await partida(eu, 20, semana, '2026-10-01');
    await cidade(eu, UBATUBA, '2026-10-02T00:00:00-03:00');
    await partida(eu, 40, semana, '2026-10-03');
    await cidade(eu, null, '2026-10-04T00:00:00-03:00');
    await partida(eu, 80, semana, '2026-10-04', '13:00:00');

    const { rows } = await db.query<{ cidade: number; total: number }>(
      'select cidade, total from public.totais_cidade_semana($1) where torcedor_id = $2 order by cidade', [semana, eu]);
    expect(rows).toEqual([
      { cidade: CARAGUA, total: 20 },
      { cidade: UBATUBA, total: 40 },
    ]);
  }, TEMPO);

  it('abaixo de 5 a cidade fica de fora, mas soma para o estado; o jogo diz quantos faltam', async () => {
    const semana = '2026-10-05';
    const desde = '2026-10-01T00:00:00-03:00';
    const caragua = await grupo(CARAGUA, desde, semana, '2026-10-06', [50, 60, 70]);
    await grupo(UBATUBA, desde, semana, '2026-10-06', [40, 30]);
    await rotina();

    expect(await cidadesDoEstado(semana, 'SP')).toEqual([]);
    const sp = await estados(semana);
    expect(sp).toHaveLength(1);
    expect(sp[0]).toMatchObject({ posicao: 1, uf: 'SP', ativos: 5 });

    const minha = await minhaSemana(caragua[0], semana);
    expect(minha).toMatchObject({
      codigo: CARAGUA, nome: 'Caraguatatuba', uf: 'SP', ativos: 3, minimo: 5, faltam: 2,
      posicao_estado: null, media30: null, rival_codigo: null, uf_posicao: 1, estados_no_ranking: 1,
    });
  }, TEMPO);

  it('com 5+ entra: média dos 30 melhores com vagas a 80%, posição e rival', async () => {
    const semana = '2026-10-12';
    const desde = '2026-10-01T00:00:00-03:00';
    const capital = await grupo(SP, desde, semana, '2026-10-13', [100, 90, 80, 70, 60, 50]);
    const litoral = await grupo(CARAGUA, desde, semana, '2026-10-13', [30, 30, 30, 30, 30]);
    await grupo(RIO, desde, semana, '2026-10-13', [10]);
    await rotina();

    const todos = [100, 90, 80, 70, 60, 50, 30, 30, 30, 30, 30, 10];
    const media = todos.reduce((a, b) => a + b, 0) / todos.length;
    const esperado = (soma: number, n: number, vagas: number) => ((soma + (vagas - n) * 0.8 * media) / vagas).toFixed(2);

    const lista = await cidadesDoEstado(semana, 'sp');
    expect(lista.map((l) => [l.posicao, l.codigo, l.ativos, Number(l.media30).toFixed(2)])).toEqual([
      [1, SP, 6, esperado(450, 6, 30)],
      [2, CARAGUA, 5, esperado(150, 5, 30)],
    ]);
    // RJ tem 1 jogador: nem a cidade nem o estado aparecem.
    expect(await cidadesDoEstado(semana, 'RJ')).toEqual([]);
    const ests = await estados(semana);
    expect(ests.map((e) => [e.posicao, e.uf, e.ativos, Number(e.media30).toFixed(2)])).toEqual([
      [1, 'SP', 11, esperado(600, 11, 100)],
    ]);

    const top = await comoUsuario(null, async () =>
      (await db.query<LinhaCidade>('select * from public.ranking_cidades_top($1)', [semana])).rows);
    expect(top.map((l) => l.codigo)).toEqual([SP, CARAGUA]);

    expect(await minhaSemana(litoral[0], semana)).toMatchObject({
      posicao_estado: 2, cidades_no_estado: 2, faltam: 0, rival_codigo: SP, rival_nome: 'São Paulo', rival_acima: true,
    });
    expect(await minhaSemana(capital[0], semana)).toMatchObject({
      posicao_estado: 1, rival_codigo: CARAGUA, rival_acima: false,
    });
  }, TEMPO);

  it('escolher_cidade: valida o código, vale dali em diante e não grava repetido', async () => {
    const eu = await torcedor();
    await expect(comoUsuario(eu, () => db.query('select public.escolher_cidade(1234567)'))).rejects.toThrow(/cidade_invalida/);

    await comoUsuario(eu, () => db.query('select public.escolher_cidade($1)', [NITEROI]));
    await comoUsuario(eu, () => db.query('select public.escolher_cidade($1)', [NITEROI]));
    const minha = await comoUsuario(eu, async () => (await db.query<{ nome: string; uf: string }>('select * from public.minha_cidade()')).rows);
    expect(minha).toMatchObject([{ nome: 'Niterói', uf: 'RJ' }]);
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.torcedor_cidades where torcedor_id = $1', [eu]);
    expect(rows[0].n).toBe(1);

    await comoUsuario(eu, () => db.query('select public.escolher_cidade(null)'));
    expect(await comoUsuario(eu, async () => (await db.query('select * from public.minha_cidade()')).rows)).toEqual([]);

    const dados = await comoUsuario(eu, async () =>
      (await db.query<{ d: { cidade: unknown; escolhas_de_cidade: number } }>('select public.ver_meus_dados() as d')).rows[0].d);
    expect(dados.cidade).toBeNull();
    expect(dados.escolhas_de_cidade).toBe(2);
  }, TEMPO);

  it('ninguém lê as tabelas de ranking nem o histórico de outra pessoa', async () => {
    const eu = await torcedor();
    const outro = await torcedor();
    await cidade(outro, SP, '2026-10-01T00:00:00-03:00');
    await expect(comoUsuario(null, () => db.query('select * from public.ranking_cidade_semana'))).rejects.toThrow(/permission denied/);
    await expect(comoUsuario(eu, () => db.query('select * from public.ranking_estado_semana'))).rejects.toThrow(/permission denied/);
    const vistos = await comoUsuario(eu, async () => (await db.query('select * from public.torcedor_cidades')).rows);
    expect(vistos).toEqual([]);
    await expect(
      comoUsuario(eu, () => db.query('insert into public.torcedor_cidades (torcedor_id, codigo) values ($1, $2)', [eu, SP])),
    ).rejects.toThrow(/permission denied|row-level security/);
  }, TEMPO);

  it('quem apaga os dados deixa os pontos na cidade', async () => {
    const semana = '2026-10-19';
    const desde = '2026-10-01T00:00:00-03:00';
    const ids = await grupo(UBATUBA, desde, semana, '2026-10-20', [70, 60, 50, 40, 30]);
    await rotina();
    const antes = await cidadesDoEstado(semana, 'SP');

    await comoUsuario(ids[0], () => db.query('select public.apagar_meus_dados()'));
    const { rows } = await db.query<{ n: number }>(
      'select count(*)::int as n from public.pontos_apagados_cidade where semana = $1 and cidade = $2', [semana, UBATUBA]);
    expect(rows[0].n).toBe(1);
    await db.query('select public.marcar_ranking($1)', [semana]);
    await rotina();
    expect(await cidadesDoEstado(semana, 'SP')).toEqual(antes);
  }, TEMPO);

  it('quem apaga os dados depois de jogar por duas cidades do estado conta uma vez só no estado', async () => {
    const semana = '2026-08-31';
    const desde = '2026-08-01T00:00:00-03:00';
    await grupo(SP, desde, semana, '2026-09-01', [10, 10, 10]);
    const dupla = await torcedor();
    await cidade(dupla, CARAGUA, desde);
    await partida(dupla, 20, semana, '2026-09-01');
    await cidade(dupla, UBATUBA, '2026-09-02T00:00:00-03:00');
    await partida(dupla, 20, semana, '2026-09-03');
    await rotina();
    expect(await estados(semana)).toEqual([]); // 4 pessoas: o estado fica de fora

    await comoUsuario(dupla, () => db.query('select public.apagar_meus_dados()'));
    await db.query('select public.marcar_ranking($1)', [semana]);
    await rotina();
    expect(await estados(semana)).toEqual([]);
    const { rows } = await db.query<{ ativos: number }>(
      `select ativos from public.ranking_estado_semana where semana = $1 and uf = 'SP'`, [semana]);
    expect(rows[0].ativos).toBe(4);
  }, TEMPO);

  it('partida que vira suspeita sai da cidade; "Outro time" também soma', async () => {
    const semana = '2026-09-07';
    const desde = '2026-09-01T00:00:00-03:00';
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await torcedor(i === 0 ? 'outro' : 'bahia');
      await cidade(id, NITEROI, desde);
      await partida(id, 30, semana, '2026-09-08');
      ids.push(id);
    }
    await rotina();
    expect((await cidadesDoEstado(semana, 'RJ')).map((l) => [l.codigo, l.ativos])).toEqual([[NITEROI, 5]]);

    await db.query('update public.partidas set sob_suspeita = true where torcedor_id = $1', [ids[1]]);
    await db.query('select public.marcar_ranking($1)', [semana]);
    await rotina();
    expect(await cidadesDoEstado(semana, 'RJ')).toEqual([]);
    const { rows } = await db.query<{ ativos: number }>(
      'select ativos from public.ranking_cidade_semana where semana = $1 and cidade = $2', [semana, NITEROI]);
    expect(rows[0].ativos).toBe(4);
  }, TEMPO);

  it('a rotina manda um aviso só por semana, mesmo quando times e cidades mudam', async () => {
    const semana = '2026-09-14';
    await grupo(RIO, '2026-09-01T00:00:00-03:00', semana, '2026-09-15', [40]);
    await rotina();
    const antes = (await db.query<{ versao: number }>('select versao::int from public.ranking_aviso where semana = $1', [semana])).rows[0].versao;
    await grupo(RIO, '2026-09-01T00:00:00-03:00', semana, '2026-09-16', [50]);
    await rotina();
    const depois = (await db.query<{ versao: number }>('select versao::int from public.ranking_aviso where semana = $1', [semana])).rows[0].versao;
    expect(depois).toBe(antes + 1);
  }, TEMPO);

  it('escolher_cidade: sem time não escolhe; mais de 20 trocas no dia, não', async () => {
    const semTime = uuid();
    await db.query('insert into auth.users (id) values ($1)', [semTime]);
    await expect(comoUsuario(semTime, () => db.query('select public.escolher_cidade($1)', [SP]))).rejects.toThrow(/sem_torcedor/);

    const eu = await torcedor();
    for (let i = 0; i < 20; i++) {
      await comoUsuario(eu, () => db.query('select public.escolher_cidade($1)', [i % 2 ? SP : RIO]));
    }
    await expect(comoUsuario(eu, () => db.query('select public.escolher_cidade($1)', [NITEROI]))).rejects.toThrow(/muitas_trocas/);
    const meus = await comoUsuario(eu, async () => (await db.query('select * from public.torcedor_cidades')).rows);
    expect(meus).toHaveLength(20);
  }, TEMPO);

  it('semana travada não muda; o fechamento refaz as cidades antes de travar', async () => {
    const semana = '2026-10-26';
    const desde = '2026-10-01T00:00:00-03:00';
    await grupo(RIO, desde, semana, '2026-10-27', [20, 20, 20, 20]);
    // Fila esvaziada sem refazer as cidades: o fechamento é quem tem de refazer.
    const quinto = await torcedor();
    await cidade(quinto, RIO, desde);
    await partida(quinto, 20, semana, '2026-10-28');
    await db.query('delete from public.ranking_fila');
    expect(await cidadesDoEstado(semana, 'RJ')).toEqual([]);

    await db.query('select public.fechar_semana($1, $2)', [semana, '2026-11-02T12:30:00-03:00']);
    const fechada = await cidadesDoEstado(semana, 'RJ');
    expect(fechada.map((l) => [l.posicao, l.codigo, l.ativos])).toEqual([[1, RIO, 5]]);

    const tarde = await torcedor();
    await cidade(tarde, NITEROI, desde);
    await partida(tarde, 90, semana, '2026-11-01');
    await rotina();
    expect(await cidadesDoEstado(semana, 'RJ')).toEqual(fechada);
  }, TEMPO);
});
