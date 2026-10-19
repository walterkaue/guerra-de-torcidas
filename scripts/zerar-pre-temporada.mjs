// Zerar pré-temporada (para quando o teste com amigos acabar).
// Mostra quanto vai ser apagado no projeto ligado (supabase link) e só apaga se você digitar ZERAR.
// Uso: npm run zerar-pre-temporada

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const consulta = (args) =>
  execFileSync(npx, ['supabase', 'db', 'query', '--linked', ...args], { encoding: 'utf8', shell: process.platform === 'win32' });

console.log('Projeto ligado: o que existe hoje\n');
console.log(
  consulta([
    '-o',
    'table',
    `select
       (select count(*) from public.partidas) as partidas,
       (select count(*) from public.desafios) as desafios,
       (select count(*) from public.ranking_semana) as linhas_de_ranking,
       (select count(*) from public.torcedores) as torcedores_que_ficam`,
  ]),
);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const resposta = await rl.question('Apagar TODAS as partidas, desafios e o ranking? Digite ZERAR para confirmar: ');
rl.close();
if (resposta.trim() !== 'ZERAR') {
  console.log('Nada foi apagado.');
  process.exit(0);
}

console.log(consulta(['-o', 'table', '-f', 'scripts/zerar-pre-temporada.sql']));
console.log('Pronto: partidas, desafios e ranking zerados. Times e torcedores mantidos.');
