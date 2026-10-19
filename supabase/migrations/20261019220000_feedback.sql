-- Feedback e relato de bug, enviados de dentro do jogo (botão na aba Jogar).
-- Só acrescenta. Quem envia não lê nada de volta; só administradores leem e marcam como lido.
-- Sem dado pessoal obrigatório: texto livre (até 1000 caracteres), tipo, tela e navegador.

create table public.feedbacks (
  id bigint generated always as identity primary key,
  usuario_id uuid default auth.uid() references auth.users (id) on delete set null,
  tipo text not null check (tipo in ('bug', 'ideia', 'outro')),
  texto text not null check (char_length(btrim(texto)) between 3 and 1000),
  tela text check (tela is null or char_length(tela) <= 40),
  aparelho text check (aparelho is null or char_length(aparelho) <= 300),
  lido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index feedbacks_criado on public.feedbacks (criado_em desc);
create index feedbacks_usuario on public.feedbacks (usuario_id, criado_em desc);

-- Até 5 envios por hora por pessoa (evita enxurrada).
create or replace function public.feedback_permitido()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 5
  from public.feedbacks f
  where f.usuario_id = auth.uid() and f.criado_em > now() - interval '1 hour';
$$;

alter table public.feedbacks enable row level security;
create policy "feedbacks: envia o seu" on public.feedbacks
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.feedback_permitido());
create policy "feedbacks: só admin lê" on public.feedbacks
  for select to authenticated using (public.sou_admin());
create policy "feedbacks: só admin marca como lido" on public.feedbacks
  for update to authenticated using (public.sou_admin()) with check (public.sou_admin());

revoke all on public.feedbacks from anon, authenticated;
grant insert (tipo, texto, tela, aparelho) on public.feedbacks to authenticated;
grant select, update (lido) on public.feedbacks to authenticated;
grant all on public.feedbacks to service_role;

revoke execute on function public.feedback_permitido() from public, anon;
grant execute on function public.feedback_permitido() to authenticated;
