// Termos × jogo (20261102000100): "Ver meus dados" devolve só o que é de quem chama, e o #admin apaga um
// apelido exato sem guardar o apelido. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;

async function torcedor(time: string, apelido: string | null, anonimo = true): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous) values ($1, $2)', [id, anonimo]);
  await db.query(`insert into public.torcedores (id, time_id, apelido, faixa_etaria) values ($1, $2, $3, '16_17')`, [id, time, apelido]);
  return id;
}

async function como<T>(uid: string | null, papel: 'authenticated' | 'anon', sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

async function partida(quem: string, minigame: 'penaltis' | 'prova'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, fechada_em, pontos, time_id, dia, semana)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes', $2, now(), 50, 'bahia', '2026-10-20', '2026-10-19')
     returning id`,
    [quem, minigame],
  );
  return rows[0].id;
}

let ana: string;
let bia: string;
let admin: string;

beforeAll(async () => {
  db = await bancoDeTeste();
  ana = await torcedor('bahia', 'Ana Gol');
  bia = await torcedor('remo', 'Ana Gol');
  await torcedor('remo', 'ana gol');
  admin = await torcedor('remo', null, false);
  await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);

  const p = await partida(ana, 'penaltis');
  await partida(ana, 'penaltis');
  const prova = await partida(ana, 'prova');
  await partida(bia, 'penaltis');
  await db.query(
    `insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, apelido, perguntas, pontos, escada, resumo)
     values ('prova123', $1, $2, 'bahia', 'Ana Gol', array['a','b','c','d','e','f','g','h'], 70, 'x', 'parei na 6ª')`,
    [prova, ana],
  );
  const { rows: jogo } = await db.query<{ id: string }>(
    `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values (33, 'bahia', 'remo', now() + interval '1 day') returning id`,
  );
  await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 1, 0)', [ana, jogo[0].id]);
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, apelido, cobrancas, gols_jogador, gols_maquina, pontos)
     values ('abcd1234', $1, $2, 'bahia', 'Ana Gol', '[]', 3, 2, 80)`,
    [p, ana],
  );
  await db.query(
    `insert into public.dia_partidas (torcedor_id, dia, time_id, tentativas, acertou, pontos, amistoso, fechada_em)
     values ($1, '2026-10-20', 'bahia', '{x}', true, 55, false, now())`,
    [ana],
  );
  await db.query(`insert into public.feedbacks (usuario_id, tipo, texto, tela, aparelho) values ($1, 'bug', 'o card cortou', 'inicio', 'Firefox')`, [ana]);
  await db.query(`insert into public.feedbacks (usuario_id, tipo, texto) values ($1, 'ideia', 'segredo da Bia')`, [bia]);
  await db.query(
    `insert into public.push_inscricoes (endpoint, p256dh, auth, torcedor_id) values ('https://fcm.googleapis.com/a', $1, $2, $3)`,
    ['B'.repeat(87), 'a'.repeat(22), ana],
  );
}, TEMPO);

const meusDados = async (uid: string | null) =>
  (await como<{ d: Record<string, unknown> | null }>(uid, 'authenticated', 'select public.ver_meus_dados() as d'))[0].d;

describe('ver meus dados', () => {
  it('mostra o que o servidor guarda de quem chama', async () => {
    const d = await meusDados(ana);
    expect(d).toMatchObject({
      torcedor: { time_id: 'bahia', apelido: 'Ana Gol', faixa_etaria: '16_17' },
      partidas: { penaltis: 2, prova: 1 },
      time_do_dia: 1,
      desafios: 2,
      palpites: 1,
      avisos: 1,
      mensagens: [{ tipo: 'bug', texto: 'o card cortou', tela: 'inicio', aparelho: 'Firefox' }],
    });
    expect(typeof d!.carreira_xp).toBe('number');
  }, TEMPO);

  it('nunca mostra o de outra pessoa', async () => {
    const d = await meusDados(bia);
    expect(d).toMatchObject({ partidas: { penaltis: 1 }, time_do_dia: 0, desafios: 0, palpites: 0, avisos: 0 });
    expect(d!.mensagens).toEqual([expect.objectContaining({ texto: 'segredo da Bia' })]);
    expect(JSON.stringify(d)).not.toContain('o card cortou');
  }, TEMPO);

  it('sem login não devolve nada, e anon nem chama', async () => {
    expect(await meusDados(null)).toBeNull();
    await expect(como(null, 'anon', 'select public.ver_meus_dados()')).rejects.toThrow(/permission denied/);
  }, TEMPO);

  it('quem ainda não escolheu time vê o torcedor vazio', async () => {
    const id = uuid();
    await db.query('insert into auth.users (id) values ($1)', [id]);
    expect(await meusDados(id)).toMatchObject({ torcedor: null, partidas: {}, mensagens: [] });
  }, TEMPO);
});

describe('apagar apelido no #admin', () => {
  const contar = (uid: string, apelido: string) =>
    como<{ n: number }>(uid, 'authenticated', 'select public.apelido_contar($1) as n', [apelido]).then((r) => r[0].n);
  const apagar = (uid: string, apelido: string) =>
    como<{ n: number }>(uid, 'authenticated', 'select public.apelido_apagar($1) as n', [apelido]).then((r) => r[0].n);

  it('só administrador conta ou apaga', async () => {
    await expect(contar(ana, 'Ana Gol')).rejects.toThrow(/sem_permissao/);
    await expect(apagar(ana, 'Ana Gol')).rejects.toThrow(/sem_permissao/);
    await expect(como(null, 'anon', `select public.apelido_contar('x')`)).rejects.toThrow(/permission denied/);
    await expect(como(null, 'anon', `select public.apelido_apagar('x')`)).rejects.toThrow(/permission denied/);
    await expect(como(admin, 'authenticated', `select public.apelido_normalizado('x')`)).rejects.toThrow(/permission denied/);
  }, TEMPO);

  it('conta pelo apelido exato (só ajeita os espaços)', async () => {
    expect(await contar(admin, 'Ana Gol')).toBe(2);
    expect(await contar(admin, '  Ana   Gol ')).toBe(2);
    expect(await contar(admin, 'ana gol')).toBe(1);
    expect(await contar(admin, 'Ana')).toBe(0);
    expect(await contar(admin, '   ')).toBe(0);
  }, TEMPO);

  it('limpa o apelido dos torcedores e dos desafios, e registra só quando e quantos', async () => {
    expect(await apagar(admin, 'Ana Gol')).toBe(2);
    const { rows } = await db.query<{ apelido: string | null }>('select apelido from public.torcedores where id in ($1, $2)', [ana, bia]);
    expect(rows).toEqual([{ apelido: null }, { apelido: null }]);
    const { rows: desafio } = await db.query<{ apelido: string | null }>(
      `select apelido from public.desafios where id = 'abcd1234' union all select apelido from public.prova_desafios where id = 'prova123'`,
    );
    expect(desafio).toEqual([{ apelido: null }, { apelido: null }]);
    expect(await contar(admin, 'ana gol')).toBe(1);

    const { rows: registro } = await db.query<Record<string, unknown>>('select * from public.apelidos_apagados');
    expect(registro).toHaveLength(1);
    expect(registro[0].torcedores).toBe(2);
    // O motivo (20261109200000_apelido_16.sql) separa o #admin da limpeza por idade; nunca o apelido.
    expect(registro[0].motivo).toBe('admin');
    expect(Object.keys(registro[0]).sort()).toEqual(['apagado_em', 'id', 'motivo', 'torcedores']);
  }, TEMPO);

  it('apelido que ninguém usa não registra nada', async () => {
    expect(await apagar(admin, 'Ana Gol')).toBe(0);
    const { rows } = await db.query<{ n: number }>('select count(*)::integer as n from public.apelidos_apagados');
    expect(rows[0].n).toBe(1);
  }, TEMPO);

  it('o celular não lê nem grava o registro', async () => {
    await expect(como(admin, 'authenticated', 'select * from public.apelidos_apagados')).rejects.toThrow(/permission denied/);
    await expect(como(ana, 'authenticated', 'insert into public.apelidos_apagados (torcedores) values (1)')).rejects.toThrow(/permission denied/);
  }, TEMPO);
});
