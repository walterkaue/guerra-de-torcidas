# Registro de decisões

> Uma linha por decisão ou mudança de regra, da mais nova para a mais antiga. A regra em vigor está no doc do módulo (`docs/jogo.md` e `docs/jogos/`); aqui fica só **quando** e **o quê**, para quem precisar da história.
> **Como acrescentar:** quem muda uma regra põe uma linha nova no topo da tabela, com a data, a mudança em uma frase e o doc onde a regra está, e corrige o doc do módulo para dizer só como é hoje (sem "até tal dia era…").
> **Antes de 08/11/2026** as linhas citam as seções do `jogo.md` antigo, que tinha tudo num arquivo só. Mapa: 3 e 4 → `jogo.md`; 3 "Cidade" e 5 → `jogos/rankings.md`; 6 → `jogos/penaltis.md`; 7 → `jogos/crava.md`; 7.1 e 7.2 → `jogos/conhecimento.md`; 7.3, 14.3 e 14.7 → `jogos/lances.md`; 7.4 → `casa.md`; 7.5 → `jogo.md` (Monetização); 8 a 12 → `jogo.md`; 13 → `jogo.md` (regra) e `jogos/contas.md` (código); 14.1 e 14.8 → `jogos/contas.md`; 14.2 → `jogo.md` (Visual); 14.4 → `jogos/aquecimento.md`; 14.5 → `jogos/boneco-montavel.md`; 14.6 → `jogos/cards.md`.

| Data | Decisão ou mudança |
|---|---|
| 10/11/2026 | H02, rede: o gol ganha o som da bola entrando na rede, o primeiro arquivo de som do jogo (gravação recortada do Pixabay, 16 KB, pela sala, -22 LUFS), tocado junto com a festa ou o uuuh nos Pênaltis (gol de quem cobra e gol sofrido) e nos Lances, só ao vivo. Carrega no primeiro toque que libera o som. Regra em `backlog.md` (4.4); licença em `src/jogo/sons/LICENCAS.md`. |
| 10/11/2026 | Sobrenome de jogador no apelido passa com outro nome ("Kauê Ceni", "Zé Gabigol"); só o nome do jogador ("Ceni", "Ceni 01") ou o nome completo ("Rogério Ceni") seguem barrados. `palavras_bloqueadas` ganha a coluna `famoso` (palavra ou nome; null = ofensa, sem mudança). Risco aceito pelo Kauê, vai ao advogado no A02. Na revisão de segurança, o mesmo dia: disfarce não conta como outro nome ("C3ni 01", "@neymar", "O Ceni", "Neymar Júnior"), e 28 nomes completos de quem estava só por uma palavra ("Mané Garrincha") entram na lista. Regra em `jogo.md` (seção 4, "Apelido"). |
| 10/11/2026 | H01b, chute, trave e eco, decididos ouvindo versões na página de laboratório de som: a sala vira a "Arquibancada leve" (dois ecos de 170 e 235 ms, um em cada lado, 18 dB abaixo do som, e estádio de 2,4 s); o chute vira bola de couro (clique, pof e pancada, -24 LUFS) e a trave, a bola estalando no metal com um anel curto de poste de alumínio (-23 LUFS), ambos pela sala. Regra em `backlog.md` (4.4). |
| 10/11/2026 | H01b, torcida nova, decidida ouvindo versões na página de laboratório de som: a festa fica quase igual, passa pela sala do apito e sobe um pouco (-20 LUFS); o uuuh vira um "ôôô" de arquibancada em estéreo que desce de 500 para 340 Hz, respira e passa pela sala (-25 LUFS, audível no alto-falante do celular). Ambos abaixo do apito. Regra em `backlog.md` (4.4). |
| 10/11/2026 | H01a, apito novo, decidido ouvindo versões numa página de laboratório: 2 semitons mais grave (2,58 kHz, com trinado), eco e estádio leves, 4 dB mais baixo; começo com um sopro, fim com três (curto, curto, longo), sem variação. Largada curta e mais baixa (±3% no tom) antes de cada chute a partir do 2º, em Pênaltis e Lances. Vibração só no apito final (Android). Regra em `backlog.md` (4.4) e `visual.md` (seção 4). |
| 09/11/2026 | C03 + C08, os gols de quem chamou: no desafio dos Lances, o convite mostra a fita das 3 tentativas e o telão com os gols redesenhados no aparelho (também no desafio vencido, até a limpeza de 30 dias), e o resultado do desafio recebido traz as duas fitas e "Ver os gols"; `ver_desafio_lances` devolve as tentativas numa lista branca; o funil ganha `viu_gols`. Nos pênaltis, "onde quem chamou bateu" só no resultado, sem link de replay. Regra em `jogos/lances.md`, `jogos/penaltis.md`, `jogos/contas.md` e `visual.md` (4.2 e 4.6). |
| 09/11/2026 | B01, central de avisos no sininho: o sininho do topo da Home vira a caixa de avisos do jogo, para todo mundo (informação mora na Home, aviso mora no sininho). Entram Termos que mudaram, cidade, aquecimento, peça nova no vestiário, troféu e placa do mês já vistos e desafio aberto e não jogado; saem da Home o lembrete da cidade e o card do Aquecimento. Número discreto com os novos, sem urgência nem prazo; o push (18+) vira um bloco no fim da folha. Guardado só no aparelho (`gdt:prefs.avisos`), sem servidor novo. Regra em `visual.md` ("Central de avisos") e `jogo.md` (seções 7 e 8). |
| 09/11/2026 | HOME2, nova ordem da Home (Rota B): a arquibancada cresce e leva a barra do time (posição na tabela do mês, na semana ou da cidade, e um toque até a Tabela), o "Jogar agora" vem logo abaixo, depois a vaga do momento (um aviso por abertura: fim do mês, Troféu novo, Termos; absorve o B03), os jogos e a Casa; o placar do clássico, as divisões, a cidade, o giro e o Aquecimento vão para a seção "Como tá a guerra", no fim. Regra em `visual.md` ("Início") e `jogo.md` (seção 8). |
| 09/11/2026 | C06, link do desafio com menos toques: o link abre uma tela própria de convite, e quem é novo toca na faixa do time de quem chamou ou do rival para aceitar (2 toques até o 1º chute; quem já joga, 1); a escolha do time perde o campo de apelido fora do Perfil; a Prova vinda do convite começa com "3, 2, 1". Regra em `jogos/contas.md` ("Primeiro acesso"), `jogos/penaltis.md`, `jogos/lances.md`, `jogos/conhecimento.md`, `visual.md` e `jogo.md` (seção 7). |
| 09/11/2026 | Revisão de segurança do apelido 16+: no servidor, a faixa gravada só muda para uma mais protetora (`salvar_faixa_etaria`), e a limpeza única tira também o apelido dos desafios de quem não respondeu a triagem. Publicação: migração antes do site; `jogos/contas.md`. |
| 09/11/2026 | Apelido só para quem marcou 16 ou mais na triagem; quem tem menos de 16 joga sem apelido e o servidor descarta o apelido (corte do art. 24 da Lei 15.211). Termos: versão 09/11/2026 (2ª). |
| 09/11/2026 | Funil do C01: se o módulo de envio não baixa (sem rede), a falha é tratada, o lote volta à fila (teto de 100 eventos, os mais antigos caem) e o próximo envio tenta de novo. Nada muda no servidor nem nos eventos. |
| 09/11/2026 | B02 + C02 + B05: resultado em duas camadas (Rota B): primeira dobra com placar, pontos, um destaque, a prévia da mensagem e o "Desafiar a galera" (verde, no lugar do "Mandar no grupo" quando há código de desafio); o resto em "Ver detalhes da partida"; nome longo do placar quebra em duas linhas; `docs/visual.md`. |
| 09/11/2026 | H03b: camisa por fora ou por dentro do calção, escolhida no vestiário (aba Camisa). Não é peça (vale para todo mundo, não conta nas 26), conta nova começa por fora, aparece em todo lugar onde o boneco aparece, inclusive em campo e no boneco de quem chamou o desafio; `jogos/boneco-montavel.md`. |
| 09/11/2026 | H03 entregue: o boneco passa ao estilo "Silhueta premium Plus" (três tons chapados por peça, camisa sem ombreira e sem a cintura de saia, calção que gira com o corpo, peso numa perna na pose parada, só desenho). Camisa por fora ou por dentro do calção: o desenho aceita (`Aparencia.barra`) e a escolha no vestiário é o H03b; `bonecos.md`, `jogos/boneco-montavel.md`. |
| 09/11/2026 | Prazo dos desafios: o link vale 7 dias (vencido, 410 `desafio_expirado` e partida normal com aviso) e o desafio é apagado com 30, no dia 1º às 4h45, depois de contar os gerados; linha na Política e Termos em 09/11/2026, que também passam a dizer "Palpite da Rodada" em vez de "Crava a Rodada"; `jogos/penaltis.md` |
| 08/11/2026 | glossário do jogo decidido pelo Kauê. X1 vira desafio, Crava a Rodada vira Palpite da Rodada (sem cravar), Revanche vira Jogo de volta, Ranking vira Tabela, recriar vira carimbar, Placar seco vira Só o placar, Mais Braba vira Torcida raiz, e entram as regras de estilo e os bordões do narrador (`docs/narrador.md`). Os Termos trocam o nome do Palpite com o prazo dos desafios (09/11). |
| 08/11/2026 | Contagem de uso: funil do X1 (compartilhou por tipo e meio, abriu, aceitou, 1º chute, terminou, revanche) e onde desiste (escolha do time, triagem, aquecimento e partida; desistiu − voltou), sem pessoa, com a impressão do código por 30 dias; linha na Política e Termos em 08/11/2026 (C01 + I03); `jogos/contas.md` |
| 08/11/2026 | Documentação dividida: `jogo.md` curto com as regras de hoje e um doc por módulo em `docs/jogos/`; este registro guarda as datas. |
| 08/11/2026 | limpeza depois do corte dos Lances unificados: saem o hub de 3 abas, o monte-sua-partida, o Treinar e a Disputa livre, a lista antiga de 3 lances recebe sempre 426, e a ficha e as regras entram no voltar do celular; seções 6, 7.3 e 14.7 |
| 08/11/2026 | Teto do dia da Prova passa a 3 melhores partidas, só dela, sem dividir com pênaltis; antes, 5 melhores do dia somadas com pênaltis (conhecimento.md) |
| 08/11/2026 | voltar do celular fecha a ficha e as regras antes de sair da tela dos Lances (S08); `lances.md` |
| 08/11/2026 | lista antiga de 3 lances responde sempre 426 `atualize_o_app`; sem treino livre; `lances.md` |
| 08/11/2026 | pênaltis sem Disputa livre e sem treino, com a tabela "mais baixa" (gol 7, ângulo +4, cavadinha +6, defesa 7, vitória +15, 5 de 5 +10) e as 10 partidas do dia somadas com os Lances; `penaltis.md` |
| 07/11/2026 | corte dos Lances unificados antecipado para domingo 08/11, 0h, exceção da pré-temporada à regra da segunda 0h, com a posição dos Lances pelo dia; seções 5, 6, 7.1, 7.3 e 14.7 |
| 07/11/2026 | boneco em campo: o boneco montável é o batedor da pessoa, com o número nas costas, e no X1 quem recebe vê o boneco de quem chamou, com o interruptor "Meu boneco em campo" no Perfil; seções 3, 6 e 14.5 |
| 07/11/2026 | telas do resto das divisões: bloco das divisões na Home, placa de fim do mês e card de fim de temporada; seção 5, "A temporada" |
| 07/11/2026 | Card de fim de temporada (tipo `temporada`) na tela "Seu card" (`jogos/cards.md`) |
| 07/11/2026 | Kauê manteve o bloco das divisões logo abaixo do cabo de guerra, mesmo com o "Jogar agora" abaixo da dobra em 360×740; corte dos Lances unificados antecipado para domingo 08/11 0h como exceção da pré-temporada, com a semana de 02/11 fechando em duas regras (rankings.md) |
| 06/11/2026 | jornadas J09, J10 e J43: campo maior em tela grande, "Vire o celular pra jogar" com a partida parada e "Mandar esse lance" na ficha; seções 7.3 e 14.7 |
| 06/11/2026 | reposição de perguntas mira 30 por clube e pergunta válida não é aposentada por excesso; seção 7.1 |
| 06/11/2026 | ajustes J27, J29, J35 e J37 das jornadas simuladas: Galeria de "Outro time", voltar após escolher a cidade, Termos e botão "Outro aparelho" |
| 06/11/2026 | Prova de Boleiro com 20 s por pergunta, seção 7.1 |
| 06/11/2026 | lote B das jornadas simuladas: aviso de conexão caída, Home de "Outro time", "Mandar no grupo" dos Lances com o card, defesa do aquecimento que espera o toque e apelido só no card depois do servidor; seções 3, 7.3, 14.4 e 14.6 |
| 06/11/2026 | card do troféu na tela "Seu card", ligado ao "Mandar no grupo" da Galeria, e 3 ajustes da revisão das telas da Galeria; seções 5 e 14.6 |
| 06/11/2026 | telas da Galeria de Troféus, das 52 semanas e das Campeãs de estado; seção 5 |
| 06/11/2026 | Aquecimento J20: só a estação Defesa espera o 1º toque, com a mão repetindo o gesto a cada ~2,5 s (`jogos/aquecimento.md`) |
| 06/11/2026 | Time do Dia ganha legenda fixa das cores sob a grade (`jogos/aquecimento.md`) |
| 06/11/2026 | boneco em campo decidido (C5, Rota B, "você no lance"): batedor da pessoa com o número dela, segunda exceção à regra dos bonecos fictícios (14.5 e seção 3) |
| 06/11/2026 | Card do troféu da Galeria (Telão, Placar seco e Pôster), aberto do "Mandar no grupo" da ficha e da placa "Troféu novo" (`jogos/cards.md`) |
| 06/11/2026 | Lances: fileira Card, Stories e Link sem o botão Emoji (J16) (`jogos/cards.md`) |
| 06/11/2026 | Prova com 20 s por pergunta (eram 15 s) e reposição de perguntas mirando 30 por clube sem aposentar pergunta válida (conhecimento.md) |
| 06/11/2026 | Perfil com um botão só, "Outro aparelho", que abre folha com "Levar minha conta pra outro aparelho" e "Entrar com o código de outro aparelho" (J37) (`jogos/contas.md`) |
| 06/11/2026 | Termos: "as suas mensagens do Achei um erro" em "Seus direitos" e nova versão com o aviso "Os Termos mudaram" (J35); versão atual de 07/11/2026 (`jogos/contas.md`) |
| 06/11/2026 | Apagar apelido (`#admin`) abre com a lista dos apelidos que o filtro de hoje barraria (`jogos/contas.md`) |
| 06/11/2026 | aviso de conexão caída com o código em letra pequena e cinza, "código: tempo_esgotado", formato único em `comMotivo` (J03); `lances.md` |
| 06/11/2026 | Cidade: volta para a tela de origem com aviso (J29); Home de "Outro time" com convite à cidade no lugar da nota de exclusão (J14); Galeria de "Outro time" abre em "Escolha uma torcida" (J27) (rankings.md) |
| 05/11/2026 | primeiro acesso: a escolha do time é a primeira tela de quem é novo, antes da triagem e do aquecimento, e a faixa da Home sem time vira o botão; seção 14.8 |
| 05/11/2026 | cards personalizáveis: tela "Seu card" com os estilos Telão e Placar seco, Stories e Quadrado, quadradinhos de ligar e desligar e frase própria só no aparelho; seção 14.6 |
| 05/11/2026 | servidor do ranking de 52 semanas e da Galeria de Troféus: campeão da semana é o 1º de cada série, campeã de estado é a cidade, pré-temporada fora; seção 5 |
| 05/11/2026 | card só da medalha, com "Mandar a medalha" no resultado e nas Conquistas e o link do lance, e confete da vitória em todos os jogos; seção 7.3 |
| 05/11/2026 | Lances do Jogo: corte antecipado para segunda 09/11, troféu das disputas de pênaltis já antes do corte e sem Disputa livre a partir dele; seções 5, 6, 7.1, 7.3 e 14.7 |
| 05/11/2026 | Lances do Jogo unificados: números decididos e servidor da regra que entra em 16/11; seções 5, 6, 7.1, 7.3, 11 e 14.7 |
| 05/11/2026 | boneco montável: caminho B "Vestiário", sem foto, peças do começo e peças liberadas por nível e medalha, nunca pago (jogo.md 14.5) |
| 05/11/2026 | número do boneco livre, de 0 a 99 com "00" e "sem número"; nomes e apelidos de jogadores famosos bloqueados na `palavras_bloqueadas` (14.5) |
| 05/11/2026 | boneco guardado no servidor em códigos curtos, sobrevive ao zerar, entra em "Ver meus dados" e fica fora das métricas; tom de pele e corpo na lista do advogado (14.5) |
| 05/11/2026 | telas do vestiário aprovadas (Rota 2): bloco Vestiário no Perfil, busto na Home, folha da peça trancada e "Peça nova no vestiário" (14.5) |
| 05/11/2026 | Estilo Pôster e quadradinho "Meu boneco" nos cards personalizáveis; Pôster some sem boneco carregado (`jogos/cards.md`) |
| 05/11/2026 | Primeiro acesso: o `?time=` de link só marca o time na escolha; lance por link atravessa a escolha e a triagem (`jogos/contas.md`) |
| 05/11/2026 | faixa corrigida pela taxa real só desce, nunca sobe acima da do catálogo (revisão de segurança do PR #108); `lances.md` |
| 05/11/2026 | catálogo recalibrado pelo acerto real das pessoas, fator humano 0,418 sobre o robô; `lances.md` |
| 05/11/2026 | cada X1 dos pênaltis vale uma vez por pessoa (`desafio_ja_jogado`), com a bola da defesa indo para a zona gravada; `penaltis.md` |
| 05/11/2026 | partida de pênaltis valendo só com disputa do catálogo (400 `disputa_obrigatoria`); no X1 vale a disputa de quem chamou; `penaltis.md` |
| 05/11/2026 | Campeão da semana com divisões é o 1º de cada série; campeã de estado é a cidade; depois do zerar, tudo vale para Galeria e 52 semanas; telas da Galeria aprovadas (rankings.md) |
| 04/11/2026 | Cidade: servidor, lista do IBGE, mínimo de 5 também no estado, vagas a 80% da média de quem tem cidade, convite no resultado da 1ª partida; seções 3 e 5 |
| 04/11/2026 | Aquecimento de 5 estações no gesto (Pênalti, Defesa, Falta, Prova, Crava valendo) depois do time e da triagem, com +20 XP uma vez só e selo "Aquecido"; tutoriais em quadros saem e entram 36 dicas curtas, 2 por aparelho (`jogos/aquecimento.md`) |
| 04/11/2026 | Toda estação do aquecimento vibra no padrão de gol, acertando ou não; resultado da Prova com uma frase só (`jogos/aquecimento.md`) |
| 04/11/2026 | Aparelho aposenta o apelido apagado pelo admin buscando o servidor uma vez por abertura (`jogos/contas.md`) |
| 04/11/2026 | troféus dos lances: trilha de 3 medalhas (rota T2), filtros "Meus troféus" e "Perto do próximo", favoritos só no aparelho; `lances.md` |
| 04/11/2026 | números dos Lances unificados pela proposta `docs/propostas/lances-unificados.md`: faltas e cara a cara 24/30/36/42 e +8, teto 150, 10 partidas por dia, 3 melhores do dia; `lances.md` |
| 04/11/2026 | resumo antes do apito e "Não exibir novamente" saem; o "?" abre as regras (aquecimento); `penaltis.md` |
| 04/11/2026 | Estados também só com 5+ jogadores; vagas emprestadas a 80% da média de quem somou para alguma cidade; convite à cidade no resultado da 1ª partida (rankings.md) |
| 03/11/2026 | Lances do Jogo valendo pontos: servidor lance a lance, melhor partida do dia por fora do teto, detecção, medalhas e aba Conquistas; seção 7.3 |
| 03/11/2026 | Código do torcedor: código de 8 caracteres e QR, 10 min, uso único; dono herda carreira, medalhas e recordes; faixa mais protetora vale; aparelho desconectado volta à escolha do time (`jogos/contas.md`) |
| 03/11/2026 | servidor dos Lances lance a lance, uma semente por lance e goleiro inicial arredondado; `lances.md` |
| 03/11/2026 | uma semente por cobrança e por defesa na `nova-partida`; `penaltis.md` |
| 02/11/2026 | aba Temporada no Ranking: série do mês, classificação, zonas de acesso e queda e mês passado; seção 5 |
| 02/11/2026 | Perguntas sobre guerra proibidas, mesmo como contexto; 27 das 60 fáceis de clube viram média, com troca para manter 3 fáceis por clube (`docs/propostas/faceis-de-clube-prova.md`); cinco crons por dia de geração (conhecimento.md) |
| 02/11/2026 | Contas anônimas paradas há mais de 6 meses são apagadas no dia 1º às 4h, com os pontos guardados em `pontos_apagados`; Termos reescritos a partir do parecer jurídico, com DPO e triagem × art. 9º ainda para confirmar com advogado (`jogos/contas.md`) |
| 02/11/2026 | Tabela da semana refeita a cada minuto; 52 semanas com 0 ponto para torcida sem ninguém; fechamento da semana pega a trava antes de copiar, migração `20261103000100` (rankings.md) |
| 01/11/2026 | servidor das divisões: tabelas da temporada, classificação do mês e fechamento às 12h01; torcida sem ninguém não ganha ponto de campeonato; seção 5 |
| 01/11/2026 | Prova com três erros e fora: o 3º erro encerra e leva 75% dos pontos, opção B de `docs/propostas/calibragem-prova.md`, valendo da semana de 02/11 (conhecimento.md) |
| 01/11/2026 | "Apagar meus dados" apaga também as mensagens do "Achei um erro" (`jogos/contas.md`) |
| 01/11/2026 | Torcida sem ninguém jogando não ganha ponto de campeonato nem vitória de semana (rankings.md) |
| 31/10/2026 | card de compartilhamento "Telão do estádio", seção 9, e torcida verde e amarela nos lances da seleção, seção 7.3 |
| 31/10/2026 | torcida sem ninguém jogando fica com 0 e teste das divisões em série única em novembro; seção 5 |
| 31/10/2026 | fechamento da semana gravado, em duas etapas: provisória na segunda 00h05 e travada às 12h; bônus de 1º da torcida sai na confirmação; seção 5 |
| 31/10/2026 | disputas históricas de pênaltis, primeira etapa: catálogo em `dados/disputas/`, lista na aba Pênaltis só com o que estiver revisado e `disputa_id` na partida; ver seção 6 |
| 31/10/2026 | seção da Casa na Home, com estádio e troféus, seção 7.4; total de lances no card dos Lances, seção 7.3 |
| 31/10/2026 | Home nova e aba Perfil: arquibancada do time, cabo de guerra com a sua posição, botão "Jogar agora", cards com desenho, giro da semana, e o bloco "Sua carreira" na aba Perfil; ver seções 5 e 9 |
| 31/10/2026 | Time do Dia também sem sequência de dias: sai da tela, do card e do narrador; seção 13 |
| 31/10/2026 | proteção de menores do ECA Digital, seção 13: triagem de faixa etária, push e apoio só para 18+, push sem urgência, Carreira sem sequência, página de termos e "Apagar meus dados" |
| 31/10/2026 | uniformes dos Lances: cada lance veste os dois times dele, e o batedor vai de goleiro no Gol 100, exceção à regra dos bonecos; seção 3 |
| 31/10/2026 | bloco "Seja sócio" na Casa de cada clube, decidido em 30/10: link para o programa oficial, sem pontos, com aviso de saída e cliques contados no servidor sem dado pessoal; ver seção 7.4 |
| 31/10/2026 | disputa de pênaltis pode citar o goleiro pelo nome, como fato, nas condições da exceção da Chapecoense; `penaltis.md` |
| 31/10/2026 | Teste das divisões: novembro em série única e Série A e B em dezembro; torcida sem ninguém jogando fica com 0 (rankings.md) |
| 27/10/2026 | pênaltis lance a lance pela função `lance-penalti`, semente segredo do servidor; `penaltis.md` |
| 26/10/2026 | Carreira do jogador no ar: XP no servidor, bloco na Home, linha no resultado e nível opcional no card |
| 26/10/2026 | qualidade gráfica automática Alta/Média/Leve, com botão "Gráficos" no rodapé da Home; só visual, ver `docs/visual.md` 4.3 |
| 26/10/2026 | replay de TV do gol: todo gol dos Lances e os golaços dos Pênaltis, só visual |
| 26/10/2026 | fase 1.5 decidida pelas propostas em `docs/propostas/`: mês de estreia em série única antes da Série A e B, divisões e cidade testadas já na pré-temporada, cidade pedida depois da 1ª partida e só no ranking com 5+ jogadores, 52 semanas pela tabela de 20 posições do ranking geral, Galeria na aba Conquistas, níveis da Carreira com XP que sobrevive ao zerar |
| 26/10/2026 | Pipeline do Gemini para perguntas (`gerar-conteudo` e `auditar-conteudo`), com revisão final no `#admin`, sem CSV (conhecimento.md) |
| 26/10/2026 | exceção da campanha da Chapecoense na Sul-Americana de 2016 no catálogo, sem falar do acidente; `lances.md` |
| 26/10/2026 | partidas sob suspeita de todos os minigames na fila do `#admin`, com Liberar e Manter fora; replay de TV do golaço; `penaltis.md` |
| 26/10/2026 | Cidade pedida depois da 1ª partida; mínimo de 5 jogadores por cidade; ordem do longo prazo: Carreira, Galeria, 52 semanas (rankings.md) |
| 21/10/2026 (noite) | Casa do [time] planejada, com dados em rascunho em dados/casa; Lances do Jogo no lugar dos Pênaltis na Home, com 3 abas; câmera 3D com três distâncias; "A jogada" no cara a cara; antes: tela dos Lances do Jogo em teste, sem valer pontos; novo minigame Lances do Jogo, com medalhas e página Conquistas; Pênaltis vão virar uma sessão dos Lances com disputas históricas; nomes reais na ficha factual dos lances |
| 21/10/2026 | câmera 3D com três distâncias e "A jogada" no cara a cara; defesa fica fora dos Lances; `lances.md` |
| 21/10/2026 | pênaltis viram sessão dos Lances do Jogo, com disputas históricas; `penaltis.md` |
| 20/10/2026 | Prova de Boleiro e Time do Dia somam no ranking já na pré-temporada (conhecimento.md) |
| 20/10/2026 | Crava sem ensaio: soma no ranking desde a 32ª rodada (23 a 26/10), junto com o resto da pré-temporada (crava.md) |
| 20/10/2026 | emojis básicos nos textos de compartilhamento; `penaltis.md` |
| 20/10/2026 | Pré-temporada valendo: todos os minigames somam, sem amistoso nem ensaio; posição pessoal e recorde por minigame; balanço entre minigames no `npm run metricas` (rankings.md) |
| 19/10/2026 | Nomes "Prova de Boleiro" e "Time do Dia", desenhos aprovados; revisão do banco por segunda sessão, sem revisão manual (conhecimento.md) |
| 19/10/2026 | Crava na estreia: sem ligas, rankings sem apelido, pontos na semana do jogo com campeão confirmado segunda 12h, soma por fora do teto diário, painel `#admin`, porcentagem só com 20 palpites, cards "Meus palpites" e "Resultado da rodada" (crava.md) |
| 19/10/2026 | botões "MAIS UMA" depois de vitória e "REVANCHE" depois de derrota; detecção de partidas impossíveis aprovada; `penaltis.md` |
| 19/10/2026 | Teto diário de 5 partidas (pênaltis e Prova) e melhor partida dos Lances por fora com teto 120; substituído em 08/11 pelo teto de 3 + 3 (rankings.md) |
| 18/10/2026 | Crava sem bônus "Contra a maré" na estreia (crava.md) |
| 18/10/2026 | regras de implementação dos pênaltis (ordem, gesto, goleiro, defesa, dificuldade, desempate); `penaltis.md` |
