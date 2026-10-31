// Quem joga contra os clubes do jogo nos Lances e nas disputas históricas: só nome, artigo e cores
// (nunca escudo nem a camisa do dia). Clube da Série A vem de times.ts; os outros ficam aqui.

import { TIMES, type Artigo } from './times';

export type Cores = readonly [string, string];

export interface Adversario {
  artigo: Artigo;
  cores: Cores;
}

/** A Seleção entra como coleção extra, aberta a todos (só nome e cores). */
export const SELECAO = { nome: 'Seleção', cores: ['#ffd200', '#00843d'] as const };

const OUTROS_ADVERSARIOS: Record<string, Adversario> = {
  Alemanha: { artigo: 'a', cores: ['#ffffff', '#111111'] },
  Argentina: { artigo: 'a', cores: ['#6cace4', '#ffffff'] },
  'Atlético Nacional': { artigo: 'o', cores: ['#00843d', '#ffffff'] },
  'Atlético-GO': { artigo: 'o', cores: ['#c8102e', '#111111'] },
  Bangu: { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  Barcelona: { artigo: 'o', cores: ['#a50044', '#004d98'] },
  'Boca Juniors': { artigo: 'o', cores: ['#003a70', '#ffd200'] },
  CSA: { artigo: 'o', cores: ['#0b3d91', '#ffffff'] },
  Ceará: { artigo: 'o', cores: ['#111111', '#ffffff'] },
  Chile: { artigo: 'o', cores: ['#d52b1e', '#ffffff'] },
  Chivas: { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  'Defensa y Justicia': { artigo: 'o', cores: ['#ffd200', '#00843d'] },
  'Deportivo Cali': { artigo: 'o', cores: ['#00843d', '#ffffff'] },
  Estudiantes: { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  França: { artigo: 'a', cores: ['#002395', '#ffffff'] },
  Fortaleza: { artigo: 'o', cores: ['#c8102e', '#0b3d91'] },
  Goiás: { artigo: 'o', cores: ['#00843d', '#ffffff'] },
  Guarani: { artigo: 'o', cores: ['#00843d', '#ffffff'] },
  Hamburgo: { artigo: 'o', cores: ['#0a3d91', '#ffffff'] },
  Holanda: { artigo: 'a', cores: ['#f36c21', '#ffffff'] },
  Independiente: { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  'Independiente Rivadavia': { artigo: 'o', cores: ['#0b3d91', '#ffffff'] },
  Inglaterra: { artigo: 'a', cores: ['#ffffff', '#0b2a5b'] },
  Itália: { artigo: 'a', cores: ['#0a5eb0', '#ffffff'] },
  Jacuipense: { artigo: 'a', cores: ['#c8102e', '#ffffff'] },
  'Junior Barranquilla': { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  Lanús: { artigo: 'o', cores: ['#7a1c2e', '#ffffff'] },
  Libertad: { artigo: 'o', cores: ['#111111', '#ffffff'] },
  Liverpool: { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  "Newell's Old Boys": { artigo: 'o', cores: ['#c8102e', '#111111'] },
  Novorizontino: { artigo: 'o', cores: ['#ffd200', '#111111'] },
  Olimpia: { artigo: 'o', cores: ['#ffffff', '#111111'] },
  Paysandu: { artigo: 'o', cores: ['#6cc4ee', '#ffffff'] },
  Peñarol: { artigo: 'o', cores: ['#ffd200', '#111111'] },
  'Ponte Preta': { artigo: 'a', cores: ['#111111', '#ffffff'] },
  Portuguesa: { artigo: 'a', cores: ['#c8102e', '#00843d'] },
  'River Plate': { artigo: 'o', cores: ['#ffffff', '#c8102e'] },
  'San Lorenzo': { artigo: 'o', cores: ['#0b2a5b', '#c8102e'] },
  'Santa Cruz': { artigo: 'o', cores: ['#c8102e', '#111111'] },
  'São José-RS': { artigo: 'o', cores: ['#0b3d91', '#ffffff'] },
  Sousa: { artigo: 'o', cores: ['#00843d', '#ffffff'] },
  'Sporting Cristal': { artigo: 'o', cores: ['#6cc4ee', '#ffffff'] },
  'Vila Nova': { artigo: 'o', cores: ['#c8102e', '#ffffff'] },
  'Águilas Doradas': { artigo: 'o', cores: ['#d4a017', '#111111'] },
};

/** Cores de um adversário, ou null se não houver cadastro (aí joga de máquina). */
export function coresDoAdversario(nome: string): Cores | null {
  return TIMES.find((t) => t.nome === nome)?.cores ?? OUTROS_ADVERSARIOS[nome]?.cores ?? null;
}

/** "contra o Junior Barranquilla" / "contra a Itália". */
export function contraAdversario(nome: string): string {
  const artigo = TIMES.find((t) => t.nome === nome)?.artigo ?? OUTROS_ADVERSARIOS[nome]?.artigo ?? 'o';
  return `contra ${artigo} ${nome}`;
}
