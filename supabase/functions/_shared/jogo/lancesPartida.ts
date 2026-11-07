// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Lances do Jogo valendo pontos, lance a lance (jogo.md, seção 7.3, "Anti-trapaça"), como os pênaltis (seção 6):
// as sementes ficam só no servidor. O celular manda o gesto de um lance e recebe o resultado daquele lance, mais
// onde o goleiro começa no próximo. Depois do 3º, o servidor fecha a partida na mesma chamada.
// Uma semente por lance, sorteadas à parte: o resultado exato de um lance (x, y, goleiro) deixa achar a semente
// dele por força bruta (são 2^32), mas a do lance seguinte não tem nada a ver com ela.
// Módulo puro, usado pela função `lances` e pelos testes. Aqui também ficam o formato das respostas
// (o celular importa os tipos) e a detecção de partidas impossíveis dos Lances.

import {
  FAIXAS,
  LANCES_POR_PARTIDA,
  resolverLance,
  goleiroAntesDoChute,
  TABELA_LANCES_ANTES,
  type CenaLance,
  type Faixa,
  type Lance,
  type ResultadoLance,
  type TabelaLances,
} from './lances.ts';
import { normalizarCobranca, type GestoCobranca } from './penaltis.ts';

/**
 * Partidas valendo por dia antes dos Lances unificados (ajustável em config_deteccao, chave `lances_por_dia`).
 * A partir de 08/11/2026 vale LANCES_PARTIDAS_POR_DIA_UNIFICADO (regraLances.ts), somando os três tipos.
 */
export const LANCES_PARTIDAS_POR_DIA = 6;

export class LanceForaDeOrdem extends Error {}

/**
 * Onde o goleiro começa, para o desenho, arredondado em centésimos da meia-largura do gol (~4 cm). Vai ANTES
 * do chute: com a posição exata daria para tentar achar, por força bruta, a semente do lance (e com ela o
 * tremor da bola e se o goleiro lê o chute). Arredondado, sobram centenas de milhões de sementes possíveis.
 */
export function goleiroParaOCelular(semente: number, i: number, cena: CenaLance): number {
  return Math.round(goleiroAntesDoChute(semente, i, cena) * 100) / 100;
}

/** Um lance resolvido, como vai para o celular e para `partidas.resultado`. */
export interface LanceJogado extends ResultadoLance {
  lanceId: string;
  faixa: Faixa;
  /** Gesto já normalizado (inteiros), para a detecção de gesto de robô. */
  gesto: GestoCobranca;
}

export interface ResultadoPartidaLancesServidor {
  lances: LanceJogado[];
  gols: number;
  recriados: number;
  pontos: number;
}

/** O que fica guardado em partidas_segredo.gestos enquanto a partida está aberta. */
export interface GestosLances {
  lances: string[];
  /** Uma semente por lance (0 a 2^32 - 1). Nunca sai do servidor. */
  sementes: number[];
  cobrancas: GestoCobranca[];
  /**
   * Faixa de cada lance, decidida ao começar (regra nova: catálogo recalibrado ou faixa corrigida pela taxa real).
   * Sem ela (partidas de antes), vale a do catálogo. Mudança de faixa depois nunca mexe nesta partida.
   */
  faixas?: Faixa[];
  /** X1 recebido: o código do desafio (fica aqui porque partidas.desafio_id é dos pênaltis). */
  desafio?: string;
}

/** As cenas da partida com a faixa gravada ao começar (se houver). Faixa fora da lista é recusada. */
export function cenasComFaixa(cenas: readonly Lance[], faixas?: readonly Faixa[] | null): Lance[] {
  if (!faixas) return [...cenas];
  if (faixas.length !== cenas.length || !faixas.every((f) => FAIXAS.includes(f))) {
    throw new LanceForaDeOrdem('faixas guardadas com formato errado');
  }
  return cenas.map((c, i) => ({ ...c, faixa: faixas[i] }));
}

export interface JogadaLance {
  gestos: GestosLances;
  lance: LanceJogado;
  /** Onde o goleiro começa no próximo lance (arredondado), ou null depois do último. */
  goleiroProximo: number | null;
}

function jogado(semente: number, i: number, cena: Lance, gesto: GestoCobranca, tabela: TabelaLances): LanceJogado {
  return { ...resolverLance(semente, i, cena, gesto, tabela), lanceId: cena.id, faixa: cena.faixa, gesto };
}

function conferir(cenas: readonly Lance[], sementes: readonly number[]): void {
  if (cenas.length !== LANCES_POR_PARTIDA || sementes.length !== LANCES_POR_PARTIDA) {
    throw new LanceForaDeOrdem('a partida tem 3 lances, com uma semente para cada');
  }
}

/**
 * Joga o lance `i`. Só aceita o próximo da fila (nem repetido, nem pulando) e no máximo 3.
 * `cenas` vem do catálogo do servidor, pelos ids escolhidos ao começar; o celular nunca manda a cena.
 */
export function jogarLanceDoJogo(
  cenas: readonly Lance[],
  gestos: GestosLances,
  i: number,
  gestoBruto: GestoCobranca,
  tabela: TabelaLances = TABELA_LANCES_ANTES,
): JogadaLance {
  const { sementes } = gestos;
  conferir(cenas, sementes);
  if (!Number.isInteger(i) || i !== gestos.cobrancas.length || i >= LANCES_POR_PARTIDA) {
    throw new LanceForaDeOrdem(`esperava o lance ${gestos.cobrancas.length}, veio ${i}`);
  }
  const gesto = normalizarCobranca(gestoBruto);
  const novos: GestosLances = {
    lances: [...gestos.lances],
    sementes: [...sementes],
    cobrancas: [...gestos.cobrancas, gesto],
    ...(gestos.faixas ? { faixas: [...gestos.faixas] } : {}),
    ...(gestos.desafio ? { desafio: gestos.desafio } : {}),
  };
  return {
    gestos: novos,
    lance: jogado(sementes[i], i, cenas[i], gesto, tabela),
    goleiroProximo: i + 1 < LANCES_POR_PARTIDA ? goleiroParaOCelular(sementes[i + 1], i + 1, cenas[i + 1]) : null,
  };
}

/** Recalcula a partida inteira a partir dos gestos guardados (é o que o servidor grava). */
export function fecharPartidaLances(
  sementes: readonly number[],
  cenas: readonly Lance[],
  gestos: readonly GestoCobranca[],
  tabela: TabelaLances = TABELA_LANCES_ANTES,
): ResultadoPartidaLancesServidor {
  conferir(cenas, sementes);
  if (gestos.length !== LANCES_POR_PARTIDA) throw new LanceForaDeOrdem('a partida tem 3 lances, com um gesto para cada');
  const lances = cenas.map((c, i) => jogado(sementes[i], i, c, normalizarCobranca(gestos[i]), tabela));
  return {
    lances,
    gols: lances.filter((l) => l.desfecho === 'gol').length,
    recriados: lances.filter((l) => l.recriou).length,
    // Guarda do teto: com as tabelas de hoje a soma nunca passa dele.
    pontos: Math.min(tabela.teto, lances.reduce((s, l) => s + l.pontos, 0)),
  };
}

/** Regra nova: a partida é um lance só, tentado 3 vezes. */
export const tentativasDoLance = (id: string): string[] => Array.from({ length: LANCES_POR_PARTIDA }, () => id);
export const ehLanceRepetido = (ids: readonly string[]): boolean =>
  ids.length === LANCES_POR_PARTIDA && ids.every((id) => id === ids[0]);

// ---------- formato das respostas da função `lances` ----------

/**
 * acao 'nova': começa uma partida valendo. Regra nova (desde 08/11/2026): `{ lance: id }` ou `{ desafio: código }`,
 * e a partida são 3 tentativas desse lance. Antes do corte também vale a lista antiga `{ lances: [id, id, id] }`.
 */
export interface RespostaNovaLances {
  partidaId: string;
  expiraEm: string;
  /** Os 3 ids da partida (na regra nova, o mesmo 3 vezes) e a faixa de cada um nesta partida. */
  lances?: string[];
  faixas?: Faixa[];
  /** X1 recebido: quem desafiou e os pontos a bater (empate fica com quem desafiou). */
  desafio?: { codigo: string; timeId: string; apelido: string | null; pontos: number } | null;
  /** Onde o goleiro começa no 1º lance (x de -1 a 1, arredondado). */
  goleiroX: number;
  /** Partidas valendo que ainda dá para começar hoje, já contando esta. */
  restantesHoje: number;
}

/** Posição nos Lances na semana (pela melhor partida) e recorde pessoal. */
export interface DesempenhoLances {
  posicao: number | null;
  total: number;
  recorde: number | null;
  novo_recorde: boolean;
}

export interface MedalhaNova {
  lanceId: string;
  medalha: 'bronze' | 'prata' | 'ouro';
}

/** Só no 3º lance: a partida já foi fechada e gravada no servidor. */
export interface FechamentoLances {
  resultado: ResultadoPartidaLancesServidor;
  semana: string;
  /** Virou a melhor partida dos Lances do dia (só ela conta no ranking) e não está sob suspeita. */
  contaNoRanking: boolean;
  sobSuspeita: boolean;
  /** Pontos da melhor partida dos Lances hoje, já contando esta (null se nenhuma vale). */
  melhorDoDia: number | null;
  ranking: {
    antes: { posicao_campeao: number; posicao_soma: number; media30: number; soma: number } | null;
    depois: { posicao_campeao: number; posicao_soma: number; media30: number; soma: number } | null;
  };
  /** Hora do servidor logo depois de gravar (o ranking da semana sai na rotina do minuto). */
  confirmadaEm: string;
  desempenho: DesempenhoLances | null;
  /** Medalhas que esta partida fez subir (bronze, prata ou ouro num lance). */
  medalhas: MedalhaNova[];
  restantesHoje: number;
  /** Regra nova: as 3 melhores partidas de Lances de hoje (pênaltis, faltas e cara a cara), em pontos. */
  melhoresDoDia?: number[];
  /** Regra nova, partida normal: o código do X1 que esta partida gerou. */
  desafio?: { codigo: string } | null;
  /** X1 recebido: o placar de quem desafiou e se esta partida venceu (mais pontos; empate fica com quem desafiou). */
  comparacao?: { desafiante: string | null; pontosDesafiante: number; venceu: boolean } | null;
}

/** acao 'lance': o resultado de um lance; `fim` só vem no 3º. */
export interface RespostaLanceDoJogo {
  lance: LanceJogado;
  goleiroProximo: number | null;
  fim: FechamentoLances | null;
}

// ---------- detecção (jogo.md, seção 7.3, "Anti-trapaça") ----------

export interface ConfigDeteccaoLances {
  /** Últimas N tentativas valendo do MESMO lance, para o gesto de robô. */
  janelaGesto: number;
  /** Marca se direção e força variam no máximo isto na janela (uma pessoa varia ~7 de um chute para o outro). */
  espalhamentoMax: number;
  /** Últimas N tentativas valendo em lances Difícil ou Craque. */
  janelaGols: number;
  /** Marca com pelo menos isto de gols na janela: acima até da mira perfeita (no máximo ~68% num lance Difícil). */
  minGols: number;
}

export const DETECCAO_LANCES_PADRAO: ConfigDeteccaoLances = { janelaGesto: 15, espalhamentoMax: 2, janelaGols: 30, minGols: 27 };

type Tentativa = Pick<LanceJogado, 'lanceId' | 'faixa' | 'gesto' | 'desfecho'>;

/**
 * Recebe os resultados das partidas valendo dos Lances, da MAIS RECENTE para a mais antiga (incluindo a que
 * acabou de fechar), e devolve o motivo da suspeita, ou null. Resultado de outro formato é ignorado.
 */
export function motivoSuspeitaLances(
  partidas: readonly { lances?: readonly Tentativa[] }[],
  cfg: ConfigDeteccaoLances = DETECCAO_LANCES_PADRAO,
): string | null {
  const tentativas = partidas
    .filter((p) => Array.isArray(p?.lances))
    .flatMap((p) => [...(p.lances as Tentativa[])].reverse())
    .filter((t) => t && typeof t.lanceId === 'string' && t.gesto);

  // 1. Gesto de robô: o mesmo chute repetido quase sem variação, no mesmo lance.
  const porLance = new Map<string, GestoCobranca[]>();
  for (const t of tentativas) {
    const lista = porLance.get(t.lanceId) ?? [];
    if (lista.length < cfg.janelaGesto) lista.push(t.gesto);
    porLance.set(t.lanceId, lista);
  }
  for (const [id, gestos] of porLance) {
    if (gestos.length < cfg.janelaGesto) continue;
    const faixa = (eixo: 'dir' | 'forca') => Math.max(...gestos.map((g) => g[eixo])) - Math.min(...gestos.map((g) => g[eixo]));
    if (faixa('dir') <= cfg.espalhamentoMax && faixa('forca') <= cfg.espalhamentoMax) {
      return `gesto repetido: ${cfg.janelaGesto} chutes iguais em ${id}`;
    }
  }

  // 2. Gols demais nos lances difíceis: acima do que acerta quem mira no melhor gesto sem errar a mão.
  const dificeis = tentativas.filter((t) => t.faixa === 'dificil' || t.faixa === 'craque').slice(0, cfg.janelaGols);
  if (dificeis.length === cfg.janelaGols) {
    const gols = dificeis.filter((t) => t.desfecho === 'gol').length;
    if (gols >= cfg.minGols) return `lances difíceis: ${gols} gols em ${cfg.janelaGols}`;
  }
  return null;
}
