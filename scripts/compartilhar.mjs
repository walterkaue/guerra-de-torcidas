// Copia o motor puro do jogo para as funções do Supabase (Deno), que só enxergam supabase/functions.
// Uso: npm run compartilhar   (o teste src/jogo/compartilhado.test.ts avisa se esquecer)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const ARQUIVOS = ['aleatorio.ts', 'penaltis.ts', 'deteccao.ts'];
export const CABECALHO =
  '// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.\n';

const origem = new URL('../src/jogo/', import.meta.url);
const destino = new URL('../supabase/functions/_shared/jogo/', import.meta.url);
mkdirSync(destino, { recursive: true });
for (const nome of ARQUIVOS) {
  writeFileSync(new URL(nome, destino), CABECALHO + readFileSync(new URL(nome, origem), 'utf8'));
}
console.log(`Copiados para supabase/functions/_shared/jogo: ${ARQUIVOS.join(', ')}`);
