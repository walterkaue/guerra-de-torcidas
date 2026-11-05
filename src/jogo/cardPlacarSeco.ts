// Card "Placar seco" (docs/jogo.md 14.6): fundo de papel, sem arquibancada nem telão. De cima para baixo: a linha do
// topo, o filete com as duas cores do time, o destaque enorme, o nome do time, o que foi jogado, o placar em emoji,
// quem fez, a frase, o nível e o link. O bloco todo fica centrado na vertical; sem nada ligado, só topo, destaque,
// time e lance, e ainda assim parece composto. Só desenha o que o plano manda.

import { AMARELO, FONTE, PLACAR, ROTULO, quebrarTexto, seloRecorde } from './card';
import { cortarTexto } from './cardLances';
import type { DadosDoCard, PlanoDoCard } from './cardPersonalizado';
import { PAPEL, corDaBorda } from './cardTextos';
import { AVISO_PRE_TEMPORADA } from './posicao';

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const TINTA = '#111111';
const LARGURA_UTIL = 960;

interface Bloco {
  /** Espaço antes do bloco, já no tamanho reduzido. */
  antes: number;
  h: number;
  desenhar: (y: number) => void;
}

/** Tamanhos de partida de cada formato; o resto sai da redução `k` até o conjunto caber. */
const BASE = {
  stories: { topo: 46, destaque: 340, time: 108, lance: 52, emoji: 150, quem: 56, frase: 46, nivel: 40, link: 52, aviso: 30, margem: 120, gap: 1 },
  quadrado: { topo: 36, destaque: 250, time: 76, lance: 40, emoji: 100, quem: 44, frase: 36, nivel: 32, link: 40, aviso: 26, margem: 56, gap: 0.62 },
};

/** Maior tamanho (até `tam`, nunca abaixo de `min`) em que o texto cabe em `largura`. */
function caber(c: CanvasRenderingContext2D, fonte: (t: number) => string, texto: string, largura: number, tam: number, min: number): number {
  c.font = fonte(tam);
  const l = c.measureText(texto).width;
  return l > largura ? Math.max(min, Math.floor((tam * largura) / l)) : tam;
}

/** No máximo 2 linhas: a segunda leva o resto, cortado com reticências. */
function duasLinhas(c: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas = quebrarTexto(c, texto, largura);
  return linhas.length > 2 ? [linhas[0], cortarTexto(c, linhas.slice(1).join(' '), largura)] : linhas;
}

function montar(c: CanvasRenderingContext2D, d: DadosDoCard, plano: PlanoDoCard, k: number): Bloco[] {
  const b = BASE[plano.formato];
  const z = (base: number, piso = 0.8) => Math.max(base * piso, base * k);
  const gap = (n: number) => n * b.gap * Math.max(k, 0.55);
  const cx = plano.largura / 2;
  const cores = d.time.cores;
  const cor = corDaBorda(cores);
  const blocos: Bloco[] = [];
  const add = (antes: number, h: number, desenhar: (y: number) => void) => blocos.push({ antes: blocos.length ? antes : 0, h, desenhar });
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  // Linha do topo.
  const tTopo = caber(c, (t) => `700 ${t}px ${ROTULO}`, plano.topo, LARGURA_UTIL, z(b.topo), 22);
  add(0, tTopo * 0.72, (y) => {
    c.font = `700 ${tTopo}px ${ROTULO}`;
    c.fillStyle = '#3b3b36';
    c.textAlign = 'center';
    c.fillText(plano.topo, cx, y + tTopo * 0.72, LARGURA_UTIL);
  });

  // Filete com as duas cores.
  const hFilete = Math.max(10, 16 * k);
  add(gap(40), hFilete, (y) => {
    const x = cx - LARGURA_UTIL / 2;
    c.fillStyle = cores[0];
    c.fillRect(x, y, LARGURA_UTIL / 2, hFilete);
    c.fillStyle = cores[1];
    c.fillRect(cx, y, LARGURA_UTIL / 2, hFilete);
    c.strokeStyle = 'rgba(17,17,17,0.35)';
    c.lineWidth = 2;
    c.strokeRect(x, y, LARGURA_UTIL, hFilete);
  });

  // Destaque.
  const tDest = caber(c, (t) => `400 ${t}px ${PLACAR}`, plano.destaque, LARGURA_UTIL, z(b.destaque, 0.4), 90);
  c.font = `400 ${tDest}px ${PLACAR}`;
  const mDest = c.measureText(plano.destaque);
  const subDest = mDest.actualBoundingBoxAscent;
  add(gap(60), subDest + mDest.actualBoundingBoxDescent, (y) => {
    c.font = `400 ${tDest}px ${PLACAR}`;
    c.fillStyle = TINTA;
    c.textAlign = 'center';
    c.fillText(plano.destaque, cx, y + subDest, LARGURA_UTIL);
  });

  // Nome do time.
  const nome = plano.time.toUpperCase();
  const tTime = caber(c, (t) => `400 ${t}px ${PLACAR}`, nome, LARGURA_UTIL, z(b.time, 0.5), 50);
  c.font = `400 ${tTime}px ${PLACAR}`;
  const subTime = c.measureText(nome).actualBoundingBoxAscent;
  add(gap(34), subTime, (y) => {
    c.font = `400 ${tTime}px ${PLACAR}`;
    c.fillStyle = cor;
    c.textAlign = 'center';
    c.fillText(nome, cx, y + subTime, LARGURA_UTIL);
  });

  // Selo de recorde.
  if (plano.novoRecorde) {
    const e = Math.max(0.7, k) * (plano.formato === 'quadrado' ? 0.8 : 1);
    add(gap(30), 110 * e, (y) => {
      c.save();
      c.translate(cx, y + 55 * e);
      c.scale(e, e);
      seloRecorde(c, 0, 0);
      c.restore();
    });
  }

  // O que foi jogado, até 2 linhas.
  if (plano.lance) {
    const tam = z(b.lance);
    c.font = `700 ${tam}px ${FONTE}`;
    const linhas = duasLinhas(c, plano.lance, 900);
    const lh = tam * 1.22;
    add(gap(44), linhas.length * lh, (y) => {
      c.font = `700 ${tam}px ${FONTE}`;
      c.fillStyle = '#26272a';
      c.textAlign = 'center';
      linhas.forEach((l, i) => c.fillText(l, cx, y + i * lh + lh * 0.78));
    });
  }

  // Placar em emoji (várias linhas, a grade do Time do Dia).
  if (plano.placarEmoji) {
    const linhas = plano.placarEmoji.split('\n').filter((l) => l.trim());
    c.font = `100px ${EMOJI}`;
    const larg100 = Math.max(...linhas.map((l) => c.measureText(l).width), 1);
    const tam = Math.max(40, Math.min(z(b.emoji, 0.5), (100 * 880) / larg100));
    const lh = tam * 1.2;
    add(gap(44), Math.max(1, linhas.length) * lh, (y) => {
      c.font = `${tam}px ${EMOJI}`;
      c.fillStyle = TINTA;
      c.textAlign = 'center';
      linhas.forEach((l, i) => c.fillText(l, cx, y + i * lh + lh * 0.84));
    });
  }

  // Quem fez.
  if (plano.quem) {
    const quem = plano.quem;
    const tam = caber(c, (t) => `800 ${t}px ${FONTE}`, quem, 940, z(b.quem), 30);
    add(gap(50), tam * 0.8, (y) => {
      c.font = `800 ${tam}px ${FONTE}`;
      c.fillStyle = TINTA;
      c.textAlign = 'center';
      c.fillText(quem, cx, y + tam * 0.78, 940);
    });
  }

  // Frase do narrador, como adesivo leve com borda na cor do time.
  if (plano.frase) {
    const tam = z(b.frase);
    c.font = `800 ${tam}px ${FONTE}`;
    const linhas = duasLinhas(c, plano.frase, 780);
    const lh = tam * 1.25;
    const larg = Math.max(...linhas.map((l) => c.measureText(l).width)) + tam * 1.8;
    const alt = linhas.length * lh + tam * 0.9;
    const folga = 22; // sobra do giro
    add(gap(50), alt + folga * 2, (y) => {
      c.translate(cx, y + folga + alt / 2);
      c.rotate(-0.025);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.beginPath();
      c.roundRect(-larg / 2, -alt / 2 + 6, larg, alt, 10);
      c.fill();
      c.fillStyle = '#ffffff';
      c.strokeStyle = cor;
      c.lineWidth = Math.max(5, tam * 0.2);
      c.beginPath();
      c.roundRect(-larg / 2, -alt / 2, larg, alt, 10);
      c.fill();
      c.stroke();
      c.fillStyle = '#17181a';
      c.font = `800 ${tam}px ${FONTE}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      linhas.forEach((l, i) => c.fillText(l, 0, (i - (linhas.length - 1) / 2) * lh + 2));
    });
  }

  // Nível da Carreira, em pílula.
  if (plano.nivel) {
    const texto = plano.nivel;
    const tam = z(b.nivel);
    c.font = `700 ${tam}px ${ROTULO}`;
    const larg = Math.min(c.measureText(texto).width + tam * 1.6, LARGURA_UTIL);
    const alt = tam * 1.7;
    add(gap(36), alt, (y) => {
      c.fillStyle = TINTA;
      c.beginPath();
      c.roundRect(cx - larg / 2, y, larg, alt, alt / 2);
      c.fill();
      c.fillStyle = AMARELO;
      c.font = `700 ${tam}px ${ROTULO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(texto, cx, y + alt / 2 + tam * 0.05, larg - tam);
    });
  }

  // Link.
  if (plano.link) {
    const link = plano.link;
    const tam = caber(c, (t) => `700 ${t}px ${ROTULO}`, link, LARGURA_UTIL, z(b.link), 24);
    add(gap(40), tam * 0.75, (y) => {
      c.font = `700 ${tam}px ${ROTULO}`;
      c.fillStyle = TINTA;
      c.textAlign = 'center';
      c.fillText(link, cx, y + tam * 0.72, LARGURA_UTIL);
    });
  }

  // Aviso fixo (o do Crava), sempre que vier.
  if (plano.avisoFixo) {
    const tam = z(b.aviso);
    c.font = `600 ${tam}px ${FONTE}`;
    const linhas = duasLinhas(c, plano.avisoFixo, 900);
    const lh = tam * 1.3;
    add(gap(30), linhas.length * lh, (y) => {
      c.font = `600 ${tam}px ${FONTE}`;
      c.fillStyle = '#44464a';
      c.textAlign = 'center';
      linhas.forEach((l, i) => c.fillText(l, cx, y + i * lh + lh * 0.78));
    });
  }
  return blocos;
}

const total = (bs: Bloco[]) => bs.reduce((s, b) => s + b.antes + b.h, 0);

export function desenharCardPlacarSeco(d: DadosDoCard, plano: PlanoDoCard): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = plano.largura;
  canvas.height = plano.altura;
  const c = canvas.getContext('2d')!;
  c.fillStyle = PAPEL;
  c.fillRect(0, 0, plano.largura, plano.altura);

  const limite = plano.altura - BASE[plano.formato].margem * 2;
  let k = 1;
  let blocos = montar(c, d, plano, k);
  while (total(blocos) > limite && k > 0.3) {
    k = Math.round((k - 0.04) * 100) / 100;
    blocos = montar(c, d, plano, k);
  }
  let y = (plano.altura - total(blocos)) / 2;
  for (const bl of blocos) {
    y += bl.antes;
    c.save();
    bl.desenhar(y);
    c.restore();
    y += bl.h;
  }
  // O aviso da pré-temporada, como no rodapé do Telão: preso no pé, dentro da margem, fora da pilha.
  const tamAviso = plano.formato === 'stories' ? 28 : 22;
  c.font = `600 ${tamAviso}px ${FONTE}`;
  c.fillStyle = '#5a5c60';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillText(AVISO_PRE_TEMPORADA, plano.largura / 2, plano.altura - (plano.formato === 'stories' ? 56 : 22), LARGURA_UTIL);
  return canvas;
}
