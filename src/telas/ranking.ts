// Ranking da semana (MVP, antes das divisões): só a aba Semana, com Campeão da semana
// e Maior torcida. Só torcidas, nenhum apelido. "Outro time" não entra.
// A semana que fechou fica "provisória" até segunda 12h (jogo de domingo à noite ainda
// tem o placar confirmado depois da virada; docs/jogo.md, seção 7).

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { ouvirRanking, rankingDaSemana, type LinhaRanking } from '../servidor/api';
import { semanaConfirmadaEm } from '../jogo/crava';
import { textoDaMedia } from '../jogo/rankingTextos';
import { lancesUnificados } from './corte';
import { semanaBrasilia } from '../servidor/tempo';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { abas, aoTocarNoEstado, baixarPedaco, cabecalhoTela, estado } from './blocos';

type Modo = 'campeao' | 'soma';

// Em desenvolvimento, ?homeFalsa troca o servidor por um de mentira (src/dev/homeFalsa.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
const servidor = (): Promise<{ rankingDaSemana: typeof rankingDaSemana }> =>
  FALSA ? import('../dev/homeFalsa') : Promise.resolve({ rankingDaSemana });

export function telaRanking(root: HTMLElement, rota: Rota): () => void {
  const meuTime = prefs.get().time;
  const atual = semanaBrasilia();
  const passada = semanaBrasilia(new Date(Date.now() - 7 * 24 * 3600_000));
  let semana = atual;
  let modo: Modo = 'campeao';
  let linhas: LinhaRanking[] = [];
  let parar: (() => void) | null = null;
  let saiu = false;

  const eu = timePorId(meuTime);
  root.innerHTML = `
    <main class="tela ranking"${eu ? ` style="--c1:${eu.cores[0]};--c2:${eu.cores[1]}"` : ''}>
      ${cabecalhoTela({ titulo: 'Ranking' })}
      ${abas('ranking', [
        { id: 'semana', texto: 'Semana' },
        { id: 'temporada', texto: 'Temporada' },
        { id: 'cidades', texto: 'Cidades' },
        { id: 'conquistas', texto: 'Conquistas' },
      ], 'semana')}
      <div class="painel-ranking" data-painel="semana">
        <div class="abas-linha">
          ${abas('semana', [{ id: 'atual', texto: 'Esta semana' }, { id: 'passada', texto: 'Passada' }], 'atual', 2)}
          ${abas('modo', [{ id: 'campeao', texto: 'Campeão' }, { id: 'soma', texto: 'Maior torcida' }], 'campeao', 2)}
        </div>
        <p class="selo-semana" data-selo hidden></p>
        <div class="tabela" data-tabela-semana aria-live="polite">${estado('carregando', 'Buscando a tabela…')}</div>
        <p class="explica" data-explica></p>
      </div>
      <div class="painel-ranking" data-painel="temporada" hidden></div>
      <div class="painel-ranking" data-painel="cidades" hidden></div>
      <div class="painel-ranking" data-painel="conquistas" hidden></div>
      ${barraNavegacao('ranking')}
    </main>`;
  ligarBarraNavegacao(root);

  // As abas Temporada, Cidades e Conquistas só carregam quando são abertas, e a cada abertura começam do zero.
  type AbaDoRanking = 'semana' | 'temporada' | 'cidades' | 'conquistas';
  const paineis: Record<AbaDoRanking, HTMLElement> = {
    semana: root.querySelector<HTMLElement>('[data-painel="semana"]')!,
    temporada: root.querySelector<HTMLElement>('[data-painel="temporada"]')!,
    cidades: root.querySelector<HTMLElement>('[data-painel="cidades"]')!,
    conquistas: root.querySelector<HTMLElement>('[data-painel="conquistas"]')!,
  };
  // As abas Temporada, Cidades e Conquistas baixam sob demanda (lances, medalhas, Galeria e o CSS delas não pesam na
  // Home). Se a pessoa sai da aba antes de o pedaço chegar, nada é desenhado.
  type Desenhador = (el: HTMLElement, sub?: string) => () => void;
  const sobDemanda =
    (carregar: () => Promise<Desenhador>): Desenhador =>
    (el, sub) => {
      let parar: (() => void) | null = null;
      let saiuDaAba = false;
      baixarPedaco(el, carregar, (desenhar) => (parar = desenhar(el, sub)), () => !saiuDaAba);
      return () => {
        saiuDaAba = true;
        parar?.();
      };
    };
  const desenhadores: Partial<Record<AbaDoRanking, Desenhador>> = {
    temporada: sobDemanda(() => import('./temporada').then((m) => (el, sub) => m.desenharTemporada(el, sub === '52semanas' ? sub : 'mes'))),
    cidades: sobDemanda(() => import('./rankingCidades').then((m) => (el, sub) => m.desenharCidades(el, sub === 'campeas' ? sub : undefined))),
    conquistas: sobDemanda(() => import('./conquistas').then((m) => (el, sub) => m.desenharConquistas(el, sub === 'galeria' ? sub : 'medalhas'))),
  };
  let abaAberta: AbaDoRanking = 'semana';
  let limparAba: (() => void) | null = null;
  function abrirAba(aba: AbaDoRanking, sub?: string): void {
    if (aba === abaAberta) return;
    abaAberta = aba;
    root.querySelectorAll<HTMLElement>('[data-ranking]').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.ranking === aba)));
    for (const [nome, el] of Object.entries(paineis)) el.hidden = nome !== aba;
    limparAba?.();
    limparAba = desenhadores[aba]?.(paineis[aba], sub) ?? null;
  }
  root.querySelectorAll<HTMLButtonElement>('[data-ranking]').forEach((b) =>
    b.addEventListener('click', () => abrirAba(b.dataset.ranking as AbaDoRanking)),
  );
  if (rota.tela === 'ranking' && rota.aba) abrirAba(rota.aba, rota.sub);

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
        ? textoDaMedia(lancesUnificados())
        : 'Soma de todo mundo que jogou na semana. É vitrine: o título sai do Campeão da semana.';
    if (!linhas.some((l) => l.ativos > 0)) {
      elTabela.innerHTML =
        semana === atual
          ? estado('vazio', 'Ninguém jogou ainda nesta semana.', { detalhe: 'Joga uma e põe sua torcida na frente.', acao: 'Jogar agora' })
          : estado('vazio', 'Ninguém jogou na semana passada.');
      aoTocarNoEstado(elTabela, () => irPara({ tela: 'inicio' }));
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
        const casa = l.time_id !== ID_OUTRO ? ` data-casa="${esc(l.time_id)}" role="link" tabindex="0"` : '';
        if (casa) classes.push('abre-casa');
        return `<div class="${classes.join(' ')}"${casa}>
          <span class="pos">${pos(l)}º</span><span class="seta" aria-hidden="true"></span>
          <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
          <span class="nome">${esc(t?.nome ?? l.time_id)} <small>${l.ativos} ${l.ativos === 1 ? 'torcedor' : 'torcedores'}</small></span>
          <span class="valor">${Math.round(valor).toLocaleString('pt-BR')}</span>${casa ? `<span class="so-leitor">, abrir a Casa ${t?.artigo === 'a' ? 'da' : 'do'} ${esc(t?.nome ?? l.time_id)}</span>` : ''}
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

  const carregar = (): Promise<void> => {
    const pedida = semana;
    return servidor()
      .then((api) => api.rankingDaSemana(pedida))
      .then((l) => {
        if (saiu || pedida !== semana) return;
        linhas = l;
        desenhar();
      })
      .catch(() => {
        if (saiu) return;
        elTabela.innerHTML = estado('erro', 'Sem conexão com o placar agora.', { detalhe: 'A tabela volta assim que a internet voltar.' });
        aoTocarNoEstado(elTabela, () => {
          elTabela.innerHTML = estado('carregando', 'Buscando a tabela…');
          void carregar();
        });
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
      elTabela.innerHTML = estado('carregando', 'Buscando a tabela…');
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
