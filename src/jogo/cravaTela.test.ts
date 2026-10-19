import { describe, expect, it } from 'vitest';
import {
  AVISO_RESENHA,
  adiado,
  faseDoJogo,
  horaDoJogo,
  rodadaEmFoco,
  tempoAte,
  textoMeusPalpites,
  textoResultadoRodada,
  type JogoBasico,
} from './cravaTela';

const utc = (s: string) => new Date(`${s}Z`);
const jogo = (o: Partial<JogoBasico>): JogoBasico => ({
  id: 'j',
  rodada: 32,
  inicio: '2026-10-24T19:00:00Z',
  status_api: 'TIMED',
  confirmado_em: null,
  anulado: false,
  ...o,
});

describe('aba Palpites', () => {
  it('fase do jogo pela hora', () => {
    expect(faseDoJogo(jogo({}), utc('2026-10-24T18:59:59'))).toBe('aberto');
    expect(faseDoJogo(jogo({}), utc('2026-10-24T19:00:00'))).toBe('rolando');
    expect(faseDoJogo(jogo({ confirmado_em: '2026-10-24T21:00:00Z' }), utc('2026-10-25T00:00:00'))).toBe('confirmado');
    expect(faseDoJogo(jogo({ anulado: true }), utc('2026-10-25T00:00:00'))).toBe('anulado');
  });

  it('jogo adiado reabre até o novo horário', () => {
    const j = jogo({ status_api: 'POSTPONED', inicio: '2026-11-04T22:00:00Z' });
    expect(adiado(j)).toBe(true);
    expect(faseDoJogo(j, utc('2026-10-24T20:00:00'))).toBe('aberto');
  });

  it('rodada em foco: a primeira que ainda não passou, ignorando um jogo adiado', () => {
    const jogos = [
      ...['2026-10-23T23:00', '2026-10-24T19:00', '2026-10-25T19:00', '2026-12-03T23:00'].map((i) => ({ rodada: 32, inicio: `${i}:00Z` })),
      ...['2026-10-28T23:00', '2026-10-29T23:00', '2026-10-31T19:00'].map((i) => ({ rodada: 33, inicio: `${i}:00Z` })),
    ];
    expect(rodadaEmFoco(jogos, utc('2026-10-22T12:00:00'))).toBe(32);
    expect(rodadaEmFoco(jogos, utc('2026-10-26T12:00:00'))).toBe(32); // segunda: ainda mostra os resultados
    expect(rodadaEmFoco(jogos, utc('2026-10-27T12:00:00'))).toBe(33);
    expect(rodadaEmFoco(jogos, utc('2026-12-20T12:00:00'))).toBe(33);
    expect(rodadaEmFoco([], utc('2026-10-22T12:00:00'))).toBeNull();
  });

  it('horário de Brasília', () => {
    expect(horaDoJogo('2026-10-24T19:00:00Z')).toBe('sáb 24/10 · 16h');
    expect(horaDoJogo('2026-10-24T00:30:00Z')).toBe('sex 23/10 · 21h30');
  });

  it('tempo até a trava', () => {
    expect(tempoAte(40 * 60_000)).toBe('40 minutos');
    expect(tempoAte(65 * 60_000)).toBe('1 hora');
    expect(tempoAte(6.5 * 3600_000)).toBe('6 horas');
  });

  it('cards levam o aviso fixo', () => {
    const meus = textoMeusPalpites(
      32,
      [{ mandante: 'Flamengo', visitante: 'Palmeiras', placar: { m: 2, v: 1 }, certeza: true }],
      'torcida.kauewalter.com.br',
    );
    expect(meus).toContain('Flamengo 2 x 1 Palmeiras ⭐');
    expect(meus).toContain(AVISO_RESENHA);
    expect(meus).not.toContain('%');
    const res = textoResultadoRodada(32, 46, 'pro Flamengo', [{ acerto: 'exato', certeza: true }, { acerto: 'errou', certeza: false }], 'x');
    expect(res).toContain('46 pontos pro Flamengo');
    expect(res).toContain('🎯⭐❌');
    expect(res).toContain(AVISO_RESENHA);
  });
});
