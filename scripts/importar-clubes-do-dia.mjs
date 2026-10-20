// Importa os clubes do Time do Dia de dados/clubes-do-dia.csv para o projeto ligado (supabase link).
// Só entra clube com status "revisada" e fontes aceitas (docs/jogo.md, seção 7.2); ele vira "ativa".
// "aposentada" tira o clube da lista e do sorteio. "rascunho" é ignorado (falta a conferência das fontes).
// Uso:
//   npm run importar-clubes-do-dia                 valida, mostra o resumo e pergunta antes de gravar
//   npm run importar-clubes-do-dia -- --seco       só valida e mostra o resumo, sem tocar no banco
//   npm run importar-clubes-do-dia -- --sim        não pergunta antes de gravar
//   npm run importar-clubes-do-dia -- outro.csv    outro arquivo

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { DIVISOES, gerarSql, lerClubes, validarConjunto } from './clubes/validar.mjs';

const args = process.argv.slice(2);
const seco = args.includes('--seco');
const semPerguntar = args.includes('--sim');
const arquivo = args.find((a) => !a.startsWith('--')) ?? 'dados/clubes-do-dia.csv';

let clubes;
try {
  clubes = lerClubes(readFileSync(arquivo, 'utf8')).map((c) => ({ ...c, _arquivo: arquivo }));
} catch (e) {
  console.error(`✖ ${arquivo}: ${e.message}`);
  process.exit(1);
}

const porStatus = (s) => clubes.filter((c) => c.status === s);
const paraGravar = clubes.filter((c) => c.status === 'revisada' || c.status === 'aposentada');
const erros = validarConjunto(clubes);
// Erro em rascunho só avisa (a revisão ainda vai mexer); erro no que vai entrar barra o import.
const idsGravar = new Set(paraGravar.map((c) => c.id));
const bloqueiam = erros.filter((e) => idsGravar.has(e.id));
const avisos = erros.filter((e) => !idsGravar.has(e.id));

console.log(`Arquivo: ${arquivo}`);
console.log(
  `Clubes: ${clubes.length} · revisados: ${porStatus('revisada').length} · aposentados: ${porStatus('aposentada').length} · rascunho (ignorados): ${porStatus('rascunho').length}`,
);
const revisados = porStatus('revisada');
console.log(`Revisados por série: ${DIVISOES.map((d) => `${d} ${revisados.filter((c) => c.divisao_2026 === d).length}`).join(' · ')}`);

if (avisos.length) {
  console.log(`\n⚠ ${avisos.length} problema(s) em rascunhos ou no conjunto (não barram o import):`);
  for (const e of avisos) console.log(`  ${e.onde} ${e.id}: ${e.erro}`);
}
if (bloqueiam.length) {
  console.error(`\n✖ ${bloqueiam.length} problema(s) em clubes que iam entrar. Nada foi gravado:`);
  for (const e of bloqueiam) console.error(`  ${e.onde} ${e.id}: ${e.erro}`);
  process.exit(1);
}

if (!paraGravar.length) {
  console.log('\nNada para importar (só entra clube "revisada").');
  process.exit(0);
}
if (seco) {
  console.log(`\n--seco: ${paraGravar.length} clube(s) prontos. Nada foi gravado.`);
  process.exit(0);
}

if (!semPerguntar) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const r = await rl.question(`\nGravar ${paraGravar.length} clube(s) no projeto ligado? Digite SIM para confirmar: `);
  rl.close();
  if (r.trim().toUpperCase() !== 'SIM') {
    console.log('Nada foi gravado.');
    process.exit(0);
  }
}

// O SQL vai por arquivo: no Windows o shell quebra argumentos com várias linhas.
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const pasta = mkdtempSync(join(tmpdir(), 'clubes-'));
try {
  const sql = join(pasta, 'importar.sql');
  writeFileSync(sql, gerarSql(paraGravar));
  console.log(
    execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'table', '-f', sql], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    }),
  );
  console.log(`Pronto: ${paraGravar.length} clube(s) gravados. Acima, os ativos por série.`);
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
