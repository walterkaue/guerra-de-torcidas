// Ponte entre as telas e a caixa de avisos (jogo/avisosCaixa.ts): lê e grava prefs.avisos. Quem põe um aviso na caixa
// (`registrarAviso`) ou o resolve por fora (`resolverAviso`) chama estas duas; nunca estoura (aparelho sem armazenamento
// segue sem caixa).

import { prefs } from '../estado';
import { lerEstado, registrar, resolver } from '../jogo/avisosCaixa';
import { diaBrasilia } from '../servidor/tempo';

/** Um momento do jogo põe o aviso na caixa: já registrado ou dispensado, nada muda. */
export function registrarAviso(ids: readonly string[]): void {
  try {
    const antes = lerEstado(prefs.get().avisos);
    const depois = registrar(antes, ids, diaBrasilia());
    if (depois !== antes) prefs.set({ avisos: depois });
  } catch {
    // sem caixa neste aparelho
  }
}

/** A pessoa fez a ação (abriu o vestiário, a Galeria, a tabela do mês): o aviso sai. `ids` exatos ou prefixo com ":". */
export function resolverAviso(ids: readonly string[]): void {
  try {
    const antes = lerEstado(prefs.get().avisos);
    const depois = resolver(antes, ids);
    if (JSON.stringify(depois) !== JSON.stringify(antes)) prefs.set({ avisos: depois });
  } catch {
    // sem caixa neste aparelho
  }
}
