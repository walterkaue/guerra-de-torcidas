// De onde a tela do Vestiário lê e para onde grava (docs/jogo.md 14.5). Uma interface pequena para a tela não
// saber do servidor: nesta etapa só existe a fonte falsa de dev (fonteFalsa.ts); a do servidor entra no D5c2.

import type { Vestimenta } from '../../jogo/vestiario';
import type { EstadoDaTela } from '../../jogo/vestiarioTela';

export interface DadosDoVestiario {
  /** A vestimenta gravada (já validada pelo servidor). */
  vestimenta: Vestimenta;
  /** Ids das peças liberadas (pecasLiberadas, contado no servidor). */
  liberadas: string[];
  /** Nível, XP, medalhas por item e Aquecimento: o que a folha da peça trancada mostra. */
  estado: EstadoDaTela;
}

export interface FonteDoVestiario {
  ler(): Promise<DadosDoVestiario>;
  /** Grava e devolve o que ficou gravado (o servidor troca peça trancada pela padrão). Rejeita em erro. */
  salvar(vestimenta: Vestimenta): Promise<Vestimenta>;
}

let fonteAtual: FonteDoVestiario | null = null;

/** Quem liga o vestiário escolhe a fonte (a falsa em dev; a do servidor no D5c2). */
export function definirFonteDoVestiario(f: FonteDoVestiario | null): void {
  fonteAtual = f;
}

export const fonteDoVestiario = (): FonteDoVestiario | null => fonteAtual;
