// Barra do time, no pé da arquibancada da Home (docs/visual.md, "Início"). Puro: sem DOM, relógio nem servidor.
// A Home junta o que já chegou (carreira, tabela do mês, ranking da semana, cidade, rede) e pede o que mostrar.
// `undefined` numa entrada = ainda não chegou; a barra fica vazia, com a altura reservada, até poder decidir.
// Sem contagem regressiva, sem urgência (docs/jogo.md, seção 7).

import { ID_OUTRO, type Artigo } from '../dados/times';
import { linhaDaCidadeNaHome, textoFaltam, type MinhaCidade } from './rankingCidades';
// Só tipos da temporada: o módulo dela fica fora do pacote inicial da Home (vem com o bloco das divisões).
import type { BlocoDasDivisoes } from './temporada';

/** Para onde o toque leva: as abas da Tabela ou a escolha da cidade. Nulo: a barra não é tocável. */
export type DestinoDaBarra = 'semana' | 'temporada' | 'cidades' | 'escolher-cidade';

export interface BarraDoTime {
  /** A posição grande em Anton ("1º"); nula quando não há número. */
  grande: string | null;
  /** O texto curto, em até duas linhas. */
  linha1: string;
  linha2: string | null;
  /** O que o leitor de tela lê no botão inteiro. */
  leitor: string;
  destino: DestinoDaBarra | null;
}

/** Linha do ranking da semana (a mesma de `rankingDaSemana`). */
export interface LinhaDaSemana {
  time_id: string;
  media30: number;
  posicao_campeao: number;
}

export interface EntradaDaBarra {
  time: { id: string; nome: string; artigo: Artigo };
  /** O pedido do placar falhou (sem rede). */
  semRede: boolean;
  /** Já jogou alguma partida (XP da carreira > 0). */
  jogou: boolean | undefined;
  /** O bloco das divisões do time no mês aberto; nulo sem mês aberto ou com o time fora da tabela. */
  mes: BlocoDasDivisoes | null | undefined;
  /** O ranking da semana; nulo se veio vazio. */
  semana: readonly LinhaDaSemana[] | null | undefined;
  /** Só para "Outro time": a cidade da semana; nula sem cidade escolhida. */
  cidade: MinhaCidade | null | undefined;
  /** Nome e artigo dos outros times (para "atrás do Palmeiras"). */
  timePorId: (id: string) => { nome: string; artigo: Artigo } | undefined;
}

export const TEXTO_SEM_REDE = 'Sem conexão com o placar agora. Dá pra jogar mesmo assim.';
export const TEXTO_SEM_CIDADE = 'Escolha sua cidade: é ela que joga por você';

const VER = 'Ver a tabela';
const de = (a: Artigo) => (a === 'a' ? 'da' : 'do');
const pts = (n: number) => `${n} ${n === 1 ? 'pt' : 'pts'}`;
/** "4 pts" → "4 pontos", para o leitor de tela. */
const porExtenso = (s: string) => s.replace(/\b(\d+) pts?\b/g, (_, n: string) => `${n} ${n === '1' ? 'ponto' : 'pontos'}`);

function semNumero(e: EntradaDaBarra): BarraDoTime {
  const linha1 = `Seus pontos vão pro placar ${de(e.time.artigo)} ${e.time.nome}`;
  return { grande: null, linha1, linha2: null, leitor: `${linha1}. ${VER}`, destino: 'semana' };
}

function daCidade(c: MinhaCidade | null): BarraDoTime {
  if (!c) return { grande: null, linha1: TEXTO_SEM_CIDADE, linha2: null, leitor: TEXTO_SEM_CIDADE, destino: 'escolher-cidade' };
  const texto = linhaDaCidadeNaHome(c);
  const leitor = `${texto}${texto.endsWith('.') ? '' : '.'} ${VER}`;
  if (c.faltam > 0 || c.posicao_estado === null) {
    // "Faltam 2 pra sua cidade entrar na tabela." / "Chama a galera."
    const [frase, convite] = textoFaltam(Math.max(1, c.faltam)).split(/(?<=\.) /);
    return { grande: null, linha1: frase, linha2: convite ?? null, leitor, destino: 'cidades' };
  }
  return { grande: `${c.posicao_estado}º`, linha1: `${c.nome} em ${c.uf}`, linha2: 'na tabela das cidades', leitor, destino: 'cidades' };
}

function daSemana(e: EntradaDaBarra, linhas: readonly LinhaDaSemana[]): BarraDoTime | null {
  const ordem = [...linhas].sort((a, b) => a.posicao_campeao - b.posicao_campeao);
  const i = ordem.findIndex((l) => l.time_id === e.time.id);
  if (i < 0 || ordem.every((l) => l.media30 <= 0)) return null;
  const meu = ordem[i];
  const outro = i === 0 ? ordem[1] : ordem[i - 1];
  const grande = `${meu.posicao_campeao}º`;
  const linha1 = 'na semana';
  let linha2: string | null = null;
  const t = outro && e.timePorId(outro.time_id);
  if (outro && t) {
    const dif = Math.round(Math.abs(meu.media30 - outro.media30));
    linha2 = dif === 0 ? `empatado com ${t.artigo} ${t.nome}` : `${pts(dif)} ${i === 0 ? 'à frente' : 'atrás'} ${de(t.artigo)} ${t.nome}`;
  }
  const leitor = `${grande} ${linha1}${linha2 ? `, ${porExtenso(linha2)}` : ''}. ${VER}`;
  return { grande, linha1, linha2, leitor, destino: 'semana' };
}

function doMes(bloco: BlocoDasDivisoes): BarraDoTime {
  // "Na série única · novembro" → "na série única" (a mesma conta do bloco das divisões).
  const linha1 = bloco.serie.split(' · ')[0].replace(/^Na /, 'na ');
  // A situação sem as semanas ("4 pts à frente · 2 de 5 semanas" → "4 pontos à frente").
  const situacao = bloco.situacao.split(' · ')[0];
  return { grande: bloco.posicao, linha1, linha2: bloco.situacao, leitor: `${bloco.posicao} ${linha1}, ${porExtenso(situacao)}. ${VER}`, destino: 'temporada' };
}

/** O que a barra mostra agora; nulo enquanto não dá para decidir (a altura fica reservada, vazia). */
export function barraDoTime(e: EntradaDaBarra): BarraDoTime | null {
  const semRede: BarraDoTime = { grande: null, linha1: TEXTO_SEM_REDE, linha2: null, leitor: TEXTO_SEM_REDE, destino: null };

  // d. "Outro time": a cidade joga por ele.
  if (e.time.id === ID_OUTRO) {
    if (e.cidade !== undefined) return daCidade(e.cidade);
    return e.semRede ? semRede : null;
  }

  // a. Quem nunca jogou: sem número.
  if (e.jogou === false) return semNumero(e);
  if (e.jogou === undefined && !e.semRede) return null;

  // b. Os 20 times, com a tabela do mês (sem semana travada, a posição é "–": vale a da semana).
  if (e.mes === undefined && !e.semRede) return null;
  if (e.mes && e.mes.posicao !== '–') return doMes(e.mes);

  // c. Sem tabela do mês: a posição na semana e a distância para o vizinho.
  if (e.semana === undefined) return e.semRede ? semRede : null;
  const semana = e.semana && daSemana(e, e.semana);
  if (semana) return semana;

  // Semana vazia (ninguém pontuou ainda): a frase sem número. e. Sem rede: o aviso, sem toque.
  return e.semRede ? semRede : semNumero(e);
}
