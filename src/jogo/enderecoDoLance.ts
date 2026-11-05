// Endereço que abre a ficha de um lance ou de uma disputa de pênaltis (o link do card da medalha, docs/jogo.md 7.3):
// `#lance/<id>` e `#disputa/<id>`. Leve de propósito (sem o catálogo): entra no main.ts. Quem confere se o id existe
// é a tela dos Lances, que só abre a ficha de item do catálogo. Puro.

/** O mesmo prefixo de `itemPenaltis` (regraLances.ts), sem puxar as tabelas de pontos para a primeira carga. */
const PENALTIS = 'penaltis:';

/** "#lance/<id>" para um lance; "#disputa/<id>" para o item `penaltis:<id>`. */
export const caminhoDoItem = (itemId: string): string =>
  itemId.startsWith(PENALTIS) ? `#disputa/${itemId.slice(PENALTIS.length)}` : `#lance/${itemId}`;

/** O id do item (lance ou `penaltis:<disputa>`) que o endereço pede, ou null se não for um desses endereços. */
export function itemDoEndereco(hash: string): string | null {
  const m = /^#(lance|disputa)\/([a-z0-9-]{1,80})$/.exec(hash);
  if (!m) return null;
  return m[1] === 'lance' ? m[2] : `${PENALTIS}${m[2]}`;
}
