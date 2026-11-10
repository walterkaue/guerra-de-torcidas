# Guerra de Torcidas — documento do jogo

> Nome provisório. **Fonte da verdade do projeto: as regras de hoje, curtas.** O detalhe de cada parte mora no doc do módulo (tabela abaixo); quando um doc de módulo discordar deste, vale este.
> **Decisão nova:** muda a regra aqui ou no doc do módulo, dizendo só como é agora (sem "até tal dia era…"), e põe uma linha em `docs/decisoes.md` com a data. A fila de trabalho está em `docs/proximos-passos.md`; ideias sem decisão, em `docs/backlog.md`.

## Onde está cada coisa

| Assunto | Doc |
|---|---|
| Rankings, semana, temporada (Série A/B), cidades, 52 semanas, Galeria, Carreira, balanço | `docs/jogos/rankings.md` |
| Lances do Jogo: pênaltis (disputas históricas), faltas, cara a cara, desafio, troféus, catálogo | `docs/jogos/lances.md` |
| Motor dos pênaltis, desempate, anti-trapaça lance a lance, desafio por link | `docs/jogos/penaltis.md` |
| Prova de Boleiro e Time do Dia | `docs/jogos/conhecimento.md` |
| Palpite da Rodada | `docs/jogos/crava.md` |
| Contas e aparelhos: código do torcedor, primeiro acesso, proteção de menores no código | `docs/jogos/contas.md` |
| Aquecimento e dicas na hora do erro | `docs/jogos/aquecimento.md` |
| Boneco montável, vestiário e boneco em campo | `docs/jogos/boneco-montavel.md` |
| Cards personalizáveis (Telão, Só o placar, Pôster) | `docs/jogos/cards.md` |
| Casa do [time] | `docs/casa.md` (publicação: `docs/casa-publicacao.md`) |
| Frases do narrador | `docs/narrador.md` |
| Direção visual e bonecos sorteados | `docs/visual.md`, `docs/bonecos.md` |
| Termos × jogo | `docs/termos-x-jogo.md` |
| Divisão de trabalho entre modelos | `docs/orquestracao.md` |
| Histórico de decisões | `docs/decisoes.md` |

## 1. A ideia em uma frase

Minigames de futebol de 30 segundos em que **cada ponto que você faz vai para o placar da sua torcida**, num ranking ao vivo contra os rivais.

## 2. Pilares (o que nunca negociamos)

1. **Partida curta.** Uma rodada cabe numa fila de padaria (30 s a 1 min).
2. **Tribal.** Você não joga por você, joga pelo seu time. Ver o rival na frente é o motor.
3. **Zoeira.** Tom de resenha: narrador exagerado, provocação ao rival, nunca ofensa a pessoas ou grupos.
4. **Feito para WhatsApp.** O link abre direto no navegador do celular, sem cadastro e sem loja de app. Todo resultado vira um card pronto para mandar no grupo ou postar nos stories. Quem quiser instala o jogo na tela inicial (PWA): mesmo site, sem loja.
5. **Cresce por minigames.** Os minigames mudam; a torcida, o ranking e as ligas ficam e acumulam.
6. **Zero aposta** (seção 3).
7. **Justo.** Título se ganha por média, não por tamanho de torcida; ninguém compra vantagem; evento não distorce o ranking; a dificuldade é igual para todos no mesmo dia.

## 3. Zero aposta (linha vermelha)

- Nenhum minigame envolve dinheiro, prêmio em dinheiro, odds ou qualquer coisa que pareça casa de aposta. Nem anúncio de aposta.
- **Palavras proibidas em todo o jogo:** aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red" (gírias de aposta). Só duas exceções nomeiam a aposta para negá-la: o aviso fixo do Palpite da Rodada ("Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca.") e os Termos (`src/dados/termos.md`), que são o texto legal.
- Nenhum anúncio, link ou patrocínio de casa de aposta em nenhuma tela. Se um dia houver anúncio, a categoria apostas fica bloqueada.
- Porcentagem da torcida só aparece depois que o palpite fecha, nunca como "cotação".

## 4. Torcidas (times)

### Times oficiais
- Os 20 clubes da Série A 2026, mais "Outro time".
- **Só nome, cores e artigo (o/a).** Nada de escudo, uniforme oficial, mascote, hino ou foto de jogador. O artigo serve para o narrador acertar "do"/"da", "pro"/"pra".
- **Camiseta lisa:** batedores em camiseta lisa nas 2 cores do time, sem escudo, listras, patrocínio ou desenho que imite a camisa. **Uniforme 1** (cor 1) e **uniforme 2** (cores invertidas), sorteado a cada partida; se os dois times ficarem parecidos, o adversário troca.
- **Goleiros:** camiseta lisa num tom forte (amarelo, verde-limão, ciano, rosa ou lilás), que contraste com os dois times e com o outro goleiro.
- **Card do time ("faixa de placar"):** cor 1 cheia, faixa reta na cor 2 embaixo (~1/4 da altura) e, nos clubes de três cores, um filete da 3ª cor. Nome em Barlow Condensed, caixa alta, cor de texto por `corDeTexto`. O mesmo desenho para todos: **nenhum padrão que imite a camisa**.
- **Única exceção de desenho de camisa:** o manto da Casa do [time], com o padrão tradicional e sem escudo, símbolo, patrocínio ou fornecedor (`docs/casa.md`).
- **Jogadores fictícios:** nenhum boneco imita jogador real, nem por número, tom de pele ou cabelo. Duas exceções, aceitas pelo Kauê cientes do risco de imagem:
  - nos lances em que quem bateu foi o goleiro (hoje só o Gol 100), o batedor vai de goleiro (roupa lisa nas cores do dia, sem nome, número, rosto ou cabelo da pessoa);
  - o batedor da pessoa é o boneco montável dela, com o número que ela escolheu (`jogos/boneco-montavel.md`). A combinação de número, pele e cabelo é escolha da pessoa, nunca do jogo; os bonecos sorteados seguem sem número.
- **Uniformes nos Lances:** cada lance veste os dois times dele (batedor nas cores do clube do lance; barreira e goleiro nas do adversário de verdade), sempre em camiseta lisa.
- Cada time pode ter um **rival** (o clássico). Sem clássico, vale a regra da seção 6.

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

O rival não precisa ser recíproco: o Botafogo provoca o Flamengo, e o Flamengo provoca o Fluminense. Os dados ficam em `src/dados/times.ts`.

### Cidade (segunda camisa)
Os pontos somam também para a cidade e o estado do jogador, escolhidos depois da 1ª partida. Regras e ranking em `jogos/rankings.md`.

### Apelido
- Opcional, até 20 caracteres, só para quem marcou 16 ou mais na triagem, e fica no Perfil, fora da entrada do jogo. Quem tem menos de 16 joga sem apelido: o card e o desafio saem como "Torcedor do [time]". Passa por um filtro de palavras no servidor antes de ser gravado, e o servidor recusa apelido de quem tem menos de 16.
- **Jogador famoso no apelido** (lista de Seleção, elencos da Série A e ídolos dos 20 clubes em `palavras_bloqueadas`): o apelido não pode ser **só** o nome de um jogador ("Neymar", "Ceni", "Gabigol"; número não conta como outra palavra, então "Ceni 01" também não passa) nem trazer o **nome completo** de um ("Rogério Ceni", "Gabriel Barbosa"), porque "boneco + número + nome do jogador" imitaria uma pessoa real. **Sobrenome ou apelido de jogador junto com outro nome passa** ("Kauê Ceni", "Zé Gabigol"): é a homenagem que o torcedor faz, e o Kauê aceitou o risco em 10/11 (levar ao advogado no A02). Nome comum sozinho passa. O `#admin` apaga apelido já gravado.
- O card só mostra o apelido **depois que o servidor o aceitou** (`apelidoConferido`, `src/jogo/apelidoConferido.ts`). Até lá, e sem internet, sai "Torcedor do [time]".
- **Nenhum ranking público mostra apelido.** Ele aparece só no card que o próprio jogador compartilha e no desafio que ele manda. Ranking individual só depois da moderação da fase 2.

### Troca de time ou cidade
Livre por enquanto. Os pontos já feitos ficam onde foram feitos. Reavaliar antes da temporada 2027 (proposta inicial: 1 troca a cada 30 dias).

## 5. Os jogos hoje (resumo)

O dia de cada jogador vale as **3 melhores partidas de Lances** (pênaltis, faltas e cara a cara juntos) e as **3 melhores da Prova**, até 150 cada. Time do Dia e Palpite da Rodada somam por fora. Detalhes em `jogos/rankings.md`.

| Jogo | Em uma linha | Doc |
|---|---|---|
| **Lances do Jogo** | Tela única com disputas históricas de pênaltis, faltas e cara a cara de lances que celebram os clubes. Um toque em Jogar; faltas e cara a cara são 3 tentativas do mesmo lance. Até 10 partidas valendo por dia (depois vira treino). Teto 150. Troféus por lance. Desafio por link. | `jogos/lances.md`, `jogos/penaltis.md` |
| **Prova de Boleiro** | 8 perguntas, 4 alternativas, 20 s cada, escada de 4 degraus, 3 ajudas, três erros e fora. Máximo 150. | `jogos/conhecimento.md` |
| **Time do Dia** | Um clube secreto por dia, igual para todos, 6 tentativas com pistas. 100 a 0 pontos, uma partida por dia. | `jogos/conhecimento.md` |
| **Palpite da Rodada** | Palpite de placar da rodada do Brasileirão. Pontos ×2 na torcida, teto de 300 por rodada. | `jogos/crava.md` |
| **Casa do [time]** | Vitrine da história do clube: estádio, troféus, recordes e manto. Não dá pontos. | `docs/casa.md` |

**Regras que valem para todos os jogos de partida:** o resultado é sempre recalculado no servidor a partir dos gestos ou respostas e da semente; o celular nunca grava pontos. Caiu a conexão: a partida segue no aparelho e não vale pontos, com o código do motivo no aviso. A dificuldade é igual para todos no mesmo dia.

## 6. Tom e zoeira

- **Narrador:** exagerado, rádio de domingo. Ex.: "É CAVADINHAAAA! Que categoria, que deboche!", "Pegou! O goleiro tava com o almoço pago!".
- **Banco de frases:** `docs/narrador.md`. Frase nova entra lá e passa pelo checklist de tom do arquivo.
- **Regras de estilo dos textos:** um nome por coisa, botão no infinitivo de 1 a 3 palavras, texto do WhatsApp em primeira pessoa e no máximo 2 linhas antes do link. Lista completa em `docs/narrador.md`.
- **Narrador com voz:** formato definido (só gritos curtos em áudio; vozes Narrador e Narradora e a opção Só efeitos; nunca imitar narrador real), mas fica no backlog.
- **Neutro de gênero:** o narrador fala do lance, não da pessoa ("Cavou!", não "Ele cavou!").
- **Provocação ao rival** (só ao time, nunca à pessoa): "Sua torcida tá 300 pontos atrás do [rival]. Vai deixar?"
- **Quem é o rival:** o clássico da tabela da seção 4. Sem clássico, o time logo acima no ranking da semana da sua divisão (ou logo abaixo, se for o líder); antes das divisões, no ranking geral. Quem escolheu "Outro time" recebe só provocação de cidade.
- **Zoeira de cidade:** só sobre posição no ranking. Nada de sotaque, origem, economia, "cidade pequena" ou estereótipo.
- **Avisos e notificações:** só informam, sem urgência nem chamada para voltar (seção 7).
- **Limite:** zoeira com o time e com a situação, nunca com raça, orientação, gênero, religião, origem, corpo, deficiência ou pessoa real (jogador, técnico, narrador). Nada de bordão ou frase célebre de pessoa real (narrador, comentarista, jogador), nem adaptado, nem trecho de música. Vale o jargão comum do futebol e os bordões do jogo (`docs/narrador.md`).
- **Classificação livre:** sem palavrão, bebida, aposta ou violência em nenhum texto do jogo.
- **Derrota zoa, mas aponta a saída:** jogo de volta, desafio, "os pontos contam igual pro seu time".

### Nomes reais
- **Pode:**
  - em perguntas e respostas factuais dos jogos de conhecimento (Prova e Time do Dia): gols, títulos, recordes, transferências, escalações históricas;
  - nas fichas factuais da Casa do [time] (artilheiros, recordistas), só nome + número + data de referência + fonte;
  - na **ficha** de um lance histórico (Lances do Jogo e disputas de pênaltis), contando o que aconteceu como as notícias públicas contam, com fonte guardada junto. Ex.: "27/03/2011, Paulistão: Rogério Ceni marca o 100º gol da carreira, de falta, contra o Corinthians."
- **Não pode no lance:** nome, apelido ou número da camisa no título, no card ou texto de compartilhar, no narrador e no boneco. O título conta o fato: "Gol 100 do goleiro".
- **Não pode nunca:**
  - imagem, foto, voz, caricatura ou boneco que imite pessoa real;
  - zoeira, apelido pejorativo ou opinião sobre a pessoa;
  - vida pessoal, família, saúde, religião, política, polêmica, processo ou crime;
  - atletas menores de idade (categorias de base);
  - usar nome de pessoa real para divulgar o jogo (anúncio, post, card de convite).
- Toda pergunta ou ficha com nome real precisa de **fonte verificável** guardada junto.
- Fantasy com jogadores reais (escalar time) continua fora.

## 7. Proteção de menores (ECA Digital)

- **O jogo inteiro é seguro para menores**, não só uma área: as regras valem para todas as telas e para o que vier depois.
- **Triagem de faixa etária:** uma vez por aparelho, antes da 1ª partida, neutra, com três botões (menos de 16, 16 ou 17, 18 ou mais). Guarda só a faixa, que decide só duas coisas: o que é para 18+ e o apelido (só 16+). O corte dos 16 vem do art. 24 da Lei 15.211 (contas de até 16 anos ligadas a um responsável): fica guardado para não perguntar de novo se um dia houver conta.
- **Link do desafio:** quem é novo vê primeiro o convite com as torcidas (a de quem chamou e o rival dela); tocar no time aceita o desafio, a triagem vem em seguida e a resposta já entra em campo (2 toques até o 1º chute). Detalhe em jogos/contas.md, "Primeiro acesso".
- **Só para 18+:** oferta de push (e o bloco do Aviso de domingo na central de avisos), "Apoie o jogo", "Oferecido por" e o "Seja sócio" da Casa.
- **Central de avisos:** o sininho do topo da Home é a caixa de avisos do jogo, para todo mundo (Termos que mudaram, cidade, aquecimento, peça nova, troféu já visto, desafio aberto e não jogado). Número discreto com os novos, sem piscar, sem urgência nem prazo; cada aviso some quando a pessoa resolve ou dispensa. Guardada só no aparelho. Para menores de 18, só a caixa, sem push.
- **Push:** só com opt-in, oferecido depois de um bom momento, no máximo a cada 14 dias, nunca de novo se a pessoa recusou; **um aviso por semana**, domingo 18h, com a situação da torcida e do rival, **sem urgência** (`src/jogo/avisos.ts`). O bloco "Aviso de domingo", no fim da central de avisos e no Perfil, liga, desliga ou explica por que o aparelho não recebe: no iPhone só chega com o jogo instalado na tela inicial; no navegador embutido do WhatsApp e do Instagram não chega; no Opera a inscrição funciona, mas o aviso não chega.
- **Sem sequência de dias:** nem na Carreira, nem no Time do Dia, em nenhuma tela, card ou frase do narrador.
- **"Sou maior de 18 ou responsável"** antes do Pix e do link de apoio.
- **Aviso de saída em todo link externo.**
- Página `#termos` com "Ver meus dados" e "Apagar meus dados"; aviso de mudança dos Termos na Home e na central de avisos, sem bloquear o jogo.
- **Apelido ofensivo:** o `#admin` apaga um apelido que já passou pelo filtro.
- **Dados mínimos (LGPD):** login anônimo, sem e-mail ou telefone obrigatórios. Nunca pedir dado pessoal obrigatório.
- Como está no código: `jogos/contas.md`. Texto legal: `src/dados/termos.md` (só muda com o Kauê; ver `docs/termos-x-jogo.md`).

## 8. Visual

- Direção **"Transmissão de domingo"**, rota **"Grafismo de TV"**: placar de TV inclinado, grito do narrador como adesivo na cor do time, arquibancada nas cores do time, campo em perspectiva; placas quase pretas com cantos de 12 px e sombra suave sobre o gramado, números em Anton, rótulos em faixa inclinada, cor do time como filete no topo dos blocos. Tudo em variáveis CSS, sem biblioteca nova.
- **Regras de tela:** **amarelo só no botão principal, um por tela**; aviso de pré-temporada como selo único no cabeçalho; números como bloco (número grande + rótulo curto); título de tela igual em todas; telas vazias e de erro com convite e "tentar de novo"; texto pequeno com contraste de pelo menos 4,5:1; alvo de toque de 44 px; par principal × secundário em 1 : 1,4.
- **Home:** a arquibancada com a barra do time dentro e o "Jogar agora" no topo; os jogos e a Casa logo depois; a informação da guerra (placar do clássico, tabela do mês, cidade, giro) no fim. No máximo um aviso por abertura, logo abaixo do "Jogar agora"; o resto vai para a central de avisos. Detalhe em `docs/visual.md`, "Início".
- **Resultado padrão** (`src/telas/resultadoPadrao.ts`), em duas camadas: a dobra tem título, placar, pontos, um destaque, a prévia da mensagem e "Desafiar a galera"; o resto fica em "Ver detalhes da partida". Detalhe em `docs/visual.md`, 4.6.
- **Celular primeiro:** testar em 390×844; toque, nunca hover; nada de rolagem horizontal. Movimento e vibração respeitam "movimento reduzido" e o botão Vibração.
- **Bonecos sorteados:** estilo "Silhueta premium Plus" (formas chapadas sem contorno, três tons por peça, camiseta lisa, tons de pele e cabelos variados, homens e mulheres; 5 batedores diferentes por lado e 1 goleiro, sorteados por partida). Detalhe em `docs/bonecos.md`.
- **Fora:** nenhum espaço, aviso ou gatilho de compra em lugar nenhum.
- Detalhe tela a tela: `docs/visual.md`.

## 9. Técnica (resumo)

- Front-end estático: Vite + TypeScript, canvas para o jogo. Bundle inicial abaixo de ~300 KB gzip; o resto por `import()`.
- Hospedagem: GitHub Pages em `torcida.kauewalter.com.br` (repositório próprio, separado do site pessoal). DNS: CNAME `torcida` no Hostgator, feito pelo Kauê.
- Dados: Supabase, projeto `guerra-de-torcidas` (ref `ybfeqykdnqmnufrgtnoc`), região São Paulo, plano Free durante o desenvolvimento. Login anônimo, Postgres com RLS em toda tabela, funções no servidor para validar partidas. Migrações versionadas em `supabase/migrations/`.
- **Chaves:** o front-end usa a URL e a **publishable key** (`sb_publishable_…`), versionadas no repositório. A **secret key** (`sb_secret_…`) só existe como segredo das funções. Não usar as chaves antigas `anon` e `service_role`.
- **Lógica de jogo** (física, pontuação) em módulos puros em `src/jogo/`, testados e copiados para as funções por `npm run compartilhar`.
- **Anti-trapaça:** resultado recalculado no servidor a partir dos gestos e da semente; uma semente por lance; o celular nunca grava pontos (`jogos/penaltis.md`, `jogos/lances.md`).
- **CAPTCHA:** Cloudflare Turnstile escondido, uma vez por aparelho (1º login anônimo e login do `#admin`), pelo suporte do Supabase. Falhou: o jogo roda sem valer pontos.
- **Ranking ao vivo:** quem fecha partida anota a semana numa fila; uma rotina por minuto refaz o ranking com a mesma conta e avisa as telas (`jogos/rankings.md`).
- **Contas paradas:** conta anônima sem jogar por 6 meses é apagada pela rotina mensal, guardando os pontos da semana em `pontos_apagados`.
- **Supabase acordado:** `.github/workflows/manter-supabase.yml` lê 1 linha do ranking a cada 2 dias, para o plano Free não pausar. O GitHub desliga agendamento sem commit por 60 dias; se acontecer, reativar.
- **Zerar pré-temporada:** `npm run zerar-pre-temporada` apaga partidas, desafios e ranking (mantém times e torcedores; recordes zeram junto; medalhas ficam). Lembra de rodar o balanço antes e só apaga depois de digitar ZERAR.
- **Sessão de usuário apagado:** se o login salvo não existir mais no servidor, o aparelho que tinha torcedor esquece time, apelido e faixa e volta à escolha do time, com aviso.
- **Contas e aparelhos:** uma carreira em vários aparelhos pelo código do torcedor, sem login (`jogos/contas.md`).
- **Cidades:** municípios do IBGE num arquivo estático, carregado só na tela de escolha.
- Testes: `npm run test:rapido` (lógica pura) e `npm run test:banco` (SQL no PGlite); `npm test` roda os dois, antes de cada commit. Depois do merge de PR com função ou migração, `npm run publicar:conferir` compara o que está no ar com a `main`.

## 10. Monetização

- **"Apoie o jogo":** página com Pix e link de apoio mensal. Quem apoia não ganha pontos, XP, selo nem nome público. Botão discreto no rodapé da Home, na aba Conquistas e no resultado só depois de um bom momento, no máximo uma vez por semana por aparelho; nunca no meio da partida nem no card. **Desligado** (`apoio_ligado` em `src/config/apoio.ts`) até a conta da plataforma existir, a chave Pix estar definida e o advogado responder sobre o ECA Digital. Lógica em `src/jogo/apoio.ts`.
- **"Oferecido por":** aceito, com 1 ou 2 marcas vendidas direto, sem rede de anúncios nem rastreio, num selo discreto no rodapé ou no card; nunca dentro da partida. Proibidos: aposta (inclusive "fantasy" com dinheiro), bebida alcoólica, cigarro, vape e outros produtos de vício. Só depois de ter audiência.
- **Cosméticos pagos:** adiados; quando vierem, só com login e estrutura robusta de pagamento, entrega e reembolso.
- **Clubes:** neutralidade; ninguém paga nem ganha destaque.
- **Prêmio em dinheiro ou produto:** fora de qualquer evento ou ranking.
- Proposta e comparação das opções: `docs/propostas/monetizacao.md`.

## 11. Casa do [time]

- Uma página por clube da Série A 2026 (`#casa/<id>`): estádio, sala de troféus, livro de recordes, cores e manto. Só fatos com fonte, revisados por uma segunda sessão.
- **Vitrine, não minigame:** não dá pontos, XP nem selo. Entra pela Home, pela Tabela (tocar numa torcida) e pelo fim do Time do Dia (depois que o dia termina).
- Competições pelo nome real da entidade, **sem patrocinador**. Títulos: na Casa vale o lado da torcida (com nota neutra do que a entidade reconhece); fora da Casa, a lista oficial.
- Estático, fora do bundle inicial, sem servidor (exceto a contagem de cliques do "Seja sócio").
- **"Seja sócio":** link direto para o programa oficial de sócio torcedor, igual para os 20 clubes, só texto, com aviso de saída e `utm_source=guerradetorcidas`; cliques contados por clube e dia, sem dado pessoal; sem afiliado ou comissão; se a página promover aposta, o clube fica sem o bloco. **Só 18+.**
- Detalhe: `docs/casa.md`.

## 12. Fase 2: comunidade

- **Times criados pelos jogadores:** cidade, bairro, várzea, escola, turma, empresa, grupo de amigos. Nome, artigo, 2 cores, tipo, cidade/UF opcional, link de convite. **Fora do lançamento:** partidos e rivalidades políticas.
- **Moderação (obrigatória antes de liberar):** filtro de palavras; proibido nome de pessoa específica e ofensa racista, homofóbica (inclusive grito de arquibancada), xenofóbica, misógina ou religiosa; botão "denunciar" (time com X denúncias fica oculto até revisão); painel de revisão. **Escolas:** só nome da escola e da turma, nunca de aluno. Sem chat aberto entre jogadores.
- **Ligas e campeonatos combinados:** campeonato privado com times dentro, criado por um organizador, com código ou link de convite, ranking e divisões próprias. Os pontos contam também para o time oficial e a cidade de cada jogador.

## 13. Roadmap

| Fase | Conteúdo |
|---|---|
| **1. MVP** | Pênaltis, times oficiais com artigo e rival, ranking da semana, desafio por link, card de resultado. Em teste com amigos. |
| **1.5 Logo depois** | Palpite da Rodada; Carreira; fechamento da semana gravado; cidade; Série A e B mensais; Galeria; ranking de 52 semanas; anti-trapaça completo antes de divulgar; Casa do [time]. |
| **2. Comunidade** | Times criados, ligas e campeonatos combinados (com ranking entre amigos com apelido), moderação, Copa das Torcidas. |
| **3. Mais minigames** | Prova de Boleiro, Time do Dia e Lances do Jogo no ar. Depois: Embaixadinha (com chinelo, laranja e bola murcha). |
| **4. Coleção e resenha** | Álbum de figurinhas com jogadores fictícios e trocas, Técnico por Um Jogo, Pelada de Rua. |

**Nomes candidatos:** Guerra de Torcidas (provisório) · Arquibancada · Resenha FC · Rivalzão · Bate Contra Mim · Treta FC · Torcida Braba.

## 14. Como saber se está funcionando

- **Convites por jogador:** quantos amigos cada um traz (meta: mais de 1).
- **Volta no dia seguinte e em 7 dias.**
- **Partidas por visita.**
- **Funil do desafio:** gerados → compartilhados → abertos → aceitos → 1º chute → terminados → jogo de volta, por tipo (pênaltis, Lances, Prova) e por dia. O desafio nasce a cada partida, então "gerado" não é "enviado": enviado é o toque em compartilhar.
- **Onde desiste:** escolha do time, triagem, aquecimento e partida, por jogo e com ou sem desafio.
- Tudo sem identificar ninguém: contagem por dia, e o código do desafio só como impressão, por 30 dias (`jogos/contas.md`, "Contagem de uso").
- Os números saem do banco por `npm run metricas` (só leitura). O balanço entre minigames está em `jogos/rankings.md`.

---

**Seções antigas citadas no código e em docs anteriores a 08/11/2026** (o `jogo.md` tinha tudo num arquivo só): 3 e 4 → aqui; 3 "Cidade" e 5 → `jogos/rankings.md`; 6 → `jogos/penaltis.md`; 7 → `jogos/crava.md` (a linha vermelha está aqui, seção 3); 7.1 e 7.2 → `jogos/conhecimento.md`; 7.3, 14.3 e 14.7 → `jogos/lances.md`; 7.4 → `casa.md`; 7.5 → seção 10; 8 → seção 6; 9 → seção 8; 10 → seção 13; 11 → seção 14; 12 → seção 9; 13 → seção 7 (o código em `jogos/contas.md`); 14.1 e 14.8 → `jogos/contas.md`; 14.2 → seção 8; 14.4 → `jogos/aquecimento.md`; 14.5 → `jogos/boneco-montavel.md`; 14.6 → `jogos/cards.md`.
