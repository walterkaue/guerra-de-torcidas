import { describe, expect, it } from 'vitest';
import { montarSql, normalizar } from './gerar-municipios.mjs';
import { lerSql, validar, validarArquivos } from './validar-municipios.mjs';

describe('lista de municípios do IBGE', () => {
  it('JSON e migração passam no validador', () => {
    expect(validarArquivos().erros).toEqual([]);
  });

  it('o validador pega UF trocada, código repetido e nome vazio', () => {
    const r = validar(
      [
        [3550308, 'São Paulo', 'RJ'],
        [3550308, '', 'SP'],
      ],
      null,
    );
    expect(r.erros.some((e) => e.includes('não bate com a UF'))).toBe(true);
    expect(r.erros.some((e) => e.includes('repetido'))).toBe(true);
    expect(r.erros.some((e) => e.includes('nome vazio'))).toBe(true);
  });

  it('normaliza os dois caminhos de UF e escapa aspas na migração', () => {
    const bruto = [
      { id: 2, nome: 'Zé', microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } } },
      {
        id: 1,
        nome: "Pingo-d'Água",
        microrregiao: null,
        'regiao-imediata': { 'regiao-intermediaria': { UF: { sigla: 'MG' } } },
      },
    ];
    const l = normalizar(bruto);
    expect(l).toEqual([
      [1, "Pingo-d'Água", 'MG'],
      [2, 'Zé', 'SP'],
    ]);
    expect(lerSql(montarSql(l))).toEqual(l);
  });
});
