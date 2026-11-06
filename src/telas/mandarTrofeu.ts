// "Mandar no grupo" de um troféu da Galeria (ficha na Galeria e placa "Troféu novo" da Home). Abre a tela SEU CARD
// (telas/cardPersonalizado.ts) com o card do troféu (docs/jogo.md 14.6, "Card do troféu"): os números da ficha e os
// pontos da pessoa chegam por Promise (`dadosDaFicha`), o nível da Carreira também, e a tela só desenha quando tudo
// chegou, então os PNGs e o texto ficam prontos antes do toque em Compartilhar (o iPhone não perde o gesto). Sem rede
// para os números, o card sai sem a linha de números e sem a linha de quem. O troféu de rebaixamento não tem card:
// se alguém o chamar, fica o compartilhar de texto de antes. Chamar direto no toque, sem await antes.

import type { Time } from '../dados/times';
import { prefs } from '../estado';
import { dadosDoCardDoTrofeu, somouNoTrofeu, sorteadorDeFraseDoTrofeu } from '../jogo/cardTrofeuDados';
import { LINK_DO_JOGO, numerosDaFicha, quemNoTrofeu, textoDeMandarTrofeu, textoDoCardDoTrofeu, type Trofeu } from '../jogo/galeria';
import { fraseDaGaleria } from '../narrador/galeria';
import { servidorDaGaleria, type DadosDaFicha } from '../servidor/galeria';
import { abrirCardPersonalizado } from './cardPersonalizado';
import { nivelParaCard } from './carreira';

export interface OpcoesDoMandarTrofeu {
  /** Onde o dialog entra: a ficha da Galeria ou o container da Home. */
  raiz: HTMLElement;
  /** A frase que a ficha mostra (o card usa a mesma); sem ela, sorteia uma. */
  frase?: string | null;
}

/** O compartilhar de texto de antes (emoji antigo e o link do jogo): para o troféu sem card. */
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

export function mandarTrofeuNoGrupo(t: Trofeu, time: Time, o: OpcoesDoMandarTrofeu): () => void {
  if (t.trofeu === 'rebaixamento') {
    mandarSoOTexto(t, time);
    return () => {};
  }
  const ehDoMeuTime = t.time_id === prefs.get().time;
  const frase = o.frase ?? fraseDaGaleria(t.trofeu, time) ?? '';
  const ficha: Promise<DadosDaFicha | null> = servidorDaGaleria()
    .then((api) => api.dadosDaFicha(t, ehDoMeuTime))
    .catch(() => null);
  const montado = Promise.all([ficha, nivelParaCard().catch(() => null)]).then(([f, nivel]) => {
    const meusPontos = f?.meusPontos ?? null;
    return {
      dados: dadosDoCardDoTrofeu({
        trofeu: t,
        time,
        numeros: f ? numerosDaFicha(t, f) : [],
        meusPontos,
        ehDoMeuTime,
        apelido: prefs.get().apelido,
        frase,
        nivel,
      }),
      somou: somouNoTrofeu(t, ehDoMeuTime, meusPontos),
    };
  });
  return abrirCardPersonalizado({
    raiz: o.raiz,
    dados: montado.then((m) => m.dados),
    texto: montado.then((m) => textoDoCardDoTrofeu(t, time, m.somou)),
    link: LINK_DO_JOGO,
    sortearFrase: sorteadorDeFraseDoTrofeu(t.trofeu, time, frase || null),
    quemComApelido: (a) => quemNoTrofeu(a),
    // Troféu de outro time: as cores são as do time do troféu, mas sem Pôster e sem "Meu boneco".
    ...(ehDoMeuTime ? {} : { boneco: Promise.resolve(null), avisoSemBoneco: 'Boneco só no card do seu time' }),
  });
}
