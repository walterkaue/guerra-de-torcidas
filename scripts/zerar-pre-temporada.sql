-- Zerar pré-temporada: apaga partidas, desafios, dias do Time do Dia, pontos do Crava e ranking.
-- Os recordes pessoais saem dessas tabelas (recorde_pessoal), então zeram junto.
-- Mantém times, torcedores (e os logins), palpites e certezas, perguntas e respostas da Prova,
-- clubes e sorteio do Time do Dia (o número do dia continua), palavras bloqueadas e configurações.
-- A carreira (carreira_partidas e carreira_bonus) nunca zera: não tem chave para as tabelas apagadas
-- aqui, então fica inteira. Não acrescente delete nela (docs/jogo.md, seção 5, "Longo prazo").
-- NÃO rode direto: use `npm run zerar-pre-temporada`, que lembra do balanço, mostra o que vai sumir
-- e pede confirmação.

begin;

-- Apagar as partidas leva junto o número secreto do narrador (partidas_segredo), os desafios
-- (desafios.partida_id é "on delete cascade") e, da Prova de Boleiro, o andamento e os desafios.
-- As respostas da prova ficam (sem a partida): servem para calibrar o degrau das perguntas.
delete from public.partidas;
delete from public.desafios;
delete from public.dia_partidas;
delete from public.crava_pontos;
delete from public.ranking_semana;

select
  (select count(*) from public.partidas) as partidas_restantes,
  (select count(*) from public.desafios) as desafios_restantes,
  (select count(*) from public.dia_partidas) as dias_restantes,
  (select count(*) from public.crava_pontos) as pontos_do_crava_restantes,
  (select count(*) from public.ranking_semana) as linhas_de_ranking_restantes,
  (select count(*) from public.torcedores) as torcedores_mantidos,
  (select count(*) from public.carreira_partidas) as partidas_da_carreira_mantidas;

commit;
