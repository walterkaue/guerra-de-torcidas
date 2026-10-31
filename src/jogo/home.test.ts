import { describe, expect, it } from 'vitest';
import { TIMES, timePorId } from '../dados/times';
import type { JogoBasico } from './cravaTela';
import {
  degrausDoRecorde,
  fechaSemPalpite,
  frasesDoGiro,
  linhaDoDia,
  luzDoHorario,
  motivoDoJogo,
  placarCravado,
  proximoJogo,
  tonsDosChutes,
  type LinhaDoGiro,
} from './home';
import type { Pistas } from './timeDoDia';

const agora = new Date('2026-10-23T12:00:00Z');
const jogo = (id: string, rodada: number, horas: number): JogoBasico => ({
  id,
  rodada,
  inicio: new Date(agora.getTime() + horas * 3600_000).toISOString(),
  status_api: 'TIMED',
  confirmado_em: null,
  anulado: false,
});

describe('luz da arquibancada', () => {
  it('dia até 17h, entardecer até 19h e noite no resto', () => {
    expect(luzDoHorario(6)).toBe('dia');
    expect(luzDoHorario(16)).toBe('dia');
    expect(luzDoHorario(17)).toBe('entardecer');
    expect(luzDoHorario(18)).toBe('entardecer');
    expect(luzDoHorario(19)).toBe('noite');
    expect(luzDoHorario(23)).toBe('noite');
    expect(luzDoHorario(0)).toBe('noite');
    expect(luzDoHorario(5)).toBe('noite');
  });
});

describe('Jogar agora', () => {
  const tudo = { cravaFechaEm: 3600_000, chutesDoDia: 0, faltamPartidas: 3 };

  it('segue a ordem: Crava, Time do Dia, Lances e Prova', () => {
    expect(proximoJogo(tudo)).toBe('crava');
    expect(proximoJogo({ ...tudo, cravaFechaEm: null })).toBe('dia');
    expect(proximoJogo({ ...tudo, cravaFechaEm: null, chutesDoDia: null })).toBe('penaltis');
    expect(proximoJogo({ cravaFechaEm: null, chutesDoDia: null, faltamPartidas: 0 })).toBe('prova');
  });

  it('o Crava só passa na frente com menos de 24 h', () => {
    expect(proximoJogo({ ...tudo, cravaFechaEm: 24 * 3600_000 - 1 })).toBe('crava');
    expect(proximoJogo({ ...tudo, cravaFechaEm: 24 * 3600_000 })).toBe('dia');
  });

  it('o que não se sabe (sem conexão) pula para o próximo', () => {
    expect(proximoJogo({ cravaFechaEm: null, chutesDoDia: null, faltamPartidas: null })).toBe('prova');
  });

  it('diz o motivo em tom informativo', () => {
    expect(motivoDoJogo('crava', { ...tudo, cravaFechaEm: 5 * 3600_000 }, 5)).toBe('Crava a Rodada: fecha em 5h, sem palpite seu');
    expect(motivoDoJogo('dia', tudo, 5)).toBe('Time do Dia: ainda não jogou hoje');
    expect(motivoDoJogo('dia', { ...tudo, chutesDoDia: 2 }, 5)).toBe('Time do Dia: 2 de 6 chutes hoje');
    expect(motivoDoJogo('penaltis', tudo, 5)).toBe('Lances do Jogo: faltam 3 partidas que contam hoje');
    expect(motivoDoJogo('prova', tudo, 5)).toBe('Prova de Boleiro: 8 perguntas, para quando quiser');
  });
});

describe('rodada que fecha sem palpite', () => {
  const jogos = [jogo('a', 32, 3), jogo('b', 32, 27), jogo('c', 33, 200)];

  it('mede até o próximo palpite trancar', () => {
    expect(fechaSemPalpite(jogos, new Set(), agora)).toBe(3 * 3600_000);
  });

  it('um palpite na rodada já tira o Crava da frente, mesmo em jogo de outra hora', () => {
    expect(fechaSemPalpite(jogos, new Set(['b']), agora)).toBeNull();
  });

  it('palpite de outra rodada não conta', () => {
    expect(fechaSemPalpite(jogos, new Set(['c']), agora)).toBe(3 * 3600_000);
  });

  it('sem saber os palpites ou sem jogo aberto, não vem ao caso', () => {
    expect(fechaSemPalpite(jogos, null, agora)).toBeNull();
    expect(fechaSemPalpite([jogo('a', 32, -2), jogo('b', 32, -1)], new Set(), agora)).toBeNull();
  });
});

describe('estado dos cards', () => {
  it('Time do Dia: chutes usados ou o resultado', () => {
    const volta = (5 * 60 + 12) * 60_000;
    expect(linhaDoDia({ chutes: 0, fim: false, acertou: false }, volta)).toBe('0 de 6 chutes hoje');
    expect(linhaDoDia({ chutes: 2, fim: false, acertou: false }, volta)).toBe('2 de 6 chutes hoje');
    expect(linhaDoDia({ chutes: 4, fim: true, acertou: true }, volta)).toBe('Acertou na 4ª · volta em 5h 12m');
    expect(linhaDoDia({ chutes: 6, fim: true, acertou: false }, volta)).toBe('Não foi hoje · volta em 5h 12m');
  });

  it('a grade do Time do Dia não leva nome de clube', () => {
    const pistas = { estado: { tom: 'certo' }, fundacao: { tom: 'perto' }, titulos: { tom: 'longe' }, divisao: { tom: 'certo' }, cores: { tom: 'longe' }, capital: { tom: 'certo' } } as Pistas;
    expect(tonsDosChutes([{ pistas }])).toEqual([['certo', 'perto', 'longe', 'certo', 'longe', 'certo']]);
  });

  it('o recorde acende os degraus que os pontos garantidos alcançam', () => {
    expect(degrausDoRecorde(null)).toBe(0);
    expect(degrausDoRecorde(0)).toBe(0);
    expect(degrausDoRecorde(8)).toBe(1);
    expect(degrausDoRecorde(39)).toBe(3);
    expect(degrausDoRecorde(40)).toBe(4);
    expect(degrausDoRecorde(150)).toBe(8);
  });

  it('a tarja do Crava mostra o palpite do próximo jogo aberto da rodada', () => {
    const jogos = [jogo('a', 32, -1), jogo('b', 32, 3), jogo('c', 32, 5)];
    const palpites = new Map([['a', { m: 3, v: 0 }], ['c', { m: 2, v: 1 }]]);
    expect(placarCravado(jogos, palpites, agora)).toEqual({ m: 2, v: 1 });
    expect(placarCravado(jogos, new Map(), agora)).toBeNull();
    expect(placarCravado(jogos, null, agora)).toBeNull();
  });
});

describe('giro da semana', () => {
  const linha = (time_id: string, posicao_campeao: number, media30: number, ativos = 10): LinhaDoGiro => ({ time_id, posicao_campeao, media30, ativos });

  it('conta quem subiu e quem caiu desde a última visita', () => {
    const frases = frasesDoGiro([linha('flamengo', 2, 90), linha('vasco', 3, 80)], { flamengo: 4, vasco: 2 }, timePorId);
    expect(frases).toContain('Flamengo subiu pro 2º');
    expect(frases).toContain('Vasco caiu pro 3º');
  });

  it('usa o artigo certo do time de referência', () => {
    expect(frasesDoGiro([linha('palmeiras', 1, 100), linha('corinthians', 2, 88)], {}, timePorId)).toContain('Corinthians a 12 do Palmeiras');
    expect(frasesDoGiro([linha('chapecoense', 1, 100), linha('corinthians', 2, 88)], {}, timePorId)).toContain('Corinthians a 12 da Chapecoense');
  });

  it('empate vira "colado", com o gênero do time', () => {
    expect(frasesDoGiro([linha('palmeiras', 1, 90), linha('corinthians', 2, 90)], {}, timePorId)).toContain('Corinthians colado no Palmeiras');
    expect(frasesDoGiro([linha('palmeiras', 1, 90), linha('chapecoense', 2, 90)], {}, timePorId)).toContain('Chapecoense colada no Palmeiras');
  });

  it('a disputa do seu time vem antes das outras', () => {
    const linhas = [linha('flamengo', 1, 100), linha('vasco', 2, 99), linha('palmeiras', 3, 50), linha('santos', 4, 20)];
    const frases = frasesDoGiro(linhas, {}, timePorId, 'santos');
    expect(frases[0]).toBe('Flamengo lidera a semana');
    expect(frases[1]).toBe('Santos a 30 do Palmeiras');
  });

  it('só fala de quem jogou e nunca passa de 6 frases', () => {
    expect(frasesDoGiro([linha('flamengo', 1, 0, 0)], {}, timePorId)).toEqual([]);
    expect(frasesDoGiro(TIMES.map((t, i) => linha(t.id, i + 1, 200 - i)), {}, timePorId)).toHaveLength(6);
  });
});
