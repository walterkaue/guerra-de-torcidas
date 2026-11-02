# Piloto: perguntas do staging (lote 02)

Rodada de 31/10/2026 com `scripts/perguntas/conferir-staging.mjs`. Amostra: todas as 27 perguntas de sao-paulo, 40 das 211 gerais (semente 7) e as 38 de outros clubes ou gerais com link real.

## Conclusão

**Não siga para as outras 529 perguntas por este método.** A amostra já pegou todas as perguntas do staging com link de verdade. Nas outras 529 não há página para abrir: só a inicial do site, Wikipédia sozinha ou a marca `#sem-link`. O status `revisada` do staging não prova nada.

| Etapa | Perguntas |
|---|---:|
| `staging_gt.perguntas`, `revisada`, fora do jogo | 634 |
| Com link real de domínio aceito | 48 |
| Com link real, sem quebrar regra e sem repetir | 39 |
| O link abre (o resto dá 404) | 16 |
| O Gemini confirmou na página | 15 |
| O código aceitou o trecho (literal, resposta, ano, clube) | 7 |
| Passaram na reescrita e às cegas | 7 |
| Sem repetir entre si | 6 |
| Sobraram depois da leitura | **2** |

**Aproveitamento:** 2 de 105 na amostra (2%) e 2 de 634 no staging (0,3%). Sem a leitura, seriam 6.

**De onde vêm as 634:**

| Fonte | Perguntas |
|---|---:|
| Só a página inicial do site | 336 |
| Marcada `#sem-link` no próprio staging | 157 |
| Só Wikipédia | 83 |
| Link real | 48 |
| Página de seção do site | 5 |
| Domínio fora da lista | 5 |

Das 36 páginas dos 39 links reais, 21 dão 404, como nos lances. As 211 gerais são o caso pior: uma só tem link real, e a página não prova a resposta (0 aproveitadas). Texto também pesa: quase todas passam de 140 caracteres ou não têm ano.

**Equilíbrio:** as 2 do lote (Grêmio média, Palmeiras difícil) ficam abaixo do teto da meta. O staging em si é desigual (Corinthians e Vasco com 33, Athletico com 13, 211 gerais): importar em bloco desequilibraria a seção 7.1 mesmo se os fatos fossem bons.

**Linhas vermelhas:** o validador barrou marca, mascote e tema proibido. Guerra civil não está na lista de temas e passou por tudo até a leitura. Barrar a palavra "guerra" pegaria a Segunda Guerra na história do Palestra Itália, então a regra é decisão do Kauê.

**Falso alarme do validador:** Q619 caiu por "marca: banco", mas ali é banco de reservas. Não mudou o resultado (a fonte dela também não prova).

### Consumo

| | Antes | Depois | Gasto |
|---|---:|---:|---:|
| Claude, janela de 5 horas | 35% | 84% | 49 pontos |
| Claude, semana | 83% | 90% | 7 pontos |

| Gemini (`relatorios/ia-uso.csv`) | Chamadas | Entrada | Saída |
|---|---:|---:|---:|
| 1ª rodada, perdida por um erro meu no relatório | 29 | 56.662 | 5.672 |
| 2ª rodada, a que vale | 27 | 53.723 | 5.388 |
| **Total** | **56** | **110.385** | **11.060** |

Modelos: 43 chamadas no flash-lite, 12 no flash, 1 no 3.6-flash. Nenhuma falhou por cota. Custo zero, no nível gratuito.

**Economizou?** No repetitivo, sim: 36 páginas foram lidas pelo Gemini e nenhuma entrou no contexto do Claude, e repetir a conferência agora custa só um comando. No total do piloto, não dá para afirmar. Quase todo o gasto do Claude foi ler os docs, escrever o script e analisar. A maior economia veio do código: 89 das 105 perguntas caíram sem gastar nenhum token. Para medir a rotina de verdade, compare o gasto numa segunda rodada do mesmo script.

**Manteve a qualidade?** Só com a leitura. Em 7 de 7 reescritas o código aceitou, e o trecho literal segurou 8 citações ruins. Mesmo assim, 4 das 6 aprovadas pelo código e às cegas não deviam entrar: nenhum dos dois controles enxerga fato repetido com outras palavras nem tema sensível.

### Recomendação

1. Não importe o staging e não continue esta conferência. Trate `staging_gt.perguntas` como rascunho sem fonte.
2. Para chegar às 800, siga pelo pipeline que nasce de página real (`gerar-conteudo`, seção 7.1), como já foi a conclusão dos lances.
3. Se quiser aproveitar os enunciados, teste antes procurar a fonte nas páginas já conferidas da Casa e em `staging_gt.fontes_semente`. Isso é outro método e não foi medido aqui.
4. As 2 do lote continuam `rascunho`. Importar e virar para `revisada` é decisão do Kauê.

## O que o script aprovou, antes da leitura

| Grupo | Na amostra | Aprovadas | Aproveitamento |
|---|---:|---:|---:|
| sao-paulo | 27 | 1 | 4% |
| geral | 41 | 0 | 0% |
| outros clubes com link real | 37 | 5 | 14% |
| **Total** | **105** | **6** | **6%** |

Foram à página 16 perguntas, em 36 páginas. O modelo citou um trecho que o código recusou em 8; às cegas, recusou mais 0. Textos reescritos que o código aceitou: 7; recusados: 0.

## Gemini nesta rodada

27 chamadas · 53723 tokens de entrada · 5388 de saída · gemini-3.5-flash-lite: 21, gemini-3.5-flash: 5, gemini-3.6-flash: 1.

## Por que reprovaram

| Motivo | Perguntas |
|---|---:|
| link só para a página inicial do site | 25 |
| a fonte não abriu | 23 |
| marcada sem link no próprio staging | 18 |
| repete pergunta que já existe | 8 |
| só Wikipédia | 4 |
| a resposta certa não aparece no trecho | 3 |
| o trecho não traz o ano 1992 | 1 |
| pergunta com 220 caracteres | 1 |
| pergunta com 150 caracteres | 1 |
| pergunta com 160 caracteres | 1 |
| marca de terceiros | 1 |
| pergunta com 177 caracteres | 1 |
| pergunta com 190 caracteres | 1 |
| pergunta com 221 caracteres | 1 |
| pergunta com 214 caracteres | 1 |
| pergunta com 195 caracteres | 1 |
| pergunta com 205 caracteres | 1 |
| a página não prova a resposta | 1 |
| o trecho não traz o ano 2005 | 1 |
| assunto fora do quiz | 1 |
| o trecho não traz o ano 1951 | 1 |
| o trecho não traz o ano 1969 | 1 |
| pergunta com 233 caracteres | 1 |
| o trecho não cita o clube | 1 |

## Aprovadas (2), em `lote-02.csv`, como rascunho

| Id | Staging | Pergunta | Certa | Trecho | Fonte |
|---|---|---|---|---|---|
| gremio-m-04 | Q_GEN_1792908050939_6 | Em 2005, como ficou conhecido o jogo de 26 de novembro entre Grêmio e Náutico? | Batalha dos Aflitos | Há 20 anos, Náutico e Grêmio protagonizavam a Batalha dos Aflitos, no Estádio dos Aflitos. Em clima de final, no dia 26 de novembro de 2005, as duas equipes brigavam por uma vaga na Série A do Brasileiro | gazetaesportiva.com |
| palmeiras-d-03 | Q_GEN_1792836036544_3 | Em 1951, qual foi o adversário europeu enfrentado pelo Palmeiras na decisão da Copa Rio no Maracanã? | Juventus | Em 22 de julho de 1951, o Palmeiras realizou um dos maiores feitos de sua gloriosa trajetória. Foi neste dia, diante da forte e estrelada Juventus de Turim, que o Verdão conquistou o Torneio Internacional de Clubes Campeões | palmeiras.com.br |

## Barradas na leitura (4)

O script aprovou estas quatro, inclusive às cegas. Saíram do lote na leitura:

- **São Paulo e Cruzeiro:** repetem o fato de `sao-paulo-m-03` e `cruzeiro-m-02`, que já estão no jogo, com outras palavras. O script agora pega esse caso.
- **Santos (duas):** o tema é guerra civil (seção 8: "sem palavrão, bebida, aposta ou violência em nenhum texto do jogo"), e o cessar-fogo para ver o Santos é uma história contada sem comprovação firme, então a matéria citada não basta. Voltar com elas é decisão do Kauê.

| Id que teria | Staging | Pergunta | Certa |
|---|---|---|---|
| sao-paulo-m-06 | Q_GEN_1792864831760_2 | Em 1992, quem marcou os dois gols do São Paulo na vitória por 2 a 1 sobre o Barcelona? | Raí |
| cruzeiro-m-04 | Q_GEN_1792936848620_6 | Em 2003, quem treinou o Cruzeiro nas conquistas da Copa do Brasil, do Campeonato Mineiro e da Série A? | Vanderlei Luxemburgo |
| santos-d-03 | Q_GEN_1792846831064_2 | Em 1969, em qual país o Santos jogou em Benin City, onde houve um cessar-fogo na guerra civil para ver Pelé? | Nigéria |
| santos-m-04 | Q_GEN_1792954845752_4 | Em 1969, qual conflito armado na Nigéria cessou para o povo ver o Santos jogar? | Guerra de Biafra |

## Reprovadas (99)

| Staging | Clube | Degrau | Pergunta | Motivo |
|---|---|---|---|---|
| Q_GEN_1792915235752_4 | sao-paulo | media | Em 1992, o Sao Paulo conquistou sua primeira Copa Libertadores da America sob o comando de Tele Santana. Qual foi o adversario derrotado na final apos disputa de penaltis no Morumbi? | o trecho não traz o ano 1992 |
| Q265 | sao-paulo | media | Sob o comando do técnico Telê Santana, o São Paulo conquistou o seu primeiro Mundial Interclubes in 1992 vencendo qual equipe europeia? | só Wikipédia (seção 7.1 pede outra fonte junto) |
| Q289 | sao-paulo | facil | Qual é o nome popular do Estádio Cícero Pompeu de Toledo, a histórica e imponente casa do São Paulo Futebol Club? | marcada sem link no próprio staging |
| Q313 | sao-paulo | media | Qual ídolo tricolor marcou o histórico gol de número 10.000 da história do São Paulo Futebol Clube no ano de 2007? | link só para a página inicial do site |
| Q337 | sao-paulo | dificil | Na final do Mundial de Clubes da FIFA de 2005, em que o São Paulo venceu o Liverpool por 1 a 0, quem deu o passe por elevação para o gol de Mineiro? | link só para a página inicial do site |
| Q361 | sao-paulo | facil | Como é popularmente conhecido o personagem folclórico de imagem velada e bondosa adotada de forma lúdica pela torcida para representar o São Paulo Futebol Clube? | link só para a página inicial do site |
| Q396 | sao-paulo | dificil | O São Paulo Futebol Clube foi fundado em janeiro de 1930 a partir da união de membros de dois clubes tradicionais paulistas. Um deles foi a Associação Atlética das Palmeiras. Qual foi o outro? | link só para a página inicial do site |
| Q417 | sao-paulo | media | Em qual país o São Paulo Futebol Clube ergueu suas três taças do Mundial Interclubes/Mundial de Clubes da FIFA (1992, 1993 e 2005)? | link só para a página inicial do site |
| Q441 | sao-paulo | facil | O São Paulo Futebol Clube ostenta uma marca expressiva no futebol mundial ao possuir quantas taças do Mundial Interclubes/Mundial de Clubes da FIFA em sua galeria oficial? | link só para a página inicial do site |
| Q465 | sao-paulo | media | Na conquista do segundo título mundial interclubes do São Paulo em 1993, qual foi o placar da vitória tricolor sobre o Milan da Itália em Tóquio? | link só para a página inicial do site |
| Q489 | sao-paulo | media | Qual arquiteto de renome internacional assinou o projeto arquitetônico original do Estádio do Morumbi na década de 1950? | link só para a página inicial do site |
| Q569 | sao-paulo | facil | O São Paulo Futebol Clube conquistou o tricampeonato consecutivo do Brasileirão (2006, 2007 e 2008). Quem era o icônico comandante tático daquela equipe? | marcada sem link no próprio staging |
| Q570 | sao-paulo | media | Na final do Mundial de Clubes da FIFA em 2005 contra o Liverpool, quem marcou o gol histórico da vitória tricolor por 1 a 0 após receber passe de Aloísio? | marcada sem link no próprio staging |
| Q571 | sao-paulo | dificil | Na decisão do Mundial Interclubes de 1992, quando o São Paulo venceu o Barcelona por 2 a 1, quem marcou os dois gols da histórica virada da equipe brasileira? | marcada sem link no próprio staging |
| Q695 | sao-paulo | facil | Em qual ano o São Paulo Futebol Clube conquistou a sua inédita taça da Copa do Brasil, superando o Flamengo na grande decisão disputada no Morumbi? | link só para a página inicial do site |
| Q696 | sao-paulo | media | Qual genial e histórico técnico comandou taticamente o São Paulo no bicampeonato mundial interclubes contra Barcelona e Milan em 1992 e 1993? | link só para a página inicial do site |
| Q765 | sao-paulo | dificil | Na marcante conquista do Campeonato Brasileiro da Série A de 2006, qual lendário goleiro e capitão tricolor levantou a taça de campeão do país? | link só para a página inicial do site |
| Q766 | sao-paulo | craque | O São Paulo FC reiniciou suas atividades em dezembro de 1935. Em qual icônico estádio de São Paulo a equipe realizou sua partida de reestreia histórica? | link só para a página inicial do site |
| Q_GEN_1792821631920_4 | sao-paulo | craque | Na final do Mundial Interclubes de 1992, o São Paulo venceu o Barcelona de virada por 2 a 1. Quem marcou o gol que abriu o placar para a equipe espanhola aos 12 minutos do primeiro tempo? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792853517804_2 | sao-paulo | dificil | Na partida de inauguração parcial do Estádio do Morumbi, em 2 de outubro de 1960, o São Paulo venceu por 1 a 0 com gol de Peixinho. Qual foi o clube adversário do Tricolor nesse dia histórico? | a resposta certa não aparece no trecho |
| Q_GEN_1792854032953_3 | sao-paulo | media | Na final do Mundial Interclubes de 1992, o São Paulo venceu o Barcelona de virada por 2 a 1. Quem marcou os dois gols da equipe brasileira na partida? | repete pergunta que já existe (Q_GEN_1792864831760_2) |
| Q_GEN_1792857623475_3 | sao-paulo | facil | No dia 27 de março de 2011, o goleiro Rogério Ceni marcou o centésimo gol de sua carreira profissional em uma cobrança de falta histórica na Arena Barueri. Contra qual clube rival o gol foi marcado? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792861247186_7 | sao-paulo | media | Em 1992, quem marcou os dois gols do São Paulo na vitória por 2 a 1 sobre o Barcelona? | repete pergunta que já existe (sao-paulo-m-06) |
| Q_GEN_1792908050939_9 | sao-paulo | media | Em 1943, o São Paulo quebrou a hegemonia de Corinthians e Palmeiras ao conquistar o Campeonato Paulista. Qual frase folclórica, dita por rivais que menosprezavam o Tricolor, deu origem à comemoração histórica da torcida? | pergunta com 220 caracteres (10 a 140); alternativa "O São Paulo só será campeão se a moeda cair em pé" com 49 caracteres (máx. 40); alternativa "O Tricolor só vence quando chover no deserto" com 44 caracteres (máx. 40); alternativa "Só o vento pode parar o Palmeiras e o Corinthians" com 49 caracteres (máx. 40) |
| Q_GEN_1792911641763_4 | sao-paulo | facil | O Estádio do Morumbi foi inaugurado parcialmente em 2 de outubro de 1960. Contra qual clube estrangeiro o São Paulo disputou a partida inaugural? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792936848620_2 | sao-paulo | media | O São Paulo Futebol Clube foi fundado em 25 de janeiro de 1930. A origem do clube está diretamente ligada à fusão de quais duas agremiações paulistas? | pergunta com 150 caracteres (10 a 140); alternativa "Associação Atlética das Palmeiras e Club Athletico Paulistano" com 61 caracteres (máx. 40); alternativa "Associação Atlética Mackenzie College e Paulistano" com 50 caracteres (máx. 40); alternativa "Clube de Regatas Tietê e Associação Atlética das Palmeiras" com 58 caracteres (máx. 40) |
| Q614 | geral | media | Em qual edição da Copa do Mundo da FIFA a Seleção Brasileira masculina ergueu a taça de campeã mundial nos Estados Unidos nos pênaltis? | marcada sem link no próprio staging |
| Q798 | geral | craque | Apenas uma seleção nacional fora do eixo Europa-América do Sul conseguiu alcançar a fase de semifinais em uma Copa do Mundo da FIFA no século XXI. Qual foi essa equipe africana em 2022? | link só para a página inicial do site |
| Q600 | geral | dificil | Qual foi o placar da histórica finalíssima da Copa do Mundo da FIFA de 2002, em que o Brasil venceu a Alemanha e faturou o pentacampeonato com gols de Ronaldo? | só Wikipédia (seção 7.1 pede outra fonte junto) |
| Q332 | geral | craque | Qual jogador detém o recorde absoluto de mais gols marcados em uma única edição do Campeonato Brasileiro da Série A (34 gols em 2004)? | link só para a página inicial do site |
| Q281 | geral | facil | De acordo com as regras oficiais do futebol da FIFA, qual é o tempo máximo de duração regulamentar de uma prorrogação em jogos de mata-mata? | só Wikipédia (seção 7.1 pede outra fonte junto) |
| Q773 | geral | facil | Qual profissional técnico em campo é o único autorizado pelas regras da FIFA a utilizar as mãos para segurar a bola de forma contínua dentro de sua grande área? | link só para a página inicial do site |
| Q649 | geral | craque | Se uma cobrança de tiro de canto (escanteio) for executada e a bola entrar diretamente no gol do próprio batedor sem tocar em ninguém, o árbitro deve assinalar: | pergunta com 160 caracteres (10 a 140); pergunta não termina com "?"; pergunta sem ano (fato fechado precisa de data); alternativa "Repetição obrigatória da cobrança do escanteio" com 46 caracteres (máx. 40); alternativa "Tiro livre indireto para a defesa na pequena área" com 49 caracteres (máx. 40) |
| Q526 | geral | dificil | Qual tradicional equipe do futebol europeu sagrou-se a primeiríssima campeã da história da UEFA Champions League (antiga Copa dos Campeões) na temporada 1955/56? | marcada sem link no próprio staging |
| Q612 | geral | facil | Qual país sediou os Jogos Olímpicos de 2016, edição em que a Seleção Brasileira masculina conquistou sua inédita medalha de ouro no futebol? | marcada sem link no próprio staging |
| Q596 | geral | craque | Na história da Copa Libertadores da América, qual clube sul-americano detém a marca histórica absoluta de maior número de vice-campeonatos (6 ao todo)? | marcada sem link no próprio staging |
| Q619 | geral | media | Durante a comemoração de um gol, qual das seguintes atitudes resulta na aplicação obrigatória de um cartão amarelo imediato pelo juiz? | marca de terceiros ("banco") |
| Q714 | geral | media | Qual tradicional equipe do futebol argentino é apelidada mundialmente como 'Los Millonarios' no cenário do futebol? | link só para a página inicial do site |
| Q528 | geral | dificil | Em qual edição histórica da Copa do Mundo da FIFA a Seleção Brasileira masculina utilizou pela primeira vez os números de identificação nas costas das camisas dos jogadores? | marcada sem link no próprio staging |
| Q593 | geral | craque | Apenas uma equipe fora do eixo Europa-América do Sul conseguiu alcançar a grande final do Mundial de Clubes da FIFA eliminando o campeão da Libertadores na semifinal no ano de 2010. Qual foi esse clube? | marcada sem link no próprio staging |
| Q713 | geral | media | Qual a distância regulamentar padrão em metros que a marca da penalidade máxima (pênalti) fica posicionada em relação à linha de gol? | link só para a página inicial do site |
| Q800 | geral | craque | Na história da Copa Libertadores da América, qual clube sul-americano ostenta a marca histórica absoluta de maior vencedor do torneio com 7 títulos conquistados? | repete pergunta que já existe (Q634) |
| Q617 | geral | media | Se um jogo mata-mata for para a prorrogação, a regra da FIFA autoriza que as equipes façam quantas substituições adicionais de jogadores? | marcada sem link no próprio staging |
| Q705 | geral | facil | Quantas traves verticais compõem oficialmente a estrutura de sustentação de um único gol (baliza) em um campo de futebol regulamentar? | link só para a página inicial do site |
| Q305 | geral | media | Qual estádio brasileiro detém o recorde histórico absoluto de público em uma partida de futebol, com mais de 199 mil pessoas na final da Copa de 1950? | link só para a página inicial do site |
| Q794 | geral | dificil | Qual país europeu sediou a histórica edição da Copa do Mundo da FIFA de 1954, marcada pelo título conquistado pela Alemanha Ocidental? | repete pergunta que já existe (Q628) |
| Q656 | geral | media | Em qual edição da Copa do Mundo da FIFA a Seleção Brasileira masculina conquistou o seu histórico pentacampeonato, com 100% de vitórias na campanha? | marcada sem link no próprio staging |
| Q523 | geral | media | De acordo com as diretrizes oficiais de arbitragem da FIFA, qual é a altura oficial regulamentar medida do solo até a borda inferior do travessão de um gol de futebol? | marcada sem link no próprio staging |
| Q777 | geral | facil | Se a bola cruzar totalmente a linha lateral após o toque de um jogador de ataque, a partida deve ser reiniciada obrigatoriamente por meio de: | link só para a página inicial do site |
| Q776 | geral | facil | Qual seleção europeia fez história ao conquistar a Copa do Mundo da FIFA de 2010 disputada no continente africano? | link só para a página inicial do site |
| Q799 | geral | craque | Durante a execução de um tiro livre direto, o batedor chuta a bola contra o árbitro dentro da grande área, a bola rebate nele e entra direto no gol. Qual o procedimento correto? | pergunta com 177 caracteres (10 a 140); pergunta sem ano (fato fechado precisa de data); alternativa "O gol é anulado e marca-se bola ao chão para o goleiro (o árbitro não é mais corpo neutro se alterar posse ou chance)" com 117 caracteres (máx. 40); alternativa "A cobrança do tiro livre direto deve ser repetida" com 49 caracteres (máx. 40); alternativa "É marcado tiro de meta para a equipe defensora" com 46 caracteres (máx. 40) |
| Q597 | geral | craque | Se um torcedor invadir o campo e chutar a bola para fora cortando um ataque promissor, como o árbitro deve prosseguir o reinício da partida de acordo com as regras da FIFA?"""", Parar o jogo | pergunta com 190 caracteres (10 a 140); pergunta não termina com "?"; pergunta sem ano (fato fechado precisa de data); alternativa "Parar o jogo e reiniciar com bola ao chão após a remoção do invasor" com 67 caracteres (máx. 40) |
| Q308 | geral | craque | Em qual país está localizado o Estádio Primeiro de Maio Rungrado, considerado o maior estádio de futebol do mundo em capacidade de assentos? | link só para a página inicial do site |
| Q525 | geral | dificil | Se a bola estourar ou murchar completamente no momento exato em que está viajando diretamente em direção ao gol após uma cobrança de pênalti, antes de tocar em qualquer jogador ou trave, o que a regra da FIFA manda fazer? | pergunta com 221 caracteres (10 a 140); pergunta sem ano (fato fechado precisa de data); alternativa "A cobrança é anulada e repetida com uma nova bola" com 49 caracteres (máx. 40); alternativa "O gol é validado se a bola cruzar a linha mesmo murcha" com 54 caracteres (máx. 40); alternativa "É marcado tiro livre indireto para a defesa" com 43 caracteres (máx. 40); alternativa "É sorteado bola ao chão dentro da pequena área" com 46 caracteres (máx. 40) |
| Q780 | geral | media | Qual tradicional equipe do futebol argentino é conhecida mundialmente no esporte pelo apelido popular de 'El Fortín'? | link só para a página inicial do site |
| Q609 | geral | facil | Quando a bola cruza totalmente a linha lateral do campo após o último toque de um defensor, a partida deve ser reiniciada oficialmente com: | marcada sem link no próprio staging |
| Q599 | geral | media | Em qual ano a Seleção Brasileira masculina de futebol faturou o seu histórico tetracampeonato mundial nos Estados Unidos, batendo a Itália na final? | marcada sem link no próprio staging |
| Q536 | geral | craque | Se um jogador reserva não relacionado entrar em campo correndo e desviar a bola com o pé em cima da linha, impedindo um gol claro do adversário, qual decisão dupla o árbitro toma segundo as regras modernas da FIFA? | pergunta com 214 caracteres (10 a 140); pergunta sem ano (fato fechado precisa de data); alternativa "Aplica cartão vermelho direto ao reserva e assinala penalidade máxima (pênalti)" com 79 caracteres (máx. 40); alternativa "Aplica cartão amarelo ao reserva e marca tiro livre indireto" com 60 caracteres (máx. 40); alternativa "Marca gol técnico automático para o ataque" com 42 caracteres (máx. 40); alternativa "Expulsa o técnico da equipe do reserva e dá bola ao chão" com 56 caracteres (máx. 40) |
| Q605 | geral | facil | De acordo com o livro de regras oficial da FIFA, qual é o tempo exato de duração de cada um dos dois tempos regulamentares de uma partida normal? | marcada sem link no próprio staging |
| Q792 | geral | dificil | Qual seleção nacional masculina chocou o continente europeu ao sagrar-se campeã da Eurocopa no ano de 2004, superando a seleção de Portugal na grande final? | repete pergunta que já existe (Q726) |
| Q653 | geral | facil | Qual o número oficial fixo de jogadores titulares que cada equipe deve colocar em campo no início de uma partida regulamentar? | marcada sem link no próprio staging |
| Q356 | geral | craque | Na história da Copa Libertadores da América, qual treinador detém o recorde absoluto de mais títulos conquistados na competição, somando 4 taças? | link só para a página inicial do site |
| Q544 | geral | craque | Durante a cobrança de um tiro livre direto, o cobrador chuta a bola contra o árbitro que está dentro da grande área, a bola rebate nele e entra direto no gol. Qual o procedimento correto do juiz? | pergunta com 195 caracteres (10 a 140); pergunta sem ano (fato fechado precisa de data); alternativa "O gol é anulado e marca-se bola ao chão para o goleiro (o árbitro não é mais corpo neutro se alterar posse/chance)" com 114 caracteres (máx. 40); alternativa "A cobrança do tiro livre é repetida por interferência" com 53 caracteres (máx. 40) |
| Q481 | geral | facil | Entre que valores deve estar a circunferência oficial da bola de futebol de campo de tamanho adulto utilizada nas competições oficiais da FIFA? | link só para a página inicial do site |
| Q644 | geral | media | Qual clube espanhol ostenta a alcunha tradicional de 'Meringues' no cenário internacional do futebol? | só Wikipédia (seção 7.1 pede outra fonte junto) |
| Q640 | geral | facil | Qual país sul-americano foi o palco e anfitrião da primeiríssima edição da Copa do Mundo da FIFA em 1930? | marcada sem link no próprio staging |
| Q_GEN_1792864831760_9 | atletico-mg | media | Na épica campanha do título da Copa Libertadores de 2013 do Atlético Mineiro, quem foi o artilheiro do Galo na competição com 7 gols marcados? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792954845752_9 | atletico-mg | media | O atacante Reinaldo, maior artilheiro da história do Atlético Mineiro, ficou mundialmente famoso por comemorar seus gols com um gesto de resistência política contra a ditadura militar. Qual era esse gesto? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792821631920_1 | corinthians | facil | Em 5 de dezembro de 1976, milhares de torcedores do Corinthians viajaram ao Rio de Janeiro para apoiar o time na semifinal do Brasileirão contra o Fluminense, no Maracanã. Esse evento histórico ficou conhecido como: | a fonte não abriu (HTTP 404) |
| Q_GEN_1792832440379_2 | corinthians | facil | Em 5 de dezembro de 1976, ocorreu a famosa "Invasão Corinthiana", quando dezenas de milhares de torcedores do Corinthians viajaram ao Rio de Janeiro e dividiram o Maracanã. Contra qual clube carioca o Corinthians disputava aquela semifinal do Campeonato Brasileiro? | repete pergunta que já existe (Q_GEN_1792796459805_1) |
| Q_GEN_1792846831064_1 | corinthians | facil | No ano de 2000, o Corinthians conquistou o primeiro Campeonato Mundial de Clubes organizado pela FIFA. Qual clube brasileiro o Timão enfrentou na grande final disputada no Maracanã? | a resposta certa não aparece no trecho |
| Q_GEN_1792856894298_1 | corinthians | media | Em 5 de dezembro de 1976, milhares de torcedores do Corinthians viajaram ao Rio de Janeiro no episódio conhecido como a 'Invasão Corintiana'. Contra qual clube carioca o Timão disputou essa histórica semifinal do Campeonato Brasileiro? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792954845752_3 | corinthians | media | A famosa 'Invasão do Maracanã' ocorreu em dezembro de 1976, quando mais de 70 mil torcedores do Corinthians viajaram ao Rio de Janeiro. Contra qual equipe carioca o Timão disputou aquela semifinal do Campeonato Brasileiro? | repete pergunta que já existe (Q_GEN_1792796459805_1) |
| Q_GEN_1792796459805_2 | cruzeiro | media | Em 2003, o Cruzeiro conquistou a inédita Tríplice Coroa do futebol brasileiro sob o comando de Vanderlei Luxemburgo. Quais foram os três títulos oficiais conquistados pela Raposa nessa temporada histórica? | pergunta com 205 caracteres (10 a 140); alternativa "Campeonato Mineiro, Copa do Brasil e Campeonato Brasileiro" com 58 caracteres (máx. 40); alternativa "Campeonato Mineiro, Copa do Brasil e Copa Sul-Americana" com 55 caracteres (máx. 40); alternativa "Campeonato Mineiro, Campeonato Brasileiro e Copa Libertadores" com 61 caracteres (máx. 40); alternativa "Copa do Brasil, Campeonato Brasileiro e Copa Libertadores" com 57 caracteres (máx. 40) |
| Q_GEN_1792843234100_2 | cruzeiro | dificil | Em outubro de 1942, devido às pressões da Segunda Guerra Mundial, o Palestra Itália de Minas Gerais mudou definitivamente de nome para Cruzeiro Esporte Clube. Qual constelação inspirou a escolha do novo nome? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792846831064_0 | cruzeiro | media | Em 1942, devido à Segunda Guerra Mundial e ao decreto de Getúlio Vargas que proibia nomes associados aos países do Eixo, o Palestra Itália de Minas Gerais mudou seu nome para Cruzeiro Esporte Clube. Qual constelação inspirou o novo nome do clube? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792861247186_2 | cruzeiro | dificil | Na final da Taça Brasil de 1966, o Cruzeiro de Tostão e Dirceu Lopes conquistou o título nacional ao derrotar o lendário Santos de Pelé. Qual foi o placar elástico do primeiro jogo da final, realizado no Mineirão? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792915235752_8 | cruzeiro | dificil | Em 1966, o Cruzeiro conquistou a Taca Brasil ao derrotar na grande final o poderoso Santos de Pele. Qual foi o placar do primeiro jogo da decisao, disputado no Mineirao? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792954845752_7 | cruzeiro | dificil | Em 1966, o Cruzeiro conquistou sua primeira Taça Brasil ao derrotar o lendário Santos de Pelé. Qual foi o placar surpreendente do primeiro jogo da decisão, disputado no Mineirão, que encaminhou o título da Raposa? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792853517804_3 | flamengo | facil | Na histórica final do Mundial Interclubes de 1981, em Tóquio, o Flamengo goleou qual gigante europeu por 3 a 0, com gols de Nunes (dois) e Adílio? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792864831760_0 | flamengo | facil | Na final do Mundial de Clubes de 1981, o Flamengo derrotou o Liverpool por 3 a 0. Quem foi o herói que marcou dois gols nessa partida histórica? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792915235752_0 | flamengo | media | Quem marcou os dois gols do Flamengo na vitoria de 2 a 0 sobre o Cobreloa, no jogo desempate da final da Copa Libertadores de 1981, em Montevideu? | a fonte não abriu (HTTP 404) |
| Q580 | geral | facil | De acordo com o livro de regras da FIFA, quando um goleiro salta e defende uma bola segurando-a firmemente com as mãos, qual o tempo regulamentar máximo permitido para ele repor a bola em jogo? | a página não prova a resposta |
| Q_GEN_1792864831760_5 | gremio | dificil | Na final do Mundial Interclubes de 1983, o Grêmio venceu o Hamburgo por 2 a 1 na prorrogação. Quem foi o técnico que comandou o Tricolor Gaúcho nessa conquista? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792915235752_6 | gremio | media | Na final da Copa Intercontinental de 1983, o Gremio sagrou-se campeao mundial ao vencer o Hamburgo por 2 a 1 na prorrogacao. Quem marcou os dois gols do Tricolor Gaucho nessa partida historica? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792832440379_4 | gremio | craque | Na histórica "Batalha dos Aflitos" em 2005, o Grêmio conquistou o acesso e o título da Série B com apenas sete jogadores em campo. Qual jogador marcou o gol da vitória por 1 a 0 sobre o Náutico após a defesa do pênalti por Galatto? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792846831064_3 | gremio | media | A lendária 'Batalha dos Aflitos', em 26 de novembro de 2005, garantiu o retorno do Grêmio à Série A do Campeonato Brasileiro. Qual jogador marcou o gol da vitória gremista por 1 a 0, mesmo com o time tendo apenas 7 jogadores em campo? | o trecho não traz o ano 2005 |
| Q_GEN_1792850432375_2 | gremio | facil | Durante a lendária partida conhecida como 'Batalha dos Aflitos' em 2005, contra o Náutico, quantos jogadores do Grêmio foram expulsos antes de o time gaúcho defender o pênalti e marcar o gol da vitória? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792954845752_2 | gremio | facil | Em 2005, o Grêmio protagonizou um dos jogos mais dramáticos da história do futebol brasileiro, conhecido como a 'Batalha dos Aflitos'. Contra qual clube o Tricolor Gaúcho conquistou o acesso à Série A com apenas 7 jogadores em campo? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792908050939_5 | internacional | media | Na década de 1940, o Internacional dominou o futebol gaúcho e ficou conhecido por qual apelido histórico, que representava sua superioridade e intensidade ofensiva? | a fonte não abriu (HTTP 404) |
| Q344 | internacional | media | Na final da Copa Libertadores de 2006 contra o São Paulo, quem foi o capitão responsável por erguer a primeira taça continental do Internacional? | a fonte não abriu (HTTP 404) |
| Q404 | internacional | facil | O Sport Club Internacional possui como mascote o 'Saci'. Esse personagem da cultura popular foi adotado oficialmente pelo clube em qual década? | assunto fora do quiz ("mascote") |
| Q_GEN_1792854032953_2 | palmeiras | dificil | Na histórica conquista da Copa Rio de 1951 pelo Palmeiras, considerada pelo clube como seu primeiro título mundial, qual equipe europeia foi a adversária na grande final de dois jogos? | o trecho não traz o ano 1951 |
| Q_GEN_1792915235752_2 | palmeiras | media | Na conquista da Copa Rio de 1951, considerada pelo clube como seu primeiro titulo mundial, qual equipe europeia o Palmeiras enfrentou e superou na grande final de dois jogos? | repete pergunta que já existe (Q_GEN_1792854032953_2) |
| Q_GEN_1792954845752_0 | palmeiras | media | Em 1942, devido à Segunda Guerra Mundial, o Palestra Italia foi obrigado a mudar de nome. Qual foi o rival que o Palmeiras enfrentou e venceu por 3 a 1 na famosa partida conhecida como 'Arrancada Heroica', que lhe garantiu o título paulista daquele ano? | a resposta certa não aparece no trecho |
| Q_GEN_1792861247186_6 | santos | media | Durante uma excursão do Santos à África em fevereiro de 1969, a presença de Pelé e do esquadrão santista motivou um cessar-fogo temporário em uma sangrenta guerra civil que ocorria em qual país? | o trecho não traz o ano 1969 |
| Q_GEN_1792846831064_4 | vasco | craque | Em 7 de abril de 1924, o Vasco da Gama emitiu a célebre 'Resposta Histórica', um marco na luta contra o racismo no futebol brasileiro. Quem era o presidente do clube que assinou esse histórico ofício recusando-se a excluir os 12 atletas negros e operários de seu elenco? | a fonte não abriu (HTTP 404) |
| Q_GEN_1792856894298_0 | vasco | media | Em 7 de abril de 1924, o presidente do Vasco da Gama, José Augusto Prestes, enviou um ofício à Associação Metropolitana de Esportes Athleticos (AMEA) que ficou conhecido como a 'Resposta Histórica'. Qual foi o motivo desse manifesto? | pergunta com 233 caracteres (10 a 140); alternativa "A recusa em excluir 12 jogadores negros, operários e analfabetos do elenco vascaíno para se filiar à liga." com 106 caracteres (máx. 40); alternativa "O protesto contra a anulação do título do Campeonato Carioca de 1923 conquistado pelos 'Camisas Negras'." com 104 caracteres (máx. 40); alternativa "A exigência de que o clube construísse um estádio próprio (São Januário) para poder disputar a primeira divisão." com 112 caracteres (máx. 40); alternativa "A decisão de profissionalizar todos os atletas do clube, rompendo com o amadorismo vigente na época." com 100 caracteres (máx. 40) |
| Q_GEN_1792864831760_3 | vasco | media | Na final da Copa Libertadores de 1998, no ano de seu centenário, o Vasco da Gama conquistou o título ao derrotar qual clube equatoriano nos dois jogos da decisão? | o trecho não cita o clube |
