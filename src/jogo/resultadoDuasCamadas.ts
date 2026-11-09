// Resultado em duas camadas (B02 + C02, Rota B de 09/11/2026; docs/visual.md, "Resultado"): a ordem do destaque
// único da primeira dobra e a prévia da mensagem que o "Desafiar a galera" manda. Puro, sem DOM.

/**
 * O destaque da dobra é um só, o primeiro desta lista que a partida tiver: aviso de partida sem valer > resultado do
 * desafio recebido > medalha ou troféu novo > peça nova no vestiário > recorde novo > entrou nas 3 melhores do dia >
 * a melhor frase do narrador.
 */
export const ORDEM_DO_DESTAQUE = ['aviso', 'desafio', 'medalha', 'peca', 'recorde', 'top3', 'frase'] as const;
export type TipoDestaque = (typeof ORDEM_DO_DESTAQUE)[number];

const lugar = (t: TipoDestaque) => ORDEM_DO_DESTAQUE.indexOf(t);

/** O destaque entre os que a partida tem (null: nenhum). */
export function escolherDestaque(tem: Iterable<TipoDestaque>): TipoDestaque | null {
  let melhor: TipoDestaque | null = null;
  for (const t of tem) if (melhor === null || lugar(t) < lugar(melhor)) melhor = t;
  return melhor;
}

/** Um destaque que chegou depois (peça nova, medalha da disputa) só toma o lugar de um que vem depois dele na ordem. */
export const passaNaFrente = (novo: TipoDestaque, atual: TipoDestaque | null): boolean => atual === null || lugar(novo) < lugar(atual);

// ---------------------------------------------------------------- a mensagem

/** Pedaço da mensagem: texto corrido ou o link (que o balão mostra sem o "https://"). */
export type Pedaco = { texto: string } | { link: string; mostra: string };

const LINK = /https?:\/\/\S+/g;

/** Corta a mensagem em texto e links, na ordem. Juntar os pedaços (com o link inteiro) devolve a mensagem igual. */
export function pedacosDaMensagem(mensagem: string): Pedaco[] {
  const pedacos: Pedaco[] = [];
  let i = 0;
  for (const m of mensagem.matchAll(LINK)) {
    if (m.index > i) pedacos.push({ texto: mensagem.slice(i, m.index) });
    pedacos.push({ link: m[0], mostra: m[0].replace(/^https?:\/\//, '') });
    i = m.index + m[0].length;
  }
  if (i < mensagem.length) pedacos.push({ texto: mensagem.slice(i) });
  return pedacos;
}

/** A mensagem de volta, a partir dos pedaços (o que o teste compara com o link do WhatsApp). */
export const juntarPedacos = (pedacos: readonly Pedaco[]): string => pedacos.map((p) => ('link' in p ? p.link : p.texto)).join('');

/** O link do "Desafiar a galera": o wa.me com a mensagem inteira. */
export const linkDoWhatsApp = (mensagem: string): string => `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

/** O que o leitor de tela lê, uma vez, antes do botão: o link vira "link do desafio" (nunca letra por letra). */
export const mensagemParaLeitor = (mensagem: string): string =>
  `Mensagem que vai junto: ${pedacosDaMensagem(mensagem)
    .map((p) => ('link' in p ? 'link do desafio' : p.texto))
    .join('')
    .replace(/\s*\n\s*/g, ' ')
    .trim()}`;

/** O balão (só o texto, sem o "agora"): quebras de linha como vieram, o link em destaque e sem o "https://". */
export function htmlDoBalao(mensagem: string, esc: (s: string) => string): string {
  return pedacosDaMensagem(mensagem)
    .map((p) => ('link' in p ? `<span class="res-msg-link">${esc(p.mostra)}</span>` : esc(p.texto)))
    .join('');
}
