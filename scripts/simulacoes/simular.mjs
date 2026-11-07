#!/usr/bin/env node
// Simulador de uso: personas do público em aparelhos, telas e navegadores diferentes (Playwright).
//
//   npm run simular                                  todo mundo, nos cortes de cada persona
//   npm run simular -- --persona=ze --corte=depois   uma persona, um corte
//   npm run simular -- --persona=ze,duda --alvo=producao   rodada curta no site no ar (só GET)
//   npm run simular -- --persona=rafa --aparelho=pc-firefox --porta=5302
//
// Dados falsos: monta um pacote do jogo em modo development (com src/dev) e o serve na porta 5291, com o Supabase
// trocado por um projeto que não existe; toda requisição para fora dele é bloqueada (nucleo/rede.mjs). Nada chega
// ao banco. --servidor=vite usa o Vite de desenvolvimento (lento com rede ruim); --refazer remonta o pacote.
// Prints e resultados ficam em prints/simulacoes/<rodada>/ (fora do Git). Depois: npm run simular:consolidar.

import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { APARELHOS } from './nucleo/aparelhos.mjs';
import { subirVite, subirPacote } from './nucleo/servidor.mjs';
import { Sessao } from './nucleo/sessao.mjs';
import { nomesFamosos } from './nucleo/textos.mjs';
import { JORNADAS_PRODUCAO } from './nucleo/producao.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const PRODUCAO = 'https://torcida.kauewalter.com.br';

function argumentos() {
  const a = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) a[m[1]] = m[2] ?? true;
  }
  // "npm run simular --persona=ze" (sem o --) chega como variável npm_config_persona.
  for (const k of ['persona', 'corte', 'alvo', 'aparelho', 'porta', 'rodada', 'servidor', 'refazer'])
    if (a[k] === undefined && process.env[`npm_config_${k}`]) a[k] = process.env[`npm_config_${k}`];
  return a;
}

async function carregarPersonas() {
  const pasta = join(AQUI, 'personas');
  const lista = [];
  for (const arq of readdirSync(pasta).filter((f) => f.endsWith('.mjs')).sort()) {
    const m = await import(pathToFileURL(join(pasta, arq)).href);
    if (m.default?.id) lista.push(m.default);
  }
  return lista.sort((x, y) => (x.ordem ?? 99) - (y.ordem ?? 99));
}

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

async function main() {
  const arg = argumentos();
  const alvo = arg.alvo === 'producao' ? 'producao' : 'dev';
  const todas = await carregarPersonas();
  const pedidas = !arg.persona || arg.persona === 'todas' ? todas.map((p) => p.id) : String(arg.persona).split(',');
  const personas = todas.filter((p) => pedidas.includes(p.id));
  const faltando = pedidas.filter((id) => !todas.some((p) => p.id === id));
  if (faltando.length) throw new Error(`persona desconhecida: ${faltando.join(', ')} (tem: ${todas.map((p) => p.id).join(', ')})`);
  if (arg.corte && !['antes', 'depois'].includes(arg.corte)) throw new Error('--corte é antes ou depois');

  const rodada = arg.rodada ?? hoje();
  const raizPrints = join(RAIZ, 'prints', 'simulacoes', rodada);
  mkdirSync(raizPrints, { recursive: true });
  const famosos = nomesFamosos(RAIZ);

  let vite = null;
  let origem = PRODUCAO;
  if (alvo === 'dev') {
    const porta = Number(arg.porta ?? 5291);
    if (arg.servidor === 'vite') {
      console.log(`Subindo o Vite de desenvolvimento na porta ${porta} (Supabase falso)…`);
      vite = await subirVite({ raiz: RAIZ, porta });
    } else {
      vite = await subirPacote({ raiz: RAIZ, porta, refazer: !!arg.refazer });
      console.log(`Pacote do simulador servido em ${vite.origem} (Supabase falso)`);
    }
    origem = vite.origem;
  }

  const resultados = [];
  try {
    for (const persona of personas) {
      const prod = JORNADAS_PRODUCAO[persona.id];
      const jornada = alvo === 'producao' ? prod?.jornada : persona.jornada;
      if (!jornada) {
        console.log(`- ${persona.nome}: sem jornada para ${alvo}, pulando`);
        continue;
      }
      const cortes = alvo === 'producao' ? [null] : arg.corte ? [arg.corte] : persona.cortes ?? ['depois'];
      const aparelhos = (alvo === 'producao' ? prod.aparelhos : persona.aparelhos).filter(
        (id) => !arg.aparelho || id === arg.aparelho,
      );
      for (const corte of cortes) {
        for (const apId of aparelhos) {
          const aparelho = { id: apId, ...APARELHOS[apId] };
          if (!APARELHOS[apId]) throw new Error(`aparelho desconhecido: ${apId}`);
          const nomePasta = alvo === 'producao' ? `${apId}-producao` : `${apId}-${corte}`;
          const pasta = join(raizPrints, persona.id, nomePasta);
          console.log(`> ${persona.nome} · ${aparelho.nome} · ${alvo === 'producao' ? 'site no ar' : 'corte ' + corte}`);
          const s = new Sessao({ persona, aparelho, corte, modo: alvo, origem, pasta, raizPrints, famosos });
          const t0 = Date.now();
          try {
            await s.iniciar();
            await jornada(s, { aparelho: apId, corte });
          } catch (e) {
            s.achado({ regra: 'jornada-quebrou', gravidade: 'atrapalha', tipo: 'erro', oQue: `A jornada parou: ${String(e?.message ?? e).split('\n')[0].slice(0, 240)}`, talvezSimulador: true });
            console.log(`  ! jornada parou: ${String(e?.message ?? e).split('\n')[0]}`);
          }
          const r = await s.encerrar();
          r.duracaoS = Math.round((Date.now() - t0) / 1000);
          resultados.push(r);
          console.log(`  ${r.passos.length} passos, ${r.achados.length} achados, ${r.naoSimulaveis.length} não simuláveis, ${r.duracaoS} s`);
          if (r.furos.length) {
            console.error(`  !!! ${r.furos.length} resposta(s) de fora da lista: ${r.furos.map((f) => f.url).join(', ')}`);
            console.error('  Rodada interrompida. Nada mais roda até alguém olhar a guarda (nucleo/rede.mjs).');
            process.exitCode = 2;
            throw new Error('furo na guarda de rede');
          }
        }
      }
    }
  } finally {
    vite?.parar();
  }

  const arquivo = join(raizPrints, `resumo-${alvo}-${Date.now()}.json`);
  writeFileSync(
    arquivo,
    JSON.stringify(
      resultados.map((r) => ({ ...r, redeDetalhe: undefined })),
      null,
      2,
    ),
  );
  console.log(`\nResultados em ${arquivo}`);
  console.log('Próximo passo: npm run simular:consolidar');
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
