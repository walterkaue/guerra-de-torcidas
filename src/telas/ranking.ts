// Ranking da semana (MVP, antes das divisões): só a aba Semana, com Campeão da semana
// e Maior torcida. Só torcidas, nenhum apelido. "Outro time" não entra.
// A semana que fechou fica "provisória" até segunda 12h (jogo de domingo à noite ainda
// tem o placar confirmado depois da virada; docs/jogo.md, seção 7).

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { ouvirRanking, rankingDaSemana, type LinhaRanking } from '../servidor/api';
import { semanaConfirmadaEm } from '../jogo/crava';
import { semanaBrasilia } from '../servidor/tempo';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { desenharTemporada } from './temporada';

type Modo = 'campeao' | 'soma';

export function telaRanking(root: HTMLElement, rota: Rota): () => void {
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
      <div class="abas abas-ranking" role="tablist">
        <button role="tab" class="rotulo" aria-selected="true" data-ranking="semana">Semana</button>
        <button role="tab" class="rotulo" aria-selected="false" data-ranking="temporada">Temporada</button>
        <button role="tab" class="rotulo" aria-selected="false" data-ranking="conquistas">Conquistas</button>
      </div>
      <div class="painel-ranking" data-painel="semana">
        <div class="abas abas-semana" role="tablist">
          <button role="tab" class="rotulo" aria-selected="true" data-semana="atual">Esta semana</button>
          <button role="tab" class="rotulo" aria-selected="false" data-semana="passada">Semana passada</button>
        </div>
        <p class="selo-semana" data-selo hidden></p>
        <div class="abas" role="tablist">
          <button role="tab" class="rotulo" aria-selected="true" data-modo="campeao">Campeão da semana</button>
          <button role="tab" class="rotulo" aria-selected="false" data-modo="soma">Maior torcida</button>
        </div>
        <div class="tabela" data-tabela-semana aria-live="polite"><p class="vazio">Carregando…</p></div>
        <p class="explica" data-explica></p>
      </div>
      <div class="painel-ranking" data-painel="temporada" hidden></div>
      <div class="painel-ranking" data-painel="conquistas" hidden></div>
      ${barraNavegacao('ranking')}
    </main>`;
  ligarBarraNavegacao(root);

  // As abas Temporada e Conquistas só carregam quando são abertas, e a cada abertura começam do zero.
  type AbaDoRanking = 'semana' | 'temporada' | 'conquistas';
  const paineis: Record<AbaDoRanking, HTMLElement> = {
    semana: root.querySelector<HTMLElement>('[data-painel="semana"]')!,
    temporada: root.querySelector<HTMLElement>('[data-painel="temporada"]')!,
    conquistas: root.querySelector<HTMLElement>('[data-painel="conquistas"]')!,
  };
  const desenhadores: Partial<Record<AbaDoRanking, (el: HTMLElement) => () => void>> = {
    temporada: desenharTemporada,
    // Conquistas baixa sob demanda (lances, medalhas e o CSS dela não pesam na Home).
    conquistas: (el) => {
      let parar: (() => void) | null = null;
      let saiuDaAba = false;
      void import('./conquistas').then((m) => {
        if (!saiuDaAba) parar = m.desenharConquistas(el);
      });
      return () => {
        saiuDaAba = true;
        parar?.();
      };
    },
  };
  let abaAberta: AbaDoRanking = 'semana';
  let limparAba: (() => void) | null = null;
  function abrirAba(aba: AbaDoRanking): void {
    if (aba === abaAberta) return;
    abaAberta = aba;
    root.querySelectorAll<HTMLElement>('[data-ranking]').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.ranking === aba)));
    for (const [nome, el] of Object.entries(paineis)) el.hidden = nome !== aba;
    limparAba?.();
    limparAba = desenhadores[aba]?.(paineis[aba]) ?? null;
  }
  root.querySelectorAll<HTMLButtonElement>('[data-ranking]').forEach((b) =>
    b.addEventListener('click', () => abrirAba(b.dataset.ranking as AbaDoRanking)),
  );
  if (rota.tela === 'ranking' && rota.aba === 'conquistas') abrirAba('conquistas');

  const elTabela = root.querySelector<HTMLElement>('[data-tabela-semana]')!;
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
        ? 'Conta a média dos 30 melhores de cada torcida. Só as 5 melhores partidas do dia de cada um valem.'
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
        const casa = l.time_id !== ID_OUTRO ? ` data-casa="${esc(l.time_id)}" role="link" tabindex="0" aria-label="Abrir a Casa ${t?.artigo === 'a' ? 'da' : 'do'} ${esc(t?.nome ?? l.time_id)}"` : '';
        if (casa) classes.push('abre-casa');
        return `<div class="${classes.join(' ')}"${casa}>
          <span class="pos">${pos(l)}º</span><span class="seta" aria-hidden="true"></span>
          <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
          <span class="nome">${esc(t?.nome ?? l.time_id)}<small> ${l.ativos} ${l.ativos === 1 ? 'torcedor' : 'torcedores'}</small></span>
          <span class="valor">${Math.round(valor).toLocaleString('pt-BR')}</span>
        </div>`;
      })
      .join('');
  }

  // Tocar numa torcida abre a Casa dela (só navegação: nenhum ponto).
  const abrirCasa = (e: Event) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-casa]')?.dataset.casa;
    if (id) irPara({ tela: 'casa', id });
  };
  elTabela.addEventListener('click', abrirCasa);
  elTabela.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') abrirCasa(e);
  });

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
    limparAba?.();
  };
}
