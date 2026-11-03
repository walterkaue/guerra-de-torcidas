// Aba Conquistas do Ranking (docs/jogo.md, seção 7.3, "Medalhas e Conquistas"): as medalhas da própria
// pessoa por clube e por lance, e a vitrine das torcidas (soma por time, sem ninguém identificado).
// Medalha é coleção: não vale ponto. Só leitura; baixa sob demanda quando a aba é aberta.

import '../estilos/conquistas.css';
import { esc, irPara } from '../app';
import { SELECAO } from '../dados/coresDosLances';
import { LANCES } from '../dados/lances';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import {
  CONQUISTAS_VAZIO,
  NOME_DA_MEDALHA,
  montarMedalhas,
  ordenarVitrine,
  type MedalhaDoLanceMontada,
  type MedalhasDoClube,
} from '../jogo/lancesTextos';
import type { Medalha } from '../jogo/lances';
import * as real from '../servidor/api';
import { htmlBotaoApoio, ligarBotaoApoio } from './apoio';

type Servidor = Pick<typeof real, 'minhasMedalhas' | 'vitrineMedalhas'>;
// Em desenvolvimento, ?lancesFalsos troca o servidor por um de mentira (src/dev/lancesFalsos.ts).
const FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('lancesFalsos');
const servidor = async (): Promise<Servidor> => (FALSO ? import('../dev/lancesFalsos') : real);

const SEM_CONEXAO = '<p class="vazio">Sem conexão com as medalhas agora.</p>';
const TIPOS: Medalha[] = ['ouro', 'prata', 'bronze'];

/** Nome e cores do clube de um lance (id de times.ts ou "selecao"). */
const clubeDoLance = (clube: string) => (clube === 'selecao' ? SELECAO : (timePorId(clube) ?? SELECAO));

const ficha = (id: string) => {
  const l = LANCES.find((x) => x.id === id);
  return l && { titulo: l.titulo, clube: l.clube };
};

/** Três contadores (ouro, prata, bronze). O nome vai por escrito, nunca só a cor. */
function contadores(c: { ouro: number; prata: number; bronze: number }): string {
  return `<span class="conq-contagem">${TIPOS.map(
    (m) => `<span class="conq-n${c[m] ? '' : ' zero'}"><i class="medalha ${m}" aria-hidden="true"></i><b>${c[m]}</b><small>${NOME_DA_MEDALHA[m].toLowerCase()}</small></span>`,
  ).join('')}</span>`;
}

function linhaDoClube(c: MedalhasDoClube): string {
  const t = clubeDoLance(c.clube);
  return `<li class="conq-linha">
    <span class="cor" style="--c1:${t.cores[0]};--c2:${t.cores[1]}" aria-hidden="true"></span>
    <span class="conq-nome">${esc(t.nome)}<small>${c.lances} ${c.lances === 1 ? 'lance' : 'lances'}</small></span>
    ${contadores(c)}
  </li>`;
}

function linhaDoLance(l: MedalhaDoLanceMontada): string {
  const t = clubeDoLance(l.clube);
  const m = l.progresso.medalha;
  return `<li class="conq-linha conq-lance">
    <span class="cor" style="--c1:${t.cores[0]};--c2:${t.cores[1]}" aria-hidden="true"></span>
    <span class="conq-nome">${esc(l.titulo)}<small>${esc(t.nome)} · ${l.gols} ${l.gols === 1 ? 'gol' : 'gols'}${l.recriados ? `, ${l.recriados} recriando` : ''}</small>
      <small class="conq-falta">${esc(l.progresso.texto)}</small></span>
    ${m ? `<span class="conq-selo ${m}"><i class="medalha ${m}" aria-hidden="true"></i>${NOME_DA_MEDALHA[m]}</span>` : '<span class="conq-selo sem">Sem medalha</span>'}
  </li>`;
}

export function desenharConquistas(el: HTMLElement): () => void {
  let saiu = false;
  const meuTime = prefs.get().time;
  el.innerHTML = `<div class="conquistas">
      <section aria-label="Suas medalhas" data-minhas aria-live="polite"><h3 class="rotulo">Suas medalhas</h3><p class="vazio">Carregando…</p></section>
      <section aria-label="Vitrine das torcidas" data-vitrine aria-live="polite"><h3 class="rotulo">Vitrine das torcidas</h3><p class="vazio">Carregando…</p></section>
      <p class="explica">Medalha por lance, só com gol em partida valendo: bronze com 5 gols, prata com 20 e ouro com 50, 10 deles recriando o lance. Não vale ponto e não zera.</p>
      <button class="botao botao-sec" type="button" data-acao="jogar">Jogar os Lances do Jogo</button>
      <div class="rodape-apoio">${htmlBotaoApoio()}</div>
    </div>`;
  ligarBotaoApoio(el);
  el.querySelector('[data-acao="jogar"]')!.addEventListener('click', () => irPara({ tela: 'lances', aba: 'falta' }));
  const minhas = el.querySelector<HTMLElement>('[data-minhas]')!;
  const vitrine = el.querySelector<HTMLElement>('[data-vitrine]')!;

  void servidor().then((api) => {
    void api
      .minhasMedalhas()
      .then((linhas) => {
        if (saiu) return;
        const { porClube, porLance } = montarMedalhas(linhas, ficha);
        minhas.innerHTML = `<h3 class="rotulo">Suas medalhas</h3>${
          porLance.length
            ? `<p class="rotulo conq-sub">Por clube</p><ul class="conq-lista">${porClube.map(linhaDoClube).join('')}</ul>
               <p class="rotulo conq-sub">Por lance</p><ul class="conq-lista">${porLance.map(linhaDoLance).join('')}</ul>`
            : `<p class="vazio">${esc(CONQUISTAS_VAZIO)}</p>`
        }`;
      })
      .catch(() => {
        if (!saiu) minhas.innerHTML = `<h3 class="rotulo">Suas medalhas</h3>${SEM_CONEXAO}`;
      });

    void api
      .vitrineMedalhas()
      .then((linhas) => {
        if (saiu) return;
        const lista = ordenarVitrine(linhas);
        vitrine.innerHTML = `<h3 class="rotulo">Vitrine das torcidas</h3>${
          lista.length
            ? `<ul class="conq-lista">${lista
                .map((l, i) => {
                  const t = timePorId(l.time_id);
                  const meu = l.time_id === meuTime && meuTime !== ID_OUTRO;
                  return `<li class="conq-linha${meu ? ' meu' : ''}">
                    <span class="pos">${i + 1}º</span>
                    <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}" aria-hidden="true"></span>
                    <span class="conq-nome">${esc(t?.nome ?? l.time_id)}</span>
                    ${contadores(l)}
                  </li>`;
                })
                .join('')}</ul>`
            : '<p class="vazio">Nenhuma torcida levou medalha ainda. Quem abre a vitrine?</p>'
        }`;
      })
      .catch(() => {
        if (!saiu) vitrine.innerHTML = `<h3 class="rotulo">Vitrine das torcidas</h3>${SEM_CONEXAO}`;
      });
  });

  return () => {
    saiu = true;
  };
}
