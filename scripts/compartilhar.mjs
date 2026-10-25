// Copia o código puro compartilhado para as funções do Supabase (Deno), que só enxergam supabase/functions.
// Uso: npm run compartilhar   (o teste src/jogo/compartilhado.test.ts avisa se esquecer)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/** Motor do jogo: src/jogo → _shared/jogo. */
export const ARQUIVOS = ['aleatorio.ts', 'penaltis.ts', 'deteccao.ts', 'crava.ts', 'footballData.ts', 'prova.ts', 'timeDoDia.ts', 'lances.ts'];
export const CABECALHO =
  '// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.\n';

/** Validador e travas das perguntas: scripts/perguntas → _shared/perguntas (pipeline do Gemini). */
export const ARQUIVOS_PERGUNTAS = ['validar.mjs', 'geracao.mjs'];
export const CABECALHO_PERGUNTAS =
  '// CÓPIA GERADA de scripts/perguntas por scripts/compartilhar.mjs. Não edite aqui: mude lá e rode `npm run compartilhar`.\n';

function copiar(origem, destino, nomes, cabecalho) {
  mkdirSync(destino, { recursive: true });
  for (const nome of nomes) writeFileSync(new URL(nome, destino), cabecalho + readFileSync(new URL(nome, origem), 'utf8'));
}

copiar(new URL('../src/jogo/', import.meta.url), new URL('../supabase/functions/_shared/jogo/', import.meta.url), ARQUIVOS, CABECALHO);
copiar(
  new URL('./perguntas/', import.meta.url),
  new URL('../supabase/functions/_shared/perguntas/', import.meta.url),
  ARQUIVOS_PERGUNTAS,
  CABECALHO_PERGUNTAS,
);
console.log(`Copiados para supabase/functions/_shared: jogo/${ARQUIVOS.join(', jogo/')}, perguntas/${ARQUIVOS_PERGUNTAS.join(', perguntas/')}`);
