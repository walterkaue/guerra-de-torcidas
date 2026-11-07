// "Mandar no grupo" do fim do mês (placa da Home e botão "Card do mês" da aba Temporada): abre a tela SEU CARD com o
// card de fim de temporada (docs/jogo.md seção 5, "Telas do resto das divisões"; tipo "temporada" em TIPOS_DE_CARD).
// A parte pesada (desenho, números, nível) vai num pedaço carregado por `import()` no toque, para o bundle inicial não
// crescer; se esse pedaço não baixar, cai no compartilhar nativo com o texto (emoji antigo) e o link do jogo.

import type { Time } from '../dados/times';
import { LINK_DO_JOGO } from '../jogo/galeria';
import { textoDeMandarTemporada, type DestinoDoMes, type LinhaTemporada, type Temporada } from '../jogo/temporada';

export interface EntradaDoCardDoMes {
  /** O mês fechado. */
  temporada: Temporada;
  /** Todas as linhas do mês (as 20), com `posicao_final` e `destino`. */
  linhas: readonly LinhaTemporada[];
  /** O time do coração (nunca "Outro time"). */
  time: Time;
  destino: DestinoDoMes;
  /** A frase que a placa mostrou (o card usa a mesma); sem ela, sorteia uma. */
  frase?: string | null;
}

export interface OpcoesDoMandarTemporada {
  /** Onde o dialog entra: o container da placa na Home ou a aba Temporada. */
  raiz: HTMLElement;
}

/** O compartilhar só de texto (emoji antigo e o link do jogo): a reserva quando o pedaço do card não baixa. */
export function mandarSoOTextoDoMes(e: EntradaDoCardDoMes): void {
  const texto = textoDeMandarTemporada(e.destino, e.time, e.temporada.mes, false);
  if (typeof navigator.share === 'function') {
    navigator.share({ text: texto, url: LINK_DO_JOGO }).catch(() => {
      // fechou a folha de compartilhar: nada a fazer
    });
    return;
  }
  // Compartilhar do próprio jogador (como o "Mandar no grupo" dos resultados): sem o aviso de saída.
  window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${LINK_DO_JOGO}`)}`, '_blank', 'noopener');
}

/** Abre o card de fim de temporada. Chame direto no toque, sem await antes (iPhone). */
export function mandarTemporadaNoGrupo(e: EntradaDoCardDoMes, o: OpcoesDoMandarTemporada): void {
  import('./mandarTemporadaCard').then(
    (m) => m.abrirCardDoMes(e, o),
    () => mandarSoOTextoDoMes(e),
  );
}
