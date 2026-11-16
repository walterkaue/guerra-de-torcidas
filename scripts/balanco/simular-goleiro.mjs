// Calibragem do goleiro com alcance (motor 2) nas cobranças reais. Só leitura: um SELECT no projeto ligado, como o
// npm run metricas; não muda pontuação nem banco.
// Uso: node scripts/balanco/simular-goleiro.mjs [--amostras 400] [--arquivo partidas.json] [--antigas]
//   --arquivo lê as partidas de um JSON ([{ dificuldade, cobrancas: [{ dir, forca, efeito }] }]) em vez do banco.
//   --antigas só refaz cada partida de pênaltis fechada com o motor de hoje (regra pela hora de criação) e confere que
//             o resultado guardado não muda nem um ponto. Mostra só as contagens (nada de semente nem id).
// Imprime, para o motor 1 e o motor 2: % de gols, pontos por cobrança, a curva de segunda a domingo e gols e pontos por
// colocação, com cada cobrança jogada nos 7 dias (dias iguais) e no dia real dela; depois os pontos de conferência.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerSementes, simularPartida } from '../../src/jogo/penaltis.ts';
import { tabelaPenaltisDaPartida } from '../../src/jogo/regraLances.ts';
import { CONFERENCIA, chanceDeGol, cobrancasDasPartidas, faixaDaBola, igual, simular, tabelaDoTotal } from './simularGoleiro.mjs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = process.argv.slice(2);
const opcao = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};

// Sem id de pessoa nem de partida: só a dificuldade e os gestos, na ordem em que as partidas foram criadas.
const SQL = `
select coalesce(json_agg(json_build_object('dificuldade', p.dificuldade, 'cobrancas', p.gestos -> 'cobrancas') order by p.criada_em), '[]') as dados
from public.partidas p
where p.minigame = 'penaltis' and p.fechada_em is not null and jsonb_typeof(p.gestos -> 'cobrancas') = 'array'`;

// Para refazer: tudo o que o fechar-partida usou. Fica só na memória deste processo.
const SQL_ANTIGAS = `
select coalesce(json_agg(json_build_object('criada_em', p.criada_em, 'semente', p.semente, 'dificuldade', p.dificuldade,
  'gestos', p.gestos, 'resultado', p.resultado, 'pontos', p.pontos, 'sementes', s.sementes, 'numero_narrador', s.numero_narrador,
  'desafio', p.modo = 'desafio', 'gravadas', d.cobrancas) order by p.criada_em), '[]') as dados
from public.partidas p
join public.partidas_segredo s on s.partida_id = p.id
left join public.desafios d on d.id = p.desafio_id and p.modo = 'desafio'
where p.minigame = 'penaltis' and p.fechada_em is not null`;

function lerDoBanco(sql = SQL) {
  const pasta = mkdtempSync(join(tmpdir(), 'goleiro-'));
  try {
    const arquivo = join(pasta, 'consulta.sql');
    writeFileSync(arquivo, sql);
    const saida = execFileSync(npx, ['supabase', 'db', 'query', '--remote', '--read-only', '-o', 'json', '-f', arquivo], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      maxBuffer: 64 * 1024 * 1024,
    });
    const linha = JSON.parse(saida.slice(saida.indexOf('{'))).rows[0];
    return typeof linha.dados === 'string' ? JSON.parse(linha.dados) : linha.dados;
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

if (args.includes('--antigas')) {
  const todas = lerDoBanco(SQL_ANTIGAS);
  let iguais = 0;
  let semDesafio = 0;
  const diferentes = [];
  for (const p of todas) {
    // Desafio já apagado (30 dias): sem as cobranças gravadas não dá para refazer as defesas.
    if (p.desafio && !p.gravadas) {
      semDesafio++;
      continue;
    }
    const r = simularPartida(lerSementes(p.sementes, Number(p.semente)), p.gestos, Number(p.dificuldade), p.numero_narrador ?? undefined, p.gravadas ?? undefined, tabelaPenaltisDaPartida(p.criada_em));
    if (r.pontos.total === p.pontos && igual(r, p.resultado)) iguais++;
    else diferentes.push(`${p.criada_em.slice(0, 10)}: ${p.pontos} guardados, ${r.pontos.total} refeitos`);
  }
  console.log(`Partidas de pênaltis refeitas: ${todas.length - semDesafio} (${semDesafio} desafios já apagados ficaram de fora).`);
  console.log(`Iguais ao guardado, campo por campo: ${iguais}. Diferentes: ${diferentes.length}.`);
  for (const d of diferentes) console.log(`  ${d}`);
  process.exit(diferentes.length ? 1 : 0);
}

const arquivo = opcao('--arquivo');
const partidas = arquivo ? JSON.parse(readFileSync(arquivo, 'utf8')) : lerDoBanco();
const amostras = Number(opcao('--amostras')) || 400;
const cobrancas = cobrancasDasPartidas(partidas);

console.log(`# Goleiro com alcance: ${cobrancas.length} cobranças reais em ${partidas.length} partidas (${amostras} sorteios por cobrança e dia)\n`);
console.log(tabelaDoTotal(simular(cobrancas, { amostras, dias: 'iguais' }), 'Dias iguais (cada cobrança jogada de segunda a domingo)'));
console.log('');
console.log(tabelaDoTotal(simular(cobrancas, { amostras: amostras * 3, dias: 'real' }), 'No dia real de cada cobrança'));
console.log('\n### Pontos de conferência do motor 2 (bola exata, sem tremor, dificuldade 0,5)\n');
console.log('| Bola | x | y | Colocação | Gols | Alvo |');
console.log('|---|---|---|---|---|---|');
for (const c of CONFERENCIA) {
  console.log(`| ${c.nome} | ${c.bola.x} | ${c.bola.y} | ${faixaDaBola(c.bola)} | ${chanceDeGol(c).toFixed(1)}% | ${c.alvo}% |`);
}
