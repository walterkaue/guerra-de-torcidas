// Primeiro acesso (docs/jogo.md 14.8): a escolha do time é a primeira tela de quem é novo.

import { describe, expect, it } from 'vitest';
import { comecaPelaEscolha, destinoDepoisDoTime } from './primeiroAcesso';

describe('destino depois da escolha do time', () => {
  it('o item do link do lance atravessa a escolha e abre a ficha', () => {
    expect(destinoDepoisDoTime('lances', undefined, 'corinthians-2012-gol-da-america')).toEqual({
      tela: 'lances',
      desafio: undefined,
      lance: 'corinthians-2012-gol-da-america',
    });
  });

  it('a Prova de um desafio começa sozinha, com a contagem', () => {
    expect(destinoDepoisDoTime('prova', 'abcdefgh')).toEqual({ tela: 'prova', desafio: 'abcdefgh', contagem: true });
  });

  it('o X1 dos Lances segue junto e sem item abre só os Lances', () => {
    expect(destinoDepoisDoTime('lances', 'abcdefgh')).toMatchObject({ tela: 'lances', desafio: 'abcdefgh', lance: undefined });
  });

  it('os outros destinos não levam o item', () => {
    expect(destinoDepoisDoTime('partida', 'abcdefgh')).toEqual({ tela: 'partida', desafio: 'abcdefgh' });
    expect(destinoDepoisDoTime('prova')).toEqual({ tela: 'prova' });
    expect(destinoDepoisDoTime('timeDoDia')).toEqual({ tela: 'timeDoDia' });
    expect(destinoDepoisDoTime(undefined)).toEqual({ tela: 'partida', desafio: undefined });
  });
});

describe('primeiro acesso', () => {
  it('quem é novo e ia para a Home começa pela escolha do time', () => {
    expect(comecaPelaEscolha({ jaTinhaTime: false, tela: 'inicio', comDesafio: false })).toBe(true);
  });

  it('quem já tem time abre a Home como sempre', () => {
    expect(comecaPelaEscolha({ jaTinhaTime: true, tela: 'inicio', comDesafio: false })).toBe(false);
  });

  it('link de desafio vai ao convite, não à escolha do time nem à Home', () => {
    expect(comecaPelaEscolha({ jaTinhaTime: false, tela: 'inicio', comDesafio: true })).toBe(false);
  });

  it('as outras entradas seguem o caminho delas (Termos, código, Time do Dia e lance já pedem o time sozinhos)', () => {
    for (const tela of ['termos', 'entrar', 'admin', 'times', 'timeDoDia', 'casa', 'cidade']) {
      expect(comecaPelaEscolha({ jaTinhaTime: false, tela, comDesafio: false })).toBe(false);
    }
  });
});
