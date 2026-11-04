// O que o Aquecimento entrega a cada estação.

import type { Time } from '../../dados/times';

export interface ContextoDaEstacao {
  /** Onde a estação desenha. Relativo: a mão e os canvas se medem a partir dele. */
  palco: HTMLElement;
  time: Time;
  /** prefers-reduced-motion: a mão vira seta parada. */
  reduzido: boolean;
  /** A estação terminou (acertando ou não): comemora e, depois de ~1,5 s ou um toque, segue. */
  concluir(acertou: boolean, opcoes?: { semGrito?: boolean; pausaMs?: number }): void;
  /** Troca a frase da faixa de instrução por um aviso curto (a frase da estação volta na próxima). */
  avisar(texto: string): void;
}

/** Cada estação monta no palco e devolve a função que desmonta. */
export type Estacao = (ctx: ContextoDaEstacao) => () => void;
