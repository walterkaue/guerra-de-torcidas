import { describe, expect, it } from 'vitest';
import {
  GEOMETRIA,
  GOLEIRO,
  INDICE,
  POSES_DE_FRENTE,
  POSES_DO_BATEDOR,
  amostrar,
  contornoDaCabeca,
  contornoDaCoxa,
  escalaDoOsso,
  ladoDaSombra,
  medidasDaCamisa,
  montarCalcao,
  novaPose,
  poseAjeitando,
  poseChute,
  poseChuteMaquina,
  poseComemora,
  poseCorrida,
  poseEspera,
  poseGoleiroEsperando,
  poseLamenta,
  poseParado,
  resolverPose,
  tracoDaCamisa,
  tracoDaDobra,
  tracoDaLuz,
  tracoDaSombra,
  yDaBainha,
  type BarraDaCamisa,
  type MedidasDaCamisa,
  type Pose,
} from './bonecos';

// Regra do H03: o calção e a coxa nunca aparecem acima da barra da camisa por fora, e a sombra, a luz e a dobra da
// camisa são pedaços exatos dela (nada para fora). Só geometria: nenhum canvas.

const { TRONCO, COXA } = GEOMETRIA;
const { TR, TRK, OMK, PNE, PND } = INDICE;
const CORPOS = [false, true] as const;
const BARRAS: BarraDaCamisa[] = ['fora', 'dentro'];

// ---------- geometria de polígonos ----------

type Pt = readonly [number, number];

/** Pontos de um contorno com as arestas retas divididas, para não perder um vértice entre dois pontos longe. */
function densificar(pts: readonly number[], passos = 8): Pt[] {
  const r: Pt[] = [];
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    for (let k = 0; k < passos; k++) {
      const t = k / passos;
      r.push([pts[2 * i] + (pts[2 * j] - pts[2 * i]) * t, pts[2 * i + 1] + (pts[2 * j + 1] - pts[2 * i + 1]) * t]);
    }
  }
  return r;
}

function dentroDoPoligono(x: number, y: number, poli: readonly number[]): boolean {
  let dentro = false;
  const n = poli.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poli[2 * i];
    const yi = poli[2 * i + 1];
    const xj = poli[2 * j];
    const yj = poli[2 * j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function distanciaDaBorda(x: number, y: number, poli: readonly number[]): number {
  let menor = Infinity;
  const n = poli.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = poli[2 * i];
    const ay = poli[2 * i + 1];
    const bx = poli[2 * j];
    const by = poli[2 * j + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx * dx + dy * dy === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    menor = Math.min(menor, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return menor;
}

/** Menor e maior x de um polígono na altura y (null se o polígono não chega lá). */
function extremosEmY(poli: readonly number[], y: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  const n = poli.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const y0 = poli[2 * i + 1];
    const y1 = poli[2 * j + 1];
    if (y0 > y !== y1 > y) {
      const x = poli[2 * i] + ((poli[2 * j] - poli[2 * i]) * (y - y0)) / (y1 - y0);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return lo === Infinity ? null : [lo, hi];
}

/** A camisa em unidades (y de fração do tronco vira unidades), amostrada fino. */
function camisaEmUnidades(m: MedidasDaCamisa): number[] {
  const pts = amostrar(tracoDaCamisa(m), 24);
  for (let i = 1; i < pts.length; i += 2) pts[i] *= TRONCO;
  return pts;
}

const emUnidades = (t: number[]): number[] => {
  const pts = amostrar(t, 16);
  for (let i = 1; i < pts.length; i += 2) pts[i] *= TRONCO;
  return pts;
};

// ---------- pedaços da camisa ficam dentro dela ----------

describe('sombra, luz e dobra da camisa', () => {
  for (const mulher of CORPOS) {
    for (const barra of BARRAS) {
      const m = medidasDaCamisa(mulher, barra);
      const camisa = camisaEmUnidades(m);
      const pedacos: [string, number[]][] = [
        ['sombra', tracoDaSombra(m)],
        ['luz', tracoDaLuz(m)],
        ['dobra', tracoDaDobra(m)],
      ];
      for (const [nome, traco] of pedacos) {
        it(`${nome}: nenhum ponto fora da camisa (${mulher ? 'mulher' : 'homem'}, por ${barra})`, () => {
          const fora: string[] = [];
          for (const [x, y] of densificar(emUnidades(traco))) {
            if (!dentroDoPoligono(x, y, camisa) && distanciaDaBorda(x, y, camisa) > 0.08) fora.push(`(${x.toFixed(2)}, ${y.toFixed(2)})`);
          }
          expect(fora).toEqual([]);
        });
      }
    }
  }

  it('a sombra termina na linha da bainha, não num número fixo', () => {
    for (const mulher of CORPOS) {
      const m = medidasDaCamisa(mulher, 'fora');
      const s = tracoDaSombra(m);
      const xs = m.barra - 4.8;
      // O ponto de baixo da sombra é (x, y da bainha nesse x).
      const pts = amostrar(s, 1);
      const achou = [];
      for (let i = 0; i < pts.length; i += 2) if (Math.abs(pts[i] - xs) < 1e-9) achou.push(pts[i + 1]);
      expect(achou.some((y) => Math.abs(y - yDaBainha(m, xs)) < 1e-9)).toBe(true);
    }
  });
});

// ---------- calção e coxa nunca acima da barra, por fora ----------

/** As poses de uma lista de quadros de animação. */
function quadros(dur: number, passo: number, fn: (ms: number, out: Pose) => Pose): Pose[] {
  const r: Pose[] = [];
  for (let ms = 0; ms <= dur; ms += passo) r.push(fn(ms, novaPose()).slice());
  return r;
}

const POSES: [string, Pose][] = [
  ...Object.entries(POSES_DO_BATEDOR).map(([n, p]) => [`batedor.${n}`, p] as [string, Pose]),
  ...Object.entries(GOLEIRO).map(([n, p]) => [`goleiro.${n}`, p] as [string, Pose]),
  ...Object.entries(POSES_DE_FRENTE).map(([n, p]) => [`frente.${n}`, p] as [string, Pose]),
  ...quadros(760, 20, (ms, o) => poseChute(ms, false, o)).map((p, i) => [`chute.${i * 20}`, p] as [string, Pose]),
  ...quadros(760, 40, (ms, o) => poseChute(ms, true, o)).map((p, i) => [`cavadinha.${i * 40}`, p] as [string, Pose]),
  ...quadros(700, 20, (ms, o) => poseChuteMaquina(ms, o)).map((p, i) => [`chuteMaquina.${i * 20}`, p] as [string, Pose]),
  ...quadros(900, 30, (ms, o) => poseCorrida(ms, 900, o)).map((p, i) => [`corrida.${i * 30}`, p] as [string, Pose]),
  ...quadros(1100, 40, (ms, o) => poseAjeitando(ms, o)).map((p, i) => [`ajeitando.${i * 40}`, p] as [string, Pose]),
  ...quadros(1200, 40, (ms, o) => poseComemora(ms, o)).map((p, i) => [`comemora.${i * 40}`, p] as [string, Pose]),
  ...quadros(1200, 40, (ms, o) => poseLamenta(ms, o)).map((p, i) => [`lamenta.${i * 40}`, p] as [string, Pose]),
  ...quadros(1500, 100, (ms, o) => poseGoleiroEsperando(ms, o)).map((p, i) => [`goleiroEsperando.${i * 100}`, p] as [string, Pose]),
  ...quadros(1500, 250, (ms, o) => poseParado(ms, o)).map((p, i) => [`parado.${i * 250}`, p] as [string, Pose]),
  ...quadros(1500, 250, (ms, o) => poseEspera(ms, o)).map((p, i) => [`espera.${i * 250}`, p] as [string, Pose]),
];

/** O contorno de uma coxa no mundo (relativo à origem do desenho), com a escala e a rotação do osso. */
function coxaNoMundo(j: Float32Array, p: Pose, lado: number): Pt[] {
  const ip = lado ? PND : PNE;
  const hx = j[18 + lado * 2];
  const hy = j[19 + lado * 2];
  const a = p[ip];
  const k = escalaDoOsso(COXA * p[ip + 1], 0.05);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return densificar(contornoDaCoxa(lado), 6).map(([x, y]) => [hx + x * ca + y * k * sa, hy - x * sa + y * k * ca] as Pt);
}

const j = new Float32Array(30);
const buf = new Float64Array(32);

/** Pontos do contorno do calção e das duas coxas no mundo (e, à parte, os pontos de origem da perna, junto ao quadril). */
function silhuetaDaPerna(m: MedidasDaCamisa, p: Pose): { tudo: Pt[]; quadril: Pt[] } {
  resolverPose({ ombro: m.om, quadril: m.quadril, j }, p);
  const n = montarCalcao(j, m, p, buf);
  const poli: number[] = [];
  for (let i = 0; i < n * 2; i += 2) poli.push(buf[i] + j[0], buf[i + 1] + j[1]);
  const coxas = [coxaNoMundo(j, p, 0), coxaNoMundo(j, p, 1)];
  // Os dois cantos de cima do calção, o topo de fora de cada boca e os cantos de cima das duas coxas.
  const quadril: Pt[] = [
    [poli[0], poli[1]],
    [poli[2], poli[3]],
    [poli[2 * n - 4], poli[2 * n - 3]],
    [poli[2 * n - 2], poli[2 * n - 1]],
    ...coxas.flatMap((c) => [c[0], c[c.length - 1]]),
  ];
  return { tudo: [...densificar(poli, 6), ...coxas[0], ...coxas[1]], quadril };
}

/** Um ponto do mundo no quadro da camisa (x em unidades, y em unidades de tronco sem a escala do TRK). */
function noQuadroDaCamisa(x: number, y: number, p: Pose): Pt {
  const vx = x - j[0];
  const vy = y - j[1];
  const ct = Math.cos(p[TR]);
  const st = Math.sin(p[TR]);
  return [(vx * ct + vy * st) / p[OMK], (-vx * st + vy * ct) / p[TRK]];
}

/** Quanto o ponto mais fora fica da camisa, entre os que estão acima da barra (0 se nenhum sai). */
function piorAcimaDaBarra(m: MedidasDaCamisa, camisa: number[], pontos: Pt[], p: Pose): number {
  let pior = 0;
  for (const [wx, wy] of pontos) {
    const [x, y] = noQuadroDaCamisa(wx, wy, p);
    if (y >= yDaBainha(m, x) * TRONCO || dentroDoPoligono(x, y, camisa)) continue;
    pior = Math.max(pior, distanciaDaBorda(x, y, camisa));
  }
  return pior;
}

/**
 * As poses em que a perna fica perto do corpo (de pé, parado ou correndo): aí a regra vale para a perna e o calção
 * inteiros. Perna aberta, joelho dobrado ou pulo (goleiro) fazem a coxa sair pela lateral do quadril, e nenhuma
 * camisa esconde isso; nessas poses a regra vale para os cantos de cima, junto ao quadril.
 */
const POSES_EM_PE = ['frente.parado', 'frente.busto', 'frente.bracos', 'batedor.parado', 'batedor.olhando', 'batedor.espera', 'batedor.apoio', 'batedor.correA', 'batedor.correB', 'batedor.festaA', 'batedor.festaB', 'batedor.lamenta', 'batedor.lamenta2'];

/** Nos cantos de cima, de perna aberta ou não: 0,6 unidade. Na perna inteira, em pé: só a folga da amostragem (0,1). */
const TOLERANCIA = 0.6;
const TOLERANCIA_EM_PE = 0.1;

describe('o calção e a coxa nunca aparecem acima da barra da camisa por fora', () => {
  for (const mulher of CORPOS) {
    const m = medidasDaCamisa(mulher, 'fora');
    const camisa = camisaEmUnidades(m);
    const corpo = mulher ? 'corpo feminino' : 'corpo masculino';

    it(`em todas as poses, os cantos de cima do calção e das coxas ficam sob a camisa (${corpo})`, () => {
      const violacoes: string[] = [];
      for (const [nome, pose] of POSES) {
        const pior = piorAcimaDaBarra(m, camisa, silhuetaDaPerna(m, pose).quadril, pose);
        if (pior > TOLERANCIA) violacoes.push(`${nome}: ${pior.toFixed(2)}`);
      }
      expect(violacoes).toEqual([]);
    });

    it(`nas poses em pé, nada do calção nem da coxa aparece acima da barra (${corpo})`, () => {
      const violacoes: string[] = [];
      let conferidas = 0;
      for (const [nome, pose] of POSES) {
        if (!POSES_EM_PE.includes(nome)) continue;
        conferidas++;
        const pior = piorAcimaDaBarra(m, camisa, silhuetaDaPerna(m, pose).tudo, pose);
        if (pior > TOLERANCIA_EM_PE) violacoes.push(`${nome}: ${pior.toFixed(2)}`);
      }
      expect(conferidas).toBe(POSES_EM_PE.length);
      expect(violacoes).toEqual([]);
    });
  }

  it('em pé, a camisa é pelo menos tão larga quanto o calção em toda altura em que os dois existem acima da barra', () => {
    for (const mulher of CORPOS) {
      const m = medidasDaCamisa(mulher, 'fora');
      const camisa = camisaEmUnidades(m);
      for (const pose of [POSES_DE_FRENTE.parado, POSES_DE_FRENTE.busto, POSES_DE_FRENTE.bracos, POSES_DO_BATEDOR.parado]) {
        resolverPose({ ombro: m.om, quadril: m.quadril, j }, pose);
        const n = montarCalcao(j, m, pose, buf);
        const calcao: number[] = [];
        for (let i = 0; i < n; i++) calcao.push(...noQuadroDaCamisa(buf[2 * i] + j[0], buf[2 * i + 1] + j[1], pose));
        // Da altura do topo do calção até a barra mais alta (nas laterais): a faixa em que a camisa cobre os dois lados.
        const ate = Math.min(yDaBainha(m, -m.barra), yDaBainha(m, m.barra)) * TRONCO;
        for (let y = m.calcao.cantoY + 0.5; y < ate; y += 0.5) {
          const c = extremosEmY(calcao, y);
          const k = extremosEmY(camisa, y);
          if (!c || !k) continue;
          expect(k[0]).toBeLessThanOrEqual(c[0] + TOLERANCIA_EM_PE);
          expect(k[1]).toBeGreaterThanOrEqual(c[1] - TOLERANCIA_EM_PE);
        }
      }
    }
  });

  it('a camisa por dentro fica sob o calção: os cantos de cima do calção cobrem a cintura', () => {
    for (const mulher of CORPOS) {
      const m = medidasDaCamisa(mulher, 'dentro');
      expect(m.quadril + m.calcao.cantoX).toBeGreaterThanOrEqual(m.cintura);
      expect(yDaBainha(m, 0)).toBeCloseTo(-0.02, 6);
    }
  });
});

// ---------- cabeça e lado da sombra ----------

describe('cabeça e lado da sombra dos membros', () => {
  it('a cabeça tem queixo: mais alta que larga, com o ponto mais baixo no meio', () => {
    const pts = contornoDaCabeca();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let xDoFundo = 0;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]);
      maxX = Math.max(maxX, pts[i]);
      minY = Math.min(minY, pts[i + 1]);
      if (pts[i + 1] > maxY) {
        maxY = pts[i + 1];
        xDoFundo = pts[i];
      }
    }
    expect(maxY - minY).toBeGreaterThan(maxX - minX);
    expect(Math.abs(xDoFundo)).toBeLessThan(0.5);
  });

  it('a luz vem do alto à esquerda: o membro descendo sombreia a borda +x, e vira para -x quando o osso gira além de ~37°', () => {
    expect(ladoDaSombra(0)).toBe(0);
    expect(ladoDaSombra(Math.PI)).toBe(1);
    expect(ladoDaSombra((90 * Math.PI) / 180)).toBe(1);
    expect(ladoDaSombra((-90 * Math.PI) / 180)).toBe(0);
    expect(ladoDaSombra((30 * Math.PI) / 180)).toBe(0);
    expect(ladoDaSombra((40 * Math.PI) / 180)).toBe(1);
  });
});
