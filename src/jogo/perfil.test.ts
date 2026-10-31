import { describe, expect, it } from 'vitest';
import { ID_OUTRO, timePorId } from '../dados/times';
import { linhaDaPosicao, linhaDoRecorde, nomeNoCracha } from './perfil';

describe('crachá do Perfil', () => {
  it('sem apelido, usa o artigo certo do time', () => {
    expect(nomeNoCracha(undefined, timePorId('flamengo'))).toBe('Torcedor do Flamengo');
    expect(nomeNoCracha(undefined, timePorId('chapecoense'))).toBe('Torcedor da Chapecoense');
  });

  it('o apelido vem primeiro', () => {
    expect(nomeNoCracha('Zé da Geral', timePorId('flamengo'))).toBe('Zé da Geral');
  });

  it('"Outro time" e quem ainda não escolheu', () => {
    expect(nomeNoCracha(undefined, timePorId(ID_OUTRO))).toBe('Torcedor de outro time');
    expect(nomeNoCracha(undefined, undefined)).toBe('Sem time ainda');
  });
});

describe('linhas do Perfil', () => {
  it('posição', () => {
    expect(linhaDaPosicao({ posicao: 3, total: 14 })).toBe('3º de 14');
    expect(linhaDaPosicao({ posicao: null, total: 14 })).toBe('Sem posição ainda');
    expect(linhaDaPosicao(null)).toBe('Sem posição ainda');
  });

  it('recorde', () => {
    expect(linhaDoRecorde(1234)).toBe('1.234 pontos');
    expect(linhaDoRecorde(1)).toBe('1 ponto');
    expect(linhaDoRecorde(null)).toBe('Sem recorde ainda');
    expect(linhaDoRecorde(undefined)).toBe('Sem recorde ainda');
  });
});
