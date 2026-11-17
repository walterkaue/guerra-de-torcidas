// Bola que amassa na rede e na luva (docs/visual.md, seção 4), nos Pênaltis e nos Lances. Só desenho: nada aqui muda
// o motor, a física, os pontos ou o que o servidor recalcula. Módulo puro (sem DOM), para testar sem o canvas.

/**
 * Mola amortecida (0 → 1 passando ~10% do ponto e voltando), a mesma curva de --mola no CSS.
 * Para "pop" de número e adesivo e para a bola voltar ao redondo; nunca na física, que continua no motor puro.
 */
export const mola = (t: number) => {
  if (t >= 1) return 1;
  const amort = 0.6;
  const w = 12;
  const wd = w * Math.sqrt(1 - amort * amort);
  return 1 - Math.exp(-amort * w * t) * (Math.cos(wd * t) + (amort / Math.sqrt(1 - amort * amort)) * Math.sin(wd * t));
};

/** Quanto a bola amassa ao chegar na rede (escala 1 - força no eixo da chegada). */
export const FORCA_REDE = 0.5;
/** Quanto a bola amassa ao chegar na luva (encaixada e no começo da espalmada). */
export const FORCA_LUVA = 0.4;
/** Do contato até voltar ao redondo. */
export const DUR_AMASSADO = 260;

/**
 * Escala da bola no eixo do impacto, `ms` depois do contato: 1 - `forca` no contato, volta a 1 com a mola (passando um
 * pouco do ponto, a bola estica de leve) em `dur` ms. Antes e depois disso, 1 (redonda). O outro eixo usa 1/escala.
 */
export function amassadoDoImpacto(ms: number, forca: number, dur = DUR_AMASSADO): number {
  if (!(ms >= 0) || ms >= dur || forca <= 0) return 1;
  return 1 - forca + forca * mola(ms / dur);
}

/** Ângulo (rad, na tela) do último trecho do voo: de `antes` até `fim`. Parado no mesmo ponto: 0. */
export function anguloDaChegada(antes: { readonly x: number; readonly y: number }, fim: { readonly x: number; readonly y: number }): number {
  const dx = fim.x - antes.x;
  const dy = fim.y - antes.y;
  return dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
}
