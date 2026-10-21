import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calibrar, validarCena } from '../../src/jogo/lances';
import { CANTOS, cenaDoLance, lerLances, validarConjunto, validarLance } from './validar.mjs';

const boa = {
  id: 'sao-paulo-2011-gol-100',
  clube: 'sao-paulo',
  tipo: 'falta',
  titulo: 'Gol 100 do goleiro',
  ficha: '27/03/2011, Paulistão: Rogério Ceni bate a falta da entrada da área, por cima da barreira e no ângulo.',
  pessoas: 'Rogério Ceni',
  competicao: 'Campeonato Paulista',
  data: '2011-03-27',
  adversario: 'Corinthians',
  estadio: 'Arena Barueri',
  bola_x: '-8',
  bola_z: '19',
  barreira: '4',
  barreira_mira_x: '-2',
  goleiro_saida: '',
  canto: 'alto-direita',
  faixa: 'media',
  fonte: 'https://www.gazetaesportiva.com/?p=2712013',
  fonte2: '',
  verificada_em: '',
  status: 'rascunho',
  observacao: '',
};

describe('validarLance', () => {
  it('aceita um lance bem escrito', () => {
    expect(validarLance(boa)).toEqual([]);
  });

  it('nome real só na ficha: título com nome, sobrenome ou camisa é recusado', () => {
    expect(validarLance({ ...boa, titulo: 'O gol 100 do Ceni' })).toContainEqual('título com nome de pessoa: "ceni"');
    expect(validarLance({ ...boa, titulo: 'O gol 100 do Rogério' })).toContainEqual('título com nome de pessoa: "rogerio"');
    expect(validarLance({ ...boa, titulo: 'Gol 100 da camisa 01' })).toContainEqual('título com número de camisa');
    expect(validarLance({ ...boa, titulo: 'A falta do tri, aos 43' })).toEqual([]);
  });

  it('quem está em pessoas precisa estar na ficha', () => {
    expect(validarLance({ ...boa, pessoas: 'Rogério Ceni;Fernandinho' })).toContainEqual('"Fernandinho" está em pessoas mas não na ficha');
  });

  it('recusa id, data, canto e fonte fora da regra', () => {
    expect(validarLance({ ...boa, id: 'sao-paulo-2010-gol-100' }).join()).toMatch(/não bate com clube e ano/);
    expect(validarLance({ ...boa, data: '27/03/2011' }).join()).toMatch(/data/);
    expect(validarLance({ ...boa, canto: 'angulo' }).join()).toMatch(/canto/);
    expect(validarLance({ ...boa, fonte: 'https://pt.wikipedia.org/wiki/x' }).join()).toMatch(/Wikipédia/);
    expect(validarLance({ ...boa, fonte: 'https://blog-qualquer.com/x' }).join()).toMatch(/domínio não aceito/);
    expect(validarLance({ ...boa, status: 'revisada' }).join()).toMatch(/verificada_em/);
  });

  it('falta tem barreira e goleiro na linha; cara a cara não tem barreira', () => {
    expect(validarLance({ ...boa, barreira: '' }).join()).toMatch(/barreira/);
    expect(validarLance({ ...boa, goleiro_saida: '2' }).join()).toMatch(/goleiro fica na linha/);
    expect(validarLance({ ...boa, tipo: 'finalizacao' }).join()).toMatch(/cara a cara não tem barreira/);
  });

  it('palavras e temas proibidos', () => {
    expect(validarLance({ ...boa, ficha: `${boa.ficha} Valendo a odd da rodada.` }).join()).toMatch(/palavra proibida/);
    expect(validarLance({ ...boa, ficha: `${boa.ficha} Depois da tragédia, o clube voltou.` }).join()).toMatch(/tema fora da regra/);
  });

  it('a cena sai do CSV com a zona do canto', () => {
    expect(cenaDoLance(boa)).toEqual({
      tipo: 'falta',
      bola: { x: -8, z: 19 },
      barreira: { jogadores: 4, miraX: -2 },
      zonaHistorica: CANTOS['alto-direita'],
      faixa: 'media',
    });
  });
});

describe('catálogo em dados/lances', () => {
  const pasta = new URL('../../dados/lances/', import.meta.url);
  const lances = readdirSync(pasta)
    .filter((n) => n.endsWith('.csv'))
    .flatMap((n) => lerLances(readFileSync(new URL(n, pasta), 'utf8')).map((l) => ({ ...l, _arquivo: n })));

  it('tem lances', () => {
    expect(lances.length).toBeGreaterThan(0);
  });

  it('todo lance passa no validador', () => {
    expect(validarConjunto(lances)).toEqual([]);
  });

  it('toda cena é válida para o motor', () => {
    for (const l of lances) expect([l.id, validarCena(cenaDoLance(l))]).toEqual([l.id, []]);
  });

  // Se o motor mudar, a faixa de cada lance pode mudar junto: atualize a coluna faixa com o que o robô diz.
  it('a faixa de cada lance é a que o robô de calibragem calcula', () => {
    for (const l of lances) expect([l.id, calibrar(cenaDoLance(l)).faixa]).toEqual([l.id, l.faixa]);
  });
});
