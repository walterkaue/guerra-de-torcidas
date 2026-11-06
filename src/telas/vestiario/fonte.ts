// De onde a tela do Vestiário lê e para onde grava (docs/jogo.md 14.5). Uma interface pequena para a tela não
// saber do servidor: a do servidor (fonteServidor.ts) é a padrão; em dev, ?vestiarioFalso troca pela falsa.

import type { Vestimenta } from '../../jogo/vestiario';
import type { EstadoDaTela } from '../../jogo/vestiarioTela';
import { fonteDoServidor } from './fonteServidor';

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

/** Troca a fonte (a falsa, em dev); null volta à do servidor. */
export function definirFonteDoVestiario(f: FonteDoVestiario | null): void {
  fonteAtual = f;
}

/** Em dev, os servidores de mentira da Home e dos jogos abrem o vestiário com a fonte falsa (o mesmo &nivel=). */
const DEV_FALSO =
  import.meta.env.DEV && ['homeFalsa', 'lancesFalsos', 'penaltiFalso', 'provaFalsa', 'diaFalso'].some((f) => new URLSearchParams(location.search).has(f));
const fonteFalsaDeDev: FonteDoVestiario = {
  ler: async () => (await import('./fonteFalsa')).fonteFalsa(new URLSearchParams(location.search)).ler(),
  salvar: async (v) => (await import('./fonteFalsa')).fonteFalsa(new URLSearchParams(location.search)).salvar(v),
};

export const fonteDoVestiario = (): FonteDoVestiario => fonteAtual ?? (DEV_FALSO ? fonteFalsaDeDev : fonteDoServidor);
