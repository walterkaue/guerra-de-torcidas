// Desenhos da Casa do [time] em SVG gerado em código (docs/casa.md, seções 4 e 5).
// Tudo genérico: silhueta de estádio por formato, uma taça só, camisa com corte nosso.
// Nunca foto, fachada, taça real, escudo, símbolo, número, patrocínio ou fornecedor.

import type { FormatoEstadio, MantoCasa } from '../../dados/casa/tipos';
import type { Taca } from '../../dados/competicoes';

let seq = 0;
const uid = (p: string) => `${p}${++seq}`;

/** Estádio visto de cima: arquibancada nas cores do time em volta do gramado. */
export function svgEstadio(formato: FormatoEstadio, c1: string, c2: string): string {
  const gramado = `
    <rect x="62" y="38" width="76" height="48" rx="2" fill="#2f7d3a"/>
    <g fill="none" stroke="#e9f5e9" stroke-width="1.2" opacity="0.9">
      <rect x="66" y="42" width="68" height="40"/>
      <line x1="100" y1="42" x2="100" y2="82"/>
      <circle cx="100" cy="62" r="7"/>
      <rect x="66" y="53" width="9" height="18"/><rect x="125" y="53" width="9" height="18"/>
    </g>`;
  let arquibancada: string;
  if (formato === 'oval') {
    arquibancada = `<ellipse cx="100" cy="62" rx="88" ry="54" fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <ellipse cx="100" cy="62" rx="64" ry="38" fill="${c2}" opacity="0.35"/>`;
  } else if (formato === 'ferradura') {
    // Três lados de arquibancada e um aberto (atrás de um gol).
    arquibancada = `<path d="M24 12 H176 V112 H150 V30 H50 V112 H24 Z" fill="${c1}" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/>`;
  } else {
    arquibancada = `<rect x="22" y="10" width="156" height="104" rx="14" fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <rect x="48" y="28" width="104" height="68" rx="6" fill="${c2}" opacity="0.35"/>`;
  }
  return `<svg class="desenho-estadio" viewBox="0 0 200 124" role="img" aria-label="Silhueta de estádio ${formato}">${arquibancada}${gramado}</svg>`;
}

const METAIS: Record<Taca, [string, string]> = {
  ouro: ['#f7d774', '#b8860b'],
  prata: ['#f1f3f5', '#8a9299'],
  bronze: ['#e3a46b', '#8b5a2b'],
};

/** A taça genérica (a mesma para todas as competições), no metal da competição e com fita do time. */
export function svgTaca(taca: Taca, c1: string, c2: string): string {
  const g = uid('metal');
  const [claro, escuro] = METAIS[taca];
  return `<svg class="desenho-taca" viewBox="0 0 64 72" role="img" aria-label="Taça de ${taca}">
    <defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${escuro}"/><stop offset="0.45" stop-color="${claro}"/><stop offset="1" stop-color="${escuro}"/></linearGradient></defs>
    <path d="M14 10 C4 10 4 28 18 30" fill="none" stroke="url(#${g})" stroke-width="4"/>
    <path d="M50 10 C60 10 60 28 46 30" fill="none" stroke="url(#${g})" stroke-width="4"/>
    <path d="M14 6 H50 V18 C50 32 42 40 32 40 C22 40 14 32 14 18 Z" fill="url(#${g})"/>
    <rect x="29" y="40" width="6" height="12" fill="url(#${g})"/>
    <path d="M20 56 H44 L46 64 H18 Z" fill="url(#${g})"/>
    <path d="M24 46 L32 51 L40 46 L40 54 L32 50 L24 54 Z" fill="${c1}" stroke="${c2}" stroke-width="1.2"/>
  </svg>`;
}

/** Silhueta da camisa (corte único para os 20 clubes): gola redonda simples, manga curta. */
const CAMISA = 'M32 8 C38 13 62 13 68 8 L92 20 L84 40 L74 35 L74 92 L26 92 L26 35 L16 40 L8 20 Z';

/** O manto: padrão e cores na silhueta nossa. Sem escudo, símbolo, número, patrocínio ou fornecedor. */
export function svgManto(m: Pick<MantoCasa, 'padrao' | 'cores' | 'listras'>, rotulo: string): string {
  const cores = m.cores.length ? m.cores : ['#ffffff'];
  const [a, b = cores[0]] = cores;
  const clip = uid('camisa');
  let padrao: string;
  switch (m.padrao) {
    case 'listras-v': {
      const n = Math.max(3, Math.min(13, m.listras ?? 7));
      const w = 84 / n;
      padrao = Array.from({ length: n }, (_, i) => `<rect x="${8 + i * w}" y="0" width="${w + 0.2}" height="100" fill="${cores[i % cores.length]}"/>`).join('');
      break;
    }
    case 'aros': {
      const n = Math.max(3, Math.min(11, m.listras ?? 6));
      const h = 84 / n;
      padrao = Array.from({ length: n }, (_, i) => `<rect x="0" y="${8 + i * h}" width="100" height="${h + 0.2}" fill="${cores[i % cores.length]}"/>`).join('');
      break;
    }
    case 'faixa-diagonal':
      padrao = `<rect width="100" height="100" fill="${a}"/><path d="M20 0 L40 0 L90 100 L70 100 Z" fill="${b}"/>`;
      break;
    case 'faixa-peito': {
      // Uma faixa (ou duas cores em faixas) atravessando o peito.
      const faixas = cores.slice(1);
      const h = 14 / Math.max(1, faixas.length);
      padrao = `<rect width="100" height="100" fill="${a}"/>` + faixas.map((c, i) => `<rect x="0" y="${38 + i * h}" width="100" height="${h + 0.2}" fill="${c}"/>`).join('');
      break;
    }
    default:
      padrao = `<rect width="100" height="100" fill="${a}"/>`;
  }
  const contorno = a.toLowerCase() === '#ffffff' || a.toLowerCase() === '#f5f5f0' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.25)';
  return `<svg class="desenho-manto" viewBox="0 0 100 100" role="img" aria-label="${rotulo}">
    <defs><clipPath id="${clip}"><path d="${CAMISA}"/></clipPath></defs>
    <g clip-path="url(#${clip})">${padrao}</g>
    <path d="${CAMISA}" fill="none" stroke="${contorno}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M32 8 C38 13 62 13 68 8" fill="none" stroke="${contorno}" stroke-width="2"/>
  </svg>`;
}
