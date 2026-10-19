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
- Escolher o próprio boneco fica no backlog (I06, Seu Craque).
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
