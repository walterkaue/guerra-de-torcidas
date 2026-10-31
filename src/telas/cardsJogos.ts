// Cards dos jogos na Home (docs/visual.md, seção 3): nome, uma linha do que é, o desenho em SVG inline e o
// estado vivo. Desenhos leves, na paleta do jogo; as cores ficam em estilos/inicio.css.

import { TOTAL_LANCES } from '../dados/lancesResumo';
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

/** Estádio com as arquibancadas nas cores do time e a estante de troféus. Troféus inventados: nenhum imita taça de verdade. */
const ARTE_CASA = `<svg ${ARTE} viewBox="0 0 360 150" preserveAspectRatio="xMinYMax slice">
  <defs>
    <linearGradient id="casa-ouro"><stop offset="0" stop-color="#f8e7a6"/><stop offset=".5" stop-color="#e9c75a"/><stop offset="1" stop-color="#a47d28"/></linearGradient>
    <linearGradient id="casa-prata"><stop offset="0" stop-color="#f5f5f0"/><stop offset=".55" stop-color="#b8bcc0"/><stop offset="1" stop-color="#777c82"/></linearGradient>
    <radialGradient id="casa-luz"><stop offset="0" stop-color="#fff4c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff4c8" stop-opacity="0"/></radialGradient>
    <g id="casa-taca">
      <path stroke-width="0" d="M-24-104h48c0 28-8 46-24 50-16-4-24-22-24-50z"/>
      <rect stroke-width="0" x="-28" y="-108" width="56" height="6" rx="3"/>
      <path fill="none" stroke-width="5" stroke-linecap="round" d="M-24-97c-17 0-17 27 7 33M24-97c17 0 17 27-7 33"/>
      <path stroke-width="0" d="M-4-54h8l3 18h-14zM-17-36h34l4 12h-42z"/>
      <path stroke-width="0" fill="#fff" fill-opacity=".45" d="M-17-98h6c0 16 2 28 7 36-8-6-13-20-13-36z"/>
    </g>
  </defs>
  <rect class="casa-chao" y="122" width="360" height="28"/>
  <circle class="casa-brilho" cx="146" cy="16" r="40"/>
  <circle class="casa-brilho" cx="332" cy="16" r="40"/>
  <path class="casa-poste" d="M146 66V16M332 66V16"/>
  <path class="casa-refletor" d="M134 8h24v9h-24zM320 8h24v9h-24z"/>
  <path class="casa-parede" d="M118 70v36a120 38 0 0 0 240 0V70z"/>
  <path class="casa-janelas" d="M125 88a113 35 0 0 0 226 0"/>
  <ellipse class="casa-teto" cx="238" cy="70" rx="120" ry="38"/>
  <ellipse class="casa-anel1" cx="238" cy="71" rx="113" ry="33"/>
  <ellipse class="casa-povo" cx="238" cy="71" rx="105" ry="30"/>
  <ellipse class="casa-anel2" cx="238" cy="72" rx="95" ry="25"/>
  <ellipse class="casa-gramado" cx="238" cy="73" rx="79" ry="19"/>
  <path class="casa-linhas" d="M190 62h96l16 22H174zM238 62v22"/>
  <ellipse class="casa-linhas" cx="238" cy="73" rx="10" ry="4"/>
  <circle class="casa-placa-trofeu" cx="24" cy="100" r="21"/>
  <circle class="casa-placa-miolo" cx="24" cy="100" r="13"/>
  <use href="#casa-taca" transform="translate(112 146) scale(.64)" fill="url(#casa-prata)" stroke="url(#casa-prata)"/>
  <use href="#casa-taca" transform="translate(68 154)" fill="url(#casa-ouro)" stroke="url(#casa-ouro)"/>
</svg>`;

/** Seção da Casa na Home: abre a Casa do seu time, ou o índice de quem ainda não tem. */
export function htmlDaCasa(titulo: string): string {
  return `<button class="casa-home" type="button" data-acao="casa">
    <span class="casa-arte">${ARTE_CASA}</span>
    <span class="casa-rodape">
      <span class="casa-titulo faixa-tv">${titulo}</span>
      <small>Estádio, troféus, recordes e manto</small>
    </span>
  </button>`;
}

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
export function htmlDosCards(oQueELances: string, linhaLances: string): string {
  return [
    card(
      'penaltis',
      'Lances do Jogo',
      oQueELances,
      `${ARTE_LANCES}<span class="tarja-lances faixa-tv">${TOTAL_LANCES} lances</span>`,
      'largo',
      linhaLances,
    ),
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
