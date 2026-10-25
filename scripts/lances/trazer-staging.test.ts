import { describe, expect, it } from 'vitest';
import { faltaNosTrechos, fontesDeVerdade, linhaDoStaging, motivoDeFora } from './trazer-staging.mjs';

const base = {
  id: 'vitoria-2008-falta-de-ramon',
  clube: 'vitoria',
  tipo: 'falta',
  titulo: 'A falta no ângulo no Barradão',
  ficha: '03/08/2008, Brasileirão, no Barradão: no 2º tempo, Ramón Menezes cobra a falta no ângulo. Vitória 1 a 0 no Coritiba.',
  pessoas: 'Ramón Menezes',
  competicao: 'Campeonato Brasileiro',
  data: '2008-08-03',
  adversario: 'Coritiba',
  estadio: 'Barradão',
  bola_x: '-4.00',
  bola_z: '23.00',
  barreira: 4,
  barreira_mira_x: '-1.50',
  goleiro_saida: null,
  canto: 'alto-esquerda',
  chegada: null,
  chegada_de: null,
  faixa: 'media',
  fonte: 'https://www.lance.com.br/vitoria/ramon-falta-coritiba-2008.html',
  fonte2: 'https://ecvitoria.com.br/',
  verificada_em: '2026-10-21',
  status: 'revisada',
  observacao: 'Gemini.',
};

describe('trazer lances do staging', () => {
  it('converte a linha do banco: números como texto, sem espaço duro, data curta', () => {
    const l = linhaDoStaging({ ...base, ficha: 'no 2 tempo,  Ramón', data: '2008-08-03T00:00:00Z' });
    expect(l.bola_x).toBe('-4');
    expect(l.barreira).toBe('4');
    expect(l.goleiro_saida).toBe('');
    expect(l.ficha).toBe('no 2 tempo, Ramón');
    expect(l.data).toBe('2008-08-03');
  });

  it('só vale fonte de domínio aceito que não seja página inicial nem página de seção', () => {
    expect(fontesDeVerdade(linhaDoStaging(base))).toEqual(['https://www.lance.com.br/vitoria/ramon-falta-coritiba-2008.html']);
    expect(fontesDeVerdade(linhaDoStaging({ ...base, fonte: 'https://www.lance.com.br/atletico-mineiro' }))).toEqual([]);
  });

  it('fica de fora: pênalti (até com erro de digitação), caractere quebrado, sem fonte de verdade', () => {
    expect(motivoDeFora(linhaDoStaging(base))).toBeNull();
    expect(motivoDeFora(linhaDoStaging({ ...base, titulo: 'O pevalti na goleada' }))).toMatch(/pênalti/);
    expect(motivoDeFora(linhaDoStaging({ ...base, ficha: `${base.ficha} classifica÷ão` }))).toMatch(/caractere/);
    expect(motivoDeFora(linhaDoStaging({ ...base, fonte: 'https://ecvitoria.com.br/' }))).toMatch(/fonte de verdade/);
  });

  it('os trechos somados têm de trazer ano, adversário e quem fez', () => {
    const l = linhaDoStaging(base);
    expect(faltaNosTrechos(l, ['Em 2008, o Vitória venceu o Coritiba por 1 a 0', 'gol de falta de Ramón Menezes'])).toBeNull();
    expect(faltaNosTrechos(l, ['O Vitória venceu o Coritiba, gol de Ramón'])).toMatch(/ano 2008/);
    expect(faltaNosTrechos(l, ['Em 2008, gol de falta de Ramón Menezes'])).toMatch(/adversário/);
    expect(faltaNosTrechos(l, ['Em 2008, o Vitória venceu o Coritiba por 1 a 0'])).toMatch(/Ramón Menezes/);
  });
});
