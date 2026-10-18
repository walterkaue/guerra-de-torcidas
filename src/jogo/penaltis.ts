// Motor puro do "Bate Contra Mim". Sem DOM, sem relógio, sem Math.random:
// mesma semente + mesmos gestos = mesmo resultado, no navegador e no servidor.
// Evite funções trigonométricas aqui: só aritmética básica é idêntica entre motores.

import { criarAleatorio, inteiro, misturar } from './aleatorio';

/** Cobranças (e defesas) do tempo normal. */
export const COBRANCAS = 5;
/** Rodadas de morte súbita (1 cobrança + 1 defesa) se empatar; depois disso fica empate. */
export const RODADAS_EXTRAS_MAX = 5;
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

export interface Gestos {
  cobrancas: GestoCobranca[];
  defesas: GestoDefesa[];
}

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
  pontos: number;
}

export interface PlanoDefesa {
  /** Zona para onde a máquina vai bater. */
  alvo: number;
  /** Coluna para onde o pé de apoio aponta (a "dica"). Nem sempre é honesta. */
  dica: number;
  /** A máquina vai isolar ou mandar na trave. */
  erra: boolean;
}

export type DesfechoDefesa = 'defesa' | 'gol' | 'fora';

export interface ResultadoDefesa {
  desfecho: DesfechoDefesa;
  alvo: number;
  zonaGoleiro: number;
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
  venceu: boolean;
  empate: boolean;
  pontos: Pontuacao;
}

export const PONTOS = {
  gol: 10,
  angulo: 5,
  cavadinha: 10,
  defesa: 10,
  vitoria: 20,
  cincoDeCinco: 25,
} as const;

const SAL_COBRANCA = 0xc0b;
const SAL_DEFESA = 0xdef;

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

/** Resolve a cobrança i do jogador contra o goleiro da máquina. */
export function resolverCobranca(
  semente: number,
  i: number,
  gestoBruto: GestoCobranca,
  dificuldade: number,
): ResultadoCobranca {
  const g = normalizarCobranca(gestoBruto);
  const rnd = criarAleatorio(misturar(semente, SAL_COBRANCA, i));
  const tremX = (rnd() - 0.5) * 0.12;
  const tremY = (rnd() - 0.5) * 0.12;
  const leitura = rnd();
  const zonaChute = inteiro(rnd, ZONAS);
  const sorteAngulo = rnd();

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
  x = limitar(x, -1.6, 1.6);
  y = limitar(y, 0, 1.6);

  const zonaBola = zonaDoPonto(limitar(x, -1, 1), limitar(y, 0, 1));

  // O goleiro da máquina lê o chute com chance maior quando a dificuldade sobe.
  // Na segunda o goleiro pega ~27% dos chutes bons; no domingo, ~45%.
  const chanceLer = 0.12 + 0.24 * dificuldade + (fraca ? 0.4 : 0);
  let zonaGoleiro = leitura < chanceLer ? zonaBola : zonaChute;
  // Contra a cavadinha, o goleiro que lê fica parado no meio.
  if (cavadinha && leitura < chanceLer) zonaGoleiro = 1;

  const base: Omit<ResultadoCobranca, 'desfecho' | 'pontos' | 'angulo' | 'raspouTrave'> = {
    x,
    y,
    zonaBola,
    zonaGoleiro,
    cavadinha,
    fraca,
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

  const pontos = PONTOS.gol + (angulo ? PONTOS.angulo : 0) + (cavadinha ? PONTOS.cavadinha : 0);
  return { ...base, desfecho: 'gol', angulo, raspouTrave, pontos };
}

/** O que a máquina vai fazer na cobrança i (mostrado ao jogador só como "dica"). */
export function planejarDefesa(semente: number, i: number, dificuldade: number): PlanoDefesa {
  const rnd = criarAleatorio(misturar(semente, SAL_DEFESA, i));
  const alvo = inteiro(rnd, ZONAS);
  const honesta = rnd() < 0.85 - 0.35 * dificuldade;
  const outra = inteiro(rnd, 2);
  const erra = rnd() < 0.08;
  const col = coluna(alvo);
  const dica = honesta ? col : [0, 1, 2].filter((c) => c !== col)[outra];
  return { alvo, dica, erra };
}

/** Resolve a defesa i: o jogador escolheu uma zona (ou -1). */
export function resolverDefesa(
  semente: number,
  i: number,
  zonaBruta: GestoDefesa,
  dificuldade: number,
): ResultadoDefesa {
  const plano = planejarDefesa(semente, i, dificuldade);
  const zonaGoleiro = normalizarDefesa(zonaBruta);
  // Sorteio próprio para o "quase" (mesma coluna, altura errada).
  const rnd = criarAleatorio(misturar(semente, SAL_DEFESA, i, 0x51));
  const sorteQuase = rnd();

  if (plano.erra) return { desfecho: 'fora', alvo: plano.alvo, zonaGoleiro, pontos: 0 };

  let defendeu = false;
  if (zonaGoleiro === plano.alvo) defendeu = true;
  else if (zonaGoleiro >= 0 && coluna(zonaGoleiro) === coluna(plano.alvo)) defendeu = sorteQuase < 0.4;

  return defendeu
    ? { desfecho: 'defesa', alvo: plano.alvo, zonaGoleiro, pontos: PONTOS.defesa }
    : { desfecho: 'gol', alvo: plano.alvo, zonaGoleiro, pontos: 0 };
}

const contarGols = (c: readonly ResultadoCobranca[]) => c.filter((r) => r.desfecho === 'gol').length;
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

/** Recalcula a partida inteira. É esta função que o servidor vai rodar. */
export function simularPartida(semente: number, gestos: Gestos, dificuldade: number): ResultadoPartida {
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
    cobrancas.push(resolverCobranca(semente, i, gestos.cobrancas[i], d));
    defesas.push(resolverDefesa(semente, i, gestos.defesas[i], d));
  }
  if (precisaDeOutraRodada(cobrancas, defesas)) throw new Error('Faltam rodadas de morte súbita.');
  return totalizar(cobrancas, defesas);
}

export function totalizar(cobrancas: ResultadoCobranca[], defesas: ResultadoDefesa[]): ResultadoPartida {
  const golsJogador = contarGols(cobrancas);
  const golsMaquina = contarSofridos(defesas);
  const nDefesas = defesas.filter((d) => d.desfecho === 'defesa').length;
  const venceu = golsJogador > golsMaquina;
  const empate = golsJogador === golsMaquina;
  const cincoCobrancas = contarGols(cobrancas.slice(0, COBRANCAS)) === COBRANCAS;
  const cincoDefesas = defesas.slice(0, COBRANCAS).filter((d) => d.desfecho === 'defesa').length === COBRANCAS;

  const pontos: Pontuacao = {
    gols: golsJogador * PONTOS.gol,
    angulos: cobrancas.filter((c) => c.desfecho === 'gol' && c.angulo).length * PONTOS.angulo,
    cavadinhas: cobrancas.filter((c) => c.desfecho === 'gol' && c.cavadinha).length * PONTOS.cavadinha,
    defesas: nDefesas * PONTOS.defesa,
    vitoria: venceu ? PONTOS.vitoria : 0,
    cincoDeCinco: (cincoCobrancas ? PONTOS.cincoDeCinco : 0) + (cincoDefesas ? PONTOS.cincoDeCinco : 0),
    total: 0,
  };
  pontos.total =
    pontos.gols + pontos.angulos + pontos.cavadinhas + pontos.defesas + pontos.vitoria + pontos.cincoDeCinco;

  return {
    cobrancas,
    defesas,
    golsJogador,
    golsMaquina,
    rodadasExtras: Math.max(0, defesas.length - COBRANCAS),
    cincoCobrancas,
    cincoDefesas,
    venceu,
    empate,
    pontos,
  };
}
