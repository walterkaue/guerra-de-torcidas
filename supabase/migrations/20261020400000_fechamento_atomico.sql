-- Fechamento numa transação só. Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada.
-- Antes, as funções do servidor gravavam a partida e só depois, em chamadas separadas, rodavam o teto,
-- o ranking e o desafio. Se algo quebrava no meio (em 20/10/2026 foi a detecção dos pênaltis lendo uma
-- partida da Prova), a partida ficava fechada fora do teto e sem desafio. Agora gravar, teto, ranking
-- e desafio vão juntos: ou entra tudo, ou nada (a partida continua aberta e pode ser fechada de novo).

-- ---------------------------------------------------------------------------
-- Pênaltis e Prova. A detecção roda antes, no servidor, e chega aqui como p_motivo_suspeita.
-- p_desafio: null = não gera desafio (partida de desafio). Pênaltis: { cobrancas, gols_jogador,
-- gols_maquina }. Prova: { perguntas, escada, resumo }. p_codigos: códigos candidatos, em ordem
-- (sorteados no servidor); fica o primeiro que não repetir.
-- Devolve uma linha; nenhuma se alguém fechou antes (duas abas, clique duplo).
-- ---------------------------------------------------------------------------
create or replace function public.fechar_partida(
  p_partida uuid,
  p_torcedor uuid,
  p_time text,
  p_gestos jsonb,
  p_resultado jsonb,
  p_pontos integer,
  p_dia date,
  p_semana date,
  p_fechada_em timestamptz,
  p_motivo_suspeita text,
  p_desafio jsonb,
  p_codigos text[]
)
returns table (teto boolean, suspeita boolean, codigo text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minigame text;
  v_amistoso boolean;
  v_apelido text;
  v_codigo text;
  v_inseridas integer;
begin
  update public.partidas p
  set fechada_em = p_fechada_em,
      time_id = p_time,
      gestos = p_gestos,
      resultado = p_resultado,
      pontos = p_pontos,
      dia = p_dia,
      semana = p_semana,
      sob_suspeita = p_motivo_suspeita is not null,
      motivo_suspeita = p_motivo_suspeita
  where p.id = p_partida and p.torcedor_id = p_torcedor and p.fechada_em is null
  returning p.minigame, p.amistoso into v_minigame, v_amistoso;
  if not found then
    return;
  end if;

  perform public.atualizar_teto(p_torcedor, p_dia);
  if not v_amistoso then
    perform public.recalcular_ranking(p_semana);
  end if;

  if p_desafio is not null then
    select t.apelido into v_apelido from public.torcedores t where t.id = p_torcedor;
    foreach v_codigo in array coalesce(p_codigos, '{}') loop
      if v_minigame = 'prova' then
        insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, apelido, perguntas, pontos, escada, resumo)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido,
          array(select jsonb_array_elements_text(p_desafio -> 'perguntas')), p_pontos,
          p_desafio ->> 'escada', p_desafio ->> 'resumo')
        on conflict (id) do nothing;
      else
        insert into public.desafios (id, partida_id, torcedor_id, time_id, apelido, cobrancas, gols_jogador, gols_maquina, pontos)
        values (v_codigo, p_partida, p_torcedor, p_time, v_apelido, p_desafio -> 'cobrancas',
          (p_desafio ->> 'gols_jogador')::smallint, (p_desafio ->> 'gols_maquina')::smallint, p_pontos)
        on conflict (id) do nothing;
      end if;
      get diagnostics v_inseridas = row_count;
      exit when v_inseridas > 0;
      v_codigo := null; -- código repetido: tenta o próximo
    end loop;
  end if;

  return query
    select p.conta_no_teto, p.sob_suspeita, v_codigo from public.partidas p where p.id = p_partida;
end;
$$;

-- ---------------------------------------------------------------------------
-- Time do Dia: a última tentativa fecha o dia e recalcula a semana na mesma transação.
-- Grava só se a versão ainda for a lida (trava otimista); nenhuma linha = alguém gravou antes.
-- ---------------------------------------------------------------------------
create or replace function public.fechar_dia(
  p_torcedor uuid,
  p_dia date,
  p_versao integer,
  p_tentativas text[],
  p_acertou boolean,
  p_pontos smallint,
  p_fechada_em timestamptz,
  p_sob_suspeita boolean
)
returns setof public.dia_partidas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.dia_partidas;
begin
  update public.dia_partidas d
  set tentativas = p_tentativas,
      acertou = p_acertou,
      pontos = p_pontos,
      fechada_em = p_fechada_em,
      sob_suspeita = p_sob_suspeita,
      versao = p_versao + 1
  where d.torcedor_id = p_torcedor and d.dia = p_dia and d.versao = p_versao and d.fechada_em is null
  returning d.* into v_linha;
  if not found then
    return;
  end if;
  -- Fora do teto diário: soma por cima na semana do dia, no time de quando jogou.
  if not v_linha.amistoso then
    perform public.recalcular_ranking(public.semana_de(p_dia));
  end if;
  return next v_linha;
end;
$$;

revoke execute on function
  public.fechar_partida(uuid, uuid, text, jsonb, jsonb, integer, date, date, timestamptz, text, jsonb, text[]),
  public.fechar_dia(uuid, date, integer, text[], boolean, smallint, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function
  public.fechar_partida(uuid, uuid, text, jsonb, jsonb, integer, date, date, timestamptz, text, jsonb, text[]),
  public.fechar_dia(uuid, date, integer, text[], boolean, smallint, timestamptz, boolean)
  to service_role;
