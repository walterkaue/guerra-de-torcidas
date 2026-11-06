// Aquecimento (docs/jogo.md, seção 14.4): 5 estações de um toque logo depois de escolher o time.
// Puro: sem DOM, sem rede. A tela fica em telas/aquecimento.ts.

import type { Placar } from './crava';

export type Estacao = 'penalti' | 'defesa' | 'falta' | 'prova' | 'crava';

/** Ordem fixa das estações. O número de cada uma (1 a 5) é o da métrica, mesmo quando o Crava some. */
export const ESTACOES: readonly Estacao[] = ['penalti', 'defesa', 'falta', 'prova', 'crava'];

export const numeroDaEstacao = (e: Estacao): number => ESTACOES.indexOf(e) + 1;

/** XP de Carreira de quem completa, uma vez só (dado pelo servidor; não mexe no ranking). */
export const XP_AQUECIMENTO = 20;

export interface TextoDaEstacao {
  /** Rótulo curto da barrinha e da lista do fim. */
  nome: string;
  /** Frase da mão animada, na faixa de instrução. */
  frase: string;
}

export const TEXTO_DA_ESTACAO: Record<Estacao, TextoDaEstacao> = {
  penalti: { nome: 'Pênalti', frase: 'Arraste da bola pro gol.' },
  defesa: { nome: 'Defesa', frase: 'Olhe o pé de apoio, marcado em amarelo, e toque onde pular.' },
  falta: { nome: 'Falta com barreira', frase: 'Passe por cima ou ao lado da barreira.' },
  prova: { nome: 'Prova', frase: 'Toque na resposta antes do tempo.' },
  crava: { nome: 'Crava', frase: 'Use − e + e toque em Cravar.' },
};

/** As estações desta vez: sem jogo do time aberto na rodada, o Crava some. */
export function estacoesDoAquecimento(temJogoDoTime: boolean): Estacao[] {
  return ESTACOES.filter((e) => e !== 'crava' || temJogoDoTime);
}

/** "3/5": a barrinha conta só as estações desta vez (sem Crava, vai até 4). */
export function progresso(estacoes: readonly Estacao[], atual: Estacao): string {
  return `${estacoes.indexOf(atual) + 1}/${estacoes.length}`;
}

/** Jogo mínimo para escolher o do Crava (o tipo do servidor tem mais campos). */
export interface JogoParaAquecer {
  id: string;
  mandante_id: string;
  visitante_id: string;
  inicio: string;
  confirmado_em: string | null;
  anulado: boolean;
}

/**
 * O próximo jogo do time que ainda aceita palpite (começa depois de agora, nem confirmado nem anulado).
 * Só olha a rodada em foco: a tela passa os jogos dela. "Outro time" nunca tem jogo.
 */
export function jogoDoTimeParaCravar<J extends JogoParaAquecer>(jogos: readonly J[], timeId: string, agora: Date): J | null {
  const abertos = jogos
    .filter((j) => (j.mandante_id === timeId || j.visitante_id === timeId) && !j.anulado && !j.confirmado_em)
    .filter((j) => Date.parse(j.inicio) > agora.getTime())
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  return abertos[0] ?? null;
}

/** Placar inicial do Crava do aquecimento: 1 x 1, para o − e o + terem para onde ir. */
export const PLACAR_INICIAL: Placar = { m: 1, v: 1 };

// ---------------------------------------------------------------------------
// Pergunta da estação 4: própria do aquecimento, fora do banco da Prova. Regra do jogo (seção 7.1 aceita
// "regras do jogo"), fato fechado. Fonte: Regras do Jogo da IFAB, Regra 3 ("Os jogadores").
// ---------------------------------------------------------------------------
export interface PerguntaDoAquecimento {
  texto: string;
  alternativas: readonly string[];
  certa: number;
  fonte: string;
  /** Segundos no relógio (a Prova usa 15). */
  tempo: number;
}

export const PERGUNTA_AQUECIMENTO: PerguntaDoAquecimento = {
  texto: 'Quantos jogadores cada time põe em campo no começo de uma partida?',
  alternativas: ['9', '10', '11', '12'],
  certa: 2,
  fonte: 'https://www.theifab.com/laws/latest/the-players/',
  tempo: 15,
};

// ---------------------------------------------------------------------------
// Narrador: um grito curto por estação, acertando ou não (docs/narrador.md, seção 14).
// ---------------------------------------------------------------------------
export const GRITO_ACERTOU: Record<Estacao, readonly string[]> = {
  penalti: ['É GOL! No jogo valendo, isso é ponto.', 'Na rede! Tá aquecido esse pé.'],
  defesa: ['PEGOU! Leu o pé e foi buscar.', 'Defesa! O gol tá trancado hoje.'],
  falta: ['Por cima da barreira! Que cobrança.', 'Passou da barreira e foi pra rede!'],
  prova: ['Na mosca! Começou bem a prova.', 'Certinha! Tem cabeça de boleiro.'],
  crava: ['Cravado! Esse vale de verdade.', 'Palpite feito! Agora é torcer.'],
};

export const GRITO_ERROU: Record<Estacao, readonly string[]> = {
  penalti: ['Quase! No jogo valendo você acerta.', 'Passou perto! Aquecimento é pra isso.'],
  defesa: ['Quase! No jogo valendo você pega.', 'Foi no outro canto! Agora você já sabe.'],
  falta: ['Quase! No jogo valendo você acerta.', 'A barreira ganhou essa. A próxima é sua.'],
  prova: ['Quase! Na Prova de verdade você acerta.', 'Essa escapou! A próxima você crava.'],
  crava: ['Palpite feito! Agora é torcer.'],
};

/** Grito da estação, sem repetir o último quando dá. `sorteio` em [0, 1). */
export function gritoDaEstacao(e: Estacao, acertou: boolean, sorteio: number): string {
  const lista = (acertou ? GRITO_ACERTOU : GRITO_ERROU)[e];
  return lista[Math.min(lista.length - 1, Math.floor(sorteio * lista.length))];
}

/** Título do fim: "Aquecido! Agora vale ponto pro Flamengo" (sem time oficial: "de verdade"). */
export function tituloDoFim(proTime: string | null): string {
  return `Aquecido! Agora vale ponto ${proTime ?? 'de verdade'}`;
}

// ---------------------------------------------------------------------------
// Estado no aparelho (gdt:prefs.aquecimento) e a métrica
// ---------------------------------------------------------------------------
export type Desfecho = 'completou' | 'pulou' | 'parou';

export interface EstadoDoAquecimento {
  /** Em andamento: a estação aberta agora (1 a 5). Some quando termina ou pula. */
  emAndamento?: number;
  /** Já terminou (completou ou pulou) neste aparelho: não abre sozinho de novo. */
  visto?: boolean;
  /** Completou pelo menos uma vez: selo "Aquecido" no Perfil. */
  aquecido?: boolean;
  /** Veio por link de desafio: o card "Conheça os outros jogos" fica na Home até abrir. */
  cardNaHome?: boolean;
  /** Desfecho que ainda não chegou ao servidor (sem rede ou sem torcedor sincronizado). */
  pendente?: { desfecho: Desfecho; estacao: number | null };
}

/** Abre sozinho depois de escolher o time? Só na primeira vez do aparelho e fora do link de desafio. */
export function abreSozinho(e: EstadoDoAquecimento, veioPorDesafio: boolean): boolean {
  return !e.visto && e.emAndamento === undefined && !veioPorDesafio;
}

/**
 * Na abertura seguinte: quem fechou o app no meio do aquecimento "parou" naquela estação.
 * Devolve o estado novo (já sem o andamento, com o desfecho pendente para mandar) ou null se nada mudou.
 */
export function fecharAbandonado(e: EstadoDoAquecimento): EstadoDoAquecimento | null {
  if (e.emAndamento === undefined) return null;
  const { emAndamento, ...resto } = e;
  return { ...resto, visto: true, pendente: resto.pendente ?? { desfecho: 'parou', estacao: emAndamento } };
}

type Pendente = NonNullable<EstadoDoAquecimento['pendente']>;

/** Desfecho que não chegou ao servidor: um `completou` guardado nunca é trocado por outro (é o que dá o XP). */
export function guardarPendente(atual: Pendente | undefined, novo: Pendente): Pendente {
  return atual?.desfecho === 'completou' ? atual : novo;
}

/** Depois de um envio que deu certo: só some o pendente que é o mesmo que acabou de chegar. */
export function limparPendente(atual: Pendente | undefined, enviado: Pendente): Pendente | undefined {
  return atual && atual.desfecho === enviado.desfecho && atual.estacao === enviado.estacao ? undefined : atual;
}
