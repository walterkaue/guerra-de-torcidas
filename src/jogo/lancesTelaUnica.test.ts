import { describe, expect, it } from 'vitest';
import {
  LINHA_DO_HUB,
  alvoDoX1,
  fraseNeutraDoX1,
  placarDoX1,
  avisoDoErroDoX1,
  clubeInicial,
  clubeValido,
  clubesDoTipo,
  conviteLances,
  idsDoLanceDoDia,
  itensDaTelaUnica,
  itensDoFiltro,
  linhasDeTentativas,
  textoDaTentativa,
  tipoDaAba,
} from './lancesTelaUnica';

const lances = [
  { id: 'f1', clube: 'flamengo', tipo: 'falta' as const },
  { id: 'c1', clube: 'selecao', tipo: 'finalizacao' as const },
  { id: 'f2', clube: 'palmeiras', tipo: 'falta' as const },
];
const disputas = [{ id: 'fla-2019-final', clube: 'flamengo' }];
const itens = itensDaTelaUnica(lances, disputas);

describe('itens da tela única', () => {
  it('põe todas as disputas e os lances, sem Disputa livre', () => {
    expect(itens.map((i) => i.id)).toEqual(['penaltis:fla-2019-final', 'f1', 'c1', 'f2']);
    expect(itens.some((i) => i.id === 'penaltis:livre' || i.clube === null)).toBe(false);
  });

  it('o filtro de clube e de tipo só devolve itens do clube', () => {
    expect(itensDoFiltro(itens, 'todos', 'palmeiras').map((i) => i.id)).toEqual(['f2']);
    expect(itensDoFiltro(itens, 'penaltis', 'palmeiras')).toEqual([]);
    expect(itensDoFiltro(itens, 'penaltis', 'flamengo').map((i) => i.id)).toEqual(['penaltis:fla-2019-final']);
    expect(itensDoFiltro(itens, 'falta', 'todos').map((i) => i.id)).toEqual(['f1', 'f2']);
    expect(itensDoFiltro(itens, 'finalizacao', 'flamengo')).toEqual([]);
  });

  it('o clube abre no time da pessoa se ele tiver item; senão na Seleção (Outro time cai aqui)', () => {
    expect(clubeInicial(itens, 'flamengo')).toBe('flamengo');
    expect(clubeInicial(itens, 'remo')).toBe('selecao');
    expect(clubeInicial(itens, 'outro')).toBe('selecao');
    expect(clubeInicial(itens.filter((i) => i.clube !== 'selecao'), 'remo')).toBe('todos');
  });

  it('o Lance do Dia sorteia entre disputas e lances, na mesma lista para a Home e para a tela', () => {
    expect(idsDoLanceDoDia(lances, disputas)).toEqual(['penaltis:fla-2019-final', 'f1', 'c1', 'f2']);
    expect(idsDoLanceDoDia(lances, disputas)).toEqual(itens.map((i) => i.id));
    expect(idsDoLanceDoDia([], [])).toEqual([]);
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
    expect(LINHA_DO_HUB).toBe('Faltas e cara a cara: 3 tentativas do mesmo lance. Gol no canto do lance de verdade vale +8.');
  });

  it('tentativas', () => {
    expect(textoDaTentativa(1)).toBe('Tentativa 2 de 3');
    expect(linhasDeTentativas(3)).toEqual(['Tentativa 1', 'Tentativa 2', 'Tentativa 3']);
  });

  it('alvo do desafio, com e sem apelido', () => {
    expect(alvoDoX1('Camisa10', 96)).toBe('Desafio: Camisa10 fez 96');
    expect(alvoDoX1(null, 96)).toBe('Desafio: alguém fez 96');
  });

  it('erros do desafio viram partida normal; os outros, não', () => {
    expect(avisoDoErroDoX1('desafio_nao_encontrado')).toBe('Esse desafio não existe mais. Bora outro!');
    expect(avisoDoErroDoX1('proprio_desafio')).toBe('Esse desafio é seu. Bora outro!');
    expect(avisoDoErroDoX1('desafio_expirado')).toBe('Apitou o fim: esse desafio valia 7 dias. Bora outro!');
    expect(avisoDoErroDoX1('limite_do_dia')).toBeNull();
  });

  it('convite', () => {
    expect(conviteLances(96, 'pro Flamengo', true)).toBe('Te desafio nos Lances do Jogo: fiz 96 pro Flamengo. Faz mais?');
    expect(conviteLances(1, null, false)).toBe('Fiz 1 ponto nos Lances do Jogo. Vem pro jogo:');
  });

  it('frase neutra e placar do desafio recebido', () => {
    expect(fraseNeutraDoX1(true)).toBe('Desafio vencido! Agora é resenha no grupo.');
    expect(fraseNeutraDoX1(false)).toBe('Dessa vez deu o outro lado. Tem jogo de volta?');
    expect(placarDoX1(80, { desafiante: null, pontosDesafiante: 96, venceu: false }).nomeDoOutro).toBe('Rival do dia');
    expect(placarDoX1(80, { desafiante: ' Camisa10 ', pontosDesafiante: 96, venceu: false }).nomeDoOutro).toBe('Camisa10');
  });
});
