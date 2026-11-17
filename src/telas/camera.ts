// Câmera 3D dos Lances: projeta pontos do campo (metros) na tela, olhando de trás da bola para o gol.
// Só desenho: a física continua no motor puro (jogo/lances.ts). Medidas como no motor: x para a direita de
// quem bate, z do gol para o campo (z = 0 é a linha do gol) e y é a altura.

/** O gol (m): meia largura, altura do travessão e o fundo da rede, atrás da linha. */
export const MEIA_GOL = 3.66;
export const ALTURA_GOL = 2.44;
export const FUNDO_REDE = -2;

export interface Ponto3 {
  x: number;
  y: number;
  z: number;
}

export interface NaTela {
  x: number;
  y: number;
  /** Pixels por metro naquela profundidade (para o tamanho de bola, bonecos e linhas). */
  escala: number;
  /** Distância até a câmera, na direção em que ela olha (ponto atrás da câmera: <= 0). */
  prof: number;
}

/** Enquadramento de cada tipo de lance: quanto a câmera recua, a altura e o zoom. */
export interface Enquadramento {
  /** Metros atrás da bola, na linha entre o gol e a bola. */
  atras: number;
  /** Altura da câmera (m). */
  altura: number;
  /** Para onde olha: fração do caminho da bola até o gol (0 = bola, 1 = gol) e a altura desse ponto. */
  olhar: number;
  alturaOlhar: number;
  /** Distância focal em larguras de tela (mais = mais zoom). */
  zoom: number;
  /** Altura do centro da imagem, em fração da tela. */
  centroY: number;
}

/** Três distâncias de câmera (decidido em 21/10): pênalti perto, cara a cara um pouco mais longe, falta mais longe. */
export const ENQUADRAMENTOS = {
  // Ajustados para metas de tela (390×844): largura do gol 78%, 60% e 42%; bola perto de 80% da altura.
  // O pênalti fica como referência: a aba Pênaltis usa a cena de TV de sempre (telas/cena.ts), decidido em 21/10.
  penalti: { atras: 6, altura: 7, olhar: 0.4, alturaOlhar: 0.75, zoom: 1.95, centroY: 0.5 },
  caraACara: { atras: 7, altura: 7, olhar: 0.55, alturaOlhar: -0.5, zoom: 1.8, centroY: 0.5 },
  falta: { atras: 6, altura: 5, olhar: 0.45, alturaOlhar: -1.75, zoom: 1.9, centroY: 0.5 },
} satisfies Record<string, Enquadramento>;

export interface Camera {
  projetar(p: Ponto3): NaTela;
  /** Onde a câmera está (m). */
  pos: Ponto3;
}

export const sub = (a: Ponto3, b: Ponto3): Ponto3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const dot = (a: Ponto3, b: Ponto3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Ponto3, b: Ponto3): Ponto3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: Ponto3): Ponto3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

/**
 * Câmera atrás da bola (`bola` em metros no chão), na linha que vai do meio do gol até a bola, olhando
 * para um ponto entre a bola e o gol. `largura` e `altura` são o tamanho da tela em pixels.
 */
export function cameraAtrasDaBola(
  bola: { x: number; z: number },
  e: Enquadramento,
  largura: number,
  altura: number,
  larguraFocal = largura,
): Camera {
  const d = Math.hypot(bola.x, bola.z) || 1;
  const ux = bola.x / d;
  const uz = bola.z / d;
  const pos = { x: bola.x + ux * e.atras, y: e.altura, z: bola.z + uz * e.atras };
  const alvo = { x: bola.x * (1 - e.olhar), y: e.alturaOlhar, z: bola.z * (1 - e.olhar) };
  return cameraOlhando(pos, alvo, e.zoom, largura, altura, e.centroY, larguraFocal);
}

/**
 * Câmera do replay de TV: atrás do gol, por trás da rede, um pouco alta, olhando para o campo entre a
 * bola e o gol. Puxa um pouco para o lado onde a bola entrou, como o cinegrafista de fundo.
 */
export function cameraDoReplay(bola: { x: number; z: number }, fimX: number, largura: number, altura: number, larguraFocal = largura): Camera {
  // Alta (como a câmera da arquibancada atrás do gol) para o campo encher a tela em pé, sem céu vazio.
  const pos = { x: Math.max(-2.5, Math.min(2.5, fimX * 0.25 + bola.x * 0.1)), y: 7.5, z: -7.5 };
  // Mira entre o canto onde a bola entrou e a bola: os dois ficam no quadro.
  const alvo = { x: fimX * 0.5 + bola.x * 0.2, y: 0, z: bola.z * 0.4 };
  return cameraOlhando(pos, alvo, 1.15, largura, altura, 0.6, larguraFocal);
}

/**
 * Onde o batedor pisa, atrás e à esquerda da bola (olhando para o gol): `avanco` 0 = no lugar da cobrança, 1 = o pé
 * chega na bola. A cena (telas/cena3d.ts) desenha nele; a câmera do telão (telas/cameraDoTelao.ts) o enquadra.
 */
export function posicaoDoBatedor(bola: { x: number; z: number }, avanco: number): { x: number; z: number } {
  const d = Math.hypot(bola.x, bola.z) || 1;
  const ux = bola.x / d;
  const uz = bola.z / d;
  // Direita de quem bate (olhando para o gol).
  const rx = uz;
  const rz = -ux;
  const atras = 1.1 - 0.7 * avanco;
  const lado = 0.8 - 0.45 * avanco;
  return { x: bola.x + ux * atras - rx * lado, z: bola.z + uz * atras - rz * lado };
}

/** Onde cada jogador da barreira pisa: a 9,15 m da bola, de frente para o ponto do gol que ela tapa (como no motor). */
export function posicoesDaBarreira(bola: { x: number; z: number }, b: { jogadores: number; miraX: number }): { x: number; z: number }[] {
  const mx = b.miraX - bola.x;
  const mz = -bola.z;
  const dm = Math.hypot(mx, mz);
  const ux = mx / dm;
  const uz = mz / dm;
  const cx = bola.x + ux * 9.15;
  const cz = bola.z + uz * 9.15;
  return Array.from({ length: b.jogadores }, (_, k) => {
    const o = (k - (b.jogadores - 1) / 2) * 0.5;
    return { x: cx - uz * o, z: cz + ux * o };
  });
}

/** Os eixos de uma câmera em `pos` olhando na direção `olhar` (sem giro: o "cima" da tela é o do mundo). */
export function eixosDaCamera(olhar: Ponto3): { frente: Ponto3; direita: Ponto3; cima: Ponto3 } {
  const frente = norm(olhar);
  const direita = norm(cross(frente, { x: 0, y: 1, z: 0 }));
  return { frente, direita, cima: cross(direita, frente) };
}

/** Câmera em `pos`, olhando na direção `olhar`, com distância focal `f` (px) e o centro da imagem em (`cx`, `cy`). */
export function cameraNaDirecao(pos: Ponto3, olhar: Ponto3, f: number, cx: number, cy: number): Camera {
  const { frente, direita, cima } = eixosDaCamera(olhar);
  return {
    pos,
    projetar(p) {
      const v = sub(p, pos);
      const prof = dot(v, frente);
      const z = Math.max(prof, 0.05);
      return { x: cx + (f * dot(v, direita)) / z, y: cy - (f * dot(v, cima)) / z, escala: f / z, prof };
    },
  };
}

/**
 * Câmera em `pos` olhando para `alvo`, com o zoom em larguras de tela e o centro na altura `centroY`. Em tela grande
 * o zoom conta sobre `larguraFocal` (a largura do campo, limitada pela altura: jogo/telaDaPartida.ts), e o que
 * sobra dos lados mostra mais campo e torcida.
 */
export function cameraOlhando(
  pos: Ponto3,
  alvo: Ponto3,
  zoom: number,
  largura: number,
  altura: number,
  centroY: number,
  larguraFocal = largura,
): Camera {
  return cameraNaDirecao(pos, sub(alvo, pos), zoom * larguraFocal, largura / 2, altura * centroY);
}
