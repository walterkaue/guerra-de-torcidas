// "Mandar no grupo" de um troféu da Galeria (ficha na Galeria e placa "Troféu novo" da Home). Abre a tela SEU CARD com
// o card do troféu (docs/jogo.md 14.6, "Card do troféu"). A tela, o nível e a leitura dos números ficam em
// `mandarTrofeuCard.ts`, carregado por `import()` no toque, para o bundle inicial não crescer; se esse pedaço não
// baixar, cai no compartilhar nativo com o texto (emoji antigo) e o link do jogo. O troféu de rebaixamento não tem card.

import type { Time } from '../dados/times';
import { LINK_DO_JOGO, textoDeMandarTrofeu, type Trofeu } from '../jogo/galeria';

export interface OpcoesDoMandarTrofeu {
  /** Onde o dialog entra: a ficha da Galeria ou o container da Home. */
  raiz: HTMLElement;
  /** A frase que a ficha mostra (o card usa a mesma); sem ela, sorteia uma. */
  frase?: string | null;
}

/** O compartilhar de texto de antes (emoji antigo e o link do jogo): para o troféu sem card e como reserva. */
function mandarSoOTexto(t: Trofeu, time: Time): void {
  const texto = textoDeMandarTrofeu(t, time);
  if (typeof navigator.share === 'function') {
    navigator.share({ text: texto, url: LINK_DO_JOGO }).catch(() => {
      // fechou a folha de compartilhar: nada a fazer
    });
    return;
  }
  // Compartilhar do próprio jogador (como o "Mandar no grupo" dos resultados): sem o aviso de saída.
  window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${LINK_DO_JOGO}`)}`, '_blank', 'noopener');
}

export function mandarTrofeuNoGrupo(t: Trofeu, time: Time, o: OpcoesDoMandarTrofeu): void {
  if (t.trofeu === 'rebaixamento') return mandarSoOTexto(t, time);
  import('./mandarTrofeuCard').then(
    (m) => m.abrirCardDoTrofeu(t, time, o),
    () => mandarSoOTexto(t, time),
  );
}
