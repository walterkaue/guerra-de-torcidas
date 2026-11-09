// Convite do desafio por link (C06): faixas de time, situação da placa, botões, destinos e textos.

import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import {
  acoesDoConvite,
  avisoDoConvite,
  conviteDoLink,
  destinoDoDesafio,
  entradaDoConvite,
  faixasDoConvite,
  linhaDeQuemJaJoga,
  listaDoConvite,
  placaDaTriagem,
  situacaoDoResumo,
  textoDoConvitePenaltis,
  textoDoConviteProva,
} from './conviteDesafio';

const ids = (ts: { id: string }[]) => ts.map((t) => t.id);

describe('faixas do convite', () => {
  it('o time de quem chamou e o rival dele, nessa ordem', () => {
    expect(ids(faixasDoConvite('corinthians'))).toEqual(['corinthians', 'palmeiras']);
    expect(ids(faixasDoConvite('flamengo'))).toEqual(['flamengo', 'fluminense']);
  });

  it('o rival não é recíproco: desafio do Botafogo mostra Botafogo e Flamengo', () => {
    expect(ids(faixasDoConvite('botafogo'))).toEqual(['botafogo', 'flamengo']);
    expect(ids(faixasDoConvite('vasco'))).toEqual(['vasco', 'flamengo']);
  });

  it('time sem clássico: uma faixa só', () => {
    expect(ids(faixasDoConvite('bragantino'))).toEqual(['bragantino']);
    expect(ids(faixasDoConvite('remo'))).toEqual(['remo']);
  });

  it('Outro time, time desconhecido ou sem time: nenhuma faixa', () => {
    expect(faixasDoConvite('outro')).toEqual([]);
    expect(faixasDoConvite('time-que-nao-existe')).toEqual([]);
    expect(faixasDoConvite(null)).toEqual([]);
  });

  it('nunca o mesmo time dos dois lados, em nenhum dos 21', () => {
    for (const t of TIMES) {
      const f = ids(faixasDoConvite(t.id));
      expect(new Set(f).size).toBe(f.length);
      expect(f.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('situação e botões do convite', () => {
  it('resumo do servidor', () => {
    expect(situacaoDoResumo(null)).toBe('nao_existe');
    expect(situacaoDoResumo({ vencido: true })).toBe('vencido');
    expect(situacaoDoResumo({})).toBe('aberto');
    expect(situacaoDoResumo({ vencido: false })).toBe('aberto');
  });

  it('avisos no lugar da placa', () => {
    expect(avisoDoConvite('vencido')).toBe('Apitou o fim: esse desafio valia 7 dias. Bora outro!');
    expect(avisoDoConvite('nao_existe')).toBe('Esse desafio não existe mais. Bora outro!');
    expect(avisoDoConvite('sem_rede')).toBe('Sem rede: o desafio não carregou.');
    expect(avisoDoConvite('aberto')).toBeNull();
    expect(avisoDoConvite('buscando')).toBeNull();
  });

  it('buscando: nenhum botão ainda', () => {
    expect(acoesDoConvite('buscando', true, 2)).toMatchObject({ faixas: false, escolher: null, amarelo: null });
  });

  it('quem é novo: as faixas são a ação, sem amarelo, com "Outro time" e "Já jogo em outro aparelho"', () => {
    expect(acoesDoConvite('aberto', true, 2)).toEqual({
      faixas: true,
      escolher: 'outro_time',
      encarar: false,
      inicio: false,
      tentar: false,
      outroAparelho: true,
      amarelo: null,
    });
  });

  it('quem é novo e quem chamou é Outro time: só "Escolher meu time"', () => {
    expect(acoesDoConvite('aberto', true, 0)).toMatchObject({ faixas: false, escolher: 'escolher_meu_time', amarelo: 'escolher' });
  });

  it('quem já joga: "Encarar o desafio" amarelo e "Ir pro início"', () => {
    expect(acoesDoConvite('aberto', false, 2)).toMatchObject({ faixas: false, escolher: null, encarar: true, inicio: true, amarelo: 'encarar' });
  });

  it('vencido ou não existe: segue como o primeiro acesso sem link', () => {
    for (const s of ['vencido', 'nao_existe'] as const) {
      expect(acoesDoConvite(s, true, 2)).toMatchObject({ faixas: false, escolher: 'escolher_meu_time', encarar: false, amarelo: 'escolher' });
      expect(acoesDoConvite(s, false, 2)).toMatchObject({ faixas: false, escolher: null, encarar: false, inicio: true, amarelo: 'inicio' });
    }
  });

  it('sem rede: "Tentar de novo" amarelo e "Ir pro início"', () => {
    for (const novo of [true, false]) expect(acoesDoConvite('sem_rede', novo, 2)).toMatchObject({ tentar: true, inicio: true, faixas: false, amarelo: 'tentar' });
  });
});

describe('caminho do convite', () => {
  it('o link que abriu: pênaltis, Lances, Prova, nessa ordem', () => {
    expect(conviteDoLink({ d: 'abcdefgh' })).toEqual({ tipo: 'penaltis', codigo: 'abcdefgh' });
    expect(conviteDoLink({ l: 'abcdefgh' })).toEqual({ tipo: 'lances', codigo: 'abcdefgh' });
    expect(conviteDoLink({ p: 'abcdefgh' })).toEqual({ tipo: 'prova', codigo: 'abcdefgh' });
    expect(conviteDoLink({ d: 'aaaaaaaa', p: 'bbbbbbbb' })).toEqual({ tipo: 'penaltis', codigo: 'aaaaaaaa' });
    expect(conviteDoLink({})).toBeUndefined();
  });

  it('quem já joga sem faixa passa pela triagem antes; quem é novo vê o convite direto', () => {
    const c = { tipo: 'lances', codigo: 'abcdefgh' } as const;
    expect(entradaDoConvite(c, true, false)).toEqual({ tela: 'triagem', depois: { tela: 'convite', ...c } });
    expect(entradaDoConvite(c, true, true)).toEqual({ tela: 'convite', ...c });
    expect(entradaDoConvite(c, false, false)).toEqual({ tela: 'convite', ...c });
  });

  it('destino depois de aceitar: a partida de cada tipo, e a Prova com a contagem', () => {
    expect(destinoDoDesafio('penaltis', 'abcdefgh')).toEqual({ tela: 'partida', desafio: 'abcdefgh' });
    expect(destinoDoDesafio('lances', 'abcdefgh')).toEqual({ tela: 'lances', desafio: 'abcdefgh' });
    expect(destinoDoDesafio('prova', 'abcdefgh')).toEqual({ tela: 'prova', desafio: 'abcdefgh', contagem: true });
  });

  it('a lista vinda do convite leva o desafio e a marca do convite', () => {
    expect(listaDoConvite('penaltis', 'abcdefgh')).toEqual({ tela: 'times', depois: 'partida', desafio: 'abcdefgh', convite: true });
    expect(listaDoConvite('prova', 'abcdefgh')).toEqual({ tela: 'times', depois: 'prova', desafio: 'abcdefgh', convite: true });
  });
});

describe('textos do convite', () => {
  it('pênaltis, com e sem apelido e time', () => {
    expect(textoDoConvitePenaltis({ apelido: 'Zé', time_id: 'flamengo', pontos: 96, gols_jogador: 3, gols_maquina: 2 })).toBe(
      'Zé (Flamengo) fez 96 pontos, 3 x 2 contra a máquina.',
    );
    expect(textoDoConvitePenaltis({ apelido: null, time_id: 'outro', pontos: 40, gols_jogador: 1, gols_maquina: 4 })).toBe(
      'Alguém fez 40 pontos, 1 x 4 contra a máquina.',
    );
  });

  it('Prova', () => {
    expect(textoDoConviteProva({ apelido: null, time_id: 'palmeiras', pontos: 96, resumo: '6 de 8 certas' })).toBe(
      'Alguém (Palmeiras): 6 de 8 certas, 96 pontos. Mesmas 8 perguntas, faz mais?',
    );
  });

  it('quem já joga, pelo artigo do time', () => {
    expect(linhaDeQuemJaJoga('flamengo')).toBe('Você joga pelo Flamengo');
    expect(linhaDeQuemJaJoga('chapecoense')).toBe('Você joga pela Chapecoense');
    expect(linhaDeQuemJaJoga('outro')).toBe('Você joga pelo seu time');
  });

  it('placa da triagem: neutra de gênero ("de", nunca "do/da" antes do apelido)', () => {
    expect(placaDaTriagem({ tipo: 'penaltis', apelido: 'Bia', pontos: 96, timeId: 'fluminense' })).toEqual({
      titulo: 'Desafio de Bia nos pênaltis',
      linha: 'Você entra pelo Fluminense. 96 pontos pra bater.',
    });
    expect(placaDaTriagem({ tipo: 'lances', apelido: null, pontos: 1, timeId: 'chapecoense' })).toEqual({
      titulo: 'Desafio de alguém nos Lances',
      linha: 'Você entra pela Chapecoense. 1 ponto pra bater.',
    });
    expect(placaDaTriagem({ tipo: 'prova', pontos: 50, timeId: 'outro' }).linha).toBe('Você entra pelo seu time. 50 pontos pra bater.');
  });
});
