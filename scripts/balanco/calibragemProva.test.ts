import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anonimizar, relatorio } from './calibragem-prova.mjs';
import {
  CENARIOS,
  OPCOES,
  REGRA_ATUAL,
  TABELA_DOBRADA,
  distribuicaoDePontos,
  fisher,
  mediaDaDistribuicao,
  perguntasEsperadas,
  pesoDaProva,
  pontosDaPartidaJogada,
  quantil,
  taxaParaMediana,
  taxasPorPosicao,
  wilson,
} from './calibragemProva.mjs';
import { calcularPontos, levar } from '../../src/jogo/prova';
import { montarSql, PROVA_TRES_ERROS_DESDE } from './balanco.mjs';

const acerta = (n: number) => Array.from({ length: n }, () => ({ desfecho: 'acertou' as const }));
const regras = [REGRA_ATUAL, ...OPCOES];

describe('a regra antiga (REGRA_ATUAL, até 01/11/2026) e a nova em src/jogo/prova.ts', () => {
  it('antiga: acertos seguidos e depois um erro levam metade; parada ou 8 de 8 batem com o jogo', () => {
    for (let acertos = 0; acertos <= 8; acertos++) {
      const certos = acerta(acertos).map((p) => ({ ...p, ajuda: false }));
      if (acertos < 8) {
        const comErro = [...certos, { desfecho: 'errou' as const, ajuda: false }];
        expect(pontosDaPartidaJogada(comErro, REGRA_ATUAL)).toBe(Math.ceil(levar(acertos) / 2));
      }
      if (acertos > 0) expect(pontosDaPartidaJogada(certos, REGRA_ATUAL)).toBe(calcularPontos(certos).total);
    }
  });

  it('as 33 partidas do retrato dão os pontos gravados', () => {
    const d = JSON.parse(readFileSync(new URL('../../docs/propostas/calibragem-prova-dados.json', import.meta.url), 'utf8'));
    expect(d.partidas.length).toBeGreaterThan(0);
    for (const p of d.partidas) expect(pontosDaPartidaJogada(p.passos, REGRA_ATUAL)).toBe(p.pontos);
  });
});

describe('distribuição exata', () => {
  it('probabilidades somam 1 em qualquer regra e taxa', () => {
    for (const regra of regras) {
      for (const p of [0, 0.3, 0.61, 0.9, 1]) {
        const dist = distribuicaoDePontos(Array(8).fill(p), regra);
        expect(dist.reduce((s, [, pr]) => s + pr, 0)).toBeCloseTo(1, 10);
      }
    }
  });

  it('acerta tudo = teto de 150; erra tudo = 0', () => {
    for (const regra of regras) {
      expect(distribuicaoDePontos(Array(8).fill(1), regra)).toEqual([[150, 1]]);
      expect(distribuicaoDePontos(Array(8).fill(0), regra)).toEqual([[0, 1]]);
    }
  });

  it('com a regra de hoje, erro na 1ª vale 0 e erro na 2ª vale 4', () => {
    const dist = new Map(distribuicaoDePontos([0.5, 0.5, 0, 0, 0, 0, 0, 0], REGRA_ATUAL));
    expect(dist.get(0)).toBeCloseTo(0.5);
    expect(dist.get(4)).toBeCloseTo(0.25);
    expect(dist.get(8)).toBeCloseTo(0.25); // acertou as 2 e errou a 3ª: metade de 16
  });

  it('mais tolerância a erros nunca diminui a média (mesma fração) e nunca passa do teto', () => {
    const p = taxasPorPosicao(CENARIOS[0].porDegrau);
    const medias = [1, 2, 3, 4, 8].map((erros) => mediaDaDistribuicao(distribuicaoDePontos(p, { ...REGRA_ATUAL, fracao: 0.75, erros })));
    for (let i = 1; i < medias.length; i++) expect(medias[i]).toBeGreaterThanOrEqual(medias[i - 1]);
    for (const regra of regras) expect(distribuicaoDePontos(p, regra).at(-1)![0]).toBeLessThanOrEqual(150);
  });

  it('quem para na 5ª leva os pontos de 5 acertos', () => {
    const dist = distribuicaoDePontos(Array(8).fill(1), REGRA_ATUAL, { paraEm: 5 });
    expect(dist).toEqual([[58, 1]]);
  });

  it('perguntas esperadas: 1 com taxa 0 e 8 com taxa 1; a regra de hoje bate com a conta à mão', () => {
    expect(perguntasEsperadas(Array(8).fill(0), REGRA_ATUAL)).toBe(1);
    expect(perguntasEsperadas(Array(8).fill(1), REGRA_ATUAL)).toBe(8);
    // 1 + p + p² + … + p⁷ com p = 0,5
    expect(perguntasEsperadas(Array(8).fill(0.5), REGRA_ATUAL)).toBeCloseTo((1 - 0.5 ** 8) / 0.5, 10);
  });

  it('quantil e taxa necessária para a mediana', () => {
    expect(quantil([[0, 0.4], [10, 0.6]], 0.5)).toBe(10);
    expect(quantil([[0, 0.5], [10, 0.5]], 0.5)).toBe(0);
    const p = taxaParaMediana(REGRA_ATUAL, 45);
    expect(p).toBeGreaterThan(0.85);
    expect(p).toBeLessThan(0.95);
  });
});

describe('contas auxiliares', () => {
  it('Wilson: contém a taxa observada e estreita com mais amostra', () => {
    const [a, b] = wilson(33, 54);
    expect(a).toBeLessThan(33 / 54);
    expect(b).toBeGreaterThan(33 / 54);
    const [c, d] = wilson(330, 540);
    expect(d - c).toBeLessThan(b - a);
    expect(wilson(0, 0)).toEqual([0, 1]);
  });

  it('Fisher: tabelas conhecidas', () => {
    expect(fisher(1, 9, 11, 3)).toBeCloseTo(0.002759, 5); // exemplo clássico
    expect(fisher(5, 5, 5, 5)).toBeCloseTo(1, 10);
  });

  it('peso da Prova: sem mudança na média, nada muda', () => {
    const pontos = { penaltis: 900, prova: 100 };
    expect(pesoDaProva(pontos, 1).fatia).toBeCloseTo(0.1);
    expect(pesoDaProva(pontos, 4).fatia).toBeCloseTo(400 / 1300);
  });

  it('a tabela dobrada estoura o teto (por isso é só contraste)', () => {
    const dist = distribuicaoDePontos(Array(8).fill(1), TABELA_DOBRADA);
    expect(dist.at(-1)![0]).toBe(300);
  });
});

describe('relatório', () => {
  const retrato = JSON.parse(readFileSync(new URL('../../docs/propostas/calibragem-prova-dados.json', import.meta.url), 'utf8'));

  it('sai com todas as seções e a conferência bate', () => {
    const texto = relatorio(retrato);
    for (const titulo of ['Amostra', '1. Como as partidas acabam', '7. Opções no modelo', '8. Peso da Prova', '9. Quem pesquisa']) {
      expect(texto).toContain(titulo);
    }
    expect(texto).toContain('bate com os pontos gravados em todas as partidas');
  });

  it('o retrato não leva id de pessoa (uuid)', () => {
    expect(JSON.stringify(retrato)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });

  it('anonimizar troca ids por j1, j2… na ordem de aparição', () => {
    const d = anonimizar(
      {
        partidas: [{ pessoa: 'x', pontos: 0, fim: 'errou', passos: [{ degrau: 1, desfecho: 'errou', ajuda: false, ms: 1, extra: 1 }] }],
        respostas: [{ pessoa: 'y' }, { pessoa: 'x' }],
        banco: {},
        semana: {},
      },
      '2026-10-31',
    );
    expect(d.partidas[0].pessoa).toBe('j1');
    expect(d.respostas.map((r: { pessoa: string }) => r.pessoa)).toEqual(['j2', 'j1']);
    expect(d.partidas[0].passos[0]).not.toHaveProperty('extra');
  });
});

describe('balanço filtra a Prova pela data da regra nova', () => {
  it('só Prova criada a partir da data; --prova-antes inverte; os outros minigames não são filtrados', () => {
    const nova = montarSql(PROVA_TRES_ERROS_DESDE, false);
    expect(nova).toContain(`(p.minigame <> 'prova' or p.criada_em >= timestamptz '${PROVA_TRES_ERROS_DESDE}')`);
    expect(montarSql(PROVA_TRES_ERROS_DESDE, true)).toContain("p.criada_em < timestamptz");
    expect(() => montarSql("2026-11-02'; drop table x;--")).toThrow();
  });

  it('o jogo e o balanço usam a mesma regra: 3º erro leva 75%', () => {
    const e = { desfecho: 'errou' as const, ajuda: false };
    const c = { desfecho: 'acertou' as const, ajuda: false };
    expect(calcularPontos([c, c, c, c, c, e, e, e]).total).toBe(Math.ceil(58 * 0.75));
  });
});
