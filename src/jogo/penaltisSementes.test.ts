// Uma semente por lance nos pênaltis (jogo.md, seção 6). O ataque: o resultado de uma cobrança volta exato ao
// celular (x, y), e quem conhece o próprio gesto testa as sementes até achar a que dá aquele ponto. No servidor
// são 2^32 (uns 2 minutos em Node); aqui o espaço é de 2^12 para o teste rodar rápido, e o ataque é o mesmo.

import { describe, expect, it } from 'vitest';
import { criarAleatorio } from './aleatorio';
import {
  COBRANCAS,
  lerSementes,
  planejarDefesa,
  resolverCobranca,
  RODADAS_MAX,
  sementeDoLance,
  simularPartida,
  sortearSementes,
  type GestoCobranca,
  type Gestos,
  type ResultadoCobranca,
  type SementesPartida,
} from './penaltis';
import { jogarLance, passoAtual, type Lance } from './penaltisLance';

const ESPACO = 1 << 12;
const D = 0.5;
const VAZIO: Gestos = { cobrancas: [], defesas: [] };
/** Gesto que não bate no limite do gol: x e y dão o tremor sorteado inteiro. */
const GESTO: GestoCobranca = { dir: 30, forca: 60, efeito: 0 };

/** Todas as sementes do espaço que reproduzem o ponto exato da cobrança i. */
function acharSementes(i: number, r: ResultadoCobranca): number[] {
  const achadas: number[] = [];
  for (let s = 0; s < ESPACO; s++) {
    const t = resolverCobranca(s, i, GESTO, D);
    if (t.x === r.x && t.y === r.y) achadas.push(s);
  }
  return achadas;
}

/**
 * Joga a cobrança 1, acha a semente pelo resultado e tenta prever para onde o batedor vai na defesa 1 e onde o
 * goleiro pula na cobrança 2 (com o mesmo gesto). Devolve as sementes achadas e se cada previsão acertou.
 */
function atacar(sementes: SementesPartida) {
  const cobranca = jogarLance(sementes, VAZIO, { tipo: 'cobranca', gesto: GESTO }, D);
  const achadas = acharSementes(0, cobranca.cobranca!);
  const defesa = jogarLance(sementes, cobranca.gestos, { tipo: 'defesa', zona: 0 }, D);
  const seguinte = jogarLance(sementes, defesa.gestos, { tipo: 'cobranca', gesto: GESTO }, D);
  const uma = achadas.length === 1;
  return {
    achadas,
    acertou: uma && planejarDefesa(achadas[0], 0, D).alvo === defesa.defesa!.alvo,
    acertouGoleiro: uma && resolverCobranca(achadas[0], 1, GESTO, D).zonaGoleiro === seguinte.cobranca!.zonaGoleiro,
  };
}

describe('pênaltis: uma semente por lance', () => {
  it('formato antigo: o resultado de uma cobrança entrega a semente e o canto do batedor na defesa', () => {
    const r = criarAleatorio(11);
    for (let n = 0; n < 30; n++) {
      const semente = Math.floor(r() * ESPACO);
      const { achadas, acertou, acertouGoleiro } = atacar(semente);
      expect(achadas).toEqual([semente]);
      expect(acertou).toBe(true);
      expect(acertouGoleiro).toBe(true);
    }
  });

  it('uma por lance: a semente achada é a da cobrança já jogada e não prevê o próximo lance', () => {
    const r = criarAleatorio(12);
    const N = 300;
    let acertos = 0;
    let goleiro = 0;
    for (let n = 0; n < N; n++) {
      const sementes = sortearSementes(() => Math.floor(r() * ESPACO));
      const { achadas, acertou, acertouGoleiro } = atacar(sementes);
      // O ataque ainda acha a semente do lance jogado...
      expect(achadas).toContain(sementes.cobrancas[0]);
      if (acertou) acertos++;
      if (acertouGoleiro) goleiro++;
    }
    // ...mas prever o próximo lance vira chute: a defesa acerta 1 em 6 zonas (~50 de 300), e o goleiro da cobrança
    // seguinte fica perto disso. Com a semente da partida, seriam 300 nos dois.
    expect(acertos / N).toBeLessThan(0.3);
    expect(goleiro / N).toBeLessThan(0.3);
  });

  it('partidas antigas (uma semente) dão o mesmo resultado de antes desta mudança', () => {
    // Valores gravados com o motor de 03/11/2026, antes das sementes por lance.
    const gravadas = Array.from({ length: RODADAS_MAX }, (_, i) => ({ dir: ((i * 37) % 200) - 100, forca: 40 + i * 7, efeito: 10 }));
    const casos: [number, Gestos, boolean, string, number, string][] = [
      [123456789, { cobrancas: [{ dir: 25, forca: 0, efeito: 5 }, { dir: 94, forca: 28, efeito: 23 }, { dir: -15, forca: 99, efeito: -9 }, { dir: -72, forca: 40, efeito: -50 }, { dir: -2, forca: 7, efeito: -21 }], defesas: [5, 4, 2, 0, 4] }, false, 'dffgd/gfggg', 10, '10450'],
      [4000000000, { cobrancas: [{ dir: 47, forca: 32, efeito: -43 }, { dir: 75, forca: 63, efeito: 0 }, { dir: 56, forca: 11, efeito: 57 }, { dir: -15, forca: 83, efeito: 16 }, { dir: 34, forca: 37, efeito: 94 }], defesas: [2, 1, 0, -1, -1] }, true, 'dgdgg/fgggg', 30, '00145'],
      [77, { cobrancas: [{ dir: 44, forca: 4, efeito: -9 }, { dir: 53, forca: 48, efeito: -3 }, { dir: -47, forca: 55, efeito: -61 }, { dir: 43, forca: 48, efeito: 59 }, { dir: -35, forca: 69, efeito: -43 }], defesas: [-1, 0, -1, 5, 3] }, false, 'dggdg/ggggg', 30, '45230'],
      [2024, { cobrancas: [{ dir: 85, forca: 33, efeito: -56 }, { dir: -53, forca: 51, efeito: -85 }, { dir: 24, forca: 69, efeito: 54 }, { dir: 46, forca: 88, efeito: 6 }, { dir: -16, forca: 49, efeito: 47 }], defesas: [-1, 5, 1, 4, 5] }, true, 'ggggd/fgdgd', 80, '00115'],
    ];
    for (const [semente, gestos, desafio, desfechos, total, alvos] of casos) {
      const p = simularPartida(lerSementes(null, semente), gestos, D, 3, desafio ? gravadas : undefined);
      expect(p.cobrancas.map((c) => c.desfecho[0]).join('') + '/' + p.defesas.map((d) => d.desfecho[0]).join('')).toBe(desfechos);
      expect(p.pontos.total).toBe(total);
      expect(p.defesas.map((d) => d.alvo).join('')).toBe(alvos);
    }
  });

  it('lance a lance com sementes por lance dá o mesmo que a partida inteira (também no desafio)', () => {
    const r = criarAleatorio(13);
    for (let n = 0; n < 100; n++) {
      const sementes = sortearSementes(() => Math.floor(r() * 0x1_0000_0000));
      // Metade é desafio por link: o tremor da cobrança gravada sai da semente de cada defesa.
      const gravadas =
        n % 2 ? Array.from({ length: COBRANCAS }, () => ({ dir: r() * 200 - 100, forca: 30 + r() * 70, efeito: 0 })) : undefined;
      let gestos = VAZIO;
      let passo = passoAtual(sementes, gestos, D, gravadas);
      const lances = [];
      while (passo.tipo === 'cobranca' || passo.tipo === 'defesa') {
        const lance: Lance =
          passo.tipo === 'cobranca'
            ? { tipo: 'cobranca', gesto: { dir: r() * 200 - 100, forca: r() * 100, efeito: r() * 200 - 100 } }
            : { tipo: 'defesa', zona: Math.floor(r() * 7) - 1 };
        const j = jogarLance(sementes, gestos, lance, D, gravadas);
        lances.push(j);
        gestos = j.gestos;
        passo = j.proximo;
      }
      const parOuImpar = passo.tipo === 'par_ou_impar' ? { escolha: 'impar' as const, numero: 4 } : undefined;
      const final = simularPartida(sementes, { ...gestos, ...(parOuImpar ? { parOuImpar } : {}) }, D, 2, gravadas);
      if (gravadas) expect(final.defesas.slice(0, COBRANCAS).every((d) => d.contraGravada)).toBe(true);
      expect(lances.filter((l) => l.cobranca).map((l) => l.cobranca)).toEqual(final.cobrancas);
      expect(lances.filter((l) => l.defesa).map((l) => l.defesa)).toEqual(final.defesas);
    }
  });

  it('lê as sementes guardadas e recusa formato quebrado', () => {
    const boas = { cobrancas: Array.from({ length: RODADAS_MAX }, (_, i) => i), defesas: Array(RODADAS_MAX).fill(0xffffffff) };
    expect(lerSementes(null, 42)).toBe(42);
    expect(lerSementes(undefined, 42)).toBe(42);
    expect(lerSementes(boas, 42)).toEqual(boas);
    expect(sementeDoLance(boas, 'cobranca', 3)).toBe(3);
    expect(sementeDoLance(boas, 'defesa', 7)).toBe(0xffffffff);
    expect(sementeDoLance(9, 'defesa', 7)).toBe(9);
    expect(() => lerSementes({ cobrancas: boas.cobrancas }, 42)).toThrow();
    expect(() => lerSementes({ ...boas, defesas: boas.defesas.slice(1) }, 42)).toThrow();
    expect(() => lerSementes({ ...boas, cobrancas: [...boas.cobrancas.slice(1), -1] }, 42)).toThrow();
    expect(() => lerSementes({ ...boas, cobrancas: [...boas.cobrancas.slice(1), 1.5] }, 42)).toThrow();
    expect(() => lerSementes({ ...boas, cobrancas: [...boas.cobrancas.slice(1), 2 ** 32] }, 42)).toThrow();
  });

  it('sorteia 8 sementes de cobrança e 8 de defesa, todas diferentes de lance para lance', () => {
    const r = criarAleatorio(14);
    const s = sortearSementes(() => Math.floor(r() * 0x1_0000_0000));
    expect(s.cobrancas).toHaveLength(RODADAS_MAX);
    expect(s.defesas).toHaveLength(RODADAS_MAX);
    expect(new Set([...s.cobrancas, ...s.defesas]).size).toBe(2 * RODADAS_MAX);
  });
});
