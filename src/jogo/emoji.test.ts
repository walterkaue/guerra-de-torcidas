import { describe, expect, it } from 'vitest';
import { placarEmoji } from './emoji';
import { resolverParOuImpar, totalizar, type ResultadoCobranca, type ResultadoDefesa } from './penaltis';

const c = (desfecho: ResultadoCobranca['desfecho'], extra: Partial<ResultadoCobranca> = {}): ResultadoCobranca => ({
  desfecho, x: 0, y: 0.3, zonaBola: 1, zonaGoleiro: 0, angulo: false, raspouTrave: false, cavadinha: false,
  fraca: false, goleiroLeu: false, pontos: desfecho === 'gol' ? 10 : 0, ...extra,
});
const d = (desfecho: ResultadoDefesa['desfecho']): ResultadoDefesa => ({
  desfecho, alvo: 0, zonaGoleiro: 0, contraGravada: false, pontos: desfecho === 'defesa' ? 10 : 0,
});

describe('placar em emoji', () => {
  it('mostra gol, ângulo, cavadinha, erro e as defesas', () => {
    const r = totalizar(
      [c('gol'), c('gol', { angulo: true }), c('gol', { cavadinha: true }), c('defesa'), c('fora')],
      [d('defesa'), d('gol'), d('fora'), d('gol'), d('defesa')],
    );
    const texto = placarEmoji({ resultado: r, nomeJogador: 'Chapecoense', nomeAdversario: 'Máquina', linhaPontos: '+55 pra Chapecoense', link: 'x' });
    expect(texto).toContain('Chapecoense 3 x 2 Máquina');
    expect(texto).toContain('Cobranças: ⚽🎯✨❌❌');
    expect(texto).toContain('🧤🥅💨🥅🧤');
    expect(texto.endsWith('+55 pra Chapecoense\nx')).toBe(true);
  });

  it('separa a morte súbita e mostra o par ou ímpar', () => {
    const cob = [c('gol'), c('fora'), c('fora'), c('fora'), c('fora'), c('fora'), c('fora'), c('fora')];
    const def = [d('gol'), d('defesa'), d('defesa'), d('defesa'), d('defesa'), d('defesa'), d('defesa'), d('defesa')];
    const r = totalizar(cob, def, resolverParOuImpar({ escolha: 'par', numero: 2 }, 2));
    const texto = placarEmoji({ resultado: r, nomeJogador: 'Eu', nomeAdversario: 'Máquina', linhaPontos: '+1', link: 'x' });
    expect(texto).toContain('Cobranças: ⚽❌❌❌❌ | ❌❌❌');
    expect(texto).toContain('Par ou ímpar: ganhei ✋ (deu 4)');
  });
});
