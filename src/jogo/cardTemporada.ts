// Card de fim de temporada (docs/jogo.md seção 5 e 14.6; "tabela final no telão"): o desenho do Telão e as peças que o
// Pôster também usa (o emblema do destino). No Telão: o selo inclinado do destino, a faixa de placar do time, o pedaço
// da tabela final em volta do time (a linha do time na cor do time e o tracejado verde "sobem" ou vermelho "caem") e os
// 3 números; embaixo, a frase e a linha de quem. Carrega por `import()`, como `cardTrofeu.ts`, para o bundle inicial
// não crescer. Só desenha o que o plano manda. Nomes de outros times são só nome de clube; nada de nome de pessoa.

import { corDeTexto, timePorId } from '../dados/times';
import { horaBrasilia } from '../servidor/tempo';
import { AMARELO, GEO_QUADRADO, GEO_STORIES, PLACAR, ROTULO, fundo, pilulaDoNivel, rodape, textoDoTopo, viga } from './card';
import type { DadosDoCard, PlanoDaTemporada, PlanoDoCard } from './cardPersonalizado';
import { alturaAbaixo, alturaDosNumeros, empilhar, faixaDoTime, itensAbaixo, moldura, numeros } from './cardTrofeu';
import { luzDoHorario } from './home';
import type { FatiaDaTabela } from './temporada';

const L = 1080;
export const VERDE = '#3ddc84';
export const VERMELHO = '#ff6459';
const CINZA = '#aeb6bf';
const NEUTRO = '#e4e8ec';
const TESTE = 'TESTE DAS DIVISÕES';

/** A cor do selo: dourado para campeão, verde para quem sobe, cinza para quem cai e claro para quem fica. */
export function corDoSelo(p: Pick<PlanoDaTemporada, 'destino' | 'emblema'>): string {
  if (p.destino === 'campeao' || p.destino === 'campeao_b' || p.destino === 'estreia') return AMARELO;
  return p.emblema === 'sobe' ? VERDE : p.emblema === 'desce' ? CINZA : NEUTRO;
}

// ---------- peças ----------

/** O emblema do destino (Pôster): disco escuro com seta para cima (verde), para baixo (cinza) ou um traço (quem fica). */
export function desenharEmblema(c: CanvasRenderingContext2D, p: Pick<PlanoDaTemporada, 'destino' | 'emblema'>, cx: number, cy: number, r: number): void {
  const cor = corDoSelo(p);
  c.save();
  c.translate(cx, cy);
  c.fillStyle = '#0e1216';
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = cor;
  c.lineWidth = Math.max(4, r * 0.1);
  c.stroke();
  c.fillStyle = cor;
  c.beginPath();
  if (p.emblema === 'fica') {
    c.roundRect(-r * 0.5, -r * 0.1, r, r * 0.2, r * 0.06);
  } else {
    const s = p.emblema === 'sobe' ? -1 : 1;
    c.moveTo(0, s * r * 0.58);
    c.lineTo(r * 0.5, s * r * -0.02);
    c.lineTo(r * 0.2, s * r * -0.02);
    c.lineTo(r * 0.2, s * r * -0.56);
    c.lineTo(-r * 0.2, s * r * -0.56);
    c.lineTo(-r * 0.2, s * r * -0.02);
    c.lineTo(-r * 0.5, s * r * -0.02);
    c.closePath();
    // A ponta fica do lado de cima (sobe) ou de baixo (cai).
  }
  c.fill();
  c.restore();
}

/** Papel picado (deterministico) na caixa dada; só em festa. */
function papelPicado(c: CanvasRenderingContext2D, cores: readonly string[], x: number, y: number, l: number, a: number, n: number): void {
  let semente = 20241;
  const rnd = () => {
    semente = (semente * 1103515245 + 12345) & 0x7fffffff;
    return semente / 0x7fffffff;
  };
  const paleta = [...cores, AMARELO, '#ffffff'];
  c.save();
  c.beginPath();
  c.rect(x, y, l, a);
  c.clip();
  for (let i = 0; i < n; i++) {
    c.save();
    c.translate(x + rnd() * l, y + rnd() * a);
    c.rotate(rnd() * Math.PI);
    c.fillStyle = paleta[i % paleta.length];
    c.globalAlpha = 0.85;
    c.fillRect(-9, -5, 18 + rnd() * 6, 10);
    c.restore();
  }
  c.restore();
}

/** O selo inclinado do destino, centrado em (cx, cy). `teste` põe "TESTE DAS DIVISÕES" embaixo da palavra. */
function seloInclinado(c: CanvasRenderingContext2D, p: PlanoDaTemporada, cx: number, cy: number, maxL: number, h: number, tam: number): void {
  const cor = corDoSelo(p);
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.07);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  let t = tam;
  c.font = `400 ${t}px ${PLACAR}`;
  const larg = c.measureText(p.selo).width;
  if (larg > maxL - t * 0.8) t = Math.floor((t * (maxL - t * 0.8)) / larg);
  c.font = `400 ${t}px ${PLACAR}`;
  const palavra = c.measureText(p.selo);
  const lP = palavra.width;
  const subTam = Math.round(Math.min(34, h * 0.17));
  c.font = `700 ${subTam}px ${ROTULO}`;
  const lSub = p.teste ? c.measureText(TESTE).width : 0;
  const w = Math.min(Math.max(lP, lSub) + t * 0.9, maxL);
  const altP = palavra.actualBoundingBoxAscent;
  const interno = altP + (p.teste ? subTam * 1.7 : 0);
  const hh = Math.min(h, interno + t * 0.62);
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath();
  c.roundRect(-w / 2 + 6, -hh / 2 + 8, w, hh, 16);
  c.fill();
  c.fillStyle = '#0b1117';
  c.strokeStyle = cor;
  c.lineWidth = Math.max(6, t * 0.07);
  c.beginPath();
  c.roundRect(-w / 2, -hh / 2, w, hh, 16);
  c.fill();
  c.stroke();
  c.fillStyle = cor;
  c.font = `400 ${t}px ${PLACAR}`;
  const topoTexto = -interno / 2;
  c.fillText(p.selo, 0, topoTexto + altP, w - t * 0.4);
  if (p.teste) {
    c.font = `700 ${subTam}px ${ROTULO}`;
    c.fillStyle = '#ffffff';
    c.fillText(TESTE, 0, topoTexto + altP + subTam * 1.5, w - t * 0.4);
  }
  c.restore();
}

/** "7º": o número em Anton e o º pequeno em Barlow Condensed (em Anton o º parece um zero). */
function posicaoOrdinal(c: CanvasRenderingContext2D, n: number, x: number, base: number, tam: number, cor: string): void {
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = cor;
  c.font = `400 ${tam}px ${PLACAR}`;
  const txt = String(n);
  c.fillText(txt, x, base);
  const l = c.measureText(txt).width;
  const tamO = Math.round(tam * 0.62);
  c.font = `700 ${tamO}px ${ROTULO}`;
  c.fillText('º', x + l + tam * 0.04, base - tam * 0.36);
}

const alturaDaTabela = (f: FatiaDaTabela, r: number, corteH: number) => f.linhas.length * r + (f.corte ? corteH : 0);

/** O pedaço da tabela final: posição, cor do clube, nome e pontos; a linha do meu time na cor do time. Devolve a altura. */
function tabela(c: CanvasRenderingContext2D, f: FatiaDaTabela, meuTime: string, cx: number, yTopo: number, w: number, r: number, corteH: number, escala: number): number {
  const x0 = cx - w / 2;
  const pos = (l: FatiaDaTabela['linhas'][number]) => l.posicao_final ?? l.posicao;
  const tamN = Math.round(r * 0.6);
  let y = yTopo;
  f.linhas.forEach((l, i) => {
    const time = timePorId(l.time_id);
    const [c1, c2] = time?.cores ?? ['#667078', '#99a3ab'];
    const meu = l.time_id === meuTime;
    const txt = meu ? corDeTexto(c1) : '#ffffff';
    if (meu) {
      c.fillStyle = c1;
      c.beginPath();
      c.roundRect(x0, y + 2, w, r - 4, 10);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.65)';
      c.lineWidth = 3;
      c.stroke();
    } else if (i % 2 === 0) {
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.beginPath();
      c.roundRect(x0, y + 2, w, r - 4, 10);
      c.fill();
    }
    const base = y + r / 2 + tamN * 0.36;
    posicaoOrdinal(c, pos(l), x0 + 24 * escala, base, tamN, meu ? txt : AMARELO);
    // O chip com as duas cores do clube.
    const cw = 40 * escala;
    const ch = 24 * escala;
    const cxChip = x0 + 112 * escala;
    c.fillStyle = c1;
    c.fillRect(cxChip, y + r / 2 - ch / 2, cw / 2, ch);
    c.fillStyle = c2;
    c.fillRect(cxChip + cw / 2, y + r / 2 - ch / 2, cw / 2, ch);
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2;
    c.strokeRect(cxChip, y + r / 2 - ch / 2, cw, ch);
    // Pontos à direita e nome do clube no meio.
    c.textBaseline = 'alphabetic';
    c.textAlign = 'right';
    c.fillStyle = txt;
    c.font = `400 ${tamN}px ${PLACAR}`;
    const larguraPts = c.measureText(l.pontos.toLocaleString('pt-BR')).width;
    c.fillText(l.pontos.toLocaleString('pt-BR'), x0 + w - 22 * escala, base);
    c.textAlign = 'left';
    c.font = `700 ${Math.round(r * 0.58)}px ${ROTULO}`;
    c.fillText((time?.nome ?? l.time_id).toUpperCase(), cxChip + cw + 18 * escala, base - r * 0.02, w - (cxChip - x0) - cw - 18 * escala - larguraPts - 50 * escala);
    y += r;
    // O tracejado de quem sobe ou cai, entre as duas linhas da fronteira.
    const prox = f.linhas[i + 1];
    if (f.corte && prox && pos(l) === f.corte.depoisDe && pos(prox) === f.corte.depoisDe + 1) {
      const cor = f.corte.tipo === 'sobem' ? VERDE : VERMELHO;
      const yy = y + corteH / 2;
      c.save();
      c.strokeStyle = cor;
      c.lineWidth = 4;
      c.setLineDash([16, 10]);
      c.beginPath();
      c.moveTo(x0 + 6, yy);
      c.lineTo(x0 + w - 6, yy);
      c.stroke();
      c.restore();
      const rot = f.corte.tipo === 'sobem' ? 'SOBEM' : 'CAEM';
      const tr = Math.round(corteH * 0.62);
      c.font = `700 ${tr}px ${ROTULO}`;
      const lr = c.measureText(rot).width + tr;
      c.fillStyle = '#070b10';
      c.beginPath();
      c.roundRect(x0 + w - 6 - lr - 14, yy - tr * 0.62, lr, tr * 1.24, tr * 0.62);
      c.fill();
      c.fillStyle = cor;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(rot, x0 + w - 6 - lr / 2 - 14, yy + tr * 0.05);
      c.textBaseline = 'alphabetic';
      y += corteH;
    }
  });
  return y - yTopo;
}

// ---------- Telão ----------

/** O Telão do fim de temporada: panorama do estádio, painel com selo, time, tabela final e 3 números; embaixo, frase e quem. */
export async function desenharTelaoDaTemporada(d: DadosDoCard, plano: PlanoDoCard, busto: HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
  const T = plano.temporada!;
  const quadrado = plano.formato === 'quadrado';
  const canvas = document.createElement('canvas');
  canvas.width = plano.largura;
  canvas.height = plano.altura;
  const c = canvas.getContext('2d')!;
  const geo = quadrado ? GEO_QUADRADO : GEO_STORIES;
  const luz = d.luz ?? luzDoHorario(horaBrasilia());

  fundo(c, d.time, luz, geo);
  if (quadrado) textoDoTopo(c, plano.topo, luz, 64, 32, 900);
  else textoDoTopo(c, plano.topo, luz);
  viga(c, geo.ceu);

  const temNumeros = T.numeros.length > 0;
  const fatia = T.fatia;
  const vao = quadrado ? 18 : 24;
  const abaixo = itensAbaixo(c, d, plano, busto, quadrado);

  if (quadrado) {
    // Painel largo: selo e faixa do time na primeira linha; a tabela e os números embaixo.
    const x = 40;
    const l = 1000;
    const borda = 22;
    const pad = 16;
    const y = geo.ceu + 34;
    const wi = l - (borda + pad) * 2;
    const cx = x + l / 2;
    const hTopo = T.teste ? 112 : 92;
    const hNums = alturaDosNumeros(46, 20);
    const corteH = 26;
    const limite = 850;
    let r = 46;
    const altura = (rr: number) => hTopo + (fatia ? 14 + alturaDaTabela(fatia, rr, corteH) : 0) + (temNumeros ? 18 + hNums : 0) + (borda + pad) * 2 + 8;
    while (r > 36 && y + altura(r) + 24 + alturaAbaixo(abaixo, vao) > limite) r -= 2;
    const a = altura(r);
    moldura(c, x, y, l, a, geo.ceu, borda);
    let yy = y + borda + pad + 4;
    const xi = x + borda + pad;
    const wSelo = 330;
    if (T.festa) papelPicado(c, d.time.cores, xi, yy - 6, wSelo + 20, hTopo + 12, 16);
    seloInclinado(c, T, xi + wSelo / 2, yy + hTopo / 2, wSelo, hTopo, 74);
    faixaDoTime(c, d, xi + wSelo + 24 + (wi - wSelo - 24) / 2, yy + hTopo / 2, wi - wSelo - 24, 88, 60);
    yy += hTopo;
    if (fatia) {
      yy += 14;
      yy += tabela(c, fatia, T.meuTime, cx, yy, wi, r, corteH, 0.75);
    }
    if (temNumeros) numeros(c, T, cx, yy + 18, wi, 46, 20);
    empilhar(abaixo, y + a + 24, limite, vao);
    if (plano.nivel) pilulaDoNivel(c, plano.nivel, geo.rodape, 30);
    rodape(c, plano.link, plano.avisoFixo, 948, 0.8);
    return canvas;
  }

  // Stories: painel alto, tudo empilhado ao centro.
  const x = 70;
  const l = 940;
  const borda = 24;
  const y = geo.ceu + 46;
  const limite = 1478; // a linha branca do gramado (FIM_DO_MEIO) fica em 1500: nada de texto por cima dela
  const hSelo = T.teste ? 210 : 160;
  const hFaixa = 120;
  const hNums = alturaDosNumeros(76, 30);
  const corteH = 36;
  const altura = (rr: number) => 28 + hSelo + 22 + hFaixa + (fatia ? 26 + alturaDaTabela(fatia, rr, corteH) : 0) + (temNumeros ? 34 + hNums + 34 : 34) + borda * 2;
  let r = 64;
  while (r > 46 && y + altura(r) + 26 + alturaAbaixo(abaixo, vao) + 20 > limite) r -= 2;
  const a = altura(r);
  moldura(c, x, y, l, a, geo.ceu, borda);
  let yy = y + borda + 28;
  if (T.festa) papelPicado(c, d.time.cores, x + borda + 30, yy - 8, l - (borda + 30) * 2, hSelo + 16, 30);
  seloInclinado(c, T, L / 2, yy + hSelo / 2, 700, hSelo, 124);
  yy += hSelo + 22;
  faixaDoTime(c, d, L / 2, yy + hFaixa / 2, 840, hFaixa, 88);
  yy += hFaixa;
  if (fatia) {
    yy += 26;
    yy += tabela(c, fatia, T.meuTime, L / 2, yy, 840, r, corteH, 1);
  }
  if (temNumeros) numeros(c, T, L / 2, yy + 34, 840, 76, 30);
  empilhar(abaixo, y + a + 26, limite, vao);
  if (plano.nivel) pilulaDoNivel(c, plano.nivel, geo.rodape);
  rodape(c, plano.link, plano.avisoFixo);
  return canvas;
}
