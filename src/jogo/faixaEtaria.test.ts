import { describe, expect, it } from 'vitest';
import { FAIXAS, destinoDaInscricao, ehFaixa, podeVerApoio, podeVerOferecidoPor, podeVerPush, precisaDaTriagem } from './faixaEtaria';

describe('faixa etária', () => {
  it('só as três faixas valem', () => {
    expect(FAIXAS.every(ehFaixa)).toBe(true);
    for (const v of ['', 'adulto', 18, null, undefined]) expect(ehFaixa(v)).toBe(false);
  });

  it('push, apoio e "Oferecido por" só para 18+, e sem resposta conta como não', () => {
    for (const regra of [podeVerPush, podeVerApoio, podeVerOferecidoPor]) {
      expect(regra('18_mais')).toBe(true);
      for (const f of ['menos_16', '16_17', null, undefined]) expect(regra(f)).toBe(false);
    }
  });

  it('a triagem vem antes de todo jogo, e só enquanto não houver resposta', () => {
    for (const tela of ['partida', 'prova', 'timeDoDia', 'lances', 'palpites']) {
      expect(precisaDaTriagem(tela, undefined)).toBe(true);
      expect(precisaDaTriagem(tela, 'menos_16')).toBe(false);
    }
    for (const tela of ['inicio', 'times', 'ranking', 'casa', 'termos', 'admin']) expect(precisaDaTriagem(tela, undefined)).toBe(false);
  });

  it('envio do push: 18+ recebe, outra faixa sai, quem não respondeu espera', () => {
    expect(destinoDaInscricao('18_mais')).toBe('enviar');
    expect(destinoDaInscricao('16_17')).toBe('desinscrever');
    expect(destinoDaInscricao('menos_16')).toBe('desinscrever');
    expect(destinoDaInscricao(null)).toBe('esperar');
    expect(destinoDaInscricao(undefined)).toBe('esperar');
  });
});
