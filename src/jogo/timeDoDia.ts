// Time do Dia (docs/jogo.md, seção 7.2): pistas, pontos, grade em emoji, sorteio do
// clube do dia sem repetir e detecção. Puro (sem DOM, rede nem relógio): roda no celular e na função
// do servidor (copiado pelo `npm run compartilhar`).

export const TENTATIVAS = 6;
/** Pontos por tentativa em que acertou (1ª a 6ª); não acertou = 0. */
export const PONTOS = [100, 85, 70, 55, 40, 25] as const;

export type Divisao = 'A' | 'B' | 'C';
export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

/** Lista fechada de cores (o CSV só aceita estas). */
export const CORES = ['branco', 'preto', 'vermelho', 'grená', 'verde', 'azul', 'amarelo', 'laranja'] as const;
export type Cor = (typeof CORES)[number];

/** Amostra de cada cor na grade (só para desenhar; a comparação é pelo nome). */
export const AMOSTRA_COR: Record<Cor, string> = {
  branco: '#ffffff',
  preto: '#111111',
  vermelho: '#d4002a',
  grená: '#7a1c2e',
  verde: '#00843d',
  azul: '#0050a0',
  amarelo: '#ffd200',
  laranja: '#f47b20',
};

export const REGIAO_DA_UF: Record<string, Regiao> = {
  AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste',
  PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

export interface ClubeDoDia {
  id: string;
  nome: string;
  uf: string;
  fundacao: number;
  /** Títulos do Brasileirão pela lista oficial da CBF. */
  titulos: number;
  divisao: Divisao;
  cores: [Cor, Cor];
  capital: boolean;
}

/** 🟢 certo, 🟡 perto, ⚪ longe. */
export type Tom = 'certo' | 'perto' | 'longe';
/** O número do secreto é maior (acima) ou menor (abaixo) que o do chute. */
export type Seta = 'acima' | 'abaixo';

export interface Pista {
  tom: Tom;
  seta?: Seta;
}

export const NOMES_PISTAS = ['estado', 'fundacao', 'titulos', 'divisao', 'cores', 'capital'] as const;
export type NomePista = (typeof NOMES_PISTAS)[number];
export type Pistas = Record<NomePista, Pista>;

export const ROTULO_PISTA: Record<NomePista, string> = {
  estado: 'Estado',
  fundacao: 'Fundação',
  titulos: 'Títulos',
  divisao: 'Série',
  cores: 'Cores',
  capital: 'Capital',
};

/** Uma linha da grade: o clube chutado (com os dados dele) e as pistas contra o secreto. */
export interface Tentativa {
  clube: ClubeDoDia;
  pistas: Pistas;
  acertou: boolean;
}

/** Até 10 anos de diferença na fundação = 🟡. */
export const PERTO_ANOS = 10;
/** Até 2 títulos de diferença = 🟡. */
export const PERTO_TITULOS = 2;

const ORDEM_DIVISAO: Record<Divisao, number> = { A: 1, B: 2, C: 3 };

export const regiaoDe = (uf: string): Regiao | undefined => REGIAO_DA_UF[uf];

function numero(chute: number, secreto: number, perto: number): Pista {
  if (chute === secreto) return { tom: 'certo' };
  return { tom: Math.abs(chute - secreto) <= perto ? 'perto' : 'longe', seta: secreto > chute ? 'acima' : 'abaixo' };
}

/** As 6 pistas da tabela da seção 7.2 do jogo.md. */
export function compararClubes(chute: ClubeDoDia, secreto: ClubeDoDia): Pistas {
  const estado: Pista =
    chute.uf === secreto.uf
      ? { tom: 'certo' }
      : { tom: regiaoDe(chute.uf) && regiaoDe(chute.uf) === regiaoDe(secreto.uf) ? 'perto' : 'longe' };

  const dDiv = Math.abs(ORDEM_DIVISAO[chute.divisao] - ORDEM_DIVISAO[secreto.divisao]);
  const divisao: Pista = { tom: dDiv === 0 ? 'certo' : dDiv === 1 ? 'perto' : 'longe' };

  // As 2 cores são diferentes (o importador garante); a ordem não importa.
  const iguais = chute.cores.filter((c) => secreto.cores.includes(c)).length;
  const cores: Pista = { tom: iguais >= 2 ? 'certo' : iguais === 1 ? 'perto' : 'longe' };

  return {
    estado,
    fundacao: numero(chute.fundacao, secreto.fundacao, PERTO_ANOS),
    titulos: numero(chute.titulos, secreto.titulos, PERTO_TITULOS),
    divisao,
    cores,
    capital: { tom: chute.capital === secreto.capital ? 'certo' : 'longe' },
  };
}

export function tentar(chute: ClubeDoDia, secreto: ClubeDoDia): Tentativa {
  return { clube: chute, pistas: compararClubes(chute, secreto), acertou: chute.id === secreto.id };
}

/** Pontos do dia: acertouNa = número da tentativa certa (1 a 6) ou null. */
export function pontosDoDia(acertouNa: number | null): number {
  if (acertouNa === null || !Number.isInteger(acertouNa) || acertouNa < 1 || acertouNa > TENTATIVAS) return 0;
  return PONTOS[acertouNa - 1];
}

export const EMOJI_TOM: Record<Tom, string> = { certo: '🟢', perto: '🟡', longe: '⚪' };

export function linhaEmoji(p: Pistas): string {
  return NOMES_PISTAS.map((n) => EMOJI_TOM[p[n].tom]).join('');
}

/** A grade do card: uma linha por tentativa, sem nome de clube. */
export function gradeEmoji(linhas: readonly Pistas[]): string {
  return linhas.map(linhaEmoji).join('\n');
}

/**
 * Busca da lista: sem acento, maiúscula, hífen ou pontuação ("sao paulo" acha "São Paulo";
 * "atletico go" acha "Atlético-GO"), e "th" vale "t" ("atletico" acha também o Athletico-PR).
 */
export function normalizarBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/th/g, 't')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const quantasCertas =(p: Pistas): number => NOMES_PISTAS.filter((n) => p[n].tom === 'certo').length;

/** "4/6" ou "X/6". */
export function placarDoDia(tentativas: number, acertou: boolean): string {
  return `${acertou ? tentativas : 'X'}/${TENTATIVAS}`;
}

/** "Time do Dia #34 · 4/6 · NOVO RECORDE!" — texto do card e do WhatsApp. */
export function linhaDoCard(numeroDoDia: number, placar: string, novoRecorde = false): string {
  return `Time do Dia #${numeroDoDia} · ${placar}${novoRecorde ? ' · NOVO RECORDE!' : ''}`;
}

// ---------------------------------------------------------------------------
// Dias (strings "AAAA-MM-DD", já em horário de Brasília)
// ---------------------------------------------------------------------------

const DIA_MS = 24 * 60 * 60 * 1000;
const paraMs = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const deMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const diaAnterior = (dia: string): string => deMs(paraMs(dia) - DIA_MS);
export const diasEntre = (de: string, ate: string): number => Math.round((paraMs(ate) - paraMs(de)) / DIA_MS);

/** Número do dia: o 1º dia do Time do Dia é o #1 e cada dia de calendário soma 1. */
export function numeroDoDia(primeiroDia: string, dia: string): number {
  return diasEntre(primeiroDia, dia) + 1;
}

// ---------------------------------------------------------------------------
// Sorteio do clube do dia: não repete até passar pela lista inteira
// ---------------------------------------------------------------------------

export interface DiaSorteado {
  clube: string;
  ciclo: number;
}

/**
 * Próximo clube do dia. `historico` em ordem de dia (o último é o de ontem, ou o mais recente).
 * Dentro de um ciclo, nenhum clube repete. Quando o ciclo acaba, começa outro sem o último clube
 * (para não repetir de um dia para o outro). Clube que saiu da lista no meio do ciclo é ignorado;
 * clube que entrou no meio entra no ciclo atual. `sorteio(n)` devolve um inteiro de 0 a n−1.
 */
export function proximoClube(
  ativos: readonly string[],
  historico: readonly DiaSorteado[],
  sorteio: (n: number) => number,
): DiaSorteado | null {
  const lista = [...new Set(ativos)].sort();
  if (!lista.length) return null;
  const ultimo = historico[historico.length - 1];
  let ciclo = ultimo?.ciclo ?? 1;
  const usados = new Set(historico.filter((h) => h.ciclo === ciclo).map((h) => h.clube));
  let restantes = lista.filter((c) => !usados.has(c));
  if (!restantes.length) {
    ciclo++;
    restantes = lista.length > 1 ? lista.filter((c) => c !== ultimo?.clube) : lista;
  }
  const i = sorteio(restantes.length);
  return { clube: restantes[Math.min(Math.max(0, Math.floor(i)), restantes.length - 1)], ciclo };
}

// ---------------------------------------------------------------------------
// Fim da partida e detecção
// ---------------------------------------------------------------------------

/** A partida acabou: acertou ou gastou as 6 tentativas. */
export const acabou = (tentativas: number, acertou: boolean): boolean => acertou || tentativas >= TENTATIVAS;

export const JANELA_SUSPEITA_DIAS = 7;
export const MIN_ACERTOS_DE_PRIMEIRA = 5;

export interface DiaJogado {
  dia: string;
  /** Tentativa em que acertou (1 a 6) ou null. */
  acertouNa: number | null;
}

/**
 * Detecção (seção 7.2): acerto na 1ª tentativa em 5 dos últimos 7 dias (contando hoje) → sob suspeita.
 * Risco que ela cobre: conta anônima nova para "estudar" o dia antes de jogar na conta de verdade.
 */
export function suspeitoNoDia(historico: readonly DiaJogado[], hoje: string): boolean {
  const dePrimeira = historico.filter((h) => {
    const d = diasEntre(h.dia, hoje);
    return d >= 0 && d < JANELA_SUSPEITA_DIAS && h.acertouNa === 1;
  });
  return new Set(dePrimeira.map((h) => h.dia)).size >= MIN_ACERTOS_DE_PRIMEIRA;
}
