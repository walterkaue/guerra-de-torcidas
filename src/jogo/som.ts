// Sons sintetizados com Web Audio: nenhum arquivo para baixar.

import { prefs } from '../estado';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (prefs.get().mudo) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Chamar num toque do usuário para destravar o áudio no iPhone. */
export function destravarSom(): void {
  audio();
}

function ruido(a: AudioContext, duracao: number): AudioBufferSourceNode {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * duracao), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

export function somChute(): void {
  const a = audio();
  if (!a) return;
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

/** Bola na trave: "plém" metálico curto (dois tons agudos que somem rápido). */
export function somTrave(): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  for (const [freq, vol] of [
    [1320, 0.35],
    [2170, 0.2],
  ] as const) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.36);
  }
}

/** Barulho de torcida: forte para gol/defesa, curto para "uuuh". */
export function somTorcida(intensidade: 'festa' | 'uuuh'): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const dur = intensidade === 'festa' ? 1.8 : 0.9;
  const src = ruido(a, dur);
  const filtro = a.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = intensidade === 'festa' ? 900 : 500;
  filtro.Q.value = 0.6;
  const g = a.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(intensidade === 'festa' ? 0.5 : 0.25, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filtro).connect(g).connect(a.destination);
  src.start(t);
}

export function somApito(longo = false): void {
  const a = audio();
  if (!a) return;
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
