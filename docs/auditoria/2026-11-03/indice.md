# Auditoria visual de telas, 03/11/2026

Prints para a auditoria visual (`docs/jogo.md`, seção 14.2). 85 imagens, todas em **390 × 844, escala 2** (780 × 1688 px; as de "página inteira" ficam mais altas).

## Como foram feitos

- Site local (`npm run dev`) em Chrome sem cabeça, com toque emulado. Sem tocar em produção nem no CAPTCHA.
- O Supabase foi trocado por um servidor falso local (`.env.development.local`, fora do Git) que devolve dados de exemplo: ranking, palpites do Crava, "Ver meus dados" etc. Os modos de dev do próprio jogo cobrem o resto: `?homeFalsa`, `?temporadaFalsa`, `?lancesFalsos`, `?penaltiFalso`, `?provaFalsa`, `?diaFalso`.
- Time Flamengo, sem apelido, sem dado pessoal. Datas, posições e números são de mentira.
- As partidas dos jogos de canvas foram jogadas por gestos simulados (arrastar e tocar), por isso placares e acertos não têm significado.
- Nas imagens de página inteira a barra de navegação inferior aparece no meio. É efeito da captura, não do jogo.
- Nenhum código de tela foi alterado.

## Arquivos

| Arquivo | Tela | Estado | Como chegar |
|---|---|---|---|
| `01-triagem-idade.png` | Triagem de idade | Aparelho com time e sem resposta de idade | Abrir o jogo com time escolhido e sem faixa etária salva |
| `02-home-novo.png` | Home | Jogador novo (sem time, sem conexão com dados) | Abrir o jogo pela primeira vez |
| `03-escolha-de-time.png` | Escolha de time | Jogador novo, lista de times | Home > Escolher meu time |
| `04-escolha-de-time-selecionado.png` | Escolha de time | Time selecionado, campo de apelido vazio | Home > Escolher meu time > toque num clube |
| `05-home-com-time-sem-dados.png` | Home | Com time, servidor sem dados (vazio) | Abrir o jogo com time salvo |
| `06-home-com-dados.png` | Home | Com dados: duelo com o rival, Jogar agora (Time do Dia), Crava em 29 h | Abrir o jogo com time salvo (em dev: ?homeFalsa) |
| `07-home-com-dados-chutes.png` | Home | Com dados: Time do Dia já usou 2 chutes, Jogar agora muda | Idem, cenário chutes (?homeFalsa&cenario=chutes) |
| `08-home-tudo-feito.png` | Home | Com dados: tudo feito hoje | Idem, cenário cravado (?homeFalsa&cenario=cravado) |
| `09-home-semana-vazia.png` | Home | Vazio: semana sem ninguém jogando | Idem (?homeFalsa&semRanking) |
| `10-home-noite.png` | Home | Com dados, luz de noite na arquibancada (20h) | Idem (?homeFalsa&hora=20) |
| `11-sininho.png` | Sininho (aviso de domingo) | Aviso aberto; push não configurado no servidor de teste | Home > sininho no canto superior direito |
| `12-carregando-esqueleto.png` | Carregando (esqueleto de qualquer tela baixada sob demanda) | Carregando | Aparece por instantes ao abrir Perfil, Lances, Prova etc. (aqui forçado pelo módulo esqueleto.ts) |
| `13-sem-rede-tela.png` | Sem conexão para abrir a tela | Erro de download da tela | Aparece se o código da tela não baixa (aqui forçado por esqueleto.ts) |
| `14-perfil-com-carreira.png` | Perfil (com Carreira) | Com dados: nível Reserva, 770 XP, posições e recordes | Barra inferior > Perfil (?homeFalsa) |
| `15-perfil-sem-dados.png` | Perfil | Vazio / sem conexão com o servidor: sem XP, posição nem recordes | Barra inferior > Perfil |
| `16-ranking-semana-campeao.png` | Ranking, aba Semana (Campeão da semana) | Com dados | Barra inferior > Ranking |
| `17-ranking-semana-maior-torcida.png` | Ranking, aba Semana (Maior torcida) | Com dados | Ranking > Maior torcida |
| `18-ranking-semana-passada.png` | Ranking, aba Semana, Semana passada | Com dados (servidor de teste devolve a mesma tabela) | Ranking > Semana passada |
| `19-ranking-carregando.png` | Ranking, aba Semana | Carregando (servidor demora) | Barra inferior > Ranking com internet lenta |
| `20-ranking-vazio.png` | Ranking, aba Semana | Vazio: ninguém jogou ainda | Barra inferior > Ranking |
| `21-ranking-erro.png` | Ranking, aba Semana | Erro: sem conexão com o placar | Barra inferior > Ranking |
| `22-ranking-temporada-unica.png` | Ranking, aba Temporada | Com dados: novembro, 2 semanas fechadas | Ranking > Temporada (?temporadaFalsa=unica) |
| `23-ranking-temporada-ab.png` | Ranking, aba Temporada | Com dados: dezembro A/B e novembro fechado | Ranking > Temporada (?temporadaFalsa=ab) |
| `24-ranking-temporada-vazia.png` | Ranking, aba Temporada | Vazio: mês sem semana fechada | Ranking > Temporada (?temporadaFalsa=vazia) |
| `25-ranking-temporada-fechada.png` | Ranking, aba Temporada | Mês fechado, com destinos | Ranking > Temporada (?temporadaFalsa=fechada) |
| `26-ranking-temporada-erro.png` | Ranking, aba Temporada | Erro: falha de rede | Ranking > Temporada (?temporadaFalsa=erro) |
| `27-conquistas.png` | Ranking, aba Conquistas (quadro de medalhas) | Com dados (?lancesFalsos) | Ranking > Conquistas |
| `28-conquistas-sem-dados.png` | Ranking, aba Conquistas | Sem dados / sem conexão | Ranking > Conquistas |
| `29-casa-clube.png` | Casa do Flamengo (clube do jogador) | Com dados (Casa abre no clube do jogador a partir da Home) | Home > Casa do [time] |
| `30-casa-indice.png` | Casa, índice dos clubes | Com dados | Endereço #casa (sem id) ou voltar da Casa do clube |
| `31-casa-clube-topo.png` | Casa do Flamengo, topo | Com dados | Casa do [time] |
| `32-casa-seja-socio.png` | Casa do Flamengo, Seja sócio / Apoie o clube | Aviso aberto (programa oficial de sócio torcedor) | Casa do Flamengo > Conhecer o programa |
| `33-lances-aba-penaltis.png` | Lances do Jogo, aba Pênaltis | Com dados: disputa livre e disputas históricas | Home > Lances do Jogo |
| `34-lances-aba-faltas.png` | Lances do Jogo, aba Faltas | Com dados: lista de lances, nenhum escolhido | Lances > Faltas |
| `35-lances-ficha-do-lance.png` | Lances do Jogo, ficha de um lance | Lance aberto com Treinar e Pôr na partida | Lances > Faltas > toque num lance |
| `36-lances-barra-da-partida.png` | Lances do Jogo, barra "Sua partida" | Três lances escolhidos, botão Jogar os 3 ligado | Lances > Faltas > Pôr na partida em 3 lances |
| `37-lances-aba-cara-a-cara.png` | Lances do Jogo, aba Cara a cara | Com dados | Lances > Cara a cara |
| `38-lances-filtro-clube.png` | Lances do Jogo, filtro de clube | Clube filtrado (Vasco) | Lances > Clube |
| `39-penaltis-como-jogar.png` | Pênaltis, Como jogar | Quadro "Antes do apito" ao abrir a primeira partida | Lances > Pênaltis > Disputa livre |
| `40-penaltis-cobranca.png` | Pênaltis (disputa livre) | Cobrança: arrastar da bola ao gol | Lances > Pênaltis > Disputa livre |
| `41-penaltis-chute-em-voo.png` | Pênaltis (disputa livre) | Bola em voo depois do arraste | Lances > Pênaltis > Disputa livre |
| `42-penaltis-depois-do-chute.png` | Pênaltis (disputa livre) | Pausa depois do lance (grito do narrador) | Lances > Pênaltis > Disputa livre |
| `43-penaltis-defesa-batedor-correndo.png` | Pênaltis (disputa livre) | Defesa: batedor corre, tocar no gol onde pular | Lances > Pênaltis > Disputa livre |
| `44-penaltis-resultado.png` | Pênaltis, resultado | Vitória 5 x 4 na morte súbita (+90 pro time) | Fim da disputa de 5 cobranças e 5 defesas |
| `45-penaltis-card.png` | Pênaltis, card de compartilhar (Bate contra mim) | Card aberto, derrota 3 x 4 | Resultado > Ver o card |
| `46-faltas-mirar.png` | Faltas (partida de 3) | Mirando: arrastar da bola ao gol | Lances > Faltas > Pôr 3 lances > Jogar os 3 |
| `47-faltas-chute.png` | Faltas (partida de 3) | Chute: bola em voo | Lances > Faltas > Pôr 3 lances > Jogar os 3 |
| `48-faltas-pausa.png` | Faltas (partida de 3) | Depois do chute (gol, defesa ou fora) | Lances > Faltas > Pôr 3 lances > Jogar os 3 |
| `49-faltas-resultado.png` | Faltas, resultado com medalha nova | Fim da partida de 3 (medalha de bronze no 1º lance) | Lances > Faltas > Jogar os 3 até o fim |
| `50-faltas-card.png` | Faltas, card de compartilhar | Card aberto | Resultado > Ver o card |
| `51-cara-a-cara-chegada.png` | Cara a cara (partida de 3) | A jogada: a câmera chega ao lance | Lances > Cara a cara > Pôr 3 lances > Jogar os 3 |
| `52-cara-a-cara-mirar.png` | Cara a cara (partida de 3) | Mirando: arrastar da bola ao gol | Lances > Cara a cara > Pôr 3 lances > Jogar os 3 |
| `53-cara-a-cara-chute.png` | Cara a cara (partida de 3) | Chute: bola em voo | Lances > Cara a cara > Pôr 3 lances > Jogar os 3 |
| `54-cara-a-cara-pausa.png` | Cara a cara (partida de 3) | Depois do chute (gol, defesa ou fora) | Lances > Cara a cara > Pôr 3 lances > Jogar os 3 |
| `55-cara-a-cara-resultado.png` | Cara a cara, resultado com medalha nova | Fim da partida de 3 (medalha de bronze no 1º lance) | Lances > Cara a cara > Jogar os 3 até o fim |
| `56-cara-a-cara-card.png` | Cara a cara, card de compartilhar | Card aberto | Resultado > Ver o card |
| `57-prova-regras.png` | Prova de Boleiro, regras | Início, com as regras abertas (primeira vez) | Home > Prova de Boleiro |
| `58-prova-pergunta.png` | Prova de Boleiro, pergunta | Pergunta 1, nenhuma resposta ainda | Prova > Começar a prova |
| `59-prova-acerto.png` | Prova de Boleiro, resposta certa | Alternativa certa marcada, feedback | Prova > responder certo |
| `60-prova-parar-ou-seguir.png` | Prova de Boleiro, Parar ou seguir | Quadro de decisão no degrau | Prova > acertar até o degrau de decisão |
| `61-prova-erro-vidas.png` | Prova de Boleiro, vidas (erros restantes) | Um erro feito: "2 erros restantes" | Prova > errar uma pergunta |
| `62-prova-resultado.png` | Prova de Boleiro, resultado | Fim da prova, com pontos e escada | Prova > até o fim |
| `63-prova-card.png` | Prova de Boleiro, card de compartilhar | Card aberto | Resultado > Ver o card |
| `64-time-do-dia-inicio.png` | Time do Dia, início | Primeira vez: regras e grade de clubes | Home > Time do Dia (?diaFalso=goias) |
| `65-time-do-dia-pistas-1.png` | Time do Dia, pistas | Depois do 1º chute errado: primeiras pistas | Time do Dia > escolher clube > Chutar |
| `66-time-do-dia-pistas-3.png` | Time do Dia, pistas | Depois de 3 chutes errados | Idem, mais chutes |
| `67-time-do-dia-fim.png` | Time do Dia, fim | Acertou o clube secreto | Time do Dia > chutar o clube certo |
| `68-time-do-dia-card.png` | Time do Dia, card de compartilhar | Card aberto | Fim > Ver o card |
| `69-time-do-dia-fim-errou.png` | Time do Dia, fim | Não acertou em 6 chutes | Time do Dia > 6 chutes errados |
| `70-crava-rodada.png` | Crava a Rodada, rodada aberta | Primeira vez: aviso "Como cravar" por cima | Barra inferior > Palpites |
| `71-crava-rodada-lista.png` | Crava a Rodada, rodada aberta | Lista de jogos, nenhum palpite ainda | Palpites |
| `72-crava-palpite-montado.png` | Crava a Rodada, palpite | Placares ajustados com − e +, ainda sem cravar | Palpites > − / + no cartão do jogo |
| `73-crava-palpite-cravado.png` | Crava a Rodada, palpite cravado | Dois jogos cravados, certeza ×2 no Flamengo x Palmeiras | Palpites > Cravar > Certeza ×2 |
| `74-crava-mandar-palpites.png` | Crava a Rodada, compartilhar | Botão "Mandar meus palpites" (o card sai pelo compartilhar do celular) | Palpites > fim da página |
| `75-crava-tabela.png` | Crava a Rodada, aba Tabela | Tabela do Brasileirão (sem resultados no servidor de teste) | Palpites > Tabela |
| `76-crava-card-meus-palpites.png` | Crava a Rodada, card "Meus palpites" | Card gerado | Botão de compartilhar do Crava (card desenhado no celular; aqui chamado direto pelo módulo cardCrava) |
| `77-crava-resultado.png` | Crava a Rodada, resultado da rodada | Jogos encerrados com acerto exato, vencedor e erro; um jogo rolando | Palpites > rodada com jogos encerrados |
| `78-crava-card-resultado.png` | Crava a Rodada, card "Resultado da rodada" | Card gerado | Botão de compartilhar do Crava (card desenhado no celular; aqui chamado direto pelo módulo cardCrava) |
| `79-termos.png` | Termos e privacidade | Texto completo, topo | Home > Termos e privacidade (ou #termos) |
| `80-termos-botoes-dados.png` | Termos e privacidade, Ver meus dados / Apagar | Botões fechados | Termos > rolar até o fim |
| `81-termos-pagina-inteira.png` | Termos e privacidade | Página inteira | Termos |
| `82-ver-meus-dados.png` | Ver meus dados | Com dados guardados (ficha) | Termos > Ver meus dados |
| `83-ver-meus-dados-vazio.png` | Ver meus dados | Vazio: o servidor não guarda nada deste aparelho | Termos > Ver meus dados |
| `84-apagar-meus-dados.png` | Apagar meus dados | Pedido de confirmação | Termos > Apagar meus dados |
| `85-aviso-nao-vale-pontos.png` | Pênaltis, aviso "não vale pontos" | Servidor sem resposta: "Sem conexão: essa partida não vale pontos." | Lances > Pênaltis > Disputa livre sem internet |

## O que não deu para capturar (ou saiu só aproximado)

- **Carregando e erro** de tela baixada sob demanda (esqueleto e "Sem conexão pra abrir essa tela"): saem como cenas forçadas pelo módulo `esqueleto.ts` (`12` e `13`), não ao abrir uma tela específica. Carregando e erro reais só do Ranking Semana (`19` e `21`).
- **Carregando e erro** da Home, do Perfil, da Casa, de Lances, Prova, Time do Dia e Crava: não há estado separado visível; o sem conexão da Home e do Perfil está em `05` e `15`.
- **Cards** de Pênaltis, Faltas, Cara a cara, Prova e Time do Dia são os que a tela mostra em "Ver o card". Os do Crava só existem pelo compartilhar do celular, então foram desenhados chamando o módulo do card (`76` e `78`).
- **Faltas** não tem print de "A jogada" antes do arraste (`chegada`); só o Cara a cara tem (`51`).
- **Perfil com Carreira**: a Carreira é a faixa de nível e XP do topo do Perfil (`14`); não há tela separada.
- **Sininho**: só o estado "aviso ainda não configurado", porque push depende do navegador e do servidor reais.
- **Termos**: topo, final e página inteira; "Apagar meus dados" só o pedido de confirmação, sem apagar.
