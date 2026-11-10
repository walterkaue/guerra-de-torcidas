import { describe, expect, it, vi } from 'vitest';

vi.mock('../estado', () => ({ prefs: { get: () => ({ mudo: true }) } }));

import { APITO, FINAL, latenciaDoSom, somApito, somChute, somLargada, variar } from './som';
import { PADROES } from '../telas/toque';

const DOIS_SEMITONS = 2 ** (-2 / 12);

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
      somLargada();
      somChute();
    }).not.toThrow();
  });
  it('sem contexto de áudio a latência é 0', () => {
    expect(latenciaDoSom()).toBe(0);
  });
});

describe('apito', () => {
  it('fica 2 semitons abaixo do apito antigo', () => {
    expect(Math.abs(APITO.freq - 2900 * DOIS_SEMITONS)).toBeLessThan(0.1);
    expect(Math.abs(APITO.trinado - 28 * DOIS_SEMITONS)).toBeLessThan(0.05);
    expect(Math.abs(APITO.desvio - 180 * DOIS_SEMITONS)).toBeLessThan(0.05);
    expect(Math.abs(APITO.curto - 0.35 / DOIS_SEMITONS)).toBeLessThan(0.005);
  });
  it('o final tem três sopros, o último o mais longo, e acaba em 1,5 s', () => {
    expect(FINAL).toHaveLength(3);
    const [a, b, c] = FINAL;
    expect(c[1]).toBeGreaterThan(a[1]);
    expect(c[1]).toBeGreaterThan(b[1]);
    expect(c[0] + c[1]).toBeCloseTo(1.5);
  });
  it('a largada é mais baixa que o apito', () => {
    expect(APITO.volLargada).toBeLessThan(APITO.vol);
  });
});

describe('vibração', () => {
  it('nenhum padrão passa de 200 ms vibrando somados', () => {
    for (const p of Object.values(PADROES)) {
      const v = typeof p === 'number' ? p : p.filter((_, i) => i % 2 === 0).reduce((s, x) => s + x, 0);
      expect(v).toBeLessThanOrEqual(200);
    }
  });
  it('o apito final vibra 110 ms em 0,66 s', () => {
    const p = PADROES.apitoFinal as number[];
    expect(p.filter((_, i) => i % 2 === 0).reduce((s, x) => s + x, 0)).toBe(110);
    expect(p.reduce((s, x) => s + x, 0)).toBe(660);
  });
});
