// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Pênaltis lance a lance (anti-trapaça antes de divulgar; jogo.md, seção 6).
// As sementes e as cobranças gravadas do desafio ficam só no servidor: o celular manda o gesto de um
// lance e recebe o resultado daquele lance, mais a dica (pé de apoio) da próxima defesa.
// Partidas novas têm uma semente por lance (SementesPartida): o resultado exato de um lance deixa achar a
// semente dele por força bruta, mas ela não diz nada dos lances seguintes.
// Módulo puro, usado pela função lance-penalti e pelos testes. O fechamento continua no simularPartida.

import {
  normalizarCobranca,
  normalizarDefesa,
  planejarDefesa,
  precisaDeOutraRodada,
  precisaDeParOuImpar,
  resolverCobrancaDaRegra,
  resolverDefesa,
  sementeDoLance,
  type GestoCobranca,
  type Gestos,
  type ResultadoCobranca,
  type ResultadoDefesa,
  type RegraPenaltis,
  type SementesPartida,
  PONTOS,
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
export class LanceInvalido extends Error {}

const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Lê o lance do corpo da lance-penalti. Só passam o tipo e o gesto (ou a zona): qualquer outro campo é ignorado, então
 * o celular nunca diz ao motor quantas cavadinhas vieram antes (o servidor conta nos gestos guardados).
 */
export function lerLance(v: unknown): Lance {
  const l = v as { tipo?: unknown; gesto?: Partial<GestoCobranca>; zona?: unknown } | null;
  if (l?.tipo === 'cobranca') {
    const g = l.gesto;
    if (!g || !numero(g.dir) || !numero(g.forca) || !numero(g.efeito)) throw new LanceInvalido('gesto inválido');
    return { tipo: 'cobranca', gesto: { dir: g.dir, forca: g.forca, efeito: g.efeito } };
  }
  if (l?.tipo === 'defesa' && numero(l.zona)) return { tipo: 'defesa', zona: l.zona };
  throw new LanceInvalido('lance inválido');
}

/** Refaz os lances já jogados e diz qual é o próximo. Gestos fora da regra lançam LanceForaDeOrdem. */
export function passoAtual(
  semente: SementesPartida,
  gestos: Gestos,
  dificuldade: number,
  gravadas?: readonly GestoCobranca[],
  tabela: RegraPenaltis = PONTOS,
): Passo {
  const nc = gestos.cobrancas.length;
  const nd = gestos.defesas.length;
  if (nd > nc || nc > nd + 1) throw new LanceForaDeOrdem('gestos fora de ordem');
  const cobrancas: ResultadoCobranca[] = [];
  const defesas: ResultadoDefesa[] = [];
  for (let i = 0; i < nd; i++) {
    if (!precisaDeOutraRodada(cobrancas, defesas)) throw new LanceForaDeOrdem(`rodada ${i + 1} não deveria existir`);
    cobrancas.push(resolverCobrancaDaRegra(sementeDoLance(semente, 'cobranca', i), i, gestos.cobrancas[i], dificuldade, tabela, gestos.cobrancas));
    defesas.push(resolverDefesa(sementeDoLance(semente, 'defesa', i), i, gestos.defesas[i], dificuldade, gravadas?.[i], tabela));
  }
  if (nc > nd) {
    if (!precisaDeOutraRodada(cobrancas, defesas)) throw new LanceForaDeOrdem(`rodada ${nc} não deveria existir`);
    return { tipo: 'defesa', i: nd, dica: planejarDefesa(sementeDoLance(semente, 'defesa', nd), nd, dificuldade, gravadas?.[nd]).dica };
  }
  if (precisaDeOutraRodada(cobrancas, defesas)) return { tipo: 'cobranca', i: nc };
  return precisaDeParOuImpar(cobrancas, defesas) ? { tipo: 'par_ou_impar' } : { tipo: 'fim' };
}

/** Joga o próximo lance. Lance que não é o esperado (cobrança na vez da defesa, partida no fim) é recusado. */
export function jogarLance(
  semente: SementesPartida,
  gestos: Gestos,
  lance: Lance,
  dificuldade: number,
  gravadas?: readonly GestoCobranca[],
  /** Regra pela data de criação da partida (motor 1 ou 2): os pontos de cada lance vão para a tela. */
  tabela: RegraPenaltis = PONTOS,
): Jogada {
  const passo = passoAtual(semente, gestos, dificuldade, gravadas, tabela);
  if (passo.tipo !== lance.tipo) throw new LanceForaDeOrdem(`esperava ${passo.tipo}, veio ${lance.tipo}`);
  if (lance.tipo === 'cobranca') {
    const gesto = normalizarCobranca(lance.gesto);
    const novos: Gestos = { cobrancas: [...gestos.cobrancas, gesto], defesas: [...gestos.defesas] };
    return {
      gestos: novos,
      // O goleiro do motor 2 conta as cavadinhas dos gestos guardados no servidor, nunca uma contagem do celular.
      cobranca: resolverCobrancaDaRegra(sementeDoLance(semente, 'cobranca', passo.i), passo.i, gesto, dificuldade, tabela, gestos.cobrancas),
      proximo: passoAtual(semente, novos, dificuldade, gravadas, tabela),
    };
  }
  const zona = normalizarDefesa(lance.zona);
  const novos: Gestos = { cobrancas: [...gestos.cobrancas], defesas: [...gestos.defesas, zona] };
  return {
    gestos: novos,
    defesa: resolverDefesa(sementeDoLance(semente, 'defesa', passo.i), passo.i, zona, dificuldade, gravadas?.[passo.i], tabela),
    proximo: passoAtual(semente, novos, dificuldade, gravadas, tabela),
  };
}
