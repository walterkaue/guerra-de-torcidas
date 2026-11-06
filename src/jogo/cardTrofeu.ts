// Card do troféu da Galeria (docs/jogo.md 14.6, "Card do troféu"): o desenho do Telão e a imagem do troféu, que o
// Placar seco e o Pôster também usam. O troféu é o mesmo SVG da Galeria (`telas/trofeusDesenho.ts`), com as cores
// fixas no lugar das variáveis de CSS, virado imagem (data URL → Image → drawImage). Carrega por `import()`, como o
// `cardPoster.ts`, para o bundle inicial não crescer. Só desenha o que o plano manda; nada de nome de pessoa.

import { corDeTexto } from '../dados/times';
import { horaBrasilia } from '../servidor/tempo';
import { proporcaoDoTrofeu, svgDoTrofeu, svgParaImagem } from '../telas/trofeusDesenho';
import { AMARELO, FONTE, GEO_QUADRADO, GEO_STORIES, PLACAR, ROTULO, adesivo, fundo, pilulaDoNivel, quebrarTexto, rodape, textoDoTopo, viga } from './card';
import { separarOrdinal, type TipoDeTrofeu } from './galeria';
import { luzDoHorario } from './home';
import type { DadosDoCard, PlanoDoCard, PlanoDoTrofeu } from './cardPersonalizado';

const L = 1080;

/** O troféu já como imagem, com o tamanho em que foi pedido (`l` × `a`). */
export interface ImagemDoTrofeu {
  img: HTMLImageElement;
  l: number;
  a: number;
}

/**
 * O troféu como imagem de `altura` pixels. `contorno`: flâmula com contorno claro (fundo escuro). `traco`: a cor das
 * ondas do megafone (`currentColor` no SVG). Se a imagem não carregar, devolve null e o card sai sem o desenho.
 */
export async function imagemDoTrofeu(
  tipo: TipoDeTrofeu,
  cores: readonly string[],
  altura: number,
  o: { contorno: boolean; traco: string },
): Promise<ImagemDoTrofeu | null> {
  const a = Math.round(altura);
  const l = Math.round(altura * proporcaoDoTrofeu(tipo));
  try {
    const img = new Image();
    img.src = svgParaImagem(svgDoTrofeu(tipo, cores, 'Troféu', { contorno: o.contorno }), l, a, o.traco);
    await img.decode();
    return { img, l, a };
  } catch {
    return null;
  }
}

/** Desenha a imagem centrada em (cx, cy) dentro de uma caixa `lMax` × `aMax`, sem passar do tamanho dela. */
export function desenharImagemDoTrofeu(c: CanvasRenderingContext2D, im: ImagemDoTrofeu, cx: number, cy: number, lMax: number, aMax: number): void {
  const k = Math.min(lMax / im.l, aMax / im.a, 1.4);
  const l = im.l * k;
  const a = im.a * k;
  c.drawImage(im.img, cx - l / 2, cy - a / 2, l, a);
}

// ---------- peças ----------

/** Tamanho (até `tam`, nunca abaixo de `min`) em que o texto cabe em `largura`. */
function caber(c: CanvasRenderingContext2D, fonte: (t: number) => string, texto: string, largura: number, tam: number, min: number): number {
  c.font = fonte(tam);
  const l = c.measureText(texto).width;
  return l > largura ? Math.max(min, Math.floor((tam * largura) / l)) : tam;
}

/** Faixa amarela com a série e o período. */
function faixaAmarela(c: CanvasRenderingContext2D, texto: string, cx: number, cy: number, h: number, tam: number, maxL: number): void {
  const t = caber(c, (x) => `700 ${x}px ${ROTULO}`, texto, maxL - h, tam, Math.round(tam * 0.6));
  c.font = `700 ${t}px ${ROTULO}`;
  const w = Math.min(c.measureText(texto).width + h * 0.9, maxL);
  c.fillStyle = AMARELO;
  c.beginPath();
  c.roundRect(cx - w / 2, cy - h / 2, w, h, h * 0.2);
  c.fill();
  c.fillStyle = '#17181a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, cx, cy + t * 0.05, w - h * 0.5);
}

/** O nome do time numa faixa de placar: cor 1 cheia e uma faixa reta na cor 2 junto da borda esquerda. */
function faixaDoTime(c: CanvasRenderingContext2D, d: DadosDoCard, cx: number, cy: number, w: number, h: number, tam: number): void {
  const [c1, c2] = d.time.cores;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const tira = h * 0.26;
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, h, h * 0.12);
  c.clip();
  c.fillStyle = c1;
  c.fillRect(x, y, w, h);
  c.fillStyle = c2;
  c.fillRect(x, y, tira, h);
  c.restore();
  // Contorno claro: cor escura (preto, azul-marinho) não some no painel escuro.
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 4;
  c.beginPath();
  c.roundRect(x, y, w, h, h * 0.12);
  c.stroke();
  const nome = d.time.nome.toUpperCase();
  const area = w - tira - h * 0.6;
  const t = caber(c, (z) => `400 ${z}px ${PLACAR}`, nome, area, tam, Math.round(tam * 0.5));
  c.font = `400 ${t}px ${PLACAR}`;
  c.fillStyle = corDeTexto(c1);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const asc = c.measureText(nome).actualBoundingBoxAscent;
  c.fillText(nome, x + tira + (w - tira) / 2, cy + asc / 2, area);
}

/** Os números da ficha, lado a lado: valor em Anton amarelo e o rótulo embaixo. `yTopo` é o alto do bloco. */
function numeros(c: CanvasRenderingContext2D, lista: PlanoDoTrofeu, cx: number, yTopo: number, w: number, tamV: number, tamR: number): void {
  const col = w / lista.numeros.length;
  lista.numeros.forEach((n, i) => {
    const x = cx - w / 2 + col * (i + 0.5);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    const { numero, ordinal } = separarOrdinal(n.valor);
    c.font = `400 ${tamV}px ${PLACAR}`;
    c.fillStyle = AMARELO;
    const base = yTopo + tamV * 0.9;
    if (!ordinal) c.fillText(n.valor, x, base, col - 16);
    else {
      // "1º": em Anton o º parece um zero ("10"); vai menor, em Barlow Condensed, no alto, como o º do rótulo.
      const tamO = Math.round(tamV * 0.4);
      const larguraN = c.measureText(numero).width;
      c.font = `700 ${tamO}px ${ROTULO}`;
      const larguraO = c.measureText(ordinal).width;
      const gap = tamV * 0.04;
      const total = larguraN + gap + larguraO;
      const x0 = x - total / 2;
      c.textAlign = 'left';
      c.font = `400 ${tamV}px ${PLACAR}`;
      c.fillText(numero, x0, base);
      c.font = `700 ${tamO}px ${ROTULO}`;
      c.fillText(ordinal, x0 + larguraN + gap, base - tamV * 0.5);
      c.textAlign = 'center';
    }
    c.font = `700 ${tamR}px ${ROTULO}`;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText(n.rotulo.toUpperCase(), x, yTopo + tamV * 0.9 + tamR * 1.4, col - 12);
  });
}

const alturaDosNumeros = (tamV: number, tamR: number) => tamV * 0.9 + tamR * 1.6;

/** O painel escuro do telão, pendurado nos cabos da viga. */
function moldura(c: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, ceu: number, borda: number): void {
  c.fillStyle = '#1b1f24';
  for (const cabo of [x + 130, x + l - 130]) {
    c.fillRect(cabo - 8, ceu, 16, y - ceu + 8);
    c.fillRect(cabo - 26, y - 16, 52, 24);
  }
  c.fillStyle = '#04070a';
  c.beginPath();
  c.roundRect(x - 6, y + 10, l + 12, a + 6, 26);
  c.fill();
  c.fillStyle = '#1b1f24';
  c.beginPath();
  c.roundRect(x, y, l, a, 22);
  c.fill();
  c.strokeStyle = '#59616b';
  c.lineWidth = 4;
  c.stroke();
  c.fillStyle = '#070b10';
  c.beginPath();
  c.roundRect(x + borda, y + borda, l - borda * 2, a - borda * 2, 10);
  c.fill();
}

interface ItemAbaixo {
  h: number;
  desenhar: (y: number) => void;
}

/** A linha de quem fez: com o busto, os dois lado a lado e centrados; sem a linha, o busto vai sozinho. */
function linhaDeQuem(c: CanvasRenderingContext2D, quem: string | null, busto: HTMLCanvasElement | null, y: number, tam: number): void {
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#ffffff';
  c.font = `800 ${tam}px ${FONTE}`;
  if (busto) {
    const lado = busto.width;
    const folga = lado * 0.14;
    const texto = quem ? Math.min(c.measureText(quem).width, L - 130 - lado - folga) : 0;
    const x0 = L / 2 - (lado + (quem ? folga + texto : 0)) / 2;
    c.drawImage(busto, x0, y, lado, lado);
    if (quem) {
      c.textAlign = 'left';
      c.fillText(quem, x0 + lado + folga, y + lado / 2 + tam * 0.34, texto);
    }
    return;
  }
  if (!quem) return;
  c.textAlign = 'center';
  c.fillText(quem, L / 2, y + tam * 0.85, L - 130);
}

/** O que vai embaixo do painel: a frase do narrador (adesivo) e a linha de quem (com o busto). */
function itensAbaixo(c: CanvasRenderingContext2D, d: DadosDoCard, plano: PlanoDoCard, busto: HTMLCanvasElement | null, quadrado: boolean): ItemAbaixo[] {
  const itens: ItemAbaixo[] = [];
  if (plano.frase) {
    const tam = quadrado ? 26 : 40;
    c.font = `800 ${tam}px ${FONTE}`;
    const linhas = Math.min(2, quebrarTexto(c, plano.frase, L - 210).length);
    const h = linhas * tam * 1.25 + tam + 24;
    const frase = plano.frase;
    itens.push({ h, desenhar: (y) => adesivo(c, d.time, frase, y + h / 2, tam) });
  }
  if (plano.quem || busto) {
    const tam = quadrado ? 34 : 52;
    const h = busto ? busto.width : tam * 1.1;
    const quem = plano.quem;
    itens.push({ h, desenhar: (y) => linhaDeQuem(c, quem, busto, y, tam) });
  }
  return itens;
}

/** Distribui os itens centrados na faixa [de, ate], com `vao` entre eles. */
function empilhar(itens: ItemAbaixo[], de: number, ate: number, vao: number): void {
  const total = itens.reduce((s, i) => s + i.h, 0) + vao * Math.max(0, itens.length - 1);
  let y = de + Math.max(0, (ate - de - total) / 2);
  for (const i of itens) {
    i.desenhar(y);
    y += i.h + vao;
  }
}

const alturaAbaixo = (itens: ItemAbaixo[], vao: number) => itens.reduce((s, i) => s + i.h, 0) + vao * Math.max(0, itens.length - 1);

// ---------- Telão ----------

/** O Telão do troféu: panorama do estádio, painel com o troféu, nome, série e período, time e números; embaixo, frase e quem. */
export async function desenharTelaoDoTrofeu(d: DadosDoCard, plano: PlanoDoCard, busto: HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
  const T = plano.trofeu!;
  const quadrado = plano.formato === 'quadrado';
  const imagem = await imagemDoTrofeu(T.tipo, d.time.cores, 420, { contorno: true, traco: '#f4f1e6' });
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

  const subtitulo = [T.serie, T.periodo].filter(Boolean).join(' · ').toUpperCase();
  const temNumeros = T.numeros.length > 0;
  const nome = T.nome.toUpperCase();
  c.textBaseline = 'alphabetic';

  if (quadrado) {
    // Painel largo: o troféu à esquerda; à direita, nome, série e período, time e números.
    const vao = 18;
    const abaixo = itensAbaixo(c, d, plano, busto, true);
    const x = 40;
    const l = 1000;
    const borda = 22;
    const y = geo.ceu + 34;
    const tNome = caber(c, (t) => `400 ${t}px ${PLACAR}`, nome, 560, 76, 44);
    c.font = `400 ${tNome}px ${PLACAR}`;
    const hNome = c.measureText(nome).actualBoundingBoxAscent;
    const hNums = alturaDosNumeros(52, 22);
    const interno = hNome + 18 + 54 + 20 + 96 + (temNumeros ? 24 + hNums : 0);
    const a = Math.max(interno, 280) + (borda + 24) * 2;
    moldura(c, x, y, l, a, geo.ceu, borda);
    const topoInterno = y + borda + 24;
    const alturaInterna = a - (borda + 24) * 2;
    if (imagem) desenharImagemDoTrofeu(c, imagem, x + borda + 24 + 150, topoInterno + alturaInterna / 2, 300, Math.min(alturaInterna, 340));
    const xr = x + borda + 24 + 330;
    const lr = x + l - borda - 24 - xr;
    const cx = xr + lr / 2;
    let yy = topoInterno + (alturaInterna - interno) / 2;
    c.font = `400 ${tNome}px ${PLACAR}`;
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.fillText(nome, cx, (yy += hNome), lr);
    yy += 18;
    faixaAmarela(c, subtitulo, cx, yy + 27, 54, 28, lr);
    yy += 54 + 20;
    faixaDoTime(c, d, cx, yy + 48, lr, 96, 70);
    yy += 96;
    if (temNumeros) numeros(c, T, cx, yy + 24, lr, 52, 22);
    empilhar(abaixo, y + a + 24, 850, vao);
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
  const vao = 24;
  const abaixo = itensAbaixo(c, d, plano, busto, false);
  const tNome = caber(c, (t) => `400 ${t}px ${PLACAR}`, nome, 840, 104, 60);
  c.font = `400 ${tNome}px ${PLACAR}`;
  const hNome = c.measureText(nome).actualBoundingBoxAscent;
  const hNums = alturaDosNumeros(76, 30);
  const fixos = 28 + hNome + 24 + 76 + 32 + 150 + (temNumeros ? 34 + hNums : 0) + 34 + borda * 2;
  const sobra = limite - y - fixos - (26 + alturaAbaixo(abaixo, vao) + 20);
  const ht = imagem ? Math.max(200, Math.min(400, sobra)) : 0;
  const a = fixos + (imagem ? ht + 30 : 0);
  moldura(c, x, y, l, a, geo.ceu, borda);
  let yy = y + borda + 28;
  if (imagem) {
    desenharImagemDoTrofeu(c, imagem, L / 2, yy + ht / 2, 840, ht);
    yy += ht + 30;
  }
  c.font = `400 ${tNome}px ${PLACAR}`;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.fillText(nome, L / 2, (yy += hNome), 840);
  yy += 24;
  faixaAmarela(c, subtitulo, L / 2, yy + 38, 76, 40, 860);
  yy += 76 + 32;
  faixaDoTime(c, d, L / 2, yy + 75, 840, 150, 104);
  yy += 150;
  if (temNumeros) numeros(c, T, L / 2, yy + 34, 840, 76, 30);
  empilhar(abaixo, y + a + 26, limite, vao);
  if (plano.nivel) pilulaDoNivel(c, plano.nivel, geo.rodape);
  rodape(c, plano.link, plano.avisoFixo);
  return canvas;
}
