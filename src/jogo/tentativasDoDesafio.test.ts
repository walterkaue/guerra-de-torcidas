import { describe, expect, it } from 'vitest';
import { tentativasDoResumo } from './tentativasDoDesafio';

const boa = (extra: Record<string, unknown> = {}) => ({
  desfecho: 'gol',
  pontos: 50,
  recriou: true,
  cavadinha: false,
  x: 0.512,
  y: 0.81,
  goleiroX: -0.2,
  tFim: 1,
  gesto: { dir: 40, forca: 70, efeito: -10 },
  ...extra,
});
const defesa = boa({ desfecho: 'defesa', pontos: 0, recriou: false, tFim: 0.62 });

describe('tentativasDoResumo', () => {
  it('as 3 tentativas, na ordem, só com os campos da lista', () => {
    const t = tentativasDoResumo([boa(), defesa, boa({ semente: 1, lanceId: 'x', gesto: { dir: 1, forca: 2, efeito: 3, extra: 9 } })]);
    expect(t).toHaveLength(3);
    expect(t![1].desfecho).toBe('defesa');
    expect(Object.keys(t![2]).sort()).toEqual(['cavadinha', 'desfecho', 'gesto', 'goleiroX', 'pontos', 'recriou', 'tFim', 'x', 'y']);
    expect(t![2].gesto).toEqual({ dir: 1, forca: 2, efeito: 3 });
  });

  it.each([
    ['nada', null],
    ['servidor antigo', undefined],
    ['não é lista', { 0: boa() }],
    ['menos de 3', [boa(), defesa]],
    ['mais de 3', [boa(), defesa, boa(), boa()]],
    ['desfecho fora da lista', [boa({ desfecho: 'golaço' }), defesa, defesa]],
    ['pontos quebrados', [boa({ pontos: 4.5 }), defesa, defesa]],
    ['pontos negativos', [boa({ pontos: -1 }), defesa, defesa]],
    ['número como texto', [boa({ x: '0.5' }), defesa, defesa]],
    ['NaN', [boa({ y: Number.NaN }), defesa, defesa]],
    ['tFim fora de 0 a 1', [boa({ tFim: 1.2 }), defesa, defesa]],
    ['sem gesto', [boa({ gesto: null }), defesa, defesa]],
    ['gesto quebrado', [boa({ gesto: { dir: 1.5, forca: 2, efeito: 3 } }), defesa, defesa]],
    ['gesto fora da faixa', [boa({ gesto: { dir: 101, forca: 2, efeito: 3 } }), defesa, defesa]],
    ['campo nulo (formato torto no banco)', [boa({ recriou: null }), defesa, defesa]],
    ['defesa com pontos', [boa(), boa({ desfecho: 'defesa', recriou: false }), defesa]],
    ['carimbou sem gol', [boa(), boa({ desfecho: 'fora', pontos: 0 }), defesa]],
  ])('descarta a lista: %s', (_, bruto) => {
    expect(tentativasDoResumo(bruto)).toBeNull();
  });
});
