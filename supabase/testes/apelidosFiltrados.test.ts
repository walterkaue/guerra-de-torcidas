// Lista do #admin com os apelidos já gravados que o filtro barraria (20261106200000). Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

let db: PGlite;
let admin: string;
let comum: string;

async function torcedor(apelido: string | null, anonimo = true): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous) values ($1, $2)', [id, anonimo]);
  await db.query(`insert into public.torcedores (id, time_id, apelido, faixa_etaria) values ($1, 'bahia', $2, '18_mais')`, [id, apelido]);
  return id;
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

beforeAll(async () => {
  db = await bancoDeTeste();
  // Palavra inventada só para o teste (nenhum nome de pessoa aqui).
  await db.query(`insert into public.palavras_bloqueadas (palavra) values ('zzpalavrateste')`);
  admin = await torcedor(null, false);
  await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
  comum = await torcedor('Torcedor Feliz');
  await torcedor('Zz Palavra Teste');
  await torcedor('Zz Palavra Teste');
  await torcedor('zzpalavrateste 10');
  await torcedor('Torcedor Feliz');
  await torcedor(null);
}, TEMPO);

describe('apelidos_filtrados no #admin', () => {
  it('lista só os apelidos que o filtro barraria, com quantos usam, os mais usados primeiro', async () => {
    const r = await como<{ texto: string; quantos: number }>(admin, 'authenticated', 'select * from public.apelidos_filtrados()');
    expect(r).toEqual([
      { texto: 'Zz Palavra Teste', quantos: 2 },
      { texto: 'zzpalavrateste 10', quantos: 1 },
    ]);
  }, TEMPO);

  it('o que a lista mostra é o que apelido_contar acha, então dá para apagar', async () => {
    const r = await como<{ n: number }>(admin, 'authenticated', `select public.apelido_contar('Zz Palavra Teste') as n`);
    expect(r[0].n).toBe(2);
  }, TEMPO);

  it('só administrador chama; quem não é, e o anon, não', async () => {
    await expect(como(comum, 'authenticated', 'select * from public.apelidos_filtrados()')).rejects.toThrow(/sem_permissao/);
    await expect(como(null, 'anon', 'select * from public.apelidos_filtrados()')).rejects.toThrow(/permission denied/);
  }, TEMPO);

  it('depois de apagar, o apelido some da lista', async () => {
    await como(admin, 'authenticated', `select public.apelido_apagar('Zz Palavra Teste')`);
    const r = await como<{ texto: string }>(admin, 'authenticated', 'select * from public.apelidos_filtrados()');
    expect(r.map((x) => x.texto)).toEqual(['zzpalavrateste 10']);
  }, TEMPO);
});
