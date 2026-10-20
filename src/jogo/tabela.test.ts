import { describe, expect, it } from 'vitest';
import { campanha, classificacao, dicasDoJogo, forma, ultimoConfronto, type Resultado } from './tabela';

let dia = 0;
const r = (rodada: number, m: string, gm: number, gv: number, v: string): Resultado => ({
  rodada,
  mandante_id: m,
  visitante_id: v,
  inicio: new Date(Date.UTC(2026, 3, 1 + dia++)).toISOString(),
  gols_mandante: gm,
  gols_visitante: gv,
});

describe('tabela do campeonato', () => {
  it('pontos, vitórias, saldo e gols, nessa ordem de desempate', () => {
    dia = 0;
    const res = [
      r(1, 'a', 2, 0, 'b'), // a 3
      r(1, 'c', 1, 1, 'd'),
      r(2, 'b', 3, 1, 'c'), // b 3
      r(2, 'd', 0, 0, 'a'),
      r(3, 'c', 4, 0, 'a'),
      r(3, 'b', 1, 1, 'd'),
    ];
    const t = classificacao(res, ['a', 'b', 'c', 'd']);
    // a: V E D = 4 pts, saldo -2 | b: D V E = 4 pts, saldo 0 | c: E D V = 4, saldo +2 | d: E E E = 3
    expect(t.map((l) => [l.timeId, l.pontos, l.v, l.saldo])).toEqual([
      ['c', 4, 1, 2],
      ['b', 4, 1, 0],
      ['a', 4, 1, -2],
      ['d', 3, 0, 0],
    ]);
    expect(t.map((l) => l.posicao)).toEqual([1, 2, 3, 4]);
    expect(t[0]).toMatchObject({ jogos: 3, v: 1, e: 1, d: 1, gp: 6, gc: 4 });
  });

  it('time sem jogo entra zerado', () => {
    expect(classificacao([], ['x'])[0]).toMatchObject({ posicao: 1, pontos: 0, jogos: 0, forma: [] });
  });

  it('forma: últimos 5, do mais antigo ao mais recente', () => {
    dia = 0;
    const res = [
      r(1, 'a', 0, 1, 'b'),
      r(2, 'a', 1, 0, 'c'),
      r(3, 'd', 2, 2, 'a'),
      r(4, 'a', 3, 0, 'b'),
      r(5, 'c', 1, 0, 'a'),
      r(6, 'a', 2, 1, 'd'),
    ];
    expect(forma(res, 'a')).toEqual(['V', 'E', 'V', 'D', 'V']);
    expect(forma(res, 'a', 2)).toEqual(['D', 'V']);
  });

  it('campanha em casa e fora', () => {
    dia = 0;
    const res = [r(1, 'a', 2, 0, 'b'), r(2, 'b', 1, 1, 'a'), r(3, 'a', 0, 1, 'c')];
    expect(campanha(res, 'a', 'casa')).toEqual({ jogos: 2, v: 1, e: 0, d: 1, gp: 2, gc: 1 });
    expect(campanha(res, 'a', 'fora')).toEqual({ jogos: 1, v: 0, e: 1, d: 0, gp: 1, gc: 1 });
  });

  it('último confronto, em qualquer mando', () => {
    dia = 0;
    const res = [r(5, 'remo', 0, 2, 'cruzeiro'), r(6, 'a', 1, 0, 'b')];
    expect(ultimoConfronto(res, 'cruzeiro', 'remo')).toMatchObject({ rodada: 5, gols_visitante: 2 });
    expect(ultimoConfronto(res, 'cruzeiro', 'a')).toBeNull();
  });
});

describe('dicas do cartão', () => {
  const cru = { id: 'cruzeiro', nome: 'Cruzeiro', artigo: 'o' as const };
  const chape = { id: 'chapecoense', nome: 'Chapecoense', artigo: 'a' as const };

  it('confronto do 1º turno e gols em casa e fora, com o artigo certo', () => {
    dia = 0;
    const res = [
      r(5, 'chapecoense', 0, 2, 'cruzeiro'),
      r(6, 'cruzeiro', 2, 0, 'x'),
      r(7, 'cruzeiro', 1, 1, 'y'),
      r(8, 'cruzeiro', 3, 2, 'z'),
      r(9, 'x', 1, 0, 'chapecoense'),
      r(10, 'y', 0, 0, 'chapecoense'),
      r(11, 'z', 2, 0, 'chapecoense'),
    ];
    expect(dicasDoJogo(res, cru, chape)).toEqual([
      '1º turno: Chapecoense 0 x 2 Cruzeiro',
      'Em casa, o Cruzeiro faz 2,0 gols por jogo; fora, a Chapecoense faz 0,0 gol por jogo',
    ]);
  });

  it('sem dado suficiente, não inventa', () => {
    dia = 0;
    expect(dicasDoJogo([r(1, 'cruzeiro', 1, 0, 'x')], cru, chape)).toEqual([]);
  });

  it('confronto do returno diz a rodada', () => {
    dia = 0;
    expect(dicasDoJogo([r(24, 'cruzeiro', 1, 0, 'chapecoense')], cru, chape)[0]).toBe('24ª rodada: Cruzeiro 1 x 0 Chapecoense');
  });
});
