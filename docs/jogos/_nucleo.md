# Guerra de Torcidas — documento do jogo

> Nome provisório. Fonte da verdade do projeto: toda decisão nova entra aqui.

> Detalhes: `docs/rankings.md` (rankings e regras de justiça), `docs/narrador.md` (frases), `docs/visual.md` (direção visual), `docs/bonecos.md` (bonecos), `docs/casa.md` (Casa do [time]). Ideias ainda não decididas ficam no backlog do projeto no Claude.

## 1. A ideia em uma frase

Minigames de futebol de 30 segundos em que **cada ponto que você faz vai para o placar da sua torcida**, num ranking ao vivo contra os rivais.

## 2. Pilares (o que nunca negociamos)

1. **Partida curta.** Uma rodada cabe numa fila de padaria (30 s a 1 min).
2. **Tribal.** Você não joga por você, joga pelo seu time. Ver o rival na frente é o motor.
3. **Zoeira.** Tom de resenha: narrador exagerado, provocação ao rival, nunca ofensa a pessoas ou grupos.
4. **Feito para WhatsApp.** O link abre direto no navegador do celular, sem cadastro e sem loja de app. Todo resultado vira um card pronto para mandar no grupo ou postar nos stories. Quem quiser pode instalar o jogo na tela inicial (PWA, desde 25/10/2026): mesmo site, sem loja. **Aviso de domingo (push, desde 25/10/2026):** só com opt-in, oferecido depois de um bom momento (vitória que valeu, Time do Dia acertado), no máximo a cada 14 dias e nunca de novo se a pessoa recusou no navegador; **um aviso por semana**, domingo 18h, com a situação da torcida e do rival, sem urgência (texto em `src/jogo/avisos.ts`; seção 13). **Só para 18+** (seção 13). **Sininho 🔔 no topo da tela inicial** (desde 26/10/2026): liga, desliga ou explica por que o aparelho não recebe (iPhone fora do app instalado, navegador embutido do WhatsApp/Instagram, notificação bloqueada); aceso quando o aviso está ligado. **Testado em 25/10/2026:** chega no Google Chrome (computador e Android, inclusive como app instalado); no **Opera/Opera GX** a inscrição funciona mas o aviso não chega, e o sininho avisa isso; no iPhone, só com o jogo instalado na tela inicial. Nenhum dado pessoal: só o endereço de entrega do navegador.
5. **Cresce por minigames.** Os minigames mudam; a torcida, o ranking e as ligas ficam e acumulam.
6. **Zero aposta.** Nenhum minigame envolve dinheiro, prêmio em dinheiro, odds ou qualquer coisa que pareça casa de aposta. Nem anúncio de aposta.
7. **Justo.** Título se ganha por média, não por tamanho de torcida; ninguém compra vantagem; evento não distorce o ranking.

## 3. Torcidas (times)

### Times oficiais
- Os clubes da Série A 2026, mais "Outro time".
- **Só nome, cores e artigo (o/a).** Nada de escudo, uniforme oficial, mascote, hino ou foto de jogador. O artigo serve para o narrador acertar "do"/"da", "pro"/"pra".
- **Camiseta lisa:** os batedores vestem uma camiseta lisa nas 2 cores do time, sem escudo, listras, patrocínio ou qualquer desenho que imite a camisa oficial. Há o **uniforme 1** (camiseta na cor 1) e o **uniforme 2** (cores invertidas), sorteado a cada partida. Se os dois times em campo ficarem parecidos, o adversário troca de uniforme (decidido em 19/10).
- **Card do time (tela de escolha e onde mais o time aparecer em bloco), decidido em 20/10: "faixa de placar".** Cor 1 cheia, sem transparência; embaixo, uma faixa reta na cor 2 (cerca de 1/4 da altura); nos clubes de três cores, um filete da 3ª cor separando as duas. Nome em Barlow Condensed, caixa alta, cor de texto pelo `corDeTexto`. O mesmo desenho para todos os clubes: **nenhum padrão que imite a camisa** (listras na direção da camisa, faixa diagonal, estrelas ou outro elemento de escudo). Quem diferencia os clubes é a cor e o nome. Substitui as listras diagonais translúcidas, que deixavam as cores com cara de pastel.
- **Única exceção (decidida em 21/10):** o manto desenhado no bloco de cores da **Casa do [time]**, com o padrão tradicional (listras, aros, faixa) e sem escudo, símbolo, patrocínio ou fornecedor (`docs/casa.md`, seção 5). Card do time, bonecos e cards de compartilhamento continuam como acima.
- **Goleiros:** camiseta lisa num tom forte de goleiro (amarelo, verde-limão, ciano, rosa ou lilás), escolhido para contrastar com os dois times e com o outro goleiro.
- **Jogadores fictícios:** nenhum boneco imita jogador real, nem por número, tom de pele ou cabelo (direito de imagem; decidido em 19/10). **Única exceção (decidida pelo Kauê em 31/10/2026, ciente do risco de imagem):** nos Lances do Jogo em que quem bateu foi o goleiro (hoje só o Gol 100), o batedor vai de goleiro, porque o fato do lance é esse. Continua sem nome, número, rosto ou cabelo da pessoa; as cores são as do dia, em roupa lisa (Gol 100: camisa dourada, calção preto e meião branco, pela foto do jogo). **Segunda exceção (decidida pelo Kauê em 06/11/2026, C5, Rota B, "você no lance", ciente do risco de imagem, como a do Gol 100):** o batedor da pessoa é o boneco montável dela (seção 14.5, "Boneco em campo"), **com o número que ela escolheu**, nas costas em campo e na frente no replay. A combinação de número, pele e cabelo é escolha da pessoa, nunca do jogo; os bonecos sorteados continuam sem número. Título do lance, card e narrador continuam sem nome de pessoa.
- **Uniformes nos Lances (decidido em 31/10/2026):** cada lance veste os dois times dele, não o time do coração: batedor nas cores do clube do lance, barreira e goleiro nas cores do adversário de verdade, sempre em camiseta lisa ().
- Cada time pode ter um **rival** cadastrado (o clássico). Sem clássico, vale a regra da seção 8.

| Time | Artigo | Rival | 3ª cor (filete do card) |
|---|---|---|---|
| Athletico-PR | o | Coritiba | — |
| Atlético-MG | o | Cruzeiro | — |
| Bahia | o | Vitória | branco |
| Botafogo | o | Flamengo | — |
| Bragantino | o | sem clássico | — |
| Chapecoense | a | sem clássico | — |
| Corinthians | o | Palmeiras | — |
| Coritiba | o | Athletico-PR | — |
| Cruzeiro | o | Atlético-MG | — |
| Flamengo | o | Fluminense | — |
| Fluminense | o | Flamengo | branco |
| Grêmio | o | Internacional | branco |
| Internacional | o | Grêmio | — |
| Mirassol | o | sem clássico | — |
| Palmeiras | o | Corinthians | — |
| Remo | o | sem clássico | — |
| Santos | o | Corinthians | — |
| São Paulo | o | Palmeiras | preto |
| Vasco | o | Flamengo | — |
| Vitória | o | Bahia | — |

(O rival não precisa ser recíproco: o Botafogo provoca o Flamengo, e o Flamengo provoca o Fluminense.)


### Apelido
- Opcional, até 20 caracteres, passa por um filtro simples de palavras (lista no código) antes de ser gravado no servidor.
- **Desde 06/11/2026, nomes e apelidos de jogadores famosos estão bloqueados** (Seleção, elencos da Série A e ídolos dos 20 clubes; migração `20261106100000_apelidos_famosos.sql`), porque o boneco montável tem número livre e "boneco + número + apelido famoso" imitaria uma pessoa real. Nome comum sozinho (Gabriel, Lucas, Ronaldo) passa; entra o nome com sobrenome ou o apelido conhecido. Apelidos já gravados não mudam; o `#admin` apaga se for o caso.
- **Decidido em 06/11/2026 (J26, jornadas simuladas, PR #139):** o card só mostra o apelido **depois que o servidor o aceitou** (o filtro de famosos e palavrões mora lá). O aparelho guarda `apelidoConferido` em `gdt:prefs`: o apelido digitado na escolha do time nasce não conferido (`false`) e vira conferido quando `sincronizarTorcedor` grava no servidor ou quando o aparelho adota o apelido da conta. Até lá, e sem internet, o card sai sem apelido ("Torcedor do [time]", como já saía sem apelido). Quem já tinha apelido antes da regra conta como conferido, para ninguém perder o nome no card. Vale em todo card e texto de compartilhar (resultados, medalha, troféu, Crava e Palpites). A regra pura é `src/jogo/apelidoConferido.ts`; o resto do jogo (narrador na tela, desafio) segue lendo o apelido do aparelho.
- **No MVP nenhum ranking público mostra apelido.** Ele aparece só no card que o próprio jogador compartilha e no desafio que ele manda. Ranking individual (Craque do Dia, Craques da torcida) só depois da moderação da fase 2.

### Troca de time ou cidade
- **Livre por enquanto**, para o pessoal experimentar. Os pontos já feitos ficam onde foram feitos.
- Reavaliar antes da temporada 2027 (a proposta inicial era 1 troca a cada 30 dias).

### Times criados pelos jogadores (fase 2)
- Qualquer um cria um time: cidade, bairro, várzea, escola, turma, empresa, grupo de amigos, outras rivalidades.
- Campos: nome, artigo (o/a), 2 cores, tipo (cidade, várzea, escola, empresa, amigos, outro), cidade/UF opcional.
- Gera link de convite ("entra no time e defende a gente").
- **Fora do lançamento:** partidos políticos e rivalidades políticas (toxicidade e regras eleitorais). Reavaliar quando a moderação estiver rodando.

### Moderação (obrigatória antes de liberar times criados)
- Filtro de palavras em nomes de times e apelidos.
- Proibido: nome de pessoa específica, ofensa racista, homofóbica (incluindo gritos de arquibancada), xenofóbica, misógina ou religiosa.
- Botão "denunciar"; time com X denúncias fica oculto até revisão.
- Painel simples de revisão para o administrador.
- **Escolas:** só nome da escola e da turma, nunca nome de aluno. Sem chat aberto entre jogadores.
- Dados mínimos (LGPD): login anônimo, sem e-mail ou telefone obrigatórios.

## 4. Ligas e campeonatos combinados (fase 2)

- Uma **liga** é um campeonato privado com times dentro. Exemplo: "Colégio X" com as turmas 1ºA, 1ºB, 2ºA…
- Criada por um organizador, com código ou link de convite.
- Dentro da liga aparecem só os times dela, com ranking próprio e divisões próprias (mesma regra da seção 5).
- Os pontos continuam contando também para o time oficial e para a cidade de cada jogador (ele defende o 1ºB, o Corinthians **e** Caraguatatuba, por exemplo).


## 7.4 Casa do [time] (história dos clubes)

> Desenho aprovado em 21/10/2026, a partir da proposta "Galeria dos Clubes". **Liberada em 21/10, com o upgrade dos pênaltis fechado (Lances do Jogo no ar); dados em rascunho em `dados/casa/`.** Detalhe completo: `docs/casa.md`; plano de publicação: `docs/casa-publicacao.md`.

- Uma página por clube da Série A 2026 ("Casa do Flamengo", "Casa da Chapecoense"): estádio, sala de troféus, livro de recordes, cores e manto. Só fatos com fonte, revisados por uma segunda sessão, como o quiz.
- **Vitrine, não minigame:** não dá pontos, XP nem selo. A ligação com o jogo é só por navegação (Home, Ranking, Time do Dia depois que o dia acaba).
- Competições pelo nome real da entidade (FIFA, CONMEBOL, CBF, federação), **sem patrocinador**. Títulos: na Casa do clube vale o lado da torcida (o que o clube reivindica conta no total dele, com nota neutra do que a entidade reconhece); fora da Casa vale a lista oficial.
- O nome "Galeria" continua sendo da **Galeria de Troféus** da torcida no jogo (seção 5), que vira a prateleira "Aqui no jogo" da Casa quando existir.
- Estático, fora do bundle inicial, sem servidor (única exceção: a contagem de cliques do "Seja sócio").
- **Tela no ar desde 25/10/2026** (`#casa`, `#casa/<id>`): entra pela Home (seção com estádio e troféus, abre a do seu time; sem time, o índice), pelo Ranking (tocar numa torcida) e pelo fim do Time do Dia (só depois que o dia termina). Clube sem a linha de clube revisada fica "em breve" no índice.
- **"Seja sócio" (decidido em 30/10/2026):** bloco na Casa de cada clube com link para o programa oficial de sócio torcedor. Igual para os 20 clubes, com o nome do programa só como texto (sem logo, escudo ou imagem). Link direto para a página do programa, nunca para a home do clube; se a página promover aposta, o clube fica sem o bloco até mudar. Ser sócio não dá pontos, XP nem selo. Aviso de saída antes de abrir. Link com `utm_source=guerradetorcidas`; cliques contados no servidor por clube e por dia, sem dado pessoal. Só link gratuito: nada de afiliado ou comissão. Curadoria como os fatos da Casa: só `revisada` vai ao ar. **Só para 18+ (decidido em 01/11/2026):** mesma regra do "Apoie o jogo" (seção 13); quem não respondeu a triagem não vê.

## 7.5 Monetização (decidido em 30/10/2026)

> Proposta e comparação das opções: `docs/monetizacao.md`.

- **"Apoie o jogo":** página com Pix e link de apoio mensal (APOIA.se, campanha contínua). Quem apoia não ganha pontos, XP, selo nem nome público. Botão discreto no rodapé da Home, na aba Conquistas e na tela de resultado só depois de um bom momento (vitória que valeu, recorde, Time do Dia acertado), no máximo uma vez por semana por aparelho; nunca no meio da partida nem no card. Fica desligado até a conta da plataforma existir, a chave Pix estar definida e a consulta ao advogado sobre o ECA Digital acontecer.
- **"Oferecido por":** aceito, com 1 ou 2 marcas vendidas direto, sem rede de anúncios nem rastreio, num selo discreto no rodapé ou no card com o texto "oferecido por"; nunca dentro da partida. Proibidos: aposta (inclusive "fantasy" com dinheiro), bebida alcoólica, cigarro, vape e outros produtos de vício. Só depois de ter audiência.
- **Cosméticos pagos:** adiados; quando vierem, só com login e com estrutura robusta de pagamento, entrega e reembolso.
- **Clubes:** neutralidade mantida; ninguém paga nem ganha destaque.
- **Prêmio em dinheiro ou produto:** fora de qualquer evento ou ranking.
- **Como está no código (30/10/2026):** a página `#apoie` e os botões existem, atrás do interruptor `apoio_ligado` em `src/config/apoio.ts` (começa desligado; link e chave Pix vazios). Desligado, ou para quem não marcou 18+ (seção 13), nenhum botão aparece e `#apoie` volta para a Home. A regra de "uma vez por semana" no resultado fica guardada no aparelho (`gdt:apoio-oferta`); a Home e a aba Conquistas têm o botão fixo no rodapé. Lógica em `src/jogo/apoio.ts`.

## 8. Tom e zoeira

- **Narrador:** exagerado, rádio de domingo. Ex.: "É CAVADINHAAAA! Que categoria, que deboche!", "Pegou! O goleiro tava com o almoço pago!", "Isolou! Foi pra Marte, a bola tá orbitando!"
- **Banco de frases:** `docs/narrador.md` (versão 1.3, com etiquetas para a frase combinar com o lance e frases do Crava a Rodada). Frase nova entra lá e passa pelo checklist de tom do próprio arquivo.
- **Narrador com voz:** formato definido em 19/10 (só os gritos curtos em áudio; vozes Narrador e Narradora, mais a opção Só efeitos; nunca imitar narrador real), mas **fica no backlog** por enquanto (decidido em 19/10). A lista de gritos está no backlog do projeto no Claude (`gritos.md`).
- **Neutro de gênero:** o narrador fala do lance, não da pessoa ("Cavou!", não "Ele cavou!").
- **Provocação ao rival** (só ao time, nunca à pessoa): "Sua torcida tá 300 pontos atrás do [rival]. Vai deixar?"
- **Quem é o rival:** o clássico da tabela da seção 3. Sem clássico, o rival é o time logo acima no ranking da semana da sua divisão (ou logo abaixo, se for o líder); antes das divisões, no ranking geral (seção 5). Quem escolheu "Outro time" recebe só provocação de cidade.
- **Zoeira de cidade:** só sobre posição no ranking. Nada de sotaque, origem, economia, "cidade pequena" ou estereótipo de quem mora lá.
- **Notificações de semana:** só informam, sem urgência nem chamada para voltar (seção 13 e `docs/narrador.md`, seção 13).
- **Limite:** zoeira com o time e com a situação, nunca com raça, orientação, gênero, religião, origem, corpo, deficiência ou pessoa real (jogador, técnico, narrador). Nada de bordão de narrador real nem trecho de música.

### Nomes reais (decidido em 19/10/2026)
- **Pode:** citar nomes de jogadores, técnicos e outras pessoas reais do futebol em **perguntas e respostas factuais dos jogos de conhecimento** (quiz e desafios diários): gols, títulos, recordes, transferências, escalações históricas.
- **Pode também (21/10):** nas **fichas factuais da Casa do [time]** (artilheiros, recordistas em jogos), só nome + número + data de referência + fonte. Todo o "Não pode" abaixo continua valendo.
- **Pode (decidido em 21/10):** na **ficha** de um lance histórico (Lances do Jogo e disputas históricas de pênaltis), o texto que conta o que aconteceu cita o nome como fato, do jeito que as notícias públicas contam, com fonte guardada junto. Ex.: "27/03/2011, Paulistão: Rogério Ceni marca o 100º gol da carreira, de falta, contra o Corinthians."
- **Não pode no lance:** nome, apelido ou número da camisa no **título**, no **card** ou texto de compartilhar, no **narrador** e no **boneco** (que continua fictício, sem o número do jogador real). O título conta o fato: "Gol 100 do goleiro", nunca "Gol 100 do Mito 01".
- **Não pode:**
  - imagem, foto, voz, caricatura ou boneco que imite pessoa real (os bonecos continuam fictícios);
  - zoeira, apelido pejorativo ou opinião sobre a pessoa (a zoeira continua sendo com o time e a situação);
  - vida pessoal, família, saúde, religião, política, polêmica, processo ou crime;
  - atletas menores de idade (categorias de base);
  - usar nome de pessoa real para divulgar o jogo (anúncio, post, card de convite).
- Toda pergunta ou ficha com nome real precisa de **fonte verificável** guardada junto.
- Fantasy com jogadores reais (escalar time) continua fora (backlog, seção 7).
- **Classificação livre:** sem palavrão, bebida, aposta ou violência em nenhum texto do jogo. Escolas entram na fase 2.
- **Derrota zoa, mas aponta a saída:** revanche, desafio, "os pontos contam igual pro seu time".

### Nomes candidatos
Guerra de Torcidas (provisório) · Arquibancada · Resenha FC · Rivalzão · Bate Contra Mim (nome do minigame) · Treta FC · Torcida Braba

## 9. Visual

- Direção **"Transmissão de domingo"** aprovada em 18/10/2026: placar de TV inclinado, grito do narrador como adesivo na cor do time, arquibancada nas cores do time, campo em perspectiva.
- Detalhe, tela a tela, e ordem de implementação: `docs/visual.md`.
- **Cards de time: "faixa de placar"** (decidido em 20/10; seção 3 e `docs/visual.md`).
- Home nova (decidida em 31/10/2026): arquibancada nas cores do time com luz pelo horário, cabo de guerra com a sua posição, botão 'Jogar agora', cards dos jogos com desenho e estado vivo, giro da semana e avatar que abre a aba Perfil. Detalhe em docs/visual.md, seções 3 e 3.1.
- Card de compartilhamento 'Telão do estádio' (31/10/2026), detalhe em docs/visual.md.
- **Bonecos:** estilo "Silhueta premium" (aprovado em 19/10): formas chapadas sem contorno, camiseta lisa nas cores do time (uniforme 1 ou 2), goleiro num tom forte que contrasta com os dois times, tons de pele e cabelos variados, homens e mulheres. Cada lado tem 5 batedores diferentes (um por cobrança) e 1 goleiro, sorteados a cada partida. Detalhe em `docs/bonecos.md`.

## 10. Roadmap

| Fase | Conteúdo |
|---|---|
| **1. MVP** ✅ pênaltis concluído em 19/10, em teste com amigos | Pênaltis com desempate, times oficiais com artigo e rival, ranking da semana (campeão pelos 30 melhores + Maior torcida), desafio por link, card de resultado com placar em emoji, direção visual nova |
| **1.5 Logo depois do MVP** | Crava a Rodada no ar desde 20/10, somando desde a 32ª na pré-temporada, até a 38ª (2/12). Depois (decidido em 26/10, `docs/propostas/`): carreira; fechamento da semana gravado; cidade como segunda camisa e Série A e Série B mensais, testadas na pré-temporada; Galeria; ranking de 52 semanas na 1ª temporada; anti-trapaça completo antes de divulgar. **Casa do [time]** (seção 7.4; plano em `docs/casa-publicacao.md`), liberada com o upgrade dos pênaltis fechado |
| **2. Comunidade** | Times criados, ligas e campeonatos combinados (com ranking entre amigos com apelido), moderação, Copa das Torcidas |
| **3. Mais minigames** | Prova de Boleiro (seção 7.1) e Time do Dia (seção 7.2) construídos em 19–20/10, somando na pré-temporada. Lances do Jogo (seção 7.3) aprovado em 21/10: motor primeiro, depois catálogo com fontes, tela, servidor, Conquistas e, por fim, os Pênaltis como sessão dos Lances. Depois: Embaixadinha (com chinelo, laranja e bola murcha) |
| **4. Coleção e resenha** | Álbum de figurinhas com jogadores fictícios e trocas, Técnico por Um Jogo, Pelada de Rua |

## 11. Como saber se está funcionando

- **Convites por jogador:** quantos amigos cada um traz (meta: mais de 1).
- **Volta no dia seguinte e em 7 dias.**
- **Partidas por visita.**
- **Desafios aceitos / desafios enviados.** Cuidado: o desafio nasce sozinho a cada partida, então "enviado" ainda é "gerado". Só vira envio de verdade quando o toque em compartilhar for contado (proposta em `docs/propostas/funil-do-desafio.md`).
- Enquanto não houver ferramenta de métricas, os números saem do próprio banco (partidas, desafios e torcedores), por um relatório simples: `npm run metricas` (só leitura; jogador = quem fechou ao menos 1 partida; "voltou em 7 dias" = jogou em algum dos 7 dias seguintes à estreia; "entrou por link" = a 1ª partida foi desafio de outra pessoa).


## 12. Técnica (resumo)

- Front-end estático (Vite + TypeScript, canvas para o jogo), leve e rápido no celular.
- Hospedagem: GitHub Pages em `torcida.kauewalter.com.br` (repositório próprio, separado do site).
- Dados: Supabase (login anônimo, Postgres com regras de acesso, ranking ao vivo, funções no servidor para validar partidas).
- Supabase: projeto `guerra-de-torcidas` (ref `ybfeqykdnqmnufrgtnoc`), região São Paulo, plano Free durante o desenvolvimento.
- Chaves: o front-end usa a URL do projeto e a **publishable key** (`sb_publishable_…`). As funções no servidor usam a **secret key** (`sb_secret_…`), só como segredo das funções. As chaves antigas `anon` e `service_role` estão sendo descontinuadas pela Supabase até o fim de 2026: não usar.
- Como a URL e a publishable key são públicas, ficam versionadas no repositório (o build do GitHub Pages precisa delas). Nada secreto entra no repositório.
- **Antes de divulgar:** CAPTCHA (Cloudflare Turnstile) no login anônimo (ligado em 02/11/2026), limpeza periódica de usuários anônimos inativos (6 meses, migração `20261103000000_contas_paradas.sql`, no ar desde 02/11/2026), anti-trapaça completo (pênaltis lance a lance desde 27/10, com as cobranças do desafio no servidor), ranking que aguente muitos jogadores (no ar desde 02/11/2026: quem fecha partida só anota a semana numa fila, e uma rotina a cada minuto refaz o ranking com a mesma conta, regrava só o que mudou e manda um aviso por semana para as telas; o ranking mexe em até 1 minuto, e a tela de resultado mostra "Subiu de 5º pra 3º" quando a tabela nova chega) e decidir sobre o plano Pro (o Free pausa o projeto depois de 1 semana sem uso).
- **Rotina contra a pausa do plano Free:** um agendamento no GitHub Actions faz uma consulta leve ao banco a cada 2 dias. Enquanto o projeto estiver no Free, isso evita a pausa por 7 dias sem uso. O GitHub desliga agendamentos de repositório público depois de 60 dias sem commit; se isso acontecer, o GitHub avisa por e-mail e basta reativar. Arquivo: `.github/workflows/manter-supabase.yml` (a cada 2 dias às 09h de Brasília e pelo botão "Run workflow"): lê 1 linha do ranking com a publishable key e falha se a resposta não for 200.
- **Zerar pré-temporada:** `npm run zerar-pre-temporada` apaga partidas, desafios e ranking (mantém times e torcedores; recordes pessoais zeram junto). Mostra as contagens, lembra de rodar o balanço antes e só apaga depois de digitar ZERAR.
- **Sessão de usuário apagado:** se o login salvo no aparelho não existir mais no servidor, o jogo sai. O aparelho que já tinha torcedor esquece time, apelido e faixa e volta à escolha do time, com aviso (desde 03/11/2026, seção 14.1); o que nunca teve faz um login anônimo novo.
- **Contas e aparelhos:** uma carreira em vários aparelhos pelo código do torcedor, sem login (seção 14.1).
- **CAPTCHA (decidido em 27/10/2026):** Cloudflare Turnstile no modo escondido, **uma vez por aparelho**: só no primeiro login anônimo (a sessão fica salva) e no login do `#admin`, pelo suporte a CAPTCHA do próprio Supabase. Continua sem cadastro: o login anônimo segue somando pontos. Se a verificação falhar, o jogo roda "sem valer pontos", como sem internet. Liga quando a chave pública do site estiver em `VITE_TURNSTILE_SITE_KEY` (`.env.production`) **e** o CAPTCHA estiver ligado no painel do Supabase, nessa ordem; vazia, fica desligado.
- DNS: CNAME `torcida` no Hostgator, feito manualmente pelo Kauê.
- **Lista de cidades:** municípios do IBGE num arquivo estático (nome, UF, código IBGE), carregado só na tela de escolha.
- **Times:** `src/dados/times.ts` guarda id, nome, cores (2, mais a 3ª opcional do filete do card), artigo e rival (id do outro time ou vazio), conforme a tabela da seção 3.

## 13. Proteção de menores — ECA Digital (decidido em 31/10/2026)

- **O jogo inteiro é seguro para menores**, não só uma área: as regras abaixo valem para todas as telas e para o que vier depois.
- **Triagem de faixa etária:** uma vez por aparelho, antes da 1ª partida, neutra, com três botões (menos de 16, 16 ou 17, 18 ou mais). Guarda só a faixa e não usa para mais nada.
- **Só para 18+:** oferta de push, "Apoie o jogo", "Oferecido por" e o "Seja sócio" da Casa (este desde 01/11/2026).
- **Push sem urgência:** o aviso de domingo só informa a situação da torcida e do rival na semana.
- **Sem sequência de dias:** nem na Carreira, nem no Time do Dia, em nenhuma tela, card ou frase do narrador.
- **"Sou maior de 18 ou responsável"** antes do Pix e do link de apoio.
- **Aviso de saída em todo link externo.**
- **Página `#termos` e botões "Ver meus dados" e "Apagar meus dados".**
- **Aviso de mudança dos Termos** na Home, sem bloquear o jogo (decidido em 01/11/2026).
- **Apelido ofensivo:** o `#admin` pode apagar um apelido que já passou pelo filtro (decidido em 01/11/2026).


## 14. Contas e aparelhos


### 14.2 Auditoria visual e blocos de informação
- Rota escolhida (03/11/2026): A, 'Grafismo de TV'. Placas quase pretas com cantos arredondados (12 px) e sombra suave sobre o gramado, números em Anton, rótulos em faixa inclinada, cor do time como filete no topo dos blocos. Tudo em variáveis CSS (cores, raios, sombras, espaços), sem biblioteca nova.
- Correções da auditoria de 03/11: aviso de pré-temporada vira um selo único no cabeçalho (toque abre a explicação); amarelo só no botão principal, um por tela; abas de 2º nível menores e escuras; resultado padrão nos 5 jogos; números como bloco (número grande + rótulo curto), não como frase; título de tela igual em todas (Anton); telas vazias e de erro com convite e 'tentar de novo'; texto pequeno com contraste de pelo menos 4,5:1.
- Perfil: cabeçalho isolado, apelido em destaque e 'Torcedor do [time]' embaixo; sem apelido, o destaque vira 'Escolha seu apelido'. Avatar maior, com espaço para o boneco montável (14.5). Carreira, posições da semana e recordes em blocos separados.
- Movimento e vibração: continuam as molas e a vibração que já existem, respeitando 'movimento reduzido' e o botão 'Vibração'. Entram vibrações no acerto da Prova e no fim da morte súbita.
- Fora: nenhum espaço, aviso ou gatilho de compra em lugar nenhum (7.5, 13 e 14.5).
- **Como está no código (03/11/2026):** blocos em `src/telas/blocos.ts` e `src/estilos/blocos.css`; resultado padrão em `src/telas/resultadoPadrao.ts`, usado pelos Pênaltis, Lances (Faltas e Cara a cara), Prova e Time do Dia. O Crava segue a mesma ordem dentro da própria tela, porque o resultado da rodada fica junto dos palpites. O fim do Time do Dia leva aos Lances do Jogo. Detalhe visual em `docs/visual.md`, seção 4.6.

