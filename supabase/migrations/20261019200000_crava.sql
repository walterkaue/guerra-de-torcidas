-- Crava a Rodada (docs/jogo.md, seção 7) e teto diário somado entre minigames de partida (seção 5).
-- Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada.
-- Regras de acesso: o celular lê jogos, rodadas e config; lê e grava só os PRÓPRIOS palpites e a
-- própria certeza, e só antes do início (hora do servidor). Pontos só pelas funções do servidor.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Teto diário entre minigames de partida (pênaltis e, em breve, a Prova de Boleiro).
-- Partida de amistoso (minigame nas 2 semanas de calibragem) não ocupa vaga no teto.
-- ---------------------------------------------------------------------------
alter table public.partidas
  add column minigame text not null default 'penaltis' check (minigame in ('penaltis', 'prova')),
  add column amistoso boolean not null default false;

create or replace function public.atualizar_teto(p_torcedor uuid, p_dia date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.partidas p
  set conta_no_teto = p.id in (
    select q.id
    from public.partidas q
    where q.torcedor_id = p_torcedor and q.dia = p_dia and q.fechada_em is not null
      and not q.sob_suspeita and not q.amistoso
    order by q.pontos desc, q.fechada_em asc
    limit 5
  )
  where p.torcedor_id = p_torcedor and p.dia = p_dia and p.fechada_em is not null;
$$;

-- ---------------------------------------------------------------------------
-- Configuração do Crava (editável no Table Editor, sem nova migração).
-- ---------------------------------------------------------------------------
create table public.config_crava (
  chave text primary key,
  valor numeric not null,
  descricao text not null
);
alter table public.config_crava enable row level security;
create policy "config_crava: leitura para todos" on public.config_crava
  for select to anon, authenticated using (true);

insert into public.config_crava (chave, valor, descricao) values
  ('valendo_desde_rodada', 99,
   'Modo ensaio: só rodadas a partir desta somam no ranking da semana. 99 = ensaio ligado (nenhuma soma). Para desligar a partir da 34ª, troque para 34.'),
  ('min_palpites_porcentagem', 20, 'A porcentagem de como a torcida cravou só aparece com pelo menos isto de palpites no jogo');

-- ---------------------------------------------------------------------------
-- Rodadas e jogos (preenchidos pela função sincronizar-jogos, a partir do football-data.org).
-- ---------------------------------------------------------------------------
create table public.rodadas (
  numero smallint primary key check (numero between 1 and 38),
  -- Início do 1º jogo da rodada: o jogo da certeza trava aqui. Depois que passou, não muda mais.
  trava_certeza timestamptz
);
insert into public.rodadas (numero) select generate_series(32, 38);

alter table public.rodadas enable row level security;
create policy "rodadas: leitura para todos" on public.rodadas
  for select to anon, authenticated using (true);

create table public.jogos (
  id uuid primary key default gen_random_uuid(),
  api_id bigint unique,
  rodada smallint not null references public.rodadas (numero),
  mandante_id text not null references public.times (id),
  visitante_id text not null references public.times (id),
  -- Hora do início. Jogo adiado: a sincronização troca e o palpite reabre até o novo horário.
  inicio timestamptz not null,
  status_api text not null default 'SCHEDULED',
  gols_api_mandante smallint,
  gols_api_visitante smallint,
  -- Placar confirmado pelo administrador. Os pontos só saem na confirmação.
  gols_mandante smallint check (gols_mandante between 0 and 30),
  gols_visitante smallint check (gols_visitante between 0 and 30),
  -- Primeira confirmação: define a ordem do teto de 300 por rodada. Corrigir não muda.
  confirmado_em timestamptz,
  corrigido_em timestamptz,
  -- Não disputado até o fim da 38ª: sem pontos.
  anulado boolean not null default false,
  atualizado_em timestamptz not null default now(),
  check (mandante_id <> visitante_id),
  check ((gols_mandante is null) = (gols_visitante is null)),
  check (confirmado_em is null or gols_mandante is not null)
);
create index jogos_rodada on public.jogos (rodada, inicio);

alter table public.jogos enable row level security;
create policy "jogos: leitura para todos" on public.jogos
  for select to anon, authenticated using (true);

-- Jogo ainda aceita palpite? Hora do servidor.
create or replace function public.jogo_aberto(p_jogo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jogos j
    where j.id = p_jogo and now() < j.inicio and j.confirmado_em is null and not j.anulado
  );
$$;

-- Jogo da certeza ainda pode ser marcado ou trocado nesta rodada (e o jogo é dela)?
create or replace function public.certeza_aberta(p_rodada smallint, p_jogo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rodadas r
    join public.jogos j on j.rodada = r.numero
    where r.numero = p_rodada and j.id = p_jogo and not j.anulado
      and r.trava_certeza is not null and now() < r.trava_certeza
  );
$$;

-- ---------------------------------------------------------------------------
-- Palpites: cada um lê e grava só os seus, e só antes do início do jogo.
-- ---------------------------------------------------------------------------
create table public.palpites (
  torcedor_id uuid not null default auth.uid() references public.torcedores (id) on delete cascade,
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  gols_mandante smallint not null check (gols_mandante between 0 and 9),
  gols_visitante smallint not null check (gols_visitante between 0 and 9),
  -- Time de quem palpitou no momento do palpite (troca livre: os pontos ficam onde foram feitos).
  time_id text references public.times (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (torcedor_id, jogo_id)
);
create index palpites_jogo on public.palpites (jogo_id);

alter table public.palpites enable row level security;
create policy "palpites: cada um lê os seus" on public.palpites
  for select to authenticated using (torcedor_id = (select auth.uid()));
create policy "palpites: cria o seu antes do início" on public.palpites
  for insert to authenticated
  with check (torcedor_id = (select auth.uid()) and public.jogo_aberto(jogo_id));
create policy "palpites: muda o seu antes do início" on public.palpites
  for update to authenticated
  using (torcedor_id = (select auth.uid()) and public.jogo_aberto(jogo_id))
  with check (torcedor_id = (select auth.uid()) and public.jogo_aberto(jogo_id));
create policy "palpites: apaga o seu antes do início" on public.palpites
  for delete to authenticated
  using (torcedor_id = (select auth.uid()) and public.jogo_aberto(jogo_id));

create or replace function public.palpite_antes_de_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.time_id := (select t.time_id from public.torcedores t where t.id = new.torcedor_id);
  new.atualizado_em := now();
  if tg_op = 'INSERT' then
    new.criado_em := now();
  else
    new.criado_em := old.criado_em;
  end if;
  return new;
end;
$$;
create trigger palpites_antes_de_gravar before insert or update on public.palpites
  for each row execute function public.palpite_antes_de_gravar();

-- ---------------------------------------------------------------------------
-- Jogo da certeza: 1 por rodada, até o início do 1º jogo da rodada.
-- ---------------------------------------------------------------------------
create table public.certezas (
  torcedor_id uuid not null default auth.uid() references public.torcedores (id) on delete cascade,
  rodada smallint not null references public.rodadas (numero),
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  atualizado_em timestamptz not null default now(),
  primary key (torcedor_id, rodada)
);

alter table public.certezas enable row level security;
create policy "certezas: cada um lê a sua" on public.certezas
  for select to authenticated using (torcedor_id = (select auth.uid()));
create policy "certezas: marca a sua antes da trava" on public.certezas
  for insert to authenticated
  with check (torcedor_id = (select auth.uid()) and public.certeza_aberta(rodada, jogo_id));
create policy "certezas: troca a sua antes da trava" on public.certezas
  for update to authenticated
  using (torcedor_id = (select auth.uid()) and public.certeza_aberta(rodada, jogo_id))
  with check (torcedor_id = (select auth.uid()) and public.certeza_aberta(rodada, jogo_id));
create policy "certezas: desmarca a sua antes da trava" on public.certezas
  for delete to authenticated
  using (torcedor_id = (select auth.uid()) and public.certeza_aberta(rodada, jogo_id));

-- ---------------------------------------------------------------------------
-- Pontos do Crava: registro de diferenças. Cada confirmação grava só o que muda em relação ao
-- que a pessoa já recebeu por aquele jogo; confirmar de novo grava nada e corrigir grava o ajuste.
-- Os pontos já vêm com peso ×2 e teto de 300 por rodada (src/jogo/crava.ts).
-- ---------------------------------------------------------------------------
create table public.crava_pontos (
  id bigint generated always as identity primary key,
  torcedor_id uuid not null references public.torcedores (id) on delete cascade,
  jogo_id uuid not null references public.jogos (id) on delete cascade,
  rodada smallint not null references public.rodadas (numero),
  time_id text not null references public.times (id),
  -- Semana do início do jogo; se ela já foi confirmada (segunda 12h), a semana atual.
  semana date not null,
  pontos integer not null check (pontos <> 0),
  criado_em timestamptz not null default now()
);
create index crava_pontos_semana on public.crava_pontos (semana);
create index crava_pontos_rodada on public.crava_pontos (rodada, torcedor_id);

alter table public.crava_pontos enable row level security;
create policy "crava_pontos: cada um lê os seus" on public.crava_pontos
  for select to authenticated using (torcedor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Administradores (página #admin) e registro das sincronizações.
-- ---------------------------------------------------------------------------
create table public.administradores (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.administradores enable row level security;
create policy "administradores: cada um vê se é" on public.administradores
  for select to authenticated using (usuario_id = (select auth.uid()));

create or replace function public.sou_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.administradores a where a.usuario_id = auth.uid());
$$;

create table public.sincronizacoes (
  id bigint generated always as identity primary key,
  quando timestamptz not null default now(),
  origem text not null default 'agenda',
  ok boolean not null default false,
  jogos integer not null default 0,
  sem_par text[] not null default '{}',
  mensagem text
);
create index sincronizacoes_quando on public.sincronizacoes (quando desc);
alter table public.sincronizacoes enable row level security;
create policy "sincronizacoes: só admin lê" on public.sincronizacoes
  for select to authenticated using (public.sou_admin());

-- Depois de sincronizar: a trava da certeza é o início do 1º jogo da rodada, até ela passar.
create or replace function public.atualizar_travas()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.rodadas r
  set trava_certeza = m.primeiro
  from (
    select j.rodada, min(j.inicio) as primeiro
    from public.jogos j
    where not j.anulado
    group by j.rodada
  ) m
  where m.rodada = r.numero
    and (r.trava_certeza is null or r.trava_certeza > now())
    and r.trava_certeza is distinct from m.primeiro;
$$;

-- ---------------------------------------------------------------------------
-- Ranking da semana: os pontos do Crava (das rodadas que já valem) somam ao total da semana
-- de cada pessoa, por fora do teto diário de minigames.
-- ---------------------------------------------------------------------------
create or replace function public.recalcular_ranking(p_semana date)
returns void
language sql
security definer
set search_path = ''
as $$
  with pontos as (
    select p.torcedor_id, p.time_id, p.pontos, p.fechada_em as quando, true as de_partida
    from public.partidas p
    where p.semana = p_semana and p.conta_no_teto and not p.sob_suspeita
    union all
    select c.torcedor_id, c.time_id, c.pontos, c.criado_em, false
    from public.crava_pontos c
    where c.semana = p_semana
      and c.rodada >= coalesce((select k.valor from public.config_crava k where k.chave = 'valendo_desde_rodada'), 99)
  ),
  totais as (
    select x.torcedor_id, x.time_id, greatest(sum(x.pontos), 0)::integer as total, max(x.quando) as ultima
    from pontos x
    join public.times t on t.id = x.time_id and t.oficial
    group by x.torcedor_id, x.time_id
    -- Quem só tem palpite e somou zero não conta como ativo.
    having bool_or(x.de_partida) or sum(x.pontos) > 0
  ),
  geral as (
    select coalesce(avg(total), 0) as media from totais
  ),
  ordenados as (
    select o.*, row_number() over (partition by o.time_id order by o.total desc, o.ultima asc) as n
    from totais o
  ),
  por_time as (
    select
      t.id as time_id,
      count(o.torcedor_id)::integer as ativos,
      coalesce(sum(o.total), 0)::integer as soma,
      coalesce(sum(o.total) filter (where o.n <= 30), 0) as soma30,
      count(o.torcedor_id) filter (where o.n <= 30) as n30,
      max(o.ultima) as chegou_em
    from public.times t
    left join ordenados o on o.time_id = t.id
    where t.oficial
    group by t.id
  ),
  calc as (
    select pt.*,
      case when pt.ativos = 0 then 0
           else (pt.soma30 + (30 - pt.n30) * 0.8 * g.media) / 30 end as media30
    from por_time pt cross join geral g
  )
  insert into public.ranking_semana as r
    (semana, time_id, ativos, soma, media30, chegou_em, posicao_campeao, posicao_soma, atualizado_em)
  select
    p_semana, c.time_id, c.ativos, c.soma, round(c.media30, 2), c.chegou_em,
    row_number() over (order by round(c.media30, 2) desc, c.chegou_em asc nulls last, c.time_id),
    row_number() over (order by c.soma desc, c.chegou_em asc nulls last, c.time_id),
    now()
  from calc c
  on conflict (semana, time_id) do update set
    ativos = excluded.ativos,
    soma = excluded.soma,
    media30 = excluded.media30,
    chegou_em = excluded.chegou_em,
    posicao_campeao = excluded.posicao_campeao,
    posicao_soma = excluded.posicao_soma,
    atualizado_em = excluded.atualizado_em;
$$;

-- Grava as diferenças entre o que cada pessoa deve ter por jogo (calculado pelo crava.ts na função
-- confirmar-placar) e o que já recebeu. Uma rodada por vez (trava), e recalcula as semanas tocadas.
-- p_alvos: [{ "torcedorId", "jogoId", "pontos", "semana" }]
create or replace function public.aplicar_pontos_crava(p_rodada smallint, p_alvos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semana date;
  v_semanas date[];
  v_gravados integer;
  v_semana_atual date := date_trunc('week', now() at time zone 'America/Sao_Paulo')::date;
begin
  perform pg_advisory_xact_lock(hashtext('crava_rodada'), p_rodada);

  with alvo as (
    select (a ->> 'torcedorId')::uuid as torcedor_id, (a ->> 'jogoId')::uuid as jogo_id,
           (a ->> 'pontos')::integer as pontos, (a ->> 'semana')::date as semana
    from jsonb_array_elements(p_alvos) a
  ),
  atual as (
    select c.torcedor_id, c.jogo_id, sum(c.pontos)::integer as pontos
    from public.crava_pontos c
    where c.rodada = p_rodada
    group by c.torcedor_id, c.jogo_id
  ),
  dif as (
    select coalesce(alvo.torcedor_id, atual.torcedor_id) as torcedor_id,
           coalesce(alvo.jogo_id, atual.jogo_id) as jogo_id,
           coalesce(alvo.pontos, 0) - coalesce(atual.pontos, 0) as pontos,
           coalesce(alvo.semana, v_semana_atual) as semana
    from alvo
    full join atual on atual.torcedor_id = alvo.torcedor_id and atual.jogo_id = alvo.jogo_id
  ),
  novos as (
    insert into public.crava_pontos (torcedor_id, jogo_id, rodada, time_id, semana, pontos)
    select d.torcedor_id, d.jogo_id, p_rodada, coalesce(pa.time_id, 'outro'), d.semana, d.pontos
    from dif d
    join public.jogos j on j.id = d.jogo_id and j.rodada = p_rodada
    left join public.palpites pa on pa.torcedor_id = d.torcedor_id and pa.jogo_id = d.jogo_id
    where d.pontos <> 0
    returning semana
  )
  select count(*)::integer, coalesce(array_agg(distinct n.semana), '{}') into v_gravados, v_semanas from novos n;

  foreach v_semana in array v_semanas loop
    perform public.recalcular_ranking(v_semana);
  end loop;
  return v_gravados;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leituras agregadas (nunca o palpite de outra pessoa).
-- ---------------------------------------------------------------------------

-- Como a torcida cravou: só jogos que já começaram, e só com o mínimo de palpites.
create or replace function public.crava_rodada(p_rodada smallint)
returns table (jogo_id uuid, total integer, pct_mandante integer, pct_empate integer, pct_visitante integer)
language sql
stable
security definer
set search_path = ''
as $$
  with minimo as (
    select coalesce((select k.valor from public.config_crava k where k.chave = 'min_palpites_porcentagem'), 20) as n
  ),
  contas as (
    select j.id,
           count(p.*)::integer as total,
           count(p.*) filter (where p.gols_mandante > p.gols_visitante) as m,
           count(p.*) filter (where p.gols_mandante = p.gols_visitante) as e,
           count(p.*) filter (where p.gols_mandante < p.gols_visitante) as v
    from public.jogos j
    left join public.palpites p on p.jogo_id = j.id
    where j.rodada = p_rodada and now() >= j.inicio
    group by j.id
  )
  select c.id,
         case when c.total >= mi.n then c.total end,
         case when c.total >= mi.n then round(100.0 * c.m / c.total)::integer end,
         case when c.total >= mi.n then round(100.0 * c.e / c.total)::integer end,
         case when c.total >= mi.n then round(100.0 * c.v / c.total)::integer end
  from contas c cross join minimo mi;
$$;

-- Total de cada pessoa (por time) numa rodada, ou no Brasileirão inteiro (p_rodada nulo).
-- Conta quem palpitou em jogo já confirmado, mesmo sem ponto.
create or replace function public.crava_totais(p_rodada smallint)
returns table (torcedor_id uuid, time_id text, total integer, ultima timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select pa.torcedor_id, coalesce(pa.time_id, 'outro') as time_id
    from public.palpites pa
    join public.jogos j on j.id = pa.jogo_id
    where (p_rodada is null or j.rodada = p_rodada) and j.confirmado_em is not null and not j.anulado
    group by 1, 2
  ),
  pts as (
    select c.torcedor_id, c.time_id, sum(c.pontos) as total, max(c.criado_em) as ultima
    from public.crava_pontos c
    where p_rodada is null or c.rodada = p_rodada
    group by 1, 2
  )
  select b.torcedor_id, b.time_id, greatest(coalesce(p.total, 0), 0)::integer, p.ultima
  from base b
  left join pts p on p.torcedor_id = b.torcedor_id and p.time_id = b.time_id;
$$;

-- Ranking das torcidas no palpite: média dos 30 melhores palpiteiros, vagas vazias a 80% da média geral.
create or replace function public.ranking_crava(p_rodada smallint default null)
returns table (time_id text, palpiteiros integer, media30 numeric, posicao integer)
language sql
stable
security definer
set search_path = ''
as $$
  with tot as (
    select t.* from public.crava_totais(p_rodada) t
    join public.times tm on tm.id = t.time_id and tm.oficial
  ),
  geral as (select coalesce(avg(total), 0) as media from tot),
  ord as (
    select tot.*, row_number() over (partition by tot.time_id order by tot.total desc, tot.ultima asc nulls last) as n
    from tot
  ),
  por_time as (
    select tm.id as time_id,
           count(o.torcedor_id)::integer as palpiteiros,
           coalesce(sum(o.total) filter (where o.n <= 30), 0) as soma30,
           count(o.torcedor_id) filter (where o.n <= 30) as n30,
           max(o.ultima) as chegou_em
    from public.times tm
    left join ord o on o.time_id = tm.id
    where tm.oficial
    group by tm.id
  ),
  calc as (
    select pt.time_id, pt.palpiteiros, pt.chegou_em,
           round(case when pt.palpiteiros = 0 then 0
                      else (pt.soma30 + (30 - pt.n30) * 0.8 * g.media) / 30 end, 2) as media30
    from por_time pt cross join geral g
  )
  select c.time_id, c.palpiteiros, c.media30,
         (row_number() over (order by c.media30 desc, c.chegou_em asc nulls last, c.time_id))::integer
  from calc c;
$$;

-- Posição da própria pessoa ("37º de 412"), sem mostrar ninguém.
create or replace function public.minha_posicao_crava(p_rodada smallint default null)
returns table (posicao integer, total integer, pontos integer)
language sql
stable
security definer
set search_path = ''
as $$
  with pessoas as (
    select t.torcedor_id, sum(t.total)::integer as pontos
    from public.crava_totais(p_rodada) t
    group by t.torcedor_id
  ),
  ord as (
    select p.*, (rank() over (order by p.pontos desc))::integer as posicao, (count(*) over ())::integer as total
    from pessoas p
  )
  select o.posicao, o.total, o.pontos from ord o where o.torcedor_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Agendamento: a cada 30 min nos dias de jogo (e até 4h depois de um jogo começar, para pegar
-- o placar de jogo da noite), e 1 vez por dia (6h) no resto. Cada sincronização = 1 chamada à API.
-- ---------------------------------------------------------------------------
create or replace function public.disparar_sincronizacao()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamp := now() at time zone 'America/Sao_Paulo';
begin
  if exists (
       select 1 from public.jogos j
       where (j.inicio at time zone 'America/Sao_Paulo')::date = v_agora::date
          or j.inicio between now() - interval '4 hours' and now()
     )
     or (extract(hour from v_agora) = 6 and extract(minute from v_agora) < 30)
  then
    perform net.http_post(
      url := 'https://ybfeqykdnqmnufrgtnoc.supabase.co/functions/v1/sincronizar-jogos',
      body := '{"origem":"agenda"}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000
    );
  end if;
end;
$$;

select cron.schedule('crava-sincronizar', '*/30 * * * *', 'select public.disparar_sincronizacao()');

-- ---------------------------------------------------------------------------
-- Permissões explícitas. Tabelas novas podem nascer expostas: tira tudo e devolve só o necessário.
-- ---------------------------------------------------------------------------
revoke all on public.config_crava, public.rodadas, public.jogos, public.palpites, public.certezas,
  public.crava_pontos, public.administradores, public.sincronizacoes from anon, authenticated;

grant select on public.config_crava, public.rodadas, public.jogos to anon, authenticated;
grant select, delete on public.palpites, public.certezas to authenticated;
grant insert (jogo_id, gols_mandante, gols_visitante) on public.palpites to authenticated;
grant update (jogo_id, gols_mandante, gols_visitante) on public.palpites to authenticated;
grant insert (rodada, jogo_id) on public.certezas to authenticated;
grant update (rodada, jogo_id) on public.certezas to authenticated;
grant select on public.crava_pontos, public.administradores, public.sincronizacoes to authenticated;

grant all on public.config_crava, public.rodadas, public.jogos, public.palpites, public.certezas,
  public.crava_pontos, public.administradores, public.sincronizacoes to service_role;

revoke execute on function public.jogo_aberto(uuid), public.certeza_aberta(smallint, uuid),
  public.palpite_antes_de_gravar(), public.atualizar_travas(), public.aplicar_pontos_crava(smallint, jsonb),
  public.crava_totais(smallint), public.disparar_sincronizacao(), public.sou_admin(),
  public.crava_rodada(smallint), public.ranking_crava(smallint), public.minha_posicao_crava(smallint)
  from public, anon, authenticated;
-- As políticas de RLS chamam estas duas como o próprio usuário.
grant execute on function public.jogo_aberto(uuid), public.certeza_aberta(smallint, uuid) to authenticated;
grant execute on function public.crava_rodada(smallint), public.ranking_crava(smallint) to anon, authenticated;
grant execute on function public.minha_posicao_crava(smallint), public.sou_admin() to authenticated;
grant execute on function public.atualizar_travas(), public.aplicar_pontos_crava(smallint, jsonb),
  public.crava_totais(smallint), public.recalcular_ranking(date), public.atualizar_teto(uuid, date)
  to service_role;
