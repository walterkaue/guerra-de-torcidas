// Confere as perguntas de staging_gt.perguntas pela fonte de cada uma, sem confiar no status `revisada`.
// Filtros de graça primeiro (regras e fonte); só o que sobra vai ao Gemini, que aponta o trecho que prova
// a resposta. Quem decide é o código: o trecho tem de estar na página, letra por letra, com a resposta,
// o ano e o clube. Pergunta longa ou sem ano é conserto, não erro de fato: o Gemini reescreve a partir do
// trecho e o código confere. Por fim, outro modelo responde às cegas, sem saber qual é a certa.
// O que passa vira dados/perguntas/lote-NN.csv como `rascunho`. Nada entra no banco por aqui.
//
// Uso (precisa do projeto ligado no checkout principal e de GEMINI_API_KEY no ambiente):
//   node scripts/perguntas/conferir-staging.mjs --funil                       mede as filtragens de graça, sem IA
//   node scripts/perguntas/conferir-staging.mjs --clube=vasco --gerais=40     amostra com o Gemini
// Opções: --seco (não grava) --semente=7 (sorteio das gerais) --com-link (soma as de outros clubes com link real)

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baixar, citaClube, dominioAceito, dominioDe, esperar, normalizar, numerosDe } from '../casa/conferir-gemini.mjs';
import { chamar, montarCorpo, raizDoCheckout, registrarUso } from '../ia/gemini.mjs';
import { MODELOS } from '../ia/modelos.mjs';
import { ASSUNTOS_FORA, alternativasEmbaralhadas, avaliarPergunta, chave, respostaNoTrecho, trechoNaPagina, vereditoAuditoria } from './geracao.mjs';
import { COLUNAS, DEGRAUS, MARCAS_PROIBIDAS, acharPalavras, acharTemas, lerPerguntas, validarConjunto } from './validar.mjs';

const PASTA = fileURLToPath(new URL('../../dados/perguntas/', import.meta.url));
const LIMITE_PAGINA = 80_000; // caracteres mandados ao modelo (cerca de 20 mil tokens)
const PAUSA_MS = 5_000; // entre chamadas, para caber na cota gratuita por minuto
const FONTE_QUALQUER = 'https://ge.globo.com/fonte-de-teste'; // para julgar o texto sem misturar com a fonte

// ---------------------------------------------------------------------------
// Partes puras (testadas em conferir-staging.test.ts)
// ---------------------------------------------------------------------------

const CLUBES_DO_STAGING = {
  'athletico pr': 'athletico-pr', 'atletico mg': 'atletico-mg', 'atletico mineiro': 'atletico-mg', bahia: 'bahia',
  botafogo: 'botafogo', bragantino: 'bragantino', chapecoense: 'chapecoense', corinthians: 'corinthians',
  coritiba: 'coritiba', cruzeiro: 'cruzeiro', flamengo: 'flamengo', fluminense: 'fluminense', gremio: 'gremio',
  internacional: 'internacional', mirassol: 'mirassol', palmeiras: 'palmeiras', remo: 'remo', santos: 'santos',
  'sao paulo': 'sao-paulo', vasco: 'vasco', vitoria: 'vitoria', geral: 'geral',
};

/** O staging escreve o clube de vários jeitos ("Atlético Mineiro", "Atletico-MG"); aqui vira o id do jogo. */
export const clubeDoStaging = (nome) => CLUBES_DO_STAGING[normalizar(nome)] ?? null;

const limpo = (s) => String(s ?? '').replace(/ /g, ' ').replace(/^"+|"+$/g, '').replace(/\s+/g, ' ').trim();
const semMarca = (s) => s.replace(/\b(Red Bull|RB) Bragantino\b/g, 'Bragantino');

/** Linha do banco → pergunta do CSV (aspas sobrando, marca do clube e alternativas por letra resolvidas). */
export function linhaDoStaging(r) {
  const alts = { A: r.alternativa_a, B: r.alternativa_b, C: r.alternativa_c, D: r.alternativa_d };
  const certa = String(r.correta ?? '').trim().toUpperCase();
  const erradas = Object.keys(alts).filter((k) => k !== certa).map((k) => semMarca(limpo(alts[k])));
  return {
    staging: r.id,
    clube: clubeDoStaging(r.clube),
    degrau: normalizar(r.degrau),
    tema: limpo(r.tema),
    pergunta: semMarca(limpo(r.texto)),
    certa: semMarca(limpo(alts[certa])),
    errada1: erradas[0] ?? '',
    errada2: erradas[1] ?? '',
    errada3: erradas[2] ?? '',
    fonte: limpo(r.fonte),
  };
}

/** Motivo para a fonte não poder provar nada, antes de baixar (ou null). */
export function motivoDaFonte(l) {
  const d = dominioDe(l.fonte);
  if (!d) return 'sem link de fonte';
  if (l.fonte.includes('#sem-link')) return 'marcada sem link no próprio staging';
  if (d === 'wikipedia.org' || d.endsWith('.wikipedia.org')) return 'só Wikipédia (seção 7.1 pede outra fonte junto)';
  const caminho = new URL(l.fonte).pathname.replace(/\/+$/, '');
  if (!caminho) return 'link só para a página inicial do site';
  if (/^\/[a-z-]+$/.test(caminho)) return 'link só para uma página de seção do site';
  return dominioAceito(d) ? null : `domínio não aceito (${d})`;
}

const MUDA_COM_O_TEMPO = ['atual', 'atualmente', 'hoje', 'nos dias de hoje'];

/** Linha vermelha das seções 7, 7.1 e 8: reescrever não resolve (ou null). */
export function motivoDeRegra(l) {
  if (!l.clube) return 'clube fora da lista';
  const texto = [l.tema, l.pergunta, l.certa, l.errada1, l.errada2, l.errada3].join(' | ');
  const palavra = acharPalavras(texto)[0];
  if (palavra) return `palavra proibida ("${palavra}")`;
  const tema = acharTemas(texto)[0];
  if (tema) return `tema fora da regra ("${tema}")`;
  const t = ` ${chave(texto)} `;
  const fora = ASSUNTOS_FORA.find((a) => t.includes(` ${chave(a)}`));
  if (fora) return `assunto fora do quiz ("${fora}")`;
  const marca = MARCAS_PROIBIDAS.find((m) => t.includes(` ${chave(m)} `));
  if (marca) return `marca de terceiros ("${marca}")`;
  const p = ` ${chave(l.pergunta)} `;
  const tempo = MUDA_COM_O_TEMPO.find((m) => p.includes(` ${chave(m)} `));
  return tempo ? `fato que muda com o tempo ("${tempo}")` : null;
}

/**
 * Motivo para o texto não entrar como está (ou null): reaproveita as travas do pipeline. O trecho e a
 * página são falsos de propósito, porque aqui só interessa o texto; a fonte é outra conferência.
 */
export function motivoDoTexto(l) {
  const junto = `${l.certa} ${l.pergunta}`;
  const m = avaliarPergunta({ ...l, trecho: junto }, { clube: l.clube, fonte: FONTE_QUALQUER, pagina: junto });
  return m ? m.replace(/^validador: /, '') : null;
}

/** Só tamanho, ano, interrogação ou citar a fonte: a pergunta tem conserto sem tocar nas alternativas. */
export const textoTemConserto = (motivo) =>
  motivo.split('; ').every((m) => /^pergunta com \d+ caracteres|^pergunta sem ano|^pergunta não termina|^a pergunta cita a fonte/.test(m));

const VAZIAS = new Set(['qual', 'quem', 'quantos', 'quantas', 'como', 'onde', 'quando', 'pelo', 'pela', 'para', 'com', 'dos', 'das', 'que', 'foi', 'uma', 'seu', 'sua', 'clube', 'time']);
const palavras = (s) => new Set(chave(s).split(' ').filter((p) => p.length > 2 && !VAZIAS.has(p)));

const anosDe = (s) => String(s).match(/\b(?:18|19|20)\d{2}\b/g) ?? [];

/** Mesma resposta e, do mesmo clube e ano ou com 60% das palavras em comum: é o mesmo fato com outra redação. */
export function quaseIgual(a, b) {
  if (chave(a.certa) !== chave(b.certa)) return false;
  if (a.clube && a.clube === b.clube && anosDe(a.pergunta).some((x) => anosDe(b.pergunta).includes(x))) return true;
  const pa = palavras(a.pergunta);
  const pb = palavras(b.pergunta);
  const comuns = [...pa].filter((p) => pb.has(p)).length;
  return comuns / (pa.size + pb.size - comuns || 1) >= 0.6;
}

/** Teto do degrau na meta do lançamento (seção 7.1): 30 por clube e 200 gerais, na proporção 3/3/2/2. */
export const tetoDoDegrau = (clube, degrau) => (clube === 'geral' ? 20 : 3) * { facil: 3, media: 3, dificil: 2, craque: 2 }[degrau];

/** O trecho está na página, com a resposta, o ano da pergunta e o clube? Devolve o motivo quando não. */
export function motivoDoTrecho(l, trecho, pagina) {
  if (!trechoNaPagina(trecho, pagina)) return 'o trecho não está na página';
  if (!respostaNoTrecho(l.certa, trecho)) return 'a resposta certa não aparece no trecho';
  const anos = (l.pergunta.match(/\b(?:18|19|20)\d{2}\b/g) ?? []).map(Number);
  const falta = anos.find((a) => !numerosDe(trecho).includes(a));
  if (falta) return `o trecho não traz o ano ${falta}`;
  if (l.clube !== 'geral' && !citaClube(l.clube, trecho, dominioDe(l.fonte))) return 'o trecho não cita o clube';
  return null;
}

/** A pergunta reescrita segue válida e só usa o que estava na original ou no trecho? */
export function motivoDaReescrita(l, nova, trecho) {
  if (respostaNoTrecho(l.certa, nova)) return 'a reescrita entrega a resposta';
  const m = motivoDoTexto({ ...l, pergunta: nova });
  if (m) return `reescrita: ${m}`;
  const base = `${l.pergunta} ${trecho}`;
  const numero = numerosDe(nova).find((n) => !numerosDe(base).includes(n));
  if (numero !== undefined) return `a reescrita trouxe um número novo (${numero})`;
  const nome = nova.split(/\s+/).slice(1).find((p) => /^\p{Lu}\p{L}{3,}/u.test(p) && !` ${chave(base)} `.includes(` ${chave(p)} `));
  return nome ? `a reescrita trouxe um nome novo (${nome})` : null;
}

/** Próximo id livre de cada clube e degrau, olhando os CSVs e o banco. */
export function proximosIds(existentes) {
  const maior = new Map();
  for (const id of existentes) {
    const m = /^(.+-[fmdc])-(\d+)$/.exec(id);
    if (m) maior.set(m[1], Math.max(maior.get(m[1]) ?? 0, Number(m[2])));
  }
  return (clube, degrau) => {
    const base = `${clube}-${degrau[0]}`;
    maior.set(base, (maior.get(base) ?? 0) + 1);
    return `${base}-${String(maior.get(base)).padStart(2, '0')}`;
  };
}

const citar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export const csvDoLote = (linhas) => [COLUNAS.map(citar).join(','), ...linhas.map((l) => COLUNAS.map((c) => citar(l[c])).join(','))].join('\n') + '\n';

/** Sorteio reprodutível: a mesma semente dá a mesma amostra. */
export function sortear(lista, n, semente) {
  let x = semente;
  const resto = [...lista];
  const fora = [];
  while (fora.length < n && resto.length) {
    x = (x * 1664525 + 1013904223) % 4294967296;
    fora.push(resto.splice(x % resto.length, 1)[0]);
  }
  return fora;
}

// ---------------------------------------------------------------------------
// Rede e disco
// ---------------------------------------------------------------------------

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function consultar(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'perguntas-'));
  try {
    const arq = join(dir, 'q.sql');
    writeFileSync(arq, sql);
    // O projeto ligado (supabase/.temp) só existe no checkout principal, não nos worktrees.
    const cwd = raizDoCheckout(PASTA) ?? undefined;
    const saida = execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', arq], { encoding: 'utf8', cwd, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'] });
    const d = JSON.parse(saida.slice(saida.indexOf('{')));
    return d.rows ?? [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SQL_STAGING = `select s.* from staging_gt.perguntas s where s.status = 'revisada'
  and not exists (select 1 from public.perguntas p where lower(trim(p.texto)) = lower(trim(s.texto))) order by s.clube, s.id;`;
const SQL_PUBLICAS = `select id, coalesce(clube, 'geral') as clube, degrau, texto as pergunta, certa from public.perguntas where status <> 'aposentada';`;

const INSTRUCAO = `Você confere perguntas de quiz de futebol contra o TEXTO DA PÁGINA, e só contra ele (nada de memória).
Para cada item, confirma=true apenas se o texto da página prova que a RESPOSTA responde à PERGUNTA inteira: o clube, a competição, o ano e o número.
Em "trecho", copie a frase EXATA da página que traz a resposta e o ano, sem mudar nenhuma letra, com até 300 caracteres. Numa tabela ou lista, copie o pedaço que traz os dois juntos.
Se a página não prova, confirma=false e trecho="". Responda um item para cada id recebido.`;

const INSTRUCAO_CEGA = `Você responde perguntas de quiz de futebol usando só o TEXTO DA PÁGINA (nada de memória).
Para cada item, escolha a alternativa que a página prova e copie em "escolhida" o texto dela, igual ao recebido. Em "trecho", copie a frase EXATA da página que prova a escolha, com até 300 caracteres.
Se a página não prova nenhuma, deixe "escolhida" e "trecho" vazios. Se a página prova mais de uma, marque outraTambemCerta=true. Responda um item para cada id recebido.`;

const INSTRUCAO_REESCRITA = `Você encurta perguntas de quiz de futebol, em português do Brasil, sem mudar o fato nem a resposta.
Para cada item, escreva "pergunta": até 130 caracteres, terminando em "?", com o ano do fato (ex.: "Em 1992, ..."), e usando só o que está na PERGUNTA ORIGINAL ou no TRECHO.
Não cite a resposta, a página, a matéria nem as regras "segundo" alguém. Sem opinião e sem adjetivo. Se o TRECHO não traz o ano, devolva pergunta="". Responda um item para cada id recebido.`;

const ESQUEMA_REESCRITA = { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, pergunta: { type: 'STRING' } }, required: ['id', 'pergunta'] } };

const ESQUEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, confirma: { type: 'BOOLEAN' }, trecho: { type: 'STRING' } }, required: ['id', 'confirma', 'trecho'] } };
const ESQUEMA_CEGO = { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, escolhida: { type: 'STRING' }, trecho: { type: 'STRING' }, outraTambemCerta: { type: 'BOOLEAN' } }, required: ['id', 'escolhida', 'trecho', 'outraTambemCerta'] } };

const uso = { chamadas: 0, entrada: 0, saida: 0, porModelo: {} };

async function perguntar(modelos, instrucao, entrada, esquema, nome) {
  if (uso.chamadas) await esperar(PAUSA_MS);
  const corpo = montarCorpo(instrucao, entrada, esquema);
  corpo.generationConfig.temperature = 0;
  const r = await chamar(modelos, corpo, esquema, process.env.GEMINI_API_KEY);
  uso.chamadas++;
  uso.entrada += r.tokensEntrada;
  uso.saida += r.tokensSaida;
  uso.porModelo[r.modelo] = (uso.porModelo[r.modelo] ?? 0) + 1;
  registrarUso(r.modelo, r.tokensEntrada, r.tokensSaida, nome);
  return { modelo: r.modelo, respostas: JSON.parse(r.texto) };
}

/** Confere as perguntas de uma página: trecho citado com a certa à vista e, para quem passa, às cegas. */
async function conferirPagina(itens, pagina, nome) {
  const texto = pagina.slice(0, LIMITE_PAGINA);
  const lista = itens.map((it) => `${it.l.staging}: PERGUNTA: ${it.l.pergunta} RESPOSTA: ${it.l.certa}`).join('\n');
  const a = await perguntar(MODELOS, INSTRUCAO, `ITENS:\n${lista}\n\nTEXTO DA PÁGINA:\n${texto}`, ESQUEMA, nome);
  const porId = new Map(a.respostas.map((r) => [r.id, r]));
  const vivos = [];
  for (const it of itens) {
    const r = porId.get(it.l.staging);
    const trecho = (r?.trecho ?? '').trim();
    if (!r) it.motivo = 'o modelo não devolveu o item';
    else if (!r.confirma) it.motivo = 'a página não prova a resposta';
    else it.motivo = motivoDoTrecho(it.l, trecho, pagina);
    if (r?.confirma && it.motivo) it.ruido = true; // o modelo disse que provava e o código recusou
    if (it.motivo) continue;
    it.trecho = trecho;
    it.modelo = a.modelo;
    vivos.push(it);
  }
  if (!vivos.length) return;

  // Conserto do texto: o modelo reescreve a partir do trecho, e o código decide se vale.
  const longas = vivos.filter((it) => motivoDoTexto(it.l));
  if (longas.length) {
    const pedido = longas.map((it) => `${it.l.staging}: PERGUNTA ORIGINAL: ${it.l.pergunta} RESPOSTA: ${it.l.certa} TRECHO: ${it.trecho}`).join('\n');
    const r = await perguntar(MODELOS, INSTRUCAO_REESCRITA, pedido, ESQUEMA_REESCRITA, `${nome}-reescrita`);
    const porIdNova = new Map(r.respostas.map((x) => [x.id, (x.pergunta ?? '').trim()]));
    for (const it of longas) {
      const nova = porIdNova.get(it.l.staging) ?? '';
      it.motivo = nova ? motivoDaReescrita(it.l, nova, it.trecho) : 'sem ano no trecho para reescrever';
      if (it.motivo) continue;
      it.original = it.l.pergunta;
      it.l = { ...it.l, pergunta: nova };
    }
  }
  const prontas = vivos.filter((it) => !it.motivo);
  if (!prontas.length) return;

  // Às cegas, com o modelo seguinte da lista: quem confirma não é quem citou.
  const outros = [...MODELOS.slice(MODELOS.indexOf(a.modelo) + 1), ...MODELOS.slice(0, MODELOS.indexOf(a.modelo) + 1)];
  const cegas = prontas.map((it) => `${it.l.staging}: PERGUNTA: ${it.l.pergunta} ALTERNATIVAS: ${alternativasEmbaralhadas(it.l).join(' | ')}`).join('\n');
  const c = await perguntar(outros, INSTRUCAO_CEGA, `ITENS:\n${cegas}\n\nTEXTO DA PÁGINA:\n${texto}`, ESQUEMA_CEGO, `${nome}-cega`);
  const porIdCega = new Map(c.respostas.map((r) => [r.id, r]));
  for (const it of prontas) {
    const r = porIdCega.get(it.l.staging);
    it.motivo = vereditoAuditoria(it.l, r, pagina);
    if (it.motivo) it.cega = true;
    else {
      it.trechoCego = r.trecho.trim();
      it.modeloCego = c.modelo;
    }
  }
}

function contar(itens, chaveDe) {
  const m = new Map();
  for (const it of itens) m.set(chaveDe(it), (m.get(chaveDe(it)) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Filtragens de graça. `motivo`: regra quebrada, repetição ou texto sem conserto. `motivoFonte`: fonte sem prova. */
function filtrar(staging, publicas) {
  const itens = staging.map((r) => ({ l: linhaDoStaging(r), motivo: null, motivoFonte: null }));
  const vistas = [...publicas];
  for (const it of itens) {
    it.motivo = motivoDeRegra(it.l);
    const texto = it.motivo ? null : motivoDoTexto(it.l);
    if (texto && !textoTemConserto(texto)) it.motivo = texto;
    if (!it.motivo) {
      const igual = vistas.find((v) => quaseIgual(it.l, v));
      if (igual) it.motivo = `repete pergunta que já existe (${igual.id ?? igual.staging})`;
      else vistas.push(it.l);
    }
    it.motivoFonte = it.l.clube ? motivoDaFonte(it.l) : 'clube fora da lista';
  }
  return itens;
}

async function funil(itens) {
  const textoOk = itens.filter((it) => !it.motivo);
  const fonteOk = itens.filter((it) => !it.motivoFonte);
  const ambos = textoOk.filter((it) => !it.motivoFonte);
  console.log(`staging: ${itens.length} · regras ok: ${textoOk.length} · fonte com link real: ${fonteOk.length} · os dois: ${ambos.length}`);
  console.log('fonte:', contar(itens, (it) => it.motivoFonte ?? 'link real'));
  console.log('texto:', contar(itens, (it) => (it.motivo ?? 'ok').replace(/\(.*\)/, '').slice(0, 60)).slice(0, 14));
  console.log('sobra por clube:', contar(ambos, (it) => it.l.clube));
  const urls = [...new Set(ambos.map((it) => it.l.fonte))];
  const abertas = [];
  for (const u of urls) abertas.push({ u, r: await baixar(u) });
  console.log(`links dos que sobraram: ${urls.length} · abriram: ${abertas.filter((a) => !a.r.erro).length}`);
  console.log(contar(abertas.filter((a) => a.r.erro), (a) => a.r.erro));
  const vivas = new Set(abertas.filter((a) => !a.r.erro).map((a) => a.u));
  console.log('abrem, por clube:', contar(ambos.filter((it) => vivas.has(it.l.fonte)), (it) => it.l.clube));
}

async function amostra(itens, publicas, { clube, gerais, semente, seco, comLink }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Falta a variável de ambiente GEMINI_API_KEY.');
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const doClube = itens.filter((it) => it.l.clube === clube);
  const todasGerais = itens.filter((it) => it.l.clube === 'geral');
  const sorteadas = sortear(todasGerais, gerais, semente);
  const extras = comLink ? itens.filter((it) => !it.motivoFonte && !doClube.includes(it) && !sorteadas.includes(it)) : [];
  const escolhidas = [...doClube, ...sorteadas, ...extras];

  // Sem falha de texto, de repetição ou de fonte, a pergunta vai à página. Uma chamada por página.
  const paginas = new Map();
  for (const it of escolhidas) {
    if (it.motivo || it.motivoFonte) continue;
    if (!paginas.has(it.l.fonte)) paginas.set(it.l.fonte, []);
    paginas.get(it.l.fonte).push(it);
  }
  let n = 0;
  for (const [url, lista] of paginas) {
    n++;
    const p = await baixar(url);
    if (p.erro) {
      for (const it of lista) it.motivoFonte = `a fonte não abriu (${p.erro})`;
      continue;
    }
    try {
      await conferirPagina(lista, p.texto, `piloto-perguntas-${dominioDe(url)}-${n}.json`);
    } catch (e) {
      for (const it of lista) if (!it.motivo) it.motivo = `sem resposta do modelo: ${e.message}`;
      console.error(`parei em ${dominioDe(url)}: ${e.message}`);
      break;
    }
    process.stdout.write(`\r  página ${n}/${paginas.size}`);
  }
  console.log('');

  // Cota da seção 7.1 e numeração: contam o que já está no banco e nos lotes.
  const lotes = readdirSync(PASTA).filter((a) => /^lote-\d+\.csv$/.test(a)).sort();
  const dosLotes = lotes.flatMap((a) => lerPerguntas(readFileSync(join(PASTA, a), 'utf8')));
  const existentes = new Map();
  for (const p of publicas) existentes.set(p.id, { clube: p.clube, degrau: Object.keys(DEGRAUS).find((d) => DEGRAUS[d] === Number(p.degrau)) });
  for (const p of dosLotes) if (!existentes.has(p.id)) existentes.set(p.id, p);
  const contagem = (c, d) => [...existentes.values()].filter((p) => p.clube === c && p.degrau === d).length;
  const proximoId = proximosIds([...existentes.keys()]);

  const data = hoje.split('-').reverse().join('/');
  const aprovadas = [];
  for (const it of escolhidas) {
    if (it.motivo || it.motivoFonte || !it.trecho) continue;
    const { clube: c, degrau: d } = it.l;
    const igual = [...publicas, ...aprovadas.map((a) => a.linha)].find((v) => quaseIgual(it.l, v));
    if (igual) {
      it.motivo = `repete pergunta que já existe (${igual.id})`;
      continue;
    }
    if (contagem(c, d) >= tetoDoDegrau(c, d)) {
      it.motivo = `degrau cheio na meta (${tetoDoDegrau(c, d)})`;
      continue;
    }
    const id = proximoId(c, d);
    existentes.set(id, { clube: c, degrau: d });
    const curto = (t) => (t.length > 200 ? `${t.slice(0, 197)}...` : t).replace(/"/g, "'");
    it.linha = {
      ...it.l, id, fonte2: '', verificada_em: hoje, status: 'rascunho',
      observacao: `Staging ${it.l.staging}${it.original ? ', texto encurtado pelo Gemini a partir do trecho' : ''}. Conferido em ${data} por script (${it.modelo}, trecho literal em ${dominioDe(it.l.fonte)}): "${curto(it.trecho)}". Às cegas (${it.modeloCego}): "${curto(it.trechoCego)}".`,
    };
    aprovadas.push(it);
  }

  const num = String(Number(lotes.at(-1)?.match(/\d+/)?.[0] ?? 0) + 1).padStart(2, '0');
  const erros = validarConjunto(aprovadas.map((a) => a.linha));
  if (erros.length) throw new Error(`o lote saiu inválido: ${erros.map((e) => `${e.id}: ${e.erro}`).join('; ')}`);
  const relatorio = relatorioMd({ escolhidas, aprovadas, num, hoje, clube, gerais, semente, totalGerais: todasGerais.length, paginas: paginas.size, extras, uso });
  console.log(`${escolhidas.length} na amostra · ${aprovadas.length} aprovadas · ${uso.chamadas} chamadas · ${uso.entrada} tokens de entrada · ${uso.saida} de saída`);
  if (seco) return console.log(relatorio.slice(0, 3000));
  writeFileSync(join(PASTA, `lote-${num}.csv`), csvDoLote(aprovadas.map((a) => a.linha)));
  writeFileSync(join(PASTA, `piloto-lote-${num}.md`), relatorio);
  console.log(`Gravados dados/perguntas/lote-${num}.csv e dados/perguntas/piloto-lote-${num}.md.`);
}

const celula = (s) => String(s ?? '').replace(/\|/g, '/');

export function relatorioMd({ escolhidas, aprovadas, num, hoje, clube, gerais, semente, totalGerais, paginas, extras, uso }) {
  const reprovadas = escolhidas.filter((it) => !aprovadas.includes(it));
  const motivoDe = (it) => it.motivo ?? it.motivoFonte ?? 'não chegou a ser conferida';
  const grupo = (it) => motivoDe(it).replace(/\s*[("].*$/, '').replace(/: .*$/, '');
  const taxa = (a, b) => `${b ? Math.round((100 * a) / b) : 0}%`;
  const doClube = escolhidas.filter((it) => it.l.clube === clube);
  const asGerais = escolhidas.filter((it) => it.l.clube === 'geral');
  const foraDoClube = extras.filter((it) => it.l.clube !== 'geral');
  const aprovadasDe = (lista) => aprovadas.filter((a) => lista.includes(a)).length;
  const foramPagina = escolhidas.filter((it) => it.trecho || it.ruido || it.motivo === 'a página não prova a resposta').length;
  const reescritas = escolhidas.filter((it) => it.original).length;
  return [
    `# Piloto: perguntas do staging (lote ${num})`,
    '',
    `Rodada de ${hoje.split('-').reverse().join('/')} com \`scripts/perguntas/conferir-staging.mjs\`. Amostra: todas as ${doClube.length} perguntas de ${clube}, ${gerais} das ${totalGerais} gerais (semente ${semente}) e as ${extras.length} de outros clubes ou gerais com link real.`,
    '',
    '## Resultado',
    '',
    '| Grupo | Na amostra | Aprovadas | Aproveitamento |',
    '|---|---:|---:|---:|',
    `| ${clube} | ${doClube.length} | ${aprovadasDe(doClube)} | ${taxa(aprovadasDe(doClube), doClube.length)} |`,
    `| geral | ${asGerais.length} | ${aprovadasDe(asGerais)} | ${taxa(aprovadasDe(asGerais), asGerais.length)} |`,
    `| outros clubes com link real | ${foraDoClube.length} | ${aprovadasDe(foraDoClube)} | ${taxa(aprovadasDe(foraDoClube), foraDoClube.length)} |`,
    `| **Total** | **${escolhidas.length}** | **${aprovadas.length}** | **${taxa(aprovadas.length, escolhidas.length)}** |`,
    '',
    `Foram à página ${foramPagina} perguntas, em ${paginas} páginas. O modelo citou um trecho que o código recusou em ${escolhidas.filter((it) => it.ruido).length}; às cegas, recusou mais ${escolhidas.filter((it) => it.cega).length}. Textos reescritos que o código aceitou: ${reescritas}; recusados: ${escolhidas.filter((it) => /reescrit/.test(it.motivo ?? '')).length}.`,
    '',
    '## Gemini',
    '',
    `${uso.chamadas} chamadas · ${uso.entrada} tokens de entrada · ${uso.saida} de saída · ${Object.entries(uso.porModelo).map(([m, n]) => `${m}: ${n}`).join(', ')}.`,
    '',
    '## Por que reprovaram',
    '',
    '| Motivo | Perguntas |',
    '|---|---:|',
    ...contar(reprovadas, grupo).map(([m, n]) => `| ${celula(m)} | ${n} |`),
    '',
    `## Aprovadas (${aprovadas.length}), em \`lote-${num}.csv\`, como rascunho`,
    '',
    '| Id | Staging | Pergunta | Certa | Trecho | Fonte |',
    '|---|---|---|---|---|---|',
    ...aprovadas.map((a) => `| ${a.linha.id} | ${a.l.staging} | ${celula(a.l.pergunta)} | ${celula(a.l.certa)} | ${celula(a.trecho)} | ${dominioDe(a.l.fonte)} |`),
    '',
    `## Reprovadas (${reprovadas.length})`,
    '',
    '| Staging | Clube | Degrau | Pergunta | Motivo |',
    '|---|---|---|---|---|',
    ...reprovadas.map((it) => `| ${it.l.staging} | ${it.l.clube} | ${it.l.degrau} | ${celula(it.l.pergunta)} | ${celula(motivoDe(it))} |`),
    '',
  ].join('\n');
}

async function principal() {
  const args = process.argv.slice(2);
  const opcao = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
  const publicas = consultar(SQL_PUBLICAS);
  const itens = filtrar(consultar(SQL_STAGING), publicas);
  if (args.includes('--funil')) return funil(itens);
  const clube = opcao('clube');
  if (!clube) throw new Error('Use --funil, ou --clube=<id> --gerais=<n>.');
  await amostra(itens, publicas, { clube, gerais: Number(opcao('gerais') ?? 40), semente: Number(opcao('semente') ?? 7), seco: args.includes('--seco'), comLink: args.includes('--com-link') });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
