import { describe, expect, it } from 'vitest';
import {
  DPR_MIN,
  PIXELS_MAX,
  PROPORCAO_DO_CAMPO,
  celularDeitado,
  criarRelogioPausavel,
  dprDoCanvas,
  larguraDoCampo,
} from './telaDaPartida';

describe('celularDeitado', () => {
  it('pede para virar no celular deitado', () => {
    expect(celularDeitado({ largura: 873, altura: 393, toque: true })).toBe(true);
    expect(celularDeitado({ largura: 740, altura: 360, toque: true })).toBe(true);
    expect(celularDeitado({ largura: 932, altura: 430, toque: true })).toBe(true);
  });

  it('não pede no celular em pé', () => {
    expect(celularDeitado({ largura: 393, altura: 873, toque: true })).toBe(false);
    expect(celularDeitado({ largura: 360, altura: 740, toque: true })).toBe(false);
  });

  it('não vale para tablet nem dobrável aberto deitados', () => {
    expect(celularDeitado({ largura: 1080, altura: 810, toque: true })).toBe(false);
    expect(celularDeitado({ largura: 1104, altura: 884, toque: true })).toBe(false);
  });

  it('não vale para computador, nem com a janela baixa', () => {
    expect(celularDeitado({ largura: 1366, altura: 768, toque: false })).toBe(false);
    expect(celularDeitado({ largura: 900, altura: 480, toque: false })).toBe(false);
  });

  it('quadrado não é deitado', () => {
    expect(celularDeitado({ largura: 400, altura: 400, toque: true })).toBe(false);
  });
});

describe('larguraDoCampo', () => {
  it('no celular em pé é a largura do canvas (nada muda)', () => {
    expect(larguraDoCampo(390, 784)).toBe(390);
    expect(larguraDoCampo(360, 678)).toBe(360);
    // O mais baixo dos comuns: 360 × 640 com o placar (canvas ~578).
    expect(larguraDoCampo(360, 578)).toBe(360);
  });

  it('na tela grande cresce pela altura, não pela largura', () => {
    expect(larguraDoCampo(1080, 1080)).toBeCloseTo(1080 * PROPORCAO_DO_CAMPO);
    expect(larguraDoCampo(768, 768)).toBeCloseTo(768 * PROPORCAO_DO_CAMPO);
    // Maior que a coluna antiga de 520 px no computador de 1920 × 1080.
    expect(larguraDoCampo(1080, 1080)).toBeGreaterThan(520);
  });

  it('o iPad em pé também é limitado pela altura, e cabe na largura', () => {
    expect(larguraDoCampo(810, 1080)).toBeCloseTo(1080 * PROPORCAO_DO_CAMPO);
    expect(larguraDoCampo(810, 1080)).toBeLessThanOrEqual(810);
  });

  it('nunca negativa', () => {
    expect(larguraDoCampo(0, 0)).toBe(0);
  });
});

describe('dprDoCanvas', () => {
  it('no celular em pé o teto de pixels não pesa', () => {
    expect(dprDoCanvas(390, 784, 3, 2, PIXELS_MAX.alta)).toBe(2);
    expect(dprDoCanvas(390, 784, 3, 1.5, PIXELS_MAX.media)).toBe(1.5);
    expect(dprDoCanvas(390, 784, 3, 1, PIXELS_MAX.leve)).toBe(1);
  });

  it('segura o canvas grande pelo teto do nível', () => {
    const d = dprDoCanvas(1440, 1440, 2, 2, PIXELS_MAX.alta);
    expect(d).toBeLessThan(2);
    expect(1440 * 1440 * d * d).toBeLessThanOrEqual(PIXELS_MAX.alta + 1);
    const leve = dprDoCanvas(1080, 1080, 1, 1, PIXELS_MAX.leve);
    expect(1080 * 1080 * leve * leve).toBeLessThanOrEqual(PIXELS_MAX.leve + 1);
  });

  it('não desce além do mínimo', () => {
    expect(dprDoCanvas(4000, 4000, 1, 1, PIXELS_MAX.leve)).toBe(DPR_MIN);
  });

  it('canvas ainda sem tamanho fica com o dpr do nível', () => {
    expect(dprDoCanvas(0, 0, 2, 1.5, PIXELS_MAX.media)).toBe(1.5);
  });
});

describe('criarRelogioPausavel', () => {
  it('anda junto com o relógio de verdade', () => {
    let t = 1000;
    const r = criarRelogioPausavel(() => t);
    expect(r.agora()).toBe(1000);
    t = 1500;
    expect(r.agora()).toBe(1500);
  });

  it('parado não anda e, ao voltar, segue de onde parou', () => {
    let t = 0;
    const r = criarRelogioPausavel(() => t);
    t = 300;
    r.pausar();
    expect(r.pausado()).toBe(true);
    t = 5300;
    expect(r.agora()).toBe(300);
    r.retomar();
    expect(r.pausado()).toBe(false);
    expect(r.agora()).toBe(300);
    t = 5400;
    expect(r.agora()).toBe(400);
  });

  it('pausar ou retomar duas vezes não estraga a conta', () => {
    let t = 0;
    const r = criarRelogioPausavel(() => t);
    r.pausar();
    t = 100;
    r.pausar();
    t = 200;
    r.retomar();
    r.retomar();
    t = 250;
    expect(r.agora()).toBe(50);
  });

  it('a janela da defesa não fecha enquanto está pausado', () => {
    // Defesa: o chute sai em inicio + corrida + janela; a pausa no meio adia o chute pelo tempo parado.
    let t = 0;
    const r = criarRelogioPausavel(() => t);
    const inicio = r.agora();
    const prazo = 900 + 1200;
    t = 1000;
    r.pausar();
    t = 60_000;
    expect(r.agora() - inicio).toBeLessThan(prazo);
    r.retomar();
    t = 60_000 + 1099;
    expect(r.agora() - inicio).toBeLessThan(prazo);
    t = 60_000 + 1100;
    expect(r.agora() - inicio).toBe(prazo);
  });
});
