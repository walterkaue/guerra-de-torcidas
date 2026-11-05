import { describe, expect, it } from 'vitest';
import {
  LINHA_DO_HUB,
  alvoDoX1,
  avisoDoErroDoX1,
  clubeInicial,
  clubeValido,
  clubesDoTipo,
  conviteLances,
  itensDaTelaUnica,
  itensDoFiltro,
  linhasDeTentativas,
  textoDaTentativa,
  tipoDaAba,
} from './lancesTelaUnica';
import { ITEM_LIVRE } from './lancesTextos';

const lances = [
  { id: 'f1', clube: 'flamengo', tipo: 'falta' as const },
  { id: 'c1', clube: 'selecao', tipo: 'finalizacao' as const },
  { id: 'f2', clube: 'palmeiras', tipo: 'falta' as const },
];
const disputas = [{ id: 'fla-2019-final', clube: 'flamengo' }];
const itens = itensDaTelaUnica(lances, disputas);

describe('itens da tela única', () => {
  it('põe a Disputa livre, todas as disputas e os lances', () => {
    expect(itens.map((i) => i.id)).toEqual([ITEM_LIVRE, 'penaltis:fla-2019-final', 'f1', 'c1', 'f2']);
    expect(itens[0].clube).toBeNull();
  });

  it('a Disputa livre aparece em Todos e em Pênaltis, de qualquer clube', () => {
    expect(itensDoFiltro(itens, 'todos', 'palmeiras').map((i) => i.id)).toEqual([ITEM_LIVRE, 'f2']);
    expect(itensDoFiltro(itens, 'penaltis', 'palmeiras').map((i) => i.id)).toEqual([ITEM_LIVRE]);
    expect(itensDoFiltro(itens, 'falta', 'todos').map((i) => i.id)).toEqual(['f1', 'f2']);
    expect(itensDoFiltro(itens, 'finalizacao', 'flamengo')).toEqual([]);
  });

  it('o clube abre no time da pessoa só se ele tiver item', () => {
    expect(clubeInicial(itens, 'flamengo')).toBe('flamengo');
    expect(clubeInicial(itens, 'remo')).toBe('todos');
  });

  it('o clube escolhido volta a "todos" quando não tem item no tipo', () => {
    expect(clubeValido(itens, 'falta', 'flamengo')).toBe('flamengo');
    expect(clubeValido(itens, 'finalizacao', 'flamengo')).toBe('todos');
    expect(clubesDoTipo(itens, 'todos').sort()).toEqual(['flamengo', 'palmeiras', 'selecao']);
  });

  it('a aba da rota abre o tipo', () => {
    expect(tipoDaAba('falta')).toBe('falta');
    expect(tipoDaAba(undefined)).toBe('todos');
    expect(tipoDaAba('outra')).toBe('todos');
  });
});

describe('textos da tela única', () => {
  it('a linha do hub traz o +8', () => {
    expect(LINHA_DO_HUB).toBe('Escolha um lance: 3 tentativas. Gol no canto do lance de verdade vale +8.');
  });

  it('tentativas', () => {
    expect(textoDaTentativa(1)).toBe('Tentativa 2 de 3');
    expect(linhasDeTentativas(3)).toEqual(['Tentativa 1', 'Tentativa 2', 'Tentativa 3']);
  });

  it('alvo do X1, com e sem apelido', () => {
    expect(alvoDoX1('Camisa10', 96)).toBe('X1: Camisa10 fez 96');
    expect(alvoDoX1(null, 96)).toBe('X1: Alguém fez 96');
  });

  it('erros do X1 viram partida normal; os outros, não', () => {
    expect(avisoDoErroDoX1('desafio_nao_encontrado')).toBe('Esse X1 não existe mais. Vai uma partida normal!');
    expect(avisoDoErroDoX1('proprio_desafio')).toBe('Esse X1 é seu. Vai uma partida normal!');
    expect(avisoDoErroDoX1('desafio_expirado')).toBe('Esse X1 expirou. Vai uma partida normal!');
    expect(avisoDoErroDoX1('limite_do_dia')).toBeNull();
  });

  it('convite', () => {
    expect(conviteLances(96, 'pro Flamengo', true)).toBe('Te chamei no X1 dos Lances: fiz 96 pro Flamengo. Faz mais?');
    expect(conviteLances(1, null, false)).toBe('Fiz 1 ponto nos Lances do Jogo. Joga também:');
  });
});
