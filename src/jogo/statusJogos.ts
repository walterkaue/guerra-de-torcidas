// Linhas de status dos cards da Home (docs/jogo.md, seção 9, "Home"). Puro: sem DOM nem relógio.

import { ordinalRodada } from './crava';
import { TEXTO_DO_LIMITE } from './regraLances';
import { faseDoJogo, rodadaEmFoco, type JogoBasico } from './cravaTela';

/**
 * Lances unificados (docs/jogo.md, 14.7): quantas das 10 partidas valendo de hoje ainda dá para fazer.
 * Os pênaltis, as faltas e o cara a cara somam no mesmo limite. Null sem resposta do servidor.
 */
export function faltamDosLances(h: { feitas: number; limite: number } | null | undefined): number | null {
  if (!h || !(h.limite > 0)) return null;
  return Math.max(0, h.limite - h.feitas);
}

/** A linha de baixo do card e do "Jogar agora": "faltam 3 partidas valendo hoje". */
export function linhaLancesUnificados(faltam: number | null, melhores: number): string {
  if (faltam === null) return `As ${melhores} melhores do dia contam`;
  if (faltam <= 0) return `${TEXTO_DO_LIMITE}.`;
  return `${faltam === 1 ? 'falta 1 partida valendo' : `faltam ${faltam} partidas valendo`} hoje`;
}

/** "5h 12m", "40m": quanto falta para o próximo Time do Dia. */
export function formatarVolta(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`;
}

/** "3h", "40min", "2 dias": até o próximo jogo da rodada (quando o palpite tranca). */
export function formatarFecha(ms: number): string {
  const min = Math.max(1, Math.floor(ms / 60_000));
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)} dias`;
}

export interface StatusCrava {
  rodada: number;
  /** "32ª rodada · 1º jogo em 3h", "… · próximo jogo em 2h", "Cravado ✓" ou "32ª rodada · bola rolando". */
  linha: string;
  cravado: boolean;
}

/**
 * Status da rodada em foco (a mesma que a aba Palpites abre). "Cravado" quando todos os jogos
 * ainda abertos têm palpite; `palpites` null = não sabemos (sem time ou sem conexão).
 */
export function statusCrava(
  jogos: readonly JogoBasico[],
  palpites: ReadonlySet<string> | null,
  agora: Date,
): StatusCrava | null {
  const rodada = rodadaEmFoco(jogos, agora);
  if (rodada === null) return null;
  const abertos = jogos.filter((j) => j.rodada === rodada && faseDoJogo(j, agora) === 'aberto');
  const nome = `${ordinalRodada(rodada)} rodada`;
  if (!abertos.length) return { rodada, linha: `${nome} · bola rolando`, cravado: false };
  const cravado = !!palpites && abertos.every((j) => palpites.has(j.id));
  if (cravado) return { rodada, linha: 'Palpite salvo ✓', cravado };
  const proximo = Math.min(...abertos.map((j) => Date.parse(j.inicio)));
  const primeiro = !jogos.some((j) => j.rodada === rodada && Date.parse(j.inicio) < proximo);
  const qual = primeiro ? '1º jogo' : 'próximo jogo';
  return { rodada, linha: `${nome} · ${qual} em ${formatarFecha(proximo - agora.getTime())}`, cravado };
}
