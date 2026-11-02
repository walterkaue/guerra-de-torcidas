// Validador dos CSVs de disputas históricas de pênaltis (docs/jogo.md, seção 6, "Pênaltis dentro dos Lances").
// Puro (sem disco nem rede): usado pelos testes e pelo gerador do catálogo.

import { CLUBES, DOMINIOS_ACEITOS, MARCAS_PROIBIDAS, acharPalavras, acharTemas, lerCsv, normalizar } from '../perguntas/validar.mjs';

export const COLUNAS = [
  'id', 'clube', 'titulo', 'ficha', 'pessoas', 'competicao', 'fase', 'data', 'adversario', 'estadio',
  'placar_disputa', 'fonte', 'fonte2', 'verificada_em', 'status', 'observacao',
];

/** Os 20 clubes e a Seleção, aberta a todos. */
export const CLUBES_DISPUTA = [...CLUBES, 'selecao'];
export const STATUS = ['rascunho', 'revisada', 'ativa', 'aposentada'];
/** A fase vira a frase do jogo: "Final de 2018: foi 4 x 3." */
export const FASES = ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final', 'Quarta fase', 'Terceira fase', 'Segunda fase', 'Primeira fase'];

export const MAX_TITULO = 40;
export const MAX_FICHA = 260;

function dominioDe(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

const aceito = (dominio) => DOMINIOS_ACEITOS.some((d) => dominio === d || dominio.endsWith(`.${d}`));
const ehWikipedia = (dominio) => dominio === 'wikipedia.org' || dominio.endsWith('.wikipedia.org');
const palavraInteira = (texto, p) => new RegExp(`(^|[^a-z0-9])${p.replace(/ /g, '\\s+')}($|[^a-z0-9])`).test(texto);

/** Linhas do CSV como objetos, com o número da linha no arquivo (cabeçalho = 1). */
export function lerDisputas(texto) {
  const [cabecalho, ...resto] = lerCsv(texto);
  if (!cabecalho) throw new Error('arquivo vazio');
  const cab = cabecalho.map((c) => c.trim());
  const faltando = COLUNAS.filter((c) => !cab.includes(c));
  if (faltando.length) throw new Error(`faltam colunas: ${faltando.join(', ')}`);
  return resto.map((valores, i) => {
    const o = { _linha: i + 2 };
    cab.forEach((c, k) => (o[c] = (valores[k] ?? '').trim()));
    return o;
  });
}

/** Pedaços de nome que não podem aparecer no título (nome real só na ficha; seção 8). */
function pedacosDeNomes(pessoas) {
  return pessoas
    .split(';')
    .flatMap((n) => normalizar(n).split(/[^a-z0-9]+/))
    .filter((p) => p.length >= 3 && !['dos', 'das', 'del', 'van', 'von'].includes(p));
}

/** "4 x 3" do clube contra o adversário: só disputa que o clube venceu e com placar possível. */
function errosDoPlacar(placar) {
  const m = /^(\d{1,2}) x (\d{1,2})$/.exec(placar);
  if (!m) return [`placar_disputa "${placar}" (use "4 x 3", com o clube primeiro)`];
  const [nos, eles] = [Number(m[1]), Number(m[2])];
  if (nos <= eles) return [`placar_disputa "${placar}": só entra disputa que o clube venceu`];
  // Nas 5 primeiras acaba quando não dá mais para virar (até 3 de diferença); nas alternadas, sempre por 1.
  if (nos > 5 ? nos - eles !== 1 : nos - eles > 3) return [`placar_disputa "${placar}" é impossível numa disputa de pênaltis`];
  return [];
}

/** Erros de uma disputa (lista vazia = ok). */
export function validarDisputa(d) {
  const erros = [];
  const clubeOk = CLUBES_DISPUTA.includes(d.clube);
  if (!clubeOk) erros.push(`clube "${d.clube}" não é um dos 20 nem "selecao"`);

  const ano = /^\d{4}-\d{2}-\d{2}$/.test(d.data) && !Number.isNaN(Date.parse(d.data)) ? d.data.slice(0, 4) : null;
  if (!ano) erros.push(`data "${d.data}" (use AAAA-MM-DD)`);
  if (!/^[a-z0-9-]+-\d{4}-[a-z0-9-]+$/.test(d.id)) erros.push(`id "${d.id}" fora do formato clube-ano-apelido`);
  else if (clubeOk && ano && !d.id.startsWith(`${d.clube}-${ano}-`)) erros.push(`id "${d.id}" não bate com clube e ano (${d.clube}-${ano}-…)`);

  if (d.titulo.length < 5 || d.titulo.length > MAX_TITULO) erros.push(`título com ${d.titulo.length} caracteres (5 a ${MAX_TITULO})`);
  if (d.ficha.length < 40 || d.ficha.length > MAX_FICHA) erros.push(`ficha com ${d.ficha.length} caracteres (40 a ${MAX_FICHA})`);
  if (ano && !d.ficha.includes(ano)) erros.push('a ficha precisa citar o ano');

  // Nome real só na ficha: o título nunca leva nome, sobrenome ou número de camisa.
  const tituloN = normalizar(d.titulo).split(/[^a-z0-9]+/);
  for (const p of pedacosDeNomes(d.pessoas)) if (tituloN.includes(p)) erros.push(`título com nome de pessoa: "${p}"`);
  if (/\bcamisa\b|\bnumero\s?\d|n[º°]\s?\d/.test(normalizar(d.titulo))) erros.push('título com número de camisa');
  for (const p of d.pessoas ? d.pessoas.split(';') : []) {
    if (!normalizar(d.ficha).includes(normalizar(p.trim()))) erros.push(`"${p.trim()}" está em pessoas mas não na ficha`);
  }

  if (!d.competicao) erros.push('competição vazia');
  if (!FASES.includes(d.fase)) erros.push(`fase "${d.fase}" (${FASES.join(', ')})`);
  if (!d.adversario) erros.push('adversário vazio');
  if (!d.estadio) erros.push('estádio vazio');

  const errosPlacar = errosDoPlacar(d.placar_disputa);
  erros.push(...errosPlacar);
  if (!errosPlacar.length) {
    const [nos, eles] = d.placar_disputa.split(' x ');
    if (!new RegExp(`\\b${nos} (a|x) ${eles}\\b`).test(d.ficha)) erros.push(`a ficha precisa citar o placar da disputa (${nos} a ${eles})`);
  }

  const dom = dominioDe(d.fonte);
  if (!dom) erros.push('fonte sem link válido');
  else if (ehWikipedia(dom)) erros.push('Wikipédia não pode ser a fonte principal (só a fonte2)');
  else if (!aceito(dom)) erros.push(`fonte de domínio não aceito: ${dom} (se for confiável, acrescente em DOMINIOS_ACEITOS)`);
  if (d.fonte2) {
    const d2 = dominioDe(d.fonte2);
    if (!d2) erros.push('fonte2 sem link válido');
    else if (!ehWikipedia(d2) && !aceito(d2)) erros.push(`fonte2 de domínio não aceito: ${d2}`);
  }

  if (!STATUS.includes(d.status)) erros.push(`status "${d.status}" (${STATUS.join(', ')})`);
  if (d.status !== 'rascunho' && (!/^\d{4}-\d{2}-\d{2}$/.test(d.verificada_em) || Number.isNaN(Date.parse(d.verificada_em)))) {
    erros.push(`verificada_em "${d.verificada_em}" (use AAAA-MM-DD; obrigatória depois do rascunho)`);
  }

  const texto = [d.titulo, d.ficha, d.competicao, d.adversario, d.estadio].join(' | ');
  for (const w of acharPalavras(texto)) erros.push(`palavra proibida: "${w}"`);
  for (const w of acharTemas(texto)) erros.push(`tema fora da regra: "${w}"`);
  const textoN = normalizar(texto);
  for (const m of MARCAS_PROIBIDAS) if (palavraInteira(textoN, m)) erros.push(`marca de terceiros: "${m}"`);
  return erros;
}

/** Valida um conjunto (vários arquivos): erros por disputa, ids, títulos e jogos repetidos. */
export function validarConjunto(disputas) {
  const erros = [];
  const ids = new Map();
  const titulos = new Map();
  const jogos = new Map();
  for (const d of disputas) {
    const onde = `${d._arquivo ?? ''}:${d._linha ?? '?'}`;
    for (const e of validarDisputa(d)) erros.push({ onde, id: d.id, erro: e });
    if (ids.has(d.id)) erros.push({ onde, id: d.id, erro: `id repetido (também em ${ids.get(d.id)})` });
    else ids.set(d.id, onde);
    const t = normalizar(d.titulo).replace(/[^a-z0-9]/g, '');
    if (titulos.has(t)) erros.push({ onde, id: d.id, erro: `título repetido (também em ${titulos.get(t)})` });
    else titulos.set(t, onde);
    const j = `${d.clube}|${d.data}`;
    if (jogos.has(j)) erros.push({ onde, id: d.id, erro: `mesmo clube e data de ${jogos.get(j)}` });
    else jogos.set(j, onde);
  }
  return erros;
}
