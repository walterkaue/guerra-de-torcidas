import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aplicar, lerResposta, pendentes } from './aplicar-conferencia.mjs';
import { ARQUIVOS, escreverTabela, lerTabela } from './tabela.mjs';

const PASTA = new URL('../../dados/casa/', import.meta.url);
const textos = () => Object.fromEntries(ARQUIVOS.map((a) => [a, readFileSync(new URL(`${a}.csv`, PASTA), 'utf8')]));

describe('tabela dos CSVs da Casa', () => {
  it('ler e escrever devolve o arquivo idêntico', () => {
    for (const [a, t] of Object.entries(textos())) expect(escreverTabela(lerTabela(t)), a).toBe(t);
  });
});

describe('lerResposta', () => {
  it('separa corrigidas, apagar e confirmadas, ignorando cercas de código e o resumo', () => {
    const r = lerResposta(
      [
        '=== RESUMO ===',
        '| tabela | livre |',
        '=== CORRIGIDAS ===',
        '#### mantos.csv',
        '```csv',
        '"clube","ordem","periodo"',
        '"flamengo","1","tradicional"',
        '```',
        '=== APAGAR ===',
        '- titulos.csv | flamengo | brasileiro-a | 1987',
        '=== CONFIRMADAS ===',
        'clubes.csv | flamengo',
        'titulos.csv | flamengo | libertadores | 1981, 2019',
      ].join('\n'),
    );
    expect(r.corrigidas.mantos).toEqual(['"clube","ordem","periodo"', '"flamengo","1","tradicional"']);
    expect(r.apagar).toEqual([['titulos.csv', 'flamengo', 'brasileiro-a', '1987']]);
    expect(r.confirmadas).toHaveLength(2);
  });

  it('aceita título de bloco sem "####" e troca de arquivo no meio', () => {
    const r = lerResposta(['=== CORRIGIDAS ===', 'estadios.csv', '"clube","nome"', '"vasco","X"', 'recordes.csv', '"clube","lista"', '"vasco","gols"'].join('\n'));
    expect(Object.keys(r.corrigidas)).toEqual(['estadios', 'recordes']);
    expect(r.corrigidas.recordes).toEqual(['"clube","lista"', '"vasco","gols"']);
  });

  it('recusa linha CSV sem arquivo', () => {
    expect(() => lerResposta('=== CORRIGIDAS ===\n"a","b"')).toThrow(/sem arquivo/);
  });
});

describe('aplicar', () => {
  const hoje = '2026-10-22';
  const cabMantos = lerTabela(textos().mantos).cab;
  const linhaManto = (o: Record<string, string>) =>
    cabMantos.map((c) => `"${(o[c] ?? '').replace(/"/g, '""')}"`).join(',');

  it('confirma, corrige, adiciona e apaga só o que a resposta diz', () => {
    const base = textos();
    const resposta = lerResposta(
      [
        '=== CORRIGIDAS ===',
        '#### mantos.csv',
        linhaManto({ clube: 'vasco', ordem: '1', periodo: 'tradicional', padrao: 'faixa-diagonal', cores: '#111111|#ffffff', descricao: 'Camisa preta com faixa branca.', fonte: 'https://www.lance.com.br/x', observacao: 'ok' }),
        linhaManto({ clube: 'vasco', ordem: '2', periodo: '1898', padrao: 'lisa', cores: '#111111', descricao: 'Camisa preta.', fonte: 'https://www.lance.com.br/y', observacao: 'novo' }),
        '=== APAGAR ===',
        'goleadas.csv | vasco | Flamengo',
        'titulos.csv | vasco | estadual | 1923',
        '=== CONFIRMADAS ===',
        'clubes.csv | vasco',
        'titulos.csv | vasco | libertadores | 1998',
        'recordes.csv | vasco | gols | 1 2 3',
      ].join('\n'),
    );
    const { textos: novos, rel } = aplicar(base, resposta, { hoje, clubes: ['vasco'] });
    expect(rel.corrigidas).toBe(1);
    expect(rel.adicionadas).toBe(1);
    expect(rel.apagadas).toBe(2);
    expect(rel.confirmadas).toBe(5);
    expect(rel.avisos).toEqual([]);
    const m = lerTabela(novos.mantos).linhas.filter((l) => l.clube === 'vasco');
    expect(m.map((l) => l.ordem)).toEqual(['1', '2']);
    expect(m.every((l) => l.status === 'revisada' && l.verificada_em === hoje)).toBe(true);
    const t = lerTabela(novos.titulos).linhas;
    expect(t.find((l) => l.clube === 'vasco' && l.competicao === 'estadual' && l.ano === '1923')).toBeUndefined();
    const lib = t.find((l) => l.clube === 'vasco' && l.competicao === 'libertadores');
    expect(lib?.status).toBe('revisada');
    expect(lib?.observacao).toContain('Conferido em 2026-10-22');
    // clube fora do lote não muda
    expect(lerTabela(novos.titulos).linhas.filter((l) => l.clube === 'flamengo' && l.status === 'revisada')).toHaveLength(0);
  });

  it('recusa linha de clube fora do lote e avisa o que não achou', () => {
    const resposta = lerResposta(
      ['=== CORRIGIDAS ===', '#### mantos.csv', linhaManto({ clube: 'flamengo', ordem: '1' }), '=== APAGAR ===', 'titulos.csv | vasco | libertadores | 1800'].join('\n'),
    );
    const { rel } = aplicar(textos(), resposta, { hoje, clubes: ['vasco'] });
    expect(rel.corrigidas + rel.adicionadas).toBe(0);
    expect(rel.avisos).toHaveLength(2);
  });

  it('pendentes lista o que segue em rascunho', () => {
    const faltam = pendentes(textos(), ['vasco']);
    expect(faltam.some((f) => f.startsWith('clubes: vasco'))).toBe(true);
  });
});
