// CLI genérico para mandar lotes repetitivos ao Gemini (chave gratuita, só modelos Flash).
// A chave fica em GEMINI_API_KEY e vai só no cabeçalho. O terminal mostra um resumo curto:
// a resposta do modelo nunca é impressa, só gravada no arquivo de saída.
//
// Uso:
//   npm run gemini -- --instrucao=<arq> --entrada=<arq> --saida=<arq> [--esquema=<arq.json>] [--modelos=a,b] [--seco]

import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELOS } from './modelos.mjs';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CSV = new URL('../../relatorios/ia-uso.csv', import.meta.url);
const CABECALHO_CSV = 'data,modelo,tokens_entrada,tokens_saida,arquivo_saida';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Partes puras (testadas em gemini.test.ts)
// ---------------------------------------------------------------------------

/** `--nome=valor` e `--flag` viram { nome: 'valor', flag: true }. */
export function lerArgumentos(args) {
  const r = {};
  for (const a of args) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (!m) throw new Error(`argumento desconhecido: ${a.split('=')[0]}`);
    r[m[1]] = m[2] ?? true;
  }
  const validas = ['instrucao', 'entrada', 'saida', 'esquema', 'modelos', 'seco'];
  for (const k of Object.keys(r)) if (!validas.includes(k)) throw new Error(`opção desconhecida: --${k}`);
  for (const k of ['instrucao', 'entrada', 'saida']) if (typeof r[k] !== 'string' || !r[k]) throw new Error(`falta --${k}=<arquivo>`);
  if ('esquema' in r && typeof r.esquema !== 'string') throw new Error('--esquema pede um arquivo: --esquema=<arquivo.json>');
  if ('modelos' in r && typeof r.modelos !== 'string') throw new Error('--modelos pede uma lista: --modelos=a,b');
  return r;
}

/** Qual segredo aparece no texto? Devolve só o tipo, nunca o valor. */
export function acharSegredo(texto) {
  if (/sb_secret_/.test(texto)) return 'sb_secret_';
  if (/GEMINI_API_KEY\s*=/.test(texto)) return 'GEMINI_API_KEY=';
  if (/AIza[0-9A-Za-z_-]{20,}/.test(texto)) return 'chave no formato AIza';
  return null;
}

/** Corpo da chamada; com esquema, pede JSON por esquema. */
export function montarCorpo(instrucao, entrada, esquema) {
  const generationConfig = { temperature: 0.2 };
  if (esquema) Object.assign(generationConfig, { responseMimeType: 'application/json', responseSchema: esquema });
  return {
    systemInstruction: { parts: [{ text: instrucao }] },
    contents: [{ role: 'user', parts: [{ text: entrada }] }],
    generationConfig,
  };
}

/** Texto e tokens da resposta; com `esquema`, o texto precisa ser JSON válido. */
export function lerResposta(d, esquema) {
  const texto = (d?.candidates?.[0]?.content?.parts ?? []).filter((p) => typeof p?.text === 'string').map((p) => p.text).join('');
  if (!texto) throw new Error('resposta vazia');
  if (esquema) {
    try {
      JSON.parse(texto);
    } catch {
      throw new Error('resposta não é JSON válido');
    }
  }
  return { texto, tokensEntrada: d?.usageMetadata?.promptTokenCount ?? 0, tokensSaida: d?.usageMetadata?.candidatesTokenCount ?? 0 };
}

/** Estimativa grosseira (cerca de 4 caracteres por token). */
export const estimarTokens = (...textos) => Math.ceil(textos.join('').length / 4);

/** Linha do registro de uso: só números e o nome do arquivo, nada do conteúdo. */
export function linhaCsv(data, modelo, tokensEntrada, tokensSaida, arquivoSaida) {
  const nome = basename(arquivoSaida).replace(/[",\r\n]/g, '_');
  return `${data},${modelo},${tokensEntrada},${tokensSaida},${nome}`;
}

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------

/** Tenta cada modelo (2 novas tentativas em 429/503), como supabase/functions/_shared/gemini.ts. */
export async function chamar(modelos, corpo, esquema, chave) {
  let ultimo = '';
  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await fetch(`${BASE}/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(120_000),
      }).catch(() => null);
      const d = r ? await r.json().catch(() => ({})) : {};
      if (r?.ok) {
        try {
          return { modelo, ...lerResposta(d, esquema) };
        } catch (e) {
          ultimo = `${modelo}: ${e.message}`;
          break;
        }
      }
      ultimo = `${modelo}: ${d?.error?.status ?? (r ? `HTTP ${r.status}` : 'falha de rede')}`;
      if (r && (r.status === 429 || r.status === 503)) await esperar(8_000 * (tentativa + 1));
      else break;
    }
  }
  throw new Error(`nenhum modelo respondeu (${ultimo})`);
}

async function principal() {
  const a = lerArgumentos(process.argv.slice(2));
  const ler = (caminho, rotulo) => {
    try {
      return readFileSync(caminho, 'utf8');
    } catch {
      throw new Error(`não consegui ler ${rotulo}: ${caminho}`);
    }
  };
  const instrucao = ler(a.instrucao, '--instrucao');
  const entrada = ler(a.entrada, '--entrada');
  let esquema;
  if (a.esquema) {
    const bruto = ler(a.esquema, '--esquema');
    try {
      esquema = JSON.parse(bruto);
    } catch {
      throw new Error(`--esquema não é JSON válido: ${a.esquema}`);
    }
  }
  const segredo = acharSegredo(instrucao) ?? acharSegredo(entrada);
  if (segredo) throw new Error(`entrada recusada: contém ${segredo} (nada foi enviado)`);

  const modelos = a.modelos ? a.modelos.split(',').map((m) => m.trim()).filter(Boolean) : MODELOS;
  if (!modelos.length) throw new Error('--modelos veio vazio');

  if (a.seco) {
    console.log(`seco: ~${estimarTokens(instrucao, entrada)} tokens de entrada; modelos: ${modelos.join(', ')}; nada enviado`);
    return;
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error('falta a variável de ambiente GEMINI_API_KEY');

  const r = await chamar(modelos, montarCorpo(instrucao, entrada, esquema), esquema, chave);
  mkdirSync(dirname(a.saida), { recursive: true });
  writeFileSync(a.saida, r.texto);

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  mkdirSync(new URL('./', CSV), { recursive: true });
  let novo = false;
  try {
    statSync(CSV);
  } catch {
    novo = true;
  }
  appendFileSync(CSV, `${novo ? `${CABECALHO_CSV}\n` : ''}${linhaCsv(hoje, r.modelo, r.tokensEntrada, r.tokensSaida, a.saida)}\n`);

  console.log(`${r.modelo}: ${r.tokensEntrada} tokens de entrada, ${r.tokensSaida} de saída; gravado em ${a.saida} (${statSync(a.saida).size} bytes)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((e) => {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  });
}
