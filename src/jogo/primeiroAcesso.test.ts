// Primeiro acesso (docs/jogo.md 14.8): a escolha do time é a primeira tela de quem é novo.

import { describe, expect, it } from 'vitest';
import { comecaPelaEscolha } from './primeiroAcesso';

describe('primeiro acesso', () => {
  it('quem é novo e ia para a Home começa pela escolha do time', () => {
    expect(comecaPelaEscolha({ jaTinhaTime: false, tela: 'inicio', comDesafio: false })).toBe(true);
  });

  it('quem já tem time abre a Home como sempre', () => {
    expect(comecaPelaEscolha({ jaTinhaTime: true, tela: 'inicio', comDesafio: false })).toBe(false);
  });

  it('link de desafio entra direto no convite da Home', () => {
    expect(comecaPelaEscolha({ jaTinhaTime: false, tela: 'inicio', comDesafio: true })).toBe(false);
  });

  it('as outras entradas seguem o caminho delas (Termos, código, Time do Dia e lance já pedem o time sozinhos)', () => {
    for (const tela of ['termos', 'entrar', 'admin', 'times', 'timeDoDia', 'casa', 'cidade']) {
      expect(comecaPelaEscolha({ jaTinhaTime: false, tela, comDesafio: false })).toBe(false);
    }
  });
});
