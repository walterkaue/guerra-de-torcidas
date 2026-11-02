// Revisão das perguntas do pipeline no #admin (20261026000200): só administrador lê a fila, aprova
// (publica em public.perguntas com id novo) e reprova. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
const ADMIN = '00000000-0000-4000-8000-000000000001';
const COMUM = '00000000-0000-4000-8000-000000000002';

let db: PGlite;

async function rascunho(clube: string, pergunta: string, status = 'pre_aprovada'): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `insert into staging_gt.rascunhos_perguntas (clube, degrau, tema, pergunta, certa, errada1, errada2, errada3, fonte, trecho, modelo, status, auditoria_modelo)
     values ($1, 'media', 'titulos', $2, 'Santos', 'Flamengo', 'Palmeiras', 'Botafogo', 'https://www.lance.com.br/x', 'o Cruzeiro derrotou o Santos na final de 1966', 'gemini-3.5-flash-lite', $3, 'gemini-3.5-flash')
     returning id`,
    [clube, pergunta, status],
  );
  return Number(rows[0].id);
}

/** Roda como usuário logado (papel authenticated), com auth.uid() = uid. */
async function como<T>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = await bancoDeTeste();
  await db.query('insert into auth.users (id) values ($1), ($2)', [ADMIN, COMUM]);
  await db.query('insert into public.administradores (usuario_id) values ($1)', [ADMIN]);
}, TEMPO);

describe('revisão das perguntas do pipeline', () => {
  it('quem não é administrador não lê a fila nem aprova', async () => {
    const id = await rascunho('cruzeiro', 'Em 1966, o Cruzeiro venceu a Taça Brasil contra qual clube na final?');
    await expect(como(COMUM, 'select * from public.revisao_perguntas_fila(30)')).rejects.toThrow(/sem_permissao/);
    await expect(
      como(COMUM, `select public.revisao_perguntas_aprovar($1, 'x pergunta?', 'a', 'b', 'c', 'd', 'media', 'titulos')`, [id]),
    ).rejects.toThrow(/sem_permissao/);
    await expect(como(COMUM, `select public.revisao_perguntas_reprovar($1, 'não')`, [id])).rejects.toThrow(/sem_permissao/);
  }, TEMPO);

  it('administrador vê só as pre_aprovada, com o trecho', async () => {
    await rascunho('remo', 'Em 2005, o Remo foi campeão de qual divisão nacional pela primeira vez?', 'rascunho');
    const fila = await como<{ pergunta: string; trecho: string; na_fila: number }>(ADMIN, 'select * from public.revisao_perguntas_fila(30)');
    expect(fila.map((f) => f.pergunta)).toEqual(['Em 1966, o Cruzeiro venceu a Taça Brasil contra qual clube na final?']);
    expect(fila[0].trecho).toContain('Santos');
    expect(fila[0].na_fila).toBe(1);
  }, TEMPO);

  it('aprovar publica como ativa, com id que continua a numeração e o texto corrigido', async () => {
    await db.query(
      `insert into public.perguntas (id, clube, degrau, tema, texto, certa, errada1, errada2, errada3, fonte, verificada_em)
       values ('cruzeiro-m-07', 'cruzeiro', 2, 'titulos', 'Pergunta antiga de 1997?', 'a', 'b', 'c', 'd', 'https://x.com', '2026-10-01')`,
    );
    const [{ id }] = await db.query<{ id: number }>(`select id from staging_gt.rascunhos_perguntas where clube = 'cruzeiro'`).then((r) => r.rows);
    const [{ revisao_perguntas_aprovar: novoId }] = await como<{ revisao_perguntas_aprovar: string }>(
      ADMIN,
      `select public.revisao_perguntas_aprovar($1, $2, 'Santos', 'Flamengo', 'Palmeiras', 'Botafogo', 'dificil', 'titulos')`,
      [id, 'Em 1966, o Cruzeiro conquistou a Taça Brasil vencendo qual clube na final?'],
    );
    expect(novoId).toBe('cruzeiro-d-01');
    const [p] = (await db.query<{ status: string; degrau: number; texto: string; lote: string }>(`select * from public.perguntas where id = $1`, [novoId])).rows;
    expect(p.status).toBe('ativa');
    expect(p.degrau).toBe(3);
    expect(p.texto).toContain('vencendo qual clube');
    expect(p.lote).toMatch(/^gemini-\d{4}-\d{2}$/);
    const [r] = (await db.query<{ status: string; pergunta_id: string; revisada_por: string }>(`select * from staging_gt.rascunhos_perguntas where id = $1`, [id])).rows;
    expect(r).toMatchObject({ status: 'publicada', pergunta_id: novoId, revisada_por: ADMIN });
    // aprovar de novo não publica duas vezes
    await expect(
      como(ADMIN, `select public.revisao_perguntas_aprovar($1, 'Outra pergunta de 1966?', 'a', 'b', 'c', 'd', 'media', 'titulos')`, [id]),
    ).rejects.toThrow(/fora_da_fila/);
  }, TEMPO);

  it('numeração continua para o mesmo clube e degrau; geral vira clube nulo', async () => {
    const a = await rascunho('cruzeiro', 'Em 1997, o Cruzeiro venceu a Libertadores contra qual clube na final?');
    const g = await rascunho('geral', 'Em 1950, qual seleção venceu a Copa do Mundo disputada no Brasil?');
    const [{ revisao_perguntas_aprovar: idA }] = await como<{ revisao_perguntas_aprovar: string }>(
      ADMIN,
      `select public.revisao_perguntas_aprovar($1, 'Em 1997, o Cruzeiro venceu a Libertadores contra qual clube?', 'Sporting Cristal', 'River Plate', 'Peñarol', 'Racing', 'media', 'titulos')`,
      [a],
    );
    expect(idA).toBe('cruzeiro-m-08');
    const [{ revisao_perguntas_aprovar: idG }] = await como<{ revisao_perguntas_aprovar: string }>(
      ADMIN,
      `select public.revisao_perguntas_aprovar($1, 'Em 1950, qual seleção venceu a Copa do Mundo no Brasil?', 'Uruguai', 'Brasil', 'Itália', 'Suécia', 'facil', 'copas')`,
      [g],
    );
    expect(idG).toBe('geral-f-01');
    const [p] = (await db.query<{ clube: string | null }>(`select clube from public.perguntas where id = 'geral-f-01'`)).rows;
    expect(p.clube).toBeNull();
  }, TEMPO);

  it('reprovar guarda o motivo e tira da fila', async () => {
    const id = await rascunho('santos', 'Em 1962, o Santos venceu qual clube na final do Mundial Interclubes?');
    await como(ADMIN, `select public.revisao_perguntas_reprovar($1, 'fato ambíguo')`, [id]);
    const [r] = (await db.query<{ status: string; motivo: string }>(`select status, motivo from staging_gt.rascunhos_perguntas where id = $1`, [id])).rows;
    expect(r).toEqual({ status: 'reprovada', motivo: 'fato ambíguo' });
    const fila = await como<{ id: number }>(ADMIN, 'select * from public.revisao_perguntas_fila(30)');
    expect(fila.map((f) => Number(f.id))).not.toContain(id);
  }, TEMPO);
});
