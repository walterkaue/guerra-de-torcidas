import { describe, expect, it } from 'vitest';
import { chamadaDaDisputa, disputasDoTorcedor, lembrancaDaDisputa, type Disputa } from './disputas';

const disputa = (id: string, clube: string, data: string): Disputa => ({
  id,
  clube,
  titulo: id,
  ficha: `Ficha de ${id}`,
  competicao: 'Copa',
  fase: 'Final',
  data,
  adversario: 'Itália',
  placar: '4 x 3',
});

describe('disputas', () => {
  it('escreve a chamada do jogo', () => {
    const d = disputa('a', 'flamengo', '2018-12-12');
    expect(lembrancaDaDisputa(d)).toBe('Final de 2018: foi 4 x 3.');
    expect(chamadaDaDisputa(d)).toBe('Final de 2018: foi 4 x 3. E hoje?');
  });

  it('o torcedor vê as do time e as da Seleção, da mais nova à mais antiga', () => {
    const catalogo = [
      disputa('fla-velha', 'flamengo', '2001-01-01'),
      disputa('fla-nova', 'flamengo', '2022-01-01'),
      disputa('sel-velha', 'selecao', '1994-07-17'),
      disputa('sel-nova', 'selecao', '2016-08-20'),
      disputa('outro-clube', 'vasco', '2020-01-01'),
    ];
    const { doTime, daSelecao } = disputasDoTorcedor(catalogo, 'flamengo');
    expect(doTime.map((d) => d.id)).toEqual(['fla-nova', 'fla-velha']);
    expect(daSelecao.map((d) => d.id)).toEqual(['sel-nova', 'sel-velha']);
  });

  it('quem é de "Outro time" vê só as da Seleção', () => {
    const { doTime, daSelecao } = disputasDoTorcedor([disputa('sel', 'selecao', '1994-07-17'), disputa('fla', 'flamengo', '2001-01-01')], 'outro');
    expect(doTime).toEqual([]);
    expect(daSelecao).toHaveLength(1);
  });
});
