// Contas puras da tela da partida (pênaltis e Lances): celular deitado (J10), campo pela altura em tela grande (J09)
// e o relógio que para enquanto o aviso "Vire o celular pra jogar" está na tela. Decididos em 06/11/2026
// (jornadas simuladas; docs/jogo.md 7.3 e 14.7, docs/visual.md 4.7). Só desenho e tempo do aparelho: nada aqui
// muda pontos, sementes ou o que vai para o servidor.

import type { Nivel } from '../telas/qualidade';

/** Altura máxima (px CSS) de um celular deitado. Tablet e dobrável aberto deitados passam disso. */
export const ALTURA_MAX_DEITADO = 500;

export interface Janela {
  largura: number;
  altura: number;
  /** O ponteiro principal é o dedo (`pointer: coarse`). Computador com janela baixa não conta. */
  toque: boolean;
}

/** Celular deitado: toque, mais largo que alto e altura até 500 px. Aí a partida pede para virar. */
export const celularDeitado = (j: Janela): boolean => j.toque && j.largura > j.altura && j.altura <= ALTURA_MAX_DEITADO;

/**
 * Largura máxima do campo em relação à altura do canvas. Até ela, a cena é a de sempre (o celular em pé fica
 * abaixo dela, então nada muda nele); num canvas mais largo, o campo cresce pela altura e o que sobra dos lados
 * é mais torcida e gramado. Medida nos prints de 06/11: acima de ~0,7 o batedor dos Lances sai por baixo.
 */
export const PROPORCAO_DO_CAMPO = 0.68;

/** Largura da coluna antiga da partida: até ela (todo celular em pé), o campo é a largura do canvas, como sempre. */
export const COLUNA_DA_PARTIDA = 520;

/**
 * A largura (px) em que a cena monta o campo: a do canvas, limitada pela altura só quando o canvas passa da coluna
 * antiga. Assim o celular em pé baixo (iPhone SE com a barra do Safari, canvas de ~375 × 488) não encolhe.
 */
export const larguraDoCampo = (largura: number, altura: number): number =>
  largura <= COLUNA_DA_PARTIDA ? Math.max(0, largura) : Math.max(0, Math.min(largura, altura * PROPORCAO_DO_CAMPO));

/**
 * Teto de pixels do canvas (largura × altura × dpr²) por nível de qualidade. No celular em pé ele nunca chega a
 * valer (390 × 784 a dpr 2 dá 1,2 milhão); só segura o canvas grande do computador e do tablet.
 */
export const PIXELS_MAX: Readonly<Record<Nivel, number>> = { alta: 4_200_000, media: 2_600_000, leve: 1_300_000 };
/** Abaixo disso o campo fica borrado demais; o teto de pixels não desce além. */
export const DPR_MIN = 0.75;

/** Densidade de pixels do canvas: a do aparelho, até o teto do nível e o teto de pixels. */
export function dprDoCanvas(largura: number, altura: number, dprAparelho: number, dprMax: number, pixelsMax: number): number {
  const base = Math.min(dprAparelho || 1, dprMax);
  const area = largura * altura;
  if (area <= 0) return base;
  const peloTeto = Math.sqrt(pixelsMax / area);
  return peloTeto >= base ? base : Math.max(DPR_MIN, peloTeto);
}

export interface RelogioPausavel {
  /** O tempo da partida (ms): parado enquanto pausado; ao voltar, segue de onde parou. */
  agora(): number;
  pausar(): void;
  retomar(): void;
  pausado(): boolean;
}

/**
 * Relógio da partida em cima de um relógio de verdade (`performance.now`). Pausar congela o tempo: a janela para
 * reagir na defesa e a jogada do cara a cara não andam enquanto o aviso de virar o celular está na tela.
 */
export function criarRelogioPausavel(base: () => number): RelogioPausavel {
  let parado = 0;
  let desde: number | null = null;
  return {
    agora: () => (desde !== null ? desde : base()) - parado,
    pausar() {
      if (desde === null) desde = base();
    },
    retomar() {
      if (desde === null) return;
      parado += base() - desde;
      desde = null;
    },
    pausado: () => desde !== null,
  };
}
