// Tempo do chute dos pênaltis e dos Lances enquanto o resultado do lance vem do servidor. Lógica pura, com teste.

const LATENCIA_INICIAL = 350;
const LATENCIA_MAXIMA = 700;

/** Depois do arraste, o batedor dá 2 passos curtos até a bola; a resposta do servidor chega durante eles. */
export const DUR_PASSOS = 260;
/** Do começo do chute (pé de apoio, puxada) até o pé encontrar a bola. */
export const DUR_CONTATO = 190;

/** Do arraste até o pé encontrar a bola: os passos e o chute; com movimento reduzido, sem os passos. */
export function duracaoDaBatida(reduzido: boolean): number {
  return (reduzido ? 0 : DUR_PASSOS) + DUR_CONTATO;
}

/** Primeira estimativa de quanto o servidor demora (ms), antes de medir. */
export const latenciaInicial = (): number => LATENCIA_INICIAL;

/** Média com a última resposta, com teto: um lance lento não deixa o próximo em câmera lenta. */
export function novaLatencia(anterior: number, medida: number): number {
  return Math.min(LATENCIA_MAXIMA, (anterior + medida) / 2);
}

/**
 * A bola sai `batida` ms depois do início do chute. Se o resultado chegou depois do pé encontrar
 * a bola, o início anda para a bola sair agora, do começo do trajeto, e não já no meio dele.
 */
export function inicioDoVoo(inicio: number, agora: number, batida: number): number {
  return Math.max(inicio, agora - batida);
}

/**
 * Tempo dos passos e da batida enquanto espera: no ritmo normal quando o servidor costuma responder antes do pé
 * chegar; mais lento, até o teto da latência (700 ms), quando costuma demorar. Passou disso, o pé segura na bola.
 */
export function tempoDaBatida(ms: number, latencia: number, batida: number): number {
  return Math.min(batida, (ms * batida) / Math.max(batida, latencia));
}
