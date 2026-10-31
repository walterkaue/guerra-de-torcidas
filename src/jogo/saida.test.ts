import { describe, expect, it } from 'vitest';
import { dominioDoLink, ehLinkExterno } from './saida';

const JOGO = 'torcida.kauewalter.com.br';

describe('aviso de saída', () => {
  it('site de outro domínio é externo', () => {
    expect(ehLinkExterno('https://apoia.se/jogo', JOGO)).toBe(true);
    expect(ehLinkExterno('http://exemplo.org/', JOGO)).toBe(true);
  });
  it('o próprio jogo, e-mail e link quebrado não são', () => {
    expect(ehLinkExterno('https://torcida.kauewalter.com.br/#casa', JOGO)).toBe(false);
    expect(ehLinkExterno('mailto:contato@exemplo.org', JOGO)).toBe(false);
    expect(ehLinkExterno('#termos', JOGO)).toBe(false);
  });
  it('mostra o domínio sem www', () => {
    expect(dominioDoLink('https://www.exemplo.org/a/b?c=1')).toBe('exemplo.org');
    expect(dominioDoLink('nada')).toBe('');
  });
});
