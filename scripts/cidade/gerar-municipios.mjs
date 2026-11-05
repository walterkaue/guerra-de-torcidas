// Gera a lista fechada de municípios do IBGE (Cidade do Guerra de Torcidas).
// Uso: npm run gerar-municipios
// Baixa da API oficial, grava o bruto em relatorios/ (fora do git) e gera
// public/dados/municipios.json e supabase/migrations/20261105000100_municipios.sql.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const URL_IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';
export const CAMINHO_BRUTO = join(RAIZ, 'relatorios', 'municipios-ibge.json');
export const CAMINHO_JSON = join(RAIZ, 'public', 'dados', 'municipios.json');
export const CAMINHO_SQL = join(RAIZ, 'supabase', 'migrations', '20261105000100_municipios.sql');

/** Bruto da API -> [[codigo, nome, uf]] ordenado por nome (pt-BR) e UF. */
export function normalizar(bruto) {
  const lista = bruto.map((m) => {
    const uf =
      m?.microrregiao?.mesorregiao?.UF?.sigla ??
      m?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;
    return [Number(m.id), String(m.nome ?? '').trim(), uf];
  });
  lista.sort((a, b) => a[1].localeCompare(b[1], 'pt-BR') || a[2].localeCompare(b[2]) || a[0] - b[0]);
  return lista;
}

export const montarSql = (lista) => {
  const q = (s) => s.replace(/'/g, "''");
  const valores = lista.map(([c, n, u]) => `(${c}, '${q(n)}', '${u}')`).join(',\n');
  return (
    '-- Gerado por scripts/cidade/gerar-municipios.mjs (fonte: API de localidades do IBGE). Não edite à mão.\n' +
    'insert into public.municipios (codigo, nome, uf) values\n' +
    valores +
    '\non conflict (codigo) do update set nome = excluded.nome, uf = excluded.uf;\n'
  );
};

async function principal() {
  const r = await fetch(URL_IBGE);
  if (!r.ok) throw new Error(`IBGE respondeu ${r.status}`);
  const bruto = await r.json();
  mkdirSync(dirname(CAMINHO_BRUTO), { recursive: true });
  writeFileSync(CAMINHO_BRUTO, JSON.stringify(bruto));
  const lista = normalizar(bruto);
  mkdirSync(dirname(CAMINHO_JSON), { recursive: true });
  writeFileSync(CAMINHO_JSON, JSON.stringify(lista));
  writeFileSync(CAMINHO_SQL, montarSql(lista));
  console.log(`${lista.length} municípios gravados.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
