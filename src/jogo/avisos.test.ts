import { describe, expect, it } from 'vitest';
import { avisoDeDomingo, rivalDoAviso, type LinhaAviso } from './avisos';
import { timePorId } from '../dados/times';
import { acharPalavras } from '../../scripts/perguntas/validar.mjs';

const linha = (time_id: string, media30: number, posicao_campeao: number, ativos = 10): LinhaAviso => ({ time_id, media30, posicao_campeao, ativos });

describe('aviso de domingo (push)', () => {
  it('rival: o clássico; sem clássico, o vizinho de cima (ou o de baixo para o líder)', () => {
    const ranking = [linha('bragantino', 300, 1), linha('santos', 290, 2), linha('remo', 100, 3)];
    expect(rivalDoAviso(timePorId('flamengo')!, ranking)?.id).toBe('fluminense');
    expect(rivalDoAviso(timePorId('bragantino')!, ranking)?.id).toBe('santos');
  });

  it('atrás do rival: posição e diferença, com do/da certo', () => {
    const a = avisoDeDomingo('flamengo', [linha('fluminense', 410, 1), linha('flamengo', 400, 2)]);
    expect(a.titulo).toBe('Sua torcida na semana');
    expect(a.corpo).toBe('O Flamengo tá em 2º na semana, 10 pontos atrás do Fluminense.');
    expect(avisoDeDomingo('bragantino', [linha('chapecoense', 410, 1), linha('bragantino', 409, 2)]).corpo).toBe(
      'O Bragantino tá em 2º na semana, 1 ponto atrás da Chapecoense.',
    );
  });

  it('na frente do rival e empate', () => {
    expect(avisoDeDomingo('palmeiras', [linha('palmeiras', 400, 1), linha('corinthians', 395, 2)]).corpo).toBe(
      'O Palmeiras tá em 1º na semana, 5 pontos na frente do Corinthians.',
    );
    expect(avisoDeDomingo('palmeiras', [linha('palmeiras', 400.2, 1), linha('corinthians', 400, 2)]).corpo).toBe(
      'O Palmeiras tá em 1º na semana, no empate com o Corinthians.',
    );
  });

  it('sem pontos na semana, rival sem pontos e "Outro time"', () => {
    expect(avisoDeDomingo('chapecoense', []).corpo).toBe('A Chapecoense ainda não pontuou nesta semana.');
    expect(avisoDeDomingo('vasco', [linha('vasco', 400, 3), linha('flamengo', 0, 9, 0)]).corpo).toBe('O Vasco tá em 3º na semana.');
    expect(avisoDeDomingo('outro', []).corpo).toBe('O placar da semana tá atualizado no jogo.');
  });

  const casos = [
    avisoDeDomingo('flamengo', [linha('fluminense', 410, 1), linha('flamengo', 400, 2)]),
    avisoDeDomingo('flamengo', [linha('fluminense', 900, 1), linha('flamengo', 400, 2)]),
    avisoDeDomingo('palmeiras', [linha('palmeiras', 400, 1), linha('corinthians', 395, 2)]),
    avisoDeDomingo('palmeiras', [linha('palmeiras', 400, 1), linha('corinthians', 400, 2)]),
    avisoDeDomingo('vasco', [linha('vasco', 400, 3), linha('flamengo', 0, 9, 0)]),
    avisoDeDomingo('chapecoense', []),
    avisoDeDomingo('outro', []),
  ];

  it('nenhum texto possível usa palavra proibida', () => {
    for (const a of casos) expect(acharPalavras(`${a.titulo} ${a.corpo}`)).toEqual([]);
  });

  it('nenhum texto possível tem urgência ou pressão para voltar', () => {
    const pressao = /falta|hora|meia-noite|fecha|acaba|corre|bora|vem |volta|joga|vai deixar|segura|dá pra|ainda dá|agora|hoje|último|última|[!?]/i;
    for (const a of casos) expect(`${a.titulo} ${a.corpo}`).not.toMatch(pressao);
  });
});
