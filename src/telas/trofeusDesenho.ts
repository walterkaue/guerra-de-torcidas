// Desenhos dos troféus da Galeria (docs/jogo.md, seção 5, "Telas aprovadas em 05/11/2026"): SVG inline, do jogo.
// Nunca taça real, escudo ou camisa: uma taça genérica de duas alças, a flâmula lisa (cor 1 cheia e faixa reta na
// cor 2 junto do mastro) e um megafone. Puro texto (sem DOM), para servir à Galeria, à ficha e à placa da Home.
// Cores da taça em CSS (--taca, --taca-sombra); o tracejado ("ainda não") usa só contorno.

import type { TipoDeTrofeu } from '../jogo/galeria';

const OURO = 'var(--taca, #e9c75a)';
const SOMBRA = 'var(--taca-sombra, #b8920f)';

/** Taça de duas alças. `estrela`: a do Campeão da estreia; `vazia`: tracejada, para "ainda não". */
export function svgTaca(o: { estrela?: boolean; vazia?: boolean; rotulo: string }): string {
  const traco = o.vazia ? `fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2.5"` : '';
  const cheio = (cor: string) => (o.vazia ? traco : `fill="${cor}"`);
  return `<svg class="svg-taca${o.vazia ? ' vazia' : ''}" viewBox="0 0 48 56" role="img" aria-label="${o.rotulo}">
    <path d="M12 8h24v6c0 9-5 16-12 17-7-1-12-8-12-17z" ${cheio(OURO)}/>
    <path d="M12 11H6c0 7 3 11 8 12M36 11h6c0 7-3 11-8 12" fill="none" stroke="${o.vazia ? 'currentColor' : SOMBRA}" stroke-width="3" stroke-linecap="round"${o.vazia ? ' stroke-dasharray="3 2.5" stroke-width="1.6"' : ''}/>
    <rect x="21" y="31" width="6" height="8" ${cheio(SOMBRA)}/>
    <path d="M14 46h20l-2-7H16z" ${cheio(OURO)}/>
    <rect x="11" y="46" width="26" height="5" rx="1.5" ${cheio(SOMBRA)}/>
    ${o.estrela && !o.vazia ? '<path d="M24 12.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#fff"/>' : ''}
  </svg>`;
}

export interface OpcoesDaFlamula {
  /**
   * Contorno claro fino em volta da bandeira e da faixa da cor 2, para a cor 2 preta (Flamengo, Botafogo, Atlético-MG)
   * não sumir no fundo escuro (placa da Home e card do troféu). Sem ele, o contorno escuro de sempre.
   */
  contorno?: boolean;
}

/** O contorno claro da flâmula: branco translúcido, fino. */
export const CONTORNO_CLARO = 'rgba(255,255,255,.7)';

/** Flâmula lisa: mastro, cor 1 cheia e faixa reta na cor 2 junto do mastro. */
export function svgFlamula(cores: readonly [string, string] | readonly string[], rotulo: string, o: OpcoesDaFlamula = {}): string {
  const borda = o.contorno ? `stroke="${CONTORNO_CLARO}" stroke-width=".8"` : '';
  return `<svg class="svg-flamula" viewBox="0 0 40 60" role="img" aria-label="${rotulo}">
    <rect x="3" y="2" width="2.5" height="56" rx="1" fill="#d8d2c4"/>
    <circle cx="4.25" cy="2.5" r="2.2" fill="#d8d2c4"/>
    <path d="M5.5 6h31L22 23 36.5 40h-31z" fill="${cores[0]}" ${o.contorno ? borda : 'stroke="rgba(0,0,0,.25)" stroke-width=".8"'}/>
    <rect x="5.5" y="6" width="7" height="34" fill="${cores[1]}" ${borda}/>
  </svg>`;
}

/** Megafone da vitrine (Maior torcida). */
export function svgMegafone(rotulo: string): string {
  return `<svg class="svg-megafone" viewBox="0 0 56 48" role="img" aria-label="${rotulo}">
    <path d="M8 18h8l22-12v36L16 30H8z" fill="${OURO}"/>
    <rect x="4" y="17" width="6" height="14" rx="2" fill="${SOMBRA}"/>
    <path d="M14 30l3 11h6l-3-11" fill="${SOMBRA}"/>
    <path d="M44 16c3 2 4 5 4 8s-1 6-4 8M47 10c5 4 7 9 7 14s-2 10-7 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}

/** Seta de acesso (sobe pra Série A). */
export function svgAcesso(rotulo: string): string {
  return `<svg class="svg-acesso" viewBox="0 0 48 56" role="img" aria-label="${rotulo}">
    <path d="M24 4l18 20H31v26H17V24H6z" fill="var(--subiu, #3ddc84)"/>
  </svg>`;
}

/** O desenho de um troféu qualquer (ficha e placa da Home). */
export function svgDoTrofeu(tipo: TipoDeTrofeu, cores: readonly string[], rotulo: string, o: OpcoesDaFlamula = {}): string {
  switch (tipo) {
    case 'campeao_semana':
      return svgFlamula(cores, rotulo, o);
    case 'maior_torcida':
      return svgMegafone(rotulo);
    case 'acesso':
      return svgAcesso(rotulo);
    case 'campeao_estreia':
      return svgTaca({ estrela: true, rotulo });
    default:
      return svgTaca({ rotulo });
  }
}

// ---------- para o canvas ----------

const COR_COM_RESERVA = /var\(--[\w-]+,\s*(#[0-9a-fA-F]{3,8})\)/g;

/**
 * O mesmo SVG sem variáveis de CSS: `var(--taca, #e9c75a)` vira `#e9c75a` (idem `--taca-sombra` e `--subiu`) e
 * `currentColor` (as ondas do megafone) vira `traco`. Dentro de uma imagem, o SVG não enxerga o CSS da página.
 */
export function comCoresFixas(svg: string, traco = '#ffffff'): string {
  return svg.replace(COR_COM_RESERVA, '$1').replaceAll('currentColor', traco);
}

/** O SVG como endereço de imagem (data URL), no tamanho pedido, para o canvas desenhar com `drawImage`. */
export function svgParaImagem(svg: string, largura: number, altura: number, traco = '#ffffff'): string {
  const pronto = comCoresFixas(svg, traco).replace(/^<svg /, `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" `);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pronto)}`;
}

/** Proporção (largura / altura) do desenho de cada troféu, pelo viewBox. */
export function proporcaoDoTrofeu(tipo: TipoDeTrofeu): number {
  if (tipo === 'campeao_semana') return 40 / 60;
  if (tipo === 'maior_torcida') return 56 / 48;
  return 48 / 56;
}
