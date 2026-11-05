// Migração dos Lances valendo (20261103200000): minigame 'lances', a melhor partida do dia por fora do teto
// de 5, posição e recorde, medalhas (lances_gols) que sobrevivem ao zerar, suspeitas e permissões.
// Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste, cortarLancesNoFuturo } from './banco';

const DIA = '2026-11-04';
const SEMANA = '2026-11-02';
const TEMPO = 60_000;

let db: PGlite;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function torcedor(time = 'sao-paulo'): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, $2, '18_mais')`, [id, time]);
  return id;
}

type Desfecho = 'gol' | 'defesa' | 'fora';
const resultado = (lances: { id: string; desfecho: Desfecho; recriou?: boolean }[]) => ({
  lances: lances.map((l) => ({ lanceId: l.id, faixa: 'media', desfecho: l.desfecho, recriou: !!l.recriou, gesto: { dir: 0, forca: 60, efeito: 0 } })),
});

async function partida(
  quem: string,
  pontos: number,
  o: { minigame?: 'penaltis' | 'lances'; hora?: string; suspeita?: boolean; lances?: { id: string; desfecho: Desfecho; recriou?: boolean }[] } = {},
): Promise<string> {
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame)
     values ($1, 'normal', 1, 0, now() + interval '15 minutes', $2)
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem, o.minigame ?? 'penaltis'],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id,
    quem,
    rows[0].time_id,
    '{}',
    JSON.stringify(o.lances ? resultado(o.lances) : {}),
    pontos,
    DIA,
    SEMANA,
    `${DIA}T${o.hora ?? '12:00'}:00-03:00`,
    o.suspeita ? 'teste' : null,
    null,
    null,
  ]);
  return rows[0].id;
}

async function como<T>(uid: string | null, papel: 'authenticated' | 'anon' | 'service_role', sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid ?? '']);
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

const gols = (n: number, id = 'a', recriou = false) => Array.from({ length: n }, () => ({ id, desfecho: 'gol' as const, recriou }));

beforeAll(async () => {
  db = await bancoDeTeste();
  await cortarLancesNoFuturo(db); // regra antiga dos Lances, seja qual for o dia de hoje
}, TEMPO);

describe('minigame lances', () => {
  it('aceita lances e continua recusando minigame desconhecido', async () => {
    const eu = await torcedor();
    await partida(eu, 10, { minigame: 'lances', lances: [] });
    await expect(
      db.query(`insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame) values ($1, 'normal', 1, 0, now(), 'xadrez')`, [eu]),
    ).rejects.toThrow(/check/);
  });

  it('dos Lances conta só a melhor do dia, por fora das 5 de pênaltis e Prova', async () => {
    const eu = await torcedor();
    for (const p of [50, 60, 70, 80, 90, 40]) await partida(eu, p);
    await partida(eu, 30, { minigame: 'lances', lances: [], hora: '13:00' });
    await partida(eu, 96, { minigame: 'lances', lances: [], hora: '13:10' });
    await partida(eu, 96, { minigame: 'lances', lances: [], hora: '13:20' });
    await partida(eu, 120, { minigame: 'lances', lances: [], hora: '13:30', suspeita: true });
    const { rows } = await db.query<{ minigame: string; pontos: number; fechada_em: string }>(
      `select minigame, pontos, fechada_em from public.partidas where torcedor_id = $1 and conta_no_teto order by minigame, pontos`, [eu]);
    expect(rows.map((r) => `${r.minigame}:${r.pontos}`)).toEqual(['lances:96', 'penaltis:50', 'penaltis:60', 'penaltis:70', 'penaltis:80', 'penaltis:90']);
    // Empate: fica a que fechou primeiro.
    expect(new Date(rows[0].fechada_em).toISOString()).toBe(new Date(`${DIA}T13:10:00-03:00`).toISOString());
    const { rows: tot } = await db.query<{ total: number }>('select total from public.totais_semana($1) where torcedor_id = $2', [SEMANA, eu]);
    expect(tot[0].total).toBe(50 + 60 + 70 + 80 + 90 + 96);
  });

  it('posição pela melhor partida da semana e recorde', async () => {
    const a = await torcedor();
    const b = await torcedor('flamengo');
    await partida(a, 60, { minigame: 'lances', lances: [] });
    await partida(b, 80, { minigame: 'lances', lances: [] });
    await partida(b, 200, { minigame: 'penaltis' });
    const pos = await db.query<{ posicao: number; pontos: number }>(`select * from public.posicao_minigame($1, 'lances', $2)`, [a, DIA]);
    expect(pos.rows[0].pontos).toBe(60);
    const rec = await db.query<{ r: number }>(`select public.recorde_pessoal($1, 'lances') as r`, [b]);
    expect(rec.rows[0].r).toBe(80);
    const meus = await como<{ minigame: string; recorde: number | null }>(b, 'authenticated', 'select * from public.meus_recordes()');
    expect(meus.find((m) => m.minigame === 'lances')?.recorde).toBe(80);
  });
});

describe('medalhas', () => {
  it('anota só os gols de partida sem suspeita; liberar a suspeita anota os dela', async () => {
    const eu = await torcedor();
    const admin = await torcedor();
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
    await partida(eu, 40, { minigame: 'lances', lances: [{ id: 'a', desfecho: 'gol', recriou: true }, { id: 'b', desfecho: 'defesa' }, { id: 'a', desfecho: 'gol' }] });
    const suspeita = await partida(eu, 40, { minigame: 'lances', suspeita: true, lances: gols(3, 'b') });
    const contar = async () => (await db.query<{ n: number }>('select count(*)::int n from public.lances_gols where torcedor_id = $1', [eu])).rows[0].n;
    expect(await contar()).toBe(2);
    const naFila = async () =>
      (await como<{ minigame: string; id: string }>(admin, 'authenticated', 'select * from public.suspeitas_fila(100)')).some((f) => f.id === suspeita && f.minigame === 'lances');
    expect(await naFila()).toBe(true);
    await como(admin, 'authenticated', `select public.suspeitas_decidir('lances', $1, true)`, [suspeita]);
    expect(await contar()).toBe(5);
    // Revisar de novo não duplica.
    await db.query('update public.partidas set sob_suspeita = true where id = $1', [suspeita]);
    await db.query('update public.partidas set sob_suspeita = false where id = $1', [suspeita]);
    expect(await contar()).toBe(5);
    expect(await naFila()).toBe(false);
  });

  it('bronze com 5, prata com 20, ouro com 50 e 10 recriando; vitrine por torcida', async () => {
    const eu = await torcedor('palmeiras');
    const outro = await torcedor('palmeiras');
    const fora = await torcedor('outro');
    for (let k = 0; k < 17; k++) await partida(eu, 30, { minigame: 'lances', lances: [...gols(2, 'x'), { id: 'x', desfecho: 'gol', recriou: k < 4 }] });
    await partida(eu, 30, { minigame: 'lances', lances: gols(3, 'y') });
    await partida(eu, 30, { minigame: 'lances', lances: gols(2, 'y') });
    await partida(outro, 30, { minigame: 'lances', lances: gols(3, 'z') });
    await partida(fora, 30, { minigame: 'lances', lances: gols(3, 'w') });
    await partida(fora, 30, { minigame: 'lances', lances: gols(3, 'w') });
    const minhas = await como<{ lance_id: string; gols: number; recriados: number; medalha: string | null }>(eu, 'authenticated', 'select * from public.minhas_medalhas() order by lance_id');
    expect(minhas).toEqual([
      { lance_id: 'x', gols: 51, recriados: 4, vitorias: 0, medalha: 'prata' },
      { lance_id: 'y', gols: 5, recriados: 0, vitorias: 0, medalha: 'bronze' },
    ]);
    for (let k = 0; k < 6; k++) await partida(eu, 30, { minigame: 'lances', lances: gols(1, 'x', true) });
    const ouro = await como<{ medalha: string }>(eu, 'authenticated', `select medalha from public.minhas_medalhas() where lance_id = 'x'`);
    expect(ouro[0].medalha).toBe('ouro');
    const vitrine = await como<{ time_id: string; bronze: number; prata: number; ouro: number }>(null, 'authenticated', `select * from public.vitrine_medalhas() where time_id = 'palmeiras' or time_id = 'outro'`);
    expect(vitrine).toEqual([{ time_id: 'palmeiras', bronze: 1, prata: 0, ouro: 1 }]);
  });

  it('o zerar-pre-temporada apaga as partidas e as medalhas ficam; apagar meus dados leva as medalhas', async () => {
    const eu = await torcedor();
    await partida(eu, 30, { minigame: 'lances', lances: gols(3, 'q') });
    const zerar = readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8');
    await db.exec(zerar);
    expect((await db.query('select 1 from public.partidas')).rows).toHaveLength(0);
    expect((await db.query<{ n: number }>('select count(*)::int n from public.lances_gols where torcedor_id = $1', [eu])).rows[0].n).toBe(3);
    await como(eu, 'authenticated', 'select public.apagar_meus_dados()');
    expect((await db.query<{ n: number }>('select count(*)::int n from public.lances_gols where torcedor_id = $1', [eu])).rows[0].n).toBe(0);
  });
});

describe('começar uma partida', () => {
  const comecar = (quem: string) =>
    db.query<{ partida_id: string; feitas: number; limite: number }>(
      `select * from public.lances_comecar($1, 7, now() + interval '15 minutes', '{"lances": [], "sementes": [7, 8, 9], "cobrancas": []}')`, [quem]);

  it('grava a partida e o segredo juntos, conta o dia e para no limite', async () => {
    const eu = await torcedor();
    await db.query(`update public.config_deteccao set valor = 99 where chave = 'partidas_por_minuto'`);
    try {
      for (let k = 1; k <= 6; k++) {
        const { rows } = await comecar(eu);
        expect(rows[0]).toMatchObject({ feitas: k, limite: 6 });
        const seg = await db.query<{ gestos: { sementes: number[] }; lance_a_lance: boolean }>(
          'select gestos, lance_a_lance from public.partidas_segredo where partida_id = $1', [rows[0].partida_id]);
        expect(seg.rows[0]).toMatchObject({ lance_a_lance: true, gestos: { sementes: [7, 8, 9] } });
      }
      await expect(comecar(eu)).rejects.toThrow(/limite_do_dia/);
      const { rows } = await db.query<{ n: number }>(`select count(*)::int n from public.partidas where torcedor_id = $1 and minigame = 'lances'`, [eu]);
      expect(rows[0].n).toBe(6);
    } finally {
      await db.query(`update public.config_deteccao set valor = 3 where chave = 'partidas_por_minuto'`);
    }
  });

  it('segura o limite por minuto', async () => {
    const eu = await torcedor();
    for (let k = 0; k < 3; k++) await comecar(eu);
    await expect(comecar(eu)).rejects.toThrow(/muitas_partidas/);
  });
});

describe('hoje e permissões', () => {
  it('meus_lances_hoje conta as partidas começadas hoje, o limite e a melhor', async () => {
    const eu = await torcedor();
    await db.query(
      `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em, minigame) values ($1, 'normal', 1, 0, now() + interval '15 minutes', 'lances')`, [eu]);
    const [h] = await como<{ feitas: number; limite: number; melhor: number | null }>(eu, 'authenticated', 'select * from public.meus_lances_hoje()');
    // Antes do corte dos Lances unificados (09/11), `melhores` vem vazio (20261105100000).
    expect(h).toEqual({ feitas: 1, limite: 6, melhor: null, melhores: [] });
  });

  it('o celular não lê lances_gols nem as funções internas; a vitrine e as próprias, sim', async () => {
    const eu = await torcedor();
    await expect(como(eu, 'authenticated', 'select * from public.lances_gols')).rejects.toThrow(/permission/);
    await expect(como(eu, 'authenticated', 'select * from public.medalhas_de($1)', [eu])).rejects.toThrow(/permission/);
    await expect(como(eu, 'authenticated', 'select * from public.lances_hoje($1)', [eu])).rejects.toThrow(/permission/);
    await expect(
      como(eu, 'authenticated', `select * from public.lances_comecar($1, 1, now(), '{}')`, [eu]),
    ).rejects.toThrow(/permission/);
    await expect(como(null, 'anon', 'select * from public.vitrine_medalhas()')).rejects.toThrow(/permission/);
    await expect(como(eu, 'authenticated', 'select * from public.vitrine_medalhas()')).resolves.toBeDefined();
    await expect(como(eu, 'service_role', 'select * from public.medalhas_de($1)', [eu])).resolves.toBeDefined();
    await expect(como(eu, 'service_role', 'select * from public.lances_hoje($1)', [eu])).resolves.toBeDefined();
  });
});
