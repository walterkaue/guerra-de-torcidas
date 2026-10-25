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

  it('atrás e perto do rival: dá pra virar, com do/da certo', () => {
    const a = avisoDeDomingo('flamengo', [linha('fluminense', 410, 1), linha('flamengo', 400, 2)]);
    expect(a.corpo).toBe('Faltam 6 horas e o Fluminense tá só 10 pontos na frente do Flamengo. Dá pra virar!');
  });

  it('na frente e perto: o rival tá encostando', () => {
    const a = avisoDeDomingo('palmeiras', [linha('palmeiras', 400, 1), linha('corinthians', 395, 2)]);
    expect(a.corpo).toBe('Faltam 6 horas e o Corinthians tá encostando: 5 pontos atrás. Segura essa!');
  });

  it('sem pontos na semana, longe do rival e "Outro time"', () => {
    expect(avisoDeDomingo('chapecoense', []).corpo).toBe('Faltam 6 horas e a Chapecoense ainda não pontuou nesta semana. Bora estrear?');
    expect(avisoDeDomingo('vasco', [linha('vasco', 400, 3), linha('flamengo', 100, 9)]).corpo).toBe(
      'Faltam 6 horas pra semana fechar. O Vasco tá em 3º. Bora fechar a semana bem?',
    );
    expect(avisoDeDomingo('outro', []).corpo).toMatch(/Bora somar/);
  });

  it('nenhum texto possível usa palavra proibida', () => {
    const casos = [
      avisoDeDomingo('flamengo', [linha('fluminense', 410, 1), linha('flamengo', 400, 2)]),
      avisoDeDomingo('flamengo', [linha('fluminense', 900, 1), linha('flamengo', 400, 2)]),
      avisoDeDomingo('palmeiras', [linha('palmeiras', 400, 1), linha('corinthians', 395, 2)]),
      avisoDeDomingo('chapecoense', []),
      avisoDeDomingo('outro', []),
    ];
    for (const a of casos) expect(acharPalavras(`${a.titulo} ${a.corpo}`)).toEqual([]);
  });
});
