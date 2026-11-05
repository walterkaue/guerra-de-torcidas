-- Boneco montável: onde fica guardado (docs/jogo.md, seção 14.5, D5b). Só acrescenta: nenhuma tabela ou coluna é
-- apagada ou renomeada.
-- A regra das peças mora num lugar só, src/jogo/vestiario.ts. Quem confere é a função do servidor `boneco`, que lê a
-- cópia em supabase/functions/_shared (npm run compartilhar). Aqui ficam só os dados que ela lê (XP, medalhas,
-- aquecimento, a vestimenta guardada) e a gravação, com a sessão e o limite por hora. O celular não lê nem grava a
-- tabela, nem chama estas funções: só a função do servidor, com a chave secreta.

-- ---------------------------------------------------------------------------
-- 1. Tabela. Some com a conta (chave para torcedores): "Apagar meus dados", contas paradas e a conta que entrou na
--    junção. O zerar-pre-temporada não a toca, como a Carreira. npm run metricas e o balanço não a leem.
-- ---------------------------------------------------------------------------
create table public.torcedor_boneco (
  torcedor_id uuid primary key references public.torcedores (id) on delete cascade,
  -- Só códigos curtos (Vestimenta em src/jogo/vestiario.ts), nunca cores nem rótulos. A função confere o formato
  -- (até 512 caracteres em JSON compacto); o teto aqui é uma segunda trava, com folga para os espaços do jsonb.
  vestimenta jsonb not null check (jsonb_typeof(vestimenta) = 'object' and length(vestimenta::text) <= 1024),
  atualizado_em timestamptz not null default now(),
  -- Limite de gravações por hora (janela fixa, a partir da 1ª gravação dela). O sorteio da conta nova não conta.
  gravacoes smallint not null default 0 check (gravacoes >= 0),
  janela_desde timestamptz not null default now()
);

alter table public.torcedor_boneco enable row level security;
revoke all on public.torcedor_boneco from anon, authenticated;
grant all on public.torcedor_boneco to service_role;
create policy "torcedor_boneco: ninguém pelo cliente" on public.torcedor_boneco
  as restrictive for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 2. Funções que só a função do servidor chama. O id da pessoa e o da sessão vêm do passe (JWT) já conferido pelo
--    Auth (getUser); a sessão é conferida de novo aqui, para um aparelho desconectado não gravar com o passe que
--    ainda não venceu (como sessao_ativa(), seção 14.1).
-- ---------------------------------------------------------------------------
create or replace function public.boneco_sessao(p_torcedor uuid, p_sessao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_torcedor is not null and p_sessao is not null and exists (
    select 1 from auth.sessions s
    where s.id = p_sessao and s.user_id = p_torcedor and (s.not_after is null or s.not_after > now())
  );
$$;

-- O que a regra precisa, lido do que o servidor já guarda: XP da Carreira (carreira_partidas e carreira_bonus, pela
-- carreira_de), medalhas por item (lances_gols, pela medalhas_de: gols, recriados e vitórias; o item 'penaltis:…' é
-- disputa) e o Aquecimento (linha 'aquecimento' de carreira_bonus). A Seleção sai do catálogo, na função.
-- Devolve {"erro": "sessao" | "sem_torcedor"} ou {"vestimenta": jsonb ou null, "xp", "aquecido", "medalhas"}.
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

-- Conta sem boneco (nova ou de antes do D5b): grava o sorteado entre as peças do começo, na 1ª leitura. Duas leituras
-- ao mesmo tempo não brigam (on conflict do nothing): fica o que chegou primeiro, e as duas devolvem o mesmo (o select
-- é outra instrução, com retrato novo, e enxerga a linha da outra). O teste (PGlite, uma conexão) só prova em
-- sequência; a corrida foi provada em Postgres 17 com várias conexões na revisão de segurança de 05/11/2026.
-- Devolve {"erro": "sessao" | "sem_torcedor"} ou {"vestimenta": jsonb}.
create or replace function public.boneco_criar(p_torcedor uuid, p_sessao uuid, p_vestimenta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.boneco_sessao(p_torcedor, p_sessao) then
    return jsonb_build_object('erro', 'sessao');
  end if;
  if not exists (select 1 from public.torcedores t where t.id = p_torcedor) then
    return jsonb_build_object('erro', 'sem_torcedor');
  end if;
  insert into public.torcedor_boneco (torcedor_id, vestimenta) values (p_torcedor, p_vestimenta)
  on conflict (torcedor_id) do nothing;
  return jsonb_build_object('vestimenta', (select b.vestimenta from public.torcedor_boneco b where b.torcedor_id = p_torcedor));
end;
$$;

-- Salvar do vestiário: a vestimenta já vem conferida pela função (formato e peças liberadas). Até 30 gravações por
-- hora por torcedor: cada Salvar é uma, e uma visita ao vestiário salva 1 a 3 vezes. Passou, não grava.
-- Devolve {"erro": "sessao" | "sem_torcedor" | "limite"} ou {"vestimenta": jsonb}.
create or replace function public.boneco_gravar(p_torcedor uuid, p_sessao uuid, p_vestimenta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite constant smallint := 30;
  v_gravada jsonb;
begin
  if not public.boneco_sessao(p_torcedor, p_sessao) then
    return jsonb_build_object('erro', 'sessao');
  end if;
  if not exists (select 1 from public.torcedores t where t.id = p_torcedor) then
    return jsonb_build_object('erro', 'sem_torcedor');
  end if;
  -- Numa instrução só: no on conflict do update, a segunda gravação espera a linha da primeira e reavalia o where
  -- sobre ela, então as duas contam. (Provado em Postgres 17 na revisão de segurança de 05/11/2026: 60 gravações ao
  -- mesmo tempo, 30 passam.)
  insert into public.torcedor_boneco as b (torcedor_id, vestimenta, gravacoes, janela_desde)
  values (p_torcedor, p_vestimenta, 1, now())
  on conflict (torcedor_id) do update
    set vestimenta = excluded.vestimenta,
      atualizado_em = now(),
      gravacoes = case when b.janela_desde <= now() - interval '1 hour' then 1 else b.gravacoes + 1 end,
      janela_desde = case when b.janela_desde <= now() - interval '1 hour' then now() else b.janela_desde end
    where b.janela_desde <= now() - interval '1 hour' or b.gravacoes < v_limite
  returning b.vestimenta into v_gravada;
  if v_gravada is null then
    return jsonb_build_object('erro', 'limite');
  end if;
  return jsonb_build_object('vestimenta', v_gravada);
end;
$$;

revoke execute on function public.boneco_sessao(uuid, uuid), public.boneco_estado(uuid, uuid),
  public.boneco_criar(uuid, uuid, jsonb), public.boneco_gravar(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.boneco_estado(uuid, uuid), public.boneco_criar(uuid, uuid, jsonb),
  public.boneco_gravar(uuid, uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. "Ver meus dados": igual ao de 20261105100000_lances_unificados.sql, mais se há boneco guardado.
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
-- 4. Junção de contas pelo código (seção 14.1): igual ao de 20261105100000_lances_unificados.sql, mais o boneco.
--    "Apagar meus dados" e a limpeza de contas paradas não mudam: apagam a conta em auth.users e o boneco vai junto,
--    pela cascata de torcedores.
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
    insert into public.torcedor_boneco (torcedor_id, vestimenta, atualizado_em)
    select v_dono, b.vestimenta, b.atualizado_em from public.torcedor_boneco b where b.torcedor_id = p_origem
    on conflict (torcedor_id) do nothing;

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
