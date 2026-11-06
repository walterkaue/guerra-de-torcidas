import { describe, expect, it } from 'vitest';
import { htmlDoBloco, pecasParaAnunciar, poseDeBracos } from './pecaNovaBloco';

const base = { xpAntes: 990, xpDepois: 1010, medalhasDepois: [], jogadas: [], contou: true };
const ids = (xs: { id: string }[]) => xs.map((p) => p.id);

describe('pecasParaAnunciar', () => {
  it('anuncia as peças do nível que a partida liberou', () => {
    expect(ids(pecasParaAnunciar(base, new Set()))).toEqual(['chuteira_time', 'pose_bracos', 'fundo_tunel']);
  });

  it('não anuncia sem subida de verdade', () => {
    expect(pecasParaAnunciar({ ...base, xpAntes: 1010 }, new Set())).toEqual([]);
    expect(pecasParaAnunciar({ ...base, xpAntes: 100, xpDepois: 120 }, new Set())).toEqual([]);
  });

  it('aparelho que nunca viu o XP não anuncia nível', () => {
    expect(pecasParaAnunciar({ ...base, xpAntes: null }, new Set())).toEqual([]);
  });

  it('não repete no mesmo aparelho (peça já vista)', () => {
    const primeira = pecasParaAnunciar(base, new Set());
    const vistas = new Set(ids(primeira));
    expect(pecasParaAnunciar(base, vistas)).toEqual([]);
  });

  it('sob suspeita, sem conexão ou treino (não contou) não mostra', () => {
    expect(pecasParaAnunciar({ ...base, contou: false }, new Set())).toEqual([]);
  });

  it('1º bronze de um lance libera a munhequeira bronze', () => {
    const e = {
      ...base,
      xpAntes: 10,
      xpDepois: 20,
      medalhasDepois: [{ lance_id: 'x', gols: 5, recriados: 0, vitorias: 0 }],
      jogadas: [{ item: 'x', gols: 1, recriados: 0, vitorias: 0 }],
    };
    expect(ids(pecasParaAnunciar(e, new Set()))).toEqual(['munhequeira_bronze']);
  });
});

describe('poseDeBracos', () => {
  it('só com a peça entre as novas ou já liberada (nível 2 ou mais)', () => {
    expect(poseDeBracos([], 10)).toBe(false);
    expect(poseDeBracos([], 1010)).toBe(true);
  });
});

describe('htmlDoBloco', () => {
  it('mostra título, grupos e o botão; sem boneco guardado, só a lista', () => {
    const novas = pecasParaAnunciar(base, new Set());
    const h = htmlDoBloco(novas, false);
    expect(h).toContain('Peça nova no vestiário');
    expect(h).toContain('Subiu pra Titular!');
    expect(h).toContain('Vestir agora');
    expect(h).not.toContain('data-peca-boneco');
    expect(htmlDoBloco(novas, true)).toContain('data-peca-boneco');
  });
});
