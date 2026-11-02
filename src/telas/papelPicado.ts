// Papel picado nas cores do time (docs/visual.md, seção 4.4): explode no gol e no acerto do quiz.
// Pool fixo de peças em Float32Array (nenhum objeto novo por quadro); cada peça é um retângulo que
// "vira" (a largura oscila) em vez de girar, para custar um fillRect só. Quantidade pelo nível de
// qualidade: Alta 40, Média 24, Leve nenhuma; nada com movimento reduzido.

import { qualidade } from './qualidade';

const MAX = 40;
const DURACAO = 1400;
const GRAVIDADE = 0.0009; // px por ms²
const AR = 0.0032; // freio do ar, por ms (papel flutua)

const reduzido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Quantas peças o nível atual solta (0 = nenhuma). */
export function pecasDoNivel(): number {
  if (reduzido()) return 0;
  const n = qualidade().nivel;
  return n === 'alta' ? 40 : n === 'media' ? 24 : 0;
}

/** Cor muito escura some no gramado e na torcida: vira branco. */
function visivel(cor: string): string {
  const n = parseInt(cor.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 45 ? '#f5f5f0' : cor;
}

export function criarPapelPicado(coresDoTime: readonly string[]) {
  const cores = coresDoTime.map(visivel);
  const x = new Float32Array(MAX);
  const y = new Float32Array(MAX);
  const vx = new Float32Array(MAX);
  const vy = new Float32Array(MAX);
  const fase = new Float32Array(MAX);
  const inicio = new Float32Array(MAX).fill(-Infinity);
  const cor = new Uint8Array(MAX);
  let ultimo = -1;
  let anterior = -1;

  /** Solta uma explosão em (px, py), em pixels da tela, no instante `agora`. */
  function soltar(px: number, py: number, agora: number, escala = 1): void {
    const n = pecasDoNivel();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const v = (0.25 + Math.random() * 0.4) * escala;
      x[i] = px;
      y[i] = py;
      vx[i] = Math.cos(a) * v;
      vy[i] = Math.sin(a) * v;
      fase[i] = Math.random() * 6.28;
      cor[i] = i % cores.length;
      inicio[i] = agora;
    }
    ultimo = agora;
    anterior = agora;
  }

  /** Move e desenha as peças vivas; devolve se ainda tem alguma no ar. */
  function desenhar(c: CanvasRenderingContext2D, agora: number, tamanho = 7): boolean {
    if (agora - ultimo > DURACAO) return false;
    // Passo pelo tempo real (60 ou 120 quadros por segundo), limitado se o quadro atrasar.
    const dt = Math.min(40, Math.max(0, agora - anterior));
    anterior = agora;
    for (let i = 0; i < MAX; i++) {
      const vida = agora - inicio[i];
      if (vida < 0 || vida > DURACAO) continue;
      vx[i] -= vx[i] * AR * dt;
      vy[i] += GRAVIDADE * dt - vy[i] * AR * dt;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
      const vira = Math.abs(Math.cos(fase[i] + vida * 0.012));
      c.globalAlpha = vida > DURACAO * 0.7 ? 1 - (vida - DURACAO * 0.7) / (DURACAO * 0.3) : 1;
      c.fillStyle = cores[cor[i]];
      c.fillRect(x[i] - (tamanho * vira) / 2, y[i] - tamanho * 0.3, tamanho * vira + 0.5, tamanho * 0.6);
    }
    c.globalAlpha = 1;
    return true;
  }

  return { soltar, desenhar };
}

/**
 * Papel picado fora do canvas do jogo (Prova, Time do Dia): um canvas por cima da tela, criado na hora,
 * explodindo do meio do elemento `de`, e removido quando a última peça cai.
 */
export function papelPicadoNaTela(de: Element, cores: readonly string[]): void {
  if (!pecasDoNivel()) return;
  const r = de.getBoundingClientRect();
  const cv = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, qualidade().dprMax);
  cv.className = 'papel-picado';
  cv.setAttribute('aria-hidden', 'true');
  cv.width = Math.round(innerWidth * dpr);
  cv.height = Math.round(innerHeight * dpr);
  document.body.append(cv);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  const p = criarPapelPicado(cores);
  p.soltar(r.left + r.width / 2, r.top + r.height / 2, performance.now(), 0.9);
  const quadro = (agora: number) => {
    c.clearRect(0, 0, innerWidth, innerHeight);
    if (p.desenhar(c, agora)) requestAnimationFrame(quadro);
    else cv.remove();
  };
  requestAnimationFrame(quadro);
}
