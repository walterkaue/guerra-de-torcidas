// Textos que acompanham o link no WhatsApp (glossário de 20/10: "Chamar no X1").
// Texto fixo, sem sorteio do narrador. Sem link de X1 (a partida já era um X1), vira "Joga também".

const quanto = (pontos: number, paraTime: string | null) =>
  paraTime ? `${pontos} ${paraTime}` : `${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}`;

/** "Te chamei no X1: fiz 47 pro Flamengo. Faz mais?" */
export function conviteX1Penaltis(pontos: number, paraTime: string | null, comX1: boolean): string {
  return comX1
    ? `Te chamei no X1: fiz ${quanto(pontos, paraTime)}. Faz mais?`
    : `Fiz ${quanto(pontos, paraTime)} nos Pênaltis. Joga também:`;
}

/** "Te chamei no X1 na Prova de Boleiro: 58 pontos. Faz mais?" */
export function conviteX1Prova(pontos: number, comX1: boolean): string {
  return comX1
    ? `Te chamei no X1 na Prova de Boleiro: ${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}. Faz mais?`
    : 'Joga também:';
}

/** "Achei o Time do Dia em 4 chutes. E você?" */
export function conviteDia(tentativas: number, acertou: boolean): string {
  if (!acertou) return 'Não achei o Time do Dia hoje. E você?';
  return `Achei o Time do Dia em ${tentativas} ${tentativas === 1 ? 'chute' : 'chutes'}. E você?`;
}
