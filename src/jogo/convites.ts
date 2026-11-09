// Textos que acompanham o link no WhatsApp (glossário de 08/11/2026: "desafio").
// Texto fixo, sem sorteio do narrador. Sem link de desafio (a partida já era um desafio), vira "Vem pro jogo".
// No máximo 2 linhas antes da linha do link.

const quanto = (pontos: number, paraTime: string | null) =>
  paraTime ? `${pontos} ${paraTime}` : `${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}`;

/** "Te desafio nos pênaltis: fiz 47 pro Flamengo. Faz mais?" */
export function conviteX1Penaltis(pontos: number, paraTime: string | null, comX1: boolean): string {
  return comX1
    ? `Te desafio nos pênaltis: fiz ${quanto(pontos, paraTime)}. Faz mais?`
    : `Fiz ${quanto(pontos, paraTime)} nos Pênaltis. Vem pro jogo:`;
}

/** "Te desafio na Prova de Boleiro: fiz 58 pontos. Faz mais?" */
export function conviteX1Prova(pontos: number, comX1: boolean): string {
  return comX1
    ? `Te desafio na Prova de Boleiro: fiz ${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}. Faz mais?`
    : 'Vem pro jogo:';
}

/** "Time do Dia na rede em 4 chutes. Faz melhor?" */
export function conviteDia(tentativas: number, acertou: boolean): string {
  if (!acertou) return 'Não achei o Time do Dia hoje. E você?';
  return `Time do Dia na rede em ${tentativas} ${tentativas === 1 ? 'chute' : 'chutes'}. Faz melhor?`;
}

// Texto completo de cada convite, como vai ao WhatsApp. O link fica na última linha (ou no fim dela).

/** Pênaltis: uma linha só, convite e link. */
export const textoSharePenaltis = (convite: string, link: string): string => `${convite} ${link}`;

/** Prova: com desafio, convite, escada e link; sem, a linha do card, a escada e convite com link. */
export function textoShareProva(o: { codigo: boolean; convite: string; linha: string; escada: string; link: string }): string {
  return o.codigo ? [o.convite, o.escada, o.link].join('\n') : [o.linha, o.escada, `${o.convite} ${o.link}`].join('\n');
}

/** Time do Dia: linha do card, grade de emoji e convite com link. */
export const textoShareDia = (linha: string, grade: string, convite: string, link: string): string => [linha, grade, `${convite} ${link}`].join('\n');
