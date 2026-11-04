// Dicas da faixa de instrução guardadas neste aparelho (gdt:prefs.dicas). Regras em jogo/dicas.ts.

import '../estilos/dicas.css';
import { prefs } from '../estado';
import { criarDicas, type Dicas, type IdDica } from '../jogo/dicas';

/** Um controle por tela de jogo (a regra de 1 por lance vale dentro da tela). */
export function dicasDoAparelho(): Dicas {
  return criarDicas(
    () => prefs.get().dicas ?? {},
    (dicas) => prefs.set({ dicas }),
  );
}

/** Quantas vezes essa dica já apareceu neste aparelho. */
export function vezesVista(id: IdDica): number {
  return prefs.get().dicas?.vistas?.[id] ?? 0;
}

/**
 * Mostra a dica na faixa: a de instrução da partida (`.instrucao`, que ganha a cara de dica até o próximo
 * texto normal) ou uma faixa só de dica (`.faixa-dica`, na Prova e no Time do Dia). Devolve true se mostrou.
 */
export function mostrarDica(faixa: HTMLElement, texto: string | null): boolean {
  if (!texto) return false;
  faixa.textContent = texto;
  faixa.hidden = false;
  faixa.classList.remove('dica');
  void faixa.offsetWidth;
  if (faixa.classList.contains('instrucao')) faixa.classList.add('dica');
  else {
    faixa.style.animation = 'none';
    void faixa.offsetWidth;
    faixa.style.animation = '';
  }
  return true;
}

/** Volta a faixa ao normal: a de instrução perde a cara de dica; a faixa só de dica some. */
export function tirarDica(faixa: HTMLElement): void {
  faixa.classList.remove('dica');
  if (faixa.classList.contains('faixa-dica')) faixa.hidden = true;
}
