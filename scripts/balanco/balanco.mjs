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
  NOME_REGRA,
  REGRAS,
  UNIDADES,
  classificarPartida,
  cravaPorRodada,
  distribuicao,
  paraCsv,
  pesoNaSemanaPorRegra,
  resumir,
  tabelaTexto,
  unidadesLances,
} from './estatisticas.mjs';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const NOMES = { penaltis: 'Pênaltis', prova: 'Prova de Boleiro', dia: 'Time do Dia', crava: 'Crava', lances: 'Lances do Jogo' };

// A Prova de Boleiro passou a acabar no 3º erro (e levar 75%) na virada da semana de 02/11/2026
// (docs/propostas/calibragem-prova.md). O balanço só conta Prova com a regra nova, para não misturar as duas:
// partidas criadas a partir desta data (meia-noite de Brasília). Mude com PROVA_DESDE=AAAA-MM-DDTHH:MM:SSZ se
// a publicação atrasar; com --prova-antes sai a Prova da regra antiga (criada antes da data).
export const PROVA_TRES_ERROS_DESDE = process.env.PROVA_DESDE ?? '2026-11-02T03:00:00Z';
const PROVA_ANTES = process.argv.includes('--prova-antes');

// Lances do Jogo unificados (jogo.md, 14.7): regras diferentes não se misturam na mesma linha. Por padrão o relatório
// mostra "antes de 16/11" e "a partir de 16/11" (as que tiverem partidas); --regra antes|nova (ou --regra=nova) mostra só uma.
export function lerRegraArg(argv = process.argv) {
  const i = argv.findIndex((a) => a === '--regra' || a.startsWith('--regra='));
  if (i < 0) return null;
  const v = argv[i].includes('=') ? argv[i].split('=')[1] : argv[i + 1];
  if (!REGRAS.includes(v)) throw new Error(`--regra deve ser "antes" ou "nova" (veio: ${v ?? 'nada'})`);
  return v;
}

// Tudo numa consulta só (cada chamada ao CLI leva uns segundos). Sem partida sob suspeita.
export const montarSql = (desde = PROVA_TRES_ERROS_DESDE, antes = false) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(desde)) throw new Error(`data inválida: ${desde}`);
  const filtroProva = `(p.minigame <> 'prova' or p.criada_em ${antes ? '<' : '>='} timestamptz '${desde}')`;
  return SQL.replace('/*FILTRO_PROVA*/', filtroProva);
};

const SQL = `
select json_build_object(
  'partidas', (
    select coalesce(json_agg(json_build_object(
      'minigame', p.minigame, 'pessoa', p.torcedor_id, 'pontos', p.pontos, 'criada', p.criada_em,
      'lanceId', case when p.minigame = 'lances' then p.resultado -> 'lances' -> 0 ->> 'lanceId' end,
      'fim', case when p.minigame = 'prova' then p.resultado ->> 'fim' end,
      'chegou', case when p.minigame = 'prova' then jsonb_array_length(coalesce(p.resultado -> 'passos', '[]')) end
    )), '[]')
    from public.partidas p where p.fechada_em is not null and not p.sob_suspeita and /*FILTRO_PROVA*/),
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
    writeFileSync(arquivo, montarSql(PROVA_TRES_ERROS_DESDE, PROVA_ANTES));
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
export function montarBalanco(dados, { regra = null } = {}) {
  const partidas = (m) => dados.partidas.filter((p) => p.minigame === m);
  const lancesTodas = dados.partidas.filter((p) => p.minigame === 'penaltis' || p.minigame === 'lances').map((p) => classificarPartida(p));
  const regras = REGRAS.filter((r) => (!regra || regra === r) && lancesTodas.some((p) => p.regra === r));
  if (!regras.length) regras.push(regra ?? 'antes');
  const maisRecente = regras[regras.length - 1];

  // Cada item: a unidade (com teto e faixa), os pontos e quantas pessoas. Pênaltis/Lances por regra; o resto como sempre.
  const itens = [];
  for (const r of regras) {
    for (const u of unidadesLances(r, lancesTodas)) {
      const ps = lancesTodas.filter(u.quais);
      const legado = r === maisRecente && ['penaltis', 'lances'].includes(u.base);
      itens.push({ u, valores: ps.map((p) => p.pontos), jogadores: new Set(ps.map((p) => p.pessoa)).size, ids: legado ? [u.id, u.base] : [u.id] });
    }
  }
  const resto = {
    prova: [partidas('prova').map((p) => p.pontos), new Set(partidas('prova').map((p) => p.pessoa)).size],
    dia: [dados.dias.map((d) => d.pontos), new Set(dados.dias.map((d) => d.pessoa)).size],
    crava_palpite: [dados.palpites.map((p) => p.pontos), new Set(dados.palpites.map((p) => p.pessoa)).size],
    crava_rodada: [cravaPorRodada(dados.palpites), new Set(dados.palpites.map((p) => p.pessoa)).size],
  };
  for (const u of UNIDADES) itens.push({ u, valores: resto[u.id][0], jogadores: resto[u.id][1], ids: [u.id] });

  const csv = [];
  const texto = [];

  // 1. Pontos por partida (ou unidade) de cada minigame.
  const linhas = itens.map(({ u, valores, jogadores, ids }) => {
    const r = resumir(valores, { teto: u.teto, faixa: u.faixa });
    const base = [u.nome, u.unidade, r.n, jogadores];
    // As linhas de Lances saem com o id da regra (penaltis_antes…); a regra mais recente também sai com o id antigo
    // (penaltis, lances), para as planilhas de antes continuarem achando a coluna.
    for (const id of ids) {
      csv.push(
        { secao: 'pontos', item: id, metrica: 'quantidade', valor: r.n },
        { secao: 'pontos', item: id, metrica: 'jogadores', valor: jogadores },
      );
      if (u.regra) csv.push({ secao: 'pontos', item: id, metrica: 'regra', valor: u.regra });
      if (r.pouca) {
        csv.push({ secao: 'pontos', item: id, metrica: 'aviso', valor: 'pouca amostra' });
        continue;
      }
      for (const m of ['media', 'mediana', 'q1', 'q3', 'p90', 'max', 'noTeto']) {
        csv.push({ secao: 'pontos', item: id, metrica: m === 'noTeto' ? 'no_teto' : m, valor: r[m] });
      }
      csv.push({ secao: 'pontos', item: id, metrica: 'teto', valor: u.teto });
      for (const a of r.alertas) csv.push({ secao: 'pontos', item: id, metrica: 'alerta', valor: a });
    }
    if (r.pouca) return [...base, 'pouca amostra', '', '', '', '', '', '', ''];
    return [...base, r.media, r.mediana, r.q1, r.q3, r.p90, r.max, `${r.noTeto} (teto ${u.teto})`, r.alertas.map((a) => `⚠️ ${a}`).join('; ')];
  });
  texto.push(
    `Pontos por partida (alvo: mediana entre ${FAIXA.min} e ${FAIXA.max} nos jogos de partida; abaixo de ${MIN_AMOSTRA}, "pouca amostra")`,
    'Regras dos Lances (jogo.md, 14.7): partidas criadas antes de 16/11 e a partir de 16/11 ficam em linhas separadas.',
    tabelaTexto(['Minigame', 'Unidade', 'Qtd', 'Jogadores', 'Média', 'Mediana', '25%', '75%', '90%', 'Máx', 'No teto', 'Alerta'], linhas),
  );

  // 2. Peso de cada minigame na semana (só o que contou no ranking), uma tabela por regra.
  const pesos = pesoNaSemanaPorRegra(dados.semana, regra ? [regra] : REGRAS);
  for (const { regra: r, peso } of pesos) {
    const nomes = { ...NOMES, lances: r === 'nova' ? 'Lances (pênaltis + faltas + cara a cara)' : NOMES.lances };
    texto.push(
      `\nPeso de cada minigame na semana, semanas ${NOME_REGRA[r]} (só pontos que contaram no ranking; "por pessoa" = cada pessoa em cada semana; ` +
        'a Prova aqui inclui as semanas com a regra antiga: só vale depois de uma semana inteira de 3 erros)',
      tabelaTexto(
        ['Minigame', 'Pontos', '% do total', 'Mediana por pessoa', 'Fatia mediana por pessoa'],
        peso.map((p) => [nomes[p.minigame], p.pontos, pct(p.fatia), p.medianaPorPessoa ?? '', pct(p.medianaFatia)]),
      ),
    );
    for (const p of peso) {
      const ids = [`${p.minigame}_${r}`, ...(r === pesos[pesos.length - 1].regra ? [p.minigame] : [])];
      for (const item of ids) {
        csv.push(
          { secao: 'peso_semana', item, metrica: 'pontos', valor: p.pontos },
          { secao: 'peso_semana', item, metrica: 'fatia_total', valor: Math.round(p.fatia * 1000) / 1000 },
          { secao: 'peso_semana', item, metrica: 'mediana_por_pessoa', valor: p.medianaPorPessoa },
          { secao: 'peso_semana', item, metrica: 'fatia_mediana_por_pessoa', valor: p.medianaFatia === null ? null : Math.round(p.medianaFatia * 1000) / 1000 },
        );
      }
    }
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
export function rodarBalanco(opcoes = { regra: lerRegraArg() }) {
  const { texto, csv } = montarBalanco(lerDados(), opcoes);
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
  console.log('Balanço entre minigames (só leitura)');
  console.log(
    PROVA_ANTES
      ? `Prova: só partidas criadas antes de ${PROVA_TRES_ERROS_DESDE} (regra antiga: o 1º erro encerra)\n`
      : `Prova: só partidas criadas a partir de ${PROVA_TRES_ERROS_DESDE} (regra nova: 3 erros e fora)\n`,
  );
  rodarBalanco();
}
