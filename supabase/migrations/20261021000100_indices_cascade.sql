-- Índices nas FKs por onde passa o "on delete cascade / set null" ao apagar torcedores, partidas e
-- desafios (limpeza de usuários anônimos antigos, zerar a pré-temporada). Sem eles, cada linha apagada
-- lê a tabela filha inteira. Só acrescenta.
-- As outras FKs do aviso ficam sem índice de propósito: apontam para times, rodadas e dia_clubes
-- (pequenas, nunca apagadas) ou para jogos e perguntas (anulados ou aposentados, não apagados).

create index if not exists desafios_torcedor on public.desafios (torcedor_id);
create index if not exists prova_desafios_torcedor on public.prova_desafios (torcedor_id);
create index if not exists crava_pontos_torcedor on public.crava_pontos (torcedor_id);
create index if not exists partidas_desafio on public.partidas (desafio_id) where desafio_id is not null;
create index if not exists prova_estado_desafio on public.prova_estado (desafio_id) where desafio_id is not null;
create index if not exists prova_respostas_partida on public.prova_respostas (partida_id) where partida_id is not null;
