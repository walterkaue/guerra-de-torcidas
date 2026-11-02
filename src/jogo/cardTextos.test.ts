import { describe, expect, it } from 'vitest';
import { TORCIDA_SELECAO } from '../dados/adversarios';
import { LANCES } from '../dados/lances';
import { TIMES, distanciaDeCor, timePorId } from '../dados/times';
import { corDaTorcida, lugaresDaTorcida } from '../telas/torcida';
import { PAPEL, corDaBorda, degrausCertos, degrausDaEscada, linhaDoTorcedor, resumoDosAcertos } from './cardTextos';

describe('linha embaixo dos pontos', () => {
  it('com apelido e time, só quem e para quem', () => {
    expect(linhaDoTorcedor('Fulano', 55, 'pro Flamengo')).toBe('Fulano pro Flamengo');
    expect(linhaDoTorcedor('Fulano', 55, 'pra Chapecoense')).toBe('Fulano pra Chapecoense');
  });

  it('sem apelido, mantém o texto de antes', () => {
    expect(linhaDoTorcedor(undefined, 55, 'pro Flamengo')).toBe('Fiz 55 pontos pro Flamengo');
    expect(linhaDoTorcedor('', 55, 'pra Chapecoense')).toBe('Fiz 55 pontos pra Chapecoense');
  });

  it('"Outro time" não tem para quem', () => {
    expect(linhaDoTorcedor('Fulano', 55, null)).toBe('Fulano fez 55 pontos');
    expect(linhaDoTorcedor(undefined, 55, null)).toBe('Fiz 55 pontos');
  });
});

describe('borda do adesivo', () => {
  it('é a cor 1 do time', () => {
    expect(corDaBorda(timePorId('corinthians')!.cores)).toBe('#111111');
    expect(corDaBorda(timePorId('palmeiras')!.cores)).toBe('#006437');
  });

  it('cor 1 clara passa para a cor 2', () => {
    expect(corDaBorda(timePorId('sao-paulo')!.cores)).toBe('#e30613');
  });

  it('aparece no papel em todos os times', () => {
    for (const t of TIMES) expect(distanciaDeCor(corDaBorda(t.cores), PAPEL), t.nome).toBeGreaterThanOrEqual(110);
  });
});

describe('escada do telão', () => {
  it('parou: os certos e o degrau onde parou', () => {
    const d = degrausDaEscada('✅✅✅💡✅✋');
    expect(d).toEqual(['acertou', 'acertou', 'acertou', 'ajuda', 'acertou', 'parou', 'vazio', 'vazio']);
    expect(degrausCertos(d)).toBe(5);
  });

  it('errou: marca o degrau do erro', () => {
    expect(degrausDaEscada('✅✅❌').slice(0, 4)).toEqual(['acertou', 'acertou', 'errou', 'vazio']);
  });

  it('8 de 8 enche a escada, e o ✋ depois da 8ª não passa de 8 degraus', () => {
    expect(degrausCertos(degrausDaEscada('✅✅✅✅✅✅✅✅'))).toBe(8);
    expect(degrausDaEscada('✅✅✅✅✅✅✅✅✋')).toHaveLength(8);
  });

  it('parou antes da 1ª: nenhum certo', () => {
    expect(degrausCertos(degrausDaEscada('✋'))).toBe(0);
  });
});

describe('acertos do Crava', () => {
  it('conta só o que aconteceu, no singular e no plural', () => {
    expect(resumoDosAcertos(['exato', 'exato', 'saldo', 'vencedor', 'errou'])).toBe('2 EXATOS · 1 NO SALDO · 1 VENCEDOR · 1 ERRO');
    expect(resumoDosAcertos(['errou', 'errou'])).toBe('2 ERROS');
  });
});

describe('torcida da Seleção', () => {
  const cores = (lugares: { cor: string }[]) => lugares.map((l) => l.cor);

  it('é verde e amarela, com um toque de azul e branco', () => {
    const todos = cores(lugaresDaTorcida(480, 300, TORCIDA_SELECAO.cores, TORCIDA_SELECAO.outros));
    const parte = (cor: string) => todos.filter((c) => c === cor).length / todos.length;
    expect(parte('#00843d') + parte('#ffd200')).toBeGreaterThan(0.8);
    expect(parte('#00843d')).toBeGreaterThan(0.3);
    expect(parte('#ffd200')).toBeGreaterThan(0.3);
    expect(parte('#1d4fa8')).toBeGreaterThan(0.02);
    expect(parte('#ffffff')).toBeGreaterThan(0.02);
  });

  it('não muda a repartição da torcida de um clube', () => {
    const c: [string, string] = ['#111111', '#ffffff'];
    expect(corDaTorcida(0.1, c, ['#3a3f4a'])).toBe('#111111');
    expect(corDaTorcida(0.5, c, ['#3a3f4a'])).toBe('#ffffff');
    expect(corDaTorcida(0.9, c, ['#3a3f4a'])).toBe('#3a3f4a');
  });

  it('no catálogo, a única seleção que joga como dona do lance é a brasileira', () => {
    const clubes = new Set(LANCES.map((l) => l.clube));
    clubes.delete('selecao');
    for (const id of clubes) expect(timePorId(id), id).toBeDefined();
  });
});
