// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Detecção de partidas estatisticamente impossíveis (aprovada em 19/10/2026; jogo.md, "Anti-trapaça").
// Módulo puro, roda no servidor ao fechar cada partida. Partida marcada fica fora do ranking até revisão.

import type { ResultadoCobranca, ResultadoDefesa } from './penaltis.ts';

export interface ConfigDeteccao {
  /** Últimas N defesas contra o batedor da máquina com chute no gol. */
  janelaDefesas: number;
  /** Marca se defendeu pelo menos isto dentro da janela (honesto: ~60% na segunda, ~35% no domingo). */
  minDefesas: number;
  /** Últimas N cobranças em que o goleiro da máquina pulou por sorteio (não "leu" o chute). */
  janelaCobrancas: number;
}

export const DETECCAO_PADRAO: ConfigDeteccao = { janelaDefesas: 30, minDefesas: 27, janelaCobrancas: 40 };

interface PartidaParaDeteccao {
  cobrancas: readonly Pick<ResultadoCobranca, 'goleiroLeu' | 'zonaBola' | 'zonaGoleiro'>[];
  defesas: readonly Pick<ResultadoDefesa, 'desfecho' | 'contraGravada'>[];
}

/**
 * Recebe as partidas do torcedor da MAIS RECENTE para a mais antiga (incluindo a que acabou de fechar)
 * e devolve o motivo da suspeita, ou null.
 */
export function motivoSuspeita(partidas: readonly PartidaParaDeteccao[], cfg: ConfigDeteccao = DETECCAO_PADRAO): string | null {
  // 1. Defesas: quem lê a semente sabe o canto do batedor e defende quase tudo.
  const defesas = partidas
    .flatMap((p) => [...p.defesas].reverse())
    .filter((d) => !d.contraGravada && d.desfecho !== 'fora')
    .slice(0, cfg.janelaDefesas);
  if (defesas.length === cfg.janelaDefesas) {
    const n = defesas.filter((d) => d.desfecho === 'defesa').length;
    if (n >= cfg.minDefesas) return `defesas: ${n} de ${cfg.janelaDefesas}`;
  }

  // 2. Cobranças: quando o goleiro pula por sorteio, por acaso ~1 em 6 vai no canto dele.
  //    Quem lê a semente nunca chuta lá.
  const cobrancas = partidas
    .flatMap((p) => [...p.cobrancas].reverse())
    .filter((c) => !c.goleiroLeu)
    .slice(0, cfg.janelaCobrancas);
  if (cobrancas.length === cfg.janelaCobrancas && cobrancas.every((c) => c.zonaBola !== c.zonaGoleiro)) {
    return `cobranças: nenhuma no canto do goleiro em ${cfg.janelaCobrancas}`;
  }
  return null;
}
