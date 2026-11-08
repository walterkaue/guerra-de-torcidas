# Cards personalizáveis

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

## Regra

### A tela "Seu card"
- Abre pelo botão Card do resultado padrão de todos os jogos (Lances, Prova, Time do Dia, Crava) e pelo card de medalha ("Mandar a medalha").
- **Nos Lances do Jogo**, "Mandar no grupo" manda o card (com as escolhas guardadas da tela) e o texto pela folha de compartilhar do celular (`navigator.share` com arquivo), como o "Compartilhar" desta tela; onde não houver share com arquivo, volta ao link do wa.me, só com texto. O card fica pronto de antemão, porque no iPhone o share precisa sair direto do toque, sem `await` antes. O botão "Emoji" não existe na fileira dos Lances: o placar em emoji é um quadradinho de ligar e desligar desta tela. A fileira dos Lances fica com **Card**, Stories e Link; "Mandar a medalha" segue na linha da medalha. Pênaltis, Prova, Time do Dia e Crava mantêm a fileira com Emoji.
- Topo: fechar, "SEU CARD" e o seletor Stories | Quadrado (Stories é o padrão).
- O card no centro, o maior possível (no Stories, ~280 × 498 numa tela de 390 × 844), com as pontas dos outros estilos aparecendo dos lados. Deslizar troca o estilo: **Telão** (o card de sempre, `docs/jogo.md`, Visual), **Placar seco** (fundo claro, número grande, time, lance, placar em emoji, apelido e link) e **Pôster** (o boneco é o card, abaixo). Embaixo, os nomes dos estilos (Telão · Placar seco · Pôster), que são botões de tocar para quem não desliza, com o atual em amarelo, e "deslize pra trocar". As setas do teclado também trocam. Respeita movimento reduzido no deslizar.
- Embaixo: Salvar imagem (escuro) e Compartilhar (amarelo, um pouco maior), na proporção 1 : 1,4.
- Formatos: Stories 9:16 (1080 × 1920) e Quadrado 1:1 (1080 × 1080), gerados no próprio celular. "Salvar imagem" baixa o PNG direto no Android e no computador; no iPhone, a tela orienta a usar "Salvar imagem" da folha de compartilhar.
- As escolhas (estilo, formato, o que fica ligado) ficam guardadas no aparelho para o próximo card. A frase própria só vale para aquele card.
- O texto de compartilhar segue com emoji antigo (`jogos/penaltis.md`, "Card de resultado").
- Sem escudo, camisa oficial, pessoa real ou texto na camisa; nada de nome de pessoa em frase sugerida pelo jogo.

### Os 8 quadradinhos
Do mesmo tamanho, 2 linhas de 4, com ícone e texto curto em 2 linhas. Cada tipo de card diz quais quadradinhos de ligar e desligar tem e com que nome.
- **De ligar e desligar** (claros com ✓ quando ligados, escuros quando desligados): Frase do narrador, Meu apelido, Nível na Carreira, Placar em emoji, Link do X1.
- **De ação** (verdes): Sortear outra frase, Escrever minha frase.
- **Meu boneco:** no Telão e no Placar seco liga e desliga o busto do boneco (52 px na tela, com fundo e moldura) ao lado do apelido. Começa desligado e fica guardado no aparelho. No Pôster fica sempre ligado (amarelo, com ✓) e não desliga; tocar mostra "No Pôster o boneco é o card.".
- Sem apelido salvo, "Meu apelido" fica desligado e, ao tocar, abre ali mesmo o campo de apelido de sempre (o mesmo filtro, no servidor), para não perder o resultado.
- Jogo sem X1 (Time do Dia, Crava): "Link do X1" vira "Link do jogo".
- **Placar em emoji:** no Telão, o placar desenhado dentro do telão faz esse papel; desligado, fica só o nome do time. No Placar seco, liga e desliga a linha de emoji (no card é desenho: pode usar qualquer emoji). No Pôster não muda nada.
- **Link desligado:** some o link do rodapé e a linha do link no texto de compartilhar; "GUERRA DE TORCIDAS" fica sempre no topo. O aviso fixo do Crava nunca desliga.
- **Nível na Carreira** é a mesma escolha do Perfil ("Nível no card"): mudar num lugar muda no outro.
- **Meu apelido desligado:** no Telão, a linha de quem fez vira "Fiz 47 pontos pro Flamengo"; no Placar seco, a linha some.
- **Aviso da pré-temporada:** sai no Telão e no Placar seco, como no rodapé do Telão.
- **Sem boneco carregado (sem rede):** o Pôster some da lista de estilos e "Meu boneco" fica desligado e apagado, com "Sem conexão pro boneco agora". Quem tinha o Pôster guardado vê o Telão naquela vez; a escolha guardada continua o Pôster.

### Estilo Pôster
- O boneco do vestiário (`jogos/boneco-montavel.md`) em corpo inteiro ocupando o card todo, sobre o fundo que a pessoa escolheu, na pose "braços pra cima" se ela tem a pose liberada (vale a peça liberada, mesmo que tenha tirado no vestiário); senão, parado. O número da camisa (se tiver), grande e translúcido atrás do boneco, na cor 1 do time.
- No topo, uma faixa escura com "GUERRA DE TORCIDAS" e o jogo com o lance ("LANCES DO JOGO · a falta do tri"; o nome do jogo não se repete quando o lance já o traz, e a rodada do Crava fica só no lance). Embaixo, por cima do boneco: a frase do narrador como adesivo levemente torto; uma placa escura com o apelido e o nível à esquerda e os pontos grandes (+134) com "pro [time]" à direita; o link do X1 numa linha pequena e o aviso da pré-temporada.
- Stories (1080 × 1920) com o corpo inteiro; Quadrado (1080 × 1080) do joelho pra cima, para caber.
- **Card de medalha:** abre com o Pôster disponível: o boneco, a medalha desenhada ao lado de "OURO" na placa e o título do lance na faixa; nunca nome de pessoa. Os quadradinhos do card de medalha são "Medalha em emoji" e "Link do lance"; na folha da medalha, a fileira é Card, Stories e Link.

### Frase própria
Folha que abre de baixo: campo de até 60 letras com contador, "Sem palavrão nem nome de pessoa", o aviso "Fica só no seu aparelho. O jogo não guarda nem mostra pra ninguém: só quem receber o card vê.", a mensagem quando o filtro barra ("Essa frase não passou no filtro. Tenta outra, falando do time ou do lance.") e os botões Usar a do narrador e Pôr no card. Nunca vai para o servidor.
- **Filtro:** no aparelho, com a mesma normalização e a mesma lista do apelido, inclusive os nomes de jogadores famosos (`docs/jogo.md`, "Apelido"), mais as palavras proibidas do `docs/jogo.md` (zero aposta), essas só como palavra inteira. A lista não fica escrita no código: só a marca (tamanho + hash) de cada palavra, e um teste refaz as marcas a partir de todas as migrações. A lista do servidor pode crescer direto na tabela, sem migração, e a cópia do aparelho fica atrasada: risco aceito, porque a frase nunca sai do aparelho. Como no apelido, palavra longa barra mesmo no meio de outra ("comer da" barra), e o filtro não reconhece nome de pessoa: a folha pede.

### Outros pontos de entrada
- **Crava:** os botões de card de "Meus palpites" e do resultado da rodada abrem a tela.
- **Stories do resultado:** manda o card direto, com as escolhas guardadas.

### Card de fim de temporada
Tipo `temporada` (detalhes em `jogos/rankings.md`, "Telas do resto das divisões"): quadradinhos Frase do narrador, Meu apelido, Nível na Carreira, "Tabela final" (no Telão tira a tabela e deixa os 3 números; no Placar seco, os números só entram com ele ligado), "Link do jogo", as duas ações e Meu boneco. Selo inclinado dourado para campeão, verde para quem sobe, cinza para quem cai e claro para quem fica; na pré-temporada, "TESTE DAS DIVISÕES" dentro do selo (no Placar seco e no Pôster, no topo ou na faixa). Papel picado só nos destinos de festa.

### Card do troféu
Abre do "Mandar no grupo" da ficha da Galeria e da placa "Troféu novo" da Home. O jogo do card é "Galeria de Troféus".
- **Quadradinhos do tipo `trofeu`:** Frase do narrador, Meu apelido, Nível na Carreira, "Números da semana" (liga e desliga os 3 números da ficha; no troféu de mês, "Números do mês"), "Link do jogo", as duas ações e Meu boneco.
- **Telão:** a cena do estádio com a faixa "GUERRA DE TORCIDAS · GALERIA DE TROFÉUS" no topo; no painel do telão, o troféu grande (o mesmo desenho da Galeria, com a flâmula de contorno claro), o nome do troféu em Anton, a faixa amarela com a série e o período, o nome do time numa faixa de placar (cor 1 cheia, com uma faixa reta na cor 2), os 3 números (somem com o quadradinho desligado); embaixo, a frase do narrador da Galeria, a linha de quem, a pílula do nível e o link do jogo. No Quadrado, o painel fica largo: o troféu à esquerda e o resto à direita.
- **Posição com ordinal:** a posição do troféu de mês ("1º") desenha o "º" menor, em Barlow Condensed no alto, porque em Anton "1º" parece "10".
- **Placar seco:** papel claro, o troféu, o nome do troféu enorme, o time na cor do time, "Série A · Semana de…", uma linha pequena com os números, a linha de quem, a frase, o nível e o link.
- **Pôster:** o boneco em corpo inteiro, como no card de medalha. Faixa do topo: "GALERIA DE TROFÉUS · SEMANA DE 02/11 A 08/11/2026". Placa: à direita, o troféu desenhado e o nome dele, com "Time · série" embaixo; à esquerda, o apelido e o nível. Nunca nome de pessoa. Os números não mudam nada no Pôster.
- **Linha de quem:** só entra se a pessoa somou na semana do troféu do próprio time (pontos da semana maiores que 0, os mesmos de "Você tava em campo"). Com "Meu apelido" ligado: "<apelido> tava na arquibancada"; desligado: "Eu tava na arquibancada". Sem soma (ou troféu de mês, ou Galeria de outro time, ou sem rede), a linha some nos três estilos. No texto de compartilhar: " Eu tava na arquibancada." só nesse caso.
- **Troféu de outro time** (a Galeria aberta noutra torcida): o card usa as cores do time do troféu, sem Pôster e sem "Meu boneco" (aviso "Boneco só no card do seu time").
- **Sem rede para os números:** o card sai sem a linha de números e sem a linha de quem. A tela só desenha depois que os números, os pontos da semana e o nível chegam, então os PNGs e o texto ficam prontos antes do toque em Compartilhar.
- **Frase:** na ficha, a mesma que a ficha mostra; na placa, uma sorteada. "Sortear outra frase" sorteia da lista da Galeria (`docs/narrador.md`, seção 15) para aquele tipo de troféu, sem repetir.

## Como está no código

### Base
- **Conta pura:** `src/jogo/cardPersonalizado.ts`, com os estilos e formatos, `TIPOS_DE_CARD` (os quadradinhos de cada tipo: `jogo-x1`, `jogo`, `medalha`, `trofeu` e `temporada`; tipo novo entra aqui), `ACOES`, as escolhas no aparelho (`lerEscolhas`, `ligados`, `alternar`, em `gdt:prefs.card`, com o nível em `nivelNoCard`), `planoDoCard` (o que entra em cada estilo e formato) e `textoDoCompartilhar`. O filtro e o limite da frase ficam em `src/jogo/filtroDeFrase.ts`, só com as marcas das palavras, para nenhum palavrão nem nome de pessoa entrar no código ou no bundle. Palavra nova numa migração de `palavras_bloqueadas` faz `filtroDeFrase.test.ts` falhar e mostrar a marca que falta.
- **Desenho:** `src/jogo/cardPersonalizadoDesenho.ts` escolhe o estilo. O Telão reaproveita as peças de `card.ts` e o conteúdo de cada jogo (`conteudoLances`, `conteudoProva`, `conteudoDia`, `conteudoPalpites`, `conteudoAcertos`, `conteudoMedalha`, `conteudoPenaltis`); no Quadrado, o telão sai em escala 0,66. O Placar seco fica em `src/jogo/cardPlacarSeco.ts`, uma pilha centrada que encolhe até caber. As `desenharCardX` de antes continuam.
- **Tela:** `src/telas/cardPersonalizado.ts` (`abrirCardPersonalizado`, um `<dialog>` de tela cheia) e `src/estilos/cardPersonalizado.css`. Os PNGs de cada estilo ficam prontos antes do toque, para o compartilhar não perder o gesto. O deslizar usa pointer events e dá a volta. O botão Stories do resultado usa `desenharComAsEscolhas`, e cada jogo monta o seu `sortearFrase` com `sorteadorDeFrase` (o mesmo evento do narrador do resultado). Ficam sem sortear o "Meus palpites" do Crava (não tem frase) e a medalha (frase fixa por medalha).
- **Ligação:** `src/telas/resultadoPadrao.ts` (Card abre a tela) e os resultados de Lances, Pênaltis, Prova e Time do Dia; no Crava, os dois botões de card; em `src/telas/mandarMedalha.ts`, a fileira Card, Stories e Link, e a prévia da folha já com as escolhas guardadas.

### Pôster e Meu boneco
- **Conta pura (`cardPersonalizado.ts`):** `ESTILOS` inclui o Pôster; `estilosDisponiveis(temBoneco)`, `estiloEfetivo` (Pôster guardado sem boneco vale como Telão), `estiloVizinho(atual, passo, temBoneco)` e `botoesDeEstilo`. `MEU_BONECO`, `estadoDoMeuBoneco` e `tocarMeuBoneco` (travado no Pôster e sem boneco, com o aviso). `EscolhasDoCard.comBoneco` (padrão desligado). `planoDoCard` recebe `boneco` (`{ vestimenta, liberadas }`), `comBoneco` e `apelido`, e devolve `busto` (Telão e Placar seco) ou `poster` (`PlanoDoPoster`: vestimenta com a pose decidida por `vestimentaDoPoster`, enquadramento `corpo` ou `joelho`, número, `faixaDoPoster`, apelido, pontos, "pro [time]" e a medalha). Sem boneco, o plano do Pôster sai como Telão.
- **Desenho:** `desenharCardPersonalizado` é assíncrona. Com `plano.poster`, carrega `src/jogo/cardPoster.ts` por `import()` (pedaço separado do bundle); com `plano.busto`, carrega `src/telas/bonecoMontavel.ts` e passa um canvas do busto (200 px no Stories, 104 no Quadrado) a `blocoDoNumero` (`card.ts`) e ao Placar seco. O Pôster desenha a figura direto no canvas de 1080, sem devicePixelRatio (`desenharFiguraDoCard`, `ALTURA_DA_FIGURA`, `ALTURA_DO_JOELHO`, no fim de `bonecoMontavel.ts`), e escolhe a cor do número grande pelo fundo (cor 1, cor 2 ou contorno claro).
- **Tela:** lê o boneco por `lerBoneco()` com limite de 4 s (`bonecoDoServidor`; erro ou demora = sem boneco) junto com os dados do card, antes do primeiro desenho. `OpcoesDoCard.boneco` troca a fonte (dev). Uma leitura vale por 60 s para os cards seguintes (erro não fica guardado). `desenharComAsEscolhas` (Stories do resultado e prévia da medalha) só lê o boneco quando a escolha guardada é o Pôster ou "Meu boneco" está ligado, e espera no máximo 0,8 s, para o compartilhar não perder o gesto do toque no iPhone; passou disso, sai o Telão sem busto. `prepararBonecoDoCard()` começa essa leitura antes do toque; o resultado padrão dos jogos chama ao aparecer (`ligarResultado`). Os nomes dos estilos são montados uma vez (o toque e o foco não se perdem), e cada estilo é desenhado por si: se o pedaço do Pôster ou do boneco não baixar, os outros saem mesmo assim, e o busto some sem derrubar o card.

### Card do troféu
`TIPOS_DE_CARD.trofeu` e `quadradinhosDoCard` (o nome "Números do mês") em `cardPersonalizado.ts`, que tem `ConteudoDoTelao` `{ jogo: 'trofeu', … }`, `DadosDoCard.quem` nulo (a linha some) e `PlanoDoCard.trofeu`; `src/jogo/cardTrofeuDados.ts` (dados puros e o sorteio de frase); `src/jogo/cardTrofeu.ts` (a imagem do troféu e o Telão, carregado por `import()` como o `cardPoster.ts`); o Placar seco e o Pôster têm o troféu em `cardPlacarSeco.ts` e `cardPoster.ts`; `separarOrdinal` em `src/jogo/galeria.ts`; `src/telas/trofeusDesenho.ts` troca as variáveis de CSS por cores fixas (`svgParaImagem`) para o SVG virar imagem no canvas; `src/telas/mandarTrofeu.ts` só decide e carrega, por `import()` no toque, `src/telas/mandarTrofeuCard.ts` (a tela SEU CARD, o nível e a leitura dos números não entram no bundle inicial); se esse pedaço não baixar, cai no compartilhar nativo com o texto; `mandarTrofeuCard.ts` junta `dadosDaFicha`, o nível e o texto por Promise e abre `abrirCardPersonalizado` (que aceita `texto` como Promise e `avisoSemBoneco`). O card de temporada: `src/jogo/cardTemporada.ts` e `cardTemporadaDados.ts`.

## Em desenvolvimento
- `?cardFalso` abre a tela sem servidor: `&tipo=jogo|medalha|trofeu`, `&estilo=` (inclui `poster`), `&formato=`, `&tudo=desligado`, `&folha=frase`, `&barrada=1`, `&boneco=sem|parado|bracos`, `&comBoneco=1`; no troféu, `&trofeu=semana|mes|vitrine|estreia`, `&somou=0|1` e `&outroTime=1`.
- `/dev/cards.html?personalizados` mostra todos os jogos, o Pôster, as versões com busto e o troféu, nos dois estilos e formatos.
