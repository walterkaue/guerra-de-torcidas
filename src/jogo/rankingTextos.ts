// Textos do ranking que dependem da regra do dia (docs/jogo.md, seção 14.7). Puro: sem DOM nem relógio.

import { MELHORES_DO_DIA } from './regraLances';

/**
 * A frase da média do Campeão da semana. Desde 08/11/2026, por dia, cada pessoa conta as 3 melhores partidas de
 * Lances (pênaltis, faltas e cara a cara juntos) e as 3 melhores da Prova.
 */
export function textoDaMedia(): string {
  const regra = `Por dia, de cada um valem as ${MELHORES_DO_DIA} melhores partidas de Lances e as ${MELHORES_DO_DIA} da Prova.`;
  return `Conta a média dos 30 melhores de cada torcida. ${regra}`;
}
