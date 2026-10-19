import { describe, expect, it } from 'vitest';
import { rivalDaSemana, situacaoDoDuelo, type LinhaDuelo } from './rival';

const linha = (time_id: string, posicao_campeao: number, media30: number, ativos = 3): LinhaDuelo => ({
  time_id,
  posicao_campeao,
  media30,
  ativos,
});
const ranking = [linha('a', 1, 100), linha('b', 2, 90), linha('c', 3, 80)];

describe('rival', () => {
  it('clássico vale sempre', () => {
    expect(rivalDaSemana('c', 'x', ranking)).toBe('x');
  });
  it('sem clássico: o de cima; se for líder, o de baixo', () => {
    expect(rivalDaSemana('c', null, ranking)).toBe('b');
    expect(rivalDaSemana('a', null, ranking)).toBe('b');
    expect(rivalDaSemana('z', null, ranking)).toBeNull();
  });
});

describe('duelo', () => {
  it('atrás, colado, frente', () => {
    expect(situacaoDoDuelo(linha('c', 3, 80), linha('a', 1, 100), null)).toMatchObject({ evento: 'rival_atras', dif: '20 pontos' });
    expect(situacaoDoDuelo(linha('c', 3, 87), linha('b', 2, 90), null)).toMatchObject({ evento: 'rival_colado', dif: '3 pontos' });
    expect(situacaoDoDuelo(linha('a', 1, 100), linha('b', 2, 99), null)).toMatchObject({ evento: 'rival_frente', dif: '1 ponto' });
  });
  it('passou e foi passado comparando com o que o aparelho viu antes', () => {
    expect(situacaoDoDuelo(linha('a', 1, 100), linha('b', 2, 90), false)?.evento).toBe('rival_passou');
    expect(situacaoDoDuelo(linha('c', 3, 80), linha('b', 2, 90), true)?.evento).toBe('rival_passado');
  });
  it('sem ninguém jogando, sem duelo', () => {
    expect(situacaoDoDuelo(linha('a', 1, 0, 0), linha('b', 2, 0, 0), null)).toBeNull();
  });
});
