# Lances do Jogo unificados: números para decisão

> Escrito em 04/11/2026, com o retrato do banco da mesma noite. **Nada foi alterado:** pontuação, código de jogo, banco e telas continuam como estavam, e as partidas fechadas não mudam (`docs/jogo.md`, seção 11). A decisão de produto está na seção 14.7 do `docs/jogo.md`; este texto dá os números finais. Todas as contas saem de `node scripts/balanco/lances-unificados.mjs` (seção 9).

## 1. Resumo

- **Pênaltis:** gol 8, ângulo +4, cavadinha +6, defesa 8, vitória +15, 5 de 5 +12. O teto cai de 220 para **149**, já contando a morte súbita. A mediana fica em **63** nas 48 partidas reais e no modelo, contra 80 hoje.
- **Faltas e Cara a cara:** gol fácil 24, médio 30, difícil 36, craque 42, recriar +8 (opção B). O teto é **150**: 3 gols de craque recriando o lance. Com a pontaria das pessoas de hoje, **nenhuma tabela que caiba em 150 chega a uma mediana de 60.** A B é a que chega mais perto: 34 nas partidas reais, 44 para quem aprendeu e 64 com a mira do robô. A proposta inicial (12, 22, 32, 42 e +8) dá 23, 40 e 40.
- **O alvo esbarra no teto.** Com 3 tentativas e teto de 150, cada tentativa vale no máximo 50. A mediana de 60 pede uns 2 gols de 30 por partida, e as pessoas acertam hoje 30% dos chutes (o robô acerta 67%). A alavanca que falta é a pessoa acertar mais (aquecimento e dicas) e a faixa de cada lance ser corrigida pela taxa real.
- **Desequilíbrio dentro dos Lances:** como os três tipos dividem as mesmas 3 vagas do dia, quem quer ponto vai preferir pênaltis (mediana 63) a faltas (34 a 44). Isso fica para decisão (seção 10).
- **Medalhas:** o pênalti custa, em partidas, o mesmo que uma falta fácil: bronze em 3, prata em 16 e ouro em 32. A falta fácil pede 3, 12 e 34; a de craque, 9, 38 e 110. Medindo em lances chutados, o pênalti custa umas 3 vezes mais (10 lances por partida, contra 3).
- **Limite diário:** **10 partidas de Lances valendo.** Cobre o maior dia visto (8) com folga, e passar de 10 para 20 aumenta a soma das 3 melhores só em 8% (231 para 250).
- **Peso na semana:** para a pessoa mediana, Lances 50%, Prova 16%, Time do Dia 26% e Crava 7% (hoje: 63%, 12%, 20% e 5%). Para quem joga muito, **a Prova vai de 23% para 43%** e empata com os Lances, porque deixa de dividir o teto com os pênaltis.
- **8 lances do catálogo** parecem não deixar recriar (o robô quase nunca acerta a zona histórica). Neles o ouro, que pede 10 recriados, seria impossível. Isso já vale hoje e não depende desta proposta (seção 5).

| Tipo | Tabela proposta | Teto | Mediana: partidas reais | Mediana: modelo |
|---|---|---|---|---|
| Pênaltis | 8 · +4 · +6 · 8 · +15 · +12 | 149 | 63 (48 partidas) | 63 pré-temporada · 34 joga pouco · 69 manda bem |
| Faltas e Cara a cara | 24 · 30 · 36 · 42 · +8 | 150 | 34 (10 partidas) | 38 aprendeu · 44 aprendeu com faixa corrigida · 64 robô |

## 2. De onde vêm os números e o limite da amostra

- **Fonte:** `partidas`, `dia_partidas` e `pontos_semana` do projeto ligado, só leitura (SELECT), em 04/11/2026 às 21h08 de Brasília. Os ids de pessoa viraram j1 a j18. O retrato está em [`lances-unificados-dados.json`](lances-unificados-dados.json), porque o zerar da pré-temporada apaga as partidas.
- **Pênaltis:** 48 partidas fechadas fora de suspeita, de 13 pessoas, entre 18/10 e 04/11. Duas pessoas jogaram 26 delas.
- **Faltas e Cara a cara:** **10 partidas, 30 tentativas, 5 pessoas e 2 dias** (valem desde 03/11). Só 7 lances diferentes foram jogados. **É a amostra mais fraca do texto:** a taxa de 30% de gol tem intervalo de 17% a 48% (95%), e são pessoas jogando pela primeira vez.
- **Prova:** 32 partidas, só 4 com a regra de três erros (desde 02/11). O modelo da Prova é o da calibragem (`docs/propostas/calibragem-prova.md`).
- **Conferência:** a reprodução com a tabela de hoje bate, ponto a ponto, com os pontos gravados nas 48 partidas de pênaltis e nas 10 de Lances. O teste `scripts/balanco/lancesUnificados.test.ts` confere isso.
- **Mudança de comportamento:** nenhum cenário a prevê. Com 3 vagas e 10 partidas por dia, quem joga muito tende a escolher o tipo que paga mais. Isso aparece na seção 4.4, mas o tamanho do efeito só o balanço vai mostrar.

## 3. Pênaltis

### 3.1 Tabela proposta

| Ação | Hoje | Proposta |
|---|---|---|
| Gol | 10 | **8** |
| Gol no ângulo | +5 | **+4** |
| Cavadinha que entra | +10 | **+6** |
| Defesa | 10 | **8** |
| Vitória (também na morte súbita ou no par ou ímpar) | +20 | **+15** |
| 5 de 5 (cobranças ou defesas) | +25 | **+12** |
| **Teto da partida** | 220 | **149** |

- **Como o desempate cabe no teto:** dois caminhos disputam o máximo. Tempo normal perfeito: 5 cavadinhas (70) + 5 defesas (40) + vitória (15) + os dois 5 de 5 (24) = **149**. Empate em 5 x 5 seguido de 3 rodadas de morte súbita (a última com gol e defesa): 8 cavadinhas (112) + 1 defesa (8) + 5 de 5 nas cobranças (12) + vitória (15) = **147**. Indo ao par ou ímpar depois de 8 x 8, dá menos (139). Ou seja, **a regra da morte súbita e do par ou ímpar não muda**, e gols e defesas extras valem os pontos normais.
- **Por que essa proporção:** tudo cai uns 20%, e o 5 de 5 cai mais (de 25 para 12). Ele é o que levava o teto a 220 e é raro: em 48 partidas, 3 vezes nas cobranças e 1 nas defesas.
- **Proteção no código:** além de a tabela caber, o fechamento pode limitar o total a 150 (`min(total, 150)`). Com esta tabela isso nunca dispara; serve só para uma tabela futura não passar do teto sem ninguém ver.

### 3.2 Simulação

Taxas observadas: gol em 58,7% das cobranças (ângulo em 9,9% e cavadinha em 2,6% dos gols), defesa em 41,3%, máquina chuta para fora em 12,4% e vitória em 65%. O modelo sorteia 200 mil disputas com essas taxas, seguindo a ordem do motor: 5 rodadas, morte súbita até 3 rodadas e par ou ímpar.

| Tabela · fonte | 25% | Mediana | 75% | 90% | Média | Máx | Bate 150 |
|---|---|---|---|---|---|---|---|
| Hoje · 48 partidas (exato) | 40 | 80 | 90 | 102 | 70,9 | 140 | 0% |
| Hoje · modelo pré-temporada | 45 | 80 | 90 | 105 | 71,9 | 190 | 0,1% |
| **Proposta · 48 partidas (exato)** | **32** | **63** | **71** | **80** | **55,3** | **101** | **0%** |
| **Proposta · modelo pré-temporada** | **36** | **63** | **71** | **79** | **56** | **133** | **0%** |
| Proposta · joga pouco (gol 45%, defesa 33%) | 24 | 34 | 61 | 71 | 40,9 | 135 | 0% |
| Proposta · manda bem (gol 70%, defesa 50%) | 61 | 69 | 79 | 91 | 67,9 | 139 | 0% |

"Exato" é refazer as partidas jogadas com a tabela nova: a tabela só muda o valor de cada evento, e a ordem da disputa não depende dela. "Bate 150" é a chance de uma partida fazer 150 ou mais.

**Alternativas que o script também mede** (mediana nas 48 partidas / modelo):
- **Mais baixa** (gol 7, defesa 7, 5 de 5 +10; resto igual à proposta): 57 / 57, teto 136. Serve se o Kauê quiser aproximar os pênaltis das faltas (seção 4.4).
- **Vitória pesa mais** (gol 7, ângulo +3, defesa 7, vitória +20, 5 de 5 +10): 62 / 62, teto 141. Dá mais peso a ganhar a disputa do que a fazer gol.

## 4. Faltas e Cara a cara

### 4.1 Como foi medido

- **Partidas jogadas (exato):** as 30 tentativas valendo, cada uma com a faixa do lance, o desfecho e se recriou, refeitas com cada tabela. Hoje a partida tem 3 lances que a pessoa escolhe; na regra nova serão 3 tentativas do mesmo lance. A conta por tentativa é a mesma.
- **Robô:** o robô de calibragem (`calibrar` em `src/jogo/lances.ts`), com duas miras: no gol (a de sempre) e na zona histórica (para recriar). Para cada lance, mede a chance de gol e de recriar com o erro de mão típico de uma pessoa, e a pessoa escolhe a mira que rende mais com a tabela.
- **Pessoa × robô:** nos mesmos lances, as pessoas fizeram 9 gols em 30 tentativas; o robô faria 20. Por isso o fator é **0,45**. Os cenários são:
  - **Pré-temporada** (×0,45): o que se viu.
  - **Aprendeu** (×0,7): suposição de quem já jogou algumas vezes, com o aquecimento e as dicas.
  - **Robô** (×1): mira ideal com erro de mão. É o que a faixa de hoje supõe.
- **Faixa corrigida:** o `jogo.md` (seção 7.3) já manda corrigir a faixa pela taxa real depois de 50 tentativas. Como as pessoas erram mais que o robô, a correção sobe a faixa dos lances e, com ela, os pontos. Linha "faixa corrigida": cada lance na faixa que a taxa da pessoa daria.
- **Partida:** 3 tentativas do mesmo lance. A distribuição é exata (3 resultados possíveis por tentativa: recriou, gol fora da zona ou nada), misturando os 51 lances do catálogo com peso igual (28 fáceis, 16 médios, 5 difíceis e 2 de craque).

### 4.2 As opções

| | Fácil | Médio | Difícil | Craque | Recriar | Teto |
|---|---|---|---|---|---|---|
| Hoje (partida de 3 lances) | 10 | 18 | 26 | 34 | +6 | 120 |
| **A · Inicial do Kauê** | 12 | 22 | 32 | 42 | +8 | 150 |
| **B · Proposta** | **24** | **30** | **36** | **42** | **+8** | **150** |
| **C · Meio-termo** | 20 | 26 | 34 | 42 | +8 | 150 |

As três respeitam o teto de 150 só com o craque: 3 × (42 + 8). Num lance fácil, o máximo é 96 em B, 60 em A e 84 em C.

### 4.3 Simulação

Mediana da partida (25% / mediana / 75% / 90%):

| Fonte | Hoje | A · Inicial | **B · Proposta** | C · Meio-termo |
|---|---|---|---|---|
| 10 partidas jogadas (exato) | 0 / 19 / 23 / 25 | 0 / 23 / 29 / 31 | **0 / 34 / 46 / 49** | 0 / 30 / 39 / 41 |
| Pré-temporada ×0,45 | 0 / 16 / 24 / 32 | 0 / 20 / 30 / 40 | **0 / 30 / 44 / 64** | 0 / 26 / 40 / 56 |
| Aprendeu ×0,7 | 16 / 20 / 32 / 48 | 20 / 24 / 40 / 60 | **30 / 38 / 64 / 76** | 26 / 34 / 56 / 68 |
| Robô ×1 | 20 / 32 / 48 / 54 | 24 / 40 / 60 / 66 | **44 / 64 / 76 / 96** | 40 / 56 / 76 / 84 |
| Pré-temporada, faixa corrigida | 0 / 32 / 40 / 64 | 0 / 40 / 50 / 80 | **0 / 36 / 50 / 88** | 0 / 42 / 50 / 84 |
| Aprendeu, faixa corrigida | 18 / 32 / 48 / 64 | 22 / 40 / 60 / 80 | **30 / 44 / 76 / 90** | 26 / 42 / 68 / 84 |

Chance de bater 150 numa partida: abaixo de 0,1% em todos os cenários e opções (até 0,2% com a faixa corrigida, que põe mais lances em craque). Médias e máximos estão no relatório do script.

**Por faixa, com a proposta B** (catálogo de hoje):

| Faixa | Lances | Mediana (aprendeu / robô) | 90% (aprendeu / robô) | 3 melhores de 10 partidas (aprendeu / robô) |
|---|---|---|---|---|
| Fácil | 28 | 48 / 64 | 72 / 96 | 218 / 265 |
| Médio | 16 | 38 / 60 | 76 / 90 | 221 / 271 |
| Difícil | 5 | 36 / 44 | 88 / 88 | 209 / 265 |
| Craque | 2 | 0 / 42 | 50 / 92 | 176 / 220 |

- **Leitura:** em B, a partida fácil é a de mediana mais alta, mas nas **3 melhores de 10** fácil, médio e difícil empatam: quem joga muito ganha o mesmo arriscando. O craque fica atrás (dois lances só, chance de gol de ~25%).
- **Por que não a A:** é a mais justa com quem arrisca (o ponto esperado por chute fica parecido em todas as faixas), mas a mediana fica em 40 mesmo com a faixa corrigida, e em 23 nas partidas reais. Com ela, as faltas pagam metade dos pênaltis.
- **Por que não ir além de B:** subir mais o fácil achata a escada. Em B, um gol fácil já vale 57% do craque (hoje, 29%). Subir o craque passa do teto.

### 4.4 Pênaltis e faltas na mesma conta

Os três tipos dividem as 3 melhores partidas do dia. Para a pessoa, a pergunta é qual rende mais por partida:

| Pessoa | Pênaltis (proposta) | Faltas e Cara a cara (B) |
|---|---|---|
| Pré-temporada | mediana 63, média 56 | mediana 30 a 36, média 28 a 37 |
| Aprendeu / manda bem | 69, média 68 | 38 a 44, média 43 a 50 |

Com a pontaria de hoje, **os pênaltis rendem de 50% a 100% a mais**, e as faltas viram jogo de medalha. Três saídas, para o Kauê escolher (seção 10):
1. Aceitar por um tempo e corrigir a faixa dos lances pelos dados assim que houver amostra (a correção aproxima as duas colunas).
2. Usar a tabela "mais baixa" nos pênaltis (mediana 57), sem passar do alvo.
3. As duas juntas.

## 5. Medalhas

Partidas até cada medalha, na mediana, por sorteio. Pênaltis com a tabela proposta; faltas pela trilha de hoje (5 · 20 · 50 gols, ouro com 10 recriados), com 3 tentativas do mesmo lance por partida. No ouro das faltas, a pessoa mira na zona histórica para recriar.

| Item · pessoa | Gols por partida | Bronze | Prata | Ouro |
|---|---|---|---|---|
| **Pênaltis** (10 · 50 · 100 gols, ouro com 10 vitórias) · pré-temporada | 3,2 | **3** | **16** | **32** |
| Pênaltis · joga pouco (vitória 36%) | 2,4 | 4 | 21 | 41 |
| Pênaltis · manda bem (vitória 89%) | 3,7 | 3 | 14 | 28 |
| Falta fácil · aprendeu / robô | 1,7 / 2,4 | 3 / 2 | 12 / 8 | 34 / 24 |
| Falta média · aprendeu / robô | 1,4 / 2,0 | 4 / 3 | 15 / 10 | 54 / 38 |
| Falta difícil · aprendeu / robô | 0,9 / 1,2 | 6 / 4 | 24 / 17 | 57 / 40 |
| Falta craque · aprendeu / robô | 0,5 / 0,8 | 9 / 7 | 38 / 27 | 110 / 77 |

- **Em partidas, o equilíbrio é bom:** o pênalti custa o mesmo que uma falta fácil, e menos que médio, difícil e craque. No ouro, a condição que pesa é a dos 100 gols. As 10 vitórias chegam antes, menos para quem perde muito: com 36% de vitórias, são ~28 partidas para 10 vitórias, ainda abaixo das 41 dos gols.
- **Em lances chutados, o pênalti custa mais:** uma partida de pênaltis tem 10 lances (5 cobranças e 5 defesas) contra 3 tentativas de falta. O ouro do pênalti são ~320 lances; o de uma falta fácil, ~100. **O pênalti custa umas 3 vezes mais.** Só como referência, igualar pelo número de lances pediria uma trilha de ~3 · 15 · 33 gols. A decisão de 10 · 50 · 100 não muda aqui.
- **Lances sem ouro possível:** em 8 lances o robô quase nunca acerta a zona histórica, nem mirando nela (menos de 2% das vezes): `flamengo-2019-virada-em-lima`, `vasco-2000-virada-do-seculo`, `palmeiras-2021-tri-da-america`, `botafogo-2024-com-um-a-menos`, `gremio-1995-o-rebote-do-olimpico`, `selecao-2002-falta-de-shizuoka`, `bahia-1989-a-virada-na-fonte-nova` e `mirassol-2025-o-gol-relampago`. Pode ser a zona do CSV ou a geometria (bola muito de lado, goleiro saindo). Hoje o ouro deles já é inalcançável. Vale uma conferência à parte, antes de a trilha ganhar destaque na tela única.

## 6. Limite diário de partidas de Lances valendo

**Comportamento visto** (34 pessoa-dias, todos os jogos):

| Jogo | Pessoa-dias | Mediana | 90% | Máx |
|---|---|---|---|---|
| Todos | 34 | 2 | 7 | 13 |
| Pênaltis + Lances | 33 | 2 | 5 | 8 |
| Prova | 11 | 2 | 5 | 8 |

**Quanto vale jogar mais** (soma esperada das 3 melhores entre N partidas de pênaltis, tabela proposta):

| N | 3 | 5 | 8 | 10 | 12 | 15 | 20 |
|---|---|---|---|---|---|---|---|
| Soma das 3 melhores | 168 | 204 | 223 | **231** | 236 | 243 | 250 |

**Custo no servidor** (chamadas de função por partida valendo):
- **Pênaltis:** `nova-partida` + 10 `lance-penalti` + `fechar-partida` = 12 (até 18 com morte súbita).
- **Faltas e Cara a cara:** `lances` nova + 3 lances = 4.
- **Treino:** zero, porque roda no aparelho.

Com 10 partidas de pênaltis por dia, uma pessoa faz ~120 a 180 chamadas por dia, ou ~3.600 a 5.400 por mês. Com o plano gratuito (500 mil chamadas por mês; o Pro sai antes de divulgar, segundo o `proximos-passos.md`), o limite segura ~90 a 140 pessoas jogando o máximo todo dia.

**Recomendação: 10.** Cobre o maior dia visto (8), e o ganho de ir além é pequeno: de 10 para 20, as 3 melhores somam só 8% a mais. O freio de 3 partidas por minuto continua. O número fica em `config_deteccao.lances_por_dia` (hoje 6) e passa a contar pênaltis, faltas e cara a cara juntos.

## 7. Peso na semana

Regra nova: Lances 3 × 150, Prova 3 × 150, Time do Dia até 100 e Crava ×2 até 300 por rodada.

**Nas partidas reais** (as mesmas partidas, refeitas com a tabela e as vagas novas; Time do Dia e Crava iguais):

| Regra | Lances (pênaltis + faltas) | Prova | Time do Dia | Crava |
|---|---|---|---|---|
| Hoje, no ranking | 76% (3.498 pontos; pênaltis sozinhos 74%) | 5% | 18% | 1% |
| Regra nova | 70% (2.768) | 7% | 21% | 1% |

O "82%" do `proximos-passos.md` é de um retrato anterior. No de 04/11, que já tem a semana de 02/11 (faltas valendo e a Prova nova), os pênaltis dão 74% dos pontos.

**No modelo**, com duas pessoas-tipo:
- **Pessoa mediana:** 4 dias por semana; por dia, 2 partidas de Lances (metade pênaltis, metade faltas) e 1 Prova; Crava 60 por semana.
- **Joga muito:** 7 dias; por dia, 10 Lances e 5 Provas; Crava 120. O Crava é suposição: só há uma rodada valendo no retrato.
- **Time do Dia:** 56 de média (15 jogadas). **Prova:** pelo modelo da calibragem, regra de três erros (banco de hoje para a mediana; "manda bem" para quem joga muito).

| Pessoa · regra | Lances | Prova | Time do Dia | Crava |
|---|---|---|---|---|
| Mediana · hoje | 63% | 12% | 20% | 5% |
| **Mediana · regra nova** | **50%** | **16%** | **26%** | **7%** |
| Joga muito · hoje | 66% | 23% | 8% | 3% |
| **Joga muito · regra nova** | **44%** | **43%** | **10%** | **3%** |

- **Para a pessoa mediana,** nada se desequilibra: ela joga menos de 3 partidas de cada por dia, e as vagas novas não mudam o que conta. Os Lances perdem peso porque a tabela dos pênaltis caiu ~20%.
- **Para quem joga muito, a Prova passa a pesar quase o mesmo que os Lances.** Hoje ela divide 5 vagas com os pênaltis e quase sempre perde; agora tem 3 vagas só dela. É o efeito pretendido (ninguém precisa escolher entre Prova e pênalti), mas o balanço deve olhar isso.
- **Teto da semana:** Lances 3.150 e Prova 3.150 (7 × 450), Time do Dia 700, Crava 300 por rodada. Hoje pênaltis e Prova dividem 5 vagas por dia, e as faltas têm 1 vaga de 120 (840 na semana).

## 8. O que muda no código e no banco

Não foi feito nada disso. É só para dimensionar.

### 8.1 Servidor e banco

- **Data de corte:** uma chave em `config_deteccao` (ou numa tabela de regras) com a segunda de entrada, por exemplo `lances_unificados_desde`. Toda função que conta pontos decide pela **data de criação da partida**, nunca pelo relógio de agora.
- **Módulos puros** (compartilhados com o servidor pelo `deploy:funcoes`):
  - `src/jogo/penaltis.ts`: a tabela vira versionada (`PONTOS` de hoje e a nova), e `totalizar` recebe a versão. O teto de 150 entra como guarda.
  - `src/jogo/lances.ts`: `PONTOS_FAIXA`, `BONUS_RECRIOU` e `TETO_PARTIDA` (120 → 150) versionados; `simularPartidaLances` passa a receber 1 cena repetida 3 vezes.
  - `src/jogo/lancesPartida.ts`: `LANCES_PARTIDAS_POR_DIA` 6 → 10; a detecção de "gesto de robô" segue igual (olha as 15 últimas tentativas do mesmo lance, que agora chegam mais rápido; vale acompanhar no balanço se aparece suspeita falsa).
- **Função `lances`:** `nova` recebe 1 id (e devolve erro claro, "atualize o app", para a lista antiga de 3 ids diferentes). Novo: o desafio por link (X1) para faltas e cara a cara, guardando o lance e os pontos de quem desafiou. Quem aceita joga o mesmo lance com sementes novas, e vence quem fizer mais pontos, como na Prova.
- **Função `nova-partida` (pênaltis):** passa a contar no limite do dia (hoje os pênaltis não têm limite). Precisa da mesma transação com trava por torcedor da `lances_comecar`, com o limite somando os dois tipos. Passou do limite: responde `limite_do_dia`, e o celular abre a mesma partida como treino.
- **Função `fechar-partida`:** escolhe a tabela pela data de criação.
- **Migrações:**
  1. `atualizar_teto`: antes do corte, a regra de hoje (5 melhores de pênaltis e Prova, mais a melhor dos Lances); depois, as **3 melhores de `minigame in ('penaltis', 'lances')`** e as **3 melhores da Prova**. A data de corte é necessária porque liberar uma suspeita antiga refaz o teto de um dia antigo.
  2. `lances_comecar` (e a trava da `nova-partida`): limite somando pênaltis e lances; `config_deteccao.lances_por_dia` = 10.
  3. **Medalhas dos pênaltis:** tabela nova (por exemplo `penaltis_medalhas`: torcedor, item = disputa histórica ou `livre`, partida, gols, venceu), sem chave para `partidas`, como `lances_gols`, para sobreviver ao zerar. O gatilho vale para partida fechada sem suspeita ou liberada. `minhas_medalhas()` e `vitrine_medalhas()` passam a somar os dois.
  4. `posicao_minigame` e `recorde_pessoal`: "Lances" passa a juntar pênaltis e lances depois do corte. O recorde dos pênaltis precisa recomeçar no corte, porque 140 na tabela velha equivale a ~101 na nova.
  5. `meus_lances_hoje()`: conta os dois tipos e devolve as 3 melhores do dia.
  - Nenhuma coluna ou tabela é apagada ou renomeada.
- **Lance do Dia:** sai do catálogo por uma conta fixa sobre a data (igual para todos), sem tabela nova e sem multiplicar pontos.
- **Relatórios:** `npm run balanco` e `npm run metricas`: teto 150 nos Lances, pênaltis e faltas por tipo e juntos, e filtro pela data de corte.
- **Ordem de publicação:** migração → funções (`lances`, `nova-partida`, `fechar-partida`) → site, tudo antes da segunda de corte. As funções só passam a usar a regra nova a partir da data, então podem subir alguns dias antes.

### 8.2 Telas

- `src/telas/lances.ts`, `albumLances.ts` e `fichaLance.ts`: tela única, com filtro de tipo (Todos · Pênaltis · Faltas · Cara a cara), de clube, "Meus troféus", "Perto do próximo" e ⭐. A lista segue a ordem favoritos → seu time → Seleção → outros, com a Disputa livre primeiro e "Seus 3 melhores de hoje" no topo. Saem a barra de vagas, "Pôr na partida" e "Treinar"; cada item tem só "Jogar".
- Disputas de pênaltis no álbum com a trilha (`trilhaDoLance` em `src/jogo/lancesTextos.ts` ganha os marcos 10 · 50 · 100 e a barra de vitórias no lugar da de recriados).
- `src/telas/inicio.ts`: card dos Lances com as suas 3 melhores do dia (só as da pessoa, nunca lista de outros; seção 5) e o Lance do Dia.
- `src/telas/partida.ts` (pênaltis) e a partida dos Lances: depois do limite, a partida abre como treino, com o aviso de que não vale ponto nem medalha.
- Resultado (`resultado.ts` e `resultadoPadrao.ts`): "Contou pras suas 3 melhores de hoje" ou "Suas 3 melhores continuam…"; a Prova também passa a falar em 3 melhores.
- `src/jogo/cardLances.ts`: o telão mostra 3 tentativas do mesmo lance.
- `src/telas/regras.ts`: as tabelas novas (lidas do código, como hoje).
- `src/jogo/dicas.ts`: a dica "Hoje as 6 valendo já foram" vira 10 e passa a valer para os pênaltis.
- `src/telas/conquistas.ts`: medalhas dos pênaltis na aba Conquistas e na vitrine.
- Narrador: conferir frases que citam "6 partidas" ou "a melhor do dia" (`docs/narrador.md`, seção 12).
- **Documentos no mesmo PR da implementação:** `docs/jogo.md` seções 5, 6, 7.1, 7.3 e 11, e `docs/rankings.md`.

### 8.3 Riscos

- **Partida aberta na virada de segunda:** uma partida criada no domingo às 23h58 e fechada às 00h03 conta na semana antiga (tolerância de 00h05) e **com a regra antiga**, porque a regra sai da data de criação. A partida de Lances aberta com 3 lances diferentes fecha como foi criada. Sem a data de criação, a mesma partida podia ser calculada com uma tabela no celular e outra no servidor.
- **App antigo em cache:** quem estiver com a versão velha manda 3 lances diferentes. O servidor recusa com "atualize o app", e a partida não começa (não gasta vaga).
- **Suspeita liberada depois do corte, de um dia antigo:** o `atualizar_teto` tem de usar a regra do dia da partida, senão uma liberação refaz um dia velho com 3 vagas.
- **Recorde e posição dos pênaltis:** misturar a tabela velha e a nova dá recordes impossíveis de bater. Recomeçar no corte.
- **Pênaltis passam a ter limite:** quem joga muito sente. O desafio por link (X1) precisa de regra: conta ou não no limite? (seção 10).
- **Medalhas dos pênaltis retroativas:** as partidas desde 31/10 guardam `disputa_id`, então dá para preencher a tabela com o que já foi jogado. Mas o zerar da pré-temporada apaga as partidas, e com isso o preenchimento tem de ser feito antes dele, ou não ser feito.
- **Amostra pequena nas faltas:** a tabela B foi escolhida com 30 tentativas. Rodar o balanço com pelo menos 20 partidas novas por tipo depois do corte, como na Prova.

## 9. Como reproduzir

```bash
node scripts/balanco/lances-unificados.mjs     # lê o retrato guardado neste diretório, sem rede (Node 23.6+)
npx vitest run scripts/balanco                 # testes das contas
```

- **Arquivos:** `scripts/balanco/lancesUnificados.mjs` (contas puras: reprodução, modelo dos pênaltis, robô com duas miras, 3 tentativas, melhores do dia, medalhas), `scripts/balanco/lances-unificados.mjs` (relatório) e `scripts/balanco/lancesUnificados.test.ts`.
- **Os testes conferem:** a tabela de hoje do script é a do jogo; a reprodução bate com os pontos gravados das 58 partidas; a tabela proposta dos pênaltis cabe em 150, com morte súbita; a distribuição de 3 tentativas soma 1 e tem teto de 150.
- **Para refazer o retrato:** a consulta está em `CONSULTA`, no fim do relatório (só leitura, troca os ids por j1, j2…). Rode no SQL Editor e salve o JSON no lugar de `lances-unificados-dados.json`.
- O robô leva ~4 s para os 51 lances; o relatório inteiro, ~8 s.
- **Nada no jogo importa esses arquivos:** o bundle não muda.

## 10. Decisões para o Kauê

1. **Pênaltis:** a proposta (8 · +4 · +6 · 8 · +15 · +12, mediana 63), a "mais baixa" (mediana 57) ou a "vitória pesa mais" (62)?
2. **Faltas e Cara a cara:** B (24 · 30 · 36 · 42 · +8, recomendada), A (a inicial, mais justa com quem arrisca e mediana de 40) ou C (meio-termo)?
3. **Pênaltis × faltas na mesma conta (seção 4.4):** aceitar que os pênaltis rendam mais até a faixa ser corrigida, baixar os pênaltis, ou as duas coisas?
4. **Correção da faixa pelos dados:** baixar o mínimo de 50 tentativas por lance (seção 7.3) para algo como 30, ou corrigir por faixa inteira, para a mediana das faltas subir mais cedo?
5. **Limite diário:** 10 (recomendado)? O X1 recebido conta no limite?
6. **Medalhas dos pênaltis:** manter 10 · 50 · 100 (equilibra em partidas, custa ~3× em lances) ou reduzir? Preencher com as partidas já jogadas antes do zerar?
7. **Recorde dos pênaltis:** recomeçar na segunda de corte?
8. **Os 8 lances sem recriar:** abrir a conferência da zona histórica antes da tela única?
9. **Qual segunda:** a regra entra numa segunda 0h. A data define a ordem de publicação (seção 8.1).
