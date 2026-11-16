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

/** No chute, a perna fica toda puxada para trás aos 140 ms; o pé encontra a bola aos 190. */
const PUXADA = 140;

/**
 * Onde o batedor segura enquanto o servidor não responde: no auge do embalo, com a perna puxada, 50 ms antes do
 * contato. Esperar ali parece tensão de cobrança; esperar com o pé encostado na bola parecia o jogo travado.
 */
export function pontoDeEspera(batida: number): number {
  return batida - (DUR_CONTATO - PUXADA);
}

/**
 * Tempo da pose dos passos e do chute enquanto espera: no ritmo normal quando o servidor costuma responder antes;
 * mais lento, até o teto da latência (700 ms), quando costuma demorar. Chegou ao embalo, segura ali.
 */
export function tempoDaBatida(ms: number, latencia: number, batida: number): number {
  return Math.min(pontoDeEspera(batida), (ms * batida) / Math.max(batida, latencia));
}

/**
 * Novo início do chute quando o resultado chega: a animação segue da pose que está na tela, sem pulo, e a bola sai
 * `batida` ms depois do início (logo depois, se ele estava segurando no embalo). Usa a mesma latência do desenho.
 */
export function inicioDoVoo(inicio: number, agora: number, latencia: number, batida: number): number {
  return agora - tempoDaBatida(agora - inicio, latencia, batida);
}
