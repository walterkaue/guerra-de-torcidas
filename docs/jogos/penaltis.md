## 6. Minigame 1 — "Bate Contra Mim" (pênaltis)

### Como joga
- **Cobrar (5 cobranças):** deslizar o dedo na direção do gol. Direção do arraste = canto, comprimento = força, curva no fim do arraste = efeito. Força demais vai por cima, de menos o goleiro pega.
- **Defender (5 defesas):** o batedor corre; antes do chute aparece uma "dica" no corpo dele (o pé de apoio). O jogador toca em uma de 6 zonas do gol para pular.
- Jogo normal: contra o goleiro e o batedor da máquina (dificuldade sobe ao longo da semana, igual para todos).
- **Como jogar (mudado em 04/11/2026, seção 14.4):** o resumo antes do apito e o "Não exibir novamente" saíram. Quem chega aprende no aquecimento e nas dicas da faixa de instrução, na hora do erro. O botão "?" no placar abre as regras completas e a tabela de pontos, só na hora da cobrança ou antes do apito (nunca no meio de uma defesa, que corre contra o relógio).
- **Desafio por link:** ao terminar, o jogo gera "duvido você me vencer". Quem abre o link defende as cobranças gravadas de quem desafiou e cobra contra o goleiro da máquina. No fim, placar dos dois lado a lado. **Boneco de quem chamou (desde 06/11/2026, seção 14.5, "Boneco em campo"):** as cobranças gravadas de quem chamou são batidas pelo boneco dele, nas cores do time dele; quando quem aceitou cobra, é o boneco de quem aceitou. O placar do resultado (pênaltis e Lances) ganha o busto de cada um ao lado do apelido, e o convite na Home, o busto de quem chamou. Sem boneco ou com o interruptor "Meu boneco em campo" de quem chamou desligado: batedores sorteados e nenhum busto. O boneco é buscado na hora (`ver_desafio` e `ver_desafio_lances`), nunca gravado no desafio. **Cada X1 vale uma vez por pessoa (decidido em 05/11/2026):** abrir de novo um X1 já jogado vira partida normal contra a máquina, valendo, com o aviso "Esse X1 você já jogou. Vai uma partida nova!" (ver "Anti-trapaça").

### Pênaltis dentro dos Lances (decidido em 21/10)
- Os pênaltis viram uma **sessão dos Lances do Jogo** (seção 7.3): na Home, o card dos Lances ocupa o lugar dos Pênaltis. Desde domingo 08/11/2026, o card abre a tela única da seção 14.7, e as disputas históricas ficam no filtro **Pênaltis**, sem a Disputa livre. O convite de X1 por link continua indo direto para a partida. *Histórico: de 21/10 a 07/11, o card abria um hub de 3 abas, e a aba Pênaltis tinha a Disputa livre contra a Máquina.*
- **Visual:** os Pênaltis continuam com a cena de TV de hoje (decidido em 21/10); a câmera 3D é só das faltas e do cara a cara.
- **Replay de TV (decidido em 26/10):** golaço de quem cobra (no ângulo, cavadinha ou raspando a trave) ganha um replay de uns 3 s, de trás do gol e em câmera lenta, com a câmera 3D por cima da cena de TV. Nos Lances, todo gol ganha replay. Toque pula. Só desenho: o lance já foi resolvido (gesto + semente), nada muda em pontos, tempo de partida no servidor ou detecção. Sem replay com movimento reduzido. Detalhes em `docs/visual.md`, seção 4.2.
- **Disputas históricas:** disputas de pênaltis que o clube **venceu**, com o adversário de verdade já escolhido (nome, artigo e cores, sem escudo) e a ficha do jogo ("Final de 2018: foi 4 x 3. E hoje?"). Os chutes **não** são pré-definidos: o formato é o de hoje (semente, goleiro e batedor da máquina, morte súbita, par ou ímpar).
- Cada torcedor vê as disputas **do time do coração** e as da **Seleção Brasileira** (pelo menos 2, para todo mundo). Meta: 3 por clube; clube com menos disputas marcantes é completado pelas da Seleção.
- **Sem Disputa livre desde domingo 08/11/2026 (decisão do Kauê em 05/11/2026, seção 14.7; até 07/11 ela valia pontos, sem troféu):** nos Lances do Jogo ficam só itens históricos (disputas do catálogo, faltas e cara a cara), todos com troféu. Quem é de "Outro time" joga as da Seleção (o filtro de clube abre nela) e as dos outros clubes.
- **Só cenário:** motor, dificuldade da semana, detecção e desafio por link não mudam. A partir de 08/11/2026 os pênaltis entram nas 3 melhores de Lances do dia, com a tabela e o limite da seção 14.7 (abaixo, em "Pontuação"). A partida guarda qual disputa foi jogada (`disputa_id`), para a ficha, o card e as medalhas.
- Adversários de fora da Série A (outras divisões e clubes estrangeiros) ganham cadastro próprio: nome, artigo e cores.
- **Como está no código (31/10/2026, primeira etapa):**
  - **Catálogo:** `dados/disputas/` (formato e conferência no `README.md` da pasta; validado por `npm test`), com o mesmo caminho dos lances: nasce `rascunho`, uma segunda sessão confere, e `npm run catalogo-disputas` gera `src/dados/disputas.ts` só com `revisada` ou `ativa`. Sem nenhuma revisada, a aba mostra "Em breve".
  - **Tela:** a aba Pênaltis lista as do time do coração e as da Seleção, da mais nova à mais antiga. Tocar abre a ficha e "Jogar essa disputa". Na partida, o placar mostra o adversário de verdade, o narrador abre com a frase de sempre e a chamada entra embaixo ("Final de 2018: foi 4 x 3. E hoje?"). O resultado lembra o placar de verdade e "Mais uma" repete a mesma disputa.
  - **Uniformes:** como nos Lances (seção 3): adversário nas cores dele, sempre em camiseta lisa. Na disputa da Seleção, o placar e o batedor são da Seleção, a arquibancada fica verde e amarela (seção 7.3), e os pontos continuam indo para o time do coração.
  - **Só cenário no servidor:** `nova-partida` grava `disputa_id` (coluna nova, sem chave estrangeira, porque o catálogo mora no código). A coluna não entra em pontos, teto ou detecção. **Só vale id do catálogo** (desde 05/11/2026; o catálogo vai para as funções pelo `npm run compartilhar`, e uma disputa inventada abriria medalhas sem fim na vitrine): fora dele, a partida é recusada (400 `disputa_obrigatoria`, conferido também na `penaltis_comecar`; até 07/11 virava livre, sem erro). Partida sem disputa nem X1 (link ou atalho velho) abre a tela única no filtro Pênaltis. **Catálogo novo de disputas:** publicar a `nova-partida` antes do site, senão a disputa nova é recusada. O desafio gerado por uma disputa é o de sempre, e **no X1 a partida de quem aceita grava a disputa de quem chamou** (decidido em 05/11/2026, antes e depois do corte): joga no cenário dela e a medalha vai para ela. `ver_desafio` e a resposta da `nova-partida` devolvem o id.
  - **Adversários:** `src/dados/adversarios.ts` guarda nome, artigo e cores, e serve aos Lances também. O teste barra adversário sem cadastro.
  - **Card:** não muda nesta etapa.
  - **Medalhas de disputa:** a trilha 10 · 50 · 100 (seção 7.3, "Medalhas e Conquistas") aparece já na tela de antes, desde 05/11/2026.
  - **Em desenvolvimento:** `?disputasFalsas` enche a lista com disputas de mentira, para testar a tela sem publicar nada.

### Regras de implementação (etapa 2, 18/10/2026)
- **Ordem:** alterna cobrança e defesa (C, D, C, D…), 5 de cada. Se empatar, vai para o desempate (abaixo).
- **Gesto de cobrança** (inteiros, é o que vai para o servidor): `dir` −100..100, `forca` 0..100, `efeito` −100..100.
  - Direção: a linha do arraste prolongada até o gol define o canto.
  - Força: arrastar da bola até o meio do gol ≈ 70 (meia altura). Abaixo de 32 a bola sai rasteira e fraca (o goleiro pega se acertar o lado). Acima de ~90 vai no travessão ou por cima.
  - Efeito: o quanto o último terço do arraste dobra; desloca a bola até 0,3 de meia-largura do gol.
  - **Cavadinha:** arraste curtinho (força 8–24) e reto (|dir| ≤ 30). Entra, a não ser que o goleiro fique no meio.
  - **Ângulo:** bola com |x| > 0,78 e altura > 0,72. Mesmo com o goleiro no canto certo, ele só pega 35% das vezes.
  - **Trave e gol** (só muda a narração): gol com |x| > 0,95 ou altura > 0,95.
- **Narrador e tamanho:** frase de lance, fim, desempate ou desafio que passar de 75 caracteres depois da troca (ex.: apelido de 20 letras repetido) é pulada, como frase com variável faltando.
- **Goleiro da máquina:** lê o chute com chance de 12% (segunda) a 36% (domingo), mais 40% em bola fraca. Quando não lê, pula numa zona sorteada.
- **Defesa:** a máquina sorteia 1 das 6 zonas. A dica (pé de apoio) aponta a coluna certa em 85% das vezes na segunda e 50% no domingo. Acertar a zona = defesa; acertar a coluna com a altura errada = 40% de chance. A máquina erra (manda pra fora) 8% das cobranças, e isso não conta como defesa.
- **Dificuldade:** vai de 0 (segunda) a 1 (domingo), pelo horário de Brasília. O tempo para reagir na defesa cai de 1,9 s para 1,2 s depois da corrida. Com servidor, a dificuldade é a do dia em que **o servidor** emitiu a semente, nunca a do relógio do celular.
- **Determinismo:** cada cobrança e cada defesa usa um sorteio próprio, derivado de (semente do lance, tipo, índice). Por isso a defesa não depende das cobranças, e o plano do batedor pode ser calculado antes. Partida valendo tem uma semente por lance (ver "Anti-trapaça"); o treino no celular, que não vale pontos, usa uma só. O motor fica em `src/jogo/penaltis.ts`, sem DOM, relógio, `Math.random` nem trigonometria.

### Desempate
1. Se, depois das 5 cobranças e 5 defesas, o placar estiver empatado: **morte súbita**. Uma cobrança e uma defesa por rodada, na mesma ordem da partida. Quem marcar enquanto o outro erra vence. No máximo 3 rodadas.
2. Se ainda estiver empatado: **par ou ímpar contra o narrador**. O jogador escolhe par ou ímpar e um número de 0 a 5; o narrador mostra o dele; a soma decide.
3. O número do narrador é decidido **no servidor**, com um segredo que o celular não conhece, e só é revelado depois que o jogador escolhe. A tela mostra "o narrador tá pensando…" enquanto espera.
4. Toda disputa termina com vencedor. Não existe mais resultado de empate.
5. **No desafio por link:** quem desafiou gravou só as cobranças da partida dele. Se faltar cobrança gravada na morte súbita, **o batedor da máquina bate no lugar**. O par ou ímpar continua sendo contra o narrador.

### Pontuação
| Ação | Desde 08/11/2026 (seção 14.7) | Até 07/11/2026 |
|---|---|---|
| Gol | 7 | 10 |
| Gol no ângulo | +4 | +5 |
| Cavadinha que entra | +6 (e narração especial) | +10 |
| Defesa | 7 | 10 |
| Vitória na disputa (também na morte súbita ou no par ou ímpar) | +15 | +20 |
| 5 de 5 (cobranças ou defesas) | +10 | +25 |
| Máximo da partida | 136 (guarda de 150 no fechamento) | 220 |

- A tabela sai da **hora em que a partida foi criada** no servidor; partida fechada nunca muda.
- Gols e defesas da morte súbita valem os pontos normais. O bônus de 5 de 5 olha só as 5 primeiras cobranças e as 5 primeiras defesas.
- **Limite (desde 08/11/2026):** 10 partidas de Lances valendo por dia, somando pênaltis, faltas e cara a cara, contadas ao começar (o X1 recebido conta). Passou do limite, a partida vira treino. Antes, os pênaltis não tinham limite do dia.
- **X1 na virada:** um desafio criado antes de 08/11 não pode ser aceito depois ("desafio_expirado"), porque os pontos estão em outra tabela.

### Anti-trapaça
- O servidor sorteia as sementes da partida (e guarda a dificuldade do dia). O cliente manda só os **gestos** (direção, força, efeito, zona escolhida).
- O servidor recalcula o resultado com a mesma física determinística e é ele que grava os pontos.
- Limite de partidas por minuto por jogador. Cada semente vale para uma partida só e expira.
- **Lance a lance (27/10/2026, fecha o risco da semente):** até aqui o celular recebia a semente antes de jogar, e quem lesse o código previa o canto do goleiro e se a dica do pé de apoio era verdadeira. Agora a semente é segredo do servidor:
  - O celular manda o gesto de **um lance** para a função `lance-penalti` e recebe o resultado daquele lance. Depois de cada cobrança vem só a **dica** da próxima defesa; o canto do batedor e o "erra" só saem depois que o jogador escolhe a zona. A espera cabe no pé encontrando a bola (a bola só sai quando o resultado chega).
  - Os gestos ficam guardados no servidor (`partidas_segredo`), um lance por vez, na ordem da regra (lance repetido ou fora de ordem é recusado). No fechamento valem os gestos guardados; do celular só entra a escolha do par ou ímpar.
  - **Desafio por link:** as cobranças gravadas de quem desafiou também ficam no servidor (antes chegavam ao celular de quem aceitava).
  - O celular não lê mais a coluna da semente na tabela de partidas.
  - **Caiu a conexão no meio:** a partida continua no celular, com um sorteio próprio, e fica **sem valer pontos** ("Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.", com o código do motivo numa linha pequena e cinza embaixo, ver seção 7.3).
  - A detecção de partidas impossíveis (abaixo) continua ligada.
- **Uma semente por lance (03/11/2026):** o resultado de uma cobrança volta exato ao celular (ponto da bola e goleiro), porque a tela precisa dele para desenhar. Quem conhece o gesto que mandou tira dali o tremor sorteado e, testando as 2^32 sementes possíveis (uns 2 minutos num computador), achava a semente da partida. Com ela previa o canto do batedor em todas as defesas e o goleiro nas cobranças seguintes. A revisão dos Lances do Jogo achou o problema lá e a correção veio para cá:
  - A `nova-partida` sorteia **uma semente para cada cobrança e cada defesa** (8 + 8, para caber a morte súbita), guardadas só em `partidas_segredo.sementes`. A semente achada pelo resultado é a de um lance já jogado e não diz nada dos outros. A dica da defesa sai da semente daquela defesa, que vale 1 em 3 colunas e não basta para achá-la.
  - **Por que não arredondar o resultado:** cada cobrança arredondada ainda entrega uns 11 bits do sorteio, e 5 cobranças somam mais que os 32 da semente. Arredondar só ajudaria junto com a semente por lance. Um segredo maior (128 bits) também resolveria, mas pediria uma função de hash no motor; a semente por lance usa o mesmo motor e é o que os Lances já fazem.
  - **Partidas antigas não mudam:** `sementes` vazia é partida criada antes da mudança, e o servidor refaz com a semente única de sempre (`partidas.semente`). Nas novas, `partidas.semente` continua sendo preenchida, mas não é usada.
  - **Desafio por link:** nada muda no que é guardado. As cobranças gravadas de quem desafiou seguem a semente de cada defesa de quem aceita.
  - O número do narrador no par ou ímpar já era um segredo separado.
  - **Ordem de publicação:** a migração primeiro, depois `lance-penalti` e `fechar-partida`, e a `nova-partida` por último. Ao contrário, uma partida aberta na janela seria mostrada com uma semente e recalculada com outra. Pelo mesmo motivo, essas duas não voltam à versão anterior depois que houver partidas com sementes por lance.
- **X1 uma vez por pessoa (decidido pelo Kauê em 05/11/2026):** no X1 recebido, a bola de cada defesa vai para a zona da cobrança gravada (o tremor é pequeno), e a resposta de cada defesa mostra essa zona. Quem jogava o mesmo código de novo já sabia onde viriam as 5 cobranças e defendia todas. Isso acontecia até sem querer, pelo botão Revanche, que repetia o mesmo X1. O X1 da Prova já valia uma vez por pessoa (`desafio_ja_jogado` na função `prova`).
  - **No servidor:** `penaltis_comecar` (migração `20261105200000_x1_penaltis_uma_vez.sql`) recusa com `desafio_ja_jogado` (409 na `nova-partida`) quem já começou uma partida com aquele código. Conta qualquer partida começada, fechada ou não, porque as zonas aparecem lance a lance, e também as de antes da mudança. A conferência fica dentro da trava por torcedor, para dois pedidos ao mesmo tempo não abrirem duas partidas com o mesmo código. A recusa não grava partida nem gasta o limite do dia.
  - **No celular:** com `desafio_ja_jogado`, a tela pede uma partida normal, valendo, e a abertura mostra "Esse X1 você já jogou. Vai uma partida nova!" embaixo da frase do narrador. O botão Revanche depois de um X1 abre direto uma partida nova contra a máquina (na disputa histórica, continua repetindo a disputa). Em desenvolvimento, `?penaltiFalso&x1JaJogado&d=abcdefgh` mostra o aviso.
  - **Celular com a versão antiga do site:** o X1 repetido (pelo link ou pela Revanche) vira partida sem valer pontos, com o aviso de conexão e o código `desafio_ja_jogado`. O primeiro X1 de cada código não muda.
  - **Risco aceito:** uma segunda conta que grava as cobranças em zonas escolhidas e manda o código para a principal. Cada X1 armado custa uma partida inteira na outra conta, e na regra de 08/11 só as 3 melhores partidas do dia contam (seção 14.7). As defesas contra cobrança gravada continuam fora da detecção (abaixo).
  - **Ordem de publicação:** esta migração depois da `20261105100000_lances_unificados.sql` (PR #108), e a `nova-partida` com o `desafio_ja_jogado` depois das duas. Com a `nova-partida` do PR #108 no ar e esta migração aplicada, o X1 repetido volta como erro 500 e o celular joga sem valer pontos.

### Como está no servidor (bloco B, 19/10/2026)
- **Limites:** 3 partidas criadas por minuto por torcedor; a semente expira em 15 minutos. Ajustáveis na tabela `config_deteccao`. Desde a migração `20261105100000`, a `nova-partida` começa a partida pela `penaltis_comecar` (uma transação, com a mesma trava por torcedor dos Lances), que aplica também o limite do dia a partir de 08/11 (seção 14.7).
- **Detecção** (aprovada em 19/10/2026), a cada partida fechada, olhando o histórico do torcedor:
  - **Defesas:** nas últimas 30 defesas contra o batedor da máquina com chute no gol, 27 ou mais defendidas.
  - **Cobranças:** nas últimas 40 cobranças em que o goleiro pulou por sorteio (sem "ler"), nenhuma no canto dele.
  - Partida marcada fica **sob suspeita**, fora do ranking até revisão. Números ajustáveis em `config_deteccao`.
  - **Revisão (decidido em 26/10/2026):** as partidas sob suspeita de todos os minigames (pênaltis, Prova de Boleiro, Time do Dia e, desde 03/11/2026, Lances do Jogo) entram na fila **"Partidas sob suspeita" do painel `#admin`**, com o motivo, os pontos e o histórico do torcedor (só o começo do id, sem apelido). **Liberar** devolve a partida ao teto, ao recorde e ao ranking; **Manter fora** tira da fila e ela segue sem contar. Sem revisão, continua fora. Semana já confirmada (segunda 12h) não reabre: liberada depois disso, a partida volta para a pessoa (teto, recorde, posição), mas o ranking das torcidas daquela semana fica como estava.
- **Par ou ímpar:** o número do narrador é sorteado no servidor quando a partida começa e fica numa tabela que o celular não lê. Só sai na resposta do fechamento, depois da escolha.
- **Desafio por link:** toda partida normal registrada gera um código (`?d=xxxxxxxx`) com as cobranças gravadas. Vence o desafio quem fizer **mais pontos**; empate em pontos fica com quem desafiou (chegou primeiro). Partida de desafio não gera outro desafio. O botão **Revanche** é uma partida nova contra a máquina, também depois de um X1, que vale uma vez por pessoa (desde 05/11/2026; antes, repetia o mesmo X1). Na disputa histórica, repete a disputa.
- **Ranking da semana:** time sem nenhum torcedor ativo fica com 0. A "torcida emprestada" (vagas a 80% da média geral) só completa time que já tem gente jogando.
- **Rival "colado":** diferença de até 4 pontos na média dos 30 melhores (≈ 2 partidas boas de uma pessoa do top 30).
- **Horário de Brasília:** UTC−3 fixo (sem horário de verão desde 2019).

### Card de resultado
- **Emojis básicos (decidido em 20/10):** nos textos de compartilhamento só emojis antigos e universais (sem seletor de variação nem quadrados coloridos), para não quebrar no WhatsApp. Só o texto usa emoji: a imagem de todos os jogos é o card "Telão do estádio" (seção 9), com a escada, as bolinhas e os acertos desenhados.
- Imagem gerada no próprio celular: placar no telão, arquibancada do time, frase do narrador, "+47" e "Fulano {pro_time}" (com o artigo certo; sem apelido, "Fiz 47 pontos {pro_time}") e o link do desafio.
- Botões: WhatsApp, stories (via compartilhamento nativo), placar em emoji, copiar link.
- **Botão principal do resultado:** "MAIS UMA" depois de vitória e "REVANCHE" depois de derrota (decidido em 19/10). O que o botão faz não muda.

