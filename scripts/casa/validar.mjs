// Validador dos CSVs da Casa do [time] (docs/casa.md, seção 8). Funções puras: recebem as tabelas já lidas.
// Roda em `npm test` (validar.test.ts) e no importador (`npm run importar-casa`).

import { DOMINIOS_ACEITOS } from '../clubes/validar.mjs';
import { MARCAS_PROIBIDAS, acharPalavras, acharTemas, normalizar } from '../perguntas/validar.mjs';
import { ARQUIVOS, CHAVES, SITE_DO_CLUBE, colunaClube } from './tabela.mjs';

export const COLUNAS = {
  clubes: ['id', 'fundacao', 'cidade', 'uf', 'apelidos', 'historia_cores', 'fonte', 'fonte2', 'verificada_em', 'status', 'observacao'],
  estadios: ['clube', 'nome', 'nome_popular', 'inauguracao', 'capacidade', 'formato', 'gramado', 'recorde_publico', 'recorde_tipo', 'recorde_partida', 'recorde_data', 'fonte', 'fonte_capacidade', 'fonte_recorde', 'verificada_em', 'status', 'observacao'],
  titulos: ['clube', 'competicao', 'ano', 'oficial', 'nota', 'fonte', 'verificada_em', 'status', 'observacao'],
  recordes: ['clube', 'lista', 'posicao', 'nome', 'valor', 'data_referencia', 'fonte', 'verificada_em', 'status', 'observacao'],
  goleadas: ['clube', 'placar', 'adversario', 'data', 'competicao', 'fonte', 'verificada_em', 'status', 'observacao'],
  mantos: ['clube', 'ordem', 'periodo', 'padrao', 'cores', 'listras', 'descricao', 'fonte', 'verificada_em', 'status', 'observacao'],
  socios: ['id', 'programa', 'url', 'aposta_na_pagina', 'verificada_em', 'status', 'observacao'],
};

export const STATUS = ['rascunho', 'revisada', 'ativa', 'aposentada'];
export const PUBLICADOS = ['revisada', 'ativa'];
export const RESPOSTAS_APOSTA = ['sim', 'não', 'não_sei'];
/** Linha do "Seja sócio" que vai ao ar: mais estrita que as outras (docs/jogo.md 7.4). */
export const socioPublicado = (l) => l.status === 'revisada' && l.aposta_na_pagina === 'não';
export const FORMATOS = ['oval', 'retangular', 'ferradura'];
export const PADROES = ['lisa', 'listras-v', 'aros', 'faixa-diagonal', 'faixa-peito'];
export const ANO_MAX = 2026;

export const MAX = { historia_cores: 400, nota: 160, descricao: 160, nome: 60, periodo: 60, adversario: 60, competicao_goleada: 60, programa: 40 };

/** Marcas de terceiros que não podem aparecer em texto nenhum (patrocínio, fornecedor, aposta). */
// A lista de marcas mora em scripts/perguntas/validar.mjs (compartilhada com o pipeline de perguntas).
export { MARCAS_PROIBIDAS };

/** Palavras que o desenho do manto não pode citar (docs/casa.md, seção 5). */
export const PROIBIDAS_NO_MANTO = ['escudo', 'cruz', 'estrela', 'estrelas', 'numero', 'patrocinio', 'patrocinador', 'fornecedor'];

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DATA_FLEX = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const HEX = /^#[0-9a-f]{6}$/i;

const palavraInteira = (norm, p) => new RegExp(`(^|[^a-z0-9])${p.replace(/ /g, '\\s+')}($|[^a-z0-9])`).test(norm);

/** Domínio do link, sem "www.". */
export function dominioDe(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.hostname.toLowerCase().replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

const dominioAceito = (d) => DOMINIOS_ACEITOS.some((x) => d === x || d.endsWith(`.${x}`));

/** Ids dos times de src/dados/times.ts (sem "outro"), lidos do texto do arquivo. */
export function idsDeTimes(textoTs) {
  return [...textoTs.matchAll(/\{\s*id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]).filter((id) => id !== 'outro');
}

/**
 * Valida tudo. `tabelas`: { arquivo: { cab, linhas } }.
 * `ctx`: { times: string[] de ids, idsCompeticao: string[], clubesDoDia: {id: {fundacao, titulos_brasileirao}} }.
 * Devolve { erros, avisos }, cada item um texto "arquivo chave: mensagem".
 */
export function validarCasa(tabelas, ctx) {
  const erros = [];
  const avisos = [];
  const erro = (arq, l, msg) => erros.push(`${arq} ${rotulo(arq, l)}: ${msg}`);
  const rotulo = (arq, l) => (l ? CHAVES[arq].map((c) => l[c]).join('/') : '');

  for (const arq of ARQUIVOS) {
    const t = tabelas[arq];
    if (!t) {
      erros.push(`${arq}: arquivo ausente`);
      continue;
    }
    if (t.cab.join(',') !== COLUNAS[arq].join(',')) erros.push(`${arq}: colunas diferentes do combinado (${COLUNAS[arq].join(', ')})`);
  }
  if (erros.length) return { erros, avisos };

  const fonte = (arq, l, campo, { wikipedia = false, obrigatoria = true } = {}) => {
    const url = l[campo];
    if (!url) return obrigatoria && erro(arq, l, `${campo} vazia`);
    const d = dominioDe(url);
    if (!d) return erro(arq, l, `${campo} não é um link: ${url}`);
    if (/(^|\.)wikipedia\.org$/.test(d)) return !wikipedia && erro(arq, l, `Wikipédia só em fonte2 (${campo})`);
    if (!dominioAceito(d)) erro(arq, l, `domínio fora da lista de fontes aceitas: ${d} (${campo})`);
    if (/aposta|(^|[/.-])bet[s]?([/.-]|$)|bet365|betano|sportingbet/i.test(url)) erro(arq, l, `link de aposta em ${campo}`);
  };

  for (const arq of ARQUIVOS) {
    for (const l of tabelas[arq].linhas) {
      const clube = l[colunaClube(arq)];
      if (!ctx.times.includes(clube)) erro(arq, l, `clube desconhecido: ${clube}`);
      if (!STATUS.includes(l.status)) erro(arq, l, `status inválido: ${l.status}`);
      if (!DATA.test(l.verificada_em)) erro(arq, l, `verificada_em inválida: ${l.verificada_em}`);
      // textos: palavras, temas e marcas proibidas (links e observação ficam de fora)
      for (const [campo, v] of Object.entries(l)) {
        if (!v || /^fonte|^observacao$|^status$|^verificada_em$|^cores$|^url$|^aposta_na_pagina$/.test(campo)) continue;
        const p = acharPalavras(v);
        if (p.length) erro(arq, l, `${campo}: palavra proibida ${p.join(', ')}`);
        const tm = acharTemas(v);
        if (tm.length) erro(arq, l, `${campo}: tema proibido ${tm.join(', ')}`);
        const n = normalizar(v);
        for (const m of MARCAS_PROIBIDAS) if (palavraInteira(n, m)) erro(arq, l, `${campo}: marca de terceiros "${m}"`);
      }
    }
  }

  // clubes
  const clubes = tabelas.clubes.linhas;
  for (const id of ctx.times) if (!clubes.some((c) => c.id === id)) erros.push(`clubes: falta o clube ${id}`);
  const vistos = new Set();
  for (const l of clubes) {
    if (vistos.has(l.id)) erro('clubes', l, 'clube repetido');
    vistos.add(l.id);
    fonte('clubes', l, 'fonte');
    fonte('clubes', l, 'fonte2', { wikipedia: true, obrigatoria: false });
    if (!DATA.test(l.fundacao)) erro('clubes', l, `fundacao inválida: ${l.fundacao}`);
    const c = ctx.clubesDoDia[l.id];
    if (c && l.fundacao.slice(0, 4) !== String(c.fundacao)) erro('clubes', l, `fundação ${l.fundacao} não bate com clubes-do-dia.csv (${c.fundacao})`);
    if (!l.cidade || !/^[A-Z]{2}$/.test(l.uf)) erro('clubes', l, 'cidade ou uf vazia/inválida');
    if (!l.apelidos) erro('clubes', l, 'sem apelidos');
    if (l.historia_cores.length > MAX.historia_cores) erro('clubes', l, `historia_cores com ${l.historia_cores.length} caracteres (máximo ${MAX.historia_cores})`);
  }

  // estádios
  const estadiosPorClube = new Set();
  for (const l of tabelas.estadios.linhas) {
    if (estadiosPorClube.has(l.clube)) erro('estadios', l, 'mais de um estádio por clube');
    estadiosPorClube.add(l.clube);
    fonte('estadios', l, 'fonte');
    if (!l.nome || l.nome.length > MAX.nome) erro('estadios', l, 'nome vazio ou longo demais');
    if (!FORMATOS.includes(l.formato)) erro('estadios', l, `formato inválido: ${l.formato}`);
    if (!DATA_FLEX.test(l.inauguracao) && l.inauguracao !== '') erro('estadios', l, `inauguracao inválida: ${l.inauguracao}`);
    if (l.capacidade) {
      if (!/^\d+$/.test(l.capacidade)) erro('estadios', l, `capacidade inválida: ${l.capacidade}`);
      fonte('estadios', l, 'fonte_capacidade');
    }
    if (l.gramado && !/^\d{2,3} x \d{2,3}$/.test(l.gramado)) erro('estadios', l, `gramado deve ser "105 x 68": ${l.gramado}`);
    if (l.recorde_publico) {
      if (!/^\d+$/.test(l.recorde_publico)) erro('estadios', l, `recorde_publico inválido: ${l.recorde_publico}`);
      if (!['pagante', 'presente'].includes(l.recorde_tipo)) erro('estadios', l, 'recorde_tipo deve ser pagante ou presente');
      if (!DATA_FLEX.test(l.recorde_data)) erro('estadios', l, `recorde_data inválida: ${l.recorde_data}`);
      fonte('estadios', l, 'fonte_recorde');
    } else if (l.recorde_tipo || l.recorde_partida || l.recorde_data) {
      erro('estadios', l, 'recorde sem público');
    }
  }
  for (const id of ctx.times) if (!estadiosPorClube.has(id)) avisos.push(`estadios ${id}: sem estádio`);

  // títulos
  const vistosT = new Set();
  const brasileiros = {};
  for (const l of tabelas.titulos.linhas) {
    fonte('titulos', l, 'fonte');
    if (!ctx.idsCompeticao.includes(l.competicao)) erro('titulos', l, `competição fora da lista: ${l.competicao}`);
    if (!/^\d{4}$/.test(l.ano) || Number(l.ano) > ANO_MAX) erro('titulos', l, `ano inválido: ${l.ano}`);
    if (!['sim', 'não'].includes(l.oficial)) erro('titulos', l, `oficial deve ser sim ou não: ${l.oficial}`);
    if (l.nota.length > MAX.nota) erro('titulos', l, `nota com ${l.nota.length} caracteres (máximo ${MAX.nota})`);
    if (l.competicao === 'estadual' && !l.nota) erro('titulos', l, 'estadual precisa do nome oficial na nota');
    if (l.oficial === 'não' && !l.nota) erro('titulos', l, 'título que a entidade não lista precisa de nota neutra');
    const k = [l.clube, l.competicao, l.ano, l.nota].join('|');
    if (vistosT.has(k)) erro('titulos', l, 'título repetido (mesmo ano e nota)');
    vistosT.add(k);
    if (l.competicao === 'brasileiro-a' && l.oficial === 'sim') brasileiros[l.clube] = (brasileiros[l.clube] ?? 0) + 1;
  }
  for (const id of ctx.times) {
    const c = ctx.clubesDoDia[id];
    if (c && (brasileiros[id] ?? 0) !== Number(c.titulos_brasileirao)) {
      erros.push(`titulos ${id}: ${brasileiros[id] ?? 0} Brasileiros oficiais, clubes-do-dia.csv diz ${c.titulos_brasileirao}`);
    }
  }

  // recordes: posição = 1 + quantos têm valor maior (empate repete a posição), até a 3ª
  const listas = {};
  for (const l of tabelas.recordes.linhas) {
    fonte('recordes', l, 'fonte');
    if (!['gols', 'jogos'].includes(l.lista)) erro('recordes', l, `lista deve ser gols ou jogos: ${l.lista}`);
    if (!l.nome) erro('recordes', l, 'sem nome');
    if (!/^\d+$/.test(l.valor) || Number(l.valor) <= 0) erro('recordes', l, `valor inválido: ${l.valor}`);
    if (!DATA.test(l.data_referencia)) erro('recordes', l, `data_referencia inválida: ${l.data_referencia}`);
    (listas[`${l.clube}|${l.lista}`] ??= []).push(l);
  }
  for (const [k, ls] of Object.entries(listas)) {
    for (const l of ls) {
      const esperada = 1 + ls.filter((o) => Number(o.valor) > Number(l.valor)).length;
      if (Number(l.posicao) !== esperada) erro('recordes', l, `posição ${l.posicao}, mas pelo valor seria ${esperada} (${k})`);
      if (Number(l.posicao) > 3) erro('recordes', l, 'posição acima de 3');
    }
    if (!ls.some((o) => Number(o.posicao) === 1)) erros.push(`recordes ${k}: sem posição 1`);
    for (const p of [2, 3]) {
      if (ls.some((o) => Number(o.posicao) === p) && !ls.some((o) => Number(o.posicao) === 1)) erros.push(`recordes ${k}: buraco antes da posição ${p}`);
    }
  }

  // goleadas
  const porClubeG = {};
  for (const l of tabelas.goleadas.linhas) {
    fonte('goleadas', l, 'fonte');
    const m = l.placar.match(/^(\d+) x (\d+)$/);
    if (!m || Number(m[1]) - Number(m[2]) < 3) erro('goleadas', l, `placar deve ser "A x B" com clube primeiro e saldo de 3 ou mais: ${l.placar}`);
    if (!l.adversario || l.adversario.length > MAX.adversario) erro('goleadas', l, 'adversário vazio ou longo demais');
    if (!DATA_FLEX.test(l.data)) erro('goleadas', l, `data inválida: ${l.data}`);
    if (!l.competicao) erro('goleadas', l, 'sem competição');
    porClubeG[l.clube] = (porClubeG[l.clube] ?? 0) + 1;
  }
  for (const [c, n] of Object.entries(porClubeG)) if (n > 3) erros.push(`goleadas ${c}: ${n} goleadas (máximo 3)`);

  // mantos
  const porClubeM = {};
  for (const l of tabelas.mantos.linhas) {
    fonte('mantos', l, 'fonte');
    if (!PADROES.includes(l.padrao)) erro('mantos', l, `padrão inválido: ${l.padrao}`);
    if (!/^[1-4]$/.test(l.ordem)) erro('mantos', l, `ordem deve ser de 1 a 4: ${l.ordem}`);
    const cores = l.cores.split('|');
    if (!cores.length || !cores.every((c) => HEX.test(c))) erro('mantos', l, `cores devem ser hex #rrggbb separados por |: ${l.cores}`);
    if (l.listras && !/^\d{1,2}$/.test(l.listras)) erro('mantos', l, `listras inválidas: ${l.listras}`);
    if (!l.descricao || l.descricao.length > MAX.descricao) erro('mantos', l, `descrição vazia ou com mais de ${MAX.descricao} caracteres`);
    const n = normalizar(`${l.descricao} ${l.periodo}`);
    for (const p of PROIBIDAS_NO_MANTO) if (palavraInteira(n, p)) erro('mantos', l, `descrição/período cita "${p}" (docs/casa.md, seção 5)`);
    (porClubeM[l.clube] ??= []).push(l);
  }
  for (const [c, ls] of Object.entries(porClubeM)) {
    if (ls.length > 4) erros.push(`mantos ${c}: ${ls.length} mantos (máximo 4)`);
    if (new Set(ls.map((l) => l.ordem)).size !== ls.length) erros.push(`mantos ${c}: ordem repetida`);
  }
  for (const id of ctx.times) if (!porClubeM[id]?.some((l) => l.ordem === '1')) avisos.push(`mantos ${id}: sem manto de ordem 1 (o manto tradicional não aparece)`);

  // sócios: rascunho pode nascer sem link; revisada, nunca
  const vistosS = new Set();
  for (const l of tabelas.socios.linhas) {
    if (vistosS.has(l.id)) erro('socios', l, 'clube repetido');
    vistosS.add(l.id);
    if (!RESPOSTAS_APOSTA.includes(l.aposta_na_pagina)) erro('socios', l, `aposta_na_pagina deve ser sim, não ou não_sei: ${l.aposta_na_pagina}`);
    if (l.programa.length > MAX.programa) erro('socios', l, `programa com ${l.programa.length} caracteres (máximo ${MAX.programa})`);
    if (l.url) {
      const d = dominioDe(l.url);
      if (!d || !l.url.startsWith('https://')) erro('socios', l, `url deve ser um link https: ${l.url}`);
      if (/aposta|(^|[/.-])bet[s]?([/.-]|$)|bet365|betano|sportingbet/i.test(l.url)) erro('socios', l, 'link de aposta em url');
      // Só link gratuito (docs/jogo.md 7.4); e a tela é quem acrescenta os utm.
      if (/[?&](ref|aff|afiliado|affiliate|parceiro|cupom|coupon|utm_[a-z]+)=/i.test(l.url)) erro('socios', l, `url com parâmetro de afiliado ou de campanha: ${l.url}`);
      const site = SITE_DO_CLUBE[l.id];
      const raiz = d && new URL(l.url).pathname.replace(/\/+$/, '') === '';
      if (raiz && d === site) erro('socios', l, 'url aponta para a home do clube: use a página do programa');
    }
    if (l.status === 'revisada') {
      if (!l.programa) erro('socios', l, 'revisada sem programa');
      if (!l.url) erro('socios', l, 'revisada sem url');
      if (l.aposta_na_pagina !== 'não') erro('socios', l, `revisada com aposta_na_pagina = ${l.aposta_na_pagina}: só vai ao ar com "não" (com "sim", use status aposentada)`);
    }
    if (l.status === 'ativa') erro('socios', l, 'status ativa não vale aqui: use revisada');
  }
  for (const id of ctx.times) if (!vistosS.has(id)) erros.push(`socios: falta o clube ${id}`);

  // linhas publicadas precisam de fonte (já checado) e de data
  for (const arq of ARQUIVOS) {
    for (const l of tabelas[arq].linhas) {
      if (PUBLICADOS.includes(l.status) && !l.observacao) avisos.push(`${arq} ${rotulo(arq, l)}: publicada sem observação`);
    }
  }
  return { erros, avisos };
}
