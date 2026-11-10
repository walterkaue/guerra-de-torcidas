import { describe, expect, it } from 'vitest';
import { ariaDoOndeBateu, contarMarcas, fraseDaDobra, marcasDasGravadas, montarZonas, rotuloOndeBateu } from './ondeBateu';

const def = (alvo: number, desfecho: 'defesa' | 'gol' | 'fora', contraGravada = true) => ({ alvo, desfecho, contraGravada });
const defesas = [def(5, 'defesa'), def(1, 'gol'), def(5, 'gol'), def(0, 'fora'), def(2, 'defesa'), def(4, 'gol', false)];

describe('onde quem chamou bateu', () => {
  it('filtra só as gravadas e numera pela ordem', () => {
    const m = marcasDasGravadas(defesas);
    expect(m).toHaveLength(5);
    expect(m.map((x) => x.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('conta pegas e total', () => {
    expect(contarMarcas(marcasDasGravadas(defesas))).toEqual({ n: 2, m: 5 });
    expect(contarMarcas([])).toEqual({ n: 0, m: 0 });
  });

  it('monta as zonas na ordem e deixa as de fora à parte', () => {
    const { zonas, fora } = montarZonas(marcasDasGravadas(defesas));
    expect(zonas[5].map((x) => x.n)).toEqual([1, 3]);
    expect(zonas[1].map((x) => x.n)).toEqual([2]);
    expect(zonas[2].map((x) => x.n)).toEqual([5]);
    expect(zonas[0]).toEqual([]);
    expect(fora.map((x) => x.n)).toEqual([4]);
  });

  it('frase da dobra', () => {
    expect(fraseDaDobra(2, 5)).toBe('Você pegou 2 das 5 cobranças');
    expect(fraseDaDobra(0, 5)).toBe('Você pegou 0 das 5 cobranças');
    expect(fraseDaDobra(1, 1)).toBe('Você pegou a cobrança');
    expect(fraseDaDobra(0, 1)).toBe('Você não pegou a cobrança');
  });

  it('rótulo com e sem apelido', () => {
    expect(rotuloOndeBateu('Camisa10')).toBe('Onde Camisa10 bateu');
    expect(rotuloOndeBateu(null)).toBe('Onde quem te chamou bateu');
    expect(rotuloOndeBateu('  ')).toBe('Onde quem te chamou bateu');
  });

  it('aria-label com a frase inteira', () => {
    const t = ariaDoOndeBateu(null, marcasDasGravadas(defesas));
    expect(t).toContain('Onde quem te chamou bateu: 1ª no alto, no canto direito, você pegou; 2ª embaixo, no meio, entrou;');
    expect(t).toContain('4ª pra fora, não valeu');
    expect(t.endsWith('.')).toBe(true);
  });
});
