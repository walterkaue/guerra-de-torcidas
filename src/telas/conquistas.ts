// Aba Conquistas do Ranking (docs/jogo.md, seção 7.3, "Medalhas e Conquistas"): as medalhas da própria
// pessoa por clube e por lance, e a vitrine das torcidas (soma por time, sem ninguém identificado).
// Medalha é coleção: não vale ponto. Só leitura; baixa sob demanda quando a aba é aberta. Tocar numa medalha abre
// "Mandar a medalha", com o card só dela.
// Visual do Grafismo de TV (docs/jogo.md 14.2): placas com faixa, números em bloco, estados com "Tentar de novo".

import '../estilos/conquistas.css';
import { esc, irPara } from '../app';
import { SELECAO } from '../dados/coresDosLances';
import { itemPenaltis } from '../jogo/regraLances';
import { DISPUTAS } from '../dados/disputas';
import { LANCES } from '../dados/lances';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import {
  CONQUISTAS_VAZIO,
  ehItemPenaltis,
  NOME_DA_MEDALHA,
  montarMedalhas,
  trilhaDoItem,
  ordenarVitrine,
  type MedalhaDoLanceMontada,
  type MedalhasDoClube,
} from '../jogo/lancesTextos';
import type { Medalha } from '../jogo/lances';
import { textoDasMedalhasDosPenaltis } from '../jogo/regrasUnificadas';
import * as real from '../servidor/api';
import { htmlBotaoApoio, ligarBotaoApoio } from './apoio';
import { abas, aoTocarNoEstado, estado, faixa, marcarAba, numero, trilha } from './blocos';
import { lancesUnificados } from './corte';
import { icone } from './icones';
import { ligarMandarMedalha } from './mandarMedalha';

type Servidor = Pick<typeof real, 'minhasMedalhas' | 'vitrineMedalhas'>;
// Em desenvolvimento, ?lancesFalsos troca o servidor por um de mentira (src/dev/lancesFalsos.ts).
const FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('lancesFalsos');
const servidor = async (): Promise<Servidor> => (FALSO ? import('../dev/lancesFalsos') : real);

const TIPOS: Medalha[] = ['ouro', 'prata', 'bronze'];

/** Nome e cores do clube de um lance (id de times.ts ou "selecao"). */
const clubeDoLance = (clube: string) => (clube === 'selecao' ? SELECAO : (timePorId(clube) ?? SELECAO));

/**
 * Ficha de cada item da lista. Os itens de pênaltis (`penaltis:<disputa>`) entram antes e depois do corte
 * (docs/jogo.md, 14.7); disputa que saiu do catálogo fica de fora.
 */
const ficha = (id: string) => {
  if (ehItemPenaltis(id)) {
    const d = DISPUTAS.find((x) => itemPenaltis(x.id) === id);
    return d && { titulo: d.titulo, clube: d.clube };
  }
  const l = LANCES.find((x) => x.id === id);
  return l && { titulo: l.titulo, clube: l.clube };
};

const bolinha = (m: Medalha) => `<span class="medalha ${m}" aria-hidden="true"></span>`;

/** Três contadores (ouro, prata, bronze). O nome vai por escrito, nunca só a cor. */
function contadores(c: { ouro: number; prata: number; bronze: number }): string {
  return `<span class="conq-contagem">${TIPOS.map(
    (m) => `<span class="conq-n${c[m] ? '' : ' zero'}">${bolinha(m)}<b>${c[m]}</b><small>${NOME_DA_MEDALHA[m].toLowerCase()}</small></span>`,
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

/** O que vem depois do clube: recriados nos lances, vitórias nos pênaltis. */
function detalheDoItem(l: MedalhaDoLanceMontada): string {
  if (l.penaltis) return l.vitorias ? ` · ${l.vitorias} ${l.vitorias === 1 ? 'vitória' : 'vitórias'}` : '';
  return l.recriados ? ` · ${l.recriados} recriando` : '';
}

function linhaDoLance(l: MedalhaDoLanceMontada): string {
  const t = clubeDoLance(l.clube);
  const m = l.progresso.medalha;
  return `<li class="conq-linha conq-lance">
    <span class="cor" style="--c1:${t.cores[0]};--c2:${t.cores[1]}" aria-hidden="true"></span>
    <span class="conq-nome">${esc(l.titulo)}<small>${esc(t.nome)}${detalheDoItem(l)}</small></span>
    ${
      m
        ? `<button type="button" class="conq-selo ${m}" data-mandar-medalha="${esc(l.lanceId)}" data-medalha="${m}"
            aria-label="${esc(`${NOME_DA_MEDALHA[m]} em ${l.titulo}: mandar a medalha`)}">${bolinha(m)}${NOME_DA_MEDALHA[m]}${icone('trofeu')}</button>`
        : '<span class="conq-selo sem">Sem medalha</span>'
    }
    <div class="conq-trilha">${trilha(trilhaDoItem(l.lanceId, { gols: l.gols, recriados: l.recriados, vitorias: l.vitorias }), { compacta: true })}</div>
  </li>`;
}

/** Soma das medalhas da pessoa, para os três números do topo da placa. */
function totais(porClube: readonly MedalhasDoClube[]): Record<Medalha, number> {
  const t: Record<Medalha, number> = { ouro: 0, prata: 0, bronze: 0 };
  for (const c of porClube) for (const m of TIPOS) t[m] += c[m];
  return t;
}

function desenharMedalhas(el: HTMLElement): () => void {
  let saiu = false;
  const meuTime = prefs.get().time;
  el.innerHTML = `<div class="conquistas">
      <section class="placa" aria-label="Suas medalhas" data-minhas aria-live="polite"></section>
      <section class="placa" aria-label="Vitrine das torcidas" data-vitrine aria-live="polite"></section>
      <p class="explica">Medalha por lance, só com gol em partida valendo: bronze com 5 gols, prata com 20 e ouro com 50, 10 deles recriando o lance. ${textoDasMedalhasDosPenaltis()} Não vale ponto e não zera.</p>
      <button class="botao-linha conq-jogar" type="button" data-acao="jogar">Jogar os Lances do Jogo</button>
      <div class="rodape-apoio">${htmlBotaoApoio()}</div>
    </div>`;
  ligarBotaoApoio(el);
  el.querySelector('[data-acao="jogar"]')!.addEventListener('click', () => irPara(lancesUnificados() ? { tela: 'lances' } : { tela: 'lances', aba: 'falta' }));
  const minhas = el.querySelector<HTMLElement>('[data-minhas]')!;
  const vitrine = el.querySelector<HTMLElement>('[data-vitrine]')!;
  // Tocar numa medalha abre "Mandar a medalha" (card só da medalha, docs/jogo.md 7.3).
  ligarMandarMedalha(minhas, el);

  /** Põe a faixa da placa e o conteúdo (ou um estado, com o botão ligado quando há como tentar de novo). */
  const pintar = (placa: HTMLElement, titulo: string, html: string, tentar?: () => void): void => {
    placa.innerHTML = `${faixa(titulo)}${html}`;
    if (tentar) aoTocarNoEstado(placa, tentar);
  };

  function carregarMinhas(): void {
    pintar(minhas, 'Suas medalhas', estado('carregando', 'Buscando as medalhas…'));
    void servidor()
      .then((api) => api.minhasMedalhas())
      .then((linhas) => {
        if (saiu) return;
        const { porClube, porLance } = montarMedalhas(linhas, ficha);
        if (!porLance.length) {
          pintar(minhas, 'Suas medalhas', estado('vazio', CONQUISTAS_VAZIO));
          return;
        }
        const t = totais(porClube);
        pintar(
          minhas,
          'Suas medalhas',
          `<div class="numeros tres">${TIPOS.map((m) => numero(`${bolinha(m)}${t[m]}`, NOME_DA_MEDALHA[m], t[m] ? undefined : 'apagado')).join('')}</div>
           <p class="rotulo conq-sub">Por clube</p><ul class="conq-lista">${porClube.map(linhaDoClube).join('')}</ul>
           <p class="rotulo conq-sub">Por lance</p><ul class="conq-lista">${porLance.map(linhaDoLance).join('')}</ul>`,
        );
      })
      .catch(() => {
        if (!saiu) pintar(minhas, 'Suas medalhas', estado('erro', 'Sem conexão com as medalhas agora.'), carregarMinhas);
      });
  }

  function carregarVitrine(): void {
    pintar(vitrine, 'Vitrine das torcidas', estado('carregando', 'Buscando a vitrine…'));
    void servidor()
      .then((api) => api.vitrineMedalhas())
      .then((linhas) => {
        if (saiu) return;
        const lista = ordenarVitrine(linhas);
        pintar(
          vitrine,
          'Vitrine das torcidas',
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
            : estado('vazio', 'Nenhuma torcida levou medalha ainda. Quem abre a vitrine?'),
        );
      })
      .catch(() => {
        if (!saiu) pintar(vitrine, 'Vitrine das torcidas', estado('erro', 'Sem conexão com as medalhas agora.'), carregarVitrine);
      });
  }

  carregarMinhas();
  carregarVitrine();

  return () => {
    saiu = true;
  };
}

/** A aba Conquistas: "Medalhas" (o que já existia) e "Galeria" (troféus das torcidas; baixa só ao abrir). */
export function desenharConquistas(el: HTMLElement, inicial: 'medalhas' | 'galeria' = 'medalhas'): () => void {
  let sub: 'medalhas' | 'galeria' | null = null;
  let parar: (() => void) | null = null;
  let vez = 0;
  el.innerHTML = `<div class="abas-linha">${abas('csub', [{ id: 'medalhas', texto: 'Medalhas' }, { id: 'galeria', texto: 'Galeria' }], inicial, 2)}</div>
    <div class="painel-ranking" data-csub-corpo></div>`;
  const corpo = el.querySelector<HTMLElement>('[data-csub-corpo]')!;

  function abrir(nova: 'medalhas' | 'galeria'): void {
    if (nova === sub) return;
    sub = nova;
    parar?.();
    parar = null;
    const minha = ++vez;
    marcarAba(el, 'csub', nova);
    if (nova === 'medalhas') {
      parar = desenharMedalhas(corpo);
      return;
    }
    corpo.innerHTML = '';
    // Baixa sob demanda; se saiu da sub-aba antes de chegar, não desenha.
    void import('./galeria').then((m) => {
      if (minha === vez) parar = m.desenharGaleria(corpo, { verMedalhas: () => abrir('medalhas') });
    });
  }
  el.querySelectorAll<HTMLElement>('[data-csub]').forEach((b) =>
    b.addEventListener('click', () => abrir(b.dataset.csub as 'medalhas' | 'galeria')),
  );
  abrir(inicial);

  return () => {
    vez++;
    parar?.();
  };
}
