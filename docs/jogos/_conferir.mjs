// Conferidor da fase 2: números e `nomes` que estavam na versão da fase 1 e sumiram do doc enxuto.
// Uso: node docs/jogos/_conferir.mjs docs/jogos/<módulo>.md [docs/outro.md ...]
// Os arquivos extras (opcionais) também contam como "ainda está escrito em algum lugar".
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const [alvo, ...extras] = process.argv.slice(2);
const antes = execSync(`git show f38102a:${alvo.replace(/\\/g, '/')}`, { encoding: 'utf8' });
const agora = [alvo, ...extras].map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const tokens = (t) => {
  const s = new Set();
  for (const m of t.matchAll(/`([^`\n]+)`/g)) s.add('`' + m[1] + '`');
  // números com unidade ou separador (150, 0,418, 10 · 50 · 100, 1,9 s, 30%, 08/11/2026)
  for (const m of t.matchAll(/(?<![\w/])\d+(?:[.,]\d+)*(?:\s?(?:%|s|ms|px|m|kB|KB|h|min))?(?![\w/])/g)) s.add(m[0]);
  return s;
};
const ehData = (x) => /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(x);
const a = tokens(antes);
const b = tokens(agora);
const sumiram = [...a].filter((x) => !b.has(x) && !ehData(x));
const numeros = sumiram.filter((x) => !x.startsWith('`'));
const nomes = sumiram.filter((x) => x.startsWith('`'));
console.log(`${alvo}: ${Math.round(Buffer.byteLength(antes) / 1024)} KB → ${Math.round(fs.statSync(alvo).size / 1024)} KB`);
console.log(`Números que sumiram (${numeros.length}): ${numeros.join(' | ')}`);
console.log(`Nomes entre crases que sumiram (${nomes.length}): ${nomes.join(' | ')}`);
