#!/usr/bin/env node
// Peso e tempo de cada porta de entrada na 1ª visita, no aparelho do Zé (Android de entrada 360×740, CPU 6×, 4G ruim).
//
//   npm run simular:entradas                         build de produção local, Supabase falso (3 vezes cada, mediana)
//   npm run simular:entradas -- --alvo=producao      site no ar, só GET (a guarda de nucleo/rede.mjs vale igual)
//   npm run simular:entradas -- --vezes=5 --refazer --entrada=x1-penaltis
//
// Cada medida abre um navegador novo (sem cache nem Service Worker) e marca dois instantes: a Home (ou a escolha do
// time) pintada com o 1º botão, e a 1ª tela em que dá para tocar no que a pessoa veio fazer (o "Encarar o desafio"
// dos links de X1). "JS até a 1ª tela" é o que chegou até esse instante; "JS em 8 s" inclui o que o jogo baixa por
// trás depois (preaquecer).
//
// No build local, o Supabase é o projeto falso do simulador: a guarda aborta tudo que vai para ele, menos os três
// resumos de desafio (ver_desafio, ver_desafio_lances, ver_prova_desafio), que este script responde no próprio
// navegador, sem rede, com um atraso fixo de ATRASO_RESUMO_MS (abrir a conexão e a ida e volta do 4G ruim). Nenhum
// pedido sai da máquina; só o <link rel="preconnect"> do index.html, que o navegador faz por fora do route, consulta o
// DNS do projeto falso (no site no ar, abre a conexão com o Supabase de verdade, sem pedido). No site no ar
// (--alvo=producao) não há resumo: os links de X1 param na Home sem convite.
// Rodada que não chegou à 1ª tela em 30 s deixa a linha "n/3 abriram", sem mediana.
// Resultado em prints/simulacoes/<dia>/entradas/entradas-<alvo>-<hora>.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APARELHOS } from './nucleo/aparelhos.mjs';
import { subirPacote, SUPABASE_FALSO } from './nucleo/servidor.mjs';
import { Sessao } from './nucleo/sessao.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const PRODUCAO = 'https://torcida.kauewalter.com.br';
const QUEM_JA_JOGA = { 'gdt:prefs': { time: 'flamengo', faixa: '18_mais', aquecimento: { visto: true } } };
/** DNS, TCP, TLS, preflight do CORS e o pedido: 5 idas e voltas de 400 ms no 4G ruim (nucleo/aparelhos.mjs). */
const ATRASO_RESUMO_MS = 2000;

/** Os resumos que o servidor de mentira responde (mesmos campos das RPCs de verdade, docs/jogos/penaltis.md). */
const RESUMOS = {
  ver_desafio: { id: 'abcdefgh', time_id: 'palmeiras', apelido: null, gols_jogador: 3, gols_maquina: 2, pontos: 96, disputa_id: 'athletico-pr-2018-bahia', boneco: null, vencido: false },
  ver_desafio_lances: { id: 'abcdefgh', time_id: 'palmeiras', apelido: null, lance_id: 'flamengo-1981-toquio', pontos: 96, gols: 3, recriados: 1, faixa: 'dificil', boneco: null, vencido: false },
  ver_prova_desafio: { id: 'abcdefgh', time_id: 'palmeiras', apelido: null, pontos: 96, escada: '🟩🟩🟩🟩🟩🟩🟥⬜', resumo: '6 de 8 certas', vencido: false },
};

/** As portas de entrada. `pinta`: o 1º botão da tela; `pronta`: o que a pessoa veio tocar. */
const ENTRADAS = [
  { id: 'x1-penaltis', nome: 'Link do desafio de pênaltis (?d=)', caminho: '/?d=abcdefgh', pinta: 'button', pronta: '[data-faixa-time], [data-acao="escolher-time"]' },
  { id: 'x1-lances', nome: 'Link do desafio de Lances (?l=)', caminho: '/?l=abcdefgh', pinta: 'button', pronta: '[data-faixa-time], [data-acao="escolher-time"]' },
  { id: 'x1-prova', nome: 'Link do desafio da Prova (?p=)', caminho: '/?p=abcdefgh', pinta: 'button', pronta: '[data-faixa-time], [data-acao="escolher-time"]' },
  { id: 'time', nome: 'Link de time (?time=)', caminho: '/?time=flamengo', pinta: 'button', pronta: 'text=/qual [ée] a sua torcida/i' },
  { id: 'home', nome: 'Home de quem já joga', caminho: '/', pinta: 'button', pronta: 'text=/jogar agora/i', semear: QUEM_JA_JOGA },
];

function argumentos() {
  const a = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) a[m[1]] = m[2] ?? true;
  }
  for (const k of ['alvo', 'vezes', 'refazer', 'porta', 'entrada'])
    if (a[k] === undefined && process.env[`npm_config_${k}`]) a[k] = process.env[`npm_config_${k}`];
  return a;
}

const mediana = (v) => {
  const o = [...v].sort((x, y) => x - y);
  return o.length ? o[Math.floor(o.length / 2)] : null;
};
const kb = (n) => (n === null ? null : Math.round(n / 102.4) / 10);
const seg = (ms) => (ms === null ? 'não abriu' : `${(ms / 1000).toFixed(1)} s`);

/** Responde os três resumos no próprio navegador (sem rede). Devolve as URLs respondidas, que a auditoria aceita. */
async function responderResumos(page) {
  const respondidas = new Set();
  await page.route(`${SUPABASE_FALSO}/rest/v1/rpc/*`, async (route) => {
    const nome = new URL(route.request().url()).pathname.split('/').pop();
    if (!RESUMOS[nome]) return route.fallback();
    respondidas.add(route.request().url().slice(0, 300));
    await new Promise((ok) => setTimeout(ok, ATRASO_RESUMO_MS));
    await route
      .fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
        body: JSON.stringify([RESUMOS[nome]]),
      })
      .catch(() => {});
  });
  return respondidas;
}

async function medirUma(entrada, { modo, origem, pasta }) {
  const aparelho = { id: 'android-entrada', ...APARELHOS['android-entrada'] };
  const persona = { id: 'ze', nome: 'Zé', toque: { erroPx: 4, demoraMs: 80 }, gesto: { escalaForca: 1, duracaoMs: 150, tremorPx: 0 } };
  const s = new Sessao({ persona, aparelho, modo: modo === 'producao' ? 'producao' : 'dev', origem, pasta, raizPrints: pasta, famosos: [] });
  await s.iniciar();
  if (entrada.semear) await s.semear(entrada.semear);
  const respondidas = modo === 'producao' ? new Set() : await responderResumos(s.page);
  const chegou = [];
  const t0 = Date.now();
  s.page.on('requestfinished', async (r) => {
    const t = await r.sizes().catch(() => null);
    if (t) chegou.push({ url: r.url(), tipo: r.resourceType(), bytes: t.responseBodySize + t.responseHeadersSize, ms: Date.now() - t0 });
  });
  const quando = async (seletor) => {
    try {
      await s.page.locator(seletor).first().waitFor({ state: 'visible', timeout: 30000 });
      return Date.now() - t0;
    } catch {
      return null;
    }
  };
  await s.page.goto(s.endereco(entrada.caminho), { waitUntil: 'commit', timeout: 60000 });
  const [pinta, pronta] = await Promise.all([quando(entrada.pinta), modo === 'producao' && entrada.id.startsWith('x1') ? null : quando(entrada.pronta)]);
  const ate = (ms) => chegou.filter((c) => ms !== null && c.ms <= ms);
  const jsAte = ate(pronta ?? pinta).filter((c) => c.tipo === 'script');
  await s.esperar(8000);
  const { furos } = await s.encerrar();
  const deFora = furos.filter((f) => !respondidas.has(f.url));
  if (deFora.length) throw new Error(`resposta de fora da lista: ${deFora.map((x) => x.url).join(', ')}`);
  const soma = (l) => l.reduce((a, c) => a + c.bytes, 0);
  return {
    pinta,
    pronta,
    jsAte: soma(jsAte),
    arquivosAte: jsAte.map((c) => `${c.url.split('/').pop()} ${kb(c.bytes)}`),
    totalAte: soma(ate(pronta ?? pinta)),
    jsEm8s: soma(chegou.filter((c) => c.tipo === 'script')),
  };
}

async function main() {
  const arg = argumentos();
  const modo = arg.alvo === 'producao' ? 'producao' : 'local';
  const vezes = Number(arg.vezes ?? 3);
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const pasta = join(RAIZ, 'prints', 'simulacoes', dia, 'entradas');
  mkdirSync(pasta, { recursive: true });
  let pacote = null;
  let origem = PRODUCAO;
  if (modo === 'local') {
    pacote = await subirPacote({ raiz: RAIZ, porta: Number(arg.porta ?? 5293), refazer: !!arg.refazer, modo: 'production' });
    origem = pacote.origem;
  }
  const linhas = [];
  try {
    for (const e of ENTRADAS.filter((x) => !arg.entrada || x.id === arg.entrada)) {
      const rodadas = [];
      for (let i = 0; i < vezes; i++) {
        const r = await medirUma(e, { modo, origem, pasta: join(pasta, `${modo}-${e.id}-${i}`) });
        rodadas.push(r);
        console.log(`  ${e.id} #${i + 1}: pinta ${seg(r.pinta)}, pronta ${seg(r.pronta)}, JS até a 1ª tela ${kb(r.jsAte)} kB, em 8 s ${kb(r.jsEm8s)} kB`);
      }
      const med = (k) => mediana(rodadas.map((r) => r[k]).filter((x) => x !== null));
      const abriram = rodadas.filter((r) => r.pronta !== null).length;
      linhas.push({
        entrada: e.nome,
        id: e.id,
        pintaMs: med('pinta'),
        prontaMs: abriram === rodadas.length ? med('pronta') : null,
        abriram: `${abriram}/${rodadas.length}`,
        prontaTodas: rodadas.map((r) => r.pronta),
        jsAteKB: kb(med('jsAte')),
        totalAteKB: kb(med('totalAte')),
        jsEm8sKB: kb(med('jsEm8s')),
        arquivosAte: rodadas[0].arquivosAte,
      });
    }
  } finally {
    pacote?.parar();
  }
  const arquivo = join(pasta, `entradas-${modo}-${Date.now()}.json`);
  writeFileSync(arquivo, JSON.stringify({ modo, atrasoResumoMs: ATRASO_RESUMO_MS, linhas }, null, 2));
  console.log(`\n| Entrada | Pinta (1º botão) | 1ª tela tocável | JS até ela | Tudo até ela | JS em 8 s |\n|---|---|---|---|---|---|`);
  for (const l of linhas)
    console.log(`| ${l.entrada} | ${seg(l.pintaMs)} | ${l.prontaMs === null ? `${l.abriram} abriram` : seg(l.prontaMs)} | ${l.jsAteKB} kB | ${l.totalAteKB} kB | ${l.jsEm8sKB} kB |`);
  console.log(`\nDetalhe em ${arquivo}`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
