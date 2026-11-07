// Blocos do "Grafismo de TV" (docs/jogo.md 14.2, docs/visual.md 4.6), em HTML pronto para as telas.
// Estilo em estilos/blocos.css. Os textos que chegam aqui já vêm escapados quando são do usuário:
// as funções só escapam o que montam sozinhas.

import { esc } from '../app';
import { NOME_DA_MEDALHA, type Trilha } from '../jogo/lancesTextos';
import { AVISO_PRE_TEMPORADA } from '../jogo/posicao';
import { icone, type NomeIcone } from './icones';

/** Selo único da pré-temporada: o toque abre a explicação (details, sem JS). */
export function seloPre(): string {
  return `<details class="selo-pre">
      <summary aria-label="Pré-temporada: o que é">${icone('info')} <span class="sp-cheio">Pré-temporada</span><span class="sp-curto">Pré</span></summary>
      <p role="note">${esc(AVISO_PRE_TEMPORADA)}</p>
    </details>`;
}

/** Cabeçalho padrão: voltar (opcional), título em Anton, selo da pré-temporada e um extra à direita. */
export function cabecalhoTela(o: { titulo: string; voltar?: boolean; pre?: boolean; extra?: string }): string {
  return `<header class="cab-tela">
      ${o.voltar ? '<button class="voltar" type="button" data-voltar aria-label="Voltar">‹</button>' : ''}
      <h1 class="titulo-tela">${esc(o.titulo)}</h1>
      ${o.pre === false ? '' : seloPre()}
      ${o.extra ?? ''}
    </header>`;
}

/** Rótulo em faixa inclinada (o texto fica reto). */
export const faixa = (texto: string, tag: 'h2' | 'h3' | 'p' = 'h2'): string =>
  `<${tag} class="faixa">${esc(texto)}</${tag}>`;

/** Placa quase preta; `filete` põe a cor do time no topo (as variáveis --c1/--c2 vêm de quem envolve). */
export function placa(conteudo: string, o: { titulo?: string; filete?: boolean; classe?: string; attrs?: string } = {}): string {
  const classes = ['placa', o.filete ? 'filete' : '', o.classe ?? ''].filter(Boolean).join(' ');
  return `<section class="${classes}"${o.attrs ? ` ${o.attrs}` : ''}>
      ${o.titulo ? faixa(o.titulo) : ''}
      ${conteudo}
    </section>`;
}

/** "3º de 14" com o º fora da Anton. */
export const posicaoHtml = (posicao: number, total?: number): string =>
  `${posicao}<i>º</i>${total ? `<small>de ${total.toLocaleString('pt-BR')}</small>` : ''}`;

/** Número grande + rótulo curto. `valor` é HTML (use posicaoHtml ou números). */
export function numero(valor: string, rotulo: string, tom?: 'destaque' | 'apagado'): string {
  return `<div class="numero${tom ? ` ${tom}` : ''}"><strong>${valor}</strong><span>${esc(rotulo)}</span></div>`;
}

export type TomSelo = 'ouro' | 'subiu' | 'caiu';

/** Selo curto inclinado. `texto` é HTML (pode trazer seta ou ícone). */
export const selo = (texto: string, tom?: TomSelo, attrs = ''): string =>
  `<span class="selo${tom ? ` ${tom}` : ''}"${attrs ? ` ${attrs}` : ''}>${texto}</span>`;

/** Barra de progresso de 0 a 1, com o rótulo para leitor de tela. */
export function barra(fracao: number, rotulo: string): string {
  const f = Math.max(0, Math.min(1, fracao));
  return `<div class="barra" role="progressbar" aria-label="${esc(rotulo)}" aria-valuemin="0" aria-valuemax="100"
      aria-valuenow="${Math.round(f * 100)}"><span style="--enche:${f}"></span></div>`;
}

/** Abas: `nivel` 1 é a fileira principal; 2 é a menor e escura. Cada botão leva `data-<chave>="<id>"`. */
export function abas(chave: string, opcoes: readonly { id: string; texto: string }[], escolhida: string, nivel: 1 | 2 = 1): string {
  const grupo = `<div class="${nivel === 1 ? 'abas-tv' : 'abas-2'}" role="tablist">
      ${opcoes
        .map((o) => `<button type="button" role="tab" aria-selected="${o.id === escolhida}" data-${chave}="${esc(o.id)}">${esc(o.texto)}</button>`)
        .join('')}
    </div>`;
  // A caixa mede a largura em letras: com a fonte grande, 4 abas de 1º nível viram 2 × 2 (blocos.css).
  return nivel === 1 ? `<div class="abas-caixa">${grupo}</div>` : grupo;
}

/** Marca a aba escolhida dentro de um grupo. */
export function marcarAba(grupo: ParentNode, chave: string, id: string): void {
  grupo.querySelectorAll<HTMLElement>(`[data-${chave}]`).forEach((b) => b.setAttribute('aria-selected', String(b.dataset[chave] === id)));
}

const ICONE_DO_ESTADO: Record<'vazio' | 'erro' | 'carregando', NomeIcone> = {
  vazio: 'bola',
  erro: 'semRede',
  carregando: 'bola',
};

/**
 * Tela ou bloco sem conteúdo: vazio (com convite), erro (com "Tentar de novo") ou carregando.
 * A ação vira um botão com `data-estado-acao`; quem chama liga o clique.
 */
export function estado(tipo: 'vazio' | 'erro' | 'carregando', texto: string, o: { detalhe?: string; acao?: string } = {}): string {
  const acao = o.acao ?? (tipo === 'erro' ? 'Tentar de novo' : undefined);
  return `<div class="estado e-${tipo}"${tipo === 'carregando' ? ' aria-busy="true"' : ''}>
      ${icone(ICONE_DO_ESTADO[tipo])}
      <p>${esc(texto)}</p>
      ${o.detalhe ? `<small>${esc(o.detalhe)}</small>` : ''}
      ${acao ? `<button class="botao-linha" type="button" data-estado-acao>${esc(acao)}</button>` : ''}
    </div>`;
}

/** Liga o botão de um estado (ex.: "Tentar de novo") dentro de `el`. */
export function aoTocarNoEstado(el: ParentNode, fazer: () => void): void {
  el.querySelector('[data-estado-acao]')?.addEventListener('click', fazer);
}

/** Baixa um pedaço de tela por import(); sem rede, pinta o erro com "Tentar de novo". `vivo()` falso: saiu, não desenha. */
export function baixarPedaco<M>(el: HTMLElement, carregar: () => Promise<M>, usar: (m: M) => void, vivo: () => boolean): void {
  carregar().then(
    (m) => vivo() && usar(m),
    () => {
      if (!vivo()) return;
      el.innerHTML = estado('erro', 'Sem conexão agora.', { detalhe: 'Essa parte abre assim que a internet voltar.' });
      aoTocarNoEstado(el, () => {
        el.innerHTML = '';
        baixarPedaco(el, carregar, usar, vivo);
      });
    },
  );
}

/** Frase da trilha para leitor de tela: "Prata. 23 gols, faltam 27 pro ouro". */
export function descricaoDaTrilha(t: Trilha): string {
  const nome = t.medalha ? NOME_DA_MEDALHA[t.medalha] : 'Sem medalha';
  return `${nome}. ${t.rotulo.replace(' · ', ', ')}${t.proxima ? ` ${t.proxima === 'prata' ? 'pra' : 'pro'} ${t.proxima}` : ''}`;
}

/**
 * Trilha de medalhas de um lance (jogo.md 14.3): bronze, prata e ouro (5, 20 e 50 gols) ligados por uma linha que
 * se enche em três trechos iguais; a próxima fica preenchida em parte. `compacta` é a do card e das linhas.
 * O nome da medalha vai sempre por escrito (aria-label), nunca só a cor.
 */
export function trilha(t: Trilha, o: { compacta?: boolean } = {}): string {
  const classes = ['trilha', o.compacta ? 'compacta' : '', t.ouroCompleto ? 'ouro-completo' : '', t.enche <= 0 ? 'vazia' : '']
    .filter(Boolean)
    .join(' ');
  const marcos = t.marcos
    .map(
      (m, i) =>
        `<span class="trilha-marco" style="--k:${i + 1}"><span class="trilha-bol ${m.medalha}${m.conquistada ? ' conquistada' : m.parcial > 0 ? ' parcial' : ''}" style="--parcial:${m.parcial.toFixed(3)}"></span>${o.compacta ? '' : `<b>${m.gols}</b>`}</span>`,
    )
    .join('');
  return `<div class="${classes}" role="img" aria-label="${esc(descricaoDaTrilha(t))}" style="--enche:${t.enche.toFixed(3)};">
      <span class="trilha-via" aria-hidden="true"><span class="trilha-trilho"><i></i></span>${marcos}</span>
      <span class="trilha-rotulo" aria-hidden="true">${esc(t.rotulo)}</span>
    </div>`;
}
