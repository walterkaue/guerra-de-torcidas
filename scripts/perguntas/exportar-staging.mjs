// Leva as perguntas `pre_aprovada` do pipeline com Gemini (staging_gt.rascunhos_perguntas) para um CSV
// novo em dados/perguntas/, com status `rascunho`, o trecho da fonte e a auditoria na observação.
// Depois disso, alguém revisa por amostra, marca `revisada` e roda `npm run importar-perguntas`.
// Uso:
//   npm run exportar-perguntas -- --seco      mostra o que sairia, sem gravar nada
//   npm run exportar-perguntas                grava o CSV e marca as linhas como `exportada` no staging
// Precisa do projeto ligado (`supabase link`), como o importar-perguntas.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avaliarPergunta } from './geracao.mjs';
import { COLUNAS, lerPerguntas } from './validar.mjs';

const PASTA = fileURLToPath(new URL('../../dados/perguntas/', import.meta.url));
const LETRA = { facil: 'f', media: 'm', dificil: 'd', craque: 'c' };

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function consultar(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'exportar-'));
  try {
    const arq = join(dir, 'q.sql');
    writeFileSync(arq, sql);
    const saida = execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', arq], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    const inicio = Math.min(...['[', '{'].map((c) => saida.indexOf(c)).filter((i) => i >= 0));
    const d = JSON.parse(saida.slice(inicio));
    return Array.isArray(d) ? d : d.rows ?? [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Próximo número de id por clube e degrau (clube-f-NN), olhando todos os CSVs. */
export function proximosIds(existentes) {
  const max = new Map();
  for (const id of existentes) {
    const m = /^(.+)-([fmdc])-(\d+)$/.exec(id);
    if (m) max.set(`${m[1]}-${m[2]}`, Math.max(max.get(`${m[1]}-${m[2]}`) ?? 0, Number(m[3])));
  }
  return (clube, degrau) => {
    const k = `${clube}-${LETRA[degrau]}`;
    const n = (max.get(k) ?? 0) + 1;
    max.set(k, n);
    return `${k}-${String(n).padStart(2, '0')}`;
  };
}

const citar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Linhas do staging → texto do CSV no formato de dados/perguntas/. */
export function montarCsv(linhas, novoId, hoje) {
  const corpo = linhas.map((r) => {
    const obs = `Gerada pelo pipeline com Gemini (${r.modelo}) e auditada por ${r.auditoria_modelo} sem saber a resposta. Trecho: "${r.trecho.replace(/"/g, "'")}".`;
    const p = {
      id: novoId(r.clube, r.degrau), clube: r.clube, degrau: r.degrau, tema: r.tema, pergunta: r.pergunta, certa: r.certa,
      errada1: r.errada1, errada2: r.errada2, errada3: r.errada3, fonte: r.fonte, fonte2: '', verificada_em: hoje,
      status: 'rascunho', observacao: obs,
    };
    return COLUNAS.map((c) => citar(p[c])).join(',');
  });
  return [COLUNAS.join(','), ...corpo].join('\n') + '\n';
}

function principal() {
  const seco = process.argv.includes('--seco');
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const linhas = consultar(
    `select id, clube, degrau, tema, pergunta, certa, errada1, errada2, errada3, fonte, trecho, modelo, auditoria_modelo
     from staging_gt.rascunhos_perguntas where status = 'pre_aprovada' order by clube, criada_em;`,
  );
  if (!linhas.length) {
    console.log('Nenhuma pergunta pre_aprovada no staging.');
    return;
  }
  // As travas de novo (podem ter ficado mais rígidas depois da auditoria): o trecho faz as vezes da página.
  const barradas = [];
  const boas = linhas.filter((l) => {
    const motivo = avaliarPergunta(l, { clube: l.clube, fonte: l.fonte, pagina: l.trecho });
    if (motivo) barradas.push({ id: Number(l.id), motivo, pergunta: l.pergunta });
    return !motivo;
  });
  for (const b of barradas) console.log(`  barrada: ${b.pergunta} — ${b.motivo}`);
  if (!seco && barradas.length) {
    const casos = barradas.map((b) => `when ${b.id} then '${b.motivo.replace(/'/g, "''")}'`).join(' ');
    consultar(`update staging_gt.rascunhos_perguntas set status = 'reprovada', motivo = case id ${casos} end where id in (${barradas.map((b) => b.id).join(',')}); select 1;`);
  }
  if (!boas.length) {
    console.log('Nada para exportar depois das travas.');
    return;
  }
  const arquivos = readdirSync(PASTA).filter((n) => /^lote-\d+\.csv$/.test(n)).sort();
  const ids = arquivos.flatMap((n) => lerPerguntas(readFileSync(join(PASTA, n), 'utf8')).map((p) => p.id));
  const proximo = String(Number(arquivos.at(-1)?.match(/\d+/)?.[0] ?? 0) + 1).padStart(2, '0');
  const nome = `lote-${proximo}.csv`;
  const csv = montarCsv(boas, proximosIds(ids), hoje);
  console.log(`${boas.length} pergunta(s) pre_aprovada → dados/perguntas/${nome}`);
  if (seco) {
    console.log(csv);
    return;
  }
  writeFileSync(join(PASTA, nome), csv);
  consultar(`update staging_gt.rascunhos_perguntas set status = 'exportada' where id in (${boas.map((l) => Number(l.id)).join(',')}); select 1;`);
  console.log(`Gravado. Agora: revise por amostra, marque revisada e rode npm run importar-perguntas -- --seco dados/perguntas/${nome}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) principal();
