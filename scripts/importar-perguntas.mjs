// Importa perguntas da Prova de Boleiro dos CSVs em dados/perguntas/ para o projeto ligado (supabase link).
// Só entra pergunta com status "revisada" e fonte aceita (docs/jogo.md, seção 7.1); ela vira "ativa".
// "aposentada" tira a pergunta do sorteio. "rascunho" é ignorada (falta a conferência das fontes).
// Uso:
//   npm run importar-perguntas                       todos os CSVs de dados/perguntas/
//   npm run importar-perguntas -- dados/perguntas/lote-02.csv
//   npm run importar-perguntas -- --seco             só valida e mostra o resumo, sem tocar no banco
//   npm run importar-perguntas -- --sim              não pergunta antes de gravar

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { CLUBES, DEGRAUS, gerarSql, lerPerguntas, validarConjunto } from './perguntas/validar.mjs';

const args = process.argv.slice(2);
const seco = args.includes('--seco');
const semPerguntar = args.includes('--sim');
const PASTA = 'dados/perguntas';
const arquivos = args.filter((a) => !a.startsWith('--'));
const lista = arquivos.length
  ? arquivos
  : readdirSync(PASTA)
      .filter((n) => n.endsWith('.csv'))
      .sort()
      .map((n) => join(PASTA, n));
if (!lista.length) {
  console.log(`Nenhum CSV em ${PASTA}.`);
  process.exit(0);
}

const todas = [];
for (const arquivo of lista) {
  try {
    const lote = basename(arquivo, '.csv');
    for (const p of lerPerguntas(readFileSync(arquivo, 'utf8'))) todas.push({ ...p, _arquivo: arquivo, _lote: lote });
  } catch (e) {
    console.error(`✖ ${arquivo}: ${e.message}`);
    process.exit(1);
  }
}

const porStatus = (s) => todas.filter((p) => p.status === s);
const paraGravar = todas.filter((p) => p.status === 'revisada' || p.status === 'aposentada');
const erros = validarConjunto(todas);
// Erro em rascunho só avisa (a revisão ainda vai mexer); erro no que vai entrar barra o import.
const idsGravar = new Set(paraGravar.map((p) => p.id));
const bloqueiam = erros.filter((e) => idsGravar.has(e.id));
const avisos = erros.filter((e) => !idsGravar.has(e.id));

console.log(`Arquivos: ${lista.join(', ')}`);
console.log(
  `Perguntas: ${todas.length} · revisadas: ${porStatus('revisada').length} · aposentadas: ${porStatus('aposentada').length} · rascunho (ignoradas): ${porStatus('rascunho').length}`,
);

// Cobertura das revisadas (mesma cota para os 20 clubes).
const revisadas = porStatus('revisada');
if (revisadas.length) {
  console.log('\nRevisadas por clube (fácil/média/difícil/craque):');
  for (const c of [...CLUBES, 'geral']) {
    const doClube = revisadas.filter((p) => p.clube === c);
    if (!doClube.length) continue;
    const n = Object.keys(DEGRAUS).map((d) => doClube.filter((p) => p.degrau === d).length);
    console.log(`  ${c.padEnd(14)} ${n.join('/')}  (${doClube.length})`);
  }
  const semNenhuma = CLUBES.filter((c) => !revisadas.some((p) => p.clube === c));
  if (semNenhuma.length) console.log(`  sem nenhuma revisada: ${semNenhuma.join(', ')}`);
}

if (avisos.length) {
  console.log(`\n⚠ ${avisos.length} problema(s) em rascunhos (não barram o import):`);
  for (const e of avisos.slice(0, 40)) console.log(`  ${e.onde} ${e.id}: ${e.erro}`);
  if (avisos.length > 40) console.log(`  … e mais ${avisos.length - 40}`);
}
if (bloqueiam.length) {
  console.error(`\n✖ ${bloqueiam.length} problema(s) em perguntas que iam entrar. Nada foi gravado:`);
  for (const e of bloqueiam) console.error(`  ${e.onde} ${e.id}: ${e.erro}`);
  process.exit(1);
}

if (!paraGravar.length) {
  console.log('\nNada para importar (só entra pergunta "revisada").');
  process.exit(0);
}
if (seco) {
  console.log(`\n--seco: ${paraGravar.length} pergunta(s) prontas. Nada foi gravado.`);
  process.exit(0);
}

if (!semPerguntar) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const r = await rl.question(`\nGravar ${paraGravar.length} pergunta(s) no projeto ligado? Digite SIM para confirmar: `);
  rl.close();
  if (r.trim().toUpperCase() !== 'SIM') {
    console.log('Nada foi gravado.');
    process.exit(0);
  }
}

// O SQL vai por arquivo: no Windows o shell quebra argumentos com várias linhas.
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const pasta = mkdtempSync(join(tmpdir(), 'perguntas-'));
try {
  const sql = join(pasta, 'importar.sql');
  writeFileSync(sql, gerarSql(paraGravar));
  console.log(
    execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'table', '-f', sql], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    }),
  );
  console.log(`Pronto: ${paraGravar.length} pergunta(s) gravadas. Acima, as ativas por clube e degrau.`);
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
