import { describe, expect, it } from 'vitest';
import type { JogoBasico } from './cravaTela';
import { faltamDosLances, formatarFecha, formatarVolta, linhaLancesUnificados, statusCrava } from './statusJogos';

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

describe('linha dos Lances na regra nova', () => {
  it('faltam = limite - feitas, nunca negativo, null sem resposta', () => {
    expect(faltamDosLances({ feitas: 4, limite: 10 })).toBe(6);
    expect(faltamDosLances({ feitas: 12, limite: 10 })).toBe(0);
    expect(faltamDosLances({ feitas: 0, limite: 0 })).toBeNull();
    expect(faltamDosLances(null)).toBeNull();
  });
  it('conta as partidas valendo de hoje', () => {
    expect(linhaLancesUnificados(6, 3)).toBe('faltam 6 partidas valendo hoje');
    expect(linhaLancesUnificados(1, 3)).toBe('falta 1 partida valendo hoje');
    expect(linhaLancesUnificados(0, 3)).toBe('Já jogou as 10 valendo de hoje. Agora é treino, pra calibrar o pé.');
    expect(linhaLancesUnificados(null, 3)).toBe('As 3 melhores do dia contam');
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
    expect(statusCrava(jogos, null, agora)).toEqual({ rodada: 32, linha: '32ª rodada · 1º jogo em 3h', cravado: false });
  });

  it('cravado só com todos os jogos abertos palpitados', () => {
    expect(statusCrava(jogos, new Set(['a']), agora)?.cravado).toBe(false);
    expect(statusCrava(jogos, new Set(['a', 'b']), agora)).toEqual({ rodada: 32, linha: 'Palpite salvo ✓', cravado: true });
  });

  it('depois do 1º jogo, conta até o próximo', () => {
    const meio = [jogo('a', 32, -1), jogo('b', 32, 2)];
    expect(statusCrava(meio, new Set(), agora)?.linha).toBe('32ª rodada · próximo jogo em 2h');
  });

  it('jogo já começado não conta; sem jogo aberto, bola rolando', () => {
    const rolando = [jogo('a', 32, -1), jogo('b', 32, -2)];
    expect(statusCrava(rolando, new Set(), agora)?.linha).toBe('32ª rodada · bola rolando');
    expect(statusCrava([jogo('a', 32, -1), jogo('b', 32, 5)], new Set(['b']), agora)?.linha).toBe('Palpite salvo ✓');
  });

  it('sem jogos', () => {
    expect(statusCrava([], null, agora)).toBeNull();
  });
});
