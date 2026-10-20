// Selos e linhas de status dos cards da Home (docs/jogo.md, seção 9, "Home"). Puro: sem DOM nem relógio.

import { ordinalRodada } from './crava';
import { faseDoJogo, rodadaEmFoco, type JogoBasico } from './cravaTela';

/** "faltam 3 partidas que contam hoje"; sem time (ou sem conexão), a regra geral. */
export function linhaPenaltis(faltam: number | null, teto: number): string {
  if (faltam === null) return `As ${teto} melhores do dia contam`;
  if (faltam <= 0) return 'hoje só as 5 melhores contam';
  return `${faltam === 1 ? 'falta 1 partida que conta' : `faltam ${faltam} partidas que contam`} hoje`;
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
  ensaio: boolean;
}

/**
 * Status da rodada em foco (a mesma que a aba Palpites abre). "Cravado" quando todos os jogos
 * ainda abertos têm palpite; `palpites` null = não sabemos (sem time ou sem conexão).
 */
export function statusCrava(
  jogos: readonly JogoBasico[],
  palpites: ReadonlySet<string> | null,
  valendoDesde: number,
  agora: Date,
): StatusCrava | null {
  const rodada = rodadaEmFoco(jogos, agora);
  if (rodada === null) return null;
  const abertos = jogos.filter((j) => j.rodada === rodada && faseDoJogo(j, agora) === 'aberto');
  const ensaio = rodada < valendoDesde;
  const nome = `${ordinalRodada(rodada)} rodada`;
  if (!abertos.length) return { rodada, linha: `${nome} · bola rolando`, cravado: false, ensaio };
  const cravado = !!palpites && abertos.every((j) => palpites.has(j.id));
  if (cravado) return { rodada, linha: 'Cravado ✓', cravado, ensaio };
  const proximo = Math.min(...abertos.map((j) => Date.parse(j.inicio)));
  const primeiro = !jogos.some((j) => j.rodada === rodada && Date.parse(j.inicio) < proximo);
  const qual = primeiro ? '1º jogo' : 'próximo jogo';
  return { rodada, linha: `${nome} · ${qual} em ${formatarFecha(proximo - agora.getTime())}`, cravado, ensaio };
}
