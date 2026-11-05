// Qual tela dos Lances mostrar (telas/corte.ts): a fronteira de segunda 16/11/2026, 0h de Brasília, e o
// ?corte=depois|antes que só vale em desenvolvimento (no vitest, import.meta.env.DEV é true).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lancesUnificados } from './corte';

const comBusca = (search: string) => vi.stubGlobal('location', { search });

afterEach(() => vi.unstubAllGlobals());

describe('lancesUnificados', () => {
  it('pela hora de Brasília: domingo 23h59 ainda é a tela de antes; segunda 0h já é a nova', () => {
    comBusca('');
    expect(lancesUnificados(new Date('2026-11-16T02:59:59.999Z'))).toBe(false);
    expect(lancesUnificados(new Date('2026-11-16T03:00:00.000Z'))).toBe(true);
    expect(lancesUnificados(new Date('2026-12-01T12:00:00.000Z'))).toBe(true);
  });

  it('?corte=depois e ?corte=antes fingem o relógio (só em desenvolvimento)', () => {
    comBusca('?lancesFalsos&corte=depois');
    expect(lancesUnificados(new Date('2026-11-05T12:00:00.000Z'))).toBe(true);
    comBusca('?corte=antes');
    expect(lancesUnificados(new Date('2026-11-20T12:00:00.000Z'))).toBe(false);
    comBusca('?corte=qualquer');
    expect(lancesUnificados(new Date('2026-11-05T12:00:00.000Z'))).toBe(false);
  });
});
