import { describe, expect, it } from 'vitest';
import { ENQUADRAMENTOS, cameraAtrasDaBola } from './camera';

const W = 390;
const H = 844;

/** Largura do gol na tela (fração da tela) e altura da bola (fração), para um lance. */
function medidas(bola: { x: number; z: number }, e: (typeof ENQUADRAMENTOS)[keyof typeof ENQUADRAMENTOS]) {
  const cam = cameraAtrasDaBola(bola, e, W, H);
  const esq = cam.projetar({ x: -3.66, y: 0, z: 0 });
  const dir = cam.projetar({ x: 3.66, y: 0, z: 0 });
  const b = cam.projetar({ x: bola.x, y: 0, z: bola.z });
  return { gol: Math.abs(dir.x - esq.x) / W, bolaY: b.y / H, golY: esq.y / H, bolaX: b.x / W, cam };
}

describe('câmera dos Lances', () => {
  it('três distâncias: o gol encolhe do pênalti para o cara a cara e para a falta', () => {
    const pen = medidas({ x: 0, z: 11 }, ENQUADRAMENTOS.penalti);
    const cara = medidas({ x: -4, z: 12 }, ENQUADRAMENTOS.caraACara);
    const falta = medidas({ x: 8, z: 24 }, ENQUADRAMENTOS.falta);
    expect(pen.gol).toBeCloseTo(0.78, 1);
    expect(cara.gol).toBeCloseTo(0.6, 1);
    expect(falta.gol).toBeCloseTo(0.42, 1);
    expect(pen.gol).toBeGreaterThan(cara.gol);
    expect(cara.gol).toBeGreaterThan(falta.gol);
  });

  it('a bola fica embaixo, no meio, e o gol no alto', () => {
    for (const [bola, e] of [
      [{ x: 0, z: 11 }, ENQUADRAMENTOS.penalti],
      [{ x: -4, z: 12 }, ENQUADRAMENTOS.caraACara],
      [{ x: 8, z: 24 }, ENQUADRAMENTOS.falta],
      [{ x: 16, z: 33 }, ENQUADRAMENTOS.falta],
    ] as const) {
      const m = medidas(bola, e);
      expect(m.bolaY).toBeGreaterThan(0.7);
      expect(m.bolaY).toBeLessThan(0.9);
      expect(m.bolaX).toBeCloseTo(0.5, 1);
      expect(m.golY).toBeLessThan(m.bolaY);
      expect(m.golY).toBeGreaterThan(0.2);
    }
  });

  it('a câmera fica atrás da bola, na reta do gol', () => {
    const { cam } = medidas({ x: 8, z: 24 }, ENQUADRAMENTOS.falta);
    expect(cam.pos.z).toBeGreaterThan(24);
    // Mesma direção da reta gol → bola (x/z constante).
    expect(cam.pos.x / cam.pos.z).toBeCloseTo(8 / 24, 9);
  });

  it('ponto atrás da câmera vem com profundidade negativa (o desenho pula)', () => {
    const { cam } = medidas({ x: 0, z: 11 }, ENQUADRAMENTOS.penalti);
    expect(cam.projetar({ x: 0, y: 0, z: 40 }).prof).toBeLessThan(0);
  });
});
