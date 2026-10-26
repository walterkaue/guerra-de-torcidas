# Ranking de 52 semanas, Galeria de Troféus e Carreira: proposta para decisão

> Rascunho de 26/10/2026, para o Kauê decidir. **Nada aqui está decidido nem construído.** A ideia já foi aprovada em 18/10 (`docs/rankings.md`, seção 4); aqui ficam os pontos em aberto. Quando houver decisão, ela vai para o `docs/jogo.md` (seção 5, "Longo prazo").

## 1. O que já está decidido

- **52 semanas** (estilo tênis): soma dos pontos de campeonato das últimas 52 semanas.
- **Galeria de Troféus** eterna: semanas, temporadas, acessos, rebaixamentos, títulos de cidade.
- **Tabela de todos os tempos:** só vitrine.
- **Carreira:** Estreante, Reserva, Titular, Craque, Ídolo, Lenda. Nunca zera. XP cheio nas 5 primeiras partidas do dia, metade da 6ª à 15ª, zero depois.

## 2. Regras que não pode quebrar

| Regra | Na prática |
|---|---|
| **Justo** (pilar 7) | Quem chega depois alcança em meses. Carreira mede constância, nunca talento ou dinheiro. Nada se compra. |
| **Zero aposta** | Troféu e nível são só memória e zoeira. Nenhum prêmio. |
| **Sem apelido em ranking público** | Galeria e 52 semanas só de times. Carreira é **só sua**: aparece para você e no card que você manda. Nenhuma lista de níveis com apelido. |
| **Dados mínimos** | Nada novo é pedido ao jogador. |

## 3. O que falta decidir

### 3.1 Ordem de construção

| Opção | Prós | Contras | Esforço |
|---|---|---|---|
| **A. Tudo junto**, depois das divisões | Uma entrega só. | Demora; Carreira espera sem precisar. | Alto de uma vez |
| **B. Em degraus:** Carreira já; Galeria com o fechamento da semana; 52 semanas na 1ª temporada | Cada peça sai quando fica pronta. Carreira dá motivo de voltar já na pré-temporada. | Três entregas. | Médio, dividido |
| **C. Só Galeria e Carreira**; 52 semanas com 6 meses de dados | Menos trabalho agora. | Perde o ranking que "sempre anda". | Baixo |

**Recomendo B.**

### 3.2 Pontos das 52 semanas com duas divisões

Problema: no F1 por divisão, o 1º da Série B ganha os mesmos 25 do 1º da Série A. Somado em 52 semanas, isso distorce.

| Opção | Prós | Contras | Esforço |
|---|---|---|---|
| **A. Tabela de 20 posições pelo ranking geral** (ignora a divisão) | Justo: a média dos 30 melhores é comparável entre A e B. Serve também no mês de estreia. | Muda a regra de 18/10 ("soma dos pontos de campeonato"). | Baixo |
| **B. Pontos da divisão; B vale metade** | Mantém o F1. | Um 1º da B forte vale menos que um 5º da A fraco. | Baixo |
| **C. Pontos da divisão, iguais** | Regra atual, simples. | Time que domina a B sobe nas 52 semanas sem jogar a A. | Nenhum |

**Recomendo A**, com esta tabela:

| Posição | Pontos | Posição | Pontos |
|---|---|---|---|
| 1º | 25 | 6º a 18º | 13 a 1 (um a menos por posição) |
| 2º | 20 | 19º e 20º | 0 |
| 3º | 17 | | |
| 4º e 5º | 15 e 14 | | |

### 3.3 Galeria

| Ponto | Proposta |
|---|---|
| **Troféus** | Campeão da semana; campeão da temporada; campeão da B; acesso; rebaixamento; dérbi; meta coletiva; campeã de estado. Maior torcida numa prateleira à parte, "vitrine". |
| **Onde fica** | Aba **Conquistas**, que já existe (medalhas), ganha "Galeria do seu time" e a **Tabela de todos os tempos**. |
| **Casa do [time]** | Não mistura: a Casa é a história real do clube; troféu do jogo poderia ser confundido com título de verdade. |
| **Pré-temporada** | Não entra: zera junto. |
| **Card** | "O {time} tem 3 títulos e 2 rebaixamentos no Guerra." |

### 3.4 Carreira

| Ponto | Proposta |
|---|---|
| **XP** | 10 por partida válida (5 da 6ª à 15ª do dia). Time do Dia e cada rodada palpitada do Crava contam como 1 partida. Máximo ~100 por dia. |
| **Níveis** | Estreante 0 · Reserva 100 · Titular 1.000 · Craque 5.000 · Ídolo 15.000 · Lenda 30.000 |
| **Ritmo** | Jogando 5 partidas por dia: Titular em ~3 semanas, Craque em ~3 meses, Lenda em ~1 ano e meio. |
| **Bônus** | +100 XP se foi o 1º do dia entre todos (você só vê a própria posição); +200 se foi o 1º da sua torcida na semana. |
| **Sequência** | Mostra os dias seguidos; perder não tira nada. |
| **Onde aparece** | Home (nível e barra), resultado ("subiu pra Titular!") e card, se a pessoa quiser. |
| **Pré-temporada** | XP **fica** no zerar, como as medalhas: mede constância, não depende da pontuação. |

## 4. Base técnica

Galeria e 52 semanas dependem do **fechamento da semana** gravado (ver proposta de Série A e B, seção 4). A Carreira não depende de nada: precisa só de uma tabela própria que o `zerar-pre-temporada` preserve.

## 5. Perguntas para o Kauê

1. **Ordem:** B (Carreira já, Galeria depois, 52 semanas na 1ª temporada) ou A (tudo junto)?
2. **52 semanas pela tabela de 20 posições do ranking geral**, em vez dos pontos da divisão? Sim/Não
3. **Galeria na aba Conquistas** (e não na Casa do time)? Sim/Não
4. **Maior torcida** entra na Galeria como "vitrine"? Sim/Não
5. **XP da Carreira sobrevive ao zerar** da pré-temporada? Sim/Não
6. **Níveis** com Lenda em ~1 ano e meio de constância: OK? Sim/Não (se não: mais rápido ou mais lento?)
