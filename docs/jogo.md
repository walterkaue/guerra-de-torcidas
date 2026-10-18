# Guerra de Torcidas — documento do jogo

> Nome provisório. Fonte da verdade do projeto: toda decisão nova entra aqui.
> Última atualização: 18/10/2026 (banco do narrador, artigo e rival dos times)

## 1. A ideia em uma frase

Minigames de futebol de 30 segundos em que **cada ponto que você faz vai para o placar da sua torcida**, num ranking ao vivo contra os rivais.

## 2. Pilares (o que nunca negociamos)

1. **Partida curta.** Uma rodada cabe numa fila de padaria (30 s a 1 min).
2. **Tribal.** Você não joga por você, joga pelo seu time. Ver o rival na frente é o motor.
3. **Zoeira.** Tom de resenha: narrador exagerado, provocação ao rival, nunca ofensa a pessoas ou grupos.
4. **Feito para WhatsApp.** O link abre direto no navegador do celular, sem cadastro e sem loja de app. Todo resultado vira um card pronto para mandar no grupo ou postar nos stories.
5. **Cresce por minigames.** Os minigames mudam; a torcida, o ranking e as ligas ficam e acumulam.

## 3. Torcidas (times)

### Times oficiais
- Os clubes da Série A da temporada atual (lista a confirmar antes do lançamento), mais "Outro time".
- **Só nome, cores e artigo (o/a).** Nada de escudo, uniforme, mascote, hino ou foto de jogador. O artigo serve para o narrador acertar "do"/"da", "pro"/"pra".
- Cada time oficial tem um **rival** cadastrado (o clássico), confirmado junto com a lista de times.

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
- Dentro da liga aparecem só os times dela, com ranking próprio.
- Os pontos continuam contando também para o time oficial de cada jogador (ele defende o 1ºB **e** o Corinthians, por exemplo).

## 5. Rankings

| Ranking | Como calcula | Por quê |
|---|---|---|
| **Maior torcida** | soma dos pontos dos torcedores | mostra força bruta |
| **Torcida mais braba** | média por torcedor ativo (mínimo de N torcedores para entrar) | dá chance aos times menores |
| **Craques da torcida** | melhores jogadores de cada time | status individual |

- **Filtros:** geral, estado, cidade, liga, tipo de time.
- **Períodos:** semana (temporada principal), mês, sempre.
- **Temporada semanal:** zera toda segunda às 00h (horário de Brasília). No domingo à noite sai o "campeão da semana" com card para compartilhar.
- **Teto diário:** só as 5 melhores partidas do dia de cada jogador contam para o ranking. Evita que um viciado decida tudo e limita o estrago de trapaça.

## 6. Minigame 1 — "Bate Contra Mim" (pênaltis)

### Como joga
- **Cobrar (5 cobranças):** deslizar o dedo na direção do gol. Direção do arraste = canto, comprimento = força, curva no fim do arraste = efeito. Força demais vai por cima, de menos o goleiro pega.
- **Defender (5 defesas):** o batedor corre; antes do chute aparece uma "dica" no corpo dele (o pé de apoio). O jogador toca em uma de 6 zonas do gol para pular.
- Jogo normal: contra o goleiro e o batedor da máquina (dificuldade sobe ao longo da semana).
- **Desafio por link:** ao terminar, o jogo gera "duvido você me vencer". Quem abre o link defende as cobranças gravadas de quem desafiou e cobra contra o goleiro da máquina. No fim, placar dos dois lado a lado.

### Pontuação
| Ação | Pontos |
|---|---|
| Gol | 10 |
| Gol no ângulo | +5 |
| Cavadinha que entra | +10 (e narração especial) |
| Defesa | 10 |
| Vitória na disputa | +20 |
| 5 de 5 (cobranças ou defesas) | +25 |

### Anti-trapaça
- O servidor sorteia a semente da partida. O cliente manda só os **gestos** (direção, força, efeito, zona escolhida).
- O servidor recalcula o resultado com a mesma física determinística e é ele que grava os pontos.
- Limite de partidas por minuto por jogador.

### Card de resultado
- Imagem gerada no próprio celular: placar, cores do time, frase do narrador, "Fulano fez 47 pontos pro [time]" e o link do desafio.
- Botões: WhatsApp, stories (via compartilhamento nativo), copiar link.

## 7. Tom e zoeira

- **Narrador:** exagerado, rádio de domingo. Ex.: "É CAVADINHAAAA! Que categoria, que deboche!", "Pegou! O goleiro tava com o almoço pago!", "Isolou! Foi pra Marte, a bola tá orbitando!"
- **Banco de frases:** `docs/narrador.md` (versão 1: 224 frases em 29 situações do pênaltis — lance, fim de partida, desafio por link e provocação no ranking). Frase nova entra lá e passa pelo checklist de tom do próprio arquivo.
- **Provocação ao rival** (só ao time, nunca à pessoa): "Sua torcida tá 300 pontos atrás do [rival]. Vai deixar?"
- **Quem é o rival:** o clássico cadastrado do time. Sem clássico, o rival é o time logo acima no ranking da semana (ou logo abaixo, se o time for o líder). Quem escolheu "Outro time" não recebe provocação.
- **Notificações de semana:** "Faltam 6 horas e o [rival] tá encostando."
- **Limite:** zoeira com o time e com a situação, nunca com raça, orientação, gênero, religião, origem, corpo, deficiência ou pessoa real (jogador, técnico, narrador). Nada de bordão de narrador real nem trecho de música.
- **Classificação livre:** sem palavrão, bebida, aposta ou violência em nenhum texto do jogo. Escolas entram na fase 2.
- **Derrota zoa, mas aponta a saída:** revanche, desafio, "os pontos contam igual pro seu time".

### Nomes candidatos
Guerra de Torcidas (provisório) · Arquibancada · Resenha FC · Rivalzão · Bate Contra Mim (nome do minigame) · Treta FC · Torcida Braba

## 8. Roadmap

| Fase | Conteúdo |
|---|---|
| **1. MVP** | Pênaltis, times oficiais, rankings "Maior torcida" e "Mais braba" na semana, desafio por link, card de resultado |
| **2. Comunidade** | Times criados, ligas e campeonatos combinados, moderação, filtros por estado/cidade |
| **3. Mais minigames** | Embaixadinha (com chinelo, laranja e bola murcha), Craque do Dia (charada diária) |
| **4. Coleção e resenha** | Álbum de figurinhas com jogadores fictícios e trocas, Técnico por Um Jogo, Pelada de Rua |

## 9. Como saber se está funcionando

- **Convites por jogador:** quantos amigos cada um traz (meta: mais de 1).
- **Volta no dia seguinte e em 7 dias.**
- **Partidas por visita.**
- **Desafios aceitos / desafios enviados.**

## 10. Técnica (resumo)

- Front-end estático (Vite + TypeScript, canvas para o jogo), leve e rápido no celular.
- Hospedagem: GitHub Pages em `torcida.kauewalter.com.br` (repositório próprio, separado do site).
- Dados: Supabase (login anônimo, Postgres com regras de acesso, ranking ao vivo, funções no servidor para validar partidas).
- DNS: CNAME `torcida` no Hostgator, feito manualmente pelo Kauê.
