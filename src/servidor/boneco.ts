// Boneco montável no servidor (docs/jogo.md, seção 14.5), sem tela. Quem confere as peças é a função `boneco`:
// o aparelho só pede o que quer vestir e recebe o que ficou gravado.

import { chamar } from './api';
import type { Vestimenta } from '../jogo/vestiario.ts';

export interface BonecoDoServidor {
  vestimenta: Vestimenta;
  /** Ids das peças liberadas (PECAS em src/jogo/vestiario.ts), as do começo inclusive. */
  liberadas: string[];
  /** A próxima peça a liberar ("Libera no Titular"); null quando todas já liberaram. */
  proxima: { id: string; condicao: string } | null;
  /** "Meu boneco em campo" (Perfil): se o batedor dos jogos é o boneco da pessoa. A função antiga não manda; sem o campo, vale ligado. */
  emCampo?: boolean;
}

export interface BonecoSalvo extends BonecoDoServidor {
  /** Alguma peça trancada voltou à padrão antes de gravar. */
  trocou: boolean;
}

/** A vestimenta guardada. Conta que ainda não tinha boneco ganha um sorteado entre as peças do começo. */
export function lerBoneco(): Promise<BonecoDoServidor> {
  return chamar('boneco', { acao: 'meu_boneco' });
}

/**
 * Grava a vestimenta. O servidor recusa formato fora do catálogo (`formato`) e mais de 30 gravações por hora
 * (`limite`); peça trancada volta à padrão sem erro (veja `trocou`).
 */
export function salvarBoneco(vestimenta: Vestimenta): Promise<BonecoSalvo> {
  return chamar('boneco', { acao: 'salvar_boneco', vestimenta: vestimenta as unknown as Record<string, unknown> });
}

/**
 * Liga ou desliga "Meu boneco em campo" (só o interruptor; o boneco em si é o de salvarBoneco). Erros: `limite` (429) e `sessao` (401).
 */
export function salvarEmCampo(ligado: boolean): Promise<{ emCampo: boolean }> {
  return chamar('boneco', { acao: 'em_campo', ligado });
}
