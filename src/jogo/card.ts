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

/** As alturas do cenário (do alto ao rodapé). O Quadrado do card personalizável usa um cenário mais baixo. */
export interface Geo {
  altura: number;
  ceu: number;
  altArq: number;
  fimMeio: number;
  rodape: number;
}
export const GEO_STORIES: Geo = { altura: A, ceu: CEU, altArq: ALT_ARQUIBANCADA, fimMeio: FIM_DO_MEIO, rodape: RODAPE };
/** O cenário mais baixo do Quadrado (1080 × 1080) dos cards personalizáveis. */
export const GEO_QUADRADO: Geo = { altura: 1080, ceu: 96, altArq: 524, fimMeio: 862, rodape: 884 };
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
export function seloRecorde(c: CanvasRenderingContext2D, x: number, y: number): void {
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

/** A pílula do nível da carreira, centrada em (L/2, cy). `texto` já vem completo ("CARREIRA · CRAQUE"). */
export function pilulaDoNivel(c: CanvasRenderingContext2D, texto: string, cy: number, tam = 42): void {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.font = `700 ${tam}px ${ROTULO}`;
  const largura = Math.min(c.measureText(texto).width + tam * 1.5, L - 60);
  const alt = tam * 1.7;
  c.fillStyle = '#04130a';
  c.beginPath();
  c.roundRect(L / 2 - largura / 2, cy - alt / 2, largura, alt, alt / 2);
  c.fill();
  c.strokeStyle = AMARELO;
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = AMARELO;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, L / 2, cy + tam * 0.05, largura - tam);
  c.restore();
}

/**
 * Nível da carreira no card, só quando a pessoa escolhe (docs/jogo.md, seção 5, "Longo prazo"): um selo
 * entre o gramado e o rodapé, acima do link. Desenha por cima de qualquer card pronto.
 */
export function seloNivel(canvas: HTMLCanvasElement, nivel: string): void {
  pilulaDoNivel(canvas.getContext('2d')!, `CARREIRA · ${nivel.toUpperCase()}`, RODAPE);
}

export function fundo(c: CanvasRenderingContext2D, time: Time, luz: Luz, g: Geo = GEO_STORIES): void {
  // Gramado de transmissão, com as faixas de corte em perspectiva, do pé da arquibancada ao rodapé.
  const alt = (g.rodape - g.altArq) / FAIXAS_DO_GRAMADO;
  for (let i = 0; i < FAIXAS_DO_GRAMADO; i++) {
    c.fillStyle = i % 2 ? '#0e4625' : '#0b3d1f';
    c.fillRect(0, g.altArq + i * alt, L, alt + 1);
  }
  // A faixa mais perto da câmera é mais viva, com a linha lateral branca.
  c.fillStyle = '#1b7a3b';
  c.fillRect(0, g.fimMeio, L, g.rodape - g.fimMeio);
  c.fillStyle = '#f5f5f0';
  c.fillRect(0, g.fimMeio, L, 8);
  c.fillStyle = '#062815';
  c.fillRect(0, g.rodape, L, g.altura - g.rodape);

  c.save();
  c.scale(ESCALA, ESCALA);
  desenharArquibancada(c, { W: L / ESCALA, H: g.altArq / ESCALA, topo: g.ceu / ESCALA, postes: [46, 314] }, 0, time.cores, luz);
  c.restore();

  // Placas lisas de beira de campo nas cores do time (sem marca, sem texto).
  const larg = L / 6;
  c.fillStyle = '#0a0a0a';
  c.fillRect(0, g.altArq - 4, L, 58);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = time.cores[i % 2];
    c.fillRect(i * larg + 3, g.altArq, larg - 6, 50);
  }
}

/** A linha do topo já pronta ("GUERRA DE TORCIDAS · LANCES DO JOGO"). */
export function textoDoTopo(c: CanvasRenderingContext2D, texto: string, luz: Luz, y = 124, tam = 42, largura = L - 340): void {
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `700 ${tam}px ${ROTULO}`;
  c.fillStyle = luz === 'dia' ? '#0b2a18' : '#ffffff';
  c.fillText(texto, L / 2, y, largura);
}

function linhaDoTopo(c: CanvasRenderingContext2D, jogo: string, luz: Luz): void {
  textoDoTopo(c, `GUERRA DE TORCIDAS · ${jogo.toUpperCase()}`, luz);
}

/** Viga da cobertura, de ponta a ponta, a `ceu` de altura. */
export function viga(c: CanvasRenderingContext2D, ceu = CEU): void {
  c.fillStyle = '#1b1f24';
  c.fillRect(0, ceu - 14, L, 30);
  c.fillStyle = '#59616b';
  c.fillRect(0, ceu - 14, L, 5);
}

/** Altura do telão com só o nome do time (placar desligado no card personalizável). */
const ALT_SO_NOME = 290;

/**
 * Painel escuro de moldura grossa, pendurado por dois cabos na viga da cobertura (que fica à parte, em `viga`).
 * Devolve a área do conteúdo. Com `soNome`, o telão é baixo e leva só o nome do time, grande.
 */
export function telao(c: CanvasRenderingContext2D, time: Time, maior: number, soNome = false): Caixa {
  const { x, l, borda } = TELAO;
  const a = soNome ? ALT_SO_NOME : TELAO.a + maior;
  const y = soNome ? TELAO.y + TELAO.a - ALT_SO_NOME : TELAO.y - maior;
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
  if (soNome) {
    c.font = `400 112px ${PLACAR}`;
    c.fillText(time.nome.toUpperCase(), L / 2, y + a / 2 + 40, l - borda * 2 - 80);
    return { x: x + borda + 30, y: y + a / 2, l: l - (borda + 30) * 2, a: 0 };
  }
  c.font = `400 84px ${PLACAR}`;
  c.fillText(time.nome.toUpperCase(), L / 2, y + borda + 94, l - borda * 2 - 80);
  const yConteudo = y + borda + 118;
  return { x: x + borda + 30, y: yConteudo, l: l - (borda + 30) * 2, a: y + a - borda - 18 - yConteudo };
}

/** O destaque grande (em amarelo, com sombra) e, embaixo, a linha de quem fez. */
export function blocoDoNumero(
  c: CanvasRenderingContext2D,
  destaque: string,
  quem: string | null,
  yBase = 1178,
  tam = 212,
  tamQuem = 54,
  /** O busto do boneco já pronto (canvas quadrado, no tamanho final): vai ao lado da linha de quem fez, o grupo centrado. */
  busto: HTMLCanvasElement | null = null,
): void {
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `400 ${tam}px ${PLACAR}`;
  c.fillStyle = '#04130a';
  c.fillText(destaque, L / 2 + tam / 30, yBase + tam / 30, L - 120);
  c.fillStyle = AMARELO;
  c.fillText(destaque, L / 2, yBase, L - 120);
  if (busto) return linhaComBusto(c, busto, quem, yBase + tam * 0.07, tamQuem);
  if (!quem) return;
  c.font = `800 ${tamQuem}px ${FONTE}`;
  c.fillStyle = '#ffffff';
  c.fillText(quem, L / 2, yBase + tamQuem * 1.5, L - 130);
}

/** Busto + linha de quem fez, lado a lado e centrados; sem a linha, o busto vai sozinho. `topo` é o alto do busto. */
function linhaComBusto(c: CanvasRenderingContext2D, busto: HTMLCanvasElement, quem: string | null, topo: number, tamQuem: number): void {
  const lado = busto.width;
  const folga = lado * 0.14;
  c.font = `800 ${tamQuem}px ${FONTE}`;
  const texto = quem ? Math.min(c.measureText(quem).width, L - 130 - lado - folga) : 0;
  const x0 = L / 2 - (lado + (quem ? folga + texto : 0)) / 2;
  c.drawImage(busto, x0, topo, lado, lado);
  if (!quem) return;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#ffffff';
  c.fillText(quem, x0 + lado + folga, topo + lado / 2 + tamQuem * 0.34, texto);
}

/** Adesivo do narrador: papel, borda na cor do time e levemente torto, como na Home e no resultado. Centro em (L/2, y). */
export function adesivo(c: CanvasRenderingContext2D, time: Time, frase: string, y = 1395, tam = 40): void {
  if (!frase) return;
  const passo = tam * 1.25;
  c.save();
  c.font = `800 ${tam}px ${FONTE}`;
  const linhas = quebrarTexto(c, frase, L - 210).slice(0, 2);
  const largura = Math.max(...linhas.map((l) => c.measureText(l).width)) + tam * 1.9;
  const altura = linhas.length * passo + tam;
  c.translate(L / 2, y);
  c.rotate(-0.035);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.roundRect(-largura / 2, -altura / 2 + 8, largura, altura, 10);
  c.fill();
  c.fillStyle = PAPEL;
  c.strokeStyle = corDaBorda(time.cores);
  c.lineWidth = tam * 0.22;
  c.beginPath();
  c.roundRect(-largura / 2, -altura / 2, largura, altura, 10);
  c.fill();
  c.stroke();
  c.fillStyle = '#17181a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  linhas.forEach((l, i) => c.fillText(l, 0, (i - (linhas.length - 1) / 2) * passo + 2));
  c.restore();
}

/** Link, aviso da pré-temporada e a linha fixa; o que não vier não ocupa lugar. `yLink` é a linha de base do primeiro. */
export function rodape(c: CanvasRenderingContext2D, link: string | null, avisoFixo: string | undefined | null, yLink = 1696, escala = 1): void {
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  let y = yLink;
  if (link) {
    c.fillStyle = '#ffffff';
    c.font = `700 ${46 * escala}px ${ROTULO}`;
    c.fillText(link.replace(/^https?:\/\//, ''), L / 2, y, L - 120);
    y += 56 * escala;
  }
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.font = `600 ${28 * escala}px ${FONTE}`;
  c.fillText(AVISO_PRE_TEMPORADA, L / 2, y, L - 120);
  if (avisoFixo) {
    c.font = `700 ${28 * escala}px ${FONTE}`;
    c.fillText(avisoFixo, L / 2, y + 48 * escala, L - 120);
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
  viga(c);
  const caixa = telao(c, m.time, m.telaoMaior ?? 0);
  c.save();
  conteudo(c, caixa);
  c.restore();
  // Por cima da quina do telão, sem encostar no nome do time.
  if (m.novoRecorde) seloRecorde(c, TELAO.x + TELAO.l - 110, TELAO.y - (m.telaoMaior ?? 0) - 26);
  blocoDoNumero(c, m.destaque, m.quem);
  adesivo(c, m.time, m.frase);
  rodape(c, m.link, m.avisoFixo);
  return canvas;
}

/** O placar de um jogo que tem dois lados: Pênaltis e as sessões dos Lances. */
/** O placar dentro do telão (Pênaltis e as sessões de dois lados). */
export function conteudoPenaltis(c: CanvasRenderingContext2D, { x, y, l, a }: Caixa, golsJogador: number, golsMaquina: number): void {
  const meio = x + l / 2;
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#ffffff';
  c.font = `400 214px ${PLACAR}`;
  const nosso = String(golsJogador);
  const deles = String(golsMaquina);
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
}

/** O placar de um jogo que tem dois lados: Pênaltis e as sessões dos Lances. */
export function desenharCard(d: DadosCard): HTMLCanvasElement {
  return desenharModelo(modeloDePontos(d, d.jogo ?? 'Bate Contra Mim', d.pontos), (c, caixa) => conteudoPenaltis(c, caixa, d.golsJogador, d.golsMaquina));
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

/** Onde fica o alto do telão (a quina para o selo de recorde), no tamanho do Stories. */
export function topoDoTelao(maior: number, soNome = false): number {
  return soNome ? TELAO.y + TELAO.a - ALT_SO_NOME : TELAO.y - maior;
}
export const TELAO_X = TELAO.x;
export const TELAO_L = TELAO.l;
