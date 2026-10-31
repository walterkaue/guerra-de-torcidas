// Aviso de saída (docs/jogo.md, seção 13): o que conta como link externo. Puro, sem DOM.

/** Site de outro domínio. E-mail (mailto:) e links internos não contam. */
export function ehLinkExterno(href: string, hostDoJogo: string): boolean {
  try {
    const url = new URL(href);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.host !== hostDoJogo;
  } catch {
    return false;
  }
}

/** Domínio para mostrar no aviso, sem o "www.". */
export function dominioDoLink(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
