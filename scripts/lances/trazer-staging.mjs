// Traz os lances novos de staging_gt.lances (feitos com o Gemini na web) para dados/lances/lote-NN.csv,
// sem confiar no que veio: pênalti e lance sem fonte de verdade ficam de fora, a faixa é recalculada
// pelo robô de calibragem, o validador do catálogo confere o formato e o Gemini confere os fatos pelo
// trecho literal (ano, adversário e quem fez o lance têm de estar nos trechos das fontes).
// Tudo entra como `rascunho`: o título e a ficha vão para dados/lances/revisao-lote-NN.md, e só depois
// da aprovação de uma pessoa o lance vira `revisada` (e aí entra no catálogo do jogo).
//
// Uso (precisa do projeto ligado e de GEMINI_API_KEY no ambiente):
//   node scripts/lances/trazer-staging.mjs --seco     mostra o resumo, sem gravar
//   node scripts/lances/trazer-staging.mjs            grava o lote e o documento de revisão

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calibrar } from '../../src/jogo/lances.ts';
import { MODELOS, baixar, dominioAceito, dominioDe, esperar, normalizar, numerosDe, perguntarGemini, trechoNaPagina } from '../casa/conferir-gemini.mjs';
import { COLUNAS, cenaDoLance, lerLances, validarLance } from './validar.mjs';

const PASTA = fileURLToPath(new URL('../../dados/lances/', import.meta.url));

// ---------------------------------------------------------------------------
// Partes puras (testadas em trazer-staging.test.ts)
// ---------------------------------------------------------------------------

/** Linha do banco → linha do CSV (texto em todos os campos, espaço comum, sem caractere estranho). */
export function linhaDoStaging(r) {
  const texto = (v) => (v === null || v === undefined ? '' : String(v)).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const numero = (v) => (v === null || v === undefined || v === '' ? '' : String(Number(v)));
  const l = Object.fromEntries(COLUNAS.map((c) => [c, texto(r[c])]));
  for (const c of ['bola_x', 'bola_z', 'barreira', 'barreira_mira_x', 'goleiro_saida']) l[c] = numero(r[c]);
  l.data = texto(r.data).slice(0, 10);
  return l;
}

/** Motivo para deixar o lance de fora antes de qualquer conferência (ou null). */
export function motivoDeFora(l) {
  const t = normalizar(`${l.titulo} ${l.ficha}`);
  if (/\bpe[nv]alti/.test(t)) return 'é pênalti (os Lances só têm falta e cara a cara)';
  if (/[÷×¤§¶]|�/.test(`${l.titulo} ${l.ficha}`)) return 'texto com caractere quebrado';
  if (!fontesDeVerdade(l).length) return 'nenhuma fonte de verdade (só página inicial ou domínio fora da lista)';
  return null;
}

/** Fontes que podem provar o lance: domínio aceito, não Wikipédia e não a página inicial do site. */
export function fontesDeVerdade(l) {
  return [l.fonte, l.fonte2].filter((u) => {
    const d = dominioDe(u);
    if (!d || !dominioAceito(d)) return false;
    try {
      return new URL(u).pathname.replace(/\/+$/, '').split('/').filter(Boolean).length >= 1 && !/^\/[a-z-]+$/.test(new URL(u).pathname.replace(/\/+$/, ''));
    } catch {
      return false;
    }
  });
}

const temPalavra = (texto, termo) => ` ${normalizar(texto)} `.includes(` ${normalizar(termo)} `);

/** Os trechos (somados) trazem o ano, o adversário e quem fez o lance? Devolve o que falta, ou null. */
export function faltaNosTrechos(l, trechos) {
  const junto = trechos.join(' ');
  const ano = Number(l.data.slice(0, 4));
  if (!numerosDe(junto).includes(ano)) return `o ano ${ano}`;
  const adversario = normalizar(l.adversario).split(' ').filter((p) => p.length > 2);
  if (adversario.length && !adversario.some((p) => temPalavra(junto, p))) return `o adversário (${l.adversario})`;
  const autor = l.pessoas.split(';').map((p) => p.trim()).filter(Boolean).pop();
  if (autor) {
    const sobrenome = normalizar(autor).split(' ').filter((p) => p.length > 2).pop();
    if (sobrenome && !temPalavra(junto, sobrenome)) return `quem fez o lance (${autor})`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rede e disco
// ---------------------------------------------------------------------------

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function consultar(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'lances-'));
  try {
    const arq = join(dir, 'q.sql');
    writeFileSync(arq, sql);
    const saida = execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', arq], { encoding: 'utf8', shell: process.platform === 'win32' });
    const inicio = Math.min(...['[', '{'].map((c) => saida.indexOf(c)).filter((i) => i >= 0));
    const d = JSON.parse(saida.slice(inicio));
    return Array.isArray(d) ? d : (d.rows ?? []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function conferirFatos(l) {
  const trechos = [];
  const dominios = [];
  let ultimo = 'nenhuma fonte abriu';
  for (const url of fontesDeVerdade(l)) {
    const p = await baixar(url);
    if (p.erro) {
      ultimo = `${dominioDe(url)}: ${p.erro}`;
      continue;
    }
    await esperar(4_500);
    let resp;
    try {
      resp = await perguntarGemini(MODELOS, [{ id: 'L1', fato: l.ficha }], p.texto.slice(0, 80_000));
    } catch (e) {
      ultimo = e.message;
      continue;
    }
    const r = resp.respostas.find((x) => x.id === 'L1');
    const trecho = (r?.trecho ?? '').trim();
    if (r?.confirma && trechoNaPagina(trecho, p.texto)) {
      trechos.push(trecho);
      dominios.push(dominioDe(url));
      if (!faltaNosTrechos(l, trechos)) return { ok: true, trechos, dominios };
    }
    ultimo = trechos.length ? `falta ${faltaNosTrechos(l, trechos)} nos trechos` : `${dominioDe(url)}: a página não prova a ficha`;
  }
  return { ok: false, motivo: ultimo, trechos, dominios };
}

const citar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function principal() {
  const seco = process.argv.includes('--seco');
  if (!process.env.GEMINI_API_KEY) throw new Error('Falta a variável de ambiente GEMINI_API_KEY.');
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const arquivos = readdirSync(PASTA).filter((n) => /^lote-\d+\.csv$/.test(n)).sort();
  const existentes = arquivos.flatMap((n) => lerLances(readFileSync(join(PASTA, n), 'utf8')));
  const ids = new Set(existentes.map((l) => l.id));
  const titulos = new Set(existentes.map((l) => normalizar(l.titulo)));

  const staging = consultar('select * from staging_gt.lances order by clube, id;').map(linhaDoStaging);
  const novos = staging.filter((l) => !ids.has(l.id) && !titulos.has(normalizar(l.titulo)));
  const fora = [];
  const entram = [];
  for (const l of novos) {
    const motivo = motivoDeFora(l);
    if (motivo) {
      fora.push({ l, motivo });
      continue;
    }
    try {
      l.faixa = calibrar(cenaDoLance(l)).faixa;
    } catch {
      fora.push({ l, motivo: 'cena inválida para o motor' });
      continue;
    }
    l.status = 'rascunho';
    l.verificada_em = '';
    const erros = validarLance(l);
    if (erros.length) {
      fora.push({ l, motivo: `validador: ${erros.join('; ')}` });
      continue;
    }
    entram.push(l);
  }
  console.log(`${novos.length} novos no staging: ${entram.length} passam no formato, ${fora.length} ficam de fora. Conferindo os fatos…`);

  const conferidos = [];
  for (const [i, l] of entram.entries()) {
    const r = await conferirFatos(l);
    const data = hoje.split('-').reverse().join('/');
    if (r.ok) {
      l.observacao = `${l.observacao} Fatos conferidos em ${data} por script (trecho literal): ${r.trechos.map((t, k) => `"${t.slice(0, 180).replace(/"/g, "'")}" (${r.dominios[k]})`).join('; ')}.`.trim();
      conferidos.push(l);
    } else fora.push({ l, motivo: `fatos não conferidos: ${r.motivo}` });
    process.stdout.write(`\r  ${i + 1}/${entram.length}`);
  }
  console.log(`\n${conferidos.length} com os fatos conferidos.`);

  const num = String(Number(arquivos.at(-1)?.match(/\d+/)?.[0] ?? 0) + 1).padStart(2, '0');
  const csv = [COLUNAS.map(citar).join(','), ...conferidos.map((l) => COLUNAS.map((c) => citar(l[c])).join(','))].join('\n') + '\n';
  const md = [
    `# Lances do lote ${num}: revisão dos textos`,
    '',
    `Gerado em ${hoje.split('-').reverse().join('/')} por \`scripts/lances/trazer-staging.mjs\` a partir dos lances feitos com o Gemini (staging_gt.lances).`,
    'Os fatos (ano, adversário, quem fez) foram conferidos pelo trecho literal das fontes; a faixa foi recalculada pelo robô. Posição da bola, barreira e canto continuam ESTIMADOS.',
    'Responda lance a lance: "aprovo" ou o que mudar no título e na ficha (título sem nome de pessoa). Só depois o lance vira `revisada` e entra no jogo.',
    '',
    `## Para revisar (${conferidos.length})`,
    '',
    ...conferidos.flatMap((l) => [`### ${l.id}`, `- **Título:** ${l.titulo}`, `- **Ficha:** ${l.ficha}`, `- **Tipo:** ${l.tipo === 'falta' ? 'falta' : 'cara a cara'} · faixa ${l.faixa}`, '']),
    `## Ficaram de fora (${fora.length})`,
    '',
    '| Lance | Motivo |',
    '|---|---|',
    ...fora.map(({ l, motivo }) => `| ${l.id} | ${motivo.replace(/\|/g, '/')} |`),
    '',
  ].join('\n');

  if (seco) {
    console.log(md.slice(0, 4000));
    return;
  }
  writeFileSync(join(PASTA, `lote-${num}.csv`), csv);
  writeFileSync(join(PASTA, `revisao-lote-${num}.md`), md);
  console.log(`Gravados dados/lances/lote-${num}.csv (${conferidos.length} lances, rascunho) e dados/lances/revisao-lote-${num}.md.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
