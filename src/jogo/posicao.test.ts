import { describe, expect, it } from 'vitest';
import { htmlPosicao, linhaPosicaoMinigame, linhaPosicaoSemana, linhaRecorde, recordeCrava, setaDaPosicao } from './posicao';

describe('sua posição', () => {
  it('semana: posição, total e pontos; sem pontuar, chama pra disputa', () => {
    expect(linhaPosicaoSemana({ posicao: 3, total: 14, pontos: 1234 })).toBe('Sua posição: 3º de 14 na semana · 1.234 pontos');
    expect(linhaPosicaoSemana({ posicao: 1, total: 1, pontos: 1 })).toBe('Sua posição: 1º de 1 na semana · 1 ponto');
    expect(linhaPosicaoSemana({ posicao: null, total: 14, pontos: 0 })).toBe('14 pessoas já pontuaram na semana. Joga uma e entra na disputa!');
    expect(linhaPosicaoSemana({ posicao: null, total: 1, pontos: 0 })).toBe('1 pessoa já pontuou na semana. Joga uma e entra na disputa!');
    expect(linhaPosicaoSemana({ posicao: null, total: 0, pontos: 0 })).toBe('Ninguém pontuou ainda nesta semana. Sai na frente!');
  });

  it('minigame: diz onde; partida que não entrou não mostra posição', () => {
    const d = { posicao: 2, total: 9, recorde: 80, novoRecorde: false };
    expect(linhaPosicaoMinigame(d, 'penaltis')).toBe('Sua posição: 2º de 9 nos pênaltis na semana');
    expect(linhaPosicaoMinigame(d, 'prova')).toBe('Sua posição: 2º de 9 na Prova de Boleiro na semana');
    expect(linhaPosicaoMinigame(d, 'dia')).toBe('Sua posição: 2º de 9 no Time do Dia de hoje');
    expect(linhaPosicaoMinigame({ ...d, posicao: null }, 'penaltis')).toBeNull();
  });

  it('textos neutros de gênero (nada de "você é o/a")', () => {
    const textos = [
      linhaPosicaoSemana({ posicao: 3, total: 14, pontos: 10 }),
      linhaPosicaoMinigame({ posicao: 3, total: 14, recorde: 1, novoRecorde: false }, 'dia'),
    ];
    for (const t of textos) expect(t).not.toMatch(/você é (o|a)\b/i);
  });

  it('recorde', () => {
    expect(linhaRecorde(85)).toBe('Seu recorde: 85 pontos');
    expect(linhaRecorde(null)).toBeNull();
  });

  it('seta só quando a posição muda', () => {
    expect(setaDaPosicao(5, 3)).toBe('subiu');
    expect(setaDaPosicao(3, 5)).toBe('caiu');
    expect(setaDaPosicao(3, 3)).toBeNull();
    expect(setaDaPosicao(null, 3)).toBeNull();
    expect(setaDaPosicao(3, null)).toBeNull();
  });
});

describe('recorde do Crava (melhor rodada)', () => {
  it('a primeira rodada pontuada não é recorde novo', () => {
    expect(recordeCrava(new Map([[32, 40]]), 32)).toEqual({ recorde: 40, novo: false });
  });
  it('passar as anteriores é recorde novo; empatar não é', () => {
    expect(recordeCrava(new Map([[32, 40], [33, 60]]), 33)).toEqual({ recorde: 60, novo: true });
    expect(recordeCrava(new Map([[32, 40], [33, 40]]), 33)).toEqual({ recorde: 40, novo: false });
  });
  it('rodada que já foi superada depois não mostra recorde novo', () => {
    expect(recordeCrava(new Map([[32, 40], [33, 60], [34, 90]]), 33)).toEqual({ recorde: 90, novo: false });
    expect(recordeCrava(new Map([[32, 40], [33, 60], [34, 90]]), 34)).toEqual({ recorde: 90, novo: true });
  });
  it('sem pontos ainda', () => {
    expect(recordeCrava(new Map(), 32)).toEqual({ recorde: null, novo: false });
  });
});

describe('bloco da tela de resultado', () => {
  it('mostra selo só no recorde novo, posição e recorde', () => {
    const html = htmlPosicao({ posicao: 2, total: 9, recorde: 80, novoRecorde: true }, 'penaltis');
    expect(html).toContain('NOVO RECORDE!');
    expect(html).toContain('Sua posição: 2º de 9 nos pênaltis na semana');
    expect(html).toContain('Seu recorde: 80 pontos');
    expect(htmlPosicao({ posicao: 2, total: 9, recorde: 80, novoRecorde: false }, 'penaltis')).not.toContain('NOVO RECORDE!');
  });
  it('sem servidor ou sem nada para mostrar, vazio', () => {
    expect(htmlPosicao(null, 'prova')).toBe('');
    expect(htmlPosicao({ posicao: null, total: 3, recorde: null, novoRecorde: false }, 'prova')).toBe('');
  });
});
