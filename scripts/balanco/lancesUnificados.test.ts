import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PONTOS } from '../../src/jogo/penaltis.ts';
import { BONUS_RECRIOU, PONTOS_FAIXA, TETO_PARTIDA } from '../../src/jogo/lances.ts';
import {
  LANCES_HOJE,
  PEN_HOJE,
  distTresTentativas,
  modeloPenaltis,
  pontosLancesJogada,
  pontosPenaltisJogada,
  quantilDist,
  tetoLances,
  tetoPenaltis,
} from './lancesUnificados.mjs';

const retrato = JSON.parse(readFileSync(new URL('../../docs/propostas/lances-unificados-dados.json', import.meta.url), 'utf8'));

describe('lances unificados (proposta)', () => {
  it('a tabela de hoje do script é a do jogo', () => {
    expect(PEN_HOJE).toMatchObject({ gol: PONTOS.gol, angulo: PONTOS.angulo, cavadinha: PONTOS.cavadinha, defesa: PONTOS.defesa, vitoria: PONTOS.vitoria, cinco: PONTOS.cincoDeCinco });
    expect(LANCES_HOJE).toMatchObject({ ...PONTOS_FAIXA, recriou: BONUS_RECRIOU });
    expect(tetoLances(LANCES_HOJE, 3)).toBe(TETO_PARTIDA);
  });

  it('reproduz os pontos gravados de todas as partidas do retrato', () => {
    for (const p of retrato.penaltis) expect(pontosPenaltisJogada(p, PEN_HOJE)).toBe(p.pontos);
    for (const p of retrato.lances) expect(pontosLancesJogada(p, LANCES_HOJE)).toBe(p.pontos);
  });

  it('a tabela proposta dos pênaltis cabe em 150, com morte súbita', () => {
    const proposta = { gol: 8, angulo: 4, cavadinha: 6, defesa: 8, vitoria: 15, cinco: 12 };
    expect(tetoPenaltis(proposta)).toBeLessThanOrEqual(150);
    // Hoje: 5 cavadinhas (100) + 5 defesas (50) + vitória (20) + 2 × 5 de 5 (50).
    expect(tetoPenaltis(PEN_HOJE)).toBe(220);
    // Nenhuma partida sorteada passa do teto calculado.
    const m = modeloPenaltis({ gol: 0.95, angulo: 0, cavadinha: 1, defesa: 0.95, fora: 0 }, proposta, 20_000);
    expect(Math.max(...m.dist.map(([v]) => v))).toBeLessThanOrEqual(tetoPenaltis(proposta));
  });

  it('3 tentativas: a distribuição soma 1 e o teto é 3 × (craque + recriar)', () => {
    const d = distTresTentativas(0.6, 0.2, 42, 8);
    expect(d.reduce((s, [, p]) => s + p, 0)).toBeCloseTo(1, 12);
    expect(Math.max(...d.map(([v]) => v))).toBe(150);
    expect(quantilDist(distTresTentativas(1, 0, 24, 8), 0.5)).toBe(72);
  });
});
