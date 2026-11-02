import { describe, expect, it } from 'vitest';
import { criarAleatorio } from './aleatorio';
import { planejarDefesa, RODADAS_MAX, simularPartida, type GestoCobranca, type Gestos } from './penaltis';
import { jogarLance, LanceForaDeOrdem, passoAtual, type Lance } from './penaltisLance';

const VAZIO: Gestos = { cobrancas: [], defesas: [] };

/** Joga a partida inteira lance a lance, como o celular faria com o servidor. */
function jogarTudo(semente: number, sementeGestos: number, dificuldade = 0.5, gravadas?: GestoCobranca[]) {
  const r = criarAleatorio(sementeGestos);
  let gestos = VAZIO;
  let passo = passoAtual(semente, gestos, dificuldade, gravadas);
  const lances = [];
  while (passo.tipo === 'cobranca' || passo.tipo === 'defesa') {
    const lance: Lance =
      passo.tipo === 'cobranca'
        ? { tipo: 'cobranca', gesto: { dir: r() * 200 - 100, forca: r() * 100, efeito: r() * 200 - 100 } }
        : { tipo: 'defesa', zona: Math.floor(r() * 7) - 1 };
    const j = jogarLance(semente, gestos, lance, dificuldade, gravadas);
    lances.push(j);
    gestos = j.gestos;
    passo = j.proximo;
  }
  return { gestos, passo, lances };
}

describe('pênaltis lance a lance', () => {
  it('começa pela cobrança 1', () => {
    expect(passoAtual(1, VAZIO, 0.5)).toEqual({ tipo: 'cobranca', i: 0 });
  });

  it('dá o mesmo resultado que a partida inteira (o fechamento continua no simularPartida)', () => {
    for (let s = 1; s <= 300; s++) {
      const { gestos, passo, lances } = jogarTudo(s * 7919, s, (s % 7) / 6);
      const parOuImpar = passo.tipo === 'par_ou_impar' ? { escolha: 'par' as const, numero: 2 } : undefined;
      const final = simularPartida(s * 7919, { ...gestos, ...(parOuImpar ? { parOuImpar } : {}) }, (s % 7) / 6, 3);
      expect(lances.filter((l) => l.cobranca).map((l) => l.cobranca)).toEqual(final.cobrancas);
      expect(lances.filter((l) => l.defesa).map((l) => l.defesa)).toEqual(final.defesas);
    }
  });

  it('a dica da defesa é a do motor, e é tudo o que sai antes da escolha', () => {
    const j = jogarLance(42, VAZIO, { tipo: 'cobranca', gesto: { dir: 50, forca: 70, efeito: 0 } }, 0.3);
    expect(j.proximo).toEqual({ tipo: 'defesa', i: 0, dica: planejarDefesa(42, 0, 0.3).dica });
    expect(Object.keys(j.proximo).sort()).toEqual(['dica', 'i', 'tipo']);
  });

  it('no desafio, a defesa é contra a cobrança gravada (que fica no servidor)', () => {
    const gravadas: GestoCobranca[] = Array.from({ length: RODADAS_MAX }, () => ({ dir: -90, forca: 70, efeito: 0 }));
    const { lances } = jogarTudo(99, 5, 0.5, gravadas);
    const defesas = lances.filter((l) => l.defesa).map((l) => l.defesa!);
    expect(defesas.every((d) => d.contraGravada)).toBe(true);
  });

  it('normaliza os gestos antes de guardar', () => {
    const j = jogarLance(7, VAZIO, { tipo: 'cobranca', gesto: { dir: 140.6, forca: 70.4, efeito: -3.5 } }, 0.5);
    expect(j.gestos.cobrancas[0]).toEqual({ dir: 100, forca: 70, efeito: -3 });
    const d = jogarLance(7, j.gestos, { tipo: 'defesa', zona: 9 }, 0.5);
    expect(d.gestos.defesas[0]).toBe(-1);
  });

  it('recusa lance fora de ordem', () => {
    expect(() => jogarLance(1, VAZIO, { tipo: 'defesa', zona: 0 }, 0.5)).toThrow(LanceForaDeOrdem);
    const j = jogarLance(1, VAZIO, { tipo: 'cobranca', gesto: { dir: 0, forca: 70, efeito: 0 } }, 0.5);
    expect(() => jogarLance(1, j.gestos, { tipo: 'cobranca', gesto: { dir: 0, forca: 70, efeito: 0 } }, 0.5)).toThrow(
      LanceForaDeOrdem,
    );
  });

  it('recusa lance depois do fim e gestos guardados quebrados', () => {
    for (let s = 1; s <= 50; s++) {
      const { gestos, passo } = jogarTudo(s, s + 1000);
      expect(['fim', 'par_ou_impar']).toContain(passo.tipo);
      expect(() => jogarLance(s, gestos, { tipo: 'cobranca', gesto: { dir: 0, forca: 70, efeito: 0 } }, 0.5)).toThrow(
        LanceForaDeOrdem,
      );
    }
    expect(() => passoAtual(1, { cobrancas: [], defesas: [1] }, 0.5)).toThrow(LanceForaDeOrdem);
  });
});
