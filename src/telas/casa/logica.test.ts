import { describe, expect, it } from 'vitest';
import { CASAS } from '../../dados/casa/dados.gerado';
import type { TituloCasa } from '../../dados/casa/tipos';
import { TIMES } from '../../dados/times';
import { dataBR, dataDosRecordes, montarPrateleiras, nomeDaCasa, nomeDoEstadio, rotuloDaFonte, separarMantos, totalDeTitulos } from './logica';

const t = (competicao: string, ano: number, nota = '', oficial = true): TituloCasa => ({ competicao, ano, oficial, nota, fonte: '' });

describe('Casa do [time]: lógica', () => {
  it('nome com o artigo do time', () => {
    expect(nomeDaCasa({ nome: 'Flamengo', artigo: 'o' })).toBe('Casa do Flamengo');
    expect(nomeDaCasa({ nome: 'Chapecoense', artigo: 'a' })).toBe('Casa da Chapecoense');
  });

  it('datas no formato brasileiro, com a precisão que o dado tem', () => {
    expect(dataBR('1921-01-02')).toBe('02/01/1921');
    expect(dataBR('1928-06')).toBe('06/1928');
    expect(dataBR('2014')).toBe('2014');
  });

  it('nome do estádio com o popular entre parênteses, sem repetir', () => {
    expect(nomeDoEstadio({ nome: 'Estádio Governador Magalhães Pinto', nomePopular: 'Mineirão' })).toBe('Estádio Governador Magalhães Pinto (Mineirão)');
    expect(nomeDoEstadio({ nome: 'Arena Condá', nomePopular: '' })).toBe('Arena Condá');
    expect(nomeDoEstadio({ nome: 'Baixada', nomePopular: 'Baixada' })).toBe('Baixada');
  });

  it('prateleira na ordem mundial, continental, nacional, regional e estadual, anos em ordem', () => {
    const p = montarPrateleiras([
      t('estadual', 2019, 'Campeonato Mineiro'),
      t('copa-do-brasil', 2017),
      t('libertadores', 1997),
      t('estadual', 1928, 'Campeonato Mineiro'),
      t('libertadores', 1976),
      t('mundial-clubes', 2000),
      t('copa-do-nordeste', 2021),
    ]);
    expect(p.map((x) => x.nome)).toEqual([
      'Copa do Mundo de Clubes da FIFA',
      'CONMEBOL Libertadores',
      'Copa do Brasil',
      'Copa do Nordeste',
      'Campeonato Mineiro',
    ]);
    expect(p[1].anos).toEqual([1976, 1997]);
    expect(p[4].taca).toBe('bronze');
    expect(totalDeTitulos(p)).toBe(7);
  });

  it('título reivindicado conta no total, com a nota neutra; nota do estadual sai do nome', () => {
    const p = montarPrateleiras([
      t('brasileiro-a', 1987, 'O clube se considera campeão de 1987; a CBF reconhece o Sport.', false),
      t('brasileiro-a', 1980),
      t('estadual', 1973, 'Campeonato Paulista (título dividido com a Portuguesa)'),
      t('estadual', 1974, 'Campeonato Paulista'),
    ]);
    expect(p[0].anos).toEqual([1980, 1987]);
    expect(p[0].notas).toEqual([{ ano: 1987, nota: 'O clube se considera campeão de 1987; a CBF reconhece o Sport.' }]);
    expect(p[1].nome).toBe('Campeonato Paulista');
    expect(p[1].notas).toEqual([{ ano: 1973, nota: 'título dividido com a Portuguesa' }]);
    expect(totalDeTitulos(p)).toBe(4);
  });

  it('manto principal é o tradicional, mesmo fora da ordem 1', () => {
    const m = (ordem: number, periodo: string) => ({ ordem, periodo });
    expect(separarMantos([m(1, '1931'), m(2, 'tradicional')]).principal?.periodo).toBe('tradicional');
    expect(separarMantos([m(2, '1950'), m(1, '1904')]).principal?.periodo).toBe('1904');
    expect(separarMantos([m(1, 'tradicional'), m(2, '1904')]).varal.map((x) => x.periodo)).toEqual(['1904']);
  });

  it('fonte mostra o domínio e o fim do endereço', () => {
    expect(rotuloDaFonte('https://www.lance.com.br/lancepedia/maior-goleada-da-historia-do-cruzeiro.html')).toBe('lance.com.br · maior-goleada-da-historia-do-cruzeiro');
    expect(rotuloDaFonte('https://www.saopaulofc.net/spfcpedia/conquistas/')).toBe('saopaulofc.net · conquistas');
    expect(rotuloDaFonte('https://fcf.com.br/')).toBe('fcf.com.br');
  });

  it('dados reais: toda casa publicada é de um time da lista e monta a prateleira sem perder título', () => {
    for (const casa of Object.values(CASAS)) {
      expect(TIMES.some((x) => x.id === casa.id)).toBe(true);
      expect(totalDeTitulos(montarPrateleiras(casa.titulos))).toBe(casa.titulos.length);
      if (casa.recordes.gols.length) expect(dataDosRecordes(casa.recordes)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });
});
