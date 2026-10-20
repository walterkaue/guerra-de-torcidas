-- Resultados da temporada do Brasileirão (todas as rodadas), para a tabela do campeonato e os
-- indicadores da aba Palpites (posição, forma, campanha em casa e fora, jogo do 1º turno).
-- Só acrescenta. Preenchida pela função sincronizar-jogos com a mesma chamada à API que já traz os
-- jogos (nenhuma chamada a mais). Placar da API, ainda não confirmado: só serve de apoio.

create table public.resultados_temporada (
  api_id bigint primary key,
  rodada smallint not null check (rodada between 1 and 38),
  mandante_id text not null references public.times (id),
  visitante_id text not null references public.times (id),
  inicio timestamptz not null,
  gols_mandante smallint not null check (gols_mandante between 0 and 30),
  gols_visitante smallint not null check (gols_visitante between 0 and 30),
  atualizado_em timestamptz not null default now(),
  check (mandante_id <> visitante_id)
);
create index resultados_temporada_inicio on public.resultados_temporada (inicio);

alter table public.resultados_temporada enable row level security;
create policy "resultados_temporada: leitura para todos" on public.resultados_temporada
  for select to anon, authenticated using (true);

revoke all on public.resultados_temporada from anon, authenticated;
grant select on public.resultados_temporada to anon, authenticated;
grant all on public.resultados_temporada to service_role;
