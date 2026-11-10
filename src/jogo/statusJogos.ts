// Linhas de status dos cards da Home (docs/jogo.md, seção 9, "Home"). Puro: sem DOM nem relógio.

import { ULTIMA_RODADA } from './crava';
import { TEXTO_DO_LIMITE } from './regraLances';
import { ehEspecial, faseDoJogo, horaDoJogo, nomeDaRodada, rodadaEmFoco, tituloDoJogo, type JogoBasico } from './cravaTela';

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
  /**
   * "32ª rodada · 1º jogo em 3h", "… · próximo jogo em 2h", "Palpite salvo ✓", "32ª rodada · bola rolando" (só com jogo rolando),
   * "32ª rodada · encerrada", "Final da Copa do Brasil · fecha em 2 dias" ou "Brasileirão encerrado".
   */
  linha: string;
  cravado: boolean;
  /** O Brasileirão acabou e nada está aberto nem rolando: a Home e a aba mostram o bloco de encerramento. */
  encerrado: boolean;
}

/**
 * O Brasileirão encerrou: a 38ª rodada (só jogos do Brasileirão) está toda confirmada ou anulada e a rodada em foco
 * não tem jogo aberto nem rolando (um jogo especial a caminho ou em campo segura o encerramento).
 */
export function brasileiraoEncerrado(jogos: readonly JogoBasico[], agora: Date): boolean {
  const ultima = jogos.filter((j) => j.rodada === ULTIMA_RODADA && !ehEspecial(j));
  const emJogo = (j: JogoBasico) => {
    const f = faseDoJogo(j, agora);
    return f === 'aberto' || f === 'rolando';
  };
  if (!ultima.length || ultima.some(emJogo)) return false;
  const foco = rodadaEmFoco(jogos, agora);
  return !jogos.some((j) => j.rodada === foco && emJogo(j));
}

/** O jogo especial ainda aberto que começa mais cedo (sem limite de dias), ou null. */
export function proximoEspecial<J extends JogoBasico>(jogos: readonly J[], agora: Date): J | null {
  const abertos = jogos.filter((j) => ehEspecial(j) && faseDoJogo(j, agora) === 'aberto');
  return abertos.sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))[0] ?? null;
}

/** Linha de baixo do encerramento: "Próximo: Final da Copa do Brasil · sáb 24/10 · 16h" ou a volta em janeiro. */
export function linhaDoProximoEspecial(jogos: readonly JogoBasico[], agora: Date): string {
  const j = proximoEspecial(jogos, agora);
  return j ? `Próximo: ${tituloDoJogo(j)} · ${horaDoJogo(j.inicio)}` : 'Sem jogo para palpitar agora. Volta em janeiro.';
}

/**
 * Status da rodada em foco (a mesma que a aba Palpites abre). "Palpite salvo" quando todos os jogos
 * ainda abertos têm palpite; `palpites` null = não sabemos (sem time ou sem conexão).
 * "Bola rolando" só com jogo da rodada em campo; rodada toda confirmada ou anulada diz "encerrada".
 */
export function statusCrava(
  jogos: readonly JogoBasico[],
  palpites: ReadonlySet<string> | null,
  agora: Date,
): StatusCrava | null {
  const rodada = rodadaEmFoco(jogos, agora);
  if (rodada === null) return null;
  if (brasileiraoEncerrado(jogos, agora)) return { rodada, linha: 'Brasileirão encerrado', cravado: false, encerrado: true };
  const daRodada = jogos.filter((j) => j.rodada === rodada);
  const abertos = daRodada.filter((j) => faseDoJogo(j, agora) === 'aberto');
  const nome = nomeDaRodada(jogos, rodada);
  const especial = daRodada.some(ehEspecial);
  if (!abertos.length) {
    const rolando = daRodada.some((j) => faseDoJogo(j, agora) === 'rolando');
    return { rodada, linha: `${nome} · ${rolando ? 'bola rolando' : 'encerrada'}`, cravado: false, encerrado: false };
  }
  const cravado = !!palpites && abertos.every((j) => palpites.has(j.id));
  if (cravado) return { rodada, linha: 'Palpite salvo ✓', cravado, encerrado: false };
  const proximo = Math.min(...abertos.map((j) => Date.parse(j.inicio)));
  if (especial) return { rodada, linha: `${nome} · fecha em ${formatarFecha(proximo - agora.getTime())}`, cravado, encerrado: false };
  const primeiro = !daRodada.some((j) => Date.parse(j.inicio) < proximo);
  const qual = primeiro ? '1º jogo' : 'próximo jogo';
  return { rodada, linha: `${nome} · ${qual} em ${formatarFecha(proximo - agora.getTime())}`, cravado, encerrado: false };
}
