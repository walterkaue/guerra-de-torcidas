// Vitrine dos bonecos (só em desenvolvimento: /dev/bonecos.html). Mostra todas as poses-chave com
// várias aparências, no tamanho grande e no tamanho do celular (80 px de altura).

import { TIMES } from '../dados/times';
import {
  AJEITARES,
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
  type VarianteAjeitar,
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
const rolagem = document.createElement('div');
rolagem.style.cssText = 'overflow-x:auto;max-width:100vw';
rolagem.append(canvas);
document.body.append(rolagem);
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

// ---------- Ajeitar a bola: as variações lado a lado, em loop (boneco de costas atrás da bola) ----------
(() => {
  const secao = document.createElement('section');
  secao.style.cssText = 'padding:12px 16px;color:#fff;font:14px sans-serif;max-width:100vw;box-sizing:border-box';
  secao.innerHTML = '<h2 style="margin:0 0 4px;font-size:18px">Ajeitar a bola</h2>';
  const botao = document.createElement('button');
  botao.textContent = 'Ver de novo';
  botao.style.cssText = 'margin:6px 0 10px;padding:10px 16px;font-size:15px;border-radius:8px;border:0;background:#ffd23f;color:#111;font-weight:700';
  secao.append(botao);
  const grade = document.createElement('div');
  grade.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
  secao.append(grade);
  rolagem.before(secao);

  const larg = 170;
  const alt = 190;
  const PAUSA = 700;
  const boneco = criarBoneco(gente[0], uniformes.jogador, false);
  const pose = novaPose();
  const fichas = (Object.keys(AJEITARES) as VarianteAjeitar[]).map((nome) => {
    const caixa = document.createElement('div');
    caixa.style.cssText = 'background:#0f4a26;border-radius:10px;overflow:hidden';
    const cv = document.createElement('canvas');
    cv.width = larg * dpr;
    cv.height = alt * dpr;
    cv.style.cssText = `width:100%;aspect-ratio:${larg}/${alt};display:block`;
    const legenda = document.createElement('div');
    legenda.style.cssText = 'padding:4px 8px 6px';
    legenda.textContent = `${nome} · ${AJEITARES[nome].dur} ms`;
    caixa.append(cv, legenda);
    grade.append(caixa);
    return { nome, cv, ctx: cv.getContext('2d')!, legenda };
  });

  let t0 = performance.now();
  botao.onclick = () => (t0 = performance.now());
  const fixo = Number(parametros.get('ajeitarMs'));
  const quadro = () => {
    const agora = fixo > 0 ? fixo : performance.now() - t0;
    for (const f of fichas) {
      const v = AJEITARES[f.nome];
      const ms = fixo > 0 ? fixo : agora % (v.dur + PAUSA);
      v.pose(Math.min(ms, v.dur + 1), pose);
      const g = f.ctx;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#0f4a26';
      g.fillRect(0, 0, larg, alt);
      const perto = v.perto(Math.min(ms, v.dur));
      const x = larg / 2;
      const chao = alt - 26 + (1 - perto) * 16; // ao se afastar, o batedor vem para a câmera
      // bola (mais longe, à frente do batedor)
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath();
      g.ellipse(x, alt - 52, 10, 3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x, alt - 62, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#222';
      g.beginPath();
      g.arc(x, alt - 62, 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.32)';
      g.beginPath();
      g.ellipse(x, chao, 24, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.translate(x, chao);
      g.scale(1.6, 1.6);
      desenharBoneco(g, boneco, pose);
      g.restore();
    }
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
})();
