import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CORES as CORES_JOGO, REGIAO_DA_UF as REGIAO_JOGO } from '../../src/jogo/timeDoDia';
import { CORES, REGIAO_DA_UF, gerarSql, lerClubes, validarClube, validarConjunto } from './validar.mjs';

const bom = {
  id: 'flamengo',
  nome: 'Flamengo',
  cidade: 'Rio de Janeiro',
  uf: 'RJ',
  regiao: 'Sudeste',
  fundacao: '1895',
  titulos_brasileirao: '8',
  divisao_2026: 'A',
  cor1: 'vermelho',
  cor2: 'preto',
  capital: 'capital',
  fonte: 'https://flamengo.com.br/',
  fonte2: '',
  fonte_titulos: 'https://jornaldebrasilia.com.br/torcida/confira-a-lista-com-todos-os-campeoes-do-brasileiro/',
  fonte_divisao: 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026',
  verificada_em: '2026-10-20',
  status: 'revisada',
  observacao: '',
};

describe('validador do Time do Dia', () => {
  it('mesmas cores e regiões do jogo (src/jogo/timeDoDia.ts) e da migração', () => {
    expect(CORES).toEqual([...CORES_JOGO]);
    expect(REGIAO_DA_UF).toEqual(REGIAO_JOGO);
  });

  it('clube bom passa', () => {
    expect(validarClube(bom)).toEqual([]);
  });

  it('pega UF, região, ano, títulos, divisão, cores e capital errados', () => {
    expect(validarClube({ ...bom, uf: 'XX' }).join()).toMatch(/uf/);
    expect(validarClube({ ...bom, regiao: 'Sul' }).join()).toMatch(/não bate com a UF/);
    expect(validarClube({ ...bom, fundacao: '2030' }).join()).toMatch(/fundação/);
    expect(validarClube({ ...bom, titulos_brasileirao: '-1' }).join()).toMatch(/títulos/);
    expect(validarClube({ ...bom, divisao_2026: 'D' }).join()).toMatch(/divisão/);
    expect(validarClube({ ...bom, cor1: 'rubro' }).join()).toMatch(/fora da lista/);
    expect(validarClube({ ...bom, cor2: 'vermelho' }).join()).toMatch(/iguais/);
    expect(validarClube({ ...bom, capital: 'sim' }).join()).toMatch(/capital/);
  });

  it('fontes: obrigatórias, domínio aceito e Wikipédia só como fonte2', () => {
    expect(validarClube({ ...bom, fonte: '' }).join()).toMatch(/fonte vazia/);
    expect(validarClube({ ...bom, fonte: 'https://pt.wikipedia.org/wiki/Flamengo' }).join()).toMatch(/Wikipédia/);
    expect(validarClube({ ...bom, fonte2: 'https://pt.wikipedia.org/wiki/Flamengo' })).toEqual([]);
    expect(validarClube({ ...bom, fonte_divisao: 'https://blog.qualquer.net/x' }).join()).toMatch(/não aceito/);
  });

  it('conjunto: repetidos, pistas idênticas e 20 por série', () => {
    const gemeo = { ...bom, id: 'gemeo', nome: 'Gêmeo', cor1: 'preto', cor2: 'vermelho' };
    const erros = validarConjunto([bom, { ...bom }, gemeo]).map((e) => e.erro).join(' | ');
    expect(erros).toMatch(/id repetido/);
    expect(erros).toMatch(/nome repetido/);
    expect(erros).toMatch(/mesmas 6 pistas/);
    expect(erros).toMatch(/Série B \(esperado 20\)/);
  });

  it('SQL: revisada vira ativa, aposentada só muda o status, aspas escapadas', () => {
    const sql = gerarSql([{ ...bom, nome: "Pau d'Alho" }, { ...bom, id: 'velho', status: 'aposentada' }]);
    expect(sql).toMatch(/insert into public\.dia_clubes/);
    expect(sql).toMatch(/'Pau d''Alho'/);
    expect(sql).toMatch(/, true, /);
    expect(sql).toMatch(/set status = 'aposentada'.*'velho'/);
  });

  it('o CSV do repositório tem 60 clubes, 20 por série, sem erro de formato', () => {
    const clubes = lerClubes(readFileSync(new URL('../../dados/clubes-do-dia.csv', import.meta.url), 'utf8'));
    expect(clubes).toHaveLength(60);
    // Só são aceitos os avisos de fonte que a conferência ainda vai resolver.
    const estruturais = validarConjunto(clubes).filter((e) => !/fonte/.test(e.erro));
    expect(estruturais).toEqual([]);
  });
});
