// Zerar pré-temporada (para antes do lançamento público).
// Mostra quanto vai ser apagado no projeto ligado (supabase link) e só apaga se você digitar ZERAR.
// Antes, lembra de rodar o balanço (npm run balanco), que guarda os números da pré-temporada em
// relatorios/ (fora do Git): depois do zerar eles não existem mais no banco.
// Uso: npm run zerar-pre-temporada

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const consulta = (args) =>
  execFileSync(npx, ['supabase', 'db', 'query', '--linked', ...args], { encoding: 'utf8', shell: process.platform === 'win32' });

// O balanço de hoje já foi gravado?
const pasta = fileURLToPath(new URL('../relatorios', import.meta.url));
const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // dia em Brasília
const balancos = existsSync(pasta) ? readdirSync(pasta).filter((a) => /^balanco-\d{4}-\d{2}-\d{2}\.csv$/.test(a)).sort() : [];
if (balancos.includes(`balanco-${hoje}.csv`)) {
  console.log(`Balanço de hoje já gravado: relatorios/balanco-${hoje}.csv\n`);
} else {
  console.log('⚠️  ANTES DE ZERAR, RODE O BALANÇO: npm run balanco');
  console.log('   Ele grava os números da pré-temporada em relatorios/ (a calibragem dos minigames sai dele).');
  console.log(balancos.length ? `   Último balanço gravado: relatorios/${balancos.at(-1)}\n` : '   Nenhum balanço gravado ainda.\n');
}

console.log('Projeto ligado: o que existe hoje\n');
console.log(
  consulta([
    '-o',
    'table',
    `select
       (select count(*) from public.partidas) as partidas,
       (select count(*) from public.desafios) as desafios,
       (select count(*) from public.dia_partidas) as dias_do_time_do_dia,
       (select count(*) from public.crava_pontos) as pontos_do_crava,
       (select count(*) from public.ranking_semana) as linhas_de_ranking,
       (select count(*) from public.fechamento_semana) as linhas_de_fechamento,
       (select count(*) from public.temporada) as temporadas,
       (select count(*) from public.torcedores) as torcedores_que_ficam,
       (select count(*) from public.carreira_partidas) as partidas_da_carreira_que_ficam`,
  ]),
);
console.log('Os recordes pessoais saem dessas partidas, dias e pontos do Crava: zeram junto.');
console.log('Ficam: times, torcedores, palpites, perguntas e respostas da Prova, clubes e sorteio do Time do Dia.\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const resposta = await rl.question(
  'Apagar TODAS as partidas, desafios, dias do Time do Dia, pontos do Crava, recordes, o ranking, os fechamentos de semana e as temporadas? Digite ZERAR para confirmar: ',
);
rl.close();
if (resposta.trim() !== 'ZERAR') {
  console.log('Nada foi apagado.');
  process.exit(0);
}

console.log(consulta(['-o', 'table', '-f', 'scripts/zerar-pre-temporada.sql']));
console.log('Pronto: pré-temporada zerada (recordes junto). Times, torcedores, carreira e palpites mantidos.');
console.log('O mês de estreia já abriu: é o mês seguinte ao da semana de hoje (mes_de_estreia, acima).');
console.log('Não confirme de novo, no #admin, placar de rodada que já tinha fechado antes do zerar: os pontos voltariam.');
