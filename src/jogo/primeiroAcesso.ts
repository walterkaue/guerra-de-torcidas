// Primeiro acesso (docs/jogo.md 14.8): quem ainda não escolheu o time começa pela escolha do time (sem apelido: ele é
// do Perfil), depois a triagem de idade e o aquecimento, e só então a Home. Quem chega por link de desafio vai à tela
// do convite (telas/convite.ts, C06), que oferece as faixas de time; os links do Time do Dia e do lance já passam pela
// escolha por conta própria (main.ts). Puro: sem DOM.

import type { Rota } from '../app';

type DepoisDoTime = Extract<Rota, { tela: 'times' }>['depois'];

/**
 * Para onde a escolha do time leva. O código do X1 (`desafio`) e o item do link do lance (`lance`) atravessam a
 * escolha e a triagem: sem eles, o link `#lance/…` abriria só a lista dos Lances e perderia a ficha. A Prova vinda do
 * convite (com `desafio`) começa sozinha, com a contagem 3, 2, 1.
 */
export function destinoDepoisDoTime(depois: DepoisDoTime, desafio?: string, lance?: string): Rota {
  const d = depois ?? 'partida';
  if (d === 'partida') return { tela: 'partida', desafio };
  if (d === 'prova') return desafio ? { tela: 'prova', desafio, contagem: true } : { tela: 'prova' };
  if (d === 'lances') return { tela: 'lances', desafio, lance };
  return { tela: d };
}

export interface Entrada {
  /** Já tinha time neste aparelho antes desta visita (o `?time=` do link não conta: só sugere). */
  jaTinhaTime: boolean;
  /** Tela que a abertura ia mostrar. */
  tela: string;
  /** Veio por link de desafio (?d=, ?p= ou ?l=): vai ao convite, não à Home. */
  comDesafio: boolean;
}

/** A abertura vira a escolha do time? Só para quem é novo e ia cair na Home sem nenhum link de desafio. */
export const comecaPelaEscolha = (e: Entrada): boolean => !e.jaTinhaTime && e.tela === 'inicio' && !e.comDesafio;
