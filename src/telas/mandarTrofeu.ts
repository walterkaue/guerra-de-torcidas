// "Mandar no grupo" de um troféu da Galeria (ficha e placa da Home). Único ponto de troca para o D3b: quando a
// tela SEU CARD ganhar o card do troféu, é só esta função que passa a abri-la (docs/jogo.md, seção 5, "Card do
// troféu"). Por enquanto: compartilhar nativo com o texto (emoji antigo) e o link do jogo; sem compartilhar nativo,
// abre o WhatsApp com o mesmo texto. Chamar direto no toque (sem await antes), para o iPhone não perder o gesto.

import { LINK_DO_JOGO, textoDeMandarTrofeu, type TimeDoTexto, type Trofeu } from '../jogo/galeria';

export function mandarTrofeuNoGrupo(t: Trofeu, time: TimeDoTexto): void {
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
