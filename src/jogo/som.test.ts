import { describe, expect, it, vi } from 'vitest';

vi.mock('../estado', () => ({ prefs: { get: () => ({ mudo: true }) } }));

import { somApito, somChute, variar } from './som';

describe('variar', () => {
  it('fica dentro de ±10% e cobre os extremos', () => {
    expect(variar(1000, 0.1, 0)).toBeCloseTo(900);
    expect(variar(1000, 0.1, 0.5)).toBeCloseTo(1000);
    expect(variar(1000, 0.1, 1)).toBeCloseTo(1100);
    for (let i = 0; i < 100; i++) {
      const v = variar(1000);
      expect(v).toBeGreaterThanOrEqual(900);
      expect(v).toBeLessThanOrEqual(1100);
    }
  });
});

describe('mudo', () => {
  it('não toca nem falha com o som desligado', () => {
    expect(() => {
      somApito();
      somApito(true);
      somChute();
    }).not.toThrow();
  });
});
