-- Entressafra e jogos especiais do Palpite da Rodada (backlog D07, decidido pelo Kauê em 10/11/2026;
-- docs/jogos/crava.md, "Entressafra e jogos especiais").
--
-- Cada jogo especial (final da Copa do Brasil, Intercontinental, Supercopa Rei) é uma rodada de um jogo só,
-- marcada `especial`, com número a partir de 1001. Assim o resto trata o especial como trata uma rodada, sem
-- código novo: o teto de 300 por rodada e a trava contra pontos em dobro (aplicar_pontos_crava), a semana do
-- início do jogo (confirmar-placar), a Carreira (1 partida por rodada palpitada), o recorde por rodada e o
-- ranking do mês (que sai das semanas). Muda só onde o especial é diferente:
--   1. rodadas aceitam a faixa dos especiais; jogos aceitam o time de fora (só o nome) e o título do jogo;
--   2. uma trava no banco garante o formato: especial tem título, um jogo só, nenhum api_id (a sincronização do
--      football-data nunca toca nele) e pelo menos um dos 20 times; jogo do Brasileirão segue só com os 20;
--   3. sem jogo da certeza no especial (certeza_aberta), e a trava da certeza não é calculada para ele;
--   4. o Palpiteiro do Brasileirão (crava_totais sem rodada) deixa os especiais de fora;
--   5. modo ensaio: o especial só soma na semana quando alguma rodada do Brasileirão soma
--      (valendo_desde_rodada até 38); com 99, nada soma;
--   6. a sincronização agendada ignora os dias de jogo especial (não gasta chamada à API);
--   7. criar, editar e apagar: funções só da chave secreta, chamadas pela função jogos-especiais, que confere
--      a tabela de administradores. Confirmar, corrigir e anular seguem pela confirmar-placar.
-- Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada. Troca a regra de faixa de rodadas.numero e
-- deixa mandante_id e visitante_id de jogos aceitarem vazio (só no especial, com o nome do time de fora).
-- Nenhuma permissão nova de escrita para anon ou authenticated.

-- ---------------------------------------------------------------------------
-- 1. Formato
-- ---------------------------------------------------------------------------
alter table public.rodadas add column especial boolean not null default false;
alter table public.rodadas drop constraint rodadas_numero_check;
alter table public.rodadas add constraint rodadas_numero_check
  check ((not especial and numero between 1 and 38) or (especial and numero between 1001 and 32000));

create sequence public.rodadas_especiais as smallint start 1001 minvalue 1001 maxvalue 32000;

alter table public.jogos
  alter column mandante_id drop not null,
  alter column visitante_id drop not null,
  -- Time de fora (Toluca, PSG…): só o nome, sem cor nem escudo. Um dos dois lados é sempre um dos 20.
  add column mandante_fora text,
  add column visitante_fora text,
  -- Título do jogo especial, sem patrocinador: competição e, se houver, a fase ("Final da Copa do Brasil";
  -- "Copa Intercontinental" + "Quartas", que a tela mostra como "Copa Intercontinental · Quartas").
  add column competicao text,
  add column fase text,
  add constraint jogos_mandante_um check ((mandante_id is null) <> (mandante_fora is null)),
  add constraint jogos_visitante_um check ((visitante_id is null) <> (visitante_fora is null)),
  add constraint jogos_um_dos_20 check (mandante_id is not null or visitante_id is not null),
  add constraint jogos_fora_tamanho check (
    (mandante_fora is null or char_length(mandante_fora) between 1 and 30)
    and (visitante_fora is null or char_length(visitante_fora) between 1 and 30)),
  add constraint jogos_titulo check (
    (competicao is not null or fase is null)
    and (competicao is null or char_length(competicao) between 1 and 40)
    and (fase is null or char_length(fase) between 1 and 40));

-- Texto livre do #admin sem as palavras proibidas (docs/jogo.md, seção 3, mais "valendo", "prêmio" e "lucro" do
-- Palpite). A mesma lista de src/palavrasProibidas.test.ts. Palavra inteira: "Bragantino" passa, "Red Star" não.
create or replace function public.texto_sem_aposta(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not (
    translate(lower(coalesce(p, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
      ~ '(^|[^a-z0-9])(aposta|apostas|apostar|bet|bets|odd|odds|cotacao|cotacoes|banca|bolao\s+valendo|green|red|valendo|premio|premios|lucro)($|[^a-z0-9])'
  );
$$;

-- Trava do formato, em toda gravação em jogos (sincronização, #admin, confirmar-placar).
create or replace function public.jogo_conferir_formato()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_especial boolean;
begin
  select r.especial into v_especial from public.rodadas r where r.numero = new.rodada;
  if v_especial then
    if new.competicao is null then raise exception 'especial_sem_titulo'; end if;
    if new.api_id is not null then raise exception 'especial_com_api'; end if;
    if exists (select 1 from public.jogos j where j.rodada = new.rodada and j.id <> new.id) then
      raise exception 'especial_um_jogo';
    end if;
    if (new.mandante_id is not null and not exists (select 1 from public.times t where t.id = new.mandante_id and t.oficial))
       or (new.visitante_id is not null and not exists (select 1 from public.times t where t.id = new.visitante_id and t.oficial)) then
      raise exception 'time_invalido';
    end if;
    if not (public.texto_sem_aposta(new.competicao) and public.texto_sem_aposta(new.fase)
            and public.texto_sem_aposta(new.mandante_fora) and public.texto_sem_aposta(new.visitante_fora)) then
      raise exception 'texto_proibido';
    end if;
  elsif new.competicao is not null or new.mandante_id is null or new.visitante_id is null then
    raise exception 'brasileirao_so_com_os_20';
  end if;
  return new;
end;
$$;
create trigger jogos_conferir_formato before insert or update on public.jogos
  for each row execute function public.jogo_conferir_formato();

-- ---------------------------------------------------------------------------
-- 3. Sem jogo da certeza no especial
-- ---------------------------------------------------------------------------
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
    where r.numero = p_rodada and j.id = p_jogo and not j.anulado and not r.especial
      and r.trava_certeza is not null and now() < r.trava_certeza
  );
$$;

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
    and not r.especial
    and (r.trava_certeza is null or r.trava_certeza > now())
    and r.trava_certeza is distinct from m.primeiro;
$$;

-- ---------------------------------------------------------------------------
-- 4. Palpiteiro do Brasileirão (p_rodada nulo) sem os especiais. Com p_rodada, a rodada pedida (especial ou não).
-- ---------------------------------------------------------------------------
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
    join public.rodadas r on r.numero = j.rodada
    where (case when p_rodada is null then not r.especial else j.rodada = p_rodada end)
      and j.confirmado_em is not null and not j.anulado
    group by 1, 2
  ),
  pts as (
    select c.torcedor_id, c.time_id, sum(c.pontos) as total, max(c.criado_em) as ultima
    from public.crava_pontos c
    join public.rodadas r on r.numero = c.rodada
    where case when p_rodada is null then not r.especial else c.rodada = p_rodada end
    group by 1, 2
  )
  select b.torcedor_id, b.time_id, greatest(coalesce(p.total, 0), 0)::integer, p.ultima
  from base b
  left join pts p on p.torcedor_id = b.torcedor_id and p.time_id = b.time_id;
$$;

-- ---------------------------------------------------------------------------
-- 5. Modo ensaio. Igual ao de 20261020300000_pre_temporada.sql, menos a linha do Palpite: rodada do Brasileirão
--    soma a partir de valendo_desde_rodada; especial soma quando alguma rodada do Brasileirão soma (até 38).
-- ---------------------------------------------------------------------------
create or replace function public.pontos_semana(p_semana date)
returns table (torcedor_id uuid, time_id text, minigame text, pontos integer, quando timestamptz, de_partida boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.torcedor_id, p.time_id, p.minigame, p.pontos, p.fechada_em, true
  from public.partidas p
  where p.semana = p_semana and p.conta_no_teto and not p.sob_suspeita
  union all
  -- Time do Dia: uma por dia, conta na semana do dia (o dia já respeita a tolerância de 00h05).
  select d.torcedor_id, d.time_id, 'dia', d.pontos::integer, d.fechada_em, true
  from public.dia_partidas d
  where d.dia between p_semana and p_semana + 6
    and d.fechada_em is not null and not d.amistoso and not d.sob_suspeita
  union all
  select c.torcedor_id, c.time_id, 'crava', c.pontos, c.criado_em, false
  from public.crava_pontos c
  join public.rodadas r on r.numero = c.rodada
  cross join (
    select coalesce((select k.valor from public.config_crava k where k.chave = 'valendo_desde_rodada'), 99) as desde
  ) v
  where c.semana = p_semana
    and case when r.especial then v.desde <= 38 else r.numero >= v.desde end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Sincronização agendada: só os jogos que vêm da API (o especial não tem api_id).
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
       where j.api_id is not null
         and ((j.inicio at time zone 'America/Sao_Paulo')::date = v_agora::date
              or j.inicio between now() - interval '4 hours' and now())
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

-- ---------------------------------------------------------------------------
-- 7. Criar, editar e apagar (só a chave secreta; a função jogos-especiais confere os administradores).
--    Cada lado: p_*_id (um dos 20) ou p_*_fora (nome do time de fora), nunca os dois.
-- ---------------------------------------------------------------------------

-- Espaços nas pontas e repetidos saem; vazio vira nulo. Caractere de controle ou invisível (largura zero, direção
-- do texto), que esconderia uma palavra proibida do filtro, é recusado.
create or replace function public.especial_limpar(p text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p ~ '[[:cntrl:]]' or p ~ '[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]' then
    raise exception 'texto_invalido';
  end if;
  return nullif(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')), '');
end;
$$;

create or replace function public.especial_conferir(
  p_competicao text, p_fase text,
  p_mandante_id text, p_mandante_fora text, p_visitante_id text, p_visitante_fora text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_competicao is null then raise exception 'sem_titulo'; end if;
  if char_length(p_competicao) > 40 or coalesce(char_length(p_fase), 0) > 40 then raise exception 'titulo_longo'; end if;
  if coalesce(char_length(p_mandante_fora), 0) > 30 or coalesce(char_length(p_visitante_fora), 0) > 30 then
    raise exception 'nome_longo';
  end if;
  if (p_mandante_id is null) = (p_mandante_fora is null) or (p_visitante_id is null) = (p_visitante_fora is null) then
    raise exception 'lado_invalido';
  end if;
  if p_mandante_id is null and p_visitante_id is null then raise exception 'sem_time_dos_20'; end if;
  if p_mandante_id = p_visitante_id then raise exception 'mesmo_time'; end if;
  if (p_mandante_id is not null and not exists (select 1 from public.times t where t.id = p_mandante_id and t.oficial))
     or (p_visitante_id is not null and not exists (select 1 from public.times t where t.id = p_visitante_id and t.oficial)) then
    raise exception 'time_invalido';
  end if;
  -- O time de fora não pode ser um dos 20 escrito à mão (sairia sem as cores dele): "São Paulo" vira "sao-paulo".
  if exists (select 1 from public.times t
             where t.oficial and t.id in (
               regexp_replace(translate(lower(coalesce(p_mandante_fora, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', '-', 'g'),
               regexp_replace(translate(lower(coalesce(p_visitante_fora, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', '-', 'g'))) then
    raise exception 'fora_e_dos_20';
  end if;
  if not (public.texto_sem_aposta(p_competicao) and public.texto_sem_aposta(p_fase)
          and public.texto_sem_aposta(p_mandante_fora) and public.texto_sem_aposta(p_visitante_fora)) then
    raise exception 'texto_proibido';
  end if;
end;
$$;

-- Horário de um especial: no futuro e até 400 dias à frente (um ano digitado errado não deixa o palpite aberto por anos).
create or replace function public.especial_conferir_inicio(p_inicio timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_inicio is null or p_inicio <= now() then raise exception 'inicio_no_passado'; end if;
  if p_inicio > now() + interval '400 days' then raise exception 'inicio_longe'; end if;
end;
$$;

-- O mesmo jogo cadastrado duas vezes seria duas rodadas, cada uma com o seu ×2: mesmos times, ainda não confirmado
-- nem anulado e com início a menos de 12 h de diferença é o mesmo jogo.
create or replace function public.especial_repetido(
  p_jogo uuid, p_mandante_id text, p_mandante_fora text, p_visitante_id text, p_visitante_fora text, p_inicio timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jogos j join public.rodadas r on r.numero = j.rodada
    where r.especial and j.id is distinct from p_jogo and j.confirmado_em is null and not j.anulado
      and j.mandante_id is not distinct from p_mandante_id and lower(j.mandante_fora) is not distinct from lower(p_mandante_fora)
      and j.visitante_id is not distinct from p_visitante_id and lower(j.visitante_fora) is not distinct from lower(p_visitante_fora)
      and abs(extract(epoch from j.inicio - p_inicio)) < 12 * 3600
  );
$$;

-- Abre na hora em que é criado; fecha no início (hora do servidor), como qualquer jogo.
create or replace function public.especial_criar(
  p_competicao text, p_fase text,
  p_mandante_id text, p_mandante_fora text, p_visitante_id text, p_visitante_fora text,
  p_inicio timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_competicao text := public.especial_limpar(p_competicao);
  v_fase text := public.especial_limpar(p_fase);
  v_mandante_fora text := public.especial_limpar(p_mandante_fora);
  v_visitante_fora text := public.especial_limpar(p_visitante_fora);
  v_rodada smallint;
  v_jogo uuid;
begin
  perform public.especial_conferir(v_competicao, v_fase, nullif(p_mandante_id, ''), v_mandante_fora,
    nullif(p_visitante_id, ''), v_visitante_fora);
  perform public.especial_conferir_inicio(p_inicio);
  -- Um cadastro por vez: dois cliques em "Criar jogo" não viram duas rodadas.
  perform pg_advisory_xact_lock(hashtext('especial_criar'));
  if public.especial_repetido(null, nullif(p_mandante_id, ''), v_mandante_fora, nullif(p_visitante_id, ''), v_visitante_fora, p_inicio) then
    raise exception 'ja_existe';
  end if;

  v_rodada := nextval('public.rodadas_especiais');
  insert into public.rodadas (numero, especial) values (v_rodada, true);
  insert into public.jogos (rodada, mandante_id, mandante_fora, visitante_id, visitante_fora, inicio, competicao, fase)
  values (v_rodada, nullif(p_mandante_id, ''), v_mandante_fora, nullif(p_visitante_id, ''), v_visitante_fora,
          p_inicio, v_competicao, v_fase)
  returning id into v_jogo;
  return v_jogo;
end;
$$;

-- Antes do início: muda tudo; os times só sem nenhum palpite (o palpite é do mandante × visitante cadastrado).
-- Depois do início e antes da confirmação: só o horário, para o futuro (jogo adiado: o palpite reabre).
-- Anulado e nunca confirmado: salvar com horário novo desfaz a anulação (anulou e a data saiu depois).
-- Confirmado: não muda (corrigir o placar é na confirmar-placar).
create or replace function public.especial_editar(
  p_jogo uuid, p_competicao text, p_fase text,
  p_mandante_id text, p_mandante_fora text, p_visitante_id text, p_visitante_fora text,
  p_inicio timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_competicao text := public.especial_limpar(p_competicao);
  v_fase text := public.especial_limpar(p_fase);
  v_mandante_fora text := public.especial_limpar(p_mandante_fora);
  v_visitante_fora text := public.especial_limpar(p_visitante_fora);
  j public.jogos%rowtype;
  v_times_mudam boolean;
begin
  select jg.* into j from public.jogos jg join public.rodadas r on r.numero = jg.rodada
  where jg.id = p_jogo and r.especial
  for update of jg;
  if not found then raise exception 'especial_nao_encontrado'; end if;
  if j.confirmado_em is not null then raise exception 'jogo_fechado'; end if;
  perform public.especial_conferir_inicio(p_inicio);

  perform public.especial_conferir(v_competicao, v_fase, nullif(p_mandante_id, ''), v_mandante_fora,
    nullif(p_visitante_id, ''), v_visitante_fora);
  v_times_mudam := (j.mandante_id, j.mandante_fora, j.visitante_id, j.visitante_fora)
    is distinct from (nullif(p_mandante_id, ''), v_mandante_fora, nullif(p_visitante_id, ''), v_visitante_fora);

  if now() >= j.inicio or j.anulado then
    if v_times_mudam or (j.competicao, j.fase) is distinct from (v_competicao, v_fase) then
      raise exception 'ja_comecou';
    end if;
  elsif v_times_mudam and exists (select 1 from public.palpites pa where pa.jogo_id = j.id) then
    raise exception 'tem_palpite';
  end if;
  if public.especial_repetido(j.id, nullif(p_mandante_id, ''), v_mandante_fora, nullif(p_visitante_id, ''), v_visitante_fora, p_inicio) then
    raise exception 'ja_existe';
  end if;

  update public.jogos set
    competicao = v_competicao, fase = v_fase,
    mandante_id = nullif(p_mandante_id, ''), mandante_fora = v_mandante_fora,
    visitante_id = nullif(p_visitante_id, ''), visitante_fora = v_visitante_fora,
    inicio = p_inicio, anulado = false, atualizado_em = now()
  where id = j.id;
end;
$$;

-- Só sem nenhum palpite (com palpite, anula). Leva a rodada junto.
create or replace function public.especial_apagar(p_jogo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rodada smallint;
begin
  select jg.rodada into v_rodada from public.jogos jg join public.rodadas r on r.numero = jg.rodada
  where jg.id = p_jogo and r.especial
  for update of jg;
  if not found then raise exception 'especial_nao_encontrado'; end if;
  if exists (select 1 from public.palpites pa where pa.jogo_id = p_jogo)
     or exists (select 1 from public.crava_pontos c where c.jogo_id = p_jogo) then
    raise exception 'tem_palpite';
  end if;
  delete from public.jogos where id = p_jogo;
  delete from public.rodadas where numero = v_rodada;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões explícitas
-- ---------------------------------------------------------------------------
revoke all on sequence public.rodadas_especiais from public, anon, authenticated;
grant usage on sequence public.rodadas_especiais to service_role;

revoke execute on function public.texto_sem_aposta(text), public.jogo_conferir_formato(), public.especial_limpar(text),
  public.especial_conferir_inicio(timestamptz), public.especial_repetido(uuid, text, text, text, text, timestamptz),
  public.especial_conferir(text, text, text, text, text, text),
  public.especial_criar(text, text, text, text, text, text, timestamptz),
  public.especial_editar(uuid, text, text, text, text, text, text, timestamptz),
  public.especial_apagar(uuid)
  from public, anon, authenticated;
grant execute on function public.especial_criar(text, text, text, text, text, text, timestamptz),
  public.especial_editar(uuid, text, text, text, text, text, text, timestamptz),
  public.especial_apagar(uuid)
  to service_role;
-- Os grants de certeza_aberta, atualizar_travas, crava_totais, pontos_semana e disparar_sincronizacao ficam
-- como estavam (create or replace mantém as permissões).
