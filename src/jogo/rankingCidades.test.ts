import { describe, expect, it } from 'vitest';
import { acimaNaUltimaVisita, deveLembrarDaCidade, guardarCidadeVista, linhaDaCidadeNaHome, seloDaSemana, situacaoDaCidade, textoFaltam, type MinhaCidade } from './rankingCidades';

const base: MinhaCidade = {
  codigo: 3550308, nome: 'São Paulo', uf: 'SP', ativos: 12, minimo: 5, faltam: 0, posicao_estado: 3, cidades_no_estado: 9,
  media30: 80, rival_codigo: 1, rival_nome: 'Campinas', rival_media30: 90, rival_acima: true, uf_posicao: 2, estados_no_ranking: 7,
};
const faltam: MinhaCidade = { ...base, faltam: 2, posicao_estado: null, media30: null };

describe('Home', () => {
  it('posição ou faltam', () => {
    expect(linhaDaCidadeNaHome(base)).toBe('Sua cidade está em 3º em SP');
    expect(linhaDaCidadeNaHome(faltam)).toBe('Faltam 2 pra sua cidade entrar na tabela. Chama a galera.');
    expect(textoFaltam(1)).toMatch(/^Falta 1 /);
  });
  it('lembrete: depois de jogar, sem cidade, 1 vez por semana', () => {
    const o = { temCidade: false, jogouAlguma: true, hoje: '2026-11-04' };
    expect(deveLembrarDaCidade(o)).toBe(true);
    expect(deveLembrarDaCidade({ ...o, jogouAlguma: false })).toBe(false);
    expect(deveLembrarDaCidade({ ...o, temCidade: true })).toBe(false);
    expect(deveLembrarDaCidade({ ...o, ultimo: '2026-10-29' })).toBe(false);
    expect(deveLembrarDaCidade({ ...o, ultimo: '2026-10-28' })).toBe(true);
    expect(deveLembrarDaCidade({ ...o, ultimo: 'lixo' })).toBe(true);
  });
});

describe('narrador da cidade', () => {
  it('atrás, frente, passou, campeã', () => {
    expect(situacaoDaCidade(base, null)).toMatchObject({ evento: 'cidade_atras', dif: '10 pontos', frente: false });
    const na = { ...base, rival_acima: false, rival_media30: 79 };
    expect(situacaoDaCidade(na, null)).toMatchObject({ evento: 'cidade_frente', dif: '1 ponto' });
    expect(situacaoDaCidade(na, true)?.evento).toBe('cidade_passou');
    expect(situacaoDaCidade({ ...na, posicao_estado: 1 }, null, true)?.evento).toBe('cidade_campea');
    expect(situacaoDaCidade({ ...na, posicao_estado: 1 }, null, false)?.evento).toBe('cidade_frente');
  });
  it('diferença abaixo de meio ponto não vira "0 pontos"', () => {
    expect(situacaoDaCidade({ ...base, media30: 89.7 }, null)?.dif).toBe('menos de 1 ponto');
    expect(situacaoDaCidade({ ...base, media30: 89.4 }, null)?.dif).toBe('1 ponto');
  });
  it('abaixo do mínimo ou sem rival, sem frase', () => {
    expect(situacaoDaCidade(faltam, null)).toBeNull();
    expect(situacaoDaCidade({ ...base, rival_nome: null, rival_acima: null }, null)).toBeNull();
  });
});

describe('selo', () => {
  it('só na semana passada', () => {
    expect(seloDaSemana(false, true)).toBeNull();
    expect(seloDaSemana(true, true)).toMatch(/Provisória/);
    expect(seloDaSemana(true, false)).toBe('Semana fechada.');
  });
});

describe('frase do narrador', () => {
  it('preenche cidade, rival e posição sem variável faltando', async () => {
    const { fraseDaCidade } = await import('../narrador/cidade');
    for (let i = 0; i < 20; i++) {
      const f = fraseDaCidade(base, null, false, () => i / 20);
      expect(f).toBeTruthy();
      expect(f).not.toMatch(/[{}]/);
    }
    expect(fraseDaCidade(faltam, null)).toBeNull();
  });
});

describe('rival guardado na Home', () => {
  it('só vale na mesma semana', () => {
    const g = { semana: '2026-11-02', acima: { '3550308': true } };
    expect(acimaNaUltimaVisita(g, '2026-11-02', 3550308)).toBe(true);
    expect(acimaNaUltimaVisita(g, '2026-11-09', 3550308)).toBeNull();
    expect(acimaNaUltimaVisita(g, '2026-11-02', 1)).toBeNull();
  });
  it('registro antigo (sem semana) ou vazio não conta', () => {
    expect(acimaNaUltimaVisita({ '3550308': true } as never, '2026-11-02', 3550308)).toBeNull();
    expect(acimaNaUltimaVisita(null, '2026-11-02', 3550308)).toBeNull();
  });
  it('semana nova começa do zero; a mesma semana junta as cidades', () => {
    const g = { semana: '2026-11-02', acima: { '1': true } };
    expect(guardarCidadeVista(g, '2026-11-02', 2, false)).toEqual({ semana: '2026-11-02', acima: { '1': true, '2': false } });
    expect(guardarCidadeVista(g, '2026-11-09', 2, false)).toEqual({ semana: '2026-11-09', acima: { '2': false } });
    expect(guardarCidadeVista(null, '2026-11-09', 2, true)).toEqual({ semana: '2026-11-09', acima: { '2': true } });
  });
  it('sem esse cuidado o "SUBIU!" vinha de outra semana; com ele, só da mesma', () => {
    const na = { ...base, rival_acima: false, rival_media30: 79 };
    const g = { semana: '2026-10-26', acima: { '3550308': true } };
    expect(situacaoDaCidade(na, acimaNaUltimaVisita(g, '2026-11-02', na.codigo))?.evento).toBe('cidade_frente');
    expect(situacaoDaCidade(na, acimaNaUltimaVisita({ ...g, semana: '2026-11-02' }, '2026-11-02', na.codigo))?.evento).toBe('cidade_passou');
  });
});
