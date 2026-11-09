// Quem chega por link de desafio (?d=, ?l=, ?p=) vê o convite antes de tudo (E01, 1ª visita em 4G ruim).
// No 4G ruim, o que a Home busca no servidor (placar, Realtime, palpites, carreira, placas) e as telas de jogo que o
// preaquecer baixa disputam a banda com o convite. Por isso esperam o convite aparecer, sumir ou falhar, com teto.
// Sem desafio no link, nada espera. A tela e a ordem das telas são as mesmas: muda só a ordem do que se baixa.
// Quem mexer na entrada pelo link (C06) chama `segurarParaOConvite` e `conviteResolvido` onde o convite estiver.

/** Teto da espera, contado da entrada: sem resposta do convite até aqui, o resto da Home segue. */
export const TETO_DO_CONVITE_MS = 8000;

let liberar: () => void = () => {};
const resolvido = new Promise<void>((ok) => (liberar = ok));
let segurando = false;

/** Na entrada, só com desafio no link: o resto da Home e o preaquecer passam a esperar o convite. */
export function segurarParaOConvite(tetoMs = TETO_DO_CONVITE_MS): void {
  segurando = true;
  setTimeout(liberar, tetoMs);
}

/** O convite apareceu, sumiu (vencido, código que não existe) ou falhou (sem rede). Pode ser chamado mais de uma vez. */
export function conviteResolvido(): void {
  liberar();
}

/** O que pode esperar o convite passa por aqui. Sem desafio no link, segue na hora. */
export function depoisDoConvite(): Promise<void> {
  return segurando ? resolvido : Promise.resolve();
}
