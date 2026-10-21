// Validador dos CSVs de lances dos Lances do Jogo (docs/jogo.md, seção 7.3, "Catálogo").
// Puro (sem disco nem rede): usado pelos testes e, depois, pelo import do catálogo.
// A física de cada cena e a faixa (robô de calibragem) são conferidas em src/jogo/lancesCatalogo.test.ts.

import { CLUBES, DOMINIOS_ACEITOS, acharPalavras, acharTemas, lerCsv, normalizar } from '../perguntas/validar.mjs';

export const COLUNAS = [
  'id', 'clube', 'tipo', 'titulo', 'ficha', 'pessoas', 'competicao', 'data', 'adversario', 'estadio',
  'bola_x', 'bola_z', 'barreira', 'barreira_mira_x', 'goleiro_saida', 'canto', 'chegada', 'chegada_de', 'faixa',
  'fonte', 'fonte2', 'verificada_em', 'status', 'observacao',
];

/** Os 20 clubes e a Seleção, coleção extra aberta a todos. */
export const CLUBES_LANCE = [...CLUBES, 'selecao'];
export const TIPOS = ['falta', 'finalizacao'];
export const FAIXAS = ['facil', 'media', 'dificil', 'craque'];
export const STATUS = ['rascunho', 'revisada', 'ativa', 'aposentada'];

/** Canto onde a bola entrou, visto de trás de quem bate, e a zona do motor (0 a 5, como nos pênaltis). */
export const CANTOS = {
  'baixo-esquerda': 0, 'baixo-meio': 1, 'baixo-direita': 2,
  'alto-esquerda': 3, 'alto-meio': 4, 'alto-direita': 5,
};

/** De onde a bola chega no cara a cara (a seta de "A jogada"): passe de trás, de um lado ou rebote na área. */
export const CHEGADAS = ['tras', 'esquerda', 'direita', 'rebote'];

export const MAX_TITULO = 40;
export const MAX_CHEGADA = 90;
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
const numero = (s) => (s === '' ? NaN : Number(String(s).replace(',', '.')));

/** Linhas do CSV como objetos, com o número da linha no arquivo (cabeçalho = 1). */
export function lerLances(texto) {
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

/** A cena do motor (CenaLance de src/jogo/lances.ts) a partir de uma linha do CSV. */
export function cenaDoLance(l) {
  const cena = {
    tipo: l.tipo,
    bola: { x: numero(l.bola_x), z: numero(l.bola_z) },
    zonaHistorica: CANTOS[l.canto] ?? -1,
    faixa: l.faixa,
  };
  if (l.barreira !== '') cena.barreira = { jogadores: numero(l.barreira), miraX: numero(l.barreira_mira_x) };
  if (l.goleiro_saida !== '') cena.goleiroSaida = numero(l.goleiro_saida);
  return cena;
}

/** Pedaços de nome que não podem aparecer no título (nome real só na ficha; seção 8). */
function pedacosDeNomes(pessoas) {
  return pessoas
    .split(';')
    .flatMap((n) => normalizar(n).split(/[^a-z0-9]+/))
    .filter((p) => p.length >= 3 && !['dos', 'das', 'del', 'van', 'von'].includes(p));
}

/** Erros de um lance (lista vazia = ok). */
export function validarLance(l) {
  const erros = [];
  const clubeOk = CLUBES_LANCE.includes(l.clube);
  if (!clubeOk) erros.push(`clube "${l.clube}" não é um dos 20 nem "selecao"`);
  if (!TIPOS.includes(l.tipo)) erros.push(`tipo "${l.tipo}" (use ${TIPOS.join(' ou ')})`);

  const ano = /^\d{4}-\d{2}-\d{2}$/.test(l.data) && !Number.isNaN(Date.parse(l.data)) ? l.data.slice(0, 4) : null;
  if (!ano) erros.push(`data "${l.data}" (use AAAA-MM-DD)`);
  if (!/^[a-z0-9-]+-\d{4}-[a-z0-9-]+$/.test(l.id)) erros.push(`id "${l.id}" fora do formato clube-ano-apelido`);
  else if (clubeOk && ano && !l.id.startsWith(`${l.clube}-${ano}-`)) erros.push(`id "${l.id}" não bate com clube e ano (${l.clube}-${ano}-…)`);

  if (l.titulo.length < 5 || l.titulo.length > MAX_TITULO) erros.push(`título com ${l.titulo.length} caracteres (5 a ${MAX_TITULO})`);
  if (l.ficha.length < 40 || l.ficha.length > MAX_FICHA) erros.push(`ficha com ${l.ficha.length} caracteres (40 a ${MAX_FICHA})`);
  if (ano && !l.ficha.includes(ano)) erros.push('a ficha precisa citar o ano');
  // Nome real só na ficha: o título nunca leva nome, sobrenome ou número de camisa.
  const tituloN = normalizar(l.titulo).split(/[^a-z0-9]+/);
  for (const p of pedacosDeNomes(l.pessoas)) if (tituloN.includes(p)) erros.push(`título com nome de pessoa: "${p}"`);
  if (/\bcamisa\b|\bnumero\s?\d|n[º°]\s?\d/.test(normalizar(l.titulo))) erros.push('título com número de camisa');
  for (const p of l.pessoas ? l.pessoas.split(';') : []) {
    if (!normalizar(l.ficha).includes(normalizar(p.trim()))) erros.push(`"${p.trim()}" está em pessoas mas não na ficha`);
  }
  if (!l.competicao) erros.push('competição vazia');
  if (!l.adversario) erros.push('adversário vazio');
  if (!l.estadio) erros.push('estádio vazio');

  for (const c of ['bola_x', 'bola_z']) if (!Number.isFinite(numero(l[c]))) erros.push(`${c} não é número`);
  if (l.tipo === 'falta') {
    if (!Number.isInteger(numero(l.barreira))) erros.push('falta precisa do número de jogadores da barreira');
    if (!Number.isFinite(numero(l.barreira_mira_x))) erros.push('falta precisa de barreira_mira_x');
    if (l.goleiro_saida !== '') erros.push('na falta o goleiro fica na linha (goleiro_saida vazio)');
  }
  if (l.tipo === 'finalizacao') {
    if (l.barreira !== '' || l.barreira_mira_x !== '') erros.push('cara a cara não tem barreira');
    if (l.goleiro_saida !== '' && !Number.isFinite(numero(l.goleiro_saida))) erros.push('goleiro_saida não é número');
  }
  if (!(l.canto in CANTOS)) erros.push(`canto "${l.canto}" (${Object.keys(CANTOS).join(', ')})`);
  // "A jogada" (como a bola chegou): obrigatória no cara a cara, sem nome de pessoa.
  if (l.tipo === 'finalizacao') {
    if (l.chegada.length < 10 || l.chegada.length > MAX_CHEGADA) erros.push(`chegada com ${l.chegada.length} caracteres (10 a ${MAX_CHEGADA})`);
    if (!CHEGADAS.includes(l.chegada_de)) erros.push(`chegada_de "${l.chegada_de}" (${CHEGADAS.join(', ')})`);
    const chegadaN = normalizar(l.chegada).split(/[^a-z0-9]+/);
    for (const p of pedacosDeNomes(l.pessoas)) if (chegadaN.includes(p)) erros.push(`chegada com nome de pessoa: "${p}"`);
  } else if (l.chegada || l.chegada_de) erros.push('falta não tem chegada');
  if (!FAIXAS.includes(l.faixa)) erros.push(`faixa "${l.faixa}" (${FAIXAS.join(', ')})`);

  const dom = dominioDe(l.fonte);
  if (!dom) erros.push('fonte sem link válido');
  else if (ehWikipedia(dom)) erros.push('Wikipédia não pode ser a fonte principal (só a fonte2)');
  else if (!aceito(dom)) erros.push(`fonte de domínio não aceito: ${dom} (se for confiável, acrescente em DOMINIOS_ACEITOS)`);
  if (l.fonte2) {
    const d2 = dominioDe(l.fonte2);
    if (!d2) erros.push('fonte2 sem link válido');
    else if (!ehWikipedia(d2) && !aceito(d2)) erros.push(`fonte2 de domínio não aceito: ${d2}`);
  }

  if (!STATUS.includes(l.status)) erros.push(`status "${l.status}" (${STATUS.join(', ')})`);
  if (l.status !== 'rascunho' && (!/^\d{4}-\d{2}-\d{2}$/.test(l.verificada_em) || Number.isNaN(Date.parse(l.verificada_em)))) {
    erros.push(`verificada_em "${l.verificada_em}" (use AAAA-MM-DD; obrigatória depois do rascunho)`);
  }

  const texto = [l.titulo, l.ficha, l.chegada, l.competicao, l.adversario, l.estadio].join(' | ');
  for (const w of acharPalavras(texto)) erros.push(`palavra proibida: "${w}"`);
  for (const w of acharTemas(texto)) erros.push(`tema fora da regra: "${w}"`);
  return erros;
}

/** Valida um conjunto (vários arquivos): erros por lance, ids e títulos repetidos. */
export function validarConjunto(lances) {
  const erros = [];
  const ids = new Map();
  const titulos = new Map();
  for (const l of lances) {
    const onde = `${l._arquivo ?? ''}:${l._linha ?? '?'}`;
    for (const e of validarLance(l)) erros.push({ onde, id: l.id, erro: e });
    if (ids.has(l.id)) erros.push({ onde, id: l.id, erro: `id repetido (também em ${ids.get(l.id)})` });
    else ids.set(l.id, onde);
    const t = normalizar(l.titulo).replace(/[^a-z0-9]/g, '');
    if (titulos.has(t)) erros.push({ onde, id: l.id, erro: `título repetido (também em ${titulos.get(t)})` });
    else titulos.set(t, onde);
  }
  return erros;
}
