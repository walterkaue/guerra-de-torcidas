-- Zerar pré-temporada: apaga partidas, desafios e ranking. Mantém times, torcedores (e os logins),
-- palavras bloqueadas e a configuração da detecção.
-- NÃO rode direto: use `npm run zerar-pre-temporada`, que mostra o que vai sumir e pede confirmação.

begin;

-- Apagar as partidas leva junto o número secreto do narrador (partidas_segredo) e os desafios
-- (desafios.partida_id é "on delete cascade").
delete from public.partidas;
delete from public.desafios;
delete from public.ranking_semana;

select
  (select count(*) from public.partidas) as partidas_restantes,
  (select count(*) from public.desafios) as desafios_restantes,
  (select count(*) from public.ranking_semana) as linhas_de_ranking_restantes,
  (select count(*) from public.torcedores) as torcedores_mantidos;

commit;
