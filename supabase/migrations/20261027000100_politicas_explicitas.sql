-- Política explícita em toda tabela com RLS (CLAUDE.md, "Técnica"). Estas tinham RLS ligada e nenhuma
-- política, o que já nega tudo ao celular; agora a negação fica escrita, para ninguém abrir sem querer
-- ao criar uma política de leitura depois. Só as funções do servidor (secret key) mexem nelas.
-- Nada é apagado ou renomeado.

do $$
declare
  t text;
begin
  foreach t in array array[
    'public.push_inscricoes',
    'staging_gt.perguntas',
    'staging_gt.lances',
    'staging_gt.casa_clubes',
    'staging_gt.casa_estadios',
    'staging_gt.casa_titulos',
    'staging_gt.fontes_semente',
    'staging_gt.rascunhos_perguntas',
    'staging_gt.recusas_perguntas'
  ] loop
    execute format('drop policy if exists "ninguém pelo cliente" on %s', t);
    execute format(
      'create policy "ninguém pelo cliente" on %s as restrictive for all to anon, authenticated using (false) with check (false)',
      t
    );
  end loop;
end;
$$;
