// Motor puro dos Lances do Jogo (docs/jogo.md, seção 7.3): falta com barreira e cara a cara.
// Mesmas regras do penaltis.ts: sem DOM, relógio, Math.random nem trigonometria. Math.sqrt pode,
// porque o IEEE 754 exige o mesmo resultado em qualquer motor JavaScript.
// O gesto é o mesmo da cobrança de pênalti e o ponto final na linha do gol sai da mesma conta
// (`trajetoria`). O que muda é o caminho: de onde a bola sai, a barreira e o goleiro.

import { criarAleatorio, misturar } from './aleatorio.ts';
import { type GestoCobranca, normalizarCobranca, trajetoria, ZONAS, zonaDoPonto } from './penaltis.ts';

export type TipoLance = 'falta' | 'finalizacao';
export type Faixa = 'facil' | 'media' | 'dificil' | 'craque';
export const FAIXAS: readonly Faixa[] = ['facil', 'media', 'dificil', 'craque'];

/**
 * A física de um lance. Medidas em metros, com a origem no meio da linha do gol:
 * x positivo é a direita de quem bate (o mesmo lado de `dir` positivo), z é a distância até a linha do gol.
 */
export interface CenaLance {
  tipo: TipoLance;
  bola: { x: number; z: number };
  /** Só na falta. A barreira fica a 9,15 m da bola, tapando a linha entre a bola e `miraX` (na linha do gol). */
  barreira?: { jogadores: number; miraX: number };
  /** Quantos metros o goleiro está adiantado, na linha entre a bola e o meio do gol (cara a cara). */
  goleiroSaida?: number;
  /** Onde o goleiro começa, de -1 a 1 entre as traves. Sem isso: lado aberto na falta, de frente para a bola no cara a cara. */
  goleiroX?: number;
  /** Zona (0 a 5, como nos pênaltis) onde a bola entrou no lance de verdade. Gol nela = "Recriou o lance". */
  zonaHistorica: number;
  faixa: Faixa;
}

export type DesfechoLance = 'gol' | 'defesa' | 'barreira' | 'fora' | 'trave';

export interface ResultadoLance {
  desfecho: DesfechoLance;
  /** Ponto final na linha do gol, nas mesmas unidades dos pênaltis: x de -1 a 1, y de 0 (chão) a 1 (travessão). */
  x: number;
  y: number;
  zonaBola: number;
  cavadinha: boolean;
  angulo: boolean;
  raspouTrave: boolean;
  /** Gol na zona onde o gol de verdade entrou. */
  recriou: boolean;
  /** Onde o goleiro ficou para o chute (x de -1 a 1, já com a leitura). Só para o desenho. */
  goleiroX: number;
  /** Até onde a bola anda no caminho (0 a 1): 1 chega na linha do gol; menos, parou na barreira ou no goleiro. */
  tFim: number;
  pontos: number;
}

/** Um lance do catálogo (src/dados/lances.ts, gerado de dados/lances/*.csv). */
export interface Lance extends CenaLance {
  id: string;
  /** Id do time (src/dados/times.ts) ou "selecao". */
  clube: string;
  titulo: string;
  ficha: string;
  competicao: string;
  /** AAAA-MM-DD */
  data: string;
  adversario: string;
  /** Cara a cara: como a bola chegou ("A jogada"), sem nomes, e de onde ela vem. */
  chegada?: string;
  chegadaDe?: 'tras' | 'esquerda' | 'direita' | 'rebote';
}

/** Pontos de um gol em cada faixa de dificuldade; "Recriou o lance" soma o bônus. */
export const PONTOS_FAIXA: Record<Faixa, number> = { facil: 10, media: 18, dificil: 26, craque: 34 };
export const BONUS_RECRIOU = 6;
export const LANCES_POR_PARTIDA = 3;
/** Máximo de uma partida (3 gols de craque recriando o lance): 3 × 40 = 120. */
export const TETO_PARTIDA = LANCES_POR_PARTIDA * (PONTOS_FAIXA.craque + BONUS_RECRIOU);

/** Faixa pela chance de acerto: fácil ≥ 75%, média 50–75%, difícil 30–50%, craque < 30% (como na Prova de Boleiro). */
export function faixaPorChance(chance: number): Faixa {
  if (chance >= 0.75) return 'facil';
  if (chance >= 0.5) return 'media';
  if (chance >= 0.3) return 'dificil';
  return 'craque';
}

// ---------- medidas ----------
const MEIA_LARGURA_GOL = 3.66;
const ALTURA_GOL = 2.44;
const DIST_PENALTI = 11;
const DIST_BARREIRA = 9.15;
const ALTURA_BARREIRA = 1.9;
/** Largura de cada jogador da barreira e raio da bola. */
const LARGURA_JOGADOR = 0.5;
const RAIO_BOLA = 0.11;
/** Quanto a bola sobe no meio do caminho (a 20 m, força 0); cai com a força e cresce com a distância. */
const LOFT = 2.6;
const LOFT_CAVADINHA = 3.2;
/** Quanto o efeito máximo afasta a bola da linha reta no meio do caminho, a 20 m. */
const CURVA = 1.5;
/** Velocidade da bola (m/s) com força 0 e 100; cavadinha e bola fraca vão devagar. */
const V_MIN = 12;
const V_MAX = 32;
const V_CAVADINHA = 11;
const V_FRACA = 10;
/**
 * Goleiro: alcance parado (corpo e braços; maior quando sai abafando), velocidade do mergulho,
 * alcance máximo e altura que ele cobre saindo do gol.
 */
const ALCANCE_BASE = 0.9;
const ALCANCE_SAINDO = 1.5;
const VEL_GOLEIRO = 4.5;
const ALCANCE_MAX = 3.8;
const ALTURA_GOLEIRO = 2.3;
/** Encobrir o goleiro só funciona se ele saiu pelo menos isto (perto da linha ele recua e pega). */
const SAIDA_MIN_POR_CIMA = 3;
/** Tempo de reação sorteado: de 0,15 a 0,45 s. */
const REACAO_MIN = 0.15;
const REACAO_VAR = 0.3;
/** Como nos pênaltis, às vezes o goleiro "lê" o chute: sai adiantado para o lado da bola e reage antes. */
const CHANCE_LER = 0.25;
const LEITURA_DESLOCA = 0.4;
const LEITURA_REACAO = 0.1;
/** O goleiro demora mais quando a bola sai de trás da barreira. */
const ATRASO_BARREIRA = 0.12;
/** No ângulo o alcance cai um pouco. */
const FATOR_ANGULO = 0.85;

const SAL_LANCE = 0x1a7c;

const limitar = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
const distancia = (x: number, z: number) => Math.sqrt(x * x + z * z);

/** Problemas de uma cena (vazio = válida). O teste do catálogo roda isto em todos os lances. */
export function validarCena(c: CenaLance): string[] {
  const erros: string[] = [];
  const { x, z } = c.bola;
  if (!(z >= 4 && z <= 35)) erros.push('A bola precisa estar entre 4 e 35 m da linha do gol.');
  if (!(Math.abs(x) <= 25)) erros.push('A bola precisa estar a até 25 m do meio do gol, para o lado.');
  if (!Number.isInteger(c.zonaHistorica) || c.zonaHistorica < 0 || c.zonaHistorica >= ZONAS) {
    erros.push('A zona histórica vai de 0 a 5.');
  }
  if (!FAIXAS.includes(c.faixa)) erros.push('Faixa desconhecida.');
  if (c.goleiroX !== undefined && !(Math.abs(c.goleiroX) <= 0.6)) erros.push('O goleiro começa entre -0,6 e 0,6.');
  if (c.tipo === 'falta') {
    if (!c.barreira) erros.push('Falta precisa de barreira.');
    else {
      if (!Number.isInteger(c.barreira.jogadores) || c.barreira.jogadores < 2 || c.barreira.jogadores > 6) {
        erros.push('A barreira tem de 2 a 6 jogadores.');
      }
      if (!(Math.abs(c.barreira.miraX) <= MEIA_LARGURA_GOL)) erros.push('A barreira tapa um ponto entre as traves.');
    }
    // Falta é fora da área (16,5 m de fundo, 20,16 m para cada lado do meio do gol).
    if (z <= 16.5 && Math.abs(x) <= 20.16) erros.push('Falta é fora da grande área.');
    if (c.goleiroSaida) erros.push('Na falta o goleiro fica na linha.');
  } else if (c.tipo === 'finalizacao') {
    if (c.barreira) erros.push('Cara a cara não tem barreira.');
    const s = c.goleiroSaida ?? 0;
    if (!(s >= 0 && s <= distancia(x, z) - 2)) erros.push('O goleiro sai no máximo até 2 m da bola.');
  } else {
    erros.push('Tipo desconhecido.');
  }
  return erros;
}

/** Onde o goleiro começa (x de -1 a 1), antes do ajuste sorteado. */
function goleiroInicial(c: CenaLance, palpite: number): number {
  if (c.goleiroX !== undefined) return c.goleiroX;
  if (!c.barreira) return 0;
  // A barreira tapa um lado; o goleiro cuida do outro. Barreira de frente: o goleiro escolhe um lado.
  const m = c.barreira.miraX;
  if (Math.abs(m) < 0.5) return palpite < 0.5 ? -0.15 : 0.15;
  return m > 0 ? -0.15 : 0.15;
}

/** Sorteio do lance i: tremor da bola e goleiro. A ordem dos sorteios não pode mudar (mudaria os resultados). */
function sortear(semente: number, i: number, cena: CenaLance) {
  const rnd = criarAleatorio(misturar(semente, SAL_LANCE, i));
  // De longe a bola treme mais (até 3 vezes o tremor do pênalti).
  const escala = limitar(distancia(cena.bola.x, cena.bola.z) / DIST_PENALTI, 1, 3);
  const tremX = (rnd() - 0.5) * 0.12 * escala;
  const tremY = (rnd() - 0.5) * 0.12 * escala;
  const reacao = REACAO_MIN + rnd() * REACAO_VAR;
  const leu = rnd() < CHANCE_LER;
  const palpite = rnd();
  const ajusteGoleiro = (rnd() - 0.5) * 0.1;
  return { tremX, tremY, reacao, leu, x0: goleiroInicial(cena, palpite) + ajusteGoleiro };
}

/** Onde o goleiro está antes do chute (x de -1 a 1). Só para o desenho. */
export function goleiroAntesDoChute(semente: number, i: number, cena: CenaLance): number {
  return sortear(semente, i, cena).x0;
}

/**
 * Caminho da bola em metros, da bola (t = 0) ao ponto final na linha do gol (t = 1): reta até o ponto final,
 * mais a curva do efeito e a altura do arco.
 */
function caminho(cena: Pick<CenaLance, 'bola'>, g: GestoCobranca, x: number, y: number, cavadinha: boolean, fraca: boolean) {
  const bx = cena.bola.x;
  const bz = cena.bola.z;
  const gx = x * MEIA_LARGURA_GOL;
  const alturaFinal = y * ALTURA_GOL;
  const L = distancia(gx - bx, bz);
  const ax = (gx - bx) / L;
  const az = -bz / L;
  // Direita de quem bate, olhando para o gol (z diminuindo).
  const rx = -az;
  const rz = ax;
  const curva = (g.efeito / 100) * CURVA * (L / 20) * (cavadinha || fraca ? 0 : 1);
  // A cavadinha sobe o mesmo de qualquer distância: é um toque por cima, não um chute.
  const loft = cavadinha
    ? LOFT_CAVADINHA
    : fraca
      ? 0
      : LOFT * limitar((100 - g.forca) / 60, 0, 1) * (L / 20);
  const sino = (t: number) => 4 * t * (1 - t);
  // Curva para a direita: no meio do caminho a bola está à esquerda da reta e termina à direita.
  const ponto = (t: number) => ({
    x: bx + ax * L * t - rx * curva * sino(t),
    z: bz + az * L * t - rz * curva * sino(t),
  });
  const altura = (t: number) => alturaFinal * t + loft * sino(t);
  return { L, ax, az, ponto, altura };
}

/** O caminho de um lance já resolvido, para o desenho: posição da bola (m) em t de 0 a `r.tFim`. */
export function caminhoDoLance(cena: CenaLance, gestoBruto: GestoCobranca, r: ResultadoLance): (t: number) => { x: number; y: number; z: number } {
  return caminhoDoChute(cena.bola, gestoBruto, r.x, r.y, r.cavadinha);
}

/**
 * O caminho de qualquer chute já resolvido (lance ou pênalti, com a bola em `bola`, m) até o ponto
 * (x, y) do gol nas unidades do motor. Usado no desenho e no replay de TV do gol.
 */
export function caminhoDoChute(
  bola: { x: number; z: number },
  gestoBruto: GestoCobranca,
  x: number,
  y: number,
  cavadinha: boolean,
): (t: number) => { x: number; y: number; z: number } {
  const g = normalizarCobranca(gestoBruto);
  const fraca = !cavadinha && g.forca < 32;
  const c = caminho({ bola }, g, x, y, cavadinha, fraca);
  return (t) => {
    const p = c.ponto(t);
    return { x: p.x, y: c.altura(t), z: p.z };
  };
}

/** Resolve o lance i de uma partida: o gesto do jogador contra a barreira e o goleiro da máquina. */
export function resolverLance(semente: number, i: number, cena: CenaLance, gestoBruto: GestoCobranca): ResultadoLance {
  const g = normalizarCobranca(gestoBruto);
  const sorteio = sortear(semente, i, cena);
  const { tremX, tremY, leu } = sorteio;
  const bx = cena.bola.x;
  const bz = cena.bola.z;
  const d = distancia(bx, bz);

  const { x, y, cavadinha, fraca } = trajetoria(g, tremX, tremY);
  const zonaBola = zonaDoPonto(limitar(x, -1, 1), limitar(y, 0, 1));
  const gx = x * MEIA_LARGURA_GOL;
  // Goleiro: no lado sorteado ou, quando lê o chute, adiantado para o lado da bola.
  const x0 = sorteio.x0 * MEIA_LARGURA_GOL;
  const xg = leu ? x0 + (gx - x0) * LEITURA_DESLOCA : x0;
  const base = { x, y, zonaBola, cavadinha, angulo: false, raspouTrave: false, recriou: false, goleiroX: xg / MEIA_LARGURA_GOL, tFim: 1, pontos: 0 };

  const { L, ax, az, ponto, altura } = caminho(cena, g, x, y, cavadinha, fraca);

  // Barreira: parede de jogadores a 9,15 m da bola, de frente para `miraX`.
  let escondida = false;
  if (cena.barreira) {
    const mx = cena.barreira.miraX - bx;
    const mz = -bz;
    const dm = distancia(mx, mz);
    const ux = mx / dm;
    const uz = mz / dm;
    const avanco = (ax * ux + az * uz) * L;
    if (avanco > DIST_BARREIRA) {
      const t = DIST_BARREIRA / avanco;
      const p = ponto(t);
      const cx = bx + ux * DIST_BARREIRA;
      const cz = bz + uz * DIST_BARREIRA;
      const lateral = Math.abs((p.x - cx) * -uz + (p.z - cz) * ux);
      const meia = (cena.barreira.jogadores * LARGURA_JOGADOR) / 2 + RAIO_BOLA;
      if (lateral <= meia && altura(t) < ALTURA_BARREIRA) return { ...base, desfecho: 'barreira', tFim: t };
      escondida = lateral <= meia + 1;
    }
  }

  const naTrave = (Math.abs(x) > 1 && Math.abs(x) <= 1.06 && y <= 1) || (y > 1 && y <= 1.05 && Math.abs(x) <= 1);
  if (naTrave) return { ...base, desfecho: 'trave' };
  if (Math.abs(x) > 1 || y > 1) return { ...base, desfecho: 'fora' };
  const raspouTrave = Math.abs(x) > 0.95 || y > 0.95;
  const angulo = !cavadinha && Math.abs(x) > 0.78 && y > 0.72;

  // Goleiro: chega até onde der no tempo que a bola leva para alcançá-lo.
  const saida = cena.goleiroSaida ?? 0;
  const v = cavadinha ? V_CAVADINHA : fraca ? V_FRACA : V_MIN + ((V_MAX - V_MIN) * g.forca) / 100;
  const reacao = leu ? sorteio.reacao - LEITURA_REACAO : sorteio.reacao;
  // O goleiro adiantado fica na reta entre a bola e o ponto onde ele começou na linha.
  const kx = xg + (bx - xg) * (saida / d);
  const kz = bz * (saida / d);
  // Onde a bola cruza a "linha" do goleiro (paralela à do gol, na profundidade dele).
  const tk = saida > 0 ? limitar(1 - kz / bz, 0, 1) : 1;
  const pk = ponto(tk);
  const tempo = (L * tk) / v + (escondida ? -ATRASO_BARREIRA : 0);
  const parado = saida > 0 ? ALCANCE_SAINDO : ALCANCE_BASE;
  const alcance = Math.min(ALCANCE_MAX, parado + Math.max(0, tempo - reacao) * VEL_GOLEIRO) * (angulo ? FATOR_ANGULO : 1);
  // O goleiro que leu o chute recua e não é encoberto.
  const porCima = !leu && saida >= SAIDA_MIN_POR_CIMA && altura(tk) > ALTURA_GOLEIRO;
  const defendeu = !porCima && Math.abs(pk.x - kx) <= alcance;

  if (defendeu) return { ...base, angulo, desfecho: 'defesa', tFim: tk };
  const recriou = zonaBola === cena.zonaHistorica;
  const pontos = PONTOS_FAIXA[cena.faixa] + (recriou ? BONUS_RECRIOU : 0);
  return { ...base, angulo, raspouTrave, recriou, desfecho: 'gol', pontos };
}

export interface ResultadoPartidaLances {
  lances: ResultadoLance[];
  gols: number;
  recriados: number;
  pontos: number;
}

/**
 * Recalcula a partida inteira (3 lances escolhidos pela pessoa, pode repetir). É esta função que o servidor roda.
 * Cada lance tem sorteio próprio, derivado de (semente, índice).
 */
export function simularPartidaLances(
  semente: number,
  cenas: readonly CenaLance[],
  gestos: readonly GestoCobranca[],
): ResultadoPartidaLances {
  if (cenas.length !== LANCES_POR_PARTIDA || gestos.length !== LANCES_POR_PARTIDA) {
    throw new Error(`A partida tem ${LANCES_POR_PARTIDA} lances, com um gesto para cada.`);
  }
  const lances = cenas.map((c, i) => resolverLance(semente, i, c, gestos[i]));
  return {
    lances,
    gols: lances.filter((r) => r.desfecho === 'gol').length,
    recriados: lances.filter((r) => r.recriou).length,
    pontos: lances.reduce((s, r) => s + r.pontos, 0),
  };
}

// ---------- medalhas ----------
export type Medalha = 'bronze' | 'prata' | 'ouro';

/** Acertos (gols em tentativas valendo) que cada medalha pede; o ouro pede também lances recriados. */
export const MEDALHAS: readonly { medalha: Medalha; acertos: number; recriados: number }[] = [
  { medalha: 'bronze', acertos: 5, recriados: 0 },
  { medalha: 'prata', acertos: 20, recriados: 0 },
  { medalha: 'ouro', acertos: 50, recriados: 10 },
];

/** Maior medalha alcançada num lance, ou null. */
export function medalhaDoLance(acertos: number, recriados: number): Medalha | null {
  let m: Medalha | null = null;
  for (const n of MEDALHAS) if (acertos >= n.acertos && recriados >= n.recriados) m = n.medalha;
  return m;
}

// ---------- calibragem ----------
/** Erro de mão de uma pessoa ao repetir o gesto que quer (desvio, nas unidades do gesto). */
export const ERRO_DE_MAO = { dir: 7, forca: 6, efeito: 20 } as const;

const PASSO = { dir: 5, forca: 4, efeito: 20 } as const;
const EIXO_DIR = Array.from({ length: 41 }, (_, k) => -100 + k * PASSO.dir);
const EIXO_FORCA = Array.from({ length: 26 }, (_, k) => k * PASSO.forca);
const EIXO_EFEITO = Array.from({ length: 11 }, (_, k) => -100 + k * PASSO.efeito);

/** Pesos de um "sino" discreto (gaussiana) com desvio `sigma` passos, raio de 2 passos. */
function pesos(sigma: number): number[] {
  const p = [-2, -1, 0, 1, 2].map((k) => Math.exp(-(k * k) / (2 * sigma * sigma)));
  const soma = p.reduce((a, b) => a + b, 0);
  return p.map((v) => v / soma);
}

export interface Calibragem {
  /** Chance de gol de quem mira no melhor gesto, com o erro de mão de uma pessoa. */
  chance: number;
  /** Chance de gol com um gesto qualquer (lance que entra "sem querer" é fácil demais). */
  chanceAleatoria: number;
  melhor: GestoCobranca;
  faixa: Faixa;
}

/**
 * Robô de calibragem: chuta uma grade de gestos contra várias sementes, espalha cada acerto pelo erro de mão
 * e acha o gesto com a maior chance. A faixa inicial de cada lance sai daqui; depois, dos dados reais.
 * (Só roda em teste e script: usa Math.exp, mas não decide nenhuma partida.)
 */
export function calibrar(cena: CenaLance, sementes = 16, tentativas = 800): Calibragem {
  const nD = EIXO_DIR.length;
  const nF = EIXO_FORCA.length;
  const nE = EIXO_EFEITO.length;
  const idx = (a: number, b: number, c: number) => (a * nF + b) * nE + c;
  const bruto = new Float64Array(nD * nF * nE);
  let soma = 0;
  for (let a = 0; a < nD; a++)
    for (let b = 0; b < nF; b++)
      for (let c = 0; c < nE; c++) {
        let gols = 0;
        for (let s = 0; s < sementes; s++) {
          const r = resolverLance(misturar(0xca1, s), 0, cena, { dir: EIXO_DIR[a], forca: EIXO_FORCA[b], efeito: EIXO_EFEITO[c] });
          if (r.desfecho === 'gol') gols++;
        }
        bruto[idx(a, b, c)] = gols / sementes;
        soma += gols / sementes;
      }

  // Espalha pelo erro de mão, um eixo por vez (fora da grade conta como erro).
  const kernels = [pesos(ERRO_DE_MAO.dir / PASSO.dir), pesos(ERRO_DE_MAO.forca / PASSO.forca), pesos(ERRO_DE_MAO.efeito / PASSO.efeito)];
  const dims = [nD, nF, nE];
  let atual = bruto;
  for (let eixo = 0; eixo < 3; eixo++) {
    const novo = new Float64Array(atual.length);
    for (let a = 0; a < nD; a++)
      for (let b = 0; b < nF; b++)
        for (let c = 0; c < nE; c++) {
          const pos = [a, b, c];
          let v = 0;
          for (let k = -2; k <= 2; k++) {
            const q = pos[eixo] + k;
            if (q < 0 || q >= dims[eixo]) continue;
            const p2 = [...pos];
            p2[eixo] = q;
            v += kernels[eixo][k + 2] * atual[idx(p2[0], p2[1], p2[2])];
          }
          novo[idx(a, b, c)] = v;
        }
    atual = novo;
  }

  let melhorI = 0;
  for (let i = 1; i < atual.length; i++) if (atual[i] > atual[melhorI]) melhorI = i;
  const c = melhorI % nE;
  const b = Math.floor(melhorI / nE) % nF;
  const a = Math.floor(melhorI / (nE * nF));
  const melhor = { dir: EIXO_DIR[a], forca: EIXO_FORCA[b], efeito: EIXO_EFEITO[c] };

  // A chance é medida de novo, com sementes e erros de mão que a busca não viu (escolher o máximo
  // da grade superestima a chance).
  const rnd = criarAleatorio(0x5e7);
  const normal = () => (rnd() + rnd() + rnd() + rnd() - 2) * Math.sqrt(3);
  let gols = 0;
  for (let k = 0; k < tentativas; k++) {
    const gesto = {
      dir: melhor.dir + normal() * ERRO_DE_MAO.dir,
      forca: melhor.forca + normal() * ERRO_DE_MAO.forca,
      efeito: melhor.efeito + normal() * ERRO_DE_MAO.efeito,
    };
    if (resolverLance(misturar(0x7e5, k), 0, cena, gesto).desfecho === 'gol') gols++;
  }
  const chance = gols / tentativas;
  return { chance, chanceAleatoria: soma / bruto.length, melhor, faixa: faixaPorChance(chance) };
}
