// Cena do gol em canvas, compartilhada pelos Pênaltis e pelos Lances do Jogo: perspectiva de TV,
// gramado, torcida, rede, traves, goleiro, batedor, bola, rastro do dedo, efeitos e a leitura do
// arraste. Só desenho e gesto: quem decide o lance é o motor puro (jogo/penaltis.ts, jogo/lances.ts).

import { coluna, linha, type GestoCobranca } from '../jogo/penaltis';
import { GOLEIRO, desenharBoneco, maos, misturar, novaPose, poseGoleiroEsperando, type Boneco, type Pose } from './bonecos';
import { vibrar } from './toque';
import { qualidade } from './qualidade';
import { somTrave } from '../jogo/som';
import { criarPapelPicado } from './papelPicado';

/** Rastro do dedo: [largura, opacidade] do brilho e do traço. */
const BRILHO_DO_RASTRO = [
  [2.4, 0.25],
  [1, 1],
] as const;

// Efeitos (docs/visual.md, seção 4): tudo curto; só o grito do narrador passa de 400 ms.
const DUR_TREMIDA = 120;
/** Bola que bateu na trave volta quicando para o campo (só desenho). */
const DUR_REBOTE = 800;
/** Bola espalmada sai pela linha de fundo, para o lado e para cima. */
const DUR_ESPALMADA = 520;
/** Brilho no ponto em que a bola bateu na trave. */
const DUR_BATIDA_TRAVE = 260;
const DUR_REDE = 400;
const DUR_OLA = 400;
const DUR_PONTOS = 1100;

// Perspectiva de TV: câmera atrás do batedor com teleobjetiva. As linhas que vão para o gol
// convergem num ponto de fuga acima da tela. Medidas em metros, só para o desenho.
const PROF_CAMERA = 40;
const DIST_MARCA = 11;
/** Meia largura da pequena área, estilizada (a real tem 9,16 m) para caber na tela. */
const MEIA_PEQUENA_AREA = 3.75;
const PROF_PEQUENA_AREA = 5.5;
const PROF_REDE = 2;

export const facil = (t: number) => 1 - (1 - t) * (1 - t);
export const suave = (t: number) => t * t * (3 - 2 * t);
export const limitar01 = (t: number) => Math.max(0, Math.min(1, t));
/**
 * Mola amortecida (0 → 1 passando ~10% do ponto e voltando), a mesma curva de --mola no CSS.
 * Para "pop" de número e adesivo; nunca na física, que continua no motor puro.
 */
export const mola = (t: number) => {
  if (t >= 1) return 1;
  const amort = 0.6;
  const w = 12;
  const wd = w * Math.sqrt(1 - amort * amort);
  return 1 - Math.exp(-amort * w * t) * (Math.cos(wd * t) + (amort / Math.sqrt(1 - amort * amort)) * Math.sin(wd * t));
};

/** Bola com gomos girando, luz da esfera e sombra no chão em `sombraY`. */
export function desenharBolaEm(c: CanvasRenderingContext2D, x: number, y: number, r: number, sombraY: number, giro: number, gradBola: CanvasGradient | null): void {
  const altura = Math.max(0, sombraY - y);
  c.globalAlpha = Math.max(0.12, 0.35 - altura / 600);
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(x + altura * 0.05, sombraY + r * 0.9, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
  c.save();
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#f2f2ee';
  c.fillRect(x - r, y - r, r * 2, r * 2);
  // Gomos girando: o pentágono do meio e os vizinhos passam pela frente da bola.
  c.fillStyle = '#1b1b1b';
  for (let k = 0; k < 6; k++) {
    const a = giro + k * ((Math.PI * 2) / 5);
    const dist = k === 5 ? 0 : 0.78;
    const cx = x + Math.cos(a) * r * dist;
    const cy = y + Math.sin(a) * r * dist * 0.92;
    const tam = r * (k === 5 ? 0.33 : 0.27);
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const b = giro * 1.3 + -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const px = cx + Math.cos(b) * tam;
      const py = cy + Math.sin(b) * tam;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.fill();
  }
  // Luz e sombra da esfera.
  if (gradBola) {
    c.translate(x, y);
    c.scale(r, r);
    c.fillStyle = gradBola;
    c.fillRect(-1, -1, 2, 2);
  }
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
}

/** Rastro amarelo seguindo o dedo: mais grosso e mais forte na ponta. */
export function desenharRastroEm(c: CanvasRenderingContext2D, rastro: readonly { x: number; y: number }[]): void {
  if (rastro.length < 2) return;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.save();
  c.strokeStyle = '#ffd23f';
  const n = rastro.length;
  // Brilho sem filtro: um traço largo e transparente por baixo do traço principal.
  for (let k = 0; k < BRILHO_DO_RASTRO.length; k++) {
    const largura = BRILHO_DO_RASTRO[k][0];
    const alfa = BRILHO_DO_RASTRO[k][1];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      c.globalAlpha = (0.25 + 0.7 * t) * alfa;
      c.lineWidth = (3 + 7 * t) * largura;
      c.beginPath();
      c.moveTo(rastro[i - 1].x, rastro[i - 1].y);
      c.lineTo(rastro[i].x, rastro[i].y);
      c.stroke();
    }
  }
  c.restore();
  const ponta = rastro[n - 1];
  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.arc(ponta.x, ponta.y, 7, 0, Math.PI * 2);
  c.fill();
}

/** "+pontos" subindo, segurando e sumindo. Devolve os que ainda estão na tela. */
export function desenharPontosEm(
  c: CanvasRenderingContext2D,
  lista: readonly { inicio: number; x: number; y: number; texto: string }[],
  agora: number,
  tamanho: number,
): { inicio: number; x: number; y: number; texto: string }[] {
  const vivos = lista.filter((p) => agora - p.inicio < DUR_PONTOS);
  for (const p of vivos) {
    const t = (agora - p.inicio) / DUR_PONTOS;
    // Sobe em 400 ms, segura e some.
    const sobe = facil(Math.min(1, (agora - p.inicio) / 400));
    const alfa = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    c.save();
    c.globalAlpha = alfa;
    c.font = `400 ${Math.round(tamanho)}px Anton, Impact, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = '#111111';
    const y = p.y - 10 - sobe * 46;
    // Entra com pop de mola (de 40% ao tamanho cheio, passando um pouco) em 450 ms.
    const escala = 0.4 + 0.6 * mola(Math.min(1, (agora - p.inicio) / 450));
    c.translate(p.x, y);
    c.scale(escala, escala);
    c.strokeText(p.texto, 0, 0);
    c.fillStyle = '#ffd23f';
    c.fillText(p.texto, 0, 0);
    c.restore();
  }
  return vivos;
}

export interface OpcoesCena {
  /** Cores do time: torcida, bandeiras e placas de beira de campo. */
  cores: readonly [string, string];
  /** Relógio da tela (o mesmo do quadro). */
  relogio: () => number;
  /** prefers-reduced-motion: sem ola nem tremida. */
  reduzido: boolean;
}

export function criarCena(canvas: HTMLCanvasElement, { cores, relogio, reduzido }: OpcoesCena) {
  const c = canvas.getContext('2d')!;
  const papel = criarPapelPicado([cores[0], cores[1], '#ffd23f']);

  // ---------- efeitos ----------
  const efeitos = {
    tremida: -Infinity,
    /** Tremida mais fraca (trave): fração da do gol. */
    forcaTremida: 1,
    ola: -Infinity,
    trave: { inicio: -Infinity, x: 0, y: 0 },
    rede: { inicio: -Infinity, x: 0, y: 0 },
    pontos: [] as { inicio: number; x: number; y: number; texto: string }[],
  };

  // ---------- geometria ----------
  let W = 0;
  let H = 0;
  const g = { gx: 0, gy: 0, gw: 0, gh: 0, chao: 0, bolaX: 0, bolaY: 0, raio: 0, fugaY: 0, escM: 0 };

  function medir(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, qualidade().dprMax);
    const ret = canvas.getBoundingClientRect();
    W = ret.width;
    H = ret.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Gol maior e mais baixo que antes; a bola grande perto do dedo.
    g.gw = Math.min(W * 0.8, 440);
    g.gh = g.gw * 0.4;
    g.gx = (W - g.gw) / 2;
    g.gy = Math.max(H * 0.17, 64);
    g.chao = g.gy + g.gh;
    g.bolaX = W / 2;
    g.bolaY = H * 0.82;
    g.raio = Math.max(16, Math.min(30, W * 0.058));
    g.escM = g.gw / 7.32;
    // Ponto de fuga escolhido para a marca do pênalti (11 m) cair exatamente na bola.
    g.fugaY = g.chao - (g.bolaY - g.chao) / (fator(DIST_MARCA) - 1);
    prepararCenario(dpr);
    prepararDegrades();
  }

  /** Escala de um ponto do chão a z metros da linha do gol (z positivo vem para a câmera). */
  const fator = (z: number) => PROF_CAMERA / (PROF_CAMERA - z);
  const chaoY = (z: number) => g.fugaY + (g.chao - g.fugaY) * fator(z);
  const chaoX = (xm: number, z: number) => W / 2 + xm * g.escM * fator(z);
  /** Fundo do gol: o quadro da frente encolhido em direção ao ponto de fuga. */
  const fundo = (x: number, y: number) => {
    const k = fator(-PROF_REDE);
    return { x: W / 2 + (x - W / 2) * k, y: g.fugaY + (y - g.fugaY) * k };
  };

  /** Coordenadas do motor (x -1..1, y 0..1) para a tela. */
  const telaX = (x: number) => g.gx + ((x + 1) / 2) * g.gw;
  const telaY = (y: number) => g.gy + g.gh - y * g.gh;
  const zonaX = (z: number) => (coluna(z) - 1) * (2 / 3);
  const zonaY = (z: number) => (linha(z) === 1 ? 0.72 : 0.25);
  const centroZona = (z: number) => ({ x: zonaX(z), y: zonaY(z) });

  /** Comemoração de gol ou defesa: ola, "+pontos" subindo e, no gol, tremida, rede e vibração. */
  function comemorar(x: number, y: number, pontos: number, gol: boolean): void {
    const agora = relogio();
    if (!reduzido && qualidade().ola) efeitos.ola = agora;
    if (pontos > 0) efeitos.pontos.push({ inicio: agora, x, y, texto: `+${pontos}` });
    if (!gol) {
      // Defesa de quem joga: um toque de acerto.
      vibrar('acerto');
      return;
    }
    efeitos.rede = { inicio: agora, x, y };
    papel.soltar(x, y, agora);
    if (!reduzido && qualidade().tremida) {
      efeitos.tremida = agora;
      efeitos.forcaTremida = 1;
    }
    vibrar(reduzido ? 'acerto' : 'gol');
  }

  /** Bola na trave: brilho no ponto da batida, tremida curta e fraca, vibração e o "plém". */
  function baterNaTrave(x: number, y: number): void {
    const agora = relogio();
    efeitos.trave = { inicio: agora, x, y };
    if (!reduzido && qualidade().tremida) {
      efeitos.tremida = agora;
      efeitos.forcaTremida = 0.5;
    }
    vibrar('trave');
    somTrave();
  }

  /**
   * Bola que bateu na trave em (x, y), `ms` depois: volta para dentro do campo quicando duas vezes,
   * crescendo um pouco (vem para perto da câmera), e para no gramado entre o gol e a marca.
   */
  function bolaNaTrave(x: number, y: number, ms: number): void {
    const t = limitar01(ms / DUR_REBOTE);
    const voltaPara = x < g.gx + g.gw / 2 ? 1 : -1;
    const e = facil(t);
    const px = x + voltaPara * g.gw * 0.16 * e;
    const chaoFim = g.chao + (g.bolaY - g.chao) * 0.3;
    const chao = g.chao + (chaoFim - g.chao) * e;
    // Altura sobre o chão: começa onde bateu e quica duas vezes, cada vez mais baixo.
    const h0 = Math.max(0, g.chao - y);
    const h = h0 * Math.abs(Math.cos(t * Math.PI * 1.5)) * (1 - t) * (1 - t);
    desenharBola(px, chao - h - g.raio * 0.5, 0.5 + 0.2 * e, chao, t * 10);
  }

  /** Bola espalmada da luva em (x, y): sai para o lado de fora do gol e some atrás da linha de fundo. */
  function bolaEspalmada(x: number, y: number, ms: number): void {
    const t = limitar01(ms / DUR_ESPALMADA);
    if (t >= 1) return;
    const lado = x < g.gx + g.gw / 2 ? -1 : 1;
    const e = facil(t);
    const px = x + lado * g.gw * 0.32 * e;
    const py = y - g.gh * 0.55 * Math.sin(e * Math.PI * 0.8);
    c.save();
    c.globalAlpha = 1 - t * t;
    desenharBola(px, py, 0.5 - 0.15 * e, g.chao - g.raio * 0.5, t * 14);
    c.restore();
  }

  /** Brilho curto no ponto da trave em que a bola bateu (um anel que abre e some). */
  function desenharBatidaNaTrave(agora: number): void {
    const t = (agora - efeitos.trave.inicio) / DUR_BATIDA_TRAVE;
    if (t < 0 || t > 1) return;
    c.save();
    c.globalAlpha = 1 - t;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(efeitos.trave.x, efeitos.trave.y, g.raio * (0.4 + 1.4 * t), 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  /** Converte o arraste em gesto: direção = canto, comprimento = força, curva final = efeito. */
  function lerArraste(pts: { x: number; y: number }[]): GestoCobranca | null {
    const a = pts[0];
    const b = pts[pts.length - 1];
    const dx = b.x - a.x;
    const subida = a.y - b.y;
    const comp = Math.hypot(dx, subida);
    if (subida < 12 || comp < 20) return null;

    // Prolonga a linha do arraste até a altura do gol para achar o canto.
    const distGol = g.bolaY - (g.gy + g.gh / 2);
    const xGol = ((dx / subida) * distGol) / (g.gw / 2);
    const dir = (xGol / 1.1) * 100;
    // Arrastar da bola até o meio do gol dá ~70 (meia altura); passar do gol isola.
    const forca = (comp / distGol) * 70;

    // Efeito: quanto o último terço do arraste dobra em relação à direção geral.
    const k = Math.floor(pts.length * 0.65);
    const m = pts[Math.min(k, pts.length - 2)];
    const ox = dx / comp;
    const oy = -subida / comp;
    const lx = b.x - m.x;
    const ly = b.y - m.y;
    const lc = Math.hypot(lx, ly) || 1;
    // Produto vetorial: positivo quando o fim do arraste dobra para a direita.
    const giro = ox * (ly / lc) - oy * (lx / lc);
    let efeito = giro * 160;
    if (Math.abs(efeito) < 15) efeito = 0;

    return { dir, forca, efeito };
  }

  function zonaTocada(x: number, y: number): number {
    // Toque fora do gol ainda conta: vale a zona mais próxima.
    const gx = Math.max(-0.999, Math.min(0.999, ((x - g.gx) / g.gw) * 2 - 1));
    const gy = Math.max(0, Math.min(1, (g.gy + g.gh - y) / g.gh));
    const col = gx < -1 / 3 ? 0 : gx > 1 / 3 ? 2 : 1;
    return (gy >= 0.5 ? 3 : 0) + col;
  }

  // ---------- desenho ----------
  // O que não mexe (grama, linhas, rede, torcida) vai para canvas à parte e é só copiado a cada
  // quadro; ao vivo ficam bonecos, bola, traves e efeitos. Assim o jogo segura 60 quadros por segundo.
  const fimArquibancada = () => g.gy + g.gh * 0.42;

  function novoCanvas(dpr: number, w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(w * dpr));
    off.height = Math.max(1, Math.round(h * dpr));
    const o = off.getContext('2d')!;
    o.scale(dpr, dpr);
    return [off, o];
  }

  /** Sorteio fixo por posição (a torcida não pode "piscar" entre os quadros). */
  const hash = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  /** Lugares da arquibancada atrás do gol (posição, cor e quem segura bandeira). */
  function lugares(): { x: number; y: number; cor: string; r: number; bandeira: boolean; h: number }[] {
    const lista = [];
    const fim = fimArquibancada() - 12;
    const neutros = ['#2c4a37', '#3a3f4a', '#4a3a2e'];
    let fila = 0;
    for (let y = 9; y < fim - 4; y += 10, fila++) {
      const r = 2.8 + (y / fim) * 1.6;
      for (let x = fila % 2 ? 3 : 9; x < W + 6; x += 11) {
        const h = hash(x, y);
        const cor = h < 0.42 ? cores[0] : h < 0.78 ? cores[1] : neutros[Math.floor(h * 30) % 3];
        lista.push({ x: x + (h - 0.5) * 3, y, r, cor, bandeira: h > 0.965, h });
      }
    }
    return lista;
  }

  function desenharTorcedor(o: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string, h: number, levantou = 0, quadroTorcida = 0, bandeira = false): void {
    // Cada torcedor balança no seu ritmo: 3 quadros de animação, sorteados por pessoa.
    const balanco = Math.sin((quadroTorcida + h * 3) * ((Math.PI * 2) / 3)) * (h > 0.5 ? 1.4 : 0.6);
    const dy = -levantou * r * 2.2 + balanco;
    o.fillStyle = cor;
    o.beginPath();
    o.ellipse(x, y + dy + r * 1.5, r * 1.3, r * 1.05, 0, Math.PI, 0);
    o.fill();
    o.fillStyle = h > 0.6 ? '#3a2a20' : h > 0.3 ? '#6b4a33' : '#8a5f40';
    o.beginPath();
    o.arc(x, y + dy, r * 0.8, 0, Math.PI * 2);
    o.fill();
    const bracos = levantou > 0.3 || (h > 0.88 && quadroTorcida % 3 !== Math.floor(h * 9) % 3);
    if (bracos) {
      o.strokeStyle = cor;
      o.lineWidth = r * 0.6;
      o.beginPath();
      o.moveTo(x - r, y + dy + r * 0.6);
      o.lineTo(x - r * 1.5, y + dy - r * 1.7);
      o.moveTo(x + r, y + dy + r * 0.6);
      o.lineTo(x + r * 1.5, y + dy - r * 1.7);
      o.stroke();
    }
    if (bandeira) {
      // Bandeira lisa nas 2 cores do time, tremulando.
      const onda = Math.sin(quadroTorcida * 2.1 + h * 10) * 3;
      o.strokeStyle = '#ddd';
      o.lineWidth = 1;
      o.beginPath();
      o.moveTo(x + r, y + dy);
      o.lineTo(x + r, y + dy - 22);
      o.stroke();
      o.fillStyle = cores[0];
      o.beginPath();
      o.moveTo(x + r, y + dy - 22);
      o.quadraticCurveTo(x + r + 9, y + dy - 22 + onda, x + r + 18, y + dy - 21);
      o.lineTo(x + r + 18, y + dy - 10);
      o.quadraticCurveTo(x + r + 9, y + dy - 11 + onda, x + r, y + dy - 11);
      o.fill();
      o.fillStyle = cores[1];
      o.fillRect(x + r, y + dy - 17 + onda * 0.3, 18, 2.5);
    }
  }

  const QUADROS_TORCIDA = 3;
  let torcida: HTMLCanvasElement[] = [];
  let campo: HTMLCanvasElement | null = null;
  let rede: HTMLCanvasElement | null = null;
  // Para a ola (torcida redesenhada ao vivo): lugares, fundo e placas prontos, sem refazer a cada quadro.
  let gente: ReturnType<typeof lugares> = [];
  let fundoTorcida: HTMLCanvasElement | null = null;
  let placasTorcida: HTMLCanvasElement | null = null;

  function prepararCenario(dpr: number): void {
    const fim = fimArquibancada();
    gente = lugares();
    levantou = new Float32Array(gente.length);
    deslocado = new Float32Array(gente.length);
    coresDaTorcida = [...new Set(gente.map((l) => l.cor))];
    let o: CanvasRenderingContext2D;
    [fundoTorcida, o] = novoCanvas(dpr, W, fim);
    fundoDaArquibancada(o, fim);
    [placasTorcida, o] = novoCanvas(dpr, W, fim);
    placas(o, fim);
    torcida = Array.from({ length: QUADROS_TORCIDA }, (_, q) => {
      const [off, o] = novoCanvas(dpr, W, fim);
      fundoDaArquibancada(o, fim);
      for (const l of gente) desenharTorcedor(o, l.x, l.y, l.r, l.cor, l.h, 0, q, l.bandeira);
      placas(o, fim);
      return off;
    });
    [campo, o] = novoCanvas(dpr, W, H);
    desenharGramado(o);
    [rede, o] = novoCanvas(dpr, W, H);
    desenharRede(o, null);
  }

  function fundoDaArquibancada(o: CanvasRenderingContext2D, fim: number): void {
    const grad = o.createLinearGradient(0, 0, 0, fim);
    grad.addColorStop(0, '#04130a');
    grad.addColorStop(1, '#0d2b18');
    o.fillStyle = grad;
    o.fillRect(0, 0, W, fim);
    // Degraus da arquibancada.
    o.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 14; y < fim - 12; y += 10) o.fillRect(0, y, W, 1);
  }

  /** Placas lisas de beira de campo nas cores do time (sem marca, sem texto). */
  function placas(o: CanvasRenderingContext2D, fim: number): void {
    const alt = 12;
    const y = fim - alt;
    o.fillStyle = '#0a0a0a';
    o.fillRect(0, y - 1, W, alt + 1);
    const larg = 64;
    for (let x = 0, i = 0; x < W; x += larg, i++) {
      const grad = o.createLinearGradient(0, y, 0, y + alt);
      const cor = i % 2 ? cores[0] : cores[1];
      grad.addColorStop(0, cor);
      grad.addColorStop(1, 'rgba(0,0,0,0.35)');
      o.fillStyle = cor;
      o.fillRect(x + 1, y, larg - 2, alt);
      o.fillStyle = grad;
      o.fillRect(x + 1, y, larg - 2, alt);
    }
  }

  // Ola ao vivo: a torcida é desenhada agrupada por cor (um preenchimento por cor, em vez de um por
  // pessoa), o que corta o custo do quadro sem mudar o desenho de desenharTorcedor.
  const CORES_DA_CABECA = ['#3a2a20', '#6b4a33', '#8a5f40'];
  const corDaCabeca = (h: number) => (h > 0.6 ? 0 : h > 0.3 ? 1 : 2);
  let levantou = new Float32Array(0);
  let deslocado = new Float32Array(0);
  let coresDaTorcida: string[] = [];

  /** Mesma regra de desenharTorcedor: braços para cima na ola ou, de vez em quando, sem motivo. */
  const comBracos = (i: number, q: number) => levantou[i] > 0.3 || (gente[i].h > 0.88 && q % 3 !== Math.floor(gente[i].h * 9) % 3);

  function torcidaAoVivo(q: number): void {
    for (let i = 0; i < gente.length; i++) {
      const l = gente[i];
      const balanco = Math.sin((q + l.h * 3) * ((Math.PI * 2) / 3)) * (l.h > 0.5 ? 1.4 : 0.6);
      deslocado[i] = -levantou[i] * l.r * 2.2 + balanco;
    }
    for (let k = 0; k < coresDaTorcida.length; k++) {
      const cor = coresDaTorcida[k];
      c.fillStyle = cor;
      c.beginPath();
      for (let i = 0; i < gente.length; i++) {
        const l = gente[i];
        if (l.cor !== cor) continue;
        const cy = l.y + deslocado[i] + l.r * 1.5;
        c.moveTo(l.x - l.r * 1.3, cy);
        c.ellipse(l.x, cy, l.r * 1.3, l.r * 1.05, 0, Math.PI, 0);
      }
      c.fill();
      // Braços para cima (na ola ou de vez em quando).
      c.strokeStyle = cor;
      c.lineWidth = 2.1;
      c.beginPath();
      for (let i = 0; i < gente.length; i++) {
        const l = gente[i];
        if (l.cor !== cor || !comBracos(i, q)) continue;
        const y = l.y + deslocado[i];
        c.moveTo(l.x - l.r, y + l.r * 0.6);
        c.lineTo(l.x - l.r * 1.5, y - l.r * 1.7);
        c.moveTo(l.x + l.r, y + l.r * 0.6);
        c.lineTo(l.x + l.r * 1.5, y - l.r * 1.7);
      }
      c.stroke();
    }
    for (let k = 0; k < CORES_DA_CABECA.length; k++) {
      c.fillStyle = CORES_DA_CABECA[k];
      c.beginPath();
      for (let i = 0; i < gente.length; i++) {
        const l = gente[i];
        if (corDaCabeca(l.h) !== k) continue;
        const y = l.y + deslocado[i];
        c.moveTo(l.x + l.r * 0.8, y);
        c.arc(l.x, y, l.r * 0.8, 0, Math.PI * 2);
      }
      c.fill();
    }
    // Bandeiras são poucas: uma a uma, pelo desenho de sempre.
    for (let i = 0; i < gente.length; i++) {
      const l = gente[i];
      if (l.bandeira) desenharTorcedor(c, l.x, l.y, l.r, l.cor, l.h, levantou[i], q, true);
    }
  }

  function desenharArquibancada(agora: number): void {
    const fim = fimArquibancada();
    const t = (agora - efeitos.ola) / DUR_OLA;
    const q = qualidade().torcidaViva ? Math.floor(agora / 170) % QUADROS_TORCIDA : 0;
    if (t < 0 || t > 1.4) {
      if (torcida[q]) c.drawImage(torcida[q], 0, 0, W, fim);
      return;
    }
    // Ola: a onda atravessa da esquerda para a direita e cada torcedor levanta por um instante.
    if (fundoTorcida) c.drawImage(fundoTorcida, 0, 0, W, fim);
    const largura = 0.3;
    const frente = t * (1 + largura * 2) - largura;
    for (let i = 0; i < gente.length; i++) {
      const d = Math.abs(gente[i].x / W - frente) / largura;
      levantou[i] = d < 1 ? Math.sin((1 - d) * (Math.PI / 2)) : 0;
    }
    torcidaAoVivo(q);
    if (placasTorcida) c.drawImage(placasTorcida, 0, 0, W, fim);
  }

  function desenharGramado(o: CanvasRenderingContext2D): void {
    const topo = fimArquibancada();
    o.fillStyle = '#0f4a26';
    o.fillRect(0, topo, W, H - topo);
    // Faixas do corte da grama, cada vez mais altas perto da câmera.
    for (let z = -12; chaoY(z) < H; z += 2.75) {
      const y0 = Math.max(topo, chaoY(z));
      const y1 = Math.min(H, chaoY(z + 2.75));
      if (y1 <= topo) continue;
      if (Math.round(z / 2.75) % 2 === 0) {
        o.fillStyle = '#145a2f';
        o.fillRect(0, y0, W, y1 - y0);
      }
    }
    // Textura: tufos claros e escuros, menores ao fundo.
    for (let i = 0; i < 2600; i++) {
      const y = topo + hash(i, 1) ** 1.4 * (H - topo);
      const x = hash(i, 2) * W;
      const k = 0.5 + ((y - topo) / (H - topo)) * 1.6;
      o.fillStyle = hash(i, 3) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
      o.fillRect(x, y, 1.4 * k, 2.4 * k);
    }
    // Sombra perto da arquibancada e luz no meio (refletor).
    const sombra = o.createLinearGradient(0, topo, 0, topo + 50);
    sombra.addColorStop(0, 'rgba(0,0,0,0.45)');
    sombra.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = sombra;
    o.fillRect(0, topo, W, 50);
    const luz = o.createRadialGradient(W / 2, g.bolaY - H * 0.15, 10, W / 2, g.bolaY - H * 0.15, H * 0.6);
    luz.addColorStop(0, 'rgba(255,255,220,0.07)');
    luz.addColorStop(1, 'rgba(0,0,0,0.22)');
    o.fillStyle = luz;
    o.fillRect(0, topo, W, H - topo);

    // Linhas: linha do gol, pequena área (laterais convergindo para o gol) e marca do pênalti.
    o.strokeStyle = 'rgba(245,245,240,0.8)';
    o.lineJoin = 'miter';
    o.lineWidth = 2.5;
    o.beginPath();
    o.moveTo(0, g.chao);
    o.lineTo(W, g.chao);
    o.moveTo(chaoX(-MEIA_PEQUENA_AREA, 0), g.chao);
    o.lineTo(chaoX(-MEIA_PEQUENA_AREA, PROF_PEQUENA_AREA), chaoY(PROF_PEQUENA_AREA));
    o.lineTo(chaoX(MEIA_PEQUENA_AREA, PROF_PEQUENA_AREA), chaoY(PROF_PEQUENA_AREA));
    o.lineTo(chaoX(MEIA_PEQUENA_AREA, 0), g.chao);
    o.stroke();
    // Laterais da grande área: entram pelos cantos de baixo, mais grossas perto da câmera.
    o.lineWidth = 3.5;
    o.beginPath();
    for (const lado of [-1, 1]) {
      const xm = lado * MEIA_PEQUENA_AREA * 1.95;
      o.moveTo(chaoX(xm, 6), chaoY(6));
      o.lineTo(chaoX(xm, 16), chaoY(16));
    }
    o.stroke();
    o.fillStyle = 'rgba(245,245,240,0.85)';
    o.beginPath();
    o.ellipse(g.bolaX, g.bolaY + g.raio * 0.55, g.raio * 0.6, g.raio * 0.22, 0, 0, Math.PI * 2);
    o.fill();
    // Sombra do gol no gramado.
    o.fillStyle = 'rgba(0,0,0,0.22)';
    o.beginPath();
    o.moveTo(g.gx, g.chao);
    o.lineTo(g.gx + g.gw, g.chao);
    o.lineTo(g.gx + g.gw + 18, g.chao + 10);
    o.lineTo(g.gx + 18, g.chao + 10);
    o.fill();
  }

  /** Deslocamento da rede quando a bola entra: a rede "afunda" perto do ponto e balança. */
  function balancoDaRede(agora: number) {
    const t = (agora - efeitos.rede.inicio) / DUR_REDE;
    if (t < 0 || t > 1) return null;
    const amp = (1 - t) * Math.cos(t * Math.PI * 3);
    const sigma = g.gw * 0.22;
    const { x: ix, y: iy } = efeitos.rede;
    return (p: { x: number; y: number }) => {
      const d2 = (p.x - ix) ** 2 + (p.y - iy) ** 2;
      const w = amp * Math.exp(-d2 / (2 * sigma * sigma)) * 0.05;
      return { x: W / 2 + (p.x - W / 2) * (1 - w), y: g.fugaY + (p.y - g.fugaY) * (1 - w) };
    };
  }

  function desenharRede(o: CanvasRenderingContext2D, mexe: ((p: { x: number; y: number }) => { x: number; y: number }) | null): void {
    const esq = g.gx;
    const dir = g.gx + g.gw;
    const topo = g.gy;
    const base = g.chao;
    const alturaFundo = 0.82; // a rede desce em direção ao fundo
    const fTE = fundo(esq, base - g.gh * alturaFundo);
    const fTD = fundo(dir, base - g.gh * alturaFundo);
    const fBE = fundo(esq, base);
    const fBD = fundo(dir, base);
    const p = (pt: { x: number; y: number }) => (mexe ? mexe(pt) : pt);
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });

    // Fundo escuro atrás da rede, para a malha aparecer como no exemplo de TV.
    o.fillStyle = 'rgba(0,0,0,0.22)';
    o.beginPath();
    o.moveTo(fTE.x, fTE.y);
    o.lineTo(fTD.x, fTD.y);
    o.lineTo(fBD.x, fBD.y);
    o.lineTo(fBE.x, fBE.y);
    o.fill();

    /** Malha de um painel da rede (4 cantos), com o balanço aplicado em cada ponto. */
    const malha = (a: { x: number; y: number }, b: { x: number; y: number }, cc: { x: number; y: number }, d: { x: number; y: number }, nu: number, nv: number) => {
      const passos = 10;
      o.beginPath();
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        for (let j = 0; j <= passos; j++) {
          const v = j / passos;
          const pt = p(lerp(lerp(a, b, u), lerp(d, cc, u), v));
          if (j === 0) o.moveTo(pt.x, pt.y);
          else o.lineTo(pt.x, pt.y);
        }
      }
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        for (let i = 0; i <= passos; i++) {
          const u = i / passos;
          const pt = p(lerp(lerp(a, b, u), lerp(d, cc, u), v));
          if (i === 0) o.moveTo(pt.x, pt.y);
          else o.lineTo(pt.x, pt.y);
        }
      }
      o.stroke();
    };
    const nu = Math.round(g.gw / 10);
    const nv = Math.round(g.gh / 10);
    // Fio com sombra embaixo: a malha ganha volume.
    for (const [cor, dx] of [['rgba(0,0,0,0.35)', 1], ['rgba(240,240,235,0.42)', 0]] as const) {
      o.save();
      o.translate(dx, dx);
      o.strokeStyle = cor;
      o.lineWidth = 1.1;
      malha(fTE, fTD, fBD, fBE, nu, nv); // fundo
      malha({ x: esq, y: topo }, { x: dir, y: topo }, fTD, fTE, nu, 3); // teto
      malha({ x: esq, y: topo }, fTE, fBE, { x: esq, y: base }, 3, nv); // lado esquerdo
      malha({ x: dir, y: topo }, fTD, fBD, { x: dir, y: base }, 3, nv); // lado direito
      o.restore();
    }

    // Ferros de trás.
    o.strokeStyle = 'rgba(230,230,225,0.75)';
    o.lineWidth = 2.5;
    o.beginPath();
    o.moveTo(esq, topo);
    o.lineTo(fTE.x, fTE.y);
    o.lineTo(fBE.x, fBE.y);
    o.lineTo(fBD.x, fBD.y);
    o.lineTo(fTD.x, fTD.y);
    o.lineTo(dir, topo);
    o.stroke();
  }

  function desenharGol(agora: number): void {
    const mexe = balancoDaRede(agora);
    if (mexe) desenharRede(c, mexe);
    else if (rede) c.drawImage(rede, 0, 0, W, H);
  }

  // Degradês das traves e da bola: criados quando a tela muda de tamanho, nunca dentro do quadro.
  let gradTraves: CanvasGradient[] = [];
  let gradBola: CanvasGradient | null = null;

  function prepararDegrades(): void {
    const e = Math.max(6, g.gw * 0.022);
    const cilindro = (grad: CanvasGradient) => {
      grad.addColorStop(0, '#9a9a95');
      grad.addColorStop(0.35, '#ffffff');
      grad.addColorStop(1, '#b5b5b0');
      return grad;
    };
    gradTraves = [
      cilindro(c.createLinearGradient(g.gx - e / 2, 0, g.gx + e / 2, 0)),
      cilindro(c.createLinearGradient(g.gx + g.gw - e / 2, 0, g.gx + g.gw + e / 2, 0)),
      cilindro(c.createLinearGradient(0, g.gy - e / 2, 0, g.gy + e / 2)),
    ];
    // Bola de raio 1 no centro: o desenho escala para o tamanho certo.
    gradBola = c.createRadialGradient(-0.4, -0.45, 0.1, 0, 0, 1.05);
    gradBola.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradBola.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradBola.addColorStop(1, 'rgba(0,0,0,0.38)');
  }

  /** Traves redondas: luz de um lado, sombra do outro. */
  function desenharTraves(): void {
    const esq = g.gx;
    const dir = g.gx + g.gw;
    c.lineWidth = Math.max(6, g.gw * 0.022);
    c.lineCap = 'round';
    const cilindro = (grad: CanvasGradient, x0: number, y0: number, x1: number, y1: number) => {
      c.strokeStyle = grad;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    };
    cilindro(gradTraves[0], esq, g.chao, esq, g.gy);
    cilindro(gradTraves[1], dir, g.chao, dir, g.gy);
    cilindro(gradTraves[2], esq, g.gy, dir, g.gy);
  }

  // ---------- bonecos ----------
  /** Altura do goleiro na tela: ~80% da altura do gol. */
  const escGoleiro = () => (g.gh * 0.8) / 100;
  const escBatedor = () => g.raio / 15;
  /** Centro do corpo do goleiro (a pelve, onde ele gira no pulo): 50 unidades acima dos pés. */
  const CENTRO = 50;
  /** Queda do goleiro depois do pulo, até ficar deitado no chão (ms). */
  const DUR_QUEDA = 340;

  // Reaproveitados a cada quadro: nada de objeto novo no loop (docs/bonecos.md, seção 5).
  const mao = { x: 0, y: 0 };
  const goleiro = { x: 0, y: 0, ang: 0, pose: novaPose(), luvaX: 0, luvaY: 0 };

  function sombraNoChao(x: number, y: number, larg: number): void {
    c.fillStyle = 'rgba(0,0,0,0.32)';
    c.beginPath();
    c.ellipse(x, y, larg, larg * 0.24, 0, 0, Math.PI * 2);
    c.fill();
  }

  /** Pose do pulo para cada uma das 6 zonas (baixo ou alto; esquerda, meio ou direita). */
  function poseDoPulo(zona: number): Pose {
    const alto = linha(zona) === 1;
    if (coluna(zona) === 0) return alto ? GOLEIRO.altoE : GOLEIRO.baixoE;
    if (coluna(zona) === 2) return alto ? GOLEIRO.altoD : GOLEIRO.baixoD;
    return alto ? GOLEIRO.meioAlto : GOLEIRO.meioBaixo;
  }

  /** Como o goleiro termina o lance: caído no canto ou de pé no meio, com ou sem a bola. */
  function poseDaQueda(zona: number, pegou: boolean): Pose {
    if (coluna(zona) === 0) return pegou ? GOLEIRO.caidoPegouE : GOLEIRO.caidoE;
    if (coluna(zona) === 2) return pegou ? GOLEIRO.caidoPegouD : GOLEIRO.caidoD;
    return pegou ? GOLEIRO.encaixada : linha(zona) === 1 ? GOLEIRO.pronto : GOLEIRO.meioBaixo;
  }

  /** Põe na tela o centro das luvas (onde a bola para na defesa). */
  function luvasNaTela(b: Boneco, esc: number): void {
    maos(b, goleiro.pose, mao);
    const lx = mao.x * esc;
    const ly = (mao.y + CENTRO) * esc;
    const cos = Math.cos(goleiro.ang);
    const sin = Math.sin(goleiro.ang);
    goleiro.luvaX = goleiro.x + lx * cos - ly * sin;
    goleiro.luvaY = goleiro.y + lx * sin + ly * cos;
  }

  /**
   * Onde está o goleiro: balançando na linha, no meio do pulo para a zona (t de 0 a 1) ou, com
   * `queda` (ms depois do lance), caindo no chão. Grava em `goleiro` o centro do corpo, o giro,
   * a pose e as luvas. O objeto é reaproveitado: leia os valores antes da próxima chamada.
   */
  function goleiroNoQuadro(b: Boneco, zona: number | null, t: number, agora: number, queda = -1, pegou = false) {
    const esc = escGoleiro();
    const rx = telaX(0);
    const ry = g.chao - 3 - CENTRO * esc;
    goleiro.x = rx;
    goleiro.y = ry;
    goleiro.ang = 0;
    if (zona === null || zona < 0 || t <= 0) {
      poseGoleiroEsperando(agora, goleiro.pose);
      luvasNaTela(b, esc);
      return goleiro;
    }
    const e = facil(limitar01(t));
    const alvo = poseDoPulo(zona);
    const col = coluna(zona);
    const alto = linha(zona) === 1;
    let ang = 0;
    let ax = rx;
    let ay = ry;
    if (col !== 1 || alto) {
      // Meio e embaixo fica de pé; no resto o corpo vai até as luvas chegarem no meio da zona.
      ang = col === 1 ? 0 : (col === 0 ? -1 : 1) * (alto ? 1.15 : 1.4);
      maos(b, alvo, mao);
      const lx = mao.x * esc;
      const ly = (mao.y + CENTRO) * esc;
      ax = telaX(zonaX(zona)) - (lx * Math.cos(ang) - ly * Math.sin(ang));
      ay = Math.min(telaY(zonaY(zona)) - (lx * Math.sin(ang) + ly * Math.cos(ang)), ry + (col === 1 ? 0 : 20 * esc));
    }
    misturar(GOLEIRO.pronto, alvo, Math.min(1, e * 1.6), goleiro.pose);
    goleiro.x = rx + (ax - rx) * e;
    goleiro.y = ry + (ay - ry) * e - Math.sin(e * Math.PI) * 10 * esc;
    goleiro.ang = ang * e;
    if (queda >= 0) {
      // Depois do lance: no canto cai deitado (acelerando, como na queda de verdade); no meio, volta ao chão.
      const f = limitar01(queda / DUR_QUEDA);
      const s = suave(f);
      misturar(goleiro.pose, poseDaQueda(zona, pegou), s, goleiro.pose);
      if (col !== 1) {
        const lado = col === 0 ? -1 : 1;
        goleiro.x += lado * 6 * esc * s;
        goleiro.y += (g.chao - 3 - b.ombro * esc - goleiro.y) * f * f;
        goleiro.ang += ((lado * Math.PI) / 2 - goleiro.ang) * s;
      } else {
        goleiro.y += (ry - goleiro.y) * f * f;
      }
    }
    luvasNaTela(b, esc);
    return goleiro;
  }

  function desenharGoleiroNoQuadro(b: Boneco, zona: number | null, t: number, agora: number, queda = -1, pegou = false): void {
    const esc = escGoleiro();
    const q = goleiroNoQuadro(b, zona, t, agora, queda, pegou);
    // Sombra: menor quanto mais alto; comprida com o goleiro deitado.
    const alturaDoChao = Math.max(0, g.chao - 3 - (q.y + CENTRO * esc));
    sombraNoChao(q.x, g.chao - 2, Math.max(10, (24 + 26 * Math.abs(Math.sin(q.ang))) * esc - alturaDoChao * 0.1));
    c.save();
    c.translate(q.x, q.y);
    c.rotate(q.ang);
    c.scale(esc, esc);
    c.translate(0, CENTRO);
    desenharBoneco(c, b, q.pose);
    c.restore();
  }

  /** Batedor de costas com os pés em (x, y). */
  function desenharBatedorEm(b: Boneco, x: number, y: number, pose: Pose, realcePeDeApoio = false): void {
    const esc = escBatedor();
    sombraNoChao(x + 2 * esc, y + 1, 20 * esc);
    c.save();
    c.translate(x, y);
    c.scale(esc, esc);
    desenharBoneco(c, b, pose, realcePeDeApoio);
    c.restore();
  }

  // ---------- bola ----------
  function desenharBola(x: number, y: number, escala = 1, sombraY = y, giro = 0): void {
    desenharBolaEm(c, x, y, g.raio * escala, sombraY, giro, gradBola);
  }

  /** Bola em voo: rastro de borrão atrás (quadros anteriores) e giro. */
  function desenharBolaEmVoo(pos: (t: number) => { x: number; y: number; escala: number; sombraY: number }, t: number): void {
    if (t > 0 && t < 1) {
      for (const [atras, alfa] of [[0.09, 0.14], [0.05, 0.24]] as const) {
        const p = pos(Math.max(0, t - atras));
        c.globalAlpha = alfa;
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(p.x, p.y, g.raio * p.escala, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    const p = pos(t);
    desenharBola(p.x, p.y, p.escala, p.sombraY, t * 14);
  }

  function desenharZonas(destaque: number | null): void {
    for (let z = 0; z < 6; z++) {
      const x0 = telaX(-1 + coluna(z) * (2 / 3));
      const y0 = telaY(linha(z) === 1 ? 1 : 0.5);
      const w = g.gw / 3;
      const h = g.gh / 2;
      c.fillStyle = z === destaque ? 'rgba(255,210,63,0.5)' : 'rgba(255,255,255,0.1)';
      c.fillRect(x0 + 3, y0 + 3, w - 6, h - 6);
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 1.5;
      c.setLineDash([5, 5]);
      c.strokeRect(x0 + 3, y0 + 3, w - 6, h - 6);
      c.setLineDash([]);
    }
  }

  const desenharRastro = (rastro: readonly { x: number; y: number }[]) => desenharRastroEm(c, rastro);

  /** Posição da bola num chute com curva (bezier quadrática). */
  function trajetoria(alvoX: number, alvoY: number, efeito: number, t: number, alto: boolean) {
    const sx = g.bolaX;
    const sy = g.bolaY;
    const cx = (sx + alvoX) / 2 - (efeito / 100) * g.gw * 0.35;
    const cy = alto ? Math.min(sy, alvoY) - g.gh * 1.2 : (sy + alvoY) / 2;
    const u = 1 - t;
    // Sombra corre no chão, da bola até a linha do gol.
    const sombraY = sy + (g.chao - sy) * t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * alvoX,
      y: u * u * sy + 2 * u * t * cy + t * t * alvoY,
      escala: 1 - 0.5 * t,
      sombraY,
    };
  }

  /** Câmera lenta: tarjas pretas de cinema enquanto dura. */
  function desenharCameraLenta(t: number): void {
    const forca = t > 0.55 && t < 0.85 ? Math.min(1, Math.min(t - 0.55, 0.85 - t) / 0.05) : 0;
    if (!forca) return;
    const h = 26 * forca;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, W, h);
    c.fillRect(0, H - h, W, h);
  }

  function desenharPontos(agora: number): void {
    papel.desenhar(c, agora, Math.max(8, g.raio * 0.5));
    efeitos.pontos = desenharPontosEm(c, efeitos.pontos, agora, g.raio * 1.5);
  }

  /** Onde a bola fica parada depois do lance (luva, rede ou trave). */
  function bolaParada(x: number, y: number): void {
    desenharBola(x, y, 0.5, g.chao - g.raio * 0.5);
  }

  /** Começo de cada quadro (depois do c.save()): tremida do gol, gramado, arquibancada e rede. */
  function desenharFundo(agora: number): void {
    if (agora - efeitos.tremida < DUR_TREMIDA) {
      const f = 1 - (agora - efeitos.tremida) / DUR_TREMIDA;
      const amp = 5 * f * efeitos.forcaTremida;
      c.translate((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp);
    }
    if (campo) c.drawImage(campo, 0, 0, W, H);
    desenharArquibancada(agora);
    desenharGol(agora);
  }

  return {
    c,
    g,
    efeitos,
    goleiro,
    medir,
    telaX,
    telaY,
    zonaX,
    zonaY,
    centroZona,
    lerArraste,
    zonaTocada,
    comemorar,
    baterNaTrave,
    bolaNaTrave,
    bolaEspalmada,
    desenharBatidaNaTrave,
    desenharFundo,
    desenharTraves,
    goleiroNoQuadro,
    desenharGoleiroNoQuadro,
    escBatedor,
    desenharBatedorEm,
    desenharBola,
    desenharBolaEmVoo,
    desenharZonas,
    desenharRastro,
    trajetoria,
    desenharCameraLenta,
    desenharPontos,
    bolaParada,
  };
}

export type Cena = ReturnType<typeof criarCena>;

