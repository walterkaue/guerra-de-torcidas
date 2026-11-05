// Textos de pontos do "?" dos Lances do Jogo depois de 16/11/2026 (docs/jogo.md, seção 14.7). Puro: sem DOM nem
// relógio. Todo número sai das tabelas do código (PONTOS_UNIFICADOS, TABELA_LANCES_UNIFICADA, MEDALHAS_PENALTIS).

import { FAIXAS, TABELA_LANCES_UNIFICADA, type Faixa, type TabelaLances } from './lances';
import { PONTOS_UNIFICADOS, type TabelaPenaltis } from './penaltis';
import { LANCES_PARTIDAS_POR_DIA_UNIFICADO, MEDALHAS_PENALTIS, MELHORES_DO_DIA } from './regraLances';

export type LinhaDePontos = readonly [rotulo: string, valor: string];

// "Gol em lance médio" (a faixa se chama Média, mas aqui o adjetivo é do lance).
const NOME_DA_FAIXA: Record<Faixa, string> = { facil: 'fácil', media: 'médio', dificil: 'difícil', craque: 'craque' };

/** Tabela de pontos dos pênaltis, pela tabela da partida. */
export function pontosDosPenaltis(t: TabelaPenaltis = PONTOS_UNIFICADOS): LinhaDePontos[] {
  return [
    ['Gol', String(t.gol)],
    ['Gol no ângulo', `+${t.angulo}`],
    ['Cavadinha que entra', `+${t.cavadinha}`],
    ['Defesa', String(t.defesa)],
    ['Vitória na disputa', `+${t.vitoria}`],
    ['5 de 5 (cobranças ou defesas)', `+${t.cincoDeCinco}`],
  ];
}

/** Tabela de pontos das faltas e do cara a cara, pela tabela da partida. */
export function pontosDosLances(t: TabelaLances = TABELA_LANCES_UNIFICADA): LinhaDePontos[] {
  return [
    ...FAIXAS.map((f): LinhaDePontos => [`Gol em lance ${NOME_DA_FAIXA[f]}`, String(t.faixa[f])]),
    ['Recriou o lance', `+${t.recriou}`],
  ];
}

/** "10 · 50 · 100 gols, ouro com 10 vitórias", das medalhas dos pênaltis. */
export function textoDasMedalhasDosPenaltis(): string {
  const ouro = MEDALHAS_PENALTIS[MEDALHAS_PENALTIS.length - 1];
  const gols = MEDALHAS_PENALTIS.map((m) => m.gols).join(' · ');
  return `Medalhas dos pênaltis, por disputa e na livre: ${gols} gols, ouro com ${ouro.vitorias} vitórias.`;
}

/** O que as duas folhas dizem do teto e do dia. */
export function textoDoDia(teto: number): string {
  return `Cada partida vale no máximo ${teto}. São ${LANCES_PARTIDAS_POR_DIA_UNIFICADO} partidas valendo por dia, somando pênaltis, faltas e cara a cara, e as ${MELHORES_DO_DIA} melhores contam. Passou disso, vira treino.`;
}

/** Nota final da folha dos pênaltis. */
export const notaDosPenaltis = (t: TabelaPenaltis = PONTOS_UNIFICADOS): string =>
  `Gols e defesas da morte súbita valem o normal. O bônus de 5 de 5 olha só as 5 primeiras. ${textoDoDia(t.teto ?? 0)} ${textoDasMedalhasDosPenaltis()}`;

/** Nota final da folha das faltas e do cara a cara. */
export const notaDosLances = (t: TabelaLances = TABELA_LANCES_UNIFICADA): string =>
  `A dificuldade do lance pode baixar conforme o povo for acertando, nunca muda no meio da partida. ${textoDoDia(t.teto)}`;
