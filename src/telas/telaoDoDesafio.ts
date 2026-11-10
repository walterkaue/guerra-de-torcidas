// O telão do desafio dos Lances (docs/jogos/lances.md, "Desafio dos Lances"): redesenha, no aparelho, os gols das 3
// tentativas de quem chamou, um depois do outro, com o replay de hoje (telas/replay.ts) sobre a cena 3D dos Lances.
// Só desenho: nada aqui decide lance, pontos ou resultado; o caminho da bola sai do gesto e do ponto final que o
// servidor guardou (jogo/lances.ts, caminhoDoChute). Vem por import() depois do convite pintado (E01): quem chama o
// pinta antes (telas/fitaDoDesafio.ts) e põe a figura `.telao` com o gramado em CSS, para nada pular quando o desenho chega.
// Sem som. Para quando a tela sai (`parar`) e com a aba escondida.

import { ID_OUTRO, timePorId } from '../dados/times';
import { TORCIDA_SELECAO } from '../dados/coresDosLances';
import { criarAleatorio } from '../jogo/aleatorio';
import {
  PARADO_NO_FIM_MS,
  botaoDoQuadroParado,
  legendaDoTelao,
  quadrosParados,
  rotuloDoTelao,
  sementeDoCodigo,
  sequenciaDeGols,
  tarjaDoReplay,
  type ModoDoTelao,
} from '../jogo/golsDoDesafio';
import { caminhoDoChute, type Lance } from '../jogo/lances';
import type { TentativaDoDesafio } from '../jogo/tentativasDoDesafio';
import { criarRelogioPausavel } from '../jogo/telaDaPartida';
import { vestimentaDeCampo } from './bonecoEmCampo';
import { bonecoDeQuemChamouEmCampo } from './bonecoEmCampoCena';
import { ENQUADRAMENTOS } from './camera';
import { criarCena3d } from './cena3d';
import { duracaoDoVoo, elencoDoLance, posicaoDoGoleiro } from './elencoDoLance';
import { qualidade } from './qualidade';
import { criarReplay, type Replay } from './replay';

export interface OpcoesDoTelao {
  /** A figura `.telao` que `htmlDoTelao` pintou (o canvas, a legenda e o botão entram nela). */
  figura: HTMLElement;
  lance: Lance;
  tentativas: readonly TentativaDoDesafio[];
  /** O código do desafio: o mesmo link sorteia sempre os mesmos rostos. */
  codigo: string;
  quem: { apelido: string | null; boneco: unknown; timeId: string | null | undefined };
  /** A fita desta tentativa, onde a casa do gol que está passando ganha contorno amarelo. */
  fita?: ParentNode | null;
  /** `movimento` roda sozinho; `parado` e `sob_demanda` mostram um quadro por vez (a qualidade Leve também). */
  modo: ModoDoTelao;
  /** O funil: o 1º gol passou (movimento) ou veio o 1º toque em "Próximo gol" / "Ver de novo" (parado). Uma vez só. */
  aoVerOPrimeiroGol?: () => void;
}

export interface TelaoNoar {
  /** Para o desenho (a tela saiu). */
  parar(): void;
}

type Fase =
  | { tipo: 'gol'; k: number; replay: Replay; inicio: number; total: number }
  /** O gol acabou: o último quadro fica parado antes de passar ao próximo. */
  | { tipo: 'segura'; k: number; desde: number }
  | { tipo: 'fim' };

export function iniciarTelao(o: OpcoesDoTelao): TelaoNoar {
  const { figura: fig, lance: l } = o;
  const sequencia = sequenciaDeGols(o.tentativas);
  if (!sequencia.length || !fig.isConnected) return { parar() {} };

  const parado = o.modo !== 'movimento' || !qualidade().replay;
  fig.dataset.modo = parado ? 'parado' : 'movimento';

  // O canvas (10:13, mais alto que largo) fica alinhado embaixo: o CSS corta a arquibancada e deixa o gol inteiro.
  const canvas = document.createElement('canvas');
  canvas.className = 'telao-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', rotuloDoTelao(o.quem.apelido, l.titulo));
  const legenda = document.createElement('p');
  legenda.className = 'telao-legenda';
  legenda.setAttribute('aria-hidden', 'true');
  const botao = fig.querySelector<HTMLButtonElement>('[data-telao-botao]') ?? document.createElement('button');
  botao.type = 'button';
  botao.className = 'telao-botao';
  botao.hidden = true;
  fig.prepend(canvas);
  fig.append(legenda, botao);

  const tempo = criarRelogioPausavel(() => performance.now());
  const time = timePorId(o.quem.timeId) ?? timePorId(ID_OUTRO)!;
  const cores: readonly [string, string] = [time.cores[0], time.cores[1]];
  const cena = criarCena3d(canvas, { cores, relogio: tempo.agora, reduzido: true });
  cena.medir();
  cena.trocarTorcida(l.clube === 'selecao' ? TORCIDA_SELECAO : undefined);

  // O batedor é o boneco de quem chamou (nas cores do clube do lance e do time dele); sem boneco, sorteado. Goleiro e
  // barreira nas cores do adversário, sorteados por um gerador fixo a partir do código.
  const vestimenta = vestimentaDeCampo(o.quem.boneco);
  const elenco = elencoDoLance(l, {
    sortear: criarAleatorio(sementeDoCodigo(o.codigo)),
    batedor: (roupa) => bonecoDeQuemChamouEmCampo(vestimenta, roupa, cores),
  });
  const enquadramento = l.tipo === 'falta' ? ENQUADRAMENTOS.falta : ENQUADRAMENTOS.caraACara;

  const pontinhos = [...fig.querySelectorAll<HTMLElement>('.telao-pontos i')];
  const tarja = fig.querySelector<HTMLElement>('[data-tarja]');
  const casas = o.fita ? [...o.fita.querySelectorAll<HTMLElement>('[data-casa]')] : [];

  /** Tarja, pontinhos, legenda e a casa da fita do gol `k`. */
  function marcarGol(k: number): void {
    const { indice, tentativa } = sequencia[k];
    if (tarja) tarja.textContent = tarjaDoReplay(indice);
    pontinhos.forEach((p, j) => p.classList.toggle('atual', j === k));
    legenda.textContent = legendaDoTelao(tentativa);
    legenda.hidden = false;
    casas.forEach((c) => c.classList.toggle('passando', Number(c.dataset.casa) === indice));
  }

  /** O replay do gol `k`, com o caminho, o voo e o goleiro do jogo. */
  function prepararGol(k: number, inicio: number): Replay {
    const t = sequencia[k].tentativa;
    const caminho = caminhoDoChute(l.bola, t.gesto, t.x, t.y, t.cavadinha);
    const fim = caminho(t.tFim);
    const g = posicaoDoGoleiro(l, t.goleiroX);
    return criarReplay(
      cena,
      {
        bola: l.bola,
        enquadramento,
        em: (u) => caminho(u * t.tFim),
        voo: duracaoDoVoo(l.bola, fim, t.cavadinha, t.gesto.forca),
        cavadinha: t.cavadinha,
        goleiro: { x: g.x, z: g.z, alvo: { x: fim.x, y: fim.y }, alcance: 0.55 },
        barreira: l.barreira,
        batedor: elenco.batedor,
        goleiroBoneco: elenco.goleiro,
        bonecosDaBarreira: elenco.barreira,
      },
      inicio,
    );
  }

  /** Desenha um quadro do replay; devolve quantos ms faltam (no ms 0, a duração total). */
  function pintar(r: Replay, agora: number): number {
    cena.c.save();
    try {
      return r.quadro(agora);
    } finally {
      cena.c.restore();
    }
  }

  let funilContado = false;
  const primeiroGol = () => {
    if (funilContado) return;
    funilContado = true;
    o.aoVerOPrimeiroGol?.();
  };

  let parou = false;
  let raf = 0;
  /** Redesenha o quadro que está na tela (o canvas é refeito no resize). */
  let redesenhar: () => void = () => {};

  // ---------- sem movimento: um quadro por vez ----------
  if (parado) {
    const quadros = quadrosParados(sequencia.length);
    let pos = 0;
    const mostrar = (): void => {
      const { gol: k, momento } = quadros[pos];
      marcarGol(k);
      const r = prepararGol(k, 0);
      const total = pintar(r, 0);
      if (momento === 'fim') pintar(r, total);
      redesenhar = () => {
        const r2 = prepararGol(k, 0);
        const t2 = pintar(r2, 0);
        if (momento === 'fim') pintar(r2, t2);
      };
      botao.textContent = botaoDoQuadroParado(quadros, pos);
      botao.hidden = false;
      fig.dataset.botao = '1';
    };
    botao.addEventListener('click', () => {
      // O toque que trouxe o desenho (economia de dados) já passou; daqui em diante cada toque é "Próximo gol" ou "Ver de novo".
      primeiroGol();
      pos = (pos + 1) % quadros.length;
      mostrar();
    });
    mostrar();
  } else {
    // ---------- movimento ----------
    let fase: Fase = { tipo: 'fim' };

    const comecar = (k: number): void => {
      marcarGol(k);
      botao.hidden = true;
      delete fig.dataset.botao;
      const inicio = tempo.agora();
      const replay = prepararGol(k, inicio);
      const total = pintar(replay, inicio);
      fase = { tipo: 'gol', k, replay, inicio, total };
      redesenhar = () => {};
    };

    const terminar = (): void => {
      // Pulou no meio do último gol: o canvas fica no quadro final dele, não num quadro de voo.
      const f = fase;
      if (f.tipo === 'gol') pintar(f.replay, f.inicio + f.total);
      const ultimo = sequencia.length - 1;
      fase = { tipo: 'fim' };
      botao.textContent = 'Ver de novo';
      botao.hidden = false;
      fig.dataset.botao = '1';
      redesenhar = () => {
        const r = prepararGol(ultimo, 0);
        const total = pintar(r, 0);
        pintar(r, total);
      };
      cancelAnimationFrame(raf);
    };

    const avancar = (): void => {
      if (fase.tipo === 'fim') return;
      const k = fase.k;
      if (k === 0) primeiroGol();
      if (k + 1 < sequencia.length) comecar(k + 1);
      else terminar();
    };

    const quadro = (): void => {
      if (parou) return;
      // A tela (ou a folha) saiu do ar sem avisar: para por conta própria.
      if (!fig.isConnected) return parar();
      raf = requestAnimationFrame(quadro);
      if (tempo.pausado()) return;
      const agora = tempo.agora();
      if (fase.tipo === 'gol') {
        const falta = pintar(fase.replay, agora);
        if (falta <= 0) fase = { tipo: 'segura', k: fase.k, desde: agora };
      } else if (fase.tipo === 'segura') {
        if (agora - fase.desde >= PARADO_NO_FIM_MS) avancar();
      }
    };

    const recomecar = (): void => {
      comecar(0);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(quadro);
    };

    botao.addEventListener('click', (e) => {
      e.stopPropagation();
      recomecar();
    });
    // Tocar no telão pula para o próximo gol (no último, encerra).
    fig.addEventListener('click', (e) => {
      if ((e.target as Element).closest('button')) return;
      avancar();
    });

    recomecar();
  }

  // ---------- aba escondida e tamanho ----------
  const aoMudarAVisibilidade = (): void => {
    if (document.hidden) tempo.pausar();
    else tempo.retomar();
  };
  document.addEventListener('visibilitychange', aoMudarAVisibilidade);
  aoMudarAVisibilidade();
  const aoRedimensionar = (): void => {
    cena.medir();
    redesenhar();
  };
  window.addEventListener('resize', aoRedimensionar);

  function parar(): void {
    if (parou) return;
    parou = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', aoMudarAVisibilidade);
    window.removeEventListener('resize', aoRedimensionar);
  }
  return { parar };
}
