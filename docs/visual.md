# Revisão gráfica — direção "Transmissão de domingo"

> Versão 1.10 · 31/10/2026 · **Direção aprovada em 18/10/2026.** Mockups no canvas "Guerra de Torcidas — revisão gráfica" (Início, Partida, Resultado, Ranking, Crava a Rodada).
> Base: o jogo publicado em 18/10/2026 (commit b492b99), testado em 390×844.
> Mudanças da 1.10: seção da Casa na Home, com estádio e troféus (seção 3, item 7).
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
- Mesmo desenho reaproveitado onde o time aparece em bloco (Home, ranking, Crava), sem mudar o que já usa a divisão `c1/c2`.

### Início
Home nova, decidida em 31/10/2026. De cima para baixo:

1. **Cabeçalho:** avatar à esquerda (círculo na cor 1 do time, borda branca, ícone de pessoa em SVG, alvo de 44 px), que abre a aba Perfil; título no meio; sininho à direita (só para 18+). Embaixo, a etiqueta reta cinza "Pré-temporada" e a **contagem regressiva** ("Semana fecha em 5d 03h"). Nada novo no canto superior direito, sem selo vermelho, sem piscar.
2. **Arquibancada do time:** faixa de ~150 px de ponta a ponta com a torcida da partida nas cores do time, pré-desenhada uma vez (`telas/arquibancada.ts`, com os torcedores em `telas/torcida.ts`). Luz pelo horário de Brasília: **dia** das 6h às 17h, **entardecer** até 19h e **noite** com os refletores acesos. Por cima, a tarja inclinada (−8°) "VOCÊ JOGA PELO / [TIME]" (com o artigo certo) e o "trocar". Qualidade Alta e Média: a torcida balança de leve (troca de quadro a cada 340 ms). Leve e movimento reduzido: parada. Sem escudo, sem camisa, sem pessoa reconhecível. Sem time, a tarja pergunta "Qual é a sua torcida?".
3. **Cabo de guerra:** números em Anton dos dois lados, barra nas duas cores (se a cor do rival for parecida com a nossa, ele entra com a 2ª cor ou um neutro: a mesma régua de contraste dos uniformes) e um **nó** amarelo `#e9c75a`, inclinado, na posição da diferença, que anda com `--mola-firme` quando muda. Adesivo do narrador embaixo (`rival_colado` etc.). Última linha do bloco: "Você: 3º de 4 na semana", com seta verde ou vermelha desde a última visita. "Outro time" não tem duelo: fica só a linha da posição.
4. **Botão "Jogar agora"** (amarelo, o único botão principal da tela). Abre, nesta ordem: **Crava**, se a rodada aberta fecha em menos de 24 h e a pessoa ainda não palpitou nela; **Time do Dia**, se ainda não jogou hoje; **Lances do Jogo**, se ainda faltam partidas que contam hoje; senão **Prova de Boleiro**. "Fecha" é a hora em que o próximo palpite tranca, a mesma do card; um palpite em qualquer jogo da rodada já conta. A linha de baixo diz o motivo em tom informativo, sem pressão ("Time do Dia: ainda não jogou hoje"). Sem time, vale a mesma ordem, com a escolha do time na frente.
5. **Cards dos jogos** com desenho em SVG inline, na paleta do jogo, e estado vivo, em tamanhos diferentes (`telas/cardsJogos.ts`). Toque com a resposta de hoje: encolhe e volta com a mola, vibração leve.
   - **Lances do Jogo:** largo, com um gol com rede e o rastro amarelo de uma bola; estado = partidas que contam hoje.
   - **Prova de Boleiro** e **Time do Dia** lado a lado: a escada de 8 degraus (acende até onde o recorde alcança; estado = recorde) e a grade de bolinhas de pista nas cores das células (estado = chutes usados hoje, ou o resultado se já terminou).
   - **Crava a Rodada:** largo, com o placar cravado numa tarja inclinada ("? x ?" enquanto não há palpite); estado = "Cravado" ou quando a rodada fecha.
6. **Giro da semana:** uma linha estilo tarja de TV com frases de posição das torcidas, a partir do ranking já carregado ("Flamengo subiu pro 2º", "Corinthians a 12 do Palmeiras"), trocando a cada 5 s com esmaecer, sem rolar e sem piscar. Só torcidas, nunca apelido, com o artigo certo do time. Movimento reduzido ou Leve: uma frase fixa. Tocar abre o Ranking, que substitui a mini tabela que ficava aqui.
7. **Casa do [time]:** seção larga com uma cena de noite em SVG inline (`telas/cardsJogos.ts`): estádio com as arquibancadas nas duas cores do time, refletores e troféus inventados em ouro e prata (nenhum imita taça de verdade), com a tarja "Casa do Flamengo" por cima. Abre a Casa do seu time; sem time ou em "Outro time", o título é "Casa dos clubes" e abre o índice, com a cena em amarelo e branco.
8. **Continuam:** aviso único da pré-temporada ("tudo vale ponto, mas zera antes do lançamento") e o rodapé "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca. Jogo 100% grátis." (a frase é a mesma `AVISO_RESENHA` do Crava), além dos links de feedback, de apoio e de Termos.
9. **Saem da Home e vão para o Perfil:** o bloco "Sua carreira", a caixa "Mostrar meu nível nos cards" e o botão "Gráficos".

**Fora, de propósito:** banner de evento, pop-up, selo "AO VIVO", qualquer coisa piscando, sequência de dias.

- Convite de desafio com borda neutra fina, não amarela. É a única exceção ao botão principal único: só aparece para quem chegou por um link de X1.
- Barra de navegação: Jogar, Palpites, Ranking, Perfil.

### Partida
- **Perspectiva:** gol maior e mais baixo, linhas da área convergindo, marca do pênalti com a bola grande perto do dedo.
- Placar estilo TV inclinado, com bolinhas verdes (gol), pretas (erro) e amarela (ângulo ou cavadinha).
- Arquibancada nas cores do time atrás do gol, que faz "ola" a cada gol.
- **Grito do narrador como adesivo:** caixa na cor do time, borda branca, entra com um "pop", e a frase complementar logo abaixo. (Só na partida, que é um momento curto de festa. Fora dela, na Home, no resultado e no Time do Dia, o adesivo é papel claro com faixa na cor do time: a caixa cheia em time vermelho parecia aviso de erro. Decidido em 26/10.)
- **Rastro da bola** amarelo seguindo o arraste do dedo; "+15" subindo do ponto do gol.
- Gol: tremida curta da tela (120 ms), rede balançando e vibração no Android (`navigator.vibrate`).
- **Trave e defesa (26/10):** a bola não para mais no ar. Na trave: anel de brilho no ponto da batida, tremida mais fraca que a do gol, vibração de dois toques e um "plém" metálico; a bola volta quicando para o campo. Defesa em canto alto sai **espalmada** para fora e por cima; defesa baixa fica encaixada na luva. Defesa de quem joga vibra como acerto. Nos Lances, a bola também volta da trave e da barreira. Só desenho e som: o motor e os pontos não mudam.
- Cavadinha: câmera lenta de 0,5 s antes de entrar.
- **Bonecos (Silhueta premium, `docs/bonecos.md`):** esqueleto por rotações com poses-chave interpoladas. Batedor: ajeita a bola agachado e recua, mãos na cintura, chute em 4 tempos (pé de apoio, puxada, contato, finalização), cavadinha de toque curto, comemora o gol ou põe as mãos na cabeça. Máquina: corrida de 3 passos e crava o pé de apoio. Goleiro: balança na linha, pulo baixo ou alto para cada lado, de pé no meio, cai no chão depois do pulo, com a bola encaixada no peito quando defende. Bola com gomos girando e rastro de borrão.
- **Dica da defesa no corpo:** a partir de 55% da corrida aparece no chão, em amarelo, a pegada de onde o pé de apoio vai cravar, com a seta do canto; quando o batedor chega, a chuteira do pé de apoio fica amarela e continua assim no chute.
- **Desempenho:** grama, linhas, rede e 3 quadros da torcida ficam pré-desenhados; a cada quadro só bonecos, bola, traves e efeitos são desenhados ao vivo. Na ola, a torcida é redesenhada agrupada por cor (um preenchimento por cor). Medido em 19/10 com CPU 4× mais lenta (perfil de celular médio do Chrome), 390×844: 1,2 ms de trabalho por quadro em média, 99% dos quadros abaixo de 10 ms.
- Contraste: texto sobre a cor do time usa sempre `corDeTexto` (escuro em time de cor clara, branco no resto).

### Resultado (todos os minigames)
- Placar gigante, "VITÓRIA" ou "DERROTA", confete nas cores do time quando vence.
- **"+85 PRO [TIME]"** contando de 0 até o total, com os bônus em etiquetas (com o artigo certo: "pra Chapecoense").
- **O efeito na torcida:** "subiu de 5º pra 3º na Série A" com barra enchendo, e quanto falta para o próximo.
- **Sua posição naquele minigame** na semana e o **recorde pessoal**; quando bate o recorde, selo "NOVO RECORDE!" (que entra no card).
- Botões: "Chamar no X1" (WhatsApp, o maior), Stories, Placar em emoji, Copiar link, e "Revanche" como ação principal.

### Ranking
- Abas: Semana, Temporada, 52 semanas, Cidades.
- Tabela da Série A com faixa amarela no líder e vermelha na zona de rebaixamento, sua torcida destacada.
- Explicação curta de como conta, no rodapé.

### Crava a Rodada
- **Aviso fixo** "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."
- Cartão por jogo com placar ajustável (− e +), "Jogo da certeza" destacado, e jogo fechado mostrando como a torcida cravou.

### No MVP (até a fase 1.5 chegar)
- **Sem divisões ainda:** onde está "Série A", mostrar o ranking geral da semana com os 20 times (Campeão da semana, com a Maior torcida como segunda aba). Sem faixa de rebaixamento.
- **Sem cidade ainda:** o bloco do time não mostra cidade.
- **Ranking** mostra só a aba Semana.
- **Ranking público só de torcidas:** nenhum apelido aparece em ranking; cada pessoa vê só a própria posição.

### Bonecos
- Estilo "Silhueta premium", aprovado em 19/10: ver `docs/bonecos.md`.

## 3.1 Perfil

Decidido em 31/10/2026. A aba "Carreira" da barra (que era "em breve") vira **Perfil**, e o avatar do cabeçalho da Home abre a mesma tela. Baixa sob demanda, com o esqueleto de carregando de sempre. **Só a própria pessoa vê:** nenhuma lista de outras pessoas e nenhum dado novo no servidor; tudo vem do que já é calculado lá (`minha_carreira`, `minha_posicao_semana`, `minha_posicao_minigame`, `minha_posicao_crava`, `meus_recordes`).

- **Crachá:** avatar, apelido (sem apelido: "Torcedor do [time]" com o artigo certo, e o botão "Escolher apelido", que leva ao campo e ao filtro de sempre, na escolha do time), time com "trocar", nível da Carreira com barra, quanto falta e quanto vale a próxima partida de hoje. Não mostra sequência de dias.
- **Na semana:** posição geral e posição em cada minigame (pênaltis, Prova e Time do Dia pelo que o servidor já calcula; Crava pela rodada em foco).
- **Recordes:** um por minigame.
- **Conquistas:** atalho com selo "em breve" até o servidor dos Lances existir.
- **Ajustes:** Gráficos (toque troca automático → Alta → Média → Leve), Vibração (a preferência `semVibracao`), Mostrar meu nível nos cards, Aviso de domingo (só para quem marcou 18+ na triagem; abre o mesmo painel do sininho), Termos e privacidade e Apagar meus dados.

## 4. Movimento e toque (regras)

- Tudo curto: 150 a 400 ms; só o grito do narrador e o confete passam disso.
- Respeitar `prefers-reduced-motion`: sem tremida, sem confete, sem câmera lenta, sem mola nos botões, sem vibração leve.
- Nada pisca mais de 3 vezes por segundo.
- **Durações e molas** (variáveis em `src/style.css`): `--rapido` 120 ms, `--medio` 260 ms, `--lento` 420 ms; `--mola` passa ~10% do ponto e volta (pop de adesivo, botão soltando), `--mola-firme` quase não passa (barras, cards). Feitas com `linear()` do CSS, sem biblioteca; navegador antigo cai numa `cubic-bezier` parecida. No canvas, a mesma curva é a função `mola()` de `telas/cena.ts` (só desenho, nunca a física).
- **Todo toque responde na hora:** o botão afunda sem transição e, ao soltar, volta com a mola; cards e botões pequenos encolhem um pouco (0,92 a 0,97).
- **Vibração (só Android; o iPhone não tem):** `telas/toque.ts`. Leve (8 ms) em botão principal, card de jogo e barra de navegação; acerto (22 ms) na Prova e no Time do Dia; erro (30-50-30); gol (60-40-90). Nada passa de 200 ms. A chave Vibração, nos ajustes do Perfil, desliga tudo (preferência `semVibracao`).
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
- **Bonecos de costas viram de frente:** cada boneco é recriado do outro lado (`deFrente` trocado) e desenhado espelhado, então o batedor aparece de frente comemorando e o goleiro de costas, voando para o lado certo.
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

## 4.4 Papel picado

- Explode nas cores do time (cor muito escura vira branco, para aparecer) no **gol** (Pênaltis e Lances) e no **acerto** da Prova de Boleiro e do Time do Dia (no Time do Dia, só na primeira vez que o fim aparece).
- Retângulos que "viram" (a largura oscila) em vez de girar: um preenchimento por peça, pool fixo, nenhum objeto novo por quadro. Dura 1,4 s e some no fim.
- **Alta 40 peças, Média 24, Leve nenhuma.** Nada com movimento reduzido. O confete da tela de vitória continua como era.

## 4.5 Troca de tela

- A tela nova entra por uma **borda inclinada a −8°** (a das tarjas), da esquerda para a direita, em 300 ms; a velha fica parada embaixo. Usa a transição nativa do navegador (View Transitions, em `app.ts`): Chrome e Android de hoje têm; quem não tem troca direto, sem custo.
- Sem transição na qualidade Leve, com movimento reduzido e na primeira tela.

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
