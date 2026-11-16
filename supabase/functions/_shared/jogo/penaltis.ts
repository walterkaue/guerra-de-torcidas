// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Motor puro dos Pênaltis. Sem DOM, sem relógio, sem Math.random:
// mesma semente + mesmos gestos = mesmo resultado, no navegador e no servidor.
// Evite funções trigonométricas aqui: só aritmética básica é idêntica entre motores.

import { criarAleatorio, inteiro, misturar } from './aleatorio.ts';

/** Cobranças (e defesas) do tempo normal. */
export const COBRANCAS = 5;
/** Rodadas de morte súbita (1 cobrança + 1 defesa) se empatar; depois, par ou ímpar. */
export const RODADAS_EXTRAS_MAX = 3;
export const RODADAS_MAX = COBRANCAS + RODADAS_EXTRAS_MAX;

/**
 * Gesto de cobrança, já quantizado em inteiros (é isso que vai para o servidor).
 * dir: -100 (canto esquerdo) a 100 (canto direito)
 * forca: 0 a 100 (comprimento do arraste)
 * efeito: -100 a 100 (curva no fim do arraste; positivo curva para a direita)
 */
export interface GestoCobranca {
  dir: number;
  forca: number;
  efeito: number;
}

/** Zona escolhida na defesa: 0..5 (linha*3 + coluna) ou -1 se não pulou. */
export type GestoDefesa = number;

export type Paridade = 'par' | 'impar';

/** Escolha do jogador no par ou ímpar: paridade e um número de 0 a 5. */
export interface EscolhaParOuImpar {
  escolha: Paridade;
  numero: number;
}

export interface Gestos {
  cobrancas: GestoCobranca[];
  defesas: GestoDefesa[];
  /** Só existe se a morte súbita terminar empatada. */
  parOuImpar?: EscolhaParOuImpar;
}

export interface ResultadoParOuImpar extends EscolhaParOuImpar {
  /** Número do narrador (0 a 5). Vem do servidor, gerado com um segredo, depois da escolha. */
  numeroNarrador: number;
  soma: number;
  ganhou: boolean;
}

export type Decisao = 'tempo_normal' | 'morte_subita' | 'par_ou_impar';

/**
 * Zonas do gol vistas de trás do batedor:
 *   3 4 5   (alto)
 *   0 1 2   (baixo)
 */
export const ZONAS = 6;
export const coluna = (zona: number) => zona % 3;
export const linha = (zona: number) => Math.floor(zona / 3);

export type DesfechoCobranca = 'gol' | 'defesa' | 'fora' | 'trave';

export interface ResultadoCobranca {
  desfecho: DesfechoCobranca;
  /** Ponto final da bola: x em [-1, 1] entre as traves, y em [0, 1] do chão ao travessão. */
  x: number;
  y: number;
  zonaBola: number;
  zonaGoleiro: number;
  angulo: boolean;
  /** Gol que entrou raspando a trave ou o travessão (só muda a narração). */
  raspouTrave: boolean;
  cavadinha: boolean;
  /** Bola fraca, rolando. */
  fraca: boolean;
  /** O goleiro da máquina "leu" o chute (senão pulou numa zona sorteada). Usado na detecção. */
  goleiroLeu: boolean;
  pontos: number;
  // Só no motor 2 (goleiro com alcance, partidas criadas desde GOLEIRO_COM_ALCANCE_DESDE). As do motor 1 não têm.
  /** Ponto do gol para onde o goleiro mergulhou (x de -1 a 1, y de 0 a 1), sem prender dentro do gol. */
  goleiroX?: number;
  goleiroY?: number;
  /** Como a bola passou pelo goleiro; null na trave e pra fora. */
  jeito?: JeitoCobranca | null;
  /** Colocação da bola (é ela que dá os pontos do gol); null na trave e pra fora. */
  faixa?: FaixaDoGol | null;
}

/**
 * Motor 2: encaixou (defesa, a bola parou nas mãos), espalmou (defesa, a luva tocou firme), tocou (a luva raspou e a
 * bola entrou), contrapé (gol com o goleiro mergulhando para o outro lado) ou limpo (gol sem a luva chegar).
 */
export type JeitoCobranca = 'encaixou' | 'espalmou' | 'tocou' | 'contrape' | 'limpo';
/** Motor 2: no meio (|x| < 0,4), colocado (0,4 a 0,75), no canto (0,75 ou mais) e no ângulo. */
export type FaixaDoGol = 'meio' | 'colocado' | 'canto' | 'angulo';

export interface PlanoDefesa {
  /** Zona para onde a máquina vai bater. */
  alvo: number;
  /** Coluna para onde o pé de apoio aponta (a "dica"). Nem sempre é honesta. */
  dica: number;
  /** A máquina vai isolar ou mandar na trave. */
  erra: boolean;
  /** Só no desafio por link: a cobrança gravada de quem desafiou. */
  gravada?: { x: number; y: number; fraca: boolean; cavadinha: boolean };
}

export type DesfechoDefesa = 'defesa' | 'gol' | 'fora';

export interface ResultadoDefesa {
  desfecho: DesfechoDefesa;
  alvo: number;
  zonaGoleiro: number;
  /** Defesa contra cobrança gravada (desafio por link) em vez do batedor da máquina. */
  contraGravada: boolean;
  /** 10 por defesa; 0 se o chute gravado era fraco (força abaixo de 32). */
  pontos: number;
}

export interface Pontuacao {
  gols: number;
  angulos: number;
  cavadinhas: number;
  defesas: number;
  vitoria: number;
  cincoDeCinco: number;
  total: number;
}

export interface ResultadoPartida {
  cobrancas: ResultadoCobranca[];
  defesas: ResultadoDefesa[];
  golsJogador: number;
  golsMaquina: number;
  /** Rodadas de morte súbita jogadas (0 a RODADAS_EXTRAS_MAX). */
  rodadasExtras: number;
  /** 5 de 5 nas cinco primeiras cobranças / defesas (a morte súbita não conta). */
  cincoCobrancas: boolean;
  cincoDefesas: boolean;
  /** Toda disputa termina com vencedor: não existe empate. */
  venceu: boolean;
  decisao: Decisao;
  parOuImpar?: ResultadoParOuImpar;
  pontos: Pontuacao;
}

/** Uma tabela de pontos dos pênaltis. `teto` limita o total da partida (a tabela de antes não tinha). */
export interface TabelaPenaltis {
  gol: number;
  angulo: number;
  cavadinha: number;
  defesa: number;
  vitoria: number;
  cincoDeCinco: number;
  teto?: number;
}

/** Tabela de antes dos Lances unificados (partidas criadas até 07/11/2026). Teto real: 220. */
export const PONTOS = {
  gol: 10,
  angulo: 5,
  cavadinha: 10,
  defesa: 10,
  vitoria: 20,
  cincoDeCinco: 25,
} as const;

/** Teto de uma partida nos Lances unificados (jogo.md, seção 14.7), igual nos três tipos e na Prova. */
export const TETO_PARTIDA_UNIFICADO = 150;

/**
 * Tabela dos Lances unificados (decidida em 04/11/2026, "mais baixa" de docs/propostas/lances-unificados.md),
 * para partidas criadas a partir de 08/11/2026. O maior caminho possível dá 136 (5 cavadinhas, 5 defesas, vitória
 * e os dois 5 de 5); o teto de 150 é a guarda no fechamento, para uma tabela futura não passar sem ninguém ver.
 */
export const PONTOS_UNIFICADOS: TabelaPenaltis = {
  gol: 7,
  angulo: 4,
  cavadinha: 6,
  defesa: 7,
  vitoria: 15,
  cincoDeCinco: 10,
  teto: TETO_PARTIDA_UNIFICADO,
};

/**
 * Tabela do motor 2 (goleiro com alcance, decidida em 15/11/2026): o gol vale pela colocação, o ângulo soma ao canto e
 * a cavadinha que entra vale `cavadinha` sozinha. O maior caminho possível dá 135 (5 cavadinhas, 5 defesas, vitória e
 * os dois 5 de 5), ou 136 indo à morte súbita (8 cavadinhas, 1 defesa, vitória e um 5 de 5); o teto de 150 é a mesma
 * guarda do fechamento.
 */
export interface TabelaGoleiro {
  motor: 2;
  meio: number;
  colocado: number;
  canto: number;
  /** Bônus sobre o canto (o ângulo é sempre no canto). */
  angulo: number;
  /** O que vale a cavadinha que entra, sem colocação. */
  cavadinha: number;
  defesa: number;
  vitoria: number;
  cincoDeCinco: number;
  teto: number;
}

export const PONTOS_GOLEIRO: TabelaGoleiro = {
  motor: 2,
  meio: 4,
  colocado: 6,
  canto: 8,
  angulo: 4,
  cavadinha: 13,
  defesa: 7,
  vitoria: 15,
  cincoDeCinco: 10,
  teto: TETO_PARTIDA_UNIFICADO,
};

/** A regra de uma partida, pela hora de criação (tabelaPenaltisDaPartida): as tabelas do motor 1 ou a do motor 2. */
export type RegraPenaltis = TabelaPenaltis | TabelaGoleiro;
export const ehGoleiroComAlcance = (r: RegraPenaltis): r is TabelaGoleiro => (r as Partial<TabelaGoleiro>).motor === 2;

const SAL_COBRANCA = 0xc0b;
const SAL_DEFESA = 0xdef;

/**
 * Sementes de uma partida valendo (jogo.md, seção 6, "Uma semente por lance").
 * - Um número: formato antigo, uma semente para a partida toda. O resultado exato de uma cobrança deixa achá-la
 *   por força bruta (são 2^32) e, com ela, prever os lances seguintes. Fica só para refazer partidas antigas e
 *   para o treino no celular, que não vale pontos.
 * - Objeto: uma semente por lance, sorteadas à parte (partidas criadas desde 03/11/2026). A semente achada é a
 *   de um lance já jogado e não diz nada das outras.
 */
export type SementesPartida = number | SementesPorLance;

export interface SementesPorLance {
  /** Uma por cobrança e uma por defesa, até RODADAS_MAX cada (0 a 2^32 - 1). Nunca saem do servidor. */
  cobrancas: readonly number[];
  defesas: readonly number[];
}

const sementeValida = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xffffffff;

/** A semente que a cobrança ou a defesa i usa. No formato antigo é a da partida (o sal e o índice separam os sorteios). */
export function sementeDoLance(sementes: SementesPartida, tipo: 'cobranca' | 'defesa', i: number): number {
  const v = typeof sementes === 'number' ? sementes : (tipo === 'cobranca' ? sementes.cobrancas : sementes.defesas)[i];
  if (!sementeValida(v)) throw new Error(`Falta a semente da ${tipo} ${i + 1}.`);
  return v;
}

/** Sorteia as sementes de uma partida nova. `sortear(n)` dá um inteiro em [0, n) (no servidor, com crypto). */
export function sortearSementes(sortear: (n: number) => number): SementesPorLance {
  const lista = () => Array.from({ length: RODADAS_MAX }, () => sortear(0x1_0000_0000));
  return { cobrancas: lista(), defesas: lista() };
}

/** Lê as sementes guardadas no servidor: `porLance` nulo é partida antiga, que usa a `semente` da partida. */
export function lerSementes(porLance: unknown, semente: number): SementesPartida {
  if (porLance === null || porLance === undefined) return semente;
  const s = porLance as Partial<SementesPorLance>;
  const ok = (l: unknown) => Array.isArray(l) && l.length === RODADAS_MAX && l.every(sementeValida);
  if (!ok(s.cobrancas) || !ok(s.defesas)) throw new Error('Sementes por lance com formato errado.');
  return { cobrancas: s.cobrancas!, defesas: s.defesas! };
}

const limitar = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/** Garante que o gesto está no formato aceito (inteiros nos limites). */
export function normalizarCobranca(g: GestoCobranca): GestoCobranca {
  return {
    dir: limitar(Math.round(g.dir), -100, 100),
    forca: limitar(Math.round(g.forca), 0, 100),
    efeito: limitar(Math.round(g.efeito), -100, 100),
  };
}

export function normalizarDefesa(z: number): GestoDefesa {
  const n = Math.round(z);
  return n >= 0 && n < ZONAS ? n : -1;
}

/** Dificuldade de 0 (fácil) a 1 (difícil). Sobe ao longo da semana: segunda 0, domingo 1. */
export function dificuldadePorDia(diaDaSemana: number): number {
  // diaDaSemana no padrão do JS: 0 = domingo, 1 = segunda...
  const ordem = (diaDaSemana + 6) % 7; // segunda = 0
  return ordem / 6;
}

export function zonaDoPonto(x: number, y: number): number {
  const col = x < -1 / 3 ? 0 : x > 1 / 3 ? 2 : 1;
  const lin = y >= 0.5 ? 1 : 0;
  return lin * 3 + col;
}

/** Força mínima para a defesa valer pontos no desafio (chute fraco gravado de propósito não rende). */
export const FORCA_MINIMA_DESAFIO = 32;

/** Para onde a bola vai, dado o gesto e o "tremor" sorteado. Os Lances (lances.ts) usam a mesma conta. */
export function trajetoria(g: GestoCobranca, tremX: number, tremY: number) {
  const cavadinha = g.forca >= 8 && g.forca <= 24 && g.dir >= -30 && g.dir <= 30;
  const fraca = !cavadinha && g.forca < 32;
  let x: number;
  let y: number;
  if (cavadinha) {
    x = (g.dir / 100) * 0.3 + tremX * 0.5;
    y = 0.8 + tremY * 0.5;
  } else {
    x = (g.dir / 100) * 1.1 + (g.efeito / 100) * 0.3 + tremX;
    // Força 32 rasteira, ~90 no travessão, acima disso tende a isolar.
    y = fraca ? 0.05 : (g.forca - 32) / 58 + tremY;
  }
  return { x: limitar(x, -1.6, 1.6), y: limitar(y, 0, 1.6), cavadinha, fraca };
}

/** Resolve a cobrança i do jogador contra o goleiro da máquina. */
export function resolverCobranca(
  semente: number,
  i: number,
  gestoBruto: GestoCobranca,
  dificuldade: number,
  tabela: TabelaPenaltis = PONTOS,
): ResultadoCobranca {
  const g = normalizarCobranca(gestoBruto);
  const rnd = criarAleatorio(misturar(semente, SAL_COBRANCA, i));
  const tremX = (rnd() - 0.5) * 0.12;
  const tremY = (rnd() - 0.5) * 0.12;
  const leitura = rnd();
  const zonaChute = inteiro(rnd, ZONAS);
  const sorteAngulo = rnd();

  const { x, y, cavadinha, fraca } = trajetoria(g, tremX, tremY);

  const zonaBola = zonaDoPonto(limitar(x, -1, 1), limitar(y, 0, 1));

  // O goleiro da máquina lê o chute com chance maior quando a dificuldade sobe.
  // Na segunda o goleiro pega ~27% dos chutes bons; no domingo, ~45%.
  const chanceLer = 0.12 + 0.24 * dificuldade + (fraca ? 0.4 : 0);
  const goleiroLeu = leitura < chanceLer;
  let zonaGoleiro = goleiroLeu ? zonaBola : zonaChute;
  // Contra a cavadinha, o goleiro que lê fica parado no meio.
  if (cavadinha && goleiroLeu) zonaGoleiro = 1;

  const base: Omit<ResultadoCobranca, 'desfecho' | 'pontos' | 'angulo' | 'raspouTrave'> = {
    x,
    y,
    zonaBola,
    zonaGoleiro,
    cavadinha,
    fraca,
    goleiroLeu,
  };

  const naTrave = (Math.abs(x) > 1 && Math.abs(x) <= 1.06 && y <= 1) || (y > 1 && y <= 1.05 && Math.abs(x) <= 1);
  if (naTrave) return { ...base, desfecho: 'trave', angulo: false, raspouTrave: false, pontos: 0 };
  if (Math.abs(x) > 1 || y > 1) return { ...base, desfecho: 'fora', angulo: false, raspouTrave: false, pontos: 0 };
  const raspouTrave = Math.abs(x) > 0.95 || y > 0.95;

  const angulo = !cavadinha && Math.abs(x) > 0.78 && y > 0.72;

  let defendeu: boolean;
  if (cavadinha) {
    // Cavadinha só morre se o goleiro ficou no meio.
    defendeu = coluna(zonaGoleiro) === 1;
  } else if (fraca) {
    // Bola fraca: basta acertar o lado.
    defendeu = coluna(zonaGoleiro) === coluna(zonaBola);
  } else if (zonaGoleiro === zonaBola) {
    // No ângulo nem o goleiro que acertou o canto sempre alcança.
    defendeu = angulo ? sorteAngulo < 0.35 : true;
  } else {
    defendeu = false;
  }

  if (defendeu) return { ...base, desfecho: 'defesa', angulo, raspouTrave: false, pontos: 0 };

  const pontos = tabela.gol + (angulo ? tabela.angulo : 0) + (cavadinha ? tabela.cavadinha : 0);
  return { ...base, desfecho: 'gol', angulo, raspouTrave, pontos };
}

// ---------- Motor 2: goleiro com alcance (docs/jogos/penaltis.md, "Gesto e física") ----------
// Partidas criadas desde GOLEIRO_COM_ALCANCE_DESDE (regraLances.ts). O resolverCobranca acima é o motor 1: não muda,
// porque é ele que refaz as partidas antigas. A defesa (6 zonas) é a mesma nos dois.

/** Números do goleiro com alcance. Mudar qualquer um muda a calibragem (scripts/balanco/simular-goleiro.mjs). */
export const GOLEIRO = {
  /** Quem leu mergulha no ponto da bola com este desvio (nas unidades do gol). */
  desvioDaLeitura: 0.12,
  /** Sem ler, fica no meio com esta chance (o resto se divide entre os dois lados). */
  meio: 0.2,
  /** Contra cavadinha, cada cavadinha anterior da partida soma isto à chance de ficar no meio... */
  aprendeCavadinha: 0.25,
  /** ...até este máximo. */
  meioMaximo: 0.95,
  /** Nos lados, |x| do mergulho vai de `ladoMinimo` a `ladoMinimo + ladoFaixa`; no meio, de -meioFaixa/2 a +meioFaixa/2. */
  ladoMinimo: 0.35,
  ladoFaixa: 0.5,
  meioFaixa: 0.4,
  /** Altura do mergulho sem ler: de `alturaMinima` a `alturaMinima + alturaFaixa`. */
  alturaMinima: 0.1,
  alturaFaixa: 0.75,
  /** Alcance do goleiro, o mesmo para o lado e para cima. */
  alcance: 0.3,
  /** Bola fraca dá mais tempo: o alcance cresce. */
  fraca: 1.6,
  /** No canto o goleiro chega esticado: o alcance diminui. */
  canto: 0.7,
  /** d² até aqui: encaixou. De `encaixa` a 1: a luva tocou, e entra com chance (d² − encaixa) / toque. */
  encaixa: 0.3,
  toque: 0.64,
  /** Contrapé: o goleiro foi para o outro lado (|x| do mergulho ≥ ladoMinimo) e a bola foi longe do meio. */
  contrapeBola: 0.3,
} as const;

const RAIZ_DE_3 = 1.7320508075688772;

/** Os sorteios de uma cobrança do motor 2, sempre todos e sempre nesta ordem, mesmo quando o lance não usa algum. */
export interface SorteiosDoGoleiro {
  tremX: number;
  tremY: number;
  /** Comparado com a chance de ler. */
  leitura: number;
  /** Sem ler: meio, esquerda ou direita. */
  lado: number;
  /** Onde, dentro do lado (ou do meio), e a que altura. */
  posX: number;
  posY: number;
  /** Desvio de quem leu, em desvios padrão (soma de 4 sorteios uniformes, desvio 1). */
  erroX: number;
  erroY: number;
  /** Bola que a luva tocou: entra se `toque` ficar abaixo da chance. */
  toque: number;
}

/** Sorteia, na ordem da regra: tremX, tremY, leitura, lado, posX, posY, 4 do erro em x, 4 do erro em y, toque. */
export function sortearGoleiro(rnd: () => number): SorteiosDoGoleiro {
  const tremX = (rnd() - 0.5) * 0.12;
  const tremY = (rnd() - 0.5) * 0.12;
  const leitura = rnd();
  const lado = rnd();
  const posX = rnd();
  const posY = rnd();
  const erroX = (rnd() + rnd() + rnd() + rnd() - 2) * RAIZ_DE_3;
  const erroY = (rnd() + rnd() + rnd() + rnd() - 2) * RAIZ_DE_3;
  const toque = rnd();
  return { tremX, tremY, leitura, lado, posX, posY, erroX, erroY, toque };
}

/** O gesto é de cavadinha (força 8 a 24 e |dir| até 30, depois de normalizar), tanto faz se entrou. */
export function ehGestoDeCavadinha(g: GestoCobranca): boolean {
  return trajetoria(normalizarCobranca(g), 0, 0).cavadinha;
}

/** Quantas das cobranças antes da `i` (desta partida, a morte súbita também) tiveram gesto de cavadinha. */
export function cavadinhasAntes(gestos: readonly GestoCobranca[], i: number): number {
  let n = 0;
  for (let j = 0; j < i && j < gestos.length; j++) if (ehGestoDeCavadinha(gestos[j])) n++;
  return n;
}

/** Chance de o goleiro que não leu ficar no meio: 20%; contra cavadinha, sobe 25 pontos a cada cavadinha anterior. */
export function chanceDoMeio(cavadinha: boolean, antes: number): number {
  if (!cavadinha) return GOLEIRO.meio;
  return Math.min(GOLEIRO.meioMaximo, GOLEIRO.meio + GOLEIRO.aprendeCavadinha * (antes > 0 ? antes : 0));
}

/** Colocação da bola no gol (a cavadinha nunca é ângulo). */
export function faixaDoGol(x: number, y: number, cavadinha: boolean): FaixaDoGol {
  const ax = Math.abs(x);
  if (!cavadinha && ax > 0.78 && y > 0.72) return 'angulo';
  return ax < 0.4 ? 'meio' : ax < 0.75 ? 'colocado' : 'canto';
}

/** Pontos de um gol no motor 2: a cavadinha vale a dela; o resto, a colocação (o ângulo é canto + bônus). */
export function pontosDoGol(t: TabelaGoleiro, faixa: FaixaDoGol, cavadinha: boolean): number {
  if (cavadinha) return t.cavadinha;
  return faixa === 'angulo' ? t.canto + t.angulo : t[faixa];
}

/** Bola no canto: |x| > 0,85, ou |x| > 0,7 rente ao travessão ou ao chão. */
const noCanto = (x: number, y: number) => Math.abs(x) > 0.85 || (Math.abs(x) > 0.7 && (y > 0.8 || y < 0.15));

/**
 * O desfecho do motor 2 com a bola e os sorteios já dados (o teste e a calibragem chamam direto, com a bola exata).
 * `antes` = cavadinhas anteriores desta partida (cavadinhasAntes): o goleiro aprende a esperar no meio.
 */
export function desfechoDoGoleiro(
  bola: { x: number; y: number; cavadinha: boolean; fraca: boolean },
  s: SorteiosDoGoleiro,
  dificuldade: number,
  tabela: TabelaGoleiro = PONTOS_GOLEIRO,
  antes = 0,
): ResultadoCobranca {
  const { x, y, cavadinha, fraca } = bola;
  const zonaBola = zonaDoPonto(limitar(x, -1, 1), limitar(y, 0, 1));

  // Mesma leitura do motor 1.
  const chanceLer = 0.12 + 0.24 * dificuldade + (fraca ? 0.4 : 0);
  const goleiroLeu = s.leitura < chanceLer;
  const ficouNoMeio = !goleiroLeu && Math.abs(s.lado - 0.5) < chanceDoMeio(cavadinha, antes) / 2;

  // O ponto do mergulho NÃO é preso dentro do gol (quem leu um chute rente à trave pode cair para fora dela).
  let goleiroX: number;
  let goleiroY: number;
  if (goleiroLeu) {
    goleiroX = x + GOLEIRO.desvioDaLeitura * s.erroX;
    goleiroY = y + GOLEIRO.desvioDaLeitura * s.erroY;
  } else {
    goleiroX = ficouNoMeio
      ? -GOLEIRO.meioFaixa / 2 + GOLEIRO.meioFaixa * s.posX
      : (s.lado < 0.5 ? -1 : 1) * (GOLEIRO.ladoMinimo + GOLEIRO.ladoFaixa * s.posX);
    goleiroY = GOLEIRO.alturaMinima + GOLEIRO.alturaFaixa * s.posY;
  }
  // Contra a cavadinha, o goleiro que lê fica parado no meio (como no motor 1).
  const zonaGoleiro = cavadinha && goleiroLeu ? 1 : zonaDoPonto(goleiroX, goleiroY);

  const base = { x, y, zonaBola, zonaGoleiro, cavadinha, fraca, goleiroLeu, goleiroX, goleiroY };

  // Trave e fora como no motor 1, antes de tudo.
  const naTrave = (Math.abs(x) > 1 && Math.abs(x) <= 1.06 && y <= 1) || (y > 1 && y <= 1.05 && Math.abs(x) <= 1);
  if (naTrave) return { ...base, desfecho: 'trave', angulo: false, raspouTrave: false, pontos: 0, jeito: null, faixa: null };
  if (Math.abs(x) > 1 || y > 1) return { ...base, desfecho: 'fora', angulo: false, raspouTrave: false, pontos: 0, jeito: null, faixa: null };
  const raspouTrave = Math.abs(x) > 0.95 || y > 0.95;
  const angulo = !cavadinha && Math.abs(x) > 0.78 && y > 0.72;
  const faixa = faixaDoGol(x, y, cavadinha);

  const contrape = Math.abs(goleiroX) >= GOLEIRO.ladoMinimo && goleiroX * x < 0 && Math.abs(x) > GOLEIRO.contrapeBola;
  let jeito: JeitoCobranca;
  if (cavadinha) {
    // Cavadinha só morre se o goleiro leu ou ficou no meio.
    jeito = goleiroLeu || ficouNoMeio ? 'encaixou' : contrape ? 'contrape' : 'limpo';
  } else {
    let r = GOLEIRO.alcance;
    if (fraca) r *= GOLEIRO.fraca;
    if (noCanto(x, y)) r *= GOLEIRO.canto;
    const d2 = ((x - goleiroX) * (x - goleiroX) + (y - goleiroY) * (y - goleiroY)) / (r * r);
    if (d2 <= GOLEIRO.encaixa) jeito = 'encaixou';
    else if (d2 <= 1) jeito = s.toque < (d2 - GOLEIRO.encaixa) / GOLEIRO.toque ? 'tocou' : 'espalmou';
    else jeito = contrape ? 'contrape' : 'limpo';
  }

  if (jeito === 'encaixou' || jeito === 'espalmou') {
    return { ...base, desfecho: 'defesa', angulo, raspouTrave: false, pontos: 0, jeito, faixa };
  }
  return { ...base, desfecho: 'gol', angulo, raspouTrave, pontos: pontosDoGol(tabela, faixa, cavadinha), jeito, faixa };
}

/** Pontos por eixo na média da chanceDeDefesaSemLer (com 24 o erro fica abaixo de 1 ponto percentual). */
const GRADE_DA_CHANCE = 24;

/** Chance de defesa (encaixar ou espalmar) com a luva a (dx, dy) da bola e alcance r, na média do sorteio do toque. */
function chanceComALuvaA(dx: number, dy: number, r: number): number {
  const d2 = (dx * dx + dy * dy) / (r * r);
  if (d2 <= GOLEIRO.encaixa) return 1;
  if (d2 > 1) return 0;
  const entra = (d2 - GOLEIRO.encaixa) / GOLEIRO.toque;
  return entra >= 1 ? 0 : 1 - entra;
}

/**
 * Chance de o goleiro que NÃO leu defender esta bola (encaixar ou espalmar), antes dos sorteios dele: é o
 * desfechoDoGoleiro na média do lado, da posição e do toque. Só a detecção usa (deteccao.ts), para medir o quanto era de
 * se esperar uma defesa numa bola dessas; não entra no resultado de nenhuma cobrança. Quem mudar o desfechoDoGoleiro
 * muda aqui (o teste compara as duas contas por sorteio).
 */
export function chanceDeDefesaSemLer(bola: { x: number; y: number; cavadinha: boolean; fraca: boolean }, antes = 0): number {
  const { x, y, cavadinha, fraca } = bola;
  // Trave e pra fora nunca são defesa (e número estragado não conta).
  if (!(Math.abs(x) <= 1 && y >= 0 && y <= 1)) return 0;
  const meio = chanceDoMeio(cavadinha, antes);
  // Cavadinha sem leitura só morre se ele ficou no meio.
  if (cavadinha) return meio;
  let r = GOLEIRO.alcance;
  if (fraca) r *= GOLEIRO.fraca;
  if (noCanto(x, y)) r *= GOLEIRO.canto;
  // Meio, esquerda e direita (cada lado com metade do que sobra do meio), com o ponto do mergulho como o motor sorteia.
  const esquerda = chanceNaFaixa(x, y, r, -(GOLEIRO.ladoMinimo + GOLEIRO.ladoFaixa), GOLEIRO.ladoFaixa);
  const direita = chanceNaFaixa(x, y, r, GOLEIRO.ladoMinimo, GOLEIRO.ladoFaixa);
  return meio * chanceNaFaixa(x, y, r, -GOLEIRO.meioFaixa / 2, GOLEIRO.meioFaixa) + ((1 - meio) / 2) * (esquerda + direita);
}

/** Média da chance de defesa com o ponto do mergulho sorteado em x de `x0` a `x0 + largura`, na altura de sempre. */
function chanceNaFaixa(x: number, y: number, r: number, x0: number, largura: number): number {
  // A faixa inteira fora do alcance: nem faz a conta.
  if (x < x0 - r || x > x0 + largura + r) return 0;
  const n = GRADE_DA_CHANCE;
  let soma = 0;
  for (let a = 0; a < n; a++) {
    const dx = x - (x0 + (largura * (a + 0.5)) / n);
    for (let b = 0; b < n; b++) soma += chanceComALuvaA(dx, y - (GOLEIRO.alturaMinima + (GOLEIRO.alturaFaixa * (b + 0.5)) / n), r);
  }
  return soma / (n * n);
}

/** Resolve a cobrança i do jogador contra o goleiro com alcance (motor 2). */
export function resolverCobrancaGoleiro(
  semente: number,
  i: number,
  gestoBruto: GestoCobranca,
  dificuldade: number,
  tabela: TabelaGoleiro = PONTOS_GOLEIRO,
  antes = 0,
): ResultadoCobranca {
  const g = normalizarCobranca(gestoBruto);
  const s = sortearGoleiro(criarAleatorio(misturar(semente, SAL_COBRANCA, i)));
  return desfechoDoGoleiro(trajetoria(g, s.tremX, s.tremY), s, dificuldade, tabela, antes);
}

/**
 * Resolve a cobrança i pela regra da partida: motor 2 com a tabela do goleiro com alcance, senão o motor 1 de sempre.
 * `gestos` são as cobranças da partida (só as antes da i contam, para o goleiro aprender a cavadinha); no motor 1 não
 * são usadas.
 */
export function resolverCobrancaDaRegra(
  semente: number,
  i: number,
  gesto: GestoCobranca,
  dificuldade: number,
  regra: RegraPenaltis,
  gestos: readonly GestoCobranca[],
): ResultadoCobranca {
  return ehGoleiroComAlcance(regra)
    ? resolverCobrancaGoleiro(semente, i, gesto, dificuldade, regra, cavadinhasAntes(gestos, i))
    : resolverCobranca(semente, i, gesto, dificuldade, regra);
}

/** O que a máquina vai fazer na cobrança i (mostrado ao jogador só como "dica"). */
/**
 * O que o batedor vai fazer na cobrança i (mostrado ao jogador só como "dica").
 * Com `gravada` (desafio por link), a bola segue a cobrança de quem desafiou; senão, a máquina sorteia.
 */
export function planejarDefesa(
  semente: number,
  i: number,
  dificuldade: number,
  gravada?: GestoCobranca,
): PlanoDefesa {
  const rnd = criarAleatorio(misturar(semente, SAL_DEFESA, i));
  let alvo = inteiro(rnd, ZONAS);
  const honesta = rnd() < 0.85 - 0.35 * dificuldade;
  const outra = inteiro(rnd, 2);
  let erra = rnd() < 0.08;
  let infoGravada: PlanoDefesa['gravada'];
  if (gravada) {
    const tremX = (rnd() - 0.5) * 0.12;
    const tremY = (rnd() - 0.5) * 0.12;
    const t = trajetoria(normalizarCobranca(gravada), tremX, tremY);
    alvo = zonaDoPonto(limitar(t.x, -1, 1), limitar(t.y, 0, 1));
    erra = Math.abs(t.x) > 1 || t.y > 1;
    infoGravada = t;
  }
  const col = coluna(alvo);
  const dica = honesta ? col : [0, 1, 2].filter((c) => c !== col)[outra];
  return infoGravada ? { alvo, dica, erra, gravada: infoGravada } : { alvo, dica, erra };
}

/** Resolve a defesa i: o jogador escolheu uma zona (ou -1). */
export function resolverDefesa(
  semente: number,
  i: number,
  zonaBruta: GestoDefesa,
  dificuldade: number,
  gravada?: GestoCobranca,
  // Só a defesa conta (é a mesma nos dois motores): aceita a tabela do motor 1 ou a do 2.
  tabela: Pick<TabelaPenaltis, 'defesa'> = PONTOS,
): ResultadoDefesa {
  const plano = planejarDefesa(semente, i, dificuldade, gravada);
  const contraGravada = !!plano.gravada;
  const zonaGoleiro = normalizarDefesa(zonaBruta);
  // Sorteio próprio para o "quase" (mesma coluna, altura errada).
  const rnd = criarAleatorio(misturar(semente, SAL_DEFESA, i, 0x51));
  const sorteQuase = rnd();

  if (plano.erra) return { desfecho: 'fora', alvo: plano.alvo, zonaGoleiro, contraGravada, pontos: 0 };

  let defendeu = false;
  const g = plano.gravada;
  if (g?.cavadinha) {
    // Contra cavadinha gravada, só segura quem ficou no meio (ou nem pulou).
    defendeu = zonaGoleiro === -1 || coluna(zonaGoleiro) === 1;
  } else if (g?.fraca) {
    defendeu = zonaGoleiro >= 0 && coluna(zonaGoleiro) === coluna(plano.alvo);
  } else if (zonaGoleiro === plano.alvo) {
    defendeu = true;
  } else if (zonaGoleiro >= 0 && coluna(zonaGoleiro) === coluna(plano.alvo)) {
    defendeu = sorteQuase < 0.4;
  }

  // Defender chute gravado fraco (força abaixo de 32, inclui cavadinha) não rende pontos.
  const valePontos = !gravada || normalizarCobranca(gravada).forca >= FORCA_MINIMA_DESAFIO;
  return defendeu
    ? { desfecho: 'defesa', alvo: plano.alvo, zonaGoleiro, contraGravada, pontos: valePontos ? tabela.defesa : 0 }
    : { desfecho: 'gol', alvo: plano.alvo, zonaGoleiro, contraGravada, pontos: 0 };
}

const contarGols = (c: readonly ResultadoCobranca[]) => c.filter((r) => r.desfecho === 'gol').length;

/**
 * Motor 2: a parte "gols" da pontuação é a colocação dos gols que não foram de cavadinha (o ângulo conta como canto; o
 * bônus dele fica em `angulos`, e a cavadinha inteira em `cavadinhas`). Sem `faixa` (lance do motor 1 numa partida que
 * caiu no meio), sai da posição da bola.
 */
function pontosDaColocacao(cobrancas: readonly ResultadoCobranca[], t: TabelaGoleiro): number {
  let soma = 0;
  for (const c of cobrancas) {
    if (c.desfecho !== 'gol' || c.cavadinha) continue;
    const f = c.faixa ?? faixaDoGol(c.x, c.y, false);
    soma += f === 'angulo' ? t.canto : t[f];
  }
  return soma;
}
const contarSofridos = (d: readonly ResultadoDefesa[]) => d.filter((r) => r.desfecho === 'gol').length;

/**
 * Depois de `defesas.length` rodadas completas (cobrança + defesa), precisa de mais uma?
 * Sempre nas 5 primeiras; depois, só se estiver empatado e ainda houver morte súbita.
 */
export function precisaDeOutraRodada(
  cobrancas: readonly ResultadoCobranca[],
  defesas: readonly ResultadoDefesa[],
): boolean {
  const n = defesas.length;
  if (n < COBRANCAS) return true;
  if (n >= RODADAS_MAX) return false;
  return contarGols(cobrancas.slice(0, n)) === contarSofridos(defesas);
}

/** Depois de todas as rodadas, ainda empatado: decide no par ou ímpar. */
export function precisaDeParOuImpar(
  cobrancas: readonly ResultadoCobranca[],
  defesas: readonly ResultadoDefesa[],
): boolean {
  return defesas.length >= RODADAS_MAX && contarGols(cobrancas) === contarSofridos(defesas);
}

const numeroValido = (n: number) => Number.isInteger(n) && n >= 0 && n <= 5;

export function resolverParOuImpar(e: EscolhaParOuImpar, numeroNarrador: number): ResultadoParOuImpar {
  if (e.escolha !== 'par' && e.escolha !== 'impar') throw new Error('Escolha par ou ímpar inválida.');
  if (!numeroValido(e.numero) || !numeroValido(numeroNarrador)) throw new Error('Número fora de 0 a 5.');
  const soma = e.numero + numeroNarrador;
  const ganhou = (soma % 2 === 0) === (e.escolha === 'par');
  return { escolha: e.escolha, numero: e.numero, numeroNarrador, soma, ganhou };
}

/**
 * Recalcula a partida inteira. É esta função que o servidor vai rodar.
 * `numeroNarrador` só é usado (e exigido) quando a disputa chega ao par ou ímpar.
 */
export function simularPartida(
  semente: SementesPartida,
  gestos: Gestos,
  dificuldade: number,
  numeroNarrador?: number,
  /** Desafio por link: cobranças gravadas de quem desafiou. Faltando (morte súbita), bate a máquina. */
  gravadas?: readonly GestoCobranca[],
  /** Regra pela data de criação da partida (tabelaPenaltisDaPartida, em regraLances.ts): motor 1 ou motor 2. */
  tabela: RegraPenaltis = PONTOS,
): ResultadoPartida {
  const n = gestos.cobrancas.length;
  if (n !== gestos.defesas.length || n < COBRANCAS || n > RODADAS_MAX) {
    throw new Error(`A partida precisa de ${COBRANCAS} a ${RODADAS_MAX} cobranças, e o mesmo número de defesas.`);
  }
  const d = limitar(dificuldade, 0, 1);
  const cobrancas: ResultadoCobranca[] = [];
  const defesas: ResultadoDefesa[] = [];
  for (let i = 0; i < n; i++) {
    // Rodada a mais do que a regra permite (ex.: morte súbita depois de desempatar) é recusada.
    if (!precisaDeOutraRodada(cobrancas, defesas)) throw new Error(`Rodada ${i + 1} não deveria existir.`);
    // No motor 2 o goleiro conta as cavadinhas anteriores desta partida (as do gesto, entrando ou não).
    cobrancas.push(resolverCobrancaDaRegra(sementeDoLance(semente, 'cobranca', i), i, gestos.cobrancas[i], d, tabela, gestos.cobrancas));
    defesas.push(resolverDefesa(sementeDoLance(semente, 'defesa', i), i, gestos.defesas[i], d, gravadas?.[i], tabela));
  }
  if (precisaDeOutraRodada(cobrancas, defesas)) throw new Error('Faltam rodadas de morte súbita.');

  let parOuImpar: ResultadoParOuImpar | undefined;
  if (precisaDeParOuImpar(cobrancas, defesas)) {
    if (!gestos.parOuImpar || numeroNarrador === undefined) throw new Error('Falta o par ou ímpar.');
    parOuImpar = resolverParOuImpar(gestos.parOuImpar, numeroNarrador);
  } else if (gestos.parOuImpar) {
    throw new Error('Par ou ímpar sem empate.');
  }
  return totalizar(cobrancas, defesas, parOuImpar, tabela);
}

/**
 * Soma a partida. As cobranças e defesas têm de ter sido resolvidas com a mesma `tabela` (os pontos de cada
 * defesa já vêm nela). Com `tabela.teto`, o total nunca passa dele.
 */
export function totalizar(
  cobrancas: ResultadoCobranca[],
  defesas: ResultadoDefesa[],
  parOuImpar?: ResultadoParOuImpar,
  tabela: RegraPenaltis = PONTOS,
): ResultadoPartida {
  const golsJogador = contarGols(cobrancas);
  const golsMaquina = contarSofridos(defesas);
  const empatado = golsJogador === golsMaquina;
  if (empatado && !parOuImpar) throw new Error('Disputa empatada precisa do par ou ímpar.');
  const venceu = empatado ? parOuImpar!.ganhou : golsJogador > golsMaquina;
  const decisao: Decisao = empatado
    ? 'par_ou_impar'
    : defesas.length > COBRANCAS
      ? 'morte_subita'
      : 'tempo_normal';
  const cincoCobrancas = contarGols(cobrancas.slice(0, COBRANCAS)) === COBRANCAS;
  // Defesa que não vale pontos (chute gravado fraco) também não conta para o 5 de 5.
  const cincoDefesas =
    defesas.slice(0, COBRANCAS).filter((d) => d.desfecho === 'defesa' && d.pontos > 0).length === COBRANCAS;

  const pontos: Pontuacao = {
    gols: ehGoleiroComAlcance(tabela) ? pontosDaColocacao(cobrancas, tabela) : golsJogador * tabela.gol,
    angulos: cobrancas.filter((c) => c.desfecho === 'gol' && c.angulo).length * tabela.angulo,
    cavadinhas: cobrancas.filter((c) => c.desfecho === 'gol' && c.cavadinha).length * tabela.cavadinha,
    defesas: defesas.reduce((soma, d) => soma + d.pontos, 0),
    vitoria: venceu ? tabela.vitoria : 0,
    cincoDeCinco: (cincoCobrancas ? tabela.cincoDeCinco : 0) + (cincoDefesas ? tabela.cincoDeCinco : 0),
    total: 0,
  };
  const soma =
    pontos.gols + pontos.angulos + pontos.cavadinhas + pontos.defesas + pontos.vitoria + pontos.cincoDeCinco;
  // Guarda do teto (Lances unificados): com a tabela de 08/11 nunca dispara; a tabela de antes não tem teto.
  pontos.total = tabela.teto === undefined ? soma : Math.min(soma, tabela.teto);

  return {
    cobrancas,
    defesas,
    golsJogador,
    golsMaquina,
    rodadasExtras: Math.max(0, defesas.length - COBRANCAS),
    cincoCobrancas,
    cincoDefesas,
    venceu,
    decisao,
    parOuImpar,
    pontos,
  };
}
