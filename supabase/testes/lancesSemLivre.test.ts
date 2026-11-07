// Lances sem Disputa livre e corte antecipado (20261105400000): corte em 09/11/2026, que 20261107200000 antecipou de
// novo, para 08/11; penaltis_comecar recusa partida
// sem disputa a partir do corte e grava no X1 a disputa de quem chamou; a livre não tem mais medalha e as linhas
// 'penaltis:livre' saem de lances_gols; ver_desafio devolve a disputa. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261105400000_lances_sem_livre.sql';
const SEMENTES = `'{"cobrancas":[1,2,3,4,5,6,7,8],"defesas":[1,2,3,4,5,6,7,8]}'::jsonb`;
const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

/** Troca a data de corte (as funções olham para ela a cada chamada). Sem limite por minuto, para olhar só a regra. */
async function cortarEm(db: PGlite, instante: string, dia: string): Promise<void> {
  await db.exec(`
    create or replace function public.lances_unificados_desde() returns timestamptz language sql immutable set search_path = ''
      as $$ select timestamptz '${instante}' $$;
    create or replace function public.lances_dia_do_corte() returns date language sql immutable set search_path = ''
      as $$ select date '${dia}' $$;
    update public.config_deteccao set valor = 1000 where chave = 'partidas_por_minuto';
  `);
}
const cortarNoPassado = (db: PGlite) => cortarEm(db, '2026-11-02 00:00:00-03', '2026-11-02');
const cortarNoFuturo = (db: PGlite) => cortarEm(db, '2099-01-05 00:00:00-03', '2099-01-05');

async function torcedor(db: PGlite, time = 'sao-paulo'): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, $2, '18_mais')`, [id, time]);
  return id;
}

/** Um X1 de `quem`: a partida de origem (com ou sem disputa) e o código, como o fechar_partida deixa. */
async function x1De(db: PGlite, quem: string, codigo: string, disputa: string | null): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, disputa_id)
     values ($1, 'normal', 1, 0, now() + interval '15 minutes', 'penaltis', $2) returning id`,
    [quem, disputa],
  );
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos)
     values ($1, $2, $3, 'sao-paulo', '[]'::jsonb, 3, 2, 70)`,
    [codigo, rows[0].id, quem],
  );
}

/** penaltis_comecar como a nova-partida chama, com a hora de agora. Devolve a disputa gravada na partida. */
async function comecar(db: PGlite, quem: string, o: { desafio?: string; disputa?: string | null } = {}): Promise<string | null> {
  const { rows } = await db.query<{ partida_id: string }>(
    `select * from public.penaltis_comecar($1, 1, 0.5, now() + interval '15 minutes', $2, $3, $4, 3::smallint, ${SEMENTES})`,
    [quem, o.desafio ? 'desafio' : 'normal', o.desafio ?? null, o.disputa ?? null],
  );
  const { rows: p } = await db.query<{ disputa_id: string | null }>('select disputa_id from public.partidas where id = $1', [rows[0].partida_id]);
  return p[0].disputa_id;
}

/** Fecha uma partida de pênaltis direto na tabela (o gatilho das medalhas roda no update de fechada_em). */
async function fecharPenaltis(db: PGlite, quem: string, disputa: string | null, gols: number, venceu: boolean): Promise<void> {
  const resultado = { cobrancas: Array.from({ length: 5 }, (_, i) => ({ desfecho: i < gols ? 'gol' : 'defesa' })), venceu };
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, disputa_id, criada_em)
     values ($1, 'normal', 1, 0, now(), 'penaltis', $2, '2026-11-04T12:00:00-03:00') returning id`,
    [quem, disputa],
  );
  await db.query(
    `update public.partidas set fechada_em = '2026-11-04T12:05:00-03:00', pontos = 50, resultado = $2, dia = '2026-11-04', semana = '2026-11-02'
     where id = $1`,
    [rows[0].id, JSON.stringify(resultado)],
  );
}

const itens = async (db: PGlite, quem: string) =>
  (
    await db.query<{ lance_id: string; n: number }>(
      'select lance_id, count(*)::int as n from public.lances_gols where torcedor_id = $1 group by lance_id order by lance_id',
      [quem],
    )
  ).rows;

describe('corte antecipado', () => {
  it('a data de corte é domingo 08/11/2026, 0h de Brasília (20261107200000), no instante e no dia', async () => {
    const db = await bancoDeTeste();
    const { rows } = await db.query<{ desde: Date; dia: string; descricao: string }>(
      `select public.lances_unificados_desde() as desde, public.lances_dia_do_corte()::text as dia,
         (select descricao from public.config_deteccao where chave = 'lances_unificados_por_dia') as descricao`,
    );
    expect(rows[0].desde.toISOString()).toBe('2026-11-08T03:00:00.000Z');
    expect(rows[0].dia).toBe('2026-11-08');
    expect(rows[0].descricao).toContain('08/11/2026');
  }, TEMPO);
});

describe('sem Disputa livre a partir do corte', () => {
  let db: PGlite;
  let ana: string;
  let bia: string;
  beforeAll(async () => {
    db = await bancoDeTeste();
    ana = await torcedor(db);
    bia = await torcedor(db);
    await x1De(db, ana, 'comdisp1', 'sao-paulo-2005-final');
    await x1De(db, ana, 'livre001', null);
  }, TEMPO);

  it('antes do corte: partida sem disputa continua valendo', async () => {
    await cortarNoFuturo(db);
    await expect(comecar(db, bia)).resolves.toBeNull();
    await expect(comecar(db, bia, { disputa: 'selecao-2002-x' })).resolves.toBe('selecao-2002-x');
  }, TEMPO);

  it('a partir do corte: sem disputa é recusada, com disputa começa', async () => {
    await cortarNoPassado(db);
    const antes = (await db.query<{ n: number }>('select count(*)::int as n from public.partidas where torcedor_id = $1', [bia])).rows[0].n;
    await expect(comecar(db, bia)).rejects.toThrow(/disputa_obrigatoria/);
    // A recusa não grava partida nem gasta o limite do dia.
    const depois = (await db.query<{ n: number }>('select count(*)::int as n from public.partidas where torcedor_id = $1', [bia])).rows[0].n;
    expect(depois).toBe(antes);
    await expect(comecar(db, bia, { disputa: 'selecao-2002-x' })).resolves.toBe('selecao-2002-x');
  }, TEMPO);

  it('X1: a partida de quem aceita grava a disputa de quem chamou, seja qual for a do pedido', async () => {
    await cortarNoPassado(db);
    const caio = await torcedor(db);
    await expect(comecar(db, caio, { desafio: 'comdisp1', disputa: 'outra-disputa' })).resolves.toBe('sao-paulo-2005-final');
    // Antes do corte também: a medalha do X1 vai para a disputa de quem chamou.
    await cortarNoFuturo(db);
    const davi = await torcedor(db);
    await expect(comecar(db, davi, { desafio: 'comdisp1' })).resolves.toBe('sao-paulo-2005-final');
    // X1 livre antes do corte segue livre.
    await expect(comecar(db, davi, { desafio: 'livre001' })).resolves.toBeNull();
  }, TEMPO);

  it('X1 sem disputa depois do corte expira', async () => {
    await cortarNoPassado(db);
    const eva = await torcedor(db);
    await expect(comecar(db, eva, { desafio: 'livre001' })).rejects.toThrow(/desafio_expirado/);
  }, TEMPO);

  it('ver_desafio devolve a disputa do X1 (null no X1 livre)', async () => {
    const { rows } = await db.query<{ id: string; disputa_id: string | null }>(
      `select id, disputa_id from public.ver_desafio('COMDISP1') union all select id, disputa_id from public.ver_desafio('livre001') order by id`,
    );
    expect(rows).toEqual([
      { id: 'comdisp1', disputa_id: 'sao-paulo-2005-final' },
      { id: 'livre001', disputa_id: null },
    ]);
  }, TEMPO);
});

describe('medalhas dos pênaltis só por disputa', () => {
  it('a migração apaga as linhas da livre e deixa as das disputas e dos lances', async () => {
    const db = await bancoDeTeste(MIGRACAO);
    const eu = await torcedor(db);
    await fecharPenaltis(db, eu, null, 4, true);
    await fecharPenaltis(db, eu, 'final-2018', 3, true);
    await db.query(
      `insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou, vitoria)
       values (gen_random_uuid(), 0, $1, 'falta-x', false, false)`,
      [eu],
    );
    expect(await itens(db, eu)).toEqual([
      { lance_id: 'falta-x', n: 1 },
      { lance_id: 'penaltis:final-2018', n: 4 },
      { lance_id: 'penaltis:livre', n: 5 },
    ]);
    await aplicarMigracao(db, MIGRACAO);
    expect(await itens(db, eu)).toEqual([
      { lance_id: 'falta-x', n: 1 },
      { lance_id: 'penaltis:final-2018', n: 4 },
    ]);
    const { rows: minhas } = await db.query<{ lance_id: string }>('select lance_id from public.medalhas_de($1) order by lance_id', [eu]);
    expect(minhas.map((m) => m.lance_id)).toEqual(['falta-x', 'penaltis:final-2018']);
  }, TEMPO);

  it('depois da migração, partida livre não anota gol nem vitória; a da disputa anota', async () => {
    const db = await bancoDeTeste();
    const eu = await torcedor(db, 'gremio');
    for (let k = 0; k < 3; k++) await fecharPenaltis(db, eu, null, 5, true);
    expect(await itens(db, eu)).toEqual([]);
    for (let k = 0; k < 2; k++) await fecharPenaltis(db, eu, 'final-1995', 5, true);
    expect(await itens(db, eu)).toEqual([{ lance_id: 'penaltis:final-1995', n: 12 }]);
    const { rows: vitrine } = await db.query(`select * from public.vitrine_medalhas() where time_id = 'gremio'`);
    expect(vitrine).toEqual([{ time_id: 'gremio', bronze: 1, prata: 0, ouro: 0 }]);
  }, TEMPO);
});
