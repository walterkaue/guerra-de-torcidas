// Primeiro acesso (docs/jogo.md 14.8): quem ainda não escolheu o time começa pela escolha do time (apelido opcional),
// depois a triagem de idade e o aquecimento, e só então a Home. Quem chega por link de desafio entra direto no convite,
// e os links do Time do Dia e do lance já passam pela escolha por conta própria (main.ts). Puro: sem DOM.

export interface Entrada {
  /** Já tinha time neste aparelho antes desta visita (o `?time=` do link não conta: só sugere). */
  jaTinhaTime: boolean;
  /** Tela que a abertura ia mostrar. */
  tela: string;
  /** Veio por link de desafio (?d=, ?p= ou ?l=). */
  comDesafio: boolean;
}

/** A abertura vira a escolha do time? Só para quem é novo e ia cair na Home sem nenhum link de desafio. */
export const comecaPelaEscolha = (e: Entrada): boolean => !e.jaTinhaTime && e.tela === 'inicio' && !e.comDesafio;
