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
import { PADRAO, PECAS, comFormato, validar, type Vestimenta } from '../jogo/vestiario';
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
  const v = ligado ? comFormato(vestimenta) : null;
  if (!v) return null;
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

/** O que o servidor manda do boneco de quem chamou o X1 (`ver_desafio` e `ver_desafio_lances`): só o que vai a campo. */
export type VestimentaDeCampo = Pick<Vestimenta, 'corpo' | 'pele' | 'cabelo' | 'corCabelo' | 'numero' | 'cabeca' | 'punho' | 'braco' | 'chuteira' | 'barra'>;

const PECAS_DE_CAMPO = ['corpo', 'pele', 'cabelo', 'corCabelo', 'numero', 'cabeca', 'punho', 'braco', 'chuteira'] as const;
/** As 9 peças de campo mais a barra (camisa por fora ou por dentro), que vale para todo mundo. */
const CHAVES_DE_CAMPO = [...PECAS_DE_CAMPO, 'barra'] as const;
const TODAS_AS_PECAS = PECAS.map((p) => p.id);

/**
 * O boneco de quem chamou, como Vestimenta completa e segura: o PADRAO com só as 10 chaves de campo por cima (chave a
 * mais é ignorada), cada valor conferido contra o catálogo (valor torto cai no padrão). Todas as peças valem, porque o
 * servidor já conferiu o que estava liberado. null (sem boneco, interruptor desligado, servidor antigo) ou algo que
 * não é objeto: null, e quem chama sorteia o batedor / não mostra busto.
 */
export function vestimentaDeCampo(x: unknown): Vestimenta | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const bruto = x as Record<string, unknown>;
  // Objeto sem nenhuma peça de campo (só a barra não conta) não é boneco: sorteia, em vez de desenhar o padrão.
  if (!PECAS_DE_CAMPO.some((k) => k in bruto)) return null;
  const base: Record<string, unknown> = { ...PADRAO };
  for (const k of CHAVES_DE_CAMPO) if (k in bruto) base[k] = bruto[k];
  return validar(base, TODAS_AS_PECAS);
}
