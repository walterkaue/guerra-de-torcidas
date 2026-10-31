-- Disputas históricas de pênaltis (docs/jogo.md, seção 6): a partida guarda qual disputa foi jogada,
-- para a ficha, o card e as medalhas. Só acrescenta coluna: nada é apagado ou renomeado.
-- É só cenário: o resultado continua recalculado no servidor pelos gestos e pela semente, e a coluna
-- não entra em nenhuma conta de pontos, teto ou detecção. Partida livre e desafio por link ficam com null.
-- O catálogo mora no código (src/dados/disputas.ts), então não há chave estrangeira: só o formato do id.

alter table public.partidas
  add column disputa_id text
  constraint partidas_disputa_id_formato check (disputa_id is null or disputa_id ~ '^[a-z0-9-]{5,80}$');
