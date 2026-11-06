# Jornadas com olhar de gente — 06/11/2026

Oito personas fictícias jogaram, sobre a `main` em `5080ffb`, o Guerra de Torcidas do primeiro acesso até mandar o card. Todas jogaram nas telas com dados falsos e com `corte=depois`, que é a regra que entra no ar segunda, 09/11. Rodada só de leitura: nenhuma linha de código mudou.

- **Achados:** 48 no total. 1 bloqueia, 18 atrapalham, 21 são detalhes e 8 são oportunidades. A lista está em [Achados](#achados) e em [`jornadas.csv`](jornadas.csv).
- **Prints:** os dos achados estão em [`capturas/`](capturas/), em WebP com metade da resolução. Os demais (cerca de 150 PNG) ficam em `prints/simulacoes-jornadas/`, fora do Git. Quando um passo cita um nome sem link, o print está lá.
- **Nada chegou ao Supabase de produção.** O `.env.development.local` estava com URL e chave vazias. O cliente recusa antes de qualquer pedido (`sem_configuracao`), e o controlador ainda bloqueava `*supabase.co*`. Nenhum pedido ao Supabase apareceu nos registros das 8 personas.

## Como foi feito

- `npm run dev` com os modos falsos de `src/dev/`, combinados na URL. A combinação mais livre foi `?homeFalsa&penaltiFalso&lancesFalsos&provaFalsa&galeriaFalsa=cheia&temporadaFalsa=unica&cidadesFalsas=faltam&corte=depois`. Usei também `?aquecimentoFalso`, `?diaFalso=`, `?cardFalso`, `?vestiarioFalso`, `?codigoFalso`, `#casa/<time>` e `#lance/<id>`.
- Chrome headless controlado por CDP, com o tamanho de tela de cada aparelho, toque ou mouse, fonte da raiz a 130% ou 150% e as opções de movimento reduzido, modo escuro, paisagem e rede lenta ou desligada. A folha de compartilhar foi trocada por uma função que guarda o que seria enviado.
- Dois executores (Sonnet) jogaram as personas 1–4 e 5–8. Conferi cada achado no código ou no print antes de pôr na lista. Saíram da lista as coisas que eram só do modo falso:
  - a folha "Mandar a medalha" abrindo sozinha (ela só abre com toque, `src/telas/mandarMedalha.ts`);
  - "Salvar imagem" sem aviso (o botão vira "Salvo!");
  - o texto de compartilhar sem o time (é o texto do `cardFalso`);
  - a frase "goleiro de cara feia" (só existe em `src/dev/cardFalso.ts`);
  - os "3 melhores de hoje" vazios no limite;
  - o "3º de 4" para quem é Outro time;
  - o "Lance do dia: Grêmio" para quem não é gremista;
  - o relógio da Prova em 12 s (são 15 s; o print pegou no meio).

### O que não deu para ver

Ficou de fora o que precisa do servidor de verdade:

- filtro de apelido no servidor, ranking ao vivo e fechamento de partida;
- execução de "Ver meus dados" e "Apagar meus dados" (vi só a confirmação);
- sininho no Opera e o aviso de domingo;
- cidade no Perfil.

Também ficaram de fora:

- uma partida inteira de Lances já no limite;
- as 3 Provas da Camila (o "Seguir" por script não avançou);
- o jogo instalado (PWA), o teclado do iPhone sobre a frase e o "Salvar imagem" no iPhone de verdade;
- o lado do iPad que digita o código (só o aparelho que gera);
- a faixa "menos de 16" na Home, no Perfil e na Casa;
- a queda de rede real. Os modos falsos rodam no navegador: `rede offline` não derruba nada, só o `&caiNoLance=` derruba.

Regras que passaram em todas as telas vistas:

- **Zero aposta:** nenhuma palavra proibida. O Crava mostra "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro."
- **Sem escudo nem foto.** Nome real só nas fichas factuais (Emerson Sheik, Marcelo Grohe), como a seção 8 permite.
- **Narrador neutro de gênero.**
- **Sem rolagem horizontal** em nenhum dos 11 tamanhos.

---

## 1. Zé, 41, motoboy, Flamengo — Android de entrada 360×740, fonte grande

Chega pelo link de X1 de pênaltis no grupo do WhatsApp (`?d=`), com a rede lenta. Do link até o 1º chute: **4 toques e o arraste** (Aceitar o X1 → Flamengo → rolar → Bora pro jogo → 18 ou mais). Sem aquecimento no caminho, como manda a 14.8.

| # | O Zé pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "O Camisa10 do Palmeiras me chamou? Vou aceitar." | [p1-01](capturas/p1-01-chegada-link.webp) | Home com "Camisa10 (Palmeiras) te chamou no X1: 96 pontos" e a disputa "Final de 2018: foi 4 x 3. E hoje?". |
| 2 | "Sou Flamengo. Cadê o botão pra seguir? Ah, lá embaixo." | [p1-03](capturas/p1-03-time-marcado.webp) | "É só escolher o time: o X1 que te mandaram começa em seguida." O "Bora pro jogo" fica depois dos 20 times. "INTERNACIONA/L" quebra. |
| 3 | "Pra que querem minha idade?" | [p1-04](capturas/p1-04-apos-time.webp) | Triagem com três botões e nenhuma linha de porquê. |
| 4 | "Arrasto da bola pro gol. GOL!" | [p1-06](capturas/p1-06-chute1.webp) | "GOL! Encheu o pé lá no alto, sem chance!" e "+7". No placar, "JUNIOR B…" aparece cortado. |
| 5 | "Perdi de 3 x 5. E o link da revanche?" | [p1-09](capturas/p1-09-resultado-topo.webp) | "+21 pro Flamengo" e "+21 gols". O balão diz "Revanche? O link tá aqui.", mas não há link nele. |
| 6 | "Mando no grupo pra zoar o Camisa10." | [p1-14](capturas/p1-14-botoes-mandar.webp) | "Mandar no grupo" abre o wa.me com "Te chamei no X1: fiz 21 pro Flamengo. Faz mais?". Os formatos ficam atrás da barra fixa. |
| 7 | "Caiu a internet no meio. E agora?" | [p1-12](capturas/p1-12-queda-lance3.webp) | "Caiu a conexão: essa partida não vale mais pontos. (código: tempo_esgotado)". A partida segue como treino. |
| 8 | "Ganhei de 4 x 3, +57… mas diz que não vale?" | [p1-13](capturas/p1-13-resultado-treino.webp) | "+57 pro Flamengo" e "Venceu! E mais 20 pro Flamengo!" em cima do aviso vermelho. |
| 9 | "Faço o card pra mandar." | `p1-15`, `p1-17` | "Seu card" com Telão e Placar seco. A prévia leva uns segundos para aparecer (a máquina do teste estava carregada). |

**Piores momentos:**

1. O resultado que diz "+57" e "não vale" ao mesmo tempo, com um código técnico no meio (J03, J04, J05).
2. Achar o "Bora pro jogo" no fim de uma lista de 20 times (J06).
3. Tantos botões de mandar, com a fileira atrás da barra (J16).

**Melhor:** o convite "Camisa10 te chamou no X1" com a disputa histórica e o "Revanche" no fim. A rivalidade chega pronta.

**Emoção:** o Zé se empolga com a revanche. Largaria se descobrisse no fim que o minuto jogado não valeu. Volta amanhã para ver se o Camisa10 respondeu, sem pressão.

## 2. Duda, 15, estudante, Corinthians — iPhone SE 375×667, menos de 16

Chega pelo link de um lance no Stories (`#lance/corinthians-2012-gol-da-america`). Até o 1º chute (do aquecimento) são **3 toques**. Até a ficha do lance que veio ver, **5 toques**, e é ela quem acha.

| # | A Duda pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Era um lance. Por que pede meu time?" | [p2-01](capturas/p2-01-chegada-lance.webp) | "Qual é a sua torcida?" sem dizer nada do lance. |
| 2 | "Apelido: Neymar. Idade: menos de 16." | `p2-02`, `p2-03` | O aparelho aceita o apelido; o filtro de famosos é do servidor (J26). |
| 3 | "Um pênalti? Eu vim ver o lance." | [p2-04](capturas/p2-04-lance-ficha.webp) | Aquecimento "1/4 · Pênalti". |
| 4 | "Pulo. Cadê o lance?" | [p2-05](capturas/p2-05-apos-pular.webp) | Lista dos Lances no filtro Corinthians. A ficha não abre. |
| 5 | "Achei: O gol da América. O que é 'recriar'?" | [p2-07](capturas/p2-07-ficha-lance-baixo.webp) | "Recriados 0/10 · Faltam 50 gols, 10 recriando, pro ouro." |
| 6 | "Quero o Pôster com meu boneco!" | [p2-08](capturas/p2-08-poster.webp) | Boneco nas cores do Corinthians e "Três lances, dois gols…" (frase do modo falso). Placa com "Neymar". |
| 7 | "'Neymar joga demais' e um palavrão." | [p2-10](capturas/p2-10-frase-neymar.webp) | As duas barradas: "Essa frase não passou no filtro. Tenta outra, falando do time ou do lance." |

**Piores momentos:**

1. Veio por um lance e não vê o lance (J01).
2. O aquecimento antes do lance (J02).
3. Apelido de famoso no card quando não há servidor (J26).

**Melhor:** o Pôster. É a imagem que ela poria no Stories.

**Emoção:** a Duda larga na fila de telas antes do lance. Voltaria por outro lance do Corinthians no Stories, por isso o "Mandar esse lance" (J43).

## 3. Seu Antônio, 68, aposentado, Vasco — Galaxy S21 384×854, fonte 150%, movimento reduzido

Aparelho novo. Faz o aquecimento inteiro, crava, joga Time do Dia e Prova (lendo devagar), abre o "?" e a Casa do Vasco.

| # | O Seu Antônio pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Escolho meu Vasco e pronto." | `p3-01` | Primeira tela com "Sem cadastro: escolha o time e já entra jogando." Clara. |
| 2 | "Defesa… estou lendo o que fazer." | [p3-06](capturas/p3-06-aquec2.webp) | Sem toque, "Foi no outro canto! Agora você já sabe." e já vem a estação 3. O pé amarelo não aparece com movimento reduzido. |
| 3 | "Uma pergunta! Que número é esse correndo?" | `p3-08`, `p3-09` | A Prova do aquecimento estoura o tempo: "Essa escapou! A próxima você crava." |
| 4 | "Aquecido? Mas eu nem fiz tudo." | [p3-11](capturas/p3-11-aquec-fim.webp) | "Aquecido! Agora vale ponto pro Vasco" com 5 ✓ e o palpite "Vasco 3 x 1 Flamengo". |
| 5 | "Charada de clube? Que cores são essas?" | [p3-12](capturas/p3-12-time-do-dia.webp) | Exemplo de pistas pintado, sem legenda (J12). |
| 6 | "108 atrás do Flamengo? Vai deixar?" | `p3-15` | Home com o duelo e "Sua torcida tá 108 pontos atrás do Flamengo. Vai deixar?" Gostou. |
| 7 | "Deixa eu ler a pergunta com calma…" | [p3-17](capturas/p3-17-prova-pergunta1.webp) | 15 s por pergunta, 3 linhas de enunciado com fonte 150%. |
| 8 | "Já foi pra outra e perdi uma vida." | [p3-18](capturas/p3-18-prova-tempo-estourou.webp) | Duas vidas em ~30 s, e depois "Para ou segue? Parar e levar 0". |
| 9 | "Agora sim, a Casa do Vasco." | [p3-21](capturas/p3-21-casa-vasco.webp) | Fundação, São Januário, recorde de público, 30 troféus e "Ver fontes (13)". Calma e factual. |
| 10 | "O '?' dos Lances explica o recriar." | [p3-23](capturas/p3-23-lances-ajuda.webp) | Explica bem, mas o fim é técnico (J39). |

**Piores momentos:**

1. A Prova correndo enquanto ele lê (J11).
2. O aquecimento que anda sozinho e marca ✓ (J20).
3. As cores do Time do Dia sem legenda (J12).

**Melhor:** a Casa do Vasco e o "Aquecido! Agora vale ponto pro Vasco".

**Emoção:** o Seu Antônio largaria na Prova depois de perder duas vidas sem ler. Volta amanhã pela Casa e pelo Time do Dia, se a charada tiver legenda.

## 4. Camila, 31, analista, Palmeiras — iPhone 15 Pro Max 430×932

Joga muito: Lances no limite, Prova, Conquistas, Galeria, Pôster no Stories, salvar e levar a conta para o iPad pelo código.

| # | A Camila pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Palmeiras, 18 ou mais, pula o aquecimento." | `p4-01` | Home: "70 x 168 Corinthians", "O Corinthians tá na frente. Isso não pode ficar assim." e a placa do troféu novo. |
| 2 | "Bati as 10 de hoje?" | `p4-02` | "Valendo hoje: 10 de 10 · Hoje as 10 valendo já foram. Treine à vontade." |
| 3 | "Prova rapidinho." | `p4-03` | "Certa! Sabe tudo de bola!" e o "Para ou segue?". O script não seguiu, então não fiz as 3. |
| 4 | "Minhas medalhas." | [p4-06](capturas/p4-06-conquistas.webp) | "1 ouro · 3 prata · 4 bronze", por clube e por lance. "11 recriando" sem explicação. |
| 5 | "A Galeria! Que bonito." | [p4-07](capturas/p4-07-galeria.webp) | 11 troféus, bandeiras com data e "Maior torcida ×3 · Soma de todo mundo. Não é título." |
| 6 | "Levo a conta pro iPad." | [p4-05](capturas/p4-05-perfil.webp), `p4-09` | QR, código "C3BX-EAB3", "Vale por 9:56" e o aviso de não mandar o código a ninguém. |
| 7 | "Pôster nos Stories e salvo." | `p4-10` a `p4-12` | O Pôster sai em PNG de 405 KB pela folha de compartilhar; "Salvar imagem" baixa o arquivo. |

**Piores momentos:**

1. "Recriando" em toda parte, sem dizer o que é (J13).
2. Dois botões de "outro aparelho" com nomes parecidos (J37).
3. O "Trocar" da Galeria, que não diz o que troca (J40).

**Melhor:** a Galeria. Taças, semanas com data e "Não é título" dão motivo para voltar sem sequência nem urgência.

**Emoção:** a Camila volta pelo troféu da semana e pelo duelo com o Corinthians.

## 5. Rafa, 23, gamer, Grêmio — PC 1920×1080 e notebook 1366×768, mouse e teclado

Até o 1º chute: **3 cliques e o arraste**. O teclado funciona na triagem (Tab e Enter) e na Prova (teclas 1 a 4).

| # | O Rafa pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Uma coluninha no meio da tela?" | `p5-01` | Escolha do time numa faixa de ~450 px em 1920. |
| 2 | "Setas pra chutar? Não. Só arrastando." | `p5-06` | O pênalti não aceita teclado. |
| 3 | "Cadê o Jogar agora? Cliquei no nada." | [p5-12](capturas/p5-12-home.webp), [p5-13](capturas/p5-13-jogar-agora-home.webp) | A placa do troféu chega depois e empurra o botão 230 px. |
| 4 | "Bi da Recopa, bora." | [p5-16](capturas/p5-16-lance-partida.webp) | "Pegou! Leu o pé de apoio que nem professor pega cola." Vitória 5 x 4, "+71 pro Grêmio", medalha e peça nova. |
| 5 | "Quantos botões de mandar…" | [p5-23](capturas/p5-23-resultado-compartilhar.webp) | Mandar a medalha, Mandar no grupo, Card, Stories, Emoji, Link e Vestir agora. |
| 6 | "Troco o card pelas setas." | [p5-26](capturas/p5-26-card-personalizado.webp) | Só depois de 4 Tabs até o carrossel. |
| 7 | "Compartilhar no PC." | [p5-29](capturas/p5-29-compartilhar-sem-share-pc.webp) | "Copiado!", só com o texto e o link, sem a imagem. |
| 8 | "Ranking inteiro." | [p5-31](capturas/p5-31-ranking.webp), `p5-33` a `p5-35` | Semana, Temporada, Cidades e Conquistas. Bandeiras pretas somem. Cidades fica em branco ~2,5 s na 1ª vez (talvez só o modo falso). |
| 9 | "Sininho." | `p5-36` | "O aviso ainda não está configurado no servidor." É efeito das chaves vazias; o Opera não foi provado. |

**Piores momentos:**

1. O "Jogar agora" que foge do clique (J08).
2. O jogo numa coluna estreita no monitor (J09).
3. O "Copiado!" que não leva a imagem (J17).

**Melhor:** a partida de Lances com morte súbita e o resultado cheio, com medalha e peça nova.

**Emoção:** o Rafa voltaria para fechar o ouro de um lance e para ver amigos no placar (J42).

## 6. Léo, 37, Outro time, Campinas — Galaxy Z Fold 344×882 dobrado e 884×1104 aberto

Até o 1º chute: **3 toques e o arraste**.

| # | O Léo pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Cadê o Ituano? Vou de Outro time." | [p6-01](capturas/p6-01-primeiro-acesso-dobrado.webp) | "CHAPECOENS/E", "INTERNACION/AL"; nada explica o "Outro time". |
| 2 | "'Fica fora do ranking'? Então pra que jogo?" | [p6-05](capturas/p6-05-home-outro.webp) | "Você joga pelo SEU TIME" e a nota de exclusão; logo abaixo, "Faltam 2 pra sua cidade entrar no ranking. Chama a galera." |
| 3 | "Campinas. Opa, fui parar no Perfil." | [p6-10](capturas/p6-10-cidade-escolhida.webp), [p6-11](capturas/p6-11-perfil-apos-cidade.webp) | A busca responde rápido; ao escolher, a tela vai para o Perfil, onde está "ESCOLHA SEU APELIDO". |
| 4 | "Faltam 2. Já entendi, não precisa repetir." | [p6-12](capturas/p6-12-cidades-faltam.webp) | A regra dos 5 aparece 3 vezes. As abas cortam a 344 px. |
| 5 | "Lances da Seleção! Esse eu vi." | [p6-13](capturas/p6-13-lances-outro-time.webp) | Abre na Seleção: "O tetra em Pasadena", "Todas as cobranças em Marselha". |
| 6 | "E a Galeria de quem é Outro time?" | [p6-14](capturas/p6-14-galeria-outro.webp) | "Escolha uma torcida" duas vezes; nada para a cidade ou a Seleção. |
| 7 | "Abri o celular. Continua estreito." | [p6-16](capturas/p6-16-aberto-home.webp) | 884 px de tela, coluna de ~440 px. |

**Piores momentos:**

1. "Fica fora do ranking das torcidas" logo na Home (J14).
2. A Galeria sem nada para ele (J27).
3. A mesma regra três vezes em Cidades (J28).

**Melhor:** os Lances abrindo na Seleção e o "Faltam 2 pra sua cidade".

**Emoção:** o Léo largaria na Home, por se sentir de fora. Volta para pôr Campinas no ranking, se o jogo der a ele uma casa (J44).

## 7. Bia, 20, universitária, Bahia — Redmi Note 393×873, modo escuro

| # | A Bia pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Bahia, bora, toco duas vezes rápido." | `p7-01`, `p7-02` | Nada duplica. O modo escuro do aparelho não muda nada, porque o jogo já é escuro. |
| 2 | "Deitei o celular." | [p7-03](capturas/p7-03-penalti-paisagem.webp) | A bola e o batedor ficam em cima do gol. Volta ao normal ao virar de novo. |
| 3 | "Caiu a rede no lance 2." | [p7-08](capturas/p7-08-aviso-conexao.webp) | O mesmo "(código: tempo_esgotado)" (J03). A partida segue de treino. |
| 4 | "Mudei a pele e saí sem salvar." | [p7-13](capturas/p7-13-vestiario-saiu-sem-salvar.webp) | "Sair sem salvar? Você mexeu no boneco e ainda não salvou." Boa folha; os botões têm tamanhos diferentes. |
| 5 | "Compartilhar, compartilhar!" | [p7-15](capturas/p7-15-card-duplo-toque-compartilhar.webp) | Dois toques chamam a folha duas vezes. |

**Piores momentos:**

1. O pênalti com o celular deitado (J10).
2. O código técnico no meio da zoeira (J03).
3. O compartilhar em dobro (J32).

**Melhor:** o "Sair sem salvar?", que salva o boneco de um descuido, e o jogo que não se confunde com toque duplo.

**Emoção:** a Bia volta para desafiar quem está do lado na faculdade (J42).

## 8. Dona Neusa, 58, professora, São Paulo — iPad 810×1080 em pé e 1080×810 deitado

| # | A Dona Neusa pensa | Print | O que aconteceu |
|---|---|---|---|
| 1 | "Que letrinha no meio da tela." | [p8-01](capturas/p8-01-primeiro-acesso-ipad.webp) | Escolha do time numa faixa de 448 px num iPad de 810. |
| 2 | "A Casa do meu São Paulo." | [p8-05](capturas/p8-05-casa-cores.webp) | 122.209 presentes em 1980, 39 troféus. "Ver fontes (18)" não parece botão. |
| 3 | "Os troféus. Dá pra tocar?" | [p8-06](capturas/p8-06-galeria.webp), `p8-07` | Ao tocar: "Taça da temporada! Semana a semana, o São Paulo somou mais." e "Mandar no grupo". As 52 semanas mostram "18º de 20 · 10 de 52 semanas". |
| 4 | "Quero ver o que guardam de mim." | [p8-08](capturas/p8-08-termos.webp), [p8-09](capturas/p8-09-termos-fim.webp) | "Ver meus dados" só no fim de 4.939 px. A execução precisa do servidor ("Não deu pra buscar agora."). |
| 5 | "Apagar? O botão bonito é o de apagar?" | [p8-11](capturas/p8-11-apagar-confirmacao.webp) | "Apagar" dourado e grande, "Voltar" menor. |
| 6 | "Câmera? Onde?" | [p8-13](capturas/p8-13-entrar-com-codigo.webp) | "Digita aqui o código que aparecer, ou aponta a câmera pro QR." Ao digitar, entra ("Este aparelho agora é o mesmo torcedor."). |
| 7 | "Deitei o iPad." | `p8-16` | Coluna de ~480 px em 1080. |

**Piores momentos:**

1. "Ver meus dados" escondido no fim dos Termos (J18).
2. O botão de apagar como o mais chamativo (J19).
3. A câmera que não existe na tela (J34).

**Melhor:** a Galeria e a folha do troféu com "Mandar no grupo".

**Emoção:** a Dona Neusa volta pela Casa e pela Galeria, o lado calmo do jogo.

---

## Achados

Gravidade: **bloqueia** (a persona não faz o que veio fazer) · **atrapalha** (faz, mas tropeça ou se sente mal) · **detalhe**. Os achados de tipo oportunidade não têm gravidade de verdade e ficam como detalhe. O link do print abre a imagem do achado.

| ID | Persona | Tela | O que aconteceu | Gravidade | Tipo | Sugestão | Print |
|---|---|---|---|---|---|---|---|
| J01 | Duda | Link de lance (`#lance/<id>`) sem time no aparelho | O link do Stories pede o time, a idade, passa pelo aquecimento e cai na lista dos Lances. A ficha do lance que a amiga mandou nunca abre: a Duda acha o lance sozinha, 5 toques depois. <br><sub>src/main.ts:155 devolve { tela: 'times', depois: 'lances' } sem o item; src/telas/times.ts:94 monta { tela: 'lances', desafio } sem lance. docs/jogo.md 7.3: "Link do lance [...] abre a ficha do item"; 14.8: "o lance (#lance/…) já pede o time e segue para o jogo".</sub> | bloqueia | regra do jogo.md | Levar o lance junto pela escolha do time e pela triagem e abrir a ficha no fim, como o docs promete. | [p2-01](capturas/p2-01-chegada-lance.webp) [p2-05](capturas/p2-05-apos-pular.webp) |
| J02 | Duda | Link de lance: aquecimento no caminho | Quem chega por link de lance faz o aquecimento de 4 estações antes de ver o lance. Quem chega por X1 pula o aquecimento, que vira card na Home. <br><sub>src/telas/times.ts:99-101 (veioPorDesafio só olha ?d=, ?p= e ?l=); docs/jogo.md 14.8.</sub> | atrapalha | regra do jogo.md | Tratar #lance e ?dia como link de desafio: o aquecimento vira card na Home. | [p2-04](capturas/p2-04-lance-ficha.webp) |
| J03 | Zé, Bia | Aviso de conexão caída (Pênaltis e Lances) | O aviso mostra "Caiu a conexão: essa partida não vale mais pontos. (código: tempo_esgotado)". O código técnico aparece no meio da zoeira, e a frase não aponta a saída. <br><sub>src/servidor/motivo.ts:31-33 (comMotivo); src/telas/partida.ts:415; src/telas/lances.ts:1262.</sub> | atrapalha | texto e tom | Tirar o código do texto (ele já pode ir junto no "Achei um erro") e fechar com a saída: "Joga de novo quando a rede voltar". | [p1-12](capturas/p1-12-queda-lance3.webp) [p7-08](capturas/p7-08-aviso-conexao.webp) |
| J04 | Zé | Resultado de Pênaltis que não valeu | Depois da queda, o resultado mostra "+57 PRO FLAMENGO", "+28 gols · +14 defesas · +15 vitória" e "Venceu! E mais 20 pro Flamengo!", e logo abaixo "essa partida não vale mais pontos". Desde o corte, os Lances já escondem os pontos quando a partida não vale. Os Pênaltis ainda mostram. <br><sub>src/telas/resultado.ts:129 (pontos sempre); src/telas/lances.ts:875 (nova && !valendo ? null).</sub> | atrapalha | regra do jogo.md | Mesmo tratamento dos Lances: sem "+N pro time" quando a partida não vale, só "Treino: não somou pro time". | [p1-13](capturas/p1-13-resultado-treino.webp) |
| J05 | Zé | Frase de vitória (narrador) | "Venceu! E mais 20 pro Flamengo!" Desde 09/11, a vitória vale +15, e a mesma tela mostra "+15 VITÓRIA" ao lado. <br><sub>src/narrador/frases.ts:225; src/jogo/penaltis.ts:165 (vitoria: 15); docs/jogo.md seção 6, Pontuação.</sub> | atrapalha | texto e tom | Frase sem número ("Venceu! E o bônus vai pro Flamengo!") ou com o valor da tabela. | [p1-13](capturas/p1-13-resultado-treino.webp) |
| J06 | Zé | Escolha do time vindo do link de X1 (360×740, fonte grande) | "Bora pro jogo" só aparece depois dos 20 times e do campo do apelido. Com fonte grande, quem não rola acha que travou. <br><sub>O toque por texto precisou rolar até o botão.</sub> | atrapalha | entendimento | Com um time marcado, prender "Bora pro jogo" no rodapé da tela. | [p1-03](capturas/p1-03-time-marcado.webp) |
| J07 | Zé, Léo | Cartões de time (344 a 360 px) | Os nomes quebram no meio da palavra: "INTERNACIONA/L" (360 px com fonte grande), "CHAPECOENS/E", "INTERNACION/AL" e "ATHLETICO-/PR" (344 px). Na Galeria, igual. <br><sub>CLAUDE.md: celular primeiro, nada pode cortar.</sub> | atrapalha | regra do jogo.md | Fonte do nome que encolhe pela largura do cartão (clamp), sem quebrar palavra. | [p1-03](capturas/p1-03-time-marcado.webp) [p6-01](capturas/p6-01-primeiro-acesso-dobrado.webp) |
| J08 | Rafa | Home (PC e notebook) | A placa "Troféu novo na Galeria" chega depois do resto e empurra o "Jogar agora" 230 px para baixo, e o clique do Rafa cai no vazio. No notebook 1366×768, o "Jogar agora" fica abaixo da dobra. <br><sub>Medido por script: o botão saiu de y=665 para y=895.</sub> | atrapalha | entendimento | Reservar a altura da placa enquanto ela carrega, ou pô-la abaixo do "Jogar agora". | [p5-12](capturas/p5-12-home.webp) [p5-13](capturas/p5-13-jogar-agora-home.webp) |
| J09 | Rafa, Léo, Dona Neusa | Telas grandes (PC 1920 e 1366, iPad, dobrável aberto) | Todas as telas viram uma coluna de 450 a 520 px no meio. No PC, o campo do pênalti tem cerca de 500 px de largura numa tela de 1920. <br><sub>Regra "conteúdo principal o maior possível". Sem rolagem horizontal em nenhum tamanho.</sub> | atrapalha | regra do jogo.md | Campo dos jogos escalado pela altura da tela; Home e Galeria em 2 colunas a partir de ~800 px. | [p5-16](capturas/p5-16-lance-partida.webp) [p8-01](capturas/p8-01-primeiro-acesso-ipad.webp) [p6-16](capturas/p6-16-aberto-home.webp) |
| J10 | Bia | Pênalti com o celular deitado (873×393) | O campo corta: a bola e o batedor ficam em cima do gol e do goleiro. A barra e a faixa comem 110 px. Ao voltar para retrato, o lance continua de onde estava. <br><sub>Sem rolagem horizontal (873/873).</sub> | atrapalha | regra do jogo.md | Deitado, escalar o campo pela altura ou mostrar "Vire o celular pra jogar". | [p7-03](capturas/p7-03-penalti-paisagem.webp) |
| J11 | Seu Antônio | Prova de Boleiro com fonte 150% e leitura devagar | O Seu Antônio ainda lia o enunciado de 3 linhas quando os 15 s acabaram. Perdeu 2 vidas sem responder, e o "Para ou segue?" chegou com "Parar e levar 0". O tempo é o do docs (15 s). O problema é que a fonte grande não dá tempo de ler. <br><sub>src/jogo/prova.ts:6 (SEGUNDOS = 15); docs/jogo.md 7.1. O print pegou o relógio em 12 s.</sub> | atrapalha | emoção | Medir no balanço quantos estouram o tempo na 1ª pergunta. Se forem muitos, o relógio começa só quando a pergunta termina de aparecer. | [p3-17](capturas/p3-17-prova-pergunta1.webp) [p3-18](capturas/p3-18-prova-tempo-estourou.webp) |
| J12 | Seu Antônio, Rafa | Time do Dia (1ª vez) | O "Exemplo de pistas" pinta SP, 1910 ↑, 7 ↓, A, ● e Interior em verde, amarelo e cinza sem legenda. "Verde é igual. Amarelo é perto." só aparece depois do 1º chute. <br><sub>src/telas/timeDoDia.ts:158; docs/jogo.md 14.4 (dica só depois do 1º chute).</sub> | atrapalha | entendimento | Uma linha fixa embaixo do exemplo: "Verde = igual · Amarelo = perto · ↑↓ = o secreto é maior ou menor". | [p3-12](capturas/p3-12-time-do-dia.webp) |
| J13 | Duda, Camila, Rafa | Ficha do lance e Conquistas | "Recriados 0/10", "10 recriando", "Faltam 4 recriando": a palavra aparece sem explicação. Só o "?" dos Lances explica. "O que é recriar?" <br><sub>src/jogo/lancesTextos.ts:152; src/telas/conquistas.ts:78 e 110.</sub> | atrapalha | texto e tom | Na ficha, uma linha uma vez: "Recriar = gol no mesmo canto do lance de verdade (+8)". | [p2-07](capturas/p2-07-ficha-lance-baixo.webp) [p4-06](capturas/p4-06-conquistas.webp) |
| J14 | Léo | Home de quem é "Outro time" | No lugar do duelo, a Home diz "Quem joga por "Outro time" fica fora do ranking das torcidas." e a faixa mostra "Você joga pelo SEU TIME". Soa como exclusão. Logo abaixo, o "Faltam 2 pra sua cidade" é o que anima. <br><sub>src/telas/inicio.ts:201. O "3º de 4" ao lado é do modo falso.</sub> | atrapalha | emoção | Trocar a nota por um convite: "Seu placar é o da sua cidade. Bora pôr Campinas no ranking?" | [p6-05](capturas/p6-05-home-outro.webp) |
| J15 | Léo | Ranking e Galeria a 344 px (dobrável fechado) | As abas ficam apertadas, "CONQUISTAS" corta e as sub-abas passam da borda. <br><sub>Sem rolagem horizontal da página (344/344): o corte é dentro da barra. O PR #138, mesclado depois desta rodada, refez as abas de Cidades: conferir de novo.</sub> | atrapalha | regra do jogo.md | Abas que rolam com um degradê na borda, ou rótulos curtos abaixo de 360 px. | [p6-12](capturas/p6-12-cidades-faltam.webp) [p6-14](capturas/p6-14-galeria-outro.webp) |
| J16 | Zé, Rafa | Resultado: tantos "mandar" | São 7 botões: "Mandar a medalha", "Mandar no grupo", "Card", "Stories", "Emoji", "Link" e "Vestir agora". No 1º corte, no celular, a fileira de formatos fica atrás da barra fixa "Início / Mais uma". <br><sub>src/telas/resultadoPadrao.ts:90-97.</sub> | atrapalha | regra do jogo.md | Um "Mandar no grupo" logo abaixo dos pontos e os formatos numa folha. A medalha entra como opção do card. | [p1-14](capturas/p1-14-botoes-mandar.webp) [p5-23](capturas/p5-23-resultado-compartilhar.webp) |
| J17 | Rafa | Seu card no PC (sem a folha de compartilhar) | "Compartilhar" vira "Copiado!", mas só o texto e o link vão para a área de transferência. Nada avisa que a imagem não foi. <br><sub>src/telas/cardPersonalizado.ts:588-592.</sub> | atrapalha | regra do jogo.md | "Link copiado. Pra mandar a imagem, use Salvar imagem." | [p5-29](capturas/p5-29-compartilhar-sem-share-pc.webp) |
| J18 | Dona Neusa | Termos: Ver meus dados | "Ver meus dados" e "Apagar meus dados" só aparecem no fim de uma página de 4.939 px. O Perfil leva só ao "Apagar". <br><sub>src/telas/perfil.ts:154; docs/jogo.md 13. A execução precisa do servidor (pulada).</sub> | atrapalha | regra do jogo.md | Pôr "Ver meus dados" ao lado do "Apagar meus dados" no Perfil, e um atalho no topo dos Termos. | [p8-08](capturas/p8-08-termos.webp) [p8-09](capturas/p8-09-termos-fim.webp) |
| J19 | Dona Neusa | Confirmar "Apagar meus dados" | Na folha de confirmação, "Apagar" é o botão principal, dourado e grande, e "Voltar" o secundário. O destaque fica com a ação que não tem volta. <br><sub>src/telas/termos.ts:58 (class="botao").</sub> | atrapalha | regra do jogo.md | "Voltar" como principal; "Apagar" em contorno vermelho, do mesmo tamanho. | [p8-11](capturas/p8-11-apagar-confirmacao.webp) |
| J20 | Seu Antônio | Aquecimento: defesa e Prova | Sem toque nenhum, a defesa se resolve ("Foi no outro canto! Agora você já sabe."), a Prova estoura o tempo, as duas passam e o fim marca ✓ nas 5. É a decisão do docs ("toda estação comemora"), mas quem lê devagar não chega a fazer o gesto. <br><sub>docs/jogo.md 14.4.</sub> | detalhe | emoção | Só no aquecimento, a defesa espera o 1º toque antes do chute sair. | [p3-06](capturas/p3-06-aquec2.webp) [p3-11](capturas/p3-11-aquec-fim.webp) |
| J21 | Seu Antônio, Rafa | Instrução da defesa | O aquecimento diz "Olhe o pé amarelo" e a partida diz "Olhe o pé de apoio". Com movimento reduzido, o Seu Antônio não viu o pé amarelo marcado. <br><sub>src/jogo/aquecimento.ts:25; src/telas/partida.ts:400.</sub> | detalhe | texto e tom | Uma frase só nos dois lugares, e o pé marcado também sem movimento. | [p3-06](capturas/p3-06-aquec2.webp) [p1-06](capturas/p1-06-chute1.webp) |
| J22 | Zé | Triagem de idade | "Quantos anos você tem?" com três botões escuros e nenhuma linha dizendo para quê. O Zé pensa: "Pra que querem minha idade?" <br><sub>src/telas/triagem.ts:15-18; docs/jogo.md 13 (triagem neutra).</sub> | detalhe | entendimento | Uma linha neutra: "Só pra deixar o jogo certo pra sua idade." | [p1-04](capturas/p1-04-apos-time.webp) |
| J23 | Zé | Resultado do X1 perdido | O balão diz "Camisa10 venceu essa. Revanche? O link tá aqui.", mas não há link no balão. A revanche está no botão de baixo. <br><sub>src/narrador/frases.ts:277; docs/narrador.md 6.</sub> | detalhe | texto e tom | "Camisa10 venceu essa. Revanche?" | [p1-09](capturas/p1-09-resultado-topo.webp) |
| J24 | Zé | Resultado só com gols | "+21 pro Flamengo" e logo abaixo um bloco "+21 gols": o mesmo número duas vezes. | detalhe | texto e tom | Esconder o detalhe quando só há uma parcela. | [p1-09](capturas/p1-09-resultado-topo.webp) |
| J25 | Zé | Placar da disputa (360 px) | "JUNIOR B…" cortado no placar durante a partida. | detalhe | entendimento | Nome curto do adversário no placar ou 2 linhas. | [p1-06](capturas/p1-06-chute1.webp) |
| J26 | Duda | Apelido de jogador famoso | O aparelho aceitou "Neymar" e o Pôster mostrou o apelido. O filtro de famosos existe, mas só no servidor (pulado aqui). Sem internet, o apelido fica no aparelho e vai no card até sincronizar. <br><sub>src/telas/times.ts:72-86; migração 20261106100000_apelidos_famosos.sql; docs/jogo.md seção 3, Apelido. A frase com "Neymar" e com palavrão foi barrada no aparelho (p2-10).</sub> | detalhe | regra do jogo.md | Não pôr no card um apelido que ainda não passou pelo servidor, ou levar a lista curta de famosos ao aparelho. | [p2-08](capturas/p2-08-poster.webp) |
| J27 | Léo | Galeria de quem é "Outro time" | Abre com "Escolha uma torcida / Toque pra ver a Galeria de um time" e logo abaixo outra caixa "Escolha uma torcida". Nada para a Seleção ou para a cidade. <br><sub>src/telas/galeria.ts:66-69.</sub> | detalhe | entendimento | Um título só e, para Outro time, abrir já na lista, com a cidade ou a Seleção primeiro. | [p6-14](capturas/p6-14-galeria-outro.webp) |
| J28 | Léo | Ranking > Cidades | A regra dos 5 jogadores aparece 3 vezes na mesma tela ("Faltam 2...", "Cidade só entra com 5 ou mais...", "Só entra quem tem 5 ou mais..."). <br><sub>src/telas/rankingCidades.ts:143-144; src/jogo/rankingCidades.ts:46-48.</sub> | detalhe | texto e tom | Ficar só com "Faltam 2 pra sua cidade entrar no ranking. Chama a galera." | [p6-12](capturas/p6-12-cidades-faltam.webp) |
| J29 | Léo | Escolher minha cidade (pela Home) | Ao escolher Campinas, a tela vai para o Perfil e não volta à Home, de onde o Léo veio. <br><sub>src/app.ts:66 (sem depois, o Perfil).</sub> | detalhe | entendimento | Voltar de onde veio, com "Campinas é sua segunda camisa". | [p6-10](capturas/p6-10-cidade-escolhida.webp) [p6-11](capturas/p6-11-perfil-apos-cidade.webp) |
| J30 | Léo | Perfil | "ESCOLHA SEU APELIDO" em caixa alta, no lugar do nome, parece um aviso. <br><sub>src/telas/perfil.ts:68.</sub> | detalhe | texto e tom | "Dar um apelido (opcional)". | [p6-11](capturas/p6-11-perfil-apos-cidade.webp) |
| J31 | Rafa | Seu card pelo teclado | As setas trocam o estilo, mas só com o carrossel focado (4 Tabs). A dica diz só "deslize pra trocar". <br><sub>src/telas/cardPersonalizado.ts:60 e 539-542.</sub> | detalhe | entendimento | Botões ‹ › visíveis no PC e setas valendo na folha inteira. | [p5-26](capturas/p5-26-card-personalizado.webp) |
| J32 | Bia | Seu card: dois toques rápidos em Compartilhar | Dois toques chamam a folha de compartilhar duas vezes. No celular, a 2ª falha e mostra "Não deu pra compartilhar agora." <br><sub>src/telas/cardPersonalizado.ts:582-595. Dois toques no jogo e na triagem não deram problema.</sub> | detalhe | entendimento | Travar o botão até a folha voltar. | [p7-15](capturas/p7-15-card-duplo-toque-compartilhar.webp) |
| J33 | Bia | Vestiário: "Sair sem salvar?" | A folha é boa, mas "Salvar" tem 64 px de altura e "Sair" tem 44 px. <br><sub>Medido por script.</sub> | detalhe | regra do jogo.md | Os dois do mesmo tamanho; o destaque fica na cor. | [p7-13](capturas/p7-13-vestiario-saiu-sem-salvar.webp) |
| J34 | Dona Neusa | Entrar com código | "Digita aqui o código que aparecer, ou aponta a câmera pro QR." A tela não tem câmera; a Dona Neusa procura um botão de câmera no jogo. <br><sub>src/telas/entrarComCodigo.ts:57.</sub> | detalhe | entendimento | "…ou abra a câmera do aparelho (fora do jogo) e aponte pro QR." | [p8-13](capturas/p8-13-entrar-com-codigo.webp) |
| J35 | Dona Neusa | Termos, "Seus direitos" | "Ao apagar, saem [...] as suas mensagens." A mesma página diz "Não tem chat." Fica a dúvida: que mensagens? <br><sub>src/dados/termos.md:8 e 58.</sub> | detalhe | texto e tom | "…e as suas mensagens do Achei um erro." | [p8-09](capturas/p8-09-termos-fim.webp) |
| J36 | Dona Neusa | Casa do time e Galeria | "Ver fontes (18)" e "Nota completa" não parecem botão, e os troféus da Galeria não dizem que dá para tocar (a folha que abre é boa). | detalhe | entendimento | Seta ou contorno nos links e "toque pra ver" uma vez na Galeria. | [p8-05](capturas/p8-05-casa-cores.webp) [p8-06](capturas/p8-06-galeria.webp) |
| J37 | Camila | Perfil: outro aparelho | "Jogar em outro aparelho" e "Entrar com código de outro aparelho" vêm juntos, com nomes parecidos. | detalhe | entendimento | Um botão "Outro aparelho" que abre as duas opções. | [p4-05](capturas/p4-05-perfil.webp) |
| J38 | Rafa | Ranking da semana | As bandeirinhas de time com cor 1 preta (Atlético-MG, Botafogo, Corinthians, Santos, Vasco) somem no fundo verde-escuro. | detalhe | regra do jogo.md | Contorno claro na bandeirinha. | [p5-31](capturas/p5-31-ranking.webp) |
| J39 | Seu Antônio | "?" dos Lances | Explica bem o "recriar" e o X1, mas fecha com um parágrafo técnico ("Cada partida vale no máximo 150. São 10 partidas valendo por dia, [...] as 3 melhores contam."). <br><sub>src/telas/regras.ts.</sub> | detalhe | texto e tom | Separar "Como joga" (3 linhas) de "Pontos", em lista. | [p3-23](capturas/p3-23-lances-ajuda.webp) |
| J40 | Camila | Galeria | O botão "TROCAR" ao lado de "Palmeiras · 11 troféus" não diz o que troca. | detalhe | texto e tom | "Ver outro time". | [p4-07](capturas/p4-07-galeria.webp) |
| J41 | Zé | Link de X1 até o 1º chute | São 4 toques e uma lista de 20 times antes do 1º chute: Aceitar o X1, time, Bora pro jogo e idade. <br><sub>Pilar 4 e "um toque e joga". A idade precisa vir antes (seção 13).</sub> | detalhe | oportunidade | Nova: no link de X1, a idade vem antes e o time sai do link de quem chamou (?time=) ou é pedido no resultado, antes de somar. | [p1-01](capturas/p1-01-chegada-link.webp) |
| J42 | Zé, Camila, Léo, Bia | X1 e amigos | Todas querem saber "quanto tá eu x Camisa10" na série de revanches, e o placar some a cada partida. <br><sub>Backlog: ranking entre amigos.</sub> | detalhe | oportunidade | Reforça ranking entre amigos: placar acumulado do X1 com a mesma pessoa ("Zé 1 x 1 Camisa10"), sem apelido em ranking público. | [p1-09](capturas/p1-09-resultado-topo.webp) |
| J43 | Duda | Ficha do lance | A Duda quer repostar o lance no Stories, mas só a medalha e o resultado têm card. <br><sub>docs/jogo.md 7.3 (link do lance).</sub> | detalhe | oportunidade | Nova: "Mandar esse lance" na ficha, com o link `#lance/<id>` e o título (sem nome de pessoa). | [p2-07](capturas/p2-07-ficha-lance-baixo.webp) |
| J44 | Léo | Outro time | O Léo não consegue dizer que torce para um clube do interior, e a Galeria e a Home não têm o que mostrar a ele. <br><sub>Os Lances já abrem na Seleção, e o Léo gostou.</sub> | detalhe | oportunidade | Reforça "Times criados pelos jogadores" (docs/jogo.md seção 3, fase 2). Antes disso, a cidade como camisa principal na Home e na Galeria. | [p6-05](capturas/p6-05-home-outro.webp) [p6-13](capturas/p6-13-lances-outro-time.webp) |
| J45 | Duda, Camila | Pôster | O Pôster com o boneco é o ponto alto de emoção, e o boneco não aparece em campo. <br><sub>Backlog.</sub> | detalhe | oportunidade | Reforça seu boneco em campo. | [p2-08](capturas/p2-08-poster.webp) |
| J46 | Rafa | Pênalti no PC | Setas e Enter não fazem nada no pênalti, só o arraste do mouse. A Prova já aceita as teclas 1 a 4. | detalhe | oportunidade | Nova: setas miram e Espaço segura e solta a força. | [p5-16](capturas/p5-16-lance-partida.webp) |
| J47 | Camila, Léo | Crava e cidade | As duas querem disputar com os amigos do trabalho e da cidade. <br><sub>Backlog.</sub> | detalhe | oportunidade | Reforça ligas do Crava. |  |
| J48 | Seu Antônio, Dona Neusa | Casa do time | A Casa é a tela mais calma e a que mais prende quem gosta de história. <br><sub>Backlog.</sub> | detalhe | oportunidade | Reforça Tabela de todos os tempos, como uma seção da Casa. | [p3-21](capturas/p3-21-casa-vasco.webp) |

## As 5 oportunidades que mais valem

1. **O link leva direto ao que a pessoa veio fazer (J41, junto com J01 e J02).** O link do WhatsApp é a porta do jogo (pilar 4), e "convites por jogador" é a métrica número 1 da seção 11. Hoje o X1 pede 4 toques e uma lista de 20 times antes do chute, e o lance nem abre. Se a idade vier primeiro e o time sair do link de quem chamou (`?time=`), ou for pedido no resultado, antes de somar, o 1º chute fica a 1 ou 2 toques. Nova.
2. **Placar do X1 com a mesma pessoa (J42).** Reforça ranking entre amigos. Quatro personas pediram "quanto tá eu x Camisa10". É o motor tribal (pilar 2) em escala de grupo e dá motivo para voltar amanhã sem sequência nem urgência. Cabe no MVP sem apelido em ranking público: só as duas pessoas veem.
3. **"Mandar esse lance" na ficha (J43).** O lance já tem link (`#lance/<id>`) e título sem nome de pessoa. Falta o botão. Fecha o ciclo do Stories que trouxe a Duda e faz o catálogo crescer por link, não por anúncio. Nova.
4. **Outro time com casa própria (J44).** Reforça "Times criados pelos jogadores" (seção 3, fase 2). Até lá, quem é Outro time vê a cidade como camisa principal na Home e na Galeria, e os Lances já na Seleção. Isso troca o "fica fora do ranking" por "bora pôr Campinas no ranking" (J14). Hoje é a persona com mais vontade de largar.
5. **Seu boneco em campo (J45).** Reforça "seu boneco em campo". O Pôster foi o pico de emoção da Duda e da Camila. Levar o boneco para a partida liga o vestiário ao jogo e dá a cada um um motivo para mandar o card.
