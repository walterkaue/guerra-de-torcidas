// Cards dos jogos na Home (docs/visual.md, seção 3): nome, uma linha do que é, o desenho em SVG inline e o
// estado vivo. Desenhos leves, na paleta do jogo; as cores ficam em estilos/inicio.css.

import { PERGUNTAS } from '../jogo/prova';
import { TENTATIVAS, type Tom } from '../jogo/timeDoDia';
import type { JogoDaHome } from '../jogo/home';

const ARTE = 'class="arte" aria-hidden="true" focusable="false"';

/** Gol com rede e o rastro amarelo de uma bola entrando no ângulo. */
const ARTE_LANCES = `<svg ${ARTE} viewBox="0 0 150 96">
  <path class="arte-rede" d="M12 30h126M12 46h126M12 62h126M30 16v64M48 16v64M66 16v64M84 16v64M102 16v64M120 16v64"/>
  <path class="arte-trave" d="M12 80V16h126v64"/>
  <path class="arte-rastro" d="M0 96C42 92 84 70 112 34"/>
  <circle class="arte-bola" cx="114" cy="31" r="6"/>
</svg>`;

/** Escada de 8 degraus: os que o recorde já alcançou ficam acesos. */
export function arteEscada(acesos: number): string {
  const degraus = Array.from({ length: PERGUNTAS }, (_, i) => {
    const altura = 12 + i * 10;
    return `<rect class="arte-degrau${i < acesos ? ' aceso' : ''}" x="${i * 11}" y="${84 - altura}" width="9" height="${altura}" rx="1.5"/>`;
  });
  return `<svg ${ARTE} viewBox="0 0 86 84">${degraus.join('')}</svg>`;
}

/** Grade de bolinhas do Time do Dia: uma linha por chute, nas cores das células. */
export function arteGrade(chutes: readonly (readonly Tom[])[]): string {
  const bolinhas: string[] = [];
  for (let l = 0; l < TENTATIVAS; l++) {
    for (let c = 0; c < TENTATIVAS; c++) {
      const tom = chutes[l]?.[c];
      bolinhas.push(`<circle class="arte-pista${tom ? ` ${tom}` : ''}" cx="${7 + c * 14}" cy="${7 + l * 14}" r="5.5"/>`);
    }
  }
  return `<svg ${ARTE} viewBox="0 0 84 84">${bolinhas.join('')}</svg>`;
}

const texto = (t: string) => `<span class="status-jogo rotulo" aria-live="polite">${t}</span>`;

function card(id: JogoDaHome, nome: string, oQueE: string, arte: string, classe: string, linha: string): string {
  return `<button class="card-jogo ${classe}" type="button" data-jogo="${id}">
    <span class="card-arte" data-arte>${arte}</span>
    <span class="nome-jogo">${nome}</span>
    <span class="o-que-e">${oQueE}</span>
    ${texto(linha)}
  </button>`;
}

/** Os quatro cards, em tamanhos diferentes: Lances e Crava largos, Prova e Time do Dia lado a lado. */
export function htmlDosCards(linhaLances: string): string {
  return [
    card('penaltis', 'Lances do Jogo', 'Pênaltis, faltas e cara a cara', ARTE_LANCES, 'largo', linhaLances),
    card('prova', 'Prova de Boleiro', '8 perguntas, para quando quiser', arteEscada(0), 'metade', ''),
    card('dia', 'Time do Dia', 'O clube secreto em 6 chutes', arteGrade([]), 'metade', ''),
    card(
      'crava',
      'Crava a Rodada',
      'Palpita o placar do Brasileirão',
      '<span class="tarja-placar faixa-tv" data-placar>? x ?</span>',
      'largo',
      '',
    ),
  ].join('');
}
