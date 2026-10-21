import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BONUS_RECRIOU,
  type CenaLance,
  LANCES_POR_PARTIDA,
  MEDALHAS,
  PONTOS_FAIXA,
  type ResultadoLance,
  TETO_PARTIDA,
  calibrar,
  faixaPorChance,
  medalhaDoLance,
  resolverLance,
  simularPartidaLances,
  validarCena,
} from './lances';
import type { GestoCobranca } from './penaltis';

// Cenas de teste (fictícias). O catálogo de verdade tem o próprio teste.
const CENAS = {
  faltaFrontal: { tipo: 'falta', bola: { x: 0, z: 20 }, barreira: { jogadores: 4, miraX: 0 }, zonaHistorica: 5, faixa: 'media' },
  faltaLonge: { tipo: 'falta', bola: { x: 0, z: 33 }, barreira: { jogadores: 5, miraX: 1 }, zonaHistorica: 5, faixa: 'craque' },
  faltaEsquerda: { tipo: 'falta', bola: { x: -3, z: 18 }, barreira: { jogadores: 5, miraX: -1.5 }, zonaHistorica: 3, faixa: 'media' },
  caraACara: { tipo: 'finalizacao', bola: { x: 0, z: 8 }, goleiroSaida: 2, zonaHistorica: 0, faixa: 'facil' },
  goleiroSaindo: { tipo: 'finalizacao', bola: { x: 0, z: 8 }, goleiroSaida: 4, zonaHistorica: 4, faixa: 'facil' },
  pequenaArea: { tipo: 'finalizacao', bola: { x: -2, z: 4 }, zonaHistorica: 0, faixa: 'facil' },
} satisfies Record<string, CenaLance>;

/** Desfechos de um gesto em n sementes. */
function desfechos(cena: CenaLance, gesto: GestoCobranca, n = 300): Record<string, number> {
  const conta: Record<string, number> = {};
  for (let s = 0; s < n; s++) {
    const d = resolverLance(s, 0, cena, gesto).desfecho;
    conta[d] = (conta[d] ?? 0) + 1;
  }
  return conta;
}

describe('cenas', () => {
  it('as cenas de teste são válidas', () => {
    for (const c of Object.values(CENAS)) expect(validarCena(c)).toEqual([]);
  });

  it('recusa cenas fora da regra', () => {
    const f = CENAS.faltaFrontal;
    expect(validarCena({ ...f, barreira: undefined })).not.toEqual([]);
    expect(validarCena({ ...f, bola: { x: 0, z: 12 } })).not.toEqual([]); // falta dentro da área
    expect(validarCena({ ...f, barreira: { jogadores: 8, miraX: 0 } })).not.toEqual([]);
    expect(validarCena({ ...f, goleiroSaida: 2 })).not.toEqual([]);
    expect(validarCena({ ...f, zonaHistorica: 6 })).not.toEqual([]);
    expect(validarCena({ ...CENAS.caraACara, barreira: { jogadores: 3, miraX: 0 } })).not.toEqual([]);
    expect(validarCena({ ...CENAS.caraACara, goleiroSaida: 7 })).not.toEqual([]); // sairia em cima da bola
    expect(validarCena({ ...CENAS.caraACara, bola: { x: 0, z: 50 } })).not.toEqual([]);
  });
});

describe('resolverLance', () => {
  it('mesma semente, índice e gesto = mesmo resultado', () => {
    const g = { dir: 40, forca: 70, efeito: -20 };
    for (const c of Object.values(CENAS)) {
      for (let s = 0; s < 50; s++) expect(resolverLance(s, 1, c, g)).toEqual(resolverLance(s, 1, c, g));
    }
  });

  it('cada lance da partida tem sorteio próprio', () => {
    const g = { dir: 60, forca: 70, efeito: 0 };
    let diferentes = 0;
    for (let s = 0; s < 100; s++) {
      if (resolverLance(s, 0, CENAS.faltaFrontal, g).x !== resolverLance(s, 1, CENAS.faltaFrontal, g).x) diferentes++;
    }
    expect(diferentes).toBeGreaterThan(90);
  });

  it('normaliza o gesto como nos pênaltis', () => {
    expect(resolverLance(7, 0, CENAS.caraACara, { dir: 250, forca: -5, efeito: 0.4 })).toEqual(
      resolverLance(7, 0, CENAS.caraACara, { dir: 100, forca: 0, efeito: 0 }),
    );
  });

  it('chute forte e reto para na barreira', () => {
    expect(desfechos(CENAS.faltaFrontal, { dir: 0, forca: 90, efeito: 0 })).toEqual({ barreira: 300 });
  });

  it('a mesma direção com força média passa por cima da barreira', () => {
    expect(desfechos(CENAS.faltaFrontal, { dir: 0, forca: 62, efeito: 0 }).barreira).toBeUndefined();
  });

  it('o efeito contorna a barreira', () => {
    // Bola para o canto tapado pela barreira: sem curva bate nela, com curva por fora passa.
    const reto = desfechos(CENAS.faltaEsquerda, { dir: -60, forca: 84, efeito: 0 });
    const curvo = desfechos(CENAS.faltaEsquerda, { dir: -90, forca: 84, efeito: 60 });
    expect(reto.barreira).toBeGreaterThan(250);
    expect(curvo.barreira ?? 0).toBeLessThan(30);
  });

  it('chute fraco no meio é do goleiro', () => {
    expect(desfechos(CENAS.caraACara, { dir: 0, forca: 28, efeito: 0 })).toEqual({ defesa: 300 });
  });

  it('cavadinha encobre o goleiro que saiu, a não ser que ele leia', () => {
    const r = desfechos(CENAS.goleiroSaindo, { dir: 0, forca: 16, efeito: 0 });
    expect(r.gol).toBeGreaterThan(180);
    expect(r.gol).toBeLessThan(270);
    expect(r.defesa).toBe(300 - r.gol);
  });

  it('cavadinha contra goleiro perto da linha não entra', () => {
    expect(desfechos({ ...CENAS.caraACara, goleiroSaida: 1 }, { dir: 0, forca: 16, efeito: 0 })).toEqual({ defesa: 300 });
  });

  it('força demais vai por cima e mira demais vai para fora', () => {
    expect(desfechos(CENAS.pequenaArea, { dir: 0, forca: 100, efeito: 0 }).gol).toBeUndefined();
    expect(desfechos(CENAS.pequenaArea, { dir: 100, forca: 70, efeito: 100 })).toEqual({ fora: 300 });
  });

  it('gol vale os pontos da faixa, mais o bônus quando recria o lance', () => {
    let gols = 0;
    let recriados = 0;
    for (let s = 0; s < 300; s++) {
      for (const g of [
        { dir: -70, forca: 40, efeito: 0 },
        { dir: 70, forca: 40, efeito: 0 },
      ]) {
        const r: ResultadoLance = resolverLance(s, 0, CENAS.pequenaArea, g);
        if (r.desfecho !== 'gol') {
          expect(r.pontos).toBe(0);
          expect(r.recriou).toBe(false);
          continue;
        }
        gols++;
        expect(r.recriou).toBe(r.zonaBola === CENAS.pequenaArea.zonaHistorica);
        if (r.recriou) recriados++;
        expect(r.pontos).toBe(PONTOS_FAIXA.facil + (r.recriou ? BONUS_RECRIOU : 0));
      }
    }
    expect(gols).toBeGreaterThan(400);
    expect(recriados).toBeGreaterThan(150);
    expect(recriados).toBeLessThan(gols);
  });
});

describe('partida', () => {
  it('o teto da partida é 120', () => {
    expect(TETO_PARTIDA).toBe(120);
    expect(LANCES_POR_PARTIDA).toBe(3);
  });

  it('soma os 3 lances, cada um com o próprio índice, e aceita lance repetido', () => {
    const cenas = [CENAS.pequenaArea, CENAS.pequenaArea, CENAS.faltaLonge];
    const gestos = [
      { dir: -70, forca: 40, efeito: 0 },
      { dir: 70, forca: 40, efeito: 0 },
      { dir: 85, forca: 68, efeito: 20 },
    ];
    for (let s = 0; s < 30; s++) {
      const p = simularPartidaLances(s, cenas, gestos);
      const um = cenas.map((c, i) => resolverLance(s, i, c, gestos[i]));
      expect(p.lances).toEqual(um);
      expect(p.pontos).toBe(um.reduce((t, r) => t + r.pontos, 0));
      expect(p.gols).toBe(um.filter((r) => r.desfecho === 'gol').length);
      expect(p.recriados).toBe(um.filter((r) => r.recriou).length);
      expect(p.pontos).toBeLessThanOrEqual(TETO_PARTIDA);
    }
  });

  it('recusa partida sem 3 lances e 3 gestos', () => {
    const g = { dir: 0, forca: 50, efeito: 0 };
    expect(() => simularPartidaLances(1, [CENAS.caraACara], [g])).toThrow();
    expect(() => simularPartidaLances(1, [CENAS.caraACara, CENAS.caraACara, CENAS.caraACara], [g, g])).toThrow();
  });
});

describe('medalhas', () => {
  it('bronze com 5, prata com 20, ouro com 50 e 10 recriados', () => {
    expect(MEDALHAS.map((m) => m.acertos)).toEqual([5, 20, 50]);
    expect(medalhaDoLance(0, 0)).toBeNull();
    expect(medalhaDoLance(4, 4)).toBeNull();
    expect(medalhaDoLance(5, 0)).toBe('bronze');
    expect(medalhaDoLance(19, 19)).toBe('bronze');
    expect(medalhaDoLance(20, 0)).toBe('prata');
    expect(medalhaDoLance(80, 9)).toBe('prata');
    expect(medalhaDoLance(50, 10)).toBe('ouro');
  });
});

describe('calibragem', () => {
  it('faixa pela chance de acerto', () => {
    expect(faixaPorChance(0.9)).toBe('facil');
    expect(faixaPorChance(0.75)).toBe('facil');
    expect(faixaPorChance(0.6)).toBe('media');
    expect(faixaPorChance(0.5)).toBe('media');
    expect(faixaPorChance(0.4)).toBe('dificil');
    expect(faixaPorChance(0.3)).toBe('dificil');
    expect(faixaPorChance(0.1)).toBe('craque');
  });

  it('o robô separa lance fácil de lance de craque', () => {
    const perto = calibrar(CENAS.pequenaArea);
    const cara = calibrar(CENAS.caraACara);
    const frontal = calibrar(CENAS.faltaFrontal);
    const longe = calibrar(CENAS.faltaLonge);
    expect(perto.faixa).toBe('facil');
    expect(longe.faixa).toBe('craque');
    expect(perto.chance).toBeGreaterThan(cara.chance);
    expect(cara.chance).toBeGreaterThan(frontal.chance);
    expect(frontal.chance).toBeGreaterThan(longe.chance);
  });

  it('todo lance tem solução e falta não entra com qualquer gesto', () => {
    for (const c of Object.values(CENAS)) {
      const r = calibrar(c);
      expect(r.chance).toBeGreaterThan(0.1);
      if (c.tipo === 'falta') expect(r.chanceAleatoria).toBeLessThan(0.12);
    }
  });
});

describe('motor puro', () => {
  it('a partida não usa sorteio do navegador nem trigonometria', () => {
    const fonte = readFileSync(new URL('./lances.ts', import.meta.url), 'utf8');
    const motor = fonte
      .slice(0, fonte.indexOf('// ---------- calibragem ----------'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(motor).not.toMatch(/Math\.(random|sin|cos|tan|atan|atan2|exp|log|pow|hypot)\b/);
    expect(motor).not.toMatch(/\bDate\b|performance\.|document\.|window\./);
  });
});
