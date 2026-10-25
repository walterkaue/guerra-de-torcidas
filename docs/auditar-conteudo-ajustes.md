# Ajustes da Edge Function auditar-conteudo

## Objetivo
Manter a função `auditar-conteudo` operando com autenticação segura de Secret API key, sem aceitar `publishable` e sem alterar o cron nem o payload do job.

## Estado final aprovado

### Autenticação
- A função usa `withSupabase({ auth: 'secret' })`.
- A autenticação aceita apenas a Secret API key correta do projeto.
- Não foi adicionado suporte a `publishable`.
- O acesso ao banco continua sendo feito com `SUPABASE_SERVICE_ROLE_KEY`, separadamente da autenticação externa.

### Configuração do projeto
- Em `supabase/config.toml`, a função continua com `verify_jwt = false`.
- A função permanece configurada como Secret-only para o endpoint externo.

### Limite de quantidade
- A quantidade padrão e máxima foi preservada em `3`.
- O cron continua com o payload `{"quantidade":3}` e o agendamento preservado.
- Nenhum outro job foi alterado.

## Segurança
- Não inserir a chave em código, SQL, logs, navegador, terminal, conversa ou artefatos do repositório.
- A Secret API key deve ficar apenas no ambiente de execução / secret manager / Vault do projeto.
- Em testes, a chamada segura deve usar `apikey` com a Secret correta em um backend, não no frontend/painel.

## Diagnóstico do erro
Quando o painel envia uma chave `publishable`, a função deve rejeitar essa autenticação. Isso é o comportamento esperado para este endpoint.

A correção correta é testar a função por backend, enviando a Secret correta no header `apikey`:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/auditar-conteudo" \
  -H "Content-Type: application/json" \
  -H "apikey: <sb_secret_cronjobs>" \
  -d '{"quantidade":3}'
```

## Validação
A regressão relevante foi validada com o teste focado da função:

```bash
node .\node_modules\vitest\vitest.mjs run .\supabase\testes\auditar-conteudo.test.ts
```

Resultado verificado: `1` arquivo de teste passou e `2` testes passaram.

## Observação final
Se a chave do Vault usada pelo cron não corresponder à Secret correta de `cronjobs`, a correção segura é atualizar a entrada do Vault para a Secret adequada, sem revelar o valor em nenhum canal.
