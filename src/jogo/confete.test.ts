// Confete da vitória no resultado de todos os jogos (E01): quando solta, quantos pedaços e uma vez por resultado.

import { describe, expect, it, vi } from 'vitest';
import { criarComemoracao, motivoDoConfete, pedacosDoConfete } from './confete';

describe('quando o confete solta', () => {
  it('vitória, recorde novo, 3 melhores do dia, Time do Dia acertado e medalha nova', () => {
    expect(motivoDoConfete({ venceu: true })).toBe('vitoria');
    expect(motivoDoConfete({ novoRecorde: true })).toBe('recorde');
    expect(motivoDoConfete({ entrouNasMelhores: true })).toBe('melhores_do_dia');
    expect(motivoDoConfete({ acertouTimeDoDia: true })).toBe('time_do_dia');
    expect(motivoDoConfete({ subiuMedalha: true })).toBe('medalha');
  });

  it('sem nada para comemorar: não solta', () => {
    expect(motivoDoConfete({})).toBeNull();
    expect(
      motivoDoConfete({ venceu: false, novoRecorde: false, entrouNasMelhores: false, acertouTimeDoDia: false, subiuMedalha: false }),
    ).toBeNull();
  });

  it('vários motivos juntos dão um só', () => {
    expect(motivoDoConfete({ venceu: true, novoRecorde: true, subiuMedalha: true })).toBe('vitoria');
  });
});

describe('pedaços', () => {
  it('movimento reduzido: nenhum, em qualquer qualidade', () => {
    for (const n of ['alta', 'media', 'leve'] as const) expect(pedacosDoConfete(n, true)).toBe(0);
  });

  it('menos pedaços nos aparelhos mais simples, mas sempre algum', () => {
    expect(pedacosDoConfete('alta', false)).toBe(90);
    expect(pedacosDoConfete('media', false)).toBeLessThan(90);
    expect(pedacosDoConfete('leve', false)).toBeGreaterThan(0);
    expect(pedacosDoConfete('leve', false)).toBeLessThan(pedacosDoConfete('media', false));
  });
});

describe('uma vez por resultado', () => {
  it('o primeiro motivo vibra e desenha; os seguintes, não', () => {
    const desenhar = vi.fn();
    const vibrar = vi.fn();
    const soltar = criarComemoracao({ desenhar, vibrar });
    expect(soltar(null)).toBe(false);
    expect(desenhar).not.toHaveBeenCalled();
    expect(soltar('recorde')).toBe(true);
    // A medalha que chega depois, da leitura do servidor, não solta de novo.
    expect(soltar('medalha')).toBe(false);
    expect(desenhar).toHaveBeenCalledTimes(1);
    expect(vibrar).toHaveBeenCalledTimes(1);
  });

  it('sem motivo na abertura, a medalha que chega depois solta', () => {
    const desenhar = vi.fn();
    const soltar = criarComemoracao({ desenhar, vibrar: () => {} });
    soltar(motivoDoConfete({ venceu: false }));
    expect(soltar('medalha')).toBe(true);
    expect(desenhar).toHaveBeenCalledTimes(1);
  });
});
