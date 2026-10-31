// "Seja sócio" na Casa do [time] (docs/jogo.md 7.4): textos, link de saída e o limite de um clique
// por clube por dia no aparelho. Sem DOM: testado em socio.test.ts.

import type { Time } from '../../dados/times';

const CHAVE_CLIQUES = 'gdt:socio-cliques';
const UTM = { utm_source: 'guerradetorcidas', utm_medium: 'casa', utm_campaign: 'socio' };

export function textosDoSocio(t: Pick<Time, 'nome' | 'artigo'>, programa: string) {
  return {
    titulo: `Apoie ${t.artigo} ${t.nome} fora do jogo`,
    linha: `O programa oficial de sócio torcedor é o ${programa}.`,
    saida: `Você vai para o site oficial ${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}. O Guerra de Torcidas não tem ligação com o clube.`,
  };
}

/** O endereço do programa com os utm, mantendo os parâmetros que ele já tenha. */
export function linkDoSocio(url: string): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(UTM)) u.searchParams.set(k, v);
  return u.toString();
}

/** Guarda só clube → último dia contado; a memória cobre o aparelho sem armazenamento. */
const naMemoria: Record<string, string> = {};

type Armazem = () => Pick<Storage, 'getItem' | 'setItem'>;

function lerCliques(armazem: Armazem): Record<string, string> {
  try {
    const salvo: unknown = JSON.parse(armazem().getItem(CHAVE_CLIQUES) ?? '{}');
    return salvo && typeof salvo === 'object' ? (salvo as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * true uma vez por clube por dia: quem chama conta o clique só quando recebe true.
 * `armazem` é função porque só de tocar em localStorage o navegador pode lançar erro.
 */
export function primeiroCliqueDoDia(clube: string, dia: string, armazem: Armazem = () => localStorage): boolean {
  const salvos = lerCliques(armazem);
  if (salvos[clube] === dia || naMemoria[clube] === dia) return false;
  naMemoria[clube] = dia;
  try {
    armazem().setItem(CHAVE_CLIQUES, JSON.stringify({ ...salvos, [clube]: dia }));
  } catch {
    // sem espaço ou bloqueado: a memória segura até recarregar a página
  }
  return true;
}
