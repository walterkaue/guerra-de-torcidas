import { describe, expect, it } from 'vitest';
import { conviteDia, conviteX1Penaltis, conviteX1Prova } from './convites';

describe('convites do X1', () => {
  it('pênaltis: com o artigo do time e sem time', () => {
    expect(conviteX1Penaltis(47, 'pro Flamengo', true)).toBe('Te chamei no X1: fiz 47 pro Flamengo. Faz mais?');
    expect(conviteX1Penaltis(1, null, true)).toBe('Te chamei no X1: fiz 1 ponto. Faz mais?');
    expect(conviteX1Penaltis(30, 'pra Chapecoense', false)).toBe('Fiz 30 pra Chapecoense nos Pênaltis. Joga também:');
  });

  it('prova', () => {
    expect(conviteX1Prova(58, true)).toBe('Te chamei no X1 na Prova de Boleiro: 58 pontos. Faz mais?');
    expect(conviteX1Prova(58, false)).toBe('Joga também:');
  });

  it('Time do Dia', () => {
    expect(conviteDia(4, true)).toBe('Achei o Time do Dia em 4 chutes. E você?');
    expect(conviteDia(1, true)).toBe('Achei o Time do Dia em 1 chute. E você?');
    expect(conviteDia(6, false)).toBe('Não achei o Time do Dia hoje. E você?');
  });
});
