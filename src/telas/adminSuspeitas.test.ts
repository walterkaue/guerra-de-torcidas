import { describe, expect, it } from 'vitest';
import { cartaoSuspeita, type Suspeita } from './adminSuspeitas';

const s: Suspeita = {
  minigame: 'penaltis',
  id: '00000000-0000-4000-8000-000000000001',
  torcedor: '00000000',
  time_id: 'bahia',
  dia: '2026-10-26',
  pontos: 90,
  motivo: 'defesas: 28 de 30',
  partidas_do_torcedor: 12,
  suspeitas_do_torcedor: 3,
  na_fila: 1,
};

describe('fila de suspeitas no #admin', () => {
  it('mostra minigame, dia, time, pontos, motivo e o histórico do torcedor', () => {
    const html = cartaoSuspeita(s);
    expect(html).toContain('Pênaltis · 26/10 · Bahia · 90 pontos');
    expect(html).toContain('defesas: 28 de 30');
    expect(html).toContain('3 sob suspeita em 12 partidas');
    expect(html).toContain('data-acao="liberar"');
    expect(html).toContain('data-acao="manter"');
  });

  it('escapa o que vem do banco', () => {
    expect(cartaoSuspeita({ ...s, motivo: '<b>x</b>' })).not.toContain('<b>x</b>');
  });
});
