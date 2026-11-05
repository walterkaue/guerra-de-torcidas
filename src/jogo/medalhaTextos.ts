// Card só da medalha (docs/jogo.md 7.3, "Card de medalha"): a frase "Já sou ouro no…", o texto de compartilhar e o
// link do lance. Título do lance sempre, nunca nome de pessoa (seção 8): a ficha factual não entra aqui. Puro.

import { SELECAO } from '../dados/adversarios';
import { DISPUTAS } from '../dados/disputas';
import { LANCES } from '../dados/lances';
import { timePorId } from '../dados/times';
import type { Disputa } from './disputas';
import { caminhoDoItem } from './enderecoDoLance';
import type { Lance, Medalha } from './lances';
import { itemPenaltis } from './regraLances';

export const SITE_DA_MEDALHA = 'https://torcida.kauewalter.com.br';

/** O que o card e o texto precisam de um lance ou de uma disputa de pênaltis. */
export interface ItemDaMedalha {
  /** Id do item nas medalhas: o do lance ou `penaltis:<disputa>`. */
  itemId: string;
  tipo: 'lance' | 'disputa';
  titulo: string;
  /** Nome do clube do lance ("Seleção" nos da Seleção). */
  clube: string;
  adversario: string;
  /** "1981" */
  ano: string;
  /** "#lance/<id>" ou "#disputa/<id>": abre a ficha do item na tela dos Lances. */
  caminho: string;
}

export interface Catalogo {
  lances: readonly Pick<Lance, 'id' | 'clube' | 'titulo' | 'data' | 'adversario'>[];
  disputas: readonly Pick<Disputa, 'id' | 'clube' | 'titulo' | 'data' | 'adversario'>[];
}

const CATALOGO: Catalogo = { lances: LANCES, disputas: DISPUTAS };

const nomeDoClube = (clube: string): string => (clube === 'selecao' ? SELECAO.nome : (timePorId(clube)?.nome ?? SELECAO.nome));

const PREFIXO_PENALTIS = itemPenaltis('');

/** O item da medalha pelo id dela, ou null se saiu do catálogo (ou é a Disputa livre, que não tem medalha). */
export function itemDaMedalha(itemId: string, catalogo: Catalogo = CATALOGO): ItemDaMedalha | null {
  if (itemId.startsWith(PREFIXO_PENALTIS)) {
    const d = catalogo.disputas.find((x) => itemPenaltis(x.id) === itemId);
    if (!d) return null;
    return {
      itemId,
      tipo: 'disputa',
      titulo: d.titulo,
      clube: nomeDoClube(d.clube),
      adversario: d.adversario,
      ano: d.data.slice(0, 4),
      caminho: caminhoDoItem(itemId),
    };
  }
  const l = catalogo.lances.find((x) => x.id === itemId);
  if (!l) return null;
  return {
    itemId,
    tipo: 'lance',
    titulo: l.titulo,
    clube: nomeDoClube(l.clube),
    adversario: l.adversario,
    ano: l.data.slice(0, 4),
    caminho: `#lance/${l.id}`,
  };
}

const CONTRACOES: [RegExp, string][] = [
  [/^Os /, 'nos '],
  [/^As /, 'nas '],
  [/^O /, 'no '],
  [/^A /, 'na '],
];

/**
 * "O primeiro gol de Tóquio" → "no primeiro gol de Tóquio"; "A virada em Lima" → "na virada em Lima".
 * Título sem artigo no começo: "no lance Gol 100 do goleiro" / "na disputa Três defesas em Assunção".
 */
export function noTitulo(titulo: string, tipo: ItemDaMedalha['tipo']): string {
  for (const [artigo, contracao] of CONTRACOES) if (artigo.test(titulo)) return titulo.replace(artigo, contracao);
  return `${tipo === 'disputa' ? 'na disputa' : 'no lance'} ${titulo}`;
}

/** "Flamengo x Liverpool (1981)", com o clube primeiro, como na lembrança das disputas. */
export const jogoDoItem = (item: ItemDaMedalha): string => `${item.clube} x ${item.adversario} (${item.ano})`;

/** "Já sou ouro no primeiro gol de Tóquio — Flamengo x Liverpool (1981)" */
export const fraseDaMedalha = (medalha: Medalha, item: ItemDaMedalha): string =>
  `Já sou ${medalha} ${noTitulo(item.titulo, item.tipo)} — ${jogoDoItem(item)}`;

/** O link que abre a ficha do lance (ou da disputa) na tela dos Lances. */
export const linkDaMedalha = (item: ItemDaMedalha, site = SITE_DA_MEDALHA): string => `${site}/${item.caminho}`;

/** O destaque grande do card, no lugar dos pontos. */
export const MEDALHA_NO_CARD: Record<Medalha, string> = { ouro: 'OURO', prata: 'PRATA', bronze: 'BRONZE' };

/** Embaixo do destaque: "Fulano pro Flamengo", "Medalha pro Flamengo" ou, sem time, "Medalha nos Lances do Jogo". */
export function quemNaMedalha(apelido: string | undefined, paraTime: string | null): string {
  if (apelido && paraTime) return `${apelido} ${paraTime}`;
  if (apelido) return `Medalha de ${apelido}`;
  return paraTime ? `Medalha ${paraTime}` : 'Medalha nos Lances do Jogo';
}

/** O adesivo do card: uma provocação curta, sem nome de ninguém. */
export const ADESIVO_DA_MEDALHA: Record<Medalha, string> = {
  bronze: 'A primeira de muitas. Vem buscar a sua.',
  prata: 'Agora é rumo ao ouro. Duvido você chegar antes.',
  ouro: 'Ouro no peito. Quem do grupo chega lá?',
};

/**
 * Texto de compartilhar, com emoji antigo (seção 6, "Card de resultado": 🏆 é de 2010, sem seletor de variação).
 * Uma linha por coisa: o jogo, a frase, de quem é a medalha e o link do lance.
 */
export function textoDeMandarMedalha(medalha: Medalha, item: ItemDaMedalha, paraTime: string | null, link: string): string {
  return [
    `🏆 Guerra de Torcidas · ${item.tipo === 'disputa' ? 'Pênaltis' : 'Lances do Jogo'}`,
    fraseDaMedalha(medalha, item),
    ...(paraTime ? [`Medalha ${paraTime}`] : []),
    link,
  ].join('\n');
}
