// Leitura e escrita dos CSVs de dados/casa/ (todos os campos entre aspas, cabeçalho sem aspas).
import { lerCsv } from '../perguntas/validar.mjs';

export const ARQUIVOS = ['clubes', 'estadios', 'titulos', 'recordes', 'goleadas', 'mantos'];

/** Colunas que identificam uma linha de cada arquivo. */
export const CHAVES = {
  clubes: ['id'],
  estadios: ['clube'],
  titulos: ['clube', 'competicao', 'ano'],
  recordes: ['clube', 'lista', 'posicao'],
  goleadas: ['clube', 'placar', 'adversario'],
  mantos: ['clube', 'ordem'],
};

/** Coluna que diz de qual clube é a linha. */
export const COLUNA_CLUBE = { clubes: 'id' };
export const colunaClube = (arquivo) => COLUNA_CLUBE[arquivo] ?? 'clube';

/** Texto do CSV → { cab, linhas }, com cada linha como objeto. */
export function lerTabela(texto) {
  const [cab, ...resto] = lerCsv(texto);
  const linhas = resto
    .filter((v) => v.length > 1 || (v[0] ?? '') !== '')
    .map((v) => Object.fromEntries(cab.map((c, i) => [c.trim(), v[i] ?? ''])));
  return { cab: cab.map((c) => c.trim()), linhas };
}

const citar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** { cab, linhas } → texto do CSV (cabeçalho sem aspas, campos com aspas, fim de linha \n). */
export function escreverTabela({ cab, linhas }) {
  return [cab.join(','), ...linhas.map((l) => cab.map((c) => citar(l[c])).join(','))].join('\n') + '\n';
}

export const chaveDe = (arquivo, linha) => CHAVES[arquivo].map((c) => String(linha[c] ?? '').trim()).join('|');
