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
-- 2. Gatilhos em torcedores: com faixa menos_16 o apelido é sempre null; quando a faixa vira menos_16
--    (salvar_faixa_etaria, juntar_torcedores ou qualquer outro caminho), os desafios da pessoa perdem o apelido.
--    Na junção, os desafios da conta que entrou somem com ela (on delete cascade); os do dono, pelo gatilho.
-- 3. Gatilho nas três tabelas de desafio: um desafio novo (ou que muda de dono) só leva apelido de quem é 16+.
-- 4. Limpeza única: torcedores menos_16 e os desafios deles ficam sem apelido. Guarda só quando e quantos
--    (apelidos_apagados, com o motivo novo 'idade'), nunca o apelido.
--
-- Site antigo com esta migração no ar: continua funcionando. Quem tem menos de 16 (ou não respondeu) e manda
-- apelido tem o time gravado e o apelido descartado; o card dele pode mostrar o apelido até o próximo carregamento,
-- quando o aparelho adota o do servidor (vazio). Ordem de publicação: qualquer uma; a recomendada é o site primeiro.

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
-- 2. Gatilhos em torcedores
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
-- 3. Desafio novo só leva apelido de quem é 16+
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
-- 4. Limpeza única
-- ---------------------------------------------------------------------------
-- 'admin': o #admin apagou (apelido_apagar, que não informa o motivo e fica com o padrão); 'idade': esta limpeza.
alter table public.apelidos_apagados
  add column if not exists motivo text not null default 'admin' check (motivo in ('admin', 'idade'));

do $$
declare
  v_n integer;
begin
  with alvo as (
    select t.id from public.torcedores t
    where t.faixa_etaria = 'menos_16'
      and (t.apelido is not null
        or exists (select 1 from public.desafios d where d.torcedor_id = t.id and d.apelido is not null)
        or exists (select 1 from public.prova_desafios d where d.torcedor_id = t.id and d.apelido is not null)
        or exists (select 1 from public.lances_desafios d where d.torcedor_id = t.id and d.apelido is not null))
  ),
  t as (update public.torcedores x set apelido = null from alvo where x.id = alvo.id and x.apelido is not null returning 1),
  d as (update public.desafios x set apelido = null from alvo where x.torcedor_id = alvo.id and x.apelido is not null returning 1),
  p as (update public.prova_desafios x set apelido = null from alvo where x.torcedor_id = alvo.id and x.apelido is not null returning 1),
  l as (update public.lances_desafios x set apelido = null from alvo where x.torcedor_id = alvo.id and x.apelido is not null returning 1)
  select (select count(*) from alvo) into v_n;
  if v_n > 0 then
    insert into public.apelidos_apagados (torcedores, motivo) values (v_n, 'idade');
  end if;
end;
$$;
