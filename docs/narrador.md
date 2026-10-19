# Banco do narrador — "Bate Contra Mim" (pênaltis)

> Versão 1.1 · 18/10/2026 · Fonte das frases do narrador e das provocações entre torcidas e cidades.
> Frase nova entra aqui e passa pelo checklist de tom abaixo.
> Mudanças da 1.1: frases neutras de gênero, desempate (morte súbita e par ou ímpar) no lugar do empate, provocação entre cidades.

## 1. Checklist de tom (vale para toda frase nova)

- Zoa o **lance, a bola, a situação e o time**. Nunca a pessoa.
- **Neutra de gênero:** fala do lance, não de quem joga. "Cavou!", não "Ele cavou!". Nada de "artilheiro", "herói", "representante" ou "goleiro" se referindo a quem está jogando.
- Nada sobre raça, orientação, gênero, religião, origem, corpo, deficiência ou saúde.
- Nada de pessoa real: jogador, técnico, narrador, comentarista. Nada de bordão famoso de narrador real nem trecho de música.
- **Classificação livre:** sem palavrão, bebida, aposta ou violência. Escolas entram na fase 2.
- Sem nome de clube escrito na frase: só as variáveis de time.
- **Cidades:** só posição no ranking. Nada de sotaque, origem, economia, tamanho da cidade ou estereótipo de quem mora lá.
- Derrota zoa, mas sempre aponta a saída (revanche, "os pontos contam igual").

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
| `{desafiante}` | apelido de quem mandou o desafio | |
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
- GOOOL! Bola de um lado, goleiro do outro!
- É REDE! Mandou o goleiro buscar lá dentro!
- GOL! Deslocou o goleiro, que foi comprar pão do outro lado.
- Entrouuu! Frio que nem picolé de limão!
- GOL! O goleiro só viu o vulto.
- É GOL! Bateu com a calma de quem tá na fila do banco.
- GOOOL! Balançou a rede e o coração da torcida {do_time}!
- Lá dentro! O goleiro escolheu o canto errado com muita convicção.
- GOL! Simples, seco, sem conversa.
- Estufou a rede! Pode mandar o print pro grupo!
- GOL! O goleiro pulou pra foto, mas a bola não quis posar.
- GOL! Mais dez pontinhos na conta {do_time}!
- Pá, pum, rede! Próximo!
- GOL! Bateu tão tranquilo que parecia treino de quarta.
- Entrou rasteirinha, de mansinho, pedindo licença.
- GOOOL! A torcida {do_time} solta o grito preso na garganta!
- ⭐ GOL! O goleiro tá até agora procurando a bola no bolso.

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
- Bateu no travessão! O barulho foi de dar dó.
- NA TRAVE! A rede ficou só na vontade.
- ⭐ Trave! A trave tá jogando no time adversário hoje.

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

### `fora_lado` — pra fora pelo lado
- Pra fora! Pegou o caminho do estacionamento.
- Passou raspando! O goleiro nem precisou se mexer.
- Fora! Errou o gol, que é desse tamanho!
- Pela linha de fundo! A bola tava com pressa de ir embora.
- Tirou demais! Cantinho bom, gol errado.
- Pra fora, e a torcida {do_time} pôs a mão na cabeça.
- Pra fora! O poste agradece, nem teve trabalho.
- ⭐ Fora! A bola foi ver se tinha lanche na saída.

### `goleiro_pegou` — o goleiro da máquina defendeu sua cobrança
- Pegou! O goleiro tava com o almoço pago!
- DEFENDEU! Chutou fraquinho, entregou na mão.
- Pegou! Bateu com a força de quem desliga despertador.
- O goleiro adivinhou! Leu o chute como quem lê manchete.
- Defesaça! O goleiro acordou de bom humor hoje.
- Pegou firme, encaixou no peito. Sem rebote, sem chance.
- Bateu no meio, o goleiro só ficou parado e agradeceu.
- Chute de massagem! O goleiro nem suou.
- PEGOU! Foi no canto certo e ainda deu tchauzinho.
- Rasteiro e fraco... o goleiro buscou com calma.
- Faltou carinho na força, sobrou carinho pro goleiro.
- ⭐ Pegou! O goleiro já tá dando entrevista na beira do campo.

### `defesa` — você defendeu
- PEGOUUU! Que defesa, que reflexo!
- DEFENDEU! Fechou o gol com cadeado!
- É PAREDÃO! Aqui não passa nem pensamento!
- Pegou! Leu o pé de apoio que nem professor pega cola.
- Voou no canto! Defesa de capa de jornal!
- Espalmou! O batedor vai ter pesadelo hoje.
- A torcida {do_time} grita: {apelido}! {apelido}!
- DEFESA! Adivinhou o canto antes do batedor saber.
- Pegou com a ponta dos dedos! Que esticada!
- Defendeu e ainda olhou pro batedor com cara de "tenta de novo".
- Fechou a porta! Hoje não tem gol.
- Agarrou firme! Nem rebote deu.
- Que pulo! Parecia que tinha mola no tênis.
- Pegou! O batedor tá olhando pro céu procurando explicação.
- DEFESA! Gol cancelado na fonte.
- Paredão {do_time}! Mais 10 pra conta!
- ⭐ Pegou! O batedor vai pedir pra mudar de gol.

### `sofreu_gol` — você não defendeu
- Gol do batedor! Você foi pra um lado e a bola pro outro.
- Entrou! Pulou bonito... no canto errado.
- Gol! O pé de apoio tava apontando, viu?
- Não deu! Foi buscar no fundo da rede.
- Entrou no cantinho. Ninguém pegava essa.
- Gol! Escolheu o canto com convicção. Errado, mas com convicção.
- Passou! Por um tiquinho você não chegava lá.
- Gol! O batedor tá comemorando como se fosse final.
- Entrou! Na próxima você lê o pé de apoio, combinado?
- ⭐ Gol! Você pulou pra um canto que nem existe.

### `decisiva` — última cobrança ou defesa com a disputa em aberto
- É agora! Essa vale a semana inteira {do_time}!
- Última cobrança. Coração na boca, pé na bola.
- Tudo nessa! A torcida {do_time} tá roendo as unhas.
- Se pegar, ganha. Se não pegar... nem quero pensar.
- Silêncio total. Até o pipoqueiro parou.
- Momento decisivo! Hora de virar lenda ou virar meme.

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
- Par ou ímpar não perdoa! Revanche tá a um toque.
- Foi no detalhe! Bora de novo que a sorte vira.
- ⭐ O narrador ganhou no par ou ímpar e tá se achando.

## 5. Frases de fim de partida

### `vitoria`
- ACABOU! Vitória com sabor de domingo!
- Venceu! E mais 20 {pro_time}!
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

### `derrota`
- Fim de jogo. Hoje não deu, mas a revanche tá a um toque.
- Perdeu! O goleiro da máquina vai se achar a semana toda.
- Derrota... Respira, bebe uma água e volta.
- Não foi dessa vez. A torcida {do_time} ainda acredita!
- Perdeu, mas os pontos vão {pro_time} do mesmo jeito!
- Quem nunca isolou um pênalti que atire a primeira bola.
- Perdeu! Treino é treino, jogo é jogo, e revanche é agora.
- Hoje a máquina ganhou. Amanhã é outro campeonato.
- Perdeu... A torcida {do_rival} não pode saber disso. Joga de novo!
- Fim! Ficou {placar}. Bora virar isso na próxima?
- ⭐ Perdeu! O goleiro da máquina já tá pedindo aumento.

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

## 6. Desafio por link

### `desafio_convite` — texto que acompanha o link
- Duvido você me vencer! Fiz {pontos} {pro_time}.
- Bati 5 pênaltis e defendi 5. Sua vez, se tiver coragem.
- {apelido} te desafiou: {pontos} pontos {pro_time}. Aguenta?
- Pega meus pênaltis, se for capaz.
- Fiz {pontos} {pro_time}. Vem me parar.

### `desafio_vitoria` — você venceu quem desafiou
- Venceu o desafio! {desafiante} duvidou e agora vai ter que respeitar.
- Desafio aceito e vencido! Manda o placar pra {desafiante}.
- {desafiante} achou que ia ser fácil. Achou.
- Ganhou de {desafiante}! Essa vai pro grupo com print e tudo.
- ⭐ Vitória sobre {desafiante}! O grupo inteiro precisa ver.

### `desafio_derrota` — quem desafiou venceu
- {desafiante} venceu essa. Revanche? O link tá aqui.
- Perdeu pra {desafiante}! Agora é você que manda o "duvido".
- Deu {desafiante}. Bora devolver o desafio?
- {desafiante} levou essa. Vai deixar barato?
- ⭐ {desafiante} venceu. Finge que foi o vento e manda a revanche.

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

### `mais_braba` — ranking "Torcida mais braba"
- {o_time} pode não ser o maior, mas é torcida braba!
- Poucos, mas brabos! {o_time} tá em {posicao} no Mais Braba.
- No Mais Braba não importa tamanho. Importa vontade.
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
