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

  it('lista numerada mantém a ordem, e mudar de lista fecha a anterior', () => {
    expect(termosEmHtml('1. um\n2. dois\n- três')).toBe('<ol><li>um</li><li>dois</li></ol><ul><li>três</li></ul>');
  });

  it('tabela vira fichas, com o título de cada coluna', () => {
    expect(termosEmHtml('| O quê | Para quê | Precisa? |\n| --- | --- | --- |\n| Time | **Pontos** | Sim |\n\nFim.')).toBe(
      '<dl class="termos-fichas"><div><dt>Time</dt><dd><small>Para quê</small><strong>Pontos</strong></dd><dd><small>Precisa?</small>Sim</dd></div></dl><p>Fim.</p>',
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

  const texto = readFileSync(fileURLToPath(new URL('../dados/termos.md', import.meta.url)), 'utf8');

  it('o texto publicado não tem trecho de rascunho', () => {
    expect(texto).not.toMatch(MARCAS_DE_RASCUNHO);
    expect(texto).not.toMatch(/rascunho|advogado/i);
  });

  it('o texto publicado renderiza por inteiro, com os 11 pontos numerados e as 8 fichas', () => {
    const html = termosEmHtml(texto);
    expect(html.match(/<ol>.*?<\/ol>/)?.[0].match(/<li>/g)).toHaveLength(11);
    expect(html.match(/<dt>/g)).toHaveLength(8);
    expect(html).not.toMatch(/\*\*|\|/);
  });
});
