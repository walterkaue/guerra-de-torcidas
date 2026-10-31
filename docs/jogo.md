# Guerra de Torcidas — documento do jogo

> Nome provisório. Fonte da verdade do projeto: toda decisão nova entra aqui.
> Última atualização: 31/10/2026 (bloco "Seja sócio" na Casa de cada clube, decidido em 30/10: link para o programa oficial, sem pontos, com aviso de saída e cliques contados no servidor sem dado pessoal; ver seção 7.4). Antes, 26/10/2026 (Carreira do jogador no ar: XP no servidor, bloco na Home, linha no resultado e nível opcional no card). Antes, 26/10/2026 (qualidade gráfica automática Alta/Média/Leve, com botão "Gráficos" no rodapé da Home; só visual, ver `docs/visual.md` 4.3). Antes, 26/10/2026 (replay de TV do gol: todo gol dos Lances e os golaços dos Pênaltis, só visual). Antes, 26/10/2026 (fase 1.5 decidida pelas propostas em `docs/propostas/`: mês de estreia em série única antes da Série A e B, divisões e cidade testadas já na pré-temporada, cidade pedida depois da 1ª partida e só no ranking com 5+ jogadores, 52 semanas pela tabela de 20 posições do ranking geral, Galeria na aba Conquistas, níveis da Carreira com XP que sobrevive ao zerar). Antes, 21/10/2026, noite (Casa do [time] planejada, com dados em rascunho em dados/casa; Lances do Jogo no lugar dos Pênaltis na Home, com 3 abas; câmera 3D com três distâncias; "A jogada" no cara a cara; antes: tela dos Lances do Jogo em teste, sem valer pontos; novo minigame Lances do Jogo, com medalhas e página Conquistas; Pênaltis vão virar uma sessão dos Lances com disputas históricas; nomes reais na ficha factual dos lances)
> Detalhes: `docs/rankings.md` (rankings e regras de justiça), `docs/narrador.md` (frases), `docs/visual.md` (direção visual), `docs/bonecos.md` (bonecos), `docs/casa.md` (Casa do [time]). Ideias ainda não decididas ficam no backlog do projeto no Claude.

## 1. A ideia em uma frase

Minigames de futebol de 30 segundos em que **cada ponto que você faz vai para o placar da sua torcida**, num ranking ao vivo contra os rivais.

## 2. Pilares (o que nunca negociamos)

1. **Partida curta.** Uma rodada cabe numa fila de padaria (30 s a 1 min).
2. **Tribal.** Você não joga por você, joga pelo seu time. Ver o rival na frente é o motor.
3. **Zoeira.** Tom de resenha: narrador exagerado, provocação ao rival, nunca ofensa a pessoas ou grupos.
4. **Feito para WhatsApp.** O link abre direto no navegador do celular, sem cadastro e sem loja de app. Todo resultado vira um card pronto para mandar no grupo ou postar nos stories. Quem quiser pode instalar o jogo na tela inicial (PWA, desde 25/10/2026): mesmo site, sem loja. **Aviso de domingo (push, desde 25/10/2026):** só com opt-in, oferecido depois de um bom momento (vitória que valeu, Time do Dia acertado), no máximo a cada 14 dias e nunca de novo se a pessoa recusou no navegador; **um aviso por semana**, domingo 18h, com a situação da torcida e do rival (texto em `src/jogo/avisos.ts`). **Sininho 🔔 no topo da tela inicial** (desde 26/10/2026): liga, desliga ou explica por que o aparelho não recebe (iPhone fora do app instalado, navegador embutido do WhatsApp/Instagram, notificação bloqueada); aceso quando o aviso está ligado. **Testado em 25/10/2026:** chega no Google Chrome (computador e Android, inclusive como app instalado); no **Opera/Opera GX** a inscrição funciona mas o aviso não chega, e o sininho avisa isso; no iPhone, só com o jogo instalado na tela inicial. Nenhum dado pessoal: só o endereço de entrega do navegador.
5. **Cresce por minigames.** Os minigames mudam; a torcida, o ranking e as ligas ficam e acumulam.
6. **Zero aposta.** Nenhum minigame envolve dinheiro, prêmio em dinheiro, odds ou qualquer coisa que pareça casa de aposta. Nem anúncio de aposta.
7. **Justo.** Título se ganha por média, não por tamanho de torcida; ninguém compra vantagem; evento não distorce o ranking.

## 3. Torcidas (times)

### Times oficiais
- Os clubes da Série A 2026, mais "Outro time".
- **Só nome, cores e artigo (o/a).** Nada de escudo, uniforme oficial, mascote, hino ou foto de jogador. O artigo serve para o narrador acertar "do"/"da", "pro"/"pra".
- **Camiseta lisa:** os batedores vestem uma camiseta lisa nas 2 cores do time, sem escudo, listras, patrocínio ou qualquer desenho que imite a camisa oficial. Há o **uniforme 1** (camiseta na cor 1) e o **uniforme 2** (cores invertidas), sorteado a cada partida. Se os dois times em campo ficarem parecidos, o adversário troca de uniforme (decidido em 19/10).
- **Card do time (tela de escolha e onde mais o time aparecer em bloco), decidido em 20/10: "faixa de placar".** Cor 1 cheia, sem transparência; embaixo, uma faixa reta na cor 2 (cerca de 1/4 da altura); nos clubes de três cores, um filete da 3ª cor separando as duas. Nome em Barlow Condensed, caixa alta, cor de texto pelo `corDeTexto`. O mesmo desenho para todos os clubes: **nenhum padrão que imite a camisa** (listras na direção da camisa, faixa diagonal, estrelas ou outro elemento de escudo). Quem diferencia os clubes é a cor e o nome. Substitui as listras diagonais translúcidas, que deixavam as cores com cara de pastel.
- **Única exceção (decidida em 21/10):** o manto desenhado no bloco de cores da **Casa do [time]**, com o padrão tradicional (listras, aros, faixa) e sem escudo, símbolo, patrocínio ou fornecedor (`docs/casa.md`, seção 5). Card do time, bonecos e cards de compartilhamento continuam como acima.
- **Goleiros:** camiseta lisa num tom forte de goleiro (amarelo, verde-limão, ciano, rosa ou lilás), escolhido para contrastar com os dois times e com o outro goleiro.
- **Jogadores fictícios:** nenhum boneco imita jogador real, nem por número, tom de pele ou cabelo (direito de imagem; decidido em 19/10).
- Cada time pode ter um **rival** cadastrado (o clássico). Sem clássico, vale a regra da seção 8.

| Time | Artigo | Rival | 3ª cor (filete do card) |
|---|---|---|---|
| Athletico-PR | o | Coritiba | — |
| Atlético-MG | o | Cruzeiro | — |
| Bahia | o | Vitória | branco |
| Botafogo | o | Flamengo | — |
| Bragantino | o | sem clássico | — |
| Chapecoense | a | sem clássico | — |
| Corinthians | o | Palmeiras | — |
| Coritiba | o | Athletico-PR | — |
| Cruzeiro | o | Atlético-MG | — |
| Flamengo | o | Fluminense | — |
| Fluminense | o | Flamengo | branco |
| Grêmio | o | Internacional | branco |
| Internacional | o | Grêmio | — |
| Mirassol | o | sem clássico | — |
| Palmeiras | o | Corinthians | — |
| Remo | o | sem clássico | — |
| Santos | o | Corinthians | — |
| São Paulo | o | Palmeiras | preto |
| Vasco | o | Flamengo | — |
| Vitória | o | Bahia | — |

(O rival não precisa ser recíproco: o Botafogo provoca o Flamengo, e o Flamengo provoca o Fluminense.)

### Cidade (a segunda camisa)
- O jogador escolhe a **cidade** onde torce. É opcional, mas a tela incentiva ("defende sua cidade também?"). **Quando (decidido em 26/10):** depois da 1ª partida, não na escolha do time, para não atrasar a estreia. Quem pulou vê um lembrete na Home, no máximo 1 vez por semana. A escolha fica também no perfil.
- A cidade sai de uma **lista fechada de municípios do IBGE** (nome + UF), com busca. Nada de texto livre, então não precisa de moderação.
- Os pontos de cada partida contam **para o time, para a cidade e para o estado da cidade**, em rankings separados. Pontos feitos antes de escolher a cidade não contam para ela (vale dali em diante, como na troca de time).
- **Mínimo de 5 jogadores (decidido em 26/10):** uma cidade só aparece no ranking com 5 ou mais jogadores na semana, para ninguém ser identificado pela pontuação. Abaixo disso, os pontos contam só para o estado, e o jogo avisa quantos faltam ("Faltam 2 pra sua cidade entrar no ranking. Chama a galera.").
- Quem escolheu "Outro time" joga só pela cidade e pelo estado. Assim ninguém fica sem tribo.
- A cidade do jogador **nunca aparece ao lado do apelido**. Ela só aparece somada, nos rankings de cidades e estados (privacidade, inclusive de menores).
- **Rival da cidade:** a cidade logo acima no ranking do seu estado (ou logo abaixo, se for a líder).

### Apelido
- Opcional, até 20 caracteres, passa por um filtro simples de palavras (lista no código) antes de ser gravado no servidor.
- **No MVP nenhum ranking público mostra apelido.** Ele aparece só no card que o próprio jogador compartilha e no desafio que ele manda. Ranking individual (Craque do Dia, Craques da torcida) só depois da moderação da fase 2.

### Troca de time ou cidade
- **Livre por enquanto**, para o pessoal experimentar. Os pontos já feitos ficam onde foram feitos.
- Reavaliar antes da temporada 2027 (a proposta inicial era 1 troca a cada 30 dias).

### Times criados pelos jogadores (fase 2)
- Qualquer um cria um time: cidade, bairro, várzea, escola, turma, empresa, grupo de amigos, outras rivalidades.
- Campos: nome, artigo (o/a), 2 cores, tipo (cidade, várzea, escola, empresa, amigos, outro), cidade/UF opcional.
- Gera link de convite ("entra no time e defende a gente").
- **Fora do lançamento:** partidos políticos e rivalidades políticas (toxicidade e regras eleitorais). Reavaliar quando a moderação estiver rodando.

### Moderação (obrigatória antes de liberar times criados)
- Filtro de palavras em nomes de times e apelidos.
- Proibido: nome de pessoa específica, ofensa racista, homofóbica (incluindo gritos de arquibancada), xenofóbica, misógina ou religiosa.
- Botão "denunciar"; time com X denúncias fica oculto até revisão.
- Painel simples de revisão para o administrador.
- **Escolas:** só nome da escola e da turma, nunca nome de aluno. Sem chat aberto entre jogadores.
- Dados mínimos (LGPD): login anônimo, sem e-mail ou telefone obrigatórios.

## 4. Ligas e campeonatos combinados (fase 2)

- Uma **liga** é um campeonato privado com times dentro. Exemplo: "Colégio X" com as turmas 1ºA, 1ºB, 2ºA…
- Criada por um organizador, com código ou link de convite.
- Dentro da liga aparecem só os times dela, com ranking próprio e divisões próprias (mesma regra da seção 5).
- Os pontos continuam contando também para o time oficial e para a cidade de cada jogador (ele defende o 1ºB, o Corinthians **e** Caraguatatuba, por exemplo).

## 5. Rankings e temporadas

> Detalhe completo, com exemplos e justificativas: `docs/rankings.md`.

### Os quatro relógios (horário de Brasília)

| Relógio | Zera | O que decide |
|---|---|---|
| **Dia** | 00h | Craque do Dia (individual) |
| **Semana** | Segunda 00h | Campeão da semana, Maior torcida da semana, cidades e estados |
| **Temporada** | Todo mês (4 ou 5 semanas fechadas) | Série A e Série B das torcidas: campeão, acesso e rebaixamento |
| **Longo prazo** | Não zera | Ranking de 52 semanas, Galeria de Troféus, Tabela de todos os tempos, Carreira |

Uma partida começada antes da virada conta na semana antiga se terminar até 00h05.

### A semana
| Troféu | Conta | Vale pontos de campeonato? |
|---|---|---|
| **Campeão da semana** | Média dos **30 melhores torcedores** da semana | Sim |
| **Maior torcida da semana** | Soma de todo mundo | Não, é vitrine |

- Torcida com menos de 30 torcedores ativos: as vagas vazias contam como **80% da média geral da semana**.
- **Pontos de campeonato** pela posição na divisão, estilo Fórmula 1: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1.
- **Teto diário:** só as 5 melhores partidas do dia de cada jogador contam, **somando todos os minigames de partida** (pênaltis, quiz). O desafio diário (uma vez por dia), o Crava a Rodada (teto próprio por rodada) e os Lances do Jogo (vale a melhor partida do dia, teto 120; seção 7.3) ficam por fora (decidido em 19/10; Lances em 21/10).

### MVP, antes das divisões
- Enquanto a Série A e a Série B não existem (fase 1.5), o ranking da semana é **um só, com os 20 times**: Campeão da semana (30 melhores) e Maior torcida. Ainda sem pontos de campeonato.
- O "rival sem clássico" é o time logo acima nesse ranking geral (ou logo abaixo, se for o líder).
- Telas que no visual falam em "Série A" mostram esse ranking geral até as divisões nascerem.

### Sua posição e recorde pessoal (decidido em 20/10)
- Para dar a disputa pelo 1º lugar sem ranking público com apelido, cada pessoa vê **só a própria posição** entre todos os torcedores (de qualquer time), calculada no servidor:
  - **Na semana, geral:** "Você é o 3º de 14 torcedores na semana" (soma do que conta no ranking: 5 melhores partidas do dia + Time do Dia + Crava).
  - **Por minigame, na semana:** pela **melhor partida** da semana (pênaltis, Prova de Boleiro, Lances do Jogo), pelos pontos do dia (Time do Dia) e pelos pontos da rodada (Crava, que já tem isso).
  - Empate: fica na frente quem chegou primeiro.
- **Recorde pessoal** de cada minigame (zera junto com a pré-temporada, porque a pontuação pode mudar no balanço): aparece no resultado ("NOVO RECORDE!") e entra no card quando for recorde.
- Onde aparece: Home (posição geral da semana) e tela de resultado de cada minigame (posição naquele minigame + recorde).
- Nunca mostra a lista de outras pessoas nem apelidos. Lista com apelido só com ligas entre amigos e moderação (fase 2).

### Pré-temporada valendo (decidido em 20/10)
- **Até o zerar da pré-temporada, todos os minigames somam no ranking da semana**: pênaltis, Prova de Boleiro (no teto diário), Time do Dia (por fora do teto) e Crava a Rodada (desde a 32ª, ×2 e teto de 300 por rodada). Não há amistoso nem ensaio sem pontos durante a pré-temporada: ela inteira já é um teste e zera antes do lançamento público.
- As telas trocam os selos "Em teste" e "Ensaio" por um aviso único: **"Pré-temporada: tudo vale ponto, mas zera antes do lançamento."**
- **Balanço entre minigames:** os números da pré-temporada são o parâmetro de calibragem (média, mediana e teto por partida de cada minigame; ver seção 11). Ajustes de pontuação saem daí.
- O **amistoso de 2 semanas** (regras de justiça, abaixo) continua valendo para minigames lançados **depois** do zerar.

### A temporada
- Os 20 times oficiais ficam em **Série A (10)** e **Série B (10)**. "Outro time" não entra em divisão.
- Soma dos pontos de campeonato das semanas do mês. No fim: **2 últimos da A caem, 2 primeiros da B sobem**. O campeão da Série A é o campeão da temporada.
- **A semana é do mês da sua segunda-feira** (ex.: 30/11 a 6/12 é de novembro). Dezembro e janeiro seguem normais; a Copa de Verão corre em paralelo.
- **Mês de estreia em série única (decidido em 26/10):** depois do zerar, o primeiro mês tem os 20 times juntos, com pontos pela tabela de 20 posições (abaixo, em Longo prazo). Do 1º ao 10º vão para a Série A; o 1º ganha o troféu **"Campeão da estreia"**. A primeira queda é no 2º mês. (Substitui "a divisão sai da primeira semana de jogo": uma semana só, com a audiência chegando, sortearia a divisão.)
- **Teste na pré-temporada:** as divisões ligam já em novembro, para os amigos testarem tela, queda e narrador, e zeram junto com a pré-temporada.
- **Torcida sem ninguém jogando:** fica com as 30 vagas a 80%; o empate entre elas sai pela posição na semana anterior (no 1º dia, pela ordem da tabela). Empate no fim do mês: mais vitórias de semana; depois, melhor última semana.
- Precisa do **fechamento da semana**: toda segunda às 00h05 o servidor grava a classificação final, que não muda mais. Base também da Galeria e das 52 semanas.

### Cidades e estados
- Mesma conta da semana: média das 30 melhores pessoas da cidade (100 no estado), com as mesmas vagas a 80%.
- Ranking de cidades **por estado**, mais um top nacional. A campeã do estado na semana ganha troféu na Galeria.
- Só cidades com 5+ jogadores na semana (seção 3). Aba **Cidades** no Ranking (seu estado, top nacional, estados); na Home, "Sua cidade está em 3º em SP". Liga já na pré-temporada e zera junto.

### Longo prazo
- **Ordem (decidida em 26/10):** Carreira primeiro (não depende de nada), depois a Galeria (com o fechamento da semana), e as 52 semanas quando a 1ª temporada começar.
- **Ranking de 52 semanas** (estilo tênis): soma das últimas 52 semanas, **pela posição no ranking geral dos 20 times**, não pelos pontos da divisão (senão o 1º da Série B valeria o mesmo que o 1º da A). Tabela de 20 posições (decidida em 26/10; também usada no mês de estreia): 1º 25, 2º 20, 3º 17, 4º 15, 5º 14, do 6º ao 18º de 13 a 1 (um a menos por posição), 19º e 20º 0.
- **Galeria de Troféus** eterna: campeão da semana, campeão da temporada, campeão da B, acesso, rebaixamento, Campeão da estreia, dérbi, meta coletiva, campeã de estado; a Maior torcida numa prateleira à parte, "vitrine". Fica na **aba Conquistas** (junto das medalhas), não na Casa do [time], para troféu do jogo não parecer título real. A pré-temporada não entra.
- **Tabela de todos os tempos:** só vitrine, também na aba Conquistas.
- **Carreira do jogador:** Estreante, Reserva, Titular, Craque, Ídolo, Lenda. **Nunca zera, nem no zerar da pré-temporada** (como as medalhas). Só sua: aparece para você e no card, se quiser; nenhuma lista pública.
  - XP: 10 por partida válida nas 5 primeiras do dia, 5 da 6ª à 15ª, zero depois. Time do Dia e cada rodada palpitada do Crava contam como 1 partida.
  - Níveis: Estreante 0 · Reserva 100 · Titular 1.000 · Craque 5.000 · Ídolo 15.000 · Lenda 30.000 (jogando 5 por dia: Titular em ~3 semanas, Lenda em ~1 ano e meio).
  - Bônus: +100 XP por ser o 1º do dia entre todos; +200 por ser o 1º da sua torcida na semana. Sequência de dias aparece, mas perder não tira nada.
  - **No ar (26/10):** tabela própria no servidor (`carreira_partidas` e `carreira_bonus`), preenchida por gatilhos no fechamento; o celular só lê o próprio XP. O que já foi jogado na pré-temporada entrou na carreira. Detalhes de implementação:
    - Conta como partida válida: pênaltis e Prova fechados sem suspeita (inclusive desafio por link e amistoso), o Time do Dia terminado (acertando ou não) e a rodada do Crava no dia do 1º palpite dela (apagar e palpitar de novo não conta outra vez). Partida que vira suspeita depois não tira XP; suspeita tirada na revisão dá o XP.
    - 1º do dia: soma das partidas no teto + Time do Dia daquele dia (o Crava fica de fora: os pontos saem na confirmação, não no dia do palpite). Calculado às 00h15 do dia seguinte, uma vez só.
    - 1º da torcida na semana: só torcidas oficiais, pelo total do ranking da semana; calculado a partir de terça 00h15 (na segunda até 12h o Crava ainda confirma pontos). Quem liderou duas torcidas na mesma semana (trocou de time) recebe um bônus só. Quando o fechamento da semana gravado existir, passa a ler dele.
    - Home: bloco "Sua carreira" abaixo da grade de jogos (nível, barra, quanto falta, quanto vale a próxima partida de hoje, sequência a partir de 2 dias e o bônus dos últimos 7 dias). Resultado de pênaltis, Prova e Time do Dia: "+10 XP na carreira · Reserva" ou o selo "Subiu pra Titular!". Card: etiqueta "CARREIRA · TITULAR" só com a caixa "Mostrar meu nível nos cards", marcada na Home (guardada no aparelho). A aba Carreira da barra continua "em breve".

### Eventos
- **Evento nunca multiplica pontos do ranking.** Dérbi da semana, metas coletivas, reta final e copas dão **troféu próprio**.

### Regras de justiça (resumo)
- Título por média, vitrine por soma.
- Minigame novo (depois do lançamento público) entra em "amistoso" (sem contar pontos) por 2 semanas, até a pontuação ficar parecida com a dos outros (~60 por partida para uma pessoa mediana, teto ~150). Na pré-temporada não há amistoso (ver acima).
- Partidas de desafio contam dentro do teto diário; defesa só vale contra chute que ia no gol com força mínima (força 32 ou mais, ou seja, não vale defender chute fraco).
- Empate no ranking: fica na frente quem chegou primeiro àquela pontuação.

## 6. Minigame 1 — "Bate Contra Mim" (pênaltis)

### Como joga
- **Cobrar (5 cobranças):** deslizar o dedo na direção do gol. Direção do arraste = canto, comprimento = força, curva no fim do arraste = efeito. Força demais vai por cima, de menos o goleiro pega.
- **Defender (5 defesas):** o batedor corre; antes do chute aparece uma "dica" no corpo dele (o pé de apoio). O jogador toca em uma de 6 zonas do gol para pular.
- Jogo normal: contra o goleiro e o batedor da máquina (dificuldade sobe ao longo da semana, igual para todos).
- **Como jogar:** antes do apito de cada partida aparece um resumo (cobrar, efeito e cavadinha, defender, pontos) com a caixa "Não exibir novamente", guardada só no aparelho. O botão "?" no placar reabre o resumo na hora da cobrança (nunca no meio de uma defesa, que corre contra o relógio).
- **Desafio por link:** ao terminar, o jogo gera "duvido você me vencer". Quem abre o link defende as cobranças gravadas de quem desafiou e cobra contra o goleiro da máquina. No fim, placar dos dois lado a lado.

### Pênaltis dentro dos Lances (decidido em 21/10)
- Os pênaltis viram uma **sessão dos Lances do Jogo** (seção 7.3): na Home, o card dos Lances ocupa o lugar dos Pênaltis. **No ar desde 21/10:** o card "Lances do Jogo" (com a linha de partidas que contam hoje) abre o hub, e a aba **Pênaltis** abre a Disputa livre de sempre, valendo pontos; o voltar da partida leva de volta ao hub. O convite de X1 por link continua indo direto para a partida.
- **Visual:** os Pênaltis continuam com a cena de TV de hoje (decidido em 21/10); a câmera 3D é só das faltas e do cara a cara.
- **Replay de TV (decidido em 26/10):** golaço de quem cobra (no ângulo, cavadinha ou raspando a trave) ganha um replay de uns 3 s, de trás do gol e em câmera lenta, com a câmera 3D por cima da cena de TV. Nos Lances, todo gol ganha replay. Toque pula. Só desenho: o lance já foi resolvido (gesto + semente), nada muda em pontos, tempo de partida no servidor ou detecção. Sem replay com movimento reduzido. Detalhes em `docs/visual.md`, seção 4.2.
- **Disputas históricas:** disputas de pênaltis que o clube **venceu**, com o adversário de verdade já escolhido (nome, artigo e cores, sem escudo) e a ficha do jogo ("Final de 2018: foi 4 x 3. E hoje?"). Os chutes **não** são pré-definidos: o formato é o de hoje (semente, goleiro e batedor da máquina, morte súbita, par ou ímpar).
- Cada torcedor vê as disputas **do time do coração** e as da **Seleção Brasileira** (pelo menos 2, para todo mundo). Meta: 3 por clube; clube com menos disputas marcantes é completado pelas da Seleção.
- **Disputa livre** contra a Máquina continua (é o jogo de hoje): obrigatória para quem é de "Outro time" e para quem só quer bater pênalti.
- **Só cenário:** motor, dificuldade da semana, detecção, desafio por link e pontuação dos pênaltis não mudam, e os pênaltis continuam **dentro** do teto de 5 partidas. A partida guarda qual disputa foi jogada (`disputa_id`), para a ficha, o card e as medalhas.
- Adversários de fora da Série A (outras divisões e clubes estrangeiros) ganham cadastro próprio: nome, artigo e cores.

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
- **Determinismo:** cada cobrança e cada defesa usa um sorteio próprio, derivado de (semente, tipo, índice). Por isso a defesa não depende das cobranças, e o plano do batedor pode ser calculado antes. O motor fica em `src/jogo/penaltis.ts`, sem DOM, relógio, `Math.random` nem trigonometria.

### Desempate
1. Se, depois das 5 cobranças e 5 defesas, o placar estiver empatado: **morte súbita**. Uma cobrança e uma defesa por rodada, na mesma ordem da partida. Quem marcar enquanto o outro erra vence. No máximo 3 rodadas.
2. Se ainda estiver empatado: **par ou ímpar contra o narrador**. O jogador escolhe par ou ímpar e um número de 0 a 5; o narrador mostra o dele; a soma decide.
3. O número do narrador é decidido **no servidor**, com um segredo que o celular não conhece, e só é revelado depois que o jogador escolhe. A tela mostra "o narrador tá pensando…" enquanto espera.
4. Toda disputa termina com vencedor. Não existe mais resultado de empate.
5. **No desafio por link:** quem desafiou gravou só as cobranças da partida dele. Se faltar cobrança gravada na morte súbita, **o batedor da máquina bate no lugar**. O par ou ímpar continua sendo contra o narrador.

### Pontuação
| Ação | Pontos |
|---|---|
| Gol | 10 |
| Gol no ângulo | +5 |
| Cavadinha que entra | +10 (e narração especial) |
| Defesa | 10 |
| Vitória na disputa (também na morte súbita ou no par ou ímpar) | +20 |
| 5 de 5 (cobranças ou defesas) | +25 |

- Gols e defesas da morte súbita valem os pontos normais. O bônus de 5 de 5 olha só as 5 primeiras cobranças e as 5 primeiras defesas.

### Anti-trapaça
- O servidor sorteia a semente da partida (e guarda a dificuldade do dia). O cliente manda só os **gestos** (direção, força, efeito, zona escolhida).
- O servidor recalcula o resultado com a mesma física determinística e é ele que grava os pontos.
- Limite de partidas por minuto por jogador. Cada semente vale para uma partida só e expira.
- **Lance a lance (27/10/2026, fecha o risco da semente):** até aqui o celular recebia a semente antes de jogar, e quem lesse o código previa o canto do goleiro e se a dica do pé de apoio era verdadeira. Agora a semente é segredo do servidor:
  - O celular manda o gesto de **um lance** para a função `lance-penalti` e recebe o resultado daquele lance. Depois de cada cobrança vem só a **dica** da próxima defesa; o canto do batedor e o "erra" só saem depois que o jogador escolhe a zona. A espera cabe no pé encontrando a bola (a bola só sai quando o resultado chega).
  - Os gestos ficam guardados no servidor (`partidas_segredo`), um lance por vez, na ordem da regra (lance repetido ou fora de ordem é recusado). No fechamento valem os gestos guardados; do celular só entra a escolha do par ou ímpar.
  - **Desafio por link:** as cobranças gravadas de quem desafiou também ficam no servidor (antes chegavam ao celular de quem aceitava).
  - O celular não lê mais a coluna da semente na tabela de partidas.
  - **Caiu a conexão no meio:** a partida continua no celular, com um sorteio próprio, e fica **sem valer pontos** ("Caiu a conexão: essa partida não vale mais pontos.").
  - A detecção de partidas impossíveis (abaixo) continua ligada.

### Como está no servidor (bloco B, 19/10/2026)
- **Limites:** 3 partidas criadas por minuto por torcedor; a semente expira em 15 minutos. Ajustáveis na tabela `config_deteccao`.
- **Detecção** (aprovada em 19/10/2026), a cada partida fechada, olhando o histórico do torcedor:
  - **Defesas:** nas últimas 30 defesas contra o batedor da máquina com chute no gol, 27 ou mais defendidas.
  - **Cobranças:** nas últimas 40 cobranças em que o goleiro pulou por sorteio (sem "ler"), nenhuma no canto dele.
  - Partida marcada fica **sob suspeita**, fora do ranking até revisão. Números ajustáveis em `config_deteccao`.
  - **Revisão (decidido em 26/10/2026):** as partidas sob suspeita de todos os minigames (pênaltis, Prova de Boleiro e Time do Dia) entram na fila **"Partidas sob suspeita" do painel `#admin`**, com o motivo, os pontos e o histórico do torcedor (só o começo do id, sem apelido). **Liberar** devolve a partida ao teto, ao recorde e ao ranking; **Manter fora** tira da fila e ela segue sem contar. Sem revisão, continua fora. Semana já confirmada (segunda 12h) não reabre: liberada depois disso, a partida volta para a pessoa (teto, recorde, posição), mas o ranking das torcidas daquela semana fica como estava.
- **Par ou ímpar:** o número do narrador é sorteado no servidor quando a partida começa e fica numa tabela que o celular não lê. Só sai na resposta do fechamento, depois da escolha.
- **Desafio por link:** toda partida normal registrada gera um código (`?d=xxxxxxxx`) com as cobranças gravadas. Vence o desafio quem fizer **mais pontos**; empate em pontos fica com quem desafiou (chegou primeiro). Partida de desafio não gera outro desafio. O botão **Revanche** joga de novo o mesmo desafio; fora do desafio, é uma partida nova contra a máquina.
- **Ranking da semana:** time sem nenhum torcedor ativo fica com 0. A "torcida emprestada" (vagas a 80% da média geral) só completa time que já tem gente jogando.
- **Rival "colado":** diferença de até 4 pontos na média dos 30 melhores (≈ 2 partidas boas de uma pessoa do top 30).
- **Horário de Brasília:** UTC−3 fixo (sem horário de verão desde 2019).

### Card de resultado
- **Emojis básicos (decidido em 20/10):** nos textos de compartilhamento só emojis antigos e universais (sem seletor de variação nem quadrados coloridos), para não quebrar no WhatsApp. Os cards de imagem usam o mesmo fundo "faixa de placar" do card do time.
- Imagem gerada no próprio celular: placar, cores do time, frase do narrador, "Fulano fez 47 pontos {pro_time}" (com o artigo certo) e o link do desafio.
- Botões: WhatsApp, stories (via compartilhamento nativo), placar em emoji, copiar link.
- **Botão principal do resultado:** "MAIS UMA" depois de vitória e "REVANCHE" depois de derrota (decidido em 19/10). O que o botão faz não muda.

## 7. Minigame 2 — "Crava a Rodada" (palpites)

> Nome provisório. Inspirado na rotina de rodada do Cartola e no prode argentino, **sem jogador real e sem nenhuma relação com aposta**.
> **Estreia: ainda nas últimas rodadas do Brasileirão 2026.**

### Como joga
- A cada rodada do Brasileirão Série A, o jogador crava o placar dos jogos que quiser (pode pular jogos).
- Grátis, sem dinheiro e sem prêmio em dinheiro. O que se ganha é ponto para a torcida, posição no ranking e zoeira.
- Só clubes e placares. Nada de escalar jogador real.
- Cada palpite fecha no horário de início do jogo (hora do servidor). Os palpites ficam escondidos até o jogo começar; depois, todo mundo vê como a torcida cravou ("71% cravou vitória do mandante").
- Ranking da torcida e geral na estreia; ligas entre amigos ficam para a fase 2 (ver decisões abaixo).

### Pontuação
| Acerto | Pontos |
|---|---|
| Placar exato | 10 |
| Vencedor e saldo de gols certos (ou empate com outro placar) | 7 |
| Só o vencedor (ou só o empate) | 5 |
| Errou | 0 |
| **Jogo da certeza:** 1 jogo por rodada, escolhido antes do primeiro jogo da rodada | ×2 |

- **Peso na torcida:** os pontos de palpite entram multiplicados por 2, com teto de **300 por rodada** (o mesmo que um dia de minigames).
- Rankings próprios: da rodada, do mês e do Brasileirão inteiro (Palpiteiro do Brasileirão). No MVP, sem apelido: ver decisões abaixo.
- Palpitar contra o próprio time vale normalmente, e o narrador zoa.
- **Sem bônus "Contra a maré" na estreia** (decidido em 18/10): simplifica a regra e, com pouca gente palpitando, a porcentagem não seria confiável. A ideia fica no backlog.

### Decisões para a estreia (19/10/2026)
- **Sem ligas entre amigos na estreia.** Entram na fase 2, junto com as ligas da seção 4.
- **Rankings sem apelido (regra do MVP):** a tela mostra o ranking das torcidas no palpite (média dos 30 melhores palpiteiros de cada time na rodada, com as vagas vazias a 80% como na semana) e, para cada pessoa, só a própria posição ("você é o 37º de 412 na rodada"). Ranking individual público só depois da moderação.
- **Em que semana os pontos entram:** na semana em que o jogo começou (horário de Brasília). Como jogo de domingo à noite é confirmado depois da virada, o **Campeão da semana é confirmado segunda às 12h**; até lá, a semana que fechou aparece como "provisória". Placar confirmado depois disso (raro) entra na semana atual: semana fechada não reabre.
- **Soma no ranking:** os pontos de palpite (×2) somam ao total da semana da pessoa, por fora do teto diário de minigames. O teto de 300 por rodada é aplicado na ordem em que os jogos são confirmados; rodada que atravessa duas semanas reparte os pontos pela data de cada jogo.
- **Fora do amistoso:** o Crava não passa pelas 2 semanas de amistoso; o peso dele já é limitado pela regra própria e o Brasileirão acaba em 2/12.
- **Sem ensaio (mudado em 20/10):** o modo ensaio foi desligado; o Crava **soma no ranking desde a 32ª rodada (23 a 26/10)**, junto com o teste com amigos, como todo o resto da pré-temporada (seção 5). Os pontos da pré-temporada zeram antes do lançamento público.
- **Quem palpita:** todo mundo, em qualquer jogo da rodada, inclusive de time que não é o seu. Quem é de "Outro time" soma no ranking pessoal (e na cidade, quando ela existir).
- **Palpite:** de 0 a 9 gols para cada lado; pode editar até o início do jogo. **Jogo da certeza** pode ser marcado e trocado até o início do primeiro jogo da rodada; depois trava.
- **Jogo adiado:** o palpite fica guardado e reabre até o novo horário. Jogo não disputado até o fim da 38ª rodada é anulado, sem pontos; se era o jogo da certeza, o dobro se perde.
- **Painel do administrador:** página `#admin` com login por e-mail, liberada só para quem está na tabela de administradores (o Kauê). O placar vem do football-data.org e o admin confirma ou corrige; os pontos só são distribuídos na confirmação.
- **Porcentagem da torcida:** aparece depois do início do jogo e só com pelo menos 20 palpites naquele jogo (abaixo disso: "pouca gente cravou esse").
- **Cards:**
  - "Meus palpites" (antes): só os placares cravados e o jogo da certeza, sem porcentagem.
  - "Resultado da rodada" (depois): pontos {pro_time} e uma linha de emoji, um por jogo palpitado: 🎯 exato, ✅ saldo, 👍 vencedor, ❌ errou, com ⭐ logo depois do jogo da certeza.
  - Os dois levam o aviso fixo "Aqui é só resenha".
- **Frases do narrador:** `docs/narrador.md`, seção 9 (versão 1.3).

### Linha vermelha: nada que pareça aposta
- **Aviso fixo** no topo da tela do minigame e no card: **"Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."**
- Palavras proibidas em todo o jogo: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red" (gírias de aposta).
- Nenhum anúncio, link ou patrocínio de casa de aposta em nenhuma tela. Se um dia houver anúncio, a categoria apostas fica bloqueada.
- A porcentagem da torcida aparece só depois que o palpite fecha, nunca como "cotação".

### Dados dos jogos
- Calendário e placares de uma fonte externa (o plano grátis do football-data.org cobre a Série A, com placar atrasado, o que serve, porque o palpite fecha no início do jogo).
- O administrador confirma o placar final no painel antes de distribuir os pontos.
- A chave da API do football-data.org é segredo: fica só como segredo da função no servidor, nunca no front-end nem no repositório. O plano grátis permite 10 chamadas por minuto, então só o servidor consulta a API (poucas vezes por rodada) e guarda os jogos no banco.

## 7.1 Minigame 3 — "Prova de Boleiro" (quiz)

> Nome escolhido em 19/10. Inspirado no formato de escada e "parar ou seguir" dos programas de perguntas da TV, **sem usar nome, marca, vinheta ou visual de nenhum programa** e sem "prêmio", "milhão" ou "valendo".
> Desenho aprovado em 19/10/2026. Construído junto com o Crava para entrar no teste com amigos. **Soma no ranking desde já, na pré-temporada (decidido em 20/10)**, dentro do teto diário.

### Como joga
- **8 perguntas**, 4 alternativas, **15 s** cada (cerca de 1 minuto por partida).
- Escada de 4 degraus: 2 fáceis, 2 médias, 2 difíceis, 2 de craque.
- A partir da 3ª pergunta, antes de ela aparecer: **"Parar e levar X"** ou **"Seguir"**.
- Errou ou estourou o tempo: a partida acaba e leva **metade** dos pontos acumulados (arredondada para cima).
- **3 ajudas**, uma de cada por partida, sem custo em pontos (o relógio não para):
  - **Tira duas:** some com duas alternativas erradas.
  - **Arquibancada:** mostra como quem já respondeu aquela pergunta escolheu; com menos de 30 respostas, vira "tira uma".
  - **Troca:** troca a pergunta por outra do mesmo degrau.
- **Desafio por link:** quem aceita recebe as mesmas 8 perguntas, na mesma ordem (alternativas embaralhadas de novo). Vence quem fizer mais pontos; empate fica com quem desafiou.

### Pontuação
| Degrau | Perguntas | Pontos cada |
|---|---|---|
| Fácil | 1 e 2 | 8 |
| Média | 3 e 4 | 12 |
| Difícil | 5 e 6 | 18 |
| Craque | 7 e 8 | 25 |
| **8 de 8** | | **+24** |

- Máximo: 150. Pessoa mediana (chega à 5ª e para, ou erra por ali): ~40 a 70. O ajuste fino sai do balanço da pré-temporada.
- Conta dentro do teto diário (5 melhores partidas do dia, somando com os pênaltis).

### Anti-trapaça
- Perguntas e respostas ficam em tabelas que o celular **não lê** (RLS sem leitura; só funções do servidor acessam).
- **Uma pergunta por vez:** o servidor manda o texto e as 4 alternativas com ids embaralhados por partida. A resposta certa nunca chega ao celular antes da escolha.
- **Tempo medido no servidor**, a partir da hora em que a pergunta saiu. Resposta depois de 15 s + 2 s de tolerância conta como tempo esgotado.
- Parar ou seguir é decidido antes de a pergunta ser enviada.
- Limite de 3 partidas criadas por minuto (mesma `config_deteccao` dos pênaltis).
- Ninguém recebe a mesma pergunta duas vezes em 30 dias (se o degrau esgotar, volta a mais antiga).
- **Detecção:** nas últimas 40 perguntas difíceis e de craque, 90% ou mais de acerto com tempo médio abaixo de 2,5 s → partida sob suspeita, fora do ranking até revisão.
- Risco aceito: busca no Google em outro aparelho. Defesa: 15 s, perguntas que não se resolvem com uma busca simples, banco grande e sem repetição.

### Banco de perguntas
- **Cada pergunta guarda:** texto, 4 alternativas, a certa, degrau, clube (um dos 20 ou "geral"), tema, **fonte (link)**, data da verificação, status (rascunho, revisada, ativa, aposentada).
- **Fontes aceitas:** CBF, site oficial do clube ou da federação, veículo de imprensa esportiva, ogol.com.br. Wikipédia só junto com outra fonte.
- **Fatos fechados:** sempre com data ("Em 2019, quem…"). Nada que muda com o tempo ("quem é o técnico atual?").
- **Pode:** títulos, gols, artilheiros, recordes, estádios, fundação, apelidos de clubes, transferências, escalações históricas, regras do jogo.
- **Não pode:** além do que a seção 8 proíbe com nomes reais (vida pessoal, polêmica, processo, crime, saúde, religião, política, menores de idade): **tragédias, mortes e acidentes**; rebaixamentos, goleadas sofridas e vexames (a pergunta celebra o clube; a zoeira é papel do narrador); qualquer tema de aposta.
- **Equilíbrio entre os 20 clubes:**
  - **Mesma cota para todos.** A pré-temporada começa com **10 por clube** (3 fáceis, 3 médias, 2 difíceis, 2 de craque) + **60 gerais** = 260; a meta para o lançamento público é 30 por clube + 200 gerais = **800**. Depois, ~100 novas por semana, sempre repondo por igual.
  - **Cada partida:** 4 perguntas de 4 clubes diferentes, sorteados de forma uniforme entre os 20 (nunca pelo tamanho da torcida), e 4 gerais. Todo mundo tem a mesma chance de pegar pergunta do próprio clube.
  - Clubes com menos história nacional (Mirassol, Remo, Bragantino, Chapecoense) têm a mesma cota; as difíceis podem vir de campanhas recentes, estádio, fundação e acessos.
  - **Painel de cobertura** (consulta no banco): perguntas ativas por clube × degrau e acerto médio por clube. Clube com acerto muito fora da média tem as perguntas recalibradas.
- **Dificuldade calibrada pelos dados:** cada pergunta acumula respostas; com 50 ou mais, o degrau é corrigido: fácil ≥ 75% de acerto, média 50–75%, difícil 30–50%, craque < 30%.
- **Como o banco nasce:** lotes escritos numa sessão do Code com busca na web, sempre com fonte, em CSV (status rascunho). **Uma segunda sessão, nova, confere cada fonte** e marca revisada ou descarta (decidido em 19/10: não há revisão manual). Só entra no jogo, via `npm run importar-perguntas`, pergunta revisada e com fonte.
- **Pipeline com Gemini (desde 26/10/2026):** um cron por dia (6h) roda a função `gerar-conteudo`. Ela baixa uma página de fonte aceita (`staging_gt.fontes_semente`), o Gemini propõe perguntas só com o que está nela, e o código aceita apenas as que passam no validador do CSV, trazem o trecho literal da página e têm a resposta certa dentro do trecho. Às 7h, a `auditar-conteudo` dá cada uma a **outro modelo, sem dizer qual é a certa**; passa a `pre_aprovada` só se ele escolhe a certa com trecho da página. A IA **nunca** publica nem aprova de memória: **a revisão final é no painel `#admin`** (decidido em 26/10/2026, sem CSV). Cada `pre_aprovada` aparece com o trecho e o link da fonte; o administrador corrige se precisar (o texto passa pelo mesmo validador dos CSVs) e aprova, e a pergunta entra direto em `public.perguntas` como ativa (lote `gemini-AAAA-MM`), ou reprova com o motivo. O lote 1 continua no CSV `dados/perguntas/lote-01.csv`.

### Card
- "Prova de Boleiro: cheguei na 6ª e parei, 58 {pro_time}" + a escada em emoji: ✅ acertou, ❌ errou, ✋ parou, 💡 usou ajuda (ex.: ✅✅✅💡✅✋).
- **Nunca mostra o texto das perguntas**, porque o desafio por link usa as mesmas.

## 7.2 Desafio diário — "Time do Dia"

> Nome escolhido em 19/10 (é o D01 do backlog), estilo Wordle. Desenho aprovado em 19/10/2026. Construído junto com o Crava e o quiz para entrar no teste com amigos. **Soma no ranking desde já, na pré-temporada (decidido em 20/10)**, por fora do teto diário.

### Como joga
- **Um clube secreto por dia, o mesmo para todo mundo.** Troca às 00h de Brasília.
- **6 tentativas.** Cada tentativa é um clube escolhido numa lista com busca (sem texto livre).
- A cada tentativa, o servidor devolve uma linha de pistas comparando com o clube secreto:

| Pista | 🟢 | 🟡 | ⚪ |
|---|---|---|---|
| Estado | mesmo estado | mesma região | outra região |
| Fundação | mesmo ano | até 10 anos de diferença | mais longe |
| Títulos do Brasileirão | mesmo número | até 2 de diferença | mais longe |
| Divisão em 2026 | mesma | vizinha | outra |
| Cores | as duas iguais | uma igual | nenhuma |
| Capital ou interior | igual | — | diferente |

- Fundação e títulos mostram também ⬆️ ou ⬇️ (o secreto é mais novo/velho, tem mais/menos títulos).
- **Lista:** clubes das Séries A, B e C de 2026 (60). O sorteio não repete clube até passar pela lista inteira.
- Dados factuais com fonte (CBF e sites oficiais), conferidos pela mesma segunda sessão que revisa as perguntas, antes de entrar. Títulos do Brasileirão pela lista oficial da CBF.
- Uma partida por dia por torcedor.

### Pontuação
| Acertou na | 1ª | 2ª | 3ª | 4ª | 5ª | 6ª | Não acertou |
|---|---|---|---|---|---|---|---|
| Pontos | 100 | 85 | 70 | 55 | 40 | 25 | 0 |

- Mediana esperada entre a 3ª e a 4ª (~60); teto 100.
- **Fora do teto diário das 5 partidas:** é uma por dia, igual para todos, e soma por cima no ranking da semana.

### Anti-trapaça
- O clube do dia fica só no servidor. O celular manda a tentativa e recebe a linha de pistas; a resposta só aparece quando a partida termina.
- As tentativas ficam gravadas no servidor (apagar o app não recomeça o dia).
- Risco: criar conta anônima nova para "estudar" o dia. Mitigação: CAPTCHA no login anônimo (seção 12) e detecção (acerto na 1ª tentativa em 5 de 7 dias → sob suspeita).
- Sequência de dias (T01), sem punição para quem perder.

### Card
- "Time do Dia #34 · 4/6 · 🔥 5 dias" + a grade de emoji (uma linha por tentativa), **sem nome de clube** (nada de spoiler) e com o link para jogar.

### Regras comuns aos jogos de conhecimento
- Na pré-temporada, os dois **somam no ranking** (decidido em 20/10); a calibragem sai do balanço da pré-temporada (seção 11), não de um amistoso.
- Nomes reais só como fato, com fonte (seção 8). Na estreia, o Time do Dia usa só clubes; "Jogador do Dia", com pistas factuais e sem foto, fica no backlog (D07).
- Frases do narrador: `docs/narrador.md`, seções 10 e 11.

## 7.3 Minigame 4 — "Lances do Jogo"

> Nome provisório (M17 no backlog). Desenho aprovado em 21/10/2026. Recria lances marcantes dos clubes com o motor e o gesto dos pênaltis, para jogar e repetir muitas vezes. Na pré-temporada, **soma no ranking** como os outros (seção 5).

### Como joga
- **Tipos no MVP:** **falta** (bola fora da área, com barreira) e **cara a cara** (finalização na área ou perto dela, com o goleiro podendo sair do gol). **Defesa fica fora do MVP:** repete a defesa dos pênaltis e, com lance fixo, a resposta seria decorada. As ideias de defesas históricas ficam guardadas.
- **Gesto igual ao do pênalti:** direção, força e efeito, com cavadinha. O que muda é de onde a bola sai, a barreira e o goleiro.
- **Álbum de lances:** a pessoa escolhe os lances, com filtros por clube (abre no time do coração) e por tipo. Pode jogar lance de qualquer clube e da Seleção; os pontos vão sempre para o time dela.
- **Partida = 3 lances** escolhidos pela pessoa (pode repetir o mesmo lance). Cerca de 30 s.
- **Valendo:** até **6 partidas por dia** (18 lances; ajustável). O dia vale a **melhor partida**.
- **Treino:** ilimitado, roda só no celular, sem pontos e sem medalhas.

### Pontuação
| Faixa do lance | Chance de gol esperada | Gol vale |
|---|---|---|
| Fácil | 75% ou mais | 10 |
| Média | 50% a 75% | 18 |
| Difícil | 30% a 50% | 26 |
| Craque | menos de 30% | 34 |
| **Recriou o lance** (gol na zona onde entrou o gol de verdade) | | **+6** |

- **Partida:** soma dos 3 lances (teto 3 × 40 = **120**). **Dia:** a melhor partida.
- **Por fora do teto de 5 partidas**, como o Time do Dia (os lances não disputam vaga com pênaltis e Prova). O peso na semana é conferido no balanço da pré-temporada (seção 11).
- **Por que a melhor partida, e não os 3 melhores lances soltos:** com 20 tentativas e lance repetido, uma pessoa mediana acertaria 3 vezes o lance mais difícil em ~91% dos dias, e quase todo mundo bateria o teto. Fazer 3 seguidos separa quem joga bem: em 6 partidas de 3 lances de craque, ~9% para quem acerta 25% e ~55% para quem acerta 50%.
- **Faixa calibrada por dados:** a inicial sai do robô de calibragem (`calibrar` em `src/jogo/lances.ts`: chance de gol de quem mira no melhor gesto com o erro de mão típico). Com 50 ou mais tentativas valendo, a faixa é corrigida pela taxa de acerto real. Mudança de faixa nunca mexe em partida já fechada.
- **Dificuldade fixa por lance:** não sobe ao longo da semana, para "o melhor do dia" de segunda valer o mesmo que o de domingo.

### Tela em teste (21/10/2026)
- **No ar sem servidor:** álbum, partida de 3 e treino rodam só no celular e **ainda não valem pontos** (exceção à pré-temporada valendo da seção 5, até o servidor dos Lances existir). A tela avisa: "Em teste: os Lances ainda não valem pontos."
- **Na Home:** o card **Lances do Jogo** ocupa o lugar dos Pênaltis na grade e abre o hub com 3 abas: **Pênaltis** (valendo), **Faltas** e **Cara a cara** (em teste).
- **Álbum (abas Faltas e Cara a cara):** filtro de clube (abre no time do coração; sem lance do time, abre em todos). Tocar no lance abre a ficha, a situação ("Falta a 25 m, pela direita, barreira de 4") e os botões **Treinar** e **Pôr na partida**. A partida fica numa barra fixa no rodapé com 3 vagas (pode misturar faltas e cara a cara); tocar numa vaga tira o lance.
- **Câmera 3D com três distâncias (decidido em 21/10):** `src/telas/camera.ts` põe a câmera atrás da bola, olhando para o gol, e `src/telas/cena3d.ts` desenha o campo com a grande área, a pequena área, a marca do pênalti e a meia-lua no chão, o gol com rede, a barreira a 9,15 m da bola (dentro ou fora da área, como na regra), o goleiro, o batedor e a bola. Enquadramentos ajustados para o gol ocupar ~78% da largura da tela no pênalti (referência), ~60% no cara a cara e ~42% na falta de 25 m (falta mais longe, gol menor). A bola é desenhada 2,2 vezes maior que a real, para o dedo achar.
- **Bola e goleiro seguem a física:** a bola voa pelo caminho 3D do motor (`caminhoDoLance`) e para onde o motor diz (`tFim`: na barreira, no goleiro ou na linha do gol); o goleiro começa onde o motor sorteou (`goleiroAntesDoChute`) e pula para a bola.
- **Arraste:** como nos pênaltis, mas a linha do arraste prolongada cruza a boca do gol onde ela aparece na tela (que muda de tamanho e de ângulo conforme a distância).
- **"A jogada" (cara a cara):** antes do chute, um quadro conta como a bola chegou (coluna `chegada` do catálogo, até 90 caracteres, sem nomes) e a bola rola até o pé, vinda de trás, de um lado ou de rebote (coluna `chegada_de`). Dura ~2 s; o dedo só chuta depois.
- **Resultado:** pontos da partida, um emoji por lance (⚽ gol, 🧤 defesa, 🧱 barreira, ❌ fora ou trave) e "Jogar de novo" ou "Escolher outros". Card de compartilhar fica para quando valer pontos.
- **Narrador:** seção 12 do `docs/narrador.md` (abertura, barreira, lance recriado e fim) mais as frases genéricas de gol, trave e fora da seção 3.
- **Catálogo no jogo:** `npm run catalogo-lances` gera `src/dados/lances.ts` com os lances `revisada` ou `ativa` dos CSVs; o teste avisa se esquecer.

### Medalhas e Conquistas
- Por lance, contando só gols em partidas valendo (conferidas no servidor): **bronze** com 5 gols, **prata** com 20, **ouro** com 50 gols, dos quais 10 recriando o lance.
- **Nunca zeram**, nem no zerar da pré-temporada: ficam numa tabela própria, que o `zerar-pre-temporada` preserva.
- **Não valem ponto** no ranking (são coleção, como a Carreira).
- **Página Conquistas**, como aba ao lado do Ranking das torcidas: as medalhas do jogador por clube e por lance, e a vitrine da torcida ("a torcida do São Paulo tem 1.240 medalhas de ouro"), por soma e sem apelido.
- **Card de medalha:** "Já sou ouro no Gol 100 do goleiro — São Paulo x Corinthians (2011)". Título do lance, nunca nome de pessoa (seção 8).
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
- Quando o servidor dos Lances nascer, já nasce **lance a lance**, como os pênaltis (seção 6): a semente nunca vai para o celular. Enquanto não há servidor, os Lances não valem pontos e não há o que trapacear.

### Catálogo
- **Refeito do zero.** Os lotes de ideias de 20/10 servem só de ponto de partida (vários tinham fatos trocados).
- **Cada lance guarda:** id, clube (ou Seleção), tipo, título, ficha, competição, ano, adversário, cena (bola, barreira, goleiro), zona histórica, faixa, **fontes** (links de notícias públicas), data da verificação e status (rascunho, revisado, ativo).
- **Mesma cota para todos os clubes:** 2 a 3 lances por clube na estreia; a Seleção Brasileira entra como coleção extra, aberta a todos.
- **Só lances que celebram o clube:** nada de tragédia, morte ou acidente, vexame ou atleta menor de idade na data do lance. Nada de opinião sobre pessoas ("vacilo do zagueiro"). **Exceção (decidida em 26/10/2026):** lances da campanha da Chapecoense na Sul-Americana de 2016 podem entrar, desde que a ficha, o título e o narrador não falem do acidente.
- **Competição e estádio** sem nome de patrocinador.
- **Como nasce:** como o banco de perguntas (seção 7.1): lotes escritos numa sessão com busca na web, sempre com fonte, e uma segunda sessão, nova, que confere cada fonte.

## 7.4 Casa do [time] (história dos clubes)

> Desenho aprovado em 21/10/2026, a partir da proposta "Galeria dos Clubes". **Liberada em 21/10, com o upgrade dos pênaltis fechado (Lances do Jogo no ar); dados em rascunho em `dados/casa/`.** Detalhe completo: `docs/casa.md`; plano de publicação: `docs/casa-publicacao.md`.

- Uma página por clube da Série A 2026 ("Casa do Flamengo", "Casa da Chapecoense"): estádio, sala de troféus, livro de recordes, cores e manto. Só fatos com fonte, revisados por uma segunda sessão, como o quiz.
- **Vitrine, não minigame:** não dá pontos, XP nem selo. A ligação com o jogo é só por navegação (Home, Ranking, Time do Dia depois que o dia acaba).
- Competições pelo nome real da entidade (FIFA, CONMEBOL, CBF, federação), **sem patrocinador**. Títulos: na Casa do clube vale o lado da torcida (o que o clube reivindica conta no total dele, com nota neutra do que a entidade reconhece); fora da Casa vale a lista oficial.
- O nome "Galeria" continua sendo da **Galeria de Troféus** da torcida no jogo (seção 5), que vira a prateleira "Aqui no jogo" da Casa quando existir.
- Estático, fora do bundle inicial, sem servidor (única exceção: a contagem de cliques do "Seja sócio").
- **Tela no ar desde 25/10/2026** (`#casa`, `#casa/<id>`): entra pela Home ("Casa dos clubes", abre a do seu time), pelo Ranking (tocar numa torcida) e pelo fim do Time do Dia (só depois que o dia termina). Clube sem a linha de clube revisada fica "em breve" no índice.
- **"Seja sócio" (decidido em 30/10/2026):** bloco na Casa de cada clube com link para o programa oficial de sócio torcedor. Igual para os 20 clubes, com o nome do programa só como texto (sem logo, escudo ou imagem). Link direto para a página do programa, nunca para a home do clube; se a página promover aposta, o clube fica sem o bloco até mudar. Ser sócio não dá pontos, XP nem selo. Aviso de saída antes de abrir. Link com `utm_source=guerradetorcidas`; cliques contados no servidor por clube e por dia, sem dado pessoal. Só link gratuito: nada de afiliado ou comissão. Curadoria como os fatos da Casa: só `revisada` vai ao ar.

## 7.5 Monetização (decidido em 30/10/2026)

> Proposta e comparação das opções: `docs/monetizacao.md`.

- **"Apoie o jogo":** página com Pix e link de apoio mensal (APOIA.se, campanha contínua). Quem apoia não ganha pontos, XP, selo nem nome público. Botão discreto no rodapé da Home, na aba Conquistas e na tela de resultado só depois de um bom momento (vitória que valeu, recorde, Time do Dia acertado), no máximo uma vez por semana por aparelho; nunca no meio da partida nem no card. Fica desligado até a conta da plataforma existir, a chave Pix estar definida e a consulta ao advogado sobre o ECA Digital acontecer.
- **"Oferecido por":** aceito, com 1 ou 2 marcas vendidas direto, sem rede de anúncios nem rastreio, num selo discreto no rodapé ou no card com o texto "oferecido por"; nunca dentro da partida. Proibidos: aposta (inclusive "fantasy" com dinheiro), bebida alcoólica, cigarro, vape e outros produtos de vício. Só depois de ter audiência.
- **Cosméticos pagos:** adiados; quando vierem, só com login e com estrutura robusta de pagamento, entrega e reembolso.
- **Clubes:** neutralidade mantida; ninguém paga nem ganha destaque.
- **Prêmio em dinheiro ou produto:** fora de qualquer evento ou ranking.
- **Como está no código (30/10/2026):** a página `#apoie` e os botões existem, atrás do interruptor `apoio_ligado` em `src/config/apoio.ts` (começa desligado; link e chave Pix vazios). Desligado, nenhum botão aparece e `#apoie` volta para a Home. A regra de "uma vez por semana" no resultado fica guardada no aparelho (`gdt:apoio-oferta`); a Home e a aba Conquistas têm o botão fixo no rodapé. Lógica em `src/jogo/apoio.ts`.

## 8. Tom e zoeira

- **Narrador:** exagerado, rádio de domingo. Ex.: "É CAVADINHAAAA! Que categoria, que deboche!", "Pegou! O goleiro tava com o almoço pago!", "Isolou! Foi pra Marte, a bola tá orbitando!"
- **Banco de frases:** `docs/narrador.md` (versão 1.3, com etiquetas para a frase combinar com o lance e frases do Crava a Rodada). Frase nova entra lá e passa pelo checklist de tom do próprio arquivo.
- **Narrador com voz:** formato definido em 19/10 (só os gritos curtos em áudio; vozes Narrador e Narradora, mais a opção Só efeitos; nunca imitar narrador real), mas **fica no backlog** por enquanto (decidido em 19/10). A lista de gritos está no backlog do projeto no Claude (`gritos.md`).
- **Neutro de gênero:** o narrador fala do lance, não da pessoa ("Cavou!", não "Ele cavou!").
- **Provocação ao rival** (só ao time, nunca à pessoa): "Sua torcida tá 300 pontos atrás do [rival]. Vai deixar?"
- **Quem é o rival:** o clássico da tabela da seção 3. Sem clássico, o rival é o time logo acima no ranking da semana da sua divisão (ou logo abaixo, se for o líder); antes das divisões, no ranking geral (seção 5). Quem escolheu "Outro time" recebe só provocação de cidade.
- **Zoeira de cidade:** só sobre posição no ranking. Nada de sotaque, origem, economia, "cidade pequena" ou estereótipo de quem mora lá.
- **Notificações de semana:** "Faltam 6 horas e o [rival] tá encostando."
- **Limite:** zoeira com o time e com a situação, nunca com raça, orientação, gênero, religião, origem, corpo, deficiência ou pessoa real (jogador, técnico, narrador). Nada de bordão de narrador real nem trecho de música.

### Nomes reais (decidido em 19/10/2026)
- **Pode:** citar nomes de jogadores, técnicos e outras pessoas reais do futebol em **perguntas e respostas factuais dos jogos de conhecimento** (quiz e desafios diários): gols, títulos, recordes, transferências, escalações históricas.
- **Pode também (21/10):** nas **fichas factuais da Casa do [time]** (artilheiros, recordistas em jogos), só nome + número + data de referência + fonte. Todo o "Não pode" abaixo continua valendo.
- **Pode (decidido em 21/10):** na **ficha** de um lance histórico (Lances do Jogo e disputas históricas de pênaltis), o texto que conta o que aconteceu cita o nome como fato, do jeito que as notícias públicas contam, com fonte guardada junto. Ex.: "27/03/2011, Paulistão: Rogério Ceni marca o 100º gol da carreira, de falta, contra o Corinthians."
- **Não pode no lance:** nome, apelido ou número da camisa no **título**, no **card** ou texto de compartilhar, no **narrador** e no **boneco** (que continua fictício, sem o número do jogador real). O título conta o fato: "Gol 100 do goleiro", nunca "Gol 100 do Mito 01".
- **Não pode:**
  - imagem, foto, voz, caricatura ou boneco que imite pessoa real (os bonecos continuam fictícios);
  - zoeira, apelido pejorativo ou opinião sobre a pessoa (a zoeira continua sendo com o time e a situação);
  - vida pessoal, família, saúde, religião, política, polêmica, processo ou crime;
  - atletas menores de idade (categorias de base);
  - usar nome de pessoa real para divulgar o jogo (anúncio, post, card de convite).
- Toda pergunta ou ficha com nome real precisa de **fonte verificável** guardada junto.
- Fantasy com jogadores reais (escalar time) continua fora (backlog, seção 7).
- **Classificação livre:** sem palavrão, bebida, aposta ou violência em nenhum texto do jogo. Escolas entram na fase 2.
- **Derrota zoa, mas aponta a saída:** revanche, desafio, "os pontos contam igual pro seu time".

### Nomes candidatos
Guerra de Torcidas (provisório) · Arquibancada · Resenha FC · Rivalzão · Bate Contra Mim (nome do minigame) · Treta FC · Torcida Braba

## 9. Visual

- Direção **"Transmissão de domingo"** aprovada em 18/10/2026: placar de TV inclinado, grito do narrador como adesivo na cor do time, arquibancada nas cores do time, campo em perspectiva.
- Detalhe, tela a tela, e ordem de implementação: `docs/visual.md`.
- **Cards de time: "faixa de placar"** (decidido em 20/10; seção 3 e `docs/visual.md`).
- **Bonecos:** estilo "Silhueta premium" (aprovado em 19/10): formas chapadas sem contorno, camiseta lisa nas cores do time (uniforme 1 ou 2), goleiro num tom forte que contrasta com os dois times, tons de pele e cabelos variados, homens e mulheres. Cada lado tem 5 batedores diferentes (um por cobrança) e 1 goleiro, sorteados a cada partida. Detalhe em `docs/bonecos.md`.

## 10. Roadmap

| Fase | Conteúdo |
|---|---|
| **1. MVP** ✅ pênaltis concluído em 19/10, em teste com amigos | Pênaltis com desempate, times oficiais com artigo e rival, ranking da semana (campeão pelos 30 melhores + Maior torcida), desafio por link, card de resultado com placar em emoji, direção visual nova |
| **1.5 Logo depois do MVP** | Crava a Rodada no ar desde 20/10, somando desde a 32ª na pré-temporada, até a 38ª (2/12). Depois (decidido em 26/10, `docs/propostas/`): carreira; fechamento da semana gravado; cidade como segunda camisa e Série A e Série B mensais, testadas na pré-temporada; Galeria; ranking de 52 semanas na 1ª temporada; anti-trapaça completo antes de divulgar. **Casa do [time]** (seção 7.4; plano em `docs/casa-publicacao.md`), liberada com o upgrade dos pênaltis fechado |
| **2. Comunidade** | Times criados, ligas e campeonatos combinados (com ranking entre amigos com apelido), moderação, Copa das Torcidas |
| **3. Mais minigames** | Prova de Boleiro (seção 7.1) e Time do Dia (seção 7.2) construídos em 19–20/10, somando na pré-temporada. Lances do Jogo (seção 7.3) aprovado em 21/10: motor primeiro, depois catálogo com fontes, tela, servidor, Conquistas e, por fim, os Pênaltis como sessão dos Lances. Depois: Embaixadinha (com chinelo, laranja e bola murcha) |
| **4. Coleção e resenha** | Álbum de figurinhas com jogadores fictícios e trocas, Técnico por Um Jogo, Pelada de Rua |

## 11. Como saber se está funcionando

- **Convites por jogador:** quantos amigos cada um traz (meta: mais de 1).
- **Volta no dia seguinte e em 7 dias.**
- **Partidas por visita.**
- **Desafios aceitos / desafios enviados.**
- Enquanto não houver ferramenta de métricas, os números saem do próprio banco (partidas, desafios e torcedores), por um relatório simples: `npm run metricas` (só leitura; jogador = quem fechou ao menos 1 partida; "voltou em 7 dias" = jogou em algum dos 7 dias seguintes à estreia; "entrou por link" = a 1ª partida foi desafio de outra pessoa).

### Balanço entre minigames (decidido em 20/10)
- Seção nova no `npm run metricas` (ou `npm run balanco`), só leitura, **por minigame** (pênaltis, Prova de Boleiro, Time do Dia, Crava e, quando estrear, Lances do Jogo, com teto de 120 e taxa de gol por lance): partidas, jogadores, média, mediana, quartis (25% e 75%), 90%, máximo e quantas bateram o teto (150 nos jogos de partida, 100 no Time do Dia). No Crava, por palpite e por pessoa na rodada (já ×2).
- **Peso de cada minigame na semana:** dos pontos que contaram no ranking, quanto veio de cada minigame (no geral e na mediana por pessoa).
- **Alvo:** mediana entre ~45 e ~75 por partida e teto ~150 nos jogos de partida; o relatório marca com ⚠️ o que sair dessa faixa. Prova de Boleiro mostra também até que pergunta as pessoas chegam e quantas param; Time do Dia, a distribuição de tentativas.
- Mostra só o que tiver pelo menos 20 partidas (abaixo disso: "pouca amostra").
- Grava uma cópia em `relatorios/balanco-AAAA-MM-DD.csv` (pasta fora do Git), para os números sobreviverem ao zerar da pré-temporada. **O zerar avisa para rodar o balanço antes.**
- Ajuste de pontuação: decidido no Chat com os números do balanço; nunca muda partidas já fechadas.

## 12. Técnica (resumo)

- Front-end estático (Vite + TypeScript, canvas para o jogo), leve e rápido no celular.
- Hospedagem: GitHub Pages em `torcida.kauewalter.com.br` (repositório próprio, separado do site).
- Dados: Supabase (login anônimo, Postgres com regras de acesso, ranking ao vivo, funções no servidor para validar partidas).
- Supabase: projeto `guerra-de-torcidas` (ref `ybfeqykdnqmnufrgtnoc`), região São Paulo, plano Free durante o desenvolvimento.
- Chaves: o front-end usa a URL do projeto e a **publishable key** (`sb_publishable_…`). As funções no servidor usam a **secret key** (`sb_secret_…`), só como segredo das funções. As chaves antigas `anon` e `service_role` estão sendo descontinuadas pela Supabase até o fim de 2026: não usar.
- Como a URL e a publishable key são públicas, ficam versionadas no repositório (o build do GitHub Pages precisa delas). Nada secreto entra no repositório.
- **Antes de divulgar:** CAPTCHA (Cloudflare Turnstile) no login anônimo, limpeza periódica de usuários anônimos inativos, anti-trapaça completo (pênaltis lance a lance desde 27/10, com as cobranças do desafio no servidor), ranking que aguente muitos jogadores (hoje a semana inteira é recalculada a cada partida fechada; trocar por cálculo incremental ou de minuto em minuto) e decidir sobre o plano Pro (o Free pausa o projeto depois de 1 semana sem uso).
- **Rotina contra a pausa do plano Free:** um agendamento no GitHub Actions faz uma consulta leve ao banco a cada 2 dias. Enquanto o projeto estiver no Free, isso evita a pausa por 7 dias sem uso. O GitHub desliga agendamentos de repositório público depois de 60 dias sem commit; se isso acontecer, o GitHub avisa por e-mail e basta reativar. Arquivo: `.github/workflows/manter-supabase.yml` (a cada 2 dias às 09h de Brasília e pelo botão "Run workflow"): lê 1 linha do ranking com a publishable key e falha se a resposta não for 200.
- **Zerar pré-temporada:** `npm run zerar-pre-temporada` apaga partidas, desafios e ranking (mantém times e torcedores; recordes pessoais zeram junto). Mostra as contagens, lembra de rodar o balanço antes e só apaga depois de digitar ZERAR.
- **Sessão de usuário apagado:** se o login anônimo salvo no aparelho não existir mais no servidor, o jogo sai e faz um login anônimo novo.
- **CAPTCHA (decidido em 27/10/2026):** Cloudflare Turnstile no modo escondido, **uma vez por aparelho**: só no primeiro login anônimo (a sessão fica salva) e no login do `#admin`, pelo suporte a CAPTCHA do próprio Supabase. Continua sem cadastro: o login anônimo segue somando pontos. Se a verificação falhar, o jogo roda "sem valer pontos", como sem internet. Liga quando a chave pública do site estiver em `VITE_TURNSTILE_SITE_KEY` (`.env.production`) **e** o CAPTCHA estiver ligado no painel do Supabase, nessa ordem; vazia, fica desligado.
- DNS: CNAME `torcida` no Hostgator, feito manualmente pelo Kauê.
- **Lista de cidades:** municípios do IBGE num arquivo estático (nome, UF, código IBGE), carregado só na tela de escolha.
- **Times:** `src/dados/times.ts` guarda id, nome, cores (2, mais a 3ª opcional do filete do card), artigo e rival (id do outro time ou vazio), conforme a tabela da seção 3.
