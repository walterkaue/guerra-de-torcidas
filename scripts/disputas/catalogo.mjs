// Gera src/dados/disputas.ts a partir de dados/disputas/*.csv: só entra disputa "revisada" ou "ativa".
// Uso: npm run catalogo-disputas   (rode sempre que mudar um CSV; o teste avisa se esquecer)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerDisputas } from './validar.mjs';

const PASTA = new URL('../../dados/disputas/', import.meta.url);
const DESTINO = new URL('../../src/dados/disputas.ts', import.meta.url);

/** Todas as disputas de todos os lotes, na ordem dos arquivos. */
export function lerTodas() {
  return readdirSync(PASTA)
    .filter((n) => n.endsWith('.csv'))
    .sort()
    .flatMap((n) => lerDisputas(readFileSync(new URL(n, PASTA), 'utf8')).map((d) => ({ ...d, _arquivo: n })));
}

/** Texto do módulo gerado. */
export function gerarCatalogo(disputas) {
  const publicadas = disputas.filter((d) => d.status === 'revisada' || d.status === 'ativa');
  const itens = publicadas.map((d) => {
    const disputa = {
      id: d.id,
      clube: d.clube,
      titulo: d.titulo,
      ficha: d.ficha,
      competicao: d.competicao,
      fase: d.fase,
      data: d.data,
      adversario: d.adversario,
      placar: d.placar_disputa,
    };
    return `  ${JSON.stringify(disputa)},`;
  });
  return [
    '// GERADO por scripts/disputas/catalogo.mjs a partir de dados/disputas/*.csv. Não edite aqui: mude o CSV e rode `npm run catalogo-disputas`.',
    "import type { Disputa } from '../jogo/disputas';",
    '',
    'export const DISPUTAS: readonly Disputa[] = [',
    ...itens,
    '];',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const texto = gerarCatalogo(lerTodas());
  writeFileSync(DESTINO, texto);
  console.log(`src/dados/disputas.ts: ${texto.split('\n').filter((l) => l.startsWith('  {')).length} disputas publicadas.`);
}
