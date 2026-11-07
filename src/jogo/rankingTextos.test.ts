import { describe, expect, it } from 'vitest';
import { textoDaMedia } from './rankingTextos';

describe('textoDaMedia', () => {
  it('3 de Lances e 3 da Prova por dia', () => {
    const t = textoDaMedia();
    expect(t).toContain('3 melhores partidas de Lances');
    expect(t).toContain('3 da Prova');
    expect(t).not.toContain('5 melhores');
  });
});
