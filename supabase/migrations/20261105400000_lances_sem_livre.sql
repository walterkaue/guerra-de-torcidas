-- Lances do Jogo sem Disputa livre e com corte antecipado (decisão do Kauê em 05/11/2026; docs/jogo.md, seção 14.7).
-- Nenhuma coluna ou tabela é apagada ou renomeada. Apaga só as linhas 'penaltis:livre' de lances_gols, que nunca
-- apareceram como medalha (só nos totais de "Ver meus dados").
--
--   1. Corte antecipado: segunda 09/11/2026, 0h de Brasília (era 16/11). Igual a LANCES_UNIFICADOS_DESDE e
--      DIA_DO_CORTE em src/jogo/regraLances.ts (o teste confere o texto desta migração).
--   2. penaltis_comecar: a partir do corte, partida de pênaltis sem disputa é recusada ('disputa_obrigatoria'). No X1
--      recebido, a partida grava a disputa da partida de quem chamou (antes e depois do corte), e a medalha vai para a
--      mesma disputa. A nova-partida confere o mesmo (e só aceita id do catálogo); aqui é a segunda trava.
--   3. Medalhas dos pênaltis só por disputa histórica: penaltis_anotar_gols ignora partida sem disputa_id, e as linhas
--      'penaltis:livre' saem de lances_gols (minhas_medalhas, medalhas_de e vitrine_medalhas leem só de lá).
--   4. ver_desafio devolve também a disputa do X1, para o convite da Home mostrar o adversário de verdade.
--
-- Publicação: esta migração primeiro, depois as funções (nova-partida, lances, lance-penalti e fechar-partida, que
-- levam a data nova em _shared/jogo/regraLances.ts) e o site, tudo antes de segunda 09/11, 0h. Com a migração no ar e
-- a nova-partida antiga, a Disputa livre continua até o corte e, depois dele, é recusada pelo banco (o celular joga
-- sem valer pontos): nada grava pontos errados.

-- ---------------------------------------------------------------------------
-- 1. Corte antecipado
-- ---------------------------------------------------------------------------
create or replace function public.lances_unificados_desde()
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select timestamptz '2026-11-09 00:00:00-03';
$$;

create or replace function public.lances_dia_do_corte()
returns date
language sql
immutable
set search_path = ''
as $$
  select date '2026-11-09';
$$;

update public.config_deteccao
set descricao = 'Lances unificados (desde 09/11/2026): partidas valendo por dia, somando pênaltis, faltas e cara a cara (o X1 recebido conta)'
where chave = 'lances_unificados_por_dia';

-- ---------------------------------------------------------------------------
-- 2. penaltis_comecar: disputa obrigatória a partir do corte e X1 com a disputa de quem chamou.
--    Parte da versão de 20261105200000_x1_penaltis_uma_vez.sql, com a mesma assinatura e as mesmas permissões.
-- ---------------------------------------------------------------------------
create or replace function public.penaltis_comecar(
  p_torcedor uuid,
  p_semente bigint,
  p_dificuldade numeric,
  p_expira_em timestamptz,
  p_modo text,
  p_desafio text,
  p_disputa text,
  p_numero_narrador smallint,
  p_sementes jsonb,
  p_criada_em timestamptz default now()
)
returns table (partida_id uuid, feitas integer, limite integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feitas integer;
  v_limite integer;
  v_id uuid;
  v_disputa text := p_disputa;
begin
  if p_modo not in ('normal', 'desafio') or (p_modo = 'desafio') <> (p_desafio is not null) then
    raise exception 'modo_invalido';
  end if;
  if p_criada_em is null or abs(extract(epoch from (p_criada_em - now()))) > 60 then
    raise exception 'hora_invalida';
  end if;

  -- X1: a partida joga a disputa de quem chamou, seja qual for a que veio no pedido (a medalha vai para ela).
  if p_modo = 'desafio' then
    select p.disputa_id into v_disputa
    from public.desafios d
    join public.partidas p on p.id = d.partida_id
    where d.id = p_desafio;
  end if;

  -- Sem Disputa livre a partir do corte. Um X1 sem disputa depois do corte só seria de antes dele (já expirado).
  if p_criada_em >= public.lances_unificados_desde() and v_disputa is null then
    if p_modo = 'desafio' then
      raise exception 'desafio_expirado';
    end if;
    raise exception 'disputa_obrigatoria';
  end if;

  perform pg_advisory_xact_lock(hashtext('lances_comecar'), hashtext(p_torcedor::text));

  -- Cada X1 dos pênaltis vale uma vez por pessoa: na segunda, as zonas das cobranças gravadas já seriam conhecidas.
  if p_modo = 'desafio' and exists (
    select 1 from public.partidas p
    where p.torcedor_id = p_torcedor and p.minigame = 'penaltis' and p.desafio_id = p_desafio
  ) then
    raise exception 'desafio_ja_jogado';
  end if;

  if (select count(*) from public.partidas p
      where p.torcedor_id = p_torcedor and p.criada_em >= now() - interval '1 minute')
     >= coalesce((select c.valor from public.config_deteccao c where c.chave = 'partidas_por_minuto'), 3) then
    raise exception 'muitas_partidas';
  end if;

  select h.feitas, h.limite into v_feitas, v_limite from public.lances_hoje(p_torcedor, p_criada_em) h;
  if p_criada_em >= public.lances_unificados_desde() and v_feitas >= v_limite then
    raise exception 'limite_do_dia';
  end if;

  insert into public.partidas (torcedor_id, minigame, modo, desafio_id, disputa_id, semente, dificuldade, expira_em, criada_em)
  values (p_torcedor, 'penaltis', p_modo, p_desafio, v_disputa, p_semente, p_dificuldade, p_expira_em, p_criada_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, sementes)
  values (v_id, p_numero_narrador, true, p_sementes);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

revoke execute on function
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Medalhas dos pênaltis só por disputa histórica
-- ---------------------------------------------------------------------------
create or replace function public.penaltis_anotar_gols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item text;
begin
  -- Partida livre (antes do corte) não tem medalha: a Disputa livre saiu dos Lances (seção 14.7).
  if new.disputa_id is null then
    return null;
  end if;
  v_item := 'penaltis:' || new.disputa_id;
  insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou, vitoria)
  select new.id, (x.ord - 1)::smallint, new.torcedor_id, v_item, false, false
  from jsonb_array_elements(coalesce(new.resultado -> 'cobrancas', '[]'::jsonb)) with ordinality as x (c, ord)
  where x.c ->> 'desfecho' = 'gol' and x.ord <= 8
  union all
  select new.id, 8::smallint, new.torcedor_id, v_item, false, true
  where coalesce((new.resultado ->> 'venceu')::boolean, false)
  on conflict (partida_id, i) do nothing;
  return null;
end;
$$;

-- As linhas da Disputa livre (preenchidas desde 31/10 pela 20261105100000) nunca apareceram como medalha; saem também
-- dos totais de "Ver meus dados" (gols_lances e vitorias_penaltis), que leem lances_gols. Não voltam: o gatilho agora
-- ignora partida sem disputa.
delete from public.lances_gols where lance_id = 'penaltis:livre';

-- ---------------------------------------------------------------------------
-- 4. ver_desafio com a disputa do X1 (muda o retorno: drop + create, com as mesmas permissões)
-- ---------------------------------------------------------------------------
drop function if exists public.ver_desafio(text);
create function public.ver_desafio(p_id text)
returns table (id text, time_id text, apelido text, gols_jogador smallint, gols_maquina smallint, pontos integer, disputa_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.gols_jogador, d.gols_maquina, d.pontos, p.disputa_id
  from public.desafios d
  left join public.partidas p on p.id = d.partida_id
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio(text) from public;
grant execute on function public.ver_desafio(text) to anon, authenticated;
