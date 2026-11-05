-- Cidade, a segunda camisa (docs/jogo.md, seção 3, "Cidade", e seção 5, "Cidades e estados"). Só acrescenta:
-- nenhuma coluna ou tabela é apagada ou renomeada, e a conta do ranking dos times não muda.
--
-- Como funciona:
--   - O jogador escolhe um município do IBGE (lista fechada em `municipios`, carregada por
--     20261105000100_municipios.sql). Cada escolha vira uma linha em `torcedor_cidades`, com a hora.
--   - Um ponto conta para a cidade que valia na hora em que ele entrou no placar (o `quando` de
--     pontos_semana: o fechamento da partida, do Time do Dia ou o ponto do Crava). Assim "pontos de antes
--     de escolher não contam" e "troca livre, os pontos ficam onde foram feitos" saem do histórico, sem
--     mexer em nenhuma função que grava partida.
--   - Cidade e estado usam a conta da semana: média dos 30 melhores (100 no estado), com as vagas vazias
--     a 80% da média geral de quem somou para alguma cidade na semana (decidido em 04/11/2026).
--   - Só cidade e estado com 5 ou mais jogadores na semana entram no ranking (decidido em 26/10 para a
--     cidade e em 04/11/2026 para o estado). Abaixo disso, a cidade soma só para o estado.
--   - A rotina do minuto refaz cidades e estados depois dos times, num bloco próprio: erro na cidade não
--     segura o ranking dos times. O fechamento da semana refaz uma última vez antes da trava; semana
--     travada não muda mais, então a própria tabela guarda a semana fechada (base da Galeria).
--   - Quem apaga os dados (ou sai na limpeza ou na junção de contas) deixa os pontos na cidade, como no time.
--   - A cidade nunca aparece junto do apelido: as tabelas de ranking não têm leitura direta e as funções
--     públicas só devolvem cidade e estado com 5+.

-- ---------------------------------------------------------------------------
-- 1. Municípios do IBGE: código de 7 dígitos, nome e UF. Leitura pública; a carga vem na migração seguinte.
-- ---------------------------------------------------------------------------
create table public.municipios (
  codigo integer primary key check (codigo between 1100000 and 5399999),
  nome text not null check (char_length(nome) between 1 and 80),
  uf text not null check (uf ~ '^[A-Z]{2}$')
);
create index municipios_uf on public.municipios (uf);

alter table public.municipios enable row level security;
create policy "municipios: leitura para todos" on public.municipios
  for select to anon, authenticated using (true);
revoke all on public.municipios from anon, authenticated;
grant select on public.municipios to anon, authenticated;
grant all on public.municipios to service_role;

-- ---------------------------------------------------------------------------
-- 2. Histórico da cidade de cada torcedor. `codigo` nulo = tirou a cidade. Cada um lê só o seu; escrever,
--    só por escolher_cidade.
-- ---------------------------------------------------------------------------
create table public.torcedor_cidades (
  id bigint generated always as identity primary key,
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  codigo integer references public.municipios (codigo),
  desde timestamptz not null default now()
);
create index torcedor_cidades_vigente on public.torcedor_cidades (torcedor_id, desde desc, id desc);
create index torcedor_cidades_codigo on public.torcedor_cidades (codigo);

alter table public.torcedor_cidades enable row level security;
create policy "torcedor_cidades: cada um lê o seu" on public.torcedor_cidades
  for select to authenticated using (torcedor_id = (select auth.uid()));
create policy "torcedor_cidades: escrita só pelo servidor" on public.torcedor_cidades
  as restrictive for insert to anon, authenticated with check (false);
revoke all on public.torcedor_cidades from anon, authenticated;
grant select on public.torcedor_cidades to authenticated;
grant all on public.torcedor_cidades to service_role;

-- ---------------------------------------------------------------------------
-- 3. Pontos de quem saiu do jogo, por cidade (o par de pontos_apagados, que guarda só o time). Sem id da
--    pessoa: `pessoa` é um id sorteado na hora de apagar, igual nas linhas da mesma pessoa, para quem somou
--    em duas cidades do mesmo estado continuar contando uma vez só no estado.
-- ---------------------------------------------------------------------------
create table public.pontos_apagados_cidade (
  id uuid primary key default gen_random_uuid(),
  pessoa uuid not null,
  semana date not null,
  cidade integer not null references public.municipios (codigo),
  total integer not null,
  ultima timestamptz
);
create index pontos_apagados_cidade_semana on public.pontos_apagados_cidade (semana);
create index pontos_apagados_cidade_cidade on public.pontos_apagados_cidade (cidade);

alter table public.pontos_apagados_cidade enable row level security;
revoke all on public.pontos_apagados_cidade from anon, authenticated;
grant all on public.pontos_apagados_cidade to service_role;
create policy "ninguém pelo cliente" on public.pontos_apagados_cidade
  as restrictive for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 4. Rankings da semana. Guardam toda cidade e estado com pontos (a cidade abaixo de 5 precisa saber
--    quantos faltam), com posição só para quem tem 5+. Sem leitura direta pelo celular: só pelas funções
--    da seção 7, que filtram.
-- ---------------------------------------------------------------------------
create table public.ranking_cidade_semana (
  semana date not null,
  cidade integer not null references public.municipios (codigo),
  uf text not null,
  ativos integer not null,
  soma integer not null,
  media30 numeric not null,
  chegou_em timestamptz,
  posicao_estado integer,
  posicao_nacional integer,
  atualizado_em timestamptz not null default now(),
  primary key (semana, cidade)
);
create index ranking_cidade_semana_uf on public.ranking_cidade_semana (semana, uf, posicao_estado);
create index ranking_cidade_semana_nacional on public.ranking_cidade_semana (semana, posicao_nacional);
create index ranking_cidade_semana_cidade on public.ranking_cidade_semana (cidade);

-- `media` é a média dos 100 melhores do estado (a mesma conta da cidade, com 100 vagas).
create table public.ranking_estado_semana (
  semana date not null,
  uf text not null,
  ativos integer not null,
  soma integer not null,
  media numeric not null,
  chegou_em timestamptz,
  posicao integer,
  atualizado_em timestamptz not null default now(),
  primary key (semana, uf)
);

alter table public.ranking_cidade_semana enable row level security;
alter table public.ranking_estado_semana enable row level security;
revoke all on public.ranking_cidade_semana, public.ranking_estado_semana from anon, authenticated;
grant all on public.ranking_cidade_semana, public.ranking_estado_semana to service_role;
create policy "ninguém pelo cliente" on public.ranking_cidade_semana
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "ninguém pelo cliente" on public.ranking_estado_semana
  as restrictive for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 5. A conta.
-- ---------------------------------------------------------------------------

-- Total de cada torcedor em cada cidade na semana: cada ponto vai para a cidade que valia na hora dele.
-- Mesmo filtro de totais_semana (a pessoa entra se fechou partida ou somou ponto). Inclui "Outro time".
create or replace function public.totais_cidade_semana(p_semana date)
returns table (torcedor_id uuid, cidade integer, uf text, total integer, ultima timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.torcedor_id, c.codigo, m.uf, greatest(sum(x.pontos), 0)::integer, max(x.quando)
  from public.pontos_semana(p_semana) x
  cross join lateral (
    select h.codigo from public.torcedor_cidades h
    where h.torcedor_id = x.torcedor_id and h.desde <= x.quando
    order by h.desde desc, h.id desc
    limit 1
  ) c
  join public.municipios m on m.codigo = c.codigo
  group by x.torcedor_id, c.codigo, m.uf
  having bool_or(x.de_partida) or sum(x.pontos) > 0;
$$;

-- Refaz cidades e estados de uma semana. Uma semana por vez (trava própria, sempre pega depois da trava
-- de ranking_semana por quem segura as duas). Regrava só o que mudou e apaga o que deixou de existir
-- (suspeita, por exemplo). Semana travada não muda. Devolve se mudou alguma coisa: quem chama decide o
-- aviso às telas (avisar_cidades), para a rotina mandar no máximo um por semana a cada minuto.
create or replace function public.recalcular_cidades(p_semana date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mudou bigint;
begin
  perform pg_advisory_xact_lock(hashtext('ranking_cidade'), p_semana - date '2000-01-03');
  if public.semana_travada(p_semana) then
    return false;
  end if;

  with totais as materialized (
    select t.torcedor_id::text as quem, t.cidade, t.uf, t.total, t.ultima
    from public.totais_cidade_semana(p_semana) t
    union all
    select a.pessoa::text, a.cidade, m.uf, a.total, a.ultima
    from public.pontos_apagados_cidade a
    join public.municipios m on m.codigo = a.cidade
    where a.semana = p_semana
  ),
  -- Média por pessoa: quem trocou de cidade na semana conta uma vez, com o total da semana.
  geral as (
    select coalesce(avg(p.total), 0) as media
    from (select o.quem, sum(o.total) as total from totais o group by o.quem) p
  ),
  -- Cidades: 30 vagas.
  cid_ord as (
    select o.*, row_number() over (partition by o.cidade order by o.total desc, o.ultima asc) as n
    from totais o
  ),
  cid as (
    select o.cidade, min(o.uf) as uf, count(*)::integer as ativos, sum(o.total)::integer as soma,
      coalesce(sum(o.total) filter (where o.n <= 30), 0) as soma30,
      count(*) filter (where o.n <= 30) as n30,
      max(o.ultima) as chegou_em
    from cid_ord o
    group by o.cidade
  ),
  cid_calc as (
    select c.*, round((c.soma30 + (30 - c.n30) * 0.8 * g.media) / 30, 2) as media30
    from cid c cross join geral g
  ),
  cid_pos as (
    select c.cidade, c.uf, c.ativos, c.soma, c.media30, c.chegou_em,
      case when c.ativos >= 5 then row_number() over (
        partition by c.uf, c.ativos >= 5 order by c.media30 desc, c.chegou_em asc nulls last, c.cidade) end::integer
        as posicao_estado,
      case when c.ativos >= 5 then row_number() over (
        partition by c.ativos >= 5 order by c.media30 desc, c.chegou_em asc nulls last, c.cidade) end::integer
        as posicao_nacional
    from cid_calc c
  ),
  -- Estados: 100 vagas. Quem somou para duas cidades do mesmo estado conta uma vez só nele.
  est_base as (
    select o.quem, o.uf, sum(o.total) as total, max(o.ultima) as ultima
    from totais o
    group by o.quem, o.uf
  ),
  est_ord as (
    select o.*, row_number() over (partition by o.uf order by o.total desc, o.ultima asc) as n
    from est_base o
  ),
  est as (
    select o.uf, count(*)::integer as ativos, sum(o.total)::integer as soma,
      coalesce(sum(o.total) filter (where o.n <= 100), 0) as soma100,
      count(*) filter (where o.n <= 100) as n100,
      max(o.ultima) as chegou_em
    from est_ord o
    group by o.uf
  ),
  est_pos as (
    select e.uf, e.ativos, e.soma, round((e.soma100 + (100 - e.n100) * 0.8 * g.media) / 100, 2) as media, e.chegou_em
    from est e cross join geral g
  ),
  est_fim as (
    select e.*,
      case when e.ativos >= 5 then row_number() over (
        partition by e.ativos >= 5 order by e.media desc, e.chegou_em asc nulls last, e.uf) end::integer as posicao
    from est_pos e
  ),
  grava_cid as (
    insert into public.ranking_cidade_semana as r
      (semana, cidade, uf, ativos, soma, media30, chegou_em, posicao_estado, posicao_nacional, atualizado_em)
    select p_semana, c.cidade, c.uf, c.ativos, c.soma, c.media30, c.chegou_em, c.posicao_estado,
      c.posicao_nacional, now()
    from cid_pos c
    on conflict (semana, cidade) do update set
      uf = excluded.uf,
      ativos = excluded.ativos,
      soma = excluded.soma,
      media30 = excluded.media30,
      chegou_em = excluded.chegou_em,
      posicao_estado = excluded.posicao_estado,
      posicao_nacional = excluded.posicao_nacional,
      atualizado_em = excluded.atualizado_em
    where (r.ativos, r.soma, r.media30, r.chegou_em, r.posicao_estado, r.posicao_nacional)
      is distinct from (excluded.ativos, excluded.soma, excluded.media30, excluded.chegou_em,
                        excluded.posicao_estado, excluded.posicao_nacional)
    returning 1
  ),
  tira_cid as (
    delete from public.ranking_cidade_semana r
    where r.semana = p_semana and not exists (select 1 from cid_pos c where c.cidade = r.cidade)
    returning 1
  ),
  grava_est as (
    insert into public.ranking_estado_semana as r
      (semana, uf, ativos, soma, media, chegou_em, posicao, atualizado_em)
    select p_semana, e.uf, e.ativos, e.soma, e.media, e.chegou_em, e.posicao, now()
    from est_fim e
    on conflict (semana, uf) do update set
      ativos = excluded.ativos,
      soma = excluded.soma,
      media = excluded.media,
      chegou_em = excluded.chegou_em,
      posicao = excluded.posicao,
      atualizado_em = excluded.atualizado_em
    where (r.ativos, r.soma, r.media, r.chegou_em, r.posicao)
      is distinct from (excluded.ativos, excluded.soma, excluded.media, excluded.chegou_em, excluded.posicao)
    returning 1
  ),
  tira_est as (
    delete from public.ranking_estado_semana r
    where r.semana = p_semana and not exists (select 1 from est_fim e where e.uf = r.uf)
    returning 1
  )
  select (select count(*) from grava_cid) + (select count(*) from tira_cid)
       + (select count(*) from grava_est) + (select count(*) from tira_est)
  into v_mudou;

  return v_mudou > 0;
end;
$$;

-- Aviso às telas quando as cidades mudaram. Se o ranking dos times já subiu a versão nesta transação
-- (versão diferente da lida antes), não sobe de novo: uma mensagem do Realtime por semana a cada minuto.
-- Com `p_times_ok` falso (a conta dos times deu erro) também não sobe: atualizado_em diz à tela de
-- resultado que ranking_semana já tem a partida dela, e ele não teria.
create or replace function public.avisar_cidades(p_semana date, p_versao_antes bigint, p_times_ok boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ranking_aviso as v (semana)
  select p_semana
  where p_times_ok
    and (select a.versao from public.ranking_aviso a where a.semana = p_semana) is not distinct from p_versao_antes
  on conflict (semana) do update set versao = v.versao + 1, atualizado_em = now();
$$;

-- Igual ao de 20261102100000_ranking_por_minuto.sql, mais cidades e estados num bloco próprio depois dos
-- times: se a conta da cidade der erro, o ranking dos times da semana fica gravado e a fila sai do mesmo
-- jeito (a cidade volta a ser refeita no próximo ponto daquela semana).
create or replace function public.atualizar_rankings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semana date;
  v_feitas integer := 0;
  v_versao bigint;
  v_times_ok boolean;
begin
  for v_semana in select distinct f.semana from public.ranking_fila f order by 1 loop
    select a.versao into v_versao from public.ranking_aviso a where a.semana = v_semana;
    v_times_ok := false;
    begin
      delete from public.ranking_fila f where f.semana = v_semana;
      perform public.recalcular_ranking(v_semana);
      v_feitas := v_feitas + 1;
      v_times_ok := true;
    exception when others then
      raise warning 'ranking da semana % não refez: %', v_semana, sqlerrm;
    end;
    begin
      if public.recalcular_cidades(v_semana) then
        perform public.avisar_cidades(v_semana, v_versao, v_times_ok);
      end if;
    exception when others then
      raise warning 'cidades da semana % não refez: %', v_semana, sqlerrm;
    end;
  end loop;
  return v_feitas;
end;
$$;

-- Igual ao de 20261103000100_travas_limpeza_e_fechamento.sql, mais cidades e estados refeitos antes de
-- gravar (a fila da semana já saiu no começo), na mesma condição dos times: na confirmação, sem anotação na
-- fila, a semana fica como está (suspeita liberada tarde não volta para a cidade, como não volta para o
-- time). Num bloco próprio: erro na cidade não segura o fechamento dos times; se for na confirmação, a
-- cidade daquela semana fica como estava, só com o aviso no log. Quando a semana trava, a tabela das
-- cidades para de mudar.
create or replace function public.fechar_semana(p_semana date, p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_confirmar boolean := v_agora >= (p_semana + 7)::timestamp + interval '12 hours';
  v_anotada boolean;
  v_versao bigint;
begin
  if v_agora::date < p_semana + 7 or public.semana_travada(p_semana) then
    return;
  end if;

  with feitas as (delete from public.ranking_fila f where f.semana = p_semana returning 1)
  select count(*) > 0 into v_anotada from feitas;

  perform pg_advisory_xact_lock(hashtext('ranking_semana'), p_semana - date '2000-01-03');
  if public.semana_travada(p_semana) then
    return;
  end if;

  select a.versao into v_versao from public.ranking_aviso a where a.semana = p_semana;

  if not v_confirmar or v_anotada or not exists (select 1 from public.ranking_semana r where r.semana = p_semana) then
    perform public.recalcular_ranking(p_semana);
  end if;

  if not v_confirmar or v_anotada
     or not exists (select 1 from public.ranking_estado_semana e where e.semana = p_semana) then
    begin
      if public.recalcular_cidades(p_semana) then
        perform public.avisar_cidades(p_semana, v_versao, true);
      end if;
    exception when others then
      raise warning 'cidades da semana % não refez no fechamento: %', p_semana, sqlerrm;
    end;
  end if;

  insert into public.fechamento_semana as f
    (semana, time_id, ativos, soma, media30, chegou_em, posicao_campeao, posicao_soma, gravado_em, confirmada_em)
  select r.semana, r.time_id, r.ativos, r.soma, r.media30, r.chegou_em, r.posicao_campeao, r.posicao_soma,
    p_agora, case when v_confirmar then p_agora end
  from public.ranking_semana r
  where r.semana = p_semana
  on conflict (semana, time_id) do update set
    ativos = excluded.ativos,
    soma = excluded.soma,
    media30 = excluded.media30,
    chegou_em = excluded.chegou_em,
    posicao_campeao = excluded.posicao_campeao,
    posicao_soma = excluded.posicao_soma,
    gravado_em = excluded.gravado_em,
    confirmada_em = excluded.confirmada_em;

  if v_confirmar then
    perform public.carreira_bonus_semana(p_semana);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Quem sai do jogo deixa os pontos na cidade. Os três caminhos (apagar_meus_dados, apagar_contas_paradas
--    e juntar_torcedores) apagam a conta em auth.users; o gatilho roda antes da cascata, com as partidas e o
--    histórico ainda lá. Só semanas abertas: semana travada não é refeita. Se a conta der erro, a exclusão
--    segue sem os pontos da cidade, só com o aviso no log: apagar os dados é direito da pessoa e não trava.
-- ---------------------------------------------------------------------------
create or replace function public.guardar_pontos_da_cidade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pessoa uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.torcedor_cidades h where h.torcedor_id = old.id) then
    return old;
  end if;

  begin
    insert into public.pontos_apagados_cidade (pessoa, semana, cidade, total, ultima)
    select v_pessoa, s.semana, t.cidade, t.total, t.ultima
    from (
      select x.semana from (
        select p.semana from public.partidas p where p.torcedor_id = old.id and p.semana is not null
        union
        select public.semana_de(d.dia) from public.dia_partidas d where d.torcedor_id = old.id
        union
        select c.semana from public.crava_pontos c where c.torcedor_id = old.id
      ) x
      where not public.semana_travada(x.semana)
    ) s
    cross join lateral public.totais_cidade_semana(s.semana) t
    where t.torcedor_id = old.id and t.total > 0;
  exception when others then
    raise warning 'pontos da cidade de quem saiu não guardados: %', sqlerrm;
  end;

  return old;
end;
$$;

revoke execute on function public.guardar_pontos_da_cidade() from public, anon, authenticated, service_role;

create trigger guardar_pontos_da_cidade
  before delete on auth.users
  for each row execute function public.guardar_pontos_da_cidade();

-- ---------------------------------------------------------------------------
-- 7. Funções para as telas.
-- ---------------------------------------------------------------------------

-- Escolhe, troca ou tira (null) a cidade. Vale dali em diante. Até 20 trocas por dia, para ninguém encher o
-- histórico.
create or replace function public.escolher_cidade(p_codigo integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_atual integer;
begin
  if v_uid is null then
    raise exception 'sem_login' using errcode = '28000';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if not exists (select 1 from public.torcedores t where t.id = v_uid) then
    raise exception 'sem_torcedor' using errcode = 'P0001';
  end if;
  if p_codigo is not null and not exists (select 1 from public.municipios m where m.codigo = p_codigo) then
    raise exception 'cidade_invalida' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('escolher_cidade'), hashtext(v_uid::text));

  select h.codigo into v_atual
  from public.torcedor_cidades h
  where h.torcedor_id = v_uid
  order by h.desde desc, h.id desc
  limit 1;
  if coalesce(v_atual, -1) = coalesce(p_codigo, -1) then
    return;
  end if;

  if (select count(*) from public.torcedor_cidades h
      where h.torcedor_id = v_uid and h.desde > now() - interval '1 day') >= 20 then
    raise exception 'muitas_trocas' using errcode = 'P0001';
  end if;

  insert into public.torcedor_cidades (torcedor_id, codigo) values (v_uid, p_codigo);
end;
$$;

-- A cidade de agora (vazio = sem cidade).
create or replace function public.minha_cidade()
returns table (codigo integer, nome text, uf text, desde timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.codigo, m.nome, m.uf, h.desde
  from (
    select h.codigo, h.desde from public.torcedor_cidades h
    where h.torcedor_id = auth.uid()
    order by h.desde desc, h.id desc
    limit 1
  ) h
  join public.municipios m on m.codigo = h.codigo
  where public.sessao_ativa();
$$;

-- A cidade de agora na semana: quantos jogaram, quantos faltam para entrar, posição no estado, rival (a
-- cidade logo acima; a líder enfrenta a 2ª) e a posição do estado. Posição, média e rival só com 5+.
create or replace function public.minha_cidade_semana(p_semana date)
returns table (
  codigo integer, nome text, uf text, ativos integer, minimo integer, faltam integer,
  posicao_estado integer, cidades_no_estado integer, media30 numeric,
  rival_codigo integer, rival_nome text, rival_media30 numeric, rival_acima boolean,
  uf_posicao integer, estados_no_ranking integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with eu as (
    select c.codigo, c.nome, c.uf from public.minha_cidade() c
  ),
  r as (
    select x.* from public.ranking_cidade_semana x join eu on x.cidade = eu.codigo
    where x.semana = p_semana
  ),
  rival as (
    select y.cidade, m.nome, y.media30, r.posicao_estado > 1 as acima
    from r
    join public.ranking_cidade_semana y
      on y.semana = p_semana and y.uf = r.uf
     and y.posicao_estado = case when r.posicao_estado = 1 then 2 else r.posicao_estado - 1 end
    join public.municipios m on m.codigo = y.cidade
    where r.posicao_estado is not null
  )
  select eu.codigo, eu.nome, eu.uf,
    coalesce(r.ativos, 0), 5, greatest(5 - coalesce(r.ativos, 0), 0),
    r.posicao_estado,
    (select count(*)::integer from public.ranking_cidade_semana x
     where x.semana = p_semana and x.uf = eu.uf and x.posicao_estado is not null),
    case when r.posicao_estado is not null then r.media30 end,
    rival.cidade, rival.nome, rival.media30, rival.acima,
    (select e.posicao from public.ranking_estado_semana e where e.semana = p_semana and e.uf = eu.uf),
    (select count(*)::integer from public.ranking_estado_semana e where e.semana = p_semana and e.posicao is not null)
  from eu
  left join r on true
  left join rival on true;
$$;

-- Cidades de um estado, só as com 5+.
create or replace function public.ranking_cidades(p_semana date, p_uf text)
returns table (posicao integer, codigo integer, nome text, uf text, ativos integer, media30 numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select r.posicao_estado, r.cidade, m.nome, r.uf, r.ativos, r.media30
  from public.ranking_cidade_semana r
  join public.municipios m on m.codigo = r.cidade
  where r.semana = p_semana and r.uf = upper(p_uf) and r.posicao_estado is not null
  order by r.posicao_estado;
$$;

-- As 20 primeiras do país.
create or replace function public.ranking_cidades_top(p_semana date)
returns table (posicao integer, codigo integer, nome text, uf text, ativos integer, media30 numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select r.posicao_nacional, r.cidade, m.nome, r.uf, r.ativos, r.media30
  from public.ranking_cidade_semana r
  join public.municipios m on m.codigo = r.cidade
  where r.semana = p_semana and r.posicao_nacional <= 20
  order by r.posicao_nacional;
$$;

-- Estados com 5+. `media30` aqui é a média dos 100 melhores (mesmo nome de coluna das cidades, para a tela).
create or replace function public.ranking_estados(p_semana date)
returns table (posicao integer, uf text, ativos integer, media30 numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select e.posicao, e.uf, e.ativos, e.media
  from public.ranking_estado_semana e
  where e.semana = p_semana and e.posicao is not null
  order by e.posicao;
$$;

-- Igual ao de 20261103400000_codigo_torcedor.sql, mais a cidade de agora e quantas vezes ela foi escolhida.
create or replace function public.ver_meus_dados()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eu as (select auth.uid() as id)
  select case when eu.id is null or not public.sessao_ativa() then null else jsonb_build_object(
    'torcedor', (
      select jsonb_build_object('time_id', t.time_id, 'apelido', t.apelido, 'faixa_etaria', t.faixa_etaria, 'criado_em', t.criado_em)
      from public.torcedores t where t.id = eu.id
    ),
    'cidade', (
      select jsonb_build_object('codigo', c.codigo, 'nome', c.nome, 'uf', c.uf, 'desde', c.desde)
      from public.minha_cidade() c
    ),
    'escolhas_de_cidade', (select count(*)::integer from public.torcedor_cidades h where h.torcedor_id = eu.id),
    'partidas', (
      select coalesce(jsonb_object_agg(x.minigame, x.n), '{}'::jsonb)
      from (
        select p.minigame, count(*)::integer as n from public.partidas p
        where p.torcedor_id = eu.id and p.fechada_em is not null
        group by p.minigame
      ) x
    ),
    'time_do_dia', (select count(*)::integer from public.dia_partidas d where d.torcedor_id = eu.id),
    'desafios', (
      (select count(*) from public.desafios d where d.torcedor_id = eu.id)
      + (select count(*) from public.prova_desafios d where d.torcedor_id = eu.id)
    )::integer,
    'palpites', (select count(*)::integer from public.palpites p where p.torcedor_id = eu.id),
    'carreira_xp', (select c.xp from public.carreira_de(eu.id) c),
    'gols_lances', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id),
    'avisos', (select count(*)::integer from public.push_inscricoes i where i.torcedor_id = eu.id),
    'aparelhos', (
      select count(*)::integer from auth.sessions s
      where s.user_id = eu.id and (s.not_after is null or s.not_after > now())
    ),
    'mensagens', (
      select coalesce(jsonb_agg(jsonb_build_object('tipo', f.tipo, 'texto', f.texto, 'tela', f.tela, 'aparelho', f.aparelho, 'criado_em', f.criado_em)
        order by f.criado_em desc), '[]'::jsonb)
      from public.feedbacks f where f.usuario_id = eu.id
    )
  ) end
  from eu;
$$;

-- ---------------------------------------------------------------------------
-- 8. Permissões.
-- ---------------------------------------------------------------------------
revoke execute on function public.totais_cidade_semana(date), public.recalcular_cidades(date),
  public.avisar_cidades(date, bigint, boolean), public.escolher_cidade(integer), public.minha_cidade(), public.minha_cidade_semana(date),
  public.ranking_cidades(date, text), public.ranking_cidades_top(date), public.ranking_estados(date)
  from public, anon, authenticated;
grant execute on function public.totais_cidade_semana(date), public.recalcular_cidades(date),
  public.avisar_cidades(date, bigint, boolean)
  to service_role;
grant execute on function public.escolher_cidade(integer), public.minha_cidade(), public.minha_cidade_semana(date)
  to authenticated;
grant execute on function public.ranking_cidades(date, text), public.ranking_cidades_top(date),
  public.ranking_estados(date)
  to anon, authenticated;
