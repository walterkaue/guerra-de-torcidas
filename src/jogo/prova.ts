// Prova de Boleiro (docs/jogo.md, seção 7.1): escada, pontuação, ajudas, detecção e card em emoji.
// Módulo puro, compartilhado com a função "prova" do servidor (npm run compartilhar).
// Sem DOM, relógio nem Math.random: o sorteio vem de fora.

export const PERGUNTAS = 8;
export const SEGUNDOS = 15;
export const TOLERANCIA_SEGUNDOS = 2;
/** A partir da 3ª pergunta (índice 2), "Parar e levar X" ou "Seguir" antes de ela aparecer. */
export const PRIMEIRA_DECISAO = 2;
export const BONUS_PERFEITA = 24;

export type Degrau = 1 | 2 | 3 | 4;
export const NOME_DEGRAU: Record<Degrau, string> = { 1: 'Fácil', 2: 'Média', 3: 'Difícil', 4: 'Craque' };
/** Escada: 2 fáceis, 2 médias, 2 difíceis, 2 de craque. */
export const DEGRAU_DA_POSICAO: readonly Degrau[] = [1, 1, 2, 2, 3, 3, 4, 4];
export const PONTOS_DO_DEGRAU: Record<Degrau, number> = { 1: 8, 2: 12, 3: 18, 4: 25 };

export type Desfecho = 'acertou' | 'errou' | 'tempo';
export type Fim = 'parou' | 'errou' | 'tempo' | 'perfeita';
export type Ajuda = 'tira_duas' | 'arquibancada' | 'troca';
export const AJUDAS: readonly Ajuda[] = ['tira_duas', 'arquibancada', 'troca'];

export interface Passo {
  desfecho: Desfecho;
  /** Usou alguma ajuda nesta pergunta (inclusive a Troca). */
  ajuda: boolean;
}

export interface PontosProva {
  /** Perguntas certas em sequência. */
  acertos: number;
  /** Soma dos degraus acertados. */
  base: number;
  bonus: number;
  /** Errou ou estourou o tempo: leva metade, arredondada para cima. */
  total: number;
}

export const precisaDecidir = (indice: number) => indice >= PRIMEIRA_DECISAO && indice < PERGUNTAS;

/** Pontos garantidos com as `acertos` primeiras certas (o "Parar e levar X"). */
export function levar(acertos: number): number {
  let soma = 0;
  for (let i = 0; i < Math.min(acertos, PERGUNTAS); i++) soma += PONTOS_DO_DEGRAU[DEGRAU_DA_POSICAO[i]];
  return soma;
}

/** Como a partida acabou, a partir dos passos (null = ainda não acabou, pode parar ou seguir). */
export function fimDosPassos(passos: readonly Passo[]): Fim | null {
  const ultimo = passos[passos.length - 1];
  if (ultimo?.desfecho === 'errou') return 'errou';
  if (ultimo?.desfecho === 'tempo') return 'tempo';
  return passos.length >= PERGUNTAS ? 'perfeita' : null;
}

export function calcularPontos(passos: readonly Passo[]): PontosProva {
  if (passos.length > PERGUNTAS) throw new Error('passos demais');
  const i = passos.findIndex((p) => p.desfecho !== 'acertou');
  if (i >= 0 && i !== passos.length - 1) throw new Error('a partida acaba no primeiro erro');
  const acertos = i < 0 ? passos.length : i;
  const base = levar(acertos);
  if (i >= 0) return { acertos, base, bonus: 0, total: Math.ceil(base / 2) };
  const bonus = acertos === PERGUNTAS ? BONUS_PERFEITA : 0;
  return { acertos, base, bonus, total: base + bonus };
}

// ---------------------------------------------------------------------------
// Card: escada em emoji, nunca o texto das perguntas (o desafio por link usa as mesmas).
// ---------------------------------------------------------------------------

export function escadaEmoji(passos: readonly Passo[], fim: Fim): string {
  const linha = passos
    .map((p) => (p.desfecho !== 'acertou' ? '🟥' : p.ajuda ? '🆘' : '🟩'))
    .join('');
  return fim === 'parou' ? `${linha}⏹️` : linha;
}

/** "cheguei na 6ª e parei", "errei na 5ª", "o tempo acabou na 3ª", "fiz 8 de 8". */
export function resumoDaProva(passos: readonly Passo[], fim: Fim): string {
  const n = passos.length;
  switch (fim) {
    case 'perfeita':
      return 'fiz 8 de 8';
    case 'parou':
      return n === 0 ? 'parei antes da 1ª' : `cheguei na ${n + 1}ª e parei`;
    case 'errou':
      return `errei na ${n}ª`;
    case 'tempo':
      return `o tempo acabou na ${n}ª`;
  }
}

// ---------------------------------------------------------------------------
// Sorteio da escada: 4 clubes diferentes, sorteados de forma uniforme entre os 20
// (nunca pelo tamanho da torcida), e 4 gerais. Cada degrau tem 1 de clube e 1 geral.
// ---------------------------------------------------------------------------

/** Inteiro sem viés em [0, n). */
export type Sorteio = (n: number) => number;

export const GERAL = 'geral';

export interface Vaga {
  degrau: Degrau;
  /** Id do clube ou "geral". */
  origem: string;
}

export function embaralhar<T>(lista: readonly T[], sortear: Sorteio): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = sortear(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function montarEscada(clubes: readonly string[], sortear: Sorteio): Vaga[] {
  if (new Set(clubes).size < 4) throw new Error('precisa de 4 clubes diferentes');
  const quatro = embaralhar([...new Set(clubes)], sortear).slice(0, 4);
  const vagas: Vaga[] = [];
  for (const [k, degrau] of ([1, 2, 3, 4] as const).entries()) {
    const par: Vaga[] = [{ degrau, origem: quatro[k] }, { degrau, origem: GERAL }];
    vagas.push(...(sortear(2) ? par.reverse() : par));
  }
  return vagas;
}

export interface Candidata {
  id: string;
  /** Quando esta pessoa viu a pergunta pela última vez (ms), ou null se nunca viu. */
  vistaEm: number | null;
}

/**
 * Escolhe uma pergunta para a vaga: sorteia entre as que a pessoa não viu nos últimos `dias`;
 * se todas foram vistas, volta a mais antiga. Ignora as que já estão nesta partida.
 */
export function escolherPergunta(
  candidatas: readonly Candidata[],
  jaNaPartida: ReadonlySet<string>,
  agora: number,
  dias: number,
  sortear: Sorteio,
): string | null {
  const livres = candidatas.filter((c) => !jaNaPartida.has(c.id));
  if (!livres.length) return null;
  const corte = agora - dias * 86_400_000;
  const ineditas = livres.filter((c) => c.vistaEm === null || c.vistaEm < corte);
  if (ineditas.length) return ineditas[sortear(ineditas.length)].id;
  return livres.reduce((a, b) => ((b.vistaEm ?? 0) < (a.vistaEm ?? 0) ? b : a)).id;
}

// ---------------------------------------------------------------------------
// Ajudas
// ---------------------------------------------------------------------------

/** As ajudas que tiram alternativas nunca deixam menos de 2 na tela. */
export function quantasTirar(querTirar: number, restantes: number): number {
  return Math.max(0, Math.min(querTirar, restantes - 2));
}

/** Porcentagens inteiras que somam 100 (maiores restos); tudo 0 se não houver respostas. */
export function porcentagens(contagens: readonly number[]): number[] {
  const total = contagens.reduce((a, b) => a + b, 0);
  if (!total) return contagens.map(() => 0);
  const brutas = contagens.map((c) => (100 * c) / total);
  const base = brutas.map(Math.floor);
  let falta = 100 - base.reduce((a, b) => a + b, 0);
  const ordem = brutas.map((b, i) => [b - Math.floor(b), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of ordem) {
    if (falta-- <= 0) break;
    base[i]++;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Detecção (seção 7.1): nas últimas 40 respostas difíceis e de craque, 90% ou mais de acerto
// com tempo médio abaixo de 2,5 s → partida sob suspeita, fora do ranking até revisão.
// ---------------------------------------------------------------------------

export interface ConfigDeteccaoProva {
  janela: number;
  minAcerto: number;
  tempoMedioMs: number;
}

export const DETECCAO_PROVA_PADRAO: ConfigDeteccaoProva = { janela: 40, minAcerto: 0.9, tempoMedioMs: 2500 };

export interface RespostaParaDeteccao {
  degrau: number;
  acertou: boolean;
  ms: number;
}

/** Recebe as respostas da MAIS RECENTE para a mais antiga; devolve o motivo ou null. */
export function motivoSuspeitaProva(
  respostas: readonly RespostaParaDeteccao[],
  cfg: ConfigDeteccaoProva = DETECCAO_PROVA_PADRAO,
): string | null {
  const janela = respostas.filter((r) => r.degrau >= 3).slice(0, cfg.janela);
  if (janela.length < cfg.janela) return null;
  const acerto = janela.filter((r) => r.acertou).length / janela.length;
  const media = janela.reduce((s, r) => s + r.ms, 0) / janela.length;
  if (acerto >= cfg.minAcerto && media < cfg.tempoMedioMs) {
    return `prova: ${Math.round(acerto * 100)}% de acerto em ${janela.length} difíceis/craque, média de ${Math.round(media)} ms`;
  }
  return null;
}
