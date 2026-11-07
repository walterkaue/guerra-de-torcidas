// Estação 3 (Falta com barreira) do Aquecimento: uma falta frontal a 20 m, barreira de 3, na câmera 3D dos Lances.
// Motor puro (jogo/lances.ts) com semente local; a mão arrasta da bola para o canto, ao lado da barreira.

import { CENA_DA_FALTA, GESTO_DA_FALTA, sementeDaFalta } from '../../jogo/aquecimentoCena';
import { caminhoDoLance, goleiroAntesDoChute, resolverLance, type ResultadoLance } from '../../jogo/lances';
import { normalizarCobranca, type GestoCobranca } from '../../jogo/penaltis';
import { destravarSom, somChute } from '../../jogo/som';
import {
  criarBoneco,
  novaPose,
  poseChute,
  poseComemora,
  poseLamenta,
  poseParado,
  sortearAparencia,
  uniformesDaPartida,
  type Boneco,
} from '../bonecos';
import { bonecoDaPessoaEmCampo } from '../bonecoEmCampoCena';
import { ENQUADRAMENTOS } from '../camera';
import { facil, limitar01 } from '../cena';
import { criarCena3d } from '../cena3d';
import { aoMudarQualidade } from '../qualidade';
import { demonstrar } from './mao';
import type { Estacao } from './tipos';

/** Metros por milissegundo do desenho da bola (o voo de uma falta de 25 m leva ~1 s). */
const METROS_POR_MS = 0.025;
const DUR_BATIDA = 190;
const DUR_PULO = 420;

type Fase =
  | { tipo: 'mirar' }
  | { tipo: 'chute'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number; cavadinha: boolean }
  | { tipo: 'pausa'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number } };

export const estacaoFalta: Estacao = (ctx) => {
  const { palco, time, reduzido } = ctx;
  const canvas = document.createElement('canvas');
  canvas.className = 'aq-canvas';
  palco.append(canvas);
  const relogio = () => performance.now();
  const cena = criarCena3d(canvas, { cores: time.cores, relogio, reduzido });
  const { c } = cena;
  const l = CENA_DA_FALTA;

  const u = uniformesDaPartida(time.cores, null, Math.random() < 0.5 ? 0 : 1);
  // Com "Meu boneco em campo" ligado, o batedor é o boneco da pessoa (só visual).
  const batedor: Boneco = bonecoDaPessoaEmCampo(u.jogador) ?? criarBoneco(sortearAparencia(), u.jogador, false);
  const goleiro: Boneco = criarBoneco(sortearAparencia(), u.goleiroAdversario, true);
  const barreira: Boneco[] = Array.from({ length: 3 }, () => criarBoneco(sortearAparencia(), u.adversario, true));
  const poseBatedor = novaPose();
  const poseBarreira = novaPose();

  const semente = sementeDaFalta(Math.random);
  const x0 = goleiroAntesDoChute(semente, 0, l);
  /** Goleiro na linha do gol, no lado sorteado (falta: sem saída). */
  const goleiroEm = { x: x0 * 3.66, z: 0 };

  let fase: Fase = { tipo: 'mirar' };
  let rastro: { x: number; y: number }[] = [];
  let acabou = false;
  let raf = 0;
  let tiraMao: (() => void) | null = null;
  let timerDaMao = 0;

  function chutar(gesto: GestoCobranca): void {
    const gq = normalizarCobranca(gesto);
    tiraMao?.();
    const r = resolverLance(semente, 0, l, gq);
    const em = caminhoDoLance(l, gq, r);
    const fim = em(r.tFim);
    const dist = Math.hypot(fim.x - l.bola.x, fim.z - l.bola.z);
    const dur = Math.max(450, (dist / METROS_POR_MS) * (r.cavadinha || gq.forca < 32 ? 1.8 : 1));
    fase = { tipo: 'chute', inicio: relogio(), r, em, dur, cavadinha: r.cavadinha };
    window.setTimeout(() => !acabou && somChute(), DUR_BATIDA);
  }

  function quadro(agora: number): void {
    if (acabou) return;
    c.save();
    cena.desenharFundo(agora);
    switch (fase.tipo) {
      case 'mirar': {
        cena.desenharGoleiro(goleiro, goleiroEm.x, goleiroEm.z, agora);
        cena.desenharTraves();
        cena.desenharBarreira(l.barreira!, barreira, poseParado(agora, poseBarreira));
        cena.desenharBatedor(batedor, poseParado(agora, poseBatedor));
        cena.desenharBola3d({ x: l.bola.x, y: 0, z: l.bola.z });
        cena.desenharRastro(rastro);
        break;
      }
      case 'chute': {
        const { r, em, dur } = fase;
        const ms = agora - fase.inicio;
        const t = limitar01((ms - DUR_BATIDA) / dur);
        const tPulo = (t * dur - dur * 0.1) / DUR_PULO;
        const fim = em(r.tFim);
        // Defesa: pula e alcança. Gol: pula, mas não chega. Barreira, trave e fora: fica.
        const alvo = r.desfecho === 'defesa' || r.desfecho === 'gol' ? { x: fim.x, y: fim.y } : null;
        cena.desenharGoleiro(goleiro, goleiroEm.x, goleiroEm.z, agora, alvo, tPulo, r.desfecho === 'gol' ? 0.55 : 1);
        cena.desenharTraves();
        cena.desenharBarreira(l.barreira!, barreira, poseParado(agora, poseBarreira));
        cena.desenharBatedor(batedor, poseChute(ms, fase.cavadinha, poseBatedor), facil(limitar01(ms / DUR_BATIDA)));
        cena.desenharBola3d(em(t * r.tFim), t * 14);
        if (t >= 1) {
          fase = { tipo: 'pausa', inicio: agora, r, em };
          ctx.concluir(r.desfecho === 'gol');
        }
        break;
      }
      case 'pausa': {
        const { r, em } = fase;
        const ms = agora - fase.inicio;
        const fim = em(r.tFim);
        const pulou = r.desfecho === 'defesa' || r.desfecho === 'gol';
        cena.desenharGoleiro(goleiro, goleiroEm.x, goleiroEm.z, agora, pulou ? { x: fim.x, y: fim.y } : null, 1, r.desfecho === 'gol' ? 0.55 : 1, pulou ? ms : -1, r.desfecho === 'defesa');
        cena.desenharTraves();
        cena.desenharBarreira(l.barreira!, barreira, poseParado(agora, poseBarreira));
        cena.desenharBatedor(batedor, r.desfecho === 'gol' ? poseComemora(ms, poseBatedor) : poseLamenta(ms, poseBatedor), 1);
        // A bola fica onde parou: na rede, na luva ou no chão, na barreira.
        const cai = limitar01(ms / 350);
        if (r.desfecho !== 'fora') cena.desenharBola3d({ x: fim.x, y: fim.y * (1 - cai), z: r.desfecho === 'gol' ? -0.6 * cai : fim.z });
        break;
      }
    }
    cena.desenharPontos(agora);
    c.restore();
    raf = requestAnimationFrame(() => quadro(relogio()));
  }

  const ponto = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    destravarSom();
    if (fase.tipo !== 'mirar') return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // sem captura: o arraste segue
    }
    rastro = [ponto(e)];
  });
  canvas.addEventListener('pointermove', (e) => {
    if (fase.tipo !== 'mirar' || !rastro.length) return;
    const juntos = e.getCoalescedEvents?.() ?? [];
    for (const ev of juntos.length ? juntos : [e]) rastro.push(ponto(ev));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (fase.tipo !== 'mirar' || !rastro.length) {
      rastro = [];
      return;
    }
    rastro.push(ponto(e));
    const gesto = cena.lerArraste(rastro);
    rastro = [];
    if (gesto) chutar(gesto);
    else ctx.avisar('Arraste da bola na direção do gol.');
  });
  canvas.addEventListener('pointercancel', () => (rastro = []));

  const aoRedimensionar = () => cena.medir();
  window.addEventListener('resize', aoRedimensionar);
  const pararDeOuvirQualidade = aoMudarQualidade(() => cena.medir());
  cena.medir();
  cena.definirLance(l.bola, ENQUADRAMENTOS.falta);
  raf = requestAnimationFrame(() => quadro(relogio()));

  // A mão arrasta da bola até o canto direito, passando ao lado da barreira.
  timerDaMao = window.setTimeout(() => {
    if (acabou) return;
    const de = cena.bolaNaTela();
    const para = cena.noGol(GESTO_DA_FALTA.dir / 100, 0.5);
    tiraMao = demonstrar(palco, { tipo: 'arrasta', de: { x: de.x, y: de.y }, para: { x: para.x, y: para.y } }, reduzido);
  }, 500);

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__aqFalta = { fase: () => fase.tipo, chutar: () => chutar(GESTO_DA_FALTA) };
  }

  return () => {
    acabou = true;
    window.clearTimeout(timerDaMao);
    tiraMao?.();
    pararDeOuvirQualidade();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', aoRedimensionar);
  };
};
