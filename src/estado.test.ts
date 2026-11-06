import { describe, expect, it } from 'vitest';
import { CHAVES_DA_CONTA, chaveDoJogo } from './estado';

describe('limpar o aparelho', () => {
  it('leva todas as chaves do jogo e a sessão, e só elas', () => {
    for (const c of ['gdt:prefs', 'gdt:apoio-confirmado', 'gdt-convite-push', 'sb-ybfeqykdnqmnufrgtnoc-auth-token']) expect(chaveDoJogo(c)).toBe(true);
    for (const c of ['outra-coisa', 'tema', 'sbx']) expect(chaveDoJogo(c)).toBe(false);
  });
});

describe('trocar de conta no aparelho', () => {
  it('esquece o boneco guardado, as peças já vistas e o vestiário aberto da conta de antes', () => {
    for (const c of ['gdt:carreira', 'gdt:boneco', 'gdt:pecas-vistas', 'gdt:vestiario-aberto']) expect(CHAVES_DA_CONTA).toContain(c);
  });
});
