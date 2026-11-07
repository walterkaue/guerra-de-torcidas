// S08: a folha da tela única entra no history; o voltar fecha a folha antes de sair da tela.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { folhaNoHistorico } from './folhaNoHistorico';

/** History de mentira: pilha de estados; back() é assíncrono e dispara popstate, como no navegador. */
function historyFalso() {
  const pilha: unknown[] = [null];
  const ouvintes = new Set<() => void>();
  const disparar = () => ouvintes.forEach((f) => f());
  const h = {
    get state() {
      return pilha[pilha.length - 1];
    },
    pushState(s: unknown) {
      pilha.push(s);
    },
    back() {
      setTimeout(() => {
        if (pilha.length > 1) pilha.pop();
        disparar();
      }, 0);
    },
    tamanho: () => pilha.length,
    /** O voltar do celular. */
    voltar() {
      pilha.pop();
      disparar();
    },
  };
  vi.stubGlobal('history', h);
  vi.stubGlobal('window', {
    addEventListener: (_: string, f: () => void) => ouvintes.add(f),
    removeEventListener: (_: string, f: () => void) => ouvintes.delete(f),
  });
  return h;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('folhaNoHistorico', () => {
  it('o voltar do celular fecha a folha e não sai da tela', () => {
    const h = historyFalso();
    const desmontar = vi.fn();
    folhaNoHistorico(desmontar);
    expect(h.tamanho()).toBe(2);
    h.voltar();
    expect(desmontar).toHaveBeenCalledTimes(1);
    expect(h.tamanho()).toBe(1);
  });

  it('fechar tocando desfaz o estado sem desmontar duas vezes', async () => {
    const h = historyFalso();
    const desmontar = vi.fn();
    const f = folhaNoHistorico(desmontar);
    f.fechar();
    expect(desmontar).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect(h.tamanho()).toBe(1);
    expect(desmontar).toHaveBeenCalledTimes(1);
    f.fechar();
    expect(desmontar).toHaveBeenCalledTimes(1);
  });

  it('com `depois`, a outra tela só abre quando o back já voltou', async () => {
    const h = historyFalso();
    const depois = vi.fn();
    folhaNoHistorico(() => {}).fechar(depois);
    expect(depois).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(depois).toHaveBeenCalledTimes(1);
    expect(h.tamanho()).toBe(1);
    await vi.runAllTimersAsync();
    expect(depois).toHaveBeenCalledTimes(1);
  });

  it('se outra coisa já está por cima no history, fecha sem voltar', () => {
    const h = historyFalso();
    const depois = vi.fn();
    const f = folhaNoHistorico(() => {});
    h.pushState({ outra: true });
    f.fechar(depois);
    expect(depois).toHaveBeenCalledTimes(1);
    expect(h.tamanho()).toBe(3);
  });
});
