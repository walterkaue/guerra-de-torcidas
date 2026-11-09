import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O módulo guarda o estado da carga da página: cada teste começa com uma cópia nova.
const carregar = async () => {
  vi.resetModules();
  return import('./primeiraTela');
};

/** true se a promessa já resolveu depois de esvaziar a fila de microtarefas. */
async function resolveu(p: Promise<void>): Promise<boolean> {
  let ok = false;
  void p.then(() => (ok = true));
  await vi.advanceTimersByTimeAsync(0);
  return ok;
}

describe('primeira tela de quem chega por link de desafio', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sem desafio no link, nada espera', async () => {
    const m = await carregar();
    expect(await resolveu(m.depoisDoConvite())).toBe(true);
  });

  it('com desafio, o resto espera até o convite resolver', async () => {
    const m = await carregar();
    m.segurarParaOConvite();
    const resto = m.depoisDoConvite();
    expect(await resolveu(resto)).toBe(false);
    m.conviteResolvido();
    expect(await resolveu(resto)).toBe(true);
    m.conviteResolvido(); // de novo não quebra nada
    expect(await resolveu(m.depoisDoConvite())).toBe(true);
  });

  it('sem resposta do convite, o teto libera o resto', async () => {
    const m = await carregar();
    m.segurarParaOConvite();
    const resto = m.depoisDoConvite();
    await vi.advanceTimersByTimeAsync(m.TETO_DO_CONVITE_MS - 1);
    expect(await resolveu(resto)).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await resolveu(resto)).toBe(true);
  });
});
