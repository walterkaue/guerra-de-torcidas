# Lances do Jogo

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

Um jogo só para faltas, cara a cara e disputas de pênaltis históricas: mesma tela, mesma regra de pontos, mesmos troféus. A cobrança de pênalti em si (motor, pontos, desempate, desafio) está em `jogos/penaltis.md`. Na pré-temporada soma no ranking (`jogos/rankings.md`).

## Regra

### Como joga
- **Tipos de lance:** **falta** (bola fora da área, com barreira) e **cara a cara** (finalização na área ou perto dela, com o goleiro podendo sair). Defesa fica fora (com lance fixo, a resposta seria decorada). Os pênaltis entram como **disputas históricas** (`jogos/penaltis.md`).
- **Gesto igual ao do pênalti:** direção, força e efeito, com cavadinha. Muda de onde a bola sai, a barreira e o goleiro.
- **Partida:** **3 tentativas do mesmo lance**, escolhido com um toque em "Jogar". Cerca de 30 s.
- **Qualquer clube:** a pessoa joga lance de qualquer clube e da Seleção; os pontos vão sempre para o time dela.
- **Torcida da seleção:** nos lances da seleção brasileira a arquibancada fica verde e amarela, sem brasão nem escudo.
- **Situação do lance:** a ficha e a partida mostram uma linha do que ele pede ("Falta a 25 m, pela direita, barreira de 4").
- **Limite:** até **10 partidas de Lances por dia** (Brasília), somando pênaltis, faltas e cara a cara, contadas **ao começar** (o desafio recebido conta; abandonar uma partida ruim gasta a vaga). Passou do limite, a mesma partida segue de treino, sem ponto nem medalha.
- **Dia:** valem as **3 melhores** partidas de Lances, de qualquer tipo (máx. 450). A Prova de Boleiro tem as suas 3 melhores à parte; Time do Dia e Palpite da Rodada não mudam.
- **Sem treino livre:** não existe mais Treinar, monte-sua-partida, Disputa livre nem hub de abas.

### Pontos
| Faixa do lance | Chance de gol esperada | Gol vale |
|---|---|---|
| Fácil | 75% ou mais | 24 |
| Média | 50% a 75% | 30 |
| Difícil | 30% a 50% | 36 |
| Craque | menos de 30% | 42 |
| **Carimbou o lance** (gol na zona onde entrou o gol de verdade) | | **+8** |

- **Partida:** soma das 3 tentativas, **teto 150** (3 × 50). O mesmo teto vale para os pênaltis e a Prova.
- **Dificuldade fixa por lance:** não sobe ao longo da semana.
- **Faixa:** o catálogo inteiro foi recalibrado pelo acerto real das pessoas (`faixaUnificada`; fator humano 0,418 sobre o robô: 9 gols em 30 tentativas, contra 21,5 do robô). Depois, a partir de **30 tentativas valendo** de um lance e **8 pessoas diferentes** (cada uma com no máximo as últimas 10), a faixa sai da taxa real (`faixaCorrigida`). A correção **só desce** a faixa, nunca a sobe acima da do catálogo (errar de propósito com contas anônimas não pode render ponto). A faixa é decidida quando a partida começa e fica gravada nela: mudança de faixa nunca mexe em partida começada ou fechada.
- **Data de corte:** `LANCES_UNIFICADOS_DESDE` (08/11/2026, 0h de Brasília). A tabela de pontos, o limite e o teto saem da **hora de criação** da partida, que a função passa ao banco ao começar; partida fechada nunca muda. Partida criada antes do corte e fechada depois das 00h05 conta no dia antigo (`periodoNoCorte`, a tolerância de 00h05 de toda virada de dia).

### Medalhas e Conquistas
- **Lances (faltas e cara a cara), por lance:** **bronze** com 5 gols, **prata** com 20, **ouro** com 50, dos quais 10 carimbando. Contam só gols em partidas valendo, conferidas no servidor.
- **Disputas de pênaltis, por disputa histórica:** **bronze** com 10 gols, **prata** com 50, **ouro** com 100 gols e 10 vitórias. Contam as partidas desde 31/10/2026 (quando a partida passou a guardar a disputa). O desafio conta na disputa de quem chamou. **Sem Disputa livre e sem medalha para ela.**
- **Nunca zeram**, nem no zerar da pré-temporada: ficam numa tabela própria que o `zerar-pre-temporada` preserva. Somem só com a conta. **Não valem ponto** (são coleção, como a Carreira). O id de um lance nunca muda depois de publicado.
- **Trilha de 3 medalhas:** em cada card e na ficha, três bolinhas (5·20·50, ou 10·50·100 nas disputas) ligadas por uma linha que se enche; conquistadas na cor da medalha, a próxima preenchida em parte, "23 gols · faltam 27" ao lado. Ouro completo brilha. Nas disputas, também a barra de Vitórias e "Faltam X gols e Y vitórias pro ouro". Nos lances, a barra de carimbados e "Faltam X gols, Y carimbando, pro ouro".
- **Linha no resultado:** uma por lance, "+1 rumo ao ouro · 24/50"; sem gol, "Rumo ao bronze · 3/5"; quando sobram gols e faltam carimbados, "7/10 carimbando". Lê `minhas_medalhas()` de novo depois do 3º lance, quando o gatilho já anotou os gols. Partida sob suspeita ou sem conexão não mostra, porque os gols dela não contam. Ao subir de medalha: papel picado, vibração, o selo e "Mandar a medalha".
- **Página Conquistas** (3ª aba da Tabela: Semana, Temporada, Conquistas; o atalho do Perfil também abre): "Suas medalhas" por clube e por lance, com a mesma trilha, e a "Vitrine das torcidas" (soma por torcida, ordenada por ouro, pelo time atual de quem ganhou, sem apelido: "a torcida do São Paulo tem 1.240 medalhas de ouro"). Tocar numa medalha abre o card.
- **Card de medalha** (`src/jogo/cardMedalha.ts`, "Telão do estádio"): "Já sou ouro no primeiro gol de Tóquio — Flamengo x Liverpool (1981)". Título do lance sempre, nunca nome de pessoa (`jogo.md`, seção 8); a ficha factual não entra. No telão: o time no alto, a medalha desenhada (fita nas cores do time) e "JÁ SOU OURO / no primeiro gol de Tóquio / FLAMENGO X LIVERPOOL (1981)"; embaixo, OURO no lugar dos pontos, "Medalha pro Flamengo" (ou o apelido), um adesivo sem nome de ninguém e o link.
  - **Onde aparece:** botão "Mandar a medalha" no resultado e ao tocar numa medalha nas Conquistas: folha de baixo com o card, "Mandar no grupo", Stories e Link.
  - **Frase:** o artigo do título vira contração ("O primeiro gol…" → "no primeiro gol…", "A virada…" → "na virada…", "Os"/"As" → "nos"/"nas"); sem artigo, "no lance" ou "na disputa" ("Já sou bronze no lance Gol 100 do goleiro").
  - **Link:** `torcida.kauewalter.com.br/#lance/<id>` ou `#disputa/<id>` abre a ficha do item. Sem time no aparelho, passa antes pela escolha do time.
  - **Texto de compartilhar**, com emoji antigo: "🏆 Guerra de Torcidas · Lances do Jogo" (ou "· Pênaltis"), a frase, "Medalha pro Flamengo" e o link.
- **"Mandar esse lance"** (na ficha, ao lado do "Jogar"; não precisa de medalha): abre a folha de compartilhar com o link do lance e "⚽ Lance do Guerra de Torcidas: A virada em Lima (Flamengo x River Plate, 2019). Consegue carimbar?"; na disputa, "⚽ Disputa de pênaltis no Guerra de Torcidas: O tetra da Copa do Brasil. Bate comigo?". Só título, clube, adversário e ano: ficha factual e nomes de pessoa nunca entram. Sem a folha (computador), copia o texto e mostra "Link copiado.". O botão trava até a folha voltar. Conta em `src/jogo/mandarLance.ts`.
- **Comemoração no resultado:** papel picado nas cores do time e vibração, uma vez por resultado, em vitória (pênaltis, desafio, 8 de 8 na Prova), recorde novo, partida nas 3 melhores do dia, Time do Dia acertado e medalha nova (a que chega depois pelo servidor não repete a festa). Sem papel com movimento reduzido; respeita o botão Vibração.

### Tela única (`src/telas/lances.ts`)
- **No topo:** "Seus 3 melhores de hoje" (3 números; casa vazia "Vaga"; "—" sem resposta do servidor) e "Valendo hoje: N de 10".
- **Filtros:** tipo (Todos · Pênaltis · Faltas · Cara a cara); clube (abre no time da pessoa; em "Outro time", na Seleção); Todos / Meus troféus / Perto do próximo; ⭐ Favoritos. "Meus troféus" mostra os lances com pelo menos o bronze; "Perto do próximo" ordena pelo que falta para a próxima medalha (ouro completo vai para o fim). Favoritos ficam só no aparelho (`prefs.favoritosLances`), sempre no topo.
- **Ordem:** favoritos → seu time → Seleção → outros (disputas e lances).
- **Card:** a faixa recalibrada com os pontos ("Difícil · 36"), o placar na disputa, a trilha e o selo "Lance do Dia".
- **Ficha** (folha de baixo): ⭐, a ficha factual, a situação, a trilha, prévia da linha do resultado, "Mandar esse lance" e "Jogar" (o principal, amarelo).
- **Voltar com folha aberta:** a ficha e as regras ("?") entram no histórico do navegador; o voltar do celular fecha a folha antes de sair da tela. Fechar tocando (✕, fora, Esc, "Jogar") desfaz o estado; o "Jogar" da disputa só troca de tela depois que o histórico voltou. Conta em `src/telas/folhaNoHistorico.ts`.
- **"?":** as tabelas, lidas do código (`src/jogo/regrasUnificadas.ts`).
- **Na Home:** o card Lances do Jogo ocupa o lugar dos Pênaltis na grade, com o total de lances do catálogo, quantos são do time da pessoa (`src/dados/lancesResumo.ts`, gerado com o catálogo, para a Home não baixar as fichas) e as 3 melhores do dia, só as da própria pessoa. "Jogar agora" pelas partidas valendo que faltam das 10; abre a tela única no filtro Pênaltis. **Lance do Dia:** `lanceDoDia(dia, ids)` em `regraLances.ts`, pela data e pela ordem alfabética dos ids (disputas e lances), igual no celular e no servidor; o mesmo para todos, não multiplica pontos; abre a ficha do item. O catálogo vem por `import()` depois de desenhar.
- **Perfil e Tabela:** só "Lances" na posição e no recorde (o servidor junta com os pênaltis). Texto da Tabela: "por dia, de cada um valem as 3 melhores partidas de Lances e as 3 da Prova".

### Partida
- "Tentativa N de 3" no topo. Valendo, o celular pede a partida ao servidor; cada chute manda o gesto e a bola só sai quando o resultado chega (o batedor corre durante a espera). O goleiro começa onde o servidor diz.
- **Limite do dia (429):** "Hoje já deu: 10 partidas valendo. Essa vai de treino: sem ponto nem medalha." e a dica "Hoje as 10 valendo já foram. Treine à vontade.".
- **Caiu a conexão** (no começo ou no meio): a partida segue no celular, com sorteio próprio, e não vale pontos. Aviso: "Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar." e, embaixo, em letra pequena e cinza, "código: tempo_esgotado" (o código do motivo, sem parênteses). O formato (`comMotivo` em `src/servidor/motivo.ts`) vale também para "Sem conexão: essa partida não vale pontos." e a faixa de aviso do resultado.
- **Câmera 3D com três distâncias:** `src/telas/camera.ts` põe a câmera atrás da bola; `src/telas/cena3d.ts` desenha o campo (grande área, pequena área, marca do pênalti, meia-lua), o gol com rede, a barreira a 9,15 m da bola, o goleiro, o batedor e a bola. O gol ocupa ~78% da largura da tela no pênalti, ~60% no cara a cara e ~42% na falta de 25 m. A bola é desenhada 2,2 vezes maior que a real. A câmera 3D é só dos Lances; os pênaltis mantêm a cena de TV.
- **Arraste:** como nos pênaltis, mas a linha do arraste prolongada cruza a boca do gol onde ela aparece na tela.
- **Física:** a bola voa pelo caminho 3D do motor (`caminhoDoLance`) e para onde o motor diz (`tFim`: barreira, goleiro ou linha do gol); o goleiro começa onde o motor sorteou (`goleiroAntesDoChute`) e pula para a bola.
- **"A jogada" (cara a cara):** antes do chute, um quadro conta como a bola chegou (coluna `chegada` do catálogo, até 90 caracteres, sem nomes) e a bola rola até o pé, vinda de trás, de um lado ou de rebote (`chegada_de`). Dura ~2 s.
- **Replay de TV:** todo gol ganha replay de uns 3 s (toque pula; sem replay com movimento reduzido). Só desenho. Ver `docs/visual.md` 4.2.
- **Celular deitado:** com toque, mais largo que alto e altura até 500 px, os pênaltis e os Lances mostram por cima "Vire o celular pra jogar", com um celular desenhado girando (parado com movimento reduzido), até a pessoa virar. Tablet, dobrável aberto e computador nunca veem. Com o aviso na tela **o relógio da partida para** (janela de reação da defesa, 1,9 s − 0,7 s × dificuldade, e "A jogada") e volta de onde parou; o servidor não mede tempo, então nada do que ele grava muda. Arraste no meio é descartado. Conta em `src/jogo/telaDaPartida.ts` (`celularDeitado`, `criarRelogioPausavel`).
- **Campo maior em tela grande:** no computador, no iPad e no dobrável aberto, o canvas dos pênaltis e dos Lances sai da coluna de 520 px e o campo cresce pela altura, com o placar por cima. Home, Tabela, Galeria e resultados continuam na coluna. Detalhes em `docs/visual.md` 4.7.
- **Narrador:** seção 12 do `docs/narrador.md` mais as frases genéricas de gol, trave e fora da seção 3.

### Resultado
- "Gols N de 3" e as 3 tentativas sob o título do lance, com o desfecho de cada uma desenhado (gol, defesa, barreira, fora ou trave).
- Valendo: pontos da partida, posição nos Lances na semana e recorde ("NOVO RECORDE!"), XP da Carreira, selo de medalha nova ("Bronze no lance…"), "Suas 3 melhores hoje: 96 · 72 · 54" e "Subiu de 5º pra 3º" / "Tá no placar da semana" quando a partida entrou nas 3 melhores; se não entrou, "Não entrou nas suas 3 melhores de hoje: …". Partida sob suspeita mostra o texto dos pênaltis.
- Botões: "Jogar de novo" (o mesmo lance) e "Ver os lances".
- **Card "Telão do estádio"** (`src/jogo/cardLances.ts`, só da partida valendo): "LANCES DO JOGO", os pontos, o título do lance uma vez e as 3 tentativas (desfecho desenhado, "CARIMBOU O LANCE" e pontos), mais a linha da medalha nova. No texto de compartilhar, um emoji antigo por lance: ⚽ gol, ✋ defesa, 🚧 barreira, ❌ fora ou trave (`jogos/cards.md`).

### Desafio dos Lances
- Toda partida normal gera um código com o resumo público da faixa usada. Compartilhar: o link `?l=código`, com "Te desafio nos Lances do Jogo: fiz {quanto}. Faz mais?".
- **Quem aceita** joga o mesmo lance, **na mesma faixa**, com sementes novas; mais pontos vence, e o empate fica com quem desafiou. O desafio recebido não gera outro código e conta no limite do dia.
- **Tela do convite** (`jogos/contas.md`, "Primeiro acesso"): "<quem> (<time>): N pontos no lance <título>. Mesmo lance, 3 tentativas. Faz mais?". Quem é novo toca no time; quem já joga toca em "Encarar o desafio". Os dois vão direto à partida, com "Desafio: <apelido> fez N" no topo; o `?l=` sai do endereço.
- **Os gols de quem chamou** (convite e resultado; desenho em `docs/visual.md` 4.2): quem aceita joga com sementes novas, então dá para mostrar antes.
  - **Fita:** as 3 tentativas lado a lado, na ordem, cada uma com o ícone do desfecho, a palavra curta (Carimbou, Gol, Pegou, Barreira, Trave, Fora) e os pontos.
  - **Telão** (só com pelo menos 1 gol): os gols redesenhados no aparelho de quem abre, na cena e no replay de TV de hoje, com o boneco de quem chamou batendo (sem boneco, sorteado) e goleiro e barreira sorteados pelo código do desafio (o mesmo link mostra sempre os mesmos bonecos). Um gol depois do outro, parado 900 ms no fim de cada um; depois do último, para e oferece "Ver de novo". Não repete sozinho, sem som; tocar pula para o próximo gol. Com movimento reduzido ou qualidade Leve, nada anda sozinho: o instante em que a bola cruza a linha, com o goleiro ainda de pé, e "Próximo gol" (o mesmo quadro fica depois do último gol). O telão tem três faixas e nada cobre o desenho: tarja e pontinhos em cima, o quadro no meio, legenda (numa linha) e botão embaixo. Com economia de dados, nada baixa sozinho: o gramado e "Ver os gols", que traz o quadro parado.
  - **No convite:** depois do texto da placa, o telão e a fita, também para quem já joga. Nenhum gol nas 3: só a fita e "Nenhum gol nas 3. Mesmo lance, mesma faixa: {Faixa}, gol vale {N}.". Sem tentativas (partida antiga): o convite de sempre. As faixas de time continuam inteiras na tela (2 toques até o 1º chute).
  - **Desafio vencido:** o aviso dos 7 dias, "Os gols de {apelido} continuam aqui pra você ver." e o mesmo telão e fita, até a limpeza de 30 dias apagar o desafio.
  - **No resultado do desafio recebido:** na placa "Desafio" dos detalhes, as duas fitas ("Você" e quem chamou) e "Ver os gols de {apelido}", que abre uma folha com o telão. A dobra não muda.
  - **Textos:** "de {apelido}" só com apelido (o servidor só guarda o de quem tem 16+); sem apelido, "de quem te chamou". Do lance, só o título.
- **Prazo:** o desafio vale 7 dias desde a criação e é apagado com 30 (`jogos/penaltis.md`, "Desafio por link").
- **Expira** (410 `desafio_expirado`) se o lance desceu de faixa depois do desafio (`desafioNaFaixa`), para um código antigo não guardar a faixa que pagava mais. Também expira o desafio cuja partida foi criada antes do corte.
- **Erros** (404, 409, 410) viram partida normal do mesmo lance, com uma linha do narrador (no 410, "Apitou o fim: esse desafio valia 7 dias. Bora outro!"). O resultado mostra o placar dos dois; frase do narrador que fala em link cai na neutra.
- Boneco de quem chamou: `jogos/penaltis.md` (Desafio por link) e `jogos/boneco-montavel.md`.

### Anti-trapaça
- O servidor sorteia as sementes, recebe os gestos **lance a lance**, recalcula e grava; a semente nunca vai ao celular. O limite do dia e o de 3 partidas por minuto são contados no servidor. O treino não passa pelo servidor e não conta para nada.
- **Detecção** (`motivoSuspeitaLances` em `src/jogo/lancesPartida.ts`; números em `config_deteccao`). Sem a semente, nem mira perfeita ganha muito (33% a 36% nos lances Craque e 37% a 68% nos Difícil, contra 26% e 30% a 45% de uma pessoa). Procura o que uma pessoa não faz:
  - **Gesto de robô:** nas últimas 15 tentativas valendo do mesmo lance, direção e força variando no máximo 2 pontos (uma pessoa varia ~7).
  - **Acima da mira perfeita:** 27 gols ou mais nas últimas 30 tentativas valendo em lances Difícil ou Craque. Rede de segurança contra semente vazada ou erro no servidor.
  - Partida marcada fica fora do ranking, do recorde e das medalhas e vai para a fila "Partidas sob suspeita" do `#admin`. Liberar devolve ao teto do dia e anota os gols nas medalhas.

### Catálogo
- **Cada lance guarda:** id, clube (ou Seleção), tipo, título, ficha, competição, ano, adversário, cena (bola, barreira, goleiro), zona histórica, faixa, **fontes** (links de notícias públicas), data da verificação e status (rascunho, revisado, ativo).
- **Cota:** 2 a 3 lances por clube; a Seleção Brasileira é coleção extra, aberta a todos.
- **Só lances que celebram o clube:** nada de tragédia, morte ou acidente, vexame ou atleta menor de idade na data do lance. Nada de opinião sobre pessoas. **Exceção:** lances da campanha da Chapecoense na Sul-Americana de 2016, desde que a ficha, o título e o narrador não falem do acidente. Vale também para as disputas de pênaltis: a ficha pode citar o goleiro pelo nome, como fato, nas mesmas condições.
- **Nomes reais** só na ficha factual, com fonte; nunca no título, card, narrador ou boneco (`jogo.md`, seção 8). Competição e estádio sem nome de patrocinador.
- **Como nasce:** como o banco de perguntas (`jogos/conhecimento.md`): lote com busca na web e fonte, e uma segunda sessão que confere cada fonte.

## Como está no código

### Motor (`src/jogo/lances.ts`)
Puro e compartilhado com o servidor (sem trigonometria; `Math.sqrt` pode). Medidas em metros: origem no meio da linha do gol, x para a direita de quem bate, z até a linha do gol.
- **Ponto final** na linha do gol: a mesma conta dos pênaltis (`trajetoria`). O tremor cresce com a distância (até 3 vezes o do pênalti).
- **Caminho da bola:** reta até o ponto final, mais a curva do efeito (até 1,5 m no meio do caminho, a 20 m) e um arco que sobe mais com força menor e com a distância. Força alta = chute reto e rápido; média = bola que sobe e cai.
- **Barreira:** a 9,15 m da bola, tapando a linha entre a bola e um ponto do gol; de 2 a 6 jogadores de 0,5 m e 1,9 m de altura. Bate nela a bola que passa nessa faixa abaixo de 1,9 m. Bola que sai de trás da barreira atrasa o goleiro.
- **Goleiro:** começa no lado aberto (falta) ou de frente para a bola (cara a cara); reação sorteada entre 0,15 e 0,45 s; alcance que cresce com o tempo de voo (até 3,8 m, um pouco menos no ângulo). Em 25% das vezes "lê" o chute. Saindo do gol, abafa mais; a cavadinha só encobre goleiro que saiu 3 m ou mais e não leu.
- **Trave, fora, ângulo e cavadinha:** mesmas regras dos pênaltis.
- **Tabelas:** `TABELA_LANCES_UNIFICADA` e `PONTOS_UNIFICADOS` (pênaltis) são as de hoje; `TABELA_LANCES_ANTES` e `PONTOS` ficam no código só para fechar partidas antigas. `src/jogo/regraLances.ts` escolhe por `tabelaLancesDaPartida` / `tabelaPenaltisDaPartida`, pela hora de criação; `faixaDaPartida` (corrigida pela taxa real, senão `faixaUnificada`, senão a de sempre) e `faixaCorrigida`.
- **Os gols de quem chamou:** textos e regras puras em `src/jogo/golsDoDesafio.ts`; a fita e o gramado do telão em `src/telas/fitaDoDesafio.ts` (no caminho do link); o desenho em `src/telas/telaoDoDesafio.ts`, por `import()` depois do convite pintado; elenco, goleiro e voo da bola em `src/telas/elencoDoLance.ts`, os mesmos da partida.
- **Telas:** conta pura da tela única em `src/jogo/lancesTelaUnica.ts` e `ordenarTelaUnica`, `trilhaDoLance`, `linhaRumo`, `linhasRumoDaPartida`, `previaDoProximoGol`, `filtrarAlbum` em `src/jogo/lancesTextos.ts`; `trilha()` em `src/telas/blocos.ts`; `src/telas/albumLances.ts` (cards, filtros, favoritos), `src/telas/fichaLance.ts` (a ficha, um `<dialog>`), `src/telas/rumoMedalhas.ts` (a placa "Rumo às medalhas" do resultado).
- **Catálogo:** `npm run catalogo-lances` gera `src/dados/lances.ts` (e `lancesResumo.ts`) com os lances `revisada` ou `ativa` dos CSVs e põe `faixaUnificada`; o teste avisa se esquecer. `scripts/lances/recalibrar.mjs` grava `dados/lances/faixas-unificadas.json` (lista em `docs/propostas/lances-faixas-unificadas.md`). A função `lances` lê a cópia `supabase/functions/_shared/dados/lances.ts` (`npm run compartilhar`). Adversários: `src/dados/adversarios.ts`.

### Servidor
- **Função `lances`,** duas ações:
  - **`nova`:** recebe `{ lance }` (3 tentativas do mesmo lance) ou `{ desafio }` (desafio recebido) e monta as cenas pelo catálogo do próprio servidor; o celular nunca manda a cena. A lista antiga de 3 ids responde sempre 426 `atualize_o_app`, e o celular com o site velho se recarrega. Sorteia **uma semente por lance**, guarda ids e sementes em `partidas_segredo` e devolve só onde o goleiro começa no 1º lance. Começar é uma transação (`lances_comecar`, com trava por torcedor): o limite do dia e o de 3 partidas por minuto não passam com chamadas ao mesmo tempo. A faixa é decidida ao começar e fica gravada no segredo.
  - **`lance`:** recebe o número do lance e o gesto. Lance repetido, pulado ou depois do 3º é recusado (`lance_fora_de_ordem`), com a mesma trava dos pênaltis. Devolve o resultado do lance e o goleiro do próximo. No 3º, fecha a partida na mesma chamada (refaz os 3 lances pelos gestos guardados, roda a detecção, grava pela `fechar_partida`). Se o fechamento falhar depois do 3º gesto guardado, reenviar o 3º só fecha.
- **Por que uma semente por lance:** o resultado volta exato ao celular, e dele se acharia a semente por força bruta (2^32, uns 2 minutos). Com uma só na partida, isso entregava os lances 2 e 3; por lance, a achada é de um lance já jogado. O goleiro inicial vai antes do chute, arredondado em centésimos da meia-largura do gol (~4 cm), sem dar pista do sorteio.
- **Partida em `partidas`** (`minigame = 'lances'`, `dificuldade` 0). Entra na Carreira (gatilho), na fila de suspeitas do `#admin`, em "ver meus dados", na limpeza de contas paradas e no ranking de minuto em minuto. `resultado` guarda os 3 lances (id, faixa, gesto normalizado e resultado do motor), `gols`, `recriados` e `pontos`. O desafio recebido fica em `partidas_segredo` (`partidas.desafio_id` é dos pênaltis).
- **Limite do dia:** `lances_comecar` e `penaltis_comecar` usam a mesma trava por torcedor e somam pênaltis e Lances (10, `config_deteccao.lances_unificados_por_dia`; a chave antiga `lances_por_dia`, 6, fica para o dia antigo), no dia da hora gravada na partida (`lances_hoje(torcedor, p_criada_em)`). Passou: 429 `limite_do_dia`. O corte no banco: `lances_unificados_desde()` / `lances_dia_do_corte()` (um teste confere que são iguais ao `LANCES_UNIFICADOS_DESDE`).
- **Melhor do dia:** `atualizar_teto` marca as 3 melhores de pênaltis + Lances e as 3 melhores da Prova (empate: a que fechou primeiro), todas por `conta_no_teto`; ranking da semana, bônus de "1º do dia" da Carreira e posição geral leem o teto. O corte decide pelo **dia** ou pela **hora**, nunca pela semana (a semana de 02/11 somou as duas regras; a pré-temporada zera). Recorde (`recorde_pessoal`) e posição (`posicao_minigame`, pelo dia pedido; `desempenho_partida` manda o dia da partida) juntam 'penaltis' e 'lances' e só olham partidas desde o corte.
- **Guarda no banco:** `fechar_partida` recusa (`acima_do_teto`) partida de pênaltis ou Lances acima de 150 em dia da regra nova.
- **Medalhas:** tabela `lances_gols`, um gol por linha (partida, posição, lance, carimbou), preenchida por gatilho quando a partida fecha sem suspeita ou é liberada; sobrevive ao zerar e vai junto na junção de contas, sem chave para `partidas`. Os pênaltis entram como item `penaltis:<disputa>` (uma linha por gol e uma de vitória). O celular lê só por `minhas_medalhas()` (gols, carimbados e vitórias por item), `vitrine_medalhas()` (soma por torcida, só times oficiais) e `meus_lances_hoje()` (partidas de hoje, limite e `melhores`, as 3 que contam).
- **Faixa corrigida:** `lances_tentativas` (uma linha por tentativa valendo; sobrevive ao zerar, some com a conta) e `lances_taxa(lance)` (no máximo as 10 últimas por pessoa e o número de pessoas). **Risco que fica:** 8 contas anônimas errando de propósito (8 CAPTCHAs e 32 partidas) seguram um lance na faixa do catálogo, atrasando a descida; nunca o levam acima. **Risco aceito:** na junção de contas pelo código, as tentativas da conta de origem saem com ela.
- **Desafio:** `lances_desafios` (resumo público em `ver_desafio_lances`, com a faixa usada).
- **Os gols no resumo:** `ver_desafio_lances` devolve, no fim, `tentativas`: as 3 da partida de quem chamou, de `partidas.resultado->'lances'`, numa lista branca montada no SQL (desfecho, pontos, recriou, cavadinha, x, y, goleiroX e tFim com 3 casas, e o gesto em inteiros). Nunca semente, partida, torcedor, faixa do segredo ou suspeita; sem a partida, ou com ela sob suspeita (até o `#admin` liberar), null. O celular confere o formato (`tentativasDoResumo` em `src/jogo/tentativasDoDesafio.ts`) e, fora dele, mostra o convite de sempre. **Por que não é brecha:** a partida de quem chamou já fechou (o resultado e o gesto já estavam no aparelho dele), e quem aceita joga o mesmo lance com sementes novas, sorteadas e guardadas só no servidor: ver onde a bola entrou não diz nada do tremor nem do goleiro da partida nova.
- **Moderação e junção:** `apelido_apagar` limpa também o apelido do desafio dos Lances; `juntar_torcedores` deixa a herança de recorde da regra nova substituir uma de antes do corte.
- **Relatórios:** `npm run balanco` (Lances juntos e por tipo; `--regra antes|nova`). Acompanhar: para quem joga muito, a Prova sobe para ~43% do total, empatada com os Lances.
- **Ordem de publicação:** a migração primeiro, depois as funções `lances`, `nova-partida`, `lance-penalti` e `fechar-partida` (as que levam `_shared/jogo/regraLances.ts`; a `boneco` também), e o site por último. A migração no ar não quebra as funções antigas; o contrário quebra. Depois que houver partidas com a faixa gravada, as funções não voltam à versão anterior. Mudar a data de corte exige publicar banco e funções juntos, senão discordam no teto e na tabela.

## Em desenvolvimento
- `?lancesFalsos` (`=limite` para o limite do dia; `&caiNoLance=N` derruba o N-ésimo lance; `&x1=ok|proprio|expirado|nao`). Código em `src/dev/lancesFalsos.ts`.
- `?homeFalsa` (`&l=código`, `&semMelhores`) e `?penaltiFalso` (`&limite`, `&x1Expirado`).
- Os dois falsos de `?l=` devolvem tentativas calculadas pelo motor (2 gols, o 1º carimbando, e uma defesa); `&x1SemGols` e `&x1SemTentativas` (`src/dev/tentativasFalsas.ts`).

## Pendências conhecidas
- 8 lances sem carimbar possível ainda precisam de conferência (outra sessão).
