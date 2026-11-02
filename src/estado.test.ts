import { describe, expect, it } from 'vitest';
import { chaveDoJogo } from './estado';

describe('limpar o aparelho', () => {
  it('leva todas as chaves do jogo e a sessão, e só elas', () => {
    for (const c of ['gdt:prefs', 'gdt:apoio-confirmado', 'gdt-convite-push', 'sb-ybfeqykdnqmnufrgtnoc-auth-token']) expect(chaveDoJogo(c)).toBe(true);
    for (const c of ['outra-coisa', 'tema', 'sbx']) expect(chaveDoJogo(c)).toBe(false);
  });
});
