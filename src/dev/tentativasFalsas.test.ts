import { describe, expect, it } from 'vitest';
import { LANCES } from '../dados/lances';
import { comTentativasFalsas } from './tentativasFalsas';

const resumo = { pontos: 96, gols: 3, recriados: 1, faixa: 'dificil' };

describe('tentativas falsas do desafio dos Lances (só desenvolvimento)', () => {
  it.each(LANCES.slice(0, 6).map((l) => [l.id, l] as const))('%s: gol carimbando, defesa e gol, com os pontos do total', (_, l) => {
    const r = comTentativasFalsas(resumo, l, new URLSearchParams());
    expect(r.tentativas!.map((t) => t.desfecho)).toEqual(['gol', 'defesa', 'gol']);
    expect(r.tentativas!.map((t) => t.recriou)).toEqual([true, false, false]);
    expect(r.pontos).toBe(r.tentativas!.reduce((s, t) => s + t.pontos, 0));
    expect([r.gols, r.recriados]).toEqual([2, 1]);
  });

  it('sem gols e sem tentativas', () => {
    const sem = comTentativasFalsas(resumo, LANCES[0], new URLSearchParams('x1SemGols'));
    expect(sem.tentativas!.every((t) => t.desfecho !== 'gol')).toBe(true);
    expect(sem.pontos).toBe(0);
    expect(comTentativasFalsas(resumo, LANCES[0], new URLSearchParams('x1SemTentativas')).tentativas).toBeNull();
  });
});
