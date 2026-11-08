// Altura real da barra fixa de baixo (navegação ou ações do resultado), medida no navegador.
// Com a fonte do sistema grande a barra cresce; a página reserva esse espaço (--altura-barra-baixo)
// para que nenhum botão pare atrás dela (S06, S07).
//
// A variável é gravada no quadro seguinte e só quando a altura muda: gravar dentro do callback do ResizeObserver
// mexe no layout e o WebKit acusa "ResizeObserver loop completed with undelivered notifications".

const VARIAVEL = '--altura-barra-baixo';
let observador: ResizeObserver | null = null;
let quadro = 0;
let ultima = 0;

function soltar(): void {
  observador?.disconnect();
  observador = null;
  cancelAnimationFrame(quadro);
  quadro = 0;
  ultima = 0;
  document.documentElement.style.removeProperty(VARIAVEL);
}

/** Passa a medir `barra`. Só uma barra por vez; sai sozinho quando ela sai da tela. */
export function medirBarraDeBaixo(barra: HTMLElement | null): void {
  soltar();
  if (!barra || typeof ResizeObserver === 'undefined') return;
  const o = new ResizeObserver(() => {
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => {
      quadro = 0;
      if (observador !== o) return;
      if (!barra.isConnected) {
        soltar();
        return;
      }
      const h = Math.ceil(barra.getBoundingClientRect().height);
      if (h > 0 && h !== ultima) {
        ultima = h;
        document.documentElement.style.setProperty(VARIAVEL, `${h}px`);
      }
    });
  });
  observador = o;
  o.observe(barra);
}
