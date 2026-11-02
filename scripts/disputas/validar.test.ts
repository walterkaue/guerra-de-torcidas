import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarCatalogo, lerTodas } from './catalogo.mjs';
import { validarConjunto, validarDisputa } from './validar.mjs';

const boa = {
  id: 'athletico-pr-2018-sul-americana',
  clube: 'athletico-pr',
  titulo: 'O título da Sul-Americana',
  ficha: '12/12/2018, final da Copa Sul-Americana, na Arena da Baixada: 1 a 1 com o Junior e título nos pênaltis, por 4 a 3. Pablo marcou o gol do jogo.',
  pessoas: 'Pablo',
  competicao: 'Copa Sul-Americana',
  fase: 'Final',
  data: '2018-12-12',
  adversario: 'Junior Barranquilla',
  estadio: 'Arena da Baixada',
  placar_disputa: '4 x 3',
  fonte: 'https://www.gazetaesportiva.com/?p=2673129',
  fonte2: '',
  verificada_em: '',
  status: 'rascunho',
  observacao: '',
};

describe('validarDisputa', () => {
  it('aceita uma disputa bem escrita', () => {
    expect(validarDisputa(boa)).toEqual([]);
  });

  it('só entra disputa que o clube venceu, com placar possível', () => {
    expect(validarDisputa({ ...boa, placar_disputa: '3 x 4' }).join()).toMatch(/só entra disputa que o clube venceu/);
    expect(validarDisputa({ ...boa, placar_disputa: '3 x 3' }).join()).toMatch(/só entra disputa que o clube venceu/);
    expect(validarDisputa({ ...boa, placar_disputa: '4 a 3' }).join()).toMatch(/use "4 x 3"/);
    expect(validarDisputa({ ...boa, placar_disputa: '5 x 1' }).join()).toMatch(/impossível/);
    expect(validarDisputa({ ...boa, placar_disputa: '8 x 6' }).join()).toMatch(/impossível/);
    const alternadas = { ...boa, placar_disputa: '11 x 10', ficha: boa.ficha.replace('4 a 3', '11 a 10') };
    expect(validarDisputa(alternadas)).toEqual([]);
  });

  it('a ficha precisa citar o placar da disputa', () => {
    expect(validarDisputa({ ...boa, placar_disputa: '5 x 3' }).join()).toMatch(/precisa citar o placar da disputa/);
  });

  it('nome real só na ficha: título com nome ou camisa é recusado', () => {
    expect(validarDisputa({ ...boa, titulo: 'A disputa do Pablo' })).toContainEqual('título com nome de pessoa: "pablo"');
    expect(validarDisputa({ ...boa, titulo: 'A disputa da camisa 9' })).toContainEqual('título com número de camisa');
    expect(validarDisputa({ ...boa, pessoas: 'Pablo;Rony' })).toContainEqual('"Rony" está em pessoas mas não na ficha');
  });

  it('recusa id, data, fase e fonte fora da regra', () => {
    expect(validarDisputa({ ...boa, id: 'athletico-pr-2019-sul-americana' }).join()).toMatch(/não bate com clube e ano/);
    expect(validarDisputa({ ...boa, data: '12/12/2018' }).join()).toMatch(/data/);
    expect(validarDisputa({ ...boa, fase: 'Decisão' }).join()).toMatch(/fase/);
    expect(validarDisputa({ ...boa, fonte: 'https://pt.wikipedia.org/wiki/x' }).join()).toMatch(/Wikipédia/);
    expect(validarDisputa({ ...boa, fonte: 'https://blog-qualquer.com/x' }).join()).toMatch(/domínio não aceito/);
    expect(validarDisputa({ ...boa, status: 'revisada' }).join()).toMatch(/verificada_em/);
    expect(validarDisputa({ ...boa, clube: 'outro' }).join()).toMatch(/não é um dos 20/);
  });

  it('palavras, temas e marcas proibidos', () => {
    expect(validarDisputa({ ...boa, ficha: `${boa.ficha} Valendo a odd da rodada.` }).join()).toMatch(/palavra proibida/);
    expect(validarDisputa({ ...boa, ficha: `${boa.ficha} Depois da tragédia, o clube voltou.` }).join()).toMatch(/tema fora da regra/);
    expect(validarDisputa({ ...boa, estadio: 'Allianz Parque' }).join()).toMatch(/marca de terceiros/);
    expect(validarDisputa({ ...boa, ficha: `${boa.ficha} Decidiu na morte súbita.` })).toEqual([]);
  });
});

describe('validarConjunto', () => {
  it('acha id, título e jogo repetidos', () => {
    const erros = validarConjunto([boa, { ...boa }]).map((e) => e.erro).join();
    expect(erros).toMatch(/id repetido/);
    expect(erros).toMatch(/título repetido/);
    expect(erros).toMatch(/mesmo clube e data/);
  });
});

describe('catálogo em dados/disputas', () => {
  const disputas = lerTodas();

  it('tem disputas', () => {
    expect(disputas.length).toBeGreaterThan(0);
  });

  it('toda disputa passa no validador', () => {
    expect(validarConjunto(disputas)).toEqual([]);
  });

  it('todo mundo tem pelo menos 2 disputas da Seleção', () => {
    expect(disputas.filter((d: { clube: string }) => d.clube === 'selecao').length).toBeGreaterThanOrEqual(2);
  });

  it('src/dados/disputas.ts está em dia com os CSVs (rode npm run catalogo-disputas)', () => {
    const gerado = readFileSync(new URL('../../src/dados/disputas.ts', import.meta.url), 'utf8');
    expect(gerado).toBe(gerarCatalogo(disputas));
  });

  it('o catálogo publica só disputa revisada ou ativa', () => {
    const publicadas = disputas.filter((d: { status: string }) => d.status === 'revisada' || d.status === 'ativa').length;
    expect(gerarCatalogo(disputas).split('\n').filter((l) => l.startsWith('  {')).length).toBe(publicadas);
    expect(gerarCatalogo([{ ...disputas[0], status: 'rascunho' }])).not.toMatch(/"id"/);
    expect(gerarCatalogo([{ ...disputas[0], status: 'aposentada' }])).not.toMatch(/"id"/);
    expect(gerarCatalogo([{ ...disputas[0], status: 'revisada', verificada_em: '2026-11-01' }])).toMatch(/"id"/);
  });
});
