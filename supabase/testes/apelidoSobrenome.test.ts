// Sobrenome de jogador no apelido (20261110100000_apelido_sobrenome.sql; docs/jogo.md, seção 4, "Apelido"): passa
// junto com outro nome; só o nome do jogador, ou o nome completo dele, segue barrado; as ofensas seguem como antes.
// Roda o SQL de verdade (PGlite), pelo salvar_torcedor do celular.

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 120_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;

async function torcedor(faixa: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous) values ($1, true)', [id]);
  await db.query(`insert into public.torcedores (id, time_id, faixa_etaria) values ($1, 'bahia', $2)`, [id, faixa]);
  return id;
}

async function salvar(uid: string, apelido: string): Promise<{ apelido: string | null }[]> {
  await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', '', false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return (await db.query<{ apelido: string | null }>('select apelido from public.salvar_torcedor($1, $2)', ['remo', apelido])).rows;
  } finally {
    await db.exec('reset role');
  }
}

const bloqueado = async (apelido: string) =>
  (await db.query<{ b: boolean }>('select public.apelido_bloqueado($1) as b', [apelido])).rows[0].b;

beforeAll(async () => {
  db = await bancoDeTeste();
  // O esboço da Supabase não tira acento; aqui o unaccent tira os do português, como o de verdade.
  await db.exec(`
    create or replace function extensions.unaccent(t text) returns text language sql immutable
      as $$ select translate(t, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC') $$;
  `);
}, TEMPO);

describe('sobrenome ou apelido de jogador no apelido', () => {
  it('passa junto com outro nome, e o servidor grava', async () => {
    for (const a of ['Kauê Ceni', 'Ceni do Kauê', 'Zé Gabigol', 'Pedro Calleri', 'Ana Zico']) {
      const eu = await torcedor('18_mais');
      expect(await salvar(eu, a), a).toEqual([{ apelido: a }]);
    }
  }, TEMPO);

  it('só o nome do jogador, ou o nome completo dele, continua barrado', async () => {
    const eu = await torcedor('18_mais');
    const barrados = ['Ceni', 'CENI', 'ceni 01', 'C3ni', 'ceni!!', 'Gabigol', 'Neymar', 'Rogério Ceni', 'rogerioceni10', 'RogérioCeni', 'rogerio ceni 10', 'Gabriel Barbosa', 'Vini Jr'];
    for (const a of barrados) await expect(salvar(eu, a), a).rejects.toThrow(/apelido_bloqueado/);
  }, TEMPO);

  it('nenhuma entrada de jogador ficou sem famoso, e as ofensas da base seguem com famoso null', async () => {
    const { rows } = await db.query<{ famoso: string | null; n: number }>(
      'select famoso, count(*)::int as n from public.palavras_bloqueadas group by famoso order by famoso nulls first',
    );
    const porTipo = Object.fromEntries(rows.map((r) => [r.famoso ?? 'ofensa', r.n]));
    expect(porTipo.ofensa).toBeGreaterThan(30);
    expect(porTipo.ofensa).toBeLessThan(60);
    expect(porTipo.palavra).toBeGreaterThan(50);
    expect(porTipo.nome).toBeGreaterThan(150);
    await expect(db.query(`update public.palavras_bloqueadas set famoso = 'outro' where palavra = 'ceni'`)).rejects.toThrow(/check/);
  }, TEMPO);
});

describe('palavras ofensivas seguem como antes', () => {
  it('toda ofensa barra sozinha, ao lado de outro nome e (as longas) colada nele', async () => {
    const { rows } = await db.query<{ palavra: string }>('select palavra from public.palavras_bloqueadas where famoso is null');
    for (const { palavra } of rows) {
      expect(await bloqueado(palavra), palavra).toBe(true);
      expect(await bloqueado(`Kauê ${palavra}`), palavra).toBe(true);
      if (palavra.length > 4) {
        expect(await bloqueado(`Kaue${palavra}`), palavra).toBe(true);
        expect(await bloqueado(palavra.split('').join(' ')), palavra).toBe(true);
      }
    }
    expect(await bloqueado('P0RR4 do Kauê')).toBe(true);
    // Curta só pega inteira: "cu" não pega "Curitiba".
    expect(await bloqueado('Curitiba')).toBe(false);
  }, TEMPO);

  it('menor de 16 continua sem apelido, mesmo com apelido que passa no filtro', async () => {
    const eu = await torcedor('menos_16');
    expect(await salvar(eu, 'Kauê Ceni')).toEqual([{ apelido: null }]);
    await expect(salvar(eu, 'Ceni')).rejects.toThrow(/apelido_bloqueado/);
  }, TEMPO);
});
