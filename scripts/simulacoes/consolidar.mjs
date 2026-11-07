#!/usr/bin/env node
// Junta os resultado.json de uma rodada (prints/simulacoes/<rodada>/**) num rascunho para triagem:
//   consolidado.json  grupos de achados iguais (mesma regra, tela e chave), com cada ocorrência
//   consolidado.md    o mesmo, para ler: por gravidade, com persona, aparelho, print e endereço
//   rede.md           o que a guarda bloqueou (e, na produção, o que liberou), por persona
// A triagem (jogo × limite do simulador, gravidade final, sugestão) é feita por quem lê, no RELATORIO.md.
//
//   npm run simular:consolidar                 rodada de hoje
//   npm run simular:consolidar -- --rodada=2026-11-06

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const arg = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const rodada = arg.rodada ?? process.env.npm_config_rodada ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const pasta = join(RAIZ, 'prints', 'simulacoes', rodada);
if (!existsSync(pasta)) throw new Error(`sem rodada em ${pasta}`);

function* resultados(dir) {
  for (const f of readdirSync(dir)) {
    const c = join(dir, f);
    if (statSync(c).isDirectory()) yield* resultados(c);
    else if (f === 'resultado.json') yield JSON.parse(readFileSync(c, 'utf8'));
  }
}

const PESO = { bloqueia: 0, atrapalha: 1, detalhe: 2 };
const todos = [...resultados(pasta)];
const grupos = new Map();
for (const r of todos) {
  for (const a of r.achados) {
    const k = `${a.regra}|${a.tela}|${a.chave ?? a.oQue}`;
    if (!grupos.has(k))
      grupos.set(k, { regra: a.regra, tela: a.tela, oQue: a.oQue, gravidade: a.gravidade, tipo: a.tipo, sugestao: a.sugestao ?? '', amostras: a.amostras ?? [], talvezSimulador: !!a.talvezSimulador, ocorrencias: [] });
    const g = grupos.get(k);
    if (PESO[a.gravidade] < PESO[g.gravidade]) g.gravidade = a.gravidade;
    g.ocorrencias.push({ persona: a.persona, aparelho: a.aparelho, navegador: a.navegador, corte: a.corte, modo: a.modo, passo: a.passo, print: a.print, reproduzir: a.reproduzir, vezes: a.vezes });
  }
}
const lista = [...grupos.values()].sort((a, b) => PESO[a.gravidade] - PESO[b.gravidade] || b.ocorrencias.length - a.ocorrencias.length);
writeFileSync(join(pasta, 'consolidado.json'), JSON.stringify(lista, null, 2));

const linhas = [`# Consolidado da rodada ${rodada}`, '', `${todos.length} sessões, ${lista.length} grupos de achados.`, ''];
linhas.push('## Sessões', '', '| Persona | Aparelho | Corte | Passos | Achados | Não simuláveis | Furos na guarda | Duração |', '|---|---|---|---|---|---|---|---|');
for (const r of todos) linhas.push(`| ${r.persona} | ${r.aparelho} | ${r.modo === 'producao' ? 'site no ar' : r.corte} | ${r.passos.length} | ${r.achados.length} | ${r.naoSimulaveis.length} | ${r.furos.length} | ${r.duracaoS ?? '?'} s |`);
linhas.push('', '## Métricas', '');
for (const r of todos) for (const m of r.metricas) linhas.push(`- ${r.persona} · ${r.aparelhoId}${r.modo === 'producao' ? ' · no ar' : ' · ' + r.corte}: ${m.rotulo} = ${m.ms} ms${m.limiteMs ? ` (limite ${m.limiteMs})` : ''}${m.estourou ? ' **ESTOUROU**' : ''}${m.extra ? ' · ' + JSON.stringify(m.extra) : ''}`);
linhas.push('', '## Não simuláveis', '');
for (const r of todos) for (const n of r.naoSimulaveis) linhas.push(`- ${r.persona} · ${r.aparelhoId}: ${n.tela} — ${n.motivo}`);
linhas.push('', '## Achados', '');
for (const [i, g] of lista.entries()) {
  linhas.push(`### G${String(i + 1).padStart(3, '0')} · ${g.gravidade} · ${g.tipo} · ${g.regra}${g.talvezSimulador ? ' · talvez simulador' : ''}`);
  linhas.push('', `- Tela: ${g.tela}`, `- O que: ${g.oQue}`, `- Sugestão: ${g.sugestao}`);
  if (g.amostras.length) linhas.push(`- Amostras: ${g.amostras.slice(0, 6).join(' · ')}`);
  const quem = [...new Set(g.ocorrencias.map((o) => `${o.persona}/${o.navegador}/${o.corte ?? 'no ar'}`))];
  linhas.push(`- Onde (${g.ocorrencias.length}): ${quem.join(', ')}`, `- Print: ${g.ocorrencias[0].print}`, `- Reproduzir: ${g.ocorrencias[0].reproduzir}`, '');
}
writeFileSync(join(pasta, 'consolidado.md'), linhas.join('\n'));

const rede = [`# Rede da rodada ${rodada}`, ''];
for (const r of todos) {
  rede.push(`## ${r.persona} · ${r.aparelhoId} · ${r.modo === 'producao' ? 'site no ar' : r.corte}`, '');
  for (const [k, v] of Object.entries(r.rede)) rede.push(`- ${k}: ${v}`);
  if (r.furos.length) rede.push('', `**FUROS: ${r.furos.length}**`, ...r.furos.map((f) => `- ${f.metodo} ${f.url}`));
  rede.push('');
}
writeFileSync(join(pasta, 'rede.md'), rede.join('\n'));
const furos = todos.reduce((s, r) => s + r.furos.length, 0);
console.log(`${todos.length} sessões, ${lista.length} grupos. Furos na guarda: ${furos}.`);
console.log(`Leia ${join(pasta, 'consolidado.md')}`);
if (furos) process.exitCode = 2;
