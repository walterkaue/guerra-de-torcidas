// Boneco montável (docs/jogo.md, seção 14.5): o avatar do jogador, vestido a partir de uma `Vestimenta`
// (src/jogo/vestiario.ts). Usa o boneco "Silhueta premium" de src/telas/bonecos.ts de frente e põe as
// peças por cima: número, colete, faixa, apito, testeira, munhequeira, braçadeira, chuteira, pose, fundo e moldura.
//
// Estilo de docs/bonecos.md: formas chapadas, sem contorno, rosto liso, nada que imite jogador real, nenhuma marca.
// Desenha uma vez num canvas fora da tela (tamanho × devicePixelRatio) e guarda num cache pequeno; depois
// é só drawImage. Nenhum filtro nem sombra com desfoque.

import { corDeTexto } from '../dados/times';
import type { Vestimenta } from '../jogo/vestiario';
import { desenharFundo, type CoresDoTime } from './bonecoFundos';
import {
  CORES_DE_CABELO,
  GEOMETRIA,
  INDICE,
  JUNTA,
  POSES_DE_FRENTE,
  TONS_DE_PELE,
  corDeGoleiro,
  criarBoneco,
  desenharBoneco as desenharFigura,
  diferencaDeCor,
  escalaDoOsso,
  formaDaCabeca,
  uniformeDeGoleiro,
  uniformeDeLinha,
  type Aparencia,
  type Boneco,
  type Camadas,
  type Pose,
  type Uniforme,
} from './bonecos';
import { qualidade } from './qualidade';

export type Recorte = 'busto' | 'corpo';

// ---------- cores (puras, testadas) ----------

const DOURADO = '#d4a017';
const DOURADO_CLARO = '#f6dd7d';
const BRONZE = '#b87333';
const BRONZE_CLARO = '#e0a26a';
const AMARELO_DE_CAPITAO = '#ffd23f';
const COLETES = ['#b8f135', '#ff8a1f'] as const;

/** Troca a chuteira do uniforme: dourada, ou a cor do time que mais se afasta do meião (senão some na perna). */
export function comChuteiraDe(base: Uniforme, chuteira: Vestimenta['chuteira'], [cor1, cor2]: CoresDoTime): Uniforme {
  if (chuteira === 'dourada') return { ...base, chuteira: DOURADO };
  if (chuteira === 'time') {
    const alvo = diferencaDeCor(cor1, base.meiao) >= diferencaDeCor(cor2, base.meiao) ? cor1 : cor2;
    return { ...base, chuteira: alvo };
  }
  return base;
}

/** Uniforme de quem veste: uni1 e uni2 pela mesma regra das partidas; goleiro num tom que contrasta com o time. */
export function uniformeDaVestimenta(v: Pick<Vestimenta, 'camisa' | 'chuteira'>, [cor1, cor2]: CoresDoTime): Uniforme {
  const base =
    v.camisa === 'goleiro' ? uniformeDeGoleiro(corDeGoleiro([cor1, cor2])) : v.camisa === 'uni2' ? uniformeDeLinha([cor2, cor1]) : uniformeDeLinha([cor1, cor2]);
  return comChuteiraDe(base, v.chuteira, [cor1, cor2]);
}

/** Colete de treino: lima ou laranja, a que mais se afasta da camisa. */
export function corDoColete(camisa: string): string {
  return diferencaDeCor(COLETES[0], camisa) >= diferencaDeCor(COLETES[1], camisa) ? COLETES[0] : COLETES[1];
}

/**
 * Testeira: cor 2 do time (cor 1 se a camisa for a da cor 2), desde que contraste com o cabelo e a pele;
 * senão a outra cor do time, branco, amarelo ou preto, a primeira que passar.
 */
export function corDaTesteira(cores: CoresDoTime, camisa: Vestimenta['camisa'], cabelo: string, pele: string): string {
  const [cor1, cor2] = cores;
  const preferida = camisa === 'uni2' ? cor1 : cor2;
  const outra = preferida === cor1 ? cor2 : cor1;
  const folga = (c: string) => Math.min(diferencaDeCor(c, cabelo), diferencaDeCor(c, pele));
  const candidatas = [preferida, outra, '#ffffff', AMARELO_DE_CAPITAO, '#111111'];
  return candidatas.find((c) => folga(c) >= 90) ?? candidatas.reduce((a, b) => (folga(b) > folga(a) ? b : a));
}

/** As duas cores da munhequeira: a do time que mais contrasta com a pele (principal) e a outra (filete), ou bronze. */
export interface Punho {
  principal: string;
  filete: string;
}

export function corDoPunho(tipo: Vestimenta['punho'], [a, z]: CoresDoTime, pele: string): Punho | null {
  if (tipo === 'nenhum') return null;
  if (tipo === 'munhequeira_bronze') return { principal: BRONZE, filete: BRONZE_CLARO };
  const longe = diferencaDeCor(a, pele) >= diferencaDeCor(z, pele);
  return longe ? { principal: a, filete: z } : { principal: z, filete: a };
}

/**
 * O que as camadas desenham em campo, já calculado (cores e peças). Quem calcula é bonecoEmCampo.ts, a partir da
 * vestimenta e da roupa da cena; o desenho é o mesmo do vestiário.
 */
export interface PecasDeCampo {
  /** Número na camisa (nas costas em campo, na frente no replay), ou null para camisa lisa. */
  numero: string | null;
  /** Cor do número (a `corDeTexto` da camisa que está em campo). */
  corDoNumero: string | null;
  /** Cor da testeira, ou null sem testeira. */
  testeira: string | null;
  punho: Punho | null;
  bracadeira: boolean;
  chuteiraDourada: boolean;
}

/** Quanto a tinta de uma cor pesa, de 0 a 1 (para escolher o cordão do apito). */
function escura(cor: string): boolean {
  const n = parseInt(cor.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 120;
}

/** O número só aparece na frente da camisa: o colete e a faixa cobrem, e sem número não há o que mostrar. */
export function numeroVisivel(v: Pick<Vestimenta, 'numero' | 'peito'>): string | null {
  return v.numero !== null && v.peito === 'nenhum' ? v.numero : null;
}

// ---------- cache (puro, testado) ----------

/** Cache pequeno: o mais antigo sai quando passa do máximo; ler renova. */
export class CachePequeno<T> {
  private mapa = new Map<string, T>();
  constructor(private maximo: number) {}
  get(chave: string): T | undefined {
    const v = this.mapa.get(chave);
    if (v !== undefined) {
      this.mapa.delete(chave);
      this.mapa.set(chave, v);
    }
    return v;
  }
  set(chave: string, valor: T): void {
    this.mapa.delete(chave);
    this.mapa.set(chave, valor);
    if (this.mapa.size > this.maximo) this.mapa.delete(this.mapa.keys().next().value as string);
  }
  get tamanho(): number {
    return this.mapa.size;
  }
}

export function chaveDoCache(v: Vestimenta, cores: CoresDoTime, recorte: Recorte, largura: number, altura: number, dpr: number, degrade: boolean): string {
  // O corpo inteiro não desenha moldura: a mesma imagem serve para qualquer moldura.
  const moldura = recorte === 'busto' ? v.moldura : '-';
  return [
    v.corpo, v.pele, v.cabelo, v.corCabelo, v.camisa, v.numero ?? '-', v.cabeca, v.punho, v.braco, v.peito, v.pescoco, v.chuteira, v.pose, v.fundo, moldura,
    cores[0], cores[1], recorte, largura, altura, dpr, degrade ? 'd' : 'c',
  ].join('|');
}

const cache = new CachePequeno<HTMLCanvasElement>(24);

// ---------- fonte do número ----------

const FONTE = '400 20px Anton, Impact, sans-serif';
let carregandoFonte: Promise<void> | null = null;

export const fonteDoNumeroPronta = (): boolean => typeof document !== 'undefined' && !!document.fonts && document.fonts.check('400 20px Anton');

/** Baixa a Anton (a fonte dos números do jogo). Quem desenha o boneco com número chama e redesenha depois. */
export function prepararFonteDoNumero(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  carregandoFonte ??= document.fonts.load('400 20px Anton').then(
    () => undefined,
    () => undefined,
  );
  return carregandoFonte;
}

// ---------- o boneco vestido ----------

export const aparenciaDe = (v: Vestimenta): Aparencia => ({
  pele: TONS_DE_PELE[v.pele] ?? TONS_DE_PELE[0],
  cabelo: v.cabelo,
  corCabelo: CORES_DE_CABELO[v.corCabelo] ?? CORES_DE_CABELO[0],
  mulher: v.corpo === 'm',
});

function noTronco(c: CanvasRenderingContext2D, b: Boneco, p: Pose, escalado: boolean, fn: (comprimento: number) => void): void {
  const tl = GEOMETRIA.TRONCO * p[INDICE.TRK];
  c.save();
  c.translate(b.j[JUNTA.PELVE], b.j[JUNTA.PELVE + 1]);
  c.rotate(p[INDICE.TR]);
  if (escalado) c.scale(p[INDICE.OMK], tl);
  fn(tl);
  c.restore();
}

function desenharColete(c: CanvasRenderingContext2D, b: Boneco, p: Pose): void {
  // As medidas da camisa (por fora ou por dentro) vêm do boneco: um lugar só, em bonecos.ts.
  const { om, cintura, cinturaY, controle, axila, bainha } = b.medidas;
  noTronco(c, b, p, true, () => {
    const colete = new Path2D();
    // Cava larga: a camisa aparece nos ombros e nas mangas. Gola em V.
    colete.moveTo(-7.0, -0.985);
    colete.lineTo(-3.9, -1.0);
    colete.quadraticCurveTo(-3.2, -0.82, 0, -0.74);
    colete.quadraticCurveTo(3.2, -0.82, 3.9, -1.0);
    colete.lineTo(7.0, -0.985);
    colete.quadraticCurveTo(om - 4.2, -0.86, axila, -0.665);
    colete.quadraticCurveTo(controle, -0.45, cintura, cinturaY);
    colete.lineTo(bainha[4], bainha[5]);
    colete.lineTo(bainha[2], bainha[3]);
    colete.lineTo(bainha[0], bainha[1]);
    colete.lineTo(-cintura, cinturaY);
    colete.quadraticCurveTo(-controle, -0.45, -axila, -0.665);
    colete.quadraticCurveTo(-(om - 4.2), -0.86, -7.0, -0.985);
    colete.closePath();
    const cor = corDoColete(b.uniforme.camisa);
    c.fillStyle = cor;
    c.fill(colete);
    // O lado na sombra, como o da camiseta.
    c.save();
    c.clip(colete);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fill(b.sombraCamisa);
    c.restore();
  });
}

function desenharFaixa(c: CanvasRenderingContext2D, b: Boneco, p: Pose): void {
  noTronco(c, b, p, true, () => {
    c.save();
    c.clip(b.camisa);
    // Do ombro esquerdo da tela ao quadril direito: branca, com um filete dourado em cada borda.
    const faixa = (e0: number, e1: number): Path2D => {
      const f = new Path2D();
      f.moveTo(-6.4 + e0, -1.06);
      f.lineTo(-6.4 + e1, -1.06);
      f.lineTo(8.6 + e1, 0.12);
      f.lineTo(8.6 + e0, 0.12);
      f.closePath();
      return f;
    };
    c.fillStyle = '#f6f4ee';
    c.fill(faixa(-3.4, 3.4));
    c.fillStyle = DOURADO;
    c.fill(faixa(-3.4, -2.5));
    c.fill(faixa(2.5, 3.4));
    c.restore();
  });
}

function desenharApito(c: CanvasRenderingContext2D, b: Boneco, p: Pose): void {
  noTronco(c, b, p, false, (tl) => {
    c.fillStyle = escura(b.uniforme.camisa) ? '#e9e9e4' : '#16181d';
    c.beginPath();
    c.moveTo(-3.4, -tl);
    c.lineTo(0, -tl + 9.4);
    c.lineTo(3.4, -tl);
    c.lineTo(2.3, -tl);
    c.lineTo(0, -tl + 7.0);
    c.lineTo(-2.3, -tl);
    c.closePath();
    c.fill();
    const y = -tl + 10.4;
    c.fillStyle = '#b4bac5';
    c.fillRect(1.6, y - 0.9, 3.6, 1.8);
    c.fillStyle = '#d3d8e0';
    c.beginPath();
    c.arc(0, y, 2.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#8f97a4';
    c.beginPath();
    c.arc(0, y, 2.6, 0, Math.PI);
    c.fill();
    c.fillStyle = '#5d6471';
    c.beginPath();
    c.arc(-0.2, y - 0.2, 0.75, 0, Math.PI * 2);
    c.fill();
  });
}

/** Número na frente da camisa, na Anton, na cor de texto da camisa. */
function desenharNumero(c: CanvasRenderingContext2D, b: Boneco, p: Pose, numero: string, abaixoDoApito: boolean): void {
  noTronco(c, b, p, false, (tl) => {
    c.translate(0, -tl * (abaixoDoApito ? POSICAO_DO_NUMERO_COM_APITO : POSICAO_DO_NUMERO));
    escreverNumero(c, numero, corDeTexto(b.uniforme.camisa));
  });
}

/** Altura do número em unidades do boneco, largura máxima e posição (fração do tronco, de baixo para cima). */
const ALTURA_DO_NUMERO = 10.6;
const LARGURA_MAXIMA_DO_NUMERO = 15;
const POSICAO_DO_NUMERO = 0.485;
const POSICAO_DO_NUMERO_COM_APITO = 0.4;

/** O número centrado na origem (altura `ALTURA_DO_NUMERO`, largura limitada), na Anton, na cor dada. */
function escreverNumero(c: CanvasRenderingContext2D, numero: string, cor: string): void {
  c.font = FONTE;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const m = c.measureText(numero);
  const alto = m.actualBoundingBoxAscent || 14;
  const k = ALTURA_DO_NUMERO / alto;
  const larg = m.width * k;
  c.fillStyle = cor;
  c.save();
  c.translate(0, ALTURA_DO_NUMERO / 2);
  c.scale(larg > LARGURA_MAXIMA_DO_NUMERO ? (k * LARGURA_MAXIMA_DO_NUMERO) / larg : k, k);
  c.fillText(numero, 0, 0);
  c.restore();
}

// ---------- o número em campo: uma imagem só, desenhada uma vez ----------

/** O número já pronto para o campo. `img` fica null até a Anton carregar (aí o número aparece, sem travar o apito). */
export interface SpriteDoNumero {
  img: HTMLCanvasElement | null;
}

const LARGURA_DO_SPRITE = LARGURA_MAXIMA_DO_NUMERO + 1;
const ALTURA_DO_SPRITE = ALTURA_DO_NUMERO + 1;
/** Pixels por unidade do boneco no sprite (× devicePixelRatio): sobra para um boneco de ~150 px de altura. */
const PIXELS_POR_UNIDADE = 5;

/** Desenha o número num canvas fora da tela (Anton, tamanho × devicePixelRatio). Sem a fonte, espera e desenha depois. */
export function criarSpriteDoNumero(numero: string, cor: string): SpriteDoNumero {
  const sprite: SpriteDoNumero = { img: null };
  const desenhar = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, qualidade().dprMax);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(LARGURA_DO_SPRITE * PIXELS_POR_UNIDADE * dpr);
    canvas.height = Math.ceil(ALTURA_DO_SPRITE * PIXELS_POR_UNIDADE * dpr);
    const c = canvas.getContext('2d');
    if (!c) return;
    c.scale(canvas.width / LARGURA_DO_SPRITE, canvas.height / ALTURA_DO_SPRITE);
    c.translate(LARGURA_DO_SPRITE / 2, ALTURA_DO_SPRITE / 2);
    escreverNumero(c, numero, cor);
    sprite.img = canvas;
  };
  if (fonteDoNumeroPronta()) desenhar();
  else void prepararFonteDoNumero().then(desenhar);
  return sprite;
}

/** O sprite na transformação do tronco (gira com ele). Sem closure nem objeto novo: roda a cada quadro. */
function desenharSpriteDoNumero(c: CanvasRenderingContext2D, b: Boneco, p: Pose, sprite: SpriteDoNumero, espelhado: boolean): void {
  const img = sprite.img;
  if (!img) return;
  c.save();
  c.translate(b.j[JUNTA.PELVE], b.j[JUNTA.PELVE + 1]);
  c.rotate(p[INDICE.TR]);
  c.translate(0, -GEOMETRIA.TRONCO * p[INDICE.TRK] * POSICAO_DO_NUMERO);
  // A câmera do replay espelha o boneco: desvira o número para ele continuar legível.
  if (espelhado) c.scale(-1, 1);
  c.drawImage(img, -LARGURA_DO_SPRITE / 2, -ALTURA_DO_SPRITE / 2, LARGURA_DO_SPRITE, ALTURA_DO_SPRITE);
  c.restore();
}

function desenharTesteira(c: CanvasRenderingContext2D, b: Boneco, p: Pose, cor: string): void {
  c.save();
  c.translate(b.j[JUNTA.CABECA], b.j[JUNTA.CABECA + 1]);
  c.rotate(p[INDICE.CB]);
  c.clip(formaDaCabeca());
  c.fillStyle = cor;
  c.beginPath();
  c.moveTo(-7, -4.2);
  c.quadraticCurveTo(0, -3.2, 7, -4.2);
  c.lineTo(7, -1.9);
  c.quadraticCurveTo(0, -0.9, -7, -1.9);
  c.closePath();
  c.fill();
  c.restore();
}

/**
 * Munhequeira, braçadeira e brilho da chuteira dourada: tudo no sistema de coordenadas do osso.
 * `ladoDaBracadeira`: 0 = osso da esquerda da tela, 1 = o da direita, -1 = sem braçadeira.
 */
function desenharPecasDosMembros(c: CanvasRenderingContext2D, b: Boneco, p: Pose, punho: Punho | null, ladoDaBracadeira: number, dourada: boolean): void {
  for (let lado = 0; lado < 2; lado++) {
    const o = lado * 2;
    const ib = lado ? INDICE.BD : INDICE.BE;
    if (punho) {
      c.save();
      c.translate(b.j[JUNTA.COTOVELO + o], b.j[JUNTA.COTOVELO + o + 1]);
      c.rotate(-p[ib + 2]);
      c.scale(1, escalaDoOsso(GEOMETRIA.ANTEBRACO * p[ib + 3], 0.05));
      c.fillStyle = punho.principal;
      c.beginPath();
      c.moveTo(-2.5, 0.66);
      c.lineTo(2.5, 0.66);
      c.lineTo(1.9, 0.97);
      c.lineTo(-1.9, 0.97);
      c.closePath();
      c.fill();
      c.fillStyle = punho.filete;
      c.fillRect(-2.4, 0.66, 4.8, 0.07);
      c.restore();
    }
    // Braçadeira de capitão no braço esquerdo do boneco: o da direita da tela de frente, o da esquerda de costas.
    if (lado === ladoDaBracadeira) {
      c.save();
      c.translate(b.j[JUNTA.OMBRO + o], b.j[JUNTA.OMBRO + o + 1]);
      c.rotate(-p[ib]);
      c.scale(1, escalaDoOsso(GEOMETRIA.BRACO * p[ib + 1], 0.05));
      c.fillStyle = AMARELO_DE_CAPITAO;
      c.beginPath();
      c.moveTo(-4.0, 0.5);
      c.lineTo(3.7, 0.5);
      c.lineTo(3.35, 0.8);
      c.lineTo(-3.55, 0.8);
      c.closePath();
      c.fill();
      c.fillStyle = '#e3a900';
      c.fillRect(-3.55, 0.76, 6.9, 0.045);
      c.restore();
    }
    if (dourada) {
      const ip = lado ? INDICE.PND : INDICE.PNE;
      c.save();
      c.translate(b.j[JUNTA.TORNOZELO + o], b.j[JUNTA.TORNOZELO + o + 1]);
      c.rotate(-p[ip + 4]);
      c.scale(1, escalaDoOsso(GEOMETRIA.PE * p[ip + 5], 0.12));
      c.fillStyle = DOURADO_CLARO;
      c.beginPath();
      c.moveTo(-1.9, 0.12);
      c.lineTo(-0.5, 0.12);
      c.lineTo(-0.7, 0.72);
      c.lineTo(-1.8, 0.62);
      c.closePath();
      c.fill();
      c.restore();
    }
  }
}

/**
 * As camadas do boneco em campo: número (sprite), testeira, munhequeira, braçadeira e brilho da chuteira dourada.
 * Colete, faixa e apito não entram. As cores já vêm calculadas em `pecas`; as funções de desenho são as do vestiário.
 * `ladoDaBracadeira`: 0 = osso da esquerda da tela (de costas, ou de frente na câmera do replay, que espelha),
 * 1 = o da direita (de frente sem espelho). `espelhado`: o número se desvira para ficar legível.
 */
export function camadasDeCampo(pecas: PecasDeCampo, sprite: SpriteDoNumero | null, ladoDaBracadeira: 0 | 1, espelhado: boolean): Camadas {
  const camadas: Camadas = {};
  if (sprite) camadas.tronco = (c, b, p) => desenharSpriteDoNumero(c, b, p, sprite, espelhado);
  const testeira = pecas.testeira;
  if (testeira) camadas.cabeca = (c, b, p) => desenharTesteira(c, b, p, testeira);
  if (pecas.punho || pecas.bracadeira || pecas.chuteiraDourada) {
    const { punho, chuteiraDourada } = pecas;
    const lado = pecas.bracadeira ? ladoDaBracadeira : -1;
    camadas.fim = (c, b, p) => desenharPecasDosMembros(c, b, p, punho, lado, chuteiraDourada);
  }
  return camadas;
}

function camadasDe(v: Vestimenta, cores: CoresDoTime): Camadas {
  const numero = numeroVisivel(v);
  const camadas: Camadas = {};
  if (numero !== null || v.peito !== 'nenhum' || v.pescoco === 'apito') {
    camadas.tronco = (c, b, p) => {
      if (numero !== null) desenharNumero(c, b, p, numero, v.pescoco === 'apito');
      if (v.peito === 'colete') desenharColete(c, b, p);
      else if (v.peito === 'faixa') desenharFaixa(c, b, p);
      if (v.pescoco === 'apito') desenharApito(c, b, p);
    };
  }
  if (v.cabeca === 'testeira') {
    camadas.cabeca = (c, b, p) => desenharTesteira(c, b, p, corDaTesteira(cores, v.camisa, b.cor.cabelo, b.aparencia.pele));
  }
  if (v.punho !== 'nenhum' || v.braco !== 'nenhum' || v.chuteira === 'dourada') {
    camadas.fim = (c, b, p) => desenharPecasDosMembros(c, b, p, corDoPunho(v.punho, cores, b.aparencia.pele), v.braco === 'bracadeira' ? 1 : -1, v.chuteira === 'dourada');
  }
  return camadas;
}

/** O boneco vestido, de frente, com os pés na origem (unidades do boneco: ~98 de altura). O busto usa a pose reta. */
function desenharFiguraVestida(c: CanvasRenderingContext2D, v: Vestimenta, cores: CoresDoTime, recorte: Recorte = 'corpo'): void {
  const boneco = criarBoneco(aparenciaDe(v), uniformeDaVestimenta(v, cores), true);
  const pose =
    recorte === 'busto' ? (v.pose === 'bracos' ? POSES_DE_FRENTE.bustoBracos : POSES_DE_FRENTE.busto) : v.pose === 'bracos' ? POSES_DE_FRENTE.bracos : POSES_DE_FRENTE.parado;
  desenharFigura(c, boneco, pose, false, camadasDe(v, cores));
}

// ---------- recortes ----------

/** Lado (em unidades do boneco) da janela do busto: cabeça, ombros e o peito com o número. */
const JANELA_DO_BUSTO = 52;
/** Altura do centro da janela do busto (o topo da cabeça fica em ≈ -98). */
const CENTRO_DO_BUSTO = -80.5;
const ALTURA_DO_CORPO = 114;

function moldura(c: CanvasRenderingContext2D, v: Vestimenta, cx: number, cy: number, raioFora: number, espessura: number): void {
  if (v.moldura === 'nenhuma') return;
  const meio = raioFora - espessura / 2;
  c.lineWidth = espessura;
  c.strokeStyle = v.moldura === 'dourada' ? DOURADO : '#2b3042';
  c.beginPath();
  c.arc(cx, cy, meio, 0, Math.PI * 2);
  c.stroke();
  // Filete claro por dentro (dourada) ou fio dourado (galeria).
  c.lineWidth = Math.max(1, espessura * 0.2);
  c.strokeStyle = v.moldura === 'dourada' ? DOURADO_CLARO : DOURADO;
  c.beginPath();
  c.arc(cx, cy, raioFora - espessura + c.lineWidth / 2, 0, Math.PI * 2);
  c.stroke();
  if (v.moldura === 'galeria') {
    // Cinco bolinhas, uma por ouro.
    c.fillStyle = DOURADO_CLARO;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      c.beginPath();
      c.arc(cx + Math.cos(a) * meio, cy + Math.sin(a) * meio, Math.max(1, espessura * 0.27), 0, Math.PI * 2);
      c.fill();
    }
  }
}

function renderizar(v: Vestimenta, cores: CoresDoTime, recorte: Recorte, largura: number, altura: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(largura * dpr));
  canvas.height = Math.max(1, Math.round(altura * dpr));
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);
  if (recorte === 'busto') {
    const lado = Math.min(largura, altura);
    const cx = largura / 2;
    const cy = altura / 2;
    const espessura = v.moldura === 'nenhuma' ? 0 : Math.max(2, lado * 0.085);
    const r = lado / 2 - espessura;
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();
    c.translate(cx - r, cy - r);
    desenharFundo(c, v.fundo, r * 2, r * 2, cores);
    c.translate(r, r);
    const escala = (r * 2) / JANELA_DO_BUSTO;
    c.scale(escala, escala);
    c.translate(0, -CENTRO_DO_BUSTO);
    desenharFiguraVestida(c, v, cores, 'busto');
    c.restore();
    moldura(c, v, cx, cy, lado / 2, espessura);
  } else {
    desenharFundo(c, v.fundo, largura, altura, cores);
    const escala = Math.min((altura * 0.92) / ALTURA_DO_CORPO, (largura * 0.96) / 66);
    c.translate(largura / 2, altura * 0.95);
    c.scale(escala, escala);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(0, 0, 18, 3.4, 0, 0, Math.PI * 2);
    c.fill();
    desenharFiguraVestida(c, v, cores);
  }
  return canvas;
}

/**
 * Desenha o boneco vestido no retângulo (0, 0, largura, altura) da transformação atual.
 * 'busto': círculo com cabeça e ombros, o fundo recortado nele e a moldura por fora.
 * 'corpo': corpo inteiro com o fundo atrás, ocupando o retângulo (a moldura não entra).
 * Com número na camisa, a fonte precisa estar carregada para a imagem ir ao cache (prepararFonteDoNumero).
 */
export function desenharBoneco(ctx: CanvasRenderingContext2D, vestimenta: Vestimenta, coresDoTime: readonly [string, string], recorte: Recorte, largura: number, altura: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const chave = chaveDoCache(vestimenta, coresDoTime, recorte, largura, altura, dpr, qualidade().degrade);
  let imagem = cache.get(chave);
  if (!imagem) {
    const precisaDaFonte = numeroVisivel(vestimenta) !== null;
    if (precisaDaFonte && !fonteDoNumeroPronta()) void prepararFonteDoNumero();
    imagem = renderizar(vestimenta, coresDoTime, recorte, largura, altura, dpr);
    // Sem a Anton, o número saiu na fonte de reserva: serve para agora, mas não vai para o cache.
    if (!precisaDaFonte || fonteDoNumeroPronta()) cache.set(chave, imagem);
  }
  ctx.drawImage(imagem, 0, 0, largura, altura);
}

// ---------- a figura no card (Pôster) ----------

/** Altura da figura inteira, em unidades do boneco, com os braços pra cima (pés na origem, cabeça para cima em -y). */
export const ALTURA_DA_FIGURA = ALTURA_DO_CORPO;
/** Altura do joelho em unidades do boneco, para o enquadramento "do joelho pra cima" do Quadrado. */
export const ALTURA_DO_JOELHO = -(GEOMETRIA.ALTURA_PELVE + GEOMETRIA.COXA);
/** Largura da figura em unidades do boneco (com os braços abertos na pose "braços pra cima"). */
export const LARGURA_DA_FIGURA = 66;

/**
 * A figura vestida, sem fundo nem moldura, com os pés na origem da transformação atual (1 unidade do boneco = 1 unidade
 * da transformação: quem chama faz `translate` e `scale`). Direto no contexto, sem devicePixelRatio e sem cache: serve
 * para o canvas de 1080 do Pôster. Com número na camisa, a Anton precisa estar carregada (prepararFonteDoNumero).
 */
export function desenharFiguraDoCard(ctx: CanvasRenderingContext2D, vestimenta: Vestimenta, coresDoTime: readonly [string, string]): void {
  desenharFiguraVestida(ctx, vestimenta, coresDoTime);
}
