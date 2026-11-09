-- Camisa por fora ou por dentro do calção (H03b; docs/jogos/boneco-montavel.md, decidido pelo Kauê em 09/11/2026).
-- Só acrescenta: nenhuma tabela, coluna ou função é apagada ou renomeada.
--
-- A vestimenta ganha `barra` ('fora' | 'dentro'), conferida pela função `boneco` (o `validar` de src/jogo/vestiario.ts)
-- antes de gravar; a tabela torcedor_boneco guarda o jsonb como vem, então nada muda nela. O que muda aqui é só o
-- boneco_para_campo, que monta as peças de quem chamou o X1 para o ver_desafio e o ver_desafio_lances: passa a
-- incluir `barra`, só 'fora' ou 'dentro' (ausente, de outro tipo ou fora da lista: 'fora', como o `validar`).
-- O resto é igual ao de 20261107000000_boneco_em_campo.sql. O teste supabase/testes/bonecoEmCampo.test.ts compara
-- as listas daqui com o catálogo.
--
-- Site antigo com esta migração no ar: continua funcionando (o vestimentaDeCampo dele ignora a chave a mais).
-- Ordem de publicação: esta migração, a função `boneco`, o site.

create or replace function public.boneco_para_campo(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when p is null or jsonb_typeof(p) <> 'object' then null else jsonb_build_object(
    'corpo', case when jsonb_typeof(p -> 'corpo') = 'string' and p ->> 'corpo' in ('h', 'm') then p -> 'corpo' else '"h"' end,
    'pele', case when jsonb_typeof(p -> 'pele') = 'number' and p ->> 'pele' in ('0', '1', '2', '3', '4', '5') then p -> 'pele' else '0' end,
    'cabelo', case when jsonb_typeof(p -> 'cabelo') = 'string'
        and p ->> 'cabelo' in ('raspado', 'curto', 'crespo', 'trancas', 'coque', 'rabo', 'comprido') then p -> 'cabelo' else '"raspado"' end,
    'corCabelo', case when jsonb_typeof(p -> 'corCabelo') = 'number'
        and p ->> 'corCabelo' in ('0', '1', '2', '3', '4', '5') then p -> 'corCabelo' else '0' end,
    'barra', case when jsonb_typeof(p -> 'barra') = 'string' and p ->> 'barra' in ('fora', 'dentro') then p -> 'barra' else '"fora"' end,
    'numero', case when jsonb_typeof(p -> 'numero') = 'string' and p ->> 'numero' ~ '^[0-9]{1,2}$' then p -> 'numero' else 'null' end,
    'cabeca', case when jsonb_typeof(p -> 'cabeca') = 'string' and p ->> 'cabeca' in ('nenhum', 'testeira') then p -> 'cabeca' else '"nenhum"' end,
    'punho', case when jsonb_typeof(p -> 'punho') = 'string'
        and p ->> 'punho' in ('nenhum', 'munhequeira', 'munhequeira_bronze') then p -> 'punho' else '"nenhum"' end,
    'braco', case when jsonb_typeof(p -> 'braco') = 'string' and p ->> 'braco' in ('nenhum', 'bracadeira') then p -> 'braco' else '"nenhum"' end,
    'chuteira', case when jsonb_typeof(p -> 'chuteira') = 'string'
        and p ->> 'chuteira' in ('neutra', 'time', 'dourada') then p -> 'chuteira' else '"neutra"' end
  ) end;
$$;

-- create or replace mantém as permissões; repetidas aqui para a migração valer sozinha.
revoke execute on function public.boneco_para_campo(jsonb) from public, anon, authenticated;
grant execute on function public.boneco_para_campo(jsonb) to service_role;
