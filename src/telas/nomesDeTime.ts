// Nome do time em cartão estreito: nunca quebra no meio da palavra (J07). Se a palavra mais larga não cabe, a fonte
// encolhe (até 10 px); quebrar entre palavras ("SÃO PAULO") continua valendo. Roda de novo quando a fonte do jogo carrega.
const MIN = 10;

function caber(el: HTMLElement): void {
  el.style.fontSize = '';
  el.style.whiteSpace = el.textContent?.includes('-') ? 'nowrap' : ''; // "ATHLETICO-PR" não parte no hífen
  const base = parseFloat(getComputedStyle(el).fontSize) || 16;
  let tam = base;
  while (el.scrollWidth > el.clientWidth + 0.5 && tam > MIN) {
    tam -= 0.5;
    el.style.fontSize = `${tam}px`;
  }
}

export function ajustarNomesDeTime(raiz: ParentNode): void {
  const rodar = () => raiz.querySelectorAll<HTMLElement>('.cartao-time .nome-time').forEach(caber);
  rodar();
  void document.fonts?.ready.then(rodar);
}
