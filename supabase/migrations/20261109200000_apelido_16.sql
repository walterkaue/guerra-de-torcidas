-- Apelido só para quem marcou 16 ou mais na triagem (APELIDO16; docs/jogo.md, seções 4 e 7; decidido pelo Kauê em
-- 09/11/2026). A regra é a de src/jogo/faixaEtaria.ts (podeTerApelido): só '16_17' e '18_mais'; sem resposta conta
-- como não. Só acrescenta: nenhuma tabela, coluna ou função é apagada ou renomeada. Nada muda em pontos, ranking ou
-- funil; RLS e travas como antes, e quem chama cada função continua o mesmo.
--
-- 1. salvar_torcedor: igual ao de 20261103400000_codigo_torcedor.sql (filtro e tamanho do apelido primeiro, com os
--    erros de sempre), mais: se a faixa do torcedor no servidor não for 16+, grava o time e descarta o apelido, sem
--    erro. A linha devolvida vem com apelido null; o app lê "mandei apelido e voltou vazio" como 'apelido_idade'.
--    Sem erro porque um raise desfaria a chamada inteira, e o site antigo manda o apelido na escolha do time, antes
--    da triagem: o time não seria gravado e as partidas não valeriam.
-- 2. salvar_faixa_etaria: a faixa gravada só muda para uma mais protetora (a regra da junção). Sem isso, quem
--    marcou menos de 16 subia para 18_mais com uma chamada direta e depois gravava o apelido (e o push).
-- 3. Gatilhos em torcedores: com faixa menos_16 o apelido é sempre null; quando a faixa vira menos_16
--    (salvar_faixa_etaria, juntar_torcedores ou qualquer outro caminho), os desafios da pessoa perdem o apelido.
--    Na junção, os desafios da conta que entrou somem com ela (on delete cascade); os do dono, pelo gatilho.
-- 4. Gatilho nas três tabelas de desafio: um desafio novo (ou que muda de dono) só leva apelido de quem é 16+.
-- 5. Limpeza única: torcedores menos_16 e os desafios deles ficam sem apelido; quem não respondeu a triagem perde
--    o dos desafios (qualquer um com o link vê). Guarda só quando e quantos (apelidos_apagados, com o motivo novo
--    'idade'), nunca o apelido.
--
-- Ordem de publicação: esta migração primeiro, o site logo depois. Com o site primeiro, até a migração entrar o
-- servidor antigo segue gravando apelido de quem tem menos de 16 (aba aberta do site antigo, chamada direta) e os
-- desafios deles seguem mostrando o apelido a quem abre o link, no site novo também. Com a migração primeiro, o site
-- antigo continua funcionando: quem tem menos de 16 (ou não respondeu) e manda apelido tem o time gravado e o apelido
-- descartado, e só o card do próprio aparelho pode mostrar o apelido até o próximo carregamento, quando o aparelho
-- adota o do servidor (vazio). O custo: um 16+ novo que digita o apelido na escolha do time do site antigo, antes da
-- triagem, perde o apelido sem aviso.

-- ---------------------------------------------------------------------------
-- 1. salvar_torcedor
-- ---------------------------------------------------------------------------
create or replace function public.salvar_torcedor(p_time text, p_apelido text default null)
returns public.torcedores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_apelido text := nullif(btrim(coalesce(p_apelido, '')), '');
  v_linha public.torcedores;
begin
  if v_uid is null then
    raise exception 'sem_login' using errcode = '28000';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if not exists (select 1 from public.times where id = p_time) then
    raise exception 'time_invalido' using errcode = '22023';
  end if;
  if v_apelido is not null then
    v_apelido := regexp_replace(v_apelido, '\s+', ' ', 'g');
    if char_length(v_apelido) > 20 then
      raise exception 'apelido_longo' using errcode = '22023';
    end if;
    if public.apelido_bloqueado(v_apelido) then
      raise exception 'apelido_bloqueado' using errcode = '22023';
    end if;
    -- Só 16+ (podeTerApelido). Torcedor novo ainda não tem faixa no servidor: conta como não.
    if not exists (
      select 1 from public.torcedores t where t.id = v_uid and t.faixa_etaria in ('16_17', '18_mais')
    ) then
      v_apelido := null;
    end if;
  end if;

  insert into public.torcedores (id, time_id, apelido)
  values (v_uid, p_time, v_apelido)
  on conflict (id) do update
    set time_id = excluded.time_id, apelido = excluded.apelido, atualizado_em = now()
  returning * into v_linha;
  return v_linha;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. salvar_faixa_etaria: igual ao de 20261103400000_codigo_torcedor.sql, mas a faixa gravada só fica mais
--    protetora. A primeira resposta (null) vale qualquer faixa. Pedido de faixa menos protetora: fica a gravada, sem
--    erro, e devolve true como antes (o aparelho adota a do servidor na próxima carga; erro faria ele tentar de novo
--    a cada sincronização). A tela não oferece trocar a faixa: nenhum aparelho de verdade pede para subir.
-- ---------------------------------------------------------------------------
create or replace function public.salvar_faixa_etaria(p_faixa text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ordem constant text[] := array['menos_16', '16_17', '18_mais'];
  v_faixa text;
begin
  if auth.uid() is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  if not public.sessao_ativa() then
    raise exception 'sessao_encerrada' using errcode = '42501';
  end if;
  if p_faixa is null or p_faixa not in ('menos_16', '16_17', '18_mais') then
    raise exception 'faixa_invalida' using errcode = '22023';
  end if;
  update public.torcedores t
    set faixa_etaria = case
      when t.faixa_etaria is null then p_faixa
      else v_ordem[least(array_position(v_ordem, t.faixa_etaria), array_position(v_ordem, p_faixa))]
    end
    where t.id = auth.uid()
    returning t.faixa_etaria into v_faixa;
  -- Só 18+ recebe o aviso de domingo: vale a faixa que ficou gravada.
  if coalesce(v_faixa, p_faixa) <> '18_mais' then
    delete from public.push_inscricoes where torcedor_id = auth.uid();
  end if;
  return v_faixa is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Gatilhos em torcedores
-- ---------------------------------------------------------------------------
create or replace function public.torcedor_sem_apelido_menos_16()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.apelido := null;
  return new;
end;
$$;

drop trigger if exists torcedor_sem_apelido_menos_16 on public.torcedores;
create trigger torcedor_sem_apelido_menos_16
  before insert or update on public.torcedores
  for each row
  when (new.faixa_etaria = 'menos_16' and new.apelido is not null)
  execute function public.torcedor_sem_apelido_menos_16();

create or replace function public.desafios_sem_apelido_menos_16()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.desafios d set apelido = null where d.torcedor_id = new.id and d.apelido is not null;
  update public.prova_desafios d set apelido = null where d.torcedor_id = new.id and d.apelido is not null;
  update public.lances_desafios d set apelido = null where d.torcedor_id = new.id and d.apelido is not null;
  return null;
end;
$$;

drop trigger if exists desafios_sem_apelido_menos_16 on public.torcedores;
create trigger desafios_sem_apelido_menos_16
  after update of faixa_etaria on public.torcedores
  for each row
  when (new.faixa_etaria = 'menos_16' and old.faixa_etaria is distinct from 'menos_16')
  execute function public.desafios_sem_apelido_menos_16();

-- ---------------------------------------------------------------------------
-- 4. Desafio novo só leva apelido de quem é 16+
-- ---------------------------------------------------------------------------
create or replace function public.desafio_apelido_so_16()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.torcedores t where t.id = new.torcedor_id and t.faixa_etaria in ('16_17', '18_mais')
  ) then
    new.apelido := null;
  end if;
  return new;
end;
$$;

drop trigger if exists desafio_apelido_so_16 on public.desafios;
create trigger desafio_apelido_so_16
  before insert or update of apelido, torcedor_id on public.desafios
  for each row when (new.apelido is not null)
  execute function public.desafio_apelido_so_16();

drop trigger if exists desafio_apelido_so_16 on public.prova_desafios;
create trigger desafio_apelido_so_16
  before insert or update of apelido, torcedor_id on public.prova_desafios
  for each row when (new.apelido is not null)
  execute function public.desafio_apelido_so_16();

drop trigger if exists desafio_apelido_so_16 on public.lances_desafios;
create trigger desafio_apelido_so_16
  before insert or update of apelido, torcedor_id on public.lances_desafios
  for each row when (new.apelido is not null)
  execute function public.desafio_apelido_so_16();

-- Funções de gatilho: ninguém chama direto.
revoke execute on function public.torcedor_sem_apelido_menos_16(), public.desafios_sem_apelido_menos_16(),
  public.desafio_apelido_so_16() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Limpeza única
-- ---------------------------------------------------------------------------
-- 'admin': o #admin apagou (apelido_apagar, que não informa o motivo e fica com o padrão); 'idade': esta limpeza.
alter table public.apelidos_apagados
  add column if not exists motivo text not null default 'admin' check (motivo in ('admin', 'idade'));

do $$
declare
  v_n integer;
begin
  -- Menos de 16: perde o apelido do perfil e o dos desafios. Sem resposta da triagem: perde só o dos desafios, que
  -- qualquer um com o link vê (sem resposta conta como não, como no gatilho do desafio novo). O do perfil fica: só a
  -- própria pessoa o vê, e ele volta a valer se ela responder 16+ (ou some, pelo gatilho, se responder menos de 16).
  with alvo as (
    select t.id, t.faixa_etaria from public.torcedores t
    where (t.faixa_etaria is null or t.faixa_etaria = 'menos_16')
      and ((t.faixa_etaria = 'menos_16' and t.apelido is not null)
        or exists (select 1 from public.desafios d where d.torcedor_id = t.id and d.apelido is not null)
        or exists (select 1 from public.prova_desafios d where d.torcedor_id = t.id and d.apelido is not null)
        or exists (select 1 from public.lances_desafios d where d.torcedor_id = t.id and d.apelido is not null))
  ),
  t as (
    update public.torcedores x set apelido = null from alvo
    where x.id = alvo.id and alvo.faixa_etaria = 'menos_16' and x.apelido is not null returning 1
  ),
  d as (update public.desafios x set apelido = null from alvo where x.torcedor_id = alvo.id and x.apelido is not null returning 1),
  p as (update public.prova_desafios x set apelido = null from alvo where x.torcedor_id = alvo.id and x.apelido is not null returning 1),
  l as (update public.lances_desafios x set apelido = null from alvo where x.torcedor_id = alvo.id and x.apelido is not null returning 1)
  select (select count(*) from alvo) into v_n;
  if v_n > 0 then
    insert into public.apelidos_apagados (torcedores, motivo) values (v_n, 'idade');
  end if;
end;
$$;
