// A Tabela trocando de lugar ao vivo (docs/visual.md, seção 4): ao redesenhar a mesma tabela, a linha que mudou
// de lugar desliza da posição antiga até a nova e o número conta do antigo ao novo. Só desenho: o que a tabela
// mostra no fim é o mesmo de sempre. As contas ficam em src/jogo/deslizarLinhas.ts.
//
// Cada linha precisa de data-id (o time) e data-valor (o número final, inteiro), com o número num .valor que
// só tem o texto. Hoje só a aba Semana usa; Temporada e Cidades podem usar do mesmo jeito.
//
// Desempenho: as posições do desenho anterior são guardadas fora da hora da troca (requestIdleCallback depois de
// cada desenho), e na troca se lê tudo de uma vez e só depois se escreve.

import {
  contagensDasLinhas,
  CURVA_DESLIZE,
  DURACAO_CONTAGEM_MS,
  DURACAO_DESLIZE_MS,
  movimentosDasLinhas,
  podeAnimar,
  valorNaContagem,
} from '../jogo/deslizarLinhas';

export interface DeslizadorDeTabela {
  /** Redesenha a tabela (`redesenhar` troca o conteúdo) e anima se `chave` (ex.: semana e modo) for a mesma do desenho anterior. */
  trocar(chave: string, redesenhar: () => void): void;
  /** Para tudo (a pessoa saiu da tela). */
  parar(): void;
}

interface Retrato {
  linhas: Map<string, HTMLElement>;
  topos: Map<string, number>;
  largura: number;
  altura: number;
}

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const quandoParado = (f: () => void): (() => void) => {
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(f, { timeout: 1000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(f, 200);
  return () => clearTimeout(id);
};

export function deslizadorDeTabela(el: HTMLElement): DeslizadorDeTabela {
  let chave: string | null = null;
  let retrato: Retrato | null = null;
  /** As linhas do último desenho. Se alguma saiu da tela (carregando, erro), a próxima troca é seca. */
  let desenho = new Map<string, HTMLElement>();
  /** O número que cada linha mostra agora (no meio da contagem, o do quadro atual). */
  let mostrados = new Map<string, number>();
  let animacoes: Animation[] = [];
  let quadro = 0;
  let geracao = 0;
  let pararRetrato: (() => void) | null = null;

  const linhasNaTela = () => {
    const linhas = new Map<string, HTMLElement>();
    el.querySelectorAll<HTMLElement>('[data-id]').forEach((l) => linhas.set(l.dataset.id!, l));
    return linhas;
  };
  const visivel = () => el.getClientRects().length > 0;
  // Só leitura: o topo de cada linha em relação à tabela (a rolagem da página não conta).
  const medir = (linhas: Map<string, HTMLElement>) => {
    const base = el.getBoundingClientRect().top;
    const topos = new Map<string, number>();
    for (const [id, l] of linhas) topos.set(id, l.getBoundingClientRect().top - base);
    return topos;
  };
  const retratoValido = () =>
    retrato !== null &&
    animacoes.length === 0 &&
    quadro === 0 &&
    el.clientWidth === retrato.largura &&
    el.clientHeight === retrato.altura && // a fonte que chega depois ou a do sistema maior mudam a altura das linhas
    [...retrato.linhas.values()].every((l) => l.isConnected);

  function agendarRetrato(): void {
    pararRetrato?.();
    pararRetrato = quandoParado(() => {
      pararRetrato = null;
      const linhas = linhasNaTela();
      retrato = visivel() && linhas.size > 0 ? { linhas, topos: medir(linhas), largura: el.clientWidth, altura: el.clientHeight } : null;
    });
  }

  function pararAnimacoes(): void {
    geracao++;
    if (quadro) cancelAnimationFrame(quadro);
    quadro = 0;
    const velhas = animacoes;
    animacoes = [];
    velhas.forEach((a) => a.cancel());
    el.removeAttribute('aria-busy');
  }

  function trocar(novaChave: string, redesenhar: () => void): void {
    const intacta = [...desenho.values()].every((l) => l.isConnected);
    // Com a aba do navegador escondida o requestAnimationFrame para: troca seca, para o número não ficar no antigo.
    const anima = podeAnimar(chave, novaChave, semMovimento()) && intacta && !document.hidden && visivel();
    // Leitura antes da troca: do retrato guardado ou, se ele não vale (no meio de outra animação, largura nova), agora.
    const toposAntes = anima ? (retratoValido() ? retrato!.topos : medir(linhasNaTela())) : null;
    const numerosAntes = anima ? mostrados : new Map<string, number>();

    pararAnimacoes();
    pararRetrato?.();
    pararRetrato = null;
    retrato = null;
    redesenhar();
    chave = novaChave;
    const linhas = linhasNaTela();
    desenho = linhas;
    mostrados = new Map([...linhas].map(([id, l]) => [id, Number(l.dataset.valor)]));

    if (!toposAntes) return agendarRetrato();
    // Leitura depois da troca, toda de uma vez; daqui em diante só escrita.
    const movimentos = movimentosDasLinhas(toposAntes, medir(linhas));
    const contagens = contagensDasLinhas(numerosAntes, mostrados);
    if (movimentos.length === 0 && contagens.length === 0) return agendarRetrato();

    const minha = geracao;
    let pendentes = movimentos.length + (contagens.length > 0 ? 1 : 0);
    const terminou = () => {
      if (minha !== geracao || --pendentes > 0) return;
      el.removeAttribute('aria-busy');
      agendarRetrato();
    };
    // O leitor de tela espera o fim (aria-live da tabela), em vez de ler cada passo da contagem.
    el.setAttribute('aria-busy', 'true');

    for (const m of movimentos) {
      const l = linhas.get(m.id)!;
      l.classList.add('deslizando');
      if (m.sobe) l.classList.add('sobe');
      const a = l.animate([{ transform: `translateY(${m.dy}px)` }, { transform: 'none' }], {
        duration: DURACAO_DESLIZE_MS,
        easing: CURVA_DESLIZE,
      });
      // Cancelada ou terminada, conta como fim; a geração descarta o fim de uma troca que já foi substituída.
      a.onfinish = a.oncancel = () => {
        l.classList.remove('deslizando', 'sobe');
        animacoes = animacoes.filter((x) => x !== a);
        terminou();
      };
      animacoes.push(a);
    }

    if (contagens.length === 0) return;
    const alvos = contagens.flatMap((c) => {
      const v = linhas.get(c.id)?.querySelector<HTMLElement>('.valor');
      return v ? [{ c, v, ultimo: c.de }] : [];
    });
    for (const a of alvos) {
      a.v.textContent = numero.format(a.c.de);
      mostrados.set(a.c.id, a.c.de);
    }
    // Um quadro só para todas as linhas.
    let inicio: number | null = null;
    const passo = (agora: number) => {
      inicio ??= agora;
      const t = agora - inicio;
      for (const a of alvos) {
        const v = valorNaContagem(a.c, t);
        if (v === a.ultimo) continue;
        a.ultimo = v;
        a.v.textContent = numero.format(v);
        mostrados.set(a.c.id, v);
      }
      if (t < DURACAO_CONTAGEM_MS) quadro = requestAnimationFrame(passo);
      else {
        quadro = 0;
        terminou();
      }
    };
    quadro = requestAnimationFrame(passo);
  }

  return {
    trocar,
    parar() {
      pararAnimacoes();
      pararRetrato?.();
      pararRetrato = null;
    },
  };
}
