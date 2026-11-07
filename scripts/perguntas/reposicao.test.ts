import { describe, expect, it } from 'vitest';
import { CLUBES } from './validar.mjs';
import { COTA, escolherVaga, vagasEmAberto } from './reposicao.mjs';

/** Banco cheio: a cota inteira de cada clube. */
const cheio = CLUBES.flatMap((clube) =>
  Object.entries(COTA).flatMap(([degrau, n]) => Array.from({ length: n }, () => ({ clube, degrau: { facil: 1, media: 2, dificil: 3, craque: 4 }[degrau] }))),
);

describe('reposição: vagas pela cota', () => {
  it('banco cheio não tem vaga', () => {
    expect(vagasEmAberto(cheio)).toEqual([]);
    expect(escolherVaga(cheio)).toBeNull();
  });

  it('acha o que falta e ordena pela maior falta', () => {
    const semVasco = cheio.filter((p) => !(p.clube === 'vasco' && p.degrau === 1));
    const comUmaDoRemo = semVasco.filter((p) => !(p.clube === 'remo' && p.degrau === 1)).concat([{ clube: 'remo', degrau: 1 }]);
    expect(vagasEmAberto(comUmaDoRemo)).toEqual([{ clube: 'vasco', degrau: 'facil', falta: 9 }, { clube: 'remo', degrau: 'facil', falta: 8 }]);
  });

  it('conta rascunhos pendentes (degrau em texto) para não gerar a mais', () => {
    const sem = cheio.filter((p) => !(p.clube === 'bahia' && p.degrau === 1));
    expect(vagasEmAberto(sem)[0]).toEqual({ clube: 'bahia', degrau: 'facil', falta: 9 });
    const pendentes = Array.from({ length: 9 }, () => ({ clube: 'bahia', degrau: 'facil' }));
    expect(vagasEmAberto(sem, pendentes)).toEqual([]);
  });

  it('sobra de média não cobre falta de fácil', () => {
    const base = cheio.filter((p) => !(p.clube === 'coritiba' && p.degrau === 1)).concat([{ clube: 'coritiba', degrau: 2 }, { clube: 'coritiba', degrau: 2 }]);
    expect(vagasEmAberto(base)).toEqual([{ clube: 'coritiba', degrau: 'facil', falta: 9 }]);
  });

  it('empate na maior falta sorteia entre os empatados', () => {
    const base = cheio.filter((p) => !(p.degrau === 4 && (p.clube === 'santos' || p.clube === 'vasco')));
    const a = escolherVaga(base, [], () => 0);
    const b = escolherVaga(base, [], () => 0.99);
    expect([a.clube, b.clube].sort()).toEqual(['santos', 'vasco']);
    expect(a.degrau).toBe('craque');
    expect(a.falta).toBe(6);
  });

  it('a cota é a meta do lançamento: 30 por clube (9/9/6/6)', () => {
    expect(COTA).toEqual({ facil: 9, media: 9, dificil: 6, craque: 6 });
    expect(Object.values(COTA).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('clube acima da cota em um degrau não perde vaga nos outros e fica por último nele', () => {
    // Vasco com 12 médias (cota 9) e só 4 fáceis; o resto do banco cheio.
    const base = cheio.filter((p) => !(p.clube === 'vasco' && (p.degrau === 1 || p.degrau === 2)));
    const vasco = [
      ...Array.from({ length: 4 }, () => ({ clube: 'vasco', degrau: 1 })),
      ...Array.from({ length: 12 }, () => ({ clube: 'vasco', degrau: 2 })),
    ];
    const vagas = vagasEmAberto([...base, ...vasco]);
    expect(vagas).toEqual([{ clube: 'vasco', degrau: 'facil', falta: 5 }]);
    // Média do Vasco passou da cota: não aparece, e as médias dos outros clubes seguem na fila se faltarem.
    const semBahiaMedia = [...base, ...vasco].filter((p) => !(p.clube === 'bahia' && p.degrau === 2));
    const v2 = vagasEmAberto(semBahiaMedia);
    expect(v2[0]).toEqual({ clube: 'bahia', degrau: 'media', falta: 9 });
    expect(v2.some((v) => v.clube === 'vasco' && v.degrau === 'media')).toBe(false);
  });

  it('com 3 pendentes e 2 ativas num degrau de 6, faltam 1', () => {
    const base = cheio.filter((p) => !(p.clube === 'santos' && p.degrau === 3));
    const ativas = [...base, { clube: 'santos', degrau: 3 }, { clube: 'santos', degrau: 3 }];
    const pend = [{ clube: 'santos', degrau: 'dificil' }, { clube: 'santos', degrau: 'dificil' }, { clube: 'santos', degrau: 'dificil' }];
    expect(vagasEmAberto(ativas, pend)).toEqual([{ clube: 'santos', degrau: 'dificil', falta: 1 }]);
  });

  it('ignora clube "geral"', () => {
    expect(vagasEmAberto([{ clube: 'geral', degrau: 1 }, ...cheio])).toEqual([]);
  });
});
