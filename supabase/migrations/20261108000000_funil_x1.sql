-- Funil do X1 e onde a pessoa desiste (backlog C01 + I03; docs/jogos/contas.md, "Contagem de uso").
-- Só acrescenta: nenhuma tabela ou coluna é apagada ou renomeada.
--
-- Nenhuma tabela guarda torcedor, apelido, IP ou o código do X1:
--   funil_contagem  para sempre: quantos por dia, evento, tipo, meio, jogo e se era fluxo de X1.
--   funil_eventos   uma linha por evento que tem X1, com a impressão do código (HMAC com o segredo das funções,
--                   feita na função `funil`), para ligar compartilhou → abriu → aceitou. Some em 30 dias.
--   funil_limite    o limite por minuto: a impressão da sessão (ou do IP, sem sessão) e o minuto corrente.
--                   Os minutos que já passaram saem a cada envio e a cada minuto (cron funil-limite).
-- A lista fechada é a de src/jogo/funil.ts; o check abaixo confere a mesma combinação de novo.
-- "gerou" não vem do celular: sai das tabelas de X1 pela rotina diária (funil_contar_gerados), que o D8 chama antes
-- de apagar os X1 antigos, para a contagem de gerados ficar para sempre.

-- ---------------------------------------------------------------------------
-- 1. Lista fechada
-- ---------------------------------------------------------------------------
create or replace function public.funil_evento_valido(p_evento text, p_tipo text, p_meio text, p_jogo text, p_x1 boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(case p_evento
    when 'gerou' then
      p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova') and p_meio = '' and p_jogo = '' and p_x1
    when 'compartilhou' then
      p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova', 'medalha', 'lance', 'card', 'resultado')
      and p_meio in ('grupo', 'card', 'stories', 'emoji', 'link')
      and (case when p_tipo = 'resultado' then p_jogo in ('penaltis', 'lances', 'prova', 'time_do_dia') else p_jogo = '' end)
      and p_x1 = (p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova'))
    when 'abriu' then
      p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova', 'lance', 'disputa') and p_meio = '' and p_jogo = ''
      and p_x1 = (p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova'))
    when 'aceitou' then p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova') and p_meio = '' and p_jogo = '' and p_x1
    when 'primeiro_chute' then p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova') and p_meio = '' and p_jogo = '' and p_x1
    when 'terminou' then p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova') and p_meio = '' and p_jogo = '' and p_x1
    when 'revanche' then p_tipo in ('x1_penaltis', 'x1_lances', 'x1_prova') and p_meio = '' and p_jogo = '' and p_x1
    -- Desistência: em qualquer etapa, com X1 ou sem; na partida, o jogo diz qual.
    when 'desistiu' then
      p_tipo in ('escolha_time', 'triagem', 'aquecimento', 'partida') and p_meio = ''
      and (case when p_tipo = 'partida' then p_jogo in ('penaltis', 'lances', 'prova', 'time_do_dia') else p_jogo = '' end)
    when 'voltou' then
      p_tipo in ('escolha_time', 'triagem', 'aquecimento', 'partida') and p_meio = ''
      and (case when p_tipo = 'partida' then p_jogo in ('penaltis', 'lances', 'prova', 'time_do_dia') else p_jogo = '' end)
  end, false) and p_x1 is not null;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------
create table public.funil_contagem (
  dia date not null,
  evento text not null,
  tipo text not null,
  meio text not null default '',
  jogo text not null default '',
  -- O evento era de um X1 (no compartilhar e na desistência, diz se o fluxo tinha um X1).
  x1 boolean not null default false,
  n integer not null check (n > 0),
  primary key (dia, evento, tipo, meio, jogo, x1),
  check (public.funil_evento_valido(evento, tipo, meio, jogo, x1))
);

create table public.funil_eventos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  dia date not null default public.hoje_brasilia(),
  evento text not null,
  tipo text not null,
  meio text not null default '',
  jogo text not null default '',
  impressao text not null check (impressao ~ '^[0-9a-f]{32}$'),
  check (public.funil_evento_valido(evento, tipo, meio, jogo, true))
);
create index funil_eventos_impressao on public.funil_eventos (impressao, evento);
create index funil_eventos_criado_em on public.funil_eventos (criado_em);

create table public.funil_limite (
  -- Impressão da sessão ou do IP (32 hexadecimais); '*' é o teto geral e '*s', o de quem chega sem sessão.
  chave text primary key check (chave ~ '^[0-9a-f]{32}$' or chave in ('*', '*s')),
  minuto timestamptz not null,
  n integer not null check (n >= 0)
);
create index funil_limite_minuto on public.funil_limite (minuto);

alter table public.funil_contagem enable row level security;
alter table public.funil_eventos enable row level security;
alter table public.funil_limite enable row level security;
-- O celular não lê nem grava: só a função `funil` (service_role) e o npm run metricas (só leitura).
create policy "ninguém pelo cliente" on public.funil_contagem
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "ninguém pelo cliente" on public.funil_eventos
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy "ninguém pelo cliente" on public.funil_limite
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on public.funil_contagem, public.funil_eventos, public.funil_limite from public, anon, authenticated;
grant all on public.funil_contagem, public.funil_eventos, public.funil_limite to service_role;
-- O npm run metricas (Supabase CLI 3, `db query --remote --read-only`) roda como supabase_read_only_user.
grant select on public.funil_contagem, public.funil_eventos to supabase_read_only_user;

-- ---------------------------------------------------------------------------
-- 3. Gravação (chamada só pela função `funil`, com a secret key)
-- ---------------------------------------------------------------------------
-- Soma p_soma ao contador da chave no minuto e devolve quanto de p_quer ainda cabe no teto. Minuto novo zera o
-- contador; um envio atrasado do minuto anterior soma no novo (só aperta o limite, nunca afrouxa).
create or replace function public.funil_reservar(p_chave text, p_minuto timestamptz, p_soma integer, p_quer integer, p_teto integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  insert into public.funil_limite as l (chave, minuto, n) values (p_chave, p_minuto, p_soma)
  on conflict (chave) do update
    set n = case when excluded.minuto > l.minuto then excluded.n else l.n + excluded.n end,
        minuto = greatest(l.minuto, excluded.minuto)
  returning n into v_total;
  return greatest(0, least(p_quer, p_teto - (v_total - p_soma)));
end;
$$;

-- Limites: 40 eventos por minuto por aparelho (sessão ou, sem sessão, IP), 1000 por minuto somando todos os que
-- chegam sem sessão (o IP é o ponto fraco: assim quem forja IP não toma a vaga de quem joga) e 3000 no geral. O que
-- passa do limite é descartado sem erro. Evento fora da lista também (a função já confere; aqui confere de novo).
-- p_eventos: [{ evento, tipo, meio, jogo, impressao | null }], no máximo 20. Devolve quantos contou.
create or replace function public.funil_registrar(p_chave text, p_eventos jsonb, p_sem_sessao boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minuto timestamptz := date_trunc('minute', now());
  v_pedidos integer;
  v_cabe integer;
  v_validos jsonb;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{32}$' then
    raise exception 'chave_invalida' using errcode = '22023';
  end if;
  if p_eventos is null or jsonb_typeof(p_eventos) <> 'array' then
    raise exception 'eventos_invalidos' using errcode = '22023';
  end if;
  v_pedidos := least(jsonb_array_length(p_eventos), 20);
  if v_pedidos = 0 then
    return 0;
  end if;

  -- O limite guarda só o minuto corrente.
  delete from public.funil_limite where minuto < v_minuto;

  -- Tetos gerais estourados: nem grava a linha do aparelho.
  if exists (
    select 1 from public.funil_limite l
    where l.minuto = v_minuto and ((l.chave = '*' and l.n >= 3000) or (p_sem_sessao and l.chave = '*s' and l.n >= 1000))
  ) then
    return 0;
  end if;

  -- Por aparelho: conta o que foi pedido, mesmo o que passar do limite (quem insiste não ganha nada com isso).
  v_cabe := public.funil_reservar(p_chave, v_minuto, v_pedidos, v_pedidos, 40);
  if v_cabe > 0 and p_sem_sessao then
    v_cabe := public.funil_reservar('*s', v_minuto, v_cabe, v_cabe, 1000);
  end if;
  if v_cabe > 0 then
    v_cabe := public.funil_reservar('*', v_minuto, v_cabe, v_cabe, 3000);
  end if;
  if v_cabe = 0 then
    return 0;
  end if;

  select coalesce(jsonb_agg(v), '[]'::jsonb) into v_validos
  from (
    select e.evento, e.tipo, e.meio, e.jogo, e.impressao
    from (
      select
        a.e ->> 'evento' as evento,
        coalesce(a.e ->> 'tipo', '') as tipo,
        coalesce(a.e ->> 'meio', '') as meio,
        coalesce(a.e ->> 'jogo', '') as jogo,
        a.e ->> 'impressao' as impressao
      from jsonb_array_elements(p_eventos) with ordinality as a (e, i)
      where a.i <= v_cabe and jsonb_typeof(a.e) = 'object'
    ) e
    where e.evento <> 'gerou'
      and (e.impressao is null or e.impressao ~ '^[0-9a-f]{32}$')
      and public.funil_evento_valido(e.evento, e.tipo, e.meio, e.jogo, e.impressao is not null)
  ) v;

  insert into public.funil_eventos (evento, tipo, meio, jogo, impressao)
  select r.evento, r.tipo, r.meio, r.jogo, r.impressao
  from jsonb_to_recordset(v_validos) as r (evento text, tipo text, meio text, jogo text, impressao text)
  where r.impressao is not null;

  insert into public.funil_contagem as c (dia, evento, tipo, meio, jogo, x1, n)
  select public.hoje_brasilia(), r.evento, r.tipo, r.meio, r.jogo, r.impressao is not null, count(*)::integer
  from jsonb_to_recordset(v_validos) as r (evento text, tipo text, meio text, jogo text, impressao text)
  group by r.evento, r.tipo, r.meio, r.jogo, r.impressao is not null
  on conflict (dia, evento, tipo, meio, jogo, x1) do update set n = c.n + excluded.n;

  return jsonb_array_length(v_validos);
end;
$$;

revoke execute on function public.funil_registrar(text, jsonb, boolean), public.funil_reservar(text, timestamptz, integer, integer, integer),
  public.funil_evento_valido(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.funil_registrar(text, jsonb, boolean), public.funil_reservar(text, timestamptz, integer, integer, integer),
  public.funil_evento_valido(text, text, text, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Gerados (para sempre) e limpeza dos 30 dias
-- ---------------------------------------------------------------------------
-- Conta os X1 gerados por dia (Brasília) e por tipo, até p_ate, nos dias que ainda não foram contados. É um piso:
-- X1 de conta apagada no mesmo dia ("Apagar meus dados", junção de contas) sai antes da contagem. Um dia
-- contado não muda mais ("do nothing"): o D8 chama isto antes de apagar X1 antigos, e apagar depois não mexe na
-- contagem. A rotina diária conta até ontem; o dia de hoje o npm run metricas lê direto das tabelas.
create or replace function public.funil_contar_gerados(p_ate date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ate date := coalesce(p_ate, public.hoje_brasilia() - 1);
  v_n integer;
begin
  insert into public.funil_contagem (dia, evento, tipo, meio, jogo, x1, n)
  select g.dia, 'gerou', g.tipo, '', '', true, count(*)::integer
  from (
    select (d.criado_em at time zone 'America/Sao_Paulo')::date as dia, 'x1_penaltis' as tipo from public.desafios d
    union all
    select (d.criado_em at time zone 'America/Sao_Paulo')::date, 'x1_lances' from public.lances_desafios d
    union all
    select (d.criado_em at time zone 'America/Sao_Paulo')::date, 'x1_prova' from public.prova_desafios d
  ) g
  where g.dia <= v_ate
  group by g.dia, g.tipo
  on conflict (dia, evento, tipo, meio, jogo, x1) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Apaga as linhas por evento com mais de 30 dias (a contagem fica) e o limite que já passou.
create or replace function public.funil_limpar()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.funil_eventos where criado_em < now() - interval '30 days';
  delete from public.funil_limite where minuto < date_trunc('minute', now());
$$;

create or replace function public.funil_rotina_diaria()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.funil_contar_gerados();
  perform public.funil_limpar();
end;
$$;

revoke execute on function public.funil_contar_gerados(date), public.funil_limpar(), public.funil_rotina_diaria()
  from public, anon, authenticated;
grant execute on function public.funil_contar_gerados(date), public.funil_limpar(), public.funil_rotina_diaria()
  to service_role;

-- Todo dia às 03h15 de Brasília (06h15 UTC). E, a cada minuto, o limite do minuto que passou sai mesmo sem envio.
select cron.schedule('funil-diario', '15 6 * * *', 'select public.funil_rotina_diaria()');
select cron.schedule('funil-limite', '* * * * *', $$delete from public.funil_limite where minuto < date_trunc('minute', now())$$);
