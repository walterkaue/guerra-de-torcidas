import { describe, expect, it } from 'vitest';
import { contagensDasLinhas, desacelera, movimentosDasLinhas, podeAnimar, valorNaContagem } from './deslizarLinhas';

const mapa = (o: Record<string, number>) => new Map(Object.entries(o));

describe('podeAnimar', () => {
  it('anima só a mesma tabela, sem movimento reduzido', () => {
    expect(podeAnimar('2026-W47|campeao', '2026-W47|campeao', false)).toBe(true);
    expect(podeAnimar(null, '2026-W47|campeao', false)).toBe(false); // primeira carga
    expect(podeAnimar('2026-W46|campeao', '2026-W47|campeao', false)).toBe(false); // troca de semana
    expect(podeAnimar('2026-W47|soma', '2026-W47|campeao', false)).toBe(false); // troca de modo
    expect(podeAnimar('2026-W47|campeao', '2026-W47|campeao', true)).toBe(false); // movimento reduzido
  });
});

describe('movimentosDasLinhas', () => {
  it('quem sobe vem de baixo (dy positivo); quem desce, de cima', () => {
    // flamengo estava em 3º (topo 80) e foi a 1º (topo 0); os dois de cima desceram uma linha cada.
    const antes = mapa({ palmeiras: 0, gremio: 40, flamengo: 80, santos: 120 });
    const depois = mapa({ flamengo: 0, palmeiras: 40, gremio: 80, santos: 120 });
    expect(movimentosDasLinhas(antes, depois)).toEqual([
      { id: 'flamengo', dy: 80, sobe: true },
      { id: 'palmeiras', dy: -40, sobe: false },
      { id: 'gremio', dy: -40, sobe: false },
    ]);
  });

  it('linha parada, nova ou que saiu não anda; menos de meio pixel também não', () => {
    const antes = mapa({ a: 0, b: 40, saiu: 80 });
    const depois = mapa({ a: 0.3, b: 40, nova: 80 });
    expect(movimentosDasLinhas(antes, depois)).toEqual([]);
  });

  it('sem nada antes, nada anda', () => {
    expect(movimentosDasLinhas(new Map(), mapa({ a: 0, b: 40 }))).toEqual([]);
  });
});

describe('contagensDasLinhas', () => {
  it('conta quem mudou de número, mesmo sem mudar de lugar', () => {
    const antes = mapa({ a: 240, b: 228, c: 100 });
    const depois = mapa({ a: 240, b: 260, c: 90, nova: 50 });
    expect(contagensDasLinhas(antes, depois)).toEqual([
      { id: 'b', de: 228, para: 260 },
      { id: 'c', de: 100, para: 90 },
    ]);
  });
});

describe('contagem', () => {
  it('desacelera: 1 - (1 - t)³, preso entre 0 e 1', () => {
    expect(desacelera(0)).toBe(0);
    expect(desacelera(1)).toBe(1);
    expect(desacelera(0.5)).toBeCloseTo(0.875);
    expect(desacelera(-1)).toBe(0);
    expect(desacelera(2)).toBe(1);
  });

  it('vai do antigo ao novo em 700 ms, mais rápido no começo, e termina exato', () => {
    const c = { de: 100, para: 200 };
    expect(valorNaContagem(c, 0)).toBe(100);
    expect(valorNaContagem(c, 350)).toBe(188); // metade do tempo, 87,5% do caminho
    expect(valorNaContagem(c, 699)).toBe(200);
    expect(valorNaContagem(c, 700)).toBe(200);
    expect(valorNaContagem(c, 5000)).toBe(200);
  });

  it('conta para baixo também, sempre em inteiro', () => {
    const c = { de: 1000, para: 950 };
    const passos = [0, 100, 200, 300, 400, 500, 600, 700].map((ms) => valorNaContagem(c, ms));
    expect(passos[0]).toBe(1000);
    expect(passos.at(-1)).toBe(950);
    passos.forEach((v) => expect(Number.isInteger(v)).toBe(true));
    for (let i = 1; i < passos.length; i++) expect(passos[i]).toBeLessThanOrEqual(passos[i - 1]);
  });
});
