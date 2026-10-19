import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// O servidor recalcula a partida com uma cópia deste motor. Se ela ficar diferente,
// o servidor e o celular passam a discordar do resultado.
describe('motor compartilhado com o servidor', () => {
  for (const nome of ['aleatorio.ts', 'penaltis.ts', 'deteccao.ts', 'crava.ts', 'footballData.ts', 'prova.ts']) {
    it(`supabase/functions/_shared/jogo/${nome} está em dia (rode npm run compartilhar)`, () => {
      const original = readFileSync(new URL(`./${nome}`, import.meta.url), 'utf8');
      const copia = readFileSync(new URL(`../../supabase/functions/_shared/jogo/${nome}`, import.meta.url), 'utf8');
      expect(copia.slice(copia.indexOf('\n') + 1)).toBe(original);
    });
  }
});
