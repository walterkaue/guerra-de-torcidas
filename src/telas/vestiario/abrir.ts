// Abrir o vestiário de outra tela (Perfil, "Vestir agora" do resultado), com uma peça já escolhida se quiser.
// A tela lê a peça pedida uma vez (pecaPedida) e a veste sem salvar: quem decide salvar é a pessoa.

import { irPara } from '../../app';

let pedida: string | null = null;

export function abrirVestiario(pecaId?: string): void {
  pedida = pecaId ?? null;
  irPara({ tela: 'vestiario' });
}

/** A peça pedida por quem abriu (id de PECAS), uma vez só; null quando abriu sem pedido. */
export function pecaPedida(): string | null {
  const p = pedida;
  pedida = null;
  return p;
}
