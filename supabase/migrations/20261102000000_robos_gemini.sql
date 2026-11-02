-- Robôs do Gemini para as perguntas (docs/propostas/robos-gemini-perguntas.md, decidido em 02/11/2026).
-- 1) staging_gt.uso_gemini: uma linha por chamada de perguntarJson (gerador e auditor), para medir a cota.
-- 2) Cinco execuções por dia do gerador no modo "reposicao" e do auditor, uma hora depois.
-- Só cria; nada é apagado nem renomeado. Os horários do cron são UTC (09 UTC = 6h de Brasília).

create table if not exists staging_gt.uso_gemini (
  id bigint generated always as identity primary key,
  criada_em timestamptz not null default now(),
  funcao text not null,            -- gerar-conteudo | auditar-conteudo
  modelo text,                     -- modelo que respondeu (nulo se nenhum respondeu)
  chamadas integer not null,       -- requisições feitas ao Google (inclui as repetidas)
  falhas integer not null,         -- respostas 429, 503, outros erros ou fora do formato
  entrada integer not null default 0,
  saida integer not null default 0,
  clube text,
  degrau text
);
create index if not exists uso_gemini_dia on staging_gt.uso_gemini (criada_em);

alter table staging_gt.uso_gemini enable row level security;
revoke all on staging_gt.uso_gemini from anon, authenticated;
grant select, insert on staging_gt.uso_gemini to service_role;
grant usage, select on sequence staging_gt.uso_gemini_id_seq to service_role;
drop policy if exists "ninguém pelo cliente" on staging_gt.uso_gemini;
create policy "ninguém pelo cliente" on staging_gt.uso_gemini as restrictive for all to anon, authenticated using (false) with check (false);

-- Os dois jobs de hoje viram a 1ª execução do dia; as outras quatro copiam o comando (com a chave do Vault).
do $$
declare
  v_gerar text;
  v_auditar text;
  v_corpo_gerar constant text := '{"modo": "reposicao", "quantidade": 8, "paginas": 3}';
  v_corpo_auditar constant text := '{"quantidade": 20}';
  v_hora integer;
  v_n integer := 0;
begin
  select command into v_gerar from cron.job where jobname = 'job_gerar_conteudo';
  select command into v_auditar from cron.job where jobname = 'job_auditar_conteudo';
  if v_gerar is null or v_auditar is null then
    raise notice 'jobs do pipeline não encontrados: nada agendado';
    return;
  end if;
  -- Idempotente: o corpo antigo vira o novo; se já foi trocado, o replace não muda nada.
  v_gerar := replace(v_gerar, '{"tipo": "perguntas", "quantidade": 10}', v_corpo_gerar);
  v_auditar := replace(v_auditar, '{"quantidade": 2}', v_corpo_auditar);

  foreach v_hora in array array[9, 12, 15, 18, 21] loop
    v_n := v_n + 1;
    perform cron.schedule(
      case when v_n = 1 then 'job_gerar_conteudo' else 'job_gerar_conteudo_' || v_n end,
      format('0 %s * * *', v_hora), v_gerar);
    perform cron.schedule(
      case when v_n = 1 then 'job_auditar_conteudo' else 'job_auditar_conteudo_' || v_n end,
      format('0 %s * * *', (v_hora + 1) % 24), v_auditar);
  end loop;
end;
$$;
