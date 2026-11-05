-- Ranking de 52 semanas e Galeria de Troféus (docs/jogo.md, seção 5, "Longo prazo"): só leitura.
-- Nada novo é gravado: tudo sai do que fechamento_semana, temporada, temporada_serie e
-- ranking_cidade_semana já guardam. Só acrescenta funções: nenhuma coluna ou tabela é apagada ou renomeada.
-- Nenhuma função devolve dado de jogador: só torcidas e cidades.

-- ---------------------------------------------------------------------------
-- 1. Pré-temporada fora da Galeria
-- ---------------------------------------------------------------------------
-- A semana cai num mês de teste ou antes dele. Os meses de teste são seguidos (o mês seguinte herda a
-- marca) e o zerar apaga todos, junto com as semanas: antes do zerar, toda semana gravada é de teste,
-- inclusive as de outubro de 2026, que não têm linha em temporada; depois dele, nenhuma é.
create function public.semana_pre_temporada(p_semana date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.temporada t
    where t.pre_temporada and p_semana < (t.mes + interval '1 month')::date
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Ranking de 52 semanas (estilo tênis)
-- ---------------------------------------------------------------------------
-- As 52 semanas travadas mais recentes, pela posição no ranking GERAL dos 20 times (não pela série):
-- tabela de 20 posições, a mesma da série única (pontos_campeonato 'unica'). Semana com ativos 0 vale 0,
-- seja qual for a posição, e não é vitória. Empate: mais vitórias de semana (1º geral com gente jogando),
-- depois a melhor posição na última semana da janela, que vale mesmo com ativos 0, como na temporada.
-- Sem semana travada, os 20 times aparecem com 0, em ordem de id. Na pré-temporada mostra as semanas de
-- teste, que o zerar apaga junto com fechamento_semana.
create function public.ranking_52_semanas()
returns table (
  posicao integer, time_id text, pontos integer, vitorias integer, ultima_posicao integer,
  semanas integer, desde date, ate date
)
language sql
stable
security definer
set search_path = ''
as $$
  with janela as (
    select s.semana
    from (select distinct f.semana from public.fechamento_semana f where f.confirmada_em is not null) s
    order by s.semana desc
    limit 52
  ),
  limites as (
    select count(*)::integer as semanas, min(j.semana) as desde, max(j.semana) as ate from janela j
  ),
  somas as (
    select f.time_id,
      sum(case when f.ativos > 0 then public.pontos_campeonato('unica', f.posicao_campeao) else 0 end)::integer
        as pontos,
      count(*) filter (where f.ativos > 0 and f.posicao_campeao = 1)::integer as vitorias,
      max(f.posicao_campeao) filter (where f.semana = l.ate)::integer as ultima_posicao
    from public.fechamento_semana f
    join janela j on j.semana = f.semana
    cross join limites l
    where f.confirmada_em is not null
    group by f.time_id
  )
  select
    row_number() over (
      order by coalesce(s.pontos, 0) desc, coalesce(s.vitorias, 0) desc, s.ultima_posicao asc nulls last, t.id
    )::integer,
    t.id, coalesce(s.pontos, 0), coalesce(s.vitorias, 0), s.ultima_posicao, l.semanas, l.desde, l.ate
  from public.times t
  cross join limites l
  left join somas s on s.time_id = t.id
  where t.oficial
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- 3. Galeria de Troféus das torcidas
-- ---------------------------------------------------------------------------
-- Uma linha por troféu. prateleira 'trofeus' ou 'vitrine' (Maior torcida, que é soma e não título).
-- Troféus de semana (semana preenchida), só de semana travada fora da pré-temporada:
--   campeao_semana: o 1º da própria série (decidido em 05/11/2026), como a vitória de semana da
--     temporada. A série é a do mês da segunda-feira; mês sem temporada (as semanas entre o zerar e a
--     estreia) ou de série única dá um campeão só, serie 'unica'. Série sem ninguém jogando não tem campeão.
--   maior_torcida: o 1º em soma, geral, só com soma acima de 0.
-- Troféus de mês (mes preenchido), só de temporada fechada fora da pré-temporada:
--   campeao_temporada (1º da A), campeao_serie_b, acesso (da B para a A), rebaixamento (da A para a B)
--   e campeao_estreia. A série única da estreia manda os 10 primeiros para a A, mas isso não é acesso.
-- Dérbi e meta coletiva ainda não existem. p_time_id nulo devolve todas as torcidas.
create function public.galeria_trofeus(p_time_id text default null)
returns table (trofeu text, prateleira text, time_id text, semana date, mes date, serie text)
language sql
stable
security definer
set search_path = ''
as $$
  with semanas as (
    select f.semana, f.time_id, f.ativos, f.soma, f.posicao_campeao, f.posicao_soma,
      coalesce(s.serie, 'unica') as serie
    from public.fechamento_semana f
    left join public.temporada_serie s
      on s.mes = date_trunc('month', f.semana::timestamp)::date and s.time_id = f.time_id
    where f.confirmada_em is not null and not public.semana_pre_temporada(f.semana)
  ),
  na_serie as (
    select o.*, row_number() over (partition by o.semana, o.serie order by o.posicao_campeao) as n
    from semanas o
  ),
  trofeus as (
    select 'campeao_semana' as trofeu, 'trofeus' as prateleira, o.time_id, o.semana, null::date as mes, o.serie
    from na_serie o
    where o.n = 1 and o.ativos > 0
    union all
    select 'maior_torcida', 'vitrine', o.time_id, o.semana, null, null
    from semanas o
    where o.posicao_soma = 1 and o.soma > 0
    union all
    select v.trofeu, 'trofeus', s.time_id, null, s.mes, s.serie
    from public.temporada_serie s
    join public.temporada t on t.mes = s.mes and t.fechada_em is not null and not t.pre_temporada
    cross join lateral (values
      ('campeao_temporada', s.serie = 'a' and s.posicao_final = 1),
      ('campeao_serie_b', s.serie = 'b' and s.posicao_final = 1),
      ('acesso', s.serie = 'b' and s.destino = 'a'),
      ('rebaixamento', s.serie = 'a' and s.destino = 'b')
    ) v (trofeu, ganhou)
    where v.ganhou
    union all
    select 'campeao_estreia', 'trofeus', t.campeao_estreia_id, null, t.mes, 'unica'
    from public.temporada t
    where t.campeao_estreia_id is not null and t.fechada_em is not null and not t.pre_temporada
  )
  select x.trofeu, x.prateleira, x.time_id, x.semana, x.mes, x.serie
  from trofeus x
  where p_time_id is null or x.time_id = p_time_id
  order by coalesce(x.semana, x.mes) desc, x.prateleira, x.trofeu, x.serie, x.time_id;
$$;

-- ---------------------------------------------------------------------------
-- 4. Galeria das cidades: campeã do estado na semana (decidido em 05/11/2026)
-- ---------------------------------------------------------------------------
-- A cidade 1ª do seu estado (só tem posição quem teve 5+ jogadores, a mesma lista de ranking_cidades)
-- em semana travada fora da pré-temporada. É troféu de cidade, não de torcida: por isso fica fora de
-- galeria_trofeus. Semana travada não muda ranking_cidade_semana, então a tabela é a semana fechada.
create function public.galeria_cidades(p_uf text default null, p_codigo integer default null)
returns table (semana date, uf text, codigo integer, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.semana, r.uf, r.cidade, m.nome
  from public.ranking_cidade_semana r
  join public.municipios m on m.codigo = r.cidade
  where r.posicao_estado = 1
    and public.semana_travada(r.semana)
    and not public.semana_pre_temporada(r.semana)
    and (p_uf is null or r.uf = upper(p_uf))
    and (p_codigo is null or r.cidade = p_codigo)
  order by r.semana desc, r.uf;
$$;

-- ---------------------------------------------------------------------------
-- 5. Permissões explícitas
-- ---------------------------------------------------------------------------
revoke execute on function public.semana_pre_temporada(date), public.ranking_52_semanas(),
  public.galeria_trofeus(text), public.galeria_cidades(text, integer)
  from public, anon, authenticated;
grant execute on function public.semana_pre_temporada(date) to service_role;
grant execute on function public.ranking_52_semanas(), public.galeria_trofeus(text),
  public.galeria_cidades(text, integer)
  to anon, authenticated, service_role;
-- A conferência pelo Supabase CLI 3 (`db query --remote --read-only`) roda como supabase_read_only_user.
-- As quatro só leem (stable), e a transação do --read-only continua só leitura.
grant execute on function public.semana_pre_temporada(date), public.ranking_52_semanas(),
  public.galeria_trofeus(text), public.galeria_cidades(text, integer)
  to supabase_read_only_user;
