// Página #termos (docs/jogo.md, seção 13): o texto mora em src/dados/termos.md e vira HTML aqui.
// Puro, sem DOM. Cobre só o que o texto usa: títulos, parágrafos, listas, negrito, itálico e links.

export const DATA_DA_VERSAO = '31/10/2026';

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Trechos que nunca vão para a página. */
export const MARCAS_DE_RASCUNHO = /para o advogado revisar|a definir/i;

function emLinha(texto: string): string {
  return escapar(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function termosEmHtml(md: string): string {
  const saida: string[] = [];
  let lista: string[] = [];
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) saida.push(`<p>${emLinha(paragrafo.join(' '))}</p>`);
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista.length) saida.push(`<ul>${lista.map((i) => `<li>${emLinha(i)}</li>`).join('')}</ul>`);
    lista = [];
  };

  for (const crua of md.split(/\r?\n/)) {
    const linha = crua.trim();
    const titulo = /^(#{1,3})\s+(.+)$/.exec(linha);
    const item = /^[-*]\s+(.+)$/.exec(linha);
    if (titulo) {
      fecharParagrafo();
      fecharLista();
      const nivel = titulo[1].length + 2;
      saida.push(`<h${nivel}>${emLinha(titulo[2])}</h${nivel}>`);
    } else if (item) {
      fecharParagrafo();
      lista.push(item[1]);
    } else if (!linha || /^-{3,}$/.test(linha)) {
      fecharParagrafo();
      fecharLista();
    } else {
      fecharLista();
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  fecharLista();
  return saida.join('');
}
