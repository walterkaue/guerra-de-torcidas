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

/**
 * Apito de árbitro: um tom senoidal com trinado (a "bolinha"), 2 semitons abaixo do apito antigo
 * (2.900 Hz, 28 Hz, 180 Hz e 0,35 s, multiplicados ou divididos por 2^(-2/12)). Números decididos
 * ouvindo as versões na página de laboratório de som (H01a).
 */
export const APITO = {
  freq: 2583.6,
  trinado: 24.95,
  desvio: 160.4,
  vol: 0.11,
  volLargada: 0.072,
  ataque: 0.0337,
  solta: 0.0561,
  curto: 0.393,
  largada: 0.16,
};

/** Os três sopros do apito final: [início, duração] em segundos (curto, curto, longo). */
export const FINAL: ReadonlyArray<readonly [number, number]> = [
  [0, 0.18],
  [0.3, 0.18],
  [0.6, 0.9],
];

/** Segundos entre agendar um som e ele sair no alto-falante (0 se o aparelho não informa). */
export function latenciaDoSom(): number {
  if (!ctx) return 0;
  return ctx.outputLatency || ctx.baseLatency || 0;
}

const salas = new WeakMap<AudioContext, AudioNode>();

/**
 * "Sala" da identidade sonora: o som seco mais um eco curto e um estádio leve. Uma por AudioContext,
 * criada na primeira vez e reaproveitada. Quem quiser a mesma sala liga na entrada que ela devolve.
 */
export function saidaComAmbiente(a: AudioContext): AudioNode {
  const feita = salas.get(a);
  if (feita) return feita;
  const entrada = a.createGain();
  const seco = a.createGain();
  seco.gain.value = 0.973;
  entrada.connect(seco).connect(a.destination);
  // Eco com realimentação.
  const atraso = a.createDelay(1);
  atraso.delayTime.value = 0.185;
  const retorno = a.createGain();
  retorno.gain.value = 0.039;
  const eco = a.createGain();
  eco.gain.value = 0.048;
  entrada.connect(atraso);
  atraso.connect(retorno).connect(atraso);
  atraso.connect(eco).connect(a.destination);
  // Estádio: resposta de ruído que some; 18 ms de silêncio no começo.
  const conv = a.createConvolver();
  const comp = Math.floor(a.sampleRate * 2.8);
  const resposta = a.createBuffer(2, comp, a.sampleRate);
  const mudos = Math.floor(a.sampleRate * 0.018);
  for (let c = 0; c < 2; c++) {
    const d = resposta.getChannelData(c);
    for (let i = mudos; i < comp; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / comp, 2.5);
  }
  conv.buffer = resposta;
  const estadio = a.createGain();
  estadio.gain.value = 0.066;
  entrada.connect(conv);
  eco.connect(conv);
  conv.connect(estadio).connect(a.destination);
  salas.set(a, entrada);
  return entrada;
}

/** Um sopro de apito: senoide com trinado, subida rápida e soltura curta. */
function sopro(a: AudioContext, saida: AudioNode, t: number, dur: number, vol: number, tom = 1): void {
  const o = a.createOscillator();
  o.type = 'sine';
  o.frequency.value = APITO.freq * tom;
  const lfo = a.createOscillator();
  lfo.frequency.value = APITO.trinado * tom;
  const desvio = a.createGain();
  desvio.gain.value = APITO.desvio * tom;
  lfo.connect(desvio).connect(o.frequency);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + APITO.ataque);
  g.gain.setValueAtTime(vol, t + dur - APITO.solta);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(saida);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur);
  lfo.stop(t + dur);
}

/** Começo da partida: um sopro. Fim: três (curto, curto, longo). Sempre iguais, sem variação. */
export function tocarApitoEm(a: AudioContext, longo = false): void {
  const t = a.currentTime;
  const saida = saidaComAmbiente(a);
  if (longo) for (const [ini, dur] of FINAL) sopro(a, saida, t + ini, dur, APITO.vol);
  else sopro(a, saida, t, APITO.curto, APITO.vol);
}

export function somApito(longo = false): void {
  const a = audio();
  if (a) tocarApitoEm(a, longo);
}

/** Largada: apito curto e mais baixo antes de cada chute, com o tom variando ±3% para não cansar. */
export function tocarLargadaEm(a: AudioContext): void {
  sopro(a, saidaComAmbiente(a), a.currentTime, APITO.largada, APITO.volLargada, variar(1, 0.03));
}

/** Liga/desliga o apito curto antes de cada chute (a partir do 2º da partida). */
export const LARGADA_LIGADA = true;

export function somLargada(): void {
  if (!LARGADA_LIGADA) return;
  const a = audio();
  if (a) tocarLargadaEm(a);
}
