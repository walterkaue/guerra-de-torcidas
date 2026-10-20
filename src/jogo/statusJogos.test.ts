import { describe, expect, it } from 'vitest';
import type { JogoBasico } from './cravaTela';
import { formatarFecha, formatarVolta, linhaPenaltis, statusCrava } from './statusJogos';

const agora = new Date('2026-10-23T12:00:00Z');
const jogo = (id: string, rodada: number, horasAteInicio: number, extra: Partial<JogoBasico> = {}): JogoBasico => ({
  id,
  rodada,
  inicio: new Date(agora.getTime() + horasAteInicio * 3600_000).toISOString(),
  status_api: 'TIMED',
  confirmado_em: null,
  anulado: false,
  ...extra,
});

describe('linha dos Pênaltis', () => {
  it('conta as partidas que ainda valem hoje', () => {
    expect(linhaPenaltis(3, 5)).toBe('faltam 3 partidas que contam hoje');
    expect(linhaPenaltis(1, 5)).toBe('falta 1 partida que conta hoje');
    expect(linhaPenaltis(0, 5)).toBe('hoje só as 5 melhores contam');
    expect(linhaPenaltis(null, 5)).toBe('As 5 melhores do dia contam');
  });
});

describe('relógios dos cards', () => {
  it('volta do Time do Dia', () => {
    expect(formatarVolta((5 * 60 + 12) * 60_000)).toBe('5h 12m');
    expect(formatarVolta(40 * 60_000)).toBe('40m');
    expect(formatarVolta(10_000)).toBe('1m');
  });

  it('fecha do Crava', () => {
    expect(formatarFecha(3 * 3600_000 + 59 * 60_000)).toBe('3h');
    expect(formatarFecha(40 * 60_000)).toBe('40min');
    expect(formatarFecha(80 * 3600_000)).toBe('3 dias');
  });
});

describe('status do Crava', () => {
  const jogos = [jogo('a', 32, 3), jogo('b', 32, 27), jogo('c', 33, 200)];

  it('rodada em foco e o próximo palpite que tranca', () => {
    expect(statusCrava(jogos, null, 99, agora)).toEqual({ rodada: 32, linha: '32ª rodada · 1º jogo em 3h', cravado: false, ensaio: true });
  });

  it('cravado só com todos os jogos abertos palpitados', () => {
    expect(statusCrava(jogos, new Set(['a']), 34, agora)?.cravado).toBe(false);
    expect(statusCrava(jogos, new Set(['a', 'b']), 34, agora)).toEqual({ rodada: 32, linha: 'Cravado ✓', cravado: true, ensaio: true });
    expect(statusCrava(jogos, new Set(['a', 'b']), 32, agora)?.ensaio).toBe(false);
  });

  it('depois do 1º jogo, conta até o próximo', () => {
    const meio = [jogo('a', 32, -1), jogo('b', 32, 2)];
    expect(statusCrava(meio, new Set(), 99, agora)?.linha).toBe('32ª rodada · próximo jogo em 2h');
  });

  it('jogo já começado não conta; sem jogo aberto, bola rolando', () => {
    const rolando = [jogo('a', 32, -1), jogo('b', 32, -2)];
    expect(statusCrava(rolando, new Set(), 99, agora)?.linha).toBe('32ª rodada · bola rolando');
    expect(statusCrava([jogo('a', 32, -1), jogo('b', 32, 5)], new Set(['b']), 99, agora)?.linha).toBe('Cravado ✓');
  });

  it('sem jogos', () => {
    expect(statusCrava([], null, 99, agora)).toBeNull();
  });
});
