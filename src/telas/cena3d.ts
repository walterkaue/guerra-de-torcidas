// Cena 3D dos Lances (faltas e cara a cara): câmera atrás da bola (telas/camera.ts), com a grande área, a
// pequena área e a meia-lua no chão, gol com rede, barreira a 9,15 m da bola, goleiro, batedor e bola.
// Só desenho e leitura do gesto: quem decide o lance é o motor puro (jogo/lances.ts). Os Pênaltis continuam
// na cena de TV de sempre (telas/cena.ts).

import type { GestoCobranca } from '../jogo/penaltis';
import { GOLEIRO, desenharBoneco, misturar, novaPose, poseGoleiroEsperando, type Boneco, type Pose } from './bonecos';
import { cameraAtrasDaBola, cameraDoReplay, type Camera, type Enquadramento, type NaTela, type Ponto3 } from './camera';
import { desenharBolaEm, desenharPontosEm, desenharRastroEm, facil, limitar01, suave } from './cena';
import { vibrar } from './toque';
import { qualidade } from './qualidade';

const MEIA_GOL = 3.66;
const ALTURA_GOL = 2.44;
const FUNDO_REDE = -2;
/** Comprimento do campo (m): a linha do gol de lá, que aparece no replay. */
const FIM_DO_CAMPO = 105;
/** Metros por unidade do desenho do boneco (100 unidades ≈ 1,95 m, como o goleiro dos pênaltis). */
const METRO_POR_UNIDADE = 1.95 / 100;
/** A pelve do boneco, onde ele gira no pulo: 50 unidades acima dos pés. */
const CENTRO = 50;
/** A bola aparece maior que a real para o dedo achar (na física ela tem 11 cm). */
const BOLA_MAIOR = 2.2;
const RAIO_BOLA = 0.11;
const DUR_TREMIDA = 120;
const DUR_QUEDA = 340;

export interface OpcoesCena3d {
  cores: readonly [string, string];
  relogio: () => number;
  reduzido: boolean;
}

export interface Barreira3d {
  jogadores: number;
  miraX: number;
}

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function criarCena3d(canvas: HTMLCanvasElement, { cores, relogio, reduzido }: OpcoesCena3d) {
  const c = canvas.getContext('2d')!;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let bola = { x: 0, z: 11 };
  let enquadramento: Enquadramento | null = null;
  let cam: Camera | null = null;
  let fundo: HTMLCanvasElement | null = null;
  /** Replay de TV (telas/replay.ts): câmera atrás do gol, rede desenhada na frente e bonecos espelhados. */
  let replay: { fimX: number; rede: HTMLCanvasElement | null } | null = null;
  let gradBola: CanvasGradient | null = null;
  const efeitos = {
    tremida: -Infinity,
    pontos: [] as { inicio: number; x: number; y: number; texto: string }[],
  };

  const p = (x: number, y: number, z: number): NaTela => cam!.projetar({ x, y, z });

  // ---------- montagem ----------
  function medir(): void {
    dpr = Math.min(window.devicePixelRatio || 1, qualidade().dprMax);
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    gradBola = c.createRadialGradient(-0.4, -0.45, 0.1, 0, 0, 1.05);
    gradBola.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradBola.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradBola.addColorStop(1, 'rgba(0,0,0,0.38)');
    montar();
  }

  /** Troca o lance: posição da bola (m) e o enquadramento da câmera. */
  function definirLance(posBola: { x: number; z: number }, e: Enquadramento): void {
    bola = posBola;
    enquadramento = e;
    montar();
  }

  function novaCamada(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const off = document.createElement('canvas');
    off.width = Math.round(W * dpr);
    off.height = Math.round(H * dpr);
    const o = off.getContext('2d')!;
    o.scale(dpr, dpr);
    return [off, o];
  }

  /**
   * O que não mexe (torcida, gramado, linhas e rede) vai para um canvas à parte, copiado a cada quadro.
   * No replay a câmera fica atrás do gol: a torcida é a do outro lado do campo e a rede vai para uma
   * camada da frente, desenhada por cima de tudo.
   */
  function montar(): void {
    if (!W || !enquadramento) return;
    cam = replay ? cameraDoReplay(bola, replay.fimX, W, H) : cameraAtrasDaBola(bola, enquadramento, W, H);
    const [off, o] = novaCamada();
    arquibancada(o, !!replay);
    gramado(o, replay ? FIM_DO_CAMPO + 4 : 90);
    if (replay) outroLadoDoCampo(o);
    if (replay) {
      const [r, or] = novaCamada();
      rede(or);
      replay.rede = r;
    } else rede(o);
    fundo = off;
  }

  /** Liga a câmera do replay (bola entrou em `fimX` metros) ou volta para a câmera do lance. */
  function modoReplay(fimX: number | null): void {
    replay = fimX === null ? null : { fimX, rede: null };
    montar();
  }

  /** No replay, a rede fica entre a câmera e o lance: vai por cima de tudo. */
  function desenharRedeNaFrente(): void {
    if (replay?.rede) c.drawImage(replay.rede, 0, 0, W, H);
  }

  function poligono(o: CanvasRenderingContext2D, pts: Ponto3[], cor: string): void {
    o.fillStyle = cor;
    o.beginPath();
    pts.forEach((q, i) => {
      const t = cam!.projetar(q);
      if (i === 0) o.moveTo(t.x, t.y);
      else o.lineTo(t.x, t.y);
    });
    o.fill();
  }

  /** `longe`: a torcida do outro lado do campo (replay, câmera atrás do gol olhando para o campo). */
  function arquibancada(o: CanvasRenderingContext2D, longe: boolean): void {
    const grad = o.createLinearGradient(0, 0, 0, H * 0.5);
    grad.addColorStop(0, '#04130a');
    grad.addColorStop(1, '#0d2b18');
    o.fillStyle = grad;
    o.fillRect(0, 0, W, H);
    // Degraus subindo atrás do gol, com torcedores nas cores do time (sorteio fixo por lugar).
    // A do outro lado (replay) é mais alta: a câmera do replay fica no alto e enxerga mais degraus.
    const filas = longe ? 96 : 26;
    for (let fila = 0; fila < filas; fila++) {
      const y = 0.6 + fila * (longe ? 0.75 : 0.55);
      const z = longe ? FIM_DO_CAMPO + 9 + fila * 0.8 : -9 - fila * 0.8;
      for (let x = -60; x <= 60; x += longe ? 1 : 0.7) {
        const q = p(x + (fila % 2) * 0.35, y, z);
        if (q.prof <= 1 || q.y < -10 || q.y > H || q.x < -10 || q.x > W + 10) continue;
        const h = hash(x * 3.1, fila);
        o.fillStyle = h < 0.42 ? cores[0] : h < 0.78 ? cores[1] : '#3a3f4a';
        o.beginPath();
        o.arc(q.x, q.y, Math.max(0.8, 0.24 * q.escala), 0, Math.PI * 2);
        o.fill();
      }
    }
    // Placas lisas de beira de campo nas cores do time (sem marca, sem texto).
    const zPlaca = longe ? FIM_DO_CAMPO + 7 : -7;
    for (let i = -10; i < 10; i++) {
      poligono(
        o,
        [
          { x: i * 6, y: 0, z: zPlaca },
          { x: i * 6 + 5.8, y: 0, z: zPlaca },
          { x: i * 6 + 5.8, y: 0.9, z: zPlaca },
          { x: i * 6, y: 0.9, z: zPlaca },
        ],
        i % 2 ? cores[0] : cores[1],
      );
    }
  }

  /** Linha do campo picada em pedaços (a perspectiva fica certa) e com espessura limitada perto da câmera. */
  function linhaNoChao(o: CanvasRenderingContext2D, a: { x: number; z: number }, b: { x: number; z: number }): void {
    const n = 24;
    o.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const q0 = p(a.x + ((b.x - a.x) * i) / n, 0, a.z + ((b.z - a.z) * i) / n);
      const q1 = p(a.x + ((b.x - a.x) * (i + 1)) / n, 0, a.z + ((b.z - a.z) * (i + 1)) / n);
      if (q0.prof <= 0.5 || q1.prof <= 0.5) continue;
      o.lineWidth = Math.min(5, Math.max(1, (0.12 * (q0.escala + q1.escala)) / 2));
      o.beginPath();
      o.moveTo(q0.x, q0.y);
      o.lineTo(q1.x, q1.y);
      o.stroke();
    }
  }

  function gramado(o: CanvasRenderingContext2D, fimZ: number): void {
    const chao = (z0: number, z1: number, cor: string) =>
      poligono(
        o,
        [
          { x: -70, y: 0, z: z0 },
          { x: 70, y: 0, z: z0 },
          { x: 70, y: 0, z: z1 },
          { x: -70, y: 0, z: z1 },
        ],
        cor,
      );
    chao(-7, fimZ, '#0f4a26');
    for (let z = -7, k = 0; z < fimZ; z += 5.5, k++) if (k % 2 === 0) chao(z, Math.min(fimZ, z + 5.5), '#145a2f');
    o.strokeStyle = 'rgba(245,245,240,0.85)';
    linhaNoChao(o, { x: -34, z: 0 }, { x: 34, z: 0 });
    // Grande área (40,32 × 16,5 m), pequena área (18,32 × 5,5 m), marca do pênalti e meia-lua.
    for (const [a, b] of [
      [{ x: -20.16, z: 0 }, { x: -20.16, z: 16.5 }],
      [{ x: -20.16, z: 16.5 }, { x: 20.16, z: 16.5 }],
      [{ x: 20.16, z: 16.5 }, { x: 20.16, z: 0 }],
      [{ x: -9.16, z: 0 }, { x: -9.16, z: 5.5 }],
      [{ x: -9.16, z: 5.5 }, { x: 9.16, z: 5.5 }],
      [{ x: 9.16, z: 5.5 }, { x: 9.16, z: 0 }],
    ] as const) {
      linhaNoChao(o, a, b);
    }
    // Meia-lua: arco de 9,15 m em volta da marca, só a parte fora da área.
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (Math.PI * i) / n;
      const a1 = -Math.PI / 2 + (Math.PI * (i + 1)) / n;
      const p0 = { x: Math.sin(a0) * 9.15, z: 11 + Math.cos(a0) * 9.15 };
      const p1 = { x: Math.sin(a1) * 9.15, z: 11 + Math.cos(a1) * 9.15 };
      if (p0.z > 16.5 && p1.z > 16.5) linhaNoChao(o, p0, p1);
    }
    const marca = p(0, 0, 11);
    if (marca.prof > 0.5) {
      o.fillStyle = 'rgba(245,245,240,0.9)';
      o.beginPath();
      o.ellipse(marca.x, marca.y, 0.15 * marca.escala, 0.06 * marca.escala, 0, 0, Math.PI * 2);
      o.fill();
    }
  }

  /**
   * No replay a câmera olha o campo inteiro: laterais, linha do meio, círculo central, a área e o gol
   * do outro lado (105 m, como num campo oficial). Tudo pré-desenhado uma vez, no fundo.
   */
  function outroLadoDoCampo(o: CanvasRenderingContext2D): void {
    const F = FIM_DO_CAMPO;
    const M = F / 2;
    o.strokeStyle = 'rgba(245,245,240,0.85)';
    for (const [a, b] of [
      [{ x: -34, z: 0 }, { x: -34, z: F }],
      [{ x: 34, z: 0 }, { x: 34, z: F }],
      [{ x: -34, z: M }, { x: 34, z: M }],
      [{ x: -34, z: F }, { x: 34, z: F }],
      [{ x: -20.16, z: F }, { x: -20.16, z: F - 16.5 }],
      [{ x: -20.16, z: F - 16.5 }, { x: 20.16, z: F - 16.5 }],
      [{ x: 20.16, z: F - 16.5 }, { x: 20.16, z: F }],
      [{ x: -9.16, z: F }, { x: -9.16, z: F - 5.5 }],
      [{ x: -9.16, z: F - 5.5 }, { x: 9.16, z: F - 5.5 }],
      [{ x: 9.16, z: F - 5.5 }, { x: 9.16, z: F }],
    ] as const) {
      linhaNoChao(o, a, b);
    }
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = (Math.PI * 2 * i) / n;
      const a1 = (Math.PI * 2 * (i + 1)) / n;
      linhaNoChao(o, { x: Math.sin(a0) * 9.15, z: M + Math.cos(a0) * 9.15 }, { x: Math.sin(a1) * 9.15, z: M + Math.cos(a1) * 9.15 });
    }
    // Gol de lá: rede escura e traves brancas (longe, então finas).
    poligono(
      o,
      [
        { x: -MEIA_GOL, y: 0, z: F + 2 },
        { x: MEIA_GOL, y: 0, z: F + 2 },
        { x: MEIA_GOL, y: ALTURA_GOL * 0.82, z: F + 2 },
        { x: -MEIA_GOL, y: ALTURA_GOL * 0.82, z: F + 2 },
      ],
      'rgba(0,0,0,0.3)',
    );
    o.strokeStyle = '#ffffff';
    o.lineCap = 'round';
    const trave = (a: Ponto3, b: Ponto3) => {
      const q0 = p(a.x, a.y, a.z);
      const q1 = p(b.x, b.y, b.z);
      o.lineWidth = Math.max(1.5, 0.12 * q0.escala);
      o.beginPath();
      o.moveTo(q0.x, q0.y);
      o.lineTo(q1.x, q1.y);
      o.stroke();
    };
    trave({ x: -MEIA_GOL, y: 0, z: F }, { x: -MEIA_GOL, y: ALTURA_GOL, z: F });
    trave({ x: MEIA_GOL, y: 0, z: F }, { x: MEIA_GOL, y: ALTURA_GOL, z: F });
    trave({ x: -MEIA_GOL, y: ALTURA_GOL, z: F }, { x: MEIA_GOL, y: ALTURA_GOL, z: F });
  }

  function rede(o: CanvasRenderingContext2D): void {
    const linha = (a: Ponto3, b: Ponto3) => {
      const q0 = cam!.projetar(a);
      const q1 = cam!.projetar(b);
      o.beginPath();
      o.moveTo(q0.x, q0.y);
      o.lineTo(q1.x, q1.y);
      o.stroke();
    };
    const alto = ALTURA_GOL * 0.82;
    poligono(
      o,
      [
        { x: -MEIA_GOL, y: 0, z: FUNDO_REDE },
        { x: MEIA_GOL, y: 0, z: FUNDO_REDE },
        { x: MEIA_GOL, y: alto, z: FUNDO_REDE },
        { x: -MEIA_GOL, y: alto, z: FUNDO_REDE },
      ],
      'rgba(0,0,0,0.22)',
    );
    o.strokeStyle = 'rgba(240,240,235,0.42)';
    o.lineWidth = 1;
    for (let x = -MEIA_GOL; x <= MEIA_GOL + 0.01; x += 0.3) {
      linha({ x, y: 0, z: FUNDO_REDE }, { x, y: alto, z: FUNDO_REDE });
      linha({ x, y: alto, z: FUNDO_REDE }, { x, y: ALTURA_GOL, z: 0 });
    }
    for (let y = 0; y <= alto + 0.01; y += 0.3) {
      linha({ x: -MEIA_GOL, y, z: FUNDO_REDE }, { x: MEIA_GOL, y, z: FUNDO_REDE });
      linha({ x: -MEIA_GOL, y, z: FUNDO_REDE }, { x: -MEIA_GOL, y: Math.min(ALTURA_GOL, y / 0.82), z: 0 });
      linha({ x: MEIA_GOL, y, z: FUNDO_REDE }, { x: MEIA_GOL, y: Math.min(ALTURA_GOL, y / 0.82), z: 0 });
    }
  }

  // ---------- quadro ----------
  /** Começo do quadro (depois do c.save()): tremida do gol e o fundo pronto. */
  function desenharFundo(agora: number): void {
    if (agora - efeitos.tremida < DUR_TREMIDA) {
      const f = 1 - (agora - efeitos.tremida) / DUR_TREMIDA;
      c.translate((Math.random() * 2 - 1) * 5 * f, (Math.random() * 2 - 1) * 5 * f);
    }
    if (fundo) c.drawImage(fundo, 0, 0, W, H);
  }

  function desenharTraves(): void {
    c.strokeStyle = '#ffffff';
    c.lineCap = 'round';
    const trave = (a: Ponto3, b: Ponto3) => {
      const q0 = cam!.projetar(a);
      const q1 = cam!.projetar(b);
      c.lineWidth = Math.max(3, 0.12 * q0.escala);
      c.beginPath();
      c.moveTo(q0.x, q0.y);
      c.lineTo(q1.x, q1.y);
      c.stroke();
    };
    trave({ x: -MEIA_GOL, y: 0, z: 0 }, { x: -MEIA_GOL, y: ALTURA_GOL, z: 0 });
    trave({ x: MEIA_GOL, y: 0, z: 0 }, { x: MEIA_GOL, y: ALTURA_GOL, z: 0 });
    trave({ x: -MEIA_GOL, y: ALTURA_GOL, z: 0 }, { x: MEIA_GOL, y: ALTURA_GOL, z: 0 });
  }

  function sombra(x: number, z: number, larguraM: number): void {
    const q = p(x, 0, z);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(q.x, q.y + 1, larguraM * q.escala, larguraM * 0.25 * q.escala, 0, 0, Math.PI * 2);
    c.fill();
  }

  /** Boneco de pé em (x, z), virado para a câmera ou de costas (como ele foi criado). */
  function desenharBonecoEm(b: Boneco, x: number, z: number, pose: Pose, realce = false): void {
    const q = p(x, 0, z);
    const esc = q.escala * METRO_POR_UNIDADE;
    sombra(x, z, 0.28);
    c.save();
    c.translate(q.x, q.y);
    // No replay a câmera olha do outro lado: o boneco aparece espelhado (e com o outro lado do corpo).
    c.scale(replay ? -esc : esc, esc);
    desenharBoneco(c, b, pose, realce);
    c.restore();
  }

  /** Onde a barreira fica: a 9,15 m da bola, de frente para o ponto do gol que ela tapa (como no motor). */
  function posicoesDaBarreira(b: Barreira3d): { x: number; z: number }[] {
    const mx = b.miraX - bola.x;
    const mz = -bola.z;
    const dm = Math.hypot(mx, mz);
    const ux = mx / dm;
    const uz = mz / dm;
    const cx = bola.x + ux * 9.15;
    const cz = bola.z + uz * 9.15;
    return Array.from({ length: b.jogadores }, (_, k) => {
      const o = (k - (b.jogadores - 1) / 2) * 0.5;
      return { x: cx - uz * o, z: cz + ux * o };
    });
  }

  function desenharBarreira(b: Barreira3d, bonecos: Boneco[], pose: Pose): void {
    const pos = posicoesDaBarreira(b);
    // De trás para a frente (o mais longe da câmera primeiro).
    pos
      .map((q, k) => ({ ...q, k, prof: p(q.x, 0, q.z).prof }))
      .sort((a, z) => z.prof - a.prof)
      .forEach((q) => desenharBonecoEm(bonecos[q.k % bonecos.length], q.x, q.z, pose));
  }

  /** Ponto no meio da barreira, na altura do peito (onde a bola bate quando para nela). */
  function pontoDaBarreira(b: Barreira3d): Ponto3 {
    const pos = posicoesDaBarreira(b);
    const m = pos[Math.floor(pos.length / 2)];
    return { x: m.x, y: 1.4, z: m.z };
  }

  // ---------- goleiro ----------
  const goleiro = { pose: novaPose() };

  function poseDoPulo(dx: number, alto: boolean): Pose {
    if (dx < -0.6) return alto ? GOLEIRO.altoE : GOLEIRO.baixoE;
    if (dx > 0.6) return alto ? GOLEIRO.altoD : GOLEIRO.baixoD;
    return alto ? GOLEIRO.meioAlto : GOLEIRO.meioBaixo;
  }

  function poseDaQueda(dx: number, alto: boolean, pegou: boolean): Pose {
    if (dx < -0.6) return pegou ? GOLEIRO.caidoPegouE : GOLEIRO.caidoE;
    if (dx > 0.6) return pegou ? GOLEIRO.caidoPegouD : GOLEIRO.caidoD;
    return pegou ? GOLEIRO.encaixada : alto ? GOLEIRO.pronto : GOLEIRO.meioBaixo;
  }

  /**
   * Goleiro em (x, z) na linha ou adiantado. Com `alvo` (m), pula na direção dele: `t` de 0 a 1 é o pulo e
   * `alcance` quanto do caminho ele cobre (1 chega na bola). Com `queda` (ms depois do lance), cai no chão.
   */
  function desenharGoleiro(
    b: Boneco,
    x: number,
    z: number,
    agora: number,
    alvo: { x: number; y: number } | null = null,
    t = 0,
    alcance = 1,
    queda = -1,
    pegou = false,
  ): void {
    let cx = x;
    let cy = CENTRO * METRO_POR_UNIDADE;
    let ang = 0;
    if (!alvo || t <= 0) poseGoleiroEsperando(agora, goleiro.pose);
    else {
      const e = facil(limitar01(t)) * alcance;
      const dx = alvo.x - x;
      const alto = alvo.y > 1.2;
      misturar(GOLEIRO.pronto, poseDoPulo(dx, alto), Math.min(1, e * 1.6), goleiro.pose);
      const lado = Math.abs(dx) < 0.6 ? 0 : Math.sign(dx);
      // O corpo vai até as mãos chegarem perto do alvo; de pé quando a bola vem no meio.
      cx = x + dx * e * 0.85;
      cy += (alto ? (alvo.y - 1.1) * 0.6 : -0.15) * e + Math.sin(e * Math.PI) * 0.15;
      ang = lado * (alto ? 1.15 : 1.4) * e;
      if (queda >= 0) {
        const f = limitar01(queda / DUR_QUEDA);
        const s = suave(f);
        misturar(goleiro.pose, poseDaQueda(dx, alto, pegou), s, goleiro.pose);
        if (lado !== 0) {
          cy += (0.3 - cy) * f * f;
          ang += ((lado * Math.PI) / 2 - ang) * s;
        } else cy += (CENTRO * METRO_POR_UNIDADE - cy) * f * f;
      }
    }
    sombra(cx, z, 0.35 + 0.3 * Math.abs(Math.sin(ang)));
    const q = p(cx, cy, z);
    const esc = q.escala * METRO_POR_UNIDADE;
    c.save();
    c.translate(q.x, q.y);
    if (replay) c.scale(-1, 1);
    c.rotate(ang);
    c.scale(esc, esc);
    c.translate(0, CENTRO);
    desenharBoneco(c, b, goleiro.pose);
    c.restore();
  }

  // ---------- batedor e bola ----------
  /** Direção da câmera para a bola, no chão (o batedor fica atrás e à esquerda da bola). */
  function eixo() {
    const d = Math.hypot(bola.x, bola.z) || 1;
    const ux = bola.x / d;
    const uz = bola.z / d;
    // Direita de quem bate (olhando para o gol).
    return { ux, uz, rx: uz, rz: -ux };
  }

  /** Batedor de costas: `avanco` 0 = no lugar da cobrança, 1 = o pé chega na bola. */
  function desenharBatedor(b: Boneco, pose: Pose, avanco = 0): void {
    const { ux, uz, rx, rz } = eixo();
    const atras = 1.1 - 0.7 * avanco;
    const lado = 0.8 - 0.45 * avanco;
    desenharBonecoEm(b, bola.x + ux * atras - rx * lado, bola.z + uz * atras - rz * lado, pose);
  }

  /** Bola no ponto `q` (m; y é a altura do chão até a parte de baixo da bola). */
  function desenharBola3d(q: Ponto3, giro = 0): NaTela {
    const centro = p(q.x, q.y + RAIO_BOLA, q.z);
    const chao = p(q.x, 0, q.z);
    const r = Math.max(3, RAIO_BOLA * centro.escala * BOLA_MAIOR);
    desenharBolaEm(c, centro.x, centro.y, r, chao.y - r * 0.6, giro, gradBola);
    return centro;
  }

  const bolaNaTela = () => p(bola.x, RAIO_BOLA, bola.z);
  /** Ponto do gol na tela, nas unidades do motor (x de -1 a 1, y de 0 a 1). */
  const noGol = (x: number, y: number) => p(x * MEIA_GOL, y * ALTURA_GOL, 0);

  // ---------- gesto ----------
  /**
   * Arraste para gesto, como nos pênaltis: a linha do arraste prolongada até a boca do gol dá o canto,
   * o comprimento (comparado com a distância da bola ao meio do gol na tela) dá a força e a curva no fim, o efeito.
   */
  function lerArraste(pts: { x: number; y: number }[]): GestoCobranca | null {
    const a = pts[0];
    const b = pts[pts.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const comp = Math.hypot(dx, dy);
    const bt = bolaNaTela();
    const esq = noGol(-1, 0.5);
    const dir = noGol(1, 0.5);
    const meio = { x: (esq.x + dir.x) / 2, y: (esq.y + dir.y) / 2 };
    const para = { x: meio.x - bt.x, y: meio.y - bt.y };
    const distGol = Math.hypot(para.x, para.y);
    if (comp < 20 || dx * para.x + dy * para.y < comp * distGol * 0.2) return null;
    // Onde a reta do arraste cruza a reta da boca do gol (u = 0 na trave esquerda, 1 na direita).
    const ex = dir.x - esq.x;
    const ey = dir.y - esq.y;
    const cruz = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
    const den = cruz(ex, ey, dx, dy);
    if (Math.abs(den) < 1e-6) return null;
    const u = cruz(a.x - esq.x, a.y - esq.y, dx, dy) / den;
    const xGol = 2 * u - 1;
    const forca = (comp / distGol) * 70;
    // Efeito: quanto o último terço do arraste dobra em relação à direção geral.
    const k = Math.floor(pts.length * 0.65);
    const m = pts[Math.min(k, pts.length - 2)];
    const ox = dx / comp;
    const oy = dy / comp;
    const lx = b.x - m.x;
    const ly = b.y - m.y;
    const lc = Math.hypot(lx, ly) || 1;
    // Produto vetorial: positivo quando o fim do arraste dobra para a direita.
    let efeito = (ox * (ly / lc) - oy * (lx / lc)) * 160;
    if (Math.abs(efeito) < 15) efeito = 0;
    return { dir: (xGol / 1.1) * 100, forca, efeito };
  }

  // ---------- efeitos ----------
  function comemorar(x: number, y: number, pontos: number): void {
    const agora = relogio();
    if (pontos > 0) efeitos.pontos.push({ inicio: agora, x, y, texto: `+${pontos}` });
    if (!reduzido && qualidade().tremida) efeitos.tremida = agora;
    vibrar(reduzido ? 'acerto' : 'gol');
  }

  const desenharRastro = (rastro: readonly { x: number; y: number }[]) => desenharRastroEm(c, rastro);
  function desenharPontos(agora: number): void {
    efeitos.pontos = desenharPontosEm(c, efeitos.pontos, agora, Math.max(28, W * 0.09));
  }

  return {
    c,
    medir,
    definirLance,
    modoReplay,
    desenharFundo,
    desenharRedeNaFrente,
    desenharTraves,
    desenharGoleiro,
    desenharBarreira,
    pontoDaBarreira,
    desenharBatedor,
    desenharBola3d,
    bolaNaTela,
    noGol,
    projetar: (q: Ponto3) => p(q.x, q.y, q.z),
    eixo,
    lerArraste,
    comemorar,
    desenharRastro,
    desenharPontos,
  };
}

export type Cena3d = ReturnType<typeof criarCena3d>;
