# Rankings, temporadas, cidades e longo prazo

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

## Regra

### Os quatro relógios (horário de Brasília)
| Relógio | Zera | O que decide |
|---|---|---|
| **Dia** | 00h | Craque do Dia (individual) |
| **Semana** | Segunda 00h | Campeão da semana, Maior torcida da semana, cidades e estados |
| **Temporada** | Todo mês (4 ou 5 semanas fechadas) | Série A e Série B das torcidas: campeão, acesso e rebaixamento |
| **Longo prazo** | Não zera | Ranking de 52 semanas, Galeria de Troféus, Tabela de todos os tempos, Carreira |

Uma partida começada antes da virada conta na semana antiga se terminar até 00h05.

### A semana
| Troféu | Conta | Vale pontos de campeonato? |
|---|---|---|
| **Campeão da semana** | Média dos **30 melhores torcedores** da semana | Sim |
| **Maior torcida da semana** | Soma de todo mundo | Não, é vitrine |

- Torcida com menos de 30 torcedores ativos: as vagas vazias contam como **80% da média geral da semana**. Torcida sem ninguém jogando fica com 0; a torcida emprestada só completa time que já tem gente jogando.
- **Pontos de campeonato** pela posição na divisão, estilo Fórmula 1: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1.
- **Teto diário:** o dia de cada jogador vale as **3 melhores partidas de Lances** (pênaltis, faltas e cara a cara juntos, até 3 × 150; limite de 10 partidas de Lances valendo por dia) e as **3 melhores da Prova** (até 3 × 150). Time do Dia (uma vez por dia) e Palpite da Rodada (teto próprio de 300 por rodada, `jogos/crava.md`) ficam por fora. A regra sai do **dia** em que a partida conta: um dia antigo, mesmo refeito depois (suspeita liberada), segue a regra dele. Detalhes dos Lances: `jogos/lances.md`.
- **A tabela mexe em até 1 minuto:** o servidor refaz o ranking a cada minuto, com a mesma conta. A tela de resultado mostra "Subiu de 5º pra 3º" quando chega a tabela calculada depois da partida; se nada mudar em cerca de 1 minuto, fica "Tá no placar da semana".
- **Mudança de regra de pontos entra numa segunda 0h** (virada de semana), para uma semana nunca ter duas regras.
- Empate no ranking: fica na frente quem chegou primeiro àquela pontuação.

### Sua posição e recorde pessoal
- Sem ranking público com apelido, cada pessoa vê **só a própria posição** entre todos os torcedores (de qualquer time), calculada no servidor:
  - **Na semana, geral:** "Você é o 3º de 14 torcedores na semana" (soma do que conta no ranking: o teto diário + Time do Dia + Palpite da Rodada).
  - **Por minigame, na semana:** pela **melhor partida** da semana (Lances do Jogo, Prova de Boleiro), pelos pontos do dia (Time do Dia) e pelos pontos da rodada (Palpite da Rodada). "Lances" junta pênaltis, faltas e cara a cara.
  - Empate: fica na frente quem chegou primeiro.
- **Recorde pessoal** de cada minigame (zera junto com a pré-temporada): aparece no resultado ("NOVO RECORDE!") e entra no card quando for recorde.
- Onde aparece: Home (posição geral da semana) e tela de resultado de cada minigame.
- Nunca mostra a lista de outras pessoas nem apelidos. Lista com apelido só com ligas entre amigos e moderação (fase 2).

### Pré-temporada
- Até o zerar, **todos os minigames somam** no ranking da semana (cada um no seu teto), sem amistoso nem ensaio. As telas mostram o aviso único: **"Pré-temporada: tudo vale ponto, mas zera antes do lançamento."**
- Os números da pré-temporada são o parâmetro de calibragem (balanço, abaixo).
- Tudo zera antes do lançamento público: ranking, temporadas de teste, recordes e 52 semanas de teste. **Nunca zera:** Carreira e medalhas.

### A temporada
- Os 20 times oficiais ficam em **Série A (10)** e **Série B (10)**. "Outro time" não entra em divisão.
- Soma dos pontos de campeonato das semanas do mês. No fim: **2 últimos da A caem, 2 primeiros da B sobem**. O campeão da Série A é o campeão da temporada.
- **A semana é do mês da sua segunda-feira** (30/11 a 6/12 é de novembro). Dezembro e janeiro seguem normais; a Copa de Verão corre em paralelo.
- **Mês de estreia em série única:** o primeiro mês depois do zerar tem os 20 times juntos, com pontos pela tabela de 20 posições (em Longo prazo). Do 1º ao 10º vão para a Série A; o 1º ganha o troféu **"Campeão da estreia"**. A primeira queda é no 2º mês.
- **Teste na pré-temporada:** novembro em série única e Série A e B em dezembro, sem troféu, tudo zera junto com a pré-temporada.
- **Torcida sem ninguém jogando** na semana (`ativos` 0): 0 ponto de campeonato e nenhuma vitória, mesmo que o desempate a deixe em 3º; a posição dela segue valendo para o desempate pela última semana. Vale também nas 52 semanas. Empate entre elas: posição na semana anterior (na 1ª, ordem da tabela). Empate no fim do mês: mais vitórias de semana; depois, melhor última semana.
- **Posição dentro da série:** nas divisões, o 1º da Série B na semana é o mais bem colocado entre os 10 dela, e vitória de semana é ser o 1º da própria série.
- Precisa do **fechamento da semana** (abaixo).

#### Telas da temporada
- **Aba Temporada** na Tabela, ao lado da Semana: mês mais recente da tabela `temporada` (nunca o relógio do celular), selo da pré-temporada ("Teste das divisões: sem troféu"), quantas semanas do mês já travaram, uma frase sobre o seu time e a tabela com posição, pontos de campeonato e vitórias de semana. Série única: linha "Daqui pra cima, Série A em {mês}" depois do 10º. Séries A e B: sub-abas, abrindo na do seu time, com faixa verde nos 2 que sobem da B e vermelha nos 2 que caem da A. Mês fechado: selo de destino em cada time (Subiu, Caiu, Fica, Série A, Série B), e a sub-aba "Mês passado" quando há mês anterior. Sem semana travada no mês, a posição vira "–", a ordem é alfabética e a tela diz quando a primeira trava.
- **Bloco das divisões na Home**, logo abaixo do cabo de guerra, só para os 20 times (Outro time não vê); tocar abre Tabela > Temporada. Posição grande ("8º"), "Na Série A · dezembro", "4 pts acima da zona · 2 de 4 semanas" e, embaixo, "Se a semana fechasse agora: 4º na série esta semana, +12 · subia pro 6º", com seta verde (sobe) ou vermelha (desce). É informação, não contagem regressiva. A altura fica reservada desde a abertura, para a leitura atrasada não empurrar o "Jogar agora". A frase do mês vai no adesivo do cabo de guerra quando o time é líder, está no acesso ou na zona de queda (ou o duelo não tem frase); a virada sobre o rival ("passou"/"foi passado") fica com a frase do duelo. Em 360×740 o "Jogar agora" fica abaixo da dobra, e isso foi aceito.
  - **Textos por situação:** líder "1º na Série A · 6 pts à frente"; zona de queda (9º e 10º da A) "9º na Série A · na zona, 3 pts do 8º"; zona de acesso "2º na Série B · na zona de acesso"; fora das zonas na B "5º na Série B · 4 pts do acesso"; meio da A "8º na Série A · 4 pts acima da zona"; série única "12º · 3 pts da última vaga da Série A" ou "6º · por enquanto vai pra Série A"; sem semana travada "Série A de dezembro · a 1ª semana trava segunda, 12h". Empate em pontos não vira "0 pts": "na ponta no desempate", "acima da zona no desempate", "com os pontos do 8º". Pré-temporada: só o selo único.
  - **Projeção:** a posição de agora é a ordem do time entre os da série pela posição geral do ranking ao vivo; vale os pontos de campeonato da tabela da temporada (0 e nenhuma vitória se ninguém do time jogou), soma-se à tabela do mês e reordena com o desempate do mês, em que a semana de agora vira a "última semana". Só aparece quando a segunda da semana é do mês aberto e o ranking da semana tem linhas. Time fora do ranking ao vivo mantém a última semana que tinha. Sem semana travada, sai sem o "subia/descia". Bloco e placa releem a tabela depois de 10 min. Limite conhecido: na segunda de manhã, a semana que acabou ainda é provisória e não está na tabela do mês até as 12h.
  - **Frase do narrador** (adesivo pequeno): 1º é `temporada_lider`; 2º da B e do 2º ao 10º da série única, `temporada_acesso`; 9º e 10º da A, `temporada_queda`; o resto, `temporada_meio`. Frases na seção 16 do `docs/narrador.md`.
- **Placa de fim do mês na Home:** uma vez por mês por aparelho, a partir do fechamento (a segunda em que a última semana do mês trava, depois das 12h01), por até 21 dias, no lugar da placa "Troféu novo" (abaixo do "Jogar agora"). Some quando a pessoa toca num botão ou na abertura seguinte depois de vista.
  - "Fim de dezembro · temporada fechada", emblema desenhado (seta verde para cima; cinza para baixo; traço cinza para quem fica), o destino em Anton ("SUBIU PRA SÉRIE A", "CAMPEÃO DA TEMPORADA", "CAMPEÃO DA SÉRIE B", "FICA NA SÉRIE A", "FICA NA SÉRIE B", "CAIU PRA SÉRIE B"; no mês de série única "VAI PRA SÉRIE A" / "COMEÇA NA SÉRIE B"; no mês de estreia de verdade, o 1º ganha "CAMPEÃO DA ESTREIA"), a linha "O Cruzeiro terminou em 2º na Série B · 61 pts · 2 vitórias de semana", a frase do narrador em adesivo claro e os botões "Ver a tabela" (escuro) e "Mandar no grupo" (claro), do mesmo tamanho.
  - Papel picado e vibração só em campeão, campeão da B, subiu, "vai pra Série A" e Campeão da estreia, respeitando movimento reduzido e o botão Vibração. Fica e caiu: placa neutra, sem festa. Pré-temporada: selo "Teste das divisões", sem troféu.
  - **Uma placa só com a Galeria:** campeão da temporada, campeão da B, acesso e Campeão da estreia saem por esta placa (com "Ver na Galeria" no lugar de "Ver a tabela" quando houver troféu) e ficam marcados como anunciados. A "Troféu novo" fica com o campeão da semana e a Maior torcida. Se as duas teriam algo na mesma abertura, a do mês aparece e a "Troféu novo" espera.
  - **Zoeira com o rival:** se o meu time ficou na série e o clássico da tabela caiu, a frase é a `temporada_rival_caiu`. Em festa, a frase é da festa; na queda, nunca.
- **Card de fim de temporada** (tipo "temporada" da tela SEU CARD, `jogos/cards.md`; Telão, Só o placar e Pôster; Stories e Quadrado): aberto pelo "Mandar no grupo" da placa e pelo botão "Card do mês" na aba Temporada quando o mês está fechado. Telão: "FIM DE DEZEMBRO", a arquibancada do time, o pedaço da tabela final em volta do seu time (tracejado verde "sobem" ou vermelho "caem"), o selo inclinado ("SUBIU!", CAMPEÃO, FICOU, CAIU, SÉRIE A!, SÉRIE B), a faixa de placar, 3 números (posição, pontos e vitórias de semana), a frase e "<apelido> tava na arquibancada" (só se a pessoa somou no mês). Pôster: o selo do destino na placa. Quadradinhos: "Placar em emoji" vira "Tabela final"; "Link do desafio" vira "Link do jogo".
  - **Texto de compartilhar** (emoji antigo, link em linha à parte): "⬆️ Cruzeiro subiu pra Série A no Guerra de Torcidas! Eu tava na arquibancada." / "🏆 Cruzeiro campeão da temporada no Guerra de Torcidas!" / "⬇️ Cruzeiro caiu pra Série B. Em janeiro tem volta." (na queda, nunca a linha da arquibancada; "Eu tava na arquibancada." só para quem somou no mês).
  - **"Somou no mês":** soma da `minha_posicao_semana` das semanas do mês, lida só no toque. Quem trocou de time no meio do mês vê o total de todos os times.

### Fechamento da semana
- O servidor grava a classificação de cada semana na tabela `fechamento_semana`, em **duas etapas**: **segunda 00h05** como provisória; **segunda 12h** grava de novo e trava. Daí em diante não muda mais.
- **Por que duas etapas:** jogo de domingo à noite só tem placar confirmado depois da virada, e o Palpite da Rodada soma na semana do jogo até segunda 12h. A tela mostra a semana como "provisória" até as 12h.
- **É cópia do ranking:** a conta continua em `ranking_semana` (teto, suspeitas, `pontos_apagados` e vagas a 80%). A tabela nova guarda só torcidas, com leitura pública: nenhum dado de jogador.
- **A cópia trava a semana:** o fechamento pega a mesma trava da rotina do minuto antes de copiar, para ela não regravar `ranking_semana` depois da cópia.
- **Semana travada não reabre:** nem o fechamento nem `ranking_semana` mudam. Ponto do Palpite da Rodada que chegar depois vai para a semana atual. Suspeita liberada depois volta só para a pessoa.
- **Semana sem ninguém jogando** também fecha, com os 20 times zerados, para a sequência de semanas não ter buraco.
- **Cron perdido:** o cron diário das 00h15 fecha o que tiver ficado para trás.
- Base da Série única, da Série A e B, da Galeria e das 52 semanas.

### Cidades e estados
- **Cidade (a segunda camisa):** opcional, escolhida numa **lista fechada de municípios do IBGE** (nome + UF), com busca; nada de texto livre. Os pontos de cada partida contam **para o time, para a cidade e para o estado da cidade**, em rankings separados; pontos feitos antes de escolher a cidade não contam para ela. A escolha fica também no Perfil.
- **Quando pedir:** o convite "Defende sua cidade também?" aparece no resultado da 1ª partida de qualquer jogo, uma vez por aparelho (não na escolha do time). Quem tocar em "Agora não" vê o lembrete na Home, no máximo 1 vez por semana (vale também para quem já jogava antes). A linha da cidade está na Política de Privacidade.
- **Mínimo de 5 jogadores:** cidade e estado só aparecem no ranking com 5 ou mais jogadores na semana, para ninguém ser identificado pela pontuação. Abaixo disso, os pontos da cidade contam só para o estado (e o estado, com menos de 5, não aparece), e o jogo avisa quantos faltam ("Faltam 2 pra sua cidade entrar no ranking. Chama a galera.").
- **Conta:** mesma da semana, média das 30 melhores pessoas da cidade (100 no estado), com vagas a 80% da média geral de quem somou para alguma cidade na semana, inclusive quem é de "Outro time".
- **"Outro time"** joga só pela cidade e pelo estado. Na Home dele, sem cidade: "Escolha sua cidade: é ela que joga por você no ranking." com o botão "Escolher minha cidade" (sempre que a Home abre, sem o limite semanal); com cidade, o bloco da cidade, que já diz a situação ("Faltam 2 pra sua cidade entrar no ranking. Chama a galera." ou a posição), sobe para o lugar dela. Não existe nota de exclusão do ranking das torcidas.
- **Depois de escolher a cidade** (Home, Perfil, resultado ou ranking de Cidades) a pessoa **volta para a tela de onde veio** (sem tela de origem, o Perfil), com um aviso no pé que some em 4 s: quem tem time vê "<Cidade> é sua segunda camisa."; quem joga por "Outro time" vê "<Cidade> joga por você no ranking.". "Tirar" a cidade volta sem aviso.
- A cidade **nunca aparece ao lado do apelido**: só somada, nos rankings de cidades e estados (privacidade, inclusive de menores).
- **Rival da cidade:** a cidade logo acima no ranking do seu estado (ou logo abaixo, se for a líder). **Rival sem clássico** (time): o time logo acima no ranking geral (ou logo abaixo, se for o líder).
- **Telas:** aba **Cidades** na Tabela (seu estado, top nacional com as 20 primeiras, estados, campeãs); na Home, "Sua cidade está em 3º em SP". Ranking de cidades **por estado**, mais um top nacional. A campeã do estado na semana ganha troféu na Galeria.
- **Junção de contas pelo código do torcedor:** fica a cidade de quem gerou o código; os pontos da outra conta ficam na cidade onde foram feitos.

### Longo prazo
- **Ranking de 52 semanas** (estilo tênis): soma das últimas 52 semanas, **pela posição no ranking geral dos 20 times**, não pelos pontos da divisão (senão o 1º da Série B valeria o mesmo que o 1º da A). Tabela de 20 posições (também usada no mês de estreia): 1º 25, 2º 20, 3º 17, 4º 15, 5º 14, do 6º ao 18º de 13 a 1 (um a menos por posição), 19º e 20º 0. Semana com a torcida sem ninguém jogando vale 0.
- **Galeria de Troféus** eterna: campeão da semana, campeão da temporada, campeão da B, acesso, rebaixamento, Campeão da estreia, campeã de estado; a Maior torcida numa prateleira à parte, "vitrine". Fica na **aba Conquistas** (junto das medalhas), não na Casa do [time], para troféu do jogo não parecer título real. Dérbi e meta coletiva ainda não existem.
  - **Campeão da semana com Série A e B:** o 1º de cada série, como a vitória de semana da temporada: "Campeão da semana" (Série A) e "Campeão da semana da Série B". Em mês de série única, o 1º geral.
  - **Campeã de estado:** a **cidade** 1ª do seu estado na semana (só cidades com 5+ jogadores). É troféu de cidade, não de torcida, e fica numa lista própria.
  - **A pré-temporada não entra.** Depois do zerar, tudo vale: as semanas entre o zerar e a estreia, inclusive a do zerar, já dão troféu e somam nas 52 semanas.
- **Tabela de todos os tempos:** só vitrine, também na aba Conquistas.
- **Carreira do jogador:** Estreante, Reserva, Titular, Craque, Ídolo, Lenda. **Nunca zera.** Só sua: aparece para você e no card, se quiser; nenhuma lista pública. Sem sequência de dias.
  - XP: 10 por partida válida nas 5 primeiras do dia, 5 da 6ª à 15ª, zero depois. Time do Dia e cada rodada palpitada do Palpite da Rodada contam como 1 partida.
  - Níveis: Estreante 0 · Reserva 100 · Titular 1.000 · Craque 5.000 · Ídolo 15.000 · Lenda 30.000.
  - Bônus: +100 XP por ser o 1º do dia entre todos; +200 por ser o 1º da sua torcida na semana.
  - Conta como partida válida: pênaltis, Prova e Lances do Jogo fechados sem suspeita (inclusive desafio por link e amistoso), o Time do Dia terminado (acertando ou não) e a rodada do Palpite da Rodada no dia do 1º palpite dela. Partida que vira suspeita depois não tira XP; suspeita tirada na revisão dá o XP.
  - 1º do dia: soma das partidas no teto (com os Lances do dia) + Time do Dia daquele dia (o Palpite da Rodada fica de fora). Calculado às 00h15 do dia seguinte, uma vez só.
  - 1º da torcida na semana: só torcidas oficiais, pelo total do ranking da semana; sai na confirmação do fechamento (segunda 12h), na mesma transação; se a confirmação falhar, no cron das 00h15. O próprio `carreira_bonus` guarda quem foi o 1º. Quem apagou os dados continua somando para a torcida, e o bônus fica com o 1º entre quem continua no jogo. Quem liderou duas torcidas na mesma semana (trocou de time) recebe um bônus só.
  - Perfil: o bloco "Sua carreira" fica na aba Perfil (barra: Jogar, Palpites, Tabela, Perfil), que também abre pelo avatar do cabeçalho. A caixa "Mostrar meu nível nos cards" fica nos ajustes do Perfil (guardada no aparelho).
  - Resultado de pênaltis, Prova e Time do Dia: "+10 XP na carreira · Reserva" ou o selo "Subiu pra Titular!". Card: etiqueta "CARREIRA · TITULAR" só com a caixa ligada.

#### Telas da Galeria e das 52 semanas
- **Onde:** a Galeria em Tabela > Conquistas, com 2 sub-abas do mesmo tamanho, "Medalhas" e "Galeria" (abre em Medalhas); as 52 semanas em Tabela > Temporada, sub-abas "Mês · Série A e B" e "52 semanas"; as campeãs de estado em Ranking > Cidades, 4ª sub-aba "Campeãs". As quatro sub-abas de Cidades (Seu estado, Top nacional, Estados, Campeãs) têm o mesmo tamanho e ocupam a largura toda, sem rolagem horizontal em 390 e 360; a escolha Esta semana/Passada fica numa linha só dela.
- **Galeria em estante:** botão do time no topo (abre no time do coração) com "N troféus" (conta taças, flâmulas e megafones; acesso e rebaixamento aparecem só na linha de sobe e desce). Prateleiras: Taças (Campeão da estreia com estrela, Campeão da temporada e Campeão da Série B; as que faltam aparecem tracejadas, com "ainda não"; repetidas ganham "×N"); Campeão da semana (uma flâmula por semana, cor 1 cheia e faixa reta na cor 2, com a data e o selo "Série B" quando for; contorno claro fino para a cor 2 preta não sumir no fundo escuro); Vitrine · Maior torcida (megafone, "×N" e "Soma de todo mundo. Não é título."); uma linha neutra de sobe e desce ("Na Série A desde fev/2027 · nunca caiu"); e o botão "Campeãs de estado". Troféus são desenhos do jogo (SVG inline), nunca taça real, escudo ou camisa.
  - Para quem é de "Outro time" (ou ainda não escolheu), a Galeria abre com **um título só**, "Escolha uma torcida", e a lista já aberta; o botão do topo fica escondido até alguém escolher. No alto vem o atalho "Campeãs de estado".
- **Ficha do troféu:** folha que abre de baixo, com o troféu grande, nome, série e período, uma frase de explicação, 3 números públicos (na semana: média dos 30, quantos jogaram e vantagem sobre o 2º; no mês: pontos, vitórias e posição), "Você tava em campo: N pontos nessa semana" só para quem somou, uma frase do narrador e os botões "Fechar" e "Mandar no grupo", do mesmo tamanho. Os números vêm de `fechamento_semana` (semana) e `classificacao_temporada` (mês); o sobe e desce, de `temporada_serie`, sem os meses de pré-temporada. "Você tava em campo" vem de `minha_posicao_semana`, só com sessão e só na ficha do próprio time. **Limite conhecido:** essa função soma os pontos da pessoa na semana em todos os times; quem trocou de time no meio da semana vê o total. Acertar pede uma função nova (pontos da pessoa por semana e time).
- **52 semanas:** placa do seu time (posição, pontos, vitórias e distância para o da frente), a janela ("10 de 52 semanas · 04/01 a 08/03/2027", da segunda ao domingo da última semana contada) e a lista dos 20 com uma barrinha proporcional ao líder; na pré-temporada, o selo "Teste: zera no lançamento".
- **Campeãs de estado:** botão do estado, "Mais vezes campeã", a linha da sua cidade (só se ela já ganhou, sem repetir quando já está em "Mais vezes campeã") e a lista por semana. Só cidade com 5+ e nunca ao lado de apelido.
- **Pré-temporada** (Galeria vazia de verdade até o zerar): prateleiras-fantasma, "A GALERIA ABRE NO LANÇAMENTO", a explicação do zerar, o top 3 das 52 semanas de teste e "Ver minhas medalhas".
- **Placa "Troféu novo na Galeria" na Home**, quando o time do coração ganha troféu (todos menos o rebaixamento): uma vez por troféu por aparelho, com papel picado e vibração na primeira vez e os botões "Ver na Galeria" e "Mandar no grupo" (claro: o amarelo é do "Jogar agora"). Sem urgência. Fica entre o cabo de guerra e o "Jogar agora" e empurra este para baixo quando chega. Uma leitura por abertura do app; só entram troféus dos últimos 21 dias; o mais novo aparece (empate de data: taça, flâmula, megafone), com "+N troféu novo" se houver mais. As chaves já anunciadas ficam em `gdt:prefs.trofeusAnunciados` (até 80).
- **Card do troféu:** "Mandar no grupo" da ficha e da placa abre a tela SEU CARD (`jogos/cards.md`). Texto de compartilhar em emoji antigo: "🏆 Flamengo campeão da semana na Série A do Guerra de Torcidas!", mais " Eu tava na arquibancada." só para quem somou na semana, e o link em linha à parte. O rebaixamento não tem card.

### Eventos
- **Evento nunca multiplica pontos do ranking** (pontos em dobro favorecem quem está livre naquele horário). Cada evento dá **troféu próprio**. Nenhum está construído ainda:
  - **Dérbi da semana:** o clássico real do fim de semana vira duelo à parte entre as duas torcidas nas 48 h antes do jogo, pela média dos 30 melhores no período.
  - **Metas coletivas:** "a torcida precisa de 10 mil gols até domingo"; bateu, ganha selo na Galeria.
  - **Reta final:** domingo à noite, só narração e avisos, sem multiplicador.
  - **Copa das Torcidas** (fase 2): mata-mata em paralelo à temporada, um confronto por semana pela média dos 30 melhores.
  - **Copa de Verão:** dezembro e janeiro, sem futebol real.
- **Observar depois do lançamento:** se os 30 melhores de uma torcida grande encostarem no máximo da semana, o desempate vira corrida; medir antes de mexer.

### Regras de justiça
- Título por média, vitrine por soma.
- Minigame novo (depois do lançamento público) entra em "amistoso" (sem contar pontos) por 2 semanas, até a pontuação ficar parecida com a dos outros (~60 por partida para uma pessoa mediana, teto ~150). Na pré-temporada não há amistoso.
- Partidas de desafio contam dentro do teto diário; defesa só vale contra chute que ia no gol com força mínima (força 32 ou mais).

### Balanço entre minigames
- Seção do `npm run metricas` (ou `npm run balanco`), só leitura, **por minigame** (Lances por tipo e juntos, Prova de Boleiro, Time do Dia, Palpite da Rodada): partidas, jogadores, média, mediana, quartis (25% e 75%), 90%, máximo e quantas bateram o teto (150 nos jogos de partida, 100 no Time do Dia); nos Lances, também a taxa de gol por lance. No Palpite da Rodada, por palpite e por pessoa na rodada (já ×2). O relatório nunca mistura na mesma linha partidas de antes e de depois do corte dos Lances unificados (tabelas diferentes).
- **Peso de cada minigame na semana:** dos pontos que contaram, quanto veio de cada minigame (no geral e na mediana por pessoa).
- **Alvo:** mediana entre ~45 e ~75 por partida e teto ~150 nos jogos de partida; o relatório marca com ⚠️ o que sair dessa faixa. Prova de Boleiro mostra também até que pergunta as pessoas chegam e quantas param; Time do Dia, a distribuição de tentativas.
- Só mostra o que tiver pelo menos 20 partidas (abaixo disso: "pouca amostra").
- Grava uma cópia em `relatorios/balanco-AAAA-MM-DD.csv` (pasta fora do Git), para os números sobreviverem ao zerar. **O zerar avisa para rodar o balanço antes.**
- Ajuste de pontuação: decidido no Chat com os números do balanço; nunca muda partidas já fechadas.

## Como está no código

### Servidor
- **Ranking da semana:** `ranking_semana`, refeito a cada minuto; mudança sobe a `ranking_aviso` das telas, uma vez por semana a cada minuto.
- **Temporada** (migração `20261103000100` para a trava do fechamento):
  - Tabelas `temporada` (uma linha por mês) e `temporada_serie` (série de cada time no mês: `unica`, `a` ou `b`). Só torcidas, leitura pública, sem escrita pelo celular.
  - **Pontos não são gravados:** a view `classificacao_temporada` lê `posicao_campeao` das semanas travadas de `fechamento_semana`; semana provisória não conta. No fim do mês ficam só a foto da posição (`posicao_final`) e o `destino`.
  - **Fechamento:** rotina própria `fechar-temporada`, todo dia às 12h01. Fecha quando todas as semanas do mês travaram, grava a foto e abre o mês seguinte. Fica separada de `fechar_semanas` para um erro no mês não desfazer a trava da semana nem o bônus da Carreira. Se os crons caírem, a própria rotina trava as semanas atrasadas, da mais velha para a mais nova, antes de gravar a foto.
  - **Teste e estreia:** novembro nasce marcado como pré-temporada e os meses seguintes herdam a marca. **"Campeão da estreia" sai só no mês de estreia de verdade**, em `temporada.campeao_estreia_id`. O zerar apaga as temporadas e, na mesma transação, abre a estreia no mês seguinte ao da semana do zerar. Para estrear num mês, zere até o domingo antes da primeira segunda dele; zerar nessa segunda joga a estreia para o mês depois.
- **Cidades** (migrações `20261105000000_cidade.sql` e `20261105000100_municipios.sql`):
  - **Lista:** `municipios` (código IBGE, nome, UF), 5.571 municípios, gerada da API de localidades do IBGE por `npm run gerar-municipios`, com validador no `npm test`. A mesma lista vai para o celular em `public/dados/municipios.json` (~54 KB gzip), baixada só na escolha.
  - **Histórico, não carimbo:** cada escolha vira uma linha em `torcedor_cidades` (cidade nula = tirou). Um ponto conta para a cidade que valia na hora em que entrou no placar (fechamento da partida ou do Time do Dia; no Palpite da Rodada, a confirmação do placar).
  - **Conta:** `recalcular_cidades` refaz `ranking_cidade_semana` e `ranking_estado_semana` na rotina do minuto, depois dos times e num bloco próprio (erro na cidade não segura o ranking dos times), e uma última vez no fechamento, antes da trava. A própria tabela da semana travada é a semana fechada, base do troféu de campeã do estado. **Risco que fica:** se a conta da cidade der erro bem na confirmação de segunda 12h, a semana trava com a cidade como estava (só um aviso no log do banco).
  - **Quem sai do jogo** (apagar dados, limpeza de contas paradas, junção) deixa os pontos na cidade em `pontos_apagados_cidade`, sem id da pessoa, por um gatilho antes de apagar a conta. Se o gatilho der erro, a conta é apagada mesmo assim, sem os pontos da cidade: apagar os dados não pode travar.
  - **Privacidade:** as tabelas de ranking e o histórico não têm leitura pelo celular (cada um lê só o próprio histórico). As telas usam `ranking_cidades`, `ranking_cidades_top` e `ranking_estados` (só 5+), `minha_cidade_semana` (quantos jogaram, quantos faltam, posição, rival, posição do estado), `minha_cidade` e `escolher_cidade` (até 20 trocas por dia). `ver_meus_dados` mostra a cidade.
- **Galeria e 52 semanas** (migração `20261106000000_galeria_52_semanas.sql`): só leitura, nada novo gravado; as três funções têm leitura pública e não devolvem dado de jogador.
  - **`ranking_52_semanas()`:** as 52 semanas **travadas** mais recentes de `fechamento_semana`, pela `posicao_campeao` (geral) com a tabela de 20 posições (`pontos_campeonato('unica', …)`). Semana com `ativos` 0 vale 0 e não é vitória. Desempate: mais vitórias de semana (1º geral com gente jogando), depois a melhor posição na última semana da janela. Devolve sempre os 20 times, com `semanas`, `desde` e `ate`; sem semana travada, todos com 0, em ordem de id. Na pré-temporada mostra as semanas de teste, que o zerar apaga.
  - **`galeria_trofeus(p_time_id)`:** uma linha por troféu (`trofeu`, `prateleira`, `time_id`, `semana` ou `mes`, `serie`). Da semana travada: `campeao_semana` (1º da série, só com gente jogando) e `maior_torcida` (prateleira `vitrine`, só com soma acima de 0). Da temporada fechada: `campeao_temporada` (1º da A), `campeao_serie_b`, `acesso`, `rebaixamento` e `campeao_estreia`. A série única da estreia manda 10 para a A, mas isso não conta como acesso. A semana usa a série do mês da segunda-feira; as semanas entre o zerar e a estreia, sem temporada, contam como série única.
  - **`galeria_cidades(p_uf, p_codigo)`:** a cidade com `posicao_estado` 1 em `ranking_cidade_semana`, só em semana travada.
  - **Pré-temporada fora:** fica fora a semana que cai num mês marcado como pré-temporada ou antes dele (as de outubro de 2026 não têm linha em `temporada`), e a temporada marcada não dá troféu. A regra mora na função interna `semana_pre_temporada`, usada pelas duas galerias.
- **Carreira:** tabelas `carreira_partidas` e `carreira_bonus`, preenchidas por gatilhos no fechamento; o celular só lê o próprio XP.

### Telas e módulos
- **Temporada e divisões:** conta e textos em `src/jogo/temporada.ts` (testes em `temporadaDivisoes.test.ts`); frases em `src/narrador/temporada.ts`; bloco em `src/telas/blocoDivisoes.ts` e placa em `src/telas/placaTemporada.ts`, os dois por `import()` (a Home leva só o espaço reservado). A placa entra na mesma `<section data-placa-trofeu>` por `mostrarPlacaDaHome`, que tenta a do mês e, sem ela, a "Troféu novo" (`TROFEUS_DA_PLACA_DO_MES` em `src/jogo/galeria.ts`). O mês visto fica em `gdt:prefs.temporadaVista`. Aba em `src/telas/temporada.ts`.
- **Card da temporada:** `src/jogo/cardTemporadaDados.ts` (puro), `cardTemporada.ts` (Telão), o caso novo em `cardPlacarSeco.ts` e `cardPoster.ts`, e `src/telas/mandarTemporada.ts` / `mandarTemporadaCard.ts` (abre a tela SEU CARD; sem o pedaço, compartilha só o texto).
- **Galeria:** `src/jogo/galeria.ts` (conta pura), `src/servidor/galeria.ts` (leitura), `src/telas/galeria.ts`, `semanas52.ts` e `campeas.ts` (as três telas), `placaTrofeu.ts` (placa da Home), `trofeusDesenho.ts` (SVG), `mandarTrofeu.ts` (abre SEU CARD com o card do troféu), `src/narrador/galeria.ts` (frases da seção 15 do `docs/narrador.md`).
- **Peso:** Temporada e Cidades baixam sob demanda (`import()`); sem rede, a aba mostra "Sem conexão agora." com "Tentar de novo" (`baixarPedaco` em `blocos.ts`).
- **Cidade e posição:** `src/jogo/cidade.ts`, `rankingCidades.ts`, `posicao.ts` (`AVISO_PRE_TEMPORADA`), `rankingMinuto.ts`, `rankingTextos.ts`, `carreira.ts`, `regraLances.ts` (`MELHORES_DO_DIA` 3, `LANCES_PARTIDAS_POR_DIA_UNIFICADO` 10).

## Em desenvolvimento
- `?temporadaFalsa=unica|ab|vazia|fechada|erro` (aba Temporada); `?temporadaFalsa=fim-subiu|fim-caiu|fim-campeao|fim-unica` (placa e card de fim de mês, junto da Home falsa `?homeFalsa`).
- `?galeriaFalsa=cheia|pre|vazia|erro`.
- Cards: `?cardFalso&tipo=temporada` e `/dev/cards.html?personalizados&so=temporada`.
- Nada disso vai para o Supabase de produção.

## Pendências conhecidas
- "Você tava em campo" e "Somou no mês" somam todos os times de quem trocou de time (precisa de função nova no servidor).
- Na segunda de manhã, a semana que acabou ainda é provisória e fica fora da tabela do mês até as 12h.
