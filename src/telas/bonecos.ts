// Bonecos da partida no estilo "Silhueta premium" (docs/bonecos.md): formas chapadas sem contorno,
// proporção atlética, cortes angulares nas dobras e degradê sutil só na pele e no calção.
// Só desenho, nada de regra de jogo.
//
// Esqueleto por rotações: cada pose guarda a posição da pelve e, para cada osso, o ângulo e o quanto
// ele aparece encurtado (perna indo para longe da câmera fica mais curta). A animação interpola os
// ângulos entre poses-chave, com suavização.
// Unidades locais: pés em y = 0, topo da cabeça em y ≈ -98, x positivo para a direita da tela.
// Ângulos de braço e perna: 0 aponta para baixo, positivo gira para a direita da tela.
// Ângulos de tronco e cabeça: 0 aponta para cima, positivo inclina para a direita da tela.
//
// 60 quadros por segundo no celular: formas em Path2D criadas uma vez, degradês criados uma vez por
// cor, nenhum filtro e nenhum objeto novo por quadro (poses e juntas são Float32Array reaproveitados).

import { CONTRASTE_ENTRE_TIMES, distanciaDeCor } from '../dados/times';

// ---------- medidas (proporção atlética: cabeça pequena, pernas longas) ----------
const COXA = 24;
const CANELA = 24;
const PE = 6.5;
const BRACO = 15;
const ANTEBRACO = 13.5;
const TRONCO = 33;
const PESCOCO = 8.5;
/** Pelve em pé, perna esticada: os pés tocam o chão. */
const ALTURA_PELVE = -50;

// ---------- pose: Float32Array com índices fixos ----------
const RX = 0; // pelve x
const RY = 1; // pelve y
const TR = 2; // tronco: ângulo
const TRK = 3; // tronco: encurtamento (inclinar para a frente encurta)
const OMK = 4; // largura dos ombros (girar o tronco estreita)
const QD = 5; // inclinação do quadril
const CB = 6; // cabeça
const BE = 7; // braço esquerdo da tela: ângulo, k, antebraço ângulo, k, profundidade
const BD = 12; // braço direito da tela
const PNE = 17; // perna esquerda: coxa ângulo, k, canela ângulo, k, pé ângulo, k, profundidade
const PND = 24; // perna direita
const N = 31;

export type Pose = Float32Array;
export const novaPose = (): Pose => new Float32Array(N);

/** Quais posições da pose são ângulos (interpolam pelo caminho mais curto). */
const EH_ANGULO = new Uint8Array(N);
for (const i of [TR, QD, CB, BE, BE + 2, BD, BD + 2, PNE, PNE + 2, PNE + 4, PND, PND + 2, PND + 4]) EH_ANGULO[i] = 1;

const GRAU = Math.PI / 180;
const DOIS_PI = Math.PI * 2;

/** Braço: [ângulo, k, antebraço ângulo, k, profundidade (<0 atrás do tronco, >0 na frente)]. */
type Braco = readonly [number, number, number, number, number];
/** Perna: [coxa ângulo, k, canela ângulo, k, pé ângulo, k, profundidade]. */
type Perna = readonly [number, number, number, number, number, number, number];

interface Def {
  x: number;
  y: number;
  tr: number;
  trk: number;
  omk: number;
  qd: number;
  cb: number;
  bE: Braco;
  bD: Braco;
  pE: Perna;
  pD: Perna;
}

function criarPose(d: Def): Pose {
  const p = novaPose();
  p[RX] = d.x;
  p[RY] = d.y;
  p[TR] = d.tr * GRAU;
  p[TRK] = d.trk;
  p[OMK] = d.omk;
  p[QD] = d.qd * GRAU;
  p[CB] = d.cb * GRAU;
  const membro = (i: number, v: readonly number[], angulos: number[]) => {
    for (let k = 0; k < v.length; k++) p[i + k] = angulos.includes(k) ? v[k] * GRAU : v[k];
  };
  membro(BE, d.bE, [0, 2]);
  membro(BD, d.bD, [0, 2]);
  membro(PNE, d.pE, [0, 2, 4]);
  membro(PND, d.pD, [0, 2, 4]);
  // Perna mexe para a frente e para trás (em profundidade): osso apontando para cima vira ângulo
  // pequeno com encurtamento negativo. Assim, entre uma pose e outra, a canela passa "por dentro"
  // (encurtando, como na vida real) em vez de girar pelo lado e abrir as pernas.
  for (const i of [PNE, PNE + 2, PNE + 4, PND, PND + 2, PND + 4]) {
    if (Math.abs(p[i]) > Math.PI / 2) {
      p[i] -= Math.sign(p[i]) * Math.PI;
      p[i + 1] = -p[i + 1];
    }
  }
  return p;
}

/** A mesma pose vista no espelho (pulo para o outro lado, passada com a outra perna). */
function espelhar(p: Pose): Pose {
  const r = novaPose();
  r[RX] = -p[RX];
  r[RY] = p[RY];
  r[TR] = -p[TR];
  r[TRK] = p[TRK];
  r[OMK] = p[OMK];
  r[QD] = -p[QD];
  r[CB] = -p[CB];
  for (const [a, b, tam] of [
    [BE, BD, 5],
    [PNE, PND, 7],
  ]) {
    for (let k = 0; k < tam; k++) {
      const angulo = k < tam - 1 && k % 2 === 0;
      r[a + k] = angulo ? -p[b + k] : p[b + k];
      r[b + k] = angulo ? -p[a + k] : p[a + k];
    }
  }
  return r;
}

/** Interpola duas poses (t de 0 a 1) e grava em `out` (pode ser a própria `a`). */
export function misturar(a: Pose, b: Pose, t: number, out: Pose): Pose {
  for (let i = 0; i < N; i++) {
    let d = b[i] - a[i];
    if (EH_ANGULO[i]) {
      if (d > Math.PI) d -= DOIS_PI;
      else if (d < -Math.PI) d += DOIS_PI;
    }
    out[i] = a[i] + d * t;
  }
  return out;
}

const suave = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

interface Sequencia {
  poses: Pose[];
  /** Duração de cada passagem (ms), da pose i para a i + 1. */
  tempos: number[];
}

/** Percorre uma sequência de poses-chave e suaviza a passagem entre elas. */
function sequencia(s: Sequencia, ms: number, out: Pose): Pose {
  let acumulado = 0;
  for (let i = 0; i < s.tempos.length; i++) {
    const dur = s.tempos[i];
    if (ms < acumulado + dur) return misturar(s.poses[i], s.poses[i + 1], suave((ms - acumulado) / dur), out);
    acumulado += dur;
  }
  out.set(s.poses[s.poses.length - 1]);
  return out;
}

// ---------- poses do batedor (visto de costas; chuta com o pé direito, o da direita da tela) ----------
const costas = (o: Partial<Def>): Pose =>
  criarPose({
    x: 0,
    y: ALTURA_PELVE,
    tr: 0,
    trk: 1,
    omk: 1,
    qd: 0,
    cb: 0,
    bE: [-10, 1, -5, 1, 1],
    bD: [10, 1, 5, 1, 1],
    pE: [-4, 1, -1, 1, 172, 0.3, -1],
    pD: [4, 1, 1, 1, 188, 0.3, -1],
    ...o,
  });

/** Pé de apoio cravado, para a frente; perna do chute um pouco atrás. */
const PE_DE_APOIO: Perna = [-8, 0.72, -4, 0.95, 178, 0.7, -1];

const B = {
  /** Mãos na cintura, esperando o apito. */
  parado: costas({ bE: [-40, 1, 46, 0.95, 1], bD: [40, 1, -46, 0.95, 1], pE: [-6, 1, -1, 1, 170, 0.3, -1], pD: [6, 1, 1, 1, 190, 0.3, -1] }),
  /** Olhando a bola ir, braços soltos. */
  olhando: costas({ bE: [-16, 1, -8, 1, 1], bD: [16, 1, 8, 1, 1], pE: [-5, 1, -1, 1, 172, 0.3, -1], pD: [5, 1, 1, 1, 188, 0.3, -1] }),
  /** Curvado sobre a bola, ajeitando. */
  ajeita: costas({
    y: -30,
    trk: 0.72,
    bE: [8, 1, 4, 1, -1],
    bD: [-8, 1, -4, 1, -1],
    pE: [-48, 0.75, 28, 0.75, 175, 0.3, -1],
    pD: [48, 0.75, -28, 0.75, 185, 0.3, -1],
  }),
  ajeita2: costas({
    y: -30,
    trk: 0.74,
    cb: -5,
    bE: [2, 1, 10, 1, -1],
    bD: [-14, 1, -2, 1, -1],
    pE: [-48, 0.75, 28, 0.75, 175, 0.3, -1],
    pD: [48, 0.75, -28, 0.75, 185, 0.3, -1],
  }),
  /** Passada: perna direita lá na frente, esquerda dobrada para trás (vem para a câmera). */
  correA: costas({
    y: -49,
    tr: 3,
    trk: 0.94,
    bE: [-12, 0.7, 172, 0.55, -1],
    bD: [24, 0.92, 135, 0.6, 1],
    pE: [-10, 0.9, -165, 0.62, -12, 0.55, 1],
    pD: [6, 0.7, 2, 0.95, 180, 0.4, -1],
  }),
  /** Máquina parada atrás da bola: pé de apoio cravado (a dica), braços abertos. */
  espera: costas({
    y: -49,
    tr: -3,
    trk: 0.98,
    bE: [-30, 1, -20, 1, 1],
    bD: [28, 1, 14, 1, 1],
    pE: PE_DE_APOIO,
    pD: [10, 1, 16, 0.88, 198, 0.45, 1],
  }),
  // Chute em 4 tempos: pé de apoio, puxada, contato, finalização.
  apoio: costas({
    y: -49,
    tr: -4,
    trk: 0.97,
    bE: [-36, 1, -26, 1, 1],
    bD: [24, 1, 20, 1, 1],
    pE: PE_DE_APOIO,
    pD: [12, 1, 32, 0.85, 200, 0.45, 1],
  }),
  puxada: costas({
    y: -49,
    tr: -8,
    trk: 0.95,
    bE: [-78, 1, -62, 1, 1],
    bD: [22, 0.92, 44, 0.85, 1],
    pE: PE_DE_APOIO,
    pD: [22, 0.9, 162, 0.72, -5, 0.55, 1],
  }),
  contato: costas({
    y: -49,
    tr: -10,
    trk: 0.96,
    bE: [-88, 1, -76, 1, 1],
    bD: [30, 0.92, 12, 0.92, 1],
    pE: PE_DE_APOIO,
    pD: [30, 0.85, 42, 0.8, 92, 0.7, -1],
  }),
  final: costas({
    y: -49,
    tr: -6,
    trk: 1,
    cb: -4,
    bE: [-104, 1, -124, 1, 1],
    bD: [18, 1, 32, 1, 1],
    pE: PE_DE_APOIO,
    pD: [148, 0.5, 165, 0.55, 170, 0.4, -1],
  }),
  // Cavadinha: toque curto, por baixo da bola.
  cavPuxada: costas({
    y: -49,
    tr: -4,
    trk: 0.97,
    bE: [-40, 1, -30, 1, 1],
    bD: [22, 1, 22, 1, 1],
    pE: PE_DE_APOIO,
    pD: [16, 0.95, 118, 0.6, 0, 0.5, 1],
  }),
  cavContato: costas({
    y: -49,
    tr: -4,
    trk: 0.98,
    bE: [-34, 1, -22, 1, 1],
    bD: [20, 1, 10, 1, 1],
    pE: PE_DE_APOIO,
    pD: [26, 0.88, 28, 0.85, 125, 0.7, -1],
  }),
  cavFinal: costas({
    y: -49,
    tr: -2,
    trk: 1,
    cb: 6,
    bE: [-30, 1, -16, 1, 1],
    bD: [26, 1, 18, 1, 1],
    pE: PE_DE_APOIO,
    pD: [40, 0.8, 70, 0.8, 135, 0.6, -1],
  }),
  /** Comemoração: braços para cima, pulinho. */
  festaA: costas({
    y: -55,
    trk: 1.02,
    bE: [-152, 1, -168, 1, 1],
    bD: [152, 1, 168, 1, 1],
    pE: [-6, 1, -3, 1, 160, 0.45, -1],
    pD: [6, 1, 3, 1, 200, 0.45, -1],
  }),
  festaB: costas({
    y: -47,
    trk: 0.98,
    bE: [-128, 0.95, -150, 0.9, 1],
    bD: [128, 0.95, 150, 0.9, 1],
    pE: [-11, 0.9, 5, 1, 172, 0.3, -1],
    pD: [11, 0.9, -5, 1, 188, 0.3, -1],
  }),
  /** Mãos na cabeça. */
  lamenta: costas({
    trk: 0.97,
    bE: [-140, 0.9, 98, 1, 1],
    bD: [140, 0.9, -98, 1, 1],
    pE: [-6, 1, -1, 1, 170, 0.3, -1],
    pD: [6, 1, 1, 1, 190, 0.3, -1],
  }),
  lamenta2: costas({
    tr: -3,
    trk: 0.96,
    cb: -7,
    bE: [-136, 0.9, 102, 1, 1],
    bD: [144, 0.9, -94, 1, 1],
    pE: [-6, 1, -1, 1, 170, 0.3, -1],
    pD: [6, 1, 1, 1, 190, 0.3, -1],
  }),
};
const correB = espelhar(B.correA);

const CHUTE: Sequencia = {
  poses: [B.parado, B.apoio, B.puxada, B.contato, B.final, B.final, B.olhando],
  tempos: [70, 70, 50, 140, 260, 250],
};
const CAVADINHA: Sequencia = {
  poses: [B.parado, B.apoio, B.cavPuxada, B.cavContato, B.cavFinal, B.cavFinal, B.olhando],
  tempos: [70, 70, 50, 140, 300, 300],
};
/** A máquina já está com o pé de apoio cravado: puxa e bate (contato aos 190 ms). */
const CHUTE_MAQUINA: Sequencia = {
  poses: [B.espera, B.puxada, B.contato, B.final, B.final, B.olhando],
  tempos: [60, 130, 140, 260, 250],
};

const rascunho = novaPose();

/** Mãos na cintura, respirando. */
export function poseParado(ms: number, out: Pose): Pose {
  out.set(B.parado);
  out[TRK] = 1 + Math.sin(ms / 420) * 0.008;
  return out;
}

/** Ajeitando a bola (curvado), depois recua dois passinhos e fica de mãos na cintura. */
export function poseAjeitando(ms: number, out: Pose): Pose {
  if (ms < 220) return misturar(B.parado, B.ajeita, suave(ms / 220), out);
  if (ms < 620) return misturar(B.ajeita, B.ajeita2, 0.5 - 0.5 * Math.cos(((ms - 220) / 400) * Math.PI * 4), out);
  if (ms < DUR_AJEITAR) {
    const f = (ms - 620) / (DUR_AJEITAR - 620);
    misturar(B.ajeita, B.parado, suave(f), out);
    const passo = Math.sin(f * DOIS_PI);
    return misturar(out, passo > 0 ? B.correA : correB, Math.abs(passo) * 0.3, out);
  }
  return poseParado(ms, out);
}
/** Quanto dura o "ajeitando a bola" (ms); depois disso o batedor já está no lugar. */
export const DUR_AJEITAR = 980;

/** Corrida de 3 passos até a bola; no fim crava o pé de apoio (pose de espera). */
export function poseCorrida(ms: number, dur: number, out: Pose): Pose {
  const passo = 230;
  const fimPassos = passo * 2.6;
  const passada = (t: number, o: Pose) => {
    const n = t / passo;
    const i = Math.floor(n);
    const f = n - i;
    misturar(i % 2 === 0 ? B.correA : correB, i % 2 === 0 ? correB : B.correA, suave(f), o);
    o[RY] -= 2.4 * Math.sin(Math.PI * f);
    return o;
  };
  if (ms < fimPassos) return passada(ms, out);
  passada(fimPassos, rascunho);
  return misturar(rascunho, B.espera, suave((ms - fimPassos) / (dur - fimPassos)), out);
}

/** A máquina esperando para bater, com o pé de apoio cravado. */
export function poseEspera(ms: number, out: Pose): Pose {
  out.set(B.espera);
  out[TRK] = 0.98 + Math.sin(ms / 380) * 0.008;
  return out;
}

/** Chute de quem joga: pé de apoio, puxada, contato (aos 190 ms) e finalização. */
export function poseChute(ms: number, cavadinha: boolean, out: Pose): Pose {
  return sequencia(cavadinha ? CAVADINHA : CHUTE, ms, out);
}

/** Chute da máquina, a partir da pose de espera (contato aos 190 ms). */
export function poseChuteMaquina(ms: number, out: Pose): Pose {
  return sequencia(CHUTE_MAQUINA, ms, out);
}

/** Comemoração do gol: braços para cima e pulinhos. */
export function poseComemora(ms: number, out: Pose): Pose {
  if (ms < 220) return misturar(B.olhando, B.festaA, suave(ms / 220), out);
  const f = (ms - 220) / 260;
  const i = Math.floor(f);
  return misturar(i % 2 ? B.festaB : B.festaA, i % 2 ? B.festaA : B.festaB, suave(f - i), out);
}

/** Mãos na cabeça, balançando de leve. */
export function poseLamenta(ms: number, out: Pose): Pose {
  if (ms < 260) return misturar(B.olhando, B.lamenta, suave(ms / 260), out);
  return misturar(B.lamenta, B.lamenta2, 0.5 - 0.5 * Math.cos((ms - 260) / 260), out);
}

/** Aponta o pé de apoio (perna esquerda da tela) para um lado: a dica da defesa. */
export function apontarPeDeApoio(p: Pose, ang: number, t: number): void {
  // O pé aponta para longe da câmera (encurtamento negativo): girar para a esquerda da tela é ângulo positivo.
  p[PNE + 4] += (-ang - p[PNE + 4]) * t;
}

// ---------- poses do goleiro (visto de frente) ----------
const frente = (o: Partial<Def>): Pose =>
  criarPose({
    x: 0,
    y: ALTURA_PELVE,
    tr: 0,
    trk: 1,
    omk: 1,
    qd: 0,
    cb: 0,
    bE: [-20, 1, -10, 1, 1],
    bD: [20, 1, 10, 1, 1],
    pE: [-6, 1, -2, 1, -35, 0.5, -1],
    pD: [6, 1, 2, 1, 35, 0.5, -1],
    ...o,
  });

const baixoD = frente({
  tr: 6,
  trk: 1.04,
  cb: 14,
  bE: [172, 1, 168, 1, 1],
  bD: [160, 1, 164, 1, 1],
  pE: [-6, 1, -4, 1, -20, 0.5, -1],
  pD: [14, 0.92, -10, 0.95, 20, 0.5, -1],
});
const altoD = frente({
  tr: 4,
  trk: 1.04,
  cb: 10,
  bE: [178, 1, 174, 1, 1],
  bD: [166, 1, 170, 1, 1],
  pE: [-4, 1, -2, 1, -15, 0.5, -1],
  pD: [62, 0.82, -8, 0.92, 15, 0.5, -1],
});
const caidoD = frente({
  tr: 4,
  cb: 18,
  bE: [160, 1, 168, 1, 1],
  bD: [146, 1, 156, 1, 1],
  pE: [-6, 1, -12, 1, -30, 0.5, -1],
  pD: [16, 0.95, -6, 1, 20, 0.5, -1],
});
const caidoPegouD = frente({
  tr: 6,
  trk: 0.96,
  cb: 10,
  bE: [-8, 1, 112, 1, 1],
  bD: [10, 1, -112, 1, 1],
  pE: [-26, 0.95, 16, 1, -30, 0.5, -1],
  pD: [22, 0.95, -18, 1, 25, 0.5, -1],
});

export const GOLEIRO = {
  /** Base na linha: joelhos dobrados, braços abertos. */
  pronto: frente({
    y: -43,
    trk: 0.94,
    bE: [-48, 0.95, -14, 0.9, 1],
    bD: [48, 0.95, 14, 0.9, 1],
    pE: [-30, 0.92, 10, 1, -40, 0.5, -1],
    pD: [30, 0.92, -10, 1, 40, 0.5, -1],
  }),
  /** Pulos (o corpo ainda gira na partida): baixo e alto, para cada lado. */
  baixoD,
  baixoE: espelhar(baixoD),
  altoD,
  altoE: espelhar(altoD),
  /** De pé no meio, fechando embaixo. */
  meioBaixo: frente({
    y: -40,
    trk: 0.92,
    bE: [-4, 0.9, 24, 0.85, 1],
    bD: [4, 0.9, -24, 0.85, 1],
    pE: [-38, 0.85, 12, 1, -40, 0.5, -1],
    pD: [38, 0.85, -12, 1, 40, 0.5, -1],
  }),
  /** De pé no meio, braços para cima. */
  meioAlto: frente({
    y: -52,
    trk: 1.02,
    bE: [-172, 1, -177, 1, 1],
    bD: [172, 1, 177, 1, 1],
    pE: [-4, 1, -1, 1, -25, 0.5, -1],
    pD: [4, 1, 1, 1, 25, 0.5, -1],
  }),
  /** Defesa encaixada: bola presa no peito. */
  encaixada: frente({
    y: -47,
    trk: 0.96,
    bE: [-8, 1, 115, 1, 1],
    bD: [8, 1, -115, 1, 1],
    pE: [-14, 0.95, 6, 1, -35, 0.5, -1],
    pD: [14, 0.95, -6, 1, 35, 0.5, -1],
  }),
  /** Caído no chão depois do pulo (a partida deita o corpo), sem a bola ou abraçado nela. */
  caidoD,
  caidoE: espelhar(caidoD),
  caidoPegouD,
  caidoPegouE: espelhar(caidoPegouD),
};

/** Goleiro na linha: balança de um lado para o outro e quica nos pés. */
export function poseGoleiroEsperando(ms: number, out: Pose): Pose {
  out.set(GOLEIRO.pronto);
  out[RX] += Math.sin(ms / 380) * 3;
  out[RY] -= Math.abs(Math.sin(ms / 190)) * 1.6;
  out[BE] += Math.sin(ms / 190) * 0.06;
  out[BD] -= Math.sin(ms / 190) * 0.06;
  return out;
}

// ---------- aparência ----------
export type Cabelo = 'raspado' | 'curto' | 'crespo' | 'trancas' | 'coque' | 'rabo' | 'comprido';

export interface Aparencia {
  pele: string;
  cabelo: Cabelo;
  corCabelo: string;
  mulher: boolean;
}

/** Do mais claro ao mais escuro. */
export const TONS_DE_PELE = ['#f1cfb3', '#e0ac85', '#c68d63', '#a3693f', '#7a4a2a', '#4f2f1c'];
const CORES_DE_CABELO = ['#17110d', '#2b1d14', '#4a2f1d', '#6e4a2c', '#a8783f', '#c99c5e'];
/** Peso de cada cabelo para homens e para mulheres (todo cabelo pode sair para qualquer um). */
const CABELOS: [Cabelo, number, number][] = [
  ['raspado', 3, 0.6],
  ['curto', 4, 1.5],
  ['crespo', 2, 2],
  ['trancas', 1.5, 2],
  ['coque', 0.6, 2],
  ['rabo', 0.3, 3],
  ['comprido', 0.6, 2],
];

/**
 * Sorteia quem entra em campo: tom de pele, cabelo, homem ou mulher. Usa o sorteio do visual
 * (Math.random), nunca a semente da partida: a física continua determinística.
 */
export function sortearAparencia(sortear: () => number = Math.random): Aparencia {
  const mulher = sortear() < 0.5;
  const pesos = CABELOS.map(([, h, m]) => (mulher ? m : h));
  let r = sortear() * pesos.reduce((a, b) => a + b, 0);
  let i = 0;
  while (r > pesos[i] && i < pesos.length - 1) r -= pesos[i++];
  return {
    pele: TONS_DE_PELE[Math.floor(sortear() * TONS_DE_PELE.length)],
    cabelo: CABELOS[i][0],
    corCabelo: CORES_DE_CABELO[Math.floor(sortear() * CORES_DE_CABELO.length)],
    mulher,
  };
}

// ---------- uniforme (sem marcas: tudo liso) ----------
export interface Uniforme {
  camisa: string;
  calcao: string;
  meiao: string;
  chuteira: string;
  /** Só goleiro: luvas na cor da camiseta. */
  luva: string | null;
}

const rgb = (cor: string): [number, number, number] => {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const hex = (r: number, g: number, b: number) => '#' + ((1 << 24) | (byte(r) << 16) | (byte(g) << 8) | byte(b)).toString(16).slice(1);

/** A mesma cor, mais escura (nunca puxa para preto ou outra cor: multiplica os 3 canais). */
export function escurecer(cor: string, f: number): string {
  const [r, g, b] = rgb(cor);
  return hex(r * f, g * f, b * f);
}

function misturarCor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const distancia = distanciaDeCor;

function luminancia(cor: string): number {
  const [r, g, b] = rgb(cor).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const CINZA_NEUTRO = '#8a8f98';
const chuteiraPara = (meiao: string) => (luminancia(meiao) < 0.06 ? '#ecebe6' : '#161616');

/** Camiseta na cor 1, calção na cor 2 (cinza se as duas não contrastam), meião na cor 1. */
export function uniformeDeLinha([cor1, cor2]: readonly [string, string]): Uniforme {
  const calcao = distancia(cor1, cor2) < 90 ? CINZA_NEUTRO : cor2;
  return { camisa: cor1, calcao, meiao: cor1, chuteira: chuteiraPara(cor1), luva: null };
}

/** A máquina joga de laranja e preto: nenhum time da lista usa essa dupla. */
export const CORES_DA_MAQUINA: readonly [string, string] = ['#f97316', '#1b1b1b'];

/** Diferença mínima entre as camisetas dos dois times em campo (distância de cor, 0 a 441). */
export { CONTRASTE_ENTRE_TIMES };

/** Uniforme 1 (cor 1 na camiseta) e uniforme 2 (cores invertidas), os dois lisos. */
const uniformesDoTime = ([cor1, cor2]: readonly [string, string]): [Uniforme, Uniforme] => [
  uniformeDeLinha([cor1, cor2]),
  uniformeDeLinha([cor2, cor1]),
];

/**
 * Tons fortes de goleiro que não são de nenhum clube: amarelo de placar, verde-limão, ciano,
 * rosa e lilás. Cada goleiro pega o que mais contrasta com o que está em campo.
 */
export const CORES_DE_GOLEIRO = ['#ffd23f', '#b8f135', '#2fd4e0', '#ff6fb1', '#a78bfa'];

/** O tom de goleiro que mais se afasta de todas as cores dadas (o primeiro da lista que passar de 150). */
function corDeGoleiro(evitar: readonly string[]): string {
  const folga = (c: string) => Math.min(...evitar.map((e) => distancia(c, e)));
  return CORES_DE_GOLEIRO.find((c) => folga(c) > 150) ?? CORES_DE_GOLEIRO.reduce((a, b) => (folga(b) > folga(a) ? b : a));
}

const uniformeDeGoleiro = (camisa: string): Uniforme => ({ camisa, calcao: '#1b1b1b', meiao: camisa, chuteira: '#161616', luva: camisa });

export interface UniformesDaPartida {
  jogador: Uniforme;
  goleiroJogador: Uniforme;
  adversario: Uniforme;
  goleiroAdversario: Uniforme;
}

/**
 * Uniformes de uma partida. Quem joga entra com o uniforme sorteado (1 ou 2, `preferido`); o
 * adversário (outro time no desafio, ou a máquina com `null`) troca de uniforme se as camisetas
 * ficarem parecidas. Se nenhuma combinação se distinguir, o adversário joga de máquina.
 * Os goleiros vestem um tom forte que contrasta com os dois times e com o outro goleiro.
 */
export function uniformesDaPartida(
  coresJogador: readonly [string, string],
  coresAdversario: readonly [string, string] | null,
  preferido: 0 | 1,
): UniformesDaPartida {
  const nossos = uniformesDoTime(coresJogador);
  const maquina = uniformesDoTime(CORES_DA_MAQUINA);
  const deles = coresAdversario ? uniformesDoTime(coresAdversario) : maquina;
  const ordemNossa = [nossos[preferido], nossos[1 - preferido]];
  const diferenca = (a: Uniforme, b: Uniforme) => distancia(a.camisa, b.camisa);
  let par: [Uniforme, Uniforme] | null = null;
  for (const adversarios of coresAdversario ? [deles, maquina] : [maquina]) {
    for (const n of ordemNossa) {
      const d = adversarios.find((a) => diferenca(n, a) >= CONTRASTE_ENTRE_TIMES);
      if (d) {
        par = [n, d];
        break;
      }
    }
    if (par) break;
  }
  if (!par) {
    // Sem combinação boa: fica a mais diferente entre todas.
    par = [ordemNossa[0], maquina[0]];
    for (const n of ordemNossa) for (const a of [...deles, ...maquina]) if (diferenca(n, a) > diferenca(par[0], par[1])) par = [n, a];
  }
  const [jogador, adversario] = par;
  const goleiroJogador = corDeGoleiro([jogador.camisa, jogador.calcao, adversario.camisa]);
  const goleiroAdversario = corDeGoleiro([adversario.camisa, adversario.calcao, jogador.camisa, goleiroJogador]);
  return {
    jogador,
    goleiroJogador: uniformeDeGoleiro(goleiroJogador),
    adversario,
    goleiroAdversario: uniformeDeGoleiro(goleiroAdversario),
  };
}

/** Distância entre duas cores (0 a 441), exposta para os testes de contraste. */
export const diferencaDeCor = (a: string, b: string): number => distancia(a, b);

// ---------- formas (criadas uma vez) ----------
interface Formas {
  coxa: [Path2D, Path2D];
  canela: [Path2D, Path2D];
  meiao: [Path2D, Path2D];
  braco: [Path2D, Path2D];
  manga: [Path2D, Path2D];
  antebraco: [Path2D, Path2D];
  luva: Path2D;
  bota: Path2D;
  pescoco: Path2D;
  cabeca: Path2D;
  orelhas: Path2D;
  junta: Path2D;
}

let formasProntas: Formas | null = null;

/** Membros: x em unidades, y de 0 (junta de cima) a 1 (junta de baixo). s = -1 espelha (lado direito). */
function membros(): Formas {
  if (formasProntas) return formasProntas;
  const par = (f: (s: number) => Path2D): [Path2D, Path2D] => [f(1), f(-1)];
  const coxa = (s: number) => {
    const p = new Path2D();
    p.moveTo(-5.6 * s, -0.04);
    p.quadraticCurveTo(-6.6 * s, 0.38, -3.7 * s, 0.97);
    p.lineTo(-1.0 * s, 1.06);
    p.lineTo(3.3 * s, 0.97);
    p.quadraticCurveTo(4.9 * s, 0.42, 4.5 * s, -0.04);
    p.closePath();
    return p;
  };
  const canela = (s: number) => {
    const p = new Path2D();
    p.moveTo(-3.8 * s, -0.03);
    p.quadraticCurveTo(-5.0 * s, 0.3, -2.4 * s, 0.88);
    p.lineTo(-1.8 * s, 1.03);
    p.lineTo(1.9 * s, 1.03);
    p.lineTo(2.4 * s, 0.88);
    p.quadraticCurveTo(4.1 * s, 0.3, 3.4 * s, -0.03);
    p.closePath();
    return p;
  };
  const meiao = (s: number) => {
    const p = new Path2D();
    p.moveTo(-4.45 * s, 0.27);
    p.quadraticCurveTo(-4.6 * s, 0.55, -2.6 * s, 0.9);
    p.lineTo(-2.05 * s, 1.06);
    p.lineTo(2.1 * s, 1.06);
    p.lineTo(2.6 * s, 0.9);
    p.quadraticCurveTo(4.2 * s, 0.5, 3.85 * s, 0.24);
    p.closePath();
    return p;
  };
  const braco = (s: number) => {
    const p = new Path2D();
    p.moveTo(-3.5 * s, 0);
    p.quadraticCurveTo(-4.2 * s, 0.4, -2.4 * s, 0.97);
    p.lineTo(-0.5 * s, 1.05);
    p.lineTo(2.2 * s, 0.96);
    p.quadraticCurveTo(3.2 * s, 0.42, 3.1 * s, 0);
    p.quadraticCurveTo(0, -0.28, -3.5 * s, 0);
    p.closePath();
    return p;
  };
  const manga = (s: number) => {
    const p = new Path2D();
    p.moveTo(-4.2 * s, -0.06);
    p.quadraticCurveTo(0, -0.4, 4.0 * s, -0.06);
    p.lineTo(3.9 * s, 0.36);
    p.lineTo(-4.4 * s, 0.48);
    p.closePath();
    return p;
  };
  const antebraco = (s: number) => {
    const p = new Path2D();
    p.moveTo(-2.5 * s, 0);
    p.quadraticCurveTo(-3.1 * s, 0.32, -1.5 * s, 0.94);
    p.lineTo(-1.9 * s, 1.04);
    p.quadraticCurveTo(-1.9 * s, 1.3, 0, 1.36);
    p.quadraticCurveTo(1.9 * s, 1.3, 1.8 * s, 1.04);
    p.lineTo(1.5 * s, 0.94);
    p.quadraticCurveTo(2.7 * s, 0.32, 2.3 * s, 0);
    p.closePath();
    return p;
  };
  const luva = new Path2D();
  luva.moveTo(-2.7, 0.82);
  luva.lineTo(2.7, 0.82);
  luva.lineTo(3.1, 1.16);
  luva.quadraticCurveTo(2.6, 1.54, 0, 1.56);
  luva.quadraticCurveTo(-2.6, 1.54, -3.1, 1.16);
  luva.closePath();
  // Chuteira: y de -0.5 (calcanhar) a 1.1 (bico), ao longo do pé.
  const bota = new Path2D();
  bota.moveTo(-2.7, -0.5);
  bota.lineTo(2.7, -0.5);
  bota.lineTo(2.9, 0.3);
  bota.quadraticCurveTo(2.4, 1.08, 0.2, 1.12);
  bota.quadraticCurveTo(-2.3, 1.08, -2.9, 0.3);
  bota.closePath();
  // Pescoço e cabeça em unidades, sem escala.
  const pescoco = new Path2D();
  pescoco.moveTo(-2.6, 1.5);
  pescoco.lineTo(2.6, 1.5);
  pescoco.lineTo(2.1, -PESCOCO - 0.5);
  pescoco.lineTo(-2.1, -PESCOCO - 0.5);
  pescoco.closePath();
  const cabeca = new Path2D();
  cabeca.ellipse(0, 0, 5.2, 6.2, 0, 0, DOIS_PI);
  const orelhas = new Path2D();
  orelhas.ellipse(-5.0, 0.6, 1.2, 1.9, 0, 0, DOIS_PI);
  orelhas.ellipse(5.0, 0.6, 1.2, 1.9, 0, 0, DOIS_PI);
  const junta = new Path2D();
  junta.arc(0, 0, 1, 0, DOIS_PI);
  formasProntas = {
    coxa: par(coxa),
    canela: par(canela),
    meiao: par(meiao),
    braco: par(braco),
    manga: par(manga),
    antebraco: par(antebraco),
    luva,
    bota,
    pescoco,
    cabeca,
    orelhas,
    junta,
  };
  return formasProntas;
}

/** Camiseta lisa: ombros largos, cintura fina, barra com corte reto. Tronco: x em unidades, y de 0 (pelve) a -1 (pescoço). */
function camisa(om: number, cintura: number, barra: number): Path2D {
  const p = new Path2D();
  p.moveTo(-3.6, -1.0);
  p.quadraticCurveTo(-om * 0.55, -1.02, -om - 0.8, -0.935);
  p.quadraticCurveTo(-om - 2.6, -0.88, -om - 0.8, -0.72);
  p.lineTo(-om + 1.8, -0.665);
  p.quadraticCurveTo(-cintura - 1.0, -0.45, -cintura, -0.22);
  p.lineTo(-barra, 0.05);
  p.lineTo(-barra * 0.15, 0.1);
  p.lineTo(barra, 0.04);
  p.lineTo(cintura, -0.22);
  p.quadraticCurveTo(cintura + 1.0, -0.45, om - 1.8, -0.665);
  p.lineTo(om + 0.8, -0.72);
  p.quadraticCurveTo(om + 2.6, -0.88, om + 0.8, -0.935);
  p.quadraticCurveTo(om * 0.55, -1.02, 3.6, -1.0);
  p.quadraticCurveTo(0, -0.96, -3.6, -1.0);
  p.closePath();
  return p;
}

/** Lado da camiseta na sombra (luz vem do alto à esquerda): bloco chapado, sem degradê. */
function sombraDaCamisa(om: number, cintura: number, barra: number): Path2D {
  const p = new Path2D();
  p.moveTo(om - 4.4, -0.665);
  p.lineTo(om - 1.8, -0.665);
  p.quadraticCurveTo(cintura + 1.0, -0.45, cintura, -0.22);
  p.lineTo(barra, 0.04);
  p.lineTo(barra - 4.8, 0.07);
  p.lineTo(cintura - 4.2, -0.3);
  p.closePath();
  return p;
}


/**
 * Peças de cabelo, cada uma num Path2D próprio: peças sobrepostas desenhadas em sentidos opostos
 * deixariam um buraco no preenchimento (regra "nonzero").
 */
class Pecas {
  lista: Path2D[] = [];
  private atual = new Path2D();
  private nova(): Path2D {
    this.atual = new Path2D();
    this.lista.push(this.atual);
    return this.atual;
  }
  moveTo(x: number, y: number): void {
    this.nova().moveTo(x, y);
  }
  lineTo(x: number, y: number): void {
    this.atual.lineTo(x, y);
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.atual.quadraticCurveTo(cx, cy, x, y);
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void {
    this.nova().ellipse(x, y, rx, ry, rot, a0, a1);
  }
  closePath(): void {
    this.atual.closePath();
  }
}

/** Cabelo em volta da cabeça (centro 0,0; cabeça com raios 5,2 × 6,2). "atras" vai antes do corpo. */
function cabelo(estilo: Cabelo, deFrente: boolean): { atras: Path2D[] | null; frente: Path2D[] } {
  const frente = new Pecas();
  let atras: Pecas | null = null;
  const tampa = (p: Pecas) => {
    if (deFrente) {
      // Visto de frente: só o alto da cabeça, com a linha da testa.
      p.moveTo(-5.5, -0.5);
      p.quadraticCurveTo(-6.2, -7.4, 0, -7.2);
      p.quadraticCurveTo(6.2, -7.4, 5.5, -0.5);
      p.lineTo(4.7, -2.2);
      p.quadraticCurveTo(0, -5.0, -4.7, -2.2);
    } else {
      // Visto de costas: cobre a nuca.
      p.moveTo(-5.5, 1.8);
      p.quadraticCurveTo(-6.3, -7.3, 0, -7.0);
      p.quadraticCurveTo(6.3, -7.3, 5.5, 1.8);
      p.quadraticCurveTo(0, 3.4, -5.5, 1.8);
    }
    p.closePath();
  };
  const tira = (p: Pecas, x0: number, y0: number, x1: number, y1: number, larg: number) => {
    p.moveTo(x0 - larg, y0);
    p.lineTo(x0 + larg, y0);
    p.lineTo(x1 + larg * 0.8, y1);
    p.lineTo(x1 - larg * 0.8, y1);
    p.closePath();
  };
  switch (estilo) {
    case 'raspado':
      if (deFrente) {
        frente.moveTo(-5.3, -1.2);
        frente.quadraticCurveTo(-5.8, -6.9, 0, -6.7);
        frente.quadraticCurveTo(5.8, -6.9, 5.3, -1.2);
        frente.lineTo(4.8, -2.6);
        frente.quadraticCurveTo(0, -5.2, -4.8, -2.6);
      } else {
        frente.moveTo(-5.3, 1.2);
        frente.quadraticCurveTo(-5.9, -6.9, 0, -6.6);
        frente.quadraticCurveTo(5.9, -6.9, 5.3, 1.2);
        frente.quadraticCurveTo(0, 2.6, -5.3, 1.2);
      }
      frente.closePath();
      break;
    case 'curto':
      tampa(frente);
      break;
    case 'crespo':
      if (deFrente) {
        atras = new Pecas();
        atras.ellipse(0, -1.8, 7.8, 7.6, 0, 0, DOIS_PI);
        frente.moveTo(-6.2, -0.5);
        frente.quadraticCurveTo(-7.4, -8.6, 0, -8.6);
        frente.quadraticCurveTo(7.4, -8.6, 6.2, -0.5);
        frente.lineTo(5.0, -2.4);
        frente.quadraticCurveTo(0, -4.6, -5.0, -2.4);
        frente.closePath();
      } else {
        frente.ellipse(0, -1.6, 7.6, 7.4, 0, Math.PI * 0.8, Math.PI * 2.2);
        frente.closePath();
      }
      break;
    case 'trancas':
      tampa(frente);
      if (deFrente) {
        atras = new Pecas();
        for (const x of [-5.6, -3.9, 3.9, 5.6]) tira(atras, x, -1, x * 1.25, 14, 1.0);
      } else {
        for (const x of [-3.6, -1.2, 1.2, 3.6]) tira(frente, x, 0, x * 1.25, 15, 1.0);
      }
      break;
    case 'coque':
      tampa(frente);
      frente.ellipse(0, deFrente ? -7.8 : -7.2, 3.1, 2.6, 0, 0, DOIS_PI);
      break;
    case 'rabo':
      tampa(frente);
      if (deFrente) {
        atras = new Pecas();
        atras.moveTo(3.0, -4);
        atras.quadraticCurveTo(8.2, 2, 6.4, 12);
        atras.quadraticCurveTo(4.6, 3, 1.5, -3);
        atras.closePath();
      } else {
        frente.moveTo(-2.0, -2.5);
        frente.quadraticCurveTo(-3.2, 7, 0.4, 15);
        frente.quadraticCurveTo(2.8, 7, 2.2, -2.5);
        frente.closePath();
      }
      break;
    case 'comprido':
      tampa(frente);
      if (deFrente) {
        atras = new Pecas();
        atras.moveTo(-5.8, -3);
        atras.lineTo(-7.2, 12);
        atras.lineTo(7.2, 12);
        atras.lineTo(5.8, -3);
        atras.closePath();
        for (const s of [-1, 1]) {
          frente.moveTo(5.5 * s, -1);
          frente.lineTo(6.2 * s, 9);
          frente.lineTo(4.6 * s, 9.5);
          frente.lineTo(4.4 * s, -0.5);
          frente.closePath();
        }
      } else {
        frente.moveTo(-5.7, -1.5);
        frente.lineTo(-6.8, 12.5);
        frente.lineTo(-2.4, 14);
        frente.lineTo(2.4, 14);
        frente.lineTo(6.8, 12.5);
        frente.lineTo(5.7, -1.5);
        frente.closePath();
      }
      break;
  }
  return { atras: atras?.lista ?? null, frente: frente.lista };
}

// ---------- o boneco ----------
// Juntas calculadas a cada quadro (pares x, y).
const J_PELVE = 0;
const J_PESCOCO = 2;
const J_CABECA = 4;
const J_OMBRO = 6; // E 6, D 8
const J_COTOVELO = 10; // E 10, D 12
const J_PUNHO = 14; // E 14, D 16
const J_QUADRIL = 18; // E 18, D 20
const J_JOELHO = 22; // E 22, D 24
const J_TORNOZELO = 26; // E 26, D 28

interface Degrades {
  ctx: CanvasRenderingContext2D;
  /** Pele do osso de cima (base → meio) e do de baixo (meio → escuro). */
  peleA: CanvasGradient;
  peleB: CanvasGradient;
  calcao: CanvasGradient;
}

export interface Boneco {
  aparencia: Aparencia;
  uniforme: Uniforme;
  deFrente: boolean;
  ombro: number;
  quadril: number;
  camisa: Path2D;
  sombraCamisa: Path2D;
  cabeloAtras: Path2D[] | null;
  cabeloFrente: Path2D[];
  cor: {
    peleMeio: string;
    camisaSombra: string;
    cabelo: string;
  };
  degrades: Degrades | null;
  /** Juntas da última pose resolvida. */
  j: Float32Array;
  /** Tornozelo do pé de apoio na pose de espera (onde a dica aparece no chão). */
  apoio: { x: number; y: number };
}

export function criarBoneco(aparencia: Aparencia, uniforme: Uniforme, deFrente: boolean): Boneco {
  const ombro = aparencia.mulher ? 11 : 12.5;
  const cintura = aparencia.mulher ? 7.4 : 8.2;
  const barra = aparencia.mulher ? 9.4 : 9.0;
  const quadril = aparencia.mulher ? 6.8 : 6;
  const cab = cabelo(aparencia.cabelo, deFrente);
  const b: Boneco = {
    aparencia,
    uniforme,
    deFrente,
    ombro,
    quadril,
    camisa: camisa(ombro, cintura, barra),
    sombraCamisa: sombraDaCamisa(ombro, cintura, barra),
    cabeloAtras: cab.atras,
    cabeloFrente: cab.frente,
    cor: {
      peleMeio: escurecer(aparencia.pele, 0.88),
      camisaSombra: escurecer(uniforme.camisa, 0.84),
      cabelo: aparencia.cabelo === 'raspado' ? misturarCor(aparencia.corCabelo, aparencia.pele, 0.45) : aparencia.corCabelo,
    },
    degrades: null,
    j: new Float32Array(30),
    apoio: { x: 0, y: 0 },
  };
  resolver(b, B.espera);
  b.apoio.x = b.j[J_TORNOZELO];
  b.apoio.y = b.j[J_TORNOZELO + 1];
  return b;
}

/** Degradês guardados por cor (criados uma vez; nunca dentro do quadro). */
const degradesPorCor = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>();

function degrade(c: CanvasRenderingContext2D, chave: string, de: string, para: string, ate: number, desde = 0): CanvasGradient {
  let mapa = degradesPorCor.get(c);
  if (!mapa) degradesPorCor.set(c, (mapa = new Map()));
  let g = mapa.get(chave);
  if (!g) {
    g = c.createLinearGradient(0, desde, 0, ate);
    g.addColorStop(0, de);
    g.addColorStop(1, para);
    mapa.set(chave, g);
  }
  return g;
}

function prepararDegrades(c: CanvasRenderingContext2D, b: Boneco): Degrades {
  if (b.degrades?.ctx === c) return b.degrades;
  const pele = b.aparencia.pele;
  const escura = escurecer(pele, 0.76);
  const calcaoEscuro = escurecer(b.uniforme.calcao, 0.74);
  b.degrades = {
    ctx: c,
    peleA: degrade(c, `pa${pele}`, pele, b.cor.peleMeio, 1),
    peleB: degrade(c, `pb${pele}`, b.cor.peleMeio, escura, 1.3),
    calcao: degrade(c, `c${b.uniforme.calcao}`, b.uniforme.calcao, calcaoEscuro, 14, -3),
  };
  return b.degrades;
}

/** Calcula as juntas da pose (cinemática direta) em b.j. */
function resolver(b: Boneco, p: Pose): void {
  const J = b.j;
  const px = p[RX];
  const py = p[RY];
  J[J_PELVE] = px;
  J[J_PELVE + 1] = py;
  const ta = p[TR];
  const st = Math.sin(ta);
  const ct = Math.cos(ta);
  const tl = TRONCO * p[TRK];
  J[J_PESCOCO] = px + tl * st;
  J[J_PESCOCO + 1] = py - tl * ct;
  // Ombros: no tronco, a 90% da altura, afastados do meio.
  const om = b.ombro * p[OMK];
  const ly = -0.9 * tl;
  J[J_OMBRO] = px - om * ct - ly * st;
  J[J_OMBRO + 1] = py - om * st + ly * ct;
  J[J_OMBRO + 2] = px + om * ct - ly * st;
  J[J_OMBRO + 3] = py + om * st + ly * ct;
  J[J_CABECA] = J[J_PESCOCO] + PESCOCO * Math.sin(p[CB]);
  J[J_CABECA + 1] = J[J_PESCOCO + 1] - PESCOCO * Math.cos(p[CB]);
  const qc = Math.cos(p[QD]);
  const qs = Math.sin(p[QD]);
  J[J_QUADRIL] = px - b.quadril * qc;
  J[J_QUADRIL + 1] = py - b.quadril * qs;
  J[J_QUADRIL + 2] = px + b.quadril * qc;
  J[J_QUADRIL + 3] = py + b.quadril * qs;
  for (let lado = 0; lado < 2; lado++) {
    const o = lado * 2;
    const ib = lado ? BD : BE;
    let a = p[ib];
    let k = BRACO * p[ib + 1];
    J[J_COTOVELO + o] = J[J_OMBRO + o] + k * Math.sin(a);
    J[J_COTOVELO + o + 1] = J[J_OMBRO + o + 1] + k * Math.cos(a);
    a = p[ib + 2];
    k = ANTEBRACO * p[ib + 3];
    J[J_PUNHO + o] = J[J_COTOVELO + o] + k * Math.sin(a);
    J[J_PUNHO + o + 1] = J[J_COTOVELO + o + 1] + k * Math.cos(a);
    const ip = lado ? PND : PNE;
    a = p[ip];
    k = COXA * p[ip + 1];
    J[J_JOELHO + o] = J[J_QUADRIL + o] + k * Math.sin(a);
    J[J_JOELHO + o + 1] = J[J_QUADRIL + o + 1] + k * Math.cos(a);
    a = p[ip + 2];
    k = CANELA * p[ip + 3];
    J[J_TORNOZELO + o] = J[J_JOELHO + o] + k * Math.sin(a);
    J[J_TORNOZELO + o + 1] = J[J_JOELHO + o + 1] + k * Math.cos(a);
  }
}

/** Centro das duas mãos (onde a bola fica na defesa), em unidades locais. */
export function maos(b: Boneco, p: Pose, out: { x: number; y: number }): void {
  resolver(b, p);
  const J = b.j;
  const ke = 0.16 * ANTEBRACO * p[BE + 3];
  const kd = 0.16 * ANTEBRACO * p[BD + 3];
  out.x = (J[J_PUNHO] + ke * Math.sin(p[BE + 2]) + J[J_PUNHO + 2] + kd * Math.sin(p[BD + 2])) / 2;
  out.y = (J[J_PUNHO + 1] + ke * Math.cos(p[BE + 2]) + J[J_PUNHO + 3] + kd * Math.cos(p[BD + 2])) / 2;
}

/** Escala que nunca zera (osso apontando para a câmera ainda aparece um pouco), mantendo o sinal. */
const comSinal = (v: number, min: number) => (v < 0 ? Math.min(v, -min) : Math.max(v, min));

/** Junta redonda (joelho, cotovelo) para não abrir fresta entre os ossos. */
function junta(c: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string): void {
  c.save();
  c.translate(x, y);
  c.scale(r, r);
  c.fillStyle = cor;
  c.fill(membros().junta);
  c.restore();
}

/** Canela, meião, chuteira e joelho de uma perna. */
function canela(c: CanvasRenderingContext2D, b: Boneco, d: Degrades, p: Pose, lado: number, realce: boolean): void {
  const F = membros();
  const J = b.j;
  const o = lado * 2;
  const ip = lado ? PND : PNE;
  const u = b.uniforme;
  c.save();
  c.translate(J[J_JOELHO + o], J[J_JOELHO + o + 1]);
  c.rotate(-p[ip + 2]);
  c.scale(1, comSinal(CANELA * p[ip + 3], 0.05));
  c.fillStyle = d.peleB;
  c.fill(F.canela[lado]);
  c.fillStyle = u.meiao;
  c.fill(F.meiao[lado]);
  c.restore();
  // Chuteira por cima do meião: de costas aparece o calcanhar; de frente, o bico.
  c.save();
  c.translate(J[J_TORNOZELO + o], J[J_TORNOZELO + o + 1]);
  c.rotate(-p[ip + 4]);
  c.scale(1, comSinal(PE * p[ip + 5], 0.12));
  c.fillStyle = realce ? '#ffd23f' : u.chuteira;
  c.fill(F.bota);
  c.restore();
  junta(c, J[J_JOELHO + o], J[J_JOELHO + o + 1], 3.5, b.cor.peleMeio);
}

/** Coxa: sempre por baixo do calção, que cobre o começo dela. */
function coxa(c: CanvasRenderingContext2D, b: Boneco, d: Degrades, p: Pose, lado: number): void {
  const J = b.j;
  const o = lado * 2;
  const ip = lado ? PND : PNE;
  c.save();
  c.translate(J[J_QUADRIL + o], J[J_QUADRIL + o + 1]);
  c.rotate(-p[ip]);
  c.scale(1, comSinal(COXA * p[ip + 1], 0.05));
  c.fillStyle = d.peleA;
  c.fill(membros().coxa[lado]);
  c.restore();
}

function braco(c: CanvasRenderingContext2D, b: Boneco, d: Degrades, p: Pose, lado: number): void {
  const F = membros();
  const J = b.j;
  const o = lado * 2;
  const ib = lado ? BD : BE;
  c.save();
  c.translate(J[J_COTOVELO + o], J[J_COTOVELO + o + 1]);
  c.rotate(-p[ib + 2]);
  c.scale(1, comSinal(ANTEBRACO * p[ib + 3], 0.05));
  c.fillStyle = d.peleB;
  c.fill(F.antebraco[lado]);
  if (b.uniforme.luva) {
    c.fillStyle = b.uniforme.luva;
    c.fill(F.luva);
  }
  c.restore();
  junta(c, J[J_COTOVELO + o], J[J_COTOVELO + o + 1], 2.3, b.cor.peleMeio);
  c.save();
  c.translate(J[J_OMBRO + o], J[J_OMBRO + o + 1]);
  c.rotate(-p[ib]);
  c.scale(1, comSinal(BRACO * p[ib + 1], 0.05));
  c.fillStyle = d.peleA;
  c.fill(F.braco[lado]);
  c.fillStyle = b.uniforme.camisa;
  c.fill(F.manga[lado]);
  c.restore();
}

/**
 * Boca de uma perna do calção: do quadril até a barra, que fica numa altura da coxa. Coxa
 * encurtada (perna para a frente ou para trás) puxa a barra para perto do quadril, em vez de
 * girar uma peça solta e deixar o calção torto.
 */
function bocaDaPerna(c: CanvasRenderingContext2D, b: Boneco, p: Pose, lado: number): void {
  const J = b.j;
  const o = lado * 2;
  const ip = lado ? PND : PNE;
  const hx = J[J_QUADRIL + o] - J[J_PELVE];
  const hy = J[J_QUADRIL + o + 1] - J[J_PELVE + 1];
  const dx = Math.sin(p[ip]);
  const dy = Math.cos(p[ip]);
  const fora = lado ? 1 : -1;
  const s = COXA * 0.42 * Math.max(p[ip + 1], 0.22) + 1.5;
  // Topo (lado de fora do quadril), barra de fora, barra de dentro, virilha.
  const ox = hx + fora * dy * 5.6;
  const oy = hy - fora * dx * 5.6 - 1;
  const bx = hx + dx * s + fora * dy * 6.6;
  const by = hy + dy * s - fora * dx * 6.6;
  const ix = hx + dx * s - fora * dy * 5.0;
  const iy = hy + dy * s + fora * dx * 5.0;
  if (lado === 0) {
    c.lineTo(ox, oy);
    c.lineTo(bx, by);
    c.lineTo(ix, iy);
    c.lineTo(0, 6.6);
  } else {
    c.lineTo(ix, iy);
    c.lineTo(bx, by);
    c.lineTo(ox, oy);
  }
}

/** Calção num polígono só, montado a cada quadro a partir das juntas. */
function calcao(c: CanvasRenderingContext2D, b: Boneco, d: Degrades, p: Pose): void {
  c.save();
  c.translate(b.j[J_PELVE], b.j[J_PELVE + 1]);
  c.fillStyle = d.calcao;
  c.beginPath();
  c.moveTo(-b.quadril - 3.4, -5.5);
  bocaDaPerna(c, b, p, 0);
  bocaDaPerna(c, b, p, 1);
  c.lineTo(b.quadril + 3.4, -5.5);
  c.closePath();
  c.fill();
  c.restore();
}

function tronco(c: CanvasRenderingContext2D, b: Boneco, d: Degrades, p: Pose): void {
  const J = b.j;
  calcao(c, b, d, p);
  c.save();
  c.translate(J[J_PELVE], J[J_PELVE + 1]);
  c.rotate(p[TR]);
  c.scale(p[OMK], TRONCO * p[TRK]);
  c.fillStyle = b.uniforme.camisa;
  c.fill(b.camisa);
  c.fillStyle = b.cor.camisaSombra;
  c.fill(b.sombraCamisa);
  c.restore();
}

function pescoco(c: CanvasRenderingContext2D, b: Boneco, p: Pose): void {
  c.save();
  c.translate(b.j[J_PESCOCO], b.j[J_PESCOCO + 1]);
  c.rotate(p[CB]);
  c.fillStyle = b.cor.peleMeio;
  c.fill(membros().pescoco);
  c.restore();
}

function cabeca(c: CanvasRenderingContext2D, b: Boneco, p: Pose, soCabeloDeTras: boolean): void {
  c.save();
  c.translate(b.j[J_CABECA], b.j[J_CABECA + 1]);
  c.rotate(p[CB]);
  c.fillStyle = b.cor.cabelo;
  if (soCabeloDeTras) {
    const atras = b.cabeloAtras;
    if (atras) for (let i = 0; i < atras.length; i++) c.fill(atras[i]);
  } else {
    const F = membros();
    c.fillStyle = b.cor.peleMeio;
    c.fill(F.orelhas);
    c.fillStyle = b.aparencia.pele;
    c.fill(F.cabeca);
    c.fillStyle = b.cor.cabelo;
    for (let i = 0; i < b.cabeloFrente.length; i++) c.fill(b.cabeloFrente[i]);
  }
  c.restore();
}

/**
 * Desenha o boneco na pose, com os pés na origem. Batedor de costas, goleiro de frente.
 * `realcePeDeApoio` pinta de amarelo a chuteira do pé de apoio (a dica da defesa).
 */
export function desenharBoneco(c: CanvasRenderingContext2D, b: Boneco, p: Pose, realcePeDeApoio = false): void {
  const d = prepararDegrades(c, b);
  resolver(b, p);
  if (b.deFrente && b.cabeloAtras) cabeca(c, b, p, true);
  if (p[PNE + 6] <= 0) canela(c, b, d, p, 0, realcePeDeApoio);
  if (p[PND + 6] <= 0) canela(c, b, d, p, 1, false);
  coxa(c, b, d, p, 0);
  coxa(c, b, d, p, 1);
  if (p[BE + 4] < 0) braco(c, b, d, p, 0);
  if (p[BD + 4] < 0) braco(c, b, d, p, 1);
  pescoco(c, b, p);
  tronco(c, b, d, p);
  // Perna dobrada para a câmera: a canela passa na frente do calção e da camiseta.
  if (p[PNE + 6] > 0) canela(c, b, d, p, 0, realcePeDeApoio);
  if (p[PND + 6] > 0) canela(c, b, d, p, 1, false);
  cabeca(c, b, p, false);
  if (p[BE + 4] >= 0) braco(c, b, d, p, 0);
  if (p[BD + 4] >= 0) braco(c, b, d, p, 1);
}

/** Todas as poses-chave, para a vitrine de desenvolvimento. */
export const POSES_DO_BATEDOR = { ...B, correB };
