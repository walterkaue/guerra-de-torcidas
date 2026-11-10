import { describe, expect, it } from 'vitest';
import { avisoDaVaga } from './vagaDoMomento';

describe('avisoDaVaga', () => {
  it('um aviso só, na ordem: fim do mês, Troféu novo, Termos', () => {
    expect(avisoDaVaga({ 'fim-do-mes': true, trofeu: true, termos: true })).toBe('fim-do-mes');
    expect(avisoDaVaga({ 'fim-do-mes': false, trofeu: true, termos: true })).toBe('trofeu');
    expect(avisoDaVaga({ 'fim-do-mes': false, trofeu: false, termos: true })).toBe('termos');
  });

  it('nenhum: a vaga fica vazia', () => {
    expect(avisoDaVaga({ 'fim-do-mes': false, trofeu: false, termos: false })).toBeNull();
  });

  it('o mais importante decide assim que chega, sem esperar os de baixo', () => {
    expect(avisoDaVaga({ 'fim-do-mes': true })).toBe('fim-do-mes');
  });

  it('um aviso menor espera os de cima responderem (não aparece para sumir em seguida)', () => {
    expect(avisoDaVaga({ termos: true })).toBeUndefined();
    expect(avisoDaVaga({ 'fim-do-mes': false, termos: true })).toBeUndefined();
  });
});
