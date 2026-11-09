// O desafio guardado pelo convite e a triagem que sabe de onde veio (C06).

import { describe, expect, it } from 'vitest';
import { desafioDaTriagem, desafioDoDestino, guardarDesafioAberto } from './desafioAberto';

describe('desafio aberto', () => {
  it('o destino do desafio diz o tipo e o código', () => {
    expect(desafioDoDestino({ tela: 'partida', desafio: 'abcdefgh' })).toEqual({ tipo: 'penaltis', codigo: 'abcdefgh' });
    expect(desafioDoDestino({ tela: 'lances', desafio: 'abcdefgh' })).toEqual({ tipo: 'lances', codigo: 'abcdefgh' });
    expect(desafioDoDestino({ tela: 'prova', desafio: 'abcdefgh', contagem: true })).toEqual({ tipo: 'prova', codigo: 'abcdefgh' });
  });

  it('jogo sem desafio, Home e convite não são desafio', () => {
    expect(desafioDoDestino({ tela: 'partida' })).toBeUndefined();
    expect(desafioDoDestino({ tela: 'inicio' })).toBeUndefined();
    expect(desafioDoDestino({ tela: 'convite', tipo: 'penaltis', codigo: 'abcdefgh' })).toBeUndefined();
  });

  it('a triagem só acha o desafio que o convite guardou, do mesmo tipo e código', () => {
    guardarDesafioAberto({ tipo: 'penaltis', codigo: 'abcdefgh', apelido: 'Zé', pontos: 96, timeId: 'palmeiras' });
    expect(desafioDaTriagem({ tela: 'partida', desafio: 'abcdefgh' })?.pontos).toBe(96);
    expect(desafioDaTriagem({ tela: 'lances', desafio: 'abcdefgh' })).toBeUndefined();
    expect(desafioDaTriagem({ tela: 'partida', desafio: 'zzzzzzzz' })).toBeUndefined();
  });
});
