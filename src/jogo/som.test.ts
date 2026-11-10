import { afterEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({ mudo: true, decode: (() => Promise.resolve(null)) as (d: ArrayBuffer) => Promise<unknown> }));
vi.mock('../estado', () => ({ prefs: { get: () => ({ mudo: estado.mudo }) } }));
vi.mock('./sons/rede.wav?url', () => ({ default: '/assets/rede-teste.wav' }));

import {
  APITO,
  carregarRede,
  CHUTE,
  FINAL,
  latenciaDoSom,
  preencherRespiro,
  preencherRuidoRosa,
  SALA,
  somApito,
  somChute,
  somLargada,
  somRede,
  somTorcida,
  somTrave,
  tamanhoRespiro,
  TRAVE,
  variar,
} from './som';
import { PADROES } from '../telas/toque';

const DOIS_SEMITONS = 2 ** (-2 / 12);

describe('variar', () => {
  it('fica dentro de ±10% e cobre os extremos', () => {
    expect(variar(1000, 0.1, 0)).toBeCloseTo(900);
    expect(variar(1000, 0.1, 0.5)).toBeCloseTo(1000);
    expect(variar(1000, 0.1, 1)).toBeCloseTo(1100);
    for (let i = 0; i < 100; i++) {
      const v = variar(1000);
      expect(v).toBeGreaterThanOrEqual(900);
      expect(v).toBeLessThanOrEqual(1100);
    }
  });
});

describe('mudo', () => {
  it('não toca nem falha com o som desligado', () => {
    expect(() => {
      somApito();
      somApito(true);
      somLargada();
      somChute();
      somTrave();
      somRede();
      somTorcida('festa');
      somTorcida('uuuh');
    }).not.toThrow();
  });
  it('sem contexto de áudio a latência é 0', () => {
    expect(latenciaDoSom()).toBe(0);
  });
});

describe('rede (arquivo gravado)', () => {
  class Falso {
    state = 'running';
    createBufferSource = vi.fn();
    decodeAudioData = (d: ArrayBuffer) => estado.decode(d);
  }
  afterEach(() => {
    estado.mudo = true;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('sem o arquivo carregado, somRede não lança erro e não toca', () => {
    estado.mudo = false;
    vi.stubGlobal('AudioContext', Falso);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sem rede'))));
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() => somRede()).not.toThrow();
  });
  it('carregarRede chamado duas vezes faz um fetch e uma decodificação só', async () => {
    estado.mudo = false;
    const buffer = { duration: 0.338 };
    const decode = vi.fn(() => Promise.resolve(buffer));
    estado.decode = decode;
    vi.stubGlobal('AudioContext', Falso);
    const fetchFalso = vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    vi.stubGlobal('fetch', fetchFalso);
    await new Promise((r) => setTimeout(r, 0));
    const [a, b] = await Promise.all([carregarRede(), carregarRede()]);
    expect(a).toBe(buffer);
    expect(b).toBe(buffer);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledWith('/assets/rede-teste.wav');
    expect(decode).toHaveBeenCalledTimes(1);
  });
});

describe('apito', () => {
  it('fica 2 semitons abaixo do apito antigo', () => {
    expect(Math.abs(APITO.freq - 2900 * DOIS_SEMITONS)).toBeLessThan(0.1);
    expect(Math.abs(APITO.trinado - 28 * DOIS_SEMITONS)).toBeLessThan(0.05);
    expect(Math.abs(APITO.desvio - 180 * DOIS_SEMITONS)).toBeLessThan(0.05);
    expect(Math.abs(APITO.curto - 0.35 / DOIS_SEMITONS)).toBeLessThan(0.005);
  });
  it('o final tem três sopros, o último o mais longo, e acaba em 1,5 s', () => {
    expect(FINAL).toHaveLength(3);
    const [a, b, c] = FINAL;
    expect(c[1]).toBeGreaterThan(a[1]);
    expect(c[1]).toBeGreaterThan(b[1]);
    expect(c[0] + c[1]).toBeCloseTo(1.5);
  });
  it('a largada é mais baixa que o apito', () => {
    expect(APITO.volLargada).toBeLessThan(APITO.vol);
  });
});

describe('sala, chute e trave', () => {
  it('a sala tem 2 ecos de arquibancada, um de cada lado, e o estádio é curto', () => {
    expect(SALA.ecos).toHaveLength(2);
    for (const e of SALA.ecos) {
      expect(e.t).toBeGreaterThanOrEqual(0.15);
      expect(e.t).toBeLessThanOrEqual(0.25);
      expect(e.vol).toBeLessThan(0.2);
    }
    expect(Math.sign(SALA.ecos[0].lado)).toBe(-Math.sign(SALA.ecos[1].lado));
    expect(SALA.estadio.seg).toBeLessThan(3);
  });
  it('o anel da trave some antes de 0,3 s e o volume final é 1,297', () => {
    for (const m of TRAVE.anel) expect(TRAVE.poste + m.dur + 0.02).toBeLessThan(0.3);
    expect(TRAVE.volume).toBe(1.297);
  });
  it('o chute acaba em 0,15 s', () => {
    expect(CHUTE.grave.para).toBeLessThanOrEqual(0.15);
    expect(CHUTE.dobro.f0).toBe(CHUTE.grave.f0 * 2);
  });
});

describe('torcida', () => {
  it('o ruído rosa sai com RMS 0,3 e sem NaN', () => {
    const d = new Float32Array(48000);
    preencherRuidoRosa(d);
    const rms = Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length);
    expect(Math.abs(rms - 0.3)).toBeLessThan(0.01);
    expect(d.some((x) => Number.isNaN(x))).toBe(false);
  });
  it('o respiro fica entre 0,8 e 1 e vale o sorteado em cada x inteiro', () => {
    const sr = 1000;
    const sorteios: number[] = [];
    const sorteio = () => {
      const r = (sorteios.length * 0.37) % 1;
      sorteios.push(r);
      return r;
    };
    const d = new Float32Array(tamanhoRespiro(sr));
    preencherRespiro(d, sr, sorteio);
    for (const x of d) {
      expect(x).toBeGreaterThanOrEqual(0.8 - 1e-6);
      expect(x).toBeLessThanOrEqual(1 + 1e-6);
    }
    for (const k of [0, 1, 2, 5]) expect(d[k * 250]).toBeCloseTo(0.8 + 0.2 * sorteios[k], 5);
  });
  it('o respiro com sorteio real fica entre 0,8 e 1', () => {
    const d = new Float32Array(tamanhoRespiro(8000));
    preencherRespiro(d, 8000);
    expect(Math.min(...d)).toBeGreaterThanOrEqual(0.8 - 1e-6);
    expect(Math.max(...d)).toBeLessThanOrEqual(1 + 1e-6);
  });
});

describe('vibração', () => {
  it('nenhum padrão passa de 200 ms vibrando somados', () => {
    for (const p of Object.values(PADROES)) {
      const v = typeof p === 'number' ? p : p.filter((_, i) => i % 2 === 0).reduce((s, x) => s + x, 0);
      expect(v).toBeLessThanOrEqual(200);
    }
  });
  it('o apito final vibra 110 ms em 0,66 s', () => {
    const p = PADROES.apitoFinal as number[];
    expect(p.filter((_, i) => i % 2 === 0).reduce((s, x) => s + x, 0)).toBe(110);
    expect(p.reduce((s, x) => s + x, 0)).toBe(660);
  });
});
