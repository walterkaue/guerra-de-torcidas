import { describe, expect, it } from 'vitest';
import { lerTodos } from '../../scripts/lances/catalogo.mjs';
import { batedorDeGoleiro, coresDoAdversario } from './coresDosLances';

describe('cores dos lances', () => {
  it('todo adversário do catálogo, rascunho inclusive, tem cores', () => {
    const sem = lerTodos().filter((l: { adversario: string }) => !coresDoAdversario(l.adversario));
    expect(sem.map((l: { id: string; adversario: string }) => `${l.id}: ${l.adversario}`)).toEqual([]);
  });

  it('clube do jogo vem de times.ts; desconhecido joga de máquina', () => {
    expect(coresDoAdversario('Corinthians')).toEqual(['#111111', '#ffffff']);
    expect(coresDoAdversario('Time Inventado')).toBeNull();
  });

  it('só o lance do goleiro leva o batedor de goleiro', () => {
    expect(batedorDeGoleiro('sao-paulo-2011-gol-100')).toBe(true);
    expect(batedorDeGoleiro('selecao-2002-falta-de-shizuoka')).toBe(false);
  });
});
