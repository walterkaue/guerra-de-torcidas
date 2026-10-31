-- Carreira sem sequência de dias (docs/jogo.md, seção 13). Nenhuma tabela ou coluna é apagada: só sai o
-- campo `sequencia` do que estas duas funções devolvem. Como o formato da saída muda, é preciso recriar.
-- XP, níveis e bônus continuam iguais.

drop function public.minha_carreira();
drop function public.carreira_de(uuid);

-- Tudo da carreira de uma pessoa. Só o servidor chama com qualquer torcedor; o celular usa minha_carreira.
create function public.carreira_de(p_torcedor uuid)
returns table (xp integer, partidas_hoje integer, bonus_tipo text, bonus_referencia date)
language sql
stable
security definer
set search_path = ''
as $$
  with hoje as (select public.hoje_brasilia() as d),
  por_dia as (
    select c.dia, count(*)::integer as n
    from public.carreira_partidas c
    where c.torcedor_id = p_torcedor
    group by c.dia
  ),
  bonus as (
    select b.tipo, b.referencia
    from public.carreira_bonus b
    where b.torcedor_id = p_torcedor and b.criado_em >= now() - interval '7 days'
    order by b.criado_em desc
    limit 1
  )
  select
    (coalesce((select sum(public.carreira_xp_dia(p.n)) from por_dia p), 0)
      + coalesce((select sum(b.xp) from public.carreira_bonus b where b.torcedor_id = p_torcedor), 0))::integer,
    coalesce((select p.n from por_dia p, hoje h where p.dia = h.d), 0),
    (select b.tipo from bonus b),
    (select b.referencia from bonus b);
$$;

create function public.minha_carreira()
returns table (xp integer, partidas_hoje integer, bonus_tipo text, bonus_referencia date)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.carreira_de(auth.uid()) where auth.uid() is not null;
$$;

revoke execute on function public.carreira_de(uuid), public.minha_carreira() from public, anon, authenticated;
grant execute on function public.carreira_de(uuid) to service_role;
grant execute on function public.minha_carreira() to authenticated;
