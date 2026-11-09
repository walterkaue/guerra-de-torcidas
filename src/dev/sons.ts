// Apito e chute, antes e depois, lado a lado (só dev: /dev/sons.html). Abra no celular e ouça no alto-falante.
// "Antes" são cópias dos sons antigos; "depois" são os de src/jogo/som.ts (com variação de tom e volume).

import { tocarApitoEm, tocarChuteEm } from '../jogo/som';

let ctx: AudioContext | null = null;
function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function apitoAntes(a: AudioContext, longo: boolean): void {
  const t = a.currentTime;
  const o = a.createOscillator();
  const lfo = a.createOscillator();
  const lfoGanho = a.createGain();
  const g = a.createGain();
  o.frequency.value = 2900;
  lfo.frequency.value = 28;
  lfoGanho.gain.value = 180;
  lfo.connect(lfoGanho).connect(o.frequency);
  const dur = longo ? 0.9 : 0.35;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
  g.gain.setValueAtTime(0.18, t + dur - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur);
  lfo.stop(t + dur);
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

const LINHAS: Array<[string, string, (a: AudioContext) => void, (a: AudioContext) => void]> = [
  ['Apito curto (começo)', 'Apito', (a) => apitoAntes(a, false), (a) => tocarApitoEm(a, false)],
  ['Apito longo (fim)', 'Apito', (a) => apitoAntes(a, true), (a) => tocarApitoEm(a, true)],
  ['Chute', 'Chute', chuteAntes, tocarChuteEm],
];

document.body.style.cssText =
  'margin:0;padding:16px;background:#0b3d1f;color:#f5f5f0;font-family:Barlow,system-ui,sans-serif';
document.body.innerHTML = `<h1 style="font-size:20px;margin:0 0 4px">Sons: antes e depois</h1>
<p style="margin:0 0 16px;opacity:.8">Toque várias vezes no "Depois": o tom e o volume mudam um pouco a cada toque.</p>`;

for (const [titulo, , antes, depois] of LINHAS) {
  const bloco = document.createElement('section');
  bloco.style.cssText = 'margin-bottom:20px';
  bloco.innerHTML = `<h2 style="font-size:16px;margin:0 0 8px">${titulo}</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"></div>`;
  const grade = bloco.lastElementChild as HTMLElement;
  for (const [rotulo, fn] of [
    ['Antes', antes],
    ['Depois', depois],
  ] as const) {
    const b = document.createElement('button');
    b.textContent = rotulo;
    b.style.cssText =
      'min-height:64px;font:700 18px inherit;border:0;border-radius:12px;background:#f5f5f0;color:#0b3d1f;touch-action:manipulation';
    b.addEventListener('click', () => fn(audio()));
    grade.append(b);
  }
  document.body.append(bloco);
}
