// Card "Telão do estádio" 1080×1920 (9:16, proporção dos stories do Instagram), gerado no próprio celular
// (docs/visual.md, seção 3): arquibancada do clube, telão pendurado com o resultado, pontos, adesivo do
// narrador, gramado e rodapé. Cada jogo só desenha o que vai dentro do telão; minigame novo faz o mesmo.

import type { Time } from '../dados/times';
import { horaBrasilia } from '../servidor/tempo';
import { desenharArquibancada } from '../telas/arquibancada';
import { qualidade } from '../telas/qualidade';
import { PAPEL, corDaBorda, linhaDoTorcedor } from './cardTextos';
import { luzDoHorario, type Luz } from './home';
import { AVISO_PRE_TEMPORADA } from './posicao';

const L = 1080;
const A = 1920;
// Mesmas fontes da interface (docs/visual.md); o sistema entra só se elas não carregarem.
export const FONTE = 'Barlow, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const PLACAR = 'Anton, Impact, "Arial Narrow", sans-serif';
export const ROTULO = '"Barlow Condensed", "Arial Narrow", sans-serif';
export const AMARELO = '#e9c75a';
export const APAGADO = '#2b3238';

/** A arquibancada é desenhada em escala 3: torcedor grande o bastante para virar textura na miniatura. */
const ESCALA = 3;
const ALT_ARQUIBANCADA = 864;
const CEU = 216;
const FIM_DO_MEIO = 1500;
const RODAPE = 1590;
const TELAO = { x: 90, y: 430, l: 900, a: 510, borda: 24 };
const FAIXAS_DO_GRAMADO = 6;
/** Na qualidade Leve, o desenho espera a contagem dos pontos da tela de resultado terminar. */
const ESPERA_NA_LEVE_MS = 900;

export interface Caixa {
  x: number;
  y: number;
  l: number;
  a: number;
}

/** O que todo card tem. O conteúdo do telão vem à parte, de cada jogo. */
export interface ModeloCard {
  time: Time;
  /** O jogo na linha do topo: "GUERRA DE TORCIDAS · BATE CONTRA MIM". */
  jogo: string;
  /** "+55" em Anton amarelo; é o que sobra na miniatura do WhatsApp. */
  destaque: string;
  /** Embaixo do destaque: "Fulano pro Flamengo". */
  quem: string;
  frase: string;
  novoRecorde: boolean;
  link: string;
  /** Linha fixa no rodapé (o aviso do Crava). */
  avisoFixo?: string;
  /** Quanto o telão sobe sobre a torcida quando o conteúdo é uma lista longa. */
  telaoMaior?: number;
  /** Sem luz, a do horário de Brasília agora. */
  luz?: Luz;
}

/** O que o card de cada jogo recebe de quem chama. */
export interface DadosBase {
  time: Time;
  apelido?: string;
  /** "pro Flamengo" / "pra Chapecoense"; null para "Outro time". */
  paraTime: string | null;
  frase: string;
  novoRecorde: boolean;
  link: string;
  luz?: Luz;
}

/** Os campos comuns do modelo: pontos como destaque e a linha de quem fez. */
export function modeloDePontos(d: DadosBase, jogo: string, pontos: number): ModeloCard {
  return { ...d, jogo, destaque: `+${pontos}`, quem: linhaDoTorcedor(d.apelido, pontos, d.paraTime) };
}

export interface DadosCard extends DadosBase {
  /** Nome do jogo no topo; sem ele, os Pênaltis. */
  jogo?: string;
  golsJogador: number;
  golsMaquina: number;
  pontos: number;
}

export function quebrarTexto(c: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (c.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Selo amarelo "NOVO RECORDE!", levemente torto (adesivo de transmissão), centrado em (x, y). */
function seloRecorde(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(-0.14);
  c.font = `400 54px ${PLACAR}`;
  const largura = c.measureText('NOVO RECORDE!').width + 56;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.roundRect(-largura / 2 - 6, -46, largura + 12, 92, 18);
  c.fill();
  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.roundRect(-largura / 2, -40, largura, 80, 14);
  c.fill();
  c.fillStyle = '#111111';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('NOVO RECORDE!', 0, 3);
  c.restore();
}

/**
 * Nível da carreira no card, só quando a pessoa escolhe (docs/jogo.md, seção 5, "Longo prazo"): um selo
 * entre o gramado e o rodapé, acima do link. Desenha por cima de qualquer card pronto.
 */
export function seloNivel(canvas: HTMLCanvasElement, nivel: string): void {
  const c = canvas.getContext('2d')!;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  const texto = `CARREIRA · ${nivel.toUpperCase()}`;
  c.font = `700 42px ${ROTULO}`;
  const largura = c.measureText(texto).width + 64;
  c.fillStyle = '#04130a';
  c.beginPath();
  c.roundRect(L / 2 - largura / 2, RODAPE - 36, largura, 72, 36);
  c.fill();
  c.strokeStyle = AMARELO;
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = AMARELO;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, L / 2, RODAPE + 2);
  c.restore();
}

function fundo(c: CanvasRenderingContext2D, time: Time, luz: Luz): void {
  // Gramado de transmissão, com as faixas de corte em perspectiva, do pé da arquibancada ao rodapé.
  const alt = (RODAPE - ALT_ARQUIBANCADA) / FAIXAS_DO_GRAMADO;
  for (let i = 0; i < FAIXAS_DO_GRAMADO; i++) {
    c.fillStyle = i % 2 ? '#0e4625' : '#0b3d1f';
    c.fillRect(0, ALT_ARQUIBANCADA + i * alt, L, alt + 1);
  }
  // A faixa mais perto da câmera é mais viva, com a linha lateral branca.
  c.fillStyle = '#1b7a3b';
  c.fillRect(0, FIM_DO_MEIO, L, RODAPE - FIM_DO_MEIO);
  c.fillStyle = '#f5f5f0';
  c.fillRect(0, FIM_DO_MEIO, L, 8);
  c.fillStyle = '#062815';
  c.fillRect(0, RODAPE, L, A - RODAPE);

  c.save();
  c.scale(ESCALA, ESCALA);
  desenharArquibancada(c, { W: L / ESCALA, H: ALT_ARQUIBANCADA / ESCALA, topo: CEU / ESCALA, postes: [46, 314] }, 0, time.cores, luz);
  c.restore();

  // Placas lisas de beira de campo nas cores do time (sem marca, sem texto).
  const larg = L / 6;
  c.fillStyle = '#0a0a0a';
  c.fillRect(0, ALT_ARQUIBANCADA - 4, L, 58);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = time.cores[i % 2];
    c.fillRect(i * larg + 3, ALT_ARQUIBANCADA, larg - 6, 50);
  }
}

function linhaDoTopo(c: CanvasRenderingContext2D, jogo: string, luz: Luz): void {
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `700 42px ${ROTULO}`;
  c.fillStyle = luz === 'dia' ? '#0b2a18' : '#ffffff';
  c.fillText(`GUERRA DE TORCIDAS · ${jogo.toUpperCase()}`, L / 2, 124, L - 340);
}

/** Painel escuro de moldura grossa, pendurado por dois cabos na viga da cobertura. Devolve a área do conteúdo. */
function telao(c: CanvasRenderingContext2D, time: Time, maior: number): Caixa {
  const { x, l, borda } = TELAO;
  const y = TELAO.y - maior;
  const a = TELAO.a + maior;
  // Viga da cobertura.
  c.fillStyle = '#1b1f24';
  c.fillRect(0, CEU - 14, L, 30);
  c.fillStyle = '#59616b';
  c.fillRect(0, CEU - 14, L, 5);
  // Cabos.
  c.fillStyle = '#1b1f24';
  for (const cabo of [x + 150, x + l - 150]) {
    c.fillRect(cabo - 8, CEU, 16, y - CEU + 8);
    c.fillRect(cabo - 26, y - 16, 52, 24);
  }
  // Moldura.
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
  // Painel.
  c.fillStyle = '#070b10';
  c.beginPath();
  c.roundRect(x + borda, y + borda, l - borda * 2, a - borda * 2, 10);
  c.fill();
  // Nome do time no alto do telão.
  c.fillStyle = AMARELO;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `400 84px ${PLACAR}`;
  c.fillText(time.nome.toUpperCase(), L / 2, y + borda + 94, l - borda * 2 - 80);
  const yConteudo = y + borda + 118;
  return { x: x + borda + 30, y: yConteudo, l: l - (borda + 30) * 2, a: y + a - borda - 18 - yConteudo };
}

function pontos(c: CanvasRenderingContext2D, destaque: string, quem: string): void {
  const yBase = 1178;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `400 212px ${PLACAR}`;
  c.fillStyle = '#04130a';
  c.fillText(destaque, L / 2 + 7, yBase + 7, L - 120);
  c.fillStyle = AMARELO;
  c.fillText(destaque, L / 2, yBase, L - 120);
  c.font = `800 54px ${FONTE}`;
  c.fillStyle = '#ffffff';
  c.fillText(quem, L / 2, yBase + 80, L - 130);
}

/** Adesivo do narrador: papel, borda na cor do time e levemente torto, como na Home e no resultado. */
function adesivo(c: CanvasRenderingContext2D, time: Time, frase: string): void {
  if (!frase) return;
  c.save();
  c.font = `800 40px ${FONTE}`;
  const linhas = quebrarTexto(c, frase, L - 210).slice(0, 2);
  const largura = Math.max(...linhas.map((l) => c.measureText(l).width)) + 76;
  const altura = linhas.length * 50 + 40;
  c.translate(L / 2, 1395);
  c.rotate(-0.035);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.roundRect(-largura / 2, -altura / 2 + 8, largura, altura, 10);
  c.fill();
  c.fillStyle = PAPEL;
  c.strokeStyle = corDaBorda(time.cores);
  c.lineWidth = 9;
  c.beginPath();
  c.roundRect(-largura / 2, -altura / 2, largura, altura, 10);
  c.fill();
  c.stroke();
  c.fillStyle = '#17181a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  linhas.forEach((l, i) => c.fillText(l, 0, (i - (linhas.length - 1) / 2) * 50 + 2));
  c.restore();
}

function rodape(c: CanvasRenderingContext2D, link: string, avisoFixo?: string): void {
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#ffffff';
  c.font = `700 46px ${ROTULO}`;
  c.fillText(link.replace(/^https?:\/\//, ''), L / 2, 1696, L - 120);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.font = `600 28px ${FONTE}`;
  c.fillText(AVISO_PRE_TEMPORADA, L / 2, 1752, L - 120);
  if (avisoFixo) {
    c.font = `700 28px ${FONTE}`;
    c.fillText(avisoFixo, L / 2, 1800, L - 120);
  }
}

/** O card inteiro: fundo, telão com o conteúdo do jogo, pontos, adesivo e rodapé. */
export function desenharModelo(m: ModeloCard, conteudo: (c: CanvasRenderingContext2D, caixa: Caixa) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext('2d')!;
  const luz = m.luz ?? luzDoHorario(horaBrasilia());

  fundo(c, m.time, luz);
  linhaDoTopo(c, m.jogo, luz);
  const caixa = telao(c, m.time, m.telaoMaior ?? 0);
  c.save();
  conteudo(c, caixa);
  c.restore();
  // Por cima da quina do telão, sem encostar no nome do time.
  if (m.novoRecorde) seloRecorde(c, TELAO.x + TELAO.l - 110, TELAO.y - (m.telaoMaior ?? 0) - 26);
  pontos(c, m.destaque, m.quem);
  adesivo(c, m.time, m.frase);
  rodape(c, m.link, m.avisoFixo);
  return canvas;
}

/** O placar de um jogo que tem dois lados: Pênaltis e as sessões dos Lances. */
export function desenharCard(d: DadosCard): HTMLCanvasElement {
  return desenharModelo(modeloDePontos(d, d.jogo ?? 'Bate Contra Mim', d.pontos), (c, { x, y, l, a }) => {
    const meio = x + l / 2;
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff';
    c.font = `400 214px ${PLACAR}`;
    const nosso = String(d.golsJogador);
    const deles = String(d.golsMaquina);
    const placar = `${nosso} x ${deles}`;
    const total = c.measureText(placar).width;
    const inicio = meio - total / 2;
    // Cada rótulo fica embaixo do seu número.
    const noNosso = inicio + c.measureText(nosso).width / 2;
    const noDeles = inicio + total - c.measureText(deles).width / 2;
    c.textAlign = 'left';
    c.fillText(placar, inicio, y + a - 62);
    c.font = `700 42px ${ROTULO}`;
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText('VOCÊ', noNosso, y + a - 6);
    c.fillText('MÁQUINA', noDeles, y + a - 6);
  });
}

/** Espera as fontes do card e uma folga da tela: no celular simples, o resultado aparece antes do desenho. */
export async function prontoParaDesenhar(): Promise<void> {
  try {
    await Promise.all(['400 100px Anton', '700 40px Barlow', '700 40px "Barlow Condensed"'].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch {
    // segue com a fonte que tiver
  }
  if (qualidade().nivel === 'leve') await new Promise((ok) => setTimeout(ok, ESPERA_NA_LEVE_MS));
  await new Promise<void>((ok) => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => ok(), { timeout: 1000 });
    else setTimeout(ok, 60);
  });
}

let ultimaUrl = '';

/** Mostra o card pronto sem travar: o PNG sai pelo toBlob, fora do quadro da tela. */
export async function mostrarCard(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<void> {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (ultimaUrl) URL.revokeObjectURL(ultimaUrl);
  ultimaUrl = blob ? URL.createObjectURL(blob) : '';
  img.src = ultimaUrl || canvas.toDataURL('image/png');
}
