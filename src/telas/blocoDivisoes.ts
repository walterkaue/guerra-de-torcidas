// Bloco das divisões da Home (docs/jogo.md, seção 5, "Telas do resto das divisões", Rota 2 "linha ao vivo"):
// a posição do meu time na tabela do mês, a série, a situação e, embaixo, "se a semana fechasse agora". Compacto, para o
// "Jogar agora" continuar à vista em 390×844: a frase do narrador do mês não vai aqui, vai no adesivo do cabo de guerra
// (a Home decide entre ela e a do duelo; ver `FraseDoMes`).
// Lazy: a Home só leva a <section data-divisoes> vazia (altura reservada) e um import() deste arquivo.
// Uma leitura da tabela do mês por abertura do app; a projeção refaz a cada ranking ao vivo que a Home já lê.
// Sem urgência (seção 13): nada de contagem regressiva, "corre" ou "volte".

import '../estilos/blocoDivisoes.css';
import { esc, irPara } from '../app';
import type { Time } from '../dados/times';
import {
  blocoDasDivisoes,
  linhaDaProjecao,
  nomeDaSerie,
  projetarSemana,
  type LinhaDaSemanaAoVivo,
  type LinhaTemporada,
  type SituacaoDoMes,
  type Temporada,
} from '../jogo/temporada';
import { fraseDaTemporada } from '../narrador/temporada';
import { seloPre } from './blocos';

type Servidor = Pick<typeof import('../servidor/api'), 'temporadasRecentes' | 'classificacaoDoMes' | 'semanasFechadasDoMes'>;

// Em desenvolvimento, ?temporadaFalsa=... troca o servidor por um de mentira (src/dev/temporadaFalsa.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('temporadaFalsa');
export const servidorDaTemporada = async (): Promise<Servidor> => (FALSA ? import('../dev/temporadaFalsa') : import('../servidor/api'));
export const temporadaFalsaLigada = (): boolean => FALSA;

/**
 * Quanto tempo uma leitura vale. O app pode ficar aberto dias (PWA, aba restaurada): a semana trava na segunda 12h e o
 * mês fecha às 12h01, e a Home que volta depois disso tem de ler de novo (revisão de 07/11/2026).
 */
const VALIDADE_DA_LEITURA_MS = 10 * 60_000;

/** As temporadas recentes, lidas uma vez a cada 10 min (o bloco e a placa de fim do mês usam a mesma). */
let leituraDasTemporadas: { em: number; p: Promise<Temporada[]> } | null = null;
export function lerTemporadas(): Promise<Temporada[]> {
  if (!leituraDasTemporadas || Date.now() - leituraDasTemporadas.em > VALIDADE_DA_LEITURA_MS) {
    const p = servidorDaTemporada().then((s) => s.temporadasRecentes());
    leituraDasTemporadas = { em: Date.now(), p };
    p.catch(() => {
      if (leituraDasTemporadas?.p === p) leituraDasTemporadas = null; // sem internet: a próxima Home tenta de novo
    });
  }
  return leituraDasTemporadas.p;
}

interface TabelaDoMes {
  temporada: Temporada;
  linhas: LinhaTemporada[];
  fechadas: number;
}

let leituraDaTabela: { time: string; em: number; tabela: Promise<TabelaDoMes | null> } | null = null;

/** A tabela do mês aberto; nula se não há mês aberto. Uma leitura a cada 10 min por time. */
function lerTabela(timeId: string): Promise<TabelaDoMes | null> {
  if (leituraDaTabela?.time !== timeId || Date.now() - leituraDaTabela.em > VALIDADE_DA_LEITURA_MS) {
    const tabela = (async () => {
      const aberta = (await lerTemporadas()).find((t) => !t.fechada_em);
      if (!aberta) return null;
      const s = await servidorDaTemporada();
      const [linhas, fechadas] = await Promise.all([s.classificacaoDoMes(aberta.mes), s.semanasFechadasDoMes(aberta.mes)]);
      return { temporada: aberta, linhas, fechadas };
    })();
    leituraDaTabela = { time: timeId, em: Date.now(), tabela };
    tabela.catch(() => {
      if (leituraDaTabela?.tabela === tabela) leituraDaTabela = null;
    });
  }
  return leituraDaTabela.tabela;
}

/** A frase do narrador, sorteada uma vez por abertura do app para cada situação. */
const frases = new Map<string, string | null>();
function fraseDoMes(chave: string, sortear: () => string | null): string | null {
  if (!frases.has(chave)) frases.set(chave, sortear());
  return frases.get(chave) ?? null;
}

/** "8º" com o "º" fora da Anton (ela o desenha como um zero elevado). */
const posicaoGrande = (posicao: string): string => (posicao.endsWith('º') ? `${esc(posicao.slice(0, -1))}<i>º</i>` : esc(posicao));

/** A frase do mês para o adesivo do cabo. `destaque`: líder, acesso ou zona (vale mais que a frase de rotina do duelo). */
export interface FraseDoMes {
  texto: string;
  destaque: boolean;
}

/**
 * Liga o bloco. Devolve a função que a Home chama a cada ranking da semana (a primeira vez e a cada atualização ao
 * vivo). Some se não há mês aberto ou se o time não está na tabela; sem rede, diz isso no mesmo espaço.
 */
export async function ligarBlocoDivisoes(
  el: HTMLElement,
  time: Time,
  semana: string,
  saiu: () => boolean,
): Promise<(ranking: LinhaDaSemanaAoVivo[]) => FraseDoMes | null> {
  let tabela: TabelaDoMes | null = null;
  let ranking: LinhaDaSemanaAoVivo[] | null = null;

  el.addEventListener('click', (e) => {
    if (!tabela || (e.target as HTMLElement).closest('.selo-pre')) return;
    irPara({ tela: 'ranking', aba: 'temporada' });
  });

  function desenhar(): FraseDoMes | null {
    if (!tabela || saiu()) return null;
    const { temporada, linhas, fechadas } = tabela;
    const linha = linhas.find((l) => l.time_id === time.id);
    if (!linha) {
      el.hidden = true;
      return null;
    }
    const daSerie = linhas.filter((l) => l.serie === linha.serie);
    const bloco = blocoDasDivisoes({ linha, daSerie, mes: temporada.mes, fechadas, agora: new Date() });
    const serie = nomeDaSerie(linha.serie);
    // A projeção só vale quando a segunda desta semana é do mês aberto.
    const projecao = ranking && `${semana.slice(0, 7)}-01` === temporada.mes ? projetarSemana(daSerie, ranking, time.id) : null;
    const evento = bloco.evento;
    const frase = evento ? fraseDoMes(`${time.id}|${temporada.mes}|${evento}`, () => fraseDaTemporada(evento as SituacaoDoMes, { time, serie, dif: bloco.dif })) : null;
    const seta =
      projecao?.seta === 'sobe'
        ? '<span class="seta subiu" aria-hidden="true">▲</span>'
        : projecao?.seta === 'desce'
          ? '<span class="seta caiu" aria-hidden="true">▼</span>'
          : '';
    el.innerHTML = `<div class="bd-topo">
        <button class="bd-abrir" type="button">
          <strong class="bd-pos">${posicaoGrande(bloco.posicao)}</strong>
          <span class="bd-texto"><b>${esc(bloco.serie)}</b><span>${esc(bloco.situacao)}</span></span><span class="so-leitor">. Ver a tabela do mês</span>
        </button>
        ${temporada.pre_temporada ? seloPre() : ''}
      </div>
      ${projecao ? `<p class="bd-proj">${seta}<span>${esc(linhaDaProjecao(projecao, linha.serie, time))}</span></p>` : ''}`;
    el.hidden = false;
    return frase ? { texto: frase, destaque: evento !== 'temporada_meio' } : null;
  }

  try {
    tabela = await lerTabela(time.id);
  } catch {
    if (!saiu()) {
      el.innerHTML = '<p class="bd-erro">Tabela do mês: sem conexão agora.</p>';
      el.hidden = false;
    }
    return () => null;
  }
  if (!tabela) {
    el.hidden = true;
    return () => null;
  }
  desenhar();
  return (novo) => {
    ranking = novo;
    return desenhar();
  };
}
