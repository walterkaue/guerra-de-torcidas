-- Notificações push (PWA), com opt-in (docs/jogo.md, pilar 4): um aviso por semana, domingo 18h de
-- Brasília, com a situação da torcida (texto em src/jogo/avisos.ts). A inscrição é do aparelho (login
-- anônimo): guarda só o endpoint do navegador e as chaves dele, nenhum dado pessoal.
-- O celular não lê a tabela: grava e apaga pelas funções abaixo. Quem envia é a função enviar-push.

create table if not exists public.push_inscricoes (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  torcedor_id uuid not null references auth.users (id) on delete cascade,
  criada_em timestamptz not null default now(),
  ultimo_envio timestamptz,
  falhas integer not null default 0
);
create index if not exists push_inscricoes_torcedor on public.push_inscricoes (torcedor_id);

alter table public.push_inscricoes enable row level security;
revoke all on public.push_inscricoes from anon, authenticated;
grant select, insert, update, delete on public.push_inscricoes to service_role;

-- Liga o aviso neste aparelho (de novo é atualizar as chaves). Um aparelho tem uma inscrição.
create or replace function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  insert into public.push_inscricoes (endpoint, p256dh, auth, torcedor_id)
  values (p_endpoint, p_p256dh, p_auth, auth.uid())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, torcedor_id = excluded.torcedor_id, falhas = 0;
  -- No máximo 5 aparelhos por pessoa (o mais antigo sai).
  delete from public.push_inscricoes
  where torcedor_id = auth.uid()
    and endpoint not in (
      select endpoint from public.push_inscricoes where torcedor_id = auth.uid() order by criada_em desc limit 5
    );
end;
$$;

-- Desliga o aviso deste aparelho (só a própria inscrição).
create or replace function public.remover_inscricao_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_inscricoes where endpoint = p_endpoint and torcedor_id = auth.uid();
$$;

revoke execute on function public.salvar_inscricao_push(text, text, text), public.remover_inscricao_push(text) from public, anon;
grant execute on function public.salvar_inscricao_push(text, text, text), public.remover_inscricao_push(text) to authenticated;

-- Domingo 18h de Brasília (21h UTC): a semana fecha à meia-noite.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'job_aviso_domingo') then
    perform cron.schedule(
      'job_aviso_domingo',
      '0 21 * * 0',
      $cmd$
      select net.http_post(
        url := 'https://ybfeqykdnqmnufrgtnoc.supabase.co/functions/v1/enviar-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_api_key' limit 1)
        ),
        body := '{"aviso": "domingo"}'::jsonb,
        timeout_milliseconds := 120000
      );
      $cmd$
    );
  end if;
end;
$$;
