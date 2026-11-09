import { describe, expect, it } from 'vitest';
import { conviteDia, conviteX1Penaltis, conviteX1Prova, textoSharePenaltis, textoShareDia, textoShareProva } from './convites';
import { conviteLances, textoShareLances } from './lancesTelaUnica';

describe('convites do desafio', () => {
  it('pênaltis: com o artigo do time e sem time', () => {
    expect(conviteX1Penaltis(47, 'pro Flamengo', true)).toBe('Te desafio nos pênaltis: fiz 47 pro Flamengo. Faz mais?');
    expect(conviteX1Penaltis(1, null, true)).toBe('Te desafio nos pênaltis: fiz 1 ponto. Faz mais?');
    expect(conviteX1Penaltis(30, 'pra Chapecoense', false)).toBe('Fiz 30 pra Chapecoense nos Pênaltis. Vem pro jogo:');
  });

  it('prova', () => {
    expect(conviteX1Prova(58, true)).toBe('Te desafio na Prova de Boleiro: fiz 58 pontos. Faz mais?');
    expect(conviteX1Prova(1, true)).toBe('Te desafio na Prova de Boleiro: fiz 1 ponto. Faz mais?');
    expect(conviteX1Prova(58, false)).toBe('Vem pro jogo:');
  });

  it('Time do Dia', () => {
    expect(conviteDia(4, true)).toBe('Time do Dia na rede em 4 chutes. Faz melhor?');
    expect(conviteDia(1, true)).toBe('Time do Dia na rede em 1 chute. Faz melhor?');
    expect(conviteDia(6, false)).toBe('Não achei o Time do Dia hoje. E você?');
  });
});

describe('texto completo que vai ao WhatsApp: no máximo 2 linhas antes da linha do link', () => {
  const LINK = 'https://torcida.kauewalter.com.br/?d=abcd2345';
  /** Quantas linhas vêm antes da linha do link (a última). */
  const antesDoLink = (texto: string) => {
    const linhas = texto.split('\n');
    expect(linhas[linhas.length - 1]).toContain('http');
    return linhas.length - 1;
  };
  const emojis = '⚽⚽🧤⚽⚽';
  const escada = '🟩🟩🟥🟩🟩🟩🟩🟥';
  const linhaDoCard = 'Prova de Boleiro #12 · 58 pontos pro Flamengo';

  it('pênaltis: com e sem desafio', () => {
    for (const com of [true, false]) {
      expect(antesDoLink(textoSharePenaltis(conviteX1Penaltis(47, 'pro Flamengo', com), LINK))).toBeLessThanOrEqual(2);
    }
  });

  it('lances: com e sem desafio, com e sem medalha', () => {
    for (const com of [true, false]) {
      for (const medalha of [null, '🥉 Bronze no lance A virada em Lima']) {
        const texto = textoShareLances(conviteLances(96, 'pro Flamengo', com), emojis, medalha, LINK);
        expect(antesDoLink(texto), texto).toBeLessThanOrEqual(2);
      }
    }
  });

  it('prova: com e sem desafio', () => {
    for (const com of [true, false]) {
      const texto = textoShareProva({ codigo: com, convite: conviteX1Prova(58, com), linha: linhaDoCard, escada, link: LINK });
      expect(antesDoLink(texto), texto).toBeLessThanOrEqual(2);
    }
  });

  // Time do Dia fica de fora do limite de 2 linhas: a grade de emoji tem uma linha por chute (até 6) e é o próprio
  // convite (estilo Wordle). Aqui só se confere que o convite é uma linha só, colada ao link.
  it('Time do Dia: o convite é uma linha só, colada ao link', () => {
    for (const acertou of [true, false]) {
      const texto = textoShareDia('Time do Dia #12', '⬛🟨🟩', conviteDia(3, acertou), LINK);
      expect(texto.split('\n').pop()).toBe(`${conviteDia(3, acertou)} ${LINK}`);
    }
  });
});
