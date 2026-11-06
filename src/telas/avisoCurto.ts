// Aviso curto no pé da tela (some sozinho em 4 s). Fica no <body>, então sobrevive à troca de tela.

let atual: HTMLElement | null = null;
let relogio: number | undefined;

export function avisoCurto(texto: string): void {
  atual?.remove();
  window.clearTimeout(relogio);
  const el = document.createElement('p');
  el.className = 'aviso-curto';
  el.setAttribute('role', 'status');
  el.textContent = texto;
  document.body.append(el);
  atual = el;
  relogio = window.setTimeout(() => {
    el.remove();
    if (atual === el) atual = null;
  }, 4000);
}
