import { describe, expect, it } from 'vitest';
import { lerTodas } from '../../scripts/disputas/catalogo.mjs';
import { lerTodos } from '../../scripts/lances/catalogo.mjs';
import { contraAdversario } from './adversarios';
import { coresDoAdversario, roupaDoBatedorGoleiro } from './coresDosLances';

describe('cores dos lances', () => {
  it('todo adversário dos catálogos, rascunho inclusive, tem cores', () => {
    const sem = [...lerTodos(), ...lerTodas()].filter((l: { adversario: string }) => !coresDoAdversario(l.adversario));
    expect(sem.map((l: { id: string; adversario: string }) => `${l.id}: ${l.adversario}`)).toEqual([]);
  });

  it('o artigo acerta clube, seleção e adversário de fora', () => {
    expect(contraAdversario('Itália')).toBe('contra a Itália');
    expect(contraAdversario('Junior Barranquilla')).toBe('contra o Junior Barranquilla');
    expect(contraAdversario('Chapecoense')).toBe('contra a Chapecoense');
  });

  it('clube do jogo vem de times.ts; desconhecido joga de máquina', () => {
    expect(coresDoAdversario('Corinthians')).toEqual(['#111111', '#ffffff']);
    expect(coresDoAdversario('Time Inventado')).toBeNull();
  });

  it('só o lance do goleiro leva o batedor de goleiro', () => {
    expect(roupaDoBatedorGoleiro('sao-paulo-2011-gol-100')).toMatchObject({ camisa: '#d9a520', calcao: '#111111', meiao: '#ffffff' });
    expect(roupaDoBatedorGoleiro('selecao-2002-falta-de-shizuoka')).toBeNull();
  });
});
