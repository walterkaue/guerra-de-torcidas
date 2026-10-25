import { describe, expect, it } from 'vitest';
import { errosDoFormulario } from './adminRevisao';

const r = { clube: 'cruzeiro', fonte: 'https://www.lance.com.br/lancepedia/cruzeiro.html' };
const campos = {
  pergunta: 'Em 1966, o Cruzeiro conquistou a Taça Brasil vencendo qual clube na final?',
  certa: 'Santos',
  errada1: 'Flamengo',
  errada2: 'Palmeiras',
  errada3: 'Botafogo',
  degrau: 'media',
  tema: 'titulos',
};

describe('revisão no #admin: o texto corrigido passa pelo validador dos CSVs', () => {
  it('pergunta boa não tem erro', () => {
    expect(errosDoFormulario(r, campos)).toEqual([]);
  });
  it('acusa pergunta sem "?", sem ano, alternativa repetida e palavra proibida', () => {
    expect(errosDoFormulario(r, { ...campos, pergunta: 'Em 1966, o Cruzeiro venceu a Taça Brasil.' }).join()).toMatch(/\?/);
    expect(errosDoFormulario(r, { ...campos, pergunta: 'O Cruzeiro venceu a Taça Brasil contra quem?' }).join()).toMatch(/sem ano/);
    expect(errosDoFormulario(r, { ...campos, errada3: 'Santos' }).join()).toMatch(/repetidas/);
    expect(errosDoFormulario(r, { ...campos, errada1: 'Red Bull' }).join()).toMatch(/proibida/);
  });
});
