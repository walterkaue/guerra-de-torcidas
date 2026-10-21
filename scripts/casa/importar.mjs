// Gera src/dados/casa/dados.gerado.ts a partir de dados/casa/*.csv: só entra linha "revisada" ou "ativa".
// Uso: npm run importar-casa   (rode sempre que mudar um CSV; o teste avisa se esquecer)
//      npm run importar-casa -- --seco   só valida e mostra o resumo

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerCsv } from '../perguntas/validar.mjs';
import { ARQUIVOS, lerTabela } from './tabela.mjs';
import { PUBLICADOS, idsDeTimes, validarCasa } from './validar.mjs';

const RAIZ = new URL('../../', import.meta.url);
const PASTA = new URL('dados/casa/', RAIZ);
const DESTINO = new URL('src/dados/casa/dados.gerado.ts', RAIZ);

/** Lê os seis CSVs, os ids de times, as competições e o clubes-do-dia. */
export function lerEntradas() {
  const tabelas = Object.fromEntries(ARQUIVOS.map((a) => [a, lerTabela(readFileSync(new URL(`${a}.csv`, PASTA), 'utf8'))]));
  const times = idsDeTimes(readFileSync(new URL('src/dados/times.ts', RAIZ), 'utf8'));
  const comp = readFileSync(new URL('src/dados/competicoes.ts', RAIZ), 'utf8');
  const idsCompeticao = [...comp.matchAll(/\{\s*id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
  const [cab, ...resto] = lerCsv(readFileSync(new URL('dados/clubes-do-dia.csv', RAIZ), 'utf8'));
  const clubesDoDia = Object.fromEntries(resto.map((v) => { const o = Object.fromEntries(cab.map((c, i) => [c, v[i] ?? ''])); return [o.id, o]; }));
  return { tabelas, ctx: { times, idsCompeticao, clubesDoDia } };
}

const num = (v) => (v === '' ? null : Number(v));
const publicada = (l) => PUBLICADOS.includes(l.status);

/** Estrutura da Casa de cada clube com clube "revisada"/"ativa"; só linhas publicadas entram. */
export function montarCasas(tabelas) {
  const casas = {};
  for (const c of tabelas.clubes.linhas.filter(publicada)) {
    const meus = (arq) => tabelas[arq].linhas.filter((l) => l.clube === c.id && publicada(l));
    const est = meus('estadios')[0];
    const rec = (lista) =>
      meus('recordes')
        .filter((l) => l.lista === lista)
        .sort((a, b) => Number(a.posicao) - Number(b.posicao) || a.nome.localeCompare(b.nome))
        .map((l) => ({ posicao: Number(l.posicao), nome: l.nome, valor: Number(l.valor), dataReferencia: l.data_referencia, fonte: l.fonte }));
    const titulos = meus('titulos')
      .map((l) => ({ competicao: l.competicao, ano: Number(l.ano), oficial: l.oficial === 'sim', nota: l.nota, fonte: l.fonte }))
      .sort((a, b) => a.competicao.localeCompare(b.competicao) || a.ano - b.ano || a.nota.localeCompare(b.nota));
    const goleadas = meus('goleadas').map((l) => ({ placar: l.placar, adversario: l.adversario, data: l.data, competicao: l.competicao, fonte: l.fonte }));
    const mantos = meus('mantos')
      .sort((a, b) => Number(a.ordem) - Number(b.ordem))
      .map((l) => ({ ordem: Number(l.ordem), periodo: l.periodo, padrao: l.padrao, cores: l.cores.split('|'), listras: num(l.listras), descricao: l.descricao, fonte: l.fonte }));
    const estadio = est
      ? {
          nome: est.nome,
          nomePopular: est.nome_popular,
          inauguracao: est.inauguracao,
          capacidade: num(est.capacidade),
          formato: est.formato,
          gramado: est.gramado,
          recorde: est.recorde_publico ? { publico: Number(est.recorde_publico), tipo: est.recorde_tipo, partida: est.recorde_partida, data: est.recorde_data } : null,
          fonte: est.fonte,
          fonteCapacidade: est.fonte_capacidade,
          fonteRecorde: est.fonte_recorde,
        }
      : null;
    const todas = [c, ...(est ? [est] : []), ...meus('titulos'), ...meus('recordes'), ...meus('goleadas'), ...meus('mantos')];
    const fontes = [...new Set(todas.flatMap((l) => [l.fonte, l.fonte2, l.fonte_capacidade, l.fonte_recorde]).filter(Boolean))];
    casas[c.id] = {
      id: c.id,
      fundacao: c.fundacao,
      cidade: c.cidade,
      uf: c.uf,
      apelidos: c.apelidos.split('|').filter(Boolean),
      historiaCores: c.historia_cores,
      estadio,
      titulos,
      recordes: { gols: rec('gols'), jogos: rec('jogos') },
      goleadas,
      mantos,
      fontes,
      dadosAte: todas.map((l) => l.verificada_em).sort().at(-1),
    };
  }
  return casas;
}

/** Texto do módulo gerado (uma linha por clube, para o diff do git ficar legível). */
export function gerarModulo(tabelas) {
  const casas = montarCasas(tabelas);
  const ids = Object.keys(casas).sort();
  return [
    '// GERADO por scripts/casa/importar.mjs a partir de dados/casa/*.csv. Não edite aqui: mude o CSV e rode `npm run importar-casa`.',
    "import type { CasaDoClube } from './tipos';",
    '',
    'export const CASAS: Readonly<Record<string, CasaDoClube>> = {',
    ...ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(casas[id])},`),
    '};',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { tabelas, ctx } = lerEntradas();
  const { erros, avisos } = validarCasa(tabelas, ctx);
  for (const a of avisos) console.log(`aviso: ${a}`);
  if (erros.length) {
    console.error(`✖ ${erros.length} erro(s):\n  ${erros.join('\n  ')}`);
    process.exit(1);
  }
  const casas = montarCasas(tabelas);
  const por = (arq) => tabelas[arq].linhas.filter(publicada).length;
  console.log(`Clubes publicados: ${Object.keys(casas).length}/${ctx.times.length}. Linhas publicadas: ${ARQUIVOS.map((a) => `${a} ${por(a)}/${tabelas[a].linhas.length}`).join(', ')}.`);
  if (process.argv.includes('--seco')) process.exit(0);
  writeFileSync(DESTINO, gerarModulo(tabelas));
  console.log('src/dados/casa/dados.gerado.ts atualizado.');
}
