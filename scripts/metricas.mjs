// Relatório de métricas (seção 11 do jogo.md). Só leitura: roda apenas SELECTs no projeto ligado (supabase link).
// Uso: npm run metricas
// Definições: "jogou" = partida fechada (com ou sem suspeita). Dias em horário de Brasília (coluna partidas.dia).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
// O SQL vai por arquivo: no Windows o shell quebra argumentos com várias linhas.
const pasta = mkdtempSync(join(tmpdir(), 'metricas-'));
const consulta = (sql) => {
  const arquivo = join(pasta, 'consulta.sql');
  writeFileSync(arquivo, sql);
  return execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'table', '-f', arquivo], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
};

// Primeira partida fechada de cada torcedor: dia de estreia e como entrou.
const base = `
  with fechadas as (
    select p.*, row_number() over (partition by p.torcedor_id order by p.fechada_em) as n
    from public.partidas p where p.fechada_em is not null
  ),
  estreia as (
    select f.torcedor_id, f.dia as dia0, f.modo, d.torcedor_id as convidador
    from fechadas f left join public.desafios d on d.id = f.desafio_id
    where f.n = 1
  ),
  hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d)`;

const secoes = [
  [
    'Jogadores e partidas',
    `${base}
     select
       (select count(*) from public.torcedores) as torcedores_cadastrados,
       (select count(*) from estreia) as jogadores_unicos,
       (select count(*) from fechadas) as partidas_fechadas,
       round((select count(*) from fechadas)::numeric / nullif((select count(*) from estreia), 0), 1) as partidas_por_jogador,
       (select percentile_cont(0.5) within group (order by c) from (select count(*) c from fechadas group by torcedor_id) x) as mediana,
       (select count(*) from fechadas where sob_suspeita) as sob_suspeita`,
  ],
  [
    'Partidas por jogador (distribuição)',
    `${base}
     select faixa, count(*) as jogadores from (
       select case when c = 1 then '1' when c <= 3 then '2-3' when c <= 10 then '4-10' else '11+' end as faixa,
              case when c = 1 then 1 when c <= 3 then 2 when c <= 10 then 3 else 4 end as ordem
       from (select count(*) c from fechadas group by torcedor_id) x
     ) y group by faixa, ordem order by ordem`,
  ],
  [
    'Voltou (só conta quem estreou há tempo suficiente para a janela fechar)',
    `${base}
     select
       count(*) filter (where e.dia0 <= h.d - 1) as base_d1,
       count(*) filter (where e.dia0 <= h.d - 1 and exists (
         select 1 from fechadas f where f.torcedor_id = e.torcedor_id and f.dia = e.dia0 + 1)) as voltou_dia_seguinte,
       count(*) filter (where e.dia0 <= h.d - 7) as base_d7,
       count(*) filter (where e.dia0 <= h.d - 7 and exists (
         select 1 from fechadas f where f.torcedor_id = e.torcedor_id and f.dia between e.dia0 + 1 and e.dia0 + 7)) as voltou_em_7_dias
     from estreia e, hoje h`,
  ],
  [
    'Desafios',
    `select
       (select count(*) from public.desafios) as enviados,
       (select count(distinct desafio_id) from public.partidas where modo = 'desafio' and desafio_id is not null and fechada_em is not null) as com_alguem_jogando,
       (select count(*) from public.partidas p join public.desafios d on d.id = p.desafio_id
          where p.modo = 'desafio' and p.fechada_em is not null and p.torcedor_id <> d.torcedor_id) as partidas_aceitas_por_outros,
       (select count(*) from public.partidas p join public.desafios d on d.id = p.desafio_id
          where p.modo = 'desafio' and p.fechada_em is not null and p.torcedor_id = d.torcedor_id) as revanches_do_proprio`,
  ],
  [
    'Convites (jogadores cuja 1ª partida foi um desafio de outra pessoa)',
    `${base}
     select
       (select count(*) from estreia where convidador is not null and convidador <> torcedor_id) as entraram_por_link,
       (select count(*) from estreia) as jogadores_unicos,
       (select count(distinct convidador) from estreia where convidador is not null and convidador <> torcedor_id) as quem_trouxe_alguem,
       round((select count(*) from estreia where convidador is not null and convidador <> torcedor_id)::numeric
             / nullif((select count(*) from estreia), 0), 2) as convites_por_jogador`,
  ],
  [
    'Quem mais trouxe gente (convidados por jogador, sem identificar ninguém)',
    `${base}
     select convidados, count(*) as jogadores from (
       select e.torcedor_id, count(c.torcedor_id) as convidados
       from estreia e left join estreia c on c.convidador = e.torcedor_id and c.torcedor_id <> e.torcedor_id
       group by e.torcedor_id
     ) x group by convidados order by convidados`,
  ],
];

console.log('Métricas do Guerra de Torcidas (só leitura)');
for (const [titulo, sql] of secoes) {
  console.log(`\n## ${titulo}`);
  console.log(consulta(sql));
}

rmSync(pasta, { recursive: true, force: true });
