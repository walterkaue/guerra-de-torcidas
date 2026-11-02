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
    expect(vagasEmAberto(comUmaDoRemo)).toEqual([{ clube: 'vasco', degrau: 'facil', falta: 3 }, { clube: 'remo', degrau: 'facil', falta: 2 }]);
  });

  it('conta rascunhos pendentes (degrau em texto) para não gerar a mais', () => {
    const sem = cheio.filter((p) => !(p.clube === 'bahia' && p.degrau === 1));
    expect(vagasEmAberto(sem)[0]).toEqual({ clube: 'bahia', degrau: 'facil', falta: 3 });
    const pendentes = [{ clube: 'bahia', degrau: 'facil' }, { clube: 'bahia', degrau: 'facil' }, { clube: 'bahia', degrau: 'facil' }];
    expect(vagasEmAberto(sem, pendentes)).toEqual([]);
  });

  it('sobra de média não cobre falta de fácil', () => {
    const base = cheio.filter((p) => !(p.clube === 'coritiba' && p.degrau === 1)).concat([{ clube: 'coritiba', degrau: 2 }, { clube: 'coritiba', degrau: 2 }]);
    expect(vagasEmAberto(base)).toEqual([{ clube: 'coritiba', degrau: 'facil', falta: 3 }]);
  });

  it('empate na maior falta sorteia entre os empatados', () => {
    const base = cheio.filter((p) => !(p.degrau === 4 && (p.clube === 'santos' || p.clube === 'vasco')));
    const a = escolherVaga(base, [], () => 0);
    const b = escolherVaga(base, [], () => 0.99);
    expect([a.clube, b.clube].sort()).toEqual(['santos', 'vasco']);
    expect(a.degrau).toBe('craque');
    expect(a.falta).toBe(2);
  });

  it('ignora clube "geral"', () => {
    expect(vagasEmAberto([{ clube: 'geral', degrau: 1 }, ...cheio])).toEqual([]);
  });
});
