// Lances do Jogo unificados (docs/jogo.md, seção 14.7): Pênaltis, Faltas e Cara a cara num jogo só, a partir da
// segunda 16/11/2026, 0h de Brasília. Módulo puro, compartilhado com o servidor (npm run compartilhar).
// A regra de uma partida sai SEMPRE da data em que ela foi criada no servidor, nunca do relógio de agora: assim a
// partida aberta no domingo à noite fecha com a regra com que começou, e mudar a regra nunca mexe em partida fechada.

import { misturar } from './aleatorio.ts';
import { faixaPorChance, TABELA_LANCES_ANTES, TABELA_LANCES_UNIFICADA, type Faixa, type Lance, type TabelaLances } from './lances.ts';
import { PONTOS, PONTOS_UNIFICADOS, type TabelaPenaltis } from './penaltis.ts';

/** Segunda 16/11/2026, 0h de Brasília (UTC−3). Igual a public.lances_unificados_desde() no banco (teste confere). */
export const LANCES_UNIFICADOS_DESDE = new Date('2026-11-16T03:00:00.000Z');
/** O mesmo corte como dia de Brasília: partidas com `dia` a partir dele seguem a regra nova no teto e na posição. */
export const DIA_DO_CORTE = '2026-11-16';

/** Partidas de Lances valendo por dia na regra nova, somando pênaltis, faltas e cara a cara (o X1 recebido conta). */
export const LANCES_PARTIDAS_POR_DIA_UNIFICADO = 10;
/** Quantas partidas de cada grupo valem no dia: Lances (os três tipos) e Prova. */
export const MELHORES_DO_DIA = 3;

const comoData = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

/** A partida segue a regra nova? Pela hora em que foi criada no servidor. */
export function ehUnificada(criadaEm: Date | string): boolean {
  return comoData(criadaEm).getTime() >= LANCES_UNIFICADOS_DESDE.getTime();
}

export const tabelaPenaltisDaPartida = (criadaEm: Date | string): TabelaPenaltis => (ehUnificada(criadaEm) ? PONTOS_UNIFICADOS : PONTOS);
export const tabelaLancesDaPartida = (criadaEm: Date | string): TabelaLances =>
  ehUnificada(criadaEm) ? TABELA_LANCES_UNIFICADA : TABELA_LANCES_ANTES;

// ---------- dia e semana na virada da regra ----------
const FUSO_MS = -3 * 60 * 60 * 1000;
const diaBrasilia = (d: Date) => new Date(d.getTime() + FUSO_MS).toISOString().slice(0, 10);
function semanaDoDia(dia: string): string {
  const d = new Date(`${dia}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Dia e semana em que a partida conta, já com a tolerância de 00h05 (`periodo`, de periodoDaPartida). Uma partida
 * criada antes do corte e fechada depois dele (passou das 00h05 da segunda) conta no dia em que começou: a regra
 * antiga nunca entra no dia da regra nova, e o teto e a posição podem separar as duas só pelo dia.
 */
export function periodoNoCorte(criada: Date | string, periodo: { dia: string; semana: string }): { dia: string; semana: string } {
  const c = comoData(criada);
  if (ehUnificada(c) || periodo.dia < DIA_DO_CORTE) return periodo;
  const dia = diaBrasilia(c);
  return { dia, semana: semanaDoDia(dia) };
}

// ---------- faixa de um lance numa partida ----------
/** Tentativas valendo de um lance a partir das quais a faixa é corrigida pela taxa real (antes, 50). */
export const MIN_TENTATIVAS_FAIXA = 30;
/** Na conta da taxa, cada pessoa entra com no máximo as últimas N tentativas do lance (ninguém mexe sozinho na faixa). */
export const MAX_TENTATIVAS_POR_PESSOA = 10;
/**
 * E a taxa só vale com pelo menos N pessoas diferentes: o login anônimo é de graça, então 3 contas errando de
 * propósito 10 vezes cada não podem levar um lance para Craque (revisão de 05/11/2026).
 */
export const MIN_PESSOAS_FAIXA = 8;

/** Faixa corrigida pela taxa real, ou null se ainda não há tentativas (ou pessoas) suficientes. */
export function faixaCorrigida(gols: number, tentativas: number, pessoas: number): Faixa | null {
  if (!Number.isInteger(tentativas) || tentativas < MIN_TENTATIVAS_FAIXA || gols < 0 || gols > tentativas) return null;
  if (!Number.isInteger(pessoas) || pessoas < MIN_PESSOAS_FAIXA) return null;
  return faixaPorChance(gols / tentativas);
}

/**
 * A faixa com que uma partida nova joga o lance: antes do corte, a do catálogo; depois, a corrigida pela taxa real
 * (se houver), senão a do catálogo recalibrado (`faixaUnificada`), senão a do catálogo. A partida grava a faixa
 * usada, e é ela que vale no fechamento.
 */
export function faixaDaPartida(lance: Pick<Lance, 'faixa' | 'faixaUnificada'>, criadaEm: Date | string, corrigida: Faixa | null = null): Faixa {
  if (!ehUnificada(criadaEm)) return lance.faixa;
  return corrigida ?? lance.faixaUnificada ?? lance.faixa;
}

// ---------- medalhas dos pênaltis ----------
export type MedalhaPenaltis = 'bronze' | 'prata' | 'ouro';

/** Por disputa histórica e pela Disputa livre: 10 · 50 · 100 gols; o ouro pede também 10 vitórias. */
export const MEDALHAS_PENALTIS: readonly { medalha: MedalhaPenaltis; gols: number; vitorias: number }[] = [
  { medalha: 'bronze', gols: 10, vitorias: 0 },
  { medalha: 'prata', gols: 50, vitorias: 0 },
  { medalha: 'ouro', gols: 100, vitorias: 10 },
];

export function medalhaDaDisputa(gols: number, vitorias: number): MedalhaPenaltis | null {
  let m: MedalhaPenaltis | null = null;
  for (const n of MEDALHAS_PENALTIS) if (gols >= n.gols && vitorias >= n.vitorias) m = n.medalha;
  return m;
}

/** Id do item de medalha dos pênaltis (o mesmo que o banco grava em lances_gols.lance_id). */
export const itemPenaltis = (disputaId: string | null | undefined): string => `penaltis:${disputaId ?? 'livre'}`;

// ---------- Lance do Dia ----------
const SAL_LANCE_DO_DIA = 0x1d1a;

/**
 * O Lance do Dia (seção 14.7): o mesmo para todo mundo, escolhido pela data (AAAA-MM-DD, Brasília) entre os ids do
 * catálogo, em ordem alfabética. Não multiplica pontos. Celular e servidor chegam ao mesmo id sem guardar nada.
 */
export function lanceDoDia(dia: string, ids: readonly string[]): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!m || !ids.length) return null;
  const ordenados = [...ids].sort();
  return ordenados[misturar(SAL_LANCE_DO_DIA, Number(m[1]), Number(m[2]), Number(m[3])) % ordenados.length];
}
