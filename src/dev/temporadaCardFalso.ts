// Só em desenvolvimento: cenários de mentira para conferir o card de fim de temporada (?cardFalso&tipo=temporada,
// /dev/cards.html?personalizados e o "Card do mês" da aba Temporada com ?temporadaFalsa), sem servidor. Nunca entra no
// build de produção.

import { ID_OUTRO, TIMES, type Time } from '../dados/times';
import type { BonecoDoCard, DadosDoCard } from '../jogo/cardPersonalizado';
import { contextoDoFimDoMes, dadosDoCardDoMes, fraseDoFimDoMes, textoDoCardDoMes } from '../jogo/cardTemporadaDados';
import { destinoDoMes, type DestinoDoMes, type LinhaTemporada, type Serie, type Temporada } from '../jogo/temporada';
import { PADRAO } from '../jogo/vestiario';

/** O boneco de mentira: número 07, fundo túnel e a pose de braços pra cima liberada. */
export const bonecoDeMentira = (): BonecoDoCard => ({
  vestimenta: { ...PADRAO, camisa: 'uni1', numero: '07', fundo: 'tunel', cabelo: 'raspado' },
  liberadas: ['pose_bracos'],
});

export type CenarioDoMes = 'subiu' | 'caiu' | 'campeao' | 'campeao_b' | 'fica_a' | 'fica_b' | 'unica_a' | 'unica_b' | 'estreia';
export const CENARIOS_DO_MES: readonly CenarioDoMes[] = ['subiu', 'caiu', 'campeao', 'campeao_b', 'fica_a', 'fica_b', 'unica_a', 'unica_b', 'estreia'];

/** Em que série e posição o meu time termina em cada cenário. */
const ONDE: Record<CenarioDoMes, { serie: Serie; posicao: number }> = {
  subiu: { serie: 'b', posicao: 2 },
  caiu: { serie: 'a', posicao: 9 },
  campeao: { serie: 'a', posicao: 1 },
  campeao_b: { serie: 'b', posicao: 1 },
  fica_a: { serie: 'a', posicao: 5 },
  fica_b: { serie: 'b', posicao: 6 },
  unica_a: { serie: 'unica', posicao: 4 },
  unica_b: { serie: 'unica', posicao: 14 },
  estreia: { serie: 'unica', posicao: 1 },
};

const destinoDaPosicao = (serie: Serie, posicao: number): 'a' | 'b' => (serie === 'unica' ? (posicao <= 10 ? 'a' : 'b') : serie === 'a' ? (posicao <= 8 ? 'a' : 'b') : posicao <= 2 ? 'a' : 'b');

/** O mês fechado de amostra, com as 20 linhas (ou as 10 da série), o meu time na posição do cenário. */
export function mesDeAmostra(cenario: CenarioDoMes, time: Time, pre: boolean): { temporada: Temporada; linhas: LinhaTemporada[]; linha: LinhaTemporada; destino: DestinoDoMes } {
  const { serie, posicao } = ONDE[cenario];
  const temporada: Temporada = {
    mes: '2026-12-01',
    pre_temporada: pre,
    fechada_em: '2027-01-04T15:01:00Z',
    campeao_estreia_id: cenario === 'estreia' ? time.id : null,
  };
  const outros = TIMES.filter((t) => t.id !== ID_OUTRO && t.id !== time.id);
  const quantos = serie === 'unica' ? 20 : 10;
  // O restante da série: a Série A leva os 10 primeiros da lista, a B os 10 seguintes.
  const doResto = serie === 'b' ? outros.slice(9, 18) : outros.slice(0, quantos - 1);
  const ids = [...doResto.map((t) => t.id)];
  ids.splice(posicao - 1, 0, time.id);
  const linhas: LinhaTemporada[] = ids.map((id, i) => ({
    time_id: id,
    serie,
    posicao: i + 1,
    // Pontos de verdade num mês: no máximo 5 × 25 = 125.
    pontos: Math.max(0, 98 - i * (serie === 'unica' ? 4 : 9) - (i % 2) * 2),
    vitorias: i < 3 ? 3 - i : 0,
    ultima_posicao: i + 1,
    posicao_final: i + 1,
    destino: destinoDaPosicao(serie, i + 1),
  }));
  const linha = linhas.find((l) => l.time_id === time.id)!;
  return { temporada, linhas, linha, destino: destinoDoMes(linha, temporada)! };
}

/** Os dados e o texto do card de um cenário de amostra. */
export function amostraDoMes(
  cenario: CenarioDoMes,
  time: Time,
  o: { pre?: boolean; somou: boolean; apelido?: string | null; nivel?: string | null; luz?: DadosDoCard['luz'] },
): { dados: DadosDoCard; texto: string; destino: DestinoDoMes } {
  const m = mesDeAmostra(cenario, time, !!o.pre);
  const { ctx, rivalCaiu } = contextoDoFimDoMes(m.linha, m.linhas, time, m.temporada.mes);
  const frase = fraseDoFimDoMes(m.destino, ctx, rivalCaiu, () => 0);
  const d = dadosDoCardDoMes({
    temporada: m.temporada,
    linhas: m.linhas,
    linha: m.linha,
    time,
    destino: m.destino,
    frase,
    somou: o.somou,
    apelido: o.apelido,
    nivel: o.nivel ?? 'Craque',
  });
  return {
    dados: o.luz ? { ...d, luz: o.luz } : d,
    texto: textoDoCardDoMes(m.destino, time, m.temporada.mes, o.somou),
    destino: m.destino,
  };
}
