// Relatório da proposta docs/propostas/lances-unificados.md. Só leitura; não muda pontuação, banco nem telas.
// Uso (Node 23.6 ou mais novo, que lê os módulos .ts do jogo sem compilar):
//   node scripts/balanco/lances-unificados.mjs        lê o retrato guardado em docs/propostas/lances-unificados-dados.json
// O retrato foi tirado do projeto ligado em 04/11/2026 (SELECT, sem ids de pessoa: j1, j2…), porque o zerar da
// pré-temporada apaga as partidas. A consulta está em CONSULTA, no fim deste arquivo.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LANCES } from '../../src/dados/lances.ts';
import { faixaPorChance } from '../../src/jogo/lances.ts';
import { CENARIOS, OPCOES, distribuicaoDePontos, taxasPorPosicao } from './calibragemProva.mjs';
import {
  LANCES_HOJE,
  PEN_HOJE,
  distTresTentativas,
  melhorMira,
  melhoresDoDia,
  misturarDists,
  modeloPenaltis,
  partidasAteMedalha,
  pontosLancesJogada,
  pontosPenaltisJogada,
  quantil,
  resumoDist,
  resumoLista,
  roboDoLance,
  taxasPenaltis,
  tetoLances,
  tetoPenaltis,
} from './lancesUnificados.mjs';

const RETRATO = fileURLToPath(new URL('../../docs/propostas/lances-unificados-dados.json', import.meta.url));
const D = JSON.parse(readFileSync(RETRATO, 'utf8'));

// ---------- tabelas em teste ----------
export const PEN_PROPOSTA = { id: 'P', nome: 'Proposta', gol: 8, angulo: 4, cavadinha: 6, defesa: 8, vitoria: 15, cinco: 12 };
const PEN_OPCOES = [
  PEN_HOJE,
  PEN_PROPOSTA,
  { id: 'P−', nome: 'Mais baixa', gol: 7, angulo: 4, cavadinha: 6, defesa: 7, vitoria: 15, cinco: 10 },
  { id: 'Pv', nome: 'Vitória pesa mais', gol: 7, angulo: 3, cavadinha: 6, defesa: 7, vitoria: 20, cinco: 10 },
];
export const LANCES_PROPOSTA = { id: 'B', nome: 'B · Proposta', facil: 24, media: 30, dificil: 36, craque: 42, recriou: 8 };
const LANCES_OPCOES = [
  LANCES_HOJE,
  { id: 'A', nome: 'A · Inicial do Kauê', facil: 12, media: 22, dificil: 32, craque: 42, recriou: 8 },
  LANCES_PROPOSTA,
  { id: 'C', nome: 'C · Meio-termo', facil: 20, media: 26, dificil: 34, craque: 42, recriou: 8 },
];
/** Quanto uma pessoa acerta em relação ao robô de calibragem. 0,45 é o observado nas 30 tentativas valendo. */
const FATORES = [
  { id: 'pre', nome: 'Pré-temporada', fator: 0.45 },
  { id: 'aprendeu', nome: 'Aprendeu', fator: 0.7 },
  { id: 'robo', nome: 'Robô', fator: 1 },
];

// ---------- saída ----------
const f0 = (v) => (v === null || v === undefined ? '–' : Math.round(v).toString());
const f1 = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const f2 = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
const pct = (v) => (v < 0.001 && v > 0 ? '<0,1%' : `${f1(v * 100)}%`);
const tabela = (cab, linhas) => {
  console.log(`| ${cab.join(' | ')} |`);
  console.log(`|${cab.map(() => '---').join('|')}|`);
  for (const l of linhas) console.log(`| ${l.join(' | ')} |`);
  console.log('');
};
const colunas = (r) => [f0(r.q25), f0(r.mediana), f0(r.q75), f0(r.q90), f1(r.media), f0(r.max), pct(r.teto)];
const CAB = ['25%', 'Mediana', '75%', '90%', 'Média', 'Máx', 'Bate 150'];

console.log(`# Relatório: Lances do Jogo unificados (retrato de ${D.retrato})\n`);

// =====================================================================
// 1. Pênaltis
// =====================================================================
console.log('## 1. Pênaltis\n');
const confere = D.penaltis.filter((p) => pontosPenaltisJogada(p, PEN_HOJE) !== p.pontos).length;
console.log(`Reprodução com a tabela de hoje: ${D.penaltis.length - confere} de ${D.penaltis.length} partidas batem com os pontos gravados.\n`);
if (confere) throw new Error('A reprodução dos pênaltis não bate com o banco.');

const TX = taxasPenaltis(D.penaltis);
console.log(
  `Taxas observadas: gol ${pct(TX.gol)} das cobranças (ângulo ${pct(TX.angulo)} e cavadinha ${pct(TX.cavadinha)} dos gols), ` +
    `defesa ${pct(TX.defesa)}, máquina manda pra fora ${pct(TX.fora)}.\n`,
);
const PERFIS_PEN = [
  { nome: 'Pré-temporada (todas)', taxas: TX },
  { nome: 'Joga pouco (gol 45%, defesa 33%)', taxas: { ...TX, gol: 0.45, defesa: 0.33 } },
  { nome: 'Manda bem (gol 70%, defesa 50%)', taxas: { ...TX, gol: 0.7, defesa: 0.5 } },
];
for (const t of PEN_OPCOES) {
  console.log(
    `### ${t.nome}: gol ${t.gol}, ângulo +${t.angulo}, cavadinha +${t.cavadinha}, defesa ${t.defesa}, vitória +${t.vitoria}, 5 de 5 +${t.cinco} (teto ${tetoPenaltis(t)})\n`,
  );
  const linhas = [['Partidas jogadas (48, exato)', ...colunas(resumoLista(D.penaltis.map((p) => pontosPenaltisJogada(p, t))))]];
  for (const pf of PERFIS_PEN) linhas.push([`Modelo · ${pf.nome}`, ...colunas(resumoDist(modeloPenaltis(pf.taxas, t).dist))]);
  tabela(['Fonte', ...CAB], linhas);
}

// =====================================================================
// 2. Faltas e cara a cara
// =====================================================================
console.log('## 2. Faltas e cara a cara\n');
const ROBO = Object.fromEntries(LANCES.map((l) => [l.id, { faixa: l.faixa, tipo: l.tipo, ...roboDoLance(l) }]));

// Pessoa x robô nas tentativas valendo.
const tent = D.lances.flatMap((p) => p.l);
const golsReais = tent.filter((x) => x[2] === 'gol').length;
const golsRobo = tent.reduce((s, x) => s + ROBO[x[0]].noGol.gol, 0);
const FATOR_REAL = golsReais / golsRobo;
console.log(
  `Tentativas valendo: ${tent.length}, gols ${golsReais} (${pct(golsReais / tent.length)}); o robô faria ${f1(golsRobo)} ` +
    `(${pct(golsRobo / tent.length)}) nos mesmos lances. Fator pessoa/robô: ${f2(FATOR_REAL)}.\n`,
);
const semZona = Object.entries(ROBO).filter(([, r]) => r.naZona.recriou < 0.02);
console.log(`Lances em que o robô quase nunca recria (menos de 2%): ${semZona.length}: ${semZona.map(([id]) => id).join(', ')}.\n`);

/** Distribuição de uma partida (3 tentativas do mesmo lance), com a faixa do catálogo ou recalibrada pela pessoa. */
function distLance(r, t, fator, recalibrada) {
  const faixa = recalibrada ? faixaPorChance(r.noGol.gol * fator) : r.faixa;
  const m = melhorMira(r, t[faixa], t.recriou);
  return distTresTentativas(m.gol * fator, m.recriou * fator, t[faixa], t.recriou);
}
const catalogo = (t, fator, recalibrada) => misturarDists(Object.values(ROBO).map((r) => distLance(r, t, fator, recalibrada)));

for (const t of LANCES_OPCOES) {
  console.log(`### ${t.nome}: ${t.facil} / ${t.media} / ${t.dificil} / ${t.craque}, recriar +${t.recriou} (teto ${tetoLances(t)})\n`);
  const linhas = [[`Partidas jogadas (${D.lances.length}, exato por tentativa)`, ...colunas(resumoLista(D.lances.map((p) => pontosLancesJogada(p, t))))]];
  for (const fz of FATORES) linhas.push([`Modelo · ${fz.nome} (×${f2(fz.fator)}), faixas de hoje`, ...colunas(resumoDist(catalogo(t, fz.fator, false)))]);
  for (const fz of FATORES.slice(0, 2)) linhas.push([`Modelo · ${fz.nome} (×${f2(fz.fator)}), faixas corrigidas`, ...colunas(resumoDist(catalogo(t, fz.fator, true)))]);
  tabela(['Fonte', ...CAB], linhas);
}

console.log('### Por faixa, com a proposta (catálogo de hoje)\n');
{
  const t = LANCES_PROPOSTA;
  const linhas = [];
  for (const faixa of ['facil', 'media', 'dificil', 'craque']) {
    const rs = Object.values(ROBO).filter((r) => r.faixa === faixa);
    for (const fz of FATORES.slice(1)) {
      const dist = misturarDists(rs.map((r) => distLance(r, t, fz.fator, false)));
      const res = resumoDist(dist);
      linhas.push([faixa, rs.length, fz.nome, f0(res.mediana), f1(res.media), f0(res.q90), pct(res.teto), f0(melhoresDoDia(dist, 10, 3, 6000))]);
    }
  }
  tabela(['Faixa', 'Lances', 'Pessoa', 'Mediana', 'Média', '90%', 'Bate 150', '3 melhores de 10'], linhas);
}

// =====================================================================
// 3. Medalhas
// =====================================================================
console.log('## 3. Medalhas: partidas até cada uma (mediana)\n');
{
  const linhas = [];
  for (const pf of PERFIS_PEN) {
    const m = modeloPenaltis(pf.taxas, PEN_PROPOSTA, 100_000);
    const g = m.golsDist.sort((a, b) => a[0] - b[0]);
    const vit = { meta: 10, porPartida: (_x, rnd) => (rnd() < m.vitoria ? 1 : 0) };
    linhas.push([
      `Pênaltis · ${pf.nome}`,
      f1(m.golsPorPartida),
      f0(partidasAteMedalha(g, 10)),
      f0(partidasAteMedalha(g, 50)),
      f0(partidasAteMedalha(g, 100, vit)),
      `vitória ${pct(m.vitoria)}`,
    ]);
  }
  const binom3 = (p) => [0, 1, 2, 3].map((k) => [k, [1, 3, 3, 1][k] * p ** k * (1 - p) ** (3 - k)]);
  for (const faixa of ['facil', 'media', 'dificil', 'craque']) {
    for (const fz of FATORES.slice(1)) {
      const rs = Object.values(ROBO).filter((r) => r.faixa === faixa);
      const ns = rs.map((r) => {
        // Bronze e prata: mira no gol. Ouro: mira na zona histórica (precisa de 10 recriados).
        const p = r.noGol.gol * fz.fator;
        const pz = r.naZona.gol * fz.fator;
        const q = r.naZona.gol > 0 ? r.naZona.recriou / r.naZona.gol : 0;
        const rec = { meta: 10, porPartida: (x, rnd) => Array.from({ length: x }, () => (rnd() < q ? 1 : 0)).reduce((a, b) => a + b, 0) };
        return {
          gols: 3 * p,
          b: partidasAteMedalha(binom3(p), 5, null, 3000),
          pr: partidasAteMedalha(binom3(p), 20, null, 3000),
          o: q < 0.05 || pz < 0.02 ? Infinity : partidasAteMedalha(binom3(pz), 50, rec, 3000),
        };
      });
      const med = (k) => quantil(ns.map((n) => n[k]).filter(Number.isFinite), 0.5);
      const sem = ns.filter((n) => !Number.isFinite(n.o)).length;
      linhas.push([
        `${faixa} · ${fz.nome}`,
        f1(med('gols')),
        f0(med('b')),
        f0(med('pr')),
        f0(med('o')),
        sem ? `${sem} de ${rs.length} sem ouro possível` : '',
      ]);
    }
  }
  tabela(['Item · pessoa', 'Gols por partida', 'Bronze', 'Prata', 'Ouro', 'Nota'], linhas);
}

// =====================================================================
// 4. Limite diário
// =====================================================================
console.log('## 4. Partidas por pessoa por dia (criadas, todos os jogos)\n');
{
  const porDia = new Map();
  for (const c of D.criadas) {
    const k = `${c.j}|${c.dia}`;
    const o = porDia.get(k) ?? { total: 0, penaltis: 0, lances: 0, prova: 0 };
    o.total += Number(c.n);
    o[c.mg] = (o[c.mg] ?? 0) + Number(c.n);
    porDia.set(k, o);
  }
  const v = [...porDia.values()];
  const desc = (lista) => {
    const l = lista.filter((x) => x > 0);
    return [l.length, f0(quantil(l, 0.5)), f0(quantil(l, 0.9)), f0(Math.max(...l))];
  };
  tabela(
    ['Jogo', 'Pessoa-dias', 'Mediana', '90%', 'Máx'],
    [
      ['Todos', ...desc(v.map((o) => o.total))],
      ['Pênaltis + Lances', ...desc(v.map((o) => o.penaltis + o.lances))],
      ['Prova', ...desc(v.map((o) => o.prova))],
    ],
  );
  console.log('3 melhores partidas de N (soma esperada, pênaltis com a proposta, pré-temporada):\n');
  const dist = modeloPenaltis(TX, PEN_PROPOSTA, 100_000).dist;
  tabela(
    ['N', '3', '5', '8', '10', '12', '15', '20'],
    [['Soma das 3 melhores', ...[3, 5, 8, 10, 12, 15, 20].map((n) => f0(melhoresDoDia(dist, n, 3)))]],
  );
}

// =====================================================================
// 5. Peso na semana
// =====================================================================
console.log('## 5. Peso de cada jogo na semana\n');
const pesoTexto = (o) => {
  const total = Object.values(o).reduce((a, b) => a + b, 0);
  return ['lances', 'prova', 'dia', 'crava'].map((k) => `${pct((o[k] ?? 0) / total)} (${f0(o[k] ?? 0)})`);
};
{
  // Hoje, como o ranking contou.
  const hoje = {};
  for (const r of D.semana) {
    const k = r.mg === 'penaltis' || r.mg === 'lances' ? 'lances' : r.mg;
    hoje[k] = (hoje[k] ?? 0) + Number(r.pontos);
  }
  const pen = D.semana.filter((r) => r.mg === 'penaltis').reduce((s, r) => s + Number(r.pontos), 0);
  const total = Object.values(hoje).reduce((a, b) => a + b, 0);
  console.log(`Hoje, no ranking (todas as semanas do retrato): pênaltis ${pct(pen / total)} de ${f0(total)} pontos.\n`);

  // As mesmas partidas, com a regra nova: 3 melhores de Lances (pênaltis e faltas juntos) e 3 melhores da Prova por dia.
  const dias = new Map();
  const add = (j, dia, k, v) => {
    const key = `${j}|${dia}`;
    const o = dias.get(key) ?? { lances: [], prova: [] };
    o[k].push(v);
    dias.set(key, o);
  };
  for (const p of D.penaltis) add(p.j, p.dia, 'lances', pontosPenaltisJogada(p, PEN_PROPOSTA));
  for (const p of D.lances) add(p.j, p.dia, 'lances', pontosLancesJogada(p, LANCES_PROPOSTA));
  for (const p of D.prova) add(p.j, p.dia, 'prova', p.pontos);
  const nova = { lances: 0, prova: 0, dia: hoje.dia ?? 0, crava: hoje.crava ?? 0 };
  const top3 = (l) => [...l].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
  for (const o of dias.values()) {
    nova.lances += top3(o.lances);
    nova.prova += top3(o.prova);
  }
  tabela(
    ['Regra', 'Lances (pên. + faltas)', 'Prova', 'Time do Dia', 'Crava'],
    [
      ['Hoje (ranking)', ...pesoTexto(hoje)],
      ['Regra nova, mesmas partidas', ...pesoTexto(nova)],
    ],
  );
}
{
  // Modelo: duas pessoas-tipo. Prova pelo modelo da calibragem (regra B, a de hoje).
  const regraB = OPCOES.find((o) => o.id === 'B');
  const provaDist = (c) => distribuicaoDePontos(taxasPorPosicao(CENARIOS.find((x) => x.id === c).porDegrau), regraB);
  const penHoje = modeloPenaltis(TX, PEN_HOJE, 100_000).dist;
  const penNovo = modeloPenaltis(TX, PEN_PROPOSTA, 100_000).dist;
  const penBomHoje = modeloPenaltis({ ...TX, gol: 0.7, defesa: 0.5 }, PEN_HOJE, 100_000).dist;
  const penBomNovo = modeloPenaltis({ ...TX, gol: 0.7, defesa: 0.5 }, PEN_PROPOSTA, 100_000).dist;
  const faltaHoje = catalogo(LANCES_HOJE, 0.7, true);
  const faltaNova = catalogo(LANCES_PROPOSTA, 0.7, true);
  const misturaNova = (a, b) => misturarDists([a, b]);
  const DIA = D.timeDoDia.reduce((a, b) => a + b, 0) / D.timeDoDia.length;
  const PESSOAS = [
    { nome: 'Pessoa mediana', dias: 4, partidas: 2, provas: 1, crava: 60, pen: [penHoje, penNovo], prova: provaDist('hoje') },
    { nome: 'Joga muito', dias: 7, partidas: 10, provas: 5, crava: 120, pen: [penBomHoje, penBomNovo], prova: provaDist('otimista') },
  ];
  const linhas = [];
  for (const p of PESSOAS) {
    const mediaDist = (d) => d.reduce((s, [v, q]) => s + v * q, 0);
    // Hoje: 5 melhores de (pênaltis + Prova), melhor partida dos Lances (supõe uma por dia, com as 3 faltas de sempre), Time do Dia, Crava.
    const hojeTeto = melhoresDoDia(
      misturarDists([...Array(p.partidas).fill(p.pen[0]), ...Array(p.provas).fill(p.prova)]),
      p.partidas + p.provas,
      5,
    );
    const provaFracao = (p.provas * mediaDist(p.prova)) / (p.provas * mediaDist(p.prova) + p.partidas * mediaDist(p.pen[0]));
    const hoje = {
      lances: p.dias * (hojeTeto * (1 - provaFracao) + mediaDist(faltaHoje)),
      prova: p.dias * hojeTeto * provaFracao,
      dia: p.dias * DIA,
      crava: p.crava,
    };
    const nova = {
      lances: p.dias * melhoresDoDia(misturaNova(p.pen[1], faltaNova), p.partidas, 3),
      prova: p.dias * melhoresDoDia(p.prova, p.provas, 3),
      dia: p.dias * DIA,
      crava: p.crava,
    };
    linhas.push([`${p.nome} · hoje`, ...pesoTexto(hoje)]);
    linhas.push([`${p.nome} · regra nova`, ...pesoTexto(nova)]);
  }
  console.log(
    `Modelo (pessoa mediana: 4 dias, 2 partidas de Lances e 1 Prova por dia, Crava 60; joga muito: 7 dias, 10 Lances e 5 Provas por dia, Crava 120; Time do Dia ${f0(DIA)} de média):\n`,
  );
  tabela(['Pessoa · regra', 'Lances (pên. + faltas)', 'Prova', 'Time do Dia', 'Crava'], linhas);
}

export const CONSULTA = `-- Só leitura. Rode no SQL Editor ou com npx supabase db query --linked -o json -f arquivo.sql.
-- Troca o id de cada pessoa por j1, j2… (ordem da primeira partida).
with pess as (select torcedor_id, 'j' || dense_rank() over (order by min(criada_em)) as j from public.partidas group by torcedor_id),
sem as (select distinct semana from public.partidas where semana is not null)
select json_build_object(
  'penaltis', (select json_agg(json_build_object('j', pe.j, 'dia', p.dia, 'pontos', p.pontos, 'pt', p.resultado->'pontos',
      'venceu', p.resultado->'venceu', 'decisao', p.resultado->>'decisao',
      'cob', (select json_agg(json_build_array(c->>'desfecho', c->'angulo', c->'cavadinha', c->'fraca')) from jsonb_array_elements(p.resultado->'cobrancas') c),
      'def', (select json_agg(d->>'desfecho') from jsonb_array_elements(p.resultado->'defesas') d)) order by p.criada_em)
    from public.partidas p join pess pe using (torcedor_id) where p.minigame = 'penaltis' and p.fechada_em is not null and not p.sob_suspeita),
  'lances', (select json_agg(json_build_object('j', pe.j, 'dia', p.dia, 'pontos', p.pontos,
      'l', (select json_agg(json_build_array(l->>'lanceId', l->>'faixa', l->>'desfecho', l->'recriou')) from jsonb_array_elements(p.resultado->'lances') l)))
    from public.partidas p join pess pe using (torcedor_id) where p.minigame = 'lances' and p.fechada_em is not null and not p.sob_suspeita),
  'prova', (select json_agg(json_build_object('j', pe.j, 'dia', p.dia, 'pontos', p.pontos))
    from public.partidas p join pess pe using (torcedor_id) where p.minigame = 'prova' and p.fechada_em is not null and not p.sob_suspeita),
  'criadas', (select json_agg(x) from (select pe.j, p.minigame as mg, (p.criada_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as n
    from public.partidas p join pess pe using (torcedor_id) group by 1, 2, 3) x),
  'semana', (select json_agg(x) from (select s.semana, pe.j, y.minigame as mg, sum(y.pontos) as pontos
    from sem s cross join lateral public.pontos_semana(s.semana) y left join pess pe on pe.torcedor_id = y.torcedor_id group by 1, 2, 3) x),
  'timeDoDia', (select json_agg(d.pontos) from public.dia_partidas d where d.fechada_em is not null and not d.amistoso and not d.sob_suspeita)
) as dados;`;
