-- Avisos do Database Advisor (21/10/2026). Só acrescenta: nada é apagado ou renomeado.
-- 1. rls_auto_enable() nasceu pelo painel (liga RLS sozinho em tabela nova) e ficou chamável pela API.
--    Ela roda pelo event trigger, que não confere EXECUTE de quem cria a tabela: tirar o grant não
--    desliga o mecanismo. Se a função não existir (banco local), não faz nada.
-- 2. Funções novas em public nasciam com EXECUTE para anon e authenticated (padrão do Supabase) e para
--    PUBLIC (padrão do Postgres). Cada migration já revoga e devolve só o necessário; agora o padrão é
--    nascer fechada. Vale só para funções criadas daqui para frente; as atuais ficam como estão.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
