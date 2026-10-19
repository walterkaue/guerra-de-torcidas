import { describe, expect, it } from 'vitest';
import { semanaBrasilia } from '../../supabase/functions/_shared/tempo.ts';
import {
  acertoDoPalpite,
  alvosDaRodada,
  linhaEmoji,
  palpiteContra,
  placarValido,
  pontosDaRodada,
  semanaConfirmadaEm,
  semanaDosPontos,
  TETO_RODADA,
  type JogoDaRodada,
  type Placar,
} from './crava';

const p = (m: number, v: number): Placar => ({ m, v });
const utc = (s: string) => new Date(`${s}Z`);
const jogo = (id: string, confirmadoEm: string | null, placar: Placar | null, anulado = false): JogoDaRodada => ({
  id,
  confirmadoEm,
  placar,
  anulado,
});

describe('acerto do palpite', () => {
  it('placar exato vale 10', () => {
    expect(acertoDoPalpite(p(2, 1), p(2, 1))).toBe('exato');
    expect(acertoDoPalpite(p(0, 0), p(0, 0))).toBe('exato');
  });

  it('vencedor e saldo certos vale 7', () => {
    expect(acertoDoPalpite(p(2, 1), p(3, 2))).toBe('saldo');
    expect(acertoDoPalpite(p(0, 2), p(1, 3))).toBe('saldo');
  });

  it('empate com outro placar vale 7 (saldo zero dos dois lados)', () => {
    expect(acertoDoPalpite(p(1, 1), p(2, 2))).toBe('saldo');
    expect(acertoDoPalpite(p(0, 0), p(3, 3))).toBe('saldo');
  });

  it('só o vencedor vale 5', () => {
    expect(acertoDoPalpite(p(1, 0), p(3, 0))).toBe('vencedor');
    expect(acertoDoPalpite(p(0, 1), p(2, 4))).toBe('vencedor');
  });

  it('errou vale 0', () => {
    expect(acertoDoPalpite(p(1, 0), p(0, 1))).toBe('errou');
    expect(acertoDoPalpite(p(1, 1), p(1, 0))).toBe('errou');
    expect(acertoDoPalpite(p(2, 0), p(2, 2))).toBe('errou');
  });

  it('placar de 0 a 9, só inteiros', () => {
    expect(placarValido(p(0, 9))).toBe(true);
    expect(placarValido(p(10, 0))).toBe(false);
    expect(placarValido(p(-1, 0))).toBe(false);
    expect(placarValido(p(1.5, 0))).toBe(false);
    expect(placarValido(null)).toBe(false);
  });
});

describe('pontos da rodada', () => {
  const palpites = new Map<string, Placar>([
    ['a', p(2, 1)],
    ['b', p(1, 1)],
    ['c', p(0, 1)],
  ]);

  it('peso ×2 na torcida', () => {
    const r = pontosDaRodada([jogo('a', '2026-10-23T23:00:00Z', p(2, 1))], palpites, null);
    expect(r).toEqual([{ jogoId: 'a', acerto: 'exato', certeza: false, palpite: 10, torcida: 20 }]);
  });

  it('jogo da certeza dobra o palpite (e o peso dobra de novo na torcida)', () => {
    const jogos = [jogo('a', '2026-10-23T23:00:00Z', p(3, 2)), jogo('b', '2026-10-24T23:00:00Z', p(2, 2))];
    const r = pontosDaRodada(jogos, palpites, 'a');
    expect(r.map((x) => [x.jogoId, x.palpite, x.torcida, x.certeza])).toEqual([
      ['a', 14, 28, true],
      ['b', 7, 14, false],
    ]);
  });

  it('certeza que erra não dá nada', () => {
    const r = pontosDaRodada([jogo('a', '2026-10-23T23:00:00Z', p(0, 3))], palpites, 'a');
    expect(r[0]).toMatchObject({ acerto: 'errou', palpite: 0, torcida: 0, certeza: true });
  });

  it('só conta jogo confirmado e com palpite', () => {
    const jogos = [jogo('a', null, p(2, 1)), jogo('z', '2026-10-23T23:00:00Z', p(1, 0))];
    expect(pontosDaRodada(jogos, palpites, null)).toEqual([]);
  });

  it('teto de 300 por rodada na ordem de confirmação', () => {
    // 20 jogos com placar exato: 20 por jogo na torcida, 400 no total.
    const muitos = new Map<string, Placar>();
    const jogos: JogoDaRodada[] = [];
    for (let i = 0; i < 20; i++) {
      const id = `j${String(i).padStart(2, '0')}`;
      muitos.set(id, p(1, 0));
      // Confirmados em ordem inversa à do id: a ordem que vale é a da confirmação.
      jogos.push(jogo(id, new Date(Date.UTC(2026, 9, 26, 0, 59 - i)).toISOString(), p(1, 0)));
    }
    const r = pontosDaRodada(jogos, muitos, 'j00');
    // j00 é o último confirmado e era a certeza (40), mas o teto já acabou.
    expect(r.reduce((s, x) => s + x.torcida, 0)).toBe(TETO_RODADA);
    expect(r[0].jogoId).toBe('j19');
    expect(r.at(-1)).toMatchObject({ jogoId: 'j00', certeza: true, palpite: 20, torcida: 0 });
    // O 15º confirmado completa os 300; dali em diante, zero.
    expect(r.map((x) => x.torcida)).toEqual([...Array(15).fill(20), 0, 0, 0, 0, 0]);
  });

  it('teto corta no meio de um jogo', () => {
    const muitos = new Map<string, Placar>();
    const jogos: JogoDaRodada[] = [];
    for (let i = 0; i < 8; i++) {
      muitos.set(`j${i}`, p(1, 0));
      jogos.push(jogo(`j${i}`, `2026-10-26T00:0${i}:00Z`, p(1, 0)));
    }
    // 14 exatos (280) antes da certeza, que valeria 40: entra só 20.
    for (let i = 8; i < 16; i++) {
      muitos.set(`k${i}`, p(1, 0));
      jogos.push(jogo(`k${i}`, `2026-10-26T01:${String(i).padStart(2, '0')}:00Z`, p(1, 0)));
    }
    const r = pontosDaRodada(jogos, muitos, 'k14');
    expect(r.find((x) => x.jogoId === 'k14')).toMatchObject({ palpite: 20, torcida: 20 }); // 280 + 40 → corta em 20
    expect(r.reduce((s, x) => s + x.torcida, 0)).toBe(TETO_RODADA);
  });

  it('corrigir o placar não muda a ordem (vale a primeira confirmação)', () => {
    const antes = pontosDaRodada([jogo('a', '2026-10-23T23:00:00Z', p(3, 0))], palpites, null);
    const depois = pontosDaRodada([jogo('a', '2026-10-23T23:00:00Z', p(2, 1))], palpites, null);
    expect(antes[0].torcida).toBe(10); // só o vencedor
    expect(depois[0].torcida).toBe(20); // exato
  });

  it('jogo anulado: sem pontos e o dobro da certeza se perde', () => {
    const jogos = [jogo('a', null, null, true), jogo('b', '2026-10-24T23:00:00Z', p(1, 1))];
    const r = pontosDaRodada(jogos, palpites, 'a');
    expect(r).toEqual([
      { jogoId: 'b', acerto: 'exato', certeza: false, palpite: 10, torcida: 20 },
      { jogoId: 'a', acerto: null, certeza: true, palpite: 0, torcida: 0 },
    ]);
  });

  it('jogo confirmado e depois anulado zera', () => {
    const r = pontosDaRodada([jogo('a', '2026-10-23T23:00:00Z', p(2, 1), true)], palpites, null);
    expect(r[0]).toMatchObject({ acerto: null, torcida: 0 });
  });

  it('jogo adiado entra no fim da fila do teto, quando for confirmado', () => {
    const jogos = [
      jogo('a', '2026-12-03T01:00:00Z', p(2, 1)), // adiado, confirmado só em dezembro
      jogo('b', '2026-10-24T23:00:00Z', p(1, 1)),
      jogo('c', null, null), // adiado, ainda sem data
    ];
    const r = pontosDaRodada(jogos, palpites, null);
    expect(r.map((x) => x.jogoId)).toEqual(['b', 'a']);
  });
});

describe('alvos da rodada (o que o servidor grava)', () => {
  it('um alvo por pessoa e jogo, inclusive zero, com a certeza de cada um', () => {
    const jogos = [jogo('a', '2026-10-23T23:00:00Z', p(2, 1)), jogo('b', '2026-10-24T23:00:00Z', p(0, 0))];
    const alvos = alvosDaRodada(
      jogos,
      [
        { torcedorId: 'u1', jogoId: 'a', placar: p(2, 1) },
        { torcedorId: 'u1', jogoId: 'b', placar: p(1, 0) },
        { torcedorId: 'u2', jogoId: 'b', placar: p(1, 1) },
      ],
      new Map([['u1', 'a'], ['u2', 'b']]),
    );
    expect(alvos).toEqual([
      { torcedorId: 'u1', jogoId: 'a', pontos: 40 },
      { torcedorId: 'u1', jogoId: 'b', pontos: 0 },
      { torcedorId: 'u2', jogoId: 'b', pontos: 28 },
    ]);
  });

  it('calcular de novo dá o mesmo alvo (confirmar duas vezes não duplica)', () => {
    const jogos = [jogo('a', '2026-10-23T23:00:00Z', p(2, 1))];
    const ps = [{ torcedorId: 'u1', jogoId: 'a', placar: p(2, 1) }];
    expect(alvosDaRodada(jogos, ps, new Map())).toEqual(alvosDaRodada(jogos, ps, new Map()));
  });
});

describe('semana dos pontos', () => {
  it('rodada que cruza duas semanas reparte pela data de cada jogo', () => {
    // Domingo 25/10 18h, confirmado às 21h; segunda 26/10 20h, confirmado às 22h.
    expect(semanaDosPontos(utc('2026-10-25T21:00:00'), utc('2026-10-26T00:00:00'))).toBe('2026-10-19');
    expect(semanaDosPontos(utc('2026-10-26T23:00:00'), utc('2026-10-27T01:00:00'))).toBe('2026-10-26');
  });

  it('jogo de domingo à noite confirmado na segunda de manhã entra na semana do jogo', () => {
    const domingo = utc('2026-10-26T00:30:00'); // domingo 25/10, 21h30
    expect(semanaDosPontos(domingo, utc('2026-10-26T14:59:00'))).toBe('2026-10-19'); // segunda 11h59
  });

  it('depois de segunda 12h a semana fechou: o ponto vai para a semana atual', () => {
    const domingo = utc('2026-10-26T00:30:00');
    expect(semanaConfirmadaEm('2026-10-19').toISOString()).toBe('2026-10-26T15:00:00.000Z');
    expect(semanaDosPontos(domingo, utc('2026-10-26T15:00:00'))).toBe('2026-10-26');
  });

  it('jogo adiado conta na semana em que foi disputado', () => {
    // Era da 32ª (24/10), foi para quarta 4/11.
    expect(semanaDosPontos(utc('2026-11-04T22:00:00'), utc('2026-11-05T01:00:00'))).toBe('2026-11-02');
  });

  it('mesma semana que o relógio do servidor', () => {
    for (const h of ['2026-10-19T02:59:00', '2026-10-19T03:00:00', '2026-10-25T23:00:00']) {
      expect(semanaDosPontos(utc(h), utc(h))).toBe(semanaBrasilia(utc(h)));
    }
  });
});

describe('narrador e card', () => {
  it('palpite contra o próprio time', () => {
    expect(palpiteContra(p(0, 2), 'flamengo', 'vasco', 'flamengo')).toBe(true);
    expect(palpiteContra(p(2, 0), 'flamengo', 'vasco', 'vasco')).toBe(true);
    expect(palpiteContra(p(1, 1), 'flamengo', 'vasco', 'vasco')).toBe(false);
    expect(palpiteContra(p(0, 2), 'flamengo', 'vasco', 'bahia')).toBe(false);
    expect(palpiteContra(p(0, 2), 'flamengo', 'vasco', null)).toBe(false);
  });

  it('linha de emoji com ⭐ logo depois da certeza, sem anulado', () => {
    expect(
      linhaEmoji([
        { acerto: 'exato', certeza: false },
        { acerto: 'saldo', certeza: true },
        { acerto: 'vencedor', certeza: false },
        { acerto: null, certeza: false },
        { acerto: 'errou', certeza: false },
      ]),
    ).toBe('🎯✅⭐☑️❌');
  });
});
