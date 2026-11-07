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

Com `{"modo": "reposicao"}`, a função calcula o déficit de cada clube × degrau contra a cota (desde 06/11/2026, a meta do lançamento: 9 fáceis, 9 médias, 6 difíceis, 6 de craque; antes, 3/3/2/2 da pré-temporada) usando `public.perguntas` ativas **mais** os rascunhos e pré-aprovadas pendentes, e trabalha no maior déficit. Sem déficit, volta ao sorteio uniforme entre os clubes de menor cobertura.

- Cobre sozinho as 9 fáceis de hoje (athletico-pr 2, chapecoense 2, bahia, bragantino, coritiba, remo, vasco 1 cada) e qualquer vaga futura.
- Conta rascunhos pendentes para não gerar a 10ª pergunta de uma vaga já preenchida.
- A meta subiu para 30 por clube em 06/11/2026: só mudou a tabela de cotas.

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

## 8. Medida de 02 a 06/11/2026 (só leitura; dia 06 parcial)

`staging_gt.uso_gemini`, por dia e função:

| Dia | Função | Chamadas | Falhas | Entrada | Saída |
|---|---|---|---|---|---|
| 02/11 | gerar | 9 | 0 | 28.640 | 1.374 |
| 02/11 | auditar | 7 | 2 | 26.518 | 289 |
| 03/11 | gerar | 13 | 1 | 33.856 | 2.646 |
| 03/11 | auditar | 24 | 12 | 40.398 | 1.002 |
| 04/11 | gerar | 16 | 1 | 40.626 | 5.379 |
| 04/11 | auditar | 37 | 17 | 54.584 | 1.508 |
| 05/11 | gerar | 14 | 4 | 24.927 | 3.267 |
| 05/11 | auditar | 34 | 22 | 28.384 | 940 |
| 06/11 | gerar | 3 | 0 | 33.213 | 1.569 |
| 06/11 | auditar | 13 | 6 | 16.934 | 499 |

- **Total:** `auditar` 59 falhas em 115 chamadas (51%), 167 mil tokens de entrada e 4 mil de saída. `gerar` 6 falhas em 55 (11%), 161 mil e 14 mil.
- **O que a seção 3.5 prometia e a tabela não entrega:** a divisão 429/503. Só há `falhas`. Sem ela não dá para saber se a cobrança do Google AI Studio resolveria (resolve cota, não sobrecarga).
- **Rascunhos desde 03/11:** 62 (cerca de 15 por dia, dentro dos 10 a 15 da seção 4). 40 `publicada`, 7 `pre_aprovada`, 11 `rascunho`, 4 `reprovada`. Passaram 47 das 51 auditadas (92%), bem acima da metade estimada. As 4 reprovações são de 03/11: duas por propaganda na fonte, uma por o auditor escolher outra alternativa, uma por o trecho do auditor não trazer a resposta.
- **Cuidado ao ler "falhas":** `chamadas` e `falhas` contam cada tentativa, inclusive as repetições de 429/503 (até 3 por modelo, com espera de 8, 16 e 24 s). Uma auditoria que bate na cota várias vezes infla as duas colunas, então 51% é taxa de tentativas e não de auditorias perdidas (47 das 51 auditadas passaram).
- **Fáceis de clube (contagem por `degrau = 1` em `public.perguntas`, status `ativa`):** as 9 estão preenchidas, e os 7 clubes têm 3 ou mais fáceis: athletico-pr 4, bahia 3, bragantino 4, chapecoense 4, coritiba 4, remo 3, vasco 6. O Bahia tem `bahia-f-04`, `bahia-m-01` e `bahia-m-03`.
- **Médias acima da cota antiga** (3 por clube): athletico-pr 7, bahia 5, bragantino 4, chapecoense 5, coritiba 4, remo 4, vasco 5. **Decidido pelo Kauê em 06/11/2026: nenhuma é aposentada.** Pergunta válida não sai por excesso; a cota subiu para 30 por clube (9/9/6/6) e o robô passa a buscar mais para os outros clubes. Esses sete ficam por último nas médias até os demais os alcançarem.
- **Inclinação (decisão do Kauê):** manter as 5 execuções; a meta fechou e a fila de auditoria é de 11 rascunhos. Antes de ligar a cobrança, separar 429 de 503. O PR `claude/uso-gemini-codigos` passa a gravar em `staging_gt.uso_gemini.codigos` o código de cada tentativa que falha (coluna nova, migração `20261106400000` que só cria). Com 2 ou 3 dias de dado novo dá para decidir.
