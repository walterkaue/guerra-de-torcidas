// Confere a Casa do [time] com o Gemini, clube a clube, pelo trecho literal da fonte.
// O script baixa a página da `fonte`; o Gemini só aponta a frase que prova o fato; o script aceita
// apenas se essa frase estiver na página, letra por letra, e trouxer o dado-chave (o ano do título,
// o número do recorde, o placar e o adversário da goleada). Quem decide é o código, não o modelo.
//
// Uso (a chave fica na variável de ambiente GEMINI_API_KEY, nunca no repositório):
//   npm run conferir-casa -- --clube=cruzeiro --seco     simula: mostra o que confirmaria
//   npm run conferir-casa -- --clube=cruzeiro            grava nos CSVs e no relatório
//   npm run conferir-casa -- --todos                     todos os clubes com linha em rascunho
//   npm run conferir-casa -- --clube=santos --buscar     títulos cuja fonte saiu do ar: procura fonte nova
//                                     (--candidatos=6 testa mais páginas candidatas; padrão 3)
//   npm run conferir-casa -- --campos                    fatos de clubes e estádios + dados/casa/revisao-textos.md
//   npm run conferir-casa -- --links                     links quebrados em dados/casa/socios.csv (sem chave, sem IA)
// Opções: --arquivos=titulos,recordes,goleadas (padrão: os três) --modelo=gemini-3.5-flash-lite
//
// Clubes, estádios e mantos têm texto livre (história, descrição): o --campos prova os fatos deles e
// monta dados/casa/revisao-textos.md; o texto e a virada para `revisada` ficam com uma pessoa.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOMINIOS_ACEITOS } from '../clubes/validar.mjs';
import { MODELOS } from '../ia/modelos.mjs';
import { SITE_DO_CLUBE, colunaClube, escreverTabela, lerTabela } from './tabela.mjs';

const PASTA = new URL('../../dados/casa/', import.meta.url);
const RELATORIOS = new URL('../../dados/casa/conferencia-gemini/', import.meta.url);
export const ARQUIVOS_OBJETIVOS = ['titulos', 'recordes', 'goleadas'];
export { MODELOS };
const LIMITE_PAGINA = 80_000; // caracteres de texto mandados ao modelo (cerca de 20 mil tokens)
const PAUSA_MS = 4_500; // entre chamadas, para caber na cota gratuita por minuto

/** Nomes pelos quais a fonte costuma chamar cada clube (sem acento, minúsculas). */
export const NOMES = {
  'athletico-pr': ['athletico', 'atletico paranaense', 'atletico pr', 'furacao'],
  'atletico-mg': ['atletico mineiro', 'atletico mg', 'atletico', 'galo'],
  bahia: ['bahia'],
  botafogo: ['botafogo'],
  bragantino: ['bragantino', 'braganca'],
  chapecoense: ['chapecoense', 'chape'],
  corinthians: ['corinthians', 'timao'],
  coritiba: ['coritiba', 'coxa'],
  cruzeiro: ['cruzeiro', 'palestra'],
  flamengo: ['flamengo', 'mengao'],
  fluminense: ['fluminense', 'flu'],
  gremio: ['gremio'],
  internacional: ['internacional', 'inter', 'colorado'],
  mirassol: ['mirassol'],
  palmeiras: ['palmeiras', 'palestra', 'verdao'],
  remo: ['remo'],
  santos: ['santos'],
  'sao-paulo': ['sao paulo', 'spfc'],
  vasco: ['vasco'],
  vitoria: ['vitoria'],
};

const NOME_COMPETICAO = {
  'mundial-clubes': 'Mundial de Clubes da FIFA', intercontinental: 'Copa Intercontinental', libertadores: 'Copa Libertadores',
  'sul-americana': 'Copa Sul-Americana', recopa: 'Recopa Sul-Americana', 'copa-conmebol': 'Copa Conmebol',
  'supercopa-libertadores': 'Supercopa Libertadores', 'brasileiro-a': 'Campeonato Brasileiro (Série A, Taça Brasil ou Robertão)',
  'copa-do-brasil': 'Copa do Brasil', 'supercopa-do-brasil': 'Supercopa do Brasil', 'copa-do-nordeste': 'Copa do Nordeste',
  'copa-verde': 'Copa Verde', 'brasileiro-b': 'Campeonato Brasileiro Série B', 'brasileiro-c': 'Campeonato Brasileiro Série C',
  'brasileiro-d': 'Campeonato Brasileiro Série D', estadual: 'campeonato estadual',
};

// ---------------------------------------------------------------------------
// Partes puras (testadas em conferir-gemini.test.ts)
// ---------------------------------------------------------------------------

/** Sem acento, minúsculas, só letras e números separados por um espaço. */
export const normalizar = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Números do texto, sem separador de milhar ("1.012" e "1012" viram 1012). */
export const numerosDe = (s) => (String(s ?? '').match(/\d[\d.]*/g) ?? []).map((n) => Number(n.replace(/\./g, '')));

/** Acentos em entidade HTML (&ecirc;, &atilde;, &ccedil;…) viram a letra com o sinal. */
const MARCAS = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' };
const ENTIDADES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', ordm: 'º', ordf: 'ª' };

/** HTML → texto corrido (sem script, estilo nem tags; entidades decodificadas). */
export function textoDaPagina(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z])(acute|grave|circ|tilde|uml|cedil);/gi, (_, l, m) => (l + MARCAS[m.toLowerCase()]).normalize('NFC'))
    .replace(/&([a-z]+);/gi, (m, e) => ENTIDADES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

export function dominioDe(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}
export const dominioAceito = (d) => !!d && DOMINIOS_ACEITOS.some((x) => d === x || d.endsWith(`.${x}`));

/** O trecho está na página, letra por letra (ignorando acento, caixa e pontuação)? */
export const trechoNaPagina = (trecho, pagina) => normalizar(trecho).length >= 8 && normalizar(pagina).includes(normalizar(trecho));

const temPalavra = (texto, termo) => ` ${normalizar(texto)} `.includes(` ${normalizar(termo)} `);
export const citaClube = (clube, trecho, dominio) =>
  (NOMES[clube] ?? [clube]).some((n) => temPalavra(trecho, n)) || dominio === SITE_DO_CLUBE[clube] || dominio?.endsWith(`.${SITE_DO_CLUBE[clube]}`);

/** O trecho traz o dado-chave da linha? Devolve o motivo quando não traz. */
export function motivoChave(arquivo, linha, trecho, dominio) {
  if (arquivo === 'titulos') {
    if (!numerosDe(trecho).includes(Number(linha.ano))) return `o trecho não traz o ano ${linha.ano}`;
    if (!citaClube(linha.clube, trecho, dominio)) return 'o trecho não cita o clube';
    return null;
  }
  if (arquivo === 'recordes') {
    if (!numerosDe(trecho).includes(Number(linha.valor))) return `o trecho não traz o número ${linha.valor}`;
    const sobrenome = normalizar(linha.nome).split(' ').filter((p) => p.length > 2).pop() ?? normalizar(linha.nome);
    if (!temPalavra(trecho, sobrenome)) return `o trecho não cita ${linha.nome}`;
    return null;
  }
  if (arquivo === 'goleadas') {
    const [a, b] = numerosDe(linha.placar);
    const n = numerosDe(trecho);
    if (!n.includes(a) || !n.includes(b)) return `o trecho não traz o placar ${linha.placar}`;
    const adv = normalizar(linha.adversario).split(' ').filter((p) => p.length > 2);
    if (!adv.some((p) => temPalavra(trecho, p))) return `o trecho não cita ${linha.adversario}`;
    return null;
  }
  return 'arquivo sem conferência automática';
}

/** Frase do fato que o modelo deve achar na página. */
export function fatoDe(arquivo, l) {
  if (arquivo === 'titulos') {
    const comp = l.competicao === 'estadual' && l.nota ? l.nota : NOME_COMPETICAO[l.competicao] ?? l.competicao;
    return `O ${l.clube} foi campeão de ${comp} em ${l.ano}.`;
  }
  if (arquivo === 'recordes') {
    const lista = l.lista === 'gols' ? 'gols' : l.lista === 'jogos' ? 'jogos' : l.lista;
    return `${l.nome} tem ${l.valor} ${lista} pelo ${l.clube} (${l.posicao}º da lista dos que mais têm ${lista}).`;
  }
  return `O ${l.clube} venceu o ${l.adversario} por ${l.placar.replace(/\s*x\s*/i, ' a ')}${l.data ? ` (${l.data.slice(0, 4)})` : ''}${l.competicao ? `, pelo ${l.competicao}` : ''}.`;
}

/** Observação nova de uma linha confirmada: o que já estava + o trecho que prova. */
export function observacaoConfirmada(antiga, trecho, dominio, modelo, hoje) {
  const curto = trecho.length > 220 ? `${trecho.slice(0, 217)}...` : trecho;
  const data = hoje.split('-').reverse().join('/');
  const nova = `Conferido em ${data} por script (${modelo}, trecho literal em ${dominio}): "${curto.replace(/"/g, "'")}".`;
  return antiga ? `${antiga} ${nova}` : nova;
}

// ---------------------------------------------------------------------------
// Rede (página e Gemini)
// ---------------------------------------------------------------------------

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function baixar(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return { erro: `HTTP ${r.status}` };
    const texto = textoDaPagina(await r.text());
    if (texto.length < 800) return { erro: 'página sem texto (site feito só de JavaScript?)' };
    return { texto };
  } catch (e) {
    return { erro: e.name === 'TimeoutError' ? 'não respondeu em 30 s' : 'não abriu' };
  }
}

const INSTRUCAO = `Você confere fatos de futebol contra o TEXTO DA PÁGINA, e só contra ele (nada de memória).
Para cada fato da lista, responda confirma=true apenas se o texto da página prova o fato inteiro: o clube, a competição ou lista, o ano, o número ou o placar.
Em "trecho", copie a frase EXATA da página que prova o fato, sem mudar nenhuma letra, com até 300 caracteres. Numa tabela ou lista, copie o pedaço que traz o nome e o ano (ou o número) juntos.
Se a página não prova, confirma=false e trecho="". Responda um item para cada id recebido.`;

const ESQUEMA = {
  type: 'ARRAY',
  items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, confirma: { type: 'BOOLEAN' }, trecho: { type: 'STRING' } }, required: ['id', 'confirma', 'trecho'] },
};

export async function perguntarGemini(modelos, fatos, pagina) {
  const chave = process.env.GEMINI_API_KEY;
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCAO }] },
    contents: [{ role: 'user', parts: [{ text: `FATOS:\n${fatos.map((f) => `${f.id}: ${f.fato}`).join('\n')}\n\nTEXTO DA PÁGINA:\n${pagina}` }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: ESQUEMA },
  });
  let ultimo = '';
  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
        body: corpo,
      }).catch(() => null);
      const d = r ? await r.json().catch(() => ({})) : {};
      if (r?.ok) {
        try {
          return { modelo, respostas: JSON.parse(d.candidates[0].content.parts[0].text) };
        } catch {
          ultimo = `${modelo}: resposta fora do formato`;
          break;
        }
      }
      ultimo = `${modelo}: ${d.error?.status ?? 'falha de rede'}`;
      if (r && (r.status === 429 || r.status === 503)) await esperar(15_000 * (tentativa + 1));
      else break;
    }
  }
  throw new Error(`nenhum modelo respondeu (${ultimo})`);
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------

function ler(arquivo) {
  return lerTabela(readFileSync(new URL(`${arquivo}.csv`, PASTA), 'utf8'));
}

export async function conferirClube(clube, { arquivos, modelos, hoje, seco }) {
  const tabelas = Object.fromEntries(arquivos.map((a) => [a, ler(a)]));
  const paginas = new Map();
  const relatorio = { clube, confirmadas: [], recusadas: [], semFonte: [] };

  // Agrupa por (arquivo, fonte): uma chamada ao modelo por página.
  const grupos = new Map();
  for (const arquivo of arquivos) {
    tabelas[arquivo].linhas.forEach((l, i) => {
      if (l.clube !== clube || l.status !== 'rascunho') return;
      const chave = `${arquivo}|${l.fonte}`;
      if (!grupos.has(chave)) grupos.set(chave, { arquivo, fonte: l.fonte, itens: [] });
      grupos.get(chave).itens.push({ id: `L${i}`, i, linha: l, fato: fatoDe(arquivo, l) });
    });
  }

  for (const { arquivo, fonte, itens } of grupos.values()) {
    const dominio = dominioDe(fonte);
    const rotulo = (it) => `${arquivo}: ${fatoDe(arquivo, it.linha)}`;
    if (!dominioAceito(dominio)) {
      for (const it of itens) relatorio.semFonte.push({ fato: rotulo(it), fonte, motivo: dominio ? `domínio não aceito (${dominio})` : 'sem fonte' });
      continue;
    }
    if (!paginas.has(fonte)) paginas.set(fonte, await baixar(fonte));
    const pagina = paginas.get(fonte);
    if (pagina.erro) {
      for (const it of itens) relatorio.semFonte.push({ fato: rotulo(it), fonte, motivo: pagina.erro });
      continue;
    }
    const res = await checarNaPagina(arquivo, itens, pagina.texto, fonte, modelos);
    for (const { it, motivo, falhaDoModelo } of res.recusadas) {
      (falhaDoModelo ? relatorio.semFonte : relatorio.recusadas).push({ fato: rotulo(it), fonte, motivo });
    }
    for (const { it, trecho, modelo } of res.confirmadas) {
      relatorio.confirmadas.push({ fato: rotulo(it), fonte, trecho, modelo });
      marcar(tabelas[arquivo].linhas[it.i], trecho, fonte, modelo, hoje);
    }
  }

  if (!seco && relatorio.confirmadas.length) {
    for (const a of arquivos) writeFileSync(new URL(`${a}.csv`, PASTA), escreverTabela(tabelas[a]));
  }
  return relatorio;
}

let chamadas = 0;

/** Pergunta ao modelo sobre os itens numa página já baixada e aplica as travas do código. */
async function checarNaPagina(arquivo, itens, pagina, fonte, modelos) {
  const dominio = dominioDe(fonte);
  const texto = pagina.slice(0, LIMITE_PAGINA);
  const confirmadas = [];
  const recusadas = [];
  for (let k = 0; k < itens.length; k += 40) {
    const parte = itens.slice(k, k + 40);
    if (chamadas++) await esperar(PAUSA_MS);
    let resp;
    try {
      resp = await perguntarGemini(modelos, parte, texto);
    } catch (e) {
      for (const it of parte) recusadas.push({ it, motivo: e.message, falhaDoModelo: true });
      continue;
    }
    const porId = new Map(resp.respostas.map((r) => [r.id, r]));
    for (const it of parte) {
      const r = porId.get(it.id);
      const trecho = (r?.trecho ?? '').trim();
      let motivo = null;
      if (!r || !r.confirma) motivo = 'o modelo não achou o fato na página';
      else if (!trechoNaPagina(trecho, pagina)) motivo = 'o trecho citado não está na página';
      else motivo = it.motivoDe ? it.motivoDe(trecho) : motivoChave(arquivo, it.linha, trecho, dominio);
      if (motivo) recusadas.push({ it, motivo });
      else confirmadas.push({ it, trecho, modelo: resp.modelo });
    }
  }
  return { confirmadas, recusadas };
}

/** Marca a linha como revisada com o trecho; com fonteAntiga, troca a fonte e registra a troca. */
function marcar(linha, trecho, fonte, modelo, hoje, fonteAntiga) {
  linha.status = 'revisada';
  linha.verificada_em = hoje;
  let obs = linha.observacao;
  if (fonteAntiga) {
    linha.fonte = fonte;
    obs = `${obs ? `${obs} ` : ''}Fonte trocada em ${hoje.split('-').reverse().join('/')}: a anterior (${fonteAntiga}) saiu do ar.`;
  }
  linha.observacao = observacaoConfirmada(obs, trecho, dominioDe(fonte), modelo, hoje);
}

// ---------------------------------------------------------------------------
// Modo --buscar: fonte nova para títulos cuja fonte saiu do ar
// ---------------------------------------------------------------------------
// A busca do Google pelo Gemini não tem cota na chave gratuita, então os candidatos vêm das
// referências da Wikipédia (do campeonato e do clube): a Wikipédia nunca vira fonte, mas aponta
// para páginas da imprensa e dos clubes. O código fica só com links de domínio aceito, pré-seleciona
// os que trazem mais anos da lista e passa os melhores pelo mesmo teste do trecho literal.

const WIKI_ESTADUAL = {
  'Campeonato Paulista': 'Campeonato_Paulista_de_Futebol', 'Campeonato Baiano': 'Campeonato_Baiano_de_Futebol',
  'Campeonato Carioca': 'Campeonato_Carioca_de_Futebol', 'Campeonato Mineiro': 'Campeonato_Mineiro_de_Futebol',
  'Campeonato Gaúcho': 'Campeonato_Gaúcho_de_Futebol', 'Campeonato Paranaense': 'Campeonato_Paranaense_de_Futebol',
  'Campeonato Catarinense': 'Campeonato_Catarinense_de_Futebol', 'Campeonato Paraense': 'Campeonato_Paraense_de_Futebol',
};
const WIKI_CLUBE = {
  'athletico-pr': 'Club_Athletico_Paranaense', 'atletico-mg': 'Clube_Atlético_Mineiro', bahia: 'Esporte_Clube_Bahia',
  botafogo: 'Botafogo_de_Futebol_e_Regatas', bragantino: 'Red_Bull_Bragantino', chapecoense: 'Associação_Chapecoense_de_Futebol',
  corinthians: 'Sport_Club_Corinthians_Paulista', coritiba: 'Coritiba_Foot_Ball_Club', cruzeiro: 'Cruzeiro_Esporte_Clube',
  flamengo: 'Clube_de_Regatas_do_Flamengo', fluminense: 'Fluminense_Football_Club', gremio: 'Grêmio_Foot-Ball_Porto_Alegrense',
  internacional: 'Sport_Club_Internacional', mirassol: 'Mirassol_Futebol_Clube', palmeiras: 'Sociedade_Esportiva_Palmeiras',
  remo: 'Clube_do_Remo', santos: 'Santos_Futebol_Clube', 'sao-paulo': 'São_Paulo_Futebol_Clube', vasco: 'Club_de_Regatas_Vasco_da_Gama',
  vitoria: 'Esporte_Clube_Vitória',
};

/** Links de domínio aceito de uma página, sem os que são só a página inicial do site. */
export function linksAceitos(html) {
  const links = new Set();
  for (const m of String(html).matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, '&').replace(/#.*$/, '');
    let caminho = '';
    try {
      caminho = new URL(u).pathname.replace(/\/+$/, '');
    } catch {
      continue;
    }
    if (caminho && dominioAceito(dominioDe(u))) links.add(u);
  }
  return [...links];
}

/** Quantos anos da lista aparecem na página como número solto. */
export function anosNaPagina(texto, anos) {
  const t = ` ${normalizar(texto)} `;
  return anos.filter((a) => t.includes(` ${a} `)).length;
}

export async function buscarFontes(clube, { modelos, hoje, seco, candidatosPorGrupo = 3 }) {
  const tab = ler('titulos');
  const relatorio = { clube, confirmadas: [], recusadas: [], semFonte: [] };
  const fora = new Map(); // fonte -> erro (ou null se abre)
  const grupos = new Map();
  for (const [i, l] of tab.linhas.entries()) {
    if (l.clube !== clube || l.status !== 'rascunho') continue;
    if (!fora.has(l.fonte)) fora.set(l.fonte, (await baixar(l.fonte)).erro ?? null);
    if (!fora.get(l.fonte)) continue; // a fonte abre: é caso da conferência normal, não da busca
    const chave = `${l.competicao}|${l.nota}`;
    if (!grupos.has(chave)) grupos.set(chave, { competicao: l.competicao, nota: l.nota, itens: [] });
    grupos.get(chave).itens.push({ id: `L${i}`, i, linha: l, fato: fatoDe('titulos', l) });
  }

  for (const g of grupos.values()) {
    const artigos = [g.competicao === 'estadual' ? WIKI_ESTADUAL[g.nota] : null, WIKI_CLUBE[clube]].filter(Boolean);
    const candidatos = new Set();
    for (const a of artigos) {
      const r = await fetch(`https://pt.wikipedia.org/wiki/${encodeURIComponent(a)}`, {
        headers: { 'User-Agent': 'guerra-de-torcidas/1.0 (conferencia de fontes)' },
      }).catch(() => null);
      if (r?.ok) for (const u of linksAceitos(await r.text())) candidatos.add(u);
    }
    const anos = g.itens.map((it) => it.linha.ano);
    const pontuados = [];
    for (const u of candidatos) {
      const p = await baixar(u);
      if (p.erro) continue;
      const n = anosNaPagina(p.texto, anos);
      if (n >= Math.min(3, anos.length)) pontuados.push({ u, texto: p.texto, n });
    }
    pontuados.sort((a, b) => b.n - a.n);

    let restantes = g.itens;
    for (const { u, texto } of pontuados.slice(0, candidatosPorGrupo)) {
      if (!restantes.length) break;
      const res = await checarNaPagina('titulos', restantes, texto, u, modelos);
      for (const { it, trecho, modelo } of res.confirmadas) {
        relatorio.confirmadas.push({ fato: `titulos: ${it.fato}`, fonte: u, trecho, modelo });
        marcar(tab.linhas[it.i], trecho, u, modelo, hoje, it.linha.fonte);
      }
      const ok = new Set(res.confirmadas.map((c) => c.it.id));
      restantes = restantes.filter((it) => !ok.has(it.id));
    }
    const motivo = pontuados.length
      ? `nenhum dos ${Math.min(candidatosPorGrupo, pontuados.length)} candidatos provou`
      : 'nenhum candidato com a lista de anos';
    for (const it of restantes) relatorio.semFonte.push({ fato: `titulos: ${it.fato}`, fonte: it.linha.fonte, motivo });
  }

  if (!seco && relatorio.confirmadas.length) writeFileSync(new URL('titulos.csv', PASTA), escreverTabela(tab));
  return relatorio;
}

// ---------------------------------------------------------------------------
// Modo --campos: campos objetivos de clubes e estádios + texto para a revisão humana
// ---------------------------------------------------------------------------
// Clube e estádio misturam fato (data, número, cidade) com texto (história das cores, apelidos,
// nome popular). O script prova os fatos pelo trecho; a linha só vira `revisada` depois que uma
// pessoa aprova o texto, a partir de dados/casa/revisao-textos.md.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataPorExtenso = (d) => {
  const [a, m, dia] = String(d).split('-');
  return m && dia ? `${Number(dia)} de ${MESES[Number(m) - 1]} de ${a}` : a;
};
const fmtNum = (n) => Number(n).toLocaleString('pt-BR');

/** Campos objetivos de cada arquivo: de quais colunas de fonte saem e o fato que o modelo procura. */
export const CAMPOS = {
  clubes: [
    { campo: 'fundacao', rotulo: 'fundação', fontes: ['fonte', 'fonte2'], fato: (l) => `O clube ${l.id} foi fundado em ${dataPorExtenso(l.fundacao)}.` },
    { campo: 'cidade', rotulo: 'cidade', fontes: ['fonte', 'fonte2'], fato: (l) => `O clube ${l.id} é da cidade de ${l.cidade} (${l.uf}).` },
  ],
  estadios: [
    { campo: 'inauguracao', rotulo: 'inauguração', fontes: ['fonte'], fato: (l) => `O estádio ${l.nome} foi inaugurado em ${dataPorExtenso(l.inauguracao)}.` },
    { campo: 'capacidade', rotulo: 'capacidade', fontes: ['fonte_capacidade', 'fonte'], fato: (l) => `A capacidade do estádio ${l.nome} é de ${fmtNum(l.capacidade)} pessoas.` },
    {
      campo: 'recorde_publico',
      rotulo: 'recorde de público',
      fontes: ['fonte_recorde'],
      fato: (l) => `O maior público do ${l.clube} no ${l.nome} foi de ${fmtNum(l.recorde_publico)} (${l.recorde_tipo}), em ${dataPorExtenso(l.recorde_data)}.`,
    },
  ],
};

/** O trecho traz o dado do campo? (data: ano e dia; cidade: o nome; número: o número). */
export function motivoCampo(campo, linha, trecho) {
  const valor = linha[campo];
  if (campo === 'fundacao' || campo === 'inauguracao') {
    const [ano, , dia] = valor.split('-');
    const n = numerosDe(trecho);
    if (!n.includes(Number(ano))) return `o trecho não traz o ano ${ano}`;
    if (dia && !n.includes(Number(dia))) return `o trecho não traz o dia ${Number(dia)}`;
    return null;
  }
  if (campo === 'cidade') return ` ${normalizar(trecho)} `.includes(` ${normalizar(valor)} `) ? null : `o trecho não cita ${valor}`;
  return numerosDe(trecho).includes(Number(valor)) ? null : `o trecho não traz o número ${valor}`;
}

export async function conferirCampos(clubes, { modelos, hoje, seco }) {
  const tabelas = { clubes: ler('clubes'), estadios: ler('estadios') };
  const resultado = new Map(); // `${arquivo}|${i}|${campo}` -> { ok, trecho?, dominio?, motivo }
  let pendentes = [];
  for (const arquivo of ['clubes', 'estadios']) {
    tabelas[arquivo].linhas.forEach((l, i) => {
      if (!clubes.includes(l[colunaClube(arquivo)]) || l.status !== 'rascunho') return;
      for (const c of CAMPOS[arquivo]) {
        if (!l[c.campo]) continue;
        const urls = c.fontes.map((f) => l[f]).filter((u) => u && dominioAceito(dominioDe(u)));
        const chave = `${arquivo}|${i}|${c.campo}`;
        if (!urls.length) resultado.set(chave, { ok: false, motivo: 'sem fonte de domínio aceito' });
        else pendentes.push({ id: `C${pendentes.length}`, chave, linha: l, urls, fato: c.fato(l), motivoDe: (t) => motivoCampo(c.campo, l, t) });
      }
    });
  }

  // Cada campo tenta a primeira fonte; o que falha tenta a seguinte (ex.: fonte2 do clube).
  const paginas = new Map();
  for (let passo = 0; pendentes.length; passo++) {
    const porUrl = new Map();
    for (const it of pendentes) {
      const u = it.urls[passo];
      if (!u) continue;
      if (!porUrl.has(u)) porUrl.set(u, []);
      porUrl.get(u).push(it);
    }
    if (!porUrl.size) break;
    const falharam = [];
    for (const [u, itens] of porUrl) {
      if (!paginas.has(u)) paginas.set(u, await baixar(u));
      const p = paginas.get(u);
      if (p.erro) {
        for (const it of itens) resultado.set(it.chave, { ok: false, motivo: `${dominioDe(u)}: ${p.erro}` }), falharam.push(it);
        continue;
      }
      const res = await checarNaPagina('', itens, p.texto, u, modelos);
      for (const { it, trecho } of res.confirmadas) resultado.set(it.chave, { ok: true, trecho, dominio: dominioDe(u) });
      for (const { it, motivo } of res.recusadas) resultado.set(it.chave, { ok: false, motivo: `${dominioDe(u)}: ${motivo}` }), falharam.push(it);
    }
    pendentes = falharam;
  }

  // Grava na observação o que foi provado (o status só muda com a aprovação do texto).
  const data = hoje.split('-').reverse().join('/');
  for (const arquivo of ['clubes', 'estadios']) {
    tabelas[arquivo].linhas.forEach((l, i) => {
      const provados = CAMPOS[arquivo]
        .map((c) => [c, resultado.get(`${arquivo}|${i}|${c.campo}`)])
        .filter(([, r]) => r?.ok)
        .map(([c, r]) => `${c.rotulo} ("${(r.trecho.length > 160 ? `${r.trecho.slice(0, 157)}...` : r.trecho).replace(/"/g, "'")}", ${r.dominio})`);
      if (provados.length) l.observacao = `${l.observacao ? `${l.observacao} ` : ''}Campos conferidos em ${data} por script: ${provados.join('; ')}.`;
    });
  }
  if (!seco) for (const a of ['clubes', 'estadios']) writeFileSync(new URL(`${a}.csv`, PASTA), escreverTabela(tabelas[a]));
  return { tabelas, resultado };
}

/** Documento para a pessoa revisar: fatos provados pelo script e os textos que só ela aprova. */
export function revisaoMd(clubes, { tabelas, resultado }, mantos, hoje) {
  const linhas = [
    '# Casa do [time]: revisão dos textos',
    '',
    `Gerado em ${hoje.split('-').reverse().join('/')} por \`npm run conferir-casa -- --campos\`. Para cada clube: os **fatos** (✅ provado pelo trecho literal da fonte, ❌ não provado, com o motivo) e os **textos** que só uma pessoa aprova.`,
    'Responda clube a clube: "aprovo", ou o que mudar. Só depois a linha vira `revisada`.',
    '',
  ];
  const fato = (arquivo, i, c, valor) => {
    const r = resultado.get(`${arquivo}|${i}|${c.campo}`);
    if (!r) return `- ${c.rotulo}: ${valor || '(vazio)'}`;
    return r.ok ? `- ✅ ${c.rotulo}: ${valor} — "${r.trecho.slice(0, 180)}" (${r.dominio})` : `- ❌ ${c.rotulo}: ${valor} — ${r.motivo}`;
  };
  for (const clube of clubes) {
    const ic = tabelas.clubes.linhas.findIndex((l) => l.id === clube);
    const c = tabelas.clubes.linhas[ic];
    const ie = tabelas.estadios.linhas.findIndex((l) => l.clube === clube);
    const e = tabelas.estadios.linhas[ie];
    const ms = mantos.linhas.filter((m) => m.clube === clube && m.status === 'rascunho');
    if (c?.status !== 'rascunho' && e?.status !== 'rascunho' && !ms.length) continue;
    linhas.push(`## ${clube}`, '');
    if (c?.status === 'rascunho') {
      linhas.push('**Clube**', fato('clubes', ic, CAMPOS.clubes[0], dataPorExtenso(c.fundacao)), fato('clubes', ic, CAMPOS.clubes[1], `${c.cidade} (${c.uf})`));
      linhas.push(`- Apelidos: ${c.apelidos.split('|').join(', ') || '(vazio)'}`, `- História das cores: ${c.historia_cores || '(vazio)'}`, '');
    }
    if (e?.status === 'rascunho') {
      linhas.push(`**Estádio: ${e.nome}${e.nome_popular ? ` ("${e.nome_popular}")` : ''}**`);
      linhas.push(fato('estadios', ie, CAMPOS.estadios[0], dataPorExtenso(e.inauguracao)));
      linhas.push(fato('estadios', ie, CAMPOS.estadios[1], e.capacidade ? fmtNum(e.capacidade) : ''));
      linhas.push(fato('estadios', ie, CAMPOS.estadios[2], e.recorde_publico ? `${fmtNum(e.recorde_publico)} (${e.recorde_tipo}), ${dataPorExtenso(e.recorde_data)}` : ''));
      linhas.push(`- Partida do recorde: ${e.recorde_partida || '(vazio)'}`, '');
    }
    for (const m of ms) {
      linhas.push(`**Manto ${m.ordem} (${m.periodo})**: ${m.padrao}, cores ${m.cores.split('|').join(' ')}${m.listras ? `, listras ${m.listras}` : ''}`, `- Descrição: ${m.descricao}`, `- Fonte: ${dominioDe(m.fonte) ?? '(sem fonte)'}`, '');
    }
  }
  return linhas.join('\n');
}

// ---------------------------------------------------------------------------
// Modo --links: páginas de sócio (dados/casa/socios.csv) que saíram do ar ou mudaram de lugar
// ---------------------------------------------------------------------------
// Não precisa de chave nem muda status: só avisa. Só `quebrado` faz o comando sair com erro.

const CODIGOS_DE_CERTIFICADO = /CERT|SSL|TLS/;

/** O que fazer com o link: `quebrado`, `mudou`, `conferir` (o robô não decide) ou `ok`. */
export function classificarLink(url, { status, final, erro }, clube) {
  if (erro) {
    if (CODIGOS_DE_CERTIFICADO.test(erro)) return { estado: 'conferir', motivo: `certificado recusado aqui (${erro}): abrir no navegador` };
    return { estado: 'quebrado', motivo: `não abriu (${erro})` };
  }
  // 401, 403, 429 e 503 costumam ser bloqueio de robô: quem decide é o navegador.
  if ([401, 403, 429, 503].includes(status)) return { estado: 'conferir', motivo: `HTTP ${status}: abrir no navegador` };
  if (status >= 400) return { estado: 'quebrado', motivo: `HTTP ${status}` };
  const site = SITE_DO_CLUBE[clube];
  const destino = new URL(final);
  const dominioFinal = dominioDe(final);
  if ((dominioFinal === site || dominioFinal === `www.${site}`) && destino.pathname.replace(/\/+$/, '') === '') {
    return { estado: 'mudou', motivo: `caiu na home do clube (${final})` };
  }
  if (dominioFinal !== dominioDe(url)) return { estado: 'mudou', motivo: `redireciona para ${final}` };
  return { estado: 'ok', motivo: `HTTP ${status}` };
}

async function abrirLink(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, signal: AbortSignal.timeout(30_000) });
    return { status: r.status, final: r.url };
  } catch (e) {
    return { erro: e.name === 'TimeoutError' ? 'não respondeu em 30 s' : (e.cause?.code ?? e.name) };
  }
}

export function linksMd(resultados, hoje) {
  const linhas = [
    '# Links do "Seja sócio"',
    '',
    `Rodada de ${hoje.split('-').reverse().join('/')} (\`npm run conferir-casa -- --links\`). O robô só testa se a página abre; a curadoria segue no celular.`,
    '',
    '| Clube | Situação | Link | Detalhe |',
    '|---|---|---|---|',
  ];
  for (const r of resultados) linhas.push(`| ${r.id} | ${r.estado} | ${r.url || '—'} | ${r.motivo} |`);
  return `${linhas.join('\n')}\n`;
}

export async function conferirLinks(abrir = abrirLink) {
  const resultados = [];
  for (const l of ler('socios').linhas) {
    if (!l.url) {
      resultados.push({ id: l.id, url: '', estado: 'sem link', motivo: 'linha sem url' });
      continue;
    }
    resultados.push({ id: l.id, url: l.url, ...classificarLink(l.url, await abrir(l.url), l.id) });
  }
  return resultados;
}

export function relatorioMd(r, hoje) {
  const linhas = [
    `# Conferência por script: ${r.clube}`,
    '',
    `Rodada de ${hoje.split('-').reverse().join('/')}. O script baixou cada fonte, o Gemini apontou o trecho e o script só aceitou trecho que está na página, letra por letra, com o ano, o número ou o placar da linha.`,
    '',
    `- Confirmadas (viraram \`revisada\`): **${r.confirmadas.length}**`,
    `- Recusadas (continuam em \`rascunho\`): **${r.recusadas.length}**`,
    `- Fonte que não abriu ou fora dos domínios aceitos: **${r.semFonte.length}**`,
    '',
  ];
  const tabela = (titulo, itens, col) => {
    if (!itens.length) return;
    linhas.push(`## ${titulo}`, '', `| Fato | ${col} | Fonte |`, '|---|---|---|');
    for (const x of itens) linhas.push(`| ${x.fato.replace(/\|/g, '/')} | ${String(x.trecho ?? x.motivo).replace(/\|/g, '/')} | ${dominioDe(x.fonte) ?? '—'} |`);
    linhas.push('');
  };
  tabela('Recusadas: conferir à mão ou achar outra fonte', r.recusadas, 'Motivo');
  tabela('Fonte que não abriu', r.semFonte, 'Motivo');
  tabela('Confirmadas', r.confirmadas, 'Trecho');
  return linhas.join('\n');
}

async function principal() {
  const args = process.argv.slice(2);
  const opcao = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
  const seco = args.includes('--seco');
  const arquivos = (opcao('arquivos') ?? ARQUIVOS_OBJETIVOS.join(',')).split(',').filter(Boolean);
  for (const a of arquivos) if (!ARQUIVOS_OBJETIVOS.includes(a)) throw new Error(`--arquivos só aceita ${ARQUIVOS_OBJETIVOS.join(', ')}`);
  const modelos = opcao('modelo') ? [opcao('modelo')] : MODELOS;
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  if (args.includes('--links')) {
    const resultados = await conferirLinks();
    for (const r of resultados) console.log(`${r.estado.padEnd(9)} ${r.id}: ${r.motivo}`);
    if (!seco) {
      mkdirSync(RELATORIOS, { recursive: true });
      writeFileSync(new URL('socios-links.md', RELATORIOS), linksMd(resultados, hoje));
    }
    if (resultados.some((r) => r.estado === 'quebrado')) process.exitCode = 1;
    return;
  }

  if (!process.env.GEMINI_API_KEY) throw new Error('Falta a variável de ambiente GEMINI_API_KEY.');

  if (args.includes('--campos')) {
    const mantos = ler('mantos');
    const emRascunho = (c) =>
      ler('clubes').linhas.some((l) => l.id === c && l.status === 'rascunho') ||
      ler('estadios').linhas.some((l) => l.clube === c && l.status === 'rascunho') ||
      mantos.linhas.some((l) => l.clube === c && l.status === 'rascunho');
    const alvo = opcao('clube') ? [opcao('clube')] : Object.keys(NOMES).filter(emRascunho);
    const r = await conferirCampos(alvo, { modelos, hoje, seco });
    const ok = [...r.resultado.values()].filter((x) => x.ok).length;
    console.log(`${alvo.length} clubes: ${ok} de ${r.resultado.size} campos provados${seco ? ' (--seco: nada gravado)' : ''}`);
    const md = revisaoMd(alvo, r, mantos, hoje) + '\n';
    if (seco) console.log(md);
    else writeFileSync(new URL('revisao-textos.md', PASTA), md);
    return;
  }

  let clubes;
  if (args.includes('--todos')) {
    clubes = Object.keys(NOMES).filter((c) => arquivos.some((a) => ler(a).linhas.some((l) => l.clube === c && l.status === 'rascunho')));
  } else {
    const c = opcao('clube');
    if (!c || !NOMES[c]) throw new Error('Use --clube=<id> (ex.: --clube=cruzeiro) ou --todos.');
    clubes = [c];
  }

  const buscar = args.includes('--buscar');
  for (const clube of clubes) {
    const r = buscar ? await buscarFontes(clube, { modelos, hoje, seco, candidatosPorGrupo: Number(opcao('candidatos') ?? 3) }) : await conferirClube(clube, { arquivos, modelos, hoje, seco });
    console.log(`${clube}: ${r.confirmadas.length} confirmadas, ${r.recusadas.length} recusadas, ${r.semFonte.length} sem fonte que abra${seco ? ' (--seco: nada gravado)' : ''}`);
    if (!seco) {
      mkdirSync(RELATORIOS, { recursive: true });
      writeFileSync(new URL(`${clube}${buscar ? '-busca' : ''}.md`, RELATORIOS), relatorioMd(r, hoje) + '\n');
    } else {
      for (const x of r.recusadas) console.log(`   recusada: ${x.fato} — ${x.motivo}`);
      for (const x of r.semFonte) console.log(`   sem fonte: ${x.fato} — ${x.motivo}`);
    }
  }
  if (!seco) console.log('\nAgora: npm run importar-casa && npm test, e confira os relatórios em dados/casa/conferencia-gemini/.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
