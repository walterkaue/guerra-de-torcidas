// Apoio puro da aba Palpites: rodada em foco, estado de cada jogo, horários e textos dos cards.

import { linhaEmoji, ordinalRodada, type Placar, type PontosDoJogo } from './crava';
import { STATUS_ADIADO } from './footballData';

/** Aviso fixo do Crava (docs/jogo.md, seção 7): topo da tela e todo card. */
export const AVISO_RESENHA = 'Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca.';

export interface JogoBasico {
  id: string;
  rodada: number;
  inicio: string;
  status_api: string;
  confirmado_em: string | null;
  anulado: boolean;
}

export type Fase = 'aberto' | 'rolando' | 'confirmado' | 'anulado';

export function faseDoJogo(j: JogoBasico, agora: Date): Fase {
  if (j.anulado) return 'anulado';
  if (j.confirmado_em) return 'confirmado';
  return agora.getTime() < Date.parse(j.inicio) ? 'aberto' : 'rolando';
}

export const adiado = (j: JogoBasico) => !j.confirmado_em && !j.anulado && STATUS_ADIADO.includes(j.status_api);

/**
 * Rodada que a aba abre: a primeira cuja data típica (mediana dos inícios) não ficou mais de
 * 36 h para trás. A mediana ignora um jogo adiado para dezembro.
 */
export function rodadaEmFoco(jogos: readonly Pick<JogoBasico, 'rodada' | 'inicio'>[], agora: Date): number | null {
  const porRodada = new Map<number, number[]>();
  for (const j of jogos) {
    if (!porRodada.has(j.rodada)) porRodada.set(j.rodada, []);
    porRodada.get(j.rodada)!.push(Date.parse(j.inicio));
  }
  const rodadas = [...porRodada.keys()].sort((a, b) => a - b);
  if (!rodadas.length) return null;
  const limite = agora.getTime() - 36 * 3600_000;
  for (const r of rodadas) {
    const inicios = porRodada.get(r)!.sort((a, b) => a - b);
    if (inicios[Math.floor(inicios.length / 2)] >= limite) return r;
  }
  return rodadas[rodadas.length - 1];
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "sáb 24/10 · 16h" ou "sáb 24/10 · 18h30", em horário de Brasília (UTC−3 fixo). */
export function horaDoJogo(inicio: string): string {
  const b = new Date(Date.parse(inicio) - 3 * 3600_000);
  const dd = String(b.getUTCDate()).padStart(2, '0');
  const mm = String(b.getUTCMonth() + 1).padStart(2, '0');
  const min = b.getUTCMinutes();
  return `${DIAS[b.getUTCDay()]} ${dd}/${mm} · ${b.getUTCHours()}h${min ? String(min).padStart(2, '0') : ''}`;
}

/** "6 horas", "1 hora", "40 minutos" (variável {horas} do narrador). */
export function tempoAte(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.floor(min / 60);
  return `${h} ${h === 1 ? 'hora' : 'horas'}`;
}

export interface LinhaMeuPalpite {
  mandante: string;
  visitante: string;
  placar: Placar;
  certeza: boolean;
}

/** Texto do card "Meus palpites" (antes): só os placares cravados e o jogo da certeza. */
export function textoMeusPalpites(rodada: number, linhas: readonly LinhaMeuPalpite[], link: string): string {
  return [
    `Meus palpites da ${ordinalRodada(rodada)} rodada:`,
    ...linhas.map((l) => `${l.mandante} ${l.placar.m} x ${l.placar.v} ${l.visitante}${l.certeza ? ' ⭐' : ''}`),
    '',
    AVISO_RESENHA,
    link,
  ].join('\n');
}

/** Texto do card "Resultado da rodada": pontos {pro_time} e a linha de emoji. */
export function textoResultadoRodada(
  rodada: number,
  pontos: number,
  paraTime: string | null,
  resultados: readonly Pick<PontosDoJogo, 'acerto' | 'certeza'>[],
  link: string,
): string {
  return [
    `Crava a Rodada, ${ordinalRodada(rodada)}: ${pontos} pontos${paraTime ? ` ${paraTime}` : ''}`,
    linhaEmoji(resultados),
    '',
    AVISO_RESENHA,
    link,
  ].join('\n');
}
