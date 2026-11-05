import { describe, expect, it } from 'vitest';
import { buscar, codigoDoErroDeEscolher, indexar, lerLista, normalizar, rotuloDaCidade, type Municipio } from './cidade';

const LISTA: Municipio[] = [
  [3509502, 'Campinas', 'SP'],
  [3510609, 'Caraguatatuba', 'SP'],
  [3550308, 'São Paulo', 'SP'],
  [4314902, 'Porto Alegre', 'RS'],
  [3304557, 'Rio de Janeiro', 'RJ'],
  [4106902, 'Santa Maria', 'RS'],
  [5006200, 'Santa Maria', 'DF'],
  [2927408, 'São Francisco do Conde', 'BA'],
];
const indice = indexar(LISTA);

describe('cidade', () => {
  it('normaliza sem acento e sem maiúscula', () => {
    expect(normalizar('  São  PAULO ')).toBe('sao paulo');
    expect(normalizar('Itaú-Mirim')).toBe('itau mirim');
  });
  it('acha "São Paulo · SP" digitando "sao paulo"', () => {
    const r = buscar(indice, 'sao paulo');
    expect(r[0]).toEqual([3550308, 'São Paulo', 'SP']);
    expect(rotuloDaCidade(r[0][1], r[0][2])).toBe('São Paulo · SP');
  });
  it('quem começa com o texto vem antes de quem só contém', () => {
    const r = buscar(indice, 'sao');
    expect(r.map((m) => m[1])).toEqual(['São Paulo', 'São Francisco do Conde']);
    expect(buscar(indice, 'rio').map((m) => m[1])).toEqual(['Rio de Janeiro']);
    expect(buscar(indice, 'maria')[0][1]).toBe('Santa Maria');
  });
  it('a UF no fim filtra o estado', () => {
    expect(buscar(indice, 'santa maria rs')).toEqual([[4106902, 'Santa Maria', 'RS']]);
    expect(buscar(indice, 'santa maria df')).toEqual([[5006200, 'Santa Maria', 'DF']]);
  });
  it('um "de" no fim não é tratado como estado', () => {
    expect(buscar(indice, 'rio de')[0][1]).toBe('Rio de Janeiro');
  });
  it('menos de 2 letras não busca', () => {
    expect(buscar(indice, 's')).toEqual([]);
    expect(buscar(indice, '')).toEqual([]);
  });
  it('respeita o limite', () => {
    expect(buscar(indice, 'sa', 2)).toHaveLength(2);
  });
  it('lerLista descarta o que não tem o formato', () => {
    expect(lerLista([[1, 'A', 'SP'], ['x', 'B', 'SP'], [2, 'C', 'SPP'], 'lixo'])).toEqual([[1, 'A', 'SP']]);
    expect(lerLista({})).toEqual([]);
  });
});

describe('erro de escolherCidade', () => {
  it('reconhece o código pela mensagem do servidor', () => {
    for (const c of ['cidade_invalida', 'sem_torcedor', 'sessao_encerrada', 'muitas_trocas'] as const) {
      expect(codigoDoErroDeEscolher({ message: `P0001: ${c}`, code: 'P0001' })).toBe(c);
    }
  });
  it('42501 sem mensagem conhecida é sessão encerrada', () => {
    expect(codigoDoErroDeEscolher({ message: 'permission denied', code: '42501' })).toBe('sessao_encerrada');
  });
  it('a mensagem manda sobre o código SQL', () => {
    expect(codigoDoErroDeEscolher({ message: 'muitas_trocas', code: '42501' })).toBe('muitas_trocas');
  });
  it('o resto é falha', () => {
    expect(codigoDoErroDeEscolher({ message: 'timeout', code: '57014' })).toBe('falha');
    expect(codigoDoErroDeEscolher({})).toBe('falha');
  });
});
