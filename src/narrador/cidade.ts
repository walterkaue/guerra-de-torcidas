// Frases da cidade (cidade_atras, cidade_frente, cidade_passou, cidade_campea; docs/narrador.md, seção 8).
// Só posição no ranking: nunca origem ou tamanho da cidade. Quem é de "Outro time" recebe estas também:
// o contexto não leva time, só a cidade. Nome da cidade sempre sem preposição antes.

import { situacaoDaCidade, type MinhaCidade } from '../jogo/rankingCidades';
import { escolherFrase } from './escolher';

export function fraseDaCidade(m: MinhaCidade, estavaAcima: boolean | null, semanaFechada = false, rng: () => number = Math.random): string | null {
  const duelo = situacaoDaCidade(m, estavaAcima, semanaFechada);
  if (!duelo || m.posicao_estado === null) return null;
  const ctx = {
    cidade: m.nome,
    cidadeRival: m.rival_nome ?? undefined,
    uf: m.uf,
    posicao: `${m.posicao_estado}º`,
    dif: duelo.dif,
  };
  return escolherFrase(duelo.evento, ctx, rng)?.texto ?? null;
}
