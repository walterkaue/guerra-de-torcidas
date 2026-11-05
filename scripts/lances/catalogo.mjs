// Gera src/dados/lances.ts (o catálogo) e src/dados/lancesResumo.ts (as contagens que a Home mostra) a partir de
// dados/lances/*.csv: só entra lance "revisada" ou "ativa". A faixa dos Lances unificados (`faixaUnificada`, seção
// 14.7) vem de dados/lances/faixas-unificadas.json, gerado por scripts/lances/recalibrar.mjs.
// Uso: npm run catalogo-lances   (rode sempre que mudar um CSV; o teste avisa se esquecer)

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cenaDoLance, lerLances } from './validar.mjs';

const PASTA = new URL('../../dados/lances/', import.meta.url);
const DESTINO = new URL('../../src/dados/lances.ts', import.meta.url);
const DESTINO_RESUMO = new URL('../../src/dados/lancesResumo.ts', import.meta.url);
const FAIXAS_UNIFICADAS = new URL('../../dados/lances/faixas-unificadas.json', import.meta.url);

/** id → faixa dos Lances unificados (vazio se o arquivo ainda não existe). */
export function lerFaixasUnificadas() {
  if (!existsSync(FAIXAS_UNIFICADAS)) return {};
  const { lances } = JSON.parse(readFileSync(FAIXAS_UNIFICADAS, 'utf8'));
  return Object.fromEntries(Object.entries(lances).map(([id, f]) => [id, f.unificada]));
}

/** Todos os lances de todos os lotes, na ordem dos arquivos. */
export function lerTodos() {
  return readdirSync(PASTA)
    .filter((n) => n.endsWith('.csv'))
    .sort()
    .flatMap((n) => lerLances(readFileSync(new URL(n, PASTA), 'utf8')));
}

const publicados = (lances) => lances.filter((l) => l.status === 'revisada' || l.status === 'ativa');

/** Texto do módulo gerado. */
export function gerarCatalogo(lances, faixasUnificadas = {}) {
  const itens = publicados(lances).map((l) => {
    const lance = {
      id: l.id,
      clube: l.clube,
      titulo: l.titulo,
      ficha: l.ficha,
      competicao: l.competicao,
      data: l.data,
      adversario: l.adversario,
      ...(l.chegada ? { chegada: l.chegada, chegadaDe: l.chegada_de } : {}),
      ...cenaDoLance(l),
      ...(faixasUnificadas[l.id] ? { faixaUnificada: faixasUnificadas[l.id] } : {}),
    };
    return `  ${JSON.stringify(lance)},`;
  });
  return [
    '// GERADO por scripts/lances/catalogo.mjs a partir de dados/lances/*.csv. Não edite aqui: mude o CSV e rode `npm run catalogo-lances`.',
    "import type { Lance } from '../jogo/lances.ts';",
    '',
    'export const LANCES: readonly Lance[] = [',
    ...itens,
    '];',
    '',
  ].join('\n');
}

/** Texto do resumo: separado do catálogo para a Home contar os lances sem baixar as fichas. */
export function gerarResumo(lances) {
  const porClube = {};
  for (const l of publicados(lances)) porClube[l.clube] = (porClube[l.clube] ?? 0) + 1;
  const ordenado = Object.fromEntries(Object.entries(porClube).sort(([a], [b]) => a.localeCompare(b)));
  return [
    '// GERADO por scripts/lances/catalogo.mjs a partir de dados/lances/*.csv. Não edite aqui: mude o CSV e rode `npm run catalogo-lances`.',
    `export const TOTAL_LANCES = ${publicados(lances).length};`,
    `export const LANCES_POR_CLUBE: Readonly<Record<string, number>> = ${JSON.stringify(ordenado)};`,
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const todos = lerTodos();
  const texto = gerarCatalogo(todos, lerFaixasUnificadas());
  writeFileSync(DESTINO, texto);
  writeFileSync(DESTINO_RESUMO, gerarResumo(todos));
  console.log(`src/dados/lances.ts: ${texto.split('\n').filter((l) => l.startsWith('  {')).length} lances publicados.`);
}
