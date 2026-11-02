# Robôs do Gemini para as perguntas: foco, paralelo e reposição (proposta, sem aplicar)

> Escrito em 02/11/2026. Origem: faltam 9 fáceis de clube na Prova (`docs/propostas/faceis-de-clube-prova.md`) e o pipeline entrega pouco. **Decidido pelo Kauê em 02/11/2026:** modo reposição com **5 execuções por dia** (em vez das 3 da seção 3.3), reavaliação **domingo 08/11 às 17h** (seção 3.5) e auditor ajustado ao novo volume (20 por execução, também 5 vezes por dia). Implementado em `supabase/functions/gerar-conteudo`, `auditar-conteudo`, `scripts/perguntas/reposicao.mjs` e na migração `20261102000000_robos_gemini.sql`; ainda não publicado.

## 1. Onde o pipeline está (medido em 02/11)

- **Volume:** 28 rascunhos em 9 dias (25/10 a 02/11): 22 aprovadas e no jogo, 6 reprovadas, 0 na fila do `#admin`. Ritmo recente: 1 a 4 por dia.
- **Fontes:** 394 páginas ativas, só 17 usadas (363 nunca). Chapecoense, Coritiba, Remo (8 cada), Bragantino e Mirassol (9) têm poucas páginas.
- **Cobertura:** só 6 clubes receberam pergunta do Gemini; 14 não receberam nenhuma. Das 22 aprovadas, 5 são fáceis.
- **Cota do Gemini:** o cron não registra o consumo. Pelo código, são 1 chamada por página (até 4 por rodada) no gerador e 1 por rascunho no auditor: da ordem de 50 a 70 chamadas em 9 dias. Não há medida real.

## 2. Por que rende pouco

1. **A função para na primeira página que dá resultado** (`break` em `gerar-conteudo/index.ts`). Uma rodada usa quase sempre 1 página.
2. **Cada página rende cerca de 2 propostas**, embora o prompt peça até 6 (o job manda `quantidade: 10`, limitada a 8 no código).
3. **Não dá para pedir "fácil do Vasco".** O sorteio é entre as páginas de menor uso de todos os clubes, e o Gemini escolhe o degrau.
4. **Sem medida de uso**, ninguém sabe quanto da cota gratuita sobra.

## 3. Proposta

### 3.1 Um robô, três parâmetros (retrocompatível)

`gerar-conteudo` passa a aceitar no corpo, todos opcionais:

| Parâmetro | Efeito |
|---|---|
| `clube` | Sorteia só entre as fontes desse clube. |
| `degrau` | O prompt pede só esse degrau. O código recusa proposta de outro degrau (motivo `degrau diferente do pedido`). |
| `paginas` | Máximo de páginas por rodada (padrão 3). A rodada continua até juntar `quantidade` aceitas ou esgotar as páginas ou o tempo (para depois de ~100 s, antes do limite de 120 s do cron). |

Sem parâmetros, o comportamento de hoje continua (menos o `break`, que passa a respeitar `paginas`).

### 3.2 Modo reposição: o robô descobre o que falta

Com `{"modo": "reposicao"}`, a função calcula o déficit de cada clube × degrau contra a cota da pré-temporada (3 fáceis, 3 médias, 2 difíceis, 2 de craque) usando `public.perguntas` ativas **mais** os rascunhos e pré-aprovadas pendentes, e trabalha no maior déficit. Sem déficit, volta ao sorteio uniforme entre os clubes de menor cobertura.

- Cobre sozinho as 9 fáceis de hoje (athletico-pr 2, chapecoense 2, bahia, bragantino, coritiba, remo, vasco 1 cada) e qualquer vaga futura.
- Conta rascunhos pendentes para não gerar a 10ª pergunta de uma vaga já preenchida.
- Quando a meta subir para 30 por clube, só muda a tabela de cotas.

### 3.3 Paralelo: 5 execuções por dia, não 20 robôs

Cinco jobs de cron no modo reposição (6h, 9h, 12h, 15h e 18h de Brasília; 09, 12, 15, 18 e 21 UTC no banco; o auditor roda uma hora depois de cada um), em vez de um job por clube. Um rodízio por déficit já distribui por clube e usa menos cota que 20 jobs com horário fixo. O cron do banco é UTC (conferido: 09 UTC = 6h de Brasília).

- **Por clube:** já vem do modo reposição. Se o Kauê preferir um job por clube, o parâmetro `clube` da seção 3.1 permite, sem código a mais.
- **Por tema:** só no prompt (parâmetro opcional `tema`). As fontes não têm tema, então só rende se a página tiver esse tipo de fato. Não recomendo agora.

### 3.4 Fácil de verdade

O prompt do degrau fácil ganha as regras do rebaixe de 02/11: título e final grande ou recente, Libertadores, Mundial, ídolo e técnico campeão. Sem estádio, nome de fundação, ano de título anterior, artilheiro de campanha ou final antiga de adversário pequeno. Isso evita que as fáceis novas voltem a acertar 43%.

### 3.5 Medir a cota

Tabela `staging_gt.uso_gemini` (dia, função, modelo, chamadas, tokens de entrada e saída, erros 429/503) alimentada pelo `perguntarJson`, que já recebe `usageMetadata`. Depois de 2 dias de medida se decide o volume. Sem medida, mantém-se o máximo de 3 execuções por dia.

### 3.6 Auditor e revisão

- O auditor aceita até 10 rascunhos por execução (`POR_RODADA`). O `quantidade: 2` do job é ignorado hoje. Com 3 execuções do gerador a 8 propostas, são até 24 por dia: subir `POR_RODADA` para 20 e rodar também às 18h.
- Carga estimada no `#admin`: de 5 a 10 por dia. O Kauê continua aprovando tudo; a IA não publica.

## 4. Estimativa (a confirmar com a medida)

Com `paginas` 3, 3 execuções por dia e ~2 propostas por página, cerca de 10 a 15 rascunhos por dia, dos quais metade passa na auditoria. As 9 fáceis deveriam fechar em alguns dias de aprovação no `#admin`, não em semanas. É estimativa: o rendimento por página só se conhece depois da medida.

## 5. Riscos

- **Cota gratuita:** 3 execuções chegam a ~14 chamadas cada (4 do gerador, 10 do auditor), ou ~40 por dia mais repetições. Sem confirmação do limite, a seção 3.5 vem primeiro.
- **Tempo da função:** páginas lentas com 429 esperam 8 s e 16 s por repetição. O orçamento de ~100 s impede estourar o cron.
- **Fontes pequenas:** Chapecoense, Coritiba e Remo têm 8 páginas. Pode ser preciso semear mais fontes aceitas (CBF, clube, imprensa).
- **Qualidade:** pergunta fácil gerada por IA ainda passa pela auditoria cega e pela revisão manual. Nenhuma trava foi afrouxada.

## 6. Plano de execução (depois da aprovação)

1. Tabela de uso e contagem no `perguntarJson` (migração nova, só cria; sem apagar nada).
2. Parâmetros `clube`, `degrau`, `paginas` e modo reposição, com testes da conta de déficit (módulo puro em `_shared`).
3. Prompt do degrau fácil.
4. Revisor confere o diff; `functions deploy --dry-run` antes do deploy; o deploy e os jobs de cron novos são aplicados com o aval do Kauê.
5. Dois dias de medida, depois ajuste de `paginas` e dos horários.

## 7. Decisões para o Kauê

1. Modo reposição com 3 execuções por dia (recomendado) ou um job por clube?
2. Medir a cota por 2 dias antes de subir de 1 para 3 execuções?
3. Subir o auditor para 20 por execução?
