-- Pênaltis: uma semente por lance (docs/jogo.md, seção 6, "Uma semente por lance"). Só acrescenta uma coluna.
--
-- O resultado de uma cobrança volta exato ao celular (ponto da bola, goleiro), e com ele dá para achar por força
-- bruta a semente que o gerou (são 2^32). Com uma semente só na partida (partidas.semente), isso entregava o canto
-- do batedor nas defesas e o goleiro nas cobranças seguintes. Agora a nova-partida sorteia uma semente para cada
-- cobrança e cada defesa, guardadas aqui: a semente achada é a de um lance já jogado.
--
-- Versão do segredo: `sementes` nula é partida criada antes desta migração, que segue com partidas.semente (o
-- resultado delas não muda). Preenchida: { "cobrancas": [8 inteiros], "defesas": [8 inteiros] }, e
-- partidas.semente fica sem uso (continua obrigatória e fora da leitura do celular).

alter table public.partidas_segredo
  add column sementes jsonb check (
    sementes is null
    -- coalesce: em lista ou texto, `->` dá nulo, e checagem nula deixaria passar.
    or coalesce(jsonb_typeof(sementes -> 'cobrancas') = 'array' and jsonb_typeof(sementes -> 'defesas') = 'array', false)
  );

comment on column public.partidas_segredo.sementes is
  'Pênaltis: uma semente por cobrança e por defesa (nunca sai do servidor). Nula: partida antiga, usa partidas.semente.';
