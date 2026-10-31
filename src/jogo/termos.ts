// Página #termos (docs/jogo.md, seção 13): o texto mora em src/dados/termos.md e vira HTML aqui.
// Puro, sem DOM. Cobre só o que o texto usa: títulos, parágrafos, listas, tabela, negrito, itálico e links.

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

const celulas = (linha: string) => linha.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Tabela vira fichas: três colunas de texto não cabem em 390 px, e rolar para o lado não pode. */
function fichas(linhas: string[]): string {
  const [titulos, ...resto] = linhas.filter((l) => !/^[\s|:-]+$/.test(l)).map(celulas);
  return `<dl class="termos-fichas">${resto
    .map(
      ([nome, ...valores]) =>
        `<div><dt>${emLinha(nome)}</dt>${valores.map((v, i) => `<dd><small>${emLinha(titulos[i + 1])}</small>${emLinha(v)}</dd>`).join('')}</div>`,
    )
    .join('')}</dl>`;
}

export function termosEmHtml(md: string): string {
  const saida: string[] = [];
  let lista = null as { tag: 'ul' | 'ol'; itens: string[] } | null;
  let paragrafo: string[] = [];
  let tabela: string[] = [];

  const fecharBlocos = () => {
    if (paragrafo.length) saida.push(`<p>${emLinha(paragrafo.join(' '))}</p>`);
    if (lista) saida.push(`<${lista.tag}>${lista.itens.map((i) => `<li>${emLinha(i)}</li>`).join('')}</${lista.tag}>`);
    if (tabela.length) saida.push(fichas(tabela));
    paragrafo = [];
    lista = null;
    tabela = [];
  };

  for (const crua of md.split(/\r?\n/)) {
    const linha = crua.trim();
    const titulo = /^(#{1,3})\s+(.+)$/.exec(linha);
    const item = /^[-*]\s+(.+)$/.exec(linha);
    const numerado = /^\d+\.\s+(.+)$/.exec(linha);
    if (titulo) {
      fecharBlocos();
      const nivel = titulo[1].length + 2;
      saida.push(`<h${nivel}>${emLinha(titulo[2])}</h${nivel}>`);
    } else if (item || numerado) {
      const tag = item ? 'ul' : 'ol';
      if (lista?.tag !== tag) {
        fecharBlocos();
        lista = { tag, itens: [] };
      }
      lista!.itens.push((item ?? numerado)![1]);
    } else if (linha.startsWith('|')) {
      if (!tabela.length) fecharBlocos();
      tabela.push(linha);
    } else if (!linha || /^-{3,}$/.test(linha)) {
      fecharBlocos();
    } else {
      if (lista || tabela.length) fecharBlocos();
      paragrafo.push(linha);
    }
  }
  fecharBlocos();
  return saida.join('');
}
