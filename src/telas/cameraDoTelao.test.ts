import { describe, expect, it } from 'vitest';
import { LANCES } from '../dados/lances';
import { ALTURA_GOL, FUNDO_REDE, MEIA_GOL, posicaoDoBatedor, posicoesDaBarreira, type Camera, type Ponto3 } from './camera';
import { MARGEM_DO_TELAO, cameraDoTelao, margemAntesDoZoom, type GolNoTelao } from './cameraDoTelao';
import { ZOOM_FINAL } from './replay';

// O telão do convite (docs/visual.md, "Telão do desafio dos Lances"): o lance inteiro cabe no quadro, com margem de
// 6% em cada lado, mesmo depois do zoom final do replay. Os quadros: 4:3 a 360 de largura, 5:4, o 390 × 844 de hoje e
// os baixos, quando o convite encolhe o quadro para as faixas de time caberem (360 × 740, 375 × 667 e o piso de 0,36).
const QUADROS = [
  [296, 222],
  [326, 261],
  [326, 249],
  [296, 145],
  [311, 112],
  [326, 117],
] as const;

/** Onde o goleiro começa, como telas/elencoDoLance.ts (`posicaoDoGoleiro`). */
function goleiro(l: (typeof LANCES)[number], x0: number) {
  const d = Math.hypot(l.bola.x, l.bola.z);
  const saida = l.goleiroSaida ?? 0.3;
  const gx = x0 * 3.66;
  return { x: gx + (l.bola.x - gx) * (saida / d), z: l.bola.z * (saida / d) };
}

/** Um retângulo na tela (px): o ponto projetado e quanto o desenho passa dele, em metros na escala daquela profundidade. */
function naTela(cam: Camera, p: Ponto3, lado = 0, cima = 0, baixo = 0) {
  const q = cam.projetar(p);
  expect(q.prof).toBeGreaterThan(1);
  return { x0: q.x - lado * q.escala, x1: q.x + lado * q.escala, y0: q.y - cima * q.escala, y1: q.y + baixo * q.escala };
}

/** O zoom final do replay fecha em volta do centro do quadro. */
const comZoom = (v: number, centro: number) => centro + (v - centro) * ZOOM_FINAL;

describe('câmera do telão', () => {
  for (const [W, H] of QUADROS) {
    it(`${W} × ${H}: bola, batedor, barreira, traves, chão do gol e goleiro dentro, com 6% de margem, em todo o catálogo`, () => {
      const margemX = W * MARGEM_DO_TELAO - 0.5;
      const margemY = H * MARGEM_DO_TELAO - 0.5;
      for (const l of LANCES) {
        for (const fimX of [-3.4, 0, 3.4]) {
          for (const fimY of [0.2, 2.2]) {
            const g: GolNoTelao = { bola: l.bola, barreira: l.barreira, goleiro: goleiro(l, l.goleiroX ?? 0), fim: { x: fimX, y: fimY }, alcance: 0.55 };
            const cam = cameraDoTelao(g, W, H, margemAntesDoZoom(ZOOM_FINAL));
            const caixas = [
              // A bola parada (desenhada 2,2 vezes maior).
              naTela(cam, { x: l.bola.x, y: 0.11, z: l.bola.z }, 0.25, 0.25, 0.25),
              // O batedor inteiro, da cabeça ao pé, com os braços da comemoração (2,2 m) e a perna do chute.
              ...[0, 1].map((a) => {
                const q = posicaoDoBatedor(l.bola, a);
                return naTela(cam, { x: q.x, y: 0, z: q.z }, 0.9, 2.25, 0.05);
              }),
              // A barreira.
              ...(l.barreira ? posicoesDaBarreira(l.bola, l.barreira) : []).map((q) => naTela(cam, { x: q.x, y: 0, z: q.z }, 0.5, 2, 0.05)),
              // As duas traves e o chão do gol, até o fundo da rede.
              ...[-MEIA_GOL, MEIA_GOL].flatMap((x) => [
                naTela(cam, { x, y: 0, z: 0 }),
                naTela(cam, { x, y: ALTURA_GOL, z: 0 }),
                naTela(cam, { x, y: 0, z: FUNDO_REDE }),
              ]),
              // O goleiro de pé.
              naTela(cam, { x: g.goleiro.x, y: 0.975, z: g.goleiro.z }, 1.2, 1.2, 0.98),
            ];
            for (const c of caixas) {
              const ctx = `${l.id}, bola em ${fimX}/${fimY}`;
              expect(comZoom(c.x0, W / 2), ctx).toBeGreaterThanOrEqual(margemX);
              expect(comZoom(c.x1, W / 2), ctx).toBeLessThanOrEqual(W - margemX);
              expect(comZoom(c.y0, H / 2), ctx).toBeGreaterThanOrEqual(margemY);
              expect(comZoom(c.y1, H / 2), ctx).toBeLessThanOrEqual(H - margemY);
            }
          }
        }
      }
    });
  }

  it('sem o zoom final (qualidade sem zoom ou quadro parado), a margem é a mesma', () => {
    const l = LANCES.find((o) => o.tipo === 'falta')!;
    const g: GolNoTelao = { bola: l.bola, barreira: l.barreira, goleiro: goleiro(l, 0), fim: { x: 2, y: 1 }, alcance: 0.55 };
    const cam = cameraDoTelao(g, 296, 222);
    const trave = cam.projetar({ x: MEIA_GOL, y: ALTURA_GOL, z: 0 });
    expect(trave.x).toBeGreaterThan(296 * 0.06 - 0.5);
    expect(margemAntesDoZoom(1)).toBeCloseTo(MARGEM_DO_TELAO);
    expect(margemAntesDoZoom(ZOOM_FINAL)).toBeCloseTo(0.1);
  });

  it('o gol não fica minúsculo: pelo menos um terço da largura do quadro em todo o catálogo', () => {
    for (const l of LANCES) {
      const g: GolNoTelao = { bola: l.bola, barreira: l.barreira, goleiro: goleiro(l, l.goleiroX ?? 0), fim: { x: 0, y: 1 }, alcance: 0.55 };
      const cam = cameraDoTelao(g, 296, 222, margemAntesDoZoom(ZOOM_FINAL));
      const largura = Math.abs(cam.projetar({ x: MEIA_GOL, y: 0, z: 0 }).x - cam.projetar({ x: -MEIA_GOL, y: 0, z: 0 }).x);
      expect(largura, l.id).toBeGreaterThan(296 / 3);
    }
  });
});
