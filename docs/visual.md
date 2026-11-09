# Revisão gráfica — direção "Transmissão de domingo"

> Versão 1.17 · 08/11/2026 · **Direção aprovada em 18/10/2026; rota "Grafismo de TV" em 03/11/2026.** Mockups no canvas "Guerra de Torcidas — revisão gráfica" (Início, Partida, Resultado, Tabela, Palpite da Rodada).
> Mudanças da 1.17: barra do resultado opaca e barras de baixo com o espaço medido (seção 4, "Barras de baixo"); par principal × secundário em 1 : 1,4 também na barra do resultado; parcelas dos pênaltis com a quantidade no rótulo ("3 gols · +21"); placar da partida com siglas de 12 px em 2 linhas no celular estreito; "Escolher a cidade" no estilo claro; código do aviso de conexão com 12 px e 5,5:1.
> Mudanças da 1.16: boneco em campo (o batedor da pessoa é o boneco montável, de costas e com o número) e bustos no desafio (seção 3, "Bonecos"; replay na 4.2).
> Mudanças da 1.15: partida em tela grande com o campo pela altura, aviso "Vire o celular pra jogar" e "Mandar esse lance" na ficha (seção 4.7; teto de pixels na 4.3).
> Mudanças da 1.14: card do troféu da Galeria nos cards personalizáveis e flâmula com contorno claro (seção 3, "Card de compartilhamento").
> Mudanças da 1.13: estilo Pôster e busto do boneco nos cards personalizáveis (seção 3, "Card de compartilhamento").
> Mudanças da 1.12: "Grafismo de TV" (seção 4.6): placas, números em bloco, selo único da pré-temporada, abas de dois níveis e resultado padrão nos 5 jogos; Resultado (seção 3) e Perfil (3.1) seguem a 4.6.
> Base: o jogo publicado em 18/10/2026 (commit b492b99), testado em 390×844.
> Mudanças da 1.11: card de compartilhamento "Telão do estádio" (seção 3).
> Mudanças da 1.10: seção da Casa na Home, com estádio e troféus (seção 3, item 7), e total de lances no card dos Lances (seção 3, item 5).
> Mudanças da 1.9: Home nova: arquibancada do time, cabo de guerra com nó e sua posição, Jogar agora, cards com desenho, giro (seção 3), e aba Perfil (seção 3.1).
> Mudanças da 1.8: impacto na trave e na defesa (seção 3, Partida), papel picado (4.4) e troca de tela inclinada (4.5).
> Mudanças da 1.7: qualidade gráfica automática em três níveis (seção 4.3).
> Mudanças da 1.6: replay de TV do gol (seção 4.2).
> Mudanças da 1.5 (revisão de 26/10): adesivo do narrador em papel claro com faixa na cor do time (a caixa cheia vermelha parecia aviso de erro); duelo da Home com cores que se distinguem; ícones em SVG no lugar de emoji; tela de carregando com esqueleto; molas e resposta ao toque (seção 4).
> Mudanças da 1.4: a Home deixa de lembrar anúncio de aposta (seção 3, Início); amarelo de placar mais fosco `#e9c75a`; selo vermelho "AO VIVO" removido.
> Mudanças da 1.3: cards de time com "faixa de placar" (seção 3, Escolha do time), no lugar das listras diagonais translúcidas; "sua posição" e recorde na Home e nos resultados.

## 1. O que vi no jogo hoje

- A base é boa: verde-gramado, amarelo de placar, botões grandes e "afundáveis". Mantemos.
- **Início estático:** um ranking de exemplo com "?" e muito espaço vazio. Não dá vontade de voltar amanhã.
- **Partida achatada:** o gol fica pequeno no topo e 60% da tela é gramado vazio. Não há perspectiva, a bola é pequena e o gol comemorado é só um texto.
- **Resultado:** o card é bom, mas os pontos aparecem como lista e não mostram o efeito no ranking da torcida, que é o motivo de jogar.
- **Tipografia de sistema:** funciona, mas não tem cara de futebol.

## 2. Direção

Placar de TV, grito de narrador e arquibancada. Tudo puxa a cor do time de quem joga.

| Item | Proposta |
|---|---|
| Fundo | Gramado listrado, como hoje (`#0b3d1f` e `#0e4625`) |
| Destaque | Amarelo de placar fosco `#e9c75a` (botão principal, números, alertas bons). Só para leitura e ação, nunca como contorno de cartão. (Era `#ffd23f`; o desenho em canvas, como o goleiro amarelo, segue com `#ffd23f`) |
| Cor do time | `--c1` do time escolhido no bloco do time, no grito do narrador, na arquibancada, no card e na **camiseta lisa** dos batedores (uniforme 1 ou 2; o goleiro usa um tom forte de contraste, ver `docs/bonecos.md`) |
| Subiu / caiu | Verde `#3ddc84` e vermelho `#ff5a3c`, sempre com seta ou ícone, nunca só a cor |
| Números e gritos | **Anton** (condensada, de placar) |
| Rótulos | **Barlow Condensed** em caixa alta |
| Texto | **Barlow** |
| Assinatura visual | Tarjas de transmissão inclinadas (−8°) nos elementos de TV (placar, adesivo do narrador levemente torto). **Sem selo vermelho "AO VIVO" nem nada piscando fora da partida:** na Home isso lembrava painel de aposta. **Cores de time sempre cheias**, nunca translúcidas por cima de outra cor |

As fontes entram auto-hospedadas e só com os caracteres do português (~60 KB no total), dentro do limite de 300 KB do `CLAUDE.md`.

## 3. Tela a tela

### Escolha do time (decidido em 20/10)
- **Card "faixa de placar":** cor 1 cheia; faixa reta na cor 2 embaixo (~1/4 da altura); nos tricolores, filete de 3 px da 3ª cor entre as duas (Bahia e Fluminense e Grêmio: branco; São Paulo: preto).
- Nome em Barlow Condensed 800, caixa alta, alinhado em cima à esquerda, cor pelo `corDeTexto(cor1)`; sem sombra em fundo claro.
- Times de cor 1 branca (Bragantino, Santos, São Paulo) ganham um contorno interno sutil, para não sumirem.
- Selecionado: borda amarela `#ffd23f` + halo, como hoje.
- **Proibido:** listras na direção da camisa, faixa diagonal, estrelas, xadrez ou qualquer elemento de camisa ou escudo. Todos os clubes usam o mesmo desenho; a diferença está na cor e no nome.
- Mesmo desenho reaproveitado onde o time aparece em bloco (Home, ranking, Palpite da Rodada), sem mudar o que já usa a divisão `c1/c2`.

### Início
Home nova, decidida em 31/10/2026. De cima para baixo:

1. **Cabeçalho:** avatar à esquerda (desde 05/11/2026, o busto de 52 px do boneco montável, com fundo e moldura; sem boneco, o círculo na cor 1 do time com o ícone de pessoa), que abre a aba Perfil; título no meio; sininho à direita (só para 18+). Embaixo, a etiqueta reta cinza "Pré-temporada" e a **contagem regressiva** ("Semana fecha em 5d 03h"). Nada novo no canto superior direito, sem selo vermelho, sem piscar.
2. **Arquibancada do time:** faixa de ~150 px de ponta a ponta com a torcida da partida nas cores do time, pré-desenhada uma vez (`telas/arquibancada.ts`, com os torcedores em `telas/torcida.ts`). Luz pelo horário de Brasília: **dia** das 6h às 17h, **entardecer** até 19h e **noite** com os refletores acesos. Por cima, a tarja inclinada (−8°) "VOCÊ JOGA PELO / [TIME]" (com o artigo certo) e o "trocar". Qualidade Alta e Média: a torcida balança de leve (troca de quadro a cada 340 ms). Leve e movimento reduzido: parada. Sem escudo, sem camisa, sem pessoa reconhecível. Sem time, a tarja pergunta "Qual é a sua torcida?".
3. **Cabo de guerra:** números em Anton dos dois lados, barra nas duas cores (se a cor do rival for parecida com a nossa, ele entra com a 2ª cor ou um neutro: a mesma régua de contraste dos uniformes) e um **nó** amarelo `#e9c75a`, inclinado, na posição da diferença, que anda com `--mola-firme` quando muda. Adesivo do narrador embaixo (`rival_colado` etc.). Última linha do bloco: "Você: 3º de 4 na semana", com seta verde ou vermelha desde a última visita. "Outro time" não tem duelo: fica só a linha da posição.
3a. **Bloco das divisões** (06/11/2026, Rota 2 "linha ao vivo"; `docs/jogo.md` seção 5, "Telas do resto das divisões"): placa escura logo abaixo do cabo, só para os 20 times. À esquerda, a posição grande em Anton ("8º", ou "–" sem semana travada); à direita, "Na Série A · dezembro" e "4 pts acima da zona · 2 de 4 semanas"; embaixo, a linha "Se a semana fechasse agora: …" com seta verde `--subiu` (sobe) ou vermelha (desce), e o adesivo pequeno do narrador. Altura reservada desde a abertura, para não empurrar o "Jogar agora". Sem contagem regressiva nem piscar. Tocar abre Ranking > Temporada.
4. **Botão "Jogar agora"** (amarelo, o único botão principal da tela). Abre, nesta ordem: **Palpite da Rodada**, se a rodada aberta fecha em menos de 24 h e a pessoa ainda não palpitou nela; **Time do Dia**, se ainda não jogou hoje; **Lances do Jogo**, se ainda faltam partidas que contam hoje; senão **Prova de Boleiro**. "Fecha" é a hora em que o próximo palpite tranca, a mesma do card; um palpite em qualquer jogo da rodada já conta. A linha de baixo diz o motivo em tom informativo, sem pressão ("Time do Dia: ainda não jogou hoje"). Sem time, vale a mesma ordem, com a escolha do time na frente.
5. **Cards dos jogos** com desenho em SVG inline, na paleta do jogo, e estado vivo, em tamanhos diferentes (`telas/cardsJogos.ts`). Toque com a resposta de hoje: encolhe e volta com a mola, vibração leve.
   - **Lances do Jogo:** largo, com um gol com rede e o rastro amarelo de uma bola, a tarja com o total do catálogo ("51 lances") e, na descrição, quantos são do seu time; estado = partidas que contam hoje.
   - **Prova de Boleiro** e **Time do Dia** lado a lado: a escada de 8 degraus (acende até onde o recorde alcança; estado = recorde) e a grade de bolinhas de pista nas cores das células (estado = chutes usados hoje, ou o resultado se já terminou).
   - **Palpite da Rodada:** largo, com o placar palpitado numa tarja inclinada ("? x ?" enquanto não há palpite); estado = "Palpite salvo" ou quando a rodada fecha.
6. **Giro da semana:** uma linha estilo tarja de TV com frases de posição das torcidas, a partir do ranking já carregado ("Flamengo subiu pro 2º", "Corinthians a 12 do Palmeiras"), trocando a cada 5 s com esmaecer, sem rolar e sem piscar. Só torcidas, nunca apelido, com o artigo certo do time. Movimento reduzido ou Leve: uma frase fixa. Tocar abre o Ranking, que substitui a mini tabela que ficava aqui.
7. **Casa do [time]:** seção larga com uma cena de noite em SVG inline (`telas/cardsJogos.ts`): estádio com as arquibancadas nas duas cores do time, refletores e troféus inventados em ouro e prata (nenhum imita taça de verdade), com a tarja "Casa do Flamengo" por cima. Abre a Casa do seu time; sem time ou em "Outro time", o título é "Casa dos clubes" e abre o índice, com a cena em amarelo e branco.
8. **Continuam:** aviso único da pré-temporada ("tudo vale ponto, mas zera antes do lançamento") e o rodapé "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca. Jogo 100% grátis." (a frase é a mesma `AVISO_RESENHA` do Palpite da Rodada), além dos links de feedback, de apoio e de Termos.
9. **Saem da Home e vão para o Perfil:** o bloco "Sua carreira", a caixa "Mostrar meu nível nos cards" e o botão "Gráficos".

**Fora, de propósito:** banner de evento, pop-up, selo "AO VIVO", qualquer coisa piscando, sequência de dias.

- Convite de desafio com borda neutra fina, não amarela. É a única exceção ao botão principal único: só aparece para quem chegou por um link de desafio.
- Barra de navegação: Jogar, Palpites, Tabela, Perfil.

### Partida
- **Perspectiva:** gol maior e mais baixo, linhas da área convergindo, marca do pênalti com a bola grande perto do dedo.
- Placar estilo TV inclinado, com bolinhas verdes (gol), pretas (erro) e amarela (ângulo ou cavadinha).
- Arquibancada nas cores do time atrás do gol, que faz "ola" a cada gol.
- **Grito do narrador como adesivo:** caixa na cor do time, borda branca, entra com um "pop", e a frase complementar logo abaixo. (Só na partida, que é um momento curto de festa. Fora dela, na Home, no resultado e no Time do Dia, o adesivo é papel claro com faixa na cor do time: a caixa cheia em time vermelho parecia aviso de erro. Decidido em 26/10.)
- **Rastro da bola** amarelo seguindo o arraste do dedo; "+15" subindo do ponto do gol.
- Gol: tremida curta da tela (120 ms), rede balançando e vibração no Android (`navigator.vibrate`).
- **Trave e defesa (26/10):** a bola não para mais no ar. Na trave: anel de brilho no ponto da batida, tremida mais fraca que a do gol, vibração de dois toques e um "plém" metálico; a bola volta quicando para o campo. Defesa em canto alto sai **espalmada** para fora e por cima; defesa baixa fica encaixada na luva. Defesa de quem joga vibra como acerto. Nos Lances, a bola também volta da trave e da barreira. Só desenho e som: o motor e os pontos não mudam.
- Cavadinha: câmera lenta de 0,5 s antes de entrar.
- **Bonecos (Silhueta premium, `docs/bonecos.md`):** esqueleto por rotações com poses-chave interpoladas. Batedor: ajeita a bola agachado e recua, mãos na cintura, chute em 4 tempos (pé de apoio, puxada, contato, finalização), cavadinha de toque curto, comemora o gol ou põe as mãos na cabeça. Máquina: corrida de 3 passos e fixa o pé de apoio. Goleiro: balança na linha, pulo baixo ou alto para cada lado, de pé no meio, cai no chão depois do pulo, com a bola encaixada no peito quando defende. Bola com gomos girando e rastro de borrão.
- **Dica da defesa no corpo:** a partir de 55% da corrida aparece no chão, em amarelo, a pegada de onde o pé de apoio vai fixar, com a seta do canto; quando o batedor chega, a chuteira do pé de apoio fica amarela e continua assim no chute.
- **Desempenho:** grama, linhas, rede e 3 quadros da torcida ficam pré-desenhados; a cada quadro só bonecos, bola, traves e efeitos são desenhados ao vivo. Na ola, a torcida é redesenhada agrupada por cor (um preenchimento por cor). Medido em 19/10 com CPU 4× mais lenta (perfil de celular médio do Chrome), 390×844: 1,2 ms de trabalho por quadro em média, 99% dos quadros abaixo de 10 ms.
- Contraste: texto sobre a cor do time usa sempre `corDeTexto` (escuro em time de cor clara, branco no resto).

### Resultado (todos os minigames)
- Placar gigante, "VITÓRIA" ou "DERROTA", confete nas cores do time quando há o que comemorar (desde 05/11/2026 em todos os jogos, pelo `resultadoPadrao.ts`: vitória, recorde novo, partida nas 3 melhores do dia, Time do Dia acertado e medalha nova; uma vez por resultado, com vibração).
- **"+85 PRO [TIME]"** contando de 0 até o total, com os bônus em etiquetas (com o artigo certo: "pra Chapecoense"). **Nas parcelas, o número é o dos pontos e o rótulo leva a quantidade** (08/11/2026): "+21 · 3 gols", "+7 · 1 defesa", "+4 · 1 ângulo"; Vitória e 5 de 5 sem quantidade. Uma parcela só não aparece (repetiria o total, J24).
- **O efeito na torcida:** "subiu de 5º pra 3º na Série A" com barra enchendo, e quanto falta para o próximo.
- **Sua posição naquele minigame** na semana e o **recorde pessoal**; quando bate o recorde, selo "NOVO RECORDE!" (que entra no card).
- Botões: "Mandar no grupo" (WhatsApp, o maior, verde), com Card, Stories, Emoji e Link embaixo, e "Mais uma" ou "Jogo de volta" como ação principal. Ordem e blocos do resultado padrão na seção 4.6 (03/11/2026).

### Card de compartilhamento
Card 'Telão do estádio' (decidido em 31/10/2026): arquibancada do clube no alto com a luz pelo horário da Home; telão pendurado com o resultado de cada jogo (placar nos Lances, escada na Prova, bolinhas sem revelar o clube no Time do Dia, palpites ou acertos no Palpite da Rodada); '+pontos pro time' em Anton amarelo como protagonista; adesivo do narrador; gramado e rodapé com selo da Carreira, link e aviso da pré-temporada. Sem escudo, camisa ou pessoa; legível na miniatura do WhatsApp. A arquibancada do card é sempre a do clube, mesmo em lance da seleção. Todo minigame novo usa este modelo, com seu conteúdo dentro do telão.

**Cards personalizáveis (05/11/2026, `docs/jogo.md` 14.6).** O Telão é um de três estilos (Telão, Só o placar e Pôster), em Stories (1080 × 1920) e Quadrado (1080 × 1080):
- **Telão no Quadrado:** a mesma cena, com a arquibancada mais baixa e o telão inteiro em escala 0,66. Número, quem fez, adesivo, nível e rodapé vêm empilhados embaixo. Com o placar desligado, o telão encolhe e fica só com o nome do time, maior.
- **Só o placar:** papel claro (`#f4f1e8`), sem arquibancada. De cima para baixo: linha do topo, filete nas duas cores do time, o número enorme em Anton (#111), o nome do time em Anton numa cor do time com contraste no papel, o que foi jogado, o placar em emoji (desenhado, então vale qualquer emoji), quem fez, a frase num adesivo de borda na cor do time, a pílula do nível e o link. A pilha fica centrada na vertical e encolhe até caber. O aviso da pré-temporada fica preso no pé.
- **Pôster (05/11/2026):** o boneco do vestiário (`docs/bonecos.md` seção 6) é o card. O fundo escolhido ocupa tudo; atrás do boneco, o número da camisa enorme em Anton, translúcido, na cor 1 do time (cor 2 ou contorno claro quando a cor 1 some no fundo). O boneco em corpo inteiro com sombra no chão no Stories, do joelho pra cima no Quadrado, de braços pra cima quando a pose está liberada. Faixa quase preta no topo: "GUERRA DE TORCIDAS" pequeno em amarelo e, embaixo, o jogo e o lance em Barlow Condensed branca. Por cima das pernas: o adesivo do narrador (o mesmo do Telão), uma placa quase preta de cantos redondos com borda amarela (apelido em Barlow branca e nível em Barlow Condensed amarela à esquerda; pontos em Anton amarelo e "pro [time]" à direita; no card de medalha, a medalha desenhada ao lado de "OURO") e, no pé, o link e o aviso da pré-temporada. Selo de recorde ao lado do tronco. Nada de escudo, texto na camisa ou pessoa real.
- **Card do troféu (06/11/2026, `docs/jogo.md` 14.6):** no Telão, o painel escuro traz o troféu grande (o mesmo SVG da Galeria, com cores fixas), o nome do troféu em Anton branco, uma faixa amarela com série e período (Barlow Condensed, texto escuro), o nome do time numa faixa de placar (cor 1 cheia, faixa reta na cor 2 à esquerda, contorno branco translúcido e texto na cor de maior contraste) e os 3 números em Anton amarelo com o rótulo embaixo; no Quadrado, o painel é largo, com o troféu à esquerda. Nada de texto por cima da linha branca do gramado. No Só o placar, o troféu sobre o papel, o nome em Anton #111 e uma linha pequena de números. No Pôster, a placa leva o troféu e o nome dele à direita (até 2 linhas), com "Time · série" embaixo. A flâmula ganha contorno branco translúcido de 0,8 (em 40 × 60) em volta da bandeira e da faixa da cor 2 quando fica sobre fundo escuro (card e placa da Home), para a cor 2 preta não sumir; sobre o papel fica o contorno escuro de sempre.
- **Card de fim de temporada (06/11/2026, Rota 1 "tabela final no telão"; `docs/jogo.md` seção 5):** no Telão, "FIM DE DEZEMBRO" no topo, a arquibancada do time e, no telão, o pedaço da tabela final em volta do time (5 linhas: posição, time, pontos), a do seu time na cor do time e um tracejado verde "sobem" ou vermelho "caem" onde passa a linha; o selo inclinado do destino ("SUBIU!", "CAMPEÃO", "FICOU", "CAIU"), a faixa de placar do time, os 3 números em Anton amarelo (posição, pontos, vitórias de semana), a frase e "<apelido> tava na arquibancada". No Pôster, o selo do destino na placa, como a medalha. Queda: neutro, sem festa.
- **Busto no Telão e no Só o placar ("Meu boneco"):** o busto redondo com fundo e moldura (200 px no Stories, 104 no Quadrado), à esquerda da linha de quem fez, o grupo centrado; sem a linha, o busto sozinho.
- **Tela "Seu card":** fundo de gramado. Embaixo do topo (✕, "SEU CARD" em Barlow Condensed e o seletor Stories | Quadrado, com o marcado em papel claro) fica o card grande no meio, com as pontas dos outros estilos dos dois lados, e embaixo dele os nomes dos estilos como botões de tocar (o atual em amarelo) e "deslize pra trocar". Depois vêm os 8 quadradinhos (de ligar: papel claro com ✓ quando ligados, placa escura quando desligados; de ação: verde `--subiu`; "Meu boneco" por último: como os de ligar, amarelo com ✓ no Pôster e apagado sem conexão) e, no pé, Salvar imagem (placa escura) e Compartilhar (amarelo, o único botão principal), na proporção 1 : 1,4. Sem transição no deslizar com movimento reduzido.

### Tabela
- Abas: Semana; Temporada, com as sub-abas Mês · Série A e B e 52 semanas; Cidades, com a 4ª sub-aba Campeãs; Conquistas, com as sub-abas Medalhas e Galeria.
- **Galeria em estante:** botão do time no topo (cor 1 do time, "Trocar"). Taças em SVG, pintadas com `--taca` e `--taca-sombra`; a que ainda não veio é tracejada, apagada, com "ainda não"; repetida ganha "×N" no canto. Flâmula lisa na cor 1, com faixa reta na cor 2 junto do mastro, data embaixo e selo "Série B" quando for. Megafone para a Maior torcida, com "×N". Cada prateleira é uma placa escura com faixa-título.
- **Ficha do troféu:** folha que abre de baixo, troféu grande no alto, três números, frase em itálico. "Fechar" escuro e "Mandar no grupo" verde, os dois do mesmo tamanho.
- **52 semanas:** placa do seu time com os três números, a janela em letra pequena e a lista dos 20 com uma barrinha proporcional ao líder (a sua torcida destacada). Na pré-temporada, o selo "Teste: zera no lançamento".
- **Placa de fim do mês na Home** (06/11/2026): no lugar da "Troféu novo" (abaixo do "Jogar agora"), uma por mês. Faixa "Fim de dezembro · temporada fechada", emblema em SVG (seta para cima em `--subiu`, para baixo em cinza, traço cinza para quem fica), o destino em Anton, a linha do fim em Barlow, a frase em adesivo claro e dois botões do mesmo tamanho: "Ver a tabela" (ou "Ver na Galeria") escuro e "Mandar no grupo" claro. Papel picado e vibração só quando sobe ou ganha taça; fica e caiu, neutra. Pré-temporada: selo "Teste das divisões".
- **Placa da Home ("Troféu novo na Galeria"):** botões claros, nunca amarelos (o amarelo é do "Jogar agora"). Entra com uma animação curta de altura; com movimento reduzido, aparece sem animação. Papel picado e vibração só na primeira vez que o troféu é anunciado.
- **Aba Cidades:** seletor Esta semana/Passada (provisória e travada como na aba Semana, numa linha só dele) e, na linha de baixo, as sub-abas Seu estado (cidades do estado da pessoa), Top nacional (20 primeiras), Estados e Campeãs, do mesmo tamanho e na largura toda (o nome longo quebra em 2 linhas, sem rolagem em 360). Linha: posição, nome (com UF no top), jogadores na semana e média dos 30 melhores; a sua cidade (ou estado) destacada como nas torcidas. Sem cidade escolhida, abre em Top nacional com convite para `#cidade`. Só entram 5+ jogadores; abaixo disso, "Faltam 2 pra sua cidade entrar no ranking. Chama a galera.". Nenhum apelido.
- Tabela da Série A com faixa amarela no líder e vermelha na zona de rebaixamento, sua torcida destacada.
- Explicação curta de como conta, no rodapé.

### Palpite da Rodada
- **Aviso fixo** "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."
  - **Com a fonte do sistema grande** (lote G3, 07/11/2026): o aviso continua grudado no topo e com o texto igual (`docs/jogo.md` 7).
  - **Letra:** condensada da casa e limitada (`clamp(12px, 3,4vw, 14px)`), para caber em até 2 linhas em 384 px com fonte 150%.
  - **Margem da lista:** a página ganha `scroll-padding-top` do tamanho do aviso, e a data e o "Certeza ×2" não param por baixo dele.
  - **Pouco espaço:** as bolinhas de forma mostram só os 3 últimos jogos, e o leitor de tela continua lendo os 5.
- Cartão por jogo com placar ajustável (− e +), "Jogo da certeza" destacado, e jogo fechado mostrando como a torcida palpitou.

### No MVP (até a fase 1.5 chegar)
- **Sem divisões ainda:** onde está "Série A", mostrar o ranking geral da semana com os 20 times (Campeão da semana, com a Maior torcida como segunda aba). Sem faixa de rebaixamento.
- **Cidade na Home:** um bloco só, abaixo do duelo. Com cidade: "Sua cidade está em 3º em SP" (ou o "Faltam N") e a frase `cidade_*` do narrador, levando à aba Cidades. Sem cidade, depois da 1ª partida: lembrete "Defende sua cidade também?" que leva a `#cidade`, no máximo 1 vez por semana (`cidadeLembrete`). O bloco do time em si não mostra cidade.
- **Tabela** mostra as abas Semana, Temporada (desde 02/11/2026, com as 52 semanas desde 06/11/2026), Cidades (com as Campeãs) e Conquistas (com a Galeria).
- **Ranking público só de torcidas:** nenhum apelido aparece em ranking; cada pessoa vê só a própria posição.

### Bonecos
- Estilo "Silhueta premium", aprovado em 19/10: ver `docs/bonecos.md`.
- **Boneco em campo (06/11/2026, `docs/bonecos.md` seção 7):** o batedor da pessoa é o boneco montável dela, de costas, nas cores da cena, com o número nas costas e as peças do vestiário que vão a campo; no replay, de frente comemorando. No desafio, o batedor de quem chamou é o boneco dele, e o resultado põe o busto de cada um ao lado do apelido no placar (o convite da Home mostra o busto de quem chamou). Sem boneco ou com o interruptor desligado, tudo como antes.

## 3.1 Perfil

Decidido em 31/10/2026. A aba "Carreira" da barra (que era "em breve") vira **Perfil**, e o avatar do cabeçalho da Home abre a mesma tela. Baixa sob demanda, com o esqueleto de carregando de sempre. **Só a própria pessoa vê:** nenhuma lista de outras pessoas e nenhum dado novo no servidor; tudo vem do que já é calculado lá (`minha_carreira`, `minha_posicao_semana`, `minha_posicao_minigame`, `minha_posicao_crava`, `meus_recordes`).

- **Desde 03/11/2026 (seção 4.6):** cabeçalho isolado em placa com avatar de 76 px (espaço para o boneco montável), apelido em destaque e "Torcedor do [time]" com "trocar" embaixo; sem apelido, o destaque vira o convite "Escolha seu apelido". Carreira (nível e XP em bloco, barra), Na semana (posições em bloco) e Recordes (pontos em bloco) em placas separadas.
- **Boneco montável (05/11/2026, `docs/jogo.md` 14.5):** o avatar do crachá é o busto de 84 px. Logo abaixo, o bloco Vestiário baixo (120 px): corpo inteiro de 76 × 112 à esquerda; à direita "N de 26 peças", a próxima peça e o botão de contorno "Monte seu boneco" (até a 1ª visita) ou "Abrir vestiário". Carregando, esqueleto parado do mesmo tamanho. A Carreira continua inteira sem rolar em 390 × 844. No resultado de todos os jogos, o bloco "Peça nova no vestiário" entra entre a Carreira e "Mandar no grupo", com o "Vestir agora" de contorno, para não disputar com a ação principal.
- **Crachá:** avatar, apelido (sem apelido: "Torcedor do [time]" com o artigo certo, e o botão "Escolher apelido", que leva ao campo e ao filtro de sempre, na escolha do time), time com "trocar", nível da Carreira com barra, quanto falta e quanto vale a próxima partida de hoje. Não mostra sequência de dias.
- **Na semana:** posição geral e posição em cada minigame (pênaltis, Prova e Time do Dia pelo que o servidor já calcula; Palpite da Rodada pela rodada em foco).
- **Recordes:** um por minigame.
- **Conquistas:** atalho com selo "em breve" até o servidor dos Lances existir.
- **Ajustes:** Gráficos (toque troca automático → Alta → Média → Leve), Vibração (a preferência `semVibracao`), Mostrar meu nível nos cards, Aviso de domingo (só para quem marcou 18+ na triagem; abre o mesmo painel do sininho), Termos e privacidade e Apagar meus dados.

## 4. Movimento e toque (regras)

- Tudo curto: 150 a 400 ms; só o grito do narrador e o confete passam disso.
- Respeitar `prefers-reduced-motion`: sem tremida, sem confete, sem câmera lenta, sem mola nos botões, sem vibração leve.
- Nada pisca mais de 3 vezes por segundo.
- **Durações e molas** (variáveis em `src/style.css`): `--rapido` 120 ms, `--medio` 260 ms, `--lento` 420 ms; `--mola` passa ~10% do ponto e volta (pop de adesivo, botão soltando), `--mola-firme` quase não passa (barras, cards). Feitas com `linear()` do CSS, sem biblioteca; navegador antigo cai numa `cubic-bezier` parecida. No canvas, a mesma curva é a função `mola()` de `telas/cena.ts` (só desenho, nunca a física).
- **Alvo de toque de 44 px no mínimo** (lote G3, 07/11/2026). A caixa do botão tem pelo menos 44 px de altura, mesmo quando o desenho é menor: a sobra vira borda transparente (`background-clip: padding-box`) ou contorno em `box-shadow: inset`. Assim ficaram o selo "Pré-temporada: o que é", as abas de 2º nível e o "trocar" do time na Home.
- **Todo toque responde na hora:** o botão afunda sem transição e, ao soltar, volta com a mola; cards e botões pequenos encolhem um pouco (0,92 a 0,97).
- **Vibração (só Android; o iPhone não tem):** `telas/toque.ts`. Leve (8 ms) em botão principal, card de jogo e barra de navegação; acerto (22 ms) na Prova e no Time do Dia; erro (30-50-30); gol (60-40-90). Nada passa de 200 ms. A chave Vibração, nos ajustes do Perfil, desliga tudo (preferência `semVibracao`).
- **Barras de baixo (08/11/2026, S06 e S07):** a barra de navegação (Jogar, Palpites, Tabela, Perfil) e a barra do resultado ficam fixas; a do resultado é **opaca** (nada do que rola aparece atrás). A altura real da barra que está na tela é medida no navegador, com a fonte do sistema grande inclusive (`src/telas/alturaBarra.ts`, `--altura-barra-baixo`), e a página reserva esse espaço mais a safe-area: no fim da Home, do Ranking, do Perfil e do resultado, e no `html { scroll-padding-bottom }`, para nenhum botão parar atrás da barra depois de rolar sozinho, voltar para a tela ou receber o foco.
- **Par principal × secundário:** dois botões lado a lado com papéis diferentes ficam na proporção 1 : 1,4, o secundário (placa escura ou claro) à esquerda e o principal (amarelo) à direita: Salvar × Compartilhar, Início × Jogo de volta/Mais uma, Mandar esse lance × Jogar. Botões de mesmo papel ficam iguais (S14).
- **Placar da partida no celular estreito (até 380 px, S12 e S13):** os nomes vão para uma linha de cima, cada um com metade da largura, com 12 px no mínimo e até 2 linhas sem reticências ("JUNIOR / BARRANQUILLA"); embaixo, as bolinhas e o marcador.
- **Aviso de conexão caída:** fundo vermelho fechado `#b3261e` (o `--caiu` claro dava 3,1:1 com o branco) e a linha "código: …" com 12 px e 5,5:1.
- **Fica de fora:** bibliotecas de animação (Framer Motion, GSAP, Lottie, Rive) e WebGL. O peso não cabe no orçamento e o celular simples esquenta.

## 4.1 Ícones e carregando

- **Ícones em SVG de traço** (`telas/icones.ts`), na cor do texto e do tamanho da letra. Emoji muda de desenho em cada marca e os mais novos (🟢, 🧤, 🧱) viram quadradinho em Android antigo. Emoji só no texto que vai para o WhatsApp, que desenha os próprios.
- As pistas do Time do Dia usam bolinhas desenhadas em CSS, com as mesmas cores das células.
- **Carregando:** as telas de jogo, a Casa e o painel baixam só quando abrem. Enquanto isso aparece o esqueleto da tela (blocos com brilho passando e a bola girando), nunca um texto solto em tela vazia. Sem rede: "Tentar de novo" e "Voltar pro início". Depois que a Home abre, as telas de jogo baixam por trás (menos com economia de dados ligada).

## 4.2 Replay de TV do gol

- **Quando:** nos Lances, todo gol; nos Pênaltis, só golaço de quem cobra (no ângulo, cavadinha ou raspando a trave), para não atrasar as 5 cobranças. Nunca com movimento reduzido.
- **Como:** ~1 s depois do gol, uma faixa inclinada nas cores do time varre a tela (vinheta) e esconde o corte de câmera. O replay mostra o mesmo chute de **trás do gol**, do alto, com a rede na frente, em câmera lenta (metade da velocidade) e fechando devagar (zoom de 1,0 a 1,1). Tarja amarela "REPLAY" no canto com "toque pra pular". No fim, a vinheta passa de novo e o jogo segue.
- **Por quê é barato:** o lance já foi resolvido pelo motor puro (gesto + semente). O replay só redesenha o caminho da bola (`caminhoDoChute`, em `jogo/lances.ts`) na câmera 3D dos Lances; nos Pênaltis, num canvas 3D por cima da cena de TV, criado no primeiro golaço. Zero rede, ~5 KB gzip a mais no pacote dos jogos, e a arquibancada do outro lado é pré-desenhada uma vez por replay (~16 ms no computador; fica escondida pela vinheta).
- **Campo inteiro (26/10, depois do teste):** o replay mostra o outro lado do campo: laterais, linha do meio, círculo central, a grande área e o gol de lá (campo de 105 m), com a torcida atrás.
- **Bonecos de costas viram de frente:** cada boneco é recriado do outro lado (`deFrente` trocado) e desenhado espelhado, então o batedor aparece de frente comemorando e o goleiro de costas, voando para o lado certo. **Com o boneco em campo (06/11/2026):** o batedor da pessoa vira de frente com as mesmas peças, e o número aparece na frente, legível (sem espelhar os dígitos).
- Pode virar card ou vídeo para compartilhar depois (fora deste passo).

## 4.3 Qualidade gráfica (Alta, Média, Leve)

Amostra aprovada em 26/10 (página "Qualidade Alta, Média e Leve"). Código em `telas/qualidade.ts`.

| | Alta | Média | Leve |
|---|---|---|---|
| Nitidez do canvas | 2× | 1,5× | 1× |
| Torcida | balança e faz ola no gol | balança, sem ola | parada |
| Bonecos | degradê na pele e no calção | degradê | cor lisa |
| Tremida no gol | sim | sim | não |
| Replay de TV | sim, com a câmera fechando | sim, câmera parada | não |

- **Automático (padrão):** começa em Média. Economia de dados ligada, 4 núcleos ou menos ou 2 GB ou menos: Leve. Durante a partida, a cada 90 quadros: intervalo médio acima de 22 ms (menos de ~45 por segundo) desce um nível na hora e fica gravado no aparelho; intervalo abaixo de 17,5 ms com pouco trabalho por quadro, num aparelho de 6+ núcleos e 4+ GB (ou que não diz), grava Alta para a **próxima** partida. No meio da partida só desce, nunca sobe. Quem caiu para Leve pela medição fica em Leve (sem gangorra entre visitas).
- **Na mão:** ajuste "Gráficos" no Perfil, toque troca automático → Alta → Média → Leve.
- Em dev, `?qualidade=alta|media|leve` força o nível; `/dev/qualidade.html` desenha a amostra dos três.
- O que vier de efeito novo (partículas, impacto) declara em que nível aparece.
- **Teto de pixels do canvas (06/11/2026, J09):** além da nitidez, cada nível tem um teto de largura × altura × nitidez² (Alta 4,2 milhões, Média 2,6, Leve 1,3; nunca abaixo de 0,75×). No celular em pé ele nunca chega a valer (390×784 em Alta dá 1,2 milhão): só segura o canvas grande do computador e do tablet. Conta em `jogo/telaDaPartida.ts` (`dprDoCanvas`).

## 4.4 Papel picado

- Explode nas cores do time (cor muito escura vira branco, para aparecer) no **gol** (Pênaltis e Lances) e no **acerto** da Prova de Boleiro. No resultado (Time do Dia acertado e medalha nova, inclusive), quem comemora desde 05/11/2026 é o confete da tela de vitória.
- Retângulos que "viram" (a largura oscila) em vez de girar: um preenchimento por peça, pool fixo, nenhum objeto novo por quadro. Dura 1,4 s e some no fim.
- **Alta 40 peças, Média 24, Leve nenhuma.** Nada com movimento reduzido. O confete da tela de vitória (chuva do alto, ~1,6 s) é outro: Alta 90, Média 60, Leve 36, nenhum com movimento reduzido.

## 4.5 Troca de tela

- A tela nova entra por uma **borda inclinada a −8°** (a das tarjas), da esquerda para a direita, em 300 ms; a velha fica parada embaixo. Usa a transição nativa do navegador (View Transitions, em `app.ts`): Chrome e Android de hoje têm; quem não tem troca direto, sem custo.
- Sem transição na qualidade Leve, com movimento reduzido e na primeira tela.

## 4.6 Grafismo de TV (rota A, 03/11/2026)

Escolhida pelo Kauê depois da auditoria de 03/11 (`docs/jogo.md`, seção 14.2; prints em `docs/auditoria/2026-11-03/` e `depois/`). Os blocos ficam em `telas/blocos.ts` (HTML) e `estilos/blocos.css`; ninguém escreve placa, aba ou estado à mão.

- **Variáveis (`:root` em `style.css`):** `--placa` `#0a130e` e `--placa-alta` `#16211b` (placa dentro de placa, aba marcada), `--linha`, raios `--raio-p` 8 px, `--raio` 12 px e `--raio-g` 16 px, sombras `--sombra-placa` e `--sombra-alta`, espaços `--e1` a `--e5` (4, 8, 12, 16 e 24 px).
- **Placa:** quase preta, cantos de 12 px e sombra suave sobre o gramado. Com `filete`, a cor do time entra como faixa de 4 px no topo (72% cor 1, o resto cor 2).
- **Faixa da TV:** rótulo de cada bloco em papel claro inclinado (−8°), com a borda esquerda na cor do time e o texto reto.
- **Número destaque:** número grande em Anton com rótulo curto em Barlow Condensed embaixo, sempre em bloco, nunca em frase. O "º" sai em Barlow Condensed (o da Anton parece um zero elevado) e "de 412" vai menor ao lado. Amarelo só no número principal do bloco.
- **Selo:** etiqueta curta inclinada (recorde novo em contorno amarelo, subiu em verde, caiu em vermelho).
- **Barra:** progresso inclinado em verde `--subiu`.
- **Trilha de medalhas (04/11/2026, `docs/jogo.md` 14.3):**
  - **Desenho:** três bolinhas (5, 20 e 50 gols) ligadas por um trilho. A parte cheia é um degradê bronze → prata → ouro preso às bolinhas, recortado até o ponto.
  - **Bolinhas:** a conquistada vem cheia na cor da medalha (`--m-bronze`, `--m-prata`, `--m-ouro`). A próxima enche de baixo para cima, com o contorno na cor dela.
  - **Ouro completo:** brilha, e o brilho fica parado com movimento reduzido.
  - **Versões:** a compacta vai no card, nas Conquistas e no resultado; a grande, com os marcos escritos, vai na ficha.
  - **Leitura:** o nome da medalha vai sempre por escrito (`aria-label`).
- **Abas:** a principal é uma fileira em placa, e a marcada vira papel claro com o filete do time embaixo. As de 2º nível são menores e escuras. Nenhuma aba é amarela.
  - **Regra única (lote G3, 07/11/2026):** vale para `.abas-tv` e `.abas-2` em todas as telas, inclusive as montadas à mão (Temporada, Vestiário) e as 3 ajudas da Prova. As abas do grupo têm o mesmo tamanho e ocupam a largura toda. O nome longo quebra em 2 linhas, centralizado. Nunca rolam para o lado nem se sobrepõem, também com a fonte do sistema em 150%.
  - **Grupos de 2º nível:** cada um ocupa a linha inteira, um embaixo do outro (Esta semana · Passada em cima, Campeão · Maior torcida embaixo).
  - **Fonte grande:** 4 abas de 1º nível viram 2 × 2 quando a fileira tem menos de 17 letras de largura (`.abas-caixa`, container query em `em`). Assim nenhuma palavra parte no meio.
  - **Toque:** a aba de 2º nível tem 44 px de altura, e a parte desenhada continua com 38 px (borda transparente com `background-clip: padding-box`).
- **Vazio, erro e carregando:** ícone, frase, detalhe e ação ("Tentar de novo" no erro; convite no vazio, como "Jogar agora").
- **Cabeçalho de tela:** título em Anton 30 px igual em todas, voltar à esquerda e o **selo único da pré-temporada** à direita. O toque abre a explicação ("tudo vale ponto, mas zera antes do lançamento"); os outros avisos de pré-temporada saíram.
- **Amarelo cheio só no botão principal**, um por tela. Chave ligada em verde, sua torcida no ranking com placa clara e contorno.
- **Contraste:** texto pequeno com pelo menos 4,5:1; nada de opacidade baixa em texto.
- **Resultado padrão (`telas/resultadoPadrao.ts`), nos 5 jogos e nesta ordem:** placar → pontos pro time → detalhe em placas (gols, defesas, degraus; escada da Prova, grade do Time do Dia, lista dos 3 lances) → frase do narrador → selos (novo recorde, posição na semana, medalha, "Subindo pro placar…", que vira "Subiu de 5º pra 3º" quando a tabela mexe) → Carreira em placa com o XP ganho e a barra → "Mandar no grupo" (verde) com Card, Stories, Emoji e Link embaixo → Início (placa escura) e "Mais uma" / "Jogo de volta" / "Jogar de novo" (amarelo) fixos no rodapé, na proporção 1 : 1,4 (o par principal × secundário, igual a Salvar × Compartilhar). No convite "Defende sua cidade também?" da 1ª partida, "Escolher a cidade" vai no estilo claro dos botões da placa do troféu: um amarelo por tela. O selo da pré-temporada fica na linha de cima, ao lado do "Na morte súbita".
- **Movimento e vibração:** as molas e vibrações de sempre (seção 4). Entrou a vibração no fim da morte súbita (gol na vitória, erro na derrota).

## 4.7 Partida em tela grande e celular deitado (06/11/2026)

Decidido em 06/11/2026 (J09, J10 e J43, jornadas simuladas). Prints de antes e depois em `docs/auditoria/2026-11-06/lote-g2/`.

- **Tela grande (J09):** no computador, no iPad (em pé e deitado) e no dobrável aberto (CSS `min-width: 700px` e `min-height: 600px`), a partida dos pênaltis e dos Lances sai da coluna de 520 px: o canvas vai até um quadrado da altura da tela (`max(520px, min(100vw, 100dvh))`). O campo cresce pela altura: acima de 520 px de largura, a cena monta o campo numa largura de até 0,68 da altura do canvas (`larguraDoCampo` em `jogo/telaDaPartida.ts`), e o que sobra dos lados é mais torcida e gramado. Em 1920×1080 o gol dos pênaltis passou de ~415 para ~590 px. O placar vira uma placa por cima do campo, no alto e no meio (até 560 px), como na TV, e fica por cima também do replay; a faixa de instrução e o grito já ficavam por cima. O par ou ímpar fica com até 496 px no meio. Home, Ranking, Galeria e os resultados continuam na coluna.
  - **Mira:** o arraste é lido em proporção ao gol (pênaltis) e à boca do gol projetada (Lances), então continua certo em qualquer tamanho. A bola dos Lances segue 2,2× a real; a dos pênaltis segue 7,25% da largura do gol (a mesma conta de antes no celular).
  - **Celular em pé não muda:** até 520 px de largura (a coluna antiga), o campo é a largura do canvas, como sempre; só acima disso a altura limita. Assim o celular baixo com a barra do navegador (iPhone SE no Safari) não encolhe.
  - **Peso:** o canvas maior tem o teto de pixels da seção 4.3, então não pesa no aparelho fraco.
- **Celular deitado (J10):** com toque (`pointer: coarse`), mais largo que alto e altura até 500 px, os pênaltis e os Lances cobrem a tela com "Vire o celular pra jogar" e "A partida espera você.", num fundo quase preto (`telas/vireOCelular.ts`). Um celular desenhado gira de deitado para em pé, com uma seta amarela; com movimento reduzido ele fica parado, em pé. Tablet e dobrável aberto deitados (altura acima de 500) e o computador nunca veem o aviso. Enquanto ele está na tela, o relógio da partida para (a janela da defesa, "A jogada" e as animações) e o toque não chega ao campo.
- **"Mandar esse lance" (J43):** na ficha da tela única, ao lado do "Jogar". Padrão de dois botões do Grafismo de TV (4.6): o escuro (`.botao-linha`, com o ícone de corrente) à esquerda e "Jogar" amarelo à direita, metade e metade; em 360 px o rótulo quebra em duas linhas dentro do botão. "Link copiado." aparece numa linha pequena embaixo dos botões e some em 3,5 s.

## 5. Ajustes encontrados no código

- (18/10, já feitos na etapa 3) Artigo do time, `CLAUDE.md`/`.env.example` com chaves antigas, frases provisórias do narrador.
- (20/10) `.cartao-time .listras` em `src/style.css`: listras de 115° na cor 2 com `opacity: 0.35` por cima da cor 1, o que desbota as cores. Substituir pela faixa de placar. `src/telas/times.ts` passa `--c3` igual à cor 2; passar a usar a 3ª cor opcional de `src/dados/times.ts`.

## 6. Ordem sugerida no Claude Code

1. Ajustes da seção 5 + desempate + Supabase (etapa 3) — feito.
2. Fontes, cores e tela de Início — feito.
3. Partida em perspectiva + efeitos de gol — feito.
4. Resultado com efeito no ranking — feito.
5. Cards de time "faixa de placar" (20/10) — **Sonnet + Média**.

7. Home sem cara de anúncio de aposta (20/10, a partir de feedback de teste): selo "AO VIVO" e contador do canto removidos, aviso de resenha no rodapé, amarelo fosco — feito.
8. Revisão de 26/10, lote 1: adesivo claro, duelo com contraste, ícones SVG, "em breve" da Casa sem transparência, esqueleto de carregando, telas de jogo sob demanda (JS da Home de 80 para ~28 KB gzip), molas e vibração — feito.
9. Replay de TV do gol (26/10) — feito (seção 4.2).
10. Próximos (revisão de 26/10): qualidade automática alta/média/leve (mede os primeiros quadros, núcleos, memória e economia de dados) — feito; luz de jogo pelo horário — feito (31/10, na arquibancada da Home; na partida a luz continua fixa); prévias dos jogos na Home — feito (31/10); prévias no hub dos Lances; enquadramento da falta 3D (batedor menor, gol maior); chave "Vibração" — feito (31/10, no Perfil).
