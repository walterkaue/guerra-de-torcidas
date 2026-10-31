// Tempo do chute dos pênaltis enquanto o resultado do lance vem do servidor. Lógica pura, com teste.

const LATENCIA_INICIAL = 350;
const LATENCIA_MAXIMA = 700;

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

/** Tempo da corrida do batedor enquanto espera: dura o que o servidor costuma demorar. */
export function tempoDaBatida(ms: number, latencia: number, batida: number): number {
  return Math.min(batida, (ms * batida) / Math.max(batida, latencia));
}
