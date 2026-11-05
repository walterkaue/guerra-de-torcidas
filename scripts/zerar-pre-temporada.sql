-- Zerar pré-temporada: apaga partidas, desafios, dias do Time do Dia, pontos do Crava, ranking, fechamentos e temporadas.
-- Os recordes pessoais saem dessas tabelas (recorde_pessoal) e de recordes_herdados, então zeram junto.
-- Mantém times, torcedores (e os logins, e a cidade de cada um), palpites e certezas, perguntas e respostas da Prova,
-- clubes e sorteio do Time do Dia (o número do dia continua), palavras bloqueadas e configurações.
-- A carreira (carreira_partidas e carreira_bonus) nunca zera: não tem chave para as tabelas apagadas
-- aqui, então fica inteira. Não acrescente delete nela (docs/jogo.md, seção 5, "Longo prazo").
-- As medalhas dos Lances (lances_gols) também nunca zeram e não têm chave para partidas: não acrescente
-- delete nelas (docs/jogo.md, seção 7.3, "Medalhas e Conquistas").
-- NÃO rode direto: use `npm run zerar-pre-temporada`, que lembra do balanço, mostra o que vai sumir
-- e pede confirmação.

begin;

-- pontos_apagados: os pontos de quem apagou os dados (docs/jogo.md, seção 13), que zeram como os outros.
-- Apagar as partidas leva junto o número secreto do narrador (partidas_segredo), os desafios
-- (desafios.partida_id é "on delete cascade") e, da Prova de Boleiro, o andamento e os desafios.
-- As respostas da prova ficam (sem a partida): servem para calibrar o degrau das perguntas.
delete from public.partidas;
delete from public.desafios;
delete from public.dia_partidas;
delete from public.crava_pontos;
delete from public.pontos_apagados;
-- Cidade (seção 3): os pontos de quem saiu e os rankings de cidades e estados zeram como os dos times. O
-- histórico de cidade de cada torcedor (torcedor_cidades) fica, como o time dele.
delete from public.pontos_apagados_cidade;
delete from public.ranking_cidade_semana;
delete from public.ranking_estado_semana;
-- Recordes herdados na junção de contas pelo código do torcedor (seção 14.1): zeram como os outros recordes.
delete from public.recordes_herdados;
delete from public.ranking_semana;
-- A fila e o aviso do ranking de minuto em minuto: sem eles, a rotina refaria semanas de teste.
delete from public.ranking_fila;
delete from public.ranking_aviso;
-- O fechamento gravado (seção 5): a base da Série, da Galeria e das 52 semanas nasce limpa.
delete from public.fechamento_semana;
-- As temporadas de teste levam temporada_serie junto (on delete cascade). A estreia de verdade abre
-- aqui, pelo dia do zerar: é o mês seguinte ao da semana atual (seção 5, "A temporada").
delete from public.temporada;
select public.abrir_estreia();

select
  (select count(*) from public.partidas) as partidas_restantes,
  (select count(*) from public.desafios) as desafios_restantes,
  (select count(*) from public.dia_partidas) as dias_restantes,
  (select count(*) from public.crava_pontos) as pontos_do_crava_restantes,
  (select count(*) from public.ranking_semana) as linhas_de_ranking_restantes,
  (select count(*) from public.ranking_cidade_semana) as linhas_de_cidades_restantes,
  (select count(*) from public.fechamento_semana) as linhas_de_fechamento_restantes,
  (select count(*) from public.temporada where pre_temporada) as temporadas_de_teste_restantes,
  (select min(mes) from public.temporada) as mes_de_estreia,
  (select count(*) from public.torcedores) as torcedores_mantidos,
  (select count(*) from public.carreira_partidas) as partidas_da_carreira_mantidas;

commit;
