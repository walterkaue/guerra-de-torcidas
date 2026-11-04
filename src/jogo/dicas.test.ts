import { describe, expect, it } from 'vitest';
import { criarDicas, DICAS, type EstadoDasDicas } from './dicas';

function memoria() {
  let estado: EstadoDasDicas = {};
  return { ler: () => estado, gravar: (e: EstadoDasDicas) => (estado = e), get: () => estado };
}

describe('dicas', () => {
  it('curtas; na Prova e no Crava, sem "valendo" (o resto do jogo passa em palavrasProibidas.test.ts)', () => {
    for (const [id, texto] of Object.entries(DICAS)) {
      expect(texto.length).toBeLessThanOrEqual(50);
      if (/^(prova|crava)_/.test(id)) expect(texto.toLowerCase()).not.toMatch(/valendo|prêmio|milhão|lucro/);
    }
  });

  it('no máximo 2 vezes cada por aparelho', () => {
    const m = memoria();
    const a = criarDicas(m.ler, m.gravar);
    expect(a.pedir('pen_fraco')).toBe(DICAS.pen_fraco);
    a.novoLance();
    expect(a.pedir('pen_fraco')).toBe(DICAS.pen_fraco);
    a.novoLance();
    expect(a.pedir('pen_fraco')).toBeNull();
    // Outra tela, mesmo aparelho: continua contando.
    expect(criarDicas(m.ler, m.gravar).pedir('pen_fraco')).toBeNull();
  });

  it('1 por lance', () => {
    const m = memoria();
    const d = criarDicas(m.ler, m.gravar);
    expect(d.pedir('pen_fraco')).not.toBeNull();
    expect(d.pedir('pen_sem_efeito')).toBeNull();
    d.novoLance();
    expect(d.pedir('pen_sem_efeito')).not.toBeNull();
  });

  it('morte súbita aparece sempre, mas ainda 1 por lance', () => {
    const m = memoria();
    const d = criarDicas(m.ler, m.gravar);
    for (let i = 0; i < 5; i++) {
      d.novoLance();
      expect(d.pedir('pen_morte_subita')).toBe('Empatou! Morte súbita: um de cada.');
    }
    expect(d.pedir('pen_fraco')).toBeNull();
  });

  it('marcos atravessam partidas', () => {
    const m = memoria();
    expect(criarDicas(m.ler, m.gravar).marco('pen_partidas')).toBe(1);
    const outra = criarDicas(m.ler, m.gravar);
    expect(outra.marco('pen_partidas')).toBe(2);
    expect(outra.valorDoMarco('pen_partidas')).toBe(2);
    expect(outra.valorDoMarco('nada')).toBe(0);
  });
});
