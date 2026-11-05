// Balanço entre minigames (docs/jogo.md, seção 11): as contas, sem banco. Puro e testado.

import { LANCES } from '../../src/dados/lances.ts';
import { TABELA_LANCES_ANTES, TABELA_LANCES_UNIFICADA } from '../../src/jogo/lances.ts';
import { TETO_PARTIDA_UNIFICADO } from '../../src/jogo/penaltis.ts';
import { DIA_DO_CORTE, ehUnificada } from '../../src/jogo/regraLances.ts';

// ---- Lances do Jogo unificados (jogo.md, 14.7): a regra de uma partida sai da criada_em, nunca de "agora". ----

/** Teto dos pênaltis no relatório de antes do corte (a tabela antiga chegava a 220; o relatório sempre usou 150). */
export const TETO_PENALTIS_ANTES = 150;
export const TETO_LANCES_ANTES = TABELA_LANCES_ANTES.teto; // 120
export const TETO_UNIFICADO = TABELA_LANCES_UNIFICADA.teto; // 150, igual ao dos pênaltis
if (TETO_UNIFICADO !== TETO_PARTIDA_UNIFICADO) throw new Error('teto unificado dos Lances e dos pênaltis divergem');

export { DIA_DO_CORTE };
export const REGRAS = ['antes', 'nova'];
export const NOME_REGRA = { antes: 'antes de 09/11', nova: 'a partir de 09/11' };

/** 'antes' ou 'nova', pela hora em que a partida foi criada. Sem data (dado antigo): 'antes'. */
export function regraDaPartida(criadaEm) {
  if (!criadaEm || Number.isNaN(new Date(criadaEm).getTime())) return 'antes';
  return ehUnificada(criadaEm) ? 'nova' : 'antes';
}

/** Tipo do lance pelo catálogo: 'falta', 'cara_a_cara' (finalização) ou 'desconhecido'. */
export function tipoDoLance(lanceId, catalogo = LANCES) {
  const l = catalogo.find((x) => x.id === lanceId);
  if (!l) return 'desconhecido';
  return l.tipo === 'falta' ? 'falta' : l.tipo === 'finalizacao' ? 'cara_a_cara' : 'desconhecido';
}

/** Acrescenta `regra` e `tipo` ('penaltis', 'falta', 'cara_a_cara', 'desconhecido') a uma partida de pênaltis ou lances. */
export function classificarPartida(p, catalogo = LANCES) {
  const tipo = p.minigame === 'penaltis' ? 'penaltis' : tipoDoLance(p.lanceId, catalogo);
  return { ...p, regra: regraDaPartida(p.criada), tipo };
}

/**
 * Linhas de pênaltis/Lances do relatório para uma regra: { id, base, regra, nome, unidade, teto, faixa, quais(p) }.
 * Antes: Lances do Jogo (faltas + cara a cara, teto 120), Pênaltis (teto 150) e os dois tipos de lance.
 * Nova: Lances (pênaltis + faltas + cara a cara, teto 150) e os três tipos. "Fora do catálogo" só se houver.
 */
export function unidadesLances(regra, partidas = []) {
  const nova = regra === 'nova';
  const noRegra = (p) => p.regra === regra;
  const tipo = (t) => (p) => noRegra(p) && p.tipo === t;
  const tetoLance = nova ? TETO_UNIFICADO : TETO_LANCES_ANTES;
  const tetoPen = nova ? TETO_UNIFICADO : TETO_PENALTIS_ANTES;
  const u = (base, nome, teto, quais) => ({
    id: `${base}_${regra}`,
    base,
    regra,
    nome: `${nome} [${NOME_REGRA[regra]}]`,
    unidade: 'partida',
    teto,
    faixa: true,
    quais,
  });
  const linhas = nova
    ? [u('lances', 'Lances (pênaltis + faltas + cara a cara)', tetoLance, noRegra)]
    : [u('lances', 'Lances do Jogo (faltas + cara a cara)', tetoLance, (p) => noRegra(p) && p.minigame === 'lances')];
  linhas.push(
    u('penaltis', 'Pênaltis', tetoPen, tipo('penaltis')),
    u('faltas', 'Faltas', tetoLance, tipo('falta')),
    u('cara_a_cara', 'Cara a cara', tetoLance, tipo('cara_a_cara')),
  );
  if (partidas.some(tipo('desconhecido'))) linhas.push(u('desconhecido', 'Lance fora do catálogo', tetoLance, tipo('desconhecido')));
  return linhas;
}

/**
 * Peso na semana sem misturar as regras: semanas antes do corte mantêm 'penaltis' e 'lances' separados; a partir
 * do corte os dois viram 'lances' ("Lances"). Devolve só as regras pedidas que têm linhas: [{ regra, minigames, peso }].
 */
export function pesoNaSemanaPorRegra(linhas, regras = REGRAS) {
  const dobrar = (l) => ({ ...l, minigame: l.minigame === 'penaltis' ? 'lances' : l.minigame });
  const ehNova = (l) => String(l.semana).slice(0, 10) >= DIA_DO_CORTE;
  const grupos = { antes: linhas.filter((l) => !ehNova(l)), nova: linhas.filter(ehNova).map(dobrar) };
  const minis = { antes: ['penaltis', 'prova', 'dia', 'crava', 'lances'], nova: ['lances', 'prova', 'dia', 'crava'] };
  return regras.filter((r) => grupos[r].length).map((r) => ({ regra: r, minigames: minis[r], peso: pesoNaSemana(grupos[r], minis[r]) }));
}

/** Alvo de mediana por partida (pênaltis, Prova e Time do Dia). */
export const FAIXA = { min: 45, max: 75 };
/** Abaixo disto, os números não dizem nada: "pouca amostra". */
export const MIN_AMOSTRA = 20;

/**
 * Cada linha do relatório. `faixa`: confere a mediana com o alvo (só nos jogos de partida; o Crava
 * tem outra unidade). `teto`: quanto vale a partida perfeita (conta quantas chegaram lá).
 */
export const UNIDADES = [
  { id: 'prova', nome: 'Prova de Boleiro', unidade: 'partida', teto: 150, faixa: true },
  { id: 'dia', nome: 'Time do Dia', unidade: 'dia', teto: 100, faixa: true },
  // Já com o peso ×2: placar exato (10) × certeza (2) × peso (2).
  { id: 'crava_palpite', nome: 'Crava (por palpite)', unidade: 'palpite', teto: 40, faixa: false },
  { id: 'crava_rodada', nome: 'Crava (por pessoa na rodada)', unidade: 'pessoa na rodada', teto: 300, faixa: false },
];

/** Percentil com interpolação linear (o mesmo que percentile_cont do Postgres). `ordenados` crescente. */
export function percentil(ordenados, p) {
  if (!ordenados.length) return null;
  const pos = (ordenados.length - 1) * p;
  const baixo = Math.floor(pos);
  const alto = Math.ceil(pos);
  return ordenados[baixo] + (ordenados[alto] - ordenados[baixo]) * (pos - baixo);
}

const arred = (n) => (n === null ? null : Math.round(n * 10) / 10);

/**
 * Resumo de uma lista de pontos: média, mediana, quartis, 90%, máximo e quantas bateram o teto.
 * Com menos de MIN_AMOSTRA, só a contagem e `pouca: true` (sem números e sem alerta).
 */
export function resumir(valores, { teto, faixa = false } = {}) {
  const n = valores.length;
  if (n < MIN_AMOSTRA) return { n, pouca: true, alertas: [] };
  const o = [...valores].sort((a, b) => a - b);
  const r = {
    n,
    pouca: false,
    media: arred(o.reduce((s, v) => s + v, 0) / n),
    mediana: arred(percentil(o, 0.5)),
    q1: arred(percentil(o, 0.25)),
    q3: arred(percentil(o, 0.75)),
    p90: arred(percentil(o, 0.9)),
    max: o[n - 1],
    noTeto: teto === undefined ? null : o.filter((v) => v >= teto).length,
    alertas: [],
  };
  if (faixa && (r.mediana < FAIXA.min || r.mediana > FAIXA.max)) {
    r.alertas.push(`mediana fora de ${FAIXA.min}–${FAIXA.max}`);
  }
  if (teto !== undefined && r.max > teto) r.alertas.push(`máximo acima do teto (${teto})`);
  return r;
}

/** Quantas vezes aparece cada valor, em ordem: [[valor, vezes], …]. */
export function distribuicao(valores) {
  const conta = new Map();
  for (const v of valores) conta.set(v, (conta.get(v) ?? 0) + 1);
  return [...conta].sort(([a], [b]) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
}

/** Pontos do Crava por pessoa na rodada, a partir dos pontos por palpite. */
export function cravaPorRodada(palpites) {
  const soma = new Map();
  for (const p of palpites) {
    const chave = `${p.pessoa}|${p.rodada}`;
    soma.set(chave, (soma.get(chave) ?? 0) + p.pontos);
  }
  return [...soma.values()];
}

/**
 * Peso de cada minigame na semana, só com os pontos que contaram no ranking.
 * `linhas`: [{ semana, pessoa, minigame, pontos }]. Por pessoa = por pessoa em cada semana em que
 * ela pontuou; quem não jogou aquele minigame entra com 0 (é o peso dele na semana dela).
 * Devolve [{ minigame, pontos, fatia (0–1), medianaPorPessoa, medianaFatia (0–1) }].
 */
export function pesoNaSemana(linhas, minigames) {
  const total = linhas.reduce((s, l) => s + l.pontos, 0);
  const pessoas = new Map();
  for (const l of linhas) {
    const chave = `${l.semana}|${l.pessoa}`;
    const p = pessoas.get(chave) ?? new Map();
    p.set(l.minigame, (p.get(l.minigame) ?? 0) + l.pontos);
    pessoas.set(chave, p);
  }
  const semanas = [...pessoas.values()].filter((p) => [...p.values()].reduce((s, v) => s + v, 0) > 0);
  return minigames.map((m) => {
    const pontos = linhas.filter((l) => l.minigame === m).reduce((s, l) => s + l.pontos, 0);
    const deCada = semanas.map((p) => p.get(m) ?? 0).sort((a, b) => a - b);
    const fatias = semanas
      .map((p) => (p.get(m) ?? 0) / [...p.values()].reduce((s, v) => s + v, 0))
      .sort((a, b) => a - b);
    return {
      minigame: m,
      pontos,
      fatia: total > 0 ? pontos / total : 0,
      medianaPorPessoa: arred(percentil(deCada, 0.5)),
      medianaFatia: percentil(fatias, 0.5),
    };
  });
}

/** Número no jeito do Excel em português: vírgula decimal. */
const celula = (v) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV "longo" (uma métrica por linha), que abre no Excel em português: separador ";", vírgula
 * decimal e BOM. `linhas`: [{ secao, item, metrica, valor }].
 */
export function paraCsv(data, linhas) {
  const corpo = linhas.map((l) => [data, l.secao, l.item, l.metrica, l.valor].map(celula).join(';'));
  return `﻿${['data;secao;item;metrica;valor', ...corpo].join('\r\n')}\r\n`;
}

/** Tabela de texto alinhada para o terminal. */
export function tabelaTexto(cabecalho, linhas) {
  const todas = [cabecalho, ...linhas].map((l) => l.map((c) => (c === null || c === undefined ? '' : String(c))));
  const larguras = cabecalho.map((_, i) => Math.max(...todas.map((l) => [...l[i]].length)));
  const linha = (l) => l.map((c, i) => c + ' '.repeat(larguras[i] - [...c].length)).join('  ');
  return [linha(todas[0]), larguras.map((w) => '-'.repeat(w)).join('  '), ...todas.slice(1).map(linha)].join('\n');
}
