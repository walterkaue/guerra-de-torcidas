// Proposta de "sala leve" para o nível Leve (só dev: /dev/sons.html). NÃO está no jogo: o Kauê ouve e decide.
// O estádio de hoje é um convolver com 2,4 s de resposta estéreo; no Android fraco ele pesa no áudio a partida toda.
// As duas propostas mantêm o som seco e os dois ecos de arquibancada (a parte que mais se ouve) e trocam só o estádio.

import { APITO, CHUTE, FINAL, SALA, saidaComAmbiente } from '../jogo/som';

export type VarianteSala = 'hoje' | 'curta' | 'ecos';

export const NOME_DA_SALA: Record<VarianteSala, string> = {
  hoje: 'Hoje (estádio de 2,4 s)',
  curta: 'Leve A: estádio de 1,2 s, mono',
  ecos: 'Leve B: estádio feito de 4 ecos, sem convolver',
};

const salas = new WeakMap<BaseAudioContext, Map<VarianteSala, AudioNode>>();

function filtro(a: BaseAudioContext, freq: number): BiquadFilterNode {
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = 0.7;
  return f;
}

/** O seco e os dois ecos de hoje, iguais; devolve a entrada e onde ligar o estádio. */
function secoEEcos(a: BaseAudioContext): { entrada: GainNode; paraEstadio: GainNode } {
  const entrada = a.createGain();
  const seco = a.createGain();
  seco.gain.value = SALA.seco;
  entrada.connect(seco).connect(a.destination);
  const paraEstadio = a.createGain();
  entrada.connect(paraEstadio);
  for (const e of SALA.ecos) {
    const atraso = a.createDelay(1);
    atraso.delayTime.value = e.t;
    const abafa = filtro(a, e.corte);
    const volta = a.createGain();
    volta.gain.value = SALA.volta;
    const eco = a.createGain();
    eco.gain.value = e.vol;
    entrada.connect(atraso);
    atraso.connect(abafa);
    abafa.connect(volta);
    volta.connect(atraso);
    abafa.connect(eco);
    const p = a.createStereoPanner();
    p.pan.value = e.lado;
    eco.connect(p).connect(a.destination);
    eco.connect(paraEstadio);
  }
  return { entrada, paraEstadio };
}

/** Leve A: o mesmo estádio, com metade da resposta e um canal só (cerca de 1/4 da conta do convolver). */
function salaCurta(a: BaseAudioContext): AudioNode {
  const { entrada, paraEstadio } = secoEEcos(a);
  const comp = Math.floor(a.sampleRate * 1.2);
  const resposta = a.createBuffer(1, comp, a.sampleRate);
  const d = resposta.getChannelData(0);
  const mudos = Math.floor(a.sampleRate * 0.018);
  for (let i = mudos; i < comp; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / comp, SALA.estadio.queda);
  const conv = a.createConvolver();
  conv.buffer = resposta;
  const estadio = a.createGain();
  estadio.gain.value = SALA.estadio.vol;
  paraEstadio.connect(conv).connect(filtro(a, SALA.estadio.corte)).connect(estadio).connect(a.destination);
  return entrada;
}

/** Leve B: o estádio vira 4 ecos curtos com realimentação (cauda de ~1,2 s), dois de cada lado. Sem convolver. */
function salaDeEcos(a: BaseAudioContext): AudioNode {
  const { entrada, paraEstadio } = secoEEcos(a);
  const abafa = filtro(a, SALA.estadio.corte);
  paraEstadio.connect(abafa);
  const cauda = 1.2;
  [0.0297, 0.0371, 0.0411, 0.0437].forEach((t, i) => {
    const atraso = a.createDelay(0.1);
    atraso.delayTime.value = t;
    const volta = a.createGain();
    volta.gain.value = Math.pow(10, (-3 * t) / cauda);
    const sai = a.createGain();
    sai.gain.value = SALA.estadio.vol * 0.35;
    const p = a.createStereoPanner();
    p.pan.value = i % 2 ? 0.4 : -0.4;
    abafa.connect(atraso);
    atraso.connect(volta).connect(atraso);
    atraso.connect(sai).connect(p).connect(a.destination);
  });
  return entrada;
}

/** A entrada da sala pedida (uma por AudioContext e variante). */
export function salaVariante(a: BaseAudioContext, v: VarianteSala): AudioNode {
  if (v === 'hoje') return saidaComAmbiente(a);
  let porVariante = salas.get(a);
  if (!porVariante) salas.set(a, (porVariante = new Map()));
  const feita = porVariante.get(v);
  if (feita) return feita;
  const nova = v === 'curta' ? salaCurta(a) : salaDeEcos(a);
  porVariante.set(v, nova);
  return nova;
}

/** Demonstração para ouvir a sala: o apito final (os 3 sopros, com trinado) e, depois, 3 chutes secos de couro. */
export function tocarDemoNaSala(a: AudioContext, v: VarianteSala): void {
  const sala = salaVariante(a, v);
  const t = a.currentTime + 0.05;
  for (const [ini, dur] of FINAL) {
    const o = a.createOscillator();
    o.frequency.value = APITO.freq;
    const lfo = a.createOscillator();
    lfo.frequency.value = APITO.trinado;
    const desvio = a.createGain();
    desvio.gain.value = APITO.desvio;
    lfo.connect(desvio).connect(o.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t + ini);
    g.gain.exponentialRampToValueAtTime(APITO.vol, t + ini + APITO.ataque);
    g.gain.setValueAtTime(APITO.vol, t + ini + dur - APITO.solta);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ini + dur);
    o.connect(g).connect(sala);
    for (const n of [o, lfo]) {
      n.start(t + ini);
      n.stop(t + ini + dur);
    }
  }
  for (let k = 0; k < 3; k++) {
    const tc = t + 2.2 + k * 0.9;
    const o = a.createOscillator();
    o.frequency.setValueAtTime(CHUTE.dobro.f0, tc);
    o.frequency.exponentialRampToValueAtTime(CHUTE.dobro.f1, tc + CHUTE.dobro.desce);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, tc);
    g.gain.exponentialRampToValueAtTime(0.8, tc + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, tc + 0.12);
    o.connect(g).connect(sala);
    o.start(tc);
    o.stop(tc + 0.14);
  }
}
