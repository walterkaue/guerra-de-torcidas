// Leitura e escrita dos CSVs de dados/casa/ (todos os campos entre aspas, cabeçalho sem aspas).
import { lerCsv } from '../perguntas/validar.mjs';

/** Fatos com fonte, conferidos por sessão ou por script. */
export const ARQUIVOS_DE_FATOS = ['clubes', 'estadios', 'titulos', 'recordes', 'goleadas', 'mantos'];
/** socios.csv fica à parte: quem marca `revisada` é o Kauê, no celular (docs/casa.md, seção 8). */
export const ARQUIVOS = [...ARQUIVOS_DE_FATOS, 'socios'];

/** Colunas que identificam uma linha de cada arquivo. */
export const CHAVES = {
  clubes: ['id'],
  estadios: ['clube'],
  titulos: ['clube', 'competicao', 'ano'],
  recordes: ['clube', 'lista', 'posicao'],
  goleadas: ['clube', 'placar', 'adversario'],
  mantos: ['clube', 'ordem'],
  socios: ['id'],
};

/** Coluna que diz de qual clube é a linha. */
export const COLUNA_CLUBE = { clubes: 'id', socios: 'id' };
export const colunaClube = (arquivo) => COLUNA_CLUBE[arquivo] ?? 'clube';

/** Site oficial de cada clube. */
export const SITE_DO_CLUBE = {
  'athletico-pr': 'athletico.com.br', 'atletico-mg': 'atletico.com.br', bahia: 'esporteclubebahia.com.br',
  botafogo: 'botafogo.com.br', bragantino: 'redbullbragantino.com.br', chapecoense: 'chapecoense.com',
  corinthians: 'corinthians.com.br', coritiba: 'coritiba.com.br', cruzeiro: 'cruzeiro.com.br',
  flamengo: 'flamengo.com.br', fluminense: 'fluminense.com.br', gremio: 'gremio.net',
  internacional: 'internacional.com.br', mirassol: 'mirassolfc.com.br', palmeiras: 'palmeiras.com.br',
  remo: 'clubedoremo.com.br', santos: 'santosfc.com.br', 'sao-paulo': 'saopaulofc.net',
  vasco: 'vasco.com.br', vitoria: 'ecvitoria.com.br',
};

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
