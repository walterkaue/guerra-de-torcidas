// Linhas da Tabela trocando de lugar ao vivo (docs/visual.md, seção 4): quem anda, quanto e quem sobe, e o
// número contando do antigo ao novo. Só desenho: nada aqui mexe em ponto ou posição. O DOM fica em
// src/telas/deslizarTabela.ts.

/** Quanto a linha leva para chegar à posição nova. */
export const DURACAO_DESLIZE_MS = 560;
/** Quanto o número leva para contar do antigo ao novo. */
export const DURACAO_CONTAGEM_MS = 700;
/** A mesma curva da --mola-firme (src/style.css), na forma cubic-bezier. */
export const CURVA_DESLIZE = 'cubic-bezier(0.22, 1.1, 0.36, 1)';

/** Uma linha que muda de lugar: começa `dy` px deslocada da posição nova (positivo = vinha de baixo) e anda até 0. */
export interface Movimento {
  id: string;
  dy: number;
  /** Vinha de baixo: passa por cima das outras, com sombra. */
  sobe: boolean;
}

/** Um número que muda: conta de `de` até `para`. */
export interface Contagem {
  id: string;
  de: number;
  para: number;
}

/**
 * Só anima a troca de uma tabela pela mesma tabela (mesma semana e mesmo modo). A primeira carga, a troca de
 * semana, de modo e de aba, e o movimento reduzido trocam seco.
 */
export const podeAnimar = (chaveAntes: string | null, chaveAgora: string, reduzido: boolean): boolean =>
  !reduzido && chaveAntes !== null && chaveAntes === chaveAgora;

/**
 * Quem anda, a partir do topo de cada linha (px, por id) antes e depois de redesenhar. Linha nova ou que saiu
 * não anda; diferença menor que meio pixel também não.
 */
export function movimentosDasLinhas(antes: ReadonlyMap<string, number>, depois: ReadonlyMap<string, number>): Movimento[] {
  const movimentos: Movimento[] = [];
  for (const [id, topo] of depois) {
    const velho = antes.get(id);
    if (velho === undefined) continue;
    const dy = velho - topo;
    if (Math.abs(dy) < 0.5) continue;
    movimentos.push({ id, dy, sobe: dy > 0 });
  }
  return movimentos;
}

/** Os números que mudaram (por id), para contar do antigo ao novo. Linha nova já aparece com o número final. */
export function contagensDasLinhas(antes: ReadonlyMap<string, number>, depois: ReadonlyMap<string, number>): Contagem[] {
  const contagens: Contagem[] = [];
  for (const [id, para] of depois) {
    const de = antes.get(id);
    if (de === undefined || de === para) continue;
    contagens.push({ id, de, para });
  }
  return contagens;
}

/** Desacelera no fim: 1 - (1 - t)³, com t preso entre 0 e 1. */
export function desacelera(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  return 1 - (1 - p) ** 3;
}

/** O número mostrado `decorrido` ms depois do começo da contagem (inteiro; no fim, exatamente `para`). */
export function valorNaContagem(c: Pick<Contagem, 'de' | 'para'>, decorrido: number, duracao = DURACAO_CONTAGEM_MS): number {
  if (decorrido >= duracao) return c.para;
  return Math.round(c.de + (c.para - c.de) * desacelera(decorrido / duracao));
}
