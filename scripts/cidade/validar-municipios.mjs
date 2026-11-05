// Validador da lista de municípios: lê o JSON e a migração de carga.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CAMINHO_JSON, CAMINHO_SQL } from './gerar-municipios.mjs';

export const COD_UF = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25,
  PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};
export const ANCORAS = [
  [3550308, 'São Paulo', 'SP'],
  [3304557, 'Rio de Janeiro', 'RJ'],
  [3510500, 'Caraguatatuba', 'SP'],
  [5300108, 'Brasília', 'DF'],
];

/** Lê a migração: linhas (codigo, 'nome', 'UF'). */
export function lerSql(sql) {
  const re = /^\((\d+), '((?:[^']|'')*)', '([A-Z]{2})'\)[,;]?$/gm;
  const out = [];
  for (const m of sql.matchAll(re)) out.push([Number(m[1]), m[2].replace(/''/g, "'"), m[3]]);
  return out;
}

export function validar(lista, listaSql) {
  const erros = [];
  const avisos = [];
  if (lista.length < 5560 || lista.length > 5580) erros.push(`quantidade fora de 5560..5580: ${lista.length}`);
  const ufs = new Set(lista.map((m) => m[2]));
  for (const u of Object.keys(COD_UF)) if (!ufs.has(u)) erros.push(`falta a UF ${u}`);
  for (const u of ufs) if (!(u in COD_UF)) erros.push(`UF inesperada: ${u}`);
  const vistos = new Set();
  for (const [c, n, u] of lista) {
    if (!/^\d{7}$/.test(String(c))) erros.push(`código inválido: ${c}`);
    else if (COD_UF[u] !== Number(String(c).slice(0, 2))) erros.push(`código ${c} não bate com a UF ${u}`);
    if (vistos.has(c)) erros.push(`código repetido: ${c}`);
    vistos.add(c);
    if (typeof n !== 'string' || !n.trim()) erros.push(`nome vazio: ${c}`);
    else {
      if (n !== n.trim() || /\s{2,}/.test(n)) avisos.push(`espaços estranhos: ${c} "${n}"`);
      if (/[^\p{L}\p{M}\s'’.\-]/u.test(n)) avisos.push(`caractere incomum: ${c} "${n}"`);
    }
  }
  for (const [c, n, u] of ANCORAS) {
    const m = lista.find((x) => x[0] === c);
    if (!m || m[1] !== n || m[2] !== u) erros.push(`âncora ${c} ${n} ${u} não bate`);
  }
  if (listaSql) {
    const chave = (l) => l.map((m) => m.join('|')).sort().join('\n');
    if (listaSql.length !== lista.length) erros.push(`migração tem ${listaSql.length}, JSON tem ${lista.length}`);
    else if (chave(listaSql) !== chave(lista)) erros.push('JSON e migração têm conjuntos diferentes');
  }
  return { erros, avisos };
}

export function validarArquivos() {
  const lista = JSON.parse(readFileSync(CAMINHO_JSON, 'utf8'));
  const sql = lerSql(readFileSync(CAMINHO_SQL, 'utf8'));
  return validar(lista, sql);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { erros, avisos } = validarArquivos();
  for (const a of avisos) console.warn('aviso:', a);
  for (const e of erros) console.error('erro:', e);
  process.exit(erros.length ? 1 : 0);
}
