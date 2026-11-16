import { describe, expect, it } from 'vitest';
import { DUR_CONTATO, DUR_PASSOS, duracaoDaBatida, inicioDoVoo, latenciaInicial, novaLatencia, pontoDeEspera, tempoDaBatida } from './tempoDoChute';

const BATIDA = duracaoDaBatida(false);
const ESPERA = pontoDeEspera(BATIDA);

describe('tempo do chute', () => {
  it('os 2 passos levam o pé à bola em ~450 ms; com movimento reduzido, sem os passos', () => {
    expect(BATIDA).toBe(DUR_PASSOS + DUR_CONTATO);
    expect(BATIDA).toBe(450);
    expect(duracaoDaBatida(true)).toBe(DUR_CONTATO);
  });

  it('esperando, o batedor segura no embalo (perna puxada), 50 ms antes do pé encontrar a bola', () => {
    expect(ESPERA).toBe(BATIDA - 50);
    expect(pontoDeEspera(duracaoDaBatida(true))).toBe(140);
    // Nunca chega ao contato sem o resultado: o pé não fica parado encostado na bola.
    for (const ms of [0, 300, 450, 700, 2000]) expect(tempoDaBatida(ms, 350, BATIDA)).toBeLessThan(BATIDA);
    expect(tempoDaBatida(5000, 700, BATIDA)).toBe(ESPERA);
  });

  it('a resposta de sempre (~300 ms) chega durante os passos: segue no ritmo, sem esperar', () => {
    expect(latenciaInicial()).toBeLessThan(ESPERA);
    expect(tempoDaBatida(300, latenciaInicial(), BATIDA)).toBe(300);
    expect(inicioDoVoo(1000, 1300, latenciaInicial(), BATIDA)).toBe(1000);
  });

  it('resposta depois do embalo: a bola sai 50 ms depois, da pose que estava na tela', () => {
    const agora = 1900;
    const inicio = inicioDoVoo(1000, agora, latenciaInicial(), BATIDA);
    expect(agora - inicio).toBe(ESPERA);
    expect(inicio + BATIDA - agora).toBe(50);
  });

  it('servidor lento: os passos esticam até o teto de 700 ms, sem pulo quando a resposta chega', () => {
    expect(tempoDaBatida(300, 600, BATIDA)).toBe(225);
    const lat = novaLatencia(700, 5000);
    expect(lat).toBe(700);
    // O que estava na tela no instante da resposta é de onde a animação continua.
    const inicio = 1000;
    const agora = 1350;
    const naTela = tempoDaBatida(agora - inicio, lat, BATIDA);
    expect(agora - inicioDoVoo(inicio, agora, lat, BATIDA)).toBe(naTela);
  });

  it('a latência esperada acompanha as respostas, com teto', () => {
    expect(novaLatencia(300, 500)).toBe(400);
    expect(novaLatencia(600, 5000)).toBe(700);
  });
});
