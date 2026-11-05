import { describe, expect, it } from 'vitest';
import { textoDaMedia } from './rankingTextos';

describe('textoDaMedia', () => {
  it('antes do corte, as 5 melhores do dia', () => {
    expect(textoDaMedia(false)).toBe('Conta a média dos 30 melhores de cada torcida. Só as 5 melhores partidas do dia de cada um valem.');
  });
  it('depois do corte, 3 de Lances e 3 da Prova por dia', () => {
    const t = textoDaMedia(true);
    expect(t).toContain('3 melhores partidas de Lances');
    expect(t).toContain('3 da Prova');
    expect(t).not.toContain('5 melhores');
  });
});
