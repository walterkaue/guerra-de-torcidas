import { describe, expect, it } from 'vitest';
import { linkDoSocio, primeiroCliqueDoDia, textosDoSocio } from './socio';

function armazemFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  const armazem = {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
  };
  return () => armazem;
}

/** Como em janela privada de alguns navegadores: só de tocar no localStorage, dá erro. */
const quebrado = (): Storage => {
  throw new Error('bloqueado');
};

describe('textos do Seja sócio', () => {
  it('acerta o artigo do clube', () => {
    expect(textosDoSocio({ nome: 'Flamengo', artigo: 'o' }, 'Nação')).toEqual({
      titulo: 'Apoie o Flamengo fora do jogo',
      linha: 'O programa oficial de sócio torcedor é o Nação.',
      saida: 'Você vai para o site oficial do Flamengo. O Guerra de Torcidas não tem ligação com o clube.',
    });
    const chape = textosDoSocio({ nome: 'Chapecoense', artigo: 'a' }, 'Sócio Condá');
    expect(chape.titulo).toBe('Apoie a Chapecoense fora do jogo');
    expect(chape.saida).toContain('site oficial da Chapecoense.');
  });
});

describe('link de saída', () => {
  it('acrescenta os utm', () => {
    expect(linkDoSocio('https://sociorei.com/')).toBe(
      'https://sociorei.com/?utm_source=guerradetorcidas&utm_medium=casa&utm_campaign=socio',
    );
  });

  it('mantém os parâmetros e a âncora que a URL já tenha', () => {
    expect(linkDoSocio('https://clube.com.br/planos?tipo=familia#adesao')).toBe(
      'https://clube.com.br/planos?tipo=familia&utm_source=guerradetorcidas&utm_medium=casa&utm_campaign=socio#adesao',
    );
  });
});

describe('limite de um clique por clube por dia', () => {
  it('conta uma vez por clube por dia', () => {
    const a = armazemFalso();
    expect(primeiroCliqueDoDia('clube-a', '2026-11-01', a)).toBe(true);
    expect(primeiroCliqueDoDia('clube-a', '2026-11-01', a)).toBe(false);
    expect(primeiroCliqueDoDia('clube-b', '2026-11-01', a)).toBe(true);
    expect(primeiroCliqueDoDia('clube-a', '2026-11-02', a)).toBe(true);
  });

  it('respeita o que já estava salvo no aparelho', () => {
    const a = armazemFalso({ 'gdt:socio-cliques': JSON.stringify({ 'clube-c': '2026-11-03' }) });
    expect(primeiroCliqueDoDia('clube-c', '2026-11-03', a)).toBe(false);
  });

  it('não quebra com armazenamento bloqueado ou corrompido', () => {
    expect(primeiroCliqueDoDia('clube-d', '2026-11-04', quebrado)).toBe(true);
    expect(primeiroCliqueDoDia('clube-d', '2026-11-04', quebrado)).toBe(false);
    expect(primeiroCliqueDoDia('clube-e', '2026-11-04', armazemFalso({ 'gdt:socio-cliques': '{quebrado' }))).toBe(true);
  });
});
