// Gera as fontes auto-hospedadas só com os caracteres do português (docs/visual.md, seção 2).
// Origem: pacotes @fontsource (licença OFL). Uso: npm run fontes  → public/fontes/*.woff2

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);

// ASCII visível + acentos do português + sinais usados na interface.
const CARACTERES =
  Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') +
  'ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç' +
  'ºª°·–—‘’“”…•×→←↑↓▲▼ ';

const FONTES = [
  ['anton', '@fontsource/anton/files/anton-latin-400-normal.woff2'],
  ['barlow-400', '@fontsource/barlow/files/barlow-latin-400-normal.woff2'],
  ['barlow-700', '@fontsource/barlow/files/barlow-latin-700-normal.woff2'],
  ['barlow-condensed-700', '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2'],
];

const destino = new URL('../public/fontes/', import.meta.url);
mkdirSync(destino, { recursive: true });
let total = 0;
for (const [nome, arquivo] of FONTES) {
  const original = readFileSync(require.resolve(arquivo));
  const reduzida = await subsetFont(original, CARACTERES, { targetFormat: 'woff2' });
  writeFileSync(new URL(`${nome}.woff2`, destino), reduzida);
  total += reduzida.length;
  console.log(`${nome}.woff2: ${(original.length / 1024).toFixed(1)} KB → ${(reduzida.length / 1024).toFixed(1)} KB`);
}
console.log(`Total: ${(total / 1024).toFixed(1)} KB`);
