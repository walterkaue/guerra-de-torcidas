// Os dados do card de fim de temporada (docs/jogo.md seção 5, "Telas do resto das divisões", e 14.6): módulo puro que
// junta a linha do meu time, a tabela final, a frase e os pontos da pessoa no `DadosDoCard` que a tela SEU CARD
// entende. Fica fora de `cardTemporada.ts` (o desenho) e de `mandarTemporadaCard.ts` (a tela) para ser testado sem DOM.
// Nomes de outros times na tabela são só nome de clube; nada aqui tem nome de pessoa.

import { rivalDe, type Time } from '../dados/times';
import { LINK_DO_JOGO, quemNoTrofeu } from './galeria';
import {
  SELO_DO_DESTINO,
  TITULO_DO_DESTINO,
  caiuNoMes,
  fatiaDaTabela,
  linhaDoFim,
  mesPorExtenso,
  mesSeguinte,
  nomeDaSerie,
  textoDeMandarTemporada,
  topoDoCardDoMes,
  type DestinoDoMes,
  type LinhaTemporada,
  type Temporada,
} from './temporada';
import { FRASES_DA_TEMPORADA, eventoDoFim, fraseDaTemporada, fraseServe, preencherFraseDaTemporada, type ContextoDaTemporada } from '../narrador/temporada';
import type { DadosDoCard } from './cardPersonalizado';
import type { NumeroDaFicha } from './galeria';

export interface EntradaDosDadosDoMes {
  temporada: Temporada;
  /** Todas as linhas do mês (as 20), com `posicao_final` e `destino`. */
  linhas: readonly LinhaTemporada[];
  /** A linha do meu time. */
  linha: LinhaTemporada;
  time: Time;
  destino: DestinoDoMes;
  /** A frase que o card começa mostrando (a da placa, ou uma sorteada). */
  frase: string;
  /** A pessoa somou ponto em alguma semana do mês (só então a linha "tava na arquibancada" entra). */
  somou: boolean;
  apelido?: string | null;
  nivel: string | null;
}

/**
 * Somou no mês: algum ponto acima de 0 em alguma semana. Limite conhecido (o mesmo da Galeria): `minha_posicao_semana`
 * soma todos os times da pessoa, não só o do coração.
 */
export const somouNoMes = (pontosPorSemana: readonly (number | null | undefined)[]): boolean => pontosPorSemana.some((p) => (p ?? 0) > 0);

const pt = (n: number) => n.toLocaleString('pt-BR');

/** Os 3 números do card: posição final, pontos e vitórias de semana. */
export function numerosDoFim(l: LinhaTemporada): NumeroDaFicha[] {
  return [
    { valor: `${l.posicao_final ?? l.posicao}º`, rotulo: 'posição final' },
    { valor: pt(l.pontos), rotulo: l.pontos === 1 ? 'ponto' : 'pontos' },
    { valor: pt(l.vitorias), rotulo: l.vitorias === 1 ? 'vitória de semana' : 'vitórias de semana' },
  ];
}

export function dadosDoCardDoMes(e: EntradaDosDadosDoMes): DadosDoCard {
  const l = e.linha;
  const daSerie = e.linhas.filter((x) => x.serie === l.serie);
  return {
    tipo: 'temporada',
    time: e.time,
    jogo: topoDoCardDoMes(e.temporada.mes),
    destaque: TITULO_DO_DESTINO[e.destino],
    quem: e.somou ? { comApelido: quemNoTrofeu(e.apelido), semApelido: quemNoTrofeu(null) } : null,
    lance: linhaDoFim(l, e.time),
    placarEmoji: '',
    frase: e.frase,
    novoRecorde: false,
    link: LINK_DO_JOGO.replace(/^https?:\/\//, ''),
    nivel: e.nivel,
    conteudo: {
      jogo: 'temporada',
      destino: e.destino,
      selo: SELO_DO_DESTINO[e.destino],
      serie: nomeDaSerie(l.serie),
      posicao: l.posicao_final ?? l.posicao,
      fatia: fatiaDaTabela(daSerie, e.time.id),
      meuTime: e.time.id,
      numeros: numerosDoFim(l),
      teste: e.temporada.pre_temporada,
      somou: e.somou,
    },
  };
}

/** O contexto das frases do fim do mês (o mesmo que a placa monta): série, mês seguinte e o rival (e se ele caiu). */
export function contextoDoFimDoMes(linha: LinhaTemporada, linhas: readonly LinhaTemporada[], time: Time, mes: string): { ctx: ContextoDaTemporada; rivalCaiu: boolean } {
  const rival = rivalDe(time) ?? null;
  return {
    ctx: { time, serie: nomeDaSerie(linha.serie), mes: mesPorExtenso(mesSeguinte(mes)), rival, posicao: linha.posicao_final },
    rivalCaiu: !!rival && caiuNoMes(linhas, rival.id),
  };
}

/** Uma frase do fim do mês para o destino (vazia se nenhuma da lista se aplica). */
export function fraseDoFimDoMes(destino: DestinoDoMes, ctx: ContextoDaTemporada, rivalCaiu: boolean, rng: () => number = Math.random): string {
  return fraseDaTemporada(eventoDoFim(destino, rivalCaiu), ctx, rng) ?? '';
}

/**
 * O "Sortear outra frase" do card de fim de temporada: sorteia da mesma lista da placa (o evento do destino), sem repetir
 * as que já saíram (nem a de agora, em `jaMostrada`). Sem lista que se aplique, devolve null.
 */
export function sorteadorDeFraseDoFim(
  destino: DestinoDoMes,
  ctx: ContextoDaTemporada,
  rivalCaiu: boolean,
  jaMostrada: string | null,
  rng: () => number = Math.random,
): () => string | null {
  const todas = FRASES_DA_TEMPORADA[eventoDoFim(destino, rivalCaiu)]
    .filter((f) => fraseServe(f, ctx))
    .map((f) => preencherFraseDaTemporada(f, ctx))
    .filter((f): f is string => !!f);
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

/**
 * O texto que vai com a imagem do card (emoji antigo, sem nome de pessoa) e, em linha à parte, o link do jogo (some com
 * "Link do jogo" desligado, em `textoDoCompartilhar`).
 */
export const textoDoCardDoMes = (destino: DestinoDoMes, time: Time, mes: string, somou: boolean): string =>
  `${textoDeMandarTemporada(destino, time, mes, somou)}\n${LINK_DO_JOGO}`;
