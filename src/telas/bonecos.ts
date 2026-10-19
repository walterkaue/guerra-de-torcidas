// Bonecos da partida (batedor e goleiro) desenhados por esqueleto: cada pose é um conjunto de
// juntas e a animação interpola entre poses a cada quadro. Só desenho, nada de regra de jogo.
// Unidades locais: pés em y = 0, topo da cabeça em y ≈ -100; x positivo para a direita da tela.

/** Camiseta lisa nas 2 cores (jogo.md, seção 3): corpo numa cor, gola, punhos, calção e meião na outra. */
export interface Uniforme {
  camisa: string;
  detalhe: string;
}

type P = [number, number];

export interface Pose {
  cabeca: P;
  pescoco: P;
  ombroE: P;
  ombroD: P;
  cotoveloE: P;
  cotoveloD: P;
  maoE: P;
  maoD: P;
  quadrilE: P;
  quadrilD: P;
  joelhoE: P;
  joelhoD: P;
  peE: P;
  peD: P;
}

const PELE = '#c68a5e';
const PELE_SOMBRA = '#a46f48';
const CABELO = '#2b1d14';
const CHUTEIRA = '#151515';
const CONTORNO = 'rgba(0,0,0,0.55)';

const misturar = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Interpola duas poses (t de 0 a 1). */
export function entre(a: Pose, b: Pose, t: number): Pose {
  const r = {} as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) r[k] = misturar(a[k], b[k], t);
  return r;
}

/** Percorre uma sequência de poses com tempos (ms) e suaviza a passagem entre elas. */
export function sequencia(quadros: [Pose, number][], ms: number): Pose {
  let acumulado = 0;
  for (let i = 0; i < quadros.length - 1; i++) {
    const dur = quadros[i][1];
    if (ms < acumulado + dur) {
      const t = (ms - acumulado) / dur;
      return entre(quadros[i][0], quadros[i + 1][0], t * t * (3 - 2 * t));
    }
    acumulado += dur;
  }
  return quadros[quadros.length - 1][0];
}

/** Desloca a pose inteira (respiração, balanço do goleiro). */
export function deslocar(p: Pose, dx: number, dy: number, soTronco = false): Pose {
  const r = { ...p };
  const tronco: (keyof Pose)[] = ['cabeca', 'pescoco', 'ombroE', 'ombroD', 'cotoveloE', 'cotoveloD', 'maoE', 'maoD'];
  for (const k of soTronco ? tronco : (Object.keys(p) as (keyof Pose)[])) r[k] = [p[k][0] + dx, p[k][1] + dy];
  return r;
}

// ---------- poses do batedor (visto de costas) ----------
const base = (o: Partial<Pose>): Pose => ({
  cabeca: [0, -88],
  pescoco: [0, -76],
  ombroE: [-14, -72],
  ombroD: [14, -72],
  cotoveloE: [-20, -56],
  cotoveloD: [20, -56],
  maoE: [-21, -41],
  maoD: [21, -41],
  quadrilE: [-8, -42],
  quadrilD: [8, -42],
  joelhoE: [-9, -21],
  joelhoD: [9, -21],
  peE: [-10, 0],
  peD: [10, 0],
  ...o,
});

export const BATEDOR = {
  /** Mãos na cintura, esperando o apito (como no exemplo). */
  parado: base({ cotoveloE: [-25, -55], cotoveloD: [25, -55], maoE: [-12, -46], maoD: [12, -46], peE: [-12, 0], peD: [12, 0] }),
  correA: base({
    joelhoE: [-7, -30],
    peE: [-8, -14],
    joelhoD: [10, -17],
    peD: [12, 3],
    cotoveloE: [-22, -58],
    maoE: [-26, -46],
    cotoveloD: [19, -62],
    maoD: [14, -66],
  }),
  correB: base({
    joelhoD: [7, -30],
    peD: [8, -14],
    joelhoE: [-10, -17],
    peE: [-12, 3],
    cotoveloD: [22, -58],
    maoD: [26, -46],
    cotoveloE: [-19, -62],
    maoE: [-14, -66],
  }),
  /** Perna de apoio cravada, perna do chute armada lá atrás, braços abertos. */
  armado: base({
    cabeca: [-3, -86],
    pescoco: [-3, -74],
    ombroE: [-17, -70],
    ombroD: [11, -71],
    cotoveloE: [-32, -66],
    maoE: [-44, -60],
    cotoveloD: [26, -62],
    maoD: [38, -56],
    joelhoE: [-10, -22],
    peE: [-9, 0],
    quadrilD: [8, -40],
    joelhoD: [14, -16],
    peD: [20, 6],
  }),
  /** Pé encontrando a bola. */
  batida: base({
    cabeca: [-2, -84],
    pescoco: [-2, -72],
    ombroE: [-16, -69],
    ombroD: [12, -70],
    cotoveloE: [-30, -64],
    maoE: [-40, -54],
    cotoveloD: [24, -60],
    maoD: [32, -50],
    joelhoE: [-10, -22],
    peE: [-9, 0],
    joelhoD: [16, -28],
    peD: [26, -16],
  }),
  /** Acompanhamento: perna lá em cima, corpo inclinado. */
  depois: base({
    cabeca: [0, -84],
    pescoco: [0, -72],
    cotoveloE: [-30, -62],
    maoE: [-38, -50],
    cotoveloD: [22, -64],
    maoD: [28, -72],
    joelhoE: [-10, -22],
    peE: [-9, 0],
    joelhoD: [14, -40],
    peD: [20, -38],
  }),
};

/** Ciclo de corrida (ms desde o início) alternando as passadas. */
export function poseCorrida(ms: number): Pose {
  const fase = (ms / 150) % 2;
  return fase < 1 ? entre(BATEDOR.correA, BATEDOR.correB, fase) : entre(BATEDOR.correB, BATEDOR.correA, fase - 1);
}

/** Chute: arma (0–140 ms), bate (140–220), acompanha (220–420) e volta devagar. */
export function poseChute(ms: number): Pose {
  return sequencia(
    [
      [BATEDOR.parado, 70],
      [BATEDOR.armado, 120],
      [BATEDOR.batida, 90],
      [BATEDOR.depois, 900],
      [BATEDOR.parado, 1],
    ],
    ms,
  );
}

/** Respiração do batedor parado. */
export function poseParado(ms: number): Pose {
  return deslocar(BATEDOR.parado, 0, Math.sin(ms / 420) * 0.9, true);
}

// ---------- poses do goleiro (visto de frente) ----------
const baseG = (o: Partial<Pose>): Pose => ({
  cabeca: [0, -80],
  pescoco: [0, -68],
  ombroE: [-14, -64],
  ombroD: [14, -64],
  cotoveloE: [-24, -50],
  cotoveloD: [24, -50],
  maoE: [-26, -38],
  maoD: [26, -38],
  quadrilE: [-9, -36],
  quadrilD: [9, -36],
  joelhoE: [-15, -18],
  joelhoD: [15, -18],
  peE: [-15, 0],
  peD: [15, 0],
  ...o,
});

export const GOLEIRO = {
  /** Agachado, braços abertos, pronto. */
  pronto: baseG({}),
  /** Corpo esticado, braços acima da cabeça (para o mergulho e o pulo). */
  esticado: baseG({
    cabeca: [0, -84],
    pescoco: [0, -72],
    ombroE: [-12, -68],
    ombroD: [12, -68],
    cotoveloE: [-13, -86],
    cotoveloD: [13, -86],
    maoE: [-9, -102],
    maoD: [9, -102],
    quadrilE: [-8, -38],
    quadrilD: [8, -38],
    joelhoE: [-10, -18],
    joelhoD: [6, -22],
    peE: [-10, 0],
    peD: [4, -6],
  }),
  /** Abafa no chão, no meio e embaixo. */
  abafa: baseG({
    cabeca: [0, -58],
    pescoco: [0, -48],
    ombroE: [-14, -46],
    ombroD: [14, -46],
    cotoveloE: [-20, -28],
    cotoveloD: [20, -28],
    maoE: [-11, -12],
    maoD: [11, -12],
    quadrilE: [-10, -26],
    quadrilD: [10, -26],
    joelhoE: [-20, -8],
    joelhoD: [20, -8],
    peE: [-16, 0],
    peD: [16, 0],
  }),
};

/** Goleiro esperando: balança de um lado para o outro e quica nos pés. */
export function poseGoleiroEsperando(ms: number): Pose {
  const lado = Math.sin(ms / 380) * 3;
  const quica = Math.abs(Math.sin(ms / 190)) * 2;
  const p = deslocar(GOLEIRO.pronto, lado, -quica, true);
  p.joelhoE = [p.joelhoE[0] + lado * 0.5, p.joelhoE[1] - quica * 0.5];
  p.joelhoD = [p.joelhoD[0] + lado * 0.5, p.joelhoD[1] - quica * 0.5];
  return p;
}

// ---------- desenho ----------

/** Um pedaço de braço ou perna: traço grosso de ponta redonda com contorno escuro. */
function membro(c: CanvasRenderingContext2D, a: P, b: P, larguraA: number, larguraB: number, cor: string): void {
  const largura = larguraA + larguraB;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.strokeStyle = CONTORNO;
  c.lineWidth = largura + 2.4;
  c.stroke();
  c.strokeStyle = cor;
  c.lineWidth = largura;
  c.stroke();
}

function perna(c: CanvasRenderingContext2D, q: P, j: P, p: P, u: Uniforme, lado: number, deFrente: boolean): void {
  // coxa (calção por cima), canela de meião, chuteira
  membro(c, q, j, 6, 4.6, PELE);
  membro(c, j, p, 4.6, 3.6, u.detalhe);
  c.fillStyle = CHUTEIRA;
  c.beginPath();
  const bico = deFrente ? 0 : lado * 1.5;
  c.ellipse(p[0] + bico, p[1] - 1, 5.5, 3.2, 0, 0, Math.PI * 2);
  c.fill();
}

function braco(c: CanvasRenderingContext2D, o: P, co: P, m: P, u: Uniforme, luva: boolean): void {
  const meio = misturar(o, co, 0.75);
  membro(c, o, meio, 5.2, 4.6, u.camisa);
  membro(c, meio, co, 4.6, 4.2, u.detalhe);
  membro(c, co, m, 4.2, 3.6, luva ? u.camisa : PELE);
  c.fillStyle = luva ? '#f5f5f0' : PELE;
  c.beginPath();
  c.arc(m[0], m[1], luva ? 5.6 : 3.2, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = CONTORNO;
  c.lineWidth = 1.2;
  c.stroke();
}

function tronco(c: CanvasRenderingContext2D, p: Pose, u: Uniforme, deFrente: boolean): void {
  // Calção
  c.fillStyle = u.detalhe;
  c.beginPath();
  c.moveTo(p.quadrilE[0] - 6, p.quadrilE[1] - 4);
  c.lineTo(p.quadrilD[0] + 6, p.quadrilD[1] - 4);
  c.lineTo(misturar(p.quadrilD, p.joelhoD, 0.45)[0] + 6, misturar(p.quadrilD, p.joelhoD, 0.45)[1]);
  c.lineTo((p.quadrilE[0] + p.quadrilD[0]) / 2, (p.quadrilE[1] + p.quadrilD[1]) / 2 + 6);
  c.lineTo(misturar(p.quadrilE, p.joelhoE, 0.45)[0] - 6, misturar(p.quadrilE, p.joelhoE, 0.45)[1]);
  c.closePath();
  c.fill();
  c.strokeStyle = CONTORNO;
  c.lineWidth = 1.2;
  c.stroke();
  // Camiseta lisa com sombra de um lado (volume)
  c.fillStyle = u.camisa;
  c.beginPath();
  c.moveTo(p.ombroE[0] - 3, p.ombroE[1] - 1);
  c.quadraticCurveTo(p.pescoco[0], p.pescoco[1] + 1, p.ombroD[0] + 3, p.ombroD[1] - 1);
  c.lineTo(p.quadrilD[0] + 5, p.quadrilD[1] - 2);
  c.lineTo(p.quadrilE[0] - 5, p.quadrilE[1] - 2);
  c.closePath();
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(p.quadrilD[0] - 2, p.ombroD[1] - 4, 14, p.quadrilD[1] - p.ombroD[1] + 6);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(p.ombroE[0] - 4, p.ombroE[1] - 4, 6, p.quadrilE[1] - p.ombroE[1] + 6);
  c.restore();
  c.strokeStyle = CONTORNO;
  c.lineWidth = 1.2;
  c.stroke();
  // Gola: em V de frente, faixa reta de costas.
  c.fillStyle = u.detalhe;
  c.beginPath();
  if (deFrente) {
    c.moveTo(p.pescoco[0] - 6, p.pescoco[1] + 3);
    c.lineTo(p.pescoco[0], p.pescoco[1] + 10);
    c.lineTo(p.pescoco[0] + 6, p.pescoco[1] + 3);
  } else {
    c.ellipse(p.pescoco[0], p.pescoco[1] + 3, 7, 2.6, 0, 0, Math.PI * 2);
  }
  c.fill();
}

function cabeca(c: CanvasRenderingContext2D, p: Pose, deFrente: boolean): void {
  membro(c, p.pescoco, misturar(p.pescoco, p.cabeca, 0.4), 3.6, 3.6, PELE_SOMBRA);
  const [x, y] = p.cabeca;
  c.fillStyle = PELE;
  c.beginPath();
  c.arc(x, y, 9.5, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = CONTORNO;
  c.lineWidth = 1.2;
  c.stroke();
  c.fillStyle = CABELO;
  c.beginPath();
  if (deFrente) c.arc(x, y - 2, 9.8, Math.PI * 1.05, Math.PI * 1.95);
  else c.arc(x, y - 1, 9.8, Math.PI * 0.85, Math.PI * 2.15);
  c.fill();
  if (!deFrente) {
    // orelhas
    c.fillStyle = PELE_SOMBRA;
    c.beginPath();
    c.arc(x - 9.5, y + 1, 2.4, 0, Math.PI * 2);
    c.arc(x + 9.5, y + 1, 2.4, 0, Math.PI * 2);
    c.fill();
  }
}

/** Batedor de costas: braços e pernas na ordem certa de profundidade. */
export function desenharBatedor(c: CanvasRenderingContext2D, p: Pose, u: Uniforme): void {
  perna(c, p.quadrilE, p.joelhoE, p.peE, u, -1, false);
  perna(c, p.quadrilD, p.joelhoD, p.peD, u, 1, false);
  tronco(c, p, u, false);
  braco(c, p.ombroE, p.cotoveloE, p.maoE, u, false);
  braco(c, p.ombroD, p.cotoveloD, p.maoD, u, false);
  cabeca(c, p, false);
}

/** Goleiro de frente, de luvas. */
export function desenharGoleiro(c: CanvasRenderingContext2D, p: Pose, u: Uniforme): void {
  perna(c, p.quadrilE, p.joelhoE, p.peE, u, -1, true);
  perna(c, p.quadrilD, p.joelhoD, p.peD, u, 1, true);
  tronco(c, p, u, true);
  cabeca(c, p, true);
  braco(c, p.ombroE, p.cotoveloE, p.maoE, u, true);
  braco(c, p.ombroD, p.cotoveloD, p.maoD, u, true);
}
