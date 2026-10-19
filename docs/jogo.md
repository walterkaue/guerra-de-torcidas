# Guerra de Torcidas — documento do jogo

> Nome provisório. Fonte da verdade do projeto: toda decisão nova entra aqui.
> Última atualização: 19/10/2026 (narrador 1.2 com etiquetas de lance, botão Mais uma/Revanche; antes: bloco B no servidor, Crava a Rodada sem Contra a maré, rotina contra a pausa do Supabase)
> Detalhes: `docs/rankings.md` (rankings e regras de justiça), `docs/narrador.md` (frases), `docs/visual.md` (direção visual). Ideias ainda não decididas ficam no backlog do projeto no Claude.

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
- **Camiseta lisa:** batedor e goleiro vestem uma camiseta lisa nas 2 cores do time, sem escudo, listras, patrocínio ou qualquer desenho que imite a camisa oficial.
- Cada time pode ter um **rival** cadastrado (o clássico). Sem clássico, vale a regra da seção 8.

| Time | Artigo | Rival |
|---|---|---|
| Athletico-PR | o | Coritiba |
| Atlético-MG | o | Cruzeiro |
| Bahia | o | Vitória |
| Botafogo | o | Flamengo |
| Bragantino | o | sem clássico |
| Chapecoense | a | sem clássico |
| Corinthians | o | Palmeiras |
| Coritiba | o | Athletico-PR |
| Cruzeiro | o | Atlético-MG |
| Flamengo | o | Fluminense |
| Fluminense | o | Flamengo |
| Grêmio | o | Internacional |
| Internacional | o | Grêmio |
| Mirassol | o | sem clássico |
| Palmeiras | o | Corinthians |
| Remo | o | sem clássico |
| Santos | o | Corinthians |
| São Paulo | o | Palmeiras |
| Vasco | o | Flamengo |
| Vitória | o | Bahia |

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
- **Teto diário:** só as 5 melhores partidas do dia de cada jogador contam.

### MVP, antes das divisões
- Enquanto a Série A e a Série B não existem (fase 1.5), o ranking da semana é **um só, com os 20 times**: Campeão da semana (30 melhores) e Maior torcida. Ainda sem pontos de campeonato.
- O "rival sem clássico" é o time logo acima nesse ranking geral (ou logo abaixo, se for o líder).
- Telas que no visual falam em "Série A" mostram esse ranking geral até as divisões nascerem.

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
- Minigame novo entra em "amistoso" (sem contar pontos) por 2 semanas, até a pontuação ficar parecida com a dos outros (~60 por partida para uma pessoa mediana, teto ~150).
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
- Ligas entre amigos por link, ranking da torcida, da cidade e geral.

### Pontuação
| Acerto | Pontos |
|---|---|
| Placar exato | 10 |
| Vencedor e saldo de gols certos (ou empate com outro placar) | 7 |
| Só o vencedor (ou só o empate) | 5 |
| Errou | 0 |
| **Jogo da certeza:** 1 jogo por rodada, escolhido antes do primeiro jogo da rodada | ×2 |

- **Peso na torcida:** os pontos de palpite entram multiplicados por 2, com teto de **300 por rodada** (o mesmo que um dia de minigames).
- Rankings próprios: da rodada, do mês e do Brasileirão inteiro (Palpiteiro do Brasileirão).
- Palpitar contra o próprio time vale normalmente, e o narrador zoa.
- **Sem bônus "Contra a maré" na estreia** (decidido em 18/10): simplifica a regra e, com pouca gente palpitando, a porcentagem não seria confiável. A ideia fica no backlog.

### Linha vermelha: nada que pareça aposta
- **Aviso fixo** no topo da tela do minigame e no card: **"Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."**
- Palavras proibidas em todo o jogo: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red" (gírias de aposta).
- Nenhum anúncio, link ou patrocínio de casa de aposta em nenhuma tela. Se um dia houver anúncio, a categoria apostas fica bloqueada.
- A porcentagem da torcida aparece só depois que o palpite fecha, nunca como "cotação".

### Dados dos jogos
- Calendário e placares de uma fonte externa (o plano grátis do football-data.org cobre a Série A, com placar atrasado, o que serve, porque o palpite fecha no início do jogo).
- O administrador confirma o placar final no painel antes de distribuir os pontos.
- A chave da API do football-data.org é segredo: fica só como segredo da função no servidor, nunca no front-end nem no repositório. O plano grátis permite 10 chamadas por minuto, então só o servidor consulta a API (poucas vezes por rodada) e guarda os jogos no banco.

## 8. Tom e zoeira

- **Narrador:** exagerado, rádio de domingo. Ex.: "É CAVADINHAAAA! Que categoria, que deboche!", "Pegou! O goleiro tava com o almoço pago!", "Isolou! Foi pra Marte, a bola tá orbitando!"
- **Banco de frases:** `docs/narrador.md` (versão 1.2, com etiquetas para a frase combinar com o lance). Frase nova entra lá e passa pelo checklist de tom do próprio arquivo.
- **Neutro de gênero:** o narrador fala do lance, não da pessoa ("Cavou!", não "Ele cavou!").
- **Provocação ao rival** (só ao time, nunca à pessoa): "Sua torcida tá 300 pontos atrás do [rival]. Vai deixar?"
- **Quem é o rival:** o clássico da tabela da seção 3. Sem clássico, o rival é o time logo acima no ranking da semana da sua divisão (ou logo abaixo, se for o líder); antes das divisões, no ranking geral (seção 5). Quem escolheu "Outro time" recebe só provocação de cidade.
- **Zoeira de cidade:** só sobre posição no ranking. Nada de sotaque, origem, economia, "cidade pequena" ou estereótipo de quem mora lá.
- **Notificações de semana:** "Faltam 6 horas e o [rival] tá encostando."
- **Limite:** zoeira com o time e com a situação, nunca com raça, orientação, gênero, religião, origem, corpo, deficiência ou pessoa real (jogador, técnico, narrador). Nada de bordão de narrador real nem trecho de música.
- **Classificação livre:** sem palavrão, bebida, aposta ou violência em nenhum texto do jogo. Escolas entram na fase 2.
- **Derrota zoa, mas aponta a saída:** revanche, desafio, "os pontos contam igual pro seu time".

### Nomes candidatos
Guerra de Torcidas (provisório) · Arquibancada · Resenha FC · Rivalzão · Bate Contra Mim (nome do minigame) · Treta FC · Torcida Braba

## 9. Visual

- Direção **"Transmissão de domingo"** aprovada em 18/10/2026: placar de TV inclinado, grito do narrador como adesivo na cor do time, arquibancada nas cores do time, campo em perspectiva.
- Detalhe, tela a tela, e ordem de implementação: `docs/visual.md`.

## 10. Roadmap

| Fase | Conteúdo |
|---|---|
| **1. MVP** | Pênaltis com desempate, times oficiais com artigo e rival, ranking da semana (campeão pelos 30 melhores + Maior torcida), desafio por link, card de resultado com placar em emoji, direção visual nova |
| **1.5 Logo depois do MVP** | Cidade como segunda camisa, Crava a Rodada (estreia nas últimas rodadas de 2026), Série A e Série B mensais, ranking de 52 semanas, Galeria, carreira, anti-trapaça completo antes de divulgar |
| **2. Comunidade** | Times criados, ligas e campeonatos combinados, moderação, Copa das Torcidas |
| **3. Mais minigames** | Embaixadinha (com chinelo, laranja e bola murcha), Craque do Dia (charada diária, só com clubes) |
| **4. Coleção e resenha** | Álbum de figurinhas com jogadores fictícios e trocas, Técnico por Um Jogo, Pelada de Rua |

## 11. Como saber se está funcionando

- **Convites por jogador:** quantos amigos cada um traz (meta: mais de 1).
- **Volta no dia seguinte e em 7 dias.**
- **Partidas por visita.**
- **Desafios aceitos / desafios enviados.**

## 12. Técnica (resumo)

- Front-end estático (Vite + TypeScript, canvas para o jogo), leve e rápido no celular.
- Hospedagem: GitHub Pages em `torcida.kauewalter.com.br` (repositório próprio, separado do site).
- Dados: Supabase (login anônimo, Postgres com regras de acesso, ranking ao vivo, funções no servidor para validar partidas).
- Supabase: projeto `guerra-de-torcidas` (ref `ybfeqykdnqmnufrgtnoc`), região São Paulo, plano Free durante o desenvolvimento.
- Chaves: o front-end usa a URL do projeto e a **publishable key** (`sb_publishable_…`). As funções no servidor usam a **secret key** (`sb_secret_…`), só como segredo das funções. As chaves antigas `anon` e `service_role` estão sendo descontinuadas pela Supabase até o fim de 2026: não usar.
- Como a URL e a publishable key são públicas, ficam versionadas no repositório (o build do GitHub Pages precisa delas). Nada secreto entra no repositório.
- **Antes de divulgar:** CAPTCHA (Cloudflare Turnstile) no login anônimo, limpeza periódica de usuários anônimos inativos, anti-trapaça completo e decidir sobre o plano Pro (o Free pausa o projeto depois de 1 semana sem uso).
- **Rotina contra a pausa do plano Free:** um agendamento no GitHub Actions faz uma consulta leve ao banco a cada 2 dias. Enquanto o projeto estiver no Free, isso evita a pausa por 7 dias sem uso. O GitHub desliga agendamentos de repositório público depois de 60 dias sem commit; se isso acontecer, o GitHub avisa por e-mail e basta reativar. Arquivo: `.github/workflows/manter-supabase.yml` (a cada 2 dias às 09h de Brasília e pelo botão "Run workflow"): lê 1 linha do ranking com a publishable key e falha se a resposta não for 200.
- **Zerar pré-temporada:** `npm run zerar-pre-temporada` apaga partidas, desafios e ranking (mantém times e torcedores). Mostra as contagens e só apaga depois de digitar ZERAR.
- **Sessão de usuário apagado:** se o login anônimo salvo no aparelho não existir mais no servidor, o jogo sai e faz um login anônimo novo.
- DNS: CNAME `torcida` no Hostgator, feito manualmente pelo Kauê.
- **Lista de cidades:** municípios do IBGE num arquivo estático (nome, UF, código IBGE), carregado só na tela de escolha.
- **Times:** `src/dados/times.ts` guarda id, nome, cores, artigo e rival (id do outro time ou vazio), conforme a tabela da seção 3.
