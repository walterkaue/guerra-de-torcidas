import { describe, expect, it } from 'vitest';
import { inicioDoVoo, novaLatencia, tempoDaBatida } from './tempoDoChute';

const BATIDA = 190;

describe('tempo do chute', () => {
  it('com resposta rápida, a bola sai quando o pé chega', () => {
    expect(inicioDoVoo(1000, 1100, BATIDA)).toBe(1000);
  });

  it('com resposta lenta, a bola sai do começo do trajeto, sem pular', () => {
    const agora = 1800;
    const inicio = inicioDoVoo(1000, agora, BATIDA);
    expect(agora - inicio - BATIDA).toBe(0);
  });

  it('a corrida do batedor dura a espera esperada e nunca passa do pé na bola', () => {
    expect(tempoDaBatida(0, 500, BATIDA)).toBe(0);
    expect(tempoDaBatida(250, 500, BATIDA)).toBe(BATIDA / 2);
    expect(tempoDaBatida(900, 500, BATIDA)).toBe(BATIDA);
    expect(tempoDaBatida(100, 50, BATIDA)).toBe(100);
  });

  it('a latência esperada acompanha as respostas, com teto', () => {
    expect(novaLatencia(300, 500)).toBe(400);
    expect(novaLatencia(600, 5000)).toBe(700);
  });
});
