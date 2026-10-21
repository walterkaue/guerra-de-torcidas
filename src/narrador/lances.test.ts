import { describe, expect, it } from 'vitest';
import type { ResultadoLance } from '../jogo/lances';
import { etiquetasDoLance, eventoDoLance } from './lance';

const base: ResultadoLance = {
  desfecho: 'gol',
  x: 0.8,
  y: 0.8,
  zonaBola: 5,
  cavadinha: false,
  angulo: true,
  raspouTrave: false,
  recriou: false,
  goleiroX: -0.15,
  tFim: 1,
  pontos: 23,
};

describe('narrador dos Lances', () => {
  it('barreira e lance recriado têm frase própria', () => {
    expect(eventoDoLance({ ...base, desfecho: 'barreira', pontos: 0 })).toBe('lance_barreira');
    expect(eventoDoLance({ ...base, recriou: true })).toBe('lance_recriou');
  });

  it('o resto segue a prioridade da cobrança', () => {
    expect(eventoDoLance(base)).toBe('gol_angulo');
    expect(eventoDoLance({ ...base, raspouTrave: true })).toBe('trave_gol');
    expect(eventoDoLance({ ...base, cavadinha: true })).toBe('cavadinha');
    expect(eventoDoLance({ ...base, cavadinha: true, desfecho: 'defesa' })).toBe('cavadinha_falhou');
    expect(eventoDoLance({ ...base, desfecho: 'defesa' })).toBe('goleiro_pegou');
    expect(eventoDoLance({ ...base, desfecho: 'fora', y: 1.3 })).toBe('fora_cima');
    expect(eventoDoLance({ ...base, desfecho: 'fora', x: 1.3, y: 0.5 })).toBe('fora_lado');
  });

  it('etiquetas de lugar e do lado do goleiro', () => {
    expect([...etiquetasDoLance(base)].sort()).toEqual(['alto', 'canto', 'goleiro_outro_lado']);
    expect(etiquetasDoLance({ ...base, goleiroX: 0.7 }).has('goleiro_outro_lado')).toBe(false);
  });
});
