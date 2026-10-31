// Roupa de quem aparece nos Lances do Jogo: camiseta lisa, nunca a camisa do dia.
// Nome, artigo e cores dos adversários ficam em adversarios.ts.

export { SELECAO, coresDoAdversario } from './adversarios';

/** Roupa lisa de um batedor de goleiro: só as cores, sem desenho nem marca. */
export interface RoupaDeGoleiro {
  camisa: string;
  calcao: string;
  meiao: string;
  chuteira: string;
  luva: string;
}

/**
 * Lances em que quem bateu foi o goleiro: o batedor vai de goleiro, nas cores do dia (exceção do
 * jogo.md, seção 3). Gol 100: camisa dourada, calção preto e meião branco (foto do jogo, enviada
 * pelo Kauê em 31/10/2026).
 */
const BATEDOR_DE_GOLEIRO: Record<string, RoupaDeGoleiro> = {
  'sao-paulo-2011-gol-100': { camisa: '#d9a520', calcao: '#111111', meiao: '#ffffff', chuteira: '#161616', luva: '#ecebe6' },
};

export const roupaDoBatedorGoleiro = (idDoLance: string): RoupaDeGoleiro | null => BATEDOR_DE_GOLEIRO[idDoLance] ?? null;
