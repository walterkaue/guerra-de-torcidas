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

/** Variação de ±pct (0,1 = ±10%) em torno de base. `r` é um sorteio de 0 a 1 (injetável nos testes). */
export function variar(base: number, pct = 0.1, r: number = Math.random()): number {
  return base * (1 + (r * 2 - 1) * pct);
}

/** Chute: estalo médio (500 Hz a 4 kHz), que o alto-falante do celular reproduz. */
export function tocarChuteEm(a: AudioContext): void {
  const t = a.currentTime;
  const tom = variar(1, 0.1);
  const vol = variar(1, 0.15);
  // Estalo: ruído filtrado na faixa média.
  const src = ruido(a, 0.1);
  const filtro = a.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 1500 * tom;
  filtro.Q.value = 0.7;
  const g = a.createGain();
  g.gain.setValueAtTime(0.9 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  src.connect(filtro).connect(g).connect(a.destination);
  src.start(t);
  // Corpo: tom curto que desce, sem sair da faixa.
  const o = a.createOscillator();
  const go = a.createGain();
  o.frequency.setValueAtTime(900 * tom, t);
  o.frequency.exponentialRampToValueAtTime(550 * tom, t + 0.06);
  go.gain.setValueAtTime(0.5 * vol, t);
  go.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.connect(go).connect(a.destination);
  o.start(t);
  o.stop(t + 0.09);
}

export function somChute(): void {
  const a = audio();
  if (a) tocarChuteEm(a);
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

/** Apito: duas notas curtas (1,5 a 2 kHz), agudos cortados, sem trinado. */
export function tocarApitoEm(a: AudioContext, longo = false): void {
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

export function somApito(longo = false): void {
  const a = audio();
  if (a) tocarApitoEm(a, longo);
}
