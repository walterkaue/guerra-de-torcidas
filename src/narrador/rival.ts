// Rival da semana e a situação do duelo (seção 8 do jogo.md). Puro, sem servidor.

import type { Etiqueta } from './escolher';
import type { EventoNarrador } from './frases';

export interface LinhaDuelo {
  time_id: string;
  ativos: number;
  media30: number;
  posicao_campeao: number;
}

/** Diferença pequena: até ~2 partidas boas de uma pessoa do top 30 (2 × 60 / 30 = 4 pontos de média). */
export const COLADO = 4;

/**
 * O clássico da tabela; sem clássico, o time logo acima no ranking geral da semana
 * (ou logo abaixo, se for o líder). "Outro time" não tem rival de time.
 */
export function rivalDaSemana(meuTime: string, classico: string | null, ranking: readonly LinhaDuelo[]): string | null {
  if (classico) return classico;
  const minha = ranking.find((l) => l.time_id === meuTime);
  if (!minha) return null;
  const alvo = minha.posicao_campeao === 1 ? 2 : minha.posicao_campeao - 1;
  return ranking.find((l) => l.posicao_campeao === alvo)?.time_id ?? null;
}

export interface Duelo {
  evento: EventoNarrador;
  /** "12 pontos" / "1 ponto" (diferença na média dos 30 melhores). */
  dif: string;
  frente: boolean;
  /** `colado`: na frente por até COLADO de média (frase "Salto alto não"). */
  etiquetas: Set<Etiqueta>;
}

const formatarDif = (n: number) => {
  const v = Math.round(Math.abs(n));
  return `${v.toLocaleString('pt-BR')} ${v === 1 ? 'ponto' : 'pontos'}`;
};

/**
 * Situação do duelo. `estavaNaFrente` é o que o aparelho viu da última vez (para "passou"/"foi passado").
 * Sem ninguém jogando dos dois lados ainda, não há duelo.
 */
export function situacaoDoDuelo(eu: LinhaDuelo, rival: LinhaDuelo, estavaNaFrente: boolean | null): Duelo | null {
  if (eu.ativos === 0 && rival.ativos === 0) return null;
  const frente = eu.posicao_campeao < rival.posicao_campeao;
  const diferenca = eu.media30 - rival.media30;
  const dif = formatarDif(diferenca);
  const colado = Math.abs(diferenca) <= COLADO;
  const etiquetas = new Set<Etiqueta>(frente && colado ? ['colado'] : []);
  if (estavaNaFrente !== null && estavaNaFrente !== frente) {
    return { evento: frente ? 'rival_passou' : 'rival_passado', dif, frente, etiquetas };
  }
  if (frente) return { evento: 'rival_frente', dif, frente, etiquetas };
  return { evento: colado ? 'rival_colado' : 'rival_atras', dif, frente, etiquetas };
}
