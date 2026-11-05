import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import { CORES_DE_GOLEIRO, diferencaDeCor } from './bonecos';
import { CachePequeno, chaveDoCache, corDaTesteira, corDoColete, numeroVisivel, uniformeDaVestimenta } from './bonecoMontavel';
import { PADRAO } from '../jogo/vestiario';

describe('cores do boneco montável', () => {
  for (const t of TIMES) {
    it(`${t.nome}: goleiro, colete, testeira e chuteira`, () => {
      const g = uniformeDaVestimenta({ camisa: 'goleiro', chuteira: 'neutra' }, t.cores);
      expect(CORES_DE_GOLEIRO).toContain(g.camisa);
      expect(g.luva).toBe(g.camisa);
      for (const camisa of ['uni1', 'uni2', 'goleiro'] as const) {
        const u = uniformeDaVestimenta({ camisa, chuteira: 'neutra' }, t.cores);
        expect(diferencaDeCor(corDoColete(u.camisa), u.camisa)).toBeGreaterThan(camisa === 'goleiro' ? 70 : 90);
      }
      const uni1 = uniformeDaVestimenta({ camisa: 'uni1', chuteira: 'time' }, t.cores);
      expect(t.cores).toContain(uni1.chuteira);
      const pele = '#a3693f';
      const cabelo = '#17110d';
      const cor = corDaTesteira(t.cores, 'uni1', cabelo, pele);
      expect(Math.min(diferencaDeCor(cor, cabelo), diferencaDeCor(cor, pele))).toBeGreaterThanOrEqual(90);
    });
  }

  it('uni2 inverte as cores e a chuteira dourada é dourada', () => {
    const [a, b] = ['#c8102e', '#111111'] as const;
    expect(uniformeDaVestimenta({ camisa: 'uni1', chuteira: 'neutra' }, [a, b]).camisa).toBe(a);
    expect(uniformeDaVestimenta({ camisa: 'uni2', chuteira: 'neutra' }, [a, b]).camisa).toBe(b);
    expect(uniformeDaVestimenta({ camisa: 'uni1', chuteira: 'dourada' }, [a, b]).chuteira).toBe('#d4a017');
  });

  it('colete e faixa cobrem o número', () => {
    expect(numeroVisivel({ numero: '10', peito: 'nenhum' })).toBe('10');
    expect(numeroVisivel({ numero: '10', peito: 'colete' })).toBeNull();
    expect(numeroVisivel({ numero: '10', peito: 'faixa' })).toBeNull();
    expect(numeroVisivel({ numero: null, peito: 'nenhum' })).toBeNull();
  });
});

describe('cache pequeno', () => {
  it('o mais antigo sai e ler renova', () => {
    const c = new CachePequeno<number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a');
    c.set('c', 3);
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe(1);
    expect(c.tamanho).toBe(2);
  });

  it('a chave muda com cada peça, e a moldura só conta no busto', () => {
    const t = ['#c8102e', '#111111'] as const;
    const k = (v = PADRAO, r: 'busto' | 'corpo' = 'busto') => chaveDoCache(v, t, r, 84, 84, 2, true);
    expect(k()).toBe(k());
    expect(k()).not.toBe(k({ ...PADRAO, peito: 'colete' }));
    expect(k()).not.toBe(k({ ...PADRAO, moldura: 'dourada' }));
    expect(k(PADRAO, 'corpo')).toBe(k({ ...PADRAO, moldura: 'dourada' }, 'corpo'));
  });
});
