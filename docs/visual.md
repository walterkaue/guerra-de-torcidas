# Revisão gráfica — direção "Transmissão de domingo"

> Versão 1.6 · 26/10/2026 · **Direção aprovada em 18/10/2026.** Mockups no canvas "Guerra de Torcidas — revisão gráfica" (Início, Partida, Resultado, Ranking, Crava a Rodada).
> Base: o jogo publicado em 18/10/2026 (commit b492b99), testado em 390×844.
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
- **Cabeçalho jornalístico:** título e, logo abaixo, uma linha com a etiqueta reta cinza "Pré-temporada" e a **contagem regressiva** ("Semana fecha em 5d 03h"). Nada fica solto no canto superior direito (parece botão de fechar anúncio). Sem selo vermelho, sem piscar.
- Bloco do time nas cores dele, com a cidade embaixo (segunda camisa).
- **Cabo de guerra contra o rival:** barra dividida nas duas cores, com a frase do narrador do momento (`rival_colado` etc.). Se a cor do rival for parecida com a nossa (Flamengo × Fluminense), o rival entra com a 2ª cor ou um neutro (mesma régua de contraste dos uniformes).
- Mini tabela da Série A com a sua torcida destacada e a seta de subida ou queda.
- **Sua posição na semana** (20/10): "Você é o 3º de 14 torcedores na semana", com seta se subiu ou caiu desde a última visita.
- Botão principal + **"hoje contam mais 2 partidas"** (o teto diário à vista, para ninguém achar que é injusto).
- Aviso único da **pré-temporada** ("tudo vale ponto, mas zera antes do lançamento") no lugar dos selos "Em teste" e "Ensaio".
- **Rodapé da Home:** "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca. Jogo 100% grátis.", em texto pequeno e opaco (a frase é a mesma `AVISO_RESENHA` do Crava).
- Convite de desafio com borda neutra fina, não amarela.
- Barra de navegação: Jogar, Ranking, Palpites, Carreira.

### Partida
- **Perspectiva:** gol maior e mais baixo, linhas da área convergindo, marca do pênalti com a bola grande perto do dedo.
- Placar estilo TV inclinado, com bolinhas verdes (gol), pretas (erro) e amarela (ângulo ou cavadinha).
- Arquibancada nas cores do time atrás do gol, que faz "ola" a cada gol.
- **Grito do narrador como adesivo:** caixa na cor do time, borda branca, entra com um "pop", e a frase complementar logo abaixo. (Só na partida, que é um momento curto de festa. Fora dela, na Home, no resultado e no Time do Dia, o adesivo é papel claro com faixa na cor do time: a caixa cheia em time vermelho parecia aviso de erro. Decidido em 26/10.)
- **Rastro da bola** amarelo seguindo o arraste do dedo; "+15" subindo do ponto do gol.
- Gol: tremida curta da tela (120 ms), rede balançando e vibração no Android (`navigator.vibrate`).
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
- **Abas Palpites e Carreira:** aparecem com selo "em breve", sem tela vazia. Ranking mostra só a aba Semana.
- **Ranking público só de torcidas:** nenhum apelido aparece em ranking; cada pessoa vê só a própria posição.

### Bonecos
- Estilo "Silhueta premium", aprovado em 19/10: ver `docs/bonecos.md`.

## 4. Movimento e toque (regras)

- Tudo curto: 150 a 400 ms; só o grito do narrador e o confete passam disso.
- Respeitar `prefers-reduced-motion`: sem tremida, sem confete, sem câmera lenta, sem mola nos botões, sem vibração leve.
- Nada pisca mais de 3 vezes por segundo.
- **Durações e molas** (variáveis em `src/style.css`): `--rapido` 120 ms, `--medio` 260 ms, `--lento` 420 ms; `--mola` passa ~10% do ponto e volta (pop de adesivo, botão soltando), `--mola-firme` quase não passa (barras, cards). Feitas com `linear()` do CSS, sem biblioteca; navegador antigo cai numa `cubic-bezier` parecida. No canvas, a mesma curva é a função `mola()` de `telas/cena.ts` (só desenho, nunca a física).
- **Todo toque responde na hora:** o botão afunda sem transição e, ao soltar, volta com a mola; cards e botões pequenos encolhem um pouco (0,92 a 0,97).
- **Vibração (só Android; o iPhone não tem):** `telas/toque.ts`. Leve (8 ms) em botão principal, card de jogo e barra de navegação; acerto (22 ms) na Prova e no Time do Dia; erro (30-50-30); gol (60-40-90). Nada passa de 200 ms. A preferência `semVibracao` desliga tudo (falta a chave na tela).
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
10. Próximos (revisão de 26/10): qualidade automática alta/média/leve (mede os primeiros quadros, núcleos, memória e economia de dados); luz de jogo pré-desenhada pelo horário; prévias dos jogos na Home e no hub dos Lances; enquadramento da falta 3D (batedor menor, gol maior); chave "Vibração".
