// Balanço entre minigames (docs/jogo.md, seção 11). Só leitura: um SELECT no projeto ligado.
// Uso: npm run balanco (também sai no fim do npm run metricas).
// Grava uma cópia em relatorios/balanco-AAAA-MM-DD.csv (fora do Git) para os números sobreviverem
// ao zerar da pré-temporada.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAIXA,
  MIN_AMOSTRA,
  UNIDADES,
  cravaPorRodada,
  distribuicao,
  paraCsv,
  pesoNaSemana,
  resumir,
  tabelaTexto,
} from './estatisticas.mjs';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const NOMES = { penaltis: 'Pênaltis', prova: 'Prova de Boleiro', dia: 'Time do Dia', crava: 'Crava' };

// Tudo numa consulta só (cada chamada ao CLI leva uns segundos). Sem partida sob suspeita.
const SQL = `
select json_build_object(
  'partidas', (
    select coalesce(json_agg(json_build_object(
      'minigame', p.minigame, 'pessoa', p.torcedor_id, 'pontos', p.pontos,
      'fim', case when p.minigame = 'prova' then p.resultado ->> 'fim' end,
      'chegou', case when p.minigame = 'prova' then jsonb_array_length(coalesce(p.resultado -> 'passos', '[]')) end
    )), '[]')
    from public.partidas p where p.fechada_em is not null and not p.sob_suspeita),
  'dias', (
    select coalesce(json_agg(json_build_object(
      'pessoa', d.torcedor_id, 'pontos', d.pontos, 'acertou', d.acertou, 'tentativas', cardinality(d.tentativas)
    )), '[]')
    from public.dia_partidas d where d.fechada_em is not null and not d.sob_suspeita),
  'palpites', (
    select coalesce(json_agg(x), '[]') from (
      select pa.torcedor_id as pessoa, j.rodada, coalesce(sum(c.pontos), 0)::integer as pontos
      from public.palpites pa
      join public.jogos j on j.id = pa.jogo_id and j.confirmado_em is not null and not j.anulado
      left join public.crava_pontos c on c.torcedor_id = pa.torcedor_id and c.jogo_id = pa.jogo_id
      group by pa.torcedor_id, pa.jogo_id, j.rodada) x),
  'semana', (
    select coalesce(json_agg(json_build_object('semana', s.semana, 'pessoa', x.torcedor_id, 'minigame', x.minigame, 'pontos', x.pontos)), '[]')
    from (select distinct r.semana from public.ranking_semana r) s
    cross join lateral public.pontos_semana(s.semana) x)
) as dados`;

/** Roda a consulta no projeto ligado e devolve o objeto do SELECT. */
export function lerDados() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  // O SQL vai por arquivo: no Windows o shell quebra argumentos com várias linhas.
  const pasta = mkdtempSync(join(tmpdir(), 'balanco-'));
  try {
    const arquivo = join(pasta, 'balanco.sql');
    writeFileSync(arquivo, SQL);
    const saida = execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', arquivo], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 256 * 1024 * 1024,
    });
    const linha = JSON.parse(saida.slice(saida.indexOf('{'))).rows[0];
    return typeof linha.dados === 'string' ? JSON.parse(linha.dados) : linha.dados;
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

const pct = (f) => (f === null || f === undefined ? '' : `${Math.round(f * 100)}%`);

/** Monta o texto e as linhas do CSV a partir dos dados. Separado de lerDados para dar para testar. */
export function montarBalanco(dados) {
  const partidas = (m) => dados.partidas.filter((p) => p.minigame === m);
  const valores = {
    penaltis: partidas('penaltis').map((p) => p.pontos),
    prova: partidas('prova').map((p) => p.pontos),
    dia: dados.dias.map((d) => d.pontos),
    crava_palpite: dados.palpites.map((p) => p.pontos),
    crava_rodada: cravaPorRodada(dados.palpites),
  };
  const jogadores = {
    penaltis: new Set(partidas('penaltis').map((p) => p.pessoa)).size,
    prova: new Set(partidas('prova').map((p) => p.pessoa)).size,
    dia: new Set(dados.dias.map((d) => d.pessoa)).size,
    crava_palpite: new Set(dados.palpites.map((p) => p.pessoa)).size,
    crava_rodada: new Set(dados.palpites.map((p) => p.pessoa)).size,
  };

  const csv = [];
  const texto = [];

  // 1. Pontos por partida (ou unidade) de cada minigame.
  const linhas = UNIDADES.map((u) => {
    const r = resumir(valores[u.id], { teto: u.teto, faixa: u.faixa });
    const base = [u.nome, u.unidade, r.n, jogadores[u.id]];
    csv.push(
      { secao: 'pontos', item: u.id, metrica: 'quantidade', valor: r.n },
      { secao: 'pontos', item: u.id, metrica: 'jogadores', valor: jogadores[u.id] },
    );
    if (r.pouca) {
      csv.push({ secao: 'pontos', item: u.id, metrica: 'aviso', valor: 'pouca amostra' });
      return [...base, 'pouca amostra', '', '', '', '', '', '', ''];
    }
    for (const m of ['media', 'mediana', 'q1', 'q3', 'p90', 'max', 'noTeto']) {
      csv.push({ secao: 'pontos', item: u.id, metrica: m === 'noTeto' ? 'no_teto' : m, valor: r[m] });
    }
    csv.push({ secao: 'pontos', item: u.id, metrica: 'teto', valor: u.teto });
    for (const a of r.alertas) csv.push({ secao: 'pontos', item: u.id, metrica: 'alerta', valor: a });
    return [...base, r.media, r.mediana, r.q1, r.q3, r.p90, r.max, `${r.noTeto} (teto ${u.teto})`, r.alertas.map((a) => `⚠️ ${a}`).join('; ')];
  });
  texto.push(
    `Pontos por partida (alvo: mediana entre ${FAIXA.min} e ${FAIXA.max} nos jogos de partida; abaixo de ${MIN_AMOSTRA}, "pouca amostra")`,
    tabelaTexto(['Minigame', 'Unidade', 'Qtd', 'Jogadores', 'Média', 'Mediana', '25%', '75%', '90%', 'Máx', 'No teto', 'Alerta'], linhas),
  );

  // 2. Peso de cada minigame na semana (só o que contou no ranking).
  const peso = pesoNaSemana(dados.semana, ['penaltis', 'prova', 'dia', 'crava']);
  texto.push(
    '\nPeso de cada minigame na semana (só pontos que contaram no ranking; "por pessoa" = cada pessoa em cada semana)',
    tabelaTexto(
      ['Minigame', 'Pontos', '% do total', 'Mediana por pessoa', 'Fatia mediana por pessoa'],
      peso.map((p) => [NOMES[p.minigame], p.pontos, pct(p.fatia), p.medianaPorPessoa ?? '', pct(p.medianaFatia)]),
    ),
  );
  for (const p of peso) {
    csv.push(
      { secao: 'peso_semana', item: p.minigame, metrica: 'pontos', valor: p.pontos },
      { secao: 'peso_semana', item: p.minigame, metrica: 'fatia_total', valor: Math.round(p.fatia * 1000) / 1000 },
      { secao: 'peso_semana', item: p.minigame, metrica: 'mediana_por_pessoa', valor: p.medianaPorPessoa },
      { secao: 'peso_semana', item: p.minigame, metrica: 'fatia_mediana_por_pessoa', valor: p.medianaFatia === null ? null : Math.round(p.medianaFatia * 1000) / 1000 },
    );
  }

  // 3. Prova: até que pergunta chegam e como acaba.
  const provas = partidas('prova');
  const chegou = distribuicao(provas.map((p) => p.chegou));
  const fins = distribuicao(provas.map((p) => p.fim ?? '?'));
  texto.push(
    '\nProva de Boleiro: até que pergunta chega (quantas respondeu) e como acaba',
    tabelaTexto(['Respondeu', 'Partidas'], chegou.map(([k, v]) => [k, v])),
    tabelaTexto(['Fim', 'Partidas'], fins.map(([k, v]) => [k, v])),
  );
  for (const [k, v] of chegou) csv.push({ secao: 'prova_chegou', item: 'prova', metrica: `respondeu_${k}`, valor: v });
  for (const [k, v] of fins) csv.push({ secao: 'prova_fim', item: 'prova', metrica: k, valor: v });

  // 4. Time do Dia: em que tentativa acerta.
  const tentativas = distribuicao(dados.dias.map((d) => (d.acertou ? String(d.tentativas) : 'X')));
  texto.push('\nTime do Dia: acertou na tentativa (X = não acertou)', tabelaTexto(['Tentativa', 'Dias'], tentativas.map(([k, v]) => [k, v])));
  for (const [k, v] of tentativas) csv.push({ secao: 'dia_tentativas', item: 'dia', metrica: `acertou_na_${k}`, valor: v });

  return { texto: texto.join('\n'), csv };
}

/** Imprime o balanço e grava o CSV do dia. Devolve o caminho do arquivo. */
export function rodarBalanco() {
  const { texto, csv } = montarBalanco(lerDados());
  console.log(texto);
  const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // dia em Brasília
  const pasta = join(RAIZ, 'relatorios');
  mkdirSync(pasta, { recursive: true });
  const arquivo = join(pasta, `balanco-${hoje}.csv`);
  writeFileSync(arquivo, paraCsv(hoje, csv));
  console.log(`\nCópia gravada em ${relative(RAIZ, arquivo)}`);
  return arquivo;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('Balanço entre minigames (só leitura)\n');
  rodarBalanco();
}
