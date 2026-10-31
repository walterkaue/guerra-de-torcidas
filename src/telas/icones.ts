// Ícones da interface em SVG de traço (docs/visual.md, "Ícones"). Emoji muda de desenho em cada
// marca de celular e os mais novos (🟢, 🧤, 🧱) viram quadradinho em Android antigo; o SVG sai
// igual em todo aparelho, herda a cor do texto (currentColor) e escala com o font-size (1em).
// Emoji continua só no texto que vai para o WhatsApp, que desenha os próprios.

const TRACOS = {
  bola: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4.3 3.1-1.6 5H9.3l-1.6-5zM12 7.5V3m4.3 7.6 4.3-1.4m-5.9 6.4 2.6 3.7M9.3 15.6l-2.6 3.7M7.7 10.6 3.4 9.2"/>',
  lapis: '<path d="M4 20l1-4L16 5l3 3L8 19zm10-13 3 3"/>',
  podio: '<path d="M3 20h18M5 20v-6h4v6m1 0V9h4v11m1 0v-8h4v8"/>',
  estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  sino: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zm4 4a2 2 0 004 0"/>',
  balao: '<path d="M4 5h16v11H9l-5 4z"/>',
  som: '<path d="M4 9v6h4l5 4V5L8 9zm12 0a4 4 0 010 6m2.5-8.5a7.5 7.5 0 010 11"/>',
  mudo: '<path d="M4 9v6h4l5 4V5L8 9zm12 0 5 6m0-6-5 6"/>',
  mao: '<path d="M8 13V6a1.5 1.5 0 013 0v5-6.5a1.5 1.5 0 013 0V11 6a1.5 1.5 0 013 0v8a7 7 0 01-7 7h-.5a6 6 0 01-4.6-2.2L4 15.5a1.5 1.5 0 012.3-1.9L8 15.5"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4m8-4h3a3 3 0 01-3 4m-4 3v4m-4 3h8m-7-3h6"/>',
  curva: '<path d="M5 19c0-8 4-12 12-12m-3-3 3 3-3 3"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  olho: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  grafico: '<path d="M4 4v16h16M8 16v-4m4 4V8m4 8v-6"/>',
  celular: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  pergunta: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5m0 3h.01"/>',
  xis: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6m0-6-6 6"/>',
  lampada: '<path d="M9 18h6m-5 3h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  tesoura: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5 20 18M8.5 16.5 20 6"/>',
  megafone: '<path d="M3 10v4h3l9 5V5l-9 5zm15-1a4 4 0 010 6M7 14l1 5h3l-1-4"/>',
  troca: '<path d="M4 8h13l-3-3m6 11H7l3 3"/>',
  barreira: '<path d="M3 6h18v12H3zm0 6h18M9 6v6m6-6v6m-9 0v6m6-6v6m6-6v6"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
} as const;

export type NomeIcone = keyof typeof TRACOS;

/** `<svg>` do ícone, decorativo (aria-hidden): o rótulo vem do texto ou do aria-label do botão. */
export function icone(nome: NomeIcone): string {
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TRACOS[nome]}</svg>`;
}

/** Bolinha das pistas do Time do Dia (igual, perto, longe), no lugar de 🟢 🟡 ⚪. */
export const bolinha = (tom: 'certo' | 'perto' | 'longe'): string => `<span class="bolinha ${tom}" aria-hidden="true"></span>`;
