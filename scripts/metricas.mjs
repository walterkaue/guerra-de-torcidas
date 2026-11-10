// Relatório de métricas (seção 11 do jogo.md). Só leitura: roda apenas SELECTs no projeto ligado (supabase link).
// Uso: npm run metricas (no fim, o balanço entre minigames; sozinho: npm run balanco)
// Definições: "jogou" = partida fechada (com ou sem suspeita). Dias em horário de Brasília (coluna partidas.dia).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rodarBalanco } from './balanco/balanco.mjs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
// O SQL vai por arquivo: no Windows o shell quebra argumentos com várias linhas.
let pasta;
const consulta = (sql) => {
  const arquivo = join(pasta, 'consulta.sql');
  writeFileSync(arquivo, sql);
  return execFileSync(npx, ['supabase', 'db', 'query', '--remote', '--read-only', '-o', 'table', '-f', arquivo], {
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

export const secoes = [
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
    'Desafios (só os dos últimos 30 dias: os mais antigos são apagados; o total de gerados está no funil)',
    `select
       (select count(*) from public.desafios) as enviados,
       (select count(distinct desafio_id) from public.partidas where modo = 'desafio' and desafio_id is not null and fechada_em is not null) as com_alguem_jogando,
       (select count(*) from public.partidas p join public.desafios d on d.id = p.desafio_id
          where p.modo = 'desafio' and p.fechada_em is not null and p.torcedor_id <> d.torcedor_id) as partidas_aceitas_por_outros,
       (select count(*) from public.partidas p join public.desafios d on d.id = p.desafio_id
          where p.modo = 'desafio' and p.fechada_em is not null and p.torcedor_id = d.torcedor_id) as revanches_do_proprio`,
  ],
  [
    'Desafios por pessoa, últimos 30 dias (o desafio nasce sozinho a cada partida normal: "enviado" não quer dizer compartilhado)',
    `with pessoas as (
       select d.torcedor_id, count(*) as gerados,
         count(*) filter (where exists (
           select 1 from public.partidas p where p.desafio_id = d.id and p.fechada_em is not null and p.torcedor_id <> d.torcedor_id)) as aceitos_por_outros
       from public.desafios d group by d.torcedor_id
     )
     select dense_rank() over (order by torcedor_id) as pessoa, gerados, aceitos_por_outros
     from pessoas order by gerados desc`,
  ],
  [
    'Aceites entre quem já jogava (testadores trocando X1) x aceites de quem chegou novo, desafios dos últimos 30 dias',
    `${base}
     select
       count(*) filter (where (select count(*) from fechadas q where q.torcedor_id = p.torcedor_id and q.fechada_em < p.fechada_em) > 0) as de_quem_ja_jogava,
       count(*) filter (where (select count(*) from fechadas q where q.torcedor_id = p.torcedor_id and q.fechada_em < p.fechada_em) = 0) as de_quem_chegou_novo
     from fechadas p join public.desafios d on d.id = p.desafio_id
     where p.modo = 'desafio' and p.torcedor_id <> d.torcedor_id`,
  ],
  [
    'Abriram o jogo e nunca fecharam uma partida (por dia de cadastro)',
    `select t.criado_em::date as dia, count(*) as torcedores
     from public.torcedores t
     where not exists (select 1 from public.partidas p where p.torcedor_id = t.id and p.fechada_em is not null)
     group by 1 order by 1`,
  ],
  [
    'Convites (jogadores cuja 1ª partida foi um desafio de outra pessoa; só acha o convite de desafio dos últimos 30 dias)',
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
  [
    'Seja sócio (cliques por clube; o aparelho conta no máximo 1 por clube por dia)',
    `select coalesce(clube, 'TODOS') as clube,
       coalesce(sum(cliques) filter (where dia >= public.semana_de(public.hoje_brasilia())), 0) as na_semana,
       coalesce(sum(cliques), 0) as total
     from public.socio_cliques
     group by rollup (clube)
     order by grouping(clube), total desc, clube`,
  ],
  [
    'Faixa etária (só a contagem por faixa, nunca por pessoa)',
    `select coalesce(faixa_etaria, 'sem resposta') as faixa, count(*) as torcedores
     from public.torcedores
     group by faixa_etaria
     order by faixa_etaria nulls last`,
  ],
  [
    'Aquecimento (jogo.md, 14.4; só contagem, o 1º desfecho de cada pessoa). Estação: 1 Pênalti, 2 Defesa, 3 Falta, 4 Prova, 5 Crava',
    `select desfecho, coalesce(estacao::text, '-') as estacao, count(*) as pessoas
     from public.aquecimento_contagem
     group by desfecho, estacao
     order by case desfecho when 'completou' then 0 when 'pulou' then 1 else 2 end, estacao`,
  ],
  ...secoesDoFunil(),
];

/**
 * Funil do X1 e onde desiste (docs/jogos/contas.md, "Contagem de uso"). "Compartilhados" são toques (Card e Link do
 * mesmo X1 contam 2); o bloco "ligado pelo código" conta X1 distintos, pela impressão, nos últimos 30 dias.
 * Os gerados de dias já fechados vêm da contagem (fica para sempre, mesmo depois que o X1 é apagado); os do dia
 * de hoje, e de algum dia ainda não contado, vêm direto das tabelas de X1.
 */
export function secoesDoFunil() {
  const gerados = `
    vivos as (
      select (criado_em at time zone 'America/Sao_Paulo')::date as dia, 'x1_penaltis' as tipo, count(*)::int as n from public.desafios group by 1
      union all
      select (criado_em at time zone 'America/Sao_Paulo')::date, 'x1_lances', count(*)::int from public.lances_desafios group by 1
      union all
      select (criado_em at time zone 'America/Sao_Paulo')::date, 'x1_prova', count(*)::int from public.prova_desafios group by 1
    ),
    gerados as (
      select dia, tipo, n from public.funil_contagem where evento = 'gerou'
      union all
      select v.dia, v.tipo, v.n from vivos v
      where not exists (select 1 from public.funil_contagem c where c.evento = 'gerou' and c.dia = v.dia and c.tipo = v.tipo)
    ),
    inicio as (select coalesce(min(dia), public.hoje_brasilia()) as d from public.funil_contagem where evento <> 'gerou'),
    passos as (
      select dia, tipo, evento, sum(n)::int as n from public.funil_contagem
      where evento <> 'gerou' and tipo like 'x1\\_%' group by 1, 2, 3
    )`;
  const colunas = `
    coalesce(sum(n) filter (where evento = 'compartilhou'), 0) as compartilhados,
    coalesce(sum(n) filter (where evento = 'abriu'), 0) as abertos,
    coalesce(sum(n) filter (where evento = 'viu_gols'), 0) as viu_os_gols,
    coalesce(sum(n) filter (where evento = 'aceitou'), 0) as aceitos,
    coalesce(sum(n) filter (where evento = 'primeiro_chute'), 0) as primeiro_chute,
    coalesce(sum(n) filter (where evento = 'terminou'), 0) as terminados,
    coalesce(sum(n) filter (where evento = 'revanche'), 0) as revanche`;
  return [
    [
      'Funil do X1 por tipo (desde o 1º dia da contagem)',
      `with ${gerados}
       select t.tipo,
         coalesce((select sum(g.n) from gerados g, inicio i where g.tipo = t.tipo and g.dia >= i.d), 0) as gerados,
         ${colunas}
       from (values ('x1_penaltis'), ('x1_lances'), ('x1_prova')) t (tipo)
       left join passos p on p.tipo = t.tipo
       group by t.tipo order by t.tipo`,
    ],
    [
      'Funil do X1 por dia e tipo (últimos 14 dias)',
      `with ${gerados},
       chaves as (
         select dia, tipo from gerados union select dia, tipo from passos
       )
       select k.dia, k.tipo,
         coalesce((select sum(g.n) from gerados g where g.dia = k.dia and g.tipo = k.tipo), 0) as gerados,
         ${colunas}
       from chaves k left join passos p on p.dia = k.dia and p.tipo = k.tipo
       where k.dia >= public.hoje_brasilia() - 13
       group by k.dia, k.tipo order by k.dia desc, k.tipo`,
    ],
    [
      'Funil do X1 ligado pelo código (X1 distintos compartilhados nos últimos 30 dias)',
      `with compartilhados as (
         select impressao, min(tipo) as tipo from public.funil_eventos where evento = 'compartilhou' group by impressao
       )
       select c.tipo, count(*) as compartilhados,
         count(*) filter (where exists (select 1 from public.funil_eventos e where e.impressao = c.impressao and e.evento = 'abriu')) as abertos,
         count(*) filter (where exists (select 1 from public.funil_eventos e where e.impressao = c.impressao and e.evento = 'viu_gols')) as viu_os_gols,
         count(*) filter (where exists (select 1 from public.funil_eventos e where e.impressao = c.impressao and e.evento = 'aceitou')) as aceitos,
         count(*) filter (where exists (
           select 1 from public.funil_eventos v join public.funil_eventos a on a.impressao = v.impressao and a.evento = 'aceitou'
           where v.impressao = c.impressao and v.evento = 'viu_gols' and a.criado_em >= v.criado_em
         )) as aceitou_depois_de_ver_os_gols,
         count(*) filter (where exists (select 1 from public.funil_eventos e where e.impressao = c.impressao and e.evento = 'primeiro_chute')) as primeiro_chute,
         count(*) filter (where exists (select 1 from public.funil_eventos e where e.impressao = c.impressao and e.evento = 'terminou')) as terminados,
         count(*) filter (where exists (select 1 from public.funil_eventos e where e.impressao = c.impressao and e.evento = 'revanche')) as revanche
       from compartilhados c group by c.tipo order by c.tipo`,
    ],
    [
      'Compartilhados por tipo e meio (últimos 30 dias; resultado = sem X1, por jogo)',
      `select tipo, nullif(jogo, '') as jogo,
         coalesce(sum(n) filter (where meio = 'grupo'), 0) as grupo,
         coalesce(sum(n) filter (where meio = 'card'), 0) as card,
         coalesce(sum(n) filter (where meio = 'stories'), 0) as stories,
         coalesce(sum(n) filter (where meio = 'emoji'), 0) as emoji,
         coalesce(sum(n) filter (where meio = 'link'), 0) as link,
         sum(n) as total
       from public.funil_contagem
       where evento = 'compartilhou' and dia >= public.hoje_brasilia() - 29
       group by tipo, jogo order by total desc`,
    ],
    [
      'Links que abriram o jogo (últimos 30 dias)',
      `select tipo, sum(n) as aberturas from public.funil_contagem
       where evento = 'abriu' and dia >= public.hoje_brasilia() - 29 group by tipo order by aberturas desc`,
    ],
    [
      'Onde desiste (últimos 30 dias; desistiu − voltou: quem foi pro WhatsApp e voltou não conta)',
      `select tipo as etapa, nullif(jogo, '') as jogo, case when x1 then 'X1' else '' end as fluxo,
         coalesce(sum(n) filter (where evento = 'desistiu'), 0) as saiu,
         coalesce(sum(n) filter (where evento = 'voltou'), 0) as voltou,
         coalesce(sum(n) filter (where evento = 'desistiu'), 0) - coalesce(sum(n) filter (where evento = 'voltou'), 0) as desistiu
       from public.funil_contagem
       where evento in ('desistiu', 'voltou') and dia >= public.hoje_brasilia() - 29
       group by tipo, jogo, x1
       order by case tipo when 'triagem' then 0 when 'escolha_time' then 1 when 'aquecimento' then 2 else 3 end, jogo, x1 desc`,
    ],
  ];
}

// Só roda quando chamado (npm run metricas); o teste importa as seções para rodar o SQL no PGlite.
// Caminho real e em minúsculas: no Windows a letra do disco muda de caixa, e junção ou subst muda o caminho.
const real = (c) => { try { return realpathSync(c).toLowerCase(); } catch { return ''; } };
if (process.argv[1] && real(fileURLToPath(import.meta.url)) === real(resolve(process.argv[1]))) {
  pasta = mkdtempSync(join(tmpdir(), 'metricas-'));
  console.log('Métricas do Guerra de Torcidas (só leitura)');
  for (const [titulo, sql] of secoes) {
    console.log(`\n## ${titulo}`);
    console.log(consulta(sql));
  }

  rmSync(pasta, { recursive: true, force: true });

  console.log('\n## Balanço entre minigames');
  rodarBalanco();
}
