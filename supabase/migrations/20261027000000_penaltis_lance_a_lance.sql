-- Pênaltis lance a lance (anti-trapaça antes de divulgar; jogo.md, seção 6).
-- A semente passa a ser segredo do servidor: o celular manda um gesto por vez para a função
-- lance-penalti, que guarda os gestos aqui e devolve só o resultado daquele lance.
-- Nada é apagado ou renomeado: a semente continua em partidas.semente, só sai da leitura do celular.

-- 1. Gestos já jogados, guardados onde o celular não lê. `lances` é a trava contra dois envios ao
--    mesmo tempo (a função só grava se ninguém gravou antes: update ... where lances = n).
alter table public.partidas_segredo
  add column lance_a_lance boolean not null default false,
  add column gestos jsonb not null default '{"cobrancas": [], "defesas": []}'::jsonb,
  add column lances smallint not null default 0 check (lances between 0 and 16);

-- 2. O celular lê as próprias partidas (teto do dia, histórico), mas não a semente nem a dificuldade
--    guardada da partida aberta. Leitura por coluna: coluna nova não entra sem grant explícito.
revoke select on public.partidas from authenticated;
grant select (
  id, torcedor_id, modo, desafio_id, criada_em, expira_em, fechada_em, time_id, gestos, resultado,
  pontos, semana, dia, conta_no_teto, sob_suspeita, motivo_suspeita, revisada_em, minigame, amistoso
) on public.partidas to authenticated;
