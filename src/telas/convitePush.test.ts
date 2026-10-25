import { describe, expect, it } from 'vitest';
import { podeConvidar } from './convitePush';

const DIA = 24 * 3600_000;

describe('convite para o aviso de domingo', () => {
  it('só convida quem ainda não respondeu ao navegador e não viu o convite nos últimos 14 dias', () => {
    const agora = 100 * DIA;
    expect(podeConvidar(agora, 0, 'default')).toBe(true);
    expect(podeConvidar(agora, agora - 13 * DIA, 'default')).toBe(false);
    expect(podeConvidar(agora, agora - 14 * DIA, 'default')).toBe(true);
    expect(podeConvidar(agora, 0, 'denied')).toBe(false); // recusou: nunca mais insiste
    expect(podeConvidar(agora, 0, 'granted')).toBe(false); // já liberou
  });
});
