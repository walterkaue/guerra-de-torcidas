import { describe, expect, it } from 'vitest';
import { corpoEspecial, diaEHoraDeBrasilia, formDoJogo, FORA, inicioDeBrasilia, textoDoErro, tituloEspecial, validarForm, type FormEspecial } from './adminEspeciais';

const base: FormEspecial = {
  competicao: ' Copa do Brasil ',
  fase: 'Final · volta',
  mandante: 'flamengo',
  mandanteFora: '',
  visitante: FORA,
  visitanteFora: ' Time X ',
  dia: '2026-12-06',
  hora: '16:00',
};

describe('jogos especiais do admin', () => {
  it('monta o ISO de Brasília e volta', () => {
    expect(inicioDeBrasilia('2026-12-06', '16:00')).toBe('2026-12-06T16:00:00-03:00');
    expect(diaEHoraDeBrasilia('2026-12-06T19:00:00Z')).toEqual({ dia: '2026-12-06', hora: '16:00' });
    expect(diaEHoraDeBrasilia('2026-12-07T01:30:00Z')).toEqual({ dia: '2026-12-06', hora: '22:30' });
  });

  it('monta o corpo com id ou nome de fora', () => {
    expect(corpoEspecial('criar', base)).toEqual({
      acao: 'criar',
      competicao: 'Copa do Brasil',
      fase: 'Final · volta',
      mandante: { id: 'flamengo' },
      visitante: { fora: 'Time X' },
      inicio: '2026-12-06T16:00:00-03:00',
    });
    expect(corpoEspecial('editar', base, 'j1').jogoId).toBe('j1');
  });

  it('valida o formulário', () => {
    expect(validarForm(base)).toBeNull();
    expect(validarForm({ ...base, competicao: ' ' })).toMatch(/competição/);
    expect(validarForm({ ...base, visitante: 'flamengo' })).toMatch(/mesmo time/);
    expect(validarForm({ ...base, mandante: FORA, mandanteFora: 'Y' })).toMatch(/20/);
    expect(validarForm({ ...base, visitanteFora: '' })).toMatch(/nome/);
    expect(validarForm({ ...base, dia: '' })).toMatch(/inválidos/);
    expect(validarForm({ ...base, fase: 'x'.repeat(41) })).toMatch(/40/);
  });

  it('explica os motivos do servidor', () => {
    expect(textoDoErro('ja_comecou')).toMatch(/horário/);
    expect(textoDoErro('tem_palpite')).toMatch(/anule/);
    expect(textoDoErro('coisa_nova')).toContain('coisa_nova');
    expect(textoDoErro(null)).toMatch(/Tente/);
  });

  it('título e formulário de um jogo cadastrado', () => {
    expect(tituloEspecial({ competicao: 'Supercopa', fase: null })).toBe('Supercopa');
    expect(tituloEspecial({ competicao: 'Copa', fase: 'Final' })).toBe('Copa · Final');
    const f = formDoJogo({ competicao: 'C', fase: null, mandante_id: null, visitante_id: 'palmeiras', mandante_fora: 'Z', visitante_fora: null, inicio: '2026-12-06T19:00:00Z' });
    expect(f).toMatchObject({ mandante: FORA, mandanteFora: 'Z', visitante: 'palmeiras', fase: '', hora: '16:00' });
  });
});
