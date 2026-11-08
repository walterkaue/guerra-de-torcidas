## 7.3 Minigame 4 — "Lances do Jogo"

> Nome provisório (M17 no backlog). Desenho aprovado em 21/10/2026. Recria lances marcantes dos clubes com o motor e o gesto dos pênaltis, para jogar e repetir muitas vezes. Na pré-temporada, **soma no ranking** como os outros (seção 5).

### Como joga
- **Tipos no MVP:** **falta** (bola fora da área, com barreira) e **cara a cara** (finalização na área ou perto dela, com o goleiro podendo sair do gol). **Defesa fica fora do MVP:** repete a defesa dos pênaltis e, com lance fixo, a resposta seria decorada. As ideias de defesas históricas ficam guardadas.
- **Gesto igual ao do pênalti:** direção, força e efeito, com cavadinha. O que muda é de onde a bola sai, a barreira e o goleiro.
- **Álbum de lances:** a pessoa escolhe os lances, com filtros por clube (abre no time do coração) e por tipo. Pode jogar lance de qualquer clube e da Seleção; os pontos vão sempre para o time dela.
- **Partida (desde 08/11/2026, seção 14.7):** **3 tentativas do mesmo lance**, escolhido com um toque. Cerca de 30 s. Até 07/11, eram 3 lances escolhidos pela pessoa (podia repetir).
- **Valendo (desde 08/11/2026):** até **10 partidas de Lances por dia, somando pênaltis, faltas e cara a cara** (o X1 recebido conta). O dia vale as **3 melhores** de Lances. Até 07/11: 6 partidas de faltas e cara a cara por dia, valendo a melhor.
- **Treino:** ilimitado, roda só no celular, sem pontos e sem medalhas.
- Torcida da seleção (31/10/2026): nos lances da seleção brasileira, a arquibancada da partida fica verde e amarela, sem brasão nem escudo; os pontos continuam indo para o clube da pessoa.

### Pontuação
| Faixa do lance | Chance de gol esperada | Gol vale desde 08/11/2026 | Até 07/11/2026 |
|---|---|---|---|
| Fácil | 75% ou mais | 24 | 10 |
| Média | 50% a 75% | 30 | 18 |
| Difícil | 30% a 50% | 36 | 26 |
| Craque | menos de 30% | 42 | 34 |
| **Recriou o lance** (gol na zona onde entrou o gol de verdade) | | **+8** | +6 |

- **Partida:** soma das 3 tentativas (teto 3 × 50 = **150**; até 07/11, 3 × 40 = 120). A tabela sai da hora em que a partida foi criada.
- **Dia (desde 08/11):** as 3 melhores partidas de Lances, com os pênaltis (seção 14.7). Até 07/11, a melhor partida, por fora do teto de 5. O peso na semana é conferido no balanço (seção 11).
- **Por que a melhor partida, e não os 3 melhores lances soltos:** com 20 tentativas e lance repetido, uma pessoa mediana acertaria 3 vezes o lance mais difícil em ~91% dos dias, e quase todo mundo bateria o teto. Fazer 3 seguidos separa quem joga bem: em 6 partidas de 3 lances de craque, ~9% para quem acerta 25% e ~55% para quem acerta 50%.
- **Faixa calibrada por dados:** a inicial sai do robô de calibragem (`calibrar` em `src/jogo/lances.ts`: chance de gol de quem mira no melhor gesto com o erro de mão típico). **Desde 08/11/2026 (seção 14.7):** o catálogo inteiro é recalibrado pelo acerto real das pessoas (`faixaUnificada` no catálogo) e, a partir de **30 tentativas valendo** de um lance (antes, 50), a faixa daquele lance sai da taxa real (`faixaCorrigida`; cada pessoa entra com no máximo as últimas 10 tentativas, e a taxa só vale com pelo menos 8 pessoas diferentes, para ninguém mudar a faixa sozinho nem com contas anônimas). A faixa é decidida quando a partida começa e fica gravada nela: mudança de faixa nunca mexe em partida já começada ou fechada.
- **Dificuldade fixa por lance:** não sobe ao longo da semana, para "o melhor do dia" de segunda valer o mesmo que o de domingo.

### Tela (21/10/2026; valendo desde 03/11/2026; tela única desde 08/11/2026)
> A escolha, a ficha, o limite e o resultado de hoje estão na seção 14.7 ("Como está nas telas"). Aqui fica o que é comum à partida de faltas e cara a cara.
> *Histórico (03/11 a 07/11/2026): hub de 3 abas (Pênaltis, Faltas, Cara a cara), álbum com "Treinar" e "Pôr na partida", barra fixa "Sua partida" com 3 vagas (podia misturar lances), 6 partidas valendo por dia, treino livre só no celular e resultado com "Escolher outros". Saiu do código em 08/11/2026.*

- **Valendo desde 03/11/2026** (servidor abaixo, em "Como está no servidor"). Antes disso a partida rodava só no celular, sem pontos.
- **Partida valendo:** ao começar, o celular pede a partida ao servidor; cada chute manda o gesto e a bola só sai quando o resultado chega (o batedor corre durante a espera). O goleiro começa onde o servidor diz.
- **Caiu a conexão** (no começo ou no meio): a partida segue no celular, com sorteio próprio, e não vale pontos ("Caiu a conexão…", com o código do motivo, como nos pênaltis). Passou das 10 do dia: a mesma partida segue de treino (seção 14.7).
  - **Decidido em 06/11/2026 (J03, jornadas simuladas, PR #139):** o aviso fecha com a saída e o código sai do meio da frase: "Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar." e, embaixo, em letra pequena e cinza, "código: tempo_esgotado" (sem parênteses). O código continua na tela, para quem manda print. O formato mora num lugar só, `comMotivo` em `src/servidor/motivo.ts`, e vale também para "Sem conexão: essa partida não vale pontos." e para a faixa de aviso do resultado.
- **Na Home:** o card **Lances do Jogo** ocupa o lugar dos Pênaltis na grade, mostra o total de lances do catálogo e quantos são do seu time (decidido em 31/10/2026; contagens em `src/dados/lancesResumo.ts`, gerado junto com o catálogo, para a Home não baixar as fichas) e abre a tela única (seção 14.7).
- **Situação do lance:** a ficha e a partida mostram uma linha do que o lance pede ("Falta a 25 m, pela direita, barreira de 4").
- **Câmera 3D com três distâncias (decidido em 21/10):** `src/telas/camera.ts` põe a câmera atrás da bola, olhando para o gol, e `src/telas/cena3d.ts` desenha o campo com a grande área, a pequena área, a marca do pênalti e a meia-lua no chão, o gol com rede, a barreira a 9,15 m da bola (dentro ou fora da área, como na regra), o goleiro, o batedor e a bola. Enquadramentos ajustados para o gol ocupar ~78% da largura da tela no pênalti (referência), ~60% no cara a cara e ~42% na falta de 25 m (falta mais longe, gol menor). A bola é desenhada 2,2 vezes maior que a real, para o dedo achar.
- **Bola e goleiro seguem a física:** a bola voa pelo caminho 3D do motor (`caminhoDoLance`) e para onde o motor diz (`tFim`: na barreira, no goleiro ou na linha do gol); o goleiro começa onde o motor sorteou (`goleiroAntesDoChute`) e pula para a bola.
- **Arraste:** como nos pênaltis, mas a linha do arraste prolongada cruza a boca do gol onde ela aparece na tela (que muda de tamanho e de ângulo conforme a distância).
- **"A jogada" (cara a cara):** antes do chute, um quadro conta como a bola chegou (coluna `chegada` do catálogo, até 90 caracteres, sem nomes) e a bola rola até o pé, vinda de trás, de um lado ou de rebote (coluna `chegada_de`). Dura ~2 s; o dedo só chuta depois.
- **Resultado:** pontos da partida, o desfecho de cada lance desenhado (gol, defesa, barreira, fora ou trave) e "Jogar de novo" ou "Ver os lances" (seção 14.7). Valendo, também: posição nos Lances na semana e recorde ("NOVO RECORDE!"), XP da Carreira, selo de medalha nova ("Bronze no lance…"), e "Subiu de 5º pra 3º" / "Contou pro ranking da semana" quando a partida entrou nas 3 melhores do dia; se não entrou, "Não entrou nas suas 3 melhores de hoje: …". Partida sob suspeita mostra o texto dos pênaltis.
- **Card "Telão do estádio"** (`src/jogo/cardLances.ts`, só da partida valendo): no telão, "LANCES DO JOGO", os pontos, o título do lance uma vez e as 3 tentativas ( desfecho desenhado, "RECRIOU O LANCE" e pontos), mais a linha da medalha nova. No texto de compartilhar, um emoji antigo por lance: ⚽ gol, ✋ defesa, 🚧 barreira, ❌ fora ou trave (🧤 e 🧱 são novos demais para a regra da seção 6, "Card de resultado").
- **Narrador:** seção 12 do `docs/narrador.md` (abertura, barreira, lance recriado e fim) mais as frases genéricas de gol, trave e fora da seção 3.
- **Catálogo no jogo:** `npm run catalogo-lances` gera `src/dados/lances.ts` com os lances `revisada` ou `ativa` dos CSVs; o teste avisa se esquecer.

### Como está no servidor (03/11/2026)
- **Valendo desde 03/11/2026**, lance a lance como os pênaltis (seção 6). Função `lances`, com duas ações:
  - **`nova`:** recebe os 3 ids escolhidos (pode repetir) e monta as cenas pelo catálogo do próprio servidor (`_shared/dados/lances.ts`, cópia de `src/dados/lances.ts`); o celular nunca manda a cena. Sorteia **uma semente por lance**, guarda ids e sementes em `partidas_segredo` e devolve só onde o goleiro começa no 1º lance. Começar é uma transação só no banco (`lances_comecar`, com trava por torcedor): o limite do dia e o de 3 partidas por minuto não passam com chamadas ao mesmo tempo.
  - **`lance`:** recebe o número do lance e o gesto. Lance repetido, pulado ou depois do 3º é recusado (`lance_fora_de_ordem`), com a mesma trava dos pênaltis contra duas chamadas ao mesmo tempo. Devolve o resultado daquele lance e o goleiro do próximo. No 3º, fecha a partida na mesma chamada: refaz os 3 lances a partir dos gestos guardados, roda a detecção e grava pela `fechar_partida` de sempre. Se o fechamento falhar depois do 3º gesto guardado, reenviar o 3º só fecha, com o gesto guardado.
- **Por que uma semente por lance (revisão de 03/11/2026):** o resultado de um lance volta exato (ponto da bola e goleiro), e com ele dá para achar por força bruta a semente daquele lance (são 2^32, uns 2 minutos num computador). Com uma semente só na partida, isso entregava os lances 2 e 3. Com uma por lance, a semente achada é a de um lance que já foi jogado.
- **Goleiro arredondado:** onde o goleiro começa sai da semente do lance e vai **antes** do chute. O celular recebe a posição em centésimos da meia-largura do gol (~4 cm, invisível no desenho), para não dar pista do sorteio do lance que ainda vai ser jogado.
- **Partida em `partidas`** (`minigame = 'lances'`, `dificuldade` 0, porque a dificuldade é fixa por lance). Por isso já entra na Carreira (gatilho de sempre), na fila de suspeitas do `#admin`, em "ver meus dados", na limpeza de contas paradas e no ranking de minuto em minuto. `resultado` guarda os 3 lances (id, faixa, gesto normalizado e o resultado do motor), `gols`, `recriados` e `pontos`.
- **Limite do dia:** até 07/11, 6 partidas valendo (`config_deteccao.lances_por_dia`); desde 08/11, 10 somando pênaltis e Lances (`lances_unificados_por_dia`). Contadas **ao começar**, pelo dia de Brasília: abandonar uma partida ruim gasta a vaga. Passou do limite: `limite_do_dia`, e o treino continua.
- **Melhor do dia:** `atualizar_teto` marca, até 07/11, as 5 melhores de pênaltis e Prova e, à parte, a melhor partida dos Lances; desde 08/11, as 3 melhores de pênaltis + Lances e as 3 melhores da Prova (empate: a que fechou primeiro). Todas usam `conta_no_teto`, então o ranking da semana, o bônus de "1º do dia" da Carreira e a posição geral leem o teto sem mudar a conta. Posição nos Lances e recorde: pela melhor partida (desde 08/11, juntando os três tipos e recomeçando do zero).
- **Detecção** (`motivoSuspeitaLances` em `src/jogo/lancesPartida.ts`; números em `config_deteccao`). Sem a semente, nem mira perfeita ganha muito: no catálogo de 03/11, o melhor gesto sem erro de mão faz 33% a 36% nos lances Craque e 37% a 68% nos Difícil, contra 26% e 30% a 45% de uma pessoa. A detecção procura o que uma pessoa não faz:
  - **Gesto de robô:** nas últimas 15 tentativas valendo do mesmo lance, direção e força variando no máximo 2 pontos (uma pessoa varia ~7).
  - **Acima da mira perfeita:** 27 gols ou mais nas últimas 30 tentativas valendo em lances Difícil ou Craque. Rede de segurança contra semente vazada ou erro no servidor.
  - Partida marcada fica fora do ranking, do recorde e das medalhas, e vai para a fila "Partidas sob suspeita" do `#admin`. Liberar devolve ao teto do dia e anota os gols nas medalhas.
- **Medalhas:** tabela `lances_gols`, um gol por linha (partida, posição, lance, recriou), preenchida por gatilho quando a partida fecha sem suspeita ou é liberada. Sem chave para `partidas`: o `zerar-pre-temporada` apaga as partidas e as medalhas ficam. Somem só com a conta (apagar meus dados, contas paradas). O celular não lê a tabela: `minhas_medalhas()` (as próprias), `vitrine_medalhas()` (soma por torcida, pelo time atual de quem ganhou, só times oficiais) e `meus_lances_hoje()` (partidas começadas hoje, limite e melhor do dia).
- **Treino:** só no celular, sem servidor.
- **Regra nova no servidor (14.7, migração `20261105100000`):** detalhes em "Como está no servidor" da seção 14.7.

### Medalhas e Conquistas
- Por lance, contando só gols em partidas valendo (conferidas no servidor): **bronze** com 5 gols, **prata** com 20, **ouro** com 50 gols, dos quais 10 recriando o lance.
- **Pênaltis (seção 14.7):** por disputa histórica, **bronze** com 10 gols, **prata** com 50, **ouro** com 100 gols e 10 vitórias. Contam as partidas desde 31/10/2026 (quando a partida passou a guardar a disputa). O X1 conta na disputa de quem chamou. **A Disputa livre não tem medalha** (decisão do Kauê em 05/11/2026): as linhas dela saíram na migração `20261105400000`, sem nunca terem aparecido em tela. As medalhas das disputas aparecem **já antes do corte**: trilha nos cards e na ficha da aba Pênaltis do hub, nas Conquistas e no resultado da disputa.
- **Nunca zeram**, nem no zerar da pré-temporada: ficam numa tabela própria, que o `zerar-pre-temporada` preserva.
- **Não valem ponto** no ranking (são coleção, como a Carreira).
- **Página Conquistas**, como aba ao lado do Ranking das torcidas: as medalhas do jogador por clube e por lance, e a vitrine da torcida ("a torcida do São Paulo tem 1.240 medalhas de ouro"), por soma e sem apelido. **No ar desde 03/11/2026:** 3ª aba do Ranking (Semana, Temporada, Conquistas), que o atalho "Conquistas" do Perfil também abre. "Suas medalhas" por clube e por lance, com a trilha de 3 medalhas (seção 14.3); "Vitrine das torcidas" ordenada por ouro, pelo time atual de quem ganhou. Em desenvolvimento, `?lancesFalsos` (`=limite` para o limite do dia; `&caiNoLance=N` derruba o N-ésimo lance).
- **Card de medalha (no ar desde 05/11/2026):** "Já sou ouro no primeiro gol de Tóquio — Flamengo x Liverpool (1981)". Título do lance sempre, nunca nome de pessoa (seção 8); a ficha factual não entra.
  - **Onde aparece:** botão "Mandar a medalha" na linha da medalha que subiu, no resultado dos Lances e das disputas de pênaltis; e ao tocar numa medalha na aba Conquistas. Os dois abrem a mesma folha, de baixo, com o card, "Mandar no grupo", Stories e Link.
  - **Frase:** o artigo do título vira contração ("O primeiro gol…" → "no primeiro gol…", "A virada…" → "na virada…", "Os"/"As" → "nos"/"nas"); título sem artigo leva "no lance" ou "na disputa" ("Já sou bronze no lance Gol 100 do goleiro"). Depois do travessão, clube x adversário e o ano.
  - **Card** (`src/jogo/cardMedalha.ts`, modelo "Telão do estádio"): no telão, o time da pessoa no alto, a medalha desenhada (bronze, prata ou ouro, fita nas cores do time) e "JÁ SOU OURO / no primeiro gol de Tóquio / FLAMENGO X LIVERPOOL (1981)"; embaixo, OURO no lugar dos pontos, "Medalha pro Flamengo" (ou o apelido), um adesivo curto sem nome de ninguém e o link do lance no rodapé.
  - **Link do lance:** `torcida.kauewalter.com.br/#lance/<id>` ou `#disputa/<id>` abre a ficha do item na tela dos Lances (depois do corte; antes, abre os Lances). Sem time no aparelho, passa antes pela escolha do time.
  - **Texto de compartilhar**, com emoji antigo (🏆, de 2010): "🏆 Guerra de Torcidas · Lances do Jogo" (ou "· Pênaltis"), a frase, "Medalha pro Flamengo" e o link.
- **"Mandar esse lance"** (decidido em 06/11/2026 (J43, jornadas simuladas)): na ficha da tela única (14.7), ao lado do "Jogar", para repostar o lance sem ter medalha. Abre a folha de compartilhar com o link do lance (acima) e um texto com emoji antigo (⚽): "⚽ Lance do Guerra de Torcidas: A virada em Lima (Flamengo x River Plate, 2019). Consegue recriar?"; na disputa, "⚽ Disputa de pênaltis no Guerra de Torcidas: O tetra da Copa do Brasil. Bate comigo?". Só o título, o clube, o adversário e o ano: a ficha factual e nomes de pessoa nunca entram (seção 8). Sem a folha (computador), copia o texto com o link e mostra "Link copiado.". Sem toque duplo: o botão trava até a folha voltar. Conta pura em `src/jogo/mandarLance.ts`.
- **Partida em tela grande e celular deitado** (decidido em 06/11/2026 (J09 e J10, jornadas simuladas)): vale para os Lances e para os pênaltis; regra em 14.7, "Partida".
- **Comemoração no resultado:** papel picado nas cores do time e vibração, uma vez por resultado, em vitória (pênaltis, X1, 8 de 8 na Prova), recorde novo, partida nas 3 melhores do dia (regra de 08/11), Time do Dia acertado e medalha nova. A medalha que chega depois, pela leitura do servidor, não repete a festa. Respeita movimento reduzido (sem papel) e o botão Vibração.
- O id de um lance nunca muda depois de publicado (as medalhas apontam para ele).

### Regras do motor (21/10/2026)
- `src/jogo/lances.ts`, puro e compartilhado com o servidor (sem trigonometria; `Math.sqrt` pode). Medidas em metros: origem no meio da linha do gol, x para a direita de quem bate, z até a linha do gol.
- **Ponto final** na linha do gol: a mesma conta dos pênaltis (`trajetoria`). O tremor cresce com a distância (até 3 vezes o do pênalti).
- **Caminho da bola:** reta até o ponto final, mais a curva do efeito (até 1,5 m no meio do caminho, a 20 m) e um arco que sobe mais com força menor e com a distância. Força alta = chute reto e rápido; força média = bola que sobe e cai.
- **Barreira:** a 9,15 m da bola, tapando a linha entre a bola e um ponto do gol; de 2 a 6 jogadores de 0,5 m e 1,9 m de altura. Bate nela a bola que passa nessa faixa abaixo de 1,9 m. Bola que sai de trás da barreira atrasa o goleiro.
- **Goleiro:** começa no lado aberto (falta) ou de frente para a bola (cara a cara); reação sorteada entre 0,15 e 0,45 s; alcance que cresce com o tempo de voo da bola (até 3,8 m, um pouco menos no ângulo). Em 25% das vezes "lê" o chute, como nos pênaltis. Saindo do gol, abafa mais; a cavadinha só encobre goleiro que saiu 3 m ou mais e não leu.
- **Trave, fora, ângulo e cavadinha:** mesmas regras dos pênaltis.

### Anti-trapaça
- Como nos pênaltis: o servidor sorteia a semente, recebe os 3 lances e os 3 gestos, recalcula e grava. O limite de partidas valendo por dia é contado no servidor.
- O treino não passa pelo servidor e não conta para nada.
- Nasceu **lance a lance** (03/11/2026), como os pênaltis (seção 6): a semente nunca vai para o celular. Caiu a conexão no meio: a partida segue no celular, com sorteio próprio, e não vale pontos (com o código do motivo no aviso). Detalhes em "Como está no servidor", acima.

### Catálogo
- **Refeito do zero.** Os lotes de ideias de 20/10 servem só de ponto de partida (vários tinham fatos trocados).
- **Cada lance guarda:** id, clube (ou Seleção), tipo, título, ficha, competição, ano, adversário, cena (bola, barreira, goleiro), zona histórica, faixa, **fontes** (links de notícias públicas), data da verificação e status (rascunho, revisado, ativo).
- **Mesma cota para todos os clubes:** 2 a 3 lances por clube na estreia; a Seleção Brasileira entra como coleção extra, aberta a todos.
- **Só lances que celebram o clube:** nada de tragédia, morte ou acidente, vexame ou atleta menor de idade na data do lance. Nada de opinião sobre pessoas ("vacilo do zagueiro"). **Exceção (decidida em 26/10/2026):** lances da campanha da Chapecoense na Sul-Americana de 2016 podem entrar, desde que a ficha, o título e o narrador não falem do acidente. **Vale também para as disputas históricas de pênaltis (decidido em 31/10/2026):** a ficha pode citar o goleiro pelo nome, como fato, nas mesmas condições.
- **Competição e estádio** sem nome de patrocinador.
- **Como nasce:** como o banco de perguntas (seção 7.1): lotes escritos numa sessão com busca na web, sempre com fonte, e uma segunda sessão, nova, que confere cada fonte.


### 14.3 Troféus dos lances
> Decisão do Kauê em 04/11/2026.

- Rota T2, 'trilha de 3 medalhas'. Em cada card do álbum, três bolinhas (5, 20 e 50 gols) ligadas por uma linha que se enche; as conquistadas na cor da medalha (bronze, prata, ouro), a próxima preenchida em parte, com '23 gols · faltam 27' ao lado. Ouro completo ganha brilho.
- Ficha do lance abre de baixo: ⭐ favoritar, a ficha factual, a situação, a trilha com os marcos, uma barra própria de recriados (o ouro pede 10), 'Faltam X gols, Y recriando, pro ouro', prévia da linha do resultado, "Mandar esse lance" e "Jogar" (seção 14.7; até 07/11, Treinar e Pôr na partida).
- Álbum com filtros 'Todos', 'Meus troféus', 'Perto do próximo' (ordena pelo que falta) e ⭐ Favoritos primeiro. Favoritos ficam só no aparelho.
- No resultado dos Lances, uma linha por lance: '+1 rumo ao ouro · 24/50'. Ao subir de medalha: papel picado, vibração (a comemoração do resultado, seção 7.3), o selo da medalha e "Mandar a medalha".
- Na aba Conquistas, as medalhas por lance usam a mesma trilha no lugar da frase 'Faltam 27 gols…'.

**Detalhes decididos no plano (04/11/2026):**
- Os números vêm só do que o servidor já guarda (`minhas_medalhas()`: gols e recriados por lance). Nada muda na regra das medalhas nem nos pontos.
- "Meus troféus" mostra os lances com pelo menos o bronze. "Perto do próximo" ordena pelos gols que faltam para a próxima medalha, e quem tem o ouro completo vai para o fim. Os ⭐ ficam no topo em qualquer filtro.
- A linha do resultado lê `minhas_medalhas()` de novo depois do 3º lance, quando o gatilho já anotou os gols. Lance sem gol na partida mostra só "Rumo ao bronze · 3/5". Quando sobram gols e faltam recriados, a conta passa a ser dos recriados ("7/10 recriando"). Partida sob suspeita ou sem conexão não mostra as linhas, porque os gols dela não contam.
- Papel picado e vibração seguem as regras de sempre: nada com movimento reduzido nem com a Vibração desligada.
- **Como está no código (04/11/2026):**
  - **Conta pura:** `trilhaDoLance`, `linhaRumo`, `linhasRumoDaPartida`, `previaDoProximoGol` e `filtrarAlbum`, em `src/jogo/lancesTextos.ts`.
  - **Bloco:** `trilha()` em `src/telas/blocos.ts`.
  - **Telas:** `src/telas/albumLances.ts` (cards, filtros e favoritos em `prefs.favoritosLances`), `src/telas/fichaLance.ts` (a ficha, um `<dialog>`) e `src/telas/rumoMedalhas.ts` (a placa "Rumo às medalhas" do resultado).
  - **Em dev:** `?lancesFalsos`. Prints em `docs/auditoria/2026-11-04/trofeus/`.
  - **`#admin`:** foi para o Grafismo de TV no mesmo PR, com as mesmas ações (`src/estilos/admin.css`; em dev, `?adminFalso#admin`).


### 14.7 Lances do Jogo unificados
> Decisão do Kauê em 04/11/2026. Números finais pela proposta `docs/propostas/lances-unificados.md`.

**Números decididos em 04/11/2026** (proposta `docs/propostas/lances-unificados.md`; entra no domingo 08/11, 0h, pela data de criação da partida; **antecipado pelo Kauê em 05/11/2026**, era 16/11, e **de novo em 07/11/2026**, era segunda 09/11):
- Pênaltis ('mais baixa'): gol 7, ângulo +4, cavadinha +6, defesa 7, vitória +15 (também na morte súbita e no par ou ímpar), 5 de 5 +10. Mediana ~57, máximo ~136. Guarda de 150 no fechamento.
- Faltas e Cara a cara (opção B): gol fácil 24, médio 30, difícil 36, craque 42, recriar +8. Teto 150.
- Faixas dos lances: o catálogo inteiro é recalibrado pelo acerto real das pessoas (fator ~0,45 do robô) no mesmo domingo; depois, cada lance é corrigido pela taxa real a partir de 30 tentativas valendo (antes, 50). A correção só desce a faixa, nunca a sobe acima da do catálogo (revisão de segurança do PR #108, confirmada pelo Kauê em 05/11/2026: errar de propósito com contas anônimas não pode render ponto). Mudança de faixa nunca mexe em partida fechada.
- Limite: 10 partidas de Lances valendo por dia (pênaltis, faltas e cara a cara somados); o X1 recebido conta no limite e vale ponto. Depois do limite, a partida vira treino.
- Medalhas dos Pênaltis: 10 · 50 · 100 gols, ouro com 10 vitórias, por disputa histórica (a Disputa livre saiu em 05/11/2026, abaixo). Preenchidas com as partidas já jogadas desde 31/10 (que guardam disputa_id), antes do zerar.
- Recordes e posição dos Lances recomeçam no domingo do corte.
- 8 lances sem recriar possível são conferidos antes da tela única (outra sessão).
- Acompanhar no balanço: para quem joga muito, a Prova sobe para ~43% do total, empatada com os Lances.

- Pênaltis, Faltas e Cara a cara viram um jogo só, com a mesma regra de pontos, escolha e troféus.
- Teto de 150 por partida nos três tipos (igual à Prova). Mediana-alvo ~60.
- Pênaltis: 5 cobranças + 5 defesas alternadas, desempate (morte súbita e par ou ímpar) dentro do teto; tabela reequilibrada para caber em 150.
- Faltas e Cara a cara: a partida são 3 tentativas do mesmo lance; gols sobem para o teto chegar a 150 (proposta inicial 12, 22, 32, 42 por faixa e +8 por recriar).
- O dia vale as 3 melhores partidas de Lances, de qualquer tipo (máx. 450).
- A Prova de Boleiro também passa a valer as 3 melhores partidas do dia (máx. 450), no lugar do teto de 5 que dividia com os Pênaltis. Time do Dia e Crava não mudam.
- Escolha em um toque: cada item do álbum tem só 'Jogar'. Saem o monte-sua-partida de 3, a barra de vagas, 'Pôr na partida' e 'Treinar'.
- Limite anti-abuso de partidas de Lances valendo por dia; depois dele a partida vira treino sozinha (sem ponto nem medalha).
- Tela única: filtro de tipo (Todos · Pênaltis · Faltas · Cara a cara), clube (abre no seu time), Meus troféus, Perto do próximo e ⭐; lista em favoritos → seu time → Seleção → outros (sem Disputa livre desde 05/11/2026); 'Seus 3 melhores de hoje' no topo.
- Troféus em todos os itens: Faltas e Cara a cara 5 · 20 · 50 gols, ouro com 10 recriados (medalhas já ganhas continuam); Pênaltis (cada disputa histórica) 10 · 50 · 100 gols, ouro com 10 vitórias.
- Lance do Dia na Home (o mesmo para todos, não multiplica pontos); X1 em qualquer lance; card de Lances na Home com o top 3 do dia.
- Entra no domingo 08/11, 0h (exceção da pré-temporada à regra da segunda 0h, seção 5); partidas fechadas não mudam.

**Corte antecipado e sem Disputa livre (decisão do Kauê em 05/11/2026):**
- **Corte:** segunda 09/11/2026, 0h de Brasília, no lugar de 16/11; **antecipado de novo em 07/11/2026 para domingo 08/11, 0h (03h UTC)** (bloco abaixo). Tudo continua decidindo pela hora de criação da partida: a partida criada no sábado 07/11 e fechada depois da meia-noite conta no sábado; X1 criado antes do corte expira (410 `desafio_expirado`); recordes e posição dos Lances recomeçam em 08/11. Celular com o site antigo (corte em 16/11): a lista antiga de 3 lances recebe 426 `atualize_o_app` a partir do corte e a tela única liga sozinha.
- **Troféu nos pênaltis já:** os gols das disputas históricas já eram anotados desde a migração `20261105100000` (com o histórico desde 31/10); desde 05/11 aparecem também na tela de antes: trilha de 3 medalhas nos cards e na ficha da aba Pênaltis (com a barra de Vitórias e "Faltam X gols e Y vitórias pro ouro"), nas Conquistas ("Suas medalhas" e a vitrine) e no resultado da disputa ("+N rumo ao bronze · 8/10", com o selo, papel picado e vibração ao subir de medalha, como nos lances).
- **Sem Disputa livre a partir do corte:** nos Lances do Jogo ficam só itens históricos (disputas do catálogo, faltas e cara a cara), todos com troféu. Até sábado 07/11 a Disputa livre continua na tela de antes, sem trilha. Partida de pênaltis valendo sem disputa é recusada no servidor (400 `disputa_obrigatoria`); a Disputa livre não tem medalha, e as linhas `penaltis:livre` saíram de `lances_gols`.
- **X1 dos pênaltis:** quem recebe joga a disputa de quem chamou (adversário de verdade, ficha e "foi X x Y"), e a medalha vai para a mesma disputa.
- **Publicação (obrigatória, tudo antes do corte):** a migração `20261105400000_lances_sem_livre.sql` primeiro, depois as funções `nova-partida`, `lances`, `lance-penalti` e `fechar-partida` (as quatro levam a data nova em `_shared/jogo/regraLances.ts`), e o site por último. Antes de 09/11 a ordem não muda pontos (as duas datas dão a mesma regra até lá); depois de 09/11, banco e funções com datas diferentes discordariam no teto e na tabela. A `ver_desafio` nova só acrescenta a coluna `disputa_id`: o site antigo a ignora.

**Corte no domingo 08/11 (decisão do Kauê em 07/11/2026, na pré-temporada):** umas 20 pessoas novas entram no domingo de manhã e já veem a tela única (um toque em Jogar, 3 tentativas do mesmo lance, X1 dos Lances). Exceção à regra da segunda 0h (seção 5).
- **O corte cai no meio da semana de 02/11:** tudo o que separa as regras decide pelo **dia** ou pela **hora**, nunca pela semana. Teto do dia (`atualizar_teto`), limite do dia (`lances_hoje`) e a guarda de 150 (`fechar_partida`): sábado com a regra antiga, domingo com a nova. Recorde (`recorde_pessoal`): recomeça no domingo, pela hora de criação. Posição nos Lances (`posicao_minigame`): até a migração `20261107200000_lances_corte_domingo.sql` escolhia a regra pela semana e só recomeçaria na segunda; agora escolhe pelo dia pedido, e na regra antiga Pênaltis e Lances contam só partidas criadas antes do corte (a posição de sábado não mistura as de domingo). A tela de resultado (`desempenho_partida`) manda o dia da partida.
- **Partida de sábado à noite** fechada depois das 00h05 de domingo conta no sábado (`periodoNoCorte`, a mesma tolerância de 00h05 de toda virada de dia). X1 criado até sábado expira no domingo.
- **Semana de 02/11 com as duas regras somadas:** o fechamento dela (provisória segunda 09/11 00h05, travada às 12h) soma sábado na regra antiga e domingo na nova. Aceito: é pré-temporada, e a pré-temporada zera. No `npm run balanco`, por partida a separação é pela hora; no peso na semana, a semana de 02/11 inteira entra em "antes".
- **Publicação (no ar desde 07/11/2026, 12h40, PR #154):** a migração `20261107200000_lances_corte_domingo.sql` primeiro, depois as funções `nova-partida`, `lances`, `lance-penalti` e `fechar-partida` (levam a data nova em `_shared/jogo/regraLances.ts`; a `boneco` também leva o arquivo e foi publicada junto), e o site por último.
- **Limpeza depois do corte (no ar desde 08/11/2026, 8h10, PR #156):** sem migração. A função `lances` v8 só podia subir depois das 0h de domingo (antes disso, mandaria 426 ao site de sábado, que ainda pedia a lista de 3); o site saiu pelo merge. As outras funções não mudaram.

#### Como está no servidor (05/11/2026; revisão de segurança feita no PR #108; no ar desde 05/11/2026, 8h16, com o PR #110)
- **Data de corte:** `LANCES_UNIFICADOS_DESDE` em `src/jogo/regraLances.ts` e `lances_unificados_desde()` / `lances_dia_do_corte()` no banco (um teste confere que são iguais). Tudo decide pela **hora de criação** da partida, que a função passa ao banco ao começar. Partida criada antes do corte e fechada depois das 00h05 do domingo conta no sábado (`periodoNoCorte`), então teto e posição separam as regras pelo dia.
- **Motor:** tabelas versionadas (`PONTOS` e `PONTOS_UNIFICADOS` em `penaltis.ts`; `TABELA_LANCES_ANTES` e `TABELA_LANCES_UNIFICADA` em `lances.ts`), escolhidas por `tabelaPenaltisDaPartida` / `tabelaLancesDaPartida`. Guarda do teto no total da partida.
- **Faltas e cara a cara (função `lances`):** `nova` recebe `{ lance }` (3 tentativas do mesmo lance) ou `{ desafio }` (X1). A lista antiga de 3 ids responde sempre 426 `atualize_o_app` (desde a limpeza de 08/11/2026; antes do corte, ela ainda montava a partida antiga), e o celular com o site velho se recarrega. A faixa é decidida ao começar (`faixaDaPartida`: corrigida pela taxa real, senão `faixaUnificada` do catálogo, senão a de sempre) e fica gravada no segredo da partida.
- **X1 dos Lances (só na regra nova):** toda partida normal gera um código (`lances_desafios`, resumo público em `ver_desafio_lances`), com a faixa usada. Quem aceita joga o mesmo lance, **na mesma faixa**, com sementes novas; mais pontos vence, e o empate fica com quem desafiou. Se o lance desceu de faixa depois do X1 (`desafioNaFaixa`), o código expira (410 `desafio_expirado`): senão um código antigo guardaria a faixa que pagava mais. O código do X1 recebido fica no segredo da partida (`partidas.desafio_id` é dos pênaltis). X1 cuja partida foi **criada** antes do corte (mesmo fechada depois) não pode ser aceito depois (410 `desafio_expirado`), nos pênaltis e nos Lances. O formato `{ lance }` já funciona antes do corte, com a tabela antiga e sem X1.
- **Limite do dia:** `lances_comecar` e `penaltis_comecar` (nova) usam a mesma trava por torcedor; a partir do corte somam pênaltis e Lances (10, `config_deteccao.lances_unificados_por_dia`), contados no dia da hora gravada na partida (`lances_hoje(torcedor, p_criada_em)`; a hora vem da função, só o servidor executa, com no máximo 1 minuto de diferença do banco). Passou: 429 `limite_do_dia`, e o celular joga como treino.
- **Guarda no banco:** `fechar_partida` recusa (`acima_do_teto`) partida de pênaltis ou Lances acima de 150 em dia da regra nova. Só acontece se uma função de antes deste PR ainda estiver no ar depois do corte.
- **Teto e posição:** `atualizar_teto` com as duas regras pelo dia; `posicao_minigame` e `recorde_pessoal` juntam 'penaltis' e 'lances' a partir do corte e só olham partidas (e recordes herdados) desde então; `meus_lances_hoje()` devolve também `melhores` (as 3 que contam hoje).
- **Medalhas dos pênaltis:** em `lances_gols` (que já sobrevive ao zerar e vai junto na junção de contas): item `penaltis:<disputa>`, uma linha por gol e uma linha de vitória (o item `penaltis:livre` saiu em 05/11/2026, migração `20261105400000`: partida sem disputa não anota nada). Gatilho para partida fechada sem suspeita ou liberada, preenchimento das partidas desde 31/10 na própria migração. `minhas_medalhas()` ganha a coluna `vitorias`; `vitrine_medalhas()` soma os dois tipos.
- **Faixa corrigida:** `lances_tentativas` (uma linha por tentativa valendo, sobrevive ao zerar, some com a conta) e `lances_taxa(lance)` (no máximo as 10 últimas por pessoa, e o número de pessoas; a faixa só muda com 30 tentativas de 8 pessoas, e só para uma que paga menos que a do catálogo). Risco que fica: 8 contas anônimas errando de propósito (8 CAPTCHAs e 32 partidas) seguram um lance na faixa do catálogo, atrasando a descida; nunca o levam acima dela. Risco aceito: na junção de contas pelo código, as tentativas da conta de origem saem com ela.
- **Moderação e junção:** `apelido_apagar` limpa também o apelido do X1 dos Lances; `juntar_torcedores` deixa a herança de recorde da regra nova substituir uma de antes do corte (antes, um 200 da tabela velha barrava um 90 da nova); antes do corte, só a maior fica, como sempre.
- **Lance do Dia:** `lanceDoDia(dia, ids)` em `regraLances.ts`, pela data e pela ordem alfabética dos ids, igual no celular e no servidor; não multiplica pontos.
- **Relatórios:** `npm run balanco` com Lances juntos e por tipo, teto 150 e separação pela data de corte (`--regra antes|nova` mostra só uma).
- **Ordem de publicação (obrigatória):** a migração primeiro, depois as funções `lances`, `nova-partida`, `lance-penalti` e `fechar-partida`, e o site com as telas antes de 08/11. A migração no ar não quebra as funções antigas; o contrário quebra (as funções novas chamam `penaltis_comecar` e os parâmetros novos de `lances_comecar`). Depois que houver partidas com a faixa gravada, as funções não voltam à versão anterior.
- **Catálogo recalibrado (05/11/2026, depois do PR #106):** `scripts/lances/recalibrar.mjs` grava `dados/lances/faixas-unificadas.json` (chance do robô × fator humano medido, **0,418**: 9 gols em 30 tentativas, contra 21,5 do robô), e o `npm run catalogo-lances` põe `faixaUnificada` em cada lance. Resultado: todo fácil vira difícil e todo médio vira craque (31 difíceis e 20 craques; lista em `docs/propostas/lances-faixas-unificadas.md`). A correção por lance (30 tentativas de 8 pessoas) devolve os mais fáceis às faixas de baixo conforme as pessoas aprenderem.

#### Como está nas telas (05/11/2026; no ar desde 08/11/2026; limpeza do que só servia antes do corte em 08/11/2026)
- **Só a tela única.** *Histórico: de 05/11 a 07/11, `lancesUnificados()` (`src/telas/corte.ts`) escolhia pelo relógio do aparelho entre a tela de antes e a tela única, com `?corte=depois|antes` em dev. Na limpeza de 08/11 saíram o hub de 3 abas, o monte-sua-partida com a barra de vagas, "Treinar" e "Pôr na partida" na ficha, o treino livre, a Disputa livre e o `?corte=`. As tabelas antigas do motor (`PONTOS`, `TABELA_LANCES_ANTES`) ficam: fecham partidas antigas e servem aos testes.*
- **Voltar com uma folha aberta (S08, decidido em 08/11/2026):** a ficha do lance e as regras ("?") entram no histórico do navegador, como o vestiário: o voltar do celular e do navegador fecha a folha antes de sair da tela. Fechar tocando (✕, fora, Esc, "Jogar") desfaz o estado; o "Jogar" da disputa só troca de tela depois que o histórico voltou. Conta em `src/telas/folhaNoHistorico.ts`, com teste.
- **Tela única** (`src/telas/lances.ts`; conta pura em `src/jogo/lancesTelaUnica.ts` e `ordenarTelaUnica` em `src/jogo/lancesTextos.ts`):
  - **No topo:** "Seus 3 melhores de hoje" (3 números; casa vazia "Vaga", desde 05/11/2026; "—" sem resposta do servidor) e "Valendo hoje: N de 10".
  - **Filtros:** tipo (Todos · Pênaltis · Faltas · Cara a cara, pela aba da rota); clube (abre no time da pessoa); Todos / Meus troféus / Perto do próximo; e ⭐.
  - **Itens e ordem:** todas as disputas do catálogo e os lances (a Disputa livre saiu em 05/11/2026). Favoritos → seu time → Seleção → outros. Quem é de "Outro time": o filtro de clube abre na Seleção.
  - **Card:** a faixa do catálogo recalibrado com os pontos novos ("Difícil · 36"), o placar na disputa, a trilha e o selo "Lance do Dia".
  - **Ficha:** ⭐, "Mandar esse lance" e "Jogar" (o principal, amarelo). Nas disputas, a trilha 10 · 50 · 100 e a barra de Vitórias. Decidido em 06/11/2026 (J43, jornadas simuladas): "Mandar esse lance" abre a folha de compartilhar com o link `#lance/<id>` ou `#disputa/<id>` e o título, sem nome de pessoa (texto na seção 7.3).
- **Partida:**
  - 3 tentativas do mesmo lance (`{ lance }`), com "Tentativa N de 3" no topo. A faixa vem da resposta do servidor: a da taxa real, se ela desceu.
  - **Limite do dia (429):** a mesma partida segue de treino, com "Hoje já deu: 10 partidas valendo. Essa vai de treino: sem ponto nem medalha." e a dica "Hoje as 10 valendo já foram. Treine à vontade.".
  - **Sem treino livre.**
  - **Celular deitado** (decidido em 06/11/2026 (J10, jornadas simuladas)): com toque, mais largo que alto e altura até 500 px, os pênaltis e os Lances mostram por cima "Vire o celular pra jogar", com um celular desenhado girando (parado com movimento reduzido), até a pessoa virar. Tablet, dobrável aberto e computador nunca veem. Enquanto o aviso está na tela, **o relógio da partida para**: a janela para reagir na defesa dos pênaltis (1,9 s − 0,7 s × dificuldade, depois da corrida) e "A jogada" do cara a cara correm no aparelho, e voltam de onde pararam ao virar. O servidor não mede tempo (só a validade da partida), então pontos, sementes e o que vai para o servidor não mudam. Arraste no meio é descartado. Conta pura em `src/jogo/telaDaPartida.ts` (`celularDeitado`, `criarRelogioPausavel`).
  - **Campo maior em tela grande** (decidido em 06/11/2026 (J09, jornadas simuladas)): no computador, no iPad e no dobrável aberto, o canvas dos pênaltis e dos Lances sai da coluna de 520 px e o campo cresce pela altura (inteiro, sem rolar), com o placar por cima, no alto. Home, Ranking, Galeria e resultados continuam na coluna. A mira não muda (o arraste é lido em proporção ao gol) e a bola dos Lances segue 2,2× a real. O canvas maior respeita a qualidade gráfica automática, com um teto de pixels por nível que não chega a valer no celular. Detalhes em `docs/visual.md` 4.7.
- **Resultado:**
  - "Gols N de 3" e as 3 tentativas sob o título do lance.
  - "Suas 3 melhores hoje: 96 · 72 · 54", ou "Não entrou nas suas 3 melhores de hoje: …".
  - **Compartilhar:** o link do X1 (`?l=código`), com "Te chamei no X1 dos Lances: fiz N pro [time]. Faz mais?".
  - **Botões:** "Jogar de novo" (o mesmo lance) e "Ver os lances".
  - **Telão:** o título uma vez e as 3 tentativas.
- **X1 dos Lances:**
  - **Convite na Home:** a Home lê `ver_desafio_lances` e mostra "<quem> (<time>): N pontos no lance <título>. Mesmo lance, 3 tentativas. Faz mais?".
  - **Aceitar:** "Aceitar o X1" (ou "Jogar agora") vai direto à partida (`{ desafio }`), com "X1: <apelido> fez N" no topo. O `?l=` sai do endereço.
  - **Erros:** 404, 409 e 410 viram partida normal do mesmo lance, com uma linha do narrador ("Esse X1 expirou. Vai uma partida normal!").
  - **Resultado:** o placar dos dois. Frase do narrador que fala em link cai na neutra, porque o X1 recebido não gera outro código.
- **Home:**
  - Card dos Lances com as 3 melhores do dia, só as da própria pessoa.
  - "Jogar agora" pelas partidas valendo que faltam das 10; abre a tela única no filtro Pênaltis (como o fim do Aquecimento).
  - **Botão "Lance do Dia":** `lanceDoDia`, o mesmo para todos e sem bônus, sorteado entre todos os itens (ids das disputas e dos lances, em ordem alfabética); abre a ficha do item. O catálogo vem por `import()` depois de desenhar.
- **Pênaltis:**
  - **429:** joga sem valer pontos, com o aviso do limite.
  - **410 `desafio_expirado`:** vira partida nova ("Esse X1 expirou. Vai uma partida nova!").
  - **X1 recebido:** joga a disputa de quem chamou, com o cenário dela (pelo convite da Home, que lê `ver_desafio`, ou pela resposta da `nova-partida`). Pelo link direto, sem passar pela Home (quem ainda não tinha time), a arquibancada da Seleção não entra, porque a cena já foi montada; placar, cores, narrador e medalha entram. Depois do corte, X1 que não vale (expirado, já jogado, próprio) vira partida normal **da disputa daquele X1**, ou da primeira do time, ou da Seleção.
  - **400 `disputa_obrigatoria`** (relógio do aparelho atrasado depois do corte): joga sem valer pontos.
  - **Tabela local:** a nova.
  - **Resultado:** "Não entrou nas suas 3 melhores de hoje" e o selo de posição dos Lances.
- **Outros textos:**
  - **Prova:** fala em 3 melhores.
  - **Ranking:** "por dia, de cada um valem as 3 melhores partidas de Lances e as 3 da Prova".
  - **"?":** as tabelas novas, lidas do código (`src/jogo/regrasUnificadas.ts`).
  - **Conquistas:** as disputas de pênaltis entram (já antes do corte); a Disputa livre não tem medalha.
  - **Perfil:** só "Lances" na posição e no recorde, porque o servidor junta com os pênaltis.
  - **Narrador:** "Três chutes…" e "Escolhe um lance…" servem às duas regras.
- **Medalhas dos pênaltis:** trilha nos cards e na ficha da disputa, nas Conquistas e no resultado (já apareciam na tela de antes desde 05/11/2026). A vitrine das torcidas já as somava.
- **Em dev:**
  - `?lancesFalsos`, com `=limite` e `&x1=ok|proprio|expirado|nao`;
  - `?homeFalsa`, com `&l=código` e `&semMelhores`;
  - `?penaltiFalso`, com `&limite` e `&x1Expirado`.

