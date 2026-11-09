import { beforeEach, describe, expect, it, vi } from 'vitest';

function armazenamentoFalso() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

async function carregar() {
  vi.resetModules();
  vi.stubGlobal('localStorage', armazenamentoFalso());
  return import('./estado');
}

describe('apelido por faixa etária', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('apelidoDoCard só vale para 16+', async () => {
    const e = await carregar();
    e.prefs.set({ time: 'flamengo', apelido: 'Zé' });
    expect(e.apelidoDoCard()).toBeUndefined(); // sem resposta
    e.guardarFaixa('16_17');
    expect(e.apelidoDoCard()).toBe('Zé');
    e.guardarFaixa('18_mais');
    expect(e.apelidoDoCard()).toBe('Zé');
  });

  it('guardarFaixa("menos_16") apaga o apelido do aparelho', async () => {
    const e = await carregar();
    e.prefs.set({ time: 'flamengo', apelido: 'Zé', apelidoConferido: false });
    e.guardarFaixa('menos_16');
    expect(e.prefs.get().apelido).toBeUndefined();
    expect(e.prefs.get().apelidoConferido).toBeUndefined();
    expect(e.prefs.get().time).toBe('flamengo');
  });
});
