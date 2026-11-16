// Para onde o goleiro da máquina mergulha na tela, no motor 2 (goleiro com alcance; docs/jogos/penaltis.md). Puro: o
// motor dá o ponto do mergulho (goleiroX, goleiroY) sem prender no gol; o desenho prende dentro dele e leva a luva até
// onde o lance conta: na bola quando pegou, raspando nela no "tocou e entrou", no ponto do mergulho no resto.

import { zonaDoPonto, type ResultadoCobranca } from '../jogo/penaltis';

export interface AlvoDoGoleiro {
  /** Zona do desenho: a coluna decide se ele cai no canto ou fica de pé no meio. */
  zona: number;
  /** Ponto do gol (x de -1 a 1, y de 0 a 1, já dentro do gol) onde as luvas chegam; null = fica parado no meio. */
  ponto: { x: number; y: number } | null;
}

/** O desenho prende o ponto dentro do gol (a conta do motor não prende). */
export const DENTRO_DO_GOL = { x: 0.94, baixo: 0.06, alto: 0.94 } as const;
/** No "tocou e entrou", a ponta da luva fica a isto da bola (mais ou menos um raio dela, nas unidades do gol). */
export const RASPA = 0.06;

const prender = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/** Alvo do goleiro numa cobrança do motor 2; null na cobrança do motor 1 (pulo para a zona, como sempre). */
export function alvoDoGoleiro(r: ResultadoCobranca): AlvoDoGoleiro | null {
  if (typeof r.goleiroX !== 'number' || typeof r.goleiroY !== 'number') return null;
  // A cavadinha que ele esperou: fica parado no meio e a bola cai nas mãos.
  if (r.cavadinha && r.desfecho === 'defesa') return { zona: 1, ponto: null };
  let x = r.goleiroX;
  let y = r.goleiroY;
  if (r.jeito === 'encaixou' || r.jeito === 'espalmou') {
    x = r.x;
    y = r.y;
  } else if (r.jeito === 'tocou') {
    const dx = r.goleiroX - r.x;
    const dy = r.goleiroY - r.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > RASPA) {
      x = r.x + (dx * RASPA) / d;
      y = r.y + (dy * RASPA) / d;
    }
  }
  const ponto = { x: prender(x, -DENTRO_DO_GOL.x, DENTRO_DO_GOL.x), y: prender(y, DENTRO_DO_GOL.baixo, DENTRO_DO_GOL.alto) };
  return { zona: zonaDoPonto(ponto.x, ponto.y), ponto };
}

/** Depois do lance, onde fica a bola: nas mãos, espalmada para fora, na rede ou (trave e fora) por conta da cena. */
export function bolaDepoisDoLance(r: ResultadoCobranca): 'maos' | 'espalmada' | 'rede' | 'outra' {
  if (r.desfecho === 'gol') return 'rede';
  if (r.desfecho !== 'defesa') return 'outra';
  return r.jeito === 'espalmou' ? 'espalmada' : 'maos';
}
