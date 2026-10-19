// Ranking da semana (MVP, antes das divisões): só a aba Semana, com Campeão da semana
// e Maior torcida. Só torcidas, nenhum apelido. "Outro time" não entra.

import { esc, type Rota } from '../app';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { ouvirRanking, rankingDaSemana, type LinhaRanking } from '../servidor/api';
import { semanaBrasilia } from '../servidor/tempo';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';

type Modo = 'campeao' | 'soma';

export function telaRanking(root: HTMLElement, _rota: Rota): () => void {
  const meuTime = prefs.get().time;
  const semana = semanaBrasilia();
  let modo: Modo = 'campeao';
  let linhas: LinhaRanking[] = [];
  let parar: (() => void) | null = null;
  let saiu = false;

  root.innerHTML = `
    <main class="tela ranking">
      <header class="cabecalho"><h2 class="titulo-placar">Ranking</h2></header>
      <div class="abas" role="tablist">
        <button role="tab" class="rotulo" aria-selected="true" data-modo="campeao">Campeão da semana</button>
        <button role="tab" class="rotulo" aria-selected="false" data-modo="soma">Maior torcida</button>
      </div>
      <div class="tabela" aria-live="polite"><p class="vazio">Carregando…</p></div>
      <p class="explica" data-explica></p>
      ${barraNavegacao('ranking')}
    </main>`;
  ligarBarraNavegacao(root);

  const elTabela = root.querySelector<HTMLElement>('.tabela')!;
  const elExplica = root.querySelector<HTMLElement>('[data-explica]')!;

  function desenhar(): void {
    elExplica.textContent =
      modo === 'campeao'
        ? 'Média dos 30 melhores torcedores da semana. Torcida com menos de 30 completa as vagas com 80% da média geral. Só as 5 melhores partidas do dia de cada um contam. Zera segunda 00h.'
        : 'Soma de todo mundo que jogou na semana. É vitrine: o título sai do Campeão da semana.';
    if (!linhas.some((l) => l.ativos > 0)) {
      elTabela.innerHTML = '<p class="vazio">Ninguém jogou ainda nesta semana.</p>';
      return;
    }
    const pos = (l: LinhaRanking) => (modo === 'campeao' ? l.posicao_campeao : l.posicao_soma);
    elTabela.innerHTML = [...linhas]
      .sort((a, b) => pos(a) - pos(b))
      .map((l) => {
        const t = timePorId(l.time_id);
        const valor = modo === 'campeao' ? l.media30 : l.soma;
        const classes = ['mini-linha'];
        if (pos(l) === 1 && l.ativos > 0) classes.push('lider');
        if (l.time_id === meuTime && meuTime !== ID_OUTRO) classes.push('meu');
        return `<div class="${classes.join(' ')}">
          <span class="pos">${pos(l)}º</span><span class="seta" aria-hidden="true"></span>
          <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
          <span class="nome">${esc(t?.nome ?? l.time_id)}<small> ${l.ativos} ${l.ativos === 1 ? 'torcedor' : 'torcedores'}</small></span>
          <span class="valor">${Math.round(valor).toLocaleString('pt-BR')}</span>
        </div>`;
      })
      .join('');
  }

  root.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b) =>
    b.addEventListener('click', () => {
      modo = b.dataset.modo as Modo;
      root.querySelectorAll('[data-modo]').forEach((o) => o.setAttribute('aria-selected', String(o === b)));
      desenhar();
    }),
  );

  const carregar = () =>
    rankingDaSemana(semana)
      .then((l) => {
        if (saiu) return;
        linhas = l;
        desenhar();
      })
      .catch(() => {
        if (!saiu) elTabela.innerHTML = '<p class="vazio">Sem conexão com o placar agora.</p>';
      });
  void carregar();
  ouvirRanking(semana, () => void carregar())
    .then((f) => (saiu ? f() : (parar = f)))
    .catch(() => {});

  return () => {
    saiu = true;
    parar?.();
  };
}
