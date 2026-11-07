// Sobe o Vite de desenvolvimento só para o simulador, com o Supabase trocado por um projeto que não existe.
// O .env.development aponta para a produção; variável de ambiente que já existe quando o Vite roda vence o
// arquivo .env, então VITE_SUPABASE_URL e a chave daqui é que vão para o navegador. Antes de liberar a rodada,
// conferimos no módulo servido pelo Vite que o endereço de produção não aparece.

import { spawn } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SUPABASE_FALSO = 'https://simulador-sem-banco.supabase.co';
export const CHAVE_FALSA = 'sb_publishable_simulador_sem_banco';

/** Hosts do Supabase de verdade que aparecem nos .env do projeto (nunca impressos). */
function hostsDeVerdade(raiz) {
  const hosts = new Set();
  for (const nome of ['.env.development', '.env.production', '.env.local', '.env.development.local']) {
    const caminho = join(raiz, nome);
    if (!existsSync(caminho)) continue;
    const m = readFileSync(caminho, 'utf8').match(/^VITE_SUPABASE_URL\s*=\s*(\S+)/m);
    if (m) {
      try {
        hosts.add(new URL(m[1].replace(/^["']|["']$/g, '')).hostname);
      } catch {
        /* vazio */
      }
    }
  }
  return [...hosts];
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

export async function subirVite({ raiz, porta }) {
  const origem = `http://127.0.0.1:${porta}`;
  const vite = join(raiz, 'node_modules', 'vite', 'bin', 'vite.js');
  const filho = spawn(process.execPath, [vite, '--port', String(porta), '--strictPort', '--host', '127.0.0.1'], {
    cwd: raiz,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: SUPABASE_FALSO,
      VITE_SUPABASE_PUBLISHABLE_KEY: CHAVE_FALSA,
      BROWSER: 'none',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let saida = '';
  filho.stdout.on('data', (d) => (saida += d));
  filho.stderr.on('data', (d) => (saida += d));
  const parar = () => {
    if (filho.exitCode === null) filho.kill();
  };

  for (let i = 0; i < 120; i++) {
    if (filho.exitCode !== null) throw new Error(`o Vite saiu antes de subir:\n${saida.slice(-2000)}`);
    try {
      const r = await fetch(origem + '/');
      if (r.ok) break;
    } catch {
      /* ainda subindo */
    }
    await esperar(500);
    if (i === 119) {
      parar();
      throw new Error('o Vite não respondeu em 60 s');
    }
  }

  // Prova de que o navegador vai receber o Supabase falso.
  const modulo = await (await fetch(origem + '/src/servidor/api.ts')).text();
  const vazou = hostsDeVerdade(raiz).filter((h) => h !== new URL(SUPABASE_FALSO).hostname && modulo.includes(h));
  if (vazou.length || !modulo.includes(SUPABASE_FALSO)) {
    parar();
    throw new Error('o Vite ainda serve o Supabase de verdade; rodada cancelada (nenhuma página foi aberta)');
  }
  return { origem, parar, saida: () => saida };
}

// ---- Pacote (padrão) ------------------------------------------------------------------------------------
// O Vite de desenvolvimento manda centenas de módulos soltos: com a rede do Zé (400 ms por pedido) a primeira
// tela leva minutos, e isso não é o que o celular baixa. O pacote é o build de verdade (chunks, minificado),
// feito em modo development para os dados falsos de src/dev continuarem lá (import.meta.env.DEV = true).
// Fica em prints/simulacoes/.pacote (fora do Git) e é refeito quando algum arquivo de src/ ou public/ muda.

function maisNovo(dir) {
  let t = 0;
  for (const f of readdirSync(dir)) {
    const c = join(dir, f);
    const st = statSync(c);
    t = Math.max(t, st.isDirectory() ? maisNovo(c) : st.mtimeMs);
  }
  return t;
}

function rodar(raiz, args, env) {
  return new Promise((ok, falha) => {
    const p = spawn(process.execPath, [join(raiz, 'node_modules', 'vite', 'bin', 'vite.js'), ...args], { cwd: raiz, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    p.stdout.on('data', (d) => (saida += d));
    p.stderr.on('data', (d) => (saida += d));
    p.on('exit', (c) => (c === 0 ? ok(saida) : falha(new Error(`vite ${args[0]} saiu com ${c}:\n${saida.slice(-2000)}`))));
  });
}

function conferirPacote(raiz, pasta) {
  const falso = new URL(SUPABASE_FALSO).hostname;
  const verdade = hostsDeVerdade(raiz).filter((h) => h !== falso);
  let achouFalso = false;
  const varrer = (dir) => {
    for (const f of readdirSync(dir)) {
      const c = join(dir, f);
      if (statSync(c).isDirectory()) varrer(c);
      else if (/\.(js|html|json|webmanifest)$/.test(f)) {
        const t = readFileSync(c, 'utf8');
        if (verdade.some((h) => t.includes(h))) throw new Error(`o pacote tem o Supabase de verdade (${f}); rodada cancelada`);
        // Qualquer outro projeto Supabase no pacote também cancela (mesmo que os .env mudem de nome).
        const outros = [...t.matchAll(/[a-z0-9-]+\.supabase\.(co|in|net)/g)].map((m) => m[0]).filter((h) => h !== falso);
        if (outros.length) throw new Error(`o pacote tem outro projeto Supabase (${f}); rodada cancelada`);
        if (t.includes(SUPABASE_FALSO)) achouFalso = true;
      }
    }
  };
  varrer(pasta);
  if (!achouFalso) throw new Error('o pacote não tem o Supabase falso; rodada cancelada');
}

export async function subirPacote({ raiz, porta, refazer = false, log = console.log }) {
  const pasta = join(raiz, 'prints', 'simulacoes', '.pacote');
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    VITE_SUPABASE_URL: SUPABASE_FALSO,
    VITE_SUPABASE_PUBLISHABLE_KEY: CHAVE_FALSA,
  };
  const carimbo = join(pasta, '.feito');
  const fontes = Math.max(maisNovo(join(raiz, 'src')), maisNovo(join(raiz, 'public')), statSync(join(raiz, 'index.html')).mtimeMs);
  if (refazer || !existsSync(carimbo) || statSync(carimbo).mtimeMs < fontes) {
    log('Montando o pacote do simulador (build em modo development, Supabase falso)…');
    await rodar(raiz, ['build', '--mode', 'development', '--outDir', pasta, '--emptyOutDir', '--logLevel', 'warn'], env);
    writeFileSync(carimbo, new Date().toISOString());
  }
  conferirPacote(raiz, pasta);

  const origem = `http://127.0.0.1:${porta}`;
  const filho = spawn(
    process.execPath,
    [join(raiz, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--outDir', pasta, '--port', String(porta), '--strictPort', '--host', '127.0.0.1'],
    { cwd: raiz, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let saida = '';
  filho.stdout.on('data', (d) => (saida += d));
  filho.stderr.on('data', (d) => (saida += d));
  const parar = () => {
    if (filho.exitCode === null) filho.kill();
  };
  for (let i = 0; ; i++) {
    if (filho.exitCode !== null) throw new Error(`o preview saiu antes de subir:\n${saida.slice(-2000)}`);
    try {
      if ((await fetch(origem + '/')).ok) break;
    } catch {
      /* subindo */
    }
    if (i > 120) {
      parar();
      throw new Error('o preview não respondeu em 60 s');
    }
    await esperar(500);
  }
  // O que responde na porta é mesmo o nosso pacote? (outro servidor já na porta faria o preview falhar e o
  // fetch acima responder do servidor de fora). Confere o processo e um .js servido.
  await esperar(300);
  if (filho.exitCode !== null) throw new Error(`o preview saiu (porta ${porta} ocupada?):
${saida.slice(-1000)}`);
  const html = await (await fetch(origem + '/')).text();
  const js = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const corpo = js ? await (await fetch(origem + js[1])).text() : '';
  const servidoTemFalso = corpo.includes(SUPABASE_FALSO) || (await servidoTem(origem, html, SUPABASE_FALSO));
  if (!servidoTemFalso) {
    parar();
    throw new Error(`a porta ${porta} não está servindo o pacote do simulador; rodada cancelada`);
  }
  return { origem, parar, saida: () => saida };
}

/** Procura o texto nos .js que o index.html servido carrega (modulepreload e script). */
async function servidoTem(origem, html, texto) {
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) {
    const t = await (await fetch(origem + m[1])).text().catch(() => '');
    if (t.includes(texto)) return true;
  }
  return false;
}
