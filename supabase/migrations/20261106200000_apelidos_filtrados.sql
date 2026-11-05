-- Lista de apelidos já gravados que o filtro de hoje barraria (docs/jogo.md, seção 13, "Apagar apelido").
-- O #admin só conseguia apagar um apelido que ele soubesse digitar; esta função mostra quais são.
-- Só acrescenta uma função: nenhuma tabela ou coluna muda, e nada é apagado. Para apagar, segue valendo apelido_apagar.

create or replace function public.apelidos_filtrados()
returns table (texto text, quantos integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.sou_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  -- Mesmo critério do salvar (apelido_bloqueado). Mais usados primeiro; no máximo 200 linhas.
  return query
    select t.apelido, count(*)::integer
    from public.torcedores t
    where t.apelido is not null and t.apelido <> '' and public.apelido_bloqueado(t.apelido)
    group by t.apelido
    order by 2 desc, 1
    limit 200;
end;
$$;

revoke execute on function public.apelidos_filtrados() from public, anon;
grant execute on function public.apelidos_filtrados() to authenticated;
