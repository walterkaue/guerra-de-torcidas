// Card "Pôster" (docs/jogo.md 14.6): o boneco da pessoa é o card. De trás para a frente: o fundo escolhido no vestiário,
// o número da camisa enorme e translúcido atrás do tronco, o boneco em corpo inteiro (Stories) ou do joelho pra cima
// (Quadrado), a faixa escura do topo, a frase como adesivo sobre as pernas, a placa com apelido, nível e pontos, e o
// rodapé. Só desenha o que o plano manda. Carrega por `import()`, junto com o boneco, fora do bundle inicial; desenha
// direto no canvas de 1080 (sem devicePixelRatio e sem o cache do boneco) para não estourar o limite de canvas do iPhone.

import { desenharFundo } from '../telas/bonecoFundos';
import { ALTURA_DA_FIGURA, ALTURA_DO_JOELHO, LARGURA_DA_FIGURA, desenharFiguraDoCard, prepararFonteDoNumero } from '../telas/bonecoMontavel';
import { AMARELO, FONTE, PLACAR, ROTULO, adesivo, quebrarTexto, seloRecorde } from './card';
import { cortarTexto } from './cardLances';
import { desenharMedalha } from './cardMedalha';
import { desenharEmblema } from './cardTemporada';
import { desenharImagemDoTrofeu, imagemDoTrofeu, type ImagemDoTrofeu } from './cardTrofeu';
import type { DadosDoCard, PlanoDoCard, PlanoDoPoster } from './cardPersonalizado';
import { AVISO_PRE_TEMPORADA } from './posicao';

const TINTA = 'rgba(10,11,14,0.9)';

/** As medidas de cada formato; o resto sai daqui. */
interface Medidas {
  /** Altura da faixa do topo e os tamanhos dos dois textos dela. */
  faixa: number;
  tGuerra: number;
  tFaixa: number;
  /** Onde os pés (Stories) ou o joelho (Quadrado) ficam, e o topo útil do boneco. */
  chao: number;
  topoUtil: number;
  /** A placa de baixo. */
  placa: { x: number; y: number; l: number; a: number; raio: number; pad: number };
  tApelido: number;
  tNivel: number;
  tPontos: number;
  tProTime: number;
  raioMedalha: number;
  /** Centro do adesivo da frase e o tamanho dele. */
  yFrase: number;
  tFrase: number;
  /** Rodapé: tamanhos do link e dos avisos e a margem de baixo. */
  tLink: number;
  tAviso: number;
  margemBaixo: number;
  /** O número gigante. */
  tNumero: number;
  escalaSelo: number;
}

const MEDIDAS: Record<'stories' | 'quadrado', Medidas> = {
  stories: {
    faixa: 150,
    tGuerra: 30,
    tFaixa: 48,
    chao: 1446,
    topoUtil: 190,
    placa: { x: 54, y: 1474, l: 972, a: 226, raio: 40, pad: 38 },
    tApelido: 60,
    tNivel: 36,
    tPontos: 150,
    tProTime: 40,
    raioMedalha: 56,
    yFrase: 1318,
    tFrase: 40,
    tLink: 44,
    tAviso: 27,
    margemBaixo: 64,
    tNumero: 860,
    escalaSelo: 0.86,
  },
  quadrado: {
    faixa: 104,
    tGuerra: 22,
    tFaixa: 34,
    chao: 1080,
    topoUtil: 118,
    placa: { x: 36, y: 842, l: 1008, a: 140, raio: 30, pad: 28 },
    tApelido: 44,
    tNivel: 26,
    tPontos: 96,
    tProTime: 28,
    raioMedalha: 38,
    yFrase: 774,
    tFrase: 27,
    tLink: 28,
    tAviso: 18,
    margemBaixo: 8,
    tNumero: 600,
    escalaSelo: 0.6,
  },
};

/** Luminância relativa (0 a 1) de '#rgb' ou '#rrggbb'. */
function luminancia(hex: string): number {
  const h = hex.replace('#', '');
  const cheio = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
  const canal = (i: number) => {
    const v = parseInt(cheio.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Luminância média (0 a 1, perceptual simples) de um retângulo do que já foi desenhado. */
function luminanciaDaRegiao(c: CanvasRenderingContext2D, x: number, y: number, l: number, a: number): number {
  const { data } = c.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.round(l), Math.round(a));
  let soma = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 17) {
    soma += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    n++;
  }
  return n ? soma / n : 0.5;
}

/** Texto numa linha só: encolhe até `min` e, se ainda não couber, corta com reticências. */
function linhaUnica(c: CanvasRenderingContext2D, texto: string, fonte: (t: number) => string, largura: number, tam: number, min: number): { texto: string; tam: number } {
  c.font = fonte(tam);
  const l = c.measureText(texto).width;
  const t = l > largura ? Math.max(min, Math.floor((tam * largura) / l)) : tam;
  c.font = fonte(t);
  return { texto: cortarTexto(c, texto, largura), tam: t };
}

function numeroGigante(c: CanvasRenderingContext2D, p: PlanoDoPoster, cores: readonly [string, string], m: Medidas, cx: number, cy: number): void {
  if (!p.numero) return;
  c.font = `400 ${m.tNumero}px ${PLACAR}`;
  const largura = c.measureText(p.numero).width;
  const tam = largura > 940 ? Math.floor((m.tNumero * 940) / largura) : m.tNumero;
  c.font = `400 ${tam}px ${PLACAR}`;
  const medida = c.measureText(p.numero);
  const meia = (medida.actualBoundingBoxAscent + medida.actualBoundingBoxDescent) / 2;
  const base = cy + meia - medida.actualBoundingBoxDescent;
  // A cor 1 do time; se some no fundo (preto na noite, por exemplo), a cor 2; se as duas somem, a cor 1 com contorno.
  const fundo = luminanciaDaRegiao(c, cx - 300, cy - 150, 600, 300);
  const luzFundo = (fundo + 0.05) ** 2.2; // do perceptual para algo parecido com luminância relativa
  const contraste = (hex: string) => {
    const a = luminancia(hex) + 0.05;
    const b = luzFundo + 0.05;
    return Math.max(a, b) / Math.min(a, b);
  };
  const [c1, c2] = cores;
  const cor = contraste(c1) >= 2.2 || contraste(c1) >= contraste(c2) ? c1 : c2;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.globalAlpha = 0.45;
  c.fillStyle = cor;
  c.fillText(p.numero, cx, base);
  if (contraste(cor) < 2.2) {
    c.lineJoin = 'round';
    c.lineWidth = 8;
    c.globalAlpha = 0.55;
    c.strokeStyle = fundo < 0.5 ? '#ffffff' : '#111111';
    c.strokeText(p.numero, cx, base);
  }
  c.restore();
}

function faixaDoTopo(c: CanvasRenderingContext2D, p: PlanoDoPoster, m: Medidas, largura: number): void {
  c.fillStyle = 'rgba(8,9,12,0.9)';
  c.fillRect(0, 0, largura, m.faixa);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillStyle = AMARELO;
  c.font = `700 ${m.tGuerra}px ${ROTULO}`;
  c.fillText('GUERRA DE TORCIDAS', largura / 2, m.faixa * 0.38, largura - 80);
  const linha = linhaUnica(c, p.faixa, (t) => `700 ${t}px ${ROTULO}`, largura - 80, m.tFaixa, Math.round(m.tFaixa * 0.62));
  c.fillStyle = '#ffffff';
  c.font = `700 ${linha.tam}px ${ROTULO}`;
  c.fillText(linha.texto, largura / 2, m.faixa * 0.84, largura - 80);
}

function placa(c: CanvasRenderingContext2D, d: DadosDoCard, plano: PlanoDoCard, p: PlanoDoPoster, m: Medidas, trofeu: ImagemDoTrofeu | null): void {
  const { x, y, l, a, raio, pad } = m.placa;
  const cores = d.time.cores;
  c.fillStyle = TINTA;
  c.beginPath();
  c.roundRect(x, y, l, a, raio);
  c.fill();
  // Borda na cor do time que mais aparece no escuro.
  const clara = luminancia(cores[0]) >= luminancia(cores[1]) ? cores[0] : cores[1];
  c.strokeStyle = luminancia(clara) > 0.18 ? clara : AMARELO;
  c.lineWidth = m.placa.a > 180 ? 6 : 4;
  c.beginPath();
  c.roundRect(x, y, l, a, raio);
  c.stroke();

  const dentro = l - pad * 2;
  const direita = x + l - pad;
  const meio = y + a / 2;

  // Bloco da direita: pontos grandes, "pro Time" embaixo e, se houver, a medalha à esquerda dos pontos.
  // No card do troféu, o troféu desenhado ocupa o lugar da medalha e o nome dele, o dos pontos.
  // No card do fim de temporada, o emblema do destino (seta) ocupa o lugar do troféu e o destino em Anton, o dos pontos.
  const alturaTrofeu = a * 0.66;
  const larguraTrofeu = trofeu ? (trofeu.l * alturaTrofeu) / trofeu.a : p.selo ? alturaTrofeu : 0;
  const titulo = !!trofeu || !!p.selo;
  const reservaMedalha = titulo ? larguraTrofeu + 24 : p.medalha ? m.raioMedalha * 2 + 28 : 0;
  const temEsquerda = !!(p.apelido || plano.nivel);
  const maxPontos = (temEsquerda ? dentro * 0.58 : dentro) - reservaMedalha;
  // O nome do troféu é longo ("CAMPEÃO DA TEMPORADA"): em até 2 linhas, menor que os pontos.
  let pontos: { texto: string; tam: number };
  let linhasP: string[];
  if (titulo) {
    const tam = Math.round(m.tPontos * (p.selo ? 0.42 : 0.48));
    c.font = `400 ${tam}px ${PLACAR}`;
    linhasP = quebrarTexto(c, p.pontos, maxPontos).slice(0, 2);
    pontos = { texto: linhasP.reduce((a, b) => (c.measureText(b).width > c.measureText(a).width ? b : a), ''), tam };
  } else {
    pontos = linhaUnica(c, p.pontos, (t) => `400 ${t}px ${PLACAR}`, maxPontos, m.tPontos, Math.round(m.tPontos * 0.5));
    linhasP = [pontos.texto];
  }
  c.font = `400 ${pontos.tam}px ${PLACAR}`;
  const largPontos = Math.min(c.measureText(pontos.texto).width, maxPontos);
  const larguraDireita = reservaMedalha + largPontos;
  // Sem apelido nem nível, o bloco dos pontos fica centrado na placa.
  const fimDireita = temEsquerda ? direita : x + l / 2 + larguraDireita / 2;
  const passoP = pontos.tam * 1.12;
  const altPontos = c.measureText(pontos.texto).actualBoundingBoxAscent + (linhasP.length - 1) * passoP;
  const temProTime = !!p.proTime;
  const altBloco = altPontos + (temProTime ? m.tProTime * 1.5 : 0);
  const topoBloco = meio - altBloco / 2;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.fillStyle = AMARELO;
  const ascP = c.measureText(pontos.texto).actualBoundingBoxAscent;
  linhasP.forEach((ln, i) => c.fillText(ln, fimDireita, topoBloco + ascP + i * passoP));
  if (p.proTime) {
    c.fillStyle = '#ffffff';
    if (titulo) {
      // "Time · Série A" encolhe até caber embaixo do nome e do troféu, em vez de espremer.
      const rotulo = linhaUnica(c, p.proTime, (t) => `700 ${t}px ${ROTULO}`, Math.max(largPontos, maxPontos * 0.8), m.tProTime, 18);
      c.font = `700 ${rotulo.tam}px ${ROTULO}`;
      c.fillText(rotulo.texto, fimDireita, topoBloco + altPontos + m.tProTime * 1.35);
    } else {
      c.font = `700 ${m.tProTime}px ${ROTULO}`;
      c.fillText(p.proTime, fimDireita, topoBloco + altPontos + m.tProTime * 1.35, Math.max(largPontos, 120));
    }
  }
  if (trofeu) {
    desenharImagemDoTrofeu(c, trofeu, fimDireita - largPontos - 24 - larguraTrofeu / 2, meio, larguraTrofeu, alturaTrofeu);
  } else if (p.selo) {
    desenharEmblema(c, p.selo, fimDireita - largPontos - 24 - larguraTrofeu / 2, meio, alturaTrofeu / 2);
  } else if (p.medalha) {
    const cx = fimDireita - largPontos - 28 - m.raioMedalha;
    desenharMedalha(c, p.medalha, cores, cx, y + a * 0.56, m.raioMedalha);
  }

  // Bloco da esquerda: apelido e, embaixo, o nível.
  if (!temEsquerda) return;
  const larguraEsq = fimDireita - larguraDireita - 26 - (x + pad);
  if (larguraEsq < 80) return;
  const esq = x + pad;
  const linhas: { texto: string; tam: number; fonte: (t: number) => string; cor: string }[] = [];
  if (p.apelido) {
    const ap = linhaUnica(c, p.apelido, (t) => `800 ${t}px ${FONTE}`, larguraEsq, m.tApelido, Math.round(m.tApelido * 0.6));
    linhas.push({ ...ap, fonte: (t) => `800 ${t}px ${FONTE}`, cor: '#ffffff' });
  }
  if (plano.nivel) {
    const nv = linhaUnica(c, plano.nivel, (t) => `700 ${t}px ${ROTULO}`, larguraEsq, m.tNivel, Math.round(m.tNivel * 0.7));
    linhas.push({ ...nv, fonte: (t) => `700 ${t}px ${ROTULO}`, cor: AMARELO });
  }
  const passo = (t: number) => t * 1.3;
  const alt = linhas.reduce((s, ln) => s + passo(ln.tam), 0);
  let yy = meio - alt / 2;
  c.textAlign = 'left';
  for (const ln of linhas) {
    c.font = ln.fonte(ln.tam);
    c.fillStyle = ln.cor;
    c.fillText(ln.texto, esq, yy + ln.tam * 1.02);
    yy += passo(ln.tam);
  }
}

function rodapeDoPoster(c: CanvasRenderingContext2D, plano: PlanoDoCard, m: Medidas, largura: number, altura: number): void {
  const linhas: { texto: string; tam: number; fonte: string; cor: string }[] = [];
  if (plano.link) linhas.push({ texto: plano.link, tam: m.tLink, fonte: `700 ${m.tLink}px ${ROTULO}`, cor: '#ffffff' });
  linhas.push({ texto: AVISO_PRE_TEMPORADA, tam: m.tAviso, fonte: `600 ${m.tAviso}px ${FONTE}`, cor: 'rgba(255,255,255,0.82)' });
  if (plano.avisoFixo) linhas.push({ texto: plano.avisoFixo, tam: m.tAviso, fonte: `700 ${m.tAviso}px ${FONTE}`, cor: 'rgba(255,255,255,0.82)' });
  let y = altura - m.margemBaixo;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  for (let i = linhas.length - 1; i >= 0; i--) {
    const ln = linhas[i];
    c.font = ln.fonte;
    c.fillStyle = ln.cor;
    c.fillText(ln.texto, largura / 2, y, largura - 70);
    y -= ln.tam * 1.32;
  }
}

/** Assíncrono porque o número da camisa e os pontos usam a Anton: espera ela carregar antes de desenhar. */
export async function desenharCardPoster(d: DadosDoCard, plano: PlanoDoCard): Promise<HTMLCanvasElement> {
  const p = plano.poster!;
  await prepararFonteDoNumero();
  const canvas = document.createElement('canvas');
  canvas.width = plano.largura;
  canvas.height = plano.altura;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  const trofeu = p.trofeu ? await imagemDoTrofeu(p.trofeu.tipo, d.time.cores, 200, { contorno: true, traco: '#f4f1e6' }) : null;
  const { largura, altura } = plano;
  const m = MEDIDAS[plano.formato];
  const cores = d.time.cores;
  const joelho = p.enquadramento === 'joelho';

  // 1. O fundo do vestiário, no card todo.
  desenharFundo(c, p.vestimenta.fundo, largura, altura, cores);

  // A escala do boneco: Stories, dos pés à ponta dos braços; Quadrado, do joelho à ponta dos braços.
  const visivel = joelho ? ALTURA_DA_FIGURA - ALTURA_DO_JOELHO : ALTURA_DA_FIGURA;
  const escala = Math.min((m.chao - m.topoUtil) / visivel, (largura * 0.96) / LARGURA_DA_FIGURA);
  const pes = joelho ? m.chao + ALTURA_DO_JOELHO * escala : m.chao;
  const centroDoTronco = pes - 66 * escala;

  // 2. O número grande atrás do tronco.
  numeroGigante(c, p, cores, m, largura / 2, centroDoTronco);

  // 3. O boneco, direto no canvas.
  c.save();
  c.translate(largura / 2, pes);
  c.scale(escala, escala);
  if (!joelho) {
    c.fillStyle = 'rgba(0,0,0,0.34)';
    c.beginPath();
    c.ellipse(0, 0, 24, 4, 0, 0, Math.PI * 2);
    c.fill();
  }
  desenharFiguraDoCard(c, p.vestimenta, cores);
  c.restore();

  // Escurece de leve o pé do card para o rodapé aparecer em qualquer fundo.
  const cima = m.placa.y + m.placa.a * 0.5;
  const sombra = c.createLinearGradient(0, cima, 0, altura);
  sombra.addColorStop(0, 'rgba(0,0,0,0)');
  sombra.addColorStop(1, 'rgba(0,0,0,0.62)');
  c.fillStyle = sombra;
  c.fillRect(0, cima, largura, altura - cima);

  // 4. A faixa escura do topo.
  faixaDoTopo(c, p, m, largura);

  // 5. A frase sobre as pernas, a placa e o rodapé.
  if (plano.frase) adesivo(c, d.time, plano.frase, m.yFrase, m.tFrase);
  placa(c, d, plano, p, m, trofeu);
  if (plano.novoRecorde) {
    c.save();
    const e = m.escalaSelo;
    // Na lateral do tronco, onde não cobre o rosto, a frase nem os pontos.
    if (joelho) c.translate(214, 520);
    else c.translate(232, 900);
    c.scale(e, e);
    seloRecorde(c, 0, 0);
    c.restore();
  }
  rodapeDoPoster(c, plano, m, largura, altura);
  return canvas;
}
