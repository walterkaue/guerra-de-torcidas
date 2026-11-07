# Próximos passos

> Retrato do projeto em 05/11/2026 (fila em trilhos paralelos, decidida no mesmo dia), para retomar em qualquer conversa. Regras e decisões continuam no `docs/jogo.md`; aqui só fica o que vem a seguir.
> Ao fechar um item, atualize este arquivo no mesmo PR. Para começar, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos

| Área | Estado em 06/11/2026, noite |
|---|---|
| Código | `main` de 06/11 (merge do PR #139 às 18h14, com as correções dos PRs #141 a #144). Na branch dos ajustes J27, J29, J35 e J37: 126 arquivos de teste, 2.373 testes, todos passando e `tsc` limpo (eram 100 arquivos e 1.929 testes em 05/11, com os PRs #108 e #110) |
| Publicação | Site no ar (`main` de 05/11, 14h15, com o PR #116; deploy do GitHub Pages com sucesso, conferido: o bundle traz o corte em 09/11). 47 migrações, iguais ao banco em 06/11 à noite (conferido só leitura: a última é `20261106500000_prova_20s`, a Prova com 20 s; `migration list` com local = remoto). **14 funções republicadas em 06/11 às 16h47** (`prova` v19, com 20 s por pergunta; as 14 têm a mesma data de publicação). Detalhe do que veio antes: 42 migrações aplicadas (`20261106000000_galeria_52_semanas`, servidor da Galeria e das 52 semanas, em 05/11 às 17h20, depois do merge do PR #122, conferida só leitura; `20261105400000_lances_sem_livre`, corte em 09/11 e sem Disputa livre, em 05/11 à tarde, antes das funções, com o PR #116; as duas dos Lances unificados, `20261105100000` e `20261105200000`, pelo Kauê em 05/11 de manhã; `20261105300000`, o grant de `pontos_semana` para o papel de leitura do Supabase CLI 3, em 05/11 à tarde; `migration list` com local = remoto). Supabase CLI 3.0.0: `--remote` no lugar de `--linked`; consulta só leitura com `--read-only`, gravação com `--yes` depois do SIM do script. 13 funções publicadas (`nova-partida` v22, `lances` v4, `lance-penalti` v8 e `fechar-partida` v23 em 05/11, às 14h15, com o PR #116) |
| Rotinas | Sem falhas; `ranking-minuto` rodou 108 vezes sem erro entre 15h24 e 17h12 de 02/11 |
| Tamanho | Em 06/11/2026, à noite, com os ajustes das jornadas: `index-*.js` de 46,6 kB gzip (130,6 kB sem compressão), sem crescimento relevante. Em 06/11/2026, com a Galeria: `index-*.js` de 46,3 kB gzip (era 51,9; Temporada e Cidades passaram a baixar sob demanda; CSS 14,15 kB, era 14,12). Em 05/11/2026, com as telas dos Lances unificados: `index-*.js` de 50,3 kB gzip (era 48,5; a Home passou a ler a regra de corte e o catálogo dos lances vem por `import()`). Em 04/11/2026, com o PR #96: bundle inicial de 59 KB gzip (limite: ~300 KB). Somando todo o JS e o CSS, 251 KB gzip. A conta de 02/11 deu 216 KB, mas pode não ter usado o mesmo método |
| Conteúdo | Casa com 20 clubes revisados e os 808 títulos revisados (07/11/2026); 280 perguntas no ar (meta do lançamento: 800) |
| Uso | Retrato de 04/11, 21h: 18 pessoas já jogaram; 48 partidas de pênaltis, 10 de faltas e cara a cara, 32 de Prova. Pênaltis trazem 74% dos pontos do ranking (eram 82% num retrato anterior). Amostra pequena |

## Em andamento

Quatro trilhos, que rodam em paralelo (fila decidida pelo Kauê em 05/11/2026), mais o trilho F, das jornadas simuladas (06/11/2026). Cada trilho anda na ordem dele; um não espera o outro, salvo o D, que espera o desenho do C.

**Trilho A — Lances do Jogo (`docs/jogo.md` seção 14.7).** Servidor no ar desde 05/11/2026, 8h16 (PRs #108 e #110); telas no ar desde 05/11 (PR #112).
1. **Corte antecipado, troféu nos pênaltis e sem Disputa livre** (decisão do Kauê em 05/11/2026; PR #116): corte na segunda 09/11, 0h (era 16/11; depois, domingo **08/11**, abaixo); trilha de 3 medalhas das disputas já na tela de antes (aba Pênaltis, ficha, Conquistas e resultado); a partir do corte, só itens históricos, com `disputa_obrigatoria` no servidor e o X1 dos pênaltis jogando a disputa de quem chamou. Migração `20261105400000_lances_sem_livre.sql` (apaga as linhas `penaltis:livre` de `lances_gols`). **No ar desde 05/11/2026, 14h15** (aprovado pelo Kauê): a migração (conferida só leitura: corte em 09/11 no banco, nenhuma linha `penaltis:livre`, `penaltis_comecar`, `penaltis_anotar_gols` e `ver_desafio` novas, permissões iguais), as quatro funções e o site (merge do #116). A conferência de segunda está na descrição do PR. **Antecipado de novo, para domingo 08/11, 0h** (decisão do Kauê em 07/11/2026, exceção da pré-temporada à regra da segunda 0h; `docs/jogo.md` 5 e 14.7): umas 20 pessoas novas entram no domingo de manhã e já veem a tela única. Migração `20261107200000_lances_corte_domingo.sql` (data nova e a posição dos Lances pelo dia, porque o corte cai no meio da semana de 02/11), as quatro funções e o site, tudo até sábado 07/11, 22h. A semana de 02/11 fecha com as duas regras somadas (aceito: pré-temporada).
2. **Domingo 08/11, de manhã, no celular (o Kauê):** abrir o site (recarregar se estava aberto); conferir que a Disputa livre sumiu e que "Jogar agora" abre a tela única no filtro Pênaltis; jogar uma falta (3 tentativas do mesmo lance) e uma disputa de pênaltis (a linha "rumo ao bronze" no resultado); mandar o link do X1 de pênaltis para outra conta (aba anônima) e aceitar (a outra conta tem de jogar a mesma disputa); ver "Seus 3 melhores de hoje" e o Lance do Dia na Home.
3. **Segunda 09/11, 12h** (quando a semana de 02/11 trava): a conferência só de leitura do PR (o bloco 8 do PR #108 com a data nova, mais as consultas da Disputa livre). Cada consulta tem o esperado escrito nela.
4. **Limpeza das telas antigas, com o lote A4 junto** (construída em 07/11/2026, branch `claude/lances-unificados-cleanup-7bf512`; **merge no domingo 08/11 de manhã, depois que o Chat conferir no banco as partidas da regra nova**): saíram o hub de 3 abas, o monte-sua-partida, "Treinar" e "Pôr na partida", a Disputa livre, `src/telas/corte.ts` e o `?corte=` de dev e do simulador; a lista antiga de 3 lances na função `lances` responde sempre 426 `atualize_o_app` (revisor: sem furo). Junto, os achados S06 a S08 e S10 a S13 do simulador e os textos que ainda falavam em 5 melhores. Sem migração. **Publicação:** a função `lances` só depois das 0h de domingo (`npm run deploy:funcoes` ou `supabase functions deploy lances`, com `--dry-run` antes), e o site pelo merge. Prints em `docs/auditoria/2026-11-08/limpeza/` (antes e depois). **Falta no celular (o Kauê):** abrir uma ficha e apertar o voltar do Android (fecha a ficha, não sai da tela); rolar até o fim da Home com a fonte grande e tocar em "Termos e privacidade"; no resultado dos pênaltis, conferir "3 gols · +21" e a barra de baixo opaca.
5. **Jornadas J09, J10 e J43** (decididas pelo Kauê em 06/11/2026; branch `claude/jornadas-j10-j09-j43-f4c026`, precisa estar no `main` antes da limpeza do item 4): campo maior em tela grande, "Vire o celular pra jogar" com a partida parada e "Mandar esse lance" na ficha da tela única. Só site; nada no Supabase. Prints de antes e depois em `docs/auditoria/2026-11-06/lote-g2/`. **Falta no celular (o Kauê):** deitar o celular no meio da defesa dos pênaltis e conferir que a partida espera; tocar em "Mandar esse lance" e ver a folha de compartilhar com o texto e o link; abrir a partida no computador ou no iPad e conferir que o campo cresceu e a mira continua certa.
- **Para voltar atrás:** antes de 08/11, as funções antigas funcionam com as migrações no ar (só o X1 de pênaltis repetido dá erro e joga sem valer pontos; a Disputa livre continua até o corte). Depois de 08/11, não volte as funções: já haverá partidas com a faixa gravada.

**Trilho B — Conteúdo.**
- ~~**Disputas que faltam** para a meta de 3 por clube~~: fechado em 05/11/2026 com o lote 2 (PR #115, 64 publicadas; a Seleção tem 5). O Mirassol fica com 2: não há outra vitória profissional nos pênaltis com duas fontes aceitas, e o Kauê decidiu não descer para torneio menor (o que falta é completado pela Seleção, `docs/jogo.md` seção 6). Disputa nova segue `dados/disputas/README.md`: rascunho, conferência numa sessão nova, `npm run catalogo-disputas` e, na seção "Publicação" (PR #118), **a `nova-partida` antes do site** (desde o corte, ela só aceita id do catálogo dela).
- **Robôs do Gemini:** reavaliar no domingo 08/11, 17h ("Conferir primeiro", item 9).
- **Perguntas até 800:** 280 no ar; a meta pede perguntas nascidas de páginas reais ("Depois", item 2). Faltam 9 fáceis de clube (ver "Decisões").
- ~~**Títulos da Casa:** faltavam 35 de 808~~: conferidos em 07/11/2026; os 808 estão `revisada` (`dados/casa/RELATORIO.md` seção 6). 4 passaram pelo `conferir-casa` e 31 foram conferidos à mão; nenhuma linha saiu. Os Paulistas (103 linhas) e a Série D 2020 do Mirassol foram conferidos nas listas oficiais da FPF e da CBF, que só abrem no navegador. O Brasileiro de 1987 segue com o Sport campeão (decisão do Kauê em 07/11/2026) até o STF julgar a Ação Rescisória 3032 (último andamento: parecer da PGR de 18/02/2026, pelo título dividido). Os outros 386 estaduais (RJ, MG, RS, BA e SC) foram revistos no mesmo dia: a FCF e a FGF (2020 a 2026) publicam e batem; FERJ, FMF e FBF não publicam lista histórica, e os anos foram cruzados com duas ou três listas de imprensa ou do clube. O Paranaense de 2000 ficou com o Athletico, e o Coritiba como vice (decisão do Kauê em 07/11/2026).

**Trilho C — Desenho no Chat** (o Kauê desenha e decide antes de construir):
- ~~cards personalizáveis~~: desenhado e construído em 05/11/2026 (seção 14.6 do `docs/jogo.md`, branch `claude/cards-personalizaveis`), com os estilos Telão e Placar seco em Stories e Quadrado, os 8 quadradinhos e a frase própria. Prints em `docs/auditoria/2026-11-05/cards/`; o Kauê aprova antes do merge. Depois: o card do troféu da Galeria entra como mais um tipo em `TIPOS_DE_CARD`. Conferir no celular: Salvar imagem no Android e no iPhone (pela folha de compartilhar), o deslizar e o apelido escolhido pela própria tela;
- ~~primeiro acesso~~: decidido e construído em 05/11/2026 (seção 14.8 do `docs/jogo.md`, branch `claude/primeiro-acesso`): a escolha do time é a primeira tela de quem é novo, depois a triagem e o aquecimento, e a faixa da Home sem time vira o botão. Conferir no celular, num aparelho limpo (limpar os dados do site): a primeira tela, o "Pular" do aquecimento levando à Home e um link de desafio entrando direto;
- ~~Galeria de Troféus e ranking de 52 semanas~~: as telas foram construídas em 06/11/2026 (PR #137), com a Galeria, as 52 semanas, as Campeãs de estado e a placa da Home. Prints em `docs/auditoria/2026-11-06/galeria/`; aprovados pelo Kauê em 06/11/2026. O servidor está no ar desde 05/11/2026 (PR #122). **Card do troféu construído em 06/11/2026** (seção 14.6 do `docs/jogo.md`, branch `claude/card-trofeu-telas-f00f27`): "Mandar no grupo" da ficha e da placa abre a tela SEU CARD com o troféu no Telão, no Placar seco e no Pôster, e a revisão do #137 saiu junto (Campeãs sem linha repetida, sub-abas de Cidades iguais, flâmula com contorno claro). Prints em `docs/auditoria/2026-11-06/card-trofeu/`; **na `main` desde 06/11/2026, 14h12 (PR #138)**. Conferir no celular: o "Mandar no grupo" da ficha e da placa (a tela abre, os números e o "tava na arquibancada" aparecem só para quem somou, o Compartilhar manda a imagem com o texto e o link), o Salvar imagem no Android e no iPhone, o Pôster com o troféu na placa, o troféu de outro time (sem Pôster) e as sub-abas de Cidades em 360 de largura;
- ~~resto das divisões~~: decidido pelo Kauê em 06/11/2026 (linha C3: na Home, a Rota 2, "linha ao vivo"; no card, a Rota 1, "tabela final no telão"; a queda tem placa e card, neutros) e **construído em 06/11/2026** (`docs/jogo.md` seção 5, "Telas do resto das divisões"; branch `claude/divisoes-projecao-temporada-fa411b`): o bloco das divisões na Home com a projeção da semana, a placa de fim do mês (no lugar da "Troféu novo", que deixa os troféus do mês para ela), o card de fim de temporada nos 3 estilos e as frases da seção 16 do `docs/narrador.md`. Só site; nada no Supabase. Prints em `docs/auditoria/2026-11-06/divisoes/`; o Kauê aprova antes do merge. **Precisa estar no ar antes de 07/12/2026, 12h01** (novembro fecha nesse dia). Conferir no celular: o bloco na Home a partir de 09/11, 12h (1ª semana de novembro travada); em 07/12 depois das 12h01, a placa de fim de novembro (série única, pré-temporada: "VAI PRA SÉRIE A" ou "COMEÇA NA SÉRIE B", selo "Teste das divisões") e o "Mandar no grupo" com o card; em dezembro, o bloco com Série A e B;
- ~~boneco montável~~: desenho decidido em 05/11/2026 (`docs/jogo.md` seção 14.5).

**Trilho D — Construção**, cada item depois do desenho dele no trilho C, com plano pela skill `planejar-tarefa`.
- **Boneco montável (D5, `docs/jogo.md` seção 14.5):**
  1. ~~D5a, peças e catálogo puro~~: no `main` desde 05/11/2026 (PR #125, prints aprovados pelo Kauê). `src/jogo/vestiario.ts` (também em `_shared`), o desenho em `src/telas/bonecoMontavel.ts` e a vitrine `?vitrineBoneco`. Nada do app usa ainda.
  2. ~~D5-lista, nomes de jogadores na `palavras_bloqueadas`~~: PR #124; migração `20261106100000` no ar (conferido no `migration list` em 05/11/2026).
  3. ~~D5b, servidor~~: no ar desde 05/11/2026 (PR #130). Migração `20261106300000_boneco.sql` aplicada, função `boneco` publicada (`meu_boneco`, `salvar_boneco`) e o cliente `src/servidor/boneco.ts`, sem tela. Detalhe em `docs/jogo.md` 14.5, "Como está no servidor".
  4. ~~D5b-seg, revisão de segurança~~: feita em 05/11/2026, sem furo; a corrida foi provada em Postgres 17. Conferência só de leitura do PR #130 feita em 05/11/2026: RLS ligada com a política restritiva, o celular (anon e authenticated) sem acesso à tabela e às 4 funções internas, que só o servidor chama (`security definer`, `search_path` vazio); função `boneco` ativa (versão 1), recusando pedido sem login (401); 0 contas com boneco, porque nenhuma tela chama a função antes do D5c.
  5. **D5c, telas:** Perfil (crachá de 84 px e bloco Vestiário), Home (busto de 52 px), vestiário, peça trancada e peça nova. O desenho entra por `import()`, para o bundle inicial não crescer.
     - **D5c1, vestiário e peça trancada:** branch `claude/vestiario-tela`, com fonte falsa (`?vestiarioFalso`). Prints em `docs/auditoria/2026-11-05/vestiario/`, aprovados pelo Kauê em 05/11/2026 (PR #131, no `main`). A rota `#vestiario` existe, mas sem link.
     - **D5d, boneco no card (Pôster e "Meu boneco", 14.6):** no `main` desde 06/11/2026 (PR #133), prints em `docs/auditoria/2026-11-05/card-poster/`. O resultado já chama `prepararBonecoDoCard()` ao aparecer (`ligarResultado`, junto com o D5c2), para o Stories com o Pôster guardado não sair como Telão na 1ª vez. Conferir no celular: o Pôster no Stories e no Quadrado salvo e compartilhado, o deslizar com 3 estilos e a tela sem rede (modo avião), que tem de abrir em até ~4 s sem o Pôster.
     - **D5c2, ligação, Perfil, Home e peça nova:** branch `claude/boneco-telas` (PR #134). A fonte do servidor junta `meu_boneco`, `minha_carreira` e `minhas_medalhas` (decidido: sem mudar o servidor). Busto na Home e no crachá, bloco Vestiário no Perfil, "Peça nova no vestiário" no resultado dos 4 jogos e o voltar do Android consertado. Prints em `docs/auditoria/2026-11-05/boneco-telas/`, aprovados pelo Kauê em 06/11/2026 (PR #134, no `main` desde 06/11/2026). Teste no celular depois do deploy: subir de nível de verdade e ver o bloco uma vez só. Detalhe em `docs/jogo.md` 14.5, "D5c2".
     - ~~**D5e, boneco em campo e no X1**~~ (decidido em 06/11/2026, C5, Rota B; `docs/jogo.md` 14.5, "Boneco em campo"): **no ar desde 07/11/2026, 8h02** (PR #149). Revisão de segurança D7-seg: "pode aplicar". Migração `20261107000000_boneco_em_campo.sql` aplicada e conferida no banco (coluna `em_campo` ligada por padrão, os 2 bonecos que já existiam ligados, `ver_desafio` com a coluna `boneco`, o celular sem acesso às funções internas); função `boneco` v3 (recusa sem login com 401); site com o merge (deploy com sucesso, `index-4sQC25kN.js`, 47,31 kB gzip com o D4). `DATA_DA_VERSAO` em 07/11/2026: todo mundo vê "Os Termos mudaram". **Falta o teste no celular:** o boneco batendo de costas a 60 fps, o replay de um golaço de verdade, o interruptor do Perfil (desligar e ver batedores sorteados) e um X1 entre duas contas, com o interruptor de quem chamou ligado e desligado.

**Trilho F — Jornadas simuladas** (rodada de 06/11/2026: 8 pessoas fictícias jogaram do primeiro acesso ao card; `docs/auditoria/2026-11-06/simulacoes/`).
- **Relatório:** PR #139 (48 achados: 1 bloqueia, 18 atrapalham, 21 detalhes, 8 oportunidades).
- **Correções:** PRs #141 a #144 (a Prova com 20 s é o #143). **34 dos 48 achados corrigidos.**
- **Em andamento:** J09, J10, J27, J29, J35, J37 e J43. Os ajustes J27 (Galeria de Outro time com um título só e a lista já aberta), J29 (voltar de onde veio, com o aviso da segunda camisa), J35 (Termos: "mensagens do Achei um erro"; `DATA_DA_VERSAO` em 06/11/2026, então todo mundo vê "Os Termos mudaram · Ler") e J37 (botão "Outro aparelho" com a folha de duas opções) estão na branch `claude/jornadas-simuladas-ajustes-d9ceac`, com prints em `docs/auditoria/2026-11-06/lote-g1/`; o Kauê aprova antes do merge. J09, J10 e J43 seguem com outras sessões.
- **Depois:** J41, J42, J44, J45 e J47.
- **Fora:** J46 e J48.
- **Simulador automático (F1):** no `main` desde 07/11/2026 (PR #146; `npm run simular`, `scripts/simulacoes/`). A primeira rodada achou S01 a S18 (`docs/auditoria/2026-11-06/simulacoes/achados.csv`).
- **Lote G3 (07/11/2026, branch `claude/lote-g3-acessibilidade`):** fonte grande, leitor de tela, teclado e toque. Corrige S01 a S05, S09 e S14 a S18. Só site; nada no Supabase. O Kauê aprova os prints antes do merge (`docs/auditoria/2026-11-07/lote-g3/`, antes e depois em 384×854 com fonte 150% e em 360×740).
  - **O que muda:** regra única das abas (2 × 2 com fonte grande), alvos de 44 px, nome do leitor de tela começando pelo texto da tela, aviso do Crava em 2 linhas, pistas curtas no Time do Dia, trava no "Salvar imagem", Esc no sininho e foco na área das regras.
  - **S17 era falso positivo:** o simulador media o foco relativo à janela, e a rolagem do Tab fazia o número cair. A métrica agora soma a rolagem.
  - **Falta no celular (o Kauê):** com a fonte do sistema no máximo, abrir Ranking, Lances, Crava e Time do Dia e ver que nada sai da tela; com o TalkBack, tocar numa linha do Ranking e ouvir posição, time e pontos antes do "abrir a Casa".
- ~~**Lote A4**~~: entrou junto com a limpeza do trilho A, item 4 (07/11/2026).

## Conferir primeiro

Nada disso tem lembrete automático.

**1. ~~Fechamento da semana~~:** conferido em 02/11/2026. A `fechar-semana-virada` rodou à 0h05 e a `fechar-semana-confirma` às 12h00: a semana de 26/10 tem 20 linhas, todas travadas. As de 12/10 e 19/10 também. A semana de 26/10 bate com a `ranking_semana` time a time (ativos, soma, média 30 e posição), nos 20 times. Só São Paulo (4 ativos, 1019) e Flamengo (1, 80) pontuaram.

**2. ~~Migração da temporada~~:** aplicada pelo Kauê em 02/11/2026, depois da trava, e conferida no banco. A `termos_x_jogo` (`20261102000100`) entrou antes, à mão, com `migration repair`. Novembro está aberto como pré-temporada, com 20 times na série única. `classificacao_temporada` responde com 20 times e 0 ponto, o esperado até a semana de 02/11 fechar. A rotina `fechar-temporada` (12h01 todo dia) e o RLS das duas tabelas estão ligados. Nenhuma migração pendente.

**3. Prova de Boleiro com três erros e fora:** no ar desde 01/11/2026, com as frases novas do narrador (PRs #69 e #71). Falta jogar uma partida real errando de propósito. **Desde 06/11/2026 (Prova com 20 s, PR #143):** a mediana e a decisão dos 4 erros usam só as partidas criadas depois da mudança para 20 s, a partir de 06/11 às 16h47 (hora da publicação da função `prova` v19; a migração `20261106500000` não guarda a hora em que foi aplicada). O `npm run balanco` já filtra assim por padrão (`PROVA_20S_DESDE` em `scripts/balanco/balanco.mjs`); `-- --prova-15s` mostra as de 02/11 até a mudança, só como referência, e `-- --prova-antes` a regra antiga do 1º erro. Em 06/11, à noite, a referência de 15 s tinha 5 partidas de 5 pessoas (4 acabaram em erro) e a de 20 s ainda 0: faltam 20 partidas novas para decidir. Se a mediana ficar abaixo de 45, a próxima alavanca é `ERROS_QUE_ENCERRAM = 4`.

**4. ~~Disputa histórica~~:** conferida em 02/11/2026.
- Às 12h44 o Kauê jogou no celular a disputa `selecao-2016-olimpiada`, pelo São Paulo. Ela fechou às 12h45 com `disputa_id`, 110 pontos e sem suspeita.
- A tentativa das 9h17, numa janela anônima pelo Bragantino, não gravou partida. A conta nasceu e passou pelo CAPTCHA, mas a `nova-partida` não recebeu nenhuma chamada nas 24 horas dos logs.
- No banco, a conta das 9h17 gravou o time (Bragantino, 0,3 s depois de nascer) e a faixa 18+. Só a partida faltou: falhou a chamada da `nova-partida`, não o CAPTCHA nem o login.
- Em 03/11/2026 o Kauê repetiu com conta nova, no Opera e no Chrome em janela anônima: as duas disputas históricas gravaram. Não é um erro de todo jogador novo; o mais provável é falha de rede pontual naquela hora (o Opera estava com a VPN ligada).
- Desde então o aviso de partida sem valer pontos traz o código do motivo no fim (`rede`, `captcha`, `tempo_esgotado`, `http_503`…). Se alguém mandar print com ele, dá para saber onde parou sem abrir o console.

**5. ~~Travas da limpeza e do fechamento~~ (PR #86):** revisão de segurança de 02/11/2026. As duas migrações de 02/11 já estavam no ar e passaram na conferência só de leitura (detalhe no PR). A revisão achou duas brechas:
- a limpeza aceitava prazo de 0 mês ou data no futuro, o que apagaria todas as contas anônimas, e a chave secreta das funções podia chamá-la;
- o fechamento de segunda 12h copiava o ranking sem travar a semana.

A `20261103000100_travas_limpeza_e_fechamento.sql` (só `create or replace` e `revoke`) foi aplicada em 02/11/2026, com o ok do Kauê e antes do merge, e conferida no banco:
- 31 migrações, a última é a `20261103000100`;
- `apagar_contas_paradas` fechada para `service_role`, `authenticated` e `anon`, e a rotina mensal continua ligada;
- o texto de `apagar_contas_paradas` e `fechar_semana` no banco é idêntico ao do arquivo;
- `ranking-minuto` sem falha nos 5 minutos seguintes.

O merge entrou em 03/11/2026.

**6. Fechamento do mês:** em 09/11, depois das 12h, a semana de 02/11 tem de aparecer nos pontos. Em 07/12, depois das 12h01, novembro tem de estar fechado e dezembro aberto com 10 times em cada série. Só leitura.

```sql
select mes, serie, count(*) from public.temporada_serie group by 1, 2 order by 1, 2;
select * from public.classificacao_temporada where mes = '2026-11-01' order by posicao;
```

## Pode começar já

0. **Lista de apelidos barrados no `#admin`** (06/11/2026, PR #127; migração `20261106200000_apelidos_filtrados.sql` no ar): função `apelidos_filtrados` (só administrador) e lista na seção "Apagar apelido". **Falta:** o site com a tela (merge do PR) e, depois, o Kauê abrir `#admin` e apagar o apelido que bate com a lista de jogadores famosos (1 em 06/11).
0. ~~**Apelidos de jogadores famosos**~~ (PR #124, migração no ar em 05/11/2026; trilho D5): migração `20261106100000_apelidos_famosos.sql` acrescenta ~250 nomes e apelidos a `palavras_bloqueadas`; teste `src/dados/apelidosFamosos.test.ts`. **Falta:** a conferência só leitura de quantos apelidos já gravados batem com a lista (só o número; apagar pelo `#admin`, se for o caso). A frase própria do card (14.6, D1) deve usar o mesmo filtro no servidor, sem cópia da lista no celular.
1. ~~**Telas das divisões:**~~ feito em 02/11/2026: aba Temporada no Ranking (só leitura de `temporada`, `classificacao_temporada`, `temporada_serie` e `fechamento_semana`). O resto (a linha na Home, as frases do fim do mês e o card de fim de temporada) foi construído em 06/11/2026 (trilho C, acima). Conferir no celular em 09/11 depois das 12h (1ª semana de novembro com pontos) e em 07/12 (dezembro com A e B, novembro em "Mês passado").
2. ~~**Ranking incremental:**~~ feito em 02/11/2026 (migração `20261102100000_ranking_por_minuto`): fila + rotina `ranking-minuto`. No ar desde 02/11/2026 às 15h24: migração, `fechar-partida` v18 e site. Conferido no mesmo dia:
   - as 3 partidas das 15h34 às 15h37 entraram no ranking em 20 a 50 s (aviso na versão 3);
   - a conta da rotina é igual à conta completa refeita do zero, nos 20 times;
   - as semanas travadas de 12/10, 19/10 e 26/10 batem com a `ranking_semana`.

## Feito em 31/10/2026

| Frente | Executor | Resultado esperado |
|---|---|---|
| ~~Funil do desafio por link~~ | Feito | Diagnóstico em `docs/propostas/funil-do-desafio.md`: os 4 aceites são entre os 2 testadores, nenhum de fora; "enviado" é só "gerou link". Correções pequenas no convite; falta contar compartilhamento e abertura do link |
| ~~Calibragem da Prova~~ | feita em 31/10 | Proposta em `docs/propostas/calibragem-prova.md`; o Kauê escolheu a opção B em 01/11 |

**Termos × jogo (feito em 31/10/2026):** a lista está em `docs/termos-x-jogo.md`, para o Kauê e o advogado. Além das divergências já vistas (cidades, Cloudflare, contas paradas, aviso de mudança, "só você lê os seus", o que fica ao apagar), achou: "ver meus dados" não existe, "zerar pontos de trapaceiro" e "apagar apelido" não têm ação no `#admin`, o aviso de saída não cobre o WhatsApp e o feedback leva tela e navegador sem o texto dizer. Cada item traz as saídas (mudar o jogo ou o texto). Falta o Kauê decidir; o texto só muda com ele.

**7. ~~Lances valendo no ar~~:** conferido em 03/11/2026.
- O servidor foi publicado antes do merge: a migração `20261103200000`, a função `lances` v1 e a `fechar-partida` v19, que agora aceita só pênaltis.
- O site saiu com o merge do PR #88, às 14h42.
- O Kauê jogou 3 partidas pelo São Paulo, das 14h44 às 14h46, com 0, 36 e 24 pontos.
- A de 36 virou a melhor do dia (`conta_no_teto`) e entrou na `ranking_semana` às 14h45min00s, 12 s depois de fechar.
- As outras duas ficaram de fora do ranking, como manda a regra.
- Cada uma ganhou a linha dela na Carreira, e `lances_gols` anotou 2 e 1 gols.
- Nenhuma ficou sob suspeita, e a fila do ranking esvaziou.
- No total da semana dele, os Lances somam só 36, por fora das partidas de pênaltis e Prova.

**8. ~~Pênaltis com uma semente por lance~~:** conferido em 03/11/2026.
- A brecha: pelo resultado exato de uma cobrança dava para achar a semente da partida e prever os lances seguintes. A revisão dos Lances achou o problema lá, e os pênaltis já tinham a mesma brecha no ar.
- Publicado na ordem: a migração `20261103300000`, a `lance-penalti` v5 e a `fechar-partida` v20, e por último a `nova-partida` v19.
- A partida do Kauê das 15h40 nasceu com 8 sementes de cobrança e 8 de defesa, todas diferentes, em `partidas_segredo.sementes`.
- Ela fechou com 40 pontos, sem suspeita, e entrou no ranking às 15h42, 16 s depois de fechar.
- As partidas anteriores seguem com a semente única, sem mudar resultado.

**9. Reavaliar os robôs do Gemini (domingo 08/11/2026, 17h):** os 5 crons por dia de `gerar-conteudo` e de `auditar-conteudo` (decidido em 02/11, `docs/propostas/robos-gemini-perguntas.md`) já têm medida em `staging_gt.uso_gemini`. Olhar chamadas, tokens e erros 429/503 por dia e por função, quantos rascunhos nasceram, quantos passaram na auditoria e quantas das 9 fáceis já foram preenchidas. Decidir: manter 5, subir ou descer `paginas` e `quantidade`, ou ligar a cobrança do Google AI Studio. Consulta:

```sql
select criada_em::date dia, funcao, sum(chamadas) chamadas, sum(falhas) falhas, sum(entrada) entrada, sum(saida) saida
from staging_gt.uso_gemini group by 1, 2 order by 1, 2;
select status, count(*) from staging_gt.rascunhos_perguntas where criada_em > '2026-11-03' group by 1;
```

**Medida adiantada em 06/11/2026 (só leitura; a decisão continua do Kauê, no domingo):**
- **Falhas:** `auditar-conteudo` falhou em 59 de 115 chamadas (51%) de 02 a 06/11; `gerar-conteudo`, em 6 de 55 (11%).
- **Tokens:** `auditar` usou 167 mil de entrada e 4 mil de saída; `gerar`, 161 mil e 14 mil.
- **Lacuna da medida:** a tabela guardava só `falhas`, sem separar 429 (cota) de 503 (sobrecarga), e a cobrança só resolve cota. Desde 06/11 a coluna `codigos` guarda o código de cada tentativa que falha (ex.: `429,429,503`); as linhas anteriores ficam sem ele. Depois de 2 ou 3 dias: `select criada_em::date, funcao, codigos, count(*) from staging_gt.uso_gemini where codigos is not null group by 1,2,3 order by 1,2,4 desc;`. `chamadas` e `falhas` contam cada tentativa, inclusive as repetições: 51% é taxa de tentativas, não de auditorias perdidas.
- **Rascunhos desde 03/11 (62):** 40 `publicada`, 7 `pre_aprovada`, 11 `rascunho` (esperando auditoria) e 4 `reprovada` (todas em 03/11). Das 51 auditadas, 47 passaram.
- **Fáceis de clube:** as 9 estão preenchidas e `ativa`; os 7 clubes têm 3 ou mais fáceis hoje (athletico-pr 4, bahia 3, bragantino 4, chapecoense 4, coritiba 4, remo 3, vasco 6). O Bahia fecha com a `bahia-f-04`. **Atualização de 06/11/2026:** as 9 já estão ativas; as médias acima da cota **não são aposentadas** (decidido em 06/11/2026: pergunta válida não sai por excesso; a reposição mira 30 por clube, 9/9/6/6).
- **Médias acima da cota antiga (ficam, decisão do Kauê de 06/11/2026):** athletico-pr 7, bahia 5, bragantino 4, chapecoense 5, coritiba 4, remo 4, vasco 5, contra o alvo de 3. Acerto não serve de critério ainda (só 8 respostas em 34 médias); não há o que escolher: ficam todas.
- **Leitura:** a meta está quase cumprida e a fila é pequena; a inclinação é manter as 5 execuções. Detalhes e tabela por dia em `docs/propostas/robos-gemini-perguntas.md`, seção 8.

**10. Lances unificados no ar (publicados em 05/11/2026, 8h16):** os blocos da conferência estão na descrição do PR #108. Só leitura.
- **Agora, no celular:**
  - jogue uma partida de pênaltis e uma de faltas: tudo igual a antes;
  - aceite um X1 de pênaltis numa aba anônima (outra conta) e jogue; abra o mesmo link de novo: deve aparecer "Esse X1 você já jogou. Vai uma partida nova!", valendo; perca um X1 e toque em Revanche: deve abrir uma partida nova contra a máquina;
  - depois, rode o bloco 7 e veja os logs de `lances` e `nova-partida` em Edge Functions, sem erro 500 (o 409 `desafio_ja_jogado` é esperado).
- **Segunda 09/11, 12h** (o corte foi antecipado de 16/11 para 09/11 em 05/11/2026 e para domingo 08/11 em 07/11/2026): rode a conferência do PR #116 (o bloco 8, com o corte em 08/11; a semana de 02/11 traz as duas regras somadas). Ver trilho A, itens 2 e 3.

**11. Conferir no celular, das frentes já no ar (o Kauê):**
- **Aquecimento (PR #98):** de ponta a ponta num aparelho limpo (limpar os dados do site); o palpite da estação 5 em Palpites e os +20 XP na Carreira; vibração, papel picado e a mão animada; um link de desafio num aparelho limpo vai direto ao desafio e deixa o card na Home. Não testado à mão: as dicas de morte súbita, cavadinha pega no meio, altura errada e 3 cobranças sem efeito.
- **Troféus dos lances (PR #101):** papel picado e vibração ao subir de medalha; fechar a ficha tocando fora e com o voltar do Android; a ⭐ continua depois de fechar o site; o login do `#admin`.
- **Grafismo de TV (PR #96):** a faixa "Aqui é só resenha" grudada no topo ao rolar o Crava; o selo "Pré-temporada" abrindo e fechando; os botões Card, Stories, Emoji e Link nos 5 resultados.
- **Ficou para depois (baixo):** `.admin-tabela` em `prova.css` e `.conq-falta` em `conquistas.css` sem uso; no Código do torcedor, limite por IP e a partida fechada por outro aparelho no mesmo milissegundo da junção.

## Só o Kauê faz

**Robôs do Gemini: publicados em 02/11/2026** (funções `gerar-conteudo` e `auditar-conteudo`, tabela `uso_gemini` e os 5+5 crons; o PR dos robôs, #75, já entrou). A migração `20261102000000` foi aplicada à mão e registrada com `migration repair`, para não arrastar a da temporada. A `termos_x_jogo` do PR #74 tinha o mesmo número `20261102000000` e foi renumerada para `20261102000100` (PR #76). As duas e a da temporada estão no banco desde 02/11.

**Ligar o CAPTCHA (o código já está pronto), nesta ordem:**
1. ~~Criar o site na Cloudflare Turnstile para `torcida.kauewalter.com.br`, no modo invisível.~~ Feito.
2. ~~Passar a chave **pública** para `VITE_TURNSTILE_SITE_KEY` no `.env.production`, em um PR. Esperar a publicação.~~ Feito em 01/11/2026 (PR #68).
3. ~~Ligar o CAPTCHA no painel do Supabase com a chave **secreta**, que fica só no painel.~~ Conferido em 02/11/2026 pelos prints do Kauê:
   - Em Authentication → Attack Protection, "Enable Captcha protection" está ligado, com o Turnstile e o secret preenchido.
   - Em Logs → Auth, o `/signup` anônimo das 9h17min53s respondeu 200, e não houve nenhum 4xx ou 5xx em 24 horas. Ou seja, o token passou pela checagem.

**Decisões:**
- ~~**Lances do Jogo unificados (14.7):**~~ decidido em 04/11/2026 (`docs/jogo.md` 14.7, "Números decididos"): pênaltis "mais baixa", faltas B, limite 10, entra em 16/11 (antecipado em 05/11 para 09/11). Servidor publicado em 05/11/2026 (PRs #108 e #110). Também decidido em 05/11: a faixa corrigida só desce, cada X1 dos pênaltis vale uma vez por pessoa, o troféu das disputas aparece já e a Disputa livre sai no corte.
- ~~**Fáceis de clube:**~~ decidido e aplicado em 02/11/2026: 27 rebaixadas para média, 18 médias subiram a fácil (CSV e banco, só `degrau`, partidas fechadas intactas). **Faltam 9 fáceis novas** para o pipeline do Gemini: athletico-pr 2, chapecoense 2, bahia 1, bragantino 1, coritiba 1, remo 1, vasco 1 (com fonte e revisão no `#admin`). Até lá esses clubes têm 1 ou 2 fáceis e sobra de média; quando cada fácil nova for aprovada no `#admin`, aposentar a média que sobra desse clube (a de menor acerto ou a mais parecida com outra; **regra revogada em 06/11/2026**, nada é aposentado por excesso), para manter 3 fáceis, 3 médias, 2 difíceis e 2 de craque (decidido em 02/11/2026). O id guarda o degrau de nascimento (o validador só exige o clube no começo).
- **Data do zerar da pré-temporada:** até 06/12 para estrear em dezembro. A Crava termina em 2/12, e o balanço roda antes de zerar.
- ~~**Torcida sem ninguém nas 52 semanas:**~~ decidido em 02/11/2026: vale 0 ponto também lá. Já está em `ranking_52_semanas` (migração `20261106000000`).
- ~~**Campeão da semana com Série A e B e campeã de estado:**~~ decidido em 05/11/2026: o 1º de cada série; a campeã de estado é a cidade (`docs/jogo.md` seção 5, "Longo prazo").
- ~~**Prazo para apagar contas anônimas paradas:**~~ decidido em 02/11/2026 com o parecer: 6 meses sem jogar, rotina mensal (PR #84).
- ~~Itens de `docs/termos-x-jogo.md`~~: os 10 resolvidos em 02/11/2026 (PRs #74 e #84).
- Supabase Pro antes de divulgar.
- **Termos:** versão de 02/11/2026 com o parecer (PR #84). Antes de divulgar, confirmar com advogado os pontos 4 (triagem autodeclarada × art. 9º do ECA Digital) e 5 (DPO × exceção de alto risco da Res. CD/ANPD 2/2022); o parecer veio sem OAB.
- Importar as 2 perguntas de `dados/perguntas/lote-02.csv` e dizer se tema de guerra entra na lista de proibidos (`dados/perguntas/piloto-lote-02.md`).
- Propostas de `docs/propostas/funil-do-desafio.md`.
- **Código do torcedor:** levar ao advogado a frase proposta para os Termos (`docs/termos-x-jogo.md`).

## Depois

0. **Lances, segunda etapa:**
   - ~~card só da medalha ("Já sou ouro no…")~~: feito em 05/11/2026 (seção 7.3 do `docs/jogo.md`), "Mandar a medalha" no resultado e nas Conquistas, com o link `#lance/<id>`; prints em `docs/auditoria/2026-11-05/medalha-confete/`;
   - ~~corrigir a faixa de cada lance pela taxa de acerto real~~: feito no PR #108 e no ar em 05/11/2026; vale para partidas a partir de 09/11, com 30 tentativas de pelo menos 8 pessoas, e a faixa só desce;
   - ~~o `resultado.ts` dos pênaltis passar a usar `src/telas/efeitoRanking.ts`~~: feito em 05/11/2026, sem mudar a tela (o efeito ganhou teste próprio).
1. **Cidade, Galeria e 52 semanas:** nessa ordem, depois das telas das divisões. Servidor da Galeria e das 52 semanas no ar desde 05/11/2026 (migração `20261106000000`, PR #122); as telas foram feitas em 06/11/2026 (PR #137, prints aprovados).
   - ~~**Cidade:**~~ no ar desde 04/11/2026, às 22h31 (PRs #107, #104 e #105; detalhe na seção 5 do `docs/jogo.md`). Conferido no banco: 5.571 municípios, o gatilho `guardar_pontos_da_cidade` em `auth.users`, RLS nas 5 tabelas novas, as 6 funções das telas e a `ranking-minuto` sem falha depois da troca de `atualizar_rankings`. A Política mudou (`DATA_DA_VERSAO` 04/11/2026), então todo mundo vê "Os Termos mudaram"; levar a frase da cidade ao advogado.
     - **Conferir no celular (o Kauê):** escolher a cidade pelo convite do resultado e pelo Perfil; tocar duas vezes no lembrete da Home (o `#cidade` tem de abrir as duas); a aba Cidades em Seu estado, Top nacional e Estados (só aparece cidade com 5+ jogadores na semana); Ver meus dados com a cidade.
     - **Ajustes baixos da Cidade, feitos em 05/11/2026** (prints antes e depois em `docs/auditoria/2026-11-05/cidade-ajustes/`): o "SUBIU!" da Home só compara com o rival visto na mesma semana (`gdt:cidade-acima` guarda a semana; registro antigo conta como sem registro); o convite do resultado foi para o fim da página, depois dos botões, e não empurra mais nada; sem sessão válida (`sessaoValida`, que usa `meus_aparelhos`) a Home não mostra o lembrete e não gasta o "1 vez por semana"; o mapeamento de erros de `escolherCidade` virou `codigoDoErroDeEscolher` (`src/jogo/cidade.ts`) com testes. Tudo no navegador, sem servidor. Em desenvolvimento, `?cidadesFalsas=passou` e `=encerrada` reproduzem os casos.
     - **Ainda fica para depois (baixo):** na junção de contas fica a cidade de quem gerou o código.
2. **Perguntas:** o piloto recomendou parar nas 529 sem fonte do staging. A meta de 800 precisa de perguntas nascidas de páginas reais. A importação continua com o Kauê.
3. ~~**Limpeza de anônimos:**~~ feita no PR #84 (`20261103000000_contas_paradas.sql`), guardando os pontos em `pontos_apagados`. No ar desde 02/11/2026 (rotina `apagar-contas-paradas`, dia 1º às 4h). Na simulação de 02/11, 0 conta sairia: a anônima mais antiga é de 19/10/2026, então a primeira limpeza possível é em 1º/05/2027. As travas do PR #86 estão no ar desde 02/11/2026.
4. **Grafismo de TV, fase 2:** ~~painel `#admin` no visual da seção 4.6 do `docs/visual.md`~~ feito no PR #101 (04/11/2026). ~~O confete da vitória dos Pênaltis no `resultadoPadrao.ts`~~: feito em 05/11/2026, em todos os jogos (vitória, recorde novo, 3 melhores do dia, Time do Dia acertado e medalha nova, uma vez por resultado).

## Antes de divulgar

- [x] CAPTCHA ligado (conferido em 02/11/2026)
- [x] Limpeza de anônimos no ar (02/11/2026, com as travas do PR #86)
- [x] Ranking de minuto em minuto (no ar e conferido em 02/11/2026)
- [ ] Plano do Supabase decidido
- [ ] Termos e jogo batendo, com revisão do advogado (inclui a frase do código do torcedor)
- [ ] Prova calibrada
- [x] Funil do desafio entendido (mas falta medir envio e abertura do link; ver a proposta)
- [ ] Balanço rodado e pré-temporada zerada
