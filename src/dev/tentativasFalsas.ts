// Só em desenvolvimento: as 3 tentativas falsas de quem chamou no desafio dos Lances (?lancesFalsos e ?homeFalsa com
// ?l=), calculadas de verdade pelo motor (resolverLance), com sementes e gestos fixos, para o telão redesenhar chutes que
// o motor faria. Padrão: 2 gols (o 1º carimbando) e uma defesa no meio, e os pontos batem com o total do resumo.
//   &x1SemGols         nenhum gol nas 3 (some o telão, fica a fita e a linha da faixa)
//   &x1SemTentativas   sem tentativas (servidor antigo ou partida antiga: o convite de antes)
// Nunca entra no build de produção (só os falsos de src/dev importam este arquivo).

import { TABELA_LANCES_UNIFICADA, resolverLance, type DesfechoLance, type Lance, type ResultadoLance } from '../jogo/lances';
import { faixaNaTela } from '../jogo/lancesTextos';
import type { GestoCobranca } from '../jogo/penaltis';
import { tentativasDoResumo, type TentativaDoDesafio } from '../jogo/tentativasDoDesafio';

type Quer = (r: ResultadoLance) => boolean;

const GESTOS: GestoCobranca[] = [];
for (const forca of [72, 58, 85, 45, 64, 92])
  for (let dir = -90; dir <= 90; dir += 15) for (const efeito of [0, 25, -25]) GESTOS.push({ dir, forca, efeito });

/** A 1ª semente (de 1 em diante) e o 1º gesto da grade que dão o desfecho pedido, no lance i. Sempre os mesmos. */
function achar(l: Lance, i: number, quer: Quer): ResultadoLance & { gesto: GestoCobranca } {
  for (let semente = 1; semente <= 400; semente++)
    for (const gesto of GESTOS) {
      const r = resolverLance(semente, i, l, gesto, TABELA_LANCES_UNIFICADA);
      if (quer(r)) return { ...r, gesto };
    }
  throw new Error(`tentativa falsa não encontrada no lance ${l.id}`);
}

const tres = (n: number) => Math.round(n * 1000) / 1000;
/** Como o servidor devolve: só os campos da lista, números com 3 casas. */
const comoOServidor = (r: ResultadoLance & { gesto: GestoCobranca }) => ({
  desfecho: r.desfecho,
  pontos: r.pontos,
  recriou: r.recriou,
  cavadinha: r.cavadinha,
  x: tres(r.x),
  y: tres(r.y),
  goleiroX: tres(r.goleiroX),
  tFim: tres(r.tFim),
  gesto: r.gesto,
});

const naoGol = (d: DesfechoLance[]): Quer => (r) => d.includes(r.desfecho);

/** O resumo falso do desafio ganha as tentativas (e pontos, gols e carimbos que batem com elas). */
export function comTentativasFalsas<T extends { pontos: number; gols: number; recriados: number; faixa: string; tentativas?: TentativaDoDesafio[] | null }>(
  resumo: T,
  lance: Lance,
  params: URLSearchParams,
): T {
  if (params.has('x1SemTentativas')) return { ...resumo, tentativas: null };
  const l = { ...lance, faixa: faixaNaTela(lance).faixa };
  const pedido: Quer[] = params.has('x1SemGols')
    ? [naoGol(['defesa']), naoGol(['barreira', 'trave', 'fora']), naoGol(['fora', 'trave', 'defesa'])]
    : [(r) => r.desfecho === 'gol' && r.recriou, naoGol(['defesa']), (r) => r.desfecho === 'gol' && !r.recriou];
  const tentativas = tentativasDoResumo(pedido.map((q, i) => comoOServidor(achar(l, i, q))));
  if (!tentativas) return { ...resumo, tentativas: null };
  return {
    ...resumo,
    faixa: l.faixa,
    pontos: tentativas.reduce((s, t) => s + t.pontos, 0),
    gols: tentativas.filter((t) => t.desfecho === 'gol').length,
    recriados: tentativas.filter((t) => t.recriou).length,
    tentativas,
  };
}
