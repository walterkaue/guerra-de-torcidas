import { describe, expect, it } from 'vitest';
import { dificuldadeAgora, periodoDaPartida, semanaBrasilia as semanaServidor } from '../../supabase/functions/_shared/tempo.ts';
import { msAteZerarSemana, semanaBrasilia } from './tempo';

// Horários em UTC; Brasília = UTC−3. Segunda 19/10/2026 00h00 BRT = 03h00 UTC.
const utc = (s: string) => new Date(`${s}Z`);

describe('relógio do servidor (Brasília)', () => {
  it('semana começa na segunda 00h de Brasília', () => {
    expect(semanaServidor(utc('2026-10-19T02:59:00'))).toBe('2026-10-12'); // domingo 23h59 BRT
    expect(semanaServidor(utc('2026-10-19T03:00:00'))).toBe('2026-10-19'); // segunda 00h00 BRT
  });

  it('partida começada antes da virada conta na semana antiga se terminar até 00h05', () => {
    const criada = utc('2026-10-19T02:58:00'); // domingo 23h58
    expect(periodoDaPartida(criada, utc('2026-10-19T03:04:59'))).toEqual({ dia: '2026-10-18', semana: '2026-10-12' });
    expect(periodoDaPartida(criada, utc('2026-10-19T03:05:00'))).toEqual({ dia: '2026-10-19', semana: '2026-10-19' });
    // Começada depois da virada: semana nova, mesmo antes das 00h05.
    expect(periodoDaPartida(utc('2026-10-19T03:01:00'), utc('2026-10-19T03:02:00'))).toEqual({ dia: '2026-10-19', semana: '2026-10-19' });
  });

  it('dificuldade do dia pelo horário de Brasília', () => {
    expect(dificuldadeAgora(utc('2026-10-19T02:59:00'))).toBe(1); // ainda domingo
    expect(dificuldadeAgora(utc('2026-10-19T03:00:00'))).toBe(0); // segunda
  });

  it('celular e servidor concordam na semana', () => {
    for (const h of ['2026-10-19T02:59:00', '2026-10-19T03:00:00', '2026-10-22T15:00:00']) {
      expect(semanaBrasilia(utc(h))).toBe(semanaServidor(utc(h)));
    }
  });

  it('contagem até zerar a semana', () => {
    expect(msAteZerarSemana(utc('2026-10-19T02:59:00'))).toBe(60_000);
    expect(msAteZerarSemana(utc('2026-10-19T03:00:00'))).toBe(7 * 24 * 3600_000);
  });
});
