# Próximos passos

> Retrato do projeto em 31/10/2026, para retomar em qualquer conversa. Regras e decisões continuam no `docs/jogo.md`; aqui só fica o que vem a seguir.
> Ao fechar um item, atualize este arquivo no mesmo PR. Para começar, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos

| Área | Estado em 31/10/2026 |
|---|---|
| Código | `main` limpa, sem PR ou issue abertos, 1506 testes e build passando |
| Publicação | Site no ar, 24 migrações sincronizadas, 11 funções publicadas |
| Rotinas | Sem falhas em 7 dias, exceto a dúvida da `carreira-fechar` (abaixo) |
| Tamanho | 216 KB gzip somando todo o JS e CSS (limite do bundle inicial: ~300 KB) |
| Conteúdo | Casa com 20 clubes revisados, faltam 35 de 808 títulos; 280 perguntas no ar (meta do lançamento: 800) |
| Uso | 7 jogadores, 4 na semana, 87 partidas. Pênaltis trazem 82% dos pontos. Amostra pequena |

## Em andamento

Uma sessão aberta em 31/10/2026. Veja o PR dela antes de mexer nessa área.

| Frente | Entrega | Não mexer em paralelo |
|---|---|---|
| Piloto das perguntas do staging | PR com lote de amostra em `rascunho`, relatório e consumo | `dados/perguntas/`, `docs/orquestracao.md` |

## Conferir primeiro

**`carreira-fechar`:** a rotina não tinha nenhuma execução registrada em 31/10, e todos os bônus nasceram juntos às 08:44 daquele dia. A primeira execução deveria sair às 00h15 de 01/11. Se a contagem abaixo seguir zerada depois disso, é bug. A consulta é só leitura.

```sql
select count(*) from cron.job_run_details r join cron.job j using (jobid) where j.jobname = 'carreira-fechar';
```

**Fechamento da semana:** a migração `20261031300000_fechamento_semana.sql` precisa de `db push` depois do merge. Na segunda seguinte, depois das 12h, confira as rotinas `fechar-semana-virada` e `fechar-semana-confirma` e se a semana passada tem 20 linhas travadas. A consulta é só leitura.

```sql
select semana, count(*), count(confirmada_em) as travadas from public.fechamento_semana group by 1 order by 1 desc;
```

## Pode começar já

Sem dependência das frentes em andamento.

| Frente | Executor | Resultado esperado |
|---|---|---|
| **Funil do desafio por link** (recomendada) | Sonnet, média | Dos 49 desafios enviados, só 3 tiveram alguém jogando. Achar onde a pessoa desiste, com dados e leitura do fluxo, e corrigir o que for pequeno |
| **Termos × jogo** | Sonnet, média | Lista do que o texto promete e o jogo não faz, para o Kauê e o advogado. Não altera os Termos |
| **Calibragem da Prova** | Sonnet, alta | Duas ou três opções simuladas com o balanço de 31/10. Não altera a pontuação |

Divergências já vistas nos Termos (`src/dados/termos.md`):
- Ranking de cidades, que ainda não existe.
- Checagem da Cloudflare, ainda desligada.
- Apagar contas paradas, sem rotina nem prazo.
- Aviso de mudança na tela inicial, ainda não existe.
- "Só você lê os seus", mas o administrador lê feedbacks e suspeitas.

## Só o Kauê faz

**Ligar o CAPTCHA (o código já está pronto), nesta ordem:**
1. Criar o site na Cloudflare Turnstile para `torcida.kauewalter.com.br`, no modo invisível.
2. Passar a chave **pública** para `VITE_TURNSTILE_SITE_KEY` no `.env.production`, em um PR. Esperar a publicação.
3. Ligar o CAPTCHA no painel do Supabase com a chave **secreta**, que fica só no painel.

**Decisões:**
- Calibragem da Prova: mediana de 4 pontos contra alvo de 45 a 75; 31 de 33 partidas acabam em erro.
- Prazo para apagar contas anônimas paradas.
- Supabase Pro antes de divulgar.
- Data do zerar da pré-temporada. A Crava termina em 2/12, e o balanço roda antes de zerar.
- Texto final dos Termos, com o advogado.
- Torcida sem ninguém jogando: fica com 0, como a seção 6 do `jogo.md` e o código, ou com as 30 vagas a 80%, como a seção 5? Decidir antes das divisões. Com 80%, ela pode passar um time que tem gente jogando mal.
- Divisões em novembro: o teste começa em série única, como o mês de estreia, ou já em Série A e B? A seção 5 não diz de onde sai a divisão inicial do teste.

## Depois do que está em andamento

1. **Ranking incremental:** o fechamento já está pronto, então pode começar. `fechamento_semana` copia `ranking_semana`, e as duas tabelas têm de continuar batendo.
2. **Divisões e cidade:** dependem das duas decisões acima. O plano das divisões está no PR do fechamento da semana. Galeria e 52 semanas vêm depois.
3. **Perguntas:** seguir para as outras do staging só se o piloto recomendar. A importação continua com o Kauê.
4. **Limpeza de anônimos:** depois do prazo decidido. Tem de guardar os pontos da semana aberta em `pontos_apagados`.

## Antes de divulgar

- [ ] CAPTCHA ligado
- [ ] Limpeza de anônimos no ar
- [ ] Ranking incremental
- [ ] Plano do Supabase decidido
- [ ] Termos e jogo batendo, com revisão do advogado
- [ ] Prova calibrada
- [ ] Funil do desafio entendido
- [ ] Balanço rodado e pré-temporada zerada
