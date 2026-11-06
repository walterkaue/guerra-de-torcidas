// Aba Cidades do Ranking: seu estado, top nacional e estados (docs/jogo.md, seção 5). Só leitura.
// Só entram cidades e estados com 5+ jogadores na semana. Nenhum apelido: só nome de cidade e UF.
// Semana provisória e travada iguais à aba Semana. Atualiza pelo mesmo aviso (Realtime) do ranking dos times.

import { esc } from '../app';
import { prefs } from '../estado';
import { semanaConfirmadaEm } from '../jogo/crava';
import {
  EXPLICA_CIDADES,
  linhaDaCidadeNaHome,
  seloDaSemana,
  textoJogadores,
  type LinhaCidade,
  type LinhaEstado,
  type MinhaCidade,
} from '../jogo/rankingCidades';
import { fraseDaCidade } from '../narrador/cidade';
import * as real from '../servidor/rankingCidades';
import { ouvirRanking } from '../servidor/api';
import { semanaBrasilia } from '../servidor/tempo';
import { abas, aoTocarNoEstado, estado, marcarAba } from './blocos';

type Servidor = typeof real;
type Sub = 'estado' | 'top' | 'estados' | 'campeas';

// Em desenvolvimento, ?cidadesFalsas=com|sem|faltam|vazia|erro troca o servidor por um de mentira.
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('cidadesFalsas');
const servidor = async (): Promise<Servidor> => (FALSA ? import('../dev/cidadesFalsas') : real);

interface Dados {
  minha: MinhaCidade | null;
  cidades: LinhaCidade[];
  estados: LinhaEstado[];
}

export function desenharCidades(el: HTMLElement, inicial?: 'campeas'): () => void {
  let saiu = false;
  let pararAviso: (() => void) | null = null;
  const atual = semanaBrasilia();
  const passada = semanaBrasilia(new Date(Date.now() - 7 * 24 * 3600_000));
  let semana = atual;
  let sub: Sub | null = inicial === 'campeas' ? 'campeas' : null;
  let pararCampeas: (() => void) | undefined;
  let dados: Dados | null = null;

  el.innerHTML = `
    <div class="abas-linha">
      ${abas('cidsemana', [{ id: 'atual', texto: 'Esta semana' }, { id: 'passada', texto: 'Passada' }], 'atual', 2)}
      ${abas('cidsub', [{ id: 'estado', texto: 'Seu estado' }, { id: 'top', texto: 'Top nacional' }, { id: 'estados', texto: 'Estados' }, { id: 'campeas', texto: 'Campeãs' }], inicial ?? 'top', 2)}
    </div>
    <p class="selo-semana" data-cid-selo hidden></p>
    <p class="frase-meu-time" data-cid-frase hidden></p>
    <div class="tabela" data-cid-tabela aria-live="polite"></div>
    <p class="explica">${esc(EXPLICA_CIDADES)}</p>
    <div class="painel-ranking" data-cid-campeas hidden></div>`;
  const elSelo = el.querySelector<HTMLElement>('[data-cid-selo]')!;
  const elFrase = el.querySelector<HTMLElement>('[data-cid-frase]')!;
  const elTabela = el.querySelector<HTMLElement>('[data-cid-tabela]')!;
  const elExplica = el.querySelector<HTMLElement>('.explica')!;
  const elCampeas = el.querySelector<HTMLElement>('[data-cid-campeas]')!;
  const elSemanaAbas = el.querySelector<HTMLElement>('[data-cidsemana]')!.parentElement!;

  const tentarDeNovo = () => {
    elTabela.innerHTML = estado('carregando', 'Buscando as cidades…');
    void carregar();
  };

  /** Com "Campeãs" aberta o seletor de semana e a tabela somem; a sub-aba baixa só ao abrir. */
  function mostrarCampeas(sim: boolean): void {
    pararCampeas?.();
    pararCampeas = undefined;
    elCampeas.innerHTML = '';
    for (const x of [elSemanaAbas, elTabela, elExplica]) x.hidden = sim;
    elCampeas.hidden = !sim;
    if (!sim) return;
    elSelo.hidden = elFrase.hidden = true;
    void import('./campeas').then((m) => {
      if (!saiu && sub === 'campeas' && !pararCampeas) pararCampeas = m.desenharCampeas(elCampeas);
    });
  }

  async function carregar(): Promise<void> {
    if (sub === 'campeas') return;
    const pedida = semana;
    if (!dados) elTabela.innerHTML = estado('carregando', 'Buscando as cidades…');
    try {
      const api = await servidor();
      // Sem time escolhido, não cria login só para isso.
      const minha = prefs.get().time ? await api.minhaCidadeSemana(pedida) : null;
      const escolhida: Sub = sub ?? (minha ? 'estado' : 'top');
      const [cidades, estados] = await Promise.all([
        escolhida === 'estado' && minha ? api.rankingCidades(pedida, minha.uf) : escolhida === 'top' ? api.rankingCidadesTop(pedida) : Promise.resolve([]),
        escolhida === 'estados' ? api.rankingEstados(pedida) : Promise.resolve([]),
      ]);
      if (saiu || pedida !== semana || (sub !== null && sub !== escolhida)) return;
      sub = escolhida;
      dados = { minha, cidades, estados };
      desenhar();
    } catch {
      if (saiu || pedida !== semana) return;
      elTabela.innerHTML = estado('erro', 'Sem conexão com o placar agora.', { detalhe: 'A tabela volta assim que a internet voltar.' });
      aoTocarNoEstado(elTabela, tentarDeNovo);
    }
  }

  function linhaCidade(l: LinhaCidade, minha: MinhaCidade | null, comUf: boolean): string {
    const classes = ['mini-linha', 'linha-cidade'];
    if (l.posicao === 1) classes.push('lider');
    if (minha && l.codigo === minha.codigo) classes.push('meu');
    return `<div class="${classes.join(' ')}">
      <span class="pos">${l.posicao}º</span>
      <span class="nome">${esc(l.nome)}${comUf ? ` <span class="uf">${esc(l.uf)}</span>` : ''}<small> ${textoJogadores(l.ativos)}</small></span>
      <span class="valor">${Math.round(l.media30).toLocaleString('pt-BR')}</span>
    </div>`;
  }

  function desenhar(): void {
    if (!dados || !sub) return;
    const { minha, cidades, estados } = dados;
    const ehPassada = semana === passada;
    const selo = seloDaSemana(ehPassada, ehPassada && Date.now() < semanaConfirmadaEm(passada).getTime());
    elSelo.textContent = selo ?? '';
    elSelo.hidden = !selo;
    elSelo.classList.toggle('provisoria', !!selo && selo !== 'Semana fechada.');
    marcarAba(el, 'cidsub', sub);
    marcarAba(el, 'cidsemana', ehPassada ? 'passada' : 'atual');

    // Frase do narrador (posição no estado) ou o convite, sempre sem apelido.
    let frase = '';
    if (minha && minha.faltam > 0) frase = linhaDaCidadeNaHome(minha);
    else if (minha && sub === 'estado') frase = fraseDaCidade(minha, null, ehPassada && Date.now() >= semanaConfirmadaEm(passada).getTime()) ?? '';
    else if (!minha && sub !== 'estados') frase = 'Defende sua cidade também? Escolha a sua e some pontos pra ela.';
    elFrase.textContent = frase;
    elFrase.hidden = !frase;
    const convite = !minha && prefs.get().time ? `<a class="botao-linha" href="#cidade">Escolher minha cidade</a>` : '';

    if (sub === 'estado' && !minha) {
      elTabela.innerHTML = estado('vazio', 'Escolha sua cidade pra ver o seu estado.', { detalhe: 'Pode trocar quando quiser.' }) + convite;
      return;
    }
    const vazio = sub === 'estados' ? estados.length === 0 : cidades.length === 0;
    if (vazio) {
      elTabela.innerHTML =
        sub === 'estado' && minha
          ? estado('vazio', `Nenhuma cidade de ${minha.uf} no ranking ainda.`, { detalhe: 'Cidade só entra com 5 ou mais jogadores na semana.' })
          : estado('vazio', 'Nenhuma cidade no ranking ainda.', { detalhe: 'Cidade só entra com 5 ou mais jogadores na semana.' }) + convite;
      return;
    }
    if (sub === 'estados') {
      elTabela.innerHTML = estados
        .map((l) => {
          const classes = ['mini-linha', 'linha-cidade'];
          if (l.posicao === 1) classes.push('lider');
          if (minha && l.uf === minha.uf) classes.push('meu');
          return `<div class="${classes.join(' ')}">
            <span class="pos">${l.posicao}º</span>
            <span class="nome">${esc(l.uf)}<small> ${textoJogadores(l.ativos)}</small></span>
            <span class="valor">${Math.round(l.media30).toLocaleString('pt-BR')}</span>
          </div>`;
        })
        .join('');
      return;
    }
    elTabela.innerHTML = cidades.map((l) => linhaCidade(l, minha, sub === 'top')).join('') + convite;
  }

  const clicou = (e: Event) => {
    const alvo = e.target as HTMLElement;
    const s = alvo.closest<HTMLElement>('[data-cidsub]');
    if (s) {
      const nova = s.dataset.cidsub as Sub;
      if (nova === sub) return;
      const eraCampeas = sub === 'campeas';
      sub = nova;
      if (eraCampeas || nova === 'campeas') {
        marcarAba(el, 'cidsub', nova);
        mostrarCampeas(nova === 'campeas');
        if (nova === 'campeas') return;
      }
      void carregar();
      return;
    }
    const w = alvo.closest<HTMLElement>('[data-cidsemana]');
    if (w) {
      const nova = w.dataset.cidsemana === 'passada' ? passada : atual;
      if (nova === semana) return;
      semana = nova;
      dados = null;
      ouvir();
      void carregar();
    }
  };
  el.addEventListener('click', clicou);

  const ouvir = () => {
    pararAviso?.();
    pararAviso = null;
    if (FALSA) return;
    const ouvida = semana;
    ouvirRanking(ouvida, () => void carregar(), undefined, 'ranking-cidades')
      .then((f) => (saiu || ouvida !== semana ? f() : (pararAviso = f)))
      .catch(() => {
        // sem Realtime: fica a foto do momento
      });
  };
  ouvir();
  if (sub === 'campeas') mostrarCampeas(true);
  else void carregar();

  return () => {
    saiu = true;
    pararCampeas?.();
    pararAviso?.();
    el.removeEventListener('click', clicou);
  };
}
