// Pênaltis lance a lance (anti-trapaça antes de divulgar; jogo.md, seção 6).
// A semente e as cobranças gravadas do desafio ficam só no servidor: o celular manda o gesto de um
// lance e recebe o resultado daquele lance, mais a dica (pé de apoio) da próxima defesa.
// Módulo puro, usado pela função lance-penalti e pelos testes. O fechamento continua no simularPartida.

import {
  normalizarCobranca,
  normalizarDefesa,
  planejarDefesa,
  precisaDeOutraRodada,
  precisaDeParOuImpar,
  resolverCobranca,
  resolverDefesa,
  type GestoCobranca,
  type Gestos,
  type ResultadoCobranca,
  type ResultadoDefesa,
} from './penaltis.ts';

/** O que a partida espera agora. Na defesa vem só a dica: alvo e "erra" ficam no servidor. */
export type Passo =
  | { tipo: 'cobranca'; i: number }
  | { tipo: 'defesa'; i: number; dica: number }
  | { tipo: 'par_ou_impar' }
  | { tipo: 'fim' };

export type Lance = { tipo: 'cobranca'; gesto: GestoCobranca } | { tipo: 'defesa'; zona: number };

export interface Jogada {
  /** Gestos já normalizados, com este lance no fim (é o que o servidor guarda). */
  gestos: Gestos;
  cobranca?: ResultadoCobranca;
  defesa?: ResultadoDefesa;
  proximo: Passo;
}

export class LanceForaDeOrdem extends Error {}

/** Refaz os lances já jogados e diz qual é o próximo. Gestos fora da regra lançam LanceForaDeOrdem. */
export function passoAtual(
  semente: number,
  gestos: Gestos,
  dificuldade: number,
  gravadas?: readonly GestoCobranca[],
): Passo {
  const nc = gestos.cobrancas.length;
  const nd = gestos.defesas.length;
  if (nd > nc || nc > nd + 1) throw new LanceForaDeOrdem('gestos fora de ordem');
  const cobrancas: ResultadoCobranca[] = [];
  const defesas: ResultadoDefesa[] = [];
  for (let i = 0; i < nd; i++) {
    if (!precisaDeOutraRodada(cobrancas, defesas)) throw new LanceForaDeOrdem(`rodada ${i + 1} não deveria existir`);
    cobrancas.push(resolverCobranca(semente, i, gestos.cobrancas[i], dificuldade));
    defesas.push(resolverDefesa(semente, i, gestos.defesas[i], dificuldade, gravadas?.[i]));
  }
  if (nc > nd) {
    if (!precisaDeOutraRodada(cobrancas, defesas)) throw new LanceForaDeOrdem(`rodada ${nc} não deveria existir`);
    return { tipo: 'defesa', i: nd, dica: planejarDefesa(semente, nd, dificuldade, gravadas?.[nd]).dica };
  }
  if (precisaDeOutraRodada(cobrancas, defesas)) return { tipo: 'cobranca', i: nc };
  return precisaDeParOuImpar(cobrancas, defesas) ? { tipo: 'par_ou_impar' } : { tipo: 'fim' };
}

/** Joga o próximo lance. Lance que não é o esperado (cobrança na vez da defesa, partida no fim) é recusado. */
export function jogarLance(
  semente: number,
  gestos: Gestos,
  lance: Lance,
  dificuldade: number,
  gravadas?: readonly GestoCobranca[],
): Jogada {
  const passo = passoAtual(semente, gestos, dificuldade, gravadas);
  if (passo.tipo !== lance.tipo) throw new LanceForaDeOrdem(`esperava ${passo.tipo}, veio ${lance.tipo}`);
  if (lance.tipo === 'cobranca') {
    const gesto = normalizarCobranca(lance.gesto);
    const novos: Gestos = { cobrancas: [...gestos.cobrancas, gesto], defesas: [...gestos.defesas] };
    return {
      gestos: novos,
      cobranca: resolverCobranca(semente, passo.i, gesto, dificuldade),
      proximo: passoAtual(semente, novos, dificuldade, gravadas),
    };
  }
  const zona = normalizarDefesa(lance.zona);
  const novos: Gestos = { cobrancas: [...gestos.cobrancas], defesas: [...gestos.defesas, zona] };
  return {
    gestos: novos,
    defesa: resolverDefesa(semente, passo.i, zona, dificuldade, gravadas?.[passo.i]),
    proximo: passoAtual(semente, novos, dificuldade, gravadas),
  };
}
