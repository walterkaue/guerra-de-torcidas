import { describe, expect, it } from 'vitest';
import { ENQUADRAMENTOS, cameraAtrasDaBola, cameraDoReplay } from './camera';

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

describe('câmera do replay (atrás do gol)', () => {
  // Pênalti, falta pela direita e pela esquerda, cara a cara; bola entrando nos dois cantos de cima.
  const lances = [
    { x: 0, z: 11 },
    { x: 6, z: 24 },
    { x: -7, z: 22 },
    { x: 3, z: 8 },
  ];
  for (const bola of lances) {
    for (const canto of [-0.85, 0.85]) {
      it(`bola em (${bola.x}, ${bola.z}) entrando em x = ${canto}: o canto e a bola ficam no quadro`, () => {
        const cam = cameraDoReplay(bola, canto * 3.66, W, H);
        const fim = cam.projetar({ x: canto * 3.66, y: 0.85 * 2.44, z: 0 });
        const inicio = cam.projetar({ x: bola.x, y: 0, z: bola.z });
        for (const q of [fim, inicio]) {
          expect(q.prof).toBeGreaterThan(0);
          expect(q.x).toBeGreaterThan(0);
          expect(q.x).toBeLessThan(W);
          expect(q.y).toBeGreaterThan(0);
          expect(q.y).toBeLessThan(H);
        }
        // De trás do gol, o gol fica embaixo e a bola mais para cima.
        expect(fim.y).toBeGreaterThan(inicio.y);
      });
    }
  }

  it('vê o lado de cá do campo espelhado: a trave da direita de quem bate fica à esquerda da tela', () => {
    const cam = cameraDoReplay({ x: 0, z: 11 }, 0, W, H);
    expect(cam.projetar({ x: 3.66, y: 0, z: 0 }).x).toBeLessThan(cam.projetar({ x: -3.66, y: 0, z: 0 }).x);
  });
});

