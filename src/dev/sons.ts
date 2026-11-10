// Apito e chute, antes e depois, lado a lado (só dev: /dev/sons.html). Abra no celular e ouça no alto-falante.
// "Antes" são cópias dos sons antigos; "depois" são os de src/jogo/som.ts (com variação de tom e volume).

import { tocarApitoEm, tocarChuteEm, tocarLargadaEm, variar } from '../jogo/som';

let ctx: AudioContext | null = null;
function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** O apito de duas notas que estava no jogo antes da H01a (triângulo, 1,7 e 1,95 kHz, com variação). */
function apitoAntes(a: AudioContext, longo: boolean): void {
  const t = a.currentTime;
  const tom = variar(1, 0.1);
  const vol = 0.2 * variar(1, 0.15);
  const corte = a.createBiquadFilter();
  corte.type = 'lowpass';
  corte.frequency.value = 2600;
  corte.connect(a.destination);
  const notas: Array<[number, number, number]> = longo
    ? [
        [1700, 0, 0.14],
        [1950, 0.17, 0.55],
      ]
    : [
        [1700, 0, 0.1],
        [1950, 0.13, 0.17],
      ];
  for (const [freq, ini, dur] of notas) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.value = freq * tom;
    g.gain.setValueAtTime(0.0001, t + ini);
    g.gain.exponentialRampToValueAtTime(vol, t + ini + 0.015);
    g.gain.setValueAtTime(vol, t + ini + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ini + dur);
    o.connect(g).connect(corte);
    o.start(t + ini);
    o.stop(t + ini + dur);
  }
}

function chuteAntes(a: AudioContext): void {
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.16);
}

const LINHAS: Array<[string, string, ((a: AudioContext) => void) | null, (a: AudioContext) => void]> = [
  ['Apito de começo', 'Apito', (a) => apitoAntes(a, false), (a) => tocarApitoEm(a, false)],
  ['Apito de fim (três sopros)', 'Apito', (a) => apitoAntes(a, true), (a) => tocarApitoEm(a, true)],
  ['Largada (antes de cada chute)', 'Apito', null, tocarLargadaEm],
  ['Chute', 'Chute', chuteAntes, tocarChuteEm],
];

document.body.style.cssText =
  'margin:0;padding:16px;background:#0b3d1f;color:#f5f5f0;font-family:Barlow,system-ui,sans-serif';
document.body.innerHTML = `<h1 style="font-size:20px;margin:0 0 4px">Sons: antes e depois</h1>
<p style="margin:0 0 16px;opacity:.8">Apito de começo e de fim tocam sempre iguais; a largada varia ±3% no tom; o chute varia como antes.</p>`;

for (const [titulo, , antes, depois] of LINHAS) {
  const bloco = document.createElement('section');
  bloco.style.cssText = 'margin-bottom:20px';
  bloco.innerHTML = `<h2 style="font-size:16px;margin:0 0 8px">${titulo}</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"></div>`;
  const grade = bloco.lastElementChild as HTMLElement;
  const botoes = antes
    ? ([
        ['Antes', antes],
        ['Depois', depois],
      ] as const)
    : ([['Depois', depois]] as const);
  if (!antes) grade.style.gridTemplateColumns = '1fr';
  for (const [rotulo, fn] of botoes) {
    const b = document.createElement('button');
    b.textContent = rotulo;
    b.style.cssText =
      'min-height:64px;font:700 18px inherit;border:0;border-radius:12px;background:#f5f5f0;color:#0b3d1f;touch-action:manipulation';
    b.addEventListener('click', () => fn(audio()));
    grade.append(b);
  }
  document.body.append(bloco);
}
