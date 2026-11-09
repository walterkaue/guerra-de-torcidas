# Boneco montável e Vestiário

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`. Estilo visual dos bonecos sorteados: `docs/bonecos.md` (separado, não é este).

## Regra

### O boneco
- **Sem foto enviada pelo jogador** (dado pessoal de menores, moderação, armazenamento). O avatar é um boneco no estilo "Silhueta premium" (`docs/bonecos.md`), **sempre fictício**: rosto liso (sem olhos, boca ou barba), camisa lisa sem nome, nada que imite jogador real, nem pela combinação de número, pele e cabelo.
- **Onde aparece:** busto no avatar da Home (52 px, com o fundo e a moldura escolhidos) e no crachá do Perfil (84 px); corpo inteiro no bloco "Vestiário" do Perfil e no vestiário; no card (quadradinho "Meu boneco" e estilo Pôster, `jogos/cards.md`); em campo e no desafio (abaixo). **Nunca** em lista de outras pessoas, ranking ou vitrine de torcida.
- **Primeira vez:** cada conta ganha um boneco sorteado entre as peças do começo, sem tela no caminho da 1ª partida (um toque e joga). No Perfil, o convite "Monte seu boneco" fica até a primeira visita ao vestiário.

### Peças do começo (todo mundo tem, de graça)
Corpo (homem ou mulher, só a forma do desenho; todo cabelo e acessório serve nos dois); os 6 tons de pele do jogo (só a amostra, sem nome de cor); os 7 cabelos em 6 cores; uniforme 1 ou 2 nas cores do time do coração (trocar de time troca as cores sozinho); número; testeira e munhequeira nas cores do time; fundos Gramado, Arquibancada do time e Estádio à noite.

### Número
1 ou 2 dígitos, de 0 a 9 e de 00 a 99. "7" e "07" são escolhas diferentes, "0" e "00" valem, e dá para ficar sem número. Nenhum número é bloqueado: o que identifica um jogador é o nome, e por isso **nomes e apelidos de jogadores famosos entram na `palavras_bloqueadas`** (apelido e frase própria do card). Nome comum sozinho (Gabriel, Lucas) não entra; entra com o sobrenome conhecido.

### Como se ganha o resto
Nunca pago, sem sorteio, sem prazo; condições contadas no servidor.

| Condição | Libera |
|---|---|
| Reserva (100 XP) | colete de treino por cima da camisa · fundo Banco de reservas |
| Titular (1.000) | chuteira nas cores do time · pose "braços pra cima" (só no card) · fundo Túnel |
| Craque (5.000) | braçadeira de capitão · fundo Holofotes |
| Ídolo (15.000) | faixa de campeão no peito · fundo Papel picado |
| Lenda (30.000) | moldura dourada do avatar · fundo Telão |
| 1º bronze em qualquer item | munhequeira bronze |
| 1ª prata | fundo Barreira |
| 1º ouro | chuteira dourada (genérica, sem marca) · fundo Rede balançando |
| Ouro numa disputa de pênaltis | uniforme de goleiro (cores de goleiro do jogo, com luvas) |
| Ouro num item da Seleção | fundo verde e amarelo (sem brasão nem bandeira) |
| 5 ouros | moldura Galeria |
| Aquecimento completo | apito no pescoço |

- O contador "N de 26 peças" conta as peças do vestiário (roupas, acessórios, chuteiras, pose, fundos e molduras), não pele, cabelo, corpo e número. As do começo contam sempre. É coleção, como a trilha das medalhas: sem prazo, raridade ou peça que some.
- Peça trancada aparece com cadeado e a condição ("Libera no Titular", "Libera no 1º ouro"); o texto nunca cita nome de pessoa. Nada por posição no ranking nem por sequência de dias. Poses só genéricas.
- O apito vem do Aquecimento, que é registrado pelo aparelho (risco aceito do +20 XP, `jogos/aquecimento.md`): aceitável para uma peça só visual.

### Vestiário e telas
- **Perfil:** crachá com o busto de 84 px; logo abaixo, bloco **Vestiário** de ~120 px: corpo inteiro de 76 × 112, "N de 26 peças", "Próxima: chuteira nas cores do time, no Titular" (com tudo: "Você tem todas as peças") e o botão "Monte seu boneco" (até a 1ª visita) ou "Abrir vestiário". Carregando, esqueleto parado do mesmo tamanho; sem rede, o boneco guardado e "Sem conexão com o vestiário agora.", sem contador. A Carreira continua visível sem rolar em 390 × 844.
- **Home:** avatar do cabeçalho em busto de 52 px, com fundo e moldura (o ícone fica até o desenho chegar e quando não há boneco); tocar abre o Perfil.
- **Vestiário (tela cheia, `#vestiario`):** boneco grande em corpo inteiro no topo (48% da altura), parado, sobre o fundo escolhido, com voltar, "VESTIÁRIO", "N de 26" e a prévia do busto da Home. Embaixo, 5 abas do mesmo tamanho com ícone e texto curto: **Corpo** (corpo e pele), **Cabelo** (estilo e cor), **Camisa** (Uniforme: 1, 2 e goleiro; número em dois quadros e "Sem número"), **Acessório** (Acessórios, Chuteira, e Pose do card, que só aparece no card) e **Fundo** (Fundos e Molduras). Só a parte de baixo rola. Botões **Sortear** (escuro; só com peças que a pessoa tem, tentando não repetir o da tela) e **Salvar** (amarelo), na proporção 1 : 1,4. As miniaturas mostram o boneco de agora vestindo a peça; fundo é só o fundo; moldura é o busto com ela; pele e cor de cabelo em amostras redondas sem nome.
- **Toques:** tocar de novo num acessório vestido tira; camisa e fundo nunca ficam vazios. No número, com 2 dígitos o próximo começa de novo; apagar até vazio dá "sem número"; "7" ocupa um quadro e "07" os dois.
- **Sair sem salvar:** voltar com mudança pergunta "Sair sem salvar?" (Salvar · Sair); sem mudança, sai direto. O voltar do Android fecha primeiro a folha de cima e depois passa por essa pergunta. Não grava a cada toque: cada gravação passa pelo servidor. Erro ao salvar: "Não deu pra salvar. Tenta de novo." sobre o rodapé, e a escolha fica. Sem rede: "Sem conexão com o vestiário agora.", e nada é gravado no aparelho.
- **Peça trancada:** folha que abre de baixo com o nome, a condição e um botão só, "Entendi". Peça de nível mostra a barra do XP de agora sobre o do nível que libera ("Você: Titular · 1.770 XP", "Faltam 3.230 XP"). Peça de medalha mostra a regra e quanto falta no item mais perto ("O bronze sai com 5 gols num mesmo lance ou 10 gols numa mesma disputa de pênaltis." · "Faltam 2 gols no lance mais perto."); o ouro dos pênaltis só olha as disputas, o da Seleção só os itens da Seleção, a Galeria conta "Você tem 2 de 5", o apito pede o Aquecimento. Depois, "Libera junto" (as outras peças da mesma condição). Nenhuma compra, sorteio ou prazo.
- **Abrir já numa peça:** pelo Perfil ou pelo "Vestir agora", a tela pode abrir na aba da peça pedida, já vestida e ainda não salva (a pose só abre a aba Acessório). Só vale para peça liberada.
- **Peça nova no vestiário:** no resultado dos Lances, Pênaltis, Prova e Time do Dia, entre a Carreira e "Mandar no grupo", quando uma peça libera. Bloco com o boneco vestindo as novas (parado e depois de braços pra cima, com pulinho, se a pose está liberada), a lista por conquista ("Subiu pra Titular!", "Primeiro bronze!") e "Vestir agora" (botão de contorno: a ação principal do resultado continua "Mandar no grupo"), que abre o vestiário com a primeira peça que aparece nele. Só aparece quando o servidor fechou a partida e ela contou (treino, sem conexão e sob suspeita, não). Cada peça é anunciada uma vez por aparelho. O apito nunca sai no resultado. Papel picado e vibração pela comemoração do resultado (uma vez por resultado).
- **Movimento:** pulinho de 250 ms ao trocar peça; pose de braços pra cima com vibração curta ao vestir peça nova. Com movimento reduzido, nada se move; a vibração respeita o botão Vibração.

### Boneco em campo (só visual)
Nada muda em pontos, sementes, detecção ou regra de jogo.
- **Quem:** o boneco da pessoa é o batedor dela. Nos pênaltis, bate as 5 cobranças e as da morte súbita, no lugar dos 5 sorteados; nos Lances, as 3 tentativas; também no treino e no aquecimento. O goleiro dela continua sorteado, e os batedores e goleiros da máquina também.
- **Roupa:** as cores são as da cena, pela regra dos uniformes (`jogo.md`). Nos pênaltis, o uniforme 1 ou 2 do time do coração, com a troca de uniforme contra o adversário de sempre; na disputa da Seleção, as cores da Seleção; nos Lances, as cores do clube do lance; no Gol 100, a roupa de goleiro do lance. O campo `camisa` da vestimenta (uni1, uni2, goleiro) não vale em campo.
- **Do vestiário entram:** corpo, pele, cabelo e cor do cabelo, testeira, munhequeira (inclusive a bronze), braçadeira e chuteira (nas cores do time do coração ou dourada). Testeira e munhequeira ficam nas cores do time do coração, mesmo num lance de outro clube ou na Seleção, com o contraste do vestiário. **Ficam fora:** colete, faixa de campeão, apito, pose, fundo e moldura.
- **Número:** nas costas (em campo o batedor aparece de costas) e na frente no replay, em Anton, na cor de texto da camisa da cena. Sem número na vestimenta, camisa lisa. É a segunda exceção à regra dos bonecos fictícios (`jogo.md`), ciente do risco de imagem; os bonecos sorteados continuam sem número. Título do lance, card e narrador continuam sem nome de pessoa.
- **Replay:** o batedor aparece de frente comemorando (rosto liso), com a mesma regra de peças e número.
- **Sem cópia no aparelho** (nunca abriu o boneco, ou a leitura falhou): batedores sorteados, sem erro e sem esperar a rede antes do apito.
- **Interruptor "Meu boneco em campo"** nos ajustes do Perfil, ligado por padrão, inclusive para os bonecos que já existiam antes (a faixa "Os Termos mudaram" é o aviso). Vale também para o desafio, por isso fica no servidor, junto com o boneco, e numa cópia no aparelho, para o desenho não esperar a rede. Desligado: em campo e nos desafios que a pessoa mandar, batedores sorteados. "Ver meus dados" mostra o interruptor.

### O que aparece para quem recebe um desafio (`jogos/penaltis.md`, "Desafio por link")
- Nos pênaltis, as cobranças gravadas de quem chamou são batidas pelo boneco dele, nas cores do time dele; quando quem aceitou cobra, é o boneco de quem aceitou.
- No resultado do desafio (pênaltis e Lances), o busto de cada um ao lado do apelido; no convite da Home, o busto de quem chamou.
- Sem boneco, ou com o interruptor de quem chamou desligado: sorteado, sem busto.
- Quem recebe vê só o que vai a campo (lista no servidor, abaixo); nunca o id de quem chamou.

### Onde fica guardado, privacidade e Termos
- No servidor, em códigos curtos (sem cores e sem rótulo de pele ou corpo), para acompanhar o Código do torcedor entre aparelhos. O servidor confere se cada peça está liberada antes de gravar e troca a trancada pela padrão.
- Entra no "Ver meus dados" (`boneco` sim ou não, e a linha "Boneco do avatar: escolhas de visual, sem foto"), some no "Apagar meus dados" e na limpeza de contas paradas, nunca vai para métricas (nem por contagem) e sobrevive ao zerar da pré-temporada, como a Carreira.
- Na junção de contas (`juntar_torcedores`) fica o boneco do dono (ou o da conta que entrou, se o dono não tiver; as peças dela continuam liberadas, porque carreira e medalhas vêm junto). O interruptor mais protetor fica: desligado em qualquer das duas, fica desligado.
- Termos: a Política tem uma linha sobre o boneco e outra, com `DATA_DA_VERSAO` em 07/11/2026: "Quem recebe um desafio seu vê o seu boneco, se ele estiver ligado em campo. Dá para desligar no Perfil." A **escolha de tom de pele e corpo está na lista do advogado** (`docs/termos-x-jogo.md`; pode ser lida como dado sensível na LGPD; defesa: escolha estética, sem pergunta de identidade, sem rótulo, sem métrica, apagável), e o interruptor em campo também.

## Como está no código

### Catálogo puro (`src/jogo/vestiario.ts`)
Também em `supabase/functions/_shared/jogo/`, pelo `npm run compartilhar`, junto com `carreira.ts`. **A regra mora só aqui**; o servidor e o celular leem o mesmo código.
- **Vestimenta `v: 1`:** só códigos curtos (`corpo` h|m, `pele` 0–5, `cabelo`, `corCabelo` 0–5, `camisa`, `numero`, `cabeca`, `punho`, `braco`, `peito`, `pescoco`, `chuteira`, `pose`, `fundo`, `moldura`), nunca cores nem rótulos. `PADRAO` entra no lugar de uma peça trancada ou inválida, campo a campo: uni1, nada na cabeça, punho, braço, peito e pescoço, chuteira neutra, pose parada, Gramado, sem moldura; pele, cabelo ou corpo inválido vira o 1º da lista.
- **`PECAS`:** as 26 peças, com id fixo (nunca muda depois de publicado), aba, nome, campo, valor e condição. 7 são do começo (uni1, uni2, testeira, munhequeira e os 3 fundos).
- **`pecasLiberadas(estado)`:** o estado é o índice do nível da Carreira, as medalhas por item (`tipo` lance ou disputa, gols, carimbados, vitórias, `daSelecao`) e `aquecido`. A medalha sai de `medalhaDoLance` e `medalhaDaDisputa`, a mesma regra da trilha (um teste compara com `trilhaDoLance` e `trilhaDaDisputa`). "1º bronze" vale para qualquer item com bronze ou mais; `daSelecao` chega pronto, decidido por quem monta o estado pelo catálogo.
- **`validar(x, liberadas)`:** aceita qualquer JSON e devolve uma vestimenta nova: `v` diferente de 1 vira o `PADRAO`, chave a mais some, valor desconhecido ou peça trancada volta ao padrão, número fora de `^[0-9]{1,2}$` vira "sem número". Peça do começo vale sempre. `conferirFormato` é a checagem estrita do servidor.
- **`sortearComPecas(liberadas)` e `sortearDoComeco()`:** só com o que a pessoa tem (pose sempre parada; 1 em 4 sem número).
- **`proximaPeca(estado)`:** primeiro a do próximo nível da Carreira (na ordem da tabela); sem peça de nível trancada, a mais fácil das outras: Aquecimento, 1º bronze, 1ª prata, 1º ouro, ouro nos pênaltis, ouro da Seleção, 5 ouros.
- **`textoDaCondicao`:** "Libera no Titular", "Libera no 1º bronze", "Libera na 1ª prata", "Libera com um ouro nos pênaltis", "Libera com o Aquecimento completo"…
- **`novasPecas(antes, depois)`:** alimenta o "Peça nova no vestiário".

### Servidor
- **Tabela `torcedor_boneco`** (migrações `20261106300000_boneco.sql` e `20261107000000_boneco_em_campo.sql`): `torcedor_id` (chave, some com a conta), `vestimenta` (jsonb, objeto de até 1.024 caracteres), `atualizado_em`, `gravacoes` e `janela_desde` (limite), `em_campo` (boolean, padrão ligado). RLS ligada e política restritiva: o celular não lê, não grava e não chama as funções internas (`boneco_estado`, `boneco_criar`, `boneco_gravar`, `boneco_sessao`, `boneco_em_campo`).
- **O que libera, lido do banco (`boneco_estado`):** nível pelo XP da `carreira_de` (`carreira_partidas` e `carreira_bonus`) e `nivelDe`; medalhas por item pela `medalhas_de` (`lances_gols`: gols, carimbados, vitórias; item `penaltis:<id>` é disputa); Seleção pelo `clube` no catálogo do servidor (item fora do catálogo conta medalha, mas não é da Seleção); aquecimento pela linha `aquecimento` de `carreira_bonus`. O SQL só entrega os dados e grava. Nada do que o celular calcula é aceito: ele manda só a vestimenta que quer vestir.
- **Função `boneco`** (`supabase/functions/boneco/`: `index.ts`, `fluxo.ts`, `pedido.ts`):
  - `{ acao: 'meu_boneco' }` devolve `vestimenta`, `liberadas` (ids, as do começo inclusive), `proxima` (`{ id, condicao }` ou null) e `emCampo` (função antiga não manda: o aparelho trata como ligado). Conta sem boneco ganha na 1ª leitura o sorteado entre as peças do começo (`sortearDoComeco`), gravado por `boneco_criar`; duas leituras ao mesmo tempo ficam com o mesmo. A leitura passa de novo pelo `validar`.
  - `{ acao: 'salvar_boneco', vestimenta }`: pedido acima de 2 KB é recusado com 413 (pelo `Content-Length`, antes de ler, e de novo pelo tamanho lido); `conferirFormato` recusa (400 `formato`) o que não tem exatamente as chaves de `PADRAO`, valor fora do catálogo, número fora de `^[0-9]{1,2}$` ou JSON acima de 512 caracteres. Depois, `validar` troca peça trancada pela padrão, sem erro (`trocou: true` na resposta), e `boneco_gravar` grava e devolve o que gravou.
  - `{ acao: 'em_campo', ligado }` (`boneco_em_campo`): mesma sessão e mesma janela do salvar. **Desligar passa sempre**, mesmo com o limite estourado (é como a pessoa tira o boneco dos desafios dela), e no limite não soma gravação. Conta sem boneco ganha o sorteado antes, para o interruptor ter onde ficar.
  - **Limite:** 30 gravações por hora por torcedor (429 `limite`), em janela fixa a partir da 1ª gravação dela, contado na mesma instrução que grava. O sorteio da conta nova não conta.
  - **Sessão:** o Auth confere a conta e a sessão (`getUser`), e o banco confere de novo o `session_id` do passe em `auth.sessions` (`boneco_sessao`, também `not_after`) antes de ler, sortear ou gravar. Aparelho desconectado recebe 401 `sessao` e não grava. Sem time escolhido não há torcedor: 404 `sem_torcedor`.
- **Desafio, busca na hora, sem guardar no desafio:** `ver_desafio` e `ver_desafio_lances` têm a coluna `boneco` (`boneco_do_desafiante`, pelo `torcedor_id` do desafio), só com o interruptor ligado. Sai só o que vai a campo, montado de novo por `boneco_para_campo`: corpo, pele, cabelo, cor do cabelo, número, testeira, punho, braçadeira e chuteira, cada um conferido contra o catálogo (fora dele, volta ao `PADRAO`). Nunca o id de quem chamou, a camisa, o colete, a faixa, o apito, a pose, o fundo ou a moldura. A conta das peças liberadas não se refaz na leitura (precisaria da Carreira e das medalhas); ela é feita ao salvar, e peça liberada não tranca de novo. Um teste lê as listas do SQL na migração e confere que são exatamente as do catálogo, nos dois sentidos. Conta apagada ou parada: o desafio some junto (cascata).
- **Ordem de publicação:** migração, função `boneco`, site. Site antigo com a migração no ar continua funcionando (ignora a coluna nova).
- **Contas:** "Apagar meus dados" e as contas paradas levam o boneco pela cascata; o zerar da pré-temporada não toca a tabela; `npm run metricas` e o balanço não a leem.
- **Testes:** `supabase/testes/boneco.test.ts` e `supabase/testes/bonecoEmCampo.test.ts` (fluxo da função contra o SQL de verdade); `conferirFormato` em `src/jogo/vestiario.test.ts`.
- **Segurança verificada** (Postgres 17, várias conexões, privilégios padrão da Supabase): `anon` e `authenticated` não leem a tabela nem chamam as funções internas; 20 primeiras leituras simultâneas ficam com um boneco só e todas devolvem o mesmo; 60 gravações simultâneas deixam passar exatamente 30; sem sessão, ler, sortear e gravar recusam.

### Celular
- **Cliente:** `src/servidor/boneco.ts` (`lerBoneco()`, `salvarBoneco(vestimenta)`, `salvarEmCampo`).
- **Conta da tela (`src/jogo/vestiarioTela.ts`, pura, com testes):** `textoDoContador`, `gruposDaAba`, `tocarPeca`, `teclarNumero`, `quadrosDoNumero`, `aoVoltar`, `sortearNaTela`, `folhaDaTrancada`, `linhaDaProxima`.
- **Vestiário (`src/telas/vestiario/`, `src/estilos/vestiario.css`):** `tela.ts`, `folhaTrancada.ts`, `voltar.ts`, `abrir.ts` (Perfil e "Vestir agora"), `fonte.ts` (`ler()` → vestimenta, liberadas e estado com nível, XP, medalhas e Aquecimento; `salvar(v)` → a vestimenta gravada), `fonteServidor.ts` (padrão: vestimenta, liberadas e próxima vêm do `meu_boneco`; nível, XP e medalhas, só para a folha, de `minha_carreira` e `minhas_medalhas`, lidos juntos; a Seleção da folha sai do id do item `selecao-…`, e o que libera de verdade continua no servidor) e `fonteFalsa.ts`. A rota `#vestiario` entra por `import()`, fora do bundle inicial.
- **Cópia de exibição (`src/telas/bonecoDoAparelho.ts`, no bundle inicial, pequeno):** guarda a última vestimenta que o servidor devolveu, só para mostrar o busto sem esperar a rede; toda leitura troca a cópia, e nada dela volta para o servidor. Guarda também as peças já vistas e se a pessoa já abriu o vestiário. O desenho, o catálogo e a leitura vêm por `import()` (`bonecoPintar.ts`). Cores pelo time do coração de agora. Uma conferência com o servidor por abertura do app.
- **Peça nova (`src/jogo/pecaNova.ts`, puro, e `src/telas/pecaNovaBloco.ts`):** o "depois" é o que o resultado já lê (carreira e, nos Lances e Pênaltis, medalhas, na mesma leitura do "Rumo às medalhas"); o "antes" é o XP visto antes da partida e as medalhas de depois menos o que a partida deu. Sem XP visto antes, o nível não anuncia. O Aquecimento fica igual nos dois lados. Tira as peças que o aparelho já viu.
- **Desenho (`src/telas/bonecoMontavel.ts`, `bonecoFundos.ts`):** regras e tamanhos em `docs/bonecos.md`, seção 6. O boneco é o "Silhueta premium Plus" (`bonecos.md`, seção 1); o colete e a faixa leem as medidas da camisa de `b.medidas` (por fora ou por dentro, `Aparencia.barra`, escolha no vestiário = H03b), a testeira recorta na forma da cabeça (`formaDaCabeca()`) e o busto usa a pose reta (`POSES_DE_FRENTE.busto`). O vestiário e o campo usam as mesmas peças (`camadasDeCampo`, `corDoPunho`, `comChuteiraDe`, `escreverNumero`). O número em campo é um sprite (`criarSpriteDoNumero`), desenhado uma vez quando a Anton carrega; até lá, camisa lisa.
- **Em campo:** `src/telas/bonecoEmCampo.ts` (conta pura, com testes): `batedorEmCampo(vestimenta, ligado, roupaDaCena, coresDoCoracao)` devolve a aparência, a roupa da cena (só a chuteira trocada) e as peças de campo já calculadas (número e a cor dele pelo `corDeTexto` da camisa da cena, testeira, punho, braçadeira, chuteira dourada), ou null para sortear; `vestimentaDeCampo(x)` transforma o `boneco` do servidor numa vestimenta segura. Cola em `src/telas/bonecoEmCampoCena.ts`: `bonecoDaPessoaEmCampo(roupaDaCena)` e `bonecoDeQuemChamouEmCampo(vestimenta, roupaDaCena, coresDoTimeDele)`. O Boneco carrega as próprias camadas (`b.camadas`) e sabe virar para o replay (`b.virar()`: número desvirado, braçadeira no braço esquerdo do boneco); `cena.ts` e `cena3d.ts` não mudaram.
- **Interruptor:** `src/telas/bonecoEmCampoGuardado.ts` (chave `gdt:boneco-em-campo`, ausente = ligado), fora do bundle inicial; o Perfil grava no aparelho na hora e chama `salvarEmCampo`, voltando a chave com aviso se o servidor recusar. Toda leitura do `meu_boneco` sobrescreve a cópia.
- **Desafio:** `partida.ts` pede o `verDesafio` em paralelo com a `nova-partida`, sem esperar: se o boneco de quem chamou chega depois do apito, entra no começo da próxima cobrança, nunca no meio. Bustos do placar em `src/telas/bustosDoDuelo.ts` (40 px; o de quem chamou nas cores do time dele, com fundo e moldura padrão); o convite da Home pinta o busto por `pintarBoneco` (`deCampo`, `cores`, `aoLado`).

## Em desenvolvimento
- `?vitrineBoneco` (com `&so=`, `&estado=` e `&time=`): vitrine das peças. `&barra=dentro` (aqui, no vestiário falso e em campo) mostra a camisa por dentro do calção.
- `?vestiarioFalso` com `&nivel=estreante|reserva|titular|craque|idolo|lenda`, `&ouros=N`, `&aquecido`, `&erroAoSalvar`, `&aba=`, `&time=` e `&semMovimento`.
- `?homeFalsa` mostra o boneco na Home e no Perfil (com `&nivel=`, que também move a Carreira falsa) e abre o vestiário com a fonte falsa; os jogos falsos (`?lancesFalsos`, `?penaltiFalso`, `?provaFalsa`, `?diaFalso`) também. `&pecaNova` força o bloco (990 → 1.010 XP e, nos Lances, um 1º bronze), sem olhar nem marcar as vistas.
- Em campo, em `?penaltiFalso`, `?lancesFalsos` e `?homeFalsa`: `&boneco=<variação>` (cabelos, peles, `n0`–`n99`, `sn`, peças, `tudo` e `foras`), `&semBoneco`, `&emCampo=0`, `&emCampoFalha`, `&chamouBoneco=<variação>`, `&chamouSemBoneco`, `&chamouTime=<id>`, `&uniforme=1|2` e `&replayFalso` (lista no topo de `src/dev/bonecoDeCampoFalso.ts`).
- Prints 390 × 844 em `docs/auditoria/2026-11-05/` (`boneco`, `vestiario`, `boneco-telas`) e `docs/auditoria/2026-11-06/boneco-em-campo`.
