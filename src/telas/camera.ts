// Câmera 3D dos Lances: projeta pontos do campo (metros) na tela, olhando de trás da bola para o gol.
// Só desenho: a física continua no motor puro (jogo/lances.ts). Medidas como no motor: x para a direita de
// quem bate, z do gol para o campo (z = 0 é a linha do gol) e y é a altura.

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

const sub = (a: Ponto3, b: Ponto3): Ponto3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Ponto3, b: Ponto3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Ponto3, b: Ponto3): Ponto3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: Ponto3): Ponto3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

/**
 * Câmera atrás da bola (`bola` em metros no chão), na linha que vai do meio do gol até a bola, olhando
 * para um ponto entre a bola e o gol. `largura` e `altura` são o tamanho da tela em pixels.
 */
export function cameraAtrasDaBola(bola: { x: number; z: number }, e: Enquadramento, largura: number, altura: number): Camera {
  const d = Math.hypot(bola.x, bola.z) || 1;
  const ux = bola.x / d;
  const uz = bola.z / d;
  const pos = { x: bola.x + ux * e.atras, y: e.altura, z: bola.z + uz * e.atras };
  const alvo = { x: bola.x * (1 - e.olhar), y: e.alturaOlhar, z: bola.z * (1 - e.olhar) };
  return cameraOlhando(pos, alvo, e.zoom, largura, altura, e.centroY);
}

/**
 * Câmera do replay de TV: atrás do gol, por trás da rede, um pouco alta, olhando para o campo entre a
 * bola e o gol. Puxa um pouco para o lado onde a bola entrou, como o cinegrafista de fundo.
 */
export function cameraDoReplay(bola: { x: number; z: number }, fimX: number, largura: number, altura: number): Camera {
  // Alta (como a câmera da arquibancada atrás do gol) para o campo encher a tela em pé, sem céu vazio.
  const pos = { x: Math.max(-2.5, Math.min(2.5, fimX * 0.25 + bola.x * 0.1)), y: 7.5, z: -7.5 };
  // Mira entre o canto onde a bola entrou e a bola: os dois ficam no quadro.
  const alvo = { x: fimX * 0.5 + bola.x * 0.2, y: 0, z: bola.z * 0.4 };
  return cameraOlhando(pos, alvo, 1.15, largura, altura, 0.6);
}

/** Câmera em `pos` olhando para `alvo`, com o zoom em larguras de tela e o centro na altura `centroY`. */
export function cameraOlhando(pos: Ponto3, alvo: Ponto3, zoom: number, largura: number, altura: number, centroY: number): Camera {
  const frente = norm(sub(alvo, pos));
  const direita = norm(cross(frente, { x: 0, y: 1, z: 0 }));
  const cima = cross(direita, frente);
  const f = zoom * largura;
  const cx = largura / 2;
  const cy = altura * centroY;
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
