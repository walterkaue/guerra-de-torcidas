import { describe, expect, it } from 'vitest';
import { DUR_CONTATO, DUR_PASSOS, duracaoDaBatida, inicioDoVoo, latenciaInicial, novaLatencia, tempoDaBatida } from './tempoDoChute';

const BATIDA = duracaoDaBatida(false);

describe('tempo do chute', () => {
  it('os 2 passos levam o pé à bola em ~450 ms; com movimento reduzido, sem os passos', () => {
    expect(BATIDA).toBe(DUR_PASSOS + DUR_CONTATO);
    expect(BATIDA).toBe(450);
    expect(duracaoDaBatida(true)).toBe(DUR_CONTATO);
  });

  it('a resposta de sempre (~300 ms) chega durante os passos: a bola sai quando o pé chega, sem esperar', () => {
    expect(latenciaInicial()).toBeLessThan(BATIDA);
    expect(inicioDoVoo(1000, 1300, BATIDA)).toBe(1000);
    // Com a estimativa abaixo dos passos, eles andam no ritmo normal.
    expect(tempoDaBatida(300, latenciaInicial(), BATIDA)).toBe(300);
  });

  it('com resposta lenta, a bola sai do começo do trajeto, sem pular', () => {
    const agora = 1900;
    const inicio = inicioDoVoo(1000, agora, BATIDA);
    expect(agora - inicio - BATIDA).toBe(0);
  });

  it('servidor lento: os passos esticam até o teto de 700 ms e depois o pé segura na bola', () => {
    expect(tempoDaBatida(0, 600, BATIDA)).toBe(0);
    expect(tempoDaBatida(300, 600, BATIDA)).toBe(225);
    expect(tempoDaBatida(600, 600, BATIDA)).toBe(BATIDA);
    // A estimativa nunca passa de 700: o pé chega à bola em 700 ms, no máximo, e espera ali.
    const lat = novaLatencia(700, 5000);
    expect(lat).toBe(700);
    expect(tempoDaBatida(700, lat, BATIDA)).toBe(BATIDA);
    expect(tempoDaBatida(1500, lat, BATIDA)).toBe(BATIDA);
  });

  it('a latência esperada acompanha as respostas, com teto', () => {
    expect(novaLatencia(300, 500)).toBe(400);
    expect(novaLatencia(600, 5000)).toBe(700);
  });
});
