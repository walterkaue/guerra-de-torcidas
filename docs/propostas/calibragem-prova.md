# Calibragem da Prova de Boleiro: proposta para decisão

> Escrito em 31/10/2026, com o balanço do mesmo dia. **Nada foi alterado:** pontuação, código de jogo e banco continuam como estavam, e as partidas fechadas não mudam (`docs/jogo.md`, seção 11). Todas as contas saem de `npm run calibragem-prova` (seção 8 deste texto).

## 1. Resumo

- **Hoje:** 33 partidas, 5 jogadores, mediana de **4 pontos** contra o alvo de 45 a 75, máximo 58. Em 31 das 33 a partida acaba em erro; 12 (36%) acabam na **primeira** pergunta, com zero ponto. A Prova traz 3% dos pontos da semana (os pênaltis, 83%).
- **A causa principal é a regra de encerrar no primeiro erro.** Com ela, a mediana só chegaria a 45 se a pessoa acertasse **cerca de 91% de todas as perguntas**. O banco de hoje dá 61% nas fáceis e 55% nas médias.
- **O banco também pesa, mas sozinho não resolve.** Mesmo que cada degrau batesse exatamente as metas de acerto do `jogo.md` (75%, 60%, 40%, 25%), a mediana seria **8**. As metas do `jogo.md` e o alvo de mediana não cabem juntos na regra de hoje.
- **A tabela de pontos não é a causa.** Dobrando todos os valores nas 33 partidas jogadas, a mediana vai de 4 para 8, e o teto passaria de 150 para 300.
- **Recomendação: opção B, "Três erros e fora"**, junto com a recalibragem das perguntas fáceis de clube. Detalhes na seção 6.

| Opção | O que muda | Mediana (banco de hoje / recalibrado / pessoa que manda bem) | Peso na semana |
|---|---|---|---|
| Hoje | Primeiro erro encerra, leva metade | 4 / 8 / 14 | 3% |
| **A · Segunda chance** | O 2º erro encerra, leva 75% | 15 / 24 / 44 | 6 a 8% |
| **B · Três erros e fora** | O 3º erro encerra, leva 75% | 29 / 35 / 57 | 8 a 12% |
| **C · Prova inteira** | Sempre as 8 perguntas; cada acerto soma | 58 / 63 / 76 | 9 a 19% |

Em todas, a tabela (8, 8, 12, 12, 18, 18, 25, 25), o bônus de 8 de 8 (+24) e o teto de 150 ficam como estão.

## 2. De onde vêm os números e o limite da amostra

- Fonte: `partidas`, `prova_respostas` e `prova_estado` do projeto ligado, só leitura, em 31/10/2026. Partidas fechadas e fora de suspeita: 33. Respostas: 81. O retrato anonimizado (jogadores viram j1 a j5) está em [`calibragem-prova-dados.json`](calibragem-prova-dados.json), porque o zerar da pré-temporada apaga as partidas.
- **A amostra é pequena e enviesada.** São 5 pessoas, 18 das 33 partidas no primeiro dia (20/10), provavelmente gente que conhece o projeto. A taxa de acerto fácil de 61% tem intervalo de 48% a 73% (95%). Difícil e craque têm **5 e 2 respostas**: não dizem nada. As taxas dessas faixas nos cenários abaixo são **suposição**, marcada como tal.
- O modelo foi conferido com a regra de hoje no banco observado: prevê 2,4 perguntas por partida (jogado: 2,5), mediana 4 (jogado: 4) e média 7,1 (jogado: 8,4). Não é exato, mas erra para baixo, não para cima.
- Nenhum cenário prevê **mudança de comportamento**: se a Prova pagar mais, as pessoas podem jogá-la mais, e o peso na semana subiria além do estimado.
- Antes de decidir com firmeza, vale esperar mais partidas. A decisão pode ser tomada agora porque a direção não depende do número exato (seção 5), mas **a constante final deve ser confirmada pelo balanço depois da mudança**.

## 3. Causa: pergunta, regra ou tabela

### 3.1 Como as partidas acabam

| Respondeu até a pergunta | Partidas | % |
|---|---|---|
| 1ª | 12 | 36% |
| 2ª | 9 | 27% |
| 3ª | 4 | 12% |
| 4ª | 5 | 15% |
| 5ª, 6ª ou 8ª | 3 | 9% |

A partida de hoje dura em média **2,5 perguntas**, cerca de 20 segundos, e não o minuto previsto no `jogo.md`. Das 12 pessoas que chegaram à primeira decisão de Parar ou Seguir, **1 parou**.

### 3.2 A regra de encerrar no primeiro erro

Com acerto de 61% na 1ª e 57% na 2ª, a chance de errar logo de cara é alta, e quem erra na 1ª leva zero (36%), na 2ª leva 4 (27%). **A mediana fica sempre no "errei na 2ª" ou antes.** Nesse ponto, nenhuma tabela razoável paga 45: só pagaria se a 1ª pergunta valesse 90.

| Tabela dobrada, mesmas 33 partidas (exato) | 25% | Mediana | 75% | Máx |
|---|---|---|---|---|
| Hoje | 0 | 4 | 8 | 58 |
| Tabela ×2 e bônus ×2 | 0 | 8 | 16 | 116 |

### 3.3 A pergunta

| Degrau | Respostas | Acerto | IC 95% | Meta do `jogo.md` |
|---|---|---|---|---|
| Fácil | 54 | 61% | 48% a 73% | ≥ 75% |
| Média | 20 | 55% | 34% a 74% | 50% a 75% |
| Difícil | 5 | 80% | 38% a 96% | 30% a 50% |
| Craque | 2 | 50% | 9% a 91% | < 30% |

- **A fácil está abaixo da meta**, e dentro dela a diferença está nas de clube: **43% (13 de 30)** contra **83% (20 de 24)** nas gerais, p = 0,0045 no teste exato de Fisher. Metade da escada tem pergunta de clube, então isso pesa. Nas médias é o contrário (clube 70%, geral 40%), com 10 respostas cada: ruído.
- **Não é tempo:** 1 resposta esgotou os 15 s em 81; a mediana é 8 s quando acerta e 9 s quando erra.
- **Não é um erro comum a uma alternativa:** as 31 respostas erradas se espalham entre as três alternativas (13, 8 e 10).
- Por tema, "copas" (22 respostas) e "títulos" (12) estão em 50%; "fundação" e "gols" em 75%.
- Por jogador, de 50% a 67%: ninguém destoa muito.
- **A recalibragem automática do `jogo.md` (degrau corrigido com 50 respostas por pergunta) não consegue agir:** 61 perguntas diferentes foram respondidas, e a mais respondida teve 5 respostas.
- A taxa necessária: com a regra de hoje, mediana 45 pede **90,6% de acerto em todas as perguntas**.

**Conclusão:** as três causas existem, nesta ordem de peso. (1) A regra transforma uma taxa de acerto ordinária em partidas de 1 a 3 perguntas. (2) A pergunta fácil de clube está mais difícil do que o degrau promete. (3) A tabela não contribui. E, além disso, a meta de acerto por degrau do `jogo.md` e o alvo de mediana são inconsistentes entre si: com acerto 75%, 60%, 40% e 25%, a mediana seria 8.

## 4. As opções

Todas mexem só em duas constantes (quantos erros encerram e quanto se leva ao errar) e na tela. Tabela, bônus e teto ficam. O "Parar e levar X" continua em A e B, e deixa de existir em C.

| | Hoje | A · Segunda chance | B · Três erros e fora | C · Prova inteira |
|---|---|---|---|---|
| Erros que encerram | 1 | 2 | 3 | nunca encerra |
| Ao errar e encerrar leva | 50% do acumulado | 75% | 75% | todo o acumulado |
| Pergunta errada vale | 0 e acaba | 0, a partida segue | 0, a partida segue | 0, a partida segue |
| Parar e levar X | sim | sim | sim | não faz sentido |
| Bônus de 8 de 8 | +24 | +24, só sem nenhum erro | +24, só sem nenhum erro | +24, só sem nenhum erro |

## 5. Simulação

### 5.1 Sobre as 33 partidas jogadas (piso)

A partida jogada parou no primeiro erro. Sob A, B e C ela teria continuado, e não sabemos como. Aqui conta só até o erro, então é o **mínimo** possível: o resultado real sob essas regras seria maior.

| Regra | 25% | Mediana | 75% | 90% | Máx | Média |
|---|---|---|---|---|---|---|
| Hoje (exato) | 0 | 4 | 8 | 14 | 58 | 8,4 |
| A · Segunda chance (piso) | 0 | 6 | 12 | 21 | 76 | 11,7 |
| B · Três erros e fora (piso) | 0 | 6 | 12 | 21 | 76 | 11,7 |
| C · Prova inteira (piso) | 0 | 8 | 16 | 28 | 101 | 14,9 |

### 5.2 No modelo (probabilidades exatas, sem sorteio)

Cada pergunta acerta com a taxa do seu degrau. Ninguém para (hoje 1 de 12 para). "Faz 45+" é a chance de uma partida fazer 45 pontos ou mais. A coluna de perguntas é a média por partida.

**Banco de hoje** (acerto fácil 61%, média 55%; difícil 50% e craque 35% supostos)

| Regra | 25% | Mediana | 75% | 90% | Média | Faz 0 | Faz 45+ | Perguntas |
|---|---|---|---|---|---|---|---|---|
| Hoje | 0 | 4 | 8 | 20 | 7,1 | 39% | 1% | 2,4 |
| A | 6 | 15 | 30 | 48 | 22,2 | 15% | 13% | 4,4 |
| B | 15 | 29 | 44 | 89 | 34,7 | 7% | 25% | 6,1 |
| C | 42 | 58 | 75 | 89 | 58,5 | 0% | 72% | 8,0 |

**Banco recalibrado** (acerto fácil 75%, média 65%; resto suposto)

| Regra | 25% | Mediana | 75% | 90% | Média | Faz 0 | Faz 45+ | Perguntas |
|---|---|---|---|---|---|---|---|---|
| Hoje | 0 | 8 | 14 | 29 | 11,5 | 25% | 2% | 3,1 |
| A | 12 | 24 | 44 | 63 | 31,3 | 6% | 20% | 5,3 |
| B | 21 | 35 | 57 | 93 | 44,4 | 2% | 35% | 6,7 |
| C | 46 | 63 | 80 | 93 | 63,3 | 0% | 80% | 8,0 |

**Pessoa que manda bem** (acerto fácil 85%, média 80%, difícil 60%, craque 45%: o que o `jogo.md` imaginava ao falar em "chega à 5ª")

| Regra | 25% | Mediana | 75% | 90% | Média | Faz 0 | Faz 45+ | Perguntas |
|---|---|---|---|---|---|---|---|---|
| Hoje | 4 | 14 | 29 | 38 | 20,8 | 15% | 7% | 4,1 |
| A | 24 | 44 | 63 | 108 | 49,9 | 2% | 41% | 6,3 |
| B | 35 | 57 | 93 | 108 | 65,3 | 0% | 60% | 7,4 |
| C | 58 | 76 | 93 | 108 | 77,7 | 0% | 93% | 8,0 |

O teto é 150 em todas as regras e cenários. Os quantis do modelo são "o menor valor que cobre a fração" (o relatório do balanço interpola; por isso podem diferir uma casa).

### 5.3 Peso na semana

Hoje a Prova tem 122 dos 4.460 pontos que contaram (2,7%). Escalando os pontos da Prova pela razão entre as médias de cada opção e a de hoje, no mesmo cenário:

| Cenário | A | B | C |
|---|---|---|---|
| Banco de hoje | 8% (383 pts) | 12% (600 pts) | 19% (1.012 pts) |
| Banco recalibrado | 7% | 10% | 13% |
| Pessoa que manda bem | 6% | 8% | 9% |

Os pênaltis, hoje com 83%, caem na mesma proporção. Nenhuma opção faz a Prova passar dos pênaltis na semana.

## 6. O que cada opção muda, risco e recomendação

### Opção A · Segunda chance
- **Experiência:** quase igual. O primeiro tropeço dói menos e a partida passa de 2,5 para 4,4 perguntas. A tela ganha o aviso "mais um erro e acaba".
- **Resultado:** mediana de 15 a 24 com o banco real. **Não chega ao alvo** nem no melhor cenário observável, só se a pessoa for muito boa (44).
- **Justo:** melhora um pouco (menos partidas decididas por uma só pergunta), mas 15% continuam em zero.
- **Anti-trapaça:** quase neutro (veja a nota geral abaixo).
- **Quando faz sentido:** se o Kauê quer mexer o mínimo e continuar com o alvo de 45 a 75 como meta de longo prazo, apoiada na recalibragem do banco.

### Opção B · Três erros e fora (recomendada)
- **Experiência:** a escada e o "Parar e levar X" continuam. A partida passa a durar 6 perguntas (cerca de 50 s, perto do "1 minuto" do `jogo.md`). Aparecem vidas na tela. Só 7% terminam com zero, e a pessoa mediana faz algo como 30 pontos.
- **Resultado:** mediana de 29 (banco de hoje) a 57 (quem manda bem). Com o banco como está **não chega a 45**. O balanço vai mostrar ⚠️ por um tempo.
- **Por que B:** é a única que leva a Prova para perto do alvo **sem perder a identidade** da escada, e que ainda é robusta à amostra pequena: se o acerto verdadeiro for maior que o observado, a mediana cai dentro da faixa (57); se for menor, fica em 29, e não em 4. A alavanca seguinte já está pronta: passar `erros` de 3 para 4 dá mediana de 38 / 58 / 76 nos mesmos cenários.
- **Justo:** boa. Quatro erros possíveis em oito perguntas fazem o resultado depender mais de saber do que de acertar a primeira. O peso na semana vai a 8% a 12%, e os pênaltis continuam muito acima.
- **Anti-trapaça:** veja a nota geral.

### Opção C · Prova inteira
- **Experiência:** vira outro jogo. Toda partida tem 8 perguntas (cerca de 1 minuto, como o `jogo.md` descreve), cada acerto soma, e o erro só não soma. **Acaba o "Parar e levar X"** (não tem o que decidir), e a ladder de TV que inspirou o nome perde o sentido. O texto "Errou: leva metade" some.
- **Resultado:** a única que cai na faixa com o banco real (58 a 63) e que quase não depende da amostra. Passa um pouco do alvo para quem manda bem (76).
- **Justo:** é a de menor variância, a mais justa entre pessoas. Em compensação, o peso da Prova na semana vai a 13% a 19% nos cenários de hoje, e a Prova passa a pesar quase tanto quanto o Time do Dia. É uma decisão de produto, não só de calibragem.
- **Risco:** o banco é consumido mais rápido (8 perguntas por partida, contra 2,5 hoje). Com 280 perguntas ativas, o não-repetir em 30 dias aperta; a meta de 800 ganha urgência.

### Nota geral sobre o anti-trapaça
- A detecção do `jogo.md` (90% de acerto em 40 respostas difíceis e de craque, tempo médio abaixo de 2,5 s) **não depende da regra** e continua valendo. O servidor segue recalculando tudo a partir das respostas e do tempo medido por ele; o teto de 150 e o limite de 3 partidas por minuto não mudam.
- Quem pesquisa e acerta 90% faz hoje 74 pontos de média contra 7 de quem joga limpo (10,5×). Em A, B e C faz 113, 122 e 124 contra 22, 35 e 58 (5,1×, 3,5× e 2,1×). **O ganho relativo de trapacear cai, mas o absoluto sobe:** mais pontos na mão de quem pesquisa. Como o teto diário de 5 partidas é compartilhado com os pênaltis, o efeito máximo continua limitado.
- Cada partida expõe mais perguntas (de 2,5 para 4,4, 6,1 ou 8,0). Alguém que monte um gabarito jogando enche o banco mais depressa. Contra isso valem o banco maior e o não-repetir em 30 dias.
- Sem mudança de banco de dados: dá para contar os erros a partir de `passos`, e `prova_respostas`, a detecção e a Arquibancada seguem iguais.

### Recomendação
**B, junto com a recalibragem das perguntas fáceis de clube.** Em duas etapas:
1. **Banco (sem código):** rever as fáceis de clube do lote 1 (43% de acerto). O `jogo.md` já manda recalibrar degrau com 50 respostas por pergunta, mas isso nunca vai acontecer com este uso; trate por clube e degrau, no painel de cobertura do `#admin`, assim que houver mais partidas.
2. **Regra:** `erros: 3` e `fracao: 0,75`. Aplicar na **virada da semana** (segunda), para não misturar duas regras no mesmo ranking, e depois rodar o balanço com **pelo menos 20 partidas novas**. O balanço deve filtrar as partidas pela data da mudança, para não misturar as regras.
3. Se a mediana ainda estiver abaixo de 45 com o banco recalibrado, subir para `erros: 4`. Se o Kauê preferir uma mediana de Prova mais baixa que a dos pênaltis, pode ser o caso de **revisar o alvo de 45 a 75 só para a Prova**: é um jogo de conhecimento, e a mediana de 30 a 45 já a torna jogável.

## 7. O que muda no código (se o Kauê escolher A, B ou C)

Não foi feito nada disso. Só para dimensionar:
- `src/jogo/prova.ts`: `fimDosPassos`, `calcularPontos` (hoje lança erro se há passo depois do primeiro erro), `levar` e a lista de erros. É o módulo compartilhado com a função `prova`, então cliente e servidor mudam juntos.
- `supabase/functions/prova/index.ts`: o fechamento da partida (`acabou = desfecho !== 'acertou' || …`).
- `src/telas/prova.ts` e `cardProva.ts`: vidas na tela; em C, tirar a tela de Parar e Seguir; o card (✅❌✋💡) já aguenta mais de um ❌.
- `docs/jogo.md`, seção 7.1 ("Como joga", "Pontuação" e a frase "pessoa mediana ~40 a 70").
- **Sem migração.** Sem mudança em `prova_respostas` ou `prova_estado`. Publicar função e site juntos, para um cliente antigo não achar que a partida acabou quando o servidor segue.
- Testes novos em `src/jogo/prova.test.ts` para as constantes novas.

## 8. Como reproduzir

```bash
npm run calibragem-prova                    # lê o retrato guardado neste diretório, sem rede
npm run calibragem-prova -- --banco         # lê o projeto ligado (SELECT, sem gravar)
npm run calibragem-prova -- --banco --gravar   # regrava o retrato, sem ids de pessoa
npm run balanco                             # o balanço de sempre
```

Arquivos: `scripts/balanco/calibragemProva.mjs` (contas puras, com testes em `calibragemProva.test.ts`) e `scripts/balanco/calibragem-prova.mjs` (leitura e relatório). Os testes conferem, entre outras coisas, que a reprodução com a regra de hoje bate com `calcularPontos` do jogo e com os pontos gravados em todas as 33 partidas.

## 9. Decisões para o Kauê

1. Qual opção: A, B (recomendada) ou C?
2. O alvo de 45 a 75 vale para a Prova também, ou ela pode ficar mais baixa por ser jogo de conhecimento?
3. Pode-se rever as perguntas fáceis de clube do lote 1 já agora?
