// Replay de TV do gol (docs/visual.md, "Replay"): o mesmo chute redesenhado de outro ângulo, de trás do
// gol, em câmera lenta, com a tarja "REPLAY" e toque para pular. Custo zero de rede: o lance já foi
// resolvido pelo motor puro (gesto + semente), então o replay só desenha de novo o caminho da bola.
// Só desenho: nada aqui muda pontos ou resultado. Com movimento reduzido, quem chama não toca o replay.

import { criarBoneco, novaPose, poseChute, poseComemora, poseParado, type Boneco } from './bonecos';
import type { Enquadramento, Ponto3 } from './camera';
import { facil, limitar01, suave } from './cena';
import type { Barreira3d, Cena3d } from './cena3d';
import { qualidade } from './qualidade';

/** Tudo o que o replay precisa do lance que acabou de acontecer. */
export interface LanceDoReplay {
  /** Onde a bola estava (m). */
  bola: { x: number; z: number };
  /** Enquadramento do lance, para a câmera voltar ao normal depois. */
  enquadramento: Enquadramento;
  /** Caminho da bola até o gol (m), t de 0 a 1. */
  em: (t: number) => Ponto3;
  /** Quanto o chute levou de verdade (ms); o replay passa na metade da velocidade. */
  voo: number;
  cavadinha: boolean;
  goleiro: { x: number; z: number; alvo: { x: number; y: number }; alcance: number };
  barreira?: Barreira3d;
  /** Bonecos do lance, como estavam na câmera normal (o replay vira cada um uma vez). */
  batedor: Boneco;
  goleiroBoneco: Boneco;
  bonecosDaBarreira?: Boneco[];
}

const LENTO = 2;
const DUR_BATIDA = 190 * LENTO;
const DUR_PULO = 420 * LENTO;
const DEPOIS = 1100;
const ZOOM_FINAL = 1.1;

/** O mesmo boneco visto do outro lado (quem estava de costas aparece de frente e vice-versa). */
const virado = (b: Boneco) => criarBoneco(b.aparencia, b.uniforme, !b.deFrente);

/**
 * Prepara o replay na cena 3D e devolve o desenho de cada quadro, que diz quantos ms faltam (<= 0: acabou).
 * Quem chama faz o c.save()/c.restore() do quadro, como no lance normal, e chama `encerrar` no fim
 * (ou quando a pessoa toca para pular), que devolve a câmera do lance.
 */
export function criarReplay(cena: Cena3d, l: LanceDoReplay, inicio: number) {
  const { c } = cena;
  const batedor = virado(l.batedor);
  const goleiro = virado(l.goleiroBoneco);
  const barreira = l.bonecosDaBarreira?.map(virado) ?? [];
  const poseBatedor = novaPose();
  const poseBarreira = novaPose();
  const voo = l.voo * LENTO;
  const total = DUR_BATIDA + voo + DEPOIS;
  const fim = l.em(1);
  cena.definirLance(l.bola, l.enquadramento);
  cena.modoReplay(fim.x);

  function quadro(agora: number): number {
    const ms = agora - inicio;
    // A câmera fecha devagar (zoom só no canvas: o fundo pronto não é redesenhado).
    const W = c.canvas.clientWidth;
    const H = c.canvas.clientHeight;
    const z = qualidade().zoomNoReplay ? 1 + (ZOOM_FINAL - 1) * suave(limitar01(ms / total)) : 1;
    c.translate(W / 2, H / 2);
    c.scale(z, z);
    c.translate(-W / 2, -H / 2);
    cena.desenharFundo(agora);

    const t = limitar01((ms - DUR_BATIDA) / voo);
    const chegou = ms - DUR_BATIDA - voo;
    // De longe para perto: batedor, barreira, goleiro e bola (na ordem da profundidade), traves e rede.
    const avanco = facil(limitar01(ms / DUR_BATIDA));
    const pose = chegou > 0 ? poseComemora(chegou, poseBatedor) : poseChute(ms / LENTO, l.cavadinha, poseBatedor);
    cena.desenharBatedor(batedor, pose, avanco);
    if (l.barreira) cena.desenharBarreira(l.barreira, barreira, poseParado(agora, poseBarreira));

    const tPulo = (t * voo - voo * 0.1) / DUR_PULO;
    const cai = limitar01(chegou / (350 * LENTO));
    const bola = chegou > 0 ? { x: fim.x, y: fim.y * (1 - cai), z: -0.6 * cai } : l.em(t);
    const g = l.goleiro;
    const desenharGoleiro = () =>
      cena.desenharGoleiro(goleiro, g.x, g.z, agora, g.alvo, tPulo, g.alcance, chegou > 0 ? chegou / LENTO : -1, false);
    if (bola.z > g.z) {
      cena.desenharBola3d(bola, t * 14);
      desenharGoleiro();
    } else {
      desenharGoleiro();
      cena.desenharBola3d(bola, t * 14);
    }
    cena.desenharTraves();
    cena.desenharRedeNaFrente();
    return total - ms;
  }

  function encerrar(): void {
    cena.modoReplay(null);
  }

  return { quadro, encerrar };
}

export type Replay = ReturnType<typeof criarReplay>;

/** Quanto antes do corte de câmera a vinheta começa a varrer (ela cobre a tela no meio da passada). */
export const ANTES_DO_CORTE = 220;

/**
 * Tarja "REPLAY" no canto (com "toque pra pular") e a vinheta inclinada que varre a tela na entrada e
 * na saída, como na TV. Só CSS; sem vinheta com movimento reduzido.
 */
export function montarTarjaDoReplay(main: HTMLElement) {
  const tarja = document.createElement('div');
  tarja.className = 'replay-tarja';
  tarja.hidden = true;
  tarja.innerHTML = '<span class="replay-selo">Replay</span><small>toque pra pular</small>';
  const vinheta = document.createElement('div');
  vinheta.className = 'replay-vinheta';
  vinheta.setAttribute('aria-hidden', 'true');
  main.append(tarja, vinheta);
  const varrer = () => {
    vinheta.classList.remove('passa');
    void vinheta.offsetWidth;
    vinheta.classList.add('passa');
  };
  let entrando = false;
  return {
    /** A vinheta passa; a tarja aparece junto com o corte para o replay (`ANTES_DO_CORTE` depois). */
    entrar(): void {
      if (entrando) return;
      entrando = true;
      varrer();
      setTimeout(() => (tarja.hidden = !entrando), ANTES_DO_CORTE);
    },
    sair(): void {
      if (!entrando) return;
      entrando = false;
      tarja.hidden = true;
      varrer();
    },
  };
}
