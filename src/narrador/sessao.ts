// Narrador de uma partida: junta o contexto do time, as frases já usadas e o histórico do aparelho.
// O sorteio usa Math.random (gerador próprio do narrador), nunca a semente da partida.

import { ID_OUTRO, rivalDe, type Time } from '../dados/times';
import { escolherFrase, type ContextoNarrador } from './escolher';
import type { EventoNarrador } from './frases';
import { lerRecentes, registrarVista } from './historico';

export interface Narrador {
  falar(evento: EventoNarrador, extra?: Partial<ContextoNarrador>): string | null;
}

export function contextoDoTime(time: Time, apelido?: string): ContextoNarrador {
  if (time.id === ID_OUTRO) return { apelido };
  const rival = rivalDe(time);
  return {
    time: { nome: time.nome, artigo: time.artigo },
    rival: rival ? { nome: rival.nome, artigo: rival.artigo } : undefined,
    apelido,
  };
}

export function criarNarrador(time: Time, apelido?: string, rng: () => number = Math.random): Narrador {
  const base = contextoDoTime(time, apelido);
  const usadas = new Set<string>();
  return {
    falar(evento, extra = {}) {
      const f = escolherFrase(evento, { ...base, ...extra, usadas, recentes: lerRecentes() }, rng);
      if (!f) return null;
      usadas.add(f.id);
      registrarVista(f.id);
      return f.texto;
    },
  };
}
