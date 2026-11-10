# Pênaltis ("Disputa de pênaltis")

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

Os pênaltis são uma sessão dos Lances do Jogo (`jogos/lances.md`): o card dos Lances na Home abre a tela única, e as disputas históricas ficam no filtro **Pênaltis**. Limite do dia, as 3 melhores do dia, troféus e desafio por tela estão em `jogos/lances.md`; aqui ficam o motor, os pontos, o desempate e as disputas.

## Regra

### Como joga
- **Cobrar (5 cobranças):** deslizar o dedo na direção do gol. Direção do arraste = canto, comprimento = força, curva no fim do arraste = efeito. Força demais vai por cima, de menos o goleiro pega.
- **Defender (5 defesas):** o batedor corre; antes do chute aparece uma "dica" no corpo dele (o pé de apoio). A pessoa toca em uma de 6 zonas do gol para pular.
- **Ordem:** alterna cobrança e defesa (C, D, C, D…), 5 de cada. Empatou, vai para o desempate.
- Contra o goleiro e o batedor da máquina (a dificuldade sobe ao longo da semana, igual para todos).
- **Regras na tela:** sem resumo antes do apito (quem chega aprende no aquecimento, `jogos/aquecimento.md`). O "?" no placar abre as regras e a tabela, só na hora da cobrança ou antes do apito, nunca no meio de uma defesa.
- **Visual:** cena de TV (a câmera 3D é só dos Lances). Golaço de quem cobra (ângulo, cavadinha ou raspando a trave) ganha replay de uns 3 s; ver `docs/visual.md`, seção 4.2.

### Disputas históricas
- Disputas de pênaltis que o clube **venceu**, com o adversário de verdade já escolhido (nome, artigo e cores, sem escudo) e a ficha do jogo ("Final de 2018: foi 4 x 3. E hoje?"). Os chutes **não** são pré-definidos: o formato é o de sempre (semente, goleiro e batedor da máquina, morte súbita, par ou ímpar).
- Cada pessoa vê as disputas **do time do coração** e as da **Seleção Brasileira** (pelo menos 2, para todo mundo). Meta: 3 por clube; clube com menos disputas marcantes é completado pelas da Seleção. "Outro time" joga as da Seleção (o filtro de clube abre nela) e as dos outros clubes.
- **Sem Disputa livre:** só itens históricos. Partida de pênaltis valendo sem disputa do catálogo é recusada (400 `disputa_obrigatoria`, conferido também na `penaltis_comecar`) e o celular joga sem valer pontos. Partida sem disputa nem desafio (link ou atalho velho) abre a tela única no filtro Pênaltis.
- **Troféu** por disputa: 10 · 50 · 100 gols, ouro com 10 vitórias (`jogos/lances.md`).
- **Uniformes:** adversário nas cores dele, camiseta lisa (`jogo.md`, seção 3). Na disputa da Seleção, placar e batedor são da Seleção, a arquibancada fica verde e amarela, e os pontos vão para o time do coração. A ficha pode citar o goleiro pelo nome, como fato (`jogos/lances.md`, Catálogo).
- **Tela:** o placar mostra o adversário, a chamada entra embaixo da frase do narrador, o resultado lembra o placar de verdade e "Mais uma" repete a mesma disputa. Sem nenhuma revisada, a aba mostra "Em breve".

### Gesto e física
- **Gesto de cobrança** (inteiros, vai ao servidor): `dir` −100..100, `forca` 0..100, `efeito` −100..100.
  - **Direção:** a linha do arraste prolongada até o gol define o canto.
  - **Força:** da bola ao meio do gol ≈ 70. Abaixo de 32 a bola sai rasteira e fraca (o goleiro pega se acertar o lado). Acima de ~90 vai no travessão ou por cima.
  - **Efeito:** o quanto o último terço do arraste dobra; desloca a bola até 0,3 de meia-largura do gol.
  - **Cavadinha:** arraste curtinho (força 8–24) e reto (|dir| ≤ 30). Entra, a não ser que o goleiro fique no meio.
  - **Ângulo:** bola com |x| > 0,78 e altura > 0,72. Mesmo com o goleiro no canto certo, ele só pega 35% das vezes.
  - **Trave e gol** (só muda a narração): gol com |x| > 0,95 ou altura > 0,95.
- **Goleiro da máquina:** lê o chute com chance de 12% (segunda) a 36% (domingo), mais 40% em bola fraca. Não lendo, pula numa zona sorteada.
- **Defesa:** a máquina sorteia 1 das 6 zonas. A dica aponta a coluna certa em 85% das vezes na segunda e 50% no domingo. Acertar a zona = defesa; a coluna certa com a altura errada = 40% de chance. A máquina erra (manda pra fora) 8% das cobranças, e isso não conta como defesa.
- **Dificuldade:** de 0 (segunda) a 1 (domingo), pelo horário de Brasília. O tempo para reagir na defesa cai de 1,9 s para 1,2 s depois da corrida. Com servidor, é a do dia em que **o servidor** emitiu a semente, nunca a do relógio do celular.
- **Determinismo:** cada cobrança e defesa usa um sorteio próprio, derivado de (semente do lance, tipo, índice). O motor fica em `src/jogo/penaltis.ts`, sem DOM, relógio, `Math.random` nem trigonometria.
- **Narrador:** frase que passar de 75 caracteres depois da troca (ex.: apelido de 20 letras repetido) é pulada, como frase com variável faltando.

### Desempate
1. Empate depois das 5 cobranças e 5 defesas: **morte súbita**. Uma cobrança e uma defesa por rodada, na mesma ordem. Quem marcar enquanto o outro erra vence. No máximo 3 rodadas.
2. Ainda empatado: **par ou ímpar contra o narrador**. A pessoa escolhe par ou ímpar e um número de 0 a 5; o narrador mostra o dele; a soma decide.
3. O número do narrador é sorteado **no servidor**, num segredo que o celular não lê, e só é revelado depois da escolha ("o narrador tá pensando…").
4. Toda disputa termina com vencedor.
5. **No desafio por link:** quem desafiou gravou só as cobranças da partida dele; se faltar cobrança gravada na morte súbita, **o batedor da máquina bate no lugar**. O par ou ímpar continua contra o narrador.

### Pontuação
| Ação | Pontos |
|---|---|
| Gol | 7 |
| Gol no ângulo | +4 |
| Cavadinha que entra | +6 (e narração especial) |
| Defesa | 7 |
| Vitória na disputa (também na morte súbita ou no par ou ímpar) | +15 |
| 5 de 5 (cobranças ou defesas) | +10 |
| Máximo da partida | 136 (guarda de 150 no fechamento) |

- Gols e defesas da morte súbita valem os pontos normais. O bônus de 5 de 5 olha só as 5 primeiras cobranças e as 5 primeiras defesas.
- A tabela sai da **hora em que a partida foi criada** (`jogos/lances.md`, Data de corte); partida fechada nunca muda.
- **Limite:** as partidas entram nas 10 do dia dos Lances e nas 3 melhores do dia (`jogos/lances.md`). Passou, a partida vira treino. O desafio criado antes de 08/11/2026 não pode ser aceito (`desafio_expirado`), porque os pontos estão em outra tabela.

### Desafio por link
- Toda partida normal registrada gera um código (`?d=xxxxxxxx`) com as cobranças gravadas: "duvido você me vencer". Quem abre defende as cobranças gravadas de quem desafiou e cobra contra o goleiro da máquina. No fim, placar dos dois lado a lado.
- Vence quem fizer **mais pontos**; empate fica com quem desafiou. Partida de desafio não gera outro desafio.
- **Boneco de quem chamou** (`jogos/boneco-montavel.md`): as cobranças gravadas são batidas pelo boneco dele, nas cores do time dele; quando quem aceitou cobra, é o dele. O placar do resultado (pênaltis e Lances) ganha o busto de cada um ao lado do apelido, e a tela do convite, o de quem chamou. Sem boneco, ou com "Meu boneco em campo" desligado: batedores sorteados e nenhum busto. O boneco é buscado na hora (`ver_desafio`, `ver_desafio_lances`), nunca gravado no desafio.
- **Convite (tela `convite`, `jogos/contas.md` "Primeiro acesso"):** placa quase preta com filete na cor do time de quem chamou e o busto dele. "{apelido ou Alguém} ({time}) fez {pontos} pontos, {gj} x {gm} contra a máquina.", a ficha da disputa e "Você defende as cobranças de quem te desafiou e bate as suas. Quem fizer mais pontos ganha." Quem é novo toca no time e já aceita.
- **Cada desafio vale uma vez por pessoa** (a bola de cada defesa vai para a zona da cobrança gravada, então repetir mostraria onde viriam as 5 cobranças). Abrir de novo um desafio já jogado vira partida normal contra a máquina, valendo, com "Esse desafio você já encarou. Bora outro!" embaixo da frase do narrador. O desafio da Prova já valia uma vez por pessoa (`desafio_ja_jogado` na função `prova`).
- **Onde quem chamou bateu** (só no resultado do desafio recebido, nunca antes: as cobranças gravadas são o alvo das defesas). Sai de `resultado.defesas`, só as contra a cobrança gravada (as da máquina na morte súbita não entram). Na dobra, abaixo da linha do duelo, uma bolinha por cobrança (amarela com mão = pegou; clara com bola = entrou; tracejada com xis = pra fora) e "Você pegou N das M cobranças". Nos detalhes, na placa "Desafio": "Onde {apelido ou quem te chamou} bateu" e o gol visto de trás de quem bate, com as 6 zonas e as marcas numeradas de cada cobrança (as de fora embaixo do gol). Sem link de replay de pênalti: o convite dos pênaltis não muda (`docs/visual.md` 4.6).
- **Jogo de volta** é uma partida nova contra a máquina, também depois de um desafio; na disputa histórica, repete a disputa.
- **Desafio recebido:** a pessoa joga a disputa de quem chamou (adversário de verdade, ficha, "foi X x Y"), e a medalha vai para a mesma disputa; `ver_desafio` e a resposta da `nova-partida` devolvem o id. Desafio que não vale (expirado, já jogado, próprio) vira partida normal **da disputa daquele desafio**, ou da primeira do time, ou da Seleção.
- **Prazo:** todo desafio (pênaltis, Lances e Prova) vale **7 dias** desde a criação. Vencido, quem abre recebe 410 `desafio_expirado` (conferido no banco, na mesma trava de quem começa a partida; na Prova, na função `prova`) e joga a partida normal da disputa daquele desafio (na Prova, uma prova normal), com "Apitou o fim: esse desafio valia 7 dias. Bora outro!". `ver_desafio`, `ver_desafio_lances` e `ver_prova_desafio` devolvem `vencido`: a tela do convite vira o aviso, e o jogo ainda lê a disputa ou o lance para a partida normal. Os desafios com mais de **30 dias** são apagados no dia 1º de cada mês, às 4h45 (depois das contas paradas), pela `apagar_desafios_antigos` (só o cron chama; recusa prazo menor que 30 dias e data no futuro), que antes chama `funil_contar_gerados()`; as partidas de quem aceitou ficam.
- **Ordem de publicação do prazo:** 1º a migração, 2º as funções (`nova-partida`, `lances`, `prova`), 3º o site logo em seguida (o site antigo não trata o 410 da Prova).
- **410 `desafio_expirado`** (vencido, lance fora do catálogo ou faixa que desceu) vira partida nova com o aviso acima; **429** joga sem valer pontos, com o aviso do limite.

### Anti-trapaça
- O servidor sorteia as sementes e guarda a dificuldade do dia; o cliente manda só os **gestos** (direção, força, efeito, zona). O servidor recalcula com a mesma física determinística e grava os pontos. Limite de 3 partidas criadas por minuto por torcedor; cada semente vale para uma partida só e expira em 15 minutos (ajustáveis em `config_deteccao`).
- **Lance a lance:** a semente é segredo do servidor. O celular manda o gesto de **um lance** para a função `lance-penalti` e recebe o resultado dele. Depois de cada cobrança vem só a **dica** da próxima defesa; o canto do batedor e o "erra" só saem depois que a pessoa escolhe a zona. Os gestos ficam em `partidas_segredo`, um por vez, na ordem (repetido ou fora de ordem é recusado); no fechamento valem os guardados, e do celular só entra o par ou ímpar. As cobranças gravadas de quem desafiou também ficam só no servidor.
- **Uma semente por lance:** o resultado volta exato ao celular, e dele se achava a semente da partida testando as 2^32 possíveis (uns 2 minutos). Por isso a `nova-partida` sorteia **uma semente por cobrança e por defesa** (8 + 8, para caber a morte súbita), só em `partidas_segredo.sementes`: a achada é de um lance já jogado. Arredondar o resultado não resolveria (cada cobrança entrega ~11 bits). `sementes` vazia é partida antiga, refeita pela `partidas.semente` única.
- **Caiu a conexão no meio:** a partida continua no celular, com sorteio próprio, e **não vale pontos** (aviso e código do motivo em `jogos/lances.md`, Partida).
- **Detecção de partidas impossíveis**, a cada partida fechada, olhando o histórico (números em `config_deteccao`):
  - **Defesas:** nas últimas 30 defesas contra o batedor da máquina com chute no gol, 27 ou mais defendidas.
  - **Cobranças:** nas últimas 40 cobranças em que o goleiro pulou por sorteio (sem "ler"), nenhuma no canto dele.
  - Partida marcada fica **sob suspeita**, fora do ranking até revisão. As suspeitas de todos os minigames (pênaltis, Prova, Time do Dia e Lances) vão para a fila **"Partidas sob suspeita"** do `#admin`, com o motivo, os pontos e o histórico (só o começo do id, sem apelido). **Liberar** devolve a partida ao teto, ao recorde e ao ranking; **Manter fora** tira da fila e ela segue sem contar. Semana já confirmada (segunda 12h) não reabre: a partida liberada depois volta para a pessoa, mas o ranking das torcidas daquela semana fica como estava.
- **Risco aceito (desafio):** uma segunda conta que grava as cobranças em zonas escolhidas e manda o código para a principal. Cada desafio armado custa uma partida inteira na outra conta, e só as 3 melhores do dia contam. As defesas contra cobrança gravada ficam fora da detecção.

### Card de resultado
- **Emojis básicos:** no texto de compartilhamento só emojis antigos e universais (sem seletor de variação nem quadrados coloridos), para não quebrar no WhatsApp; a imagem é o card "Telão do estádio" (`jogos/cards.md`).
- Imagem gerada no celular: placar, arquibancada do time, frase do narrador, "+47" e "Fulano {pro_time}" (sem apelido, "Fiz 47 pontos {pro_time}") e o link do desafio. Botões: WhatsApp, stories, placar em emoji, copiar link.
- **Botão principal:** "MAIS UMA" depois de vitória e "JOGO DE VOLTA" depois de derrota.

## Como está no código
- **Catálogo:** `dados/disputas/` (formato e conferência no `README.md` da pasta; validado por `npm test`). Nasce `rascunho`, uma segunda sessão confere, e `npm run catalogo-disputas` gera `src/dados/disputas.ts` só com `revisada` ou `ativa`. O catálogo vai para as funções pelo `npm run compartilhar`.
- **Adversários:** `src/dados/adversarios.ts` guarda nome, artigo e cores (também dos Lances); adversário de fora da Série A ou estrangeiro ganha cadastro próprio. O teste barra adversário sem cadastro.
- **Servidor:** `nova-partida` começa a partida pela `penaltis_comecar` (uma transação, com a mesma trava por torcedor dos Lances, que aplica o limite do dia) e grava `disputa_id` (sem chave estrangeira, porque o catálogo mora no código; não entra em pontos, teto ou detecção). Só vale id do catálogo: uma disputa inventada abriria medalhas sem fim na vitrine. `penaltis_comecar` recusa com `desafio_ja_jogado` (409 na `nova-partida`) quem já começou uma partida com aquele código (fechada ou não, e as de antes da regra), dentro da trava, sem gravar partida nem gastar o limite do dia. No desafio a partida de quem aceita grava a disputa de quem chamou.
- **Abrir o link (?d=, ?l= e ?p=):** o `index.html` já pede o resumo (`ver_desafio`, `ver_desafio_lances`, `ver_prova_desafio`) por `fetch`, com a chave pública, enquanto o JS baixa; `lerResumo` (`src/servidor/api.ts`) aproveita a resposta uma vez e, se o atalho responder erro, usa o supabase-js. Até a tela do convite resolver (teto de 8 s, o resto da Home e o preaquecer das telas de jogo esperam (`src/telas/primeiraTela.ts`). Peso e tempo de cada entrada no aparelho do Zé: `npm run simular:entradas`.
- **Ranking:** time sem nenhum torcedor ativo fica com 0; a "torcida emprestada" (vagas a 80% da média geral) só completa time que já tem gente jogando. **Rival "colado":** diferença de até 4 pontos na média dos 30 melhores. **Horário de Brasília:** UTC−3 fixo.
- **Ordem de publicação:** catálogo novo de disputas, a `nova-partida` antes do site (senão a disputa nova é recusada). Mudança de semente: a migração, depois `lance-penalti` e `fechar-partida`, e a `nova-partida` por último; essas duas não voltam à versão anterior depois que houver partidas com sementes por lance. Desafio uma vez (`20261105200000_x1_penaltis_uma_vez.sql`): depois da `20261105100000_lances_unificados.sql`, e a `nova-partida` com o `desafio_ja_jogado` depois das duas; sem ela, o desafio repetido volta como erro 500 e o celular joga sem valer pontos. Site antigo com desafio repetido: partida sem valer pontos, com o código `desafio_ja_jogado`.

## Em desenvolvimento
- `?penaltiFalso` (`&limite`, `&x1Expirado`, `&x1JaJogado&d=abcdefgh` mostra o aviso do desafio repetido).
- `?disputasFalsas` enche a lista com disputas de mentira, para testar a tela sem publicar nada.
