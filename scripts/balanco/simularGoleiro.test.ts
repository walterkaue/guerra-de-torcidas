import { describe, expect, it } from 'vitest';
import { CONFERENCIA, chanceDeGol, cobrancasDasPartidas, igual, simular } from './simularGoleiro.mjs';

describe('calibragem do goleiro com alcance', () => {
  it('os pontos de conferência do motor 2 ficam a 1 ponto do alvo (bola exata, dificuldade 0,5)', () => {
    for (const c of CONFERENCIA) expect(Math.abs(chanceDeGol(c, { amostras: 100_000 }) - c.alvo), c.nome).toBeLessThan(1);
  });

  it('conta as cavadinhas antes de cada cobrança, partida por partida', () => {
    const cav = { dir: 0, forca: 15, efeito: 0 };
    const normal = { dir: 70, forca: 70, efeito: 0 };
    const lista = cobrancasDasPartidas([
      { dificuldade: 0.5, cobrancas: [cav, normal, cav] },
      { dificuldade: 1, cobrancas: [cav] },
    ]);
    expect(lista.map((c) => [c.i, c.antes, c.dificuldade])).toEqual([[0, 0, 0.5], [1, 1, 0.5], [2, 1, 0.5], [0, 0, 1]]);
  });

  it('dias iguais joga cada cobrança nos 7 dias; o motor 2 dá mais gol que o motor 1 em chute colocado', () => {
    const r = simular(cobrancasDasPartidas([{ dificuldade: 0, cobrancas: [{ dir: 50, forca: 65, efeito: 0 }] }]), { amostras: 300 });
    expect(r.total.n).toBe(7 * 300);
    expect(r.porDia.every((d) => d.n === 300)).toBe(true);
    expect(r.total.gols2).toBeGreaterThan(r.total.gols1);
  });

  it('compara o resultado refeito com o guardado sem ligar para a ordem das chaves', () => {
    expect(igual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(igual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(igual({ a: 1 }, { a: 2 })).toBe(false);
    expect(igual([1, 2], [1, 2, 3])).toBe(false);
  });
});
