-- Boneco em campo e no X1 (docs/jogo.md, seções 6 "Desafio por link" e 14.5, "Boneco em campo"; decidido pelo Kauê em
-- 06/11/2026, C5, Rota B). Só acrescenta: nenhuma tabela ou coluna é apagada ou renomeada. As duas funções de leitura
-- do desafio mudam o retorno (drop + create, com as mesmas permissões, como em 20261105400000).
--
-- O que muda:
-- 1. torcedor_boneco ganha em_campo (o interruptor "Meu boneco em campo" do Perfil), ligado por padrão.
-- 2. boneco_estado devolve o interruptor; boneco_em_campo grava (mesma sessão e mesmo limite por hora do salvar).
-- 3. boneco_para_campo: só as peças que vão a campo, cada uma conferida contra o catálogo (src/jogo/vestiario.ts).
--    O teste supabase/testes/bonecoEmCampo.test.ts compara estas listas com o catálogo, para não divergirem.
-- 4. ver_desafio e ver_desafio_lances devolvem `boneco`: essas peças de quem chamou, buscadas na hora, só com o
--    interruptor dele ligado. Nada é gravado por desafio; nunca sai o id de quem chamou nem outra peça.
-- 5. "Ver meus dados" mostra o interruptor; a junção de contas fica com o mais protetor (desligado ganha).
--
-- Site antigo com esta migração no ar: continua funcionando. Ele ignora a coluna nova do ver_desafio, e a função
-- `boneco` antiga não lê em_campo (vale o padrão, ligado). Ordem de publicação: esta migração, a função `boneco`, o site.

-- ---------------------------------------------------------------------------
-- 1. O interruptor
-- ---------------------------------------------------------------------------
alter table public.torcedor_boneco add column em_campo boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2. Ler e gravar o interruptor (só a função do servidor chama, com a chave secreta)
-- ---------------------------------------------------------------------------
-- Igual ao de 20261106300000_boneco.sql, mais em_campo (null quando ainda não há boneco).
create or replace function public.boneco_estado(p_torcedor uuid, p_sessao uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.boneco_sessao(p_torcedor, p_sessao) then jsonb_build_object('erro', 'sessao')
    when not exists (select 1 from public.torcedores t where t.id = p_torcedor) then jsonb_build_object('erro', 'sem_torcedor')
    else jsonb_build_object(
      'vestimenta', (select b.vestimenta from public.torcedor_boneco b where b.torcedor_id = p_torcedor),
      'em_campo', (select b.em_campo from public.torcedor_boneco b where b.torcedor_id = p_torcedor),
      'xp', coalesce((select c.xp from public.carreira_de(p_torcedor) c), 0),
      'aquecido', exists (select 1 from public.carreira_bonus b where b.torcedor_id = p_torcedor and b.tipo = 'aquecimento'),
      'medalhas', coalesce((
        select jsonb_agg(jsonb_build_object('item', m.lance_id, 'gols', m.gols, 'recriados', m.recriados, 'vitorias', m.vitorias)
          order by m.lance_id)
        from public.medalhas_de(p_torcedor) m
      ), '[]'::jsonb)
    )
  end;
$$;

-- Liga ou desliga o boneco em campo. Conta na mesma janela de 30 gravações por hora do boneco_gravar, numa instrução
-- só (a segunda gravação ao mesmo tempo espera a linha da primeira e reavalia o where). Sem boneco ainda,
-- {"erro": "sem_boneco"}: a função sorteia um (boneco_criar) e tenta de novo.
-- Devolve {"erro": "sessao" | "sem_torcedor" | "sem_boneco" | "limite"} ou {"em_campo": boolean}.
create or replace function public.boneco_em_campo(p_torcedor uuid, p_sessao uuid, p_ligado boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite constant smallint := 30;
  v_gravado boolean;
begin
  if not public.boneco_sessao(p_torcedor, p_sessao) then
    return jsonb_build_object('erro', 'sessao');
  end if;
  if not exists (select 1 from public.torcedores t where t.id = p_torcedor) then
    return jsonb_build_object('erro', 'sem_torcedor');
  end if;
  if p_ligado is null then
    raise exception 'p_ligado nulo' using errcode = '22004';
  end if;
  if not exists (select 1 from public.torcedor_boneco b where b.torcedor_id = p_torcedor) then
    return jsonb_build_object('erro', 'sem_boneco');
  end if;
  update public.torcedor_boneco as b
    set em_campo = p_ligado,
      atualizado_em = now(),
      gravacoes = case when b.janela_desde <= now() - interval '1 hour' then 1 else b.gravacoes + 1 end,
      janela_desde = case when b.janela_desde <= now() - interval '1 hour' then now() else b.janela_desde end
    where b.torcedor_id = p_torcedor
      and (b.janela_desde <= now() - interval '1 hour' or b.gravacoes < v_limite)
  returning b.em_campo into v_gravado;
  if v_gravado is null then
    return jsonb_build_object('erro', 'limite');
  end if;
  return jsonb_build_object('em_campo', v_gravado);
end;
$$;

revoke execute on function public.boneco_em_campo(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.boneco_em_campo(uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 3. As peças que vão a campo, conferidas contra o catálogo (src/jogo/vestiario.ts)
-- ---------------------------------------------------------------------------
-- Entra a vestimenta guardada (já conferida pela função ao salvar); sai um objeto novo só com corpo, pele, cabelo,
-- corCabelo, numero, cabeca, punho, braco e chuteira. Valor fora do catálogo, de tipo errado ou ausente volta ao
-- PADRAO, campo a campo, como o `validar`. Camisa, colete, faixa, apito, pose, fundo e moldura nunca saem. O que não
-- se refaz aqui é a conta das peças liberadas (precisa da Carreira e das medalhas): ela é feita ao salvar, e peça
-- liberada não volta a trancar. O que não é objeto sai null (sem boneco).
create or replace function public.boneco_para_campo(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when p is null or jsonb_typeof(p) <> 'object' then null else jsonb_build_object(
    'corpo', case when jsonb_typeof(p -> 'corpo') = 'string' and p ->> 'corpo' in ('h', 'm') then p -> 'corpo' else '"h"' end,
    'pele', case when jsonb_typeof(p -> 'pele') = 'number' and p ->> 'pele' in ('0', '1', '2', '3', '4', '5') then p -> 'pele' else '0' end,
    'cabelo', case when jsonb_typeof(p -> 'cabelo') = 'string'
        and p ->> 'cabelo' in ('raspado', 'curto', 'crespo', 'trancas', 'coque', 'rabo', 'comprido') then p -> 'cabelo' else '"raspado"' end,
    'corCabelo', case when jsonb_typeof(p -> 'corCabelo') = 'number'
        and p ->> 'corCabelo' in ('0', '1', '2', '3', '4', '5') then p -> 'corCabelo' else '0' end,
    'numero', case when jsonb_typeof(p -> 'numero') = 'string' and p ->> 'numero' ~ '^[0-9]{1,2}$' then p -> 'numero' else 'null' end,
    'cabeca', case when jsonb_typeof(p -> 'cabeca') = 'string' and p ->> 'cabeca' in ('nenhum', 'testeira') then p -> 'cabeca' else '"nenhum"' end,
    'punho', case when jsonb_typeof(p -> 'punho') = 'string'
        and p ->> 'punho' in ('nenhum', 'munhequeira', 'munhequeira_bronze') then p -> 'punho' else '"nenhum"' end,
    'braco', case when jsonb_typeof(p -> 'braco') = 'string' and p ->> 'braco' in ('nenhum', 'bracadeira') then p -> 'braco' else '"nenhum"' end,
    'chuteira', case when jsonb_typeof(p -> 'chuteira') = 'string'
        and p ->> 'chuteira' in ('neutra', 'time', 'dourada') then p -> 'chuteira' else '"neutra"' end
  ) end;
$$;

-- O boneco de quem chamou, na hora: as peças de campo, ou null sem boneco ou com o interruptor desligado.
create or replace function public.boneco_do_desafiante(p_torcedor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.boneco_para_campo(b.vestimenta)
  from public.torcedor_boneco b
  where b.torcedor_id = p_torcedor and b.em_campo;
$$;

revoke execute on function public.boneco_para_campo(jsonb), public.boneco_do_desafiante(uuid) from public, anon, authenticated;
grant execute on function public.boneco_para_campo(jsonb), public.boneco_do_desafiante(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. O resumo do desafio com o boneco de quem chamou (o retorno muda: drop + create, com as mesmas permissões)
-- ---------------------------------------------------------------------------
-- Igual ao de 20261105400000_lances_sem_livre.sql, mais `boneco`.
drop function if exists public.ver_desafio(text);
create function public.ver_desafio(p_id text)
returns table (id text, time_id text, apelido text, gols_jogador smallint, gols_maquina smallint, pontos integer, disputa_id text, boneco jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.gols_jogador, d.gols_maquina, d.pontos, p.disputa_id, public.boneco_do_desafiante(d.torcedor_id)
  from public.desafios d
  left join public.partidas p on p.id = d.partida_id
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio(text) from public;
grant execute on function public.ver_desafio(text) to anon, authenticated;

-- Igual ao de 20261105100000_lances_unificados.sql, mais `boneco`.
drop function if exists public.ver_desafio_lances(text);
create function public.ver_desafio_lances(p_id text)
returns table (id text, time_id text, apelido text, lance_id text, pontos integer, gols smallint, recriados smallint, faixa text, boneco jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.time_id, d.apelido, d.lance_id, d.pontos, d.gols, d.recriados, d.faixa, public.boneco_do_desafiante(d.torcedor_id)
  from public.lances_desafios d
  where d.id = lower(p_id);
$$;
revoke execute on function public.ver_desafio_lances(text) from public;
grant execute on function public.ver_desafio_lances(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. "Ver meus dados": igual ao de 20261106300000_boneco.sql, mais o interruptor (null sem boneco).
-- ---------------------------------------------------------------------------
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
      + (select count(*) from public.lances_desafios d where d.torcedor_id = eu.id)
    )::integer,
    'palpites', (select count(*)::integer from public.palpites p where p.torcedor_id = eu.id),
    'carreira_xp', (select c.xp from public.carreira_de(eu.id) c),
    'gols_lances', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id and not g.vitoria),
    'vitorias_penaltis', (select count(*)::integer from public.lances_gols g where g.torcedor_id = eu.id and g.vitoria),
    'tentativas_lances', (select count(*)::integer from public.lances_tentativas t where t.torcedor_id = eu.id),
    'boneco', exists (select 1 from public.torcedor_boneco b where b.torcedor_id = eu.id),
    'boneco_em_campo', (select b.em_campo from public.torcedor_boneco b where b.torcedor_id = eu.id),
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
-- 6. Junção de contas pelo código: igual ao de 20261106300000_boneco.sql, mais o interruptor. Fica o boneco do dono
--    (sem o dele, o da conta que entrou), e o interruptor mais protetor: se uma das duas o desligou, fica desligado.
-- ---------------------------------------------------------------------------
create or replace function public.juntar_torcedores(p_impressao text, p_origem uuid, p_time text default null)
returns table (time_id text, apelido text, faixa_etaria text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_dono uuid;
  v_d public.torcedores;
  v_o public.torcedores;
  v_tem_origem boolean;
  v_time text;
  v_faixa text;
  v_ordem constant text[] := array['menos_16', '16_17', '18_mais'];
  v_rodadas smallint[];
begin
  select c.dono into v_dono from public.codigos_torcedor c where c.impressao = p_impressao;
  if v_dono is null then
    raise exception 'codigo_invalido' using errcode = 'P0001';
  end if;
  -- As duas contas, sempre na mesma ordem: duas junções com as mesmas contas nunca esperam uma pela outra em cruz.
  perform pg_advisory_xact_lock(hashtext('juntar_torcedores'), hashtext(least(v_dono::text, p_origem::text)));
  perform pg_advisory_xact_lock(hashtext('juntar_torcedores'), hashtext(greatest(v_dono::text, p_origem::text)));

  perform 1 from public.codigos_torcedor c
  where c.impressao = p_impressao and c.dono = v_dono and c.usado_em is null and c.cancelado_em is null
    and c.expira_em > now() and c.reservado_por = p_origem
  for update;
  if not found then
    raise exception 'codigo_invalido' using errcode = 'P0001';
  end if;
  if v_dono = p_origem then
    raise exception 'proprio' using errcode = 'P0001';
  end if;
  if not public.conta_de_torcedor(v_dono) or not public.conta_de_torcedor(p_origem) then
    raise exception 'conta_nao_anonima' using errcode = '42501';
  end if;

  select * into v_d from public.torcedores t where t.id = v_dono for update;
  if not found then
    raise exception 'codigo_invalido' using errcode = 'P0001';
  end if;
  select * into v_o from public.torcedores t where t.id = p_origem for update;
  v_tem_origem := found;

  update public.codigos_torcedor c set usado_em = now() where c.impressao = p_impressao;

  if v_tem_origem then
    if v_o.time_id = v_d.time_id then
      v_time := v_d.time_id;
    elsif p_time is not null and p_time in (v_d.time_id, v_o.time_id) then
      v_time := p_time;
    else
      raise exception 'escolher_time' using errcode = 'P0001';
    end if;
    v_faixa := case
      when v_d.faixa_etaria is null then v_o.faixa_etaria
      when v_o.faixa_etaria is null then v_d.faixa_etaria
      else v_ordem[least(array_position(v_ordem, v_d.faixa_etaria), array_position(v_ordem, v_o.faixa_etaria))]
    end;

    -- Os pontos da origem ficam no placar (igual ao apagar_meus_dados de 20261102000100).
    insert into public.pontos_apagados (semana, time_id, total, ultima)
    select s.semana, t.time_id, t.total, t.ultima
    from (
      select p.semana from public.partidas p where p.torcedor_id = p_origem and p.semana is not null
      union
      select public.semana_de(d.dia) from public.dia_partidas d where d.torcedor_id = p_origem
      union
      select c.semana from public.crava_pontos c where c.torcedor_id = p_origem
    ) s
    cross join lateral public.totais_semana(s.semana) t
    join public.times tm on tm.id = t.time_id and tm.oficial
    where t.torcedor_id = p_origem and t.total > 0;

    -- Recordes antes de mexer em qualquer coisa: recorde_pessoal lê as partidas da origem e o herdado dela.
    insert into public.recordes_herdados as h (torcedor_id, minigame, recorde)
    select v_dono, m.minigame, r.recorde
    from (values ('penaltis'), ('prova'), ('dia'), ('crava'), ('lances')) as m (minigame)
    cross join lateral (select public.recorde_pessoal(p_origem, m.minigame) as recorde) r
    where r.recorde > 0
    on conflict (torcedor_id, minigame) do update
      set recorde = excluded.recorde, herdado_em = now()
      -- Herança de antes do corte é de outra tabela de pontos (e a regra nova a ignora): depois do corte, a nova
      -- sempre a substitui. Antes do corte as duas são da tabela velha, e só a maior fica.
      where excluded.recorde > h.recorde
        or (h.minigame in ('penaltis', 'lances') and h.herdado_em < public.lances_unificados_desde()
            and now() >= public.lances_unificados_desde());

    update public.torcedores t
      set time_id = v_time, apelido = coalesce(v_d.apelido, v_o.apelido), faixa_etaria = v_faixa, atualizado_em = now()
      where t.id = v_dono;

    insert into public.carreira_partidas (torcedor_id, origem, referencia, dia, criado_em)
    select v_dono, c.origem, c.referencia, c.dia, c.criado_em
    from public.carreira_partidas c where c.torcedor_id = p_origem
    on conflict do nothing;
    insert into public.carreira_bonus (torcedor_id, tipo, referencia, time_id, xp, criado_em)
    select v_dono, b.tipo, b.referencia, b.time_id, b.xp, b.criado_em
    from public.carreira_bonus b where b.torcedor_id = p_origem
    on conflict do nothing;

    update public.lances_gols g set torcedor_id = v_dono where g.torcedor_id = p_origem;

    -- Boneco (seção 14.5): fica o do dono; sem o dele, o da conta que entrou. As peças dela continuam liberadas,
    -- porque a carreira e as medalhas vieram junto. O limite de gravações começa do zero.
    -- O interruptor "Meu boneco em campo": desligado em qualquer das duas contas, fica desligado.
    insert into public.torcedor_boneco as d (torcedor_id, vestimenta, atualizado_em, em_campo)
    select v_dono, b.vestimenta, b.atualizado_em, b.em_campo from public.torcedor_boneco b where b.torcedor_id = p_origem
    on conflict (torcedor_id) do update set em_campo = d.em_campo and excluded.em_campo;

    select coalesce(array_agg(r.rodada), '{}') into v_rodadas
    from (
      select j.rodada from public.palpites p join public.jogos j on j.id = p.jogo_id where p.torcedor_id = p_origem
      union
      select c.rodada from public.certezas c where c.torcedor_id = p_origem
    ) r
    where not exists (select 1 from public.crava_pontos cp where cp.torcedor_id = p_origem and cp.rodada = r.rodada)
      and not exists (
        select 1 from public.palpites p join public.jogos j on j.id = p.jogo_id
        where p.torcedor_id = v_dono and j.rodada = r.rodada)
      and not exists (select 1 from public.certezas c where c.torcedor_id = v_dono and c.rodada = r.rodada);
    -- O gatilho do palpite grava o time de agora do dono (o escolhido acima).
    update public.palpites p set torcedor_id = v_dono
    from public.jogos j
    where j.id = p.jogo_id and p.torcedor_id = p_origem and j.rodada = any (v_rodadas);
    update public.certezas c set torcedor_id = v_dono where c.torcedor_id = p_origem and c.rodada = any (v_rodadas);

    insert into public.prova_vistas as v (torcedor_id, pergunta_id, vista_em)
    select v_dono, o.pergunta_id, o.vista_em from public.prova_vistas o where o.torcedor_id = p_origem
    on conflict (torcedor_id, pergunta_id) do update set vista_em = greatest(v.vista_em, excluded.vista_em);
  end if;

  update public.push_inscricoes i set torcedor_id = v_dono where i.torcedor_id = p_origem;
  -- No máximo 5 aparelhos por pessoa, como no salvar_inscricao_push (o mais antigo sai).
  delete from public.push_inscricoes i
  where i.torcedor_id = v_dono
    and i.endpoint not in (
      select x.endpoint from public.push_inscricoes x where x.torcedor_id = v_dono order by x.criada_em desc limit 5
    );
  update public.feedbacks f set usuario_id = v_dono where f.usuario_id = p_origem;
  -- Como no salvar_faixa_etaria: só 18+ recebe o aviso de domingo.
  if v_faixa is not null and v_faixa <> '18_mais' then
    delete from public.push_inscricoes i where i.torcedor_id = v_dono;
  end if;

  delete from auth.users where id = p_origem;
  insert into public.contas_juntadas (tinha_dados) values (v_tem_origem);

  return query select t.time_id, t.apelido, t.faixa_etaria from public.torcedores t where t.id = v_dono;
end;
$$;
