-- Os gols de quem chamou no desafio dos Lances (backlog C03 e C08, decisão do Kauê em 09/11/2026; docs/jogos/lances.md,
-- "Desafio dos Lances" e "Servidor"). Só acrescenta: nenhuma tabela ou coluna é apagada ou renomeada.
--
-- O que muda:
-- 1. ver_desafio_lances devolve, no fim, a coluna `tentativas`: as 3 tentativas da partida de quem chamou, tiradas de
--    partidas.resultado->'lances', para o convite mostrar a fita e redesenhar os gols. Lista branca, campo a campo,
--    montada aqui: desfecho, pontos, recriou, cavadinha, x, y, goleiroX, tFim (números com 3 casas) e o gesto
--    {dir, forca, efeito} (inteiros). Nunca semente, id de partida, torcedor, faixa do segredo, sob_suspeita ou
--    qualquer coisa de partidas_segredo. Sem a partida, sem 'lances' ou com a partida sob suspeita, `tentativas` é null.
--    Não é brecha: a partida de quem chamou já fechou (o resultado e o gesto ficam no aparelho dele desde o chute), e
--    quem aceita joga o mesmo lance com sementes novas, sorteadas e guardadas só no servidor. Ver onde a bola entrou
--    é o mesmo que ver o replay: não diz nada do tremor nem do goleiro da partida nova.
--    Desafio vencido (mais de 7 dias) continua devolvendo os gols até a limpeza de 30 dias apagar a linha.
-- 2. funil: evento 'viu_gols' (o 1º gol de quem chamou passou no convite), só com tipo 'x1_lances', sem meio nem jogo,
--    com X1. Igual ao de 20261108000000_funil_x1.sql, mais essa linha.
--
-- Site antigo com esta migração no ar: lê as colunas pelo nome e ignora `tentativas` (o convite fica como era). A função
-- `funil` antiga recusa 'viu_gols' no celular antes de chegar ao banco. Ordem de publicação: esta migração, a função
-- `funil` e o site.

-- ---------------------------------------------------------------------------
-- 1. As tentativas no resumo do desafio dos Lances
-- ---------------------------------------------------------------------------
-- Igual ao de 20261109000000_prazo_desafios.sql (mesmas colunas, na mesma ordem), mais `tentativas` no fim.
-- Cada campo é conferido pelo tipo e pelo tamanho do JSON: o que vier fora do formato vira null (o celular descarta a
-- lista inteira), em vez de um erro (texto no lugar de número, inteiro fora da faixa) que derrubaria o resumo e o convite.
drop function if exists public.ver_desafio_lances(text);
create function public.ver_desafio_lances(p_id text)
returns table (id text, time_id text, apelido text, lance_id text, pontos integer, gols smallint, recriados smallint, faixa text,
  boneco jsonb, vencido boolean, tentativas jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.lance_id, d.pontos, d.gols, d.recriados, d.faixa, public.boneco_do_desafiante(d.torcedor_id),
    now() >= public.desafio_vale_ate(d.criado_em),
    (
      select jsonb_agg(
        jsonb_build_object(
          'desfecho', case when t.l->>'desfecho' in ('gol', 'defesa', 'barreira', 'fora', 'trave') then t.l->>'desfecho' end,
          'pontos', case when jsonb_typeof(t.l->'pontos') = 'number' and abs((t.l->>'pontos')::numeric) < 1000000
            then round((t.l->>'pontos')::numeric)::integer end,
          'recriou', case when jsonb_typeof(t.l->'recriou') = 'boolean' then (t.l->>'recriou')::boolean end,
          'cavadinha', case when jsonb_typeof(t.l->'cavadinha') = 'boolean' then (t.l->>'cavadinha')::boolean end,
          'x', case when jsonb_typeof(t.l->'x') = 'number' and abs((t.l->>'x')::numeric) < 1000000
            then round((t.l->>'x')::numeric, 3) end,
          'y', case when jsonb_typeof(t.l->'y') = 'number' and abs((t.l->>'y')::numeric) < 1000000
            then round((t.l->>'y')::numeric, 3) end,
          'goleiroX', case when jsonb_typeof(t.l->'goleiroX') = 'number' and abs((t.l->>'goleiroX')::numeric) < 1000000
            then round((t.l->>'goleiroX')::numeric, 3) end,
          'tFim', case when jsonb_typeof(t.l->'tFim') = 'number' and abs((t.l->>'tFim')::numeric) < 1000000
            then round((t.l->>'tFim')::numeric, 3) end,
          'gesto', jsonb_build_object(
            'dir', case when jsonb_typeof(t.l->'gesto'->'dir') = 'number' and abs((t.l->'gesto'->>'dir')::numeric) < 1000000
              then round((t.l->'gesto'->>'dir')::numeric)::integer end,
            'forca', case when jsonb_typeof(t.l->'gesto'->'forca') = 'number' and abs((t.l->'gesto'->>'forca')::numeric) < 1000000
              then round((t.l->'gesto'->>'forca')::numeric)::integer end,
            'efeito', case when jsonb_typeof(t.l->'gesto'->'efeito') = 'number' and abs((t.l->'gesto'->>'efeito')::numeric) < 1000000
              then round((t.l->'gesto'->>'efeito')::numeric)::integer end
          )
        )
        order by t.ordem
      )
      from jsonb_array_elements(case when jsonb_typeof(p.resultado->'lances') = 'array' then p.resultado->'lances' end)
        with ordinality as t(l, ordem)
    )
  from public.lances_desafios d
  -- Partida sob suspeita (gesto de robô, acima da mira perfeita) não mostra os gols: o convite fica como era. Liberada
  -- pelo #admin, volta a mostrar.
  left join public.partidas p on p.id = d.partida_id and p.minigame = 'lances' and not p.sob_suspeita
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio_lances(text) from public;
grant execute on function public.ver_desafio_lances(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Funil: 'viu_gols'
-- ---------------------------------------------------------------------------
-- Igual ao de 20261108000000_funil_x1.sql, mais 'viu_gols'. As tabelas do funil usam esta função nos checks; quem já
-- está gravado continua válido (a lista só cresce).
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
    -- Os gols de quem chamou passaram no convite (só os Lances têm o telão).
    when 'viu_gols' then p_tipo = 'x1_lances' and p_meio = '' and p_jogo = '' and p_x1
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
