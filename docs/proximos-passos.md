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

Duas sessões abertas em 31/10/2026. Veja o PR de cada uma antes de mexer nessas áreas.

| Frente | Entrega | Não mexer em paralelo |
|---|---|---|
| Fechamento da semana | PR com a tabela do fechamento e o plano das divisões | Ranking, `recalcular_ranking`, seção 5 do `jogo.md` |
| Piloto das perguntas do staging | PR com lote de amostra em `rascunho`, relatório e consumo | `dados/perguntas/`, `docs/orquestracao.md` |

## Conferir primeiro

**`carreira-fechar`:** a rotina não tinha nenhuma execução registrada em 31/10, e todos os bônus nasceram juntos às 08:44 daquele dia. A primeira execução deveria sair às 00h15 de 01/11. Se a contagem abaixo seguir zerada depois disso, é bug. A consulta é só leitura.

```sql
select count(*) from cron.job_run_details r join cron.job j using (jobid) where j.jobname = 'carreira-fechar';
```

## Pode começar já

Sem dependência das frentes em andamento.

| Frente | Executor | Resultado esperado |
|---|---|---|
| **Funil do desafio por link** (recomendada) | Sonnet, média | Dos 49 desafios enviados, só 3 tiveram alguém jogando. Achar onde a pessoa desiste, com dados e leitura do fluxo, e corrigir o que for pequeno |
| **Termos × jogo** | Sonnet, média | Lista do que o texto promete e o jogo não faz, para o Kauê e o advogado. Não altera os Termos |
| ~~Calibragem da Prova~~ | feita em 31/10 | Proposta com três opções em `docs/propostas/calibragem-prova.md`; falta o Kauê decidir (abaixo) |

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
- **Calibragem da Prova** (mediana de 4 contra alvo de 45 a 75; 31 de 33 partidas acabam em erro): escolher entre A (segunda chance), B (três erros e fora, **recomendada**) e C (prova inteira), e dizer se o alvo de 45 a 75 vale para a Prova. A causa é a regra do primeiro erro, não a tabela. Detalhes e contas em `docs/propostas/calibragem-prova.md` (`npm run calibragem-prova`). Depois da escolha: implementar na virada da semana e rodar o balanço com 20 partidas novas; rever em paralelo as perguntas fáceis de clube (43% de acerto).
- Prazo para apagar contas anônimas paradas.
- Supabase Pro antes de divulgar.
- Data do zerar da pré-temporada. A Crava termina em 2/12, e o balanço roda antes de zerar.
- Texto final dos Termos, com o advogado.

## Depois do que está em andamento

1. **Ranking incremental:** depois do fechamento da semana, porque mexe no mesmo cálculo.
2. **Divisões e cidade:** depois do fechamento. O `jogo.md` prevê testar as divisões em novembro. Galeria e 52 semanas vêm depois.
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
