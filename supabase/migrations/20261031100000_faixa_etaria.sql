-- Faixa etária (docs/jogo.md, seção 13). Só acrescenta: nenhuma coluna ou tabela é apagada ou renomeada.
-- A coluna guarda só a faixa e fica sob a RLS de torcedores (cada um lê a sua). Null = ainda não respondeu.
-- A faixa decide o que é só para 18+; ela nunca aparece na tela, no card nem nas métricas por pessoa.

alter table public.torcedores
  add column if not exists faixa_etaria text
  check (faixa_etaria in ('menos_16', '16_17', '18_mais'));

-- Grava a resposta da triagem (sem política de update: só por esta função). Devolve false se o torcedor
-- ainda não existe (o aparelho tenta de novo depois de salvar o time). Quem não é 18+ sai do push aqui.
create or replace function public.salvar_faixa_etaria(p_faixa text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achou boolean;
begin
  if auth.uid() is null then
    raise exception 'sem_login' using errcode = '42501';
  end if;
  if p_faixa is null or p_faixa not in ('menos_16', '16_17', '18_mais') then
    raise exception 'faixa_invalida' using errcode = '22023';
  end if;
  update public.torcedores set faixa_etaria = p_faixa where id = auth.uid();
  v_achou := found;
  if p_faixa <> '18_mais' then
    delete from public.push_inscricoes where torcedor_id = auth.uid();
  end if;
  return v_achou;
end;
$$;

revoke execute on function public.salvar_faixa_etaria(text) from public, anon;
grant execute on function public.salvar_faixa_etaria(text) to authenticated;

-- Push só para 18+: a inscrição é recusada no servidor, mesmo que o celular tente.
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
  if not exists (select 1 from public.torcedores t where t.id = auth.uid() and t.faixa_etaria = '18_mais') then
    raise exception 'so_18_mais' using errcode = '42501';
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
