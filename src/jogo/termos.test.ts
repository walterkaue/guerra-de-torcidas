import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MARCAS_DE_RASCUNHO, termosEmHtml } from './termos';

describe('texto dos termos', () => {
  it('títulos, parágrafos e listas', () => {
    expect(termosEmHtml('# Termos\n\nLinha um\nlinha dois.\n\n## Dados\n- um\n- dois\n\nFim.')).toBe(
      '<h3>Termos</h3><p>Linha um linha dois.</p><h4>Dados</h4><ul><li>um</li><li>dois</li></ul><p>Fim.</p>',
    );
  });

  it('negrito, itálico e links só https ou e-mail', () => {
    expect(termosEmHtml('**forte** e *leve*')).toBe('<p><strong>forte</strong> e <em>leve</em></p>');
    expect(termosEmHtml('[site](https://exemplo.org/a)')).toContain('href="https://exemplo.org/a"');
    expect(termosEmHtml('[mail](mailto:oi@exemplo.org)')).toContain('href="mailto:oi@exemplo.org"');
    expect(termosEmHtml('[x](javascript:alert(1))')).not.toContain('href');
  });

  it('escapa o que não é texto', () => {
    expect(termosEmHtml('<script>alert(1)</script>')).not.toContain('<script');
  });

  it('o texto publicado não tem trecho de rascunho', () => {
    const texto = readFileSync(fileURLToPath(new URL('../dados/termos.md', import.meta.url)), 'utf8');
    expect(texto).not.toMatch(MARCAS_DE_RASCUNHO);
  });
});
