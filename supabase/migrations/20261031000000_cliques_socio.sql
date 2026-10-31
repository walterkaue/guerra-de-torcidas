-- Cliques no "Seja sócio" da Casa do [time] (docs/jogo.md 7.4): total por clube e por dia de Brasília.
-- Sem id de usuário nem dado pessoal. Dá para chamar sem login, porque quem só visita a Casa ainda não
-- tem sessão. O limite de 1 clique por clube por dia fica no aparelho; só existem 20 linhas por dia.

create table if not exists public.socio_cliques (
  clube text not null references public.times (id),
  dia date not null,
  cliques integer not null default 0 check (cliques >= 0),
  primary key (clube, dia)
);

alter table public.socio_cliques enable row level security;
revoke all on public.socio_cliques from anon, authenticated;
grant select, insert, update on public.socio_cliques to service_role;

-- O celular não lê nem grava a tabela: só soma pela função abaixo.
drop policy if exists "ninguém pelo cliente" on public.socio_cliques;
create policy "ninguém pelo cliente" on public.socio_cliques
  as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.contar_clique_socio(p_clube text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.times where id = p_clube and oficial) then
    raise exception 'time_invalido' using errcode = '22023';
  end if;
  insert into public.socio_cliques (clube, dia, cliques)
  values (p_clube, public.hoje_brasilia(), 1)
  on conflict (clube, dia) do update set cliques = public.socio_cliques.cliques + 1;
end;
$$;

revoke execute on function public.contar_clique_socio(text) from public;
grant execute on function public.contar_clique_socio(text) to anon, authenticated;
