// Crava a Rodada: pontuação dos palpites (docs/jogo.md, seção 7). Puro: sem DOM, relógio nem banco.
// O servidor (confirmar-placar) usa uma cópia deste arquivo para distribuir os pontos; o celular
// usa para mostrar o acerto de cada jogo e montar o card.

export interface Placar {
  /** Gols do mandante. */
  m: number;
  /** Gols do visitante. */
  v: number;
}

export const GOLS_MAX = 9;
/** Os pontos de palpite entram na torcida multiplicados por 2… */
export const PESO_TORCIDA = 2;
/** …com teto de 300 por rodada (o mesmo que um dia de minigames). */
export const TETO_RODADA = 300;
/** Rodadas do Brasileirão 2026 cobertas pelo Crava. */
export const PRIMEIRA_RODADA = 32;
export const ULTIMA_RODADA = 38;

export type Acerto = 'exato' | 'saldo' | 'vencedor' | 'errou';

export const PONTOS_ACERTO: Record<Acerto, number> = { exato: 10, saldo: 7, vencedor: 5, errou: 0 };

export function placarValido(p: Placar | null | undefined): p is Placar {
  const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= GOLS_MAX;
  return !!p && ok(p.m) && ok(p.v);
}

const sinal = (p: Placar) => Math.sign(p.m - p.v);

/** Exato 10; vencedor e saldo (ou empate com outro placar) 7; só o vencedor (ou só o empate) 5; errou 0. */
export function acertoDoPalpite(palpite: Placar, real: Placar): Acerto {
  if (palpite.m === real.m && palpite.v === real.v) return 'exato';
  if (sinal(palpite) !== sinal(real)) return 'errou';
  return palpite.m - palpite.v === real.m - real.v ? 'saldo' : 'vencedor';
}

export interface JogoDaRodada {
  id: string;
  /** Hora da primeira confirmação (ISO). Define a ordem do teto; corrigir não muda. Null = ainda não confirmado. */
  confirmadoEm: string | null;
  /** Placar confirmado pelo administrador. */
  placar: Placar | null;
  /** Não disputado até o fim da 38ª: sem pontos, e o dobro da certeza se perde. */
  anulado: boolean;
}

export interface PontosDoJogo {
  jogoId: string;
  /** Null para jogo anulado. */
  acerto: Acerto | null;
  certeza: boolean;
  /** Pontos do palpite (10/7/5/0, ×2 se for o jogo da certeza). */
  palpite: number;
  /** O que vai para a torcida: palpite × peso, dentro do teto da rodada. */
  torcida: number;
}

/**
 * Pontos de uma pessoa numa rodada, só dos jogos já confirmados (ou anulados) em que ela palpitou.
 * O teto de 300 é aplicado na ordem em que os jogos foram confirmados.
 */
export function pontosDaRodada(
  jogos: readonly JogoDaRodada[],
  palpites: ReadonlyMap<string, Placar>,
  certezaJogoId: string | null,
): PontosDoJogo[] {
  const fechados = jogos
    .filter((j) => palpites.has(j.id) && (j.anulado || (j.confirmadoEm !== null && placarValido(j.placar))))
    .sort((a, b) => ordemConfirmacao(a, b));
  let usado = 0;
  return fechados.map((j) => {
    const certeza = j.id === certezaJogoId;
    if (j.anulado) return { jogoId: j.id, acerto: null, certeza, palpite: 0, torcida: 0 };
    const acerto = acertoDoPalpite(palpites.get(j.id)!, j.placar!);
    const palpite = PONTOS_ACERTO[acerto] * (certeza ? 2 : 1);
    const torcida = Math.min(palpite * PESO_TORCIDA, TETO_RODADA - usado);
    usado += torcida;
    return { jogoId: j.id, acerto, certeza, palpite, torcida };
  });
}

function ordemConfirmacao(a: JogoDaRodada, b: JogoDaRodada): number {
  // Anulado sem confirmação vai para o fim (não usa teto mesmo).
  const ta = a.confirmadoEm ? Date.parse(a.confirmadoEm) : Infinity;
  const tb = b.confirmadoEm ? Date.parse(b.confirmadoEm) : Infinity;
  return ta - tb || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export interface PalpiteDeAlguem {
  torcedorId: string;
  jogoId: string;
  placar: Placar;
}

export interface AlvoDePontos {
  torcedorId: string;
  jogoId: string;
  /** Total que essa pessoa deve ter recebido por esse jogo (pode ser 0). */
  pontos: number;
}

/** Quanto cada pessoa deve ter recebido por jogo na rodada (o servidor grava só a diferença). */
export function alvosDaRodada(
  jogos: readonly JogoDaRodada[],
  palpites: readonly PalpiteDeAlguem[],
  certezas: ReadonlyMap<string, string>,
): AlvoDePontos[] {
  const porPessoa = new Map<string, Map<string, Placar>>();
  for (const p of palpites) {
    if (!porPessoa.has(p.torcedorId)) porPessoa.set(p.torcedorId, new Map());
    porPessoa.get(p.torcedorId)!.set(p.jogoId, p.placar);
  }
  const alvos: AlvoDePontos[] = [];
  for (const [torcedorId, meus] of porPessoa) {
    for (const r of pontosDaRodada(jogos, meus, certezas.get(torcedorId) ?? null)) {
      alvos.push({ torcedorId, jogoId: r.jogoId, pontos: r.torcida });
    }
  }
  return alvos;
}

// ---------------------------------------------------------------------------
// Semana dos pontos (horário de Brasília, UTC−3 fixo, igual a supabase/functions/_shared/tempo.ts)
// ---------------------------------------------------------------------------

const FUSO_MS = -3 * 3600_000;
const DIA_MS = 24 * 3600_000;

function segundaDe(d: Date): string {
  const b = new Date(d.getTime() + FUSO_MS);
  b.setUTCDate(b.getUTCDate() - ((b.getUTCDay() + 6) % 7));
  return b.toISOString().slice(0, 10);
}

/** Hora em que a semana (segunda "AAAA-MM-DD") deixa de ser provisória: a segunda seguinte, 12h de Brasília. */
export function semanaConfirmadaEm(semana: string): Date {
  return new Date(Date.parse(`${semana}T12:00:00Z`) - FUSO_MS + 7 * DIA_MS);
}

/**
 * Semana em que entram os pontos de um jogo: a do início do jogo. Se essa semana já foi
 * confirmada (passou de segunda 12h), entram na semana atual: semana fechada não reabre.
 */
export function semanaDosPontos(inicioDoJogo: Date, agora: Date): string {
  const semanaDoJogo = segundaDe(inicioDoJogo);
  return agora < semanaConfirmadaEm(semanaDoJogo) ? semanaDoJogo : segundaDe(agora);
}

// ---------------------------------------------------------------------------
// Narrador e cards
// ---------------------------------------------------------------------------

/** O palpite foi de derrota do próprio time de quem joga (etiqueta [contra] do narrador). */
export function palpiteContra(p: Placar, mandanteId: string, visitanteId: string, meuTime: string | null | undefined): boolean {
  if (meuTime === mandanteId) return p.m < p.v;
  if (meuTime === visitanteId) return p.v < p.m;
  return false;
}

export const EMOJI_ACERTO: Record<Acerto, string> = { exato: '🎯', saldo: '✅', vencedor: '👍', errou: '❌' };

/** Linha de emoji do card "Resultado da rodada": um por jogo palpitado, ⭐ logo depois do jogo da certeza. */
export function linhaEmoji(resultados: readonly Pick<PontosDoJogo, 'acerto' | 'certeza'>[]): string {
  return resultados
    .filter((r) => r.acerto !== null)
    .map((r) => EMOJI_ACERTO[r.acerto!] + (r.certeza ? '⭐' : ''))
    .join('');
}

/** "34ª" */
export const ordinalRodada = (n: number) => `${n}ª`;
