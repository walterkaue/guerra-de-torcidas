// CÓPIA GERADA de scripts/perguntas por scripts/compartilhar.mjs. Não edite aqui: mude lá e rode `npm run compartilhar`.
// Validador dos CSVs de perguntas da Prova de Boleiro (docs/jogo.md, seção 7.1, "Banco de perguntas").
// Puro (sem disco nem rede): usado pelo `npm run importar-perguntas` e pelos testes.

export const COLUNAS = [
  'id', 'clube', 'degrau', 'tema', 'pergunta', 'certa', 'errada1', 'errada2', 'errada3',
  'fonte', 'fonte2', 'verificada_em', 'status', 'observacao',
];

export const CLUBES = [
  'athletico-pr', 'atletico-mg', 'bahia', 'botafogo', 'bragantino', 'chapecoense', 'corinthians', 'coritiba',
  'cruzeiro', 'flamengo', 'fluminense', 'gremio', 'internacional', 'mirassol', 'palmeiras', 'remo',
  'santos', 'sao-paulo', 'vasco', 'vitoria',
];

export const DEGRAUS = { facil: 1, media: 2, dificil: 3, craque: 4 };
const LETRA_DO_DEGRAU = { facil: 'f', media: 'm', dificil: 'd', craque: 'c' };
export const STATUS = ['rascunho', 'revisada', 'ativa', 'aposentada'];

export const MAX_PERGUNTA = 140;
export const MAX_ALTERNATIVA = 40;

/**
 * Fontes aceitas (seção 7.1): CBF, site oficial do clube ou da federação, imprensa esportiva, ogol.
 * Wikipédia só como segunda fonte. Domínio novo que for confiável: acrescente aqui.
 */
export const DOMINIOS_ACEITOS = [
  // entidades
  'cbf.com.br', 'fifa.com', 'inside.fifa.com', 'conmebol.com', 'uefa.com', 'theifab.com',
  'fpf.org.br', 'ferj.com.br', 'fmf.com.br', 'fgf.com.br', 'fbf.org.br', 'federacaopr.com.br',
  'fcf.com.br', 'fpfpara.com.br', 'fpf.com.br',
  // clubes (sites oficiais)
  'athletico.com.br', 'atletico.com.br', 'esporteclubebahia.com.br', 'botafogo.com.br',
  'redbullbragantino.com.br', 'chapecoense.com', 'corinthians.com.br', 'coritiba.com.br',
  'cruzeiro.com.br', 'flamengo.com.br', 'fluminense.com.br', 'gremio.net', 'internacional.com.br',
  'mirassolfc.com.br', 'palmeiras.com.br', 'clubedoremo.com.br', 'santosfc.com.br', 'saopaulofc.net',
  'vasco.com.br', 'ecvitoria.com.br',
  // estatística
  'ogol.com.br',
  // imprensa esportiva
  'globo.com', 'lance.com.br', 'espn.com.br', 'uol.com.br', 'gazetaesportiva.com', 'placar.com.br',
  'placar.abril.com.br', 'terra.com.br', 'estadao.com.br', 'folha.uol.com.br', 'cnnbrasil.com.br',
  'r7.com', 'band.uol.com.br', 'metropoles.com', 'trivela.com.br', 'goal.com', 'olympics.com',
  'gauchazh.clicrbs.com.br', 'otempo.com.br', 'em.com.br', 'correiobraziliense.com.br',
  'correio24horas.com.br', 'oliberal.com', 'diariodepernambuco.com.br', 'nsctotal.com.br',
  'gazetadopovo.com.br', 'bandeirantes.com.br', 'sportv.globo.com', 'bbc.com', 'reuters.com',
  'jovempan.com.br', 'itatiaia.com.br', 'opovo.com.br', 'tribunapr.com.br', 'bahianoticias.com.br',
  'bandab.com.br', 'superesportes.com.br', 'radioguaiba.com.br', 'gzh.com.br',
  // aprovado pelo Kauê em 21/10/2026 (abriu na conferência; bemparana.com.br e band.com.br
  // responderam 403 com desafio do Cloudflare e ficaram de fora)
  'umdoisesportes.com.br',
];

/** Zero aposta (seção 7) e, no quiz, nada de "prêmio", "milhão" ou "valendo" (narrador, seção 10). */
export const PALAVRAS_PROIBIDAS = [
  'aposta', 'apostas', 'apostar', 'bet', 'bets', 'odd', 'odds', 'cotacao', 'cotacoes', 'banca',
  'bolao valendo', 'green', 'red', 'premio', 'premios', 'milhao', 'valendo',
];

/** Marcas de terceiros (patrocínio de estádio, competição e camisa, fornecedor, aposta): nem na Casa nem no quiz. */
export const MARCAS_PROIBIDAS = [
  'mrv', 'ligga', 'itaipava', 'casa de apostas', 'red bull', 'umbro', 'puma', 'adidas', 'nike', 'topper', 'kappa',
  'penalty', 'betano', 'sportingbet', 'bet365', 'brahma', 'kyocera', 'neo quimica', 'allianz', 'heineken',
  'petrobras', 'vivo', 'hapvida', 'caixa', 'banrisul', 'nubank', 'sicredi', 'volt', 'supermercado', 'banco',
];

/** Temas fora da regra (seção 7.1): tragédia, rebaixamento, vexame, menor de idade… */
export const TEMAS_PROIBIDOS = [
  'rebaixa', 'queda para a serie', 'tragedia', 'morte', 'morreu', 'faleceu', 'falecimento',
  'acidente', 'vexame', 'humilha', 'mais jovem', 'mais novo', 'sub-15', 'sub-17', 'sub-20', 'categorias de base',
  'doping', 'preso', 'prisao', 'processo', 'policia', 'briga', 'agressao', 'cerveja', 'bebida', 'polemica',
];

export const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Cada regex é compilada uma vez: a Casa passa milhares de campos por estas listas.
const compiladas = new Map();
const regex = (p, inteira) => {
  const chave = `${inteira}:${p}`;
  if (!compiladas.has(chave)) compiladas.set(chave, new RegExp(`(^|[^a-z0-9])${p.replace(/ /g, '\\s+')}${inteira ? '($|[^a-z0-9])' : ''}`));
  return compiladas.get(chave);
};
const limpar = (texto) => normalizar(texto).replace(/morte subita/g, ' ');

/** Palavras proibidas: só palavra inteira ("red" pega "Red Bull", não "redondo"). */
export const acharPalavras = (texto) => {
  const t = limpar(texto);
  return PALAVRAS_PROIBIDAS.filter((p) => regex(p, true).test(t));
};

/** Temas: começo de palavra ("rebaixa" pega "rebaixamento"); "morte súbita" é regra do jogo e passa. */
export const acharTemas = (texto) => {
  const t = limpar(texto);
  return TEMAS_PROIBIDOS.filter((p) => regex(p, false).test(t));
};

/** Parser de CSV (RFC 4180): aspas, aspas dobradas, vírgula e quebra de linha dentro do campo, BOM. */
export function lerCsv(texto) {
  const s = texto.replace(/^﻿/, '');
  const linhas = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (aspas) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') {
      linha.push(campo);
      campo = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += ch;
  }
  if (aspas) throw new Error('CSV com aspas sem fechar');
  if (campo !== '' || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => !(l.length === 1 && l[0].trim() === ''));
}

/** Linhas do CSV como objetos, com o número da linha no arquivo (cabeçalho = 1). */
export function lerPerguntas(texto) {
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

/** Erros de uma pergunta (lista vazia = ok). */
export function validarPergunta(p) {
  const erros = [];
  const clubeOk = p.clube === 'geral' || CLUBES.includes(p.clube);
  if (!clubeOk) erros.push(`clube "${p.clube}" não é um dos 20 nem "geral"`);
  if (!(p.degrau in DEGRAUS)) erros.push(`degrau "${p.degrau}" (use facil, media, dificil ou craque)`);
  if (!/^[a-z0-9-]+-[fmdc]-\d{2,3}$/.test(p.id)) erros.push(`id "${p.id}" fora do formato clube-f-01`);
  else if (clubeOk && p.degrau in DEGRAUS && !p.id.startsWith(`${p.clube}-${LETRA_DO_DEGRAU[p.degrau]}-`)) {
    erros.push(`id "${p.id}" não bate com clube/degrau (${p.clube}-${LETRA_DO_DEGRAU[p.degrau]}-NN)`);
  }
  if (!p.tema || p.tema.length > 30) erros.push('tema vazio ou longo');

  if (p.pergunta.length < 10 || p.pergunta.length > MAX_PERGUNTA) erros.push(`pergunta com ${p.pergunta.length} caracteres (10 a ${MAX_PERGUNTA})`);
  if (!p.pergunta.endsWith('?')) erros.push('pergunta não termina com "?"');
  // Fato fechado tem data: o ano vem na pergunta ou é a própria resposta ("fundado em qual ano?").
  if (!/\b(18|19|20)\d{2}\b/.test(p.pergunta) && !/^(18|19|20)\d{2}$/.test(p.certa)) {
    erros.push('pergunta sem ano (fato fechado precisa de data)');
  }

  const alts = [p.certa, p.errada1, p.errada2, p.errada3];
  alts.forEach((a, i) => {
    if (!a) erros.push(`alternativa ${i + 1} vazia`);
    else if (a.length > MAX_ALTERNATIVA) erros.push(`alternativa "${a}" com ${a.length} caracteres (máx. ${MAX_ALTERNATIVA})`);
  });
  if (new Set(alts.map(normalizar)).size < 4) erros.push('alternativas repetidas');

  const dom = dominioDe(p.fonte);
  if (!dom) erros.push('fonte sem link válido');
  else if (ehWikipedia(dom)) erros.push('Wikipédia não pode ser a fonte principal (só a fonte2)');
  else if (!aceito(dom)) erros.push(`fonte de domínio não aceito: ${dom} (se for confiável, acrescente em DOMINIOS_ACEITOS)`);
  if (p.fonte2) {
    const d2 = dominioDe(p.fonte2);
    if (!d2) erros.push('fonte2 sem link válido');
    else if (!ehWikipedia(d2) && !aceito(d2)) erros.push(`fonte2 de domínio não aceito: ${d2}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.verificada_em) || Number.isNaN(Date.parse(p.verificada_em))) {
    erros.push(`verificada_em "${p.verificada_em}" (use AAAA-MM-DD)`);
  }
  if (!STATUS.includes(p.status)) erros.push(`status "${p.status}" (${STATUS.join(', ')})`);

  const texto = [p.tema, p.pergunta, ...alts].join(' | ');
  for (const w of acharPalavras(texto)) erros.push(`palavra proibida: "${w}"`);
  for (const w of acharTemas(texto)) erros.push(`tema fora da regra: "${w}"`);
  return erros;
}

/** Valida um conjunto (vários arquivos): erros por pergunta, ids e textos repetidos. */
export function validarConjunto(perguntas) {
  const erros = [];
  const ids = new Map();
  const textos = new Map();
  for (const p of perguntas) {
    const onde = `${p._arquivo ?? ''}:${p._linha ?? '?'}`;
    for (const e of validarPergunta(p)) erros.push({ onde, id: p.id, erro: e });
    if (ids.has(p.id)) erros.push({ onde, id: p.id, erro: `id repetido (também em ${ids.get(p.id)})` });
    else ids.set(p.id, onde);
    const t = normalizar(p.pergunta).replace(/[^a-z0-9]/g, '');
    if (textos.has(t)) erros.push({ onde, id: p.id, erro: `pergunta repetida (também em ${textos.get(t)})` });
    else textos.set(t, onde);
  }
  return erros;
}

const sqlTexto = (s) => (s === null || s === undefined || s === '' ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

/** SQL do import: revisada entra como ativa (upsert); aposentada só muda o status. */
export function gerarSql(perguntas) {
  const linhas = ['begin;'];
  for (const p of perguntas) {
    if (p.status === 'revisada') {
      linhas.push(
        `insert into public.perguntas (id, clube, degrau, tema, texto, certa, errada1, errada2, errada3, fonte, fonte2, verificada_em, status, lote)
values (${sqlTexto(p.id)}, ${p.clube === 'geral' ? 'null' : sqlTexto(p.clube)}, ${DEGRAUS[p.degrau]}, ${sqlTexto(p.tema)}, ${sqlTexto(p.pergunta)}, ${sqlTexto(p.certa)}, ${sqlTexto(p.errada1)}, ${sqlTexto(p.errada2)}, ${sqlTexto(p.errada3)}, ${sqlTexto(p.fonte)}, ${sqlTexto(p.fonte2)}, ${sqlTexto(p.verificada_em)}, 'ativa', ${sqlTexto(p._lote)})
on conflict (id) do update set clube = excluded.clube, degrau = excluded.degrau, tema = excluded.tema, texto = excluded.texto,
  certa = excluded.certa, errada1 = excluded.errada1, errada2 = excluded.errada2, errada3 = excluded.errada3,
  fonte = excluded.fonte, fonte2 = excluded.fonte2, verificada_em = excluded.verificada_em, status = 'ativa',
  lote = excluded.lote, atualizada_em = now();`,
      );
    } else if (p.status === 'aposentada') {
      linhas.push(`update public.perguntas set status = 'aposentada', atualizada_em = now() where id = ${sqlTexto(p.id)};`);
    }
  }
  linhas.push(
    `select coalesce(clube, 'geral') as clube, count(*) filter (where degrau = 1) as facil, count(*) filter (where degrau = 2) as media,
  count(*) filter (where degrau = 3) as dificil, count(*) filter (where degrau = 4) as craque, count(*) as total
from public.perguntas where status = 'ativa' group by 1 order by 1;`,
  );
  linhas.push('commit;');
  return linhas.join('\n');
}
