-- Revisão das partidas sob suspeita no #admin (decidido em 26/10/2026, opção A). Até aqui a partida
-- marcada pela detecção ficava fora do ranking para sempre. Agora ela entra numa fila; o administrador
-- libera (volta a contar) ou mantém fora. Vale para pênaltis, Prova de Boleiro e Time do Dia.
-- Semana fechada não reabre: liberada depois de segunda 12h da semana seguinte, a partida volta para
-- o teto, o recorde e a posição da pessoa, mas o ranking das torcidas daquela semana fica como estava.
-- Só acrescenta (coluna e funções); nada é apagado ou renomeado.

alter table public.dia_partidas add column if not exists revisada_em timestamptz;

-- A semana já foi confirmada (segunda 12h de Brasília da semana seguinte), como no Crava.
create or replace function public.semana_confirmada(p_semana date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo') >= (p_semana + 7)::timestamp + interval '12 hours';
$$;

-- Fila: suspeitas ainda sem revisão, mais antigas primeiro. `id` é o uuid da partida ou, no Time do
-- Dia, "torcedor:dia". Com o histórico do torcedor para dar contexto (sem apelido: só o começo do id).
create or replace function public.suspeitas_fila(p_limite integer default 30)
returns table (
  minigame text, id text, torcedor text, time_id text, dia date, pontos integer, motivo text,
  fechada_em timestamptz, partidas_do_torcedor integer, suspeitas_do_torcedor integer, na_fila integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  return query
    with fila as (
      select p.minigame, p.id::text as id, p.torcedor_id, p.time_id, p.dia, p.pontos,
        coalesce(p.motivo_suspeita, 'detecção') as motivo, p.fechada_em
      from public.partidas p
      where p.sob_suspeita and p.revisada_em is null and p.fechada_em is not null
      union all
      select 'dia', d.torcedor_id::text || ':' || d.dia::text, d.torcedor_id, d.time_id, d.dia, d.pontos::integer,
        'acerto na 1ª tentativa em 5 de 7 dias', d.fechada_em
      from public.dia_partidas d
      where d.sob_suspeita and d.revisada_em is null and d.fechada_em is not null
    ),
    historico as (
      select h.torcedor_id, count(*)::integer as partidas, count(*) filter (where h.sob_suspeita)::integer as suspeitas
      from (
        select q.torcedor_id, q.sob_suspeita from public.partidas q where q.fechada_em is not null
        union all
        select e.torcedor_id, e.sob_suspeita from public.dia_partidas e where e.fechada_em is not null
      ) h
      group by h.torcedor_id
    )
    select f.minigame, f.id, left(f.torcedor_id::text, 8), f.time_id, f.dia, f.pontos, f.motivo, f.fechada_em,
      h.partidas, h.suspeitas, (count(*) over ())::integer
    from fila f join historico h on h.torcedor_id = f.torcedor_id
    order by f.fechada_em
    limit greatest(1, least(p_limite, 100));
end;
$$;

-- Decide uma suspeita: liberar (volta a contar) ou manter fora. Partida que já saiu da fila: erro.
create or replace function public.suspeitas_decidir(p_minigame text, p_id text, p_liberar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_torcedor uuid;
  v_dia date;
  v_amistoso boolean;
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  if p_minigame = 'dia' then
    if p_id !~ '^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$' then
      raise exception 'fora_da_fila';
    end if;
    update public.dia_partidas d
      set revisada_em = now(), sob_suspeita = not p_liberar
      where d.torcedor_id = split_part(p_id, ':', 1)::uuid and d.dia = split_part(p_id, ':', 2)::date
        and d.sob_suspeita and d.revisada_em is null and d.fechada_em is not null
      returning d.dia, d.amistoso into v_dia, v_amistoso;
    if not found then
      raise exception 'fora_da_fila';
    end if;
  elsif p_minigame in ('penaltis', 'prova') then
    if p_id !~ '^[0-9a-f-]{36}$' then
      raise exception 'fora_da_fila';
    end if;
    update public.partidas p
      set revisada_em = now(), sob_suspeita = not p_liberar
      where p.id = p_id::uuid and p.minigame = p_minigame
        and p.sob_suspeita and p.revisada_em is null and p.fechada_em is not null
      returning p.torcedor_id, p.dia, p.amistoso into v_torcedor, v_dia, v_amistoso;
    if not found then
      raise exception 'fora_da_fila';
    end if;
    if p_liberar then
      perform public.atualizar_teto(v_torcedor, v_dia);
    end if;
  else
    raise exception 'fora_da_fila';
  end if;

  if p_liberar and not v_amistoso and not public.semana_confirmada(public.semana_de(v_dia)) then
    perform public.recalcular_ranking(public.semana_de(v_dia));
  end if;
end;
$$;

revoke execute on function public.semana_confirmada(date) from public, anon, authenticated;
revoke execute on function public.suspeitas_fila(integer),
  public.suspeitas_decidir(text, text, boolean) from public, anon;
grant execute on function public.suspeitas_fila(integer), public.suspeitas_decidir(text, text, boolean) to authenticated;
grant execute on function public.semana_confirmada(date) to service_role;
