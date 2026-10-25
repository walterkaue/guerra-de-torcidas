import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// O servidor recalcula a partida com uma cópia deste motor. Se ela ficar diferente,
// o servidor e o celular passam a discordar do resultado.
describe('motor compartilhado com o servidor', () => {
  for (const nome of ['aleatorio.ts', 'penaltis.ts', 'deteccao.ts', 'crava.ts', 'footballData.ts', 'prova.ts', 'timeDoDia.ts', 'lances.ts', 'avisos.ts']) {
    it(`supabase/functions/_shared/jogo/${nome} está em dia (rode npm run compartilhar)`, () => {
      const original = readFileSync(new URL(`./${nome}`, import.meta.url), 'utf8');
      const copia = readFileSync(new URL(`../../supabase/functions/_shared/jogo/${nome}`, import.meta.url), 'utf8');
      expect(copia.slice(copia.indexOf('\n') + 1)).toBe(original);
    });
  }
});

// As funções do pipeline de perguntas (gerar-conteudo, auditar-conteudo) usam o mesmo validador do CSV.
describe('validador de perguntas compartilhado com o servidor', () => {
  for (const nome of ['validar.mjs', 'geracao.mjs']) {
    it(`supabase/functions/_shared/perguntas/${nome} está em dia (rode npm run compartilhar)`, () => {
      const original = readFileSync(new URL(`../../scripts/perguntas/${nome}`, import.meta.url), 'utf8');
      const copia = readFileSync(new URL(`../../supabase/functions/_shared/perguntas/${nome}`, import.meta.url), 'utf8');
      expect(copia.slice(copia.indexOf('\n') + 1)).toBe(original);
    });
  }
});

describe('times compartilhados com o servidor (texto dos avisos)', () => {
  it('supabase/functions/_shared/dados/times.ts está em dia (rode npm run compartilhar)', () => {
    const original = readFileSync(new URL('../dados/times.ts', import.meta.url), 'utf8');
    const copia = readFileSync(new URL('../../supabase/functions/_shared/dados/times.ts', import.meta.url), 'utf8');
    expect(copia.slice(copia.indexOf('\n') + 1)).toBe(original);
  });
});
