// Card dos Lances do Jogo, gerado no celular: os 3 lances dentro do telão (card.ts), cada um com o desenho
// do desfecho (bola, luva, barreira ou xis, desenhados, nunca emoji) e o título curto do lance.
// Título de lance nunca leva nome de pessoa (já vem assim do catálogo). Só no resultado valendo.

import { AMARELO, PLACAR, ROTULO, FONTE, desenharModelo, modeloDePontos, type DadosBase } from './card';
import type { DesfechoLance } from './lances.ts';

export interface LanceDoCard {
  titulo: string;
  desfecho: DesfechoLance;
  recriou: boolean;
  pontos: number;
}

export interface DadosCardLances extends DadosBase {
  pontos: number;
  lances: readonly LanceDoCard[];
  /** "Bronze no lance Gol do título!" quando a partida deu medalha. */
  medalha?: string | null;
}

const VERDE = '#2e9d4f';
const VERMELHO = '#ff5a3c';
const CINZA = '#9aa3ad';

/** Corta o texto com reticências até caber na largura (a fonte já precisa estar definida no contexto). */
export function cortarTexto(c: CanvasRenderingContext2D, texto: string, largura: number): string {
  if (c.measureText(texto).width <= largura) return texto;
  let t = texto;
  while (t.length > 1 && c.measureText(`${t}…`).width > largura) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** O desfecho desenhado num círculo de 2·raio, centrado em (cx, cy). */
function desenharDesfecho(c: CanvasRenderingContext2D, d: DesfechoLance, cx: number, cy: number, raio: number): void {
  c.save();
  c.translate(cx, cy);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const fundo = d === 'gol' ? VERDE : d === 'defesa' ? '#3b6fd6' : d === 'barreira' ? '#c27b16' : VERMELHO;
  c.fillStyle = fundo;
  c.beginPath();
  c.arc(0, 0, raio, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.fillStyle = '#ffffff';
  c.lineWidth = raio * 0.16;
  if (d === 'gol') {
    // Bola: círculo branco com um pentágono escuro no meio.
    c.beginPath();
    c.arc(0, 0, raio * 0.62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111111';
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      c.lineTo(Math.cos(a) * raio * 0.26, Math.sin(a) * raio * 0.26);
    }
    c.closePath();
    c.fill();
  } else if (d === 'defesa') {
    // Mão aberta: palma e quatro dedos.
    c.beginPath();
    c.roundRect(-raio * 0.34, -raio * 0.02, raio * 0.68, raio * 0.52, raio * 0.14);
    c.fill();
    c.lineWidth = raio * 0.15;
    for (let i = 0; i < 4; i++) {
      const x = -raio * 0.25 + i * raio * 0.167;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, -raio * (i === 1 || i === 2 ? 0.56 : 0.46));
      c.stroke();
    }
  } else if (d === 'barreira') {
    // Três bonecos lado a lado.
    for (const dx of [-0.44, 0, 0.44]) {
      c.beginPath();
      c.arc(dx * raio, -raio * 0.3, raio * 0.15, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.roundRect(dx * raio - raio * 0.15, -raio * 0.1, raio * 0.3, raio * 0.6, raio * 0.08);
      c.fill();
    }
  } else {
    // Xis: fora ou na trave.
    const k = raio * 0.38;
    c.lineWidth = raio * 0.22;
    c.beginPath();
    c.moveTo(-k, -k);
    c.lineTo(k, k);
    c.moveTo(k, -k);
    c.lineTo(-k, k);
    c.stroke();
  }
  c.restore();
}

export function desenharCardLances(d: DadosCardLances): HTMLCanvasElement {
  return desenharModelo(modeloDePontos(d, 'Lances do Jogo', d.pontos), (c, { x, y, l, a }) => {
    c.textBaseline = 'alphabetic';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.font = `700 34px ${ROTULO}`;
    c.fillText('LANCES DO JOGO', x + l / 2, y + 30);

    const temMedalha = !!d.medalha;
    const topo = y + 52;
    const linha = Math.min(78, (a - 52 - (temMedalha ? 46 : 0)) / Math.max(1, d.lances.length));
    const raio = linha * 0.4;
    d.lances.forEach((lance, i) => {
      const cy = topo + i * linha + linha / 2;
      desenharDesfecho(c, lance.desfecho, x + raio + 6, cy, raio);
      c.textAlign = 'right';
      c.fillStyle = lance.pontos > 0 ? AMARELO : CINZA;
      c.font = `400 52px ${PLACAR}`;
      const pts = lance.pontos > 0 ? `+${lance.pontos}` : '0';
      c.fillText(pts, x + l - 4, cy + 18);
      const largPts = c.measureText(pts).width;
      c.textAlign = 'left';
      c.fillStyle = '#ffffff';
      c.font = `700 36px ${FONTE}`;
      const livre = l - raio * 2 - 40 - largPts - 24;
      c.fillText(cortarTexto(c, lance.titulo, livre), x + raio * 2 + 26, cy + (lance.recriou ? 4 : 12), livre);
      if (lance.recriou) {
        c.fillStyle = AMARELO;
        c.font = `700 24px ${ROTULO}`;
        c.fillText('RECRIOU O LANCE', x + raio * 2 + 26, cy + 32);
      }
    });

    if (d.medalha) {
      c.textAlign = 'center';
      c.fillStyle = AMARELO;
      c.font = `400 40px ${PLACAR}`;
      c.fillText(cortarTexto(c, d.medalha.toUpperCase(), l), x + l / 2, y + a - 4, l);
    }
  });
}
