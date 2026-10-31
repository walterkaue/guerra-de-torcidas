// Torcida desenhada: a mesma da arquibancada da partida (telas/cena.ts) e da faixa da Home
// (telas/arquibancada.ts). Fica à parte para a Home usar sem baixar a cena inteira.

export const QUADROS_TORCIDA = 3;

/** Sorteio fixo por posição (a torcida não pode "piscar" entre os quadros). */
export const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export interface Lugar {
  x: number;
  y: number;
  cor: string;
  r: number;
  bandeira: boolean;
  h: number;
}

/** Lugares da arquibancada (posição, cor e quem segura bandeira), do alto até `fim`. */
export function lugaresDaTorcida(W: number, fim: number, cores: readonly [string, string]): Lugar[] {
  const lista = [];
  const neutros = ['#2c4a37', '#3a3f4a', '#4a3a2e'];
  let fila = 0;
  for (let y = 9; y < fim - 4; y += 10, fila++) {
    const r = 2.8 + (y / fim) * 1.6;
    for (let x = fila % 2 ? 3 : 9; x < W + 6; x += 11) {
      const h = hash(x, y);
      const cor = h < 0.42 ? cores[0] : h < 0.78 ? cores[1] : neutros[Math.floor(h * 30) % 3];
      lista.push({ x: x + (h - 0.5) * 3, y, r, cor, bandeira: h > 0.965, h });
    }
  }
  return lista;
}

export function desenharTorcedor(o: CanvasRenderingContext2D, cores: readonly [string, string], x: number, y: number, r: number, cor: string, h: number, levantou = 0, quadroTorcida = 0, bandeira = false): void {
  // Cada torcedor balança no seu ritmo: 3 quadros de animação, sorteados por pessoa.
  const balanco = Math.sin((quadroTorcida + h * 3) * ((Math.PI * 2) / 3)) * (h > 0.5 ? 1.4 : 0.6);
  const dy = -levantou * r * 2.2 + balanco;
  o.fillStyle = cor;
  o.beginPath();
  o.ellipse(x, y + dy + r * 1.5, r * 1.3, r * 1.05, 0, Math.PI, 0);
  o.fill();
  o.fillStyle = h > 0.6 ? '#3a2a20' : h > 0.3 ? '#6b4a33' : '#8a5f40';
  o.beginPath();
  o.arc(x, y + dy, r * 0.8, 0, Math.PI * 2);
  o.fill();
  const bracos = levantou > 0.3 || (h > 0.88 && quadroTorcida % 3 !== Math.floor(h * 9) % 3);
  if (bracos) {
    o.strokeStyle = cor;
    o.lineWidth = r * 0.6;
    o.beginPath();
    o.moveTo(x - r, y + dy + r * 0.6);
    o.lineTo(x - r * 1.5, y + dy - r * 1.7);
    o.moveTo(x + r, y + dy + r * 0.6);
    o.lineTo(x + r * 1.5, y + dy - r * 1.7);
    o.stroke();
  }
  if (bandeira) {
    // Bandeira lisa nas 2 cores do time, tremulando.
    const onda = Math.sin(quadroTorcida * 2.1 + h * 10) * 3;
    o.strokeStyle = '#ddd';
    o.lineWidth = 1;
    o.beginPath();
    o.moveTo(x + r, y + dy);
    o.lineTo(x + r, y + dy - 22);
    o.stroke();
    o.fillStyle = cores[0];
    o.beginPath();
    o.moveTo(x + r, y + dy - 22);
    o.quadraticCurveTo(x + r + 9, y + dy - 22 + onda, x + r + 18, y + dy - 21);
    o.lineTo(x + r + 18, y + dy - 10);
    o.quadraticCurveTo(x + r + 9, y + dy - 11 + onda, x + r, y + dy - 11);
    o.fill();
    o.fillStyle = cores[1];
    o.fillRect(x + r, y + dy - 17 + onda * 0.3, 18, 2.5);
  }
}
