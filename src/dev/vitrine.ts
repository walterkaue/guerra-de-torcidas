// Vitrine dos bonecos (só em desenvolvimento: /dev/bonecos.html). Mostra todas as poses-chave com
// várias aparências, no tamanho grande e no tamanho do celular (80 px de altura).

import { TIMES } from '../dados/times';
import {
  GOLEIRO,
  POSES_DO_BATEDOR,
  TONS_DE_PELE,
  criarBoneco,
  desenharBoneco,
  novaPose,
  poseAjeitando,
  poseChute,
  poseCorrida,
  uniformesDaPartida,
  type Aparencia,
  type Cabelo,
} from '../telas/bonecos';

const parametros = new URLSearchParams(location.search);
const time = TIMES.find((t) => t.id === parametros.get('time')) ?? TIMES[9];
const escala = Number(parametros.get('escala')) || 1.5;

const cabelos: Cabelo[] = ['raspado', 'curto', 'crespo', 'trancas', 'coque', 'rabo', 'comprido'];
const gente: Aparencia[] = cabelos.map((cabelo, i) => ({
  pele: TONS_DE_PELE[(i * 2) % TONS_DE_PELE.length],
  cabelo,
  corCabelo: ['#17110d', '#2b1d14', '#4a2f1d', '#6e4a2c', '#a8783f', '#c99c5e', '#17110d'][i],
  mulher: i % 2 === 1 || cabelo === 'rabo',
}));

// ?poses=parado,goleiro.pronto mostra só essas linhas; ?gente=3 limita as colunas.
const filtro = parametros.get('poses')?.split(',');
// Quadros intermediários das animações (onde aparecem pernas abrindo, braços sumindo etc.).
const animados: [string, Float32Array, boolean][] = [];
for (const ms of [0, 115, 230, 345, 460, 600, 750]) animados.push([`anim.corrida.${ms}`, poseCorrida(ms, 900, novaPose()), false]);
for (const ms of [100, 300, 700, 850]) animados.push([`anim.ajeitando.${ms}`, poseAjeitando(ms, novaPose()), false]);
for (const ms of [100, 170, 260, 400]) animados.push([`anim.chute.${ms}`, poseChute(ms, false, novaPose()), false]);

const linhas: [string, Float32Array, boolean][] = [
  ...animados,
  ...Object.entries(POSES_DO_BATEDOR).map(([n, p]) => [`batedor.${n}`, p, false] as [string, Float32Array, boolean]),
  ...Object.entries(GOLEIRO).map(([n, p]) => [`goleiro.${n}`, p, true] as [string, Float32Array, boolean]),
].filter(([nome]) => !filtro || filtro.some((f) => nome.endsWith(f)));
gente.splice(Number(parametros.get('gente')) || gente.length);

const cel = 120 * escala;
const canvas = document.createElement('canvas');
const W = 160 + gente.length * cel;
const H = linhas.length * cel;
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = `${W}px`;
document.body.append(canvas);
const c = canvas.getContext('2d')!;
c.scale(dpr, dpr);
c.fillStyle = '#0f4a26';
c.fillRect(0, 0, W, H);

const uniformes = uniformesDaPartida(time.cores, null, parametros.get('uniforme') === '2' ? 1 : 0);
const linha = gente.map((a) => criarBoneco(a, uniformes.jogador, false));
const goleiros = gente.map((a, i) => criarBoneco(a, i % 2 ? uniformes.goleiroAdversario : uniformes.goleiroJogador, true));

linhas.forEach(([nome, pose, deFrente], l) => {
  c.fillStyle = l % 2 ? '#145a2f' : '#0f4a26';
  c.fillRect(0, l * cel, W, cel);
  c.fillStyle = '#fff';
  c.font = '13px sans-serif';
  c.fillText(nome, 8, l * cel + 18);
  (deFrente ? goleiros : linha).forEach((b, i) => {
    const x = 160 + i * cel + cel / 2;
    const y = l * cel + cel - 12;
    c.fillStyle = 'rgba(0,0,0,0.32)';
    c.beginPath();
    c.ellipse(x, y, 18 * escala, 4 * escala, 0, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(x, y);
    c.scale(escala, escala);
    desenharBoneco(c, b, pose, nome === 'batedor.espera');
    c.restore();
    // Do tamanho do celular (80 px de altura), no canto.
    c.save();
    c.translate(160 + i * cel + 14, y);
    c.scale(0.4, 0.4);
    desenharBoneco(c, b, pose);
    c.restore();
  });
});
