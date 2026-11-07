// O boneco da pessoa em campo (docs/jogo.md 14.5): a conta pura. Recebe a cópia da vestimenta guardada no aparelho, o
// interruptor "Meu boneco em campo", a roupa que a cena já usa (uniformes da partida, cores do clube do lance...) e as
// cores do time do coração; devolve como o batedor dela deve aparecer, ou null (aí o batedor é sorteado, como sempre).
//
// Só visual, só no aparelho. Regras:
// - Roupa (camisa, calção, meião) é a da cena; o campo `camisa` da vestimenta não conta em campo.
// - Entram: corpo, pele, cabelo e cor, testeira, munhequeira (bronze inclusive), braçadeira, chuteira (time ou dourada)
//   e o número. Ficam de fora: colete, faixa, apito, pose, fundo e moldura.
// - Testeira, munhequeira e chuteira "do time" usam as cores do time do coração, mesmo num lance de outro clube.
// O desenho é o do vestiário (bonecoMontavel.ts); aqui não há canvas.

import { corDeTexto } from '../dados/times';
import { conferirFormato } from '../jogo/vestiario';
import type { CoresDoTime } from './bonecoFundos';
import { aparenciaDe, comChuteiraDe, corDaTesteira, corDoPunho, type PecasDeCampo } from './bonecoMontavel';
import { corDoCabeloVisivel, type Aparencia, type Uniforme } from './bonecos';

export interface BatedorEmCampo {
  aparencia: Aparencia;
  /** A roupa da cena, com a chuteira trocada se a vestimenta pede (time ou dourada). */
  uniforme: Uniforme;
  pecas: PecasDeCampo;
}

/**
 * Como o batedor da pessoa aparece, ou null (sem cópia, cópia fora do formato do catálogo ou interruptor desligado:
 * quem chama sorteia o batedor como antes).
 */
export function batedorEmCampo(vestimenta: unknown, ligado: boolean, roupaDaCena: Uniforme, coresDoCoracao: CoresDoTime): BatedorEmCampo | null {
  if (!ligado || !conferirFormato(vestimenta)) return null;
  const v = vestimenta;
  const aparencia = aparenciaDe(v);
  // Sem número, a camisa fica lisa. Colete e faixa não existem em campo, então nada cobre o número.
  const numero = v.numero;
  return {
    aparencia,
    uniforme: comChuteiraDe(roupaDaCena, v.chuteira, coresDoCoracao),
    pecas: {
      numero,
      corDoNumero: numero === null ? null : corDeTexto(roupaDaCena.camisa),
      // O `camisa` da vestimenta é ignorado: a testeira parte sempre da cor 2 do coração (a cor 1 se não contrastar).
      testeira: v.cabeca === 'testeira' ? corDaTesteira(coresDoCoracao, 'uni1', corDoCabeloVisivel(aparencia), aparencia.pele) : null,
      punho: corDoPunho(v.punho, coresDoCoracao, aparencia.pele),
      bracadeira: v.braco === 'bracadeira',
      chuteiraDourada: v.chuteira === 'dourada',
    },
  };
}
