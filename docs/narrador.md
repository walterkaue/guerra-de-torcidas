# Banco do narrador — pênaltis, palpites, quiz, Time do Dia e Lances

> Versão 2.1 · 08/11/2026 · Fonte das frases do narrador (pênaltis e Palpite da Rodada) e das provocações entre torcidas e cidades.
> Mudanças da 2.1: glossário do jogo (decidido pelo Kauê em 08/11/2026): X1 vira desafio, Revanche vira Jogo de volta, recriar vira carimbar, Crava a Rodada vira Palpite da Rodada (sem "cravar"); seções novas **Regras de estilo dos textos** e **Bordões do jogo**; frases novas e as etiquetas `[apertada]`, `[passeio]` e `[colado]`.
> Mudanças da 2.0: seção 16, **Divisões** (Home durante o mês, placa e card do fim do mês; decididas pelo Kauê em 06/11/2026).
> Mudanças da 1.9: seção 15, **Galeria de Troféus** (uma frase na ficha de cada troféu; aprovadas pelo Kauê em 06/11/2026).
> Mudanças da 1.8: três erros e fora na Prova: 3 frases comuns em `prova_errou` e situação nova `prova_ultima_vida` (aprovadas pelo Kauê em 01/11/2026).
> Mudanças da 1.7: seção 13, **aviso de domingo** (push sem urgência); sai `dia_sequencia` do Time do Dia (sem sequência de dias, `jogo.md` seção 13).
> Mudanças da 1.6: seção 12, **Lances do Jogo** (abertura, barreira, lance recriado e fim); nas jogadas, os Lances reaproveitam as frases da seção 3 que não falam de pênalti.
> Mudanças da 1.5: 7 frases de tiozão trocadas (fila do banco, manchete, capa de jornal, picolé, primeira pedra, caneta, doutorado); glossário novo ("Pênaltis", "Chamar no X1", "em teste"): frases de X1 sem "duvido" e "desafio", e o convite do link virou texto fixo (sai `desafio_convite`).
> Mudanças da 1.4: seções 10 (**Prova de Boleiro**) e 11 (**Time do Dia**); frases de `prova_ajuda` com a etiqueta da ajuda usada (`[tira_duas]`, `[arquibancada]`, `[troca]`).
> Mudanças da 1.3: seção 9, frases do **Crava a Rodada**, com as variáveis `{rodada}`, `{acertos}` e `{jogos}` e as etiquetas `[empate]` e `[contra]`.
> Frase nova entra aqui e passa pelo checklist de tom abaixo.
> Mudanças da 1.1: frases neutras de gênero, desempate (morte súbita e par ou ímpar) no lugar do empate, provocação entre cidades.
> Mudanças da 1.2: **etiquetas de lance** (a frase só sai quando combina com o que aconteceu: meio, canto, alto, baixo, chute fraco, lado do goleiro), frases novas para chute no meio e no alto, situação nova `maquina_fora` (batedor da máquina errou o gol) e `decisiva` separada entre cobrança e defesa.

## 1. Checklist de tom (vale para toda frase nova)

- Zoa o **lance, a bola, a situação e o time**. Nunca a pessoa.
- **Neutra de gênero:** fala do lance, não de quem joga. "Cavou!", não "Ele cavou!". Nada de "artilheiro", "herói", "representante" ou "goleiro" se referindo a quem está jogando.
- Nada sobre raça, orientação, gênero, religião, origem, corpo, deficiência ou saúde.
- Nada de pessoa real: jogador, técnico, narrador, comentarista. Nada de bordão ou frase célebre de pessoa real (narrador, comentarista, jogador), nem adaptado, nem trecho de música. Vale o jargão comum do futebol e os bordões do jogo (abaixo).
- Nada de "cravar", "cravou", "cravado", "placar exato", "palpite certeiro", "retorno" ou "mercado": lembram site de aposta (o teste do narrador barra).
- **Classificação livre:** sem palavrão, bebida, aposta ou violência. Escolas entram na fase 2.
- Sem nome de clube escrito na frase: só as variáveis de time.
- **Cidades:** só posição no ranking. Nada de sotaque, origem, economia, tamanho da cidade ou estereótipo de quem mora lá.
- Derrota zoa, mas sempre aponta a saída (jogo de volta, "bola pro centro", "os pontos contam igual").
- "Frango" só para o goleiro da máquina, nunca para quem joga.

### Regras de estilo dos textos

Valem para todo texto do jogo, não só o narrador (o `docs/visual.md` aponta para cá).

1. **Um nome por coisa:** o mesmo nome no botão, na Home, no aviso, no card e no narrador. O nome interno pode ser outro (o desafio é `x1` no código; o Palpite da Rodada é `crava`).
2. **Botão:** infinitivo, de 1 a 3 palavras, até ~20 caracteres (cabe a 360 px com fonte 130%), sem ponto de interrogação. Os da tela do convite do desafio (09/11/2026): "Encarar o desafio", "Escolher meu time", "Ir pro início", "Tentar de novo" e "Bora pro jogo" (o da lista dos times); "Outro time" é o nome da opção que abre a lista, como o time "Outro time" dela. Na barra do time da Home (09/11/2026), o rótulo "Tabela ›" ("Escolher ›" quando leva à escolha da cidade; a barra inteira é o botão, e o leitor de tela lê "Ver a tabela") e textos curtos de situação, sem ponto final: "Seus pontos vão pro placar do Flamengo", "na semana", "12 pts atrás do Palmeiras", "Escolha sua cidade: é ela que joga por você". A seção do fim da Home se chama "Como tá a guerra".
3. **Frase e texto do WhatsApp:** imperativo de conversa, como se fala no grupo.
4. **Texto que vai com o link:** primeira pessoa de quem manda ("Te desafio", "Fiz"), com o jogo, o número e a regra; no máximo 2 linhas antes do link.
5. **Vocabulário boleiro sem viajar:** jargão que o torcedor médio entende sem explicação. Gíria de nicho só no narrador, e só se o sentido sair do contexto.
6. **Estrangeirismo só sem troca:** se existe palavra que o torcedor usa, ela ganha (tabela, imagem, erro). Ficam link, emoji e siglas que todo mundo fala (VAR).
7. **Nenhum bordão ou frase célebre de pessoa real** (narrador, comentarista, jogador), nem adaptado. O estilo pode inspirar; as palavras são nossas.
8. **Variedade:** cada situação do narrador caminha para 8 frases ou mais, sorteadas sem repetir a mesma em seguida.
9. **Zoa o time e a situação.** O apelido de quem desafiou pode aparecer, mas a piada é sobre o placar. "Frango" só para o goleiro da máquina.
10. **Zero aposta, além da lista proibida:** nada de "placar exato", "retorno", "mercado", "palpite certeiro" nem "cravar"; nada que lembre narrador ou comentarista que é embaixador de casa de aposta.
11. **Sem palavra de dois sentidos na mesma tela** ("venceu" = ganhou ou prazo; "valeu" = contou ou obrigado; "bate aí" = placar ou mão).
12. **Neutro de gênero:** fala do lance ou de "você", nunca de "ele" ou "ela".
13. **Termo novo** sai de estudo com evidência e passa por enquete rápida com a turma; com o funil do desafio, comparar envios e aceites antes e depois.

### Bordões do jogo

A assinatura do nosso narrador. Entram como frase normal das situações abaixo e são sorteados como as outras, nunca em toda fala.

| Bordão | Quando | Onde está |
|---|---|---|
| "Bota no placar!" | gol que vale ponto | `gol` |
| "Ponto pro time!" | partida que contou | `vitoria`, `prova_fim` |
| "Arquibancada em pé!" | golaço | `gol_angulo` |
| "Bola pro centro!" | depois da derrota | `derrota`, `desafio_derrota` |
| "Isso vai pro grupo!" | lance raro | `lance_recriou` (⭐) |
| "Respira, torcedor!" | antes da cobrança decisiva | `decisiva` |

## 2. Regras para o código

- **Sorteio:** dentro da mesma partida, nunca repetir frase. Guardar as últimas ~30 frases vistas no aparelho (localStorage, com try/catch) e evitar repeti-las.
- **Raras (⭐):** peso 1/10 em relação às outras. São a surpresa que vira print.
- **Não usar a semente da partida** para sortear frases. O narrador tem seu próprio gerador aleatório, para não mexer no determinismo da física (cliente e servidor precisam dar o mesmo resultado).
- **Prioridade num mesmo lance:** cavadinha > trave e gol > ângulo > gol. Só uma frase por lance.
- **Tela final:** 5 de 5 e depois vitória ou derrota (até 2 frases). Não existe mais empate: toda disputa termina com vencedor (ver desempate no `jogo.md`).
- **Desempate:** `morte_subita` sai quando a morte súbita começa; `par_ou_impar_escolha` enquanto o servidor responde; `par_ou_impar_ganhou` ou `par_ou_impar_perdeu` no resultado, antes da frase de vitória ou derrota.
- **Tamanho:** até ~75 caracteres depois de trocar as variáveis, para caber em 2 linhas em 390 px. Grito em MAIÚSCULAS só no começo.
- **Primeira letra** da frase final sempre maiúscula (para `{o_time}` no começo virar "O Flamengo").
- **Variável faltando** (ex.: jogador sem rival, partida fora de desafio, jogador sem cidade): pular a frase e sortear outra.
- **"Outro time":** quem escolheu "Outro time" não recebe frases com variáveis de time ou rival; recebe as de cidade.
- **Etiquetas de lance (1.2):** uma frase pode terminar com etiquetas entre colchetes, por exemplo `[canto] [goleiro_outro_lado]`. Ela **só pode ser sorteada se todas as etiquetas forem verdadeiras** naquele lance. Frase sem etiqueta vale para qualquer lance. Entre as frases possíveis, as que têm etiqueta têm **peso 2** (combinam mais com o lance). As etiquetas nunca aparecem na tela.
- **Cidade sem preposição:** `{cidade}` nunca vem depois de "de", "do", "da", "em", "no" ou "na" (cada cidade pede um artigo diferente). Escreva "{cidade} tá em 3º", nunca "a torcida de {cidade}".

### Variáveis

| Variável | Exemplo masculino | Exemplo feminino |
|---|---|---|
| `{o_time}` | o Galo da Vila | a Ponte Rasa |
| `{do_time}` | do Galo da Vila | da Ponte Rasa |
| `{pro_time}` | pro Galo da Vila | pra Ponte Rasa |
| `{no_time}` | no Galo da Vila | na Ponte Rasa |
| `{o_rival}`, `{do_rival}`, `{pro_rival}` | idem, para o rival | |
| `{apelido}` | apelido do jogador | |
| `{desafiante}` | apelido de quem te desafiou | |
| `{placar}` | 4 x 3 | |
| `{pontos}` | 47 | |
| `{dif}` | 300 pontos · 1 ponto | |
| `{horas}` | 6 horas · 1 hora | |
| `{posicao}` | 3º | |
| `{cidade}` | Caraguatatuba | |
| `{cidade_rival}` | a cidade logo acima (ou abaixo) no ranking do estado | |
| `{uf}` | SP | |
| `{numero}` | número do narrador no par ou ímpar (0 a 5) | |

(Os exemplos de time são inventados. Cada time precisa ter o artigo "o" ou "a" cadastrado.)

### Etiquetas de lance

Colunas do gol: 0 e 2 são os cantos, 1 é o meio. Linhas: 0 é baixo, 1 é alto (mesmas zonas do `penaltis.ts`).

| Etiqueta | Verdadeira quando | Usada em |
|---|---|---|
| `[canto]` | a bola foi na coluna 0 ou 2 | cobrança e defesa |
| `[meio]` | a bola foi na coluna 1 | cobrança e defesa |
| `[alto]` | a bola foi na linha de cima | cobrança e defesa |
| `[baixo]` | a bola foi na linha de baixo | cobrança e defesa |
| `[fraca]` | cobrança com força abaixo de 32 | cobrança |
| `[goleiro_outro_lado]` | o goleiro da máquina ficou numa coluna diferente da bola | cobrança |
| `[travessao]` | bateu no travessão (altura da trave, não no poste lateral) | trave |
| `[pulou_outro_lado]` | quem joga pulou numa coluna diferente da bola | defesa |
| `[mesma_coluna]` | quem joga acertou a coluna, mas errou a altura | defesa |
| `[nao_pulou]` | quem joga não tocou em nenhuma zona a tempo | defesa |
| `[apertada]` | a disputa terminou com 1 gol de diferença | vitória (pênaltis) |
| `[passeio]` | a disputa terminou com 3 gols de diferença ou mais | vitória (pênaltis) |
| `[colado]` | seu time está na frente do rival por pouco (até `COLADO` na média) | `rival_frente` |
| `[dica_honesta]` | o pé de apoio apontava a coluna certa | defesa |
| `[cobranca]` / `[defesa]` | o lance decisivo é uma cobrança / uma defesa | decisiva |
| `[tira_duas]` / `[arquibancada]` / `[troca]` | a ajuda usada na pergunta | prova_ajuda |

## 3. Frases do lance

### `abertura` — começo da partida
- Tá valendo! A torcida {do_time} tá de olho em você.
- Silêncio no estádio... só se ouve o pipoqueiro.
- Cinco cobranças, cinco defesas e uma torcida inteira contando com você.
- Ajeita a meia, respira fundo. É pênalti!
- O goleiro tá dançando na linha. Mostra quem manda.
- Bola na marca da cal. {o_time} pede passagem!
- Hoje não tem VAR pra te salvar. Capricha!
- Atenção, torcida {do_time}: tem gente nossa em campo!
- ⭐ O gandula já foi buscar a bola reserva. Precaução.

### `gol` — gol comum
- GOOOL! Bola de um lado, goleiro do outro! [canto] [goleiro_outro_lado]
- É REDE! Mandou o goleiro buscar lá dentro!
- GOL! Deslocou o goleiro, que foi comprar pão do outro lado. [goleiro_outro_lado]
- Entrouuu! Sangue frio!
- GOL! O goleiro só viu o vulto.
- GOL! Bateu com a calma de quem tá no sofá.
- GOOOL! Balançou a rede e o coração da torcida {do_time}!
- Lá dentro! O goleiro escolheu o canto errado com muita convicção. [goleiro_outro_lado]
- GOL! Simples, seco, sem conversa.
- Estufou a rede! Pode mandar o print pro grupo!
- GOL! O goleiro pulou pra foto, mas a bola não quis posar.
- GOL! Mais dez pontinhos na conta {do_time}!
- Pá, pum, rede! Próximo!
- GOL! Bateu tão tranquilo que parecia treino de quarta.
- Entrou rasteirinha, de mansinho, pedindo licença. [baixo]
- GOOOL! A torcida {do_time} solta o grito preso na garganta!
- GOL! No meio, sem cerimônia, com o goleiro deitado no canto! [meio] [goleiro_outro_lado]
- Bem no meio! Coragem de quem sabe o que faz. [meio]
- GOL! Encheu o pé lá no alto, sem chance! [alto]
- Rasteiro e no cantinho! Bola de sinuca! [canto] [baixo]
- ⭐ GOL! O goleiro tá até agora procurando a bola no bolso.
- Estufou a rede! Bota no placar!
- No fundo do barbante! A máquina só olhou.
- Pombo sem asa! O goleiro nem viu passar.
- Canudo! A rede pediu arrego.

### `gol_angulo` — gol no ângulo
- NO ÂNGULO! Tirou a teia de aranha da gaveta!
- ONDE A CORUJA DORME! Que pintura!
- NA GAVETA! Abre, guarda e fecha!
- NO ÂNGULO! Nem com escada o goleiro alcançava.
- Colocou com a mão! Na forquilha, sem chance!
- É NO CANTINHO! Precisão de quem passa linha na agulha.
- ÂNGULO! A bola entrou fazendo carinho na trave.
- NA FORQUILHA! O goleiro voou bonito, mas só pra foto.
- Gaveta! Pode lacrar e mandar com etiqueta!
- NO ÂNGULO! Tem gente na arquibancada chorando de emoção.
- Bateu no cantinho que nem o GPS achava!
- ⭐ NO ÂNGULO! A coruja acordou e pediu silêncio.
- Onde a coruja dorme! Arquibancada em pé!
- Na gaveta! Essa vai pra parede do museu.

### `cavadinha` — cavadinha que entra
- É CAVADINHAAA! Que categoria, que deboche!
- CAVADINHA! O goleiro pulou e a bola passou de carona por cima!
- CAVOU! CAVOU MESMO! Que coragem, que audácia!
- CAVADINHA! O goleiro já tava no chão quando a bola chegou, devagarinho.
- De cavadinha! Isso não é cobrança, é exposição de arte!
- Cavadinha e entrou! O goleiro vai precisar de um abraço.
- CAVADINHA! Sangue gelado, cara de paisagem!
- Cavou no meio! O goleiro foi pro canto e a bola passeou.
- QUE DEBOCHE! Cavadinha na cara do goleiro!
- É de cavadinha! Põe no telão e reprisa em câmera lenta!
- CAVADINHA! A torcida {do_time} não tá acreditando no que viu!
- ⭐ Cavadinha! A bola subiu, deu tchau pro goleiro e desceu na rede.
- Cavou com a calma de quem tá no quintal de casa!

### `cavadinha_falhou` — tentou cavadinha e não entrou
- Cavadinha no colo do goleiro! Ele agradece o presente.
- Era pra ser cavadinha, virou entrega em domicílio.
- Cavou e o goleiro ficou parado esperando. Ele sabia!
- Cavadinha sem força! A bola chegou cansada no goleiro.
- Que ousadia... que deu muito errado!
- ⭐ Tentou cavadinha, saiu bolinha de sabão.

### `trave_gol` — bateu na trave e entrou
- NA TRAVE E ENTROU! Pediu licença pro poste e foi pra rede!
- Trave e gol! Assustou todo mundo, mas valeu!
- Tocou no poste e morreu na rede! Que emoção desnecessária!

### `trave` — bateu na trave e saiu
- NA TRAVE! Até o estádio vizinho ouviu o barulho!
- Trave! A bola beijou o poste e foi embora.
- TRAVE! Por um triz!
- No poste! Faltou um tiquinho assim.
- TRAVE! O goleiro já tá agradecendo ao poste.
- Bateu no travessão! O barulho foi de dar dó. [travessao]
- NA TRAVE! A rede ficou só na vontade.
- ⭐ Trave! A trave tá jogando no time adversário hoje.
- Carimbou a trave! Faltou um dedo.

### `fora_cima` — isolou (força demais)
- Isolou! Foi pra Marte, a bola tá orbitando!
- ISOLOU! A bola foi parar na fila do pastel.
- Por cima! Assustou os pombos, mas não o goleiro.
- Mandou pra arquibancada! Alguém ganhou lembrancinha.
- ISOLOU! Aciona o controle aéreo!
- Chutou tão forte que a bola pediu pra descer.
- Por cima do travessão! Força de mais, mira de menos.
- Lá no terceiro anel! Se tivesse terceiro anel.
- ISOLOU! O gandula vai ter que pegar ônibus pra buscar.
- A bola subiu, subiu... e não voltou.
- Por cima! Tava mirando no placar eletrônico?
- O vizinho do estádio vai ganhar uma bola nova.
- ⭐ ISOLOU! A estação espacial confirmou: a bola passou por lá.
- Isolou! Essa foi buscar pipoca na arquibancada.

### `fora_lado` — pra fora pelo lado
- Pra fora! Pegou o caminho do estacionamento.
- Passou raspando! O goleiro nem precisou se mexer.
- Fora! Errou o gol, que é desse tamanho!
- Pela linha de fundo! A bola tava com pressa de ir embora.
- Tirou demais! Cantinho bom, gol errado.
- Pra fora, e a torcida {do_time} pôs a mão na cabeça.
- Pra fora! O poste agradece, nem teve trabalho.
- ⭐ Fora! A bola foi ver se tinha lanche na saída.
- Pro mato! Chama o gandula.

### `goleiro_pegou` — o goleiro da máquina defendeu sua cobrança
- Pegou! O goleiro tava com o almoço pago!
- DEFENDEU! Chutou fraquinho, entregou na mão. [fraca]
- Pegou! Bateu com a força de quem desliga despertador. [fraca]
- O goleiro adivinhou! Leu o chute antes de você bater.
- Defesaça! O goleiro acordou de bom humor hoje.
- Pegou firme, encaixou no peito. Sem rebote, sem chance. [meio]
- Bateu no meio, o goleiro só ficou parado e agradeceu. [meio]
- Chute de massagem! O goleiro nem suou. [fraca]
- PEGOU! Foi no canto certo e ainda deu tchauzinho. [canto]
- Rasteiro e fraco... o goleiro buscou com calma. [fraca] [baixo]
- Faltou carinho na força, sobrou carinho pro goleiro. [fraca]
- Pegou! Dessa vez o goleiro leu tudo.
- Espalmou! Mão firme do goleiro da máquina.
- Voou e pegou lá em cima! Que defesa do goleiro! [alto]
- ⭐ Pegou! O goleiro já tá dando entrevista na beira do campo.

### `defesa` — você defendeu
- PEGOUUU! Que defesa, que reflexo!
- DEFENDEU! Fechou o gol com cadeado!
- É PAREDÃO! Aqui não passa nem pensamento!
- Pegou! Leu o pé de apoio que nem professor pega cola.
- Voou no canto! Defesa de figurinha rara! [canto]
- Espalmou! O batedor vai ter pesadelo hoje.
- A torcida {do_time} grita: {apelido}! {apelido}!
- DEFESA! Adivinhou o canto antes do batedor saber. [canto]
- Pegou com a ponta dos dedos! Que esticada! [canto]
- Defendeu e ainda olhou pro batedor com cara de "tenta de novo".
- Fechou a porta! Hoje não tem gol.
- Agarrou firme! Nem rebote deu.
- Que pulo! Parecia que tinha mola no tênis. [alto]
- Pegou! O batedor tá olhando pro céu procurando explicação.
- DEFESA! Gol cancelado na fonte.
- Paredão {do_time}! Mais 10 pra conta!
- Ficou no meio e a bola veio no colo! Leitura perfeita! [meio]
- ⭐ Pegou! O batedor vai pedir pra mudar de gol.
- Paredão! Fechou o gol com cadeado.
- Voou no canto e espalmou!

### `sofreu_gol` — você não defendeu
- Gol do batedor! Você foi pra um lado e a bola pro outro. [pulou_outro_lado]
- Entrou! Pulou bonito... no canto errado. [pulou_outro_lado]
- Gol! O pé de apoio tava apontando, viu? [dica_honesta]
- Não deu! Foi buscar no fundo da rede.
- Entrou no cantinho. Ninguém pegava essa. [canto]
- Gol! Escolheu o canto com convicção. Errado, mas com convicção. [pulou_outro_lado]
- Passou! Por um tiquinho você não chegava lá. [mesma_coluna]
- Gol! O batedor tá comemorando como se fosse final.
- Entrou! Na próxima você lê o pé de apoio, combinado? [dica_honesta]
- Entrou! Agora é devolver na próxima cobrança.
- Nem deu tempo de pular! Fica de olho na corrida do batedor. [nao_pulou]
- Gol! A bola passou antes do pulo. Fica esperto! [nao_pulou]
- Entrou no meio, enquanto o pulo foi pro canto! [meio] [pulou_outro_lado]
- ⭐ Gol! Você pulou pra um canto que nem existe. [pulou_outro_lado]

### `decisiva` — última cobrança ou defesa com a disputa em aberto
- É agora! Essa vale a semana inteira {do_time}!
- Última cobrança. Coração na boca, pé na bola. [cobranca]
- Tudo nessa! A torcida {do_time} tá roendo as unhas.
- Se pegar, a torcida explode. Se não pegar... nem quero pensar. [defesa]
- Bola na marca, coração na mão. Bate com fé! [cobranca]
- Tudo depende dessa defesa. Olho no pé de apoio! [defesa]
- Silêncio total. Até o pipoqueiro parou.
- Momento decisivo! Hora de virar lenda ou virar meme.
- Bola na marca da cal. É agora ou agora!
- Respira, torcedor!

### `maquina_fora` — o batedor da máquina errou o gol (não conta como defesa)
- Pra fora! O batedor sentiu a pressão da torcida {do_time}!
- Isolou! O batedor deles tremeu na base!
- Pra fora! Nem precisou pular, o batedor resolveu sozinho.
- Chutou no estacionamento! A torcida {do_time} agradece.
- Errou o gol! Pressão de arquibancada é outra coisa.
- ⭐ O batedor errou o gol inteiro. Alguém confere a chuteira dele.

## 4. Desempate

### `morte_subita` — o placar empatou depois das 5 de cada lado
- EMPATOU! Agora é morte súbita, quem errar primeiro chora!
- Empate em {placar}! Morte súbita, coração na mão!
- Tá igual! Agora é uma de cada, sem margem pra erro.
- Morte súbita! O pipoqueiro largou a pipoca pra assistir.
- Ninguém cedeu! Vai pra morte súbita!
- ⭐ Empatou! Até o placar pediu prorrogação de emoção.

### `par_ou_impar_escolha` — morte súbita terminou empatada; esperando o servidor
- Nem a morte súbita resolveu! Vai no par ou ímpar!
- Tá tudo igual! Escolhe: par ou ímpar?
- O narrador tá pensando no número...
- Decisão no par ou ímpar, do jeito que se decide na pelada!

### `par_ou_impar_ganhou`
- Deu {numero} na mão do narrador. Ganhou no par ou ímpar!
- PAR OU ÍMPAR É SEU! Isso que é estrela!
- Ganhou no dedo! Pelada raiz decidida com classe.
- O narrador mostrou {numero}. Vitória no detalhe!
- ⭐ Ganhou no par ou ímpar! A sorte também torce {pro_time}.

### `par_ou_impar_perdeu`
- O narrador mostrou {numero}. Perdeu no par ou ímpar!
- Perdeu no dedo! Mas os pontos vão {pro_time} do mesmo jeito.
- Par ou ímpar não perdoa! O jogo de volta tá a um toque.
- Foi no detalhe! Bora de novo que a sorte vira.
- ⭐ O narrador ganhou no par ou ímpar e tá se achando.

## 5. Frases de fim de partida

### `vitoria`
- ACABOU! Vitória com sabor de domingo!
- Venceu! A festa dessa vai {pro_time}!
- Venceu! Pode desfilar na resenha de cabeça erguida.
- Vitória! O grupo do WhatsApp precisa saber disso.
- Ganhou! O goleiro adversário pediu as contas.
- Fim de jogo! Vitória {do_time} com autoridade!
- VENCEU! Essa vai ser contada na resenha a semana toda.
- Ganhou e ganhou bonito! Manda o card antes que esqueçam.
- Vitória! A torcida {do_rival} tá vendo isso com uma cara...
- Sufoco, mas venceu! O importante é o resultado... e a zoeira.
- Venceu por {placar}! Isso é jogo de gente grande!
- ⭐ Vitória! A torcida {do_time} vai fazer até faixa.
- Ponto pro time! Vitória {do_time} na marca da cal.
- Vitória no sufoco, mas vale igual! [apertada]
- Chocolate! Que passeio na marca da cal. [passeio]

### `derrota`
- Fim de jogo. Hoje não deu, mas o jogo de volta tá a um toque.
- Perdeu! O goleiro da máquina vai se achar a semana toda.
- Derrota... Respira, bebe uma água e volta.
- Não foi dessa vez. A torcida {do_time} ainda acredita!
- Perdeu, mas os pontos vão {pro_time} do mesmo jeito!
- Isolar acontece. Bora de novo!
- Perdeu! Mas jogo bom é jogo de volta.
- Hoje a máquina ganhou. Amanhã é outro campeonato.
- Perdeu... A torcida {do_rival} não pode saber disso. Joga de novo!
- Fim! Ficou {placar}. Bora virar isso na próxima?
- ⭐ Perdeu! O goleiro da máquina já tá pedindo aumento.
- Não foi dessa vez. Bola pro centro e mais uma!

### `cinco_cobrancas` — 5 de 5 nas cobranças
- 5 DE 5! Faro de gol com carteirinha!
- Cinco cobranças, cinco gols! Isso é carimbo!
- 100% de aproveitamento! O goleiro vai pedir transferência.
- 5 de 5! Pode emoldurar esse placar.
- Cinco gols! Mais 25 {pro_time}, que tá em festa!
- Aproveitamento perfeito! Esse pé veio calibrado de fábrica.
- ⭐ 5 de 5! O goleiro desistiu e foi vender pipoca.

### `cinco_defesas` — 5 de 5 nas defesas
- 5 DEFESAS! Fechou o gol com tijolo e cimento!
- Cinco de cinco! Isso não é defesa, é muralha!
- Ninguém passou! O gol tá trancado e a chave sumiu.
- 5 de 5 debaixo da trave! O batedor vai mudar de profissão.
- Paredão completo! Mais 25 {pro_time}!
- Pegou tudo! Até pensamento ruim você defendeu.
- Cinco defesas! A torcida {do_time} já tá encomendando estátua.
- ⭐ 5 de 5! O gol pediu folga porque não teve trabalho.

## 6. Desafio (por link)

O texto que vai com o link é fixo, sem sorteio (`src/jogo/convites.ts`): "Te desafio nos pênaltis: fiz {pontos} {pro_time}. Faz mais?", e o mesmo formato nos Lances e na Prova. Por isso não existe a situação `desafio_convite`.

### Tela do convite (texto fixo, sem sorteio; `src/jogo/conviteDesafio.ts`)

A tela que o link abre antes do primeiro chute. Mesmo tom de resenha, neutra de gênero ("de {apelido}", nunca "do/da"), sem aposta.

- **Placa (rótulo):** "{apelido} te desafiou" / "Te desafiaram" (nos Lances: "… nos Lances do Jogo"). Enquanto busca: "Buscando o desafio…".
- **Pênaltis:** "{apelido} ({time}) fez {pontos} pontos, {gols} x {gols} contra a máquina." e "Você defende as cobranças de quem te desafiou e bate as suas. Quem fizer mais pontos ganha."
- **Prova:** "{apelido} ({time}): {resumo}, {pontos} pontos. Mesmas 8 perguntas, faz mais?" e "8 perguntas, 20 s cada, três erros e fora."
- **Escolha (quem é novo):** título "Por qual torcida você entra em campo?", faixas com "Encarar o desafio ›", botão "Outro time", dica "Os pontos vão pra torcida que você tocar. Dá pra trocar depois no Perfil." e o link "Já jogo em outro aparelho".
- **Quem já joga:** "Você joga pelo {time}" / "pela {time}" e o botão "Encarar o desafio".
- **Avisos no lugar da placa:** "Apitou o fim: esse desafio valia 7 dias. Bora outro!", "Esse desafio não existe mais. Bora outro!" e "Sem rede: o desafio não carregou." (com "Tentar de novo").
- **Triagem vinda do convite:** "Desafio de {apelido} nos pênaltis / nos Lances / na Prova" e "Você entra pelo {time}. {pontos} pontos pra bater."
- **Escolha do time sem convite:** "Sem cadastro: escolha o time e já entra jogando." (o apelido é só do Perfil).

### `desafio_vitoria` — você venceu quem te desafiou
- Venceu o desafio! Agora o placar fala por você.
- Desafio aceito e vencido! Manda o placar pra {desafiante}.
- Desafio aceito e vencido. Essa vai pro grupo.
- Ganhou de {desafiante}! Essa vai pro grupo com print e tudo.
- ⭐ Vitória sobre {desafiante}! O grupo inteiro precisa ver.

### `desafio_derrota` — quem te desafiou venceu
- {desafiante} venceu essa. Jogo de volta?
- Deu {desafiante} na ida. Tem jogo de volta!
- {desafiante} levou essa. Bola pro centro e jogo de volta!
- {desafiante} levou essa. Vai deixar barato?
- ⭐ {desafiante} venceu. Finge que foi o vento e manda o jogo de volta.

## 7. Provocação entre torcidas (ranking da semana)

Sempre ao time, nunca à pessoa. O rival segue a regra da seção 8 do `jogo.md`.

### `rival_atras` — seu time atrás do rival
- Sua torcida tá {dif} atrás {do_rival}. Vai deixar?
- {o_rival} tá na frente. Isso não pode ficar assim.
- Dá pra tirar {dif}? Dá. Bora.
- {o_rival} tá dormindo na frente. Hora de acordar.
- A torcida {do_rival} já tá postando print. Responde em campo.
- Atrás {do_rival}? Nessa semana? Inaceitável.

### `rival_colado` — diferença pequena (ex.: até 2 partidas boas)
- Faltam {dif} pra passar {o_rival}! Uma partida resolve.
- Tá colado! {o_rival} já tá olhando no retrovisor.
- É ponto a ponto com {o_rival}. Cada gol conta!
- Encostou! Agora é só empurrar e passar {o_rival}.

### `rival_frente` — seu time na frente
- {o_time} tá {dif} na frente {do_rival}. Mas não relaxa!
- Na frente {do_rival}! E a torcida deles não tá gostando nada.
- Defende essa vantagem como se fosse pênalti.
- {o_rival} tá {dif} atrás e a torcida deles já tá nervosa.
- {o_rival} tá virando freguês essa semana.
- Salto alto não: {o_rival} tá colado. [colado]

### `rival_passou` — seu time acabou de passar o rival
- PASSOU! {o_time} deixou {o_rival} pra trás!
- Ultrapassagem! Acena pro rival pelo retrovisor.
- {o_time} passou {o_rival}! Print obrigatório.
- Virou! {o_rival} acordou em segundo.

### `rival_passado` — o rival acabou de passar seu time
- {o_rival} passou {o_time}. Tá esperando o quê?
- Ultrapassado! A resposta começa na próxima cobrança.
- {o_rival} subiu na sua frente. Vai aceitar calado?

### `reta_final` — domingo, perto de zerar a semana
- Faltam {horas} e {o_rival} tá encostando.
- Últimas horas da semana! Cada pênalti vale ouro.
- Domingo à noite, {dif} de diferença. Hora da verdade.
- A semana tá acabando e {o_time} precisa de mais uma lenda em campo.

### `mais_braba` — "Torcida raiz": o Campeão da semana, que é por média
- {o_time} pode não ser o maior, mas é torcida raiz!
- Poucos, mas raiz! {o_time} tá em {posicao} no Campeão da semana.
- No Campeão da semana não importa tamanho. Importa vontade.
- Torcida pequena, média gigante. Respeita {o_time}!

### `campeao_semana` — card do campeão no domingo à noite
- {o_time} é campeão da semana! Pode zoar até segunda!
- Acabou a semana: {o_time} no topo! {o_rival} vai ter que ouvir.
- Campeão da semana! Segunda zera, mas o print é eterno.

## 8. Provocação entre cidades (ranking do estado)

Só posição no ranking. Ver o checklist da seção 1. Regra de preposição da seção 2.

### `cidade_atras` — sua cidade atrás da rival
- {cidade_rival} tá na frente. {cidade} vai deixar?
- Faltam {dif} pra passar {cidade_rival}. Bora!
- {cidade} tá em {posicao} no estado. Dá pra subir, e é hoje.
- {cidade_rival} já tá comemorando. Responde em campo!

### `cidade_frente` — sua cidade na frente
- {cidade} tá em {posicao} no estado! Segura essa posição.
- {cidade} na frente! {cidade_rival} tá olhando no retrovisor.
- {cidade} lidera o duelo com {cidade_rival}. Não relaxa!

### `cidade_passou` — sua cidade acabou de subir
- SUBIU! {cidade} passou {cidade_rival} no estado!
- Ultrapassagem! {cidade} agora tá em {posicao} no estado.
- {cidade} subiu de posição! Manda no grupo da cidade.

### `cidade_campea` — campeã do estado na semana
- {cidade} é campeã da semana no estado! Pode comemorar!
- Semana fechada: {cidade} no topo do estado!
- {cidade} campeã da semana! O print é eterno.

## 9. Palpite da Rodada

Mesmo checklist da seção 1, com dois cuidados a mais:
- **Nunca** as palavras proibidas da seção 7 do `jogo.md` (aposta, bet, odd, cotação, banca, bolão valendo, green, red), nem "valendo", "prêmio" ou "lucro", nem "cravar", "placar exato" ou "palpite certeiro".
- A porcentagem da torcida nunca aparece como chance de acontecer: é "como a torcida palpitou", e só depois do início do jogo.

### Variáveis e etiquetas novas

| Variável | Exemplo |
|---|---|
| `{rodada}` | 34ª |
| `{acertos}` | jogos com algum ponto na rodada (ex.: 6) |
| `{jogos}` | jogos palpitados na rodada (ex.: 9) |
| `{placar}` | o placar do palpite, com o mandante primeiro (ex.: 2 x 1) |

| Etiqueta | Verdadeira quando |
|---|---|
| `[empate]` | o jogo terminou empatado |
| `[contra]` | o palpite foi de derrota do próprio time de quem joga |

- `crava_contra_time` sai no lugar de `crava_salvo` quando o palpite é contra o próprio time.
- No resultado de cada jogo sai uma frase só: `crava_certeza_*` tem prioridade sobre as outras; frase com `[contra]` tem peso 2 quando a etiqueta vale.
- `crava_rodada_fim` sai uma vez, quando o último jogo palpitado da rodada é confirmado.

### `crava_abertura` — abre a tela da rodada
- A {rodada} rodada tá aberta! Dá seus palpites e defende {o_time}.
- Rodada nova, palpite novo. Quem acerta, zoa!
- Tá aberta a {rodada} rodada. Bora palpitar!
- Placar na cabeça, palpite na ponta do dedo. Manda aí!
- ⭐ O pipoqueiro já deu os palpites dele. Só falta você.

### `crava_salvo` — palpite salvo
- Palpite salvo! Agora é torcer.
- Palpite guardado! Até o apito, ninguém vê.
- Tá registrado. Se acertar, a resenha é sua.
- Anotado no caderninho do narrador!

### `crava_contra_time` — palpitou derrota do próprio time
- Palpite de derrota {do_time}? Coragem ou realismo?
- Palpite contra o próprio time! O narrador viu, hein.
- Torce de um lado, palpita do outro. Que frieza!
- ⭐ Palpite contra {o_time}. A torcida vai fingir que não viu.

### `crava_certeza` — marcou o jogo da certeza
- Jogo da certeza marcado! Se acertar, vale o dobro.
- Certeza absoluta? Então é dobro!
- Escolheu o jogo da certeza. Confiança de quem estudou a tabela.

### `crava_fechou` — o jogo começou e o palpite trancou
- Bola rolando, palpite trancado! Agora é com eles.
- Fechou! Olha só como a torcida palpitou nesse.
- Apito inicial: palpites lacrados.

### `crava_lembrete` — tela inicial ou notificação antes da rodada
- Faltam {horas} pro primeiro jogo da rodada. Já deu seu palpite?
- Rodada começando e seu palpite tá em branco!
- O jogo da certeza trava em {horas}. Escolhe o seu!

### `crava_exato` — acertou o placar
- NA MOSCA! {placar} certinho!
- ACERTOU EM CHEIO! Sem tirar nem pôr!
- Placar certinho! Isso é bola de cristal ou estudo?
- ACERTOU O PLACAR! Pode mandar o print!
- Acertou até a derrota {do_time}. Dói, mas pontua! [contra]
- ⭐ {placar} certinho! O narrador tá pensando em te contratar.

### `crava_saldo` — vencedor e saldo certos (ou empate com outro placar)
- Quase! Vencedor e saldo certinhos. Faltou só o placar.
- Na trave do placar! Saldo no capricho.
- Deu empate, como você disse! O placar foi outro, mas conta. [empate]
- Palpite contra e acertou o saldo. Os pontos vão {pro_time} igual! [contra]

### `crava_vencedor` — só o vencedor (ou só o empate)
- Acertou quem ganhou! O placar fica pra próxima.
- Vencedor certo! Faltou calibrar os gols.
- Foi no lado certo. Pontinhos na conta {do_time}.
- Disse empate e deu empate! Os gols é que não bateram. [empate]

### `crava_errou`
- Errou esse! O futebol não leu seu palpite.
- Passou longe! Mas tem mais jogo na rodada.
- Não deu! A bola é redonda, o palpite também.
- Esse foi pra arquibancada! Bora no próximo.
- Palpitou contra e o time te desmentiu. Bom sinal, né? [contra]
- ⭐ Errou com convicção. O narrador respeita.

### `crava_certeza_acertou` — jogo da certeza com algum ponto
- JOGO DA CERTEZA! Acertou e dobrou!
- Certeza confirmada! Pontos em dobro {pro_time}!
- Disse que era certeza, e era! Dobro na conta.

### `crava_certeza_errou` — jogo da certeza sem ponto
- Era certeza... virou dúvida. Rodada que vem tem outra!
- A certeza tropeçou! Faz parte, bora na próxima.
- Jogo da certeza não perdoa. Revanche na próxima rodada!

### `crava_rodada_fim` — resumo da rodada
- Rodada fechada: {acertos} de {jogos} com ponto. {pontos} {pro_time}!
- Fim da {rodada} rodada! {pontos} pontos na conta {do_time}.
- Rodada encerrada! Manda o card e vê quem acertou mais no grupo.
- {acertos} de {jogos}! Na próxima rodada tem revanche.
- ⭐ Fechou a rodada! O caderninho do narrador tá cheio de anotação.

## 10. Prova de Boleiro (quiz)

Cuidado extra: o narrador **nunca** fala da pessoa real da pergunta (nem elogio, nem zoeira) e nunca dá dica da resposta. Fala do degrau, do relógio e da decisão. Nada de "prêmio", "milhão" ou "valendo".

| Variável | Exemplo |
|---|---|
| `{numero}` | número da pergunta (1 a 8) |
| `{levar}` | pontos garantidos se parar agora |

Só uma frase por erro. O 3º erro não tem grito: a partida acaba e quem fala é `prova_fim`. O mesmo vale para o 2º erro na pergunta 8, sem nada pela frente.

### `prova_abertura`
- Prova de Boleiro! Oito perguntas, vinte segundos cada.
- Hora de mostrar que entende de bola, não só de grito.
- Dedo na tela e cabeça no jogo. Bora!
- ⭐ O narrador estudou a semana toda. E você?

### `prova_acertou`
- CERTA! Sabe tudo de bola!
- Na mosca! Próxima!
- Acertou! Isso é estudo ou é paixão?
- Resposta de quem não perde um jogo!
- ⭐ Acertou tão rápido que o relógio nem esquentou.

### `prova_decisao` — antes da pergunta 3 em diante
- Leva {levar} pra casa ou arrisca a próxima?
- Para agora com {levar} ou sobe mais um degrau?
- A pergunta {numero} é mais braba. Encara?
- Coragem tem limite? Decide aí!

### `prova_parou`
- Parou com {levar}! Sabedoria de quem sabe a hora de sair.
- Garantiu {levar} {pro_time}. Jogo inteligente!
- Pé no freio na hora certa. Pontos no bolso!

### `prova_errou` — 1º erro, a prova segue
- Errou, mas a prova segue! Ainda tem vida.
- Escorregou, mas não caiu! Próxima pergunta.
- Essa a bola levou. Vai pra próxima, ainda dá!
- ⭐ Errou com tanta certeza que até o narrador duvidou.

### `prova_tempo` — 1º erro, por tempo
- O tempo acabou! O relógio não perdoa.
- Pensou tanto que o apito soou!

### `prova_ultima_vida` — 2º erro, por resposta ou por tempo, com pergunta pela frente
- Última vida! A próxima pede cabeça fria.
- Mais um erro e o apito final soa. Respira!
- Tá na bacia das almas: um erro e acaba.

### `prova_ajuda` — etiqueta com a ajuda usada: `[tira_duas]`, `[arquibancada]` ou `[troca]`
- Pediu ajuda! Sem vergonha nenhuma, é estratégia.
- A arquibancada respondeu! Agora é com você. [arquibancada]
- Tirou duas! Ficou meio a meio. [tira_duas]

### `prova_perfeita` — 8 de 8
- OITO DE OITO! Sabe mais que o comentarista!
- Gabaritou! Pode emoldurar o card.
- 8 de 8! A torcida {do_time} tem um professor em campo.
- ⭐ Gabaritou! O narrador vai pedir aula particular.

### `prova_fim`
- Fim da prova: {pontos} {pro_time}!
- Prova entregue! {pontos} pontos na conta {do_time}.
- Fechou com {pontos}. Quem do grupo faz mais?
- Ponto pro time! {pontos} na conta {do_time}.

## 11. Time do Dia (desafio diário)

Cuidado extra: o narrador nunca dá dica do clube secreto nem fala o nome dele antes do fim.

| Variável | Exemplo |
|---|---|
| `{tentativas}` | tentativas usadas (1 a 6) |

### `dia_abertura`
- Tem um time escondido aí. Seis chutes pra achar!
- Time do Dia no ar! Mesmo clube pra todo mundo.
- Hoje tem charada de clube. Bora chutar?

### `dia_quase` — tentativa com 4 pistas ou mais em 🟩
- Tá quente! Muito quente!
- Encostou! Falta pouco.
- O clube secreto tá suando frio.

### `dia_longe` — tentativa sem nenhuma pista 🟩
- Frio, frio! Tenta outra região.
- Esse passou longe. Usa as pistas!
- Chute pra arquibancada! Respira e lê a grade.

### `dia_acertou_primeira`
- DE PRIMEIRA! Isso é dom ou é sorte?
- Acertou no primeiro chute! Inacreditável!
- ⭐ De primeira! O narrador quer saber o segredo.

### `dia_acertou`
- ACERTOU! Achou o time em {tentativas} tentativas!
- Na rede! {tentativas} chutes e achou.
- Achou! Agora espera o grupo tentar.
- Acertou no sufoco! Vale do mesmo jeito.

### `dia_errou`
- Não deu hoje! Amanhã tem outro time escondido.
- Seis chutes e nada! O secreto se escondeu bem.
- Hoje o time venceu. Revanche amanhã, 00h.


## 12. Lances do Jogo

Cuidado extra: o narrador **nunca** fala de quem fez o gol de verdade (nem nome, nem apelido, nem elogio): quem conta a história é a ficha do lance. O narrador fala da jogada, da barreira e do goleiro.

Nas jogadas, os Lances usam as frases da seção 3 que servem para qualquer chute: `gol`, `gol_angulo`, `cavadinha`, `cavadinha_falhou`, `trave_gol`, `trave`, `fora_cima`, `fora_lado` e `goleiro_pegou` (com as mesmas etiquetas). `abertura` e `decisiva` não entram, porque falam de pênalti. As frases abaixo são só dos Lances.

### `lance_abertura` — começo da partida de 3 lances
- Três chutes, três chances de fazer história {pro_time}!
- A história tá aí de novo. Agora a perna é sua!
- Bola parada, torcida em pé. Bora carimbar!
- ⭐ O narrador já viu esse filme. Quer ver o final de novo!

### `lance_barreira` — a bola parou na barreira
- NA BARREIRA! A parede não se mexeu.
- Bateu na barreira! Tem que passar por cima ou contornar.
- A barreira ficou com a bola. Próximo lance!
- Parou no muro! Mais curva ou mais altura da próxima.
- ⭐ A barreira agradece o presente. Mas não era pra ela!

### `lance_recriou` — carimbou o lance: gol no mesmo canto do lance de verdade
- IGUALZINHO! Carimbou o lance do jeito que a história conta!
- No mesmo canto da história! Isso é aula!
- Carimbou o lance! A torcida {do_time} jura que é replay!
- ⭐ Igual ao original! Já pode pedir a placa.
- ⭐ Igualzinho à história! Isso vai pro grupo!

### `lance_fim` — fim da partida de 3 lances
- Fim dos lances: {pontos} {pro_time}!
- Três chutes, {pontos} pontos na conta {do_time}.
- Fechou com {pontos}! Escolhe o próximo e vai de novo.
- Acabou a sessão de história! {pontos} pontos no placar.

## 13. Aviso de domingo (push)

Só informa (docs/jogo.md, seção 13). Texto em `src/jogo/avisos.ts`, não neste banco: o `npm run frases` não lê esta seção. Passa pelo checklist da seção 1, com um cuidado a mais: **nada de contagem de horas, "vai deixar?", convite para jogar ou qualquer pressão para voltar**. As frases de `reta_final` (seção 7) nunca viram push.

Título: Sua torcida na semana

- {O_time} tá em {posicao} na semana, {dif} atrás {do_rival}.
- {O_time} tá em {posicao} na semana, {dif} na frente {do_rival}.
- {O_time} tá em {posicao} na semana, no empate com {o_rival}.
- {O_time} tá em {posicao} na semana. (sem rival com pontos)
- {O_time} ainda não pontuou nesta semana.
- O placar da semana tá atualizado no jogo. ("Outro time")

## 14. Aquecimento

Gritos curtos das 5 estações do aquecimento (docs/jogo.md, seção 14.4), um por estação, acertando ou não. Texto em `src/jogo/aquecimento.ts` (`GRITO_ACERTOU`, `GRITO_ERROU`), não neste banco: o `npm run frases` não lê esta seção. Na Prova e no Palpite, sem "valendo" (seções 9 e 10).

| Estação | Acertou | Errou |
|---|---|---|
| Pênalti | É GOL! No jogo valendo, isso é ponto. · Na rede! Tá aquecido esse pé. | Quase! No jogo valendo você acerta. · Passou perto! Aquecimento é pra isso. |
| Defesa | PEGOU! Leu o pé e foi buscar. · Defesa! O gol tá trancado hoje. | Quase! No jogo valendo você pega. · Foi no outro canto! Agora você já sabe. |
| Falta | Por cima da barreira! Que cobrança. · Passou da barreira e foi pra rede! | Quase! No jogo valendo você acerta. · A barreira ganhou essa. A próxima é sua. |
| Prova | Na mosca! Começou bem a prova. · Certinha! Tem cabeça de boleiro. | Quase! Na Prova de verdade você acerta. · Essa escapou! A próxima você crava. |
| Palpite | Palpite salvo! Esse vale de verdade. · Palpite feito! Agora é torcer. | (sempre comemora como acerto) |

Fim: "Aquecido! Agora vale ponto {pro_time}" (sem time oficial: "Aquecido! Agora vale ponto de verdade").

## 15. Galeria de Troféus

Uma frase na ficha de cada troféu (`docs/jogo.md`, seção 5, "Telas aprovadas em 05/11/2026"). Texto em `src/narrador/galeria.ts`, não neste banco: o `npm run frases` não lê esta seção. Passa pelo checklist da seção 1, com três cuidados a mais:
- **Nada de urgência nem de voltar:** sem "volte", "amanhã", "não perde", contagem de tempo ou sequência de semanas (seção 13 do `jogo.md`). O troféu já foi ganho; a frase só comemora.
- **Nenhum adjetivo concorda com o time:** "{o_time} é campeão" sairia "A Chapecoense é campeão". As frases falam da taça, da flâmula e da semana.
- **Vitrine não é título:** a Maior torcida comemora o barulho, nunca "título" ou "campeão".
Variáveis: `{o_time}`, `{do_time}`, `{pro_time}`. Até 75 caracteres com qualquer time (teste em `src/jogo/galeria.test.ts`). O rebaixamento não tem ficha nem frase: ele só aparece na linha neutra de sobe e desce.

### Flâmula da semana (`campeao_semana`)
- Semana fechada e a flâmula ficou com {o_time}. Tá pendurada!
- Média dos 30 lá em cima: essa semana foi {do_time}.
- Flâmula na parede! Na média, ninguém segurou {o_time}.
- {o_time} levou a semana. O resto da tabela que lute.

### Megafone da vitrine (`maior_torcida`)
- Arquibancada lotada! Ninguém somou mais que {o_time}.
- Megafone na vitrine: o barulho da semana foi {do_time}.
- Não é título, mas que barulho! Muita gente jogando {pro_time}.

### Taça da Série A do mês (`campeao_temporada`)
- Mês inteiro somando, e a taça foi pra estante {do_time}!
- A Série A do mês ficou com {o_time}. Taça na estante!
- Taça da temporada! Semana a semana, {o_time} somou mais.

### Taça da Série B do mês (`campeao_serie_b`)
- A Série B do mês ficou com {o_time}. Taça na estante!
- Taça da Série B {pro_time}! Mês bem jogado.
- {o_time} fez o mês na Série B e levou a taça.

### Taça com estrela do mês de estreia (`campeao_estreia`)
- Primeira taça da história do jogo: {o_time} estreou com estrela!
- Estreia com taça! Essa estrela ninguém tira {do_time}.
- O primeiro mês do jogo ficou com {o_time}. Pra sempre na Galeria.

### Subiu pra Série A (`acesso`)
- Subiu! {o_time} carimbou o passaporte pra Série A.
- Acesso na conta! No mês que vem, {o_time} tá na Série A.
- Da Série B pra Série A: {o_time} fez a subida no braço.

## 16. Divisões (Série A e Série B)

Frases do bloco das divisões da Home (durante o mês) e da placa e do card do fim do mês (`docs/jogo.md`, seção 5, "Telas do resto das divisões"). Decididas pelo Kauê em 06/11/2026. Texto em `src/narrador/temporada.ts`, não neste banco: o `npm run frases` não lê esta seção. Passa pelo checklist da seção 1 e pelos três cuidados da seção 15 (sem urgência, nenhum adjetivo concorda com o time, até 75 caracteres depois da troca com qualquer time; teste em `src/jogo/temporadaDivisoes.test.ts`).

Variáveis: `{o_time}`, `{do_time}`, `{pro_time}`, `{serie}` ("Série A", "Série B" ou "série única"), `{dif}` (distância para o 8º, "3 pontos"), `{mes}` (o mês seguinte, "janeiro") e `{o_rival}` (o clássico da tabela). Frase que pede variável que não veio fica de fora do sorteio (ex.: `{dif}` com empate em pontos).

**Qual situação na Home:** 1º da série (ou da série única) é `temporada_lider`; 2º da Série B, e do 2º ao 10º na série única, `temporada_acesso`; 9º e 10º da Série A, `temporada_queda`; o resto, `temporada_meio`. Sem semana travada no mês, não há frase.

**No fim do mês:** a frase sai do destino do time. A zoeira com o rival (`temporada_rival_caiu`) só entra quando o meu time ficou na série (fica na A ou na B) e o clássico da tabela caiu: em festa, a frase é da festa; na queda, nunca. O Campeão da estreia usa as frases da taça com estrela (seção 15). "Escapou!" só sai para quem terminou em 7º ou 8º da Série A (perto da zona); do 2º ao 6º, a outra frase de `temporada_fica_a` (revisão de 07/11/2026).

### Na Home, durante o mês

#### `temporada_lider`
- {o_time} na ponta da {serie}. A tabela tá com cara de taça.
- Líder! O resto da {serie} tá olhando de baixo.
- Lá em cima e confortável. Por enquanto.

#### `temporada_acesso`
- {o_time} tá na zona de acesso. A Série A já tá de olho.
- Por enquanto, sobe. Lugar bom esse.
- Na zona de acesso. O elevador tá parado no andar certo.

#### `temporada_queda`
- {o_time} tá na zona. Zona de queda não é endereço fixo.
- Na zona por {dif}. Uma semana boa resolve.
- A tabela tá apertada lá embaixo. Dá pra sair.

#### `temporada_meio`
- {o_time} no meio da tabela. Nem festa, nem susto.
- Meio de tabela: dá pra sonhar com o topo.

### No fim do mês (placa e card)

#### `temporada_campeao`
- Taça da temporada {pro_time}! O mês tem dono.
- Taça na estante! Pode pendurar a faixa no grupo.
- A Série A do mês ficou com {o_time}. Ninguém segurou.

#### `temporada_campeao_b`
- Taça da Série B e malas prontas pra A!
- Levou a B com sobra. A Série A que se prepare.

#### `temporada_subiu`
- Subiu! A Série B ficou pequena {pro_time}.
- Acesso confirmado! {o_time} vai pra Série A.
- Elevador pra cima! Próximo andar: Série A.

#### `temporada_fica_a`
- {o_time} fica na Série A. Missão cumprida.
- Escapou! Série A de novo no mês que vem.

#### `temporada_fica_b`
- {o_time} fica na Série B. O acesso ficou pra próxima.
- Mais um mês de Série B. De lá sobem dois.

#### `temporada_caiu`
- Caiu. Em {mes} é Série B, e de lá sobem dois.
- Desceu um andar. A volta tá na tabela do mês que vem.
- Caiu, mas os pontos {do_time} contam igual na B.

#### `temporada_unica_a`
- {o_time} começa {mes} na Série A!
- Top 10! {o_time} vai pra Série A em {mes}.

#### `temporada_unica_b`
- {o_time} começa {mes} na Série B. De lá sobem dois.
- Série B em {mes}. Lugar de quem quer subir.

#### `temporada_rival_caiu` (meu time ficou na série e o rival, o clássico da tabela, caiu)
- {o_rival} caiu pra Série B. A torcida {do_time} agradece.
- {o_rival} desceu um andar. Print obrigatório.
