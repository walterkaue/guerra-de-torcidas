// Sons sintetizados com Web Audio. A rede é o único som gravado (src/jogo/sons/rede.wav); o resto é feito por código.

import { prefs } from '../estado';
import urlRede from './sons/rede.wav?url';

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
  void carregarRede();
}

let redePronta: Promise<AudioBuffer | null> | null = null;
let bufferRede: AudioBuffer | null = null;

/**
 * Baixa e decodifica o som da rede uma vez só (16 KB, também com economia de dados). Só começa no primeiro
 * toque que libera o som. Se falhar, o jogo segue sem esse som e tenta de novo no próximo destravarSom().
 */
export function carregarRede(): Promise<AudioBuffer | null> {
  if (redePronta) return redePronta;
  const a = audio();
  if (!a) return Promise.resolve(null);
  redePronta = fetch(urlRede)
    .then((r) => {
      if (!r.ok) throw new Error(`rede.wav: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((dados) => a.decodeAudioData(dados))
    .then((buf) => {
      bufferRede = buf;
      return buf;
    })
    .catch((e) => {
      console.debug('som da rede indisponível', e);
      redePronta = null;
      return null;
    });
  return redePronta;
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

/** Envelope: (s; v) → (s; v) → …  O primeiro ponto é setValueAtTime, os outros são rampas exponenciais. */
function envelope(p: AudioParam, t: number, pontos: ReadonlyArray<readonly [number, number]>): void {
  pontos.forEach(([s, v], i) => {
    if (i === 0) p.setValueAtTime(v, t + s);
    else p.exponentialRampToValueAtTime(v, t + s);
  });
}

function filtro(a: AudioContext, type: BiquadFilterType, freq: number, q: number): BiquadFilterNode {
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Ruído por uma cadeia de filtros e um ganho com envelope, ligado em `saida`. */
function golpeDeRuido(
  a: AudioContext,
  saida: AudioNode,
  t: number,
  dur: number,
  filtros: BiquadFilterNode[],
  env: ReadonlyArray<readonly [number, number]>,
): void {
  const src = ruido(a, dur);
  const g = a.createGain();
  envelope(g.gain, t, env);
  let no: AudioNode = src;
  for (const f of filtros) {
    no.connect(f);
    no = f;
  }
  no.connect(g);
  g.connect(saida);
  src.start(t);
}

/** Senoide (opcionalmente descendo de f0 para f1 em `desce` s) com envelope, ligada em `saida`. */
function senoide(
  a: AudioContext,
  saida: AudioNode,
  t: number,
  f0: number,
  f1: number | null,
  desce: number,
  env: ReadonlyArray<readonly [number, number]>,
  para: number,
): void {
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== null) o.frequency.exponentialRampToValueAtTime(f1, t + desce);
  envelope(g.gain, t, env);
  o.connect(g);
  g.connect(saida);
  o.start(t);
  o.stop(t + para);
}

/** Números do chute de couro (decididos ouvindo as versões na página de laboratório de som, H01b). */
export const CHUTE = {
  clique: { dur: 0.022, alto: 1500, centro: 3200, q: 0.8, pico: 0.3, fim: 0.012 },
  pof: { dur: 0.095, centro: 650, q: 1.1, corte: 2200, pico: 0.95, ataque: 0.0015, fim: 0.085 },
  grave: { f0: 230, f1: 105, desce: 0.091, pico: 0.42, ataque: 0.002, fim: 0.13, para: 0.15 },
  dobro: { f0: 460, f1: 210, desce: 0.091, pico: 0.357, ataque: 0.002, fim: 0.078, para: 0.098 },
};

/** Camadas comuns do chute e da trave: clique, pof e pancada (grave e dobro). */
function bolaDeCouro(
  a: AudioContext,
  saida: AudioNode,
  t: number,
  c: Pick<typeof CHUTE, 'pof' | 'grave' | 'dobro'> & { clique?: typeof CHUTE.clique },
  tom: number,
  vol: number,
): void {
  if (c.clique) {
    golpeDeRuido(a, saida, t, c.clique.dur, [filtro(a, 'highpass', c.clique.alto, 0.7), filtro(a, 'bandpass', c.clique.centro, c.clique.q)], [
      [0, c.clique.pico * vol],
      [c.clique.fim, 0.0001],
    ]);
  }
  golpeDeRuido(a, saida, t, c.pof.dur, [filtro(a, 'bandpass', c.pof.centro * tom, c.pof.q), filtro(a, 'lowpass', c.pof.corte, 0.7)], [
    [0, 0.0001],
    [c.pof.ataque, c.pof.pico * vol],
    [c.pof.fim, 0.0001],
  ]);
  for (const o of [c.grave, c.dobro]) {
    senoide(a, saida, t, o.f0 * tom, o.f1 * tom, o.desce, [
      [0, 0.0001],
      [o.ataque, o.pico * vol],
      [o.fim, 0.0001],
    ], o.para);
  }
}

/** Chute: bola de couro (clique, pof e pancada); o grave puro quase não sai no celular, por isso o dobro. */
export function tocarChuteEm(a: AudioContext): void {
  const t = a.currentTime;
  const tom = variar(1, 0.06);
  const vol = variar(1, 0.1);
  const saida = a.createGain();
  saida.connect(saidaComAmbiente(a));
  bolaDeCouro(a, saida, t, CHUTE, tom, vol);
}

export function somChute(): void {
  const a = audio();
  if (a) tocarChuteEm(a);
}

/** Bola na rede: a gravação, pela sala, com ±3% no tom. Sem o arquivo carregado, não toca. */
export function tocarRedeEm(a: AudioContext): void {
  if (!bufferRede) return;
  const src = a.createBufferSource();
  src.buffer = bufferRede;
  src.playbackRate.value = variar(1, 0.03);
  src.connect(saidaComAmbiente(a));
  src.start();
}

export function somRede(): void {
  const a = audio();
  if (!a) return;
  if (bufferRede) tocarRedeEm(a);
  else void carregarRede();
}

/** Números da trave: a bola estalando no metal e o anel do poste de alumínio. */
export const TRAVE = {
  volume: 1.297,
  poste: 0.004,
  clique: { dur: 0.02, alto: 1500, centro: 2400, q: 0.8, pico: 0.25, fim: 0.01 },
  pof: { dur: 0.07, centro: 820, q: 0.8, corte: 2200, pico: 0.8, ataque: 0.0015, fim: 0.06 },
  grave: { f0: 250, f1: 125, desce: 0.056, pico: 0.28, ataque: 0.002, fim: 0.08, para: 0.1 },
  dobro: { f0: 500, f1: 250, desce: 0.056, pico: 0.224, ataque: 0.002, fim: 0.048, para: 0.068 },
  contato: { dur: 0.03, centro: 2600, q: 1.2, pico: 0.16, fim: 0.008 },
  /** Modos do poste; `eixo` é a razão do segundo eixo (poste elíptico), 0 = um oscilador só. */
  anel: [
    { freq: 430, vol: 0.2, dur: 0.26, eixo: 1.004 },
    { freq: 1050, vol: 0.1, dur: 0.12, eixo: 1.003 },
    { freq: 1850, vol: 0.05, dur: 0.06, eixo: 0 },
  ],
};

/** Bola na trave: a bola estala no metal e o poste dá um anel curto (antes eram dois tons de sino). */
export function tocarTraveEm(a: AudioContext): void {
  const t = a.currentTime;
  const tom = variar(1, 0.05);
  const afina = variar(1, 0.015);
  const c = TRAVE;
  const saida = a.createGain();
  saida.gain.value = c.volume;
  saida.connect(saidaComAmbiente(a));
  bolaDeCouro(a, saida, t, c, tom, 1);
  const t2 = t + c.poste;
  golpeDeRuido(a, saida, t2, c.contato.dur, [filtro(a, 'bandpass', c.contato.centro, c.contato.q)], [
    [0, c.contato.pico],
    [c.contato.fim, 0.0001],
  ]);
  for (const m of c.anel) {
    const eixos = m.eixo
      ? [
          [1, 0.5],
          [m.eixo, 0.5],
        ]
      : [[1, 1]];
    for (const [razao, parte] of eixos) {
      senoide(a, saida, t2, m.freq * razao * afina, null, 0, [
        [0, 0.0001],
        [0.0015, m.vol * parte],
        [m.dur, 0.0001],
      ], m.dur + 0.02);
    }
  }
}

export function somTrave(): void {
  const a = audio();
  if (a) tocarTraveEm(a);
}

export type JeitoDefesa = 'encaixou' | 'espalmou';

/**
 * Qual defesa toca. Pênaltis: pela zona do goleiro (0 a 5 = linha × 3 + coluna; -1 = não pulou); coluna do meio
 * ou sem pular = encaixou, colunas dos lados = espalmou. Lances: pelo x da bola na linha do gol (-1 a 1);
 * |x| ≤ 1/3 = encaixou.
 */
export function jeitoDaDefesa(origem: { zona: number } | { x: number }): JeitoDefesa {
  if ('zona' in origem) return origem.zona < 0 || origem.zona % 3 === 1 ? 'encaixou' : 'espalmou';
  return Math.abs(origem.x) <= 1 / 3 ? 'encaixou' : 'espalmou';
}

/** Números da defesa do goleiro: Encaixou ("tump" abafado na luva e no peito) e Espalmou (o "PÁ" da luva). */
export const DEFESA = {
  encaixou: {
    volume: 1.26,
    tapa: { dur: 0.04, centro: 1200, q: 1.2, pico: 0.35, fim: 0.03 },
    bola: {
      pof: { dur: 0.1, centro: 420, q: 0.9, corte: 2200, pico: 0.7, ataque: 0.0015, fim: 0.09 },
      grave: { f0: 200, f1: 110, desce: 0.077, pico: 0.35, ataque: 0.002, fim: 0.11, para: 0.13 },
      dobro: { f0: 400, f1: 220, desce: 0.077, pico: 0.28, ataque: 0.002, fim: 0.066, para: 0.086 },
    } as Pick<typeof CHUTE, 'pof' | 'grave' | 'dobro'> & { clique?: typeof CHUTE.clique },
  },
  espalmou: {
    volume: 1.64,
    tapa: { dur: 0.045, centro: 1900, q: 1, pico: 0.7, fim: 0.035 },
    bola: {
      clique: { dur: 0.018, alto: 1500, centro: 3000, q: 0.8, pico: 0.3, fim: 0.008 },
      pof: { dur: 0.07, centro: 700, q: 1, corte: 2200, pico: 0.6, ataque: 0.0015, fim: 0.06 },
      grave: { f0: 240, f1: 130, desce: 0.049, pico: 0.25, ataque: 0.002, fim: 0.07, para: 0.09 },
      dobro: { f0: 480, f1: 260, desce: 0.049, pico: 0.2, ataque: 0.002, fim: 0.042, para: 0.062 },
    } as Pick<typeof CHUTE, 'pof' | 'grave' | 'dobro'> & { clique?: typeof CHUTE.clique },
  },
  /** Segundo toque da bola, no peito, só no Encaixou. */
  peito: { atraso: 0.055, tom: 0.92, vol: 0.45 },
};

/** Defesa: tapa do látex da luva e a bola na luva (no Encaixou, a bola bate de novo no peito). */
export function tocarDefesaEm(a: AudioContext, jeito: JeitoDefesa): void {
  const t = a.currentTime;
  const tom = variar(1, 0.05);
  const vol = variar(1, 0.08);
  const c = DEFESA[jeito];
  const saida = a.createGain();
  saida.gain.value = c.volume;
  saida.connect(saidaComAmbiente(a));
  golpeDeRuido(a, saida, t, c.tapa.dur, [filtro(a, 'bandpass', c.tapa.centro * tom, c.tapa.q), filtro(a, 'highpass', 500, 0.7)], [
    [0, c.tapa.pico * vol],
    [c.tapa.fim, 0.0001],
  ]);
  bolaDeCouro(a, saida, t, c.bola, tom, vol);
  if (jeito === 'encaixou') bolaDeCouro(a, saida, t + DEFESA.peito.atraso, c.bola, tom * DEFESA.peito.tom, vol * DEFESA.peito.vol);
}

export function somDefesa(jeito: JeitoDefesa): void {
  const a = audio();
  if (a) tocarDefesaEm(a, jeito);
}

/** Números da bola na barreira: a bola no peito e o pano da camisa. */
export const BARREIRA = {
  volume: 1.143,
  bola: {
    clique: { dur: 0.018, alto: 1500, centro: 2200, q: 0.8, pico: 0.15, fim: 0.008 },
    pof: { dur: 0.09, centro: 560, q: 1, corte: 2200, pico: 0.85, ataque: 0.0015, fim: 0.08 },
    grave: { f0: 210, f1: 110, desce: 0.07, pico: 0.35, ataque: 0.002, fim: 0.1, para: 0.12 },
    dobro: { f0: 420, f1: 220, desce: 0.07, pico: 0.2975, ataque: 0.002, fim: 0.06, para: 0.08 },
  },
  pano: { dur: 0.09, centro: 1500, q: 0.7, pico: 0.22, ataque: 0.004, fim: 0.08 },
};

/** Bola na barreira: a bola no peito e o pano da camisa (ruído rosa). */
export function tocarBarreiraEm(a: AudioContext): void {
  const t = a.currentTime;
  const tom = variar(1, 0.07);
  const vol = variar(1, 0.1);
  const c = BARREIRA;
  const saida = a.createGain();
  saida.gain.value = c.volume;
  saida.connect(saidaComAmbiente(a));
  bolaDeCouro(a, saida, t, c.bola, tom, vol);
  const rosa = bufferRosa(a);
  const src = a.createBufferSource();
  src.buffer = rosa;
  src.loop = true;
  const g = a.createGain();
  envelope(g.gain, t, [
    [0, 0.0001],
    [c.pano.ataque, c.pano.pico * vol],
    [c.pano.fim, 0.0001],
  ]);
  src.connect(filtro(a, 'bandpass', c.pano.centro, c.pano.q)).connect(g).connect(saida);
  src.start(t, Math.random() * 0.9 * rosa.duration);
  src.stop(t + c.pano.dur);
}

export function somBarreira(): void {
  const a = audio();
  if (a) tocarBarreiraEm(a);
}

/** Ruído rosa (método de Paul Kellet) normalizado para RMS 0,3. `sorteio` devolve 0 a 1 (injetável nos testes). */
export function preencherRuidoRosa(d: Float32Array, sorteio: () => number = Math.random): void {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    const w = sorteio() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    d[i] = v;
    soma += v * v;
  }
  const rms = Math.sqrt(soma / d.length);
  if (rms > 0) for (let i = 0; i < d.length; i++) d[i] = (d[i] * 0.3) / rms;
}

/** Duração do "ôôô" da torcida, em segundos. */
export const DUR_UUUH = 1.95;

/** Quantas amostras tem o sinal lento do "ôôô" (o respiro). */
export function tamanhoRespiro(sampleRate: number): number {
  return Math.ceil(DUR_UUUH * sampleRate) + 1;
}

/** Sinal lento: 4 valores sorteados por segundo entre 0,8 e 1, ligados por cosseno. */
export function preencherRespiro(d: Float32Array, sampleRate: number, sorteio: () => number = Math.random): void {
  const valores: number[] = [];
  for (let n = 0; n < Math.ceil(DUR_UUUH * 4) + 2; n++) valores.push(0.8 + 0.2 * sorteio());
  for (let i = 0; i < d.length; i++) {
    const x = (i / sampleRate) * 4;
    const k = Math.floor(x);
    const f = x - k;
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    d[i] = valores[k] * (1 - s) + valores[k + 1] * s;
  }
}

const rosas = new WeakMap<AudioContext, AudioBuffer>();

function bufferRosa(a: AudioContext): AudioBuffer {
  const feito = rosas.get(a);
  if (feito) return feito;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * 4), a.sampleRate);
  preencherRuidoRosa(buf.getChannelData(0));
  rosas.set(a, buf);
  return buf;
}

/**
 * Torcida: "festa" (gol, defesa, acerto) é o ruído filtrado em 900 Hz; "uuuh" (erro, gol sofrido) é um
 * "ôôô" de arquibancada em estéreo que desce de 500 para 340 Hz e respira. Os dois passam pela sala do apito.
 */
export function tocarTorcidaEm(a: AudioContext, intensidade: 'festa' | 'uuuh'): void {
  const t = a.currentTime;
  const sala = saidaComAmbiente(a);
  if (intensidade === 'festa') {
    const src = ruido(a, 1.8);
    const filtro = a.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 900;
    filtro.Q.value = 0.6;
    const g = a.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.59, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    src.connect(filtro).connect(g).connect(sala);
    src.start(t);
    return;
  }
  // Fonte estéreo: duas fontes de ruído rosa, cada uma também no lado oposto com ganho 0,4.
  const merger = a.createChannelMerger(2);
  const rosa = bufferRosa(a);
  for (const lado of [0, 1]) {
    const src = a.createBufferSource();
    src.buffer = rosa;
    src.loop = true;
    const cruzado = a.createGain();
    cruzado.gain.value = 0.4;
    src.connect(merger, 0, lado);
    src.connect(cruzado).connect(merger, 0, 1 - lado);
    src.start(t, Math.random() * 0.9 * rosa.duration);
    src.stop(t + DUR_UUUH);
  }
  // Vogal: três faixas somadas.
  const resp = a.createGain();
  const vogais: Array<[number, number, number, number | null, number]> = [
    [500, 3, 340, 1.3, 1],
    [950, 4, 720, 1.3, 0.45],
    [1500, 0.5, 1500, null, 0.12],
  ];
  for (const [f0, q, f1, ate, vol] of vogais) {
    const filtro = a.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = q;
    filtro.frequency.setValueAtTime(f0, t);
    if (ate !== null) filtro.frequency.exponentialRampToValueAtTime(f1, t + ate);
    const gv = a.createGain();
    gv.gain.value = vol;
    merger.connect(filtro).connect(gv).connect(resp);
  }
  // Respiro: o volume sobe e desce sozinho entre 0,8 e 1.
  resp.gain.value = 0;
  const lento = a.createBuffer(1, tamanhoRespiro(a.sampleRate), a.sampleRate);
  preencherRespiro(lento.getChannelData(0), a.sampleRate);
  const fonteLenta = a.createBufferSource();
  fonteLenta.buffer = lento;
  fonteLenta.connect(resp.gain);
  fonteLenta.start(t);
  // Envelope e volume.
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.7, t + 0.12);
  env.gain.exponentialRampToValueAtTime(1, t + 0.28);
  env.gain.exponentialRampToValueAtTime(0.8, t + 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
  const volume = a.createGain();
  volume.gain.value = 0.59;
  resp.connect(env).connect(volume).connect(sala);
}

/** Barulho de torcida: a festa (gol, defesa, acerto) ou o "ôôô" que desce (erro, gol sofrido). */
export function somTorcida(intensidade: 'festa' | 'uuuh'): void {
  const a = audio();
  if (a) tocarTorcidaEm(a, intensidade);
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

/** A sala "Arquibancada leve": som seco, dois ecos (um de cada lado) e um estádio de 2,4 s. */
export const SALA = {
  seco: 0.95,
  volta: 0.2,
  ecos: [
    { t: 0.17, corte: 2800, vol: 0.18, lado: -0.55 },
    { t: 0.235, corte: 2400, vol: 0.15, lado: 0.55 },
  ],
  estadio: { seg: 2.4, queda: 3, corte: 4000, vol: 0.12 },
};

/**
 * "Sala" da identidade sonora: um leve eco de arquibancada (duas arquibancadas, uma de cada lado, um pouco
 * abafadas) e um estádio leve. Uma por AudioContext, criada na primeira vez e reaproveitada. Quem quiser a
 * mesma sala liga na entrada que ela devolve.
 */
export function saidaComAmbiente(a: AudioContext): AudioNode {
  const feita = salas.get(a);
  if (feita) return feita;
  const entrada = a.createGain();
  const seco = a.createGain();
  seco.gain.value = SALA.seco;
  entrada.connect(seco);
  seco.connect(a.destination);
  // Estádio: resposta de ruído estéreo que some; 18 ms de silêncio no começo.
  const conv = a.createConvolver();
  const comp = Math.floor(a.sampleRate * SALA.estadio.seg);
  const resposta = a.createBuffer(2, comp, a.sampleRate);
  const mudos = Math.floor(a.sampleRate * 0.018);
  for (let c = 0; c < 2; c++) {
    const d = resposta.getChannelData(c);
    for (let i = mudos; i < comp; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / comp, SALA.estadio.queda);
  }
  conv.buffer = resposta;
  const estadio = a.createGain();
  estadio.gain.value = SALA.estadio.vol;
  const abafaEstadio = filtro(a, 'lowpass', SALA.estadio.corte, 0.7);
  entrada.connect(conv);
  conv.connect(abafaEstadio);
  abafaEstadio.connect(estadio);
  estadio.connect(a.destination);
  // Ecos: cada um com realimentação mais abafada, de um lado, e também alimentando o estádio.
  for (const e of SALA.ecos) {
    const atraso = a.createDelay(1);
    atraso.delayTime.value = e.t;
    const abafa = filtro(a, 'lowpass', e.corte, 0.7);
    const volta = a.createGain();
    volta.gain.value = SALA.volta;
    const eco = a.createGain();
    eco.gain.value = e.vol;
    entrada.connect(atraso);
    atraso.connect(abafa);
    abafa.connect(volta);
    volta.connect(atraso);
    abafa.connect(eco);
    let lado: AudioNode;
    if (typeof a.createStereoPanner === 'function') {
      const p = a.createStereoPanner();
      p.pan.value = e.lado;
      lado = p;
    } else {
      lado = a.createGain();
    }
    eco.connect(lado);
    lado.connect(a.destination);
    eco.connect(conv);
  }
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
