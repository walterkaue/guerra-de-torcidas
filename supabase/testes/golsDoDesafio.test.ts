// Os gols de quem chamou no desafio dos Lances (20261110000000): ver_desafio_lances devolve as 3 tentativas da partida
// dele numa lista branca (nada de semente, partida, torcedor ou segredo), null sem a partida ou sem 'lances', continua
// devolvendo depois dos 7 dias e some com a linha. E o funil aceita 'viu_gols' só nos Lances. SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
const DIA = 86_400_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;
let ana: string;

/** Uma tentativa como a função `lances` grava em partidas.resultado (LanceJogado), com tudo o que não pode sair. */
const tentativa = (desfecho: string, pontos: number, extra: Record<string, unknown> = {}) => ({
  desfecho,
  x: 0.123456,
  y: 0.654321,
  zonaBola: 5,
  cavadinha: false,
  angulo: true,
  raspouTrave: false,
  recriou: desfecho === 'gol',
  goleiroX: -0.33333,
  tFim: desfecho === 'gol' ? 1 : 0.4567,
  pontos,
  lanceId: 'gol-de-teste',
  faixa: 'craque',
  gesto: { dir: 12.4, forca: 61, efeito: -3, semente: 999 },
  semente: 123456789,
  torcedor: 'x',
  ...extra,
});

async function torcedor(): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, 'sao-paulo', '18_mais')`, [id]);
  return id;
}

async function desafio(codigo: string, resultado: unknown, criado = new Date().toISOString(), suspeita = false): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame, criada_em, fechada_em, pontos, resultado, sob_suspeita)
     values ($1, 'normal', 77, 0, $2::timestamptz + interval '15 minutes', 'lances', $2, $2, 92, $3::jsonb, $4) returning id`,
    [ana, criado, resultado === undefined ? null : JSON.stringify(resultado), suspeita],
  );
  await db.query(
    `insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, gestos)
     values ($1, 0, true, '{"sementes":[11,22,33],"faixas":["craque","craque","craque"]}'::jsonb)`,
    [rows[0].id],
  );
  await db.query(
    `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, lance_id, pontos, gols, recriados, faixa, criado_em)
     values ($1, $2, $3, 'sao-paulo', 'gol-de-teste', 92, 2, 1, 'craque', $4)`,
    [codigo, rows[0].id, ana, criado],
  );
  return rows[0].id;
}

const ver = async (codigo: string) =>
  (await db.query<Record<string, unknown>>('select * from public.ver_desafio_lances($1)', [codigo])).rows;

describe('os gols de quem chamou no resumo do desafio dos Lances', () => {
  beforeAll(async () => {
    db = await bancoDeTeste();
    ana = await torcedor();
    await desafio('golsabc1', { lances: [tentativa('gol', 50), tentativa('defesa', 0), tentativa('gol', 42, { recriou: false })], gols: 2, pontos: 92 });
    await desafio('semlanc1', { gols: 0, pontos: 0 });
    await desafio('semres01', undefined);
    await desafio('velhoab1', { lances: [tentativa('gol', 50)] }, new Date(Date.now() - 8 * DIA).toISOString());
    await desafio('torto001', { lances: [{ desfecho: 'chutou', x: 'longe', pontos: '50', gesto: 3 }] });
    await desafio('enorme01', { lances: [{ desfecho: 'gol', pontos: 1e10, x: 1e300, gesto: { dir: 1e10, forca: -1e12, efeito: 1 } }] });
    await desafio('suspeit1', { lances: [tentativa('gol', 50), tentativa('gol', 50), tentativa('gol', 50)] }, undefined, true);
  }, TEMPO);

  it('mesmas colunas de antes, na mesma ordem, e `tentativas` no fim', async () => {
    const { fields } = await db.query('select * from public.ver_desafio_lances($1)', ['golsabc1']);
    expect(fields.map((f) => f.name)).toEqual([
      'id', 'time_id', 'apelido', 'lance_id', 'pontos', 'gols', 'recriados', 'faixa', 'boneco', 'vencido', 'tentativas',
    ]);
  }, TEMPO);

  it('as 3 tentativas, na ordem, só com as chaves da lista e números com 3 casas', async () => {
    const [r] = await ver('GOLSABC1');
    const t = r.tentativas as Record<string, unknown>[];
    expect(t).toHaveLength(3);
    for (const item of t) {
      expect(Object.keys(item).sort()).toEqual(['cavadinha', 'desfecho', 'gesto', 'goleiroX', 'pontos', 'recriou', 'tFim', 'x', 'y']);
      expect(Object.keys(item.gesto as object).sort()).toEqual(['dir', 'efeito', 'forca']);
    }
    expect(t.map((i) => i.desfecho)).toEqual(['gol', 'defesa', 'gol']);
    expect(t.map((i) => i.pontos)).toEqual([50, 0, 42]);
    expect(t.map((i) => i.recriou)).toEqual([true, false, false]);
    expect(t[0]).toMatchObject({ x: 0.123, y: 0.654, goleiroX: -0.333, tFim: 1, cavadinha: false, gesto: { dir: 12, forca: 61, efeito: -3 } });
    expect(t[1].tFim).toBe(0.457);
    // Nada do segredo, da partida ou de quem jogou em lugar nenhum do resumo.
    const tudo = JSON.stringify(r);
    for (const proibido of ['semente', '123456789', '999', 'lanceId', 'zonaBola', 'angulo', 'raspouTrave', 'torcedor', 'sob_suspeita', 'sementes', '"faixas"', ana]) {
      expect(tudo).not.toContain(proibido);
    }
  }, TEMPO);

  it('partida sem lances, sem resultado, ou com formato torto: null nos campos, sem derrubar o resumo', async () => {
    expect((await ver('semlanc1'))[0].tentativas).toBeNull();
    expect((await ver('semres01'))[0].tentativas).toBeNull();
    const [torto] = await ver('torto001');
    expect(torto.tentativas).toEqual([
      { desfecho: null, pontos: null, recriou: null, cavadinha: null, x: null, y: null, goleiroX: null, tFim: null, gesto: { dir: null, forca: null, efeito: null } },
    ]);
  }, TEMPO);

  it('número enorme vira null sem derrubar o resumo', async () => {
    const [r] = await ver('enorme01');
    expect(r.pontos).toBe(92);
    expect(r.tentativas).toEqual([
      { desfecho: 'gol', pontos: null, recriou: null, cavadinha: null, x: null, y: null, goleiroX: null, tFim: null, gesto: { dir: null, forca: null, efeito: 1 } },
    ]);
  }, TEMPO);

  it('partida sob suspeita não mostra os gols; liberada, mostra', async () => {
    expect((await ver('suspeit1'))[0].tentativas).toBeNull();
    await db.exec(`update public.partidas p set sob_suspeita = false from public.lances_desafios d where d.id = 'suspeit1' and p.id = d.partida_id`);
    expect((await ver('suspeit1'))[0].tentativas).toHaveLength(3);
  }, TEMPO);

  it('desafio vencido continua devolvendo os gols', async () => {
    const [r] = await ver('velhoab1');
    expect(r.vencido).toBe(true);
    expect((r.tentativas as unknown[]).length).toBe(1);
  }, TEMPO);

  it('desafio apagado (limpeza de 30 dias) não devolve nada', async () => {
    await db.exec(`delete from public.lances_desafios where id = 'velhoab1'`);
    expect(await ver('velhoab1')).toEqual([]);
  }, TEMPO);

  it('quem recebe o link chama, sem login ou com', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await db.exec(`set role ${papel}`);
      try {
        const { rows } = await db.query<{ tentativas: unknown[] }>(`select tentativas from public.ver_desafio_lances('golsabc1')`);
        expect(rows[0].tentativas).toHaveLength(3);
      } finally {
        await db.exec('reset role');
      }
    }
  }, TEMPO);
});

describe("funil: 'viu_gols'", () => {
  it('só nos Lances, com X1, sem meio nem jogo', async () => {
    const valido = async (tipo: string, meio: string, jogo: string, x1: boolean) =>
      (await db.query<{ ok: boolean }>('select public.funil_evento_valido($1, $2, $3, $4, $5) as ok', ['viu_gols', tipo, meio, jogo, x1])).rows[0].ok;
    expect(await valido('x1_lances', '', '', true)).toBe(true);
    expect(await valido('x1_penaltis', '', '', true)).toBe(false);
    expect(await valido('x1_prova', '', '', true)).toBe(false);
    expect(await valido('x1_lances', '', '', false)).toBe(false);
    expect(await valido('x1_lances', 'link', '', true)).toBe(false);
    expect(await valido('x1_lances', '', 'lances', true)).toBe(false);
    // O resto da lista não mudou.
    expect((await db.query<{ ok: boolean }>(`select public.funil_evento_valido('aceitou', 'x1_lances', '', '', true) as ok`)).rows[0].ok).toBe(true);
  }, TEMPO);
});
