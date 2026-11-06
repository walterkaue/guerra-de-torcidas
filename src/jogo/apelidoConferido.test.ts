import { describe, expect, it } from 'vitest';
import { apelidoParaCard, conferidoAoSalvar } from './apelidoConferido';

describe('apelido no card (J26)', () => {
  it('apelido de antes da regra conta como conferido', () => {
    expect(apelidoParaCard({ apelido: 'Duda' })).toBe('Duda');
  });
  it('apelido ainda não aceito pelo servidor não vai no card', () => {
    expect(apelidoParaCard({ apelido: 'Neymar', apelidoConferido: false })).toBeUndefined();
  });
  it('apelido aceito vai no card; sem apelido, nada', () => {
    expect(apelidoParaCard({ apelido: 'Duda', apelidoConferido: true })).toBe('Duda');
    expect(apelidoParaCard({ apelidoConferido: true })).toBeUndefined();
    expect(apelidoParaCard({})).toBeUndefined();
  });
  it('ao salvar: apelido novo espera o servidor; o mesmo mantém; vazio limpa', () => {
    expect(conferidoAoSalvar({ apelido: 'Duda' }, 'Dudinha')).toBe(false);
    expect(conferidoAoSalvar({}, 'Duda')).toBe(false);
    expect(conferidoAoSalvar({ apelido: 'Duda' }, 'Duda')).toBeUndefined();
    expect(conferidoAoSalvar({ apelido: 'Duda', apelidoConferido: true }, 'Duda')).toBe(true);
    expect(conferidoAoSalvar({ apelido: 'Duda', apelidoConferido: false }, 'Duda')).toBe(false);
    expect(conferidoAoSalvar({ apelido: 'Duda', apelidoConferido: true }, undefined)).toBeUndefined();
  });
});
