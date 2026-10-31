// "Apoie o jogo" (docs/jogo.md, seção 7.5): quando os botões aparecem. Lógica pura, sem tela.
// Apoiar não dá ponto, XP, selo nem nome público; aqui só se decide se o botão pode aparecer.

export interface ConfigApoio {
  apoio_ligado: boolean;
  linkApoioMensal: string;
  chavePix: string;
}

/** No resultado, o botão aparece no máximo uma vez por semana por aparelho. */
export const INTERVALO_APOIO_MS = 7 * 24 * 60 * 60 * 1000;

/** Só link https:// vira botão; qualquer outra coisa é ignorada. */
export function linkSeguro(link: string): string {
  const l = link.trim();
  return /^https:\/\/[^\s]+$/i.test(l) ? l : '';
}

export function chaveLimpa(chave: string): string {
  return chave.trim();
}

/** Ligado e com pelo menos um jeito de apoiar. Desligado ou vazio: nada aparece. */
export function apoioDisponivel(c: ConfigApoio): boolean {
  return c.apoio_ligado === true && (!!linkSeguro(c.linkApoioMensal) || !!chaveLimpa(c.chavePix));
}

/** `ultima` é o instante (ms) da última vez que o botão apareceu no resultado neste aparelho. */
export function passouUmaSemana(ultima: number | null, agora: number): boolean {
  if (ultima === null || !Number.isFinite(ultima)) return true;
  // Relógio do aparelho voltou no tempo: não trava o botão para sempre.
  if (ultima > agora) return true;
  return agora - ultima >= INTERVALO_APOIO_MS;
}

/** Vitória que valeu para a torcida, ou recorde pessoal. */
export function bomMomentoDosLances(d: { venceu: boolean; valendo: boolean; novoRecorde: boolean }): boolean {
  return (d.venceu && d.valendo) || d.novoRecorde;
}

/** Time do Dia: só quem acertou. */
export function bomMomentoDoDia(d: { acertou: boolean }): boolean {
  return d.acertou;
}
