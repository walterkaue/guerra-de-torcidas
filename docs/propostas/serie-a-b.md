# Série A e Série B das torcidas: proposta para decisão

> **Decidido em 26/10/2026: o Kauê aceitou todas as recomendações** (já passadas para o `docs/jogo.md`). Nada construído ainda. Texto original da proposta abaixo. A regra-base já foi aprovada em 18/10 (`docs/rankings.md`, seção 3); aqui ficam só os pontos em aberto.

## 1. O que já está decidido

- 20 times oficiais: **Série A (10)** e **Série B (10)**. "Outro time" fica fora.
- Temporada de um mês (4 ou 5 semanas). Pontos de campeonato por semana, estilo F1 (25, 18, 15… 1), dentro da divisão.
- No fim: **2 últimos da A caem, 2 primeiros da B sobem**. Campeão da A = campeão da temporada.
- Na primeira temporada, a divisão sai da primeira semana de jogo.

## 2. Regras que não pode quebrar

| Regra | Na prática |
|---|---|
| **Justo** (pilar 7) | A semana continua pela média dos 30 melhores. Divisão nunca dá bônus de pontos. Evento não multiplica nada. |
| **Zero aposta** (pilar 6) | Campeão ganha troféu na Galeria e zoeira. Nenhum prêmio. |
| **Sem apelido em ranking público** | A tabela mostra só times. Nada de "quem mais pontuou pelo time". |
| **Dados mínimos** | Nada novo é pedido ao jogador. |

## 3. O que falta decidir

### 3.1 Como nasce a primeira temporada (depois do zerar)

| Opção | Prós | Contras | Esforço |
|---|---|---|---|
| **A. 1ª semana divide** (regra atual) | Simples. Acesso e queda já no 1º mês. | Uma semana só, com a audiência ainda chegando: divisão meio sorteada. | Baixo |
| **B. Mês de estreia em série única** (20 times; divide no fim) | 4 semanas de amostra: divisão justa. Mês 1 já tem campeão. | Primeira queda só no 2º mês. | Baixo |
| **C. Divide pela pré-temporada** | Pronto no dia do lançamento. | A pré-temporada só teve amigos: um time com 2 amigos bons cai na A. | Baixo |

**Recomendo B.** No mês de estreia, os 20 disputam uma série única com pontos por posição (tabela de 20 posições, ver proposta de 52 semanas). Quem fica de 1º a 10º vai para a A. O campeão desse mês ganha o troféu "Campeão da estreia".

### 3.2 Testar as divisões já na pré-temporada?

| Opção | Prós | Contras | Esforço |
|---|---|---|---|
| **A. Sim, em novembro, zera junto** | Os amigos testam tela, queda e narrador antes do lançamento. Acha bug cedo. | Com poucos jogadores, muito time sem ninguém. | Igual (o código é o mesmo) |
| **B. Não, só depois do zerar** | Tabela nasce "limpa". | Estreia sem nunca ter rodado de verdade. | Igual |

**Recomendo A**, com o aviso de pré-temporada que já existe.

### 3.3 Detalhes que precisam de regra

| Ponto | Proposta |
|---|---|
| **De que mês é a semana** | Da segunda-feira em que ela começa. Ex.: semana de 30/11 a 6/12 é de novembro. |
| **Torcida sem ninguém jogando** | Fica com as 30 vagas a 80% da média. Várias empatam. |
| **Desempate entre elas** | Pela posição na semana anterior (quem estava na frente segue na frente). No 1º dia, pela ordem da tabela da divisão. |
| **Desempate no fim do mês** | Mais vitórias de semana; depois, melhor última semana. |
| **Rival sem clássico** | Time logo acima **na divisão** (já está no `jogo.md`, seção 8). |
| **Dezembro e janeiro** (sem futebol real) | Temporadas seguem normais. A Copa de Verão corre em paralelo, com troféu próprio. |

### 3.4 O que aparece no jogo

- Ranking com duas abas: **Série A** e **Série B**, cada uma com pontos do mês, posição da semana e faixa de acesso (verde) e de queda (vermelho).
- Home: "Seu time está em 9º na Série A, 4 pontos da zona."
- Narrador no fechamento do mês: "{o_time} caiu pra Série B do Guerra", "{o_time} subiu! Série A, aí vamos nós." (frases novas passam pelo checklist do `docs/narrador.md`.)
- Card de fim de temporada para mandar no grupo: campeão, quem subiu e quem caiu.

## 4. Base técnica (vale para as 3 propostas)

Hoje o ranking da semana é calculado na hora e não fica gravado. Divisões, Galeria e 52 semanas precisam de um **fechamento da semana**: toda segunda às 00h05 o servidor grava a classificação final, num registro que não muda mais. É o primeiro passo das três propostas e também resolve parte do "ranking que aguente muitos jogadores" (seção 12).

| Etapa | O quê |
|---|---|
| 1 | Fechamento da semana gravado (cron no Supabase). |
| 2 | Divisões, pontos de campeonato e fechamento do mês. |
| 3 | Telas: abas A/B, Home, card de fim de temporada, frases. |

## 5. Perguntas para o Kauê

1. **Primeira temporada:** B (mês de estreia em série única) ou A (1ª semana divide, como está)?
2. **Testar as divisões em novembro**, na pré-temporada, e zerar junto? Sim/Não
3. **Semana é do mês da sua segunda-feira?** Sim/Não
4. **Desempate de torcida sem ninguém** pela semana anterior? Sim/Não
5. **Troféu "Campeão da estreia"** para o 1º do mês de estreia? Sim/Não (só vale se a 1 for B)
