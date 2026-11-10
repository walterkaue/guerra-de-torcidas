// Sobrenome de jogador no apelido (20261110100000_apelido_sobrenome.sql; docs/jogo.md, seção 4, "Apelido"): passa
// junto com outro nome; só o nome do jogador, ou o nome completo dele, segue barrado, mesmo disfarçado; as ofensas
// seguem como antes. Roda o SQL de verdade (PGlite), pelo salvar_torcedor do celular.

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

/** Os apelidos da lista que o filtro barra (uma consulta só). */
const barrados = async (apelidos: string[]) =>
  (await db.query<{ a: string }>('select a from unnest($1::text[]) a where public.apelido_bloqueado(a)', [apelidos])).rows.map((r) => r.a);

// Os mesmos casos de src/dados/apelidosFamosos.test.ts.
const SO_O_NOME = [
  'Ceni', 'CENI', 'Cení', 'ceni 01', 'C3ni', 'ceni!!', 'Ceni10', 'Ce ni', 'C e n i', 'N e y m a r', 'Gabigol', 'Neymar',
  'C3ni 01', 'C3ni01', 'N3ymar 10', 'N3ymar10', 'P3l3 10', 'P3l310', 'Z1co 10', 'Ceni 2026', '@neymar', '@ceni',
  'neymar$', '$ceni', 'Neymarr', 'Neymaar', 'Ceeni', 'Zagalo', 'Caleri', 'Ceni Ceni', 'Neymar Neymar', 'CeniCeni',
  'Romário Romário', 'O Ceni', 'A Zico', 'Ceni K', 'Neymar J.', 'Ceni Jr', 'Neymar Junior', 'Neymar Júnior',
  'Neymar 10 Jr', 'De Arrascaeta', 'Ceni ⚽', 'Ce​ni',
];
const NOME_COMPLETO = [
  'Rogério Ceni', 'rogerioceni10', 'RogérioCeni', 'rogerio ceni 10', 'Rogério 10 Ceni', 'R0gério 10 Ceni',
  'R0gério10Ceni', 'Rogério Ceeni', 'Gabriel Barbosa', 'Gabriel 10 Barbosa', 'Vini Jr', 'Vini Junior', 'Rei Pelé',
  'Mané Garrincha', 'Mario Zagalo', 'Giorgian de Arrascaeta', 'Rodrygo Goes', 'Walter Kannemann', 'Pablo Vegetti',
  "Andrés D'Alessandro", 'Dejan Petković',
];
const COM_OUTRO_NOME = [
  'Kauê Ceni', 'Ceni do Kauê', 'Ceni e Kauê', 'Zé Gabigol', 'Ze Ceni', 'Pedro Calleri', 'Ana Zico', 'Cris Garrincha',
  'KauêCeni', 'Neymar da Vila', 'Seedorf Kauê', 'Kendrick Lamar',
];

beforeAll(async () => {
  db = await bancoDeTeste();
  // O esboço da Supabase não tira acento; aqui o unaccent tira os do português, como o de verdade.
  await db.exec(`
    create or replace function extensions.unaccent(t text) returns text language sql immutable
      as $$ select translate(t, 'áàâãäéèêëíìîïóòôõöúùûüçñćÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑĆ', 'aaaaaeeeeiiiiooooouuuucncAAAAAEEEEIIIIOOOOOUUUUCNC') $$;
  `);
}, TEMPO);

describe('sobrenome ou apelido de jogador no apelido', () => {
  it('passa junto com outro nome, e o servidor grava', async () => {
    for (const a of ['Kauê Ceni', 'Ceni do Kauê', 'Zé Gabigol', 'Pedro Calleri', 'Ana Zico']) {
      const eu = await torcedor('18_mais');
      expect(await salvar(eu, a), a).toEqual([{ apelido: a }]);
    }
    expect(await barrados(COM_OUTRO_NOME)).toEqual([]);
  }, TEMPO);

  it('só o nome do jogador, ou o nome completo dele, continua barrado no salvar', async () => {
    const eu = await torcedor('18_mais');
    const lista = ['Ceni', 'CENI', 'ceni 01', 'C3ni', 'ceni!!', 'Gabigol', 'Neymar', 'Rogério Ceni', 'rogerioceni10', 'RogérioCeni', 'rogerio ceni 10', 'Gabriel Barbosa', 'Vini Jr', 'C3ni 01', '@neymar', 'O Ceni'];
    for (const a of lista) await expect(salvar(eu, a), a).rejects.toThrow(/apelido_bloqueado/);
  }, TEMPO);

  it('o nome do jogador sozinho não passa com truque: número, sinal, letra repetida, artigo, Jr', async () => {
    const lista = await barrados(SO_O_NOME);
    expect(SO_O_NOME.filter((a) => !lista.includes(a))).toEqual([]);
  }, TEMPO);

  it('o nome completo barra em qualquer lugar, mesmo com número no meio', async () => {
    const lista = await barrados(NOME_COMPLETO);
    expect(NOME_COMPLETO.filter((a) => !lista.includes(a))).toEqual([]);
  }, TEMPO);

  it('não barra nenhum dos 5.570 municípios', async () => {
    const { rows } = await db.query<{ nome: string }>('select nome from public.municipios where public.apelido_bloqueado(nome)');
    expect(rows.map((r) => r.nome)).toEqual([]);
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

  it('padrao e esqueleto são calculados pelo banco, e ninguém escreve neles', async () => {
    const { rows } = await db.query<{ padrao: string; esqueleto: string }>(`select padrao, esqueleto from public.palavras_bloqueadas where palavra = 'ceni'`);
    expect(rows).toEqual([{ padrao: 'c+[OIEAST]*[eE]+[OIEAST]*n+[OIEAST]*[iI]+[OIEAST]*', esqueleto: 'cn' }]);
    await expect(db.query(`update public.palavras_bloqueadas set padrao = '.*' where palavra = 'ceni'`)).rejects.toThrow(/only be updated to DEFAULT/);
  }, TEMPO);

  it('palavra estranha posta à mão não quebra o filtro nem barra tudo', async () => {
    await db.exec('begin');
    try {
      await db.exec(`insert into public.palavras_bloqueadas (palavra, famoso) values ('(.*', 'nome'), ('123', 'palavra'), ('a+b[', 'palavra')`);
      expect(await bloqueado('Zé da Geral')).toBe(false);
      expect(await bloqueado('10')).toBe(false);
      expect(await bloqueado('Ceni')).toBe(true);
      expect(await bloqueado('ab')).toBe(true);
    } finally {
      await db.exec('rollback');
    }
  }, TEMPO);
});

describe('palavras ofensivas seguem como antes', () => {
  it('toda ofensa barra sozinha, ao lado de outro nome e (as longas) colada e espaçada', async () => {
    const { rows } = await db.query<{ palavra: string }>('select palavra from public.palavras_bloqueadas where famoso is null');
    for (const { palavra } of rows) {
      expect(await bloqueado(palavra), palavra).toBe(true);
      expect(await bloqueado(`Kauê ${palavra}`), palavra).toBe(true);
      expect(await bloqueado(`${palavra} 10`), palavra).toBe(true);
      expect(await bloqueado(palavra.toUpperCase()), palavra).toBe(true);
      if (palavra.length > 4) {
        expect(await bloqueado(`Kaue${palavra}`), palavra).toBe(true);
        expect(await bloqueado(`${palavra}10`), palavra).toBe(true);
        expect(await bloqueado(palavra.split('').join(' ')), palavra).toBe(true);
      }
    }
    expect(await bloqueado('P0RR4 do Kauê')).toBe(true);
    // Curta só pega inteira: "cu" não pega "Curitiba".
    expect(await bloqueado('Curitiba')).toBe(false);
  }, TEMPO);

  it('para ofensa, dá o mesmo resultado que a função de antes do PR', async () => {
    const antes = await bancoDeTeste('20261110100000_apelido_sobrenome.sql');
    try {
      await antes.exec(`create or replace function extensions.unaccent(t text) returns text language sql immutable
        as $$ select translate(t, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN') $$;`);
      const { rows } = await db.query<{ palavra: string }>('select palavra from public.palavras_bloqueadas where famoso is null');
      const casos = rows.flatMap(({ palavra: p }) => [p, `Kauê ${p}`, `Kaue${p}`, `${p}10`, p.split('').join(' '), `x${p}x`, p.slice(1), `${p}s`]);
      casos.push('Curitiba', 'Cuiabá', 'Betânia', 'Rolândia', 'Pirocaia', 'Bet Kauê', 'Odd Kauê', 'Odessa', 'Kauê', 'Zé da Geral');
      const so = async (banco: PGlite) => {
        const { rows: r } = await banco.query<{ a: string; b: boolean }>(
          `select a, public.apelido_bloqueado(a) as b from unnest($1::text[]) a
           where not exists (select 1 from public.palavras_bloqueadas w where w.famoso is not null and public.normalizar_apelido(a) like '%' || w.palavra || '%')`,
          [casos],
        );
        return r;
      };
      // Só casos sem palavra de jogador dentro: neles, o antes e o depois têm de ser iguais.
      const depois = await so(db);
      const deAntes = new Map((await antes.query<{ a: string; b: boolean }>('select a, public.apelido_bloqueado(a) as b from unnest($1::text[]) a', [casos])).rows.map((r) => [r.a, r.b]));
      expect(depois.length).toBeGreaterThan(200);
      expect(depois.filter((r) => deAntes.get(r.a) !== r.b).map((r) => r.a)).toEqual([]);
    } finally {
      await antes.close();
    }
  }, TEMPO);

  it('menor de 16 continua sem apelido, mesmo com apelido que passa no filtro', async () => {
    const eu = await torcedor('menos_16');
    expect(await salvar(eu, 'Kauê Ceni')).toEqual([{ apelido: null }]);
    await expect(salvar(eu, 'Ceni')).rejects.toThrow(/apelido_bloqueado/);
  }, TEMPO);

  it('apelido_bloqueado segue fechado para o celular', async () => {
    const { rows } = await db.query<{ anon: boolean; aut: boolean; definer: boolean; config: string[] }>(`
      select has_function_privilege('anon', 'public.apelido_bloqueado(text)', 'execute') as anon,
             has_function_privilege('authenticated', 'public.apelido_bloqueado(text)', 'execute') as aut,
             p.prosecdef as definer, p.proconfig as config
      from pg_proc p where p.oid = 'public.apelido_bloqueado(text)'::regprocedure`);
    expect(rows).toEqual([{ anon: false, aut: false, definer: true, config: ['search_path=""'] }]);
  }, TEMPO);
});
