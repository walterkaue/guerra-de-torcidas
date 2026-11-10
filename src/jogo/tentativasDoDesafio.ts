// As 3 tentativas de quem chamou no desafio dos Lances, como vêm de ver_desafio_lances (migração 20261110000000;
// docs/jogos/lances.md, "Desafio dos Lances"). Só desenho: a fita e o telão do convite e as duas fitas do resultado.
// Puro e sem import em tempo de execução: entra no caminho do link (?l=) sem puxar o motor dos Lances (E01).
// Qualquer coisa fora do formato descarta a lista inteira (null), e o convite fica como era antes dos gols.

import type { DesfechoLance } from './lances.ts';
import type { GestoCobranca } from './penaltis.ts';

export interface TentativaDoDesafio {
  desfecho: DesfechoLance;
  pontos: number;
  /** Gol na zona onde entrou o gol de verdade. */
  recriou: boolean;
  cavadinha: boolean;
  /** Ponto final na linha do gol, nas unidades do motor (x de -1 a 1, y de 0 a 1; fora passa disso). */
  x: number;
  y: number;
  /** Onde o goleiro ficou para o chute (x de -1 a 1). */
  goleiroX: number;
  /** Até onde a bola andou no caminho (0 a 1). */
  tFim: number;
  /** Gesto já normalizado (inteiros). */
  gesto: GestoCobranca;
}

/** A partida do desafio tem sempre 3 tentativas (LANCES_POR_PARTIDA, sem importar o motor). */
export const TENTATIVAS_DO_DESAFIO = 3;

const DESFECHOS: readonly DesfechoLance[] = ['gol', 'defesa', 'barreira', 'fora', 'trave'];
/** Teto de uma tentativa: 42 do Craque + 8 de carimbar. Folga para a tabela mudar sem quebrar o convite. */
const PONTOS_MAX = 150;

const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numeroEntre = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const inteiroEntre = (v: unknown, min: number, max: number): v is number => numeroEntre(v, min, max) && Number.isInteger(v);

function tentativa(v: unknown): TentativaDoDesafio | null {
  if (!objeto(v)) return null;
  const { desfecho, pontos, recriou, cavadinha, x, y, goleiroX, tFim, gesto } = v;
  if (typeof desfecho !== 'string' || !(DESFECHOS as readonly string[]).includes(desfecho)) return null;
  if (!inteiroEntre(pontos, 0, PONTOS_MAX) || typeof recriou !== 'boolean' || typeof cavadinha !== 'boolean') return null;
  // O ponto final pode passar do gol (fora, trave); goleiro e tFim ficam na faixa do motor.
  if (!numeroEntre(x, -5, 5) || !numeroEntre(y, -1, 5) || !numeroEntre(goleiroX, -1.5, 1.5) || !numeroEntre(tFim, 0, 1)) return null;
  if (!objeto(gesto)) return null;
  const { dir, forca, efeito } = gesto;
  if (!inteiroEntre(dir, -100, 100) || !inteiroEntre(forca, 0, 100) || !inteiroEntre(efeito, -100, 100)) return null;
  // Coerência mínima: só gol carimba e pontua.
  if (desfecho !== 'gol' && (recriou || pontos > 0)) return null;
  return { desfecho: desfecho as DesfechoLance, pontos, recriou, cavadinha, x, y, goleiroX, tFim, gesto: { dir, forca, efeito } };
}

/**
 * Confere as tentativas cruas do resumo. Devolve as 3, na ordem, só com os campos da lista; menos de 3, mais de 3 ou
 * qualquer uma fora do formato: null.
 */
export function tentativasDoResumo(bruto: unknown): TentativaDoDesafio[] | null {
  if (!Array.isArray(bruto) || bruto.length !== TENTATIVAS_DO_DESAFIO) return null;
  const lista = bruto.map(tentativa);
  return lista.every((t): t is TentativaDoDesafio => t !== null) ? lista : null;
}
