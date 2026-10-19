// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Gerador pseudoaleatório determinístico (mulberry32) e mistura de inteiros.
// Só usa operações inteiras e divisão por 2^32, então dá o mesmo resultado
// em qualquer motor JavaScript (navegador ou Deno, na função do servidor).

export type Aleatorio = () => number;

/** Mistura inteiros num único inteiro de 32 bits (sem sinal). */
export function misturar(...partes: number[]): number {
  let h = 0x811c9dc5;
  for (const p of partes) {
    h = Math.imul(h ^ (p >>> 0), 0x01000193);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
  }
  return h >>> 0;
}

/** Números em [0, 1) a partir de uma semente de 32 bits. */
export function criarAleatorio(semente: number): Aleatorio {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro em [0, n). */
export function inteiro(rnd: Aleatorio, n: number): number {
  return Math.floor(rnd() * n);
}

/** Semente nova para partidas locais (na etapa 3 quem sorteia é o servidor). */
export function sementeNova(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}
