// A parte pesada do "Mandar no grupo" do troféu (docs/jogo.md 14.6, "Card do troféu"): junta `dadosDaFicha`, o nível e o
// texto por Promise e abre a tela SEU CARD. Só carrega no toque (`mandarTrofeu.ts` o importa por `import()`), para o
// bundle inicial não crescer.

import type { Time } from '../dados/times';
import { prefs } from '../estado';
import { dadosDoCardDoTrofeu, somouNoTrofeu, sorteadorDeFraseDoTrofeu } from '../jogo/cardTrofeuDados';
import { LINK_DO_JOGO, numerosDaFicha, quemNoTrofeu, textoDoCardDoTrofeu, type Trofeu } from '../jogo/galeria';
import { fraseDaGaleria } from '../narrador/galeria';
import { servidorDaGaleria, type DadosDaFicha } from '../servidor/galeria';
import { abrirCardPersonalizado } from './cardPersonalizado';
import { nivelParaCard } from './carreira';

export function abrirCardDoTrofeu(t: Trofeu, time: Time, o: { raiz: HTMLElement; frase?: string | null }): void {
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
  abrirCardPersonalizado({
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
