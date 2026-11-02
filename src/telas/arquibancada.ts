// Arquibancada do time na Home (docs/visual.md, seção 3): a torcida da partida nas cores do time, com luz e
// refletores pelo horário de Brasília. Pré-desenhada uma vez por visita; Alta e Média alternam os 3 quadros
// (a torcida balança de leve), Leve e movimento reduzido ficam parados. O card de compartilhar usa o mesmo desenho.

import type { Luz } from '../jogo/home';
import { qualidade } from './qualidade';
import { QUADROS_TORCIDA, desenharTorcedor, lugaresDaTorcida } from './torcida';

/** Medidas do desenho: largura, altura, onde o céu acaba e os postes dos refletores. */
export interface MedidasArquibancada {
  W: number;
  H: number;
  topo: number;
  postes: readonly number[];
}

/** Largura máxima da tela do jogo: em telas menores o CSS corta as pontas (object-fit: cover). */
const FAIXA: MedidasArquibancada = { W: 480, H: 150, topo: 34, postes: [72, 408] };
/** Bem devagar: a torcida balança, não treme (nada passa de 3 trocas por segundo). */
const QUADRO_MS = 340;

const CEU: Record<Luz, [string, string]> = {
  dia: ['#7cc0ea', '#cfe9f5'],
  entardecer: ['#3d3a7c', '#f0955a'],
  noite: ['#050a1c', '#101a33'],
};
/** Filtro de luz por cima da torcida, bem leve: as cores do time continuam sendo as do time. */
const TOM: Record<Luz, string | null> = { dia: null, entardecer: 'rgba(240,120,50,0.13)', noite: 'rgba(5,10,30,0.3)' };

function refletor(o: CanvasRenderingContext2D, x: number, topo: number, luz: Luz): void {
  o.fillStyle = '#3b4148';
  o.fillRect(x - 1.5, 12, 3, topo - 8);
  o.fillRect(x - 15, 5, 30, 10);
  o.fillStyle = luz === 'noite' ? '#fffbe6' : luz === 'entardecer' ? '#c9c2a5' : '#8d949c';
  for (let i = 0; i < 5; i++) o.fillRect(x - 13 + i * 5.5, 7, 4, 6);
}

function focoDeLuz(o: CanvasRenderingContext2D, x: number, W: number, H: number): void {
  const luzDoPoste = o.createRadialGradient(x, 10, 2, x, 10, 150);
  luzDoPoste.addColorStop(0, 'rgba(255,250,225,0.6)');
  luzDoPoste.addColorStop(0.35, 'rgba(255,250,225,0.16)');
  luzDoPoste.addColorStop(1, 'rgba(255,250,225,0)');
  o.fillStyle = luzDoPoste;
  o.fillRect(0, 0, W, H);
}

/** Céu, degraus, torcida, luz e refletores: o mesmo desenho na faixa da Home e no card de compartilhar. */
export function desenharArquibancada(o: CanvasRenderingContext2D, { W, H, topo, postes }: MedidasArquibancada, q: number, cores: readonly [string, string], luz: Luz): void {
  const ceu = o.createLinearGradient(0, 0, 0, topo);
  ceu.addColorStop(0, CEU[luz][0]);
  ceu.addColorStop(1, CEU[luz][1]);
  o.fillStyle = ceu;
  o.fillRect(0, 0, W, topo);
  const grada = o.createLinearGradient(0, topo, 0, H);
  grada.addColorStop(0, '#0d2b18');
  grada.addColorStop(1, '#04130a');
  o.fillStyle = grada;
  o.fillRect(0, topo, W, H - topo);

  o.save();
  o.translate(0, topo - 8);
  for (const l of lugaresDaTorcida(W, H - topo + 18, cores)) desenharTorcedor(o, cores, l.x, l.y, l.r, l.cor, l.h, 0, q, l.bandeira);
  o.restore();

  const tom = TOM[luz];
  if (tom) {
    o.fillStyle = tom;
    o.fillRect(0, 0, W, H);
  }
  if (luz === 'noite') postes.forEach((x) => focoDeLuz(o, x, W, H));
  postes.forEach((x) => refletor(o, x, topo, luz));
}

function novoQuadro(dpr: number, q: number, cores: [string, string], luz: Luz): HTMLCanvasElement {
  const tela = document.createElement('canvas');
  tela.width = Math.round(FAIXA.W * dpr);
  tela.height = Math.round(FAIXA.H * dpr);
  const o = tela.getContext('2d')!;
  o.scale(dpr, dpr);
  desenharArquibancada(o, FAIXA, q, cores, luz);
  return tela;
}

let guardado: { chave: string; quadros: HTMLCanvasElement[] } | null = null;

function quadrosDa(cores: [string, string], luz: Luz, dpr: number, vivo: boolean): HTMLCanvasElement[] {
  const chave = `${cores.join()}|${luz}|${dpr}|${vivo}`;
  if (guardado?.chave !== chave) {
    const n = vivo ? QUADROS_TORCIDA : 1;
    guardado = { chave, quadros: Array.from({ length: n }, (_, q) => novoQuadro(dpr, q, cores, luz)) };
  }
  return guardado.quadros;
}

/** Desenha no canvas da faixa; devolve a função que para o balanço. */
export function ligarArquibancada(tela: HTMLCanvasElement, cores: [string, string], luz: Luz): () => void {
  const n = qualidade();
  const parada = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vivo = n.torcidaViva && !parada;
  const dpr = Math.min(window.devicePixelRatio || 1, n.dprMax);
  const quadros = quadrosDa(cores, luz, dpr, vivo);
  tela.width = quadros[0].width;
  tela.height = quadros[0].height;
  const o = tela.getContext('2d')!;
  o.drawImage(quadros[0], 0, 0);
  if (!vivo) return () => {};
  let q = 0;
  const balanco = window.setInterval(() => {
    if (document.hidden) return;
    q = (q + 1) % quadros.length;
    o.drawImage(quadros[q], 0, 0);
  }, QUADRO_MS);
  return () => clearInterval(balanco);
}
