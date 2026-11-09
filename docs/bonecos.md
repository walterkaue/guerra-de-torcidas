# Bonecos — estilo "Silhueta premium"

> Versão 1.1 · 19/10/2026 · Estilo aprovado pelo Kauê em 19/10/2026. Na 1.1: 5 batedores diferentes por lado, uniforme 1 e 2, goleiros com tom de contraste. Complementa o `visual.md`; quando discordarem, vale o `jogo.md`.
> Referência visual: ilustrações de jogadores em vetor chapado (imagem enviada pelo Kauê em 19/10). **É só referência de estilo**: não copiar personagens, poses exatas nem uniformes de nenhuma imagem de banco.

## 1. O estilo

- **Formas chapadas, sem contorno.** Cada peça é um bloco de cor sólida: pele, camiseta, calção, meião, chuteira, cabelo.
- **Curvas anatômicas com cortes angulares** nas dobras (cotovelo, joelho, barra da camiseta). Dá sensação de força e velocidade.
- **Proporção atlética e alongada** (cabeça pequena, pernas longas), diferente do cartoon cabeçudo.
- **Volume com um degradê sutil** só na pele e no calção: do tom base para um tom **mais escuro da mesma cor** na ponta do membro. Nunca degradê para preto, vermelho ou outra cor (fica estranho em pele escura e parece sujeira).
- **Sombra no chão:** uma elipse escura translúcida. Nada de filtro de desfoque.
- **Legível pequeno:** o boneco precisa ser reconhecível com 80 px de altura no celular.

## 2. Uniforme (pilar: sem marcas de clubes)

- **Uniforme 1:** camiseta lisa na cor 1 do time, calção na cor 2, meião na cor 1. **Uniforme 2:** as cores invertidas. Sem número, listras, faixas, gola desenhada, escudo ou patrocínio.
- O uniforme de quem joga é sorteado a cada partida. O adversário (a máquina, de laranja e preto, ou o time de quem desafiou) troca de uniforme se as camisetas ficarem parecidas (distância de cor abaixo de 110); se nenhuma combinação servir, ele joga com as cores da máquina. Os testes conferem todos os pares de times.
- Times com cores parecidas (preto e branco): camiseta na cor 1 e calção na cor 2, sempre com contraste mínimo; se não houver contraste, o calção fica num cinza neutro.
- **Goleiro (os dois lados):** camiseta lisa num tom forte (amarelo de placar `#ffd23f`, verde-limão, ciano, rosa ou lilás) escolhido para contrastar com os dois times e com o outro goleiro, com luvas na mesma cor e calção escuro. Nunca as cores de um clube real.
- Chuteira neutra (preta ou branca). **Bola branca clássica**; o amarelo do jogo fica só no rastro.

## 3. Todo mundo em campo (inclusão)

- **Tons de pele:** pelo menos 5, do claro ao escuro.
- **Cabelos:** raspado, curto, crespo volumoso, tranças, coque, rabo de cavalo, comprido solto.
- **Homens e mulheres** em proporção parecida.
- Cada lado tem **5 batedores diferentes**, um por cobrança (na morte súbita volta o primeiro), e **1 goleiro**. Todos são sorteados a cada partida (tom de pele, cabelo, homem ou mulher) com o gerador aleatório **do visual**, nunca a semente da partida (a física continua determinística). Vale para quem joga e para a máquina (decidido em 19/10).
- Desde 06/11/2026, o batedor da própria pessoa é o boneco montável dela (seção 7); os outros continuam sorteados.
- Nenhum traço caricato de etnia, corpo ou origem.
- **Nenhum boneco imita jogador real**, nem pela combinação de número, tom de pele e cabelo (direito de imagem; decidido em 19/10).

## 4. Poses (animação por poses-chave)

Esqueleto simples: quadril, tronco, cabeça, ombros, cotovelos, joelhos, tornozelos. A animação interpola as rotações entre poses-chave, com suavização (easing). **Sem cinemática inversa**: não precisa.

| Personagem | Poses |
|---|---|
| Batedor | parado, ajeitando a bola, corrida (3 passos), chute (pé de apoio, puxada, contato, finalização), cavadinha (toque curto), comemoração, mãos na cabeça |
| Goleiro | base na linha, balançando, pulo baixo esquerda/direita, pulo alto esquerda/direita, de pé no meio, defesa encaixada, caído no chão |

- As 6 zonas do gol mapeiam para os pulos (baixo ou alto, esquerda, meio ou direita).
- O **pé de apoio** (a dica da defesa) precisa ficar bem visível na pose de chute do batedor da máquina.
- Duração e cortes seguem o `visual.md`, seção 4 (150 a 400 ms, câmera lenta só na cavadinha, sem tremida com `prefers-reduced-motion`).

## 5. Técnica (60 fps no celular)

O jogo é em **canvas 2D**, então o boneco é desenhado no canvas, não em SVG na página.

- Formas criadas **uma vez** (`Path2D`) e reaproveitadas. Degradês criados **uma vez por time e tom de pele** e guardados; nunca dentro do quadro.
- **Nenhum filtro** (`blur`, `shadowBlur`, `filter`) no loop.
- Loop com `requestAnimationFrame` e tempo decorrido (`dt`), para rodar igual em 60 e 120 Hz.
- **Sem criar objetos novos a cada quadro** (vetores, arrays, strings): reaproveite.
- Trigonometria (`Math.sin`, `Math.cos`) pode ser usada **só no desenho**. O motor `penaltis.ts` continua sem trigonometria.
- Meta: 60 fps num Android intermediário. Se cair, simplificar primeiro a arquibancada, depois o degradê.
- Bundle: os bonecos são código, sem imagens; o total continua abaixo de 300 KB gzip.

## 6. Boneco montável (avatar da pessoa, 05/11/2026)

O avatar do Perfil, da Home e do vestiário (`docs/jogo.md`, seção 14.5). Desde 06/11/2026 ele também vai a campo como o batedor da pessoa (seção 7).

- **Mesmo estilo:** o boneco das partidas, de frente, com as peças por cima. Formas chapadas, sem contorno, degradê só na pele e no calção, rosto liso. Sempre fictício: camisa lisa sem nome, nada que imite jogador real.
- **Peças do começo:** corpo (h ou m, só a forma), 6 tons de pele, 7 cabelos × 6 cores, uniforme 1 e 2 nas cores do time, número, testeira, munhequeira, fundos Gramado, Arquibancada e Estádio à noite.
- **Peças que liberam:** colete de treino (lima ou laranja, o que mais contrasta com a camisa), chuteira nas cores do time (a cor do time mais longe do meião), pose "braços pra cima" (só no card), braçadeira de capitão (lisa, amarela, sem letra, no braço da direita da tela), faixa de campeão (diagonal, branca com filete dourado), munhequeira bronze, chuteira dourada (sem marca), apito no pescoço (cordão e apito prateado), uniforme de goleiro (cores de goleiro do jogo, com luvas), 8 fundos e as molduras dourada e Galeria (anel escuro com 5 bolinhas douradas).
- **Número:** na frente da camisa, em Anton, na cor `corDeTexto` da camisa. O colete e a faixa cobrem o número; com apito, ele desce um pouco para não bater. No busto de 40 px pode sumir.
- **Fundos:** formas simples em canvas, sem escudo, bandeira, marca, texto, número ou pessoa. A Barreira são placas lisas de treino; o Verde e amarelo são faixas diagonais, nunca losango com círculo.
- **Recortes e tamanhos:** busto em círculo, com o fundo recortado e a moldura por fora (40, 52 e 84 px; 280 na vitrine). Corpo inteiro com o fundo atrás, sem moldura (76 × 112, 104 × 154 e ~390 × 404).
- **Pose:** de frente, mãos na cintura (`POSES_DE_FRENTE.parado`); `bracos` só quando a vestimenta pede (card). O `poseParado` das partidas é de costas.
- **Técnica:** `desenharBoneco(ctx, vestimenta, coresDoTime, recorte, largura, altura)` em `src/telas/bonecoMontavel.ts` (fundos em `bonecoFundos.ts`). Desenha uma vez num canvas fora da tela, no tamanho × devicePixelRatio, guarda até 24 imagens e depois só faz `drawImage`. Nenhum filtro nem `shadowBlur`. Com número, a imagem só vai ao cache com a Anton carregada: chame `prepararFonteDoNumero()` e redesenhe. As peças entram por ganchos opcionais (`Camadas`) no `desenharBoneco` de `bonecos.ts`; sem eles, o desenho das partidas é o mesmo.
- **Legibilidade (o que ainda é fraco):** braçadeira e munhequeira quase somem abaixo de 52 px; o Telão vira pontilhado no busto pequeno; colete contra camisa de goleiro amarela tem contraste baixo.
- **Vitrine:** `?vitrineBoneco` em dev (`src/dev/vitrineBoneco.ts`, fora do bundle), com `&so=prancha|bustos|tamanhos|uniformes|fundos|molduras|times`, `&estado=novo|meio|tudo` e `&time=<id>`. Prints em `docs/auditoria/2026-11-05/boneco/`.

## 7. Boneco em campo (06/11/2026)

Decidido pelo Kauê em 06/11/2026 (C5, Rota B, "você no lance"). Regra completa em `docs/jogo.md`, seção 14.5, "Boneco em campo".

- **Quem:** o batedor da pessoa (pênaltis com a morte súbita, Lances, treino e aquecimento) e, no desafio de pênaltis, o batedor de quem chamou. Goleiros e a máquina continuam sorteados.
- **Roupa da cena, nunca a do vestiário:** camisa, calção e meião pela seção 2 (uniforme 1 ou 2 e a troca contra o adversário; cores da Seleção; cores do clube do lance; roupa de goleiro no Gol 100). O campo `camisa` da vestimenta não vale em campo.
- **Peças que entram:** corpo, pele, cabelo e cor, testeira, munhequeira (e a bronze), braçadeira e chuteira (cores do time do coração ou dourada). Testeira, munhequeira e chuteira do time ficam nas cores do time do coração, mesmo numa cena de outro clube. **Nunca entram:** colete, faixa, apito, pose, fundo e moldura.
- **De costas:** em campo o batedor aparece de costas, com o cabelo de costas (coque, tranças, rabo e crespo pelo `cabelo(estilo, deFrente)`), a testeira como faixa sobre o cabelo e o número nas costas, em Anton, na cor de texto da camisa da cena. A braçadeira fica no braço esquerdo do boneco também de costas. No replay, de frente comemorando, com o número na frente.
- **Número:** só o que a pessoa escolheu; sem número, camisa lisa. Os bonecos sorteados continuam sem número (seção 2).
- **Técnica:** o batedor anda, então não há um desenho único para guardar. Por cena, o boneco e as camadas são montados uma vez e o número é desenhado uma vez num canvas fora da tela e reaproveitado com `drawImage` a cada quadro. Nada de texto, `Path2D` ou objeto novo dentro do quadro; nenhum filtro. Tudo vem no pedaço dos jogos (o JS inicial não cresce). Movimento reduzido e qualidade Leve: como nos sorteados.
- **Sem cópia no aparelho, cópia inválida ou interruptor desligado:** sorteio, sem esperar a rede.

> **Revitalização (08/11/2026):** a junção da cintura (quadril com tronco) e a personalização no Perfil vão ser revistas depois dos testes com amigos. Ideias e feedback em `docs/backlog.md`, item H03.
