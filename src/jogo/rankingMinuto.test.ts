import { describe, expect, it } from 'vitest';
import { tabelaIncluiPartida } from './rankingMinuto';

describe('tabela do minuto inclui a partida', () => {
  it('só a conta que começou depois de gravar a partida', () => {
    const gravada = '2026-11-02T15:00:10.000Z';
    expect(tabelaIncluiPartida('2026-11-02T15:01:00.004+00:00', gravada)).toBe(true);
    expect(tabelaIncluiPartida('2026-11-02T15:00:00.004+00:00', gravada)).toBe(false);
    expect(tabelaIncluiPartida(gravada, gravada)).toBe(false);
  });

  it('sem uma das horas, não dá para saber', () => {
    expect(tabelaIncluiPartida(null, '2026-11-02T15:00:10.000Z')).toBe(false);
    expect(tabelaIncluiPartida('2026-11-02T15:01:00Z', undefined)).toBe(false);
    expect(tabelaIncluiPartida('ontem', '2026-11-02T15:00:10.000Z')).toBe(false);
  });
});
