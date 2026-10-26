// Amostra dos três níveis de qualidade (só dev: /dev/qualidade.html). Desenha o mesmo quadro dos Pênaltis
// e do replay em Alta, Média e Leve, lado a lado, como num celular de densidade 3 (a maioria dos Android
// de hoje). Os recortes ampliam o batedor para a diferença de nitidez aparecer.

import '../style.css';
import { criarBoneco, novaPose, poseParado, sortearAparencia, uniformesDaPartida } from '../telas/bonecos';
import { ENQUADRAMENTOS } from '../telas/camera';
import { criarCena } from '../telas/cena';
import { criarCena3d } from '../telas/cena3d';
import { criarReplay } from '../telas/replay';
import { NIVEIS, definirQualidade, type Nivel } from '../telas/qualidade';
import { caminhoDoChute } from '../jogo/lances';

Object.defineProperty(window, 'devicePixelRatio', { get: () => 3 });
// Sorteio fixo: os três níveis mostram os mesmos bonecos.
let semente = 7;
Math.random = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

const CORES: [string, string] = ['#c8102e', '#111111'];
const W = 390;
const H = 700;
const NOMES: Record<Nivel, string> = { alta: 'Alta', media: 'Média', leve: 'Leve' };

const u = uniformesDaPartida(CORES, null, 0);
const aparencias = { batedor: sortearAparencia(), goleiro: sortearAparencia(), barreira: [0, 1, 2, 3].map(() => sortearAparencia()) };

document.body.style.cssText = 'margin:0;padding:16px;background:#0b3d1f;color:#f5f5f0;font-family:Barlow,system-ui,sans-serif';
document.body.innerHTML = `<div id="linhas" style="display:grid;grid-template-columns:repeat(3,${W}px);gap:16px;align-items:start"></div>`;
const grade = document.getElementById('linhas')!;

function coluna(n: Nivel): HTMLElement {
  const q = NIVEIS[n];
  const el = document.createElement('section');
  el.dataset.nivel = n;
  el.innerHTML = `<h2 style="margin:0 0 4px;font-family:Anton,Impact;font-weight:400;font-size:28px;color:#e9c75a">${NOMES[n]}</h2>
    <p style="margin:0 0 8px;font-size:13px;opacity:.8">Nitidez ${q.dprMax}× · ${Math.round(q.dprMax * q.dprMax * 100) / 100}× pixels por quadro</p>`;
  grade.append(el);
  return el;
}

function canvasCom(el: HTMLElement, w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.style.cssText = `display:block;width:${w}px;height:${h}px;border-radius:12px;margin-bottom:12px`;
  el.append(cv);
  return cv;
}

/** Recorte do canvas (em px de tela) ampliado 3×, com a suavização do navegador, como a tela do celular faria. */
function recorte(el: HTMLElement, fonte: HTMLCanvasElement, dpr: number, x: number, y: number, w: number, h: number): void {
  const cv = document.createElement('canvas');
  cv.width = w * 3;
  cv.height = h * 3;
  cv.style.cssText = `display:block;width:${w * 3}px;height:${h * 3}px;border-radius:12px;margin-bottom:12px;border:2px solid #e9c75a`;
  const c = cv.getContext('2d')!;
  c.imageSmoothingQuality = 'high';
  c.drawImage(fonte, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * 3, h * 3);
  el.append(cv);
}

const agora = 5000;
// ?so=alta desenha um nível só (para tirar a imagem de cada um).
const so = new URLSearchParams(location.search).get('so') as Nivel | null;
for (const n of (so ? [so] : ['alta', 'media', 'leve']) as Nivel[]) {
  definirQualidade(n);
  const q = NIVEIS[n];
  const el = coluna(n);

  // 1. Pênaltis: a cena de TV na hora de mirar (na Alta, no meio da ola).
  const cv = canvasCom(el, W, H);
  const cena = criarCena(cv, { cores: CORES, relogio: () => agora, reduzido: false });
  cena.medir();
  const batedor = criarBoneco(aparencias.batedor, u.jogador, false);
  const goleiro = criarBoneco(aparencias.goleiro, u.goleiroAdversario, true);
  const { c, g } = cena;
  const bx = g.bolaX - g.raio * 3.3;
  const by = g.bolaY + g.raio * 1.5;
  const pose = novaPose();
  const quadro = (t: number) => {
    c.save();
    cena.desenharFundo(t);
    cena.desenharGoleiroNoQuadro(goleiro, null, 0, t);
    cena.desenharTraves();
    cena.desenharBola(g.bolaX, g.bolaY);
    cena.desenharBatedorEm(batedor, bx, by, poseParado(t, pose));
    c.restore();
  };
  // Custo do quadro neste computador, durante o gol (com ola onde houver): só para comparar os níveis.
  const N = 240;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    if (i % 60 === 0 && q.ola) cena.efeitos.ola = agora + i * 16;
    quadro(agora + i * 16);
  }
  const custo = (performance.now() - t0) / N;
  el.querySelector('p')!.textContent += ` · ${custo.toFixed(2)} ms por quadro aqui`;
  // O quadro mostrado: na Alta, no meio da ola.
  if (q.ola) cena.efeitos.ola = agora - 220;
  quadro(agora);
  const dpr = q.dprMax;
  recorte(el, cv, dpr, Math.round(bx - 60), Math.round(by - 150), 120, 160);

  // 2. Replay do gol (falta no ângulo), no meio da câmera lenta.
  const cv3 = canvasCom(el, W, H);
  if (!q.replay) {
    cv3.remove();
    const vazio = document.createElement('div');
    vazio.style.cssText = `width:${W}px;height:${H}px;border-radius:12px;border:2px dashed rgba(245,245,240,.35);display:grid;place-items:center;text-align:center;padding:24px;box-sizing:border-box;margin-bottom:12px`;
    vazio.innerHTML = '<p style="margin:0;font-size:18px;font-weight:700">Sem replay<br><small style="font-weight:400;opacity:.75">o jogo segue direto para a próxima cobrança</small></p>';
    el.append(vazio);
    continue;
  }
  const cena3 = criarCena3d(cv3, { cores: CORES, relogio: () => agora, reduzido: false });
  cena3.medir();
  const bola = { x: 6, z: 24 };
  const em = caminhoDoChute(bola, { dir: -80, forca: 75, efeito: 40 }, -0.85, 0.85, false);
  const fim = em(1);
  const replay = criarReplay(
    cena3,
    {
      bola,
      enquadramento: ENQUADRAMENTOS.falta,
      em,
      voo: 1100,
      cavadinha: false,
      goleiro: { x: 1.5, z: 0.3, alvo: { x: fim.x, y: fim.y }, alcance: 0.55 },
      barreira: { jogadores: 4, miraX: -1 },
      batedor: criarBoneco(aparencias.batedor, u.jogador, false),
      goleiroBoneco: criarBoneco(aparencias.goleiro, u.goleiroAdversario, true),
      bonecosDaBarreira: aparencias.barreira.map((a) => criarBoneco(a, u.adversario, true)),
    },
    0,
  );
  cena3.c.save();
  replay.quadro(2450);
  cena3.c.restore();
}
(window as unknown as Record<string, unknown>).__pronto = true;
