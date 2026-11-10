// Textos e regras puras da fita e do telão do desafio dos Lances (docs/jogos/lances.md, "Desafio dos Lances"): as 3
// tentativas de quem chamou, que o convite (?l=) e o resultado do desafio recebido mostram. Só desenho e texto: nada
// aqui muda pontos nem resultado.
// Entra no caminho do link (E01): sem import em tempo de execução (só tipos), para não puxar o motor dos Lances.
// Textos neutros de gênero: "de {apelido}", nunca "do/da {apelido}" (o artigo é do time, não da pessoa).

import type { NomeIcone } from '../telas/icones';
import type { DesfechoLance } from './lances';
import type { TentativaDoDesafio } from './tentativasDoDesafio';

/** O que a fita precisa de uma tentativa (a de quem chamou vem do resumo; a sua, do resultado da partida). */
export type TentativaVista = Pick<TentativaDoDesafio, 'desfecho' | 'recriou' | 'pontos'>;

const ordinal = (i: number): string => `${i + 1}ª`;
const ptos = (n: number): string => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;

// ---------- a fita: 3 casas ----------

export interface CasaDaFita {
  /** Gol (inclusive o carimbado): casa âmbar. */
  gol: boolean;
  carimbou: boolean;
  icone: NomeIcone;
  /** Carimbou, Gol, Pegou, Barreira, Trave ou Fora. */
  palavra: string;
  /** "+50" ou "0". */
  pontos: string;
  /** "1ª tentativa: carimbou o lance, 50 pontos". */
  rotulo: string;
}

const ICONE_DO_DESFECHO: Record<DesfechoLance, NomeIcone> = { gol: 'bola', defesa: 'mao', barreira: 'barreira', trave: 'xis', fora: 'xis' };
const PALAVRA_DO_DESFECHO: Record<Exclude<DesfechoLance, 'gol'>, string> = { defesa: 'Pegou', barreira: 'Barreira', trave: 'Trave', fora: 'Fora' };
const FRASE_DO_DESFECHO: Record<Exclude<DesfechoLance, 'gol'>, string> = {
  defesa: 'o goleiro pegou',
  barreira: 'bateu na barreira',
  trave: 'bateu na trave',
  fora: 'chutou pra fora',
};

/** A casa `i` (de 0 a 2) da fita: ícone, palavra curta, pontos e o texto para leitor de tela. */
export function casaDaFita(t: TentativaVista, i: number): CasaDaFita {
  const gol = t.desfecho === 'gol';
  const carimbou = gol && t.recriou;
  let palavra = carimbou ? 'Carimbou' : 'Gol';
  let o = carimbou ? 'carimbou o lance' : 'gol';
  if (t.desfecho !== 'gol') {
    palavra = PALAVRA_DO_DESFECHO[t.desfecho];
    o = FRASE_DO_DESFECHO[t.desfecho];
  }
  return {
    gol,
    carimbou,
    icone: ICONE_DO_DESFECHO[t.desfecho],
    palavra,
    pontos: t.pontos > 0 ? `+${t.pontos}` : '0',
    rotulo: `${ordinal(i)} tentativa: ${o}, ${ptos(t.pontos)}`,
  };
}

// ---------- o telão: só os gols, na ordem ----------

export interface GolDoTelao<T extends TentativaVista = TentativaDoDesafio> {
  /** A posição da tentativa na fita (0 a 2). */
  indice: number;
  tentativa: T;
}

/** A sequência do telão: só as tentativas que terminaram em gol, na ordem em que foram feitas. */
export function sequenciaDeGols<T extends TentativaVista>(tentativas: readonly T[] | null | undefined): GolDoTelao<T>[] {
  return (tentativas ?? []).flatMap((tentativa, indice) => (tentativa.desfecho === 'gol' ? [{ indice, tentativa }] : []));
}

/** A tarja inclinada do telão: "REPLAY · 2ª TENTATIVA". */
export const tarjaDoReplay = (indice: number): string => `REPLAY · ${ordinal(indice).toUpperCase()} TENTATIVA`;

/** A legenda embaixo à esquerda: "Carimbou o lance! +50" ou "Gol +42". */
export function legendaDoTelao(t: TentativaVista): string {
  return t.recriou ? `Carimbou o lance! +${t.pontos}` : `Gol +${t.pontos}`;
}

/** Parado no último quadro de cada gol antes de passar ao próximo (ms). */
export const PARADO_NO_FIM_MS = 900;

// ---------- quem chamou ----------

/** "Camisa10" ou, sem apelido, "quem te chamou" (para entrar depois de "de"). */
export const quemChamou = (apelido?: string | null): string => apelido?.trim() || 'quem te chamou';

/** O rótulo de uma fita no resultado: o apelido ou "Quem te chamou". */
export const rotuloDaFitaDele = (apelido?: string | null): string => apelido?.trim() || 'Quem te chamou';

/** O texto para leitor de tela do canvas do telão. */
export const rotuloDoTelao = (apelido: string | null | undefined, titulo: string): string =>
  `Replay dos gols de ${quemChamou(apelido)} no lance ${titulo}`;

/** Convite de desafio vencido: o aviso fica e os gols continuam aqui. */
export const linhaDosGolsContinuam = (apelido?: string | null): string => `Os gols de ${quemChamou(apelido)} continuam aqui pra você ver.`;

/** O botão do resultado que abre a folha com o telão. */
export const botaoVerOsGols = (apelido?: string | null): string => `Ver os gols de ${quemChamou(apelido)}`;

const ROTULO_DA_FAIXA: Record<string, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', craque: 'Craque' };

/** "Fácil", "Média", "Difícil" ou "Craque"; faixa que não conhecemos: null. */
export const rotuloDaFaixa = (faixa: string): string | null => ROTULO_DA_FAIXA[faixa] ?? null;

/**
 * Sem nenhum gol nas 3: "Nenhum gol nas 3. Mesmo lance, mesma faixa: Difícil, gol vale 36." `pontosDoGol` é o da tabela
 * de hoje para a faixa (TABELA_LANCES_UNIFICADA.faixa); sem ele ou com faixa desconhecida, a linha perde o pedaço que falta.
 */
export function linhaNenhumGol(faixa: string, pontosDoGol?: number | null): string {
  const f = rotuloDaFaixa(faixa);
  if (!f) return 'Nenhum gol nas 3. Mesmo lance, mesma faixa.';
  return `Nenhum gol nas 3. Mesmo lance, mesma faixa: ${f}${pontosDoGol ? `, gol vale ${pontosDoGol}` : ''}.`;
}

// ---------- sem movimento: um quadro por vez ----------

export const BOTAO_PROXIMO_GOL = 'Próximo gol';
export const BOTAO_VER_DE_NOVO = 'Ver de novo';

export interface QuadroParado {
  /** A posição na sequência de gols. */
  gol: number;
  /** O quadro final (bola na rede) ou o do começo, antes do chute. */
  momento: 'fim' | 'inicio';
}

/**
 * Os quadros que o botão percorre quando nada roda sozinho: o final de cada gol, em ordem. Com um gol só, o final e o
 * começo (antes do chute), para o botão mostrar algo diferente.
 */
export function quadrosParados(nGols: number): QuadroParado[] {
  if (nGols <= 0) return [];
  if (nGols === 1) return [{ gol: 0, momento: 'fim' }, { gol: 0, momento: 'inicio' }];
  return Array.from({ length: nGols }, (_, gol) => ({ gol, momento: 'fim' as const }));
}

/** "Próximo gol" enquanto o próximo quadro é de outro gol; senão, "Ver de novo". */
export function botaoDoQuadroParado(quadros: readonly QuadroParado[], pos: number): string {
  const proximo = quadros[pos + 1];
  return proximo && proximo.gol !== quadros[pos].gol ? BOTAO_PROXIMO_GOL : BOTAO_VER_DE_NOVO;
}

/** Como o telão se comporta neste aparelho. */
export type ModoDoTelao = 'movimento' | 'parado' | 'sob_demanda';

/**
 * Economia de dados: nada roda nem baixa sozinho (o desenho, uns 35 KB, só vem no toque, como o preaquecer, que também
 * não baixa nada com ela). Movimento reduzido ou qualidade gráfica Leve: nada anima, mas o desenho baixa e o quadro final
 * do 1º gol aparece sozinho. O resto: roda sozinho.
 */
export function modoDoTelao(s: { reduzido: boolean; economiaDeDados: boolean; qualidadeLeve: boolean }): ModoDoTelao {
  if (s.economiaDeDados) return 'sob_demanda';
  return s.reduzido || s.qualidadeLeve ? 'parado' : 'movimento';
}

// ---------- os mesmos bonecos para o mesmo link ----------

/** Semente de 32 bits a partir do código do desafio (FNV-1a): o mesmo link sorteia sempre os mesmos rostos. */
export function sementeDoCodigo(codigo: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < codigo.length; i++) h = Math.imul(h ^ codigo.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** O botão do telão quando nada baixa sozinho (economia de dados): o toque busca o desenho e mostra o 1º gol. */
export const BOTAO_VER_OS_GOLS = 'Ver os gols';
