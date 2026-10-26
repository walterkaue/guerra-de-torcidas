import { describe, expect, it } from 'vitest';
import { LENTO_MS, NIVEIS, QUADROS_PARA_DECIDIR, abaixo, avaliarQuadros, medirQuadros, nivelInicial, podeSerAlta, qualidade, definirQualidade } from './qualidade';

describe('qualidade: nível de partida pelo aparelho', () => {
  it('economia de dados, 4 núcleos ou menos e 2 GB ou menos começam em Leve', () => {
    expect(nivelInicial({ economiaDeDados: true, nucleos: 8, memoriaGB: 8 })).toBe('leve');
    expect(nivelInicial({ nucleos: 4, memoriaGB: 8 })).toBe('leve');
    expect(nivelInicial({ nucleos: 8, memoriaGB: 2 })).toBe('leve');
  });

  it('o resto começa em Média, inclusive quando o navegador não conta nada (iPhone)', () => {
    expect(nivelInicial({ nucleos: 8, memoriaGB: 4 })).toBe('media');
    expect(nivelInicial({})).toBe('media');
  });

  it('só sobe para Alta quem tem 6 núcleos e 4 GB (ou não diz) e não está economizando dados', () => {
    expect(podeSerAlta({ nucleos: 8, memoriaGB: 8 })).toBe(true);
    expect(podeSerAlta({})).toBe(true);
    expect(podeSerAlta({ nucleos: 4, memoriaGB: 8 })).toBe(false);
    expect(podeSerAlta({ nucleos: 8, memoriaGB: 3 })).toBe(false);
    expect(podeSerAlta({ nucleos: 8, memoriaGB: 8, economiaDeDados: true })).toBe(false);
  });

  it('os níveis descem em ordem e a Leve não desce mais', () => {
    expect(abaixo('alta')).toBe('media');
    expect(abaixo('media')).toBe('leve');
    expect(abaixo('leve')).toBe('leve');
  });

  it('cada nível desliga o que promete', () => {
    expect(NIVEIS.leve).toMatchObject({ dprMax: 1, ola: false, degrade: false, replay: false, torcidaViva: false });
    expect(NIVEIS.media).toMatchObject({ dprMax: 1.5, ola: false, replay: true });
    expect(NIVEIS.alta).toMatchObject({ dprMax: 2, ola: true, replay: true, zoomNoReplay: true });
  });
});

describe('qualidade: veredito dos quadros', () => {
  it('lento desce, rápido e leve sobe, o meio fica', () => {
    expect(avaliarQuadros(30, 3)).toBe('desce');
    expect(avaliarQuadros(16.7, 3)).toBe('sobe');
    expect(avaliarQuadros(16.7, 9)).toBe('fica');
    expect(avaliarQuadros(19, 3)).toBe('fica');
  });

  it('a medição desce um nível no meio da partida quando os quadros ficam lentos', () => {
    definirQualidade('alta');
    let t = 0;
    const m = medirQuadros(() => t);
    for (let i = 0; i < 30 + QUADROS_PARA_DECIDIR + 1; i++) {
      t += LENTO_MS + 10;
      m.quadro(4);
    }
    expect(qualidade().nivel).toBe('media');
  });

  it('pausa longa (aba em segundo plano) não conta como quadro lento', () => {
    definirQualidade('media');
    let t = 0;
    const m = medirQuadros(() => t);
    for (let i = 0; i < 200; i++) {
      t += i % 20 === 0 ? 5000 : 16;
      m.quadro(2);
    }
    expect(qualidade().nivel).toBe('media');
  });
});
