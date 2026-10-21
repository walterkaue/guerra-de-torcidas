// Gera src/dados/lances.ts a partir de dados/lances/*.csv: só entra lance "revisada" ou "ativa".
// Uso: npm run catalogo-lances   (rode sempre que mudar um CSV; o teste avisa se esquecer)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cenaDoLance, lerLances } from './validar.mjs';

const PASTA = new URL('../../dados/lances/', import.meta.url);
const DESTINO = new URL('../../src/dados/lances.ts', import.meta.url);

/** Todos os lances de todos os lotes, na ordem dos arquivos. */
export function lerTodos() {
  return readdirSync(PASTA)
    .filter((n) => n.endsWith('.csv'))
    .sort()
    .flatMap((n) => lerLances(readFileSync(new URL(n, PASTA), 'utf8')));
}

/** Texto do módulo gerado. */
export function gerarCatalogo(lances) {
  const publicados = lances.filter((l) => l.status === 'revisada' || l.status === 'ativa');
  const itens = publicados.map((l) => {
    const lance = {
      id: l.id,
      clube: l.clube,
      titulo: l.titulo,
      ficha: l.ficha,
      competicao: l.competicao,
      data: l.data,
      adversario: l.adversario,
      ...cenaDoLance(l),
    };
    return `  ${JSON.stringify(lance)},`;
  });
  return [
    '// GERADO por scripts/lances/catalogo.mjs a partir de dados/lances/*.csv. Não edite aqui: mude o CSV e rode `npm run catalogo-lances`.',
    "import type { Lance } from '../jogo/lances';",
    '',
    'export const LANCES: readonly Lance[] = [',
    ...itens,
    '];',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const texto = gerarCatalogo(lerTodos());
  writeFileSync(DESTINO, texto);
  console.log(`src/dados/lances.ts: ${texto.split('\n').filter((l) => l.startsWith('  {')).length} lances publicados.`);
}
