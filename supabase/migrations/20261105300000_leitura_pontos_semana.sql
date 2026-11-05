-- Supabase CLI 3: `db query --remote --read-only` roda como supabase_read_only_user.
-- Os scripts de balanço e calibragem (só leitura) chamam pontos_semana, que é interna
-- (fechada para public, anon e authenticated na 20261020300000). Este grant abre só a
-- execução para o papel de leitura do painel/CLI; nada muda para quem joga.
-- A função é security definer e stable: não grava nada, e a transação do --read-only
-- continua só leitura.
grant execute on function public.pontos_semana(date) to supabase_read_only_user;
