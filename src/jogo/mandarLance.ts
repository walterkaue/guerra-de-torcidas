// "Mandar esse lance" (tela única dos Lances, docs/jogo.md 14.7): o texto e o link que a ficha manda pela folha de
// compartilhar do navegador. Só o título do lance e o nome do clube: a ficha factual pode citar jogador real e nunca
// entra aqui (regra "Nomes reais", seção 8). Emoji só o ⚽, que aparece em celular antigo. Puro: sem DOM.

import { caminhoDoItem } from './enderecoDoLance';
import { LINK_DO_JOGO } from './galeria';

export interface LanceParaMandar {
  titulo: string;
  /** Nome de exibição do clube do lance (na Seleção, o nome que a tela mostra). */
  clube: string;
  adversario: string;
  /** "AAAA-MM-DD". */
  data: string;
}

/** O link da ficha: `…/#lance/<id>` ou, para o item `penaltis:<disputa>`, `…/#disputa/<id>`. */
export const linkDoItem = (itemId: string): string => `${LINK_DO_JOGO}/${caminhoDoItem(itemId)}`;

export const textoDoLanceParaMandar = (l: LanceParaMandar): string =>
  `⚽ Lance do Guerra de Torcidas: ${l.titulo} (${l.clube} x ${l.adversario}, ${l.data.slice(0, 4)}). Consegue carimbar?`;

export const textoDaDisputaParaMandar = (titulo: string): string =>
  `⚽ Disputa de pênaltis no Guerra de Torcidas: ${titulo}. Bate comigo?`;

/** O que vai para a área de transferência quando não há folha de compartilhar. */
export const textoParaCopiar = (texto: string, link: string): string => `${texto} ${link}`;
