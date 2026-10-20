// Validador do CSV de clubes do Time do Dia (docs/jogo.md, seção 7.2): dados/clubes-do-dia.csv.
// Puro (sem disco nem rede): usado pelo `npm run importar-clubes-do-dia` e pelos testes.

import { DOMINIOS_ACEITOS as DOMINIOS_PERGUNTAS, acharPalavras, lerCsv } from '../perguntas/validar.mjs';

export const COLUNAS = [
  'id', 'nome', 'cidade', 'uf', 'regiao', 'fundacao', 'titulos_brasileirao', 'divisao_2026', 'cor1', 'cor2',
  'capital', 'fonte', 'fonte2', 'fonte_titulos', 'fonte_divisao', 'verificada_em', 'status', 'observacao',
];

export const STATUS = ['rascunho', 'revisada', 'aposentada'];
export const DIVISOES = ['A', 'B', 'C'];
/** Clubes por divisão (Séries A, B e C de 2026). */
export const POR_DIVISAO = 20;
/** Mesma lista fechada de src/jogo/timeDoDia.ts (CORES) e da migração (dia_clubes). */
export const CORES = ['branco', 'preto', 'vermelho', 'grená', 'verde', 'azul', 'amarelo', 'laranja'];
export const ANO_MAX = 2026;

/** Mesma tabela de src/jogo/timeDoDia.ts (REGIAO_DA_UF). */
export const REGIAO_DA_UF = {
  AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste',
  PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

/**
 * Fontes aceitas: as mesmas das perguntas (CBF, federações, sites oficiais, imprensa esportiva, ogol)
 * mais os sites oficiais dos clubes das Séries B e C e a imprensa regional usada no lote.
 * Wikipédia só como fonte2.
 */
export const DOMINIOS_ACEITOS = [
  ...DOMINIOS_PERGUNTAS,
  // clubes das Séries B e C (sites oficiais)
  'americafc.com.br', 'athleticclub.com.br', 'atleticogoianiense.com.br', 'avai.com.br', 'botafogofutebolsa.com.br',
  'cearasc.com', 'crb.com.br', 'criciumaec.com.br', 'cuiabaesporteclube.com.br', 'fortaleza1918.com.br',
  'goiasec.com.br', 'juventude.com.br', 'londrinaesporteclube.com.br', 'nautico-pe.com.br',
  'gremionovorizontino.com.br', 'operarioferroviario.com.br', 'pontepreta.com.br', 'saobernardofc.com.br',
  'sportrecife.com.br', 'vilanovafc.com.br', 'barrafc.com.br', 'botafogopb.com.br', 'sercaxias.com.br',
  'figueirense.com.br', 'guaranifc.com.br', 'interdelimeira.com', 'ituano.com', 'maringafc.com.br',
  'paysandu.com.br', 'santacruzpe.com.br', 'redbullbragantino.com',
  // imprensa
  'jornaldebrasilia.com.br', 'vavel.com', 'dgabc.com.br', 'oimparcial.com.br', 'diariodonordeste.verdesmares.com.br',
];

/** Linhas do CSV como objetos, com o número da linha no arquivo (cabeçalho = 1). */
export function lerClubes(texto) {
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
const aceito = (d) => DOMINIOS_ACEITOS.some((x) => d === x || d.endsWith(`.${x}`));
const ehWikipedia = (d) => d === 'wikipedia.org' || d.endsWith('.wikipedia.org');

function conferirFonte(erros, nome, url, { obrigatoria, wikipediaPode }) {
  if (!url) {
    if (obrigatoria) erros.push(`${nome} vazia`);
    return;
  }
  const d = dominioDe(url);
  if (!d) erros.push(`${nome} sem link válido`);
  else if (ehWikipedia(d)) {
    if (!wikipediaPode) erros.push(`Wikipédia não pode ser a ${nome} (só a fonte2)`);
  } else if (!aceito(d)) erros.push(`${nome} de domínio não aceito: ${d} (se for confiável, acrescente em DOMINIOS_ACEITOS)`);
}

const inteiro = (s) => (/^\d+$/.test(s) ? Number(s) : NaN);

/** Erros de um clube (lista vazia = ok). */
export function validarClube(c) {
  const erros = [];
  if (!/^[a-z0-9-]{2,30}$/.test(c.id)) erros.push(`id "${c.id}" (minúsculas, números e hífen)`);
  if (c.nome.length < 2 || c.nome.length > 30) erros.push('nome vazio ou longo (até 30)');
  if (c.cidade.length < 2 || c.cidade.length > 40) erros.push('cidade vazia ou longa (até 40)');
  const regiao = REGIAO_DA_UF[c.uf];
  if (!regiao) erros.push(`uf "${c.uf}" inválida`);
  else if (c.regiao !== regiao) erros.push(`região "${c.regiao}" não bate com a UF ${c.uf} (${regiao})`);

  const ano = inteiro(c.fundacao);
  if (!(ano >= 1850 && ano <= ANO_MAX)) erros.push(`fundação "${c.fundacao}" (ano de 1850 a ${ANO_MAX})`);
  const titulos = inteiro(c.titulos_brasileirao);
  if (!(titulos >= 0 && titulos <= 50)) erros.push(`títulos "${c.titulos_brasileirao}" (inteiro de 0 a 50)`);
  if (!DIVISOES.includes(c.divisao_2026)) erros.push(`divisão "${c.divisao_2026}" (A, B ou C)`);

  for (const k of ['cor1', 'cor2']) if (!CORES.includes(c[k])) erros.push(`${k} "${c[k]}" fora da lista (${CORES.join(', ')})`);
  if (c.cor1 && c.cor1 === c.cor2) erros.push('cor1 e cor2 iguais');
  if (c.capital !== 'capital' && c.capital !== 'interior') erros.push(`capital "${c.capital}" (capital ou interior)`);

  conferirFonte(erros, 'fonte', c.fonte, { obrigatoria: true, wikipediaPode: false });
  conferirFonte(erros, 'fonte2', c.fonte2, { obrigatoria: false, wikipediaPode: true });
  conferirFonte(erros, 'fonte_titulos', c.fonte_titulos, { obrigatoria: true, wikipediaPode: false });
  conferirFonte(erros, 'fonte_divisao', c.fonte_divisao, { obrigatoria: true, wikipediaPode: false });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.verificada_em) || Number.isNaN(Date.parse(c.verificada_em))) {
    erros.push(`verificada_em "${c.verificada_em}" (use AAAA-MM-DD)`);
  }
  if (!STATUS.includes(c.status)) erros.push(`status "${c.status}" (${STATUS.join(', ')})`);
  for (const w of acharPalavras(`${c.nome} | ${c.cidade}`)) erros.push(`palavra proibida: "${w}"`);
  return erros;
}

/** As 6 pistas de um clube: dois clubes com as mesmas 6 deixariam o jogo sem saída. */
const assinatura = (c) =>
  [c.uf, c.fundacao, c.titulos_brasileirao, c.divisao_2026, [c.cor1, c.cor2].sort().join('+'), c.capital].join('|');

/** Valida o conjunto: erros por clube, ids e nomes repetidos, pistas idênticas e 20 por série. */
export function validarConjunto(clubes) {
  const erros = [];
  const ids = new Map();
  const nomes = new Map();
  const assinaturas = new Map();
  for (const c of clubes) {
    const onde = `${c._arquivo ?? ''}:${c._linha ?? '?'}`;
    for (const e of validarClube(c)) erros.push({ onde, id: c.id, erro: e });
    if (ids.has(c.id)) erros.push({ onde, id: c.id, erro: `id repetido (também em ${ids.get(c.id)})` });
    else ids.set(c.id, onde);
    const n = c.nome.toLowerCase();
    if (nomes.has(n)) erros.push({ onde, id: c.id, erro: `nome repetido (também em ${nomes.get(n)})` });
    else nomes.set(n, onde);
    if (c.status === 'aposentada') continue;
    const a = assinatura(c);
    if (assinaturas.has(a)) erros.push({ onde, id: c.id, erro: `mesmas 6 pistas que ${assinaturas.get(a)}: ninguém conseguiria separar os dois` });
    else assinaturas.set(a, c.id);
  }
  const ativos = clubes.filter((c) => c.status !== 'aposentada');
  for (const d of DIVISOES) {
    const n = ativos.filter((c) => c.divisao_2026 === d).length;
    if (n !== POR_DIVISAO) erros.push({ onde: '-', id: `(Série ${d})`, erro: `${n} clubes na Série ${d} (esperado ${POR_DIVISAO})` });
  }
  return erros;
}

const sqlTexto = (s) => (s === null || s === undefined || s === '' ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

/** SQL do import: revisada entra como ativa (upsert); aposentada só muda o status. */
export function gerarSql(clubes) {
  const linhas = ['begin;'];
  for (const c of clubes) {
    if (c.status === 'revisada') {
      linhas.push(
        `insert into public.dia_clubes (id, nome, cidade, uf, regiao, fundacao, titulos, divisao, cor1, cor2, capital, fonte, fonte2, fonte_titulos, fonte_divisao, verificada_em, status)
values (${sqlTexto(c.id)}, ${sqlTexto(c.nome)}, ${sqlTexto(c.cidade)}, ${sqlTexto(c.uf)}, ${sqlTexto(c.regiao)}, ${Number(c.fundacao)}, ${Number(c.titulos_brasileirao)}, ${sqlTexto(c.divisao_2026)}, ${sqlTexto(c.cor1)}, ${sqlTexto(c.cor2)}, ${c.capital === 'capital'}, ${sqlTexto(c.fonte)}, ${sqlTexto(c.fonte2)}, ${sqlTexto(c.fonte_titulos)}, ${sqlTexto(c.fonte_divisao)}, ${sqlTexto(c.verificada_em)}, 'ativa')
on conflict (id) do update set nome = excluded.nome, cidade = excluded.cidade, uf = excluded.uf, regiao = excluded.regiao,
  fundacao = excluded.fundacao, titulos = excluded.titulos, divisao = excluded.divisao, cor1 = excluded.cor1, cor2 = excluded.cor2,
  capital = excluded.capital, fonte = excluded.fonte, fonte2 = excluded.fonte2, fonte_titulos = excluded.fonte_titulos,
  fonte_divisao = excluded.fonte_divisao, verificada_em = excluded.verificada_em, status = 'ativa', atualizada_em = now();`,
      );
    } else if (c.status === 'aposentada') {
      linhas.push(`update public.dia_clubes set status = 'aposentada', atualizada_em = now() where id = ${sqlTexto(c.id)};`);
    }
  }
  linhas.push(
    `select divisao, count(*) as ativos from public.dia_clubes where status = 'ativa' group by divisao order by divisao;`,
  );
  linhas.push('commit;');
  return linhas.join('\n');
}
