// Central de avisos (docs/visual.md, "Central de avisos"; docs/jogo.md, seção 7): a folha que sobe do rodapé quando se
// toca no sininho da Home. Lazy: a Home chama por import() no toque. As regras são puras (jogo/avisosCaixa.ts); aqui
// ficam o desenho, o foco, o voltar do celular e a navegação de cada ação.
// Abrir a folha marca tudo o que ela mostra como visto (o número do sininho zera), mas a folha aberta mantém os grupos
// como estavam ao abrir. Sem urgência, prazo ou contagem nos textos (seção 7).

import '../estilos/centralAvisos.css';
import { esc, irPara } from '../app';
import { faixaDoAparelho, prefs } from '../estado';
import {
  CAIXA_VAZIA,
  ROTULO_DISPENSAR,
  ROTULO_JA_VISTOS,
  TEXTOS,
  TITULO_DA_CAIXA,
  avisosDaCaixa,
  dispensar,
  lerEstado,
  marcarVistos,
  resolver,
  type Aviso,
  type EntradaDaCaixa,
  type TipoDeAviso,
} from '../jogo/avisosCaixa';
import { podeVerPush } from '../jogo/faixaEtaria';
import { diaBrasilia } from '../servidor/tempo';
import { painelDoAviso } from './convitePush';
import { folhaNoHistorico } from './folhaNoHistorico';
import { icone, type NomeIcone } from './icones';
import { abrirVestiario } from './vestiario/abrir';

const ICONE: Record<TipoDeAviso, NomeIcone> = {
  desafio: 'bola',
  mes: 'podio',
  trofeu: 'trofeu',
  peca: 'camisa',
  termos: 'info',
  cidade: 'campo',
  aquecimento: 'apito',
};

/** Esses três se resolvem pelo estado do aparelho (Termos lidos, cidade escolhida, aquecimento aberto), não pelo toque. */
const RESOLVE_PELO_ESTADO: readonly TipoDeAviso[] = ['termos', 'cidade', 'aquecimento'];

const chaveDe = (a: Aviso): string => a.ids.join('|');

/** Para onde a ação de cada aviso leva (peça abre o vestiário, que navega por conta própria). */
function irParaOAviso(a: Aviso): void {
  switch (a.tipo) {
    case 'desafio':
      if (a.desafio) irPara({ tela: 'convite', tipo: a.desafio.tipo, codigo: a.desafio.codigo });
      return;
    case 'mes':
      return irPara({ tela: 'ranking', aba: 'temporada' });
    case 'trofeu':
      return irPara({ tela: 'ranking', aba: 'conquistas', sub: 'galeria' });
    case 'peca':
      return abrirVestiario(a.ids[0]?.slice('peca:'.length) || undefined);
    case 'termos':
      return irPara({ tela: 'termos' });
    case 'cidade':
      return irPara({ tela: 'cidade', depois: { tela: 'inicio' } });
    case 'aquecimento':
      return irPara({ tela: 'aquecimento', depois: { tela: 'inicio' } });
  }
}

export interface OpcoesDaCentral {
  /** O sininho: recebe o foco de volta ao fechar. */
  gatilho: HTMLElement;
  /** O que a Home sabe agora (lido na hora de abrir). */
  entrada: () => EntradaDaCaixa;
  /** Chamado quando a caixa mudou (visto, dispensado, resolvido): a Home refaz o número do sininho. */
  aoMudar: () => void;
}

/** Abre a folha. Devolve quem a desmonta de vez (a Home chama ao sair). */
export function abrirCentral(o: OpcoesDaCentral): () => void {
  document.querySelector('[data-central-avisos]')?.remove();
  const hoje = diaBrasilia();

  // O que a folha mostra ao abrir. Marca tudo como visto, mas as listas daqui não mudam por causa disso.
  const estado0 = lerEstado(prefs.get().avisos);
  const caixa = avisosDaCaixa(estado0, o.entrada());
  const novos = [...caixa.novos];
  const vistos = [...caixa.vistos];
  if (novos.length + vistos.length) prefs.set({ avisos: marcarVistos(estado0, [...novos, ...vistos], hoje) });
  o.aoMudar();

  const mostrarPush = podeVerPush(faixaDoAparelho());
  const fundo = document.createElement('div');
  fundo.className = 'folha folha-avisos';
  fundo.dataset.centralAvisos = '';
  fundo.innerHTML = `<div class="folha-caixa caixa-avisos" role="dialog" aria-modal="true" aria-labelledby="avisos-titulo">
      <div class="avisos-cab">
        <h2 class="avisos-titulo" id="avisos-titulo">${esc(TITULO_DA_CAIXA)}</h2>
        <button class="avisos-fechar" type="button" data-fechar aria-label="Fechar">${icone('xis')}</button>
      </div>
      <div class="avisos-rolagem">
        <div data-lista></div>
        ${
          mostrarPush
            ? `<section class="avisos-push" aria-labelledby="avisos-push-titulo">
          <h3 class="so-leitor" id="avisos-push-titulo">Aviso de domingo</h3>
          <div data-painel-push></div>
        </section>`
            : ''
        }
      </div>
    </div>`;
  document.body.append(fundo);

  const lista = fundo.querySelector<HTMLElement>('[data-lista]')!;
  const botaoFechar = fundo.querySelector<HTMLButtonElement>('[data-fechar]')!;

  const itemHtml = (a: Aviso, visto: boolean): string => {
    const t = TEXTOS[a.tipo];
    const chave = esc(chaveDe(a));
    return `<li class="aviso${visto ? ' visto' : ''}" data-chave="${chave}">
        <span class="aviso-ico">${icone(ICONE[a.tipo])}</span>
        <div>
          <strong class="aviso-titulo">${esc(t.titulo)}</strong>
          <p class="aviso-linha">${esc(t.linha)}</p>
          <div class="aviso-acoes">
            <button class="aviso-acao" type="button" data-agir="${chave}" aria-label="${esc(t.acao)}: ${esc(t.titulo)}">${esc(t.acao)}</button>
            <button class="aviso-dispensar" type="button" data-dispensar="${chave}" aria-label="${esc(ROTULO_DISPENSAR)}: ${esc(t.titulo)}">${esc(ROTULO_DISPENSAR)}</button>
          </div>
        </div>
      </li>`;
  };

  function desenhar(): void {
    if (!novos.length && !vistos.length) {
      lista.innerHTML = `<div class="avisos-vazio">
          <span class="aviso-ico">${icone('sino')}</span>
          <strong>${esc(CAIXA_VAZIA.titulo)}</strong>
          <p>${esc(CAIXA_VAZIA.linha)}</p>
        </div>`;
      return;
    }
    lista.innerHTML = `${novos.length ? `<ul class="avisos-lista">${novos.map((a) => itemHtml(a, false)).join('')}</ul>` : ''}
      ${
        vistos.length
          ? `<h3 class="avisos-rotulo">${esc(ROTULO_JA_VISTOS)}</h3>
        <ul class="avisos-lista">${vistos.map((a) => itemHtml(a, true)).join('')}</ul>`
          : ''
      }`;
  }
  desenhar();

  const achar = (chave: string | undefined): Aviso | undefined => [...novos, ...vistos].find((a) => chaveDe(a) === chave);
  const tirar = (a: Aviso): void => {
    for (const grupo of [novos, vistos]) {
      const i = grupo.indexOf(a);
      if (i >= 0) grupo.splice(i, 1);
    }
  };

  // Tudo o que a folha faz com o aparelho passa por aqui; a Home só precisa saber que mudou.
  const antes = document.activeElement as HTMLElement | null;
  const folha = folhaNoHistorico(() => {
    document.removeEventListener('keydown', aoTeclar);
    fundo.remove();
    (o.gatilho.isConnected ? o.gatilho : antes)?.focus?.({ preventScroll: true });
  });
  const fechar = () => folha.fechar();

  function aoTeclar(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      fechar();
      return;
    }
    // O diálogo é modal: o Tab não sai dele.
    if (ev.key !== 'Tab') return;
    const foco = [...fundo.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter((e) => !e.hasAttribute('disabled') && e.offsetParent !== null);
    if (!foco.length) return;
    const primeiro = foco[0];
    const ultimo = foco[foco.length - 1];
    const ativo = document.activeElement;
    if (!fundo.contains(ativo)) {
      ev.preventDefault();
      primeiro.focus();
    } else if (ev.shiftKey && ativo === primeiro) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && ativo === ultimo) {
      ev.preventDefault();
      primeiro.focus();
    }
  }
  document.addEventListener('keydown', aoTeclar);

  botaoFechar.addEventListener('click', fechar);
  fundo.addEventListener('click', (ev) => {
    const alvo = ev.target as HTMLElement;
    if (alvo === fundo) return fechar();
    const agir = alvo.closest<HTMLElement>('[data-agir]');
    const disp = alvo.closest<HTMLElement>('[data-dispensar]');
    if (agir) {
      const a = achar(agir.dataset.agir);
      if (!a) return;
      if (!RESOLVE_PELO_ESTADO.includes(a.tipo)) prefs.set({ avisos: resolver(lerEstado(prefs.get().avisos), a.ids) });
      o.aoMudar();
      // A navegação sai depois do history.back() da folha (senão o back atrasado desfaria a tela nova).
      folha.fechar(() => irParaOAviso(a));
    } else if (disp) {
      const a = achar(disp.dataset.dispensar);
      if (!a) return;
      prefs.set({ avisos: dispensar(lerEstado(prefs.get().avisos), a, hoje) });
      tirar(a);
      desenhar();
      o.aoMudar();
      (lista.querySelector<HTMLElement>('.aviso-acao') ?? botaoFechar).focus({ preventScroll: true });
    }
  });

  // Aviso de domingo (push): só 18+, no fim da folha, com os casos do iPhone, do navegador embutido e do Opera.
  if (mostrarPush) {
    const painel = fundo.querySelector<HTMLElement>('[data-painel-push]')!;
    const secao = fundo.querySelector<HTMLElement>('.avisos-push')!;
    secao.hidden = true;
    // "Fechar" do painel o esvazia: o bloco inteiro sai junto.
    new MutationObserver(() => (secao.hidden = !painel.innerHTML.trim())).observe(painel, { childList: true });
    void painelDoAviso(painel, () => {});
  }

  botaoFechar.focus({ preventScroll: true });
  return () => {
    document.removeEventListener('keydown', aoTeclar);
    fundo.remove();
  };
}
