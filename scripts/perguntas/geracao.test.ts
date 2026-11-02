import { describe, expect, it } from 'vitest';
import { alternativasEmbaralhadas, avaliarPergunta, respostaNoTrecho, textoDaPagina, trechoNaPagina, vereditoAuditoria } from './geracao.mjs';

const PAGINA =
  'Lancepédia do Cruzeiro. Em 1966, o Cruzeiro conquistou a Taça Brasil ao derrotar o Santos na final. ' +
  'Bicampeão da América em 1976 e 1997, o Cruzeiro é um dos maiores do país. 1 - Tostão – 242 gols.';
const FONTE = 'https://www.lance.com.br/lancepedia/lancepedia-do-cruzeiro.html';
const boa = {
  degrau: 'media',
  tema: 'titulos',
  pergunta: 'Em 1966, o Cruzeiro conquistou a Taça Brasil ao derrotar qual clube na final?',
  certa: 'Santos',
  errada1: 'Flamengo',
  errada2: 'Palmeiras',
  errada3: 'Botafogo',
  trecho: 'Em 1966, o Cruzeiro conquistou a Taça Brasil ao derrotar o Santos na final.',
};
const ctx = { clube: 'cruzeiro', fonte: FONTE, pagina: PAGINA };

describe('pipeline de perguntas: travas', () => {
  it('página em texto, com acento em entidade', () => {
    expect(textoDaPagina('<p>Gr&ecirc;mio &amp; S&atilde;o Paulo</p><script>x</script>')).toBe('Grêmio & São Paulo');
  });

  it('trecho literal e resposta dentro dele', () => {
    expect(trechoNaPagina('o Cruzeiro conquistou a Taça Brasil ao derrotar o Santos', PAGINA)).toBe(true);
    expect(trechoNaPagina('o Cruzeiro conquistou a Taça Brasil ao derrotar o Palmeiras', PAGINA)).toBe(false);
    expect(trechoNaPagina('Cruzeiro', PAGINA)).toBe(false); // curto demais para provar
    expect(respostaNoTrecho('Santos', 'derrotar o Santos na final')).toBe(true);
    expect(respostaNoTrecho('Santo', 'derrotar o Santos na final')).toBe(false); // palavra inteira
  });

  it('pergunta boa passa', () => {
    expect(avaliarPergunta(boa, ctx)).toBeNull();
  });

  it('recusa: validador, assunto fora, trecho inventado, resposta fora do trecho, repetida', () => {
    expect(avaliarPergunta({ ...boa, pergunta: 'Quem derrotou o Cruzeiro?' }, ctx)).toMatch(/validador/);
    expect(avaliarPergunta({ ...boa, pergunta: 'Em 2007, o Cruzeiro apresentou qual mascote infantil?', certa: 'Raposinho', trecho: boa.trecho }, ctx)).toMatch(/mascote/);
    expect(avaliarPergunta({ ...boa, trecho: 'Em 1966, o Cruzeiro venceu o Santos por 6 a 2 no Mineirão lotado.' }, ctx)).toMatch(/não está na página/);
    expect(avaliarPergunta({ ...boa, certa: 'Vasco', errada3: 'Santos' }, ctx)).toMatch(/resposta certa não aparece/);
    expect(avaliarPergunta({ ...boa, pergunta: 'Em qual ano de 1966 o Cruzeiro venceu a Taça Brasil mencionada na lista?' }, ctx)).toMatch(/cita a fonte/);
    expect(avaliarPergunta({ ...boa, pergunta: 'Em qual ano de 2023 a Arena MRV foi inaugurada pelo Cruzeiro em 1966?' }, ctx)).toMatch(/marca de terceiros: mrv/);
    expect(avaliarPergunta(boa, { ...ctx, existentes: ['em 1966 o cruzeiro conquistou a taca brasil ao derrotar qual clube na final'] })).toMatch(/repetida/);
  });

  it('auditor: só passa se escolheu a certa sem saber qual era, com trecho da página', () => {
    const alts = alternativasEmbaralhadas(boa, () => 0.3);
    expect([...alts].sort()).toEqual(['Botafogo', 'Flamengo', 'Palmeiras', 'Santos']);
    const trecho = 'ao derrotar o Santos na final. Bicampeão da América';
    expect(vereditoAuditoria(boa, { escolhida: 'Santos', trecho, outraTambemCerta: false }, PAGINA)).toBeNull();
    expect(vereditoAuditoria(boa, { escolhida: 'Palmeiras', trecho, outraTambemCerta: false }, PAGINA)).toMatch(/outra alternativa/);
    expect(vereditoAuditoria(boa, { escolhida: '', trecho: '', outraTambemCerta: false }, PAGINA)).toMatch(/não achou/);
    expect(vereditoAuditoria(boa, { escolhida: 'Santos', trecho: 'o Santos venceu tudo em 1966 e em 1967', outraTambemCerta: false }, PAGINA)).toMatch(/não está na página/);
    expect(vereditoAuditoria(boa, { escolhida: 'Santos', trecho, outraTambemCerta: true }, PAGINA)).toMatch(/também certa/);
  });
});

