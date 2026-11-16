// Apito = chute liberado (pênaltis e Lances; docs/visual.md, "O sinal VALENDO!"). Enquanto o batedor ajeita a bola, o
// arraste não vale; quando ele termina, saem juntos o apito, o anel em volta da bola, o adesivo "VALENDO!" e a vibração
// leve, e só então o arraste vale. Só tempo de tela: nada aqui muda regra, pontos ou o que o servidor recalcula.

/** O que a faixa de instrução diz a quem arrasta antes do apito (o lance não é gasto). */
export const ESPERA_O_APITO = 'Espera o apito!';
/** Espessura do traço do anel (px). */
export const TRACO_DO_ANEL = 2.5;
/** O anel pulsa 2 vezes nesse tempo; o adesivo some junto. */
export const DUR_SINAL = 800;
const PULSOS = 2;

/**
 * Instante do sinal no relógio da partida: o apito é agendado agora e só chega ao ouvido depois da latência do áudio
 * (`latenciaSom`, em segundos, de `latenciaDoSom()`); o anel, o adesivo e a vibração saem nesse mesmo instante.
 * Sem som (mudo ou aparelho que não informa), latência 0: o sinal sai na hora, igual.
 */
export function instanteDoSinal(agora: number, latenciaSom: number): number {
  return agora + Math.max(0, latenciaSom) * 1000;
}

/** O arraste só vale do sinal em diante (null: o batedor ainda está ajeitando a bola). */
export function arrasteVale(agora: number, valendoEm: number | null): boolean {
  return valendoEm !== null && agora >= valendoEm;
}

/**
 * Anel branco em volta da bola, `ms` depois do sinal: cresce de 1,15 a 1,9 vez o raio da bola e some, 2 vezes.
 * Com movimento reduzido, fica parado (1,5 vez o raio) pelo mesmo tempo. Fora do tempo do sinal: null.
 */
export function anelDoSinal(ms: number, reduzido: boolean): { escala: number; alfa: number } | null {
  if (ms < 0 || ms >= DUR_SINAL) return null;
  if (reduzido) return { escala: 1.5, alfa: 0.9 };
  const pulso = DUR_SINAL / PULSOS;
  const f = (ms % pulso) / pulso;
  return { escala: 1.15 + 0.75 * f, alfa: 0.95 * (1 - f) };
}

/** Mostra o adesivo "VALENDO!" (o CSS anima; com movimento reduzido, aparece parado) e tira depois do sinal. */
export function mostrarAdesivo(el: HTMLElement): void {
  el.classList.add('mostra');
  window.setTimeout(() => el.classList.remove('mostra'), DUR_SINAL);
}
