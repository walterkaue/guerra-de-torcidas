// Confere a Casa do [time] com o Gemini, clube a clube, pelo trecho literal da fonte.
// O script baixa a página da `fonte`; o Gemini só aponta a frase que prova o fato; o script aceita
// apenas se essa frase estiver na página, letra por letra, e trouxer o dado-chave (o ano do título,
// o número do recorde, o placar e o adversário da goleada). Quem decide é o código, não o modelo.
//
// Uso (a chave fica na variável de ambiente GEMINI_API_KEY, nunca no repositório):
//   npm run conferir-casa -- --clube=cruzeiro --seco     simula: mostra o que confirmaria
//   npm run conferir-casa -- --clube=cruzeiro            grava nos CSVs e no relatório
//   npm run conferir-casa -- --todos                     todos os clubes com linha em rascunho
// Opções: --arquivos=titulos,recordes,goleadas (padrão: os três) --modelo=gemini-3.5-flash-lite
//
// Clubes, estádios e mantos têm texto livre (história, descrição) e continuam na conferência humana.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOMINIOS_ACEITOS } from '../clubes/validar.mjs';
import { escreverTabela, lerTabela } from './tabela.mjs';

const PASTA = new URL('../../dados/casa/', import.meta.url);
const RELATORIOS = new URL('../../dados/casa/conferencia-gemini/', import.meta.url);
export const ARQUIVOS_OBJETIVOS = ['titulos', 'recordes', 'goleadas'];
const MODELOS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
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

/** Site oficial de cada clube: na página do próprio clube o trecho pode não repetir o nome. */
const SITE_DO_CLUBE = {
  'athletico-pr': 'athletico.com.br', 'atletico-mg': 'atletico.com.br', bahia: 'esporteclubebahia.com.br',
  botafogo: 'botafogo.com.br', bragantino: 'redbullbragantino.com.br', chapecoense: 'chapecoense.com',
  corinthians: 'corinthians.com.br', coritiba: 'coritiba.com.br', cruzeiro: 'cruzeiro.com.br',
  flamengo: 'flamengo.com.br', fluminense: 'fluminense.com.br', gremio: 'gremio.net',
  internacional: 'internacional.com.br', mirassol: 'mirassolfc.com.br', palmeiras: 'palmeiras.com.br',
  remo: 'clubedoremo.com.br', santos: 'santosfc.com.br', 'sao-paulo': 'saopaulofc.net',
  vasco: 'vasco.com.br', vitoria: 'ecvitoria.com.br',
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
const citaClube = (clube, trecho, dominio) =>
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

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixar(url) {
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

async function perguntarGemini(modelos, fatos, pagina) {
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

  let chamadas = 0;
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
    const texto = pagina.texto.slice(0, LIMITE_PAGINA);
    for (let k = 0; k < itens.length; k += 40) {
      const parte = itens.slice(k, k + 40);
      if (chamadas++) await esperar(PAUSA_MS);
      let resp;
      try {
        resp = await perguntarGemini(modelos, parte, texto);
      } catch (e) {
        for (const it of parte) relatorio.semFonte.push({ fato: rotulo(it), fonte, motivo: e.message });
        continue;
      }
      const porId = new Map(resp.respostas.map((r) => [r.id, r]));
      for (const it of parte) {
        const r = porId.get(it.id);
        const trecho = (r?.trecho ?? '').trim();
        let motivo = null;
        if (!r || !r.confirma) motivo = 'o modelo não achou o fato na página';
        else if (!trechoNaPagina(trecho, pagina.texto)) motivo = 'o trecho citado não está na página';
        else motivo = motivoChave(arquivo, it.linha, trecho, dominio);
        if (motivo) {
          relatorio.recusadas.push({ fato: rotulo(it), fonte, motivo });
          continue;
        }
        relatorio.confirmadas.push({ fato: rotulo(it), fonte, trecho, modelo: resp.modelo });
        const l = tabelas[arquivo].linhas[it.i];
        l.status = 'revisada';
        l.verificada_em = hoje;
        l.observacao = observacaoConfirmada(l.observacao, trecho, dominio, resp.modelo, hoje);
      }
    }
  }

  if (!seco && relatorio.confirmadas.length) {
    for (const a of arquivos) writeFileSync(new URL(`${a}.csv`, PASTA), escreverTabela(tabelas[a]));
  }
  return relatorio;
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
  if (!process.env.GEMINI_API_KEY) throw new Error('Falta a variável de ambiente GEMINI_API_KEY.');
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  let clubes;
  if (args.includes('--todos')) {
    clubes = Object.keys(NOMES).filter((c) => arquivos.some((a) => ler(a).linhas.some((l) => l.clube === c && l.status === 'rascunho')));
  } else {
    const c = opcao('clube');
    if (!c || !NOMES[c]) throw new Error('Use --clube=<id> (ex.: --clube=cruzeiro) ou --todos.');
    clubes = [c];
  }

  for (const clube of clubes) {
    const r = await conferirClube(clube, { arquivos, modelos, hoje, seco });
    console.log(`${clube}: ${r.confirmadas.length} confirmadas, ${r.recusadas.length} recusadas, ${r.semFonte.length} sem fonte que abra${seco ? ' (--seco: nada gravado)' : ''}`);
    if (!seco) {
      mkdirSync(RELATORIOS, { recursive: true });
      writeFileSync(new URL(`${clube}.md`, RELATORIOS), relatorioMd(r, hoje) + '\n');
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
