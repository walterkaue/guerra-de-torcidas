// Altura real da barra fixa de baixo (navegação ou ações do resultado), medida no navegador.
// Com a fonte do sistema grande a barra cresce; a página reserva esse espaço (--altura-barra-baixo)
// para que nenhum botão pare atrás dela (S06, S07).

const VARIAVEL = '--altura-barra-baixo';
let observador: ResizeObserver | null = null;

function soltar(): void {
  observador?.disconnect();
  observador = null;
  document.documentElement.style.removeProperty(VARIAVEL);
}

/** Passa a medir `barra`. Só uma barra por vez; sai sozinho quando ela sai da tela. */
export function medirBarraDeBaixo(barra: HTMLElement | null): void {
  soltar();
  if (!barra || typeof ResizeObserver === 'undefined') return;
  observador = new ResizeObserver(() => {
    if (!barra.isConnected) {
      if (observador) soltar();
      return;
    }
    const h = Math.ceil(barra.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty(VARIAVEL, `${h}px`);
  });
  observador.observe(barra);
}
