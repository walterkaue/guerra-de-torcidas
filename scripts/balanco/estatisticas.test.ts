import { describe, expect, it } from 'vitest';
import { montarBalanco } from './balanco.mjs';
import { MIN_AMOSTRA, cravaPorRodada, distribuicao, paraCsv, percentil, pesoNaSemana, resumir } from './estatisticas.mjs';

const de1a = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('percentil (igual ao percentile_cont do Postgres)', () => {
  it('interpola entre os vizinhos', () => {
    expect(percentil([10, 20, 30, 40], 0.5)).toBe(25);
    expect(percentil([10, 20, 30, 40], 0.25)).toBe(17.5);
    expect(percentil([7], 0.9)).toBe(7);
    expect(percentil([], 0.5)).toBeNull();
  });
});

describe('resumo por minigame', () => {
  it('média, mediana, quartis, 90%, máximo e quantas no teto', () => {
    const valores = [...de1a(19).map((i) => i * 5), 150]; // 5..95 e um 150
    const r = resumir(valores, { teto: 150, faixa: true });
    expect(r).toMatchObject({ n: 20, pouca: false, media: 55, mediana: 52.5, q1: 28.8, q3: 76.3, p90: 90.5, max: 150, noTeto: 1 });
    expect(r.alertas).toEqual([]);
  });

  it(`abaixo de ${MIN_AMOSTRA}: "pouca amostra", sem números nem alerta`, () => {
    expect(resumir(de1a(19), { teto: 150, faixa: true })).toEqual({ n: 19, pouca: true, alertas: [] });
  });

  it('⚠️ mediana fora de 45–75 (só onde a faixa vale) e máximo acima do teto', () => {
    const baixo = Array(20).fill(30);
    expect(resumir(baixo, { teto: 150, faixa: true }).alertas).toEqual(['mediana fora de 45–75']);
    expect(resumir(baixo, { teto: 150, faixa: false }).alertas).toEqual([]);
    expect(resumir(Array(20).fill(80), { teto: 150, faixa: true }).alertas).toEqual(['mediana fora de 45–75']);
    expect(resumir([...Array(19).fill(60), 160], { teto: 150, faixa: true }).alertas).toEqual(['máximo acima do teto (150)']);
    // As bordas da faixa ainda estão dentro.
    expect(resumir(Array(20).fill(45), { faixa: true }).alertas).toEqual([]);
    expect(resumir(Array(20).fill(75), { faixa: true }).alertas).toEqual([]);
  });
});

describe('Crava e distribuições', () => {
  it('soma os palpites por pessoa na rodada', () => {
    const palpites = [
      { pessoa: 'a', rodada: 32, pontos: 20 },
      { pessoa: 'a', rodada: 32, pontos: 10 },
      { pessoa: 'a', rodada: 33, pontos: 0 },
      { pessoa: 'b', rodada: 32, pontos: 14 },
    ];
    expect(cravaPorRodada(palpites).sort((x, y) => x - y)).toEqual([0, 14, 30]);
  });

  it('conta cada valor em ordem', () => {
    expect(distribuicao([3, 1, 3, 'X', 2])).toEqual([[1, 1], [2, 1], [3, 2], ['X', 1]]);
  });
});

describe('peso de cada minigame na semana', () => {
  it('fatia do total e mediana por pessoa (quem não jogou aquele minigame entra com 0)', () => {
    const linhas = [
      { semana: 's1', pessoa: 'a', minigame: 'penaltis', pontos: 60 },
      { semana: 's1', pessoa: 'a', minigame: 'dia', pontos: 40 },
      { semana: 's1', pessoa: 'b', minigame: 'penaltis', pontos: 100 },
      { semana: 's2', pessoa: 'a', minigame: 'dia', pontos: 100 },
    ];
    const [penaltis, prova, dia] = pesoNaSemana(linhas, ['penaltis', 'prova', 'dia']);
    expect(penaltis).toMatchObject({ minigame: 'penaltis', pontos: 160, medianaPorPessoa: 60, medianaFatia: 0.6 });
    expect(penaltis.fatia).toBeCloseTo(160 / 300);
    expect(prova).toMatchObject({ pontos: 0, fatia: 0, medianaPorPessoa: 0, medianaFatia: 0 });
    expect(dia).toMatchObject({ pontos: 140, medianaPorPessoa: 40, medianaFatia: 0.4 });
    expect(dia.fatia).toBeCloseTo(140 / 300);
  });

  it('sem pontos na semana: tudo zero, sem dividir por zero', () => {
    expect(pesoNaSemana([], ['penaltis'])).toEqual([{ minigame: 'penaltis', pontos: 0, fatia: 0, medianaPorPessoa: null, medianaFatia: null }]);
  });
});

describe('CSV e relatório', () => {
  it('CSV longo para o Excel em português: BOM, ";" e vírgula decimal', () => {
    const csv = paraCsv('2026-10-20', [
      { secao: 'pontos', item: 'prova', metrica: 'media', valor: 52.5 },
      { secao: 'pontos', item: 'prova', metrica: 'alerta', valor: 'mediana fora de 45–75; ver' },
    ]);
    expect(csv).toBe(
      '﻿data;secao;item;metrica;valor\r\n2026-10-20;pontos;prova;media;52,5\r\n2026-10-20;pontos;prova;alerta;"mediana fora de 45–75; ver"\r\n',
    );
  });

  it('monta o balanço dos 4 minigames a partir das linhas do banco', () => {
    const dados = {
      partidas: [
        ...Array.from({ length: 25 }, (_, i) => ({ minigame: 'penaltis', pessoa: `p${i % 5}`, pontos: 20 + i, fim: null, chegou: null })),
        ...Array.from({ length: 3 }, (_, i) => ({ minigame: 'prova', pessoa: 'q', pontos: 40, fim: i ? 'parou' : 'errou', chegou: 5 })),
      ],
      dias: [{ pessoa: 'd', pontos: 70, acertou: true, tentativas: 3 }, { pessoa: 'd', pontos: 0, acertou: false, tentativas: 6 }],
      palpites: [{ pessoa: 'c', rodada: 32, pontos: 20 }],
      semana: [{ semana: '2026-10-19', pessoa: 'p0', minigame: 'penaltis', pontos: 100 }],
    };
    const { texto, csv } = montarBalanco(dados);
    expect(texto).toContain('Pênaltis');
    expect(texto).toContain('mediana fora de 45–75');
    expect(texto).toContain('pouca amostra');
    expect(csv).toContainEqual({ secao: 'pontos', item: 'penaltis', metrica: 'mediana', valor: 32 });
    expect(csv).toContainEqual({ secao: 'pontos', item: 'prova', metrica: 'aviso', valor: 'pouca amostra' });
    expect(csv).toContainEqual({ secao: 'prova_fim', item: 'prova', metrica: 'parou', valor: 2 });
    expect(csv).toContainEqual({ secao: 'dia_tentativas', item: 'dia', metrica: 'acertou_na_X', valor: 1 });
    expect(csv).toContainEqual({ secao: 'peso_semana', item: 'penaltis', metrica: 'fatia_total', valor: 1 });
  });
});
