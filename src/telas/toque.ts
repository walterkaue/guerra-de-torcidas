// Resposta ao toque (docs/visual.md, "Movimento e toque"): vibração curta no Android.
// O iPhone não tem navigator.vibrate, então a resposta principal é sempre a visual (botão que afunda
// e volta com mola); a vibração é um bônus. Padrões curtos: o tempo vibrando somado não passa de 200 ms.

import { prefs } from '../estado';

export type Toque = 'leve' | 'acerto' | 'erro' | 'gol' | 'trave' | 'apitoFinal';

export const PADROES: Record<Toque, number | number[]> = {
  leve: 8,
  acerto: 22,
  erro: [30, 50, 30],
  gol: [60, 40, 90],
  /** Dois toques secos: a bola bateu e voltou. */
  trave: [25, 35, 25],
  /** Um toque em cada sopro do apito final (0, 0,3 e 0,6 s): 110 ms vibrando em 0,66 s. */
  apitoFinal: [25, 275, 25, 275, 60],
};

const reduzido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Vibra no padrão dado. Com movimento reduzido, o toque leve dos botões some e o resto vira um
 * pulso só. Quem desligou a vibração (prefs.semVibracao) não sente nada.
 */
export function vibrar(tipo: Toque): void {
  if (prefs.get().semVibracao) return;
  if (reduzido() && tipo === 'leve') return;
  try {
    navigator.vibrate?.(reduzido() ? 30 : PADROES[tipo]);
  } catch {
    // sem vibração (iPhone, desktop, navegador embutido): segue sem
  }
}

/** Toque leve em todo botão principal e na barra de navegação, com um só ouvinte na página. */
export function ligarToqueDosBotoes(): void {
  document.addEventListener('click', (e) => {
    const alvo = (e.target as Element | null)?.closest?.('.botao, .barra-nav button, .card-jogo');
    if (alvo && !(alvo as HTMLButtonElement).disabled && alvo.getAttribute('aria-disabled') !== 'true') vibrar('leve');
  });
}
