import { describe, expect, it } from 'vitest';
import { DUR_SINAL, anelDoSinal, arrasteVale, instanteDoSinal } from './valendo';

describe('apito = chute liberado', () => {
  it('antes do sinal o arraste não vale (o batedor ainda ajeita a bola)', () => {
    expect(arrasteVale(5000, null)).toBe(false);
    expect(arrasteVale(999, 1000)).toBe(false);
    expect(arrasteVale(1000, 1000)).toBe(true);
    expect(arrasteVale(4000, 1000)).toBe(true);
  });

  it('o sinal sai junto com o som: agora mais a latência do áudio', () => {
    expect(instanteDoSinal(1000, 0.04)).toBeCloseTo(1040);
    expect(instanteDoSinal(1000, 0)).toBe(1000); // mudo ou aparelho que não informa: na hora
    expect(instanteDoSinal(1000, -1)).toBe(1000);
  });

  it('o arraste vale no mesmo instante em que o sinal aparece, nem antes', () => {
    const valendoEm = instanteDoSinal(2000, 0.12);
    expect(arrasteVale(valendoEm - 1, valendoEm)).toBe(false);
    expect(anelDoSinal(-1, false)).toBeNull();
    expect(arrasteVale(valendoEm, valendoEm)).toBe(true);
    expect(anelDoSinal(0, false)).not.toBeNull();
  });

  it('o anel pulsa 2 vezes e some no fim do sinal', () => {
    const começo = anelDoSinal(0, false)!;
    const meioDoPrimeiro = anelDoSinal(DUR_SINAL / 4, false)!;
    const segundo = anelDoSinal(DUR_SINAL / 2, false)!;
    expect(meioDoPrimeiro.escala).toBeGreaterThan(começo.escala);
    expect(meioDoPrimeiro.alfa).toBeLessThan(começo.alfa);
    expect(segundo.escala).toBeCloseTo(começo.escala); // recomeça: 2º pulso
    expect(anelDoSinal(DUR_SINAL, false)).toBeNull();
  });

  it('com movimento reduzido, o anel fica parado o tempo todo', () => {
    const a = anelDoSinal(0, true);
    expect(a).toEqual(anelDoSinal(DUR_SINAL / 2, true));
    expect(a).toEqual(anelDoSinal(DUR_SINAL - 1, true));
    expect(anelDoSinal(DUR_SINAL, true)).toBeNull();
  });
});
