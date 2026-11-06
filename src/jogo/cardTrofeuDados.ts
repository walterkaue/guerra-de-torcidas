// Os dados do card do troféu (docs/jogo.md 14.6, "Card do troféu"): módulo puro que junta o troféu, os números da
// ficha e os pontos da pessoa no `DadosDoCard` que a tela SEU CARD entende. Fica fora de `cardTrofeu.ts` (o desenho)
// para não puxar o desenho no pedaço da Galeria. Nada aqui tem nome de pessoa.

import type { Time } from '../dados/times';
import type { DadosDoCard } from './cardPersonalizado';
import { FRASES_DA_GALERIA, preencherFraseDaGaleria } from '../narrador/galeria';
import {
  LINK_DO_JOGO,
  NOME_DO_TROFEU,
  linhaEmCampo,
  periodoDoTrofeu,
  quemNoTrofeu,
  serieDoTrofeu,
  type NumeroDaFicha,
  type Trofeu,
} from './galeria';

export interface EntradaDoCardDoTrofeu {
  trofeu: Trofeu;
  time: Time;
  /** Os 3 números da ficha; vazio sem rede (o card sai sem a linha de números). */
  numeros: readonly NumeroDaFicha[];
  /** Pontos da pessoa na semana do troféu (nulo sem rede, sem sessão ou sem pontos). */
  meusPontos: number | null;
  /** A Galeria aberta é a do time do coração da pessoa. */
  ehDoMeuTime: boolean;
  apelido?: string | null;
  /** A frase do narrador que o card começa mostrando (a mesma da ficha). */
  frase: string;
  nivel: string | null;
}

/** A pessoa somou na semana do troféu do próprio time: só então a linha "tava na arquibancada" entra. */
export const somouNoTrofeu = (t: Trofeu, ehDoMeuTime: boolean, meusPontos: number | null): boolean =>
  linhaEmCampo(t, ehDoMeuTime ? t.time_id : undefined, meusPontos) !== null;

export function dadosDoCardDoTrofeu(e: EntradaDoCardDoTrofeu): DadosDoCard {
  const t = e.trofeu;
  const nome = NOME_DO_TROFEU[t.trofeu];
  const serie = serieDoTrofeu(t);
  const periodo = periodoDoTrofeu(t);
  const somou = somouNoTrofeu(t, e.ehDoMeuTime, e.meusPontos);
  return {
    tipo: 'trofeu',
    time: e.time,
    jogo: 'Galeria de Troféus',
    destaque: nome.toLocaleUpperCase('pt-BR'),
    quem: somou ? { comApelido: quemNoTrofeu(e.apelido), semApelido: quemNoTrofeu(null) } : null,
    lance: [serie, periodo].filter(Boolean).join(' · '),
    placarEmoji: '',
    frase: e.frase,
    novoRecorde: false,
    link: LINK_DO_JOGO.replace(/^https?:\/\//, ''),
    nivel: e.nivel,
    conteudo: { jogo: 'trofeu', trofeu: t, nome, serie, periodo, numeros: e.numeros, somou },
  };
}

/**
 * O "Sortear outra frase" do card do troféu: sorteia da lista da Galeria para o tipo do troféu, sem repetir as que já
 * saíram (nem a de agora, em `jaMostrada`). Sem lista (rebaixamento), devolve null.
 */
export function sorteadorDeFraseDoTrofeu(
  tipo: Trofeu['trofeu'],
  time: Time,
  jaMostrada: string | null,
  rng: () => number = Math.random,
): () => string | null {
  const todas = (FRASES_DA_GALERIA[tipo] ?? []).map((f) => preencherFraseDaGaleria(f, time));
  const usadas = new Set<string>(jaMostrada ? [jaMostrada] : []);
  return () => {
    if (!todas.length) return null;
    let livres = todas.filter((f) => !usadas.has(f));
    if (!livres.length) {
      usadas.clear();
      if (jaMostrada) usadas.add(jaMostrada);
      livres = todas.filter((f) => !usadas.has(f));
      if (!livres.length) livres = todas;
    }
    const f = livres[Math.floor(rng() * livres.length) % livres.length];
    usadas.add(f);
    return f;
  };
}
