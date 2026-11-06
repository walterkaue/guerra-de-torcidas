// Estações 1 (Pênalti) e 2 (Defesa) do Aquecimento: uma cobrança e uma defesa na cena 2D de TV dos pênaltis.
// Mesmo motor puro (jogo/penaltis.ts) com semente local, como o treino; o desenho é o mínimo da tela da partida.

import { DIFICULDADE_DO_AQUECIMENTO, sementeDaDefesa, sementeDoPenalti } from '../../jogo/aquecimentoCena';
import {
  normalizarCobranca,
  planejarDefesa,
  resolverCobranca,
  resolverDefesa,
  type GestoCobranca,
  type ResultadoCobranca,
  type ResultadoDefesa,
} from '../../jogo/penaltis';
import { destravarSom, somChute } from '../../jogo/som';
import {
  DUR_AJEITAR,
  apontarPeDeApoio,
  criarBoneco,
  novaPose,
  poseAjeitando,
  poseChute,
  poseChuteMaquina,
  poseComemora,
  poseCorrida,
  poseEspera,
  poseLamenta,
  poseParado,
  sortearAparencia,
  uniformesDaPartida,
  type Boneco,
} from '../bonecos';
import { criarCena, facil, limitar01, suave } from '../cena';
import { aoMudarQualidade } from '../qualidade';
import { demonstrar } from './mao';
import type { Estacao } from './tipos';

const ANG_DICA = [-0.6, 0, 0.6];
const DUR_CHUTE = 650;
const DUR_CAVADINHA = 1050;
const DUR_PULO = 420;
const DUR_CORRIDA = 900;
const DUR_BATIDA = 190;
/** Tempo para tocar depois da corrida: mais folga que na partida, é a primeira vez. */
const JANELA_DA_DEFESA = 3600;
/** Depois do toque, o batedor espera só um instante antes de chutar. */
const ESPERA_APOS_TOQUE = 350;
const RECUO = 2.4;

type Fase =
  | { tipo: 'mirar'; inicio: number }
  | { tipo: 'chute'; inicio: number; r: ResultadoCobranca; gesto: GestoCobranca }
  | { tipo: 'corrida'; inicio: number; dica: number; zona: number | null; pulouEm: number | null }
  | { tipo: 'chuteMaquina'; inicio: number; r: ResultadoDefesa; pulouEm: number; dica: number }
  | { tipo: 'pausa'; inicio: number };

/** Como o lance terminou, para o quadro parado da pausa. */
interface Desfecho {
  /** A cobrança é sua (estação 1) ou do batedor da máquina (estação 2). */
  meu: boolean;
  gol: boolean;
  pegou: boolean;
  x: number;
  y: number;
  zonaGoleiro: number;
}

export const estacaoPenalti: Estacao = (ctx) => montar(ctx, 'penalti');
export const estacaoDefesa: Estacao = (ctx) => montar(ctx, 'defesa');

function montar(ctx: Parameters<Estacao>[0], tipo: 'penalti' | 'defesa'): () => void {
  const { palco, time, reduzido } = ctx;
  const canvas = document.createElement('canvas');
  canvas.className = 'aq-canvas';
  palco.append(canvas);
  const relogio = () => performance.now();
  const cena = criarCena(canvas, { cores: time.cores, relogio, reduzido });
  const {
    c, g, efeitos, medir, telaX, telaY, zonaX, zonaY, lerArraste, zonaTocada, desenharTraves, goleiroNoQuadro,
    desenharGoleiroNoQuadro, escBatedor, desenharBatedorEm, desenharBola, desenharBolaEmVoo, desenharZonas, desenharRastro,
    trajetoria, desenharPontos, bolaParada,
  } = cena;

  // Elenco: o visual é sorteado (nunca a semente); camisa lisa nas cores do time.
  const u = uniformesDaPartida(time.cores, null, Math.random() < 0.5 ? 0 : 1);
  const batedorJogador: Boneco = criarBoneco(sortearAparencia(), u.jogador, false);
  const goleiroJogador: Boneco = criarBoneco(sortearAparencia(), u.goleiroJogador, true);
  const batedorMaquina: Boneco = criarBoneco(sortearAparencia(), u.adversario, false);
  const goleiroMaquina: Boneco = criarBoneco(sortearAparencia(), u.goleiroAdversario, true);

  const semente = tipo === 'penalti' ? sementeDoPenalti(Math.random) : sementeDaDefesa(Math.random);
  const plano = planejarDefesa(semente, 0, DIFICULDADE_DO_AQUECIMENTO);
  let fase: Fase =
    tipo === 'penalti'
      ? { tipo: 'mirar', inicio: relogio() }
      : { tipo: 'corrida', inicio: relogio(), dica: plano.dica, zona: null, pulouEm: null };
  let rastro: { x: number; y: number }[] = [];
  let pertoNoChute = 0;
  let desfecho: Desfecho | null = null;
  let acabou = false;
  let raf = 0;
  let tiraMao: (() => void) | null = null;
  let timerDaMao = 0;

  // ---------- desenho (o mínimo do da partida) ----------
  const poseBatedor = novaPose();
  const batedorX = (avanco: number) => g.bolaX - g.raio * (3.3 - 0.9 * avanco);
  const batedorY = (avanco: number) => g.bolaY + g.raio * (1.5 - 0.2 * avanco);
  /** 1 = ainda ajeitando, perto da bola; 0 = já no lugar da cobrança. */
  const pertoDaBola = (msMira: number) => 1 - suave(limitar01((msMira - 620) / (DUR_AJEITAR - 620)));

  function batedorNaMira(msMira: number, agora: number): void {
    if (msMira < DUR_AJEITAR) poseAjeitando(msMira, poseBatedor);
    else poseParado(agora, poseBatedor);
    desenharBatedorEm(batedorJogador, batedorX(0) + pertoDaBola(msMira) * g.raio * RECUO, batedorY(0), poseBatedor);
  }

  function batedorChutando(ms: number, cavadinha: boolean): void {
    const avanco = facil(limitar01(ms / DUR_BATIDA));
    const x = batedorX(avanco) + pertoNoChute * (1 - avanco) * g.raio * RECUO;
    desenharBatedorEm(batedorJogador, x, batedorY(avanco), poseChute(ms, cavadinha, poseBatedor));
  }

  function maquinaCorrendo(ms: number, agora: number, dica: number): void {
    const p = facil(limitar01(ms / DUR_CORRIDA));
    const x0 = g.bolaX - g.raio * 5.5;
    const y0 = g.bolaY + g.raio * 4.5;
    if (ms < DUR_CORRIDA) poseCorrida(ms, DUR_CORRIDA, poseBatedor);
    else poseEspera(agora, poseBatedor);
    apontarPeDeApoio(poseBatedor, ANG_DICA[dica], suave(limitar01((ms - DUR_CORRIDA * 0.6) / (DUR_CORRIDA * 0.4))));
    desenharBatedorEm(batedorMaquina, x0 + (batedorX(1) - x0) * p, y0 + (batedorY(1) - y0) * p, poseBatedor, ms >= DUR_CORRIDA * 0.85);
  }

  function maquinaChutando(ms: number, dica: number): void {
    poseChuteMaquina(ms, poseBatedor);
    apontarPeDeApoio(poseBatedor, ANG_DICA[dica], 1);
    desenharBatedorEm(batedorMaquina, batedorX(1), batedorY(1), poseBatedor, true);
  }

  /** A dica no chão: onde o pé de apoio crava e para que canto aponta, em amarelo. */
  function desenharDica(dica: number): void {
    const esc = escBatedor();
    const apoio = batedorMaquina.apoio;
    const px = batedorX(1) + apoio.x * esc;
    const py = batedorY(1) + (apoio.y + 1.5) * esc;
    c.save();
    c.translate(px, py);
    c.rotate(ANG_DICA[dica]);
    c.fillStyle = 'rgba(255,210,63,0.22)';
    c.beginPath();
    c.ellipse(0, 0, g.raio * 0.85, g.raio * 1.3, 0, 0, Math.PI * 2);
    c.fill();
    // Contorno firme: o pé marcado se vê parado, sem depender do movimento (J21).
    c.strokeStyle = 'rgba(255,210,63,0.95)';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = 'rgba(255,210,63,0.5)';
    c.beginPath();
    c.ellipse(0, 0, g.raio * 0.5, g.raio * 0.95, 0, 0, Math.PI * 2);
    c.fill();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,210,63,0.9)';
    c.lineWidth = 4;
    c.setLineDash([6, 6]);
    c.beginPath();
    c.moveTo(0, -g.raio * 1.5);
    c.lineTo(0, -g.raio * 5);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  // ---------- fluxo ----------
  function chutar(gesto: GestoCobranca): void {
    const gq = normalizarCobranca(gesto);
    if (fase.tipo === 'mirar') pertoNoChute = pertoDaBola(relogio() - fase.inicio);
    tiraMao?.();
    const r = resolverCobranca(semente, 0, gq, DIFICULDADE_DO_AQUECIMENTO);
    fase = { tipo: 'chute', inicio: relogio(), r, gesto: gq };
    window.setTimeout(() => !acabou && somChute(), DUR_BATIDA);
  }

  function chuteDaMaquina(zona: number, pulouEm: number, dica: number): void {
    const r = resolverDefesa(semente, 0, zona, DIFICULDADE_DO_AQUECIMENTO);
    fase = { tipo: 'chuteMaquina', inicio: relogio(), r, pulouEm, dica };
    window.setTimeout(() => !acabou && somChute(), DUR_BATIDA);
  }

  function quadro(agora: number): void {
    if (acabou) return;
    c.save();
    cena.desenharFundo(agora);
    switch (fase.tipo) {
      case 'mirar': {
        desenharGoleiroNoQuadro(goleiroMaquina, null, 0, agora);
        desenharTraves();
        desenharBola(g.bolaX, g.bolaY);
        batedorNaMira(agora - fase.inicio, agora);
        desenharRastro(rastro);
        break;
      }
      case 'chute': {
        const { r, gesto } = fase;
        const ms = agora - fase.inicio;
        const dur = r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE;
        const t = limitar01((ms - DUR_BATIDA) / dur);
        const tPulo = (t * dur - dur * 0.15) / DUR_PULO;
        desenharGoleiroNoQuadro(goleiroMaquina, r.zonaGoleiro, tPulo, agora);
        desenharTraves();
        batedorChutando(ms, r.cavadinha);
        const defendeu = r.desfecho === 'defesa';
        const luva = goleiroNoQuadro(goleiroMaquina, r.zonaGoleiro, (dur - dur * 0.15) / DUR_PULO, agora);
        const dx = defendeu ? luva.luvaX : telaX(r.x);
        const dy = defendeu ? luva.luvaY : telaY(r.y);
        desenharBolaEmVoo((tt) => trajetoria(dx, dy, gesto.efeito, facil(tt), r.cavadinha), t);
        if (t >= 1) {
          if (r.desfecho === 'gol') efeitos.rede = { inicio: agora, x: dx, y: dy };
          desfecho = { meu: true, gol: r.desfecho === 'gol', pegou: defendeu, x: dx, y: dy, zonaGoleiro: r.zonaGoleiro };
          fase = { tipo: 'pausa', inicio: agora };
          ctx.concluir(r.desfecho === 'gol');
        }
        break;
      }
      case 'corrida': {
        const ms = agora - fase.inicio;
        desenharZonas(fase.zona);
        const tPulo = fase.pulouEm === null ? 0 : (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiroNoQuadro(goleiroJogador, fase.zona, tPulo, agora);
        desenharTraves();
        if (ms >= DUR_CORRIDA * 0.55) desenharDica(fase.dica);
        desenharBola(g.bolaX, g.bolaY);
        maquinaCorrendo(ms, agora, fase.dica);
        const tocou = fase.zona !== null && ms >= DUR_CORRIDA + ESPERA_APOS_TOQUE;
        if (tocou || ms >= DUR_CORRIDA + JANELA_DA_DEFESA) chuteDaMaquina(fase.zona ?? -1, fase.pulouEm ?? agora, fase.dica);
        break;
      }
      case 'chuteMaquina': {
        const { r } = fase;
        const ms = agora - fase.inicio;
        const t = limitar01((ms - DUR_BATIDA) / DUR_CHUTE);
        const tPulo = (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiroNoQuadro(goleiroJogador, r.zonaGoleiro, Math.max(tPulo, 0), agora);
        desenharTraves();
        const luva = goleiroNoQuadro(goleiroJogador, r.zonaGoleiro, 1, agora);
        const ax = r.desfecho === 'defesa' ? luva.luvaX : telaX(zonaX(r.alvo));
        const ay = r.desfecho === 'defesa' ? luva.luvaY : telaY(zonaY(r.alvo));
        maquinaChutando(ms, fase.dica);
        desenharBolaEmVoo((tt) => trajetoria(ax, ay, 0, facil(tt), false), t);
        if (t >= 1) {
          if (r.desfecho === 'gol') efeitos.rede = { inicio: agora, x: ax, y: ay };
          desfecho = { meu: false, gol: r.desfecho === 'gol', pegou: r.desfecho === 'defesa', x: ax, y: ay, zonaGoleiro: r.zonaGoleiro };
          fase = { tipo: 'pausa', inicio: agora };
          ctx.concluir(r.desfecho === 'defesa');
        }
        break;
      }
      case 'pausa': {
        const ms = agora - fase.inicio;
        const d = desfecho;
        if (d) {
          // Quem bate comemora no gol e lamenta no resto; o goleiro cai onde pulou.
          const batedor = d.meu ? batedorJogador : batedorMaquina;
          const goleiroDeLa = d.meu ? goleiroMaquina : goleiroJogador;
          desenharGoleiroNoQuadro(goleiroDeLa, d.zonaGoleiro, 1, agora, ms, d.pegou);
          desenharTraves();
          desenharBatedorEm(batedor, batedorX(1), batedorY(1), d.gol ? poseComemora(ms, poseBatedor) : poseLamenta(ms, poseBatedor));
          bolaParada(d.x, d.y);
        }
        break;
      }
    }
    desenharPontos(agora);
    c.restore();
    raf = requestAnimationFrame(() => quadro(relogio()));
  }

  // ---------- gestos ----------
  const ponto = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    destravarSom();
    if (fase.tipo === 'mirar') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // sem captura: o arraste segue
      }
      rastro = [ponto(e)];
    } else if (fase.tipo === 'corrida' && fase.zona === null) {
      const p = ponto(e);
      fase.zona = zonaTocada(p.x, p.y);
      fase.pulouEm = relogio();
      tiraMao?.();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (fase.tipo === 'mirar' && rastro.length) {
      const juntos = e.getCoalescedEvents?.() ?? [];
      for (const ev of juntos.length ? juntos : [e]) rastro.push(ponto(ev));
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (fase.tipo !== 'mirar' || rastro.length < 1) {
      rastro = [];
      return;
    }
    rastro.push(ponto(e));
    const gesto = lerArraste(rastro);
    rastro = [];
    if (gesto) chutar(gesto);
    else ctx.avisar('Arraste pra cima, na direção do gol.');
  });
  canvas.addEventListener('pointercancel', () => (rastro = []));

  const aoRedimensionar = () => medir();
  window.addEventListener('resize', aoRedimensionar);
  const pararDeOuvirQualidade = aoMudarQualidade(() => medir());
  medir();
  raf = requestAnimationFrame(() => quadro(relogio()));

  // A mão faz o gesto uma vez: arrasta da bola para o gol, ou toca o canto que o pé amarelo aponta.
  timerDaMao = window.setTimeout(
    () => {
      if (acabou) return;
      tiraMao =
        tipo === 'penalti'
          ? demonstrar(palco, { tipo: 'arrasta', de: { x: g.bolaX, y: g.bolaY }, para: { x: telaX(0.45), y: telaY(0.5) } }, reduzido)
          : demonstrar(palco, { tipo: 'toca', em: [{ x: telaX(zonaX(plano.alvo)), y: telaY(zonaY(plano.alvo)) }] }, reduzido);
    },
    tipo === 'penalti' ? 500 : 750,
  );

  if (import.meta.env.DEV) {
    // Para a conferência no navegador: dispara o gesto sem arrastar o dedo.
    (window as unknown as Record<string, unknown>).__aqPenalti = {
      fase: () => fase.tipo,
      chutar: () => chutar({ dir: 40, forca: 72, efeito: 0 }),
      tocar: (z: number) => {
        if (fase.tipo === 'corrida' && fase.zona === null) {
          fase.zona = z;
          fase.pulouEm = relogio();
        }
      },
      alvo: plano.alvo,
    };
  }

  return () => {
    acabou = true;
    window.clearTimeout(timerDaMao);
    tiraMao?.();
    pararDeOuvirQualidade();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', aoRedimensionar);
  };
}
