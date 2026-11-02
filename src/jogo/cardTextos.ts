// Regras do card "Telão do estádio" (docs/visual.md, seção 3): textos, degraus da escada e cor do adesivo.
// Puro: sem DOM nem canvas.

import { distanciaDeCor } from '../dados/times';
import type { Acerto } from './crava';
import { PERGUNTAS } from './prova';

export const PAPEL = '#f4f1e8';
/** Abaixo disso, a borda some no papel (a mesma régua de contraste dos uniformes). */
const CONTRASTE_NO_PAPEL = 110;

/** "Fulano pro Flamengo"; sem apelido ou sem time, a frase inteira: "Fiz 55 pontos pro Flamengo". */
export function linhaDoTorcedor(apelido: string | undefined, pontos: number, paraTime: string | null): string {
  if (apelido && paraTime) return `${apelido} ${paraTime}`;
  return `${apelido ? `${apelido} fez` : 'Fiz'} ${pontos} pontos${paraTime ? ` ${paraTime}` : ''}`;
}

/** Borda do adesivo: a cor 1 do time; cor clara, que sumiria no papel, passa para a cor 2. */
export function corDaBorda(cores: readonly [string, string]): string {
  const visivel = cores.find((cor) => distanciaDeCor(cor, PAPEL) >= CONTRASTE_NO_PAPEL);
  return visivel ?? '#111111';
}

export type Degrau = 'acertou' | 'ajuda' | 'errou' | 'parou' | 'vazio';

/** A escada em emoji (a mesma do texto do WhatsApp) nos 8 degraus do telão. Nunca passa pelas perguntas. */
export function degrausDaEscada(escada: string): Degrau[] {
  const pelosEmoji: Record<string, Degrau> = { '✅': 'acertou', '💡': 'ajuda', '❌': 'errou', '✋': 'parou' };
  const degraus = [...escada].map((e) => pelosEmoji[e]).filter(Boolean).slice(0, PERGUNTAS);
  return [...degraus, ...Array<Degrau>(PERGUNTAS - degraus.length).fill('vazio')];
}

/** Quantos degraus foram respondidos certo (com ou sem ajuda). */
export const degrausCertos = (degraus: readonly Degrau[]) => degraus.filter((d) => d === 'acertou' || d === 'ajuda').length;

const NOMES_ACERTO: Record<Acerto, [string, string]> = {
  exato: ['EXATO', 'EXATOS'],
  saldo: ['NO SALDO', 'NO SALDO'],
  vencedor: ['VENCEDOR', 'VENCEDORES'],
  errou: ['ERRO', 'ERROS'],
};

/** "2 EXATOS · 3 NO SALDO · 4 ERROS": só o que aconteceu na rodada. */
export function resumoDosAcertos(acertos: readonly Acerto[]): string {
  return (Object.keys(NOMES_ACERTO) as Acerto[])
    .map((a) => [a, acertos.filter((x) => x === a).length] as const)
    .filter(([, n]) => n > 0)
    .map(([a, n]) => `${n} ${NOMES_ACERTO[a][n === 1 ? 0 : 1]}`)
    .join(' · ');
}
