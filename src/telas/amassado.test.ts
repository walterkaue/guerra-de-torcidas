import { describe, expect, it } from 'vitest';
import { DUR_AMASSADO, FORCA_LUVA, FORCA_REDE, amassadoDoImpacto, anguloDaChegada, mola } from './amassado';

describe('bola que amassa na rede e na luva', () => {
  it('no contato vale 1 - força (rede 0,5; luva 0,4)', () => {
    expect(amassadoDoImpacto(0, FORCA_REDE)).toBeCloseTo(0.5);
    expect(amassadoDoImpacto(0, FORCA_LUVA)).toBeCloseTo(0.6);
  });

  it('volta ao redondo em 260 ms, passando um pouco do ponto', () => {
    expect(DUR_AMASSADO).toBe(260);
    const valores = Array.from({ length: 260 }, (_, ms) => amassadoDoImpacto(ms, FORCA_REDE));
    const maior = Math.max(...valores);
    expect(maior).toBeGreaterThan(1);
    expect(maior).toBeLessThan(1.1);
    // Começa amassada e sobe: no meio do caminho já passou de 0,9.
    expect(amassadoDoImpacto(60, FORCA_REDE)).toBeGreaterThan(amassadoDoImpacto(0, FORCA_REDE));
    expect(Math.abs(amassadoDoImpacto(259, FORCA_REDE) - 1)).toBeLessThan(0.01);
  });

  it('antes do contato, depois dos 260 ms e sem força, fica redonda', () => {
    expect(amassadoDoImpacto(-1, FORCA_REDE)).toBe(1);
    expect(amassadoDoImpacto(260, FORCA_REDE)).toBe(1);
    expect(amassadoDoImpacto(5000, FORCA_LUVA)).toBe(1);
    expect(amassadoDoImpacto(30, 0)).toBe(1);
    expect(amassadoDoImpacto(Number.NaN, FORCA_REDE)).toBe(1);
  });

  it('usa a mesma mola dos pops (0 → 1)', () => {
    expect(mola(0)).toBe(0);
    expect(mola(1)).toBe(1);
    expect(amassadoDoImpacto(130, 0.5)).toBeCloseTo(0.5 + 0.5 * mola(0.5));
  });

  it('o ângulo da chegada segue o último trecho do voo na tela', () => {
    expect(anguloDaChegada({ x: 0, y: 10 }, { x: 0, y: 0 })).toBeCloseTo(-Math.PI / 2);
    expect(anguloDaChegada({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(0);
    expect(anguloDaChegada({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
  });
});
