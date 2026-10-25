-- Revisão das perguntas do pipeline com Gemini direto no Supabase (decidido em 26/10/2026: sem CSV).
-- O painel #admin lista as `pre_aprovada` de staging_gt.rascunhos_perguntas com o trecho da fonte;
-- o administrador aprova (pode corrigir o texto antes) e a pergunta entra em public.perguntas como
-- ativa, ou reprova com o motivo. Só quem está em public.administradores chama estas funções.

alter table staging_gt.rascunhos_perguntas drop constraint if exists rascunhos_perguntas_status_check;
alter table staging_gt.rascunhos_perguntas add constraint rascunhos_perguntas_status_check
  check (status in ('rascunho', 'pre_aprovada', 'reprovada', 'exportada', 'publicada'));
alter table staging_gt.rascunhos_perguntas
  add column if not exists revisada_por uuid,
  add column if not exists revisada_em timestamptz,
  add column if not exists pergunta_id text;

-- Fila de revisão: as pre_aprovada, mais antigas primeiro.
create or replace function public.revisao_perguntas_fila(p_limite integer default 30)
returns table (
  id bigint, clube text, degrau text, tema text, pergunta text, certa text, errada1 text, errada2 text,
  errada3 text, fonte text, trecho text, auditoria_trecho text, modelo text, auditoria_modelo text,
  criada_em timestamptz, na_fila integer
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
    select r.id, r.clube, r.degrau, r.tema, r.pergunta, r.certa, r.errada1, r.errada2, r.errada3, r.fonte,
      r.trecho, r.auditoria_trecho, r.modelo, r.auditoria_modelo, r.criada_em,
      (count(*) over ())::integer
    from staging_gt.rascunhos_perguntas r
    where r.status = 'pre_aprovada'
    order by r.criada_em
    limit greatest(1, least(p_limite, 100));
end;
$$;

-- Aprova: publica em public.perguntas (ativa) com id novo clube-letra-NN e marca o rascunho como publicada.
-- Os textos podem vir corrigidos pelo administrador; as restrições da tabela conferem os tamanhos.
create or replace function public.revisao_perguntas_aprovar(
  p_id bigint, p_pergunta text, p_certa text, p_errada1 text, p_errada2 text, p_errada3 text, p_degrau text, p_tema text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.perguntas%rowtype;
  r staging_gt.rascunhos_perguntas%rowtype;
  v_letra text;
  v_prefixo text;
  v_num integer;
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select * into r from staging_gt.rascunhos_perguntas where rascunhos_perguntas.id = p_id for update;
  if not found or r.status <> 'pre_aprovada' then
    raise exception 'fora_da_fila';
  end if;
  v_letra := case p_degrau when 'facil' then 'f' when 'media' then 'm' when 'dificil' then 'd' when 'craque' then 'c' end;
  if v_letra is null then
    raise exception 'degrau_invalido';
  end if;
  v_prefixo := case when r.clube = 'geral' then 'geral' else r.clube end || '-' || v_letra || '-';
  select coalesce(max(substring(p.id from length(v_prefixo) + 1)::integer), 0) + 1 into v_num
    from public.perguntas p
    where p.id like v_prefixo || '%' and substring(p.id from length(v_prefixo) + 1) ~ '^[0-9]+$';

  insert into public.perguntas (id, clube, degrau, tema, texto, certa, errada1, errada2, errada3, fonte, verificada_em, status, lote)
  values (
    v_prefixo || lpad(v_num::text, 2, '0'),
    case when r.clube = 'geral' then null else r.clube end,
    position(v_letra in 'fmdc'),
    btrim(p_tema), btrim(p_pergunta), btrim(p_certa), btrim(p_errada1), btrim(p_errada2), btrim(p_errada3),
    r.fonte, (now() at time zone 'America/Sao_Paulo')::date, 'ativa',
    'gemini-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')
  )
  returning * into v;

  update staging_gt.rascunhos_perguntas
    set status = 'publicada', revisada_por = auth.uid(), revisada_em = now(), pergunta_id = v.id
    where rascunhos_perguntas.id = p_id;
  return v.id;
end;
$$;

-- Reprova com o motivo (fica no staging para ajustar o prompt e as travas).
create or replace function public.revisao_perguntas_reprovar(p_id bigint, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  update staging_gt.rascunhos_perguntas
    set status = 'reprovada', motivo = coalesce(nullif(btrim(p_motivo), ''), 'reprovada na revisão'),
        revisada_por = auth.uid(), revisada_em = now()
    where id = p_id and status = 'pre_aprovada';
  if not found then
    raise exception 'fora_da_fila';
  end if;
end;
$$;

revoke execute on function public.revisao_perguntas_fila(integer),
  public.revisao_perguntas_aprovar(bigint, text, text, text, text, text, text, text),
  public.revisao_perguntas_reprovar(bigint, text) from public, anon;
grant execute on function public.revisao_perguntas_fila(integer),
  public.revisao_perguntas_aprovar(bigint, text, text, text, text, text, text, text),
  public.revisao_perguntas_reprovar(bigint, text) to authenticated;
