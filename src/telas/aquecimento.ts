// Aquecimento (docs/jogo.md, seção 14.4): 5 estações de um toque logo depois de escolher o time. Em cada
// uma a mão animada faz o gesto uma vez e a pessoa repete; toda estação comemora, acertando ou não.
// Só a estação do Crava vale de verdade (grava o palpite). O resto roda no aparelho, como o treino.
// Baixa sob demanda (main.ts): não pesa no JS inicial da Home.

import '../estilos/aquecimento.css';
import '../estilos/prova.css';
import { esc, irPara, x1DoLink, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, proTime, timePorId } from '../dados/times';
import { prefs } from '../estado';
import {
  TEXTO_DA_ESTACAO,
  XP_AQUECIMENTO,
  estacoesDoAquecimento,
  gritoDaEstacao,
  jogoDoTimeParaCravar,
  numeroDaEstacao,
  progresso,
  tituloDoFim,
  type Desfecho,
  type Estacao as NomeDaEstacao,
  type EstadoDoAquecimento, guardarPendente, limparPendente } from '../jogo/aquecimento';
import { rodadaEmFoco } from '../jogo/cravaTela';
import type { Placar } from '../jogo/crava';
import { somTorcida } from '../jogo/som';
import { registrarAquecimento } from '../servidor/api';
import { etapa } from '../servidor/funil';
import { cravar, jogosDoCrava, type Jogo } from '../servidor/crava';
import { barra, cabecalhoTela, faixa, placa, selo } from './blocos';
import { papelPicadoNaTela } from './papelPicado';
import { vibrar } from './toque';
import { estacaoCrava, type JogoDoAquecimento } from './aquecimento/crava';
import { estacaoFalta } from './aquecimento/falta';
import { estacaoDefesa, estacaoPenalti } from './aquecimento/penalti';
import { estacaoProva } from './aquecimento/prova';
import type { Estacao } from './aquecimento/tipos';

// Em desenvolvimento, ?aquecimentoFalso troca o servidor por um de mentira (src/dev/aquecimentoFalso.ts):
// &semCrava tira o jogo, &estacao=N abre direto na estação N e &estacao=fim, no fim.
const PARAMETROS = new URLSearchParams(location.search);
const FALSO = import.meta.env.DEV && PARAMETROS.has('aquecimentoFalso');

interface Servidor {
  jogosDoCrava(): Promise<Jogo[]>;
  cravar(jogoId: string, placar: Placar): Promise<void>;
  registrarAquecimento(desfecho: Desfecho, estacao: number | null): Promise<number>;
}
const servidor = (): Promise<Servidor> =>
  FALSO ? import('../dev/aquecimentoFalso') : Promise.resolve({ jogosDoCrava, cravar, registrarAquecimento });

/** Tempo máximo para saber se o time tem jogo aberto; passou disso, o Crava some desta vez. */
const TEMPO_DA_BUSCA_MS = 4000;
const PAUSA_PADRAO_MS = 1500;
/** Toque para seguir só vale depois disto (o dedo do último gesto ainda está na tela). */
const TOQUE_PARA_SEGUIR_DEPOIS_MS = 450;

/** Grava um pedaço do estado do aquecimento no aparelho (`undefined` apaga a chave). */
function gravar(parcial: Partial<EstadoDoAquecimento>): void {
  prefs.set({ aquecimento: { ...(prefs.get().aquecimento ?? {}), ...parcial } });
}

/** Manda o desfecho ao servidor. Se não chegar (sem rede, time ainda não subiu), fica pendente para a Home. */
async function enviar(desfecho: Desfecho, estacao: number | null): Promise<number> {
  try {
    const xp = await (await servidor()).registrarAquecimento(desfecho, estacao);
    gravar({ pendente: limparPendente(prefs.get().aquecimento?.pendente, { desfecho, estacao }) });
    return xp;
  } catch {
    gravar({ pendente: guardarPendente(prefs.get().aquecimento?.pendente, { desfecho, estacao }) });
    return 0;
  }
}

export function telaAquecimento(root: HTMLElement, rota: Rota): () => void {
  const time = timePorId(prefs.get().time) ?? timePorId(ID_OUTRO)!;
  const depois: Rota = rota.tela === 'aquecimento' && rota.depois ? rota.depois : { tela: 'inicio' };
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = [time.cores[0], time.cores[1], '#ffd23f'];
  const estilo = `--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}`;

  // ---------- estado ----------
  /** Null enquanto a busca do jogo não respondeu: a barrinha mostra /5 e passa a /4 se não houver jogo. */
  let jogo: JogoDoAquecimento | null | undefined;
  let palpite: { jogo: JogoDoAquecimento; placar: Placar } | null = null;
  let atual: NomeDaEstacao = 'penalti';
  let saiu = false;
  let celebrando = false;
  let limparEstacao: (() => void) | null = null;
  let timerDaPausa = 0;
  let timerDoAviso = 0;
  let liberaToqueEm = 0;
  let acabou = false;

  const estacoes = (): NomeDaEstacao[] => estacoesDoAquecimento(jogo !== null);

  // ---------- casca ----------
  root.innerHTML = `
    <main class="aquecimento" style="${estilo}">
      <header class="aq-topo">
        <div class="aq-progresso" data-barra></div>
        <button class="aq-pular" type="button" data-pular>Pular</button>
      </header>
      <p class="rotulo aq-etapa" data-etapa aria-live="polite"></p>
      <div class="aq-instrucao" data-instrucao>${faixa('', 'p')}</div>
      <div class="aq-palco" data-palco></div>
      <div class="grito" data-grito aria-live="assertive"><p class="grito-frase"></p></div>
    </main>`;
  const elBarra = root.querySelector<HTMLElement>('[data-barra]')!;
  const elEtapa = root.querySelector<HTMLElement>('[data-etapa]')!;
  const elFrase = root.querySelector<HTMLElement>('[data-instrucao] .faixa')!;
  const palco = root.querySelector<HTMLElement>('[data-palco]')!;
  const elGrito = root.querySelector<HTMLElement>('[data-grito]')!;
  const elGritoFrase = root.querySelector<HTMLElement>('.grito-frase')!;

  function atualizarBarra(): void {
    const lista = estacoes();
    const i = Math.max(0, lista.indexOf(atual));
    elBarra.innerHTML = barra((i + 1) / lista.length, `Estação ${i + 1} de ${lista.length}`);
    elEtapa.textContent = `${progresso(lista, atual)} · ${TEXTO_DA_ESTACAO[atual].nome}`;
  }

  function frase(texto: string): void {
    elFrase.textContent = texto;
  }

  /** Aviso curto na faixa de instrução; a frase da estação volta depois. */
  function avisar(texto: string): void {
    frase(texto);
    window.clearTimeout(timerDoAviso);
    timerDoAviso = window.setTimeout(() => !saiu && frase(TEXTO_DA_ESTACAO[atual].frase), 2500);
  }

  // ---------- a busca do jogo do time (estação 5) ----------
  const buscaDoJogo: Promise<void> = (async () => {
    if (time.id === ID_OUTRO) {
      jogo = null;
      return;
    }
    try {
      const api = await servidor();
      const espera = new Promise<never>((_, no) => window.setTimeout(() => no(new Error('tempo')), TEMPO_DA_BUSCA_MS));
      const todos = await Promise.race([api.jogosDoCrava(), espera]);
      const agora = new Date();
      const rodada = rodadaEmFoco(todos, agora);
      jogo = rodada === null ? null : jogoDoTimeParaCravar(todos.filter((j) => j.rodada === rodada), time.id, agora);
    } catch {
      jogo = null;
    }
    if (!saiu && !acabou) atualizarBarra();
  })();

  // ---------- o fluxo ----------
  function montador(e: NomeDaEstacao): Estacao {
    switch (e) {
      case 'penalti':
        return estacaoPenalti;
      case 'defesa':
        return estacaoDefesa;
      case 'falta':
        return estacaoFalta;
      case 'prova':
        return estacaoProva;
      case 'crava':
        return estacaoCrava({
          jogo: jogo!,
          cravar: async (id, placar) => (await servidor()).cravar(id, placar),
          aoCravar: (j, placar) => (palpite = { jogo: j, placar }),
        });
    }
  }

  function iniciar(e: NomeDaEstacao): void {
    limparEstacao?.();
    limparEstacao = null;
    celebrando = false;
    window.clearTimeout(timerDaPausa);
    window.clearTimeout(timerDoAviso);
    elGrito.classList.remove('pulso');
    palco.innerHTML = '';
    atual = e;
    gravar({ emAndamento: numeroDaEstacao(e) });
    atualizarBarra();
    frase(TEXTO_DA_ESTACAO[e].frase);
    palco.scrollTop = 0;
    limparEstacao = montador(e)({ palco, time, reduzido, concluir, avisar });
  }

  /** Comemora a estação (acertando ou não) e, em ~1,5 s ou num toque, segue para a próxima. */
  function concluir(acertou: boolean, opcoes: { semGrito?: boolean; pausaMs?: number } = {}): void {
    if (celebrando || saiu) return;
    celebrando = true;
    if (!opcoes.semGrito) {
      elGritoFrase.textContent = gritoDaEstacao(atual, acertou, Math.random());
      elGrito.classList.remove('pulso');
      void elGrito.offsetWidth;
      elGrito.classList.add('pulso');
    }
    papelPicadoNaTela(palco, cores);
    // Comemoração forte em toda estação, acertando ou não (jogo.md, 14.4): o 'acerto' (22 ms) quase não se sente.
    vibrar('gol');
    somTorcida(acertou ? 'festa' : 'uuuh');
    liberaToqueEm = performance.now() + TOQUE_PARA_SEGUIR_DEPOIS_MS;
    timerDaPausa = window.setTimeout(seguir, opcoes.pausaMs ?? PAUSA_PADRAO_MS);
  }

  palco.addEventListener('click', () => {
    if (celebrando && performance.now() >= liberaToqueEm) seguir();
  });

  async function seguir(): Promise<void> {
    if (!celebrando || saiu || acabou) return;
    celebrando = false;
    window.clearTimeout(timerDaPausa);
    const lista = estacoes();
    const proxima = lista[lista.indexOf(atual) + 1];
    if (proxima === 'crava' && jogo === undefined) {
      // O jogo ainda não chegou: espera a busca (no máximo o tempo limite).
      palco.innerHTML = '<p class="aq-espera" aria-busy="true">Procurando o jogo do seu time…</p>';
      await buscaDoJogo;
      if (saiu) return;
    }
    const seguinte = estacoes()[estacoes().indexOf(atual) + 1];
    if (seguinte) iniciar(seguinte);
    else void terminar();
  }

  // ---------- fim ----------
  async function terminar(): Promise<void> {
    if (acabou) return;
    acabou = true;
    etapa(null);
    limparEstacao?.();
    limparEstacao = null;
    gravar({ emAndamento: undefined, visto: true, aquecido: true });
    const lista = estacoes();
    const textoPalpite = palpite
      ? `${timePorId(palpite.jogo.mandante_id)?.nome ?? 'Time'} ${palpite.placar.m} x ${palpite.placar.v} ${timePorId(palpite.jogo.visitante_id)?.nome ?? 'Time'}`
      : null;
    root.innerHTML = `
      <main class="tela aq-fim" style="${estilo}">
        ${cabecalhoTela({ titulo: tituloDoFim(proTime(time)), pre: false })}
        ${placa(
          `<div class="aq-selos">${selo('Aquecido', 'ouro')}<span data-xp></span></div>
          <ul class="aq-lista" aria-label="Estações">
            ${lista.map((e) => `<li><span class="aq-marca" aria-hidden="true">✓</span>${esc(TEXTO_DA_ESTACAO[e].nome)}</li>`).join('')}
          </ul>
          ${textoPalpite ? `<p class="aq-palpite"><span class="rotulo">Seu palpite</span><strong>${esc(textoPalpite)}</strong></p>` : ''}`,
          { filete: true },
        )}
        <button class="botao" type="button" data-jogar>Jogar agora</button>
      </main>`;
    root.querySelector('[data-jogar]')!.addEventListener('click', () => irPara({ tela: 'lances', aba: 'penaltis' }));
    papelPicadoNaTela(root.querySelector('.aq-fim')!, cores);
    vibrar('gol');
    const xp = await enviar('completou', null);
    if (saiu || xp !== XP_AQUECIMENTO) return;
    const lugar = root.querySelector<HTMLElement>('[data-xp]');
    if (lugar) lugar.innerHTML = selo(`+${XP_AQUECIMENTO} XP na Carreira`, 'subiu');
  }

  // ---------- Pular ----------
  root.querySelector('[data-pular]')!.addEventListener('click', () => {
    etapa(null); // pular segue adiante: não é desistência
    const numero = numeroDaEstacao(atual);
    gravar({ emAndamento: undefined, visto: true });
    void enviar('pulou', numero);
    irPara(depois);
  });

  // ---------- começo ----------
  // Desistência: o aquecimento é a etapa; conclui em terminar() e no Pular.
  etapa({ tipo: 'aquecimento', x1: x1DoLink() });
  const pedida = FALSO ? PARAMETROS.get('estacao') : null;
  if (pedida === 'fim') {
    // Para a conferência no navegador: o fim, com um palpite de mentira se o jogo de mentira existir.
    void buscaDoJogo.then(() => {
      if (jogo) palpite = { jogo, placar: { m: 2, v: 1 } };
      void terminar();
    });
  } else {
    const numero = Number(pedida);
    const primeira = numero >= 1 && numero <= 5 ? (['penalti', 'defesa', 'falta', 'prova', 'crava'] as const)[numero - 1] : 'penalti';
    if (primeira === 'crava') {
      void buscaDoJogo.then(() => (jogo ? iniciar('crava') : void terminar()));
    } else iniciar(primeira);
  }

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__aquecimento = { estacao: () => atual, jogo: () => jogo, palpite: () => palpite, seguir: () => void seguir() };
  }

  return () => {
    saiu = true;
    window.clearTimeout(timerDaPausa);
    window.clearTimeout(timerDoAviso);
    limparEstacao?.();
    limparEstacao = null;
  };
}
