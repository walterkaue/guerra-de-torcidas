// Câmera do telão do desafio dos Lances (docs/visual.md, "Telão do desafio dos Lances"): o mesmo ponto de vista do
// replay de TV (atrás do gol, por trás da rede, no alto), mas com o zoom e o centro escolhidos para o lance inteiro caber
// no quadro, que é largo e baixo: a bola parada, o batedor inteiro (comemorando de braços para cima), a barreira, o
// goleiro, as duas traves e o chão do gol, com margem em cada lado. O replay da partida (tela cheia) segue com
// `cameraDoReplay`. Pura (sem canvas), para o teste conferir pela projeção.

import {
  ALTURA_GOL,
  FUNDO_REDE,
  MEIA_GOL,
  cameraNaDirecao,
  dot,
  eixosDaCamera,
  posicaoDoBatedor,
  posicoesDaBarreira,
  sub,
  type Camera,
  type Ponto3,
} from './camera';

/**
 * Um ponto do campo que tem de caber no quadro. Os bonecos são desenhados de pé, de frente para a tela, na escala da
 * profundidade do pé (telas/cena3d.ts): `lado`, `cima` e `baixo` dizem quanto o desenho passa do ponto, em metros
 * nessa escala (na tela, para os lados, para cima e para baixo).
 */
export interface NoQuadro {
  p: Ponto3;
  lado?: number;
  cima?: number;
  baixo?: number;
}

/** O que o telão precisa de um gol para enquadrar. */
export interface GolNoTelao {
  bola: { x: number; z: number };
  barreira?: { jogadores: number; miraX: number };
  /** Onde o goleiro começa (m). */
  goleiro: { x: number; z: number };
  /** Onde a bola cruzou a linha (m). */
  fim: { x: number; y: number };
  /** Quanto do caminho até a bola o pulo do goleiro cobre no desenho (o `alcance` do replay). */
  alcance: number;
  /** Pontos do voo da bola (m), para ela não sair do quadro no alto do arco. */
  voo?: readonly Ponto3[];
}

/** Margem mínima em cada lado do quadro, em fração da largura (lados) e da altura (cima e baixo). */
export const MARGEM_DO_TELAO = 0.06;

// Medidas dos desenhos (em metros; 100 unidades do boneco = 1,95 m), com folga. Medidas no navegador em 17/11/2026:
// o batedor comemorando chega a 114 unidades de altura e o chute abre a perna até 46 para o lado; o goleiro, girando em
// volta da cintura, não passa de 63 unidades dela; a barreira parada, 101 de altura e 26 para o lado.
const BATEDOR = { lado: 0.95, cima: 2.3, baixo: 0.15 };
const BARREIRA = { lado: 0.55, cima: 2.05, baixo: 0.12 };
const RAIO_DO_GOLEIRO = 1.3;
/** A cintura do goleiro de pé (50 unidades) e deitado no chão, depois de cair (telas/cena3d.ts). */
const CINTURA_DE_PE = 0.975;
const CINTURA_CAIDO = 0.3;
/** A bola desenhada é 2,2 vezes a real (11 cm de raio). */
const BOLA = { lado: 0.26, cima: 0.26, baixo: 0.1 };
const TRAVE = { lado: 0.08, cima: 0.08, baixo: 0.08 };

/** Tudo o que tem de caber no quadro durante o replay de um gol. */
export function pontosDoTelao(g: GolNoTelao): NoQuadro[] {
  const pts: NoQuadro[] = [];
  // A bola parada e o voo dela.
  pts.push({ p: { x: g.bola.x, y: 0.11, z: g.bola.z }, ...BOLA });
  for (const p of g.voo ?? []) pts.push({ p: { x: p.x, y: p.y + 0.11, z: p.z }, ...BOLA });
  // O batedor no lugar da cobrança e com o pé na bola (onde ele comemora).
  for (const avanco of [0, 1]) {
    const q = posicaoDoBatedor(g.bola, avanco);
    pts.push({ p: { x: q.x, y: 0, z: q.z }, ...BATEDOR });
  }
  // A barreira.
  if (g.barreira) for (const q of posicoesDaBarreira(g.bola, g.barreira)) pts.push({ p: { x: q.x, y: 0, z: q.z }, ...BARREIRA });
  // As traves, o travessão e o chão do gol até o fundo da rede (onde a bola cai e o goleiro deita).
  for (const x of [-MEIA_GOL, MEIA_GOL]) {
    pts.push({ p: { x, y: 0, z: 0 }, ...TRAVE }, { p: { x, y: ALTURA_GOL, z: 0 }, ...TRAVE });
    pts.push({ p: { x, y: 0, z: FUNDO_REDE } });
  }
  // O goleiro de pé e onde ele termina o pulo (como telas/cena3d.ts: o corpo vai 85% do caminho coberto).
  const r = { lado: RAIO_DO_GOLEIRO, cima: RAIO_DO_GOLEIRO, baixo: RAIO_DO_GOLEIRO };
  const xPulo = g.goleiro.x + (g.fim.x - g.goleiro.x) * g.alcance * 0.85;
  const yPulo = CINTURA_DE_PE + Math.max(0, (g.fim.y - 1.1) * 0.6 * g.alcance) + 0.15;
  pts.push({ p: { x: g.goleiro.x, y: CINTURA_DE_PE, z: g.goleiro.z }, ...r });
  pts.push({ p: { x: xPulo, y: yPulo, z: g.goleiro.z }, ...r });
  pts.push({ p: { x: xPulo, y: CINTURA_CAIDO, z: g.goleiro.z }, ...r, baixo: CINTURA_CAIDO });
  return pts;
}

/**
 * Onde a câmera do telão fica: atrás da rede, como a do replay de TV (telas/camera.ts, `cameraDoReplay`), puxada um
 * pouco para o lado em que a bola entrou, mas mais longe e mais baixa (16 m atrás da linha, a 8 m de altura). De longe o
 * gol perto e o batedor lá na frente ficam em tamanhos mais parecidos, e o quadro largo mostra os dois maiores: na
 * mediana do catálogo, em 296 × 222, o gol passa de 147 para 190 px nas faltas e o batedor de 26 para 39 px.
 */
const RECUO = { z: -16, y: 8 };
function posicaoDaCamera(g: GolNoTelao): Ponto3 {
  return { x: Math.max(-2.5, Math.min(2.5, g.fim.x * 0.25 + g.bola.x * 0.1)), y: RECUO.y, z: RECUO.z };
}

/** Até onde os pontos vão, em tangentes a partir do eixo da câmera (x para a direita da tela, y para cima). */
function limites(pos: Ponto3, olhar: Ponto3, pts: readonly NoQuadro[]) {
  const { frente, direita, cima } = eixosDaCamera(olhar);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const q of pts) {
    const v = sub(q.p, pos);
    const prof = Math.max(dot(v, frente), 0.05);
    const x = dot(v, direita) / prof;
    const y = dot(v, cima) / prof;
    x0 = Math.min(x0, x - (q.lado ?? 0) / prof);
    x1 = Math.max(x1, x + (q.lado ?? 0) / prof);
    y0 = Math.min(y0, y - (q.baixo ?? 0) / prof);
    y1 = Math.max(y1, y + (q.cima ?? 0) / prof);
  }
  return { x0, x1, y0, y1, frente, direita, cima };
}

/**
 * A câmera do telão para um quadro de `largura` × `altura` px: mira no meio do que tem de aparecer e escolhe o zoom
 * para tudo caber com `margem` em cada lado. Lance longe demais não corta ninguém: a câmera abre (o gol fica menor).
 */
export function cameraDoTelao(g: GolNoTelao, largura: number, altura: number, margem = MARGEM_DO_TELAO): Camera {
  const pos = posicaoDaCamera(g);
  const pts = pontosDoTelao(g);
  // Mira no meio dos pontos: começa no meio do caminho entre o gol e a bola e corrige até o miolo ficar no eixo.
  let olhar = sub({ x: (g.fim.x + g.bola.x) / 2, y: 0, z: g.bola.z / 2 }, pos);
  let l = limites(pos, olhar, pts);
  for (let i = 0; i < 4; i++) {
    const mx = (l.x0 + l.x1) / 2;
    const my = (l.y0 + l.y1) / 2;
    olhar = {
      x: l.frente.x + mx * l.direita.x + my * l.cima.x,
      y: l.frente.y + mx * l.direita.y + my * l.cima.y,
      z: l.frente.z + mx * l.direita.z + my * l.cima.z,
    };
    l = limites(pos, olhar, pts);
  }
  const f = Math.min((largura * (1 - 2 * margem)) / (l.x1 - l.x0), (altura * (1 - 2 * margem)) / (l.y1 - l.y0));
  // O que sobrou de desvio depois da mira vai para o centro da imagem.
  const cx = largura / 2 - (f * (l.x0 + l.x1)) / 2;
  const cy = altura / 2 + (f * (l.y0 + l.y1)) / 2;
  return cameraNaDirecao(pos, olhar, f, cx, cy);
}

/**
 * A margem que a câmera usa para que, depois do zoom final do replay (que fecha `zoom` vezes em volta do centro do
 * quadro), ainda sobre `margem` em cada lado.
 */
export const margemAntesDoZoom = (zoom: number, margem = MARGEM_DO_TELAO): number => 0.5 - (0.5 - margem) / zoom;
