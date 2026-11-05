import { describe, expect, it } from 'vitest';
import { TABELA_LANCES_UNIFICADA } from './lances';
import { PONTOS_UNIFICADOS } from './penaltis';
import { notaDosLances, notaDosPenaltis, pontosDosLances, pontosDosPenaltis, textoDasMedalhasDosPenaltis } from './regrasUnificadas';

describe('regras unificadas', () => {
  it('a tabela dos pênaltis sai da tabela do código', () => {
    const t = Object.fromEntries(pontosDosPenaltis());
    expect(t['Gol']).toBe(String(PONTOS_UNIFICADOS.gol));
    expect(t['Defesa']).toBe(String(PONTOS_UNIFICADOS.defesa));
    expect(t['Vitória na disputa']).toBe(`+${PONTOS_UNIFICADOS.vitoria}`);
  });
  it('a tabela dos lances traz 24, 30, 36, 42 e +8', () => {
    expect(pontosDosLances().map(([, v]) => v)).toEqual(['24', '30', '36', '42', '+8']);
    expect(pontosDosLances().map(([, v]) => v)).toEqual([
      ...Object.values(TABELA_LANCES_UNIFICADA.faixa).map(String),
      `+${TABELA_LANCES_UNIFICADA.recriou}`,
    ]);
  });
  it('as notas falam do teto 150, das 10 partidas e das 3 melhores', () => {
    for (const n of [notaDosPenaltis(), notaDosLances()]) {
      expect(n).toContain('150');
      expect(n).toContain('10 partidas valendo');
      expect(n).toContain('3 melhores');
    }
  });
  it('medalhas dos pênaltis: 10 · 50 · 100 gols, ouro com 10 vitórias', () => {
    expect(textoDasMedalhasDosPenaltis()).toContain('10 · 50 · 100 gols, ouro com 10 vitórias');
  });
});
