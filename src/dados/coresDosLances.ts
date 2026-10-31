// Cores de quem aparece nos Lances do Jogo: só nome e cores, nunca a camisa do dia (camiseta lisa).
// O adversário vem de times.ts quando é um dos clubes do jogo; os outros ficam aqui.

import { TIMES } from './times';

type Cores = readonly [string, string];

const OUTROS_ADVERSARIOS: Record<string, Cores> = {
  'Atlético Nacional': ['#00843d', '#ffffff'],
  Bangu: ['#c8102e', '#ffffff'],
  Barcelona: ['#a50044', '#004d98'],
  'Boca Juniors': ['#003a70', '#ffd200'],
  Chivas: ['#c8102e', '#ffffff'],
  França: ['#002395', '#ffffff'],
  Fortaleza: ['#c8102e', '#0b3d91'],
  Goiás: ['#00843d', '#ffffff'],
  Hamburgo: ['#0a3d91', '#ffffff'],
  Inglaterra: ['#ffffff', '#0b2a5b'],
  Itália: ['#0a5eb0', '#ffffff'],
  'Junior Barranquilla': ['#c8102e', '#ffffff'],
  Lanús: ['#7a1c2e', '#ffffff'],
  Libertad: ['#111111', '#ffffff'],
  Liverpool: ['#c8102e', '#ffffff'],
  Novorizontino: ['#ffd200', '#111111'],
  Olimpia: ['#ffffff', '#111111'],
  Peñarol: ['#ffd200', '#111111'],
  'Ponte Preta': ['#111111', '#ffffff'],
  'River Plate': ['#ffffff', '#c8102e'],
  'San Lorenzo': ['#0b2a5b', '#c8102e'],
  'Sporting Cristal': ['#6cc4ee', '#ffffff'],
};

/** Lances em que quem bateu foi o goleiro: o batedor vai de goleiro (exceção do jogo.md, seção 3). */
const BATEDOR_DE_GOLEIRO: readonly string[] = ['sao-paulo-2011-gol-100'];

/** Cores do adversário de um lance, ou null se não houver cadastro (aí joga de máquina). */
export function coresDoAdversario(nome: string): Cores | null {
  return TIMES.find((t) => t.nome === nome)?.cores ?? OUTROS_ADVERSARIOS[nome] ?? null;
}

export const batedorDeGoleiro = (idDoLance: string): boolean => BATEDOR_DE_GOLEIRO.includes(idDoLance);
