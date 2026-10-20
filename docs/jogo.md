# Guerra de Torcidas — documento do jogo

> Nome provisório. Fonte da verdade do projeto: toda decisão nova entra aqui.
> Última atualização: 20/10/2026, manhã (pré-temporada valendo: todos os minigames somam no ranking até o zerar; "sua posição" e recorde pessoal; relatório de balanço por minigame; cards de time com "faixa de placar")
> Detalhes: `docs/rankings.md` (rankings e regras de justiça), `docs/narrador.md` (frases), `docs/visual.md` (direção visual), `docs/bonecos.md` (bonecos). Ideias ainda não decididas ficam no backlog do projeto no Claude.

## 1. A ideia em uma frase

Minigames de futebol de 30 segundos em que **cada ponto que você faz vai para o placar da sua torcida**, num ranking ao vivo contra os rivais.

## 2. Pilares (o que nunca negociamos)

1. **Partida curta.** Uma rodada cabe numa fila de padaria (30 s a 1 min).
2. **Tribal.** Você não joga por você, joga pelo seu time. Ver o rival na frente é o motor.
3. **Zoeira.** Tom de resenha: narrador exagerado, provocação ao rival, nunca ofensa a pessoas ou grupos.
4. **Feito para WhatsApp.** O link abre direto no navegador do celular, sem cadastro e sem loja de app. Todo resultado vira um card pronto para mandar no grupo ou postar nos stories.
5. **Cresce por minigames.** Os minigames mudam; a torcida, o ranking e as ligas ficam e acumulam.
6. **Zero aposta.** Nenhum minigame envolve dinheiro, prêmio em dinheiro, odds ou qualquer coisa que pareça casa de aposta. Nem anúncio de aposta.
7. **Justo.** Título se ganha por média, não por tamanho de torcida; ninguém compra vantagem; evento não distorce o ranking.

## 3. Torcidas (times)

### Times oficiais
- Os clubes da Série A 2026, mais "Outro time".
- **Só nome, cores e artigo (o/a).** Nada de escudo, uniforme oficial, mascote, hino ou foto de jogador. O artigo serve para o narrador acertar "do"/"da", "pro"/"pra".
- **Camiseta lisa:** os batedores vestem uma camiseta lisa nas 2 cores do time, sem escudo, listras, patrocínio ou qualquer desenho que imite a camisa oficial. Há o **uniforme 1** (camiseta na cor 1) e o **uniforme 2** (cores invertidas), sorteado a cada partida. Se os dois times em campo ficarem parecidos, o adversário troca de uniforme (decidido em 19/10).
- **Card do time (tela de escolha e onde mais o time aparecer em bloco), decidido em 20/10: "faixa de placar".** Cor 1 cheia, sem transparência; embaixo, uma faixa reta na cor 2 (cerca de 1/4 da altura); nos clubes de três cores, um filete da 3ª cor separando as duas. Nome em Barlow Condensed, caixa alta, cor de texto pelo `corDeTexto`. O mesmo desenho para todos os clubes: **nenhum padrão que imite a camisa** (listras na direção da camisa, faixa diagonal, estrelas ou outro elemento de escudo). Quem diferencia os clubes é a cor e o nome. Substitui as listras diagonais translúcidas, que deixavam as cores com cara de pastel.
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
- Junto com o time, o jogador escolhe a **cidade** onde torce. É opcional, mas a tela incentiva ("defende sua cidade também").
- A cidade sai de uma **lista fechada de municípios do IBGE** (nome + UF), com busca. Nada de texto livre, então não precisa de moderação.
- Os pontos de cada partida contam **para o time, para a cidade e para o estado da cidade**, em rankings separados.
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
- **Teto diário:** só as 5 melhores partidas do dia de cada jogador contam, **somando todos os minigames de partida** (pênaltis, quiz). O desafio diário (uma vez por dia) e o Crava a Rodada (teto próprio por rodada) ficam por fora (decidido em 19/10).

### MVP, antes das divisões
- Enquanto a Série A e a Série B não existem (fase 1.5), o ranking da semana é **um só, com os 20 times**: Campeão da semana (30 melhores) e Maior torcida. Ainda sem pontos de campeonato.
- O "rival sem clássico" é o time logo acima nesse ranking geral (ou logo abaixo, se for o líder).
- Telas que no visual falam em "Série A" mostram esse ranking geral até as divisões nascerem.

### Sua posição e recorde pessoal (decidido em 20/10)
- Para dar a disputa pelo 1º lugar sem ranking público com apelido, cada pessoa vê **só a própria posição** entre todos os torcedores (de qualquer time), calculada no servidor:
  - **Na semana, geral:** "Você é o 3º de 14 torcedores na semana" (soma do que conta no ranking: 5 melhores partidas do dia + Time do Dia + Crava).
  - **Por minigame, na semana:** pela **melhor partida** da semana (pênaltis, Prova de Boleiro), pelos pontos do dia (Time do Dia) e pelos pontos da rodada (Crava, que já tem isso).
  - Empate: fica na frente quem chegou primeiro.
- **Recorde pessoal** de cada minigame (zera junto com a pré-temporada, porque a pontuação pode mudar no balanço): aparece no resultado ("NOVO RECORDE!") e entra no card quando for recorde.
  - Recorde = melhor partida (pênaltis, Prova), melhor dia (Time do Dia) ou melhor rodada (Crava, já ×2). "NOVO RECORDE!" só quando passa o recorde anterior: a primeira partida de cada minigame não conta, empate não conta, partida sob suspeita não vale recorde.
  - Textos neutros de gênero: "Sua posição: 3º de 14 na semana", nunca "você é o/a".
- Onde aparece: Home (posição geral da semana) e tela de resultado de cada minigame (posição naquele minigame + recorde).
- Nunca mostra a lista de outras pessoas nem apelidos. Lista com apelido só com ligas entre amigos e moderação (fase 2).

### Pré-temporada valendo (decidido em 20/10)
- **Até o zerar da pré-temporada, todos os minigames somam no ranking da semana**: pênaltis, Prova de Boleiro (no teto diário), Time do Dia (por fora do teto) e Crava a Rodada (desde a 32ª, ×2 e teto de 300 por rodada). Não há amistoso nem ensaio sem pontos durante a pré-temporada: ela inteira já é um teste e zera antes do lançamento público.
- As telas trocam os selos "Em teste" e "Ensaio" por um aviso único: **"Pré-temporada: tudo vale ponto, mas zera antes do lançamento."**
- **Balanço entre minigames:** os números da pré-temporada são o parâmetro de calibragem (média, mediana e teto por partida de cada minigame; ver seção 11). Ajustes de pontuação saem daí.
- O **amistoso de 2 semanas** (regras de justiça, abaixo) continua valendo para minigames lançados **depois** do zerar.

### A temporada
- Os 20 times oficiais ficam em **Série A (10)** e **Série B (10)**. Na primeira temporada, a divisão sai da primeira semana de jogo. "Outro time" não entra em divisão.
- Soma dos pontos de campeonato das semanas do mês. No fim: **2 últimos da A caem, 2 primeiros da B sobem**. O campeão da Série A é o campeão da temporada.

### Cidades e estados
- Mesma conta da semana: média das 30 melhores pessoas da cidade (100 no estado), com as mesmas vagas a 80%.
- Ranking de cidades **por estado**, mais um top nacional. A campeã do estado na semana ganha troféu na Galeria.

### Longo prazo
- **Ranking de 52 semanas** (estilo tênis): soma dos pontos de campeonato das últimas 52 semanas.
- **Galeria de Troféus** eterna: semanas, temporadas, acessos, rebaixamentos, títulos de cidade.
- **Tabela de todos os tempos:** só vitrine.
- **Carreira do jogador:** Estreante, Reserva, Titular, Craque, Ídolo, Lenda. Nunca zera. XP cheio nas 5 primeiras partidas do dia, metade da 6ª à 15ª, zero depois.

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
- **Risco conhecido:** hoje o celular recebe a semente antes de jogar, então quem ler o código consegue prever o canto do goleiro e se a dica do pé de apoio é verdadeira.
  - Já no ranking: o servidor marca partidas estatisticamente impossíveis e congela os pontos até revisão.
  - **Antes de divulgar:** a decisão do goleiro e do batedor passa a usar um segredo que só o servidor conhece; o celular manda o gesto de cada lance e recebe o resultado, um lance por vez.
  - O mesmo vale para o desafio por link: quem aceita recebe as cobranças gravadas antes de defender.

### Como está no servidor (bloco B, 19/10/2026)
- **Limites:** 3 partidas criadas por minuto por torcedor; a semente expira em 15 minutos. Ajustáveis na tabela `config_deteccao`.
- **Detecção** (aprovada em 19/10/2026), a cada partida fechada, olhando o histórico do torcedor:
  - **Defesas:** nas últimas 30 defesas contra o batedor da máquina com chute no gol, 27 ou mais defendidas.
  - **Cobranças:** nas últimas 40 cobranças em que o goleiro pulou por sorteio (sem "ler"), nenhuma no canto dele.
  - Partida marcada fica **sob suspeita**, fora do ranking até revisão. Números ajustáveis em `config_deteccao`.
- **Par ou ímpar:** o número do narrador é sorteado no servidor quando a partida começa e fica numa tabela que o celular não lê. Só sai na resposta do fechamento, depois da escolha.
- **Desafio por link:** toda partida normal registrada gera um código (`?d=xxxxxxxx`) com as cobranças gravadas. Vence o desafio quem fizer **mais pontos**; empate em pontos fica com quem desafiou (chegou primeiro). Partida de desafio não gera outro desafio. O botão **Revanche** joga de novo o mesmo desafio; fora do desafio, é uma partida nova contra a máquina.
- **Ranking da semana:** time sem nenhum torcedor ativo fica com 0. A "torcida emprestada" (vagas a 80% da média geral) só completa time que já tem gente jogando.
- **Rival "colado":** diferença de até 4 pontos na média dos 30 melhores (≈ 2 partidas boas de uma pessoa do top 30).
- **Horário de Brasília:** UTC−3 fixo (sem horário de verão desde 2019).

### Card de resultado
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
  - "Resultado da rodada" (depois): pontos {pro_time} e uma linha de emoji, um por jogo palpitado: 🎯 exato, ✅ saldo, ☑️ vencedor, ❌ errou, com ⭐ logo depois do jogo da certeza.
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

### Card
- "Prova de Boleiro: cheguei na 6ª e parei, 58 {pro_time}" + a escada em emoji: 🟩 acertou, 🟥 errou, ⏹️ parou, 🆘 usou ajuda (ex.: 🟩🟩🟩🆘🟩⏹️).
- **Nunca mostra o texto das perguntas**, porque o desafio por link usa as mesmas.

## 7.2 Desafio diário — "Time do Dia"

> Nome escolhido em 19/10 (é o D01 do backlog), estilo Wordle. Desenho aprovado em 19/10/2026. Construído junto com o Crava e o quiz para entrar no teste com amigos. **Soma no ranking desde já, na pré-temporada (decidido em 20/10)**, por fora do teto diário.

### Como joga
- **Um clube secreto por dia, o mesmo para todo mundo.** Troca às 00h de Brasília.
- **6 tentativas.** Cada tentativa é um clube escolhido numa lista com busca (sem texto livre).
- A cada tentativa, o servidor devolve uma linha de pistas comparando com o clube secreto:

| Pista | 🟩 | 🟨 | ⬜ |
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
- Risco: criar conta anônima nova para "estudar" o dia. Mitigação: CAPTCHA antes de divulgar e detecção (acerto na 1ª tentativa em 5 de 7 dias → sob suspeita).
- Sequência de dias (T01), sem punição para quem perder.

### Card
- "Time do Dia #34 · 4/6 · 🔥 5 dias" + a grade de emoji (uma linha por tentativa), **sem nome de clube** (nada de spoiler) e com o link para jogar.

### Regras comuns aos jogos de conhecimento
- Na pré-temporada, os dois **somam no ranking** (decidido em 20/10); a calibragem sai do balanço da pré-temporada (seção 11), não de um amistoso.
- Nomes reais só como fato, com fonte (seção 8). Na estreia, o Time do Dia usa só clubes; "Jogador do Dia", com pistas factuais e sem foto, fica no backlog (D07).
- Frases do narrador: `docs/narrador.md`, seções 10 e 11.

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
- **Não pode:**
  - imagem, foto, voz, caricatura ou boneco que imite pessoa real (os bonecos continuam fictícios);
  - zoeira, apelido pejorativo ou opinião sobre a pessoa (a zoeira continua sendo com o time e a situação);
  - vida pessoal, família, saúde, religião, política, polêmica, processo ou crime;
  - atletas menores de idade (categorias de base);
  - usar nome de pessoa real para divulgar o jogo (anúncio, post, card de convite).
- Toda pergunta com nome real precisa de **fonte verificável** guardada junto com a pergunta.
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
| **1.5 Logo depois do MVP** | Crava a Rodada no ar desde 20/10, somando desde a 32ª na pré-temporada, até a 38ª (2/12). Depois: cidade como segunda camisa, Série A e Série B mensais, ranking de 52 semanas, Galeria, carreira, anti-trapaça completo antes de divulgar |
| **2. Comunidade** | Times criados, ligas e campeonatos combinados (com ranking entre amigos com apelido), moderação, Copa das Torcidas |
| **3. Mais minigames** | Prova de Boleiro (seção 7.1) e Time do Dia (seção 7.2) construídos em 19–20/10, somando na pré-temporada. Depois: Embaixadinha (com chinelo, laranja e bola murcha) |
| **4. Coleção e resenha** | Álbum de figurinhas com jogadores fictícios e trocas, Técnico por Um Jogo, Pelada de Rua |

## 11. Como saber se está funcionando

- **Convites por jogador:** quantos amigos cada um traz (meta: mais de 1).
- **Volta no dia seguinte e em 7 dias.**
- **Partidas por visita.**
- **Desafios aceitos / desafios enviados.**
- Enquanto não houver ferramenta de métricas, os números saem do próprio banco (partidas, desafios e torcedores), por um relatório simples: `npm run metricas` (só leitura; jogador = quem fechou ao menos 1 partida; "voltou em 7 dias" = jogou em algum dos 7 dias seguintes à estreia; "entrou por link" = a 1ª partida foi desafio de outra pessoa).

### Balanço entre minigames (decidido em 20/10)
- Seção nova no `npm run metricas` (ou `npm run balanco`), só leitura, **por minigame** (pênaltis, Prova de Boleiro, Time do Dia, Crava): partidas, jogadores, média, mediana, quartis (25% e 75%), 90%, máximo e quantas bateram o teto (150 nos jogos de partida, 100 no Time do Dia). No Crava, por palpite e por pessoa na rodada (já ×2).
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
- **Antes de divulgar:** CAPTCHA (Cloudflare Turnstile) no login anônimo, limpeza periódica de usuários anônimos inativos, anti-trapaça completo (inclusive as cobranças do desafio, que hoje chegam ao celular antes da defesa), ranking que aguente muitos jogadores (hoje a semana inteira é recalculada a cada partida fechada; trocar por cálculo incremental ou de minuto em minuto) e decidir sobre o plano Pro (o Free pausa o projeto depois de 1 semana sem uso).
- **Rotina contra a pausa do plano Free:** um agendamento no GitHub Actions faz uma consulta leve ao banco a cada 2 dias. Enquanto o projeto estiver no Free, isso evita a pausa por 7 dias sem uso. O GitHub desliga agendamentos de repositório público depois de 60 dias sem commit; se isso acontecer, o GitHub avisa por e-mail e basta reativar. Arquivo: `.github/workflows/manter-supabase.yml` (a cada 2 dias às 09h de Brasília e pelo botão "Run workflow"): lê 1 linha do ranking com a publishable key e falha se a resposta não for 200.
- **Zerar pré-temporada:** `npm run zerar-pre-temporada` apaga partidas, desafios, dias do Time do Dia, pontos do Crava e ranking (mantém times, torcedores, palpites, perguntas e o sorteio do Time do Dia). Os recordes pessoais saem dessas tabelas, então zeram junto. Mostra as contagens, avisa se o balanço do dia (`npm run balanco`) ainda não foi gravado e só apaga depois de digitar ZERAR. Depois do zerar, não confirmar de novo placar de rodada que já tinha fechado (os pontos voltariam).
- **Sessão de usuário apagado:** se o login anônimo salvo no aparelho não existir mais no servidor, o jogo sai e faz um login anônimo novo.
- DNS: CNAME `torcida` no Hostgator, feito manualmente pelo Kauê.
- **Lista de cidades:** municípios do IBGE num arquivo estático (nome, UF, código IBGE), carregado só na tela de escolha.
- **Times:** `src/dados/times.ts` guarda id, nome, cores (2, mais a 3ª opcional do filete do card), artigo e rival (id do outro time ou vazio), conforme a tabela da seção 3.
