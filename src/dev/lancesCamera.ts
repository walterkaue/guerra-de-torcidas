// Modelos visuais das três distâncias de câmera dos Lances (só em desenvolvimento: /dev/lances.html).
// ?cena=penalti | cara | falta | faltaLado. Serve para validar o enquadramento antes de levar para o jogo.

import { TIMES } from '../dados/times';
import { criarBoneco, desenharBoneco, GOLEIRO, novaPose, poseParado, sortearAparencia, uniformesDaPartida } from '../telas/bonecos';
import { cameraAtrasDaBola, ENQUADRAMENTOS, type Camera, type Enquadramento, type Ponto3 } from '../telas/camera';

interface Modelo {
  titulo: string;
  situacao: string;
  bola: { x: number; z: number };
  enquadramento: Enquadramento;
  barreira?: { jogadores: number; miraX: number };
  goleiroSaida?: number;
  goleiroX?: number;
  /** Cara a cara: de onde a bola veio (para a seta da jogada) e o texto da chegada. */
  chegada?: { de: { x: number; z: number }; texto: string };
}

const MODELOS: Record<string, Modelo> = {
  penalti: {
    titulo: 'Pênaltis',
    situacao: 'Pênalti · 11 m',
    bola: { x: 0, z: 11 },
    enquadramento: ENQUADRAMENTOS.penalti,
  },
  cara: {
    titulo: 'O gol do tri mundial',
    situacao: 'Cara a cara a 13 m, pela esquerda · goleiro saindo',
    bola: { x: -4, z: 12 },
    enquadramento: ENQUADRAMENTOS.caraACara,
    goleiroSaida: 3,
    chegada: { de: { x: 13, z: 21 }, texto: 'Lançamento longo, a bola ajeitada no peito e o passe por trás da zaga. Agora é com você!' },
  },
  falta: {
    titulo: 'A falta do tri, aos 43',
    situacao: 'Falta a 25 m, pela direita · barreira de 4',
    bola: { x: 8, z: 24 },
    enquadramento: ENQUADRAMENTOS.falta,
    barreira: { jogadores: 4, miraX: 2.5 },
    goleiroX: -0.15,
  },
  faltaLado: {
    titulo: 'A falta que encobriu o goleiro',
    situacao: 'Falta a 37 m, pela direita · barreira de 3',
    bola: { x: 16, z: 33 },
    enquadramento: ENQUADRAMENTOS.falta,
    barreira: { jogadores: 3, miraX: 3 },
    goleiroX: -0.1,
  },
};

const parametros = new URLSearchParams(location.search);
const modelo = MODELOS[parametros.get('cena') ?? 'falta'] ?? MODELOS.falta;
const time = TIMES.find((t) => t.id === (parametros.get('time') ?? 'flamengo')) ?? TIMES[0];

const W = window.innerWidth;
const H = window.innerHeight;
const canvas = document.createElement('canvas');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.cssText = `width:${W}px;height:${H}px;display:block`;
document.body.append(canvas);
const c = canvas.getContext('2d')!;
c.scale(dpr, dpr);

const cam: Camera = cameraAtrasDaBola(modelo.bola, modelo.enquadramento, W, H);
const p = (x: number, y: number, z: number) => cam.projetar({ x, y, z });

/** Polígono no mundo (pontos em metros) preenchido na tela. */
function poligono(pts: Ponto3[], cor: string): void {
  c.fillStyle = cor;
  c.beginPath();
  pts.forEach((q, i) => {
    const t = cam.projetar(q);
    if (i === 0) c.moveTo(t.x, t.y);
    else c.lineTo(t.x, t.y);
  });
  c.fill();
}

/** Linha do campo: segmento no chão, picado em pedaços para a perspectiva ficar certa. */
function linhaNoChao(a: { x: number; z: number }, b: { x: number; z: number }, largura = 0.12): void {
  const n = 24;
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const q0 = p(a.x + (b.x - a.x) * t0, 0, a.z + (b.z - a.z) * t0);
    const q1 = p(a.x + (b.x - a.x) * t1, 0, a.z + (b.z - a.z) * t1);
    if (q0.prof <= 0.5 || q1.prof <= 0.5) continue;
    c.lineWidth = Math.min(5, Math.max(1, (largura * (q0.escala + q1.escala)) / 2));
    c.beginPath();
    c.moveTo(q0.x, q0.y);
    c.lineTo(q1.x, q1.y);
    c.stroke();
  }
}

function arcoNoChao(cx: number, cz: number, r: number, de: number, ate: number, filtro: (x: number, z: number) => boolean): void {
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a0 = de + ((ate - de) * i) / n;
    const a1 = de + ((ate - de) * (i + 1)) / n;
    const x0 = cx + Math.sin(a0) * r;
    const z0 = cz + Math.cos(a0) * r;
    const x1 = cx + Math.sin(a1) * r;
    const z1 = cz + Math.cos(a1) * r;
    if (filtro(x0, z0) && filtro(x1, z1)) linhaNoChao({ x: x0, z: z0 }, { x: x1, z: z1 });
  }
}

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function arquibancada(): void {
  const grad = c.createLinearGradient(0, 0, 0, H * 0.5);
  grad.addColorStop(0, '#04130a');
  grad.addColorStop(1, '#0d2b18');
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  // Degraus subindo atrás do gol: torcedores nas cores do time.
  for (let fila = 0; fila < 26; fila++) {
    const y = 0.6 + fila * 0.55;
    const z = -9 - fila * 0.8;
    for (let x = -60; x <= 60; x += 0.7) {
      const h = hash(x * 3.1, fila);
      const q = p(x + (fila % 2) * 0.35, y, z);
      if (q.prof <= 1 || q.y < -10 || q.y > H) continue;
      const r = 0.24 * q.escala;
      c.fillStyle = h < 0.42 ? time.cores[0] : h < 0.78 ? time.cores[1] : '#3a3f4a';
      c.beginPath();
      c.arc(q.x, q.y, Math.max(0.8, r), 0, Math.PI * 2);
      c.fill();
    }
  }
  // Placas de beira de campo.
  for (let i = -8; i < 8; i++) {
    poligono(
      [
        { x: i * 6, y: 0, z: -7 },
        { x: i * 6 + 5.8, y: 0, z: -7 },
        { x: i * 6 + 5.8, y: 0.9, z: -7 },
        { x: i * 6, y: 0.9, z: -7 },
      ],
      i % 2 ? time.cores[0] : time.cores[1],
    );
  }
}

function gramado(): void {
  poligono(
    [
      { x: -70, y: 0, z: -7 },
      { x: 70, y: 0, z: -7 },
      { x: 70, y: 0, z: 90 },
      { x: -70, y: 0, z: 90 },
    ],
    '#0f4a26',
  );
  for (let z = -7, k = 0; z < 90; z += 5.5, k++) {
    if (k % 2) continue;
    poligono(
      [
        { x: -70, y: 0, z },
        { x: 70, y: 0, z },
        { x: 70, y: 0, z: z + 5.5 },
        { x: -70, y: 0, z: z + 5.5 },
      ],
      '#145a2f',
    );
  }
  c.strokeStyle = 'rgba(245,245,240,0.85)';
  linhaNoChao({ x: -34, z: 0 }, { x: 34, z: 0 });
  // Grande área (40,32 × 16,5 m), pequena área (18,32 × 5,5 m), marca do pênalti e meia-lua.
  linhaNoChao({ x: -20.16, z: 0 }, { x: -20.16, z: 16.5 });
  linhaNoChao({ x: -20.16, z: 16.5 }, { x: 20.16, z: 16.5 });
  linhaNoChao({ x: 20.16, z: 16.5 }, { x: 20.16, z: 0 });
  linhaNoChao({ x: -9.16, z: 0 }, { x: -9.16, z: 5.5 });
  linhaNoChao({ x: -9.16, z: 5.5 }, { x: 9.16, z: 5.5 });
  linhaNoChao({ x: 9.16, z: 5.5 }, { x: 9.16, z: 0 });
  arcoNoChao(0, 11, 9.15, -Math.PI / 2, Math.PI / 2, (_x, z) => z > 16.5);
  const marca = p(0, 0, 11);
  c.fillStyle = 'rgba(245,245,240,0.9)';
  c.beginPath();
  c.ellipse(marca.x, marca.y, 0.15 * marca.escala, 0.06 * marca.escala, 0, 0, Math.PI * 2);
  c.fill();
}

function gol(frente: boolean): void {
  const M = 3.66;
  const T = 2.44;
  const F = -2;
  if (!frente) {
    // Rede: fundo, teto e laterais.
    c.strokeStyle = 'rgba(240,240,235,0.45)';
    c.lineWidth = 1;
    const linha = (a: Ponto3, b: Ponto3) => {
      const q0 = cam.projetar(a);
      const q1 = cam.projetar(b);
      c.beginPath();
      c.moveTo(q0.x, q0.y);
      c.lineTo(q1.x, q1.y);
      c.stroke();
    };
    for (let x = -M; x <= M + 0.01; x += 0.3) {
      linha({ x, y: 0, z: F }, { x, y: T * 0.82, z: F });
      linha({ x, y: T * 0.82, z: F }, { x, y: T, z: 0 });
    }
    for (let y = 0; y <= T * 0.82 + 0.01; y += 0.3) {
      linha({ x: -M, y, z: F }, { x: M, y, z: F });
      linha({ x: -M, y, z: F }, { x: -M, y: Math.min(T, y / 0.82), z: 0 });
      linha({ x: M, y, z: F }, { x: M, y: Math.min(T, y / 0.82), z: 0 });
    }
    return;
  }
  c.strokeStyle = '#ffffff';
  c.lineCap = 'round';
  const trave = (a: Ponto3, b: Ponto3) => {
    const q0 = cam.projetar(a);
    const q1 = cam.projetar(b);
    c.lineWidth = Math.max(3, 0.12 * q0.escala);
    c.beginPath();
    c.moveTo(q0.x, q0.y);
    c.lineTo(q1.x, q1.y);
    c.stroke();
  };
  trave({ x: -M, y: 0, z: 0 }, { x: -M, y: T, z: 0 });
  trave({ x: M, y: 0, z: 0 }, { x: M, y: T, z: 0 });
  trave({ x: -M, y: T, z: 0 }, { x: M, y: T, z: 0 });
}

/** Boneco de pé em (x, z): 100 unidades do desenho ≈ 1,95 m. */
function boneco(b: ReturnType<typeof criarBoneco>, x: number, z: number, pose: Float32Array): void {
  const q = p(x, 0, z);
  const esc = (q.escala * 1.95) / 100;
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(q.x, q.y + 1, 14 * esc, 3.5 * esc, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(q.x, q.y);
  c.scale(esc, esc);
  desenharBoneco(c, b, pose);
  c.restore();
}

function bola(x: number, z: number): void {
  // Bola desenhada maior que a real (×2,2) para o dedo achar; na física continua com 11 cm.
  const q = p(x, 0.11, z);
  const r = 0.11 * q.escala * 2.2;
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(q.x, q.y + r * 0.9, r, r * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f2f2ee';
  c.beginPath();
  c.arc(q.x, q.y, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1b1b1b';
  for (let k = 0; k < 6; k++) {
    const a = k * ((Math.PI * 2) / 5);
    const d = k === 5 ? 0 : 0.7;
    c.beginPath();
    c.arc(q.x + Math.cos(a) * r * d, q.y + Math.sin(a) * r * d, r * (k === 5 ? 0.3 : 0.22), 0, Math.PI * 2);
    c.fill();
  }
}

function setaDaJogada(de: { x: number; z: number }, ate: { x: number; z: number }): void {
  c.save();
  c.strokeStyle = 'rgba(255,210,63,0.95)';
  c.setLineDash([10, 8]);
  c.lineWidth = 4;
  c.beginPath();
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const alto = Math.sin(t * Math.PI) * 4;
    const q = p(de.x + (ate.x - de.x) * t, alto, de.z + (ate.z - de.z) * t);
    if (i === 0) c.moveTo(q.x, q.y);
    else c.lineTo(q.x, q.y);
  }
  c.stroke();
  c.restore();
  const q = p(de.x, 0, de.z);
  c.fillStyle = 'rgba(255,210,63,0.95)';
  c.beginPath();
  c.arc(q.x, q.y, 6, 0, Math.PI * 2);
  c.fill();
}

// ---------- cena ----------
const u = uniformesDaPartida(time.cores, null, 0);
const goleiro = criarBoneco(sortearAparencia(), u.goleiroAdversario, true);
const batedor = criarBoneco(sortearAparencia(), u.jogador, false);
const pose = novaPose();

arquibancada();
gramado();
gol(false);

// Goleiro: na linha (lado aberto) ou adiantado, na reta entre o gol e a bola.
const d = Math.hypot(modelo.bola.x, modelo.bola.z);
const saida = modelo.goleiroSaida ?? 0.3;
const gx0 = (modelo.goleiroX ?? 0) * 3.66;
boneco(goleiro, gx0 + (modelo.bola.x - gx0) * (saida / d), modelo.bola.z * (saida / d), GOLEIRO.pronto);
gol(true);

// Barreira: a 9,15 m da bola, de frente para o ponto do gol que tapa.
if (modelo.barreira) {
  const mx = modelo.barreira.miraX - modelo.bola.x;
  const mz = -modelo.bola.z;
  const dm = Math.hypot(mx, mz);
  const ux = mx / dm;
  const uz = mz / dm;
  const cx = modelo.bola.x + ux * 9.15;
  const cz = modelo.bola.z + uz * 9.15;
  poseParado(0, pose);
  const n = modelo.barreira.jogadores;
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * 0.55;
    const b = criarBoneco(sortearAparencia(), u.adversario, true);
    boneco(b, cx - uz * o, cz + ux * o, pose);
  }
}

if (modelo.chegada) setaDaJogada(modelo.chegada.de, modelo.bola);

// Batedor atrás e à esquerda da bola (na direção da câmera).
const ux = modelo.bola.x / d;
const uz = modelo.bola.z / d;
bola(modelo.bola.x, modelo.bola.z);
poseParado(0, pose);
boneco(batedor, modelo.bola.x + ux * 1.1 - uz * 0.8, modelo.bola.z + uz * 1.1 + ux * 0.8, pose);

// HUD do jogo, para ver o conjunto.
const hud = document.createElement('div');
hud.innerHTML = `
  <div class="topo"><span>LANCE 1 DE 3</span><strong>0 pts</strong></div>
  <p class="situacao">${modelo.titulo} · ${modelo.situacao}</p>
  ${modelo.chegada ? `<div class="chegada"><b>A JOGADA</b>${modelo.chegada.texto}</div>` : ''}
  <p class="rotulo-modelo">Modelo · ${modelo.titulo === 'Pênaltis' ? 'Pênaltis' : modelo.barreira ? 'Falta' : 'Cara a cara'}</p>`;
document.body.append(hud);
