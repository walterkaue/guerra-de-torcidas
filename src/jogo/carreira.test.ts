import { describe, expect, it } from 'vitest';
import { linhaBonus, linhaFalta, linhaHoje, linhaResultado, linhaSequencia, nivelDe, subiuPara, xpDaProxima, xpDoDia } from './carreira';

describe('XP do dia', () => {
  it('10 nas 5 primeiras, 5 da 6ª à 15ª, zero depois', () => {
    expect(xpDoDia(0)).toBe(0);
    expect(xpDoDia(1)).toBe(10);
    expect(xpDoDia(5)).toBe(50);
    expect(xpDoDia(6)).toBe(55);
    expect(xpDoDia(15)).toBe(100);
    expect(xpDoDia(16)).toBe(100);
    expect(xpDoDia(40)).toBe(100);
  });

  it('valor da próxima partida', () => {
    expect(xpDaProxima(0)).toBe(10);
    expect(xpDaProxima(4)).toBe(10);
    expect(xpDaProxima(5)).toBe(5);
    expect(xpDaProxima(14)).toBe(5);
    expect(xpDaProxima(15)).toBe(0);
  });

  it('ritmo do jogo.md: 5 por dia dá Titular em ~3 semanas e Lenda em ~1 ano e meio', () => {
    const dias = (alvo: number) => Math.ceil(alvo / xpDoDia(5));
    expect(dias(1_000)).toBe(20);
    expect(dias(30_000)).toBe(600);
  });
});

describe('níveis', () => {
  it('limites exatos', () => {
    expect(nivelDe(0).nome).toBe('Estreante');
    expect(nivelDe(99).nome).toBe('Estreante');
    expect(nivelDe(100).nome).toBe('Reserva');
    expect(nivelDe(999).nome).toBe('Reserva');
    expect(nivelDe(1_000).nome).toBe('Titular');
    expect(nivelDe(5_000).nome).toBe('Craque');
    expect(nivelDe(15_000).nome).toBe('Ídolo');
    expect(nivelDe(30_000).nome).toBe('Lenda');
    expect(nivelDe(1_000_000).nome).toBe('Lenda');
  });

  it('barra e quanto falta', () => {
    expect(nivelDe(550)).toEqual({ nome: 'Reserva', indice: 1, proximo: 'Titular', faltam: 450, fracao: 0.5 });
    expect(nivelDe(30_500)).toEqual({ nome: 'Lenda', indice: 5, proximo: null, faltam: 0, fracao: 1 });
    expect(nivelDe(-5).nome).toBe('Estreante');
  });

  it('subiu de nível só quando passa o limite', () => {
    expect(subiuPara(90, 100)).toBe('Reserva');
    expect(subiuPara(950, 1_050)).toBe('Titular');
    expect(subiuPara(100, 150)).toBeNull();
    // Bônus grande pode pular dois níveis de uma vez: mostra o de chegada.
    expect(subiuPara(0, 1_200)).toBe('Titular');
  });
});

describe('textos', () => {
  it('Home', () => {
    expect(linhaFalta(nivelDe(770))).toBe('Faltam 230 XP pra Titular');
    expect(linhaFalta(nivelDe(31_000))).toBe('Lenda: topo da carreira.');
    expect(linhaFalta(nivelDe(0))).toBe('Faltam 100 XP pra Reserva');
    expect(linhaSequencia(1)).toBeNull();
    expect(linhaSequencia(4)).toBe('4 dias seguidos jogando');
    expect(linhaHoje(2)).toBe('Próxima partida de hoje: +10 XP');
    expect(linhaHoje(15)).toBe('XP de hoje completo. Amanhã tem mais.');
    expect(linhaFalta(nivelDe(1_000)).includes('4.000')).toBe(true);
  });

  it('bônus', () => {
    expect(linhaBonus(null)).toBeNull();
    expect(linhaBonus({ tipo: 'dia', referencia: '2026-10-25' })).toBe('+100 XP: 1º do dia entre todos (25/10)');
    expect(linhaBonus({ tipo: 'semana', referencia: '2026-10-19' })).toBe('+200 XP: 1º da sua torcida na semana de 19/10');
  });

  it('resultado', () => {
    expect(linhaResultado(null, 50)).toBeNull();
    expect(linhaResultado(50, 50)).toBeNull();
    expect(linhaResultado(40, 50)).toEqual({ texto: '+10 XP na carreira · Estreante', subiu: false });
    expect(linhaResultado(995, 1_005)).toEqual({ texto: 'Subiu pra Titular!', subiu: true });
  });
});
