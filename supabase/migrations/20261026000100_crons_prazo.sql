-- Os crons do pipeline de perguntas esperavam só 30 s pela função (pg_net). O auditor, com 10
-- perguntas e uma chamada ao Gemini por pergunta, passa disso: o trabalho termina, mas a resposta
-- fica registrada como timeout. Sobe o prazo para 120 s, sem mexer no resto do comando (a chave
-- continua vindo do Vault).
do $$
declare
  v_job record;
begin
  for v_job in select jobid, command from cron.job where jobname in ('job_gerar_conteudo', 'job_auditar_conteudo') loop
    perform cron.alter_job(
      v_job.jobid,
      command := regexp_replace(v_job.command, 'timeout_milliseconds\s*:=\s*\d+', 'timeout_milliseconds:=120000')
    );
  end loop;
end;
$$;
