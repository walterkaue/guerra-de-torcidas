// Confere, só lendo, o que está publicado no Supabase contra a main: funções e migrações.
// Uso: npm run publicar:conferir            (compara com origin/main, depois de um git fetch)
//      npm run publicar:conferir -- --local  (compara com a pasta atual, para ver antes do merge)
// Não publica nada, não grava nada no Supabase nem no repositório.
//
// Funções: baixa cada função publicada (CLI, `functions download --use-api`, uma pasta temporária por função, com os
// arquivos de _shared que ela usa) e compara arquivo a arquivo com o código da main.
// Migrações: lista as versões aplicadas no remoto (`migration list`) e compara com supabase/migrations da main.

import { exec, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const decodificar = (p) => decodeURIComponent(p);
const raiz = decodificar(RAIZ);

const usarLocal = process.argv.includes('--local');
const REF = 'origin/main';
const REF_PROJETO_PADRAO = 'ybfeqykdnqmnufrgtnoc'; // pública (está na URL do Supabase)

const refProjeto = (() => {
  const arq = join(raiz, 'supabase', '.temp', 'project-ref');
  return existsSync(arq) ? readFileSync(arq, 'utf8').trim() : REF_PROJETO_PADRAO;
})();

const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const normalizar = (t) => t.replace(/\r\n/g, '\n');

/** Texto de um arquivo no lado "main" (ou na pasta atual, com --local). null se não existe. */
function codigoLocal(caminho) {
  if (usarLocal) {
    const arq = join(raiz, caminho);
    return existsSync(arq) ? normalizar(readFileSync(arq, 'utf8')) : null;
  }
  try {
    return normalizar(git('show', `${REF}:${caminho}`));
  } catch {
    return null;
  }
}

function listarLocal(pasta) {
  if (usarLocal) {
    const abs = join(raiz, pasta);
    return existsSync(abs) ? readdirSync(abs) : [];
  }
  return git('ls-tree', '--name-only', `${REF}:${pasta}`).split('\n').filter(Boolean);
}

/** Data (AAAA-MM-DD) do último commit da main que mexeu em algum destes caminhos. */
function ultimaData(caminhos) {
  const ref = usarLocal ? 'HEAD' : REF;
  try {
    return git('log', '-1', '--format=%cs', ref, '--', ...caminhos).trim() || 'sem data';
  } catch {
    return 'sem data';
  }
}

function binarioSupabase() {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  const local = join(raiz, 'node_modules', '.bin', `supabase${ext}`);
  return existsSync(local) ? local : `npx${ext}`;
}

async function supabase(args, cwd) {
  const bin = binarioSupabase();
  const todos = bin.includes('npx') ? ['supabase', ...args] : args;
  // Uma linha de comando só (o .cmd do Windows exige shell); os argumentos são fixos e sem espaço, nada vem de fora.
  const { stdout } = await execAsync([`"${bin}"`, ...todos].join(' '), { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/** Primeira linha que parece JSON na saída do CLI (ele escreve "Target: ..." antes). */
function lerJson(saida) {
  const linha = saida.split('\n').find((l) => l.trim().startsWith('{'));
  if (!linha) throw new Error(`resposta inesperada do CLI: ${saida.slice(0, 200)}`);
  return JSON.parse(linha);
}

function arquivosDe(pasta) {
  const achados = [];
  const andar = (dir) => {
    for (const nome of readdirSync(dir)) {
      const abs = join(dir, nome);
      if (statSync(abs).isDirectory()) andar(abs);
      else achados.push(abs);
    }
  };
  if (existsSync(pasta)) andar(pasta);
  return achados;
}

async function conferirFuncao(nome, base) {
  const tmp = mkdtempSync(join(base, `${nome}-`));
  mkdirSync(join(tmp, 'supabase'));
  copyFileSync(join(raiz, 'supabase', 'config.toml'), join(tmp, 'supabase', 'config.toml'));
  try {
    await supabase(['functions', 'download', nome, '--use-api', `--remote=${refProjeto}`], tmp);
  } catch (e) {
    return { nome, estado: 'erro', detalhe: String(e.stderr || e.message).split('\n')[0] };
  }
  const baixados = arquivosDe(join(tmp, 'supabase', 'functions'));
  if (baixados.length === 0) return { nome, estado: 'erro', detalhe: 'o CLI não baixou nenhum arquivo' };
  const diferentes = [];
  for (const abs of baixados) {
    const caminho = 'supabase/functions/' + relative(join(tmp, 'supabase', 'functions'), abs).replace(/\\/g, '/');
    const local = codigoLocal(caminho);
    if (local === null || local !== normalizar(readFileSync(abs, 'utf8'))) diferentes.push(caminho);
  }
  return diferentes.length === 0
    ? { nome, estado: 'igual' }
    : { nome, estado: 'diferente', arquivos: diferentes, data: ultimaData(diferentes.filter((c) => codigoLocal(c) !== null)) };
}

async function main() {
  if (!usarLocal) {
    try {
      git('fetch', 'origin', 'main', '--quiet');
    } catch {
      console.log('Aviso: não consegui atualizar o origin/main; comparo com a cópia que já existe aqui.\n');
    }
  }
  const lado = usarLocal ? 'a pasta atual' : 'a main (origin/main)';
  console.log(`Conferência de publicação — projeto ${refProjeto}, comparado com ${lado}. Só leitura.\n`);

  // ---- Funções ----
  const locais = listarLocal('supabase/functions').filter((n) => n !== '_shared' && codigoLocal(`supabase/functions/${n}/index.ts`) !== null);
  const publicadas = new Set(lerJson(await supabase(['functions', 'list', `--remote=${refProjeto}`], raiz)).functions.map((f) => f.slug));
  const base = mkdtempSync(join(tmpdir(), 'conferir-'));
  const resultados = [];
  try {
    const dentro = locais.filter((n) => publicadas.has(n));
    // Poucas por vez: o download é pela API e não precisa de Docker, mas não vale abrir 15 de uma vez.
    for (let i = 0; i < dentro.length; i += 4) {
      resultados.push(...(await Promise.all(dentro.slice(i, i + 4).map((n) => conferirFuncao(n, base)))));
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
  console.log('FUNÇÕES');
  for (const nome of locais) {
    if (!publicadas.has(nome)) {
      console.log(`  não publicada  ${nome}  (último commit: ${ultimaData([`supabase/functions/${nome}`])})`);
      continue;
    }
    const r = resultados.find((x) => x.nome === nome);
    if (r.estado === 'igual') console.log(`  igual          ${nome}`);
    else if (r.estado === 'erro') console.log(`  erro           ${nome}  (${r.detalhe})`);
    else console.log(`  DIFERENTE      ${nome}  (último commit que mexeu: ${r.data}; ${r.arquivos.length} arquivo(s): ${r.arquivos.map((a) => a.replace('supabase/functions/', '')).join(', ')})`);
  }
  for (const nome of [...publicadas].filter((n) => !locais.includes(n))) console.log(`  só no remoto   ${nome}  (não existe na main)`);

  // ---- Migrações ----
  const remotas = new Set(
    lerJson(await supabase(['migration', 'list', `--remote=${refProjeto}`], raiz)).migrations.map((m) => m.remote).filter(Boolean),
  );
  const arquivos = listarLocal('supabase/migrations').filter((n) => n.endsWith('.sql')).sort();
  const versoes = new Map(arquivos.map((a) => [a.split('_')[0], a]));
  const faltam = arquivos.filter((a) => !remotas.has(a.split('_')[0]));
  const sobram = [...remotas].filter((v) => !versoes.has(v));
  console.log('\nMIGRAÇÕES');
  console.log(`  ${arquivos.length - faltam.length} de ${arquivos.length} aplicadas no remoto.`);
  for (const a of faltam) console.log(`  não aplicada   ${a}  (último commit: ${ultimaData([`supabase/migrations/${a}`])})`);
  for (const v of sobram) console.log(`  só no remoto   ${v}  (não existe na main)`);

  const pendentes = resultados.filter((r) => r.estado !== 'igual').length + locais.filter((n) => !publicadas.has(n)).length + faltam.length + sobram.length;
  console.log(pendentes === 0 ? '\nTudo igual: o que está no ar é o que está na main.' : `\n${pendentes} ponto(s) a olhar. Nada foi publicado.`);
}

main().catch((e) => {
  console.error('Falhou:', e.message);
  process.exit(1);
});
