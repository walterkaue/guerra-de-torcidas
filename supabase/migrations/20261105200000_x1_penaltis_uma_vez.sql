-- X1 dos pênaltis valendo uma vez por pessoa (docs/jogo.md, seção 6, "X1 uma vez por pessoa"; decisão do Kauê em
-- 05/11/2026). Nenhuma coluna ou tabela muda: só recria penaltis_comecar, com a mesma assinatura.
--
-- No X1 recebido, a bola de cada defesa vai para a zona da cobrança gravada de quem desafiou (o tremor é pequeno), e a
-- resposta de cada defesa mostra essa zona. Quem jogava o mesmo código de novo (pelo link ou pelo botão Revanche) já
-- sabia onde viriam as 5 cobranças e defendia todas. Agora a segunda vez é recusada com 'desafio_ja_jogado', e o
-- celular abre uma partida normal contra a máquina, valendo. Conta qualquer partida começada com o código, fechada ou
-- não: as zonas aparecem lance a lance, então largar no meio também já mostrou as cobranças.
--
-- A conferência fica dentro da trava por torcedor: dois pedidos ao mesmo tempo com o mesmo código não abrem duas
-- partidas (com duas abertas, a pessoa jogaria a primeira para ver as zonas e a segunda para defender tudo).
--
-- Risco que fica (aceito em 05/11/2026): uma segunda conta que grava as cobranças em zonas escolhidas e manda o
-- código para a principal. Cada X1 armado custa uma partida inteira na outra conta, e só 3 partidas contam por dia.
--
-- Parte da versão de 20261105100000_lances_unificados.sql (PR #108). Publicação: esta migração junto com a dele,
-- antes da nova-partida que trata o 'desafio_ja_jogado'. Com a nova-partida do PR #108 ainda no ar, o X1 repetido
-- volta como erro 500 e o celular joga sem valer pontos.

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
begin
  if p_modo not in ('normal', 'desafio') or (p_modo = 'desafio') <> (p_desafio is not null) then
    raise exception 'modo_invalido';
  end if;
  if p_criada_em is null or abs(extract(epoch from (p_criada_em - now()))) > 60 then
    raise exception 'hora_invalida';
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
  values (p_torcedor, 'penaltis', p_modo, p_desafio, p_disputa, p_semente, p_dificuldade, p_expira_em, p_criada_em)
  returning id into v_id;
  insert into public.partidas_segredo (partida_id, numero_narrador, lance_a_lance, sementes)
  values (v_id, p_numero_narrador, true, p_sementes);

  return query select v_id, v_feitas + 1, v_limite;
end;
$$;

-- Permissões como em 20261105100000: só o servidor (create or replace mantém as de lá; repetidas por clareza).
revoke execute on function
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function
  public.penaltis_comecar(uuid, bigint, numeric, timestamptz, text, text, text, smallint, jsonb, timestamptz)
  to service_role;
