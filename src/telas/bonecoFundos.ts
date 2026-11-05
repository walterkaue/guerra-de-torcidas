// Os 11 fundos do boneco montável (docs/jogo.md, seção 14.5), desenhados em canvas: formas simples e
// chapadas, sem escudo, bandeira, marca, texto, número ou pessoa. Só o céu usa um degradê linear.
// Tudo em frações de largura × altura, para servir no busto (quadrado, recortado em círculo) e no corpo.
// Os sorteios usam semente fixa: o mesmo fundo sai igual toda vez (e o cache do boneco fica estável).

import { diferencaDeCor } from './bonecos';

export type CoresDoTime = readonly [string, string];

function sorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PI2 = Math.PI * 2;

/** Mistura a cor com branco (t de 0 a 1). */
function clarear(cor: string, t: number): string {
  const n = parseInt(cor.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * t);
  return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

/** A cor do time, ou uma versão clara dela se sumiria em cima do fundo. */
function visivel(cor: string, fundo: string): string {
  if (diferencaDeCor(cor, fundo) >= 100) return cor;
  const clara = clarear(cor, 0.62);
  return diferencaDeCor(clara, fundo) >= 100 ? clara : '#e8e6df';
}

function pilula(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  c.beginPath();
  if (typeof c.roundRect === 'function') c.roundRect(x, y, w, h, Math.min(w, h) * 0.45);
  else c.rect(x, y, w, h);
  c.fill();
}

function ceu(c: CanvasRenderingContext2D, h: number, de: string, ate: string, ateY: number): void {
  const g = c.createLinearGradient(0, 0, 0, h * ateY);
  g.addColorStop(0, de);
  g.addColorStop(1, ate);
  c.fillStyle = g;
}

// ---------- os fundos ----------

function gramado(c: CanvasRenderingContext2D, w: number, h: number): void {
  const n = 9;
  const soma = (n * (n + 5)) / 2; // faixas finas no fundo e grossas perto da câmera
  let y = 0;
  for (let i = 0; i < n; i++) {
    const alt = (h * (i + 3)) / soma;
    c.fillStyle = i % 2 ? '#2d8a3d' : '#39a04b';
    c.fillRect(0, y, w, alt + 0.6);
    y += alt;
  }
  c.fillStyle = 'rgba(6,36,18,0.30)';
  c.fillRect(0, 0, w, h * 0.16);
}

function arquibancada(c: CanvasRenderingContext2D, w: number, h: number, [c1, c2]: CoresDoTime): void {
  c.fillStyle = '#1f232e';
  c.fillRect(0, 0, w, h);
  const linhas = 7;
  const topo = h * 0.03;
  const base = h * 0.8;
  const alt = (base - topo) / linhas;
  const rnd = sorteio(11);
  const lugar = (l: number) => (l % 2 ? '#2a2f3c' : '#323847');
  for (let l = 0; l < linhas; l++) {
    const y = topo + l * alt;
    c.fillStyle = lugar(l);
    c.fillRect(0, y, w, alt + 0.5);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(0, y + alt - Math.max(1, alt * 0.08), w, Math.max(1, alt * 0.08));
    const passo = alt * 0.78;
    const largura = passo * 0.72;
    const paleta = [visivel(c1, lugar(l)), visivel(c1, lugar(l)), visivel(c2, lugar(l)), visivel(c2, lugar(l)), '#e8e6df', '#8e95a6'];
    for (let x = ((l * 0.37) % 1) * passo - passo; x < w + passo; x += passo) {
      if (rnd() < 0.1) continue;
      c.fillStyle = paleta[Math.floor(rnd() * paleta.length)];
      pilula(c, x, y + alt * 0.2, largura, alt * 0.75);
    }
  }
  c.fillStyle = '#14171f';
  c.fillRect(0, base, w, h * 0.035);
  c.fillStyle = '#2d8a3d';
  c.fillRect(0, base + h * 0.035, w, h);
  c.fillStyle = '#39a04b';
  c.fillRect(0, base + h * 0.035 + (h - base) * 0.45, w, (h - base) * 0.3);
}

function holofote(c: CanvasRenderingContext2D, x: number, y: number, larg: number, alt: number): void {
  c.fillStyle = '#10142a';
  c.fillRect(x - larg / 2, y - alt / 2, larg, alt);
  c.fillStyle = '#fff6c9';
  const cols = 4;
  const lins = 3;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < lins; j++) {
      c.beginPath();
      c.arc(x - larg / 2 + (larg * (i + 0.5)) / cols, y - alt / 2 + (alt * (j + 0.5)) / lins, Math.min(larg / cols, alt / lins) * 0.3, 0, PI2);
      c.fill();
    }
  }
}

function estadioNoite(c: CanvasRenderingContext2D, w: number, h: number): void {
  ceu(c, h, '#04071a', '#1c2d66', 0.7);
  c.fillRect(0, 0, w, h);
  const rnd = sorteio(5);
  c.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 16; i++) {
    c.beginPath();
    c.arc(rnd() * w, rnd() * h * 0.4, Math.max(0.6, w * 0.004), 0, PI2);
    c.fill();
  }
  // Borda do estádio, com as janelas acesas.
  c.fillStyle = '#0b0f24';
  c.beginPath();
  c.moveTo(0, h * 0.6);
  c.quadraticCurveTo(w / 2, h * 0.47, w, h * 0.6);
  c.lineTo(w, h * 0.8);
  c.lineTo(0, h * 0.8);
  c.closePath();
  c.fill();
  c.fillStyle = '#2c3d85';
  c.beginPath();
  c.moveTo(0, h * 0.6);
  c.quadraticCurveTo(w / 2, h * 0.47, w, h * 0.6);
  c.lineTo(w, h * 0.615);
  c.quadraticCurveTo(w / 2, h * 0.485, 0, h * 0.615);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,214,130,0.7)';
  for (const [y, desloc] of [[0.68, 0], [0.73, 0.5], [0.775, 0]] as const) {
    for (let x = (desloc + 0.3) * w * 0.05; x < w; x += w * 0.05) {
      c.fillRect(x, h * y, Math.max(1, w * 0.016), Math.max(1, h * 0.01));
    }
  }
  // Refletores, com halo translúcido.
  for (const fx of [0.14, 0.86]) {
    c.fillStyle = 'rgba(255,243,176,0.10)';
    c.beginPath();
    c.arc(w * fx, h * 0.3, w * 0.2, 0, PI2);
    c.fill();
    c.fillStyle = 'rgba(255,243,176,0.16)';
    c.beginPath();
    c.arc(w * fx, h * 0.3, w * 0.11, 0, PI2);
    c.fill();
    holofote(c, w * fx, h * 0.3, w * 0.17, h * 0.1);
    c.fillStyle = '#0b0f24';
    c.fillRect(w * fx - w * 0.008, h * 0.35, w * 0.016, h * 0.3);
  }
  // Gramado lá embaixo.
  c.fillStyle = '#1b5a31';
  c.fillRect(0, h * 0.8, w, h * 0.2);
  c.fillStyle = '#226b3a';
  c.fillRect(0, h * 0.9, w, h * 0.05);
}

function banco(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#1b2030';
  c.fillRect(0, 0, w, h);
  // Painéis de vidro ao fundo, separados por postes.
  c.fillStyle = 'rgba(130,180,230,0.13)';
  c.fillRect(w * 0.04, h * 0.18, w * 0.92, h * 0.5);
  c.fillStyle = '#3a4156';
  for (let i = 0; i <= 5; i++) c.fillRect(w * (0.04 + 0.18 * i) - w * 0.008, h * 0.18, w * 0.016, h * 0.5);
  // Teto coberto, curvo.
  c.fillStyle = '#2e3650';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(w, 0);
  c.lineTo(w, h * 0.17);
  c.quadraticCurveTo(w / 2, h * 0.11, 0, h * 0.17);
  c.closePath();
  c.fill();
  c.fillStyle = '#58648a';
  c.beginPath();
  c.moveTo(0, h * 0.17);
  c.quadraticCurveTo(w / 2, h * 0.11, w, h * 0.17);
  c.lineTo(w, h * 0.19);
  c.quadraticCurveTo(w / 2, h * 0.13, 0, h * 0.19);
  c.closePath();
  c.fill();
  // Banco vazio: encosto e assento de madeira, pés de metal.
  c.fillStyle = '#6e7587';
  for (const x of [0.12, 0.34, 0.66, 0.88]) c.fillRect(w * x - w * 0.012, h * 0.62, w * 0.024, h * 0.18);
  c.fillStyle = '#a9835a';
  c.fillRect(w * 0.03, h * 0.5, w * 0.94, h * 0.05);
  c.fillStyle = '#c29a6b';
  c.fillRect(w * 0.03, h * 0.58, w * 0.94, h * 0.045);
  c.fillStyle = '#8c6a45';
  c.fillRect(w * 0.03, h * 0.625, w * 0.94, h * 0.012);
  // Chão.
  c.fillStyle = '#2d8a3d';
  c.fillRect(0, h * 0.8, w, h * 0.2);
  c.fillStyle = '#39a04b';
  c.fillRect(0, h * 0.89, w, h * 0.05);
}

function arco(c: CanvasRenderingContext2D, cx: number, topo: number, meia: number, base: number): void {
  c.beginPath();
  c.moveTo(cx - meia, base);
  c.lineTo(cx - meia, topo + meia);
  c.arc(cx, topo + meia, meia, Math.PI, 0);
  c.lineTo(cx + meia, base);
  c.closePath();
}

function tunel(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#0d1017';
  c.fillRect(0, 0, w, h);
  const cx = w / 2;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const meia = w * (0.62 - 0.4 * t);
    const topo = h * (-0.04 + 0.3 * t);
    const base = h * (1.02 - 0.2 * t);
    c.fillStyle = i % 2 ? '#1a1e2a' : '#242938';
    arco(c, cx, topo, meia, base);
    c.fill();
  }
  // A luz no fim, com halo.
  const meia = w * 0.2;
  const topo = h * 0.3;
  const base = h * 0.82;
  for (const [r, a] of [[1.5, 0.1], [1.25, 0.14]] as const) {
    c.fillStyle = `rgba(255,244,200,${a})`;
    arco(c, cx, topo + meia - meia * r, meia * r, base);
    c.fill();
  }
  c.fillStyle = '#fff4c8';
  arco(c, cx, topo, meia, base);
  c.fill();
  c.save();
  arco(c, cx, topo, meia, base);
  c.clip();
  c.fillStyle = '#4fb862';
  c.fillRect(0, h * 0.62, w, h);
  c.fillStyle = '#7fd08c';
  c.fillRect(0, h * 0.62, w, h * 0.02);
  c.restore();
  // Piso escuro com reflexo da luz.
  c.fillStyle = 'rgba(255,244,200,0.12)';
  c.beginPath();
  c.moveTo(cx - meia * 0.6, base);
  c.lineTo(cx + meia * 0.6, base);
  c.lineTo(cx + w * 0.22, h);
  c.lineTo(cx - w * 0.22, h);
  c.closePath();
  c.fill();
}

function holofotes(c: CanvasRenderingContext2D, w: number, h: number): void {
  ceu(c, h, '#03050d', '#142049', 0.85);
  c.fillRect(0, 0, w, h);
  const torres = [0.1, 0.9, 0.5];
  // Fachos de luz primeiro (ficam atrás das torres).
  for (const tx of torres) {
    for (const [abre, a] of [[0.28, 0.1], [0.14, 0.12]] as const) {
      c.fillStyle = `rgba(255,248,200,${a})`;
      c.beginPath();
      c.moveTo(w * tx - w * 0.04, h * 0.2);
      c.lineTo(w * tx + w * 0.04, h * 0.2);
      c.lineTo(w * (0.5 + (tx - 0.5) * 0.15) + w * abre, h * 0.86);
      c.lineTo(w * (0.5 + (tx - 0.5) * 0.15) - w * abre, h * 0.86);
      c.closePath();
      c.fill();
    }
  }
  c.fillStyle = '#080b16';
  c.fillRect(w * 0.1 - w * 0.012, h * 0.24, w * 0.024, h * 0.7);
  c.fillRect(w * 0.9 - w * 0.012, h * 0.24, w * 0.024, h * 0.7);
  holofote(c, w * 0.1, h * 0.2, w * 0.18, h * 0.09);
  holofote(c, w * 0.9, h * 0.2, w * 0.18, h * 0.09);
  holofote(c, w * 0.5, h * 0.1, w * 0.22, h * 0.08);
  // Gramado iluminado.
  c.fillStyle = '#1a5a30';
  c.fillRect(0, h * 0.86, w, h * 0.14);
  c.fillStyle = 'rgba(255,255,220,0.14)';
  c.beginPath();
  c.ellipse(w / 2, h * 0.9, w * 0.5, h * 0.06, 0, 0, PI2);
  c.fill();
}

function papelPicado(c: CanvasRenderingContext2D, w: number, h: number, [c1, c2]: CoresDoTime): void {
  const fundo = '#1b2342';
  c.fillStyle = fundo;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  c.beginPath();
  c.arc(w / 2, h * 0.45, w * 0.55, 0, PI2);
  c.fill();
  const rnd = sorteio(23);
  const paleta = [visivel(c1, fundo), visivel(c2, fundo), visivel(c1, fundo), visivel(c2, fundo), '#ffd23f', '#ffffff'];
  const n = 90;
  for (let i = 0; i < n; i++) {
    const tam = w * (0.03 + rnd() * 0.04);
    c.save();
    c.translate(rnd() * w, rnd() * h);
    c.rotate(rnd() * PI2);
    c.fillStyle = paleta[Math.floor(rnd() * paleta.length)];
    c.fillRect(-tam / 2, -tam * 0.22, tam, tam * 0.44);
    c.restore();
  }
}

function telao(c: CanvasRenderingContext2D, w: number, h: number, [c1, c2]: CoresDoTime): void {
  c.fillStyle = '#080a10';
  c.fillRect(0, 0, w, h);
  const margem = w * 0.05;
  c.fillStyle = '#2b3040';
  c.fillRect(margem * 0.5, margem * 0.5, w - margem, h - margem);
  c.fillStyle = '#05070b';
  c.fillRect(margem, margem, w - margem * 2, h - margem * 2);
  const colunas = 14;
  const passo = (w - margem * 2) / colunas;
  const linhas = Math.floor((h - margem * 2) / passo);
  const ox = margem + passo / 2;
  const oy = margem + ((h - margem * 2) - linhas * passo) / 2 + passo / 2;
  const apagado = '#151a26';
  const cores = [visivel(c1, apagado), visivel(c2, apagado), '#ffffff'];
  for (let j = 0; j < linhas; j++) {
    for (let i = 0; i < colunas; i++) {
      const v = Math.sin((i + j) * 0.42);
      c.fillStyle = v > 0.15 ? cores[Math.floor((i + j) / 5) % 3] : apagado;
      c.beginPath();
      c.arc(ox + i * passo, oy + j * passo, passo * 0.33, 0, PI2);
      c.fill();
    }
  }
}

function barreira(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#1e2430';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#272e3c';
  c.fillRect(0, h * 0.35, w, h * 0.25);
  c.fillStyle = '#2d8a3d';
  c.fillRect(0, h * 0.78, w, h * 0.22);
  c.fillStyle = '#39a04b';
  c.fillRect(0, h * 0.9, w, h * 0.05);
  // Postes de treino lisos, chanfrados e sem cara, em fila.
  const n = 5;
  const larg = w * 0.17;
  for (let i = 0; i < n; i++) {
    const x = w * (0.03 + i * 0.2);
    const topo = h * 0.27;
    const base = h * 0.84;
    c.fillStyle = '#c98a10';
    c.fillRect(x + larg * 0.74, topo + larg * 0.18, larg * 0.26, base - topo - larg * 0.18);
    c.fillStyle = '#f2b01e';
    c.beginPath();
    c.moveTo(x, topo + larg * 0.22);
    c.lineTo(x + larg * 0.22, topo);
    c.lineTo(x + larg * 0.78, topo);
    c.lineTo(x + larg, topo + larg * 0.22);
    c.lineTo(x + larg, base);
    c.lineTo(x, base);
    c.closePath();
    c.fill();
    c.fillStyle = '#c98a10';
    c.beginPath();
    c.moveTo(x + larg * 0.74, topo);
    c.lineTo(x + larg * 0.78, topo);
    c.lineTo(x + larg, topo + larg * 0.22);
    c.lineTo(x + larg, base);
    c.lineTo(x + larg * 0.74, base);
    c.closePath();
    c.fill();
    c.fillStyle = '#f7f3e6';
    c.fillRect(x, topo + (base - topo) * 0.3, larg, (base - topo) * 0.06);
    c.fillStyle = '#16181f';
    c.fillRect(x + larg * 0.1, base, larg * 0.8, h * 0.025);
  }
}

function bolaClassica(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.save();
  c.translate(x, y);
  c.beginPath();
  c.arc(0, 0, r, 0, PI2);
  c.clip();
  c.fillStyle = '#ffffff';
  c.fillRect(-r, -r, r * 2, r * 2);
  c.fillStyle = '#d6dae2';
  c.beginPath();
  c.arc(r * 0.28, r * 0.3, r * 1.02, -0.2, Math.PI * 0.95);
  c.arc(-r * 0.1, -r * 0.1, r * 1.05, Math.PI * 0.95, -0.2, true);
  c.closePath();
  c.fill();
  c.fillStyle = '#1b1d22';
  const pentagono = (cx: number, cy: number, raio: number, rot: number) => {
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * PI2) / 5;
      c.lineTo(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio);
    }
    c.closePath();
    c.fill();
  };
  pentagono(0, 0, r * 0.3, -Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * PI2) / 5 + Math.PI / 5;
    pentagono(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, r * 0.3, a + Math.PI);
  }
  c.restore();
}

function rede(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#0c2433';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#123a2a';
  c.fillRect(0, h * 0.82, w, h * 0.18);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const raio = Math.max(w, h) * 0.5;
  // Pontos da malha empurrados para fora do centro: o bojo de quem recebeu o chute.
  const bojo = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    const f = 1 + 0.28 * Math.exp(-((dx * dx + dy * dy) / (raio * raio)) * 2.2);
    return [cx + dx * f, cy + dy * f];
  };
  const malha = Math.max(w, h) / 8.5;
  c.save();
  c.beginPath();
  c.rect(0, 0, w, h);
  c.clip();
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = Math.max(0.8, w * 0.008);
  c.lineJoin = 'round';
  const total = Math.max(w, h) * 1.6;
  for (const dir of [1, -1]) {
    for (let k = -14; k <= 14; k++) {
      // Família de linhas na diagonal: a origem anda na perpendicular, o ponto anda na direção.
      const ox = cx + k * malha * 0.7071;
      const oy = cy - dir * k * malha * 0.7071;
      c.beginPath();
      for (let i = 0; i <= 24; i++) {
        const t = (i / 24 - 0.5) * total;
        const [px, py] = bojo(ox + t * 0.7071, oy + dir * t * 0.7071);
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
    }
  }
  c.restore();
  // Travessão e traves.
  c.fillStyle = '#f4f2ea';
  c.fillRect(0, h * 0.045, w, h * 0.035);
  c.fillRect(w * 0.015, h * 0.045, w * 0.035, h);
  c.fillRect(w * 0.95, h * 0.045, w * 0.035, h);
  bolaClassica(c, w * 0.73, h * 0.27, w * 0.1);
}

function verdeAmarelo(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.fillStyle = '#009c3b';
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(-0.62);
  const lado = Math.hypot(w, h);
  const faixa = lado * 0.17;
  for (let i = -6; i <= 6; i++) {
    c.fillStyle = i % 2 ? '#ffdf00' : i % 4 === 0 ? '#00873a' : '#009c3b';
    c.fillRect(-lado, i * faixa - faixa / 2, lado * 2, faixa + 0.6);
  }
  c.restore();
}

export type IdDoFundo =
  | 'gramado'
  | 'arquibancada'
  | 'estadio_noite'
  | 'banco'
  | 'tunel'
  | 'holofotes'
  | 'papel_picado'
  | 'telao'
  | 'barreira'
  | 'rede'
  | 'verde_amarelo';

/** Desenha o fundo no retângulo (0, 0, w, h) da transformação atual. */
export function desenharFundo(c: CanvasRenderingContext2D, fundo: IdDoFundo, w: number, h: number, cores: CoresDoTime): void {
  switch (fundo) {
    case 'gramado':
      return gramado(c, w, h);
    case 'arquibancada':
      return arquibancada(c, w, h, cores);
    case 'estadio_noite':
      return estadioNoite(c, w, h);
    case 'banco':
      return banco(c, w, h);
    case 'tunel':
      return tunel(c, w, h);
    case 'holofotes':
      return holofotes(c, w, h);
    case 'papel_picado':
      return papelPicado(c, w, h, cores);
    case 'telao':
      return telao(c, w, h, cores);
    case 'barreira':
      return barreira(c, w, h);
    case 'rede':
      return rede(c, w, h);
    case 'verde_amarelo':
      return verdeAmarelo(c, w, h);
  }
}
