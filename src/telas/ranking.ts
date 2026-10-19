// Ranking da semana (MVP, antes das divisões): só a aba Semana, com Campeão da semana
// e Maior torcida. Só torcidas, nenhum apelido. "Outro time" não entra.
// A semana que fechou fica "provisória" até segunda 12h (jogo de domingo à noite ainda
// tem o placar confirmado depois da virada; docs/jogo.md, seção 7).

import { esc, type Rota } from '../app';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { ouvirRanking, rankingDaSemana, type LinhaRanking } from '../servidor/api';
import { semanaConfirmadaEm } from '../jogo/crava';
import { semanaBrasilia } from '../servidor/tempo';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';

type Modo = 'campeao' | 'soma';

export function telaRanking(root: HTMLElement, _rota: Rota): () => void {
  const meuTime = prefs.get().time;
  const atual = semanaBrasilia();
  const passada = semanaBrasilia(new Date(Date.now() - 7 * 24 * 3600_000));
  let semana = atual;
  let modo: Modo = 'campeao';
  let linhas: LinhaRanking[] = [];
  let parar: (() => void) | null = null;
  let saiu = false;

  root.innerHTML = `
    <main class="tela ranking">
      <header class="cabecalho"><h2 class="titulo-placar">Ranking</h2></header>
      <div class="abas abas-semana" role="tablist">
        <button role="tab" class="rotulo" aria-selected="true" data-semana="atual">Esta semana</button>
        <button role="tab" class="rotulo" aria-selected="false" data-semana="passada">Semana passada</button>
      </div>
      <p class="selo-semana" data-selo hidden></p>
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

  const elSelo = root.querySelector<HTMLElement>('[data-selo]')!;

  function desenhar(): void {
    if (semana === passada) {
      const provisoria = Date.now() < semanaConfirmadaEm(passada).getTime();
      elSelo.textContent = provisoria
        ? 'Provisória até segunda 12h: ainda entram placares confirmados do fim de semana.'
        : 'Semana fechada.';
      elSelo.classList.toggle('provisoria', provisoria);
      elSelo.hidden = false;
    } else elSelo.hidden = true;
    elExplica.textContent =
      modo === 'campeao'
        ? 'Média dos 30 melhores torcedores da semana. Torcida com menos de 30 completa as vagas com 80% da média geral. Só as 5 melhores partidas do dia de cada um contam, somando os minigames; os pontos do Crava a Rodada entram por fora desse teto. Zera segunda 00h.'
        : 'Soma de todo mundo que jogou na semana. É vitrine: o título sai do Campeão da semana.';
    if (!linhas.some((l) => l.ativos > 0)) {
      elTabela.innerHTML = `<p class="vazio">Ninguém jogou ${semana === atual ? 'ainda nesta semana' : 'na semana passada'}.</p>`;
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

  const carregar = () => {
    const pedida = semana;
    return rankingDaSemana(pedida)
      .then((l) => {
        if (saiu || pedida !== semana) return;
        linhas = l;
        desenhar();
      })
      .catch(() => {
        if (!saiu) elTabela.innerHTML = '<p class="vazio">Sem conexão com o placar agora.</p>';
      });
  };
  const ouvir = () => {
    parar?.();
    parar = null;
    const ouvida = semana;
    ouvirRanking(ouvida, () => void carregar())
      .then((f) => (saiu || ouvida !== semana ? f() : (parar = f)))
      .catch(() => {});
  };
  void carregar();
  ouvir();

  root.querySelectorAll<HTMLButtonElement>('[data-semana]').forEach((b) =>
    b.addEventListener('click', () => {
      const nova = b.dataset.semana === 'passada' ? passada : atual;
      if (nova === semana) return;
      semana = nova;
      root.querySelectorAll('[data-semana]').forEach((o) => o.setAttribute('aria-selected', String(o === b)));
      elTabela.innerHTML = '<p class="vazio">Carregando…</p>';
      void carregar();
      ouvir();
    }),
  );

  return () => {
    saiu = true;
    parar?.();
  };
}
