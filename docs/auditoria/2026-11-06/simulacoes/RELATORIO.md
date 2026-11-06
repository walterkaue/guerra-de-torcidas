# Simulador de uso: primeira rodada — 06/11/2026

O simulador (`scripts/simulacoes/`) põe oito personas fictícias para jogar em aparelhos, telas e navegadores diferentes (Chromium, WebKit e Firefox, pelo Playwright). Ele tira print de cada passo e confere sozinho cada tela: erros, layout, regras mensuráveis do `docs/jogo.md`, contraste e acessibilidade (axe), movimento reduzido, desempenho e teclado.

Esta rodada rodou contra a `main` de 06/11 à noite, já com os PRs #138 a #144. Foram 16 sessões com dados falsos (8 personas, 13 aparelhos, cortes "depois" e "antes") e 2 sessões curtas no site no ar. O que as correções das jornadas (J01–J48, em [`JORNADAS.md`](JORNADAS.md)) já resolveram saiu da lista. Quando um achado repete ou completa um J…, a última coluna diz qual.

- **Nada chegou à produção.** Furos na guarda de rede: 0 nas 18 sessões. Nas rodadas com dados falsos, o pacote do jogo é montado com um Supabase que não existe, e toda requisição que não é do próprio pacote é abortada. No site no ar só passou GET: 203 arquivos do site e 4 leituras em `/rest/v1/` (`jogos` e `ranking_semana`). O que foi cortado: 2 `rpc` (`ver_desafio` e `galeria_trofeus`, ambos POST), 6 conexões do Realtime e 2 do Turnstile. Ninguém escolheu time nem jogou no ar.
- **Prints:** os 11 usados aqui estão em [`prints-simulador/`](prints-simulador/), em PNG comprimido. Os outros (cerca de 330) ficam em `prints/simulacoes/2026-11-06/`, fora do Git.
- **A mesma tabela** está em [`achados.csv`](achados.csv).

## Resumo

21 achados do jogo: **0 bloqueiam, 8 atrapalham, 13 são detalhes** (um deles é oportunidade). Mais 9 itens que pareciam erro, mas são limite do simulador (ver [Limites do simulador](#limites-do-simulador-falsos-positivos)).

| Tipo | Quantos |
|---|---|
| layout | 8 |
| acessibilidade | 8 |
| regra do `jogo.md` | 2 |
| erro | 1 |
| desempenho | 1 |
| oportunidade | 1 |

| Persona | Aparelho | Achados |
|---|---|---|
| Zé | Android 360×740, CPU 6×, 4G ruim, fonte 130% | 8 |
| Duda | iPhone SE 375×667 (WebKit, Instagram) | 4 |
| Seu Antônio | Galaxy S21 384×854, fonte 150%, movimento reduzido | 10 |
| Camila | iPhone 15 Pro Max 430×932, Safari e instalado | 5 |
| Rafa | PC 1920×1080 Firefox e notebook 1366×768 Opera GX, só teclado e mouse | 5 |
| Léo | Galaxy Z Fold 344×882 e 884×1104 | 5 |
| Bia | Redmi 393×873, modo escuro, economia de dados | 7 |
| Dona Neusa | iPad 810×1080 e 1080×810 (WebKit) | 4 |

**O que mais apareceu:** fonte grande. Com a fonte do sistema em 150% (Seu Antônio), o Ranking, os Lances, o Time do Dia e o Crava cortam ou sobrepõem texto (S02 a S05). O teste de 360 px com fonte normal não pega isso.

**O que passou bem:**
- girar o celular, dobrar e desdobrar o Fold no meio da partida: o campo continua na tela e o chute responde;
- toque duplo em "Jogar agora" começa uma partida só;
- o vestiário pergunta "Sair sem salvar?" no botão e no voltar do celular;
- o código de outro aparelho funciona nas 3 variações (recusado, "Qual time fica?" e pronto);
- a Carreira cabe inteira no Perfil a 390×844;
- com movimento reduzido, o papel picado, o pulinho e o replay do resultado ficam parados;
- nenhuma palavra proibida, nenhuma urgência e nenhuma oferta 18+ para a Duda;
- nenhum nome real fora das fichas factuais;
- o card sem rede abriu em 3,0 s no corte depois.

## Top 10

1. **S06 · Botões atrás da barra de baixo.** Quando a tela rola até um botão, ele pode parar sob a barra fixa. No Zé, o toque em "Card" caiu na barra e o card não abriu.
2. **S02 · Abas com fonte 150%.** No Ranking, "TEMPORADA" e "CIDADES" se sobrepõem e "CONQUISTAS" sai da tela. Nos Lances, "PÊNALTIS" fica coberta. A página rola para o lado.
3. **S01 · Leitor de tela.** As linhas do Ranking e da Galeria leem "Abrir a Casa do X" em vez do que aparece.
4. **S08 · Voltar com a ficha aberta.** O voltar do navegador ou do Android sai da tela em vez de fechar a ficha do lance.
5. **S05 · Crava com fonte 150%.** O aviso fixo ocupa 3 linhas no topo e cobre a data e o "Certeza ×2" ao rolar.
6. **S04 · Time do Dia com fonte 150%.** As pistas vazam ou cortam ("1910↑", "nterio").
7. **S03 · Ranking com fonte 150%.** Os nomes saem encurtados e o número de torcedores some.
8. **S07 · Fim da Home.** Com fonte 130% a 360 px, "Termos e privacidade" fica sob a barra mesmo no fim da página.
9. **S10 · Dois amarelos.** No resultado da 1ª partida, "Revanche" e "Escolher a cidade" são os dois amarelos.
10. **S11 · Código do aviso de queda.** Tem 11 px e contraste 4,27:1. Veio com a correção do J03.

## Achados

Os endereços valem para `npm run dev` (ou para o pacote do simulador). Fonte grande, movimento reduzido e o tamanho de tela vêm do aparelho de cada persona; para ver igual, rode a persona: `npm run simular -- --persona=antonio`.

| id | persona | aparelho e navegador | tela | o que aconteceu | gravidade | tipo | print | como reproduzir | sugestão | relação com as jornadas (J…) |
|---|---|---|---|---|---|---|---|---|---|---|
| S01 | Todas | Todos os aparelhos | Home, Ranking (Semana e Temporada) e Galeria | O nome que o leitor de tela lê não começa pelo texto que aparece: as linhas do Ranking dizem "Abrir a Casa do Flamengo" e escondem posição, torcedores e pontos; também o "Lance do dia", o "Giro" e as linhas da Galeria (axe label-content-name-mismatch, até 20 elementos por tela). Quem usa leitor de tela ou comando de voz ("tocar em Flamengo") não acha a linha. | atrapalha | acessibilidade | [S01](prints-simulador/S01-ranking-rotulos.png) | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois&temporadaFalsa → Ranking` | Tirar o aria-label e deixar o texto da linha, com "abrir a Casa" em texto só para leitor; ou começar o aria-label pelo texto visível. | novo |
| S02 | Seu Antônio | Galaxy S21 384×854 · Chromium (Samsung Internet) · fonte 150% | Ranking e Lances do Jogo | Com a fonte do sistema em 150%, as abas do Ranking se sobrepõem ("TEMPORADA" sob "CIDADES") e "CONQUISTAS" sai pela direita. Nos Lances, "PÊNALTIS" fica coberta por "FALTAS" e "PERTO DO PRÓXIMO" sai da tela. A página passa a rolar 12 px para o lado (396 px numa tela de 384). | atrapalha | layout | [S02](prints-simulador/S02-ranking-fonte-150.png) [S02](prints-simulador/S02-lances-fonte-150.png) | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois → Ranking e Lances, com a fonte do aparelho em 150%` | Abas que quebram em duas linhas ou rolam dentro da própria faixa; incluir fonte 150% no teste de 360 px. | resto do J15 (corrigido a 344 px com fonte normal) |
| S03 | Seu Antônio | Galaxy S21 384×854 · fonte 150% | Ranking (Semana) | Os 20 nomes de torcida saem encurtados: "Athletico-PR 10…", "Bahia 14 torce…". O número de torcedores some. | atrapalha | layout | [S02](prints-simulador/S02-ranking-fonte-150.png) | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois&temporadaFalsa → Ranking, fonte 150%` | Nome do time numa linha e "N torcedores" em linha menor embaixo. | novo |
| S04 | Seu Antônio | Galaxy S21 384×854 · fonte 150% | Time do Dia (exemplo de pistas e chutes) | Com fonte 150%, as pistas não cabem nas células: "1910↑" vaza para a vizinha e "Interior" vira "nterio". Os títulos "TÍTULOS SÉRIE" ficam colados. O Seu Antônio não consegue ler a pista que decide o chute. | atrapalha | layout | [S04](prints-simulador/S04-time-do-dia-fonte-150.png) | `/?homeFalsa&diaFalso=flamengo&corte=depois, fonte 150%` | Células com fonte limitada (clamp) e texto curto abaixo de certa largura ("Int." / "Cap."). | complementa o J12 (legenda já corrigida) |
| S05 | Seu Antônio | Galaxy S21 384×854 · fonte 150% | Crava a rodada | O aviso fixo "Aqui é só resenha…" ocupa 3 linhas grudado no topo e, ao rolar, cobre a data e o "Certeza ×2" do jogo de cima. As bolinhas de forma (V, D, E) cortam na direita. | atrapalha | layout | [S05](prints-simulador/S05-crava-aviso-fixo.png) | `/?homeFalsa&corte=depois → Palpites, fonte 150%` | Decisão de produto: aviso fixo mais baixo com fonte grande (uma linha, ou fixo só no topo da lista). Forma com bolinhas menores ou só as 3 últimas. | novo |
| S06 | Zé, Camila, Bia | Android 360×740 (fonte 130%), iPhone 15 430×932, Redmi 393×873 | Home e resultado | Quando a tela rola até um botão (rolagem automática, voltar para a tela, foco do teclado), ele pode parar atrás da barra fixa de baixo: "Jogar agora" do Zé, cards dos Lances e da Prova da Camila, e a fileira Card · Stories · Emoji · Link do resultado sob a barra Início · Revanche. No Zé, o toque em "Card" caiu na barra e o card não abriu. | atrapalha | layout | [S06](prints-simulador/S06-card-sob-a-barra.png) | `/?homeFalsa&penaltiFalso&d=abcdefgh&corte=antes → jogar o X1 → resultado (360×740, fonte 130%)` | html { scroll-padding-bottom: altura da barra + safe-area } e o mesmo para a barra do resultado (WCAG 2.4.11). | novo |
| S07 | Zé | Android 360×740 · fonte 130% | Home (fim da página) | Rolando até o fim, o link "Termos e privacidade" continua embaixo da barra de navegação: não dá para tocar nele. | atrapalha | layout | — | `/?homeFalsa&penaltiFalso&lancesFalsos&cenario=lances&corte=depois, rolar até o fim` | Espaço no fim da página = altura real da barra (medida com a fonte grande) + safe-area. | novo |
| S08 | Rafa (vale para todo Android) | PC 1920×1080 Firefox e notebook 1366×768 Opera GX | Ficha do lance | Com a ficha de um lance aberta, o voltar do navegador (ou do celular) não fecha a ficha: sai da tela para a página anterior. | atrapalha | acessibilidade | — | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois&cenario=lances → Lances → abrir uma ficha → voltar` | Empurrar o histórico ao abrir fichas e folhas, como o vestiário já faz (src/telas/vestiario/voltar.ts). | novo |
| S09 | Bia | Redmi Note 393×873 · Chromium (escuro, economia de dados) | Seu card | Dois toques rápidos em "Salvar imagem" baixam dois arquivos. O "Compartilhar" já tem trava; o "Salvar" não. | detalhe | erro | [S09](prints-simulador/S09-toque-duplo-salvar.png) | `/?homeFalsa&cardFalso&estilo=poster&formato=stories&corte=depois → 2 toques em Salvar imagem` | A mesma trava do Compartilhar (botão desligado até terminar). | resto do J32 |
| S10 | Zé, Bia, Léo, Seu Antônio | Vários | Resultado da 1ª partida (convite da cidade) | Dois botões amarelos na mesma tela: "Revanche" (ou "Jogar de novo", "Mais uma") na barra de baixo e "Escolher a cidade" no convite "Defende sua cidade também?". | detalhe | regra do jogo.md | [S10](prints-simulador/S10-dois-amarelos.png) | `/?homeFalsa&penaltiFalso&d=abcdefgh&corte=depois → jogar → resultado` | "Escolher a cidade" no estilo claro, como os botões da placa do troféu. | novo |
| S11 | Bia | Redmi Note 393×873 | Lances: aviso de conexão caída | A linha "código: tempo_esgotado" tem 11 px e contraste 4,27:1. A regra pede 12 px no mínimo e 4,5:1 para texto pequeno. Veio com a correção do J03. | detalhe | acessibilidade | [S11](prints-simulador/S11-codigo-11px.png) | `/?homeFalsa&lancesFalsos&cenario=lances&caiNoLance=2&corte=depois → falta → 2º chute` | 12 px e um tom mais claro sobre o vermelho. | efeito do J03 |
| S12 | Léo | Galaxy Z Fold dobrado 344×882 | Placar da partida (Lances da Seleção) | As siglas do placar ("SELEÇÃO", "ITÁLIA") têm 10 px. | detalhe | layout | [S12](prints-simulador/S12-siglas-10px.png) | `/?homeFalsa&lancesFalsos&corte=depois → Lances → Seleção → Jogar (344 px)` | Mínimo de 12 px, com sigla mais curta se precisar. | novo |
| S13 | Zé | Android 360×740 · fonte 130% | Placar da disputa | "JUNIOR BARRANQUILLA" ainda sai encurtado com reticências no placar da partida com fonte grande. | detalhe | layout | — | `/?homeFalsa&penaltiFalso&d=abcdefgh&corte=depois, fonte 130%` | Mesma solução de duas linhas do placar do adversário, também na sigla. | resto do J25 |
| S14 | Todas | Vários | Lances, Ranking, Galeria, Crava, Prova, resultado | Abas e botões lado a lado com larguras diferentes: Todos · Meus troféus · Perto do próximo; Esta semana · Passada; Campeão · Maior torcida; Rodada · Brasileirão; Tira duas · Arquibancada · Troca; Início × Revanche. | detalhe | regra do jogo.md | — | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois → cada tela` | A mesma solução das sub-abas de Cidades (iguais e na largura toda). Início × Revanche pode ser proporção escolhida: decidir. | novo |
| S15 | Todas | Todos os aparelhos de toque | Cabeçalho, abas de 2º nível, Home | Alvos com 36 a 38 px de altura: o selo "Pré-temporada: o que é" (36 px), as abas de 2º nível (38 px) e o "trocar" do time (47×36). | detalhe | acessibilidade | — | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois` | Altura mínima de 44 px (área de toque, mesmo com o desenho menor). | novo |
| S16 | Rafa | Notebook 1366×768 · Opera GX | Sininho | Esc não fecha o painel do sininho. | detalhe | acessibilidade | — | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois → Tab até o sininho → Enter → Esc` | Fechar com Esc como as outras folhas. | novo |
| S17 | Rafa | PC 1920×1080 · Firefox | Home | Percorrendo com Tab, o foco volta para o topo da tela 3 vezes no meio do caminho. | detalhe | acessibilidade | — | `/?homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&corte=depois → Tab` | Ordem do DOM igual à ordem visual (o que é inserido depois entra no lugar certo). | novo |
| S18 | Seu Antônio | Galaxy S21 384×854 | "?" das regras (Crava, Prova, Lances) | O texto das regras rola, mas a área não recebe foco: quem usa teclado não consegue rolar (axe scrollable-region-focusable). | detalhe | acessibilidade | — | `/?homeFalsa&provaFalsa&corte=depois → Prova → ?` | tabindex="0" na área que rola. | novo |
| S19 | Seu Antônio | Galaxy S21 384×854 · movimento reduzido | Aquecimento, estações 1 a 3 | Com movimento reduzido, o desenho da cena continua mudando sozinho. A mão já vira seta parada, e o papel picado e o replay do resultado ficaram parados. | detalhe | acessibilidade | [S19](prints-simulador/S19-aquecimento-movimento.png) | `/?homeFalsa&aquecimentoFalso&corte=depois, movimento reduzido` | Conferir no celular o que se mexe (goleiro esperando, torcida) e parar o que for enfeite. | a confirmar |
| S20 | Zé | Android 360×740 · CPU 6× · 4G ruim | Primeira visita e Home | Home em 4,2 s no corte depois (meta 4 s). No ar, a 1ª visita leva 5,2 s até a escolha do time, com 185 KB de JS; o link do X1 baixa 248 KB. | detalhe | desempenho | — | `npm run simular -- --persona=ze --alvo=producao` | Ver o que a 1ª tela não usa no pedaço inicial (escolha do time sem o resto). | novo |
| S21 | Duda, Camila, Dona Neusa | iPhone e iPad (WebKit) | Primeira tela e 2ª aba | O WebKit avisa que as fontes Anton e Barlow Condensed 700 e o index.js pré-carregados não foram usados nos primeiros segundos. | detalhe | oportunidade | — | `/?homeFalsa&corte=depois no WebKit` | Conferir no Safari de verdade se a fonte é baixada duas vezes; se for, ajustar o preload. | a confirmar |

### Já estavam nas jornadas e continuam

- **J09:** em tela grande (PC, notebook, iPad, Fold aberto), o jogo continua numa coluna de cerca de 480 px no meio.

### Corrigidos pelos PRs #138 a #144 e confirmados nesta rodada

- **J02:** quem chega por link de lance vai direto ao lance. O aquecimento não aparece no caminho.
- **J03:** com a rede caindo no 2º chute dos Lances, o aviso agora diz "Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.", com o código numa linha à parte (ver S11).
- **J31:** no PC, a dica do card diz "use ‹ › ou as setas do teclado", e as setas trocam o estilo sem focar o carrossel.
- **J32:** o código do "Compartilhar" tem a trava. O simulador ainda conta dois compartilhamentos, mas é efeito dele (ver os limites, item 4); o "Salvar imagem" continua sem trava (S09).

## Desempenho

Medido no Chromium com CPU 6× mais lenta e 4G ruim (400 ms de latência, 1,6 Mbps), como o celular do Zé. "Pacote" é o build do jogo com dados falsos servido localmente; "no ar" é o site publicado.

| Medida | Onde | Corte depois | Corte antes |
|---|---|---|---|
| Link do X1 até a Home com o convite | pacote | 4,2 s (meta 4 s) | 3,6 s |
| "Jogar agora" até a lista dos lances | pacote | 1,0 s | 0,7 s |
| Tarefas longas nos 5 arrastes do X1 | pacote | 4, maior 87 ms | 1, maior 99 ms |
| Card sem rede até abrir | pacote | 3,0 s | não medido (o toque caiu na barra, S06) |

| No ar (Zé) | Primeira pintura | JS baixado | Maior tarefa longa |
|---|---|---|---|
| 1ª visita até a escolha do time | 5,2 s | 185 KB | 392 ms |
| 2ª visita (com cache) | 1,9 s | 185 KB | 218 ms |
| Link de X1 até o 1º botão | 2,3 s | 248 KB | 378 ms |
| Home de quem já tem time | 2,2 s | 249 KB | 227 ms |

A Duda no ar (iPhone SE, sem limitar CPU nem rede) chegou à primeira tela do link do lance em 0,3 s, com 178 KB de JS e 291 KB no total.

## Limites do simulador (falsos positivos)

Estes itens apareceram no consolidado e **não** são do jogo:

1. **O WebKit do Windows trava** ("Target crashed") na cena 3D dos Lances, na Galeria, na Casa, nos Termos e, às vezes, no Perfil. Por isso não rodaram:
   - as 10 partidas e a 11ª de treino da Camila;
   - o lance da Duda;
   - a Casa do São Paulo e os Termos da Dona Neusa, com "Ver meus dados" e "Apagar meus dados" (as folhas foram vistas pelo Perfil).

   Também caíram daí uma "tela em branco", a falta de `<title>` e de `lang` (página morta) e o axe que não rodou. Vai para o celular de verdade (item 13 abaixo).
2. **Botão "coberto" por folha aberta.** Com uma folha aberta por cima (ficha do lance, "Sair sem salvar?", regras), a conferência marcava os botões de baixo como cobertos. É o esperado de uma folha.
3. **Botão "coberto" no primeiro quadro.** Um card logo abaixo da dobra aparece sob a barra de baixo antes de rolar. Só entrou na tabela o que continua coberto no fim da página (S07) ou depois da rolagem automática (S06).
4. **Toque duplo no Compartilhar.** O compartilhar falso do simulador responde na hora, então a trava do J32 solta antes do 2º toque. No celular, a folha de compartilhar segura a trava até fechar.
5. **Dois amarelos com folha aberta.** "Jogar agora" com o Seu card aberto por cima, e "Começar a Prova" com as regras abertas. O "Meu boneco ✓" amarelo no Pôster é previsto (`jogo.md` 14.6).
6. **Rede caindo nos Pênaltis do Zé.** O `?penaltiFalso` não usa a rede, então desligar a rede não derruba a partida. Só o `&caiNoLance=` dos Lances simula a queda (é o caso da Bia).
7. **Avisos de console da guarda:** requisição bloqueada, Service Worker bloqueado, "Cross-Origin Request Blocked" no Firefox, "Lances sem servidor: tempo_esgotado" e o aviso `longtask` do Firefox (é o medidor do simulador).
8. **Sininho no Opera.** O painel diz "O aviso ainda não está configurado no servidor" porque o pacote do simulador não tem a chave do aviso. Não dá para saber, por aqui, se o aviso do Opera aparece.
9. **"Sem valer pontos" no ar.** Sem login, a tela dos Lances no ar não diz que a partida não vai valer. Como ninguém jogou no ar (de propósito), não dá para concluir: o aviso aparece ao começar a partida.

Também dependem do servidor e ficaram "não simulável":
- o filtro de apelido (apelido barrado);
- ligar o aviso de domingo;
- o resultado do lance da Duda no WebKit.

## Só no celular de verdade

O simulador roda os motores do Playwright no Windows. O WebKit daqui não é o Safari do iPhone, e o user agent do WhatsApp, do Instagram, do Samsung Internet e do Opera muda só o que o jogo detecta, não o navegador. O que segue não fica provado. Faça num aparelho limpo (limpe os dados do site antes) e anote o que ficou diferente do esperado.

**1. Link do X1 dentro do WhatsApp (Android).** Mande para você mesmo, no WhatsApp, o link de um X1 de pênaltis. Toque nele dentro da conversa, sem "Abrir no Chrome".
- A Home abre com "Te chamaram no X1" em até uns 5 s no 4G?
- Escolha o time, responda a triagem e aceite o X1. O jogo segue dentro do WhatsApp até o resultado?
- Toque no sininho 🔔: ele explica que o navegador do WhatsApp não recebe avisos?
- No resultado, "Compartilhar no WhatsApp" volta para o WhatsApp com o texto e o link?

**2. Link de lance pelo Instagram (iPhone).** Poste nos seus Stories (ou mande por Direct) o link de um lance e abra pelo próprio Instagram.
- O lance abre depois da escolha do time e da triagem?
- No resultado, Stories com o Pôster: a folha de compartilhar do iPhone aparece com a imagem? E "Salvar imagem" salva na galeria?
- Digite a frase própria e o apelido: o teclado cobre o campo ou o botão de confirmar?

**3. Folha de compartilhar do iPhone (Safari).** Num resultado, toque em Stories e em Card. A folha abre com a imagem 1080×1920 (Stories) e 1080×1080 (Quadrado)? O Instagram recebe a imagem certa?

**4. Vibração (Android).** Com a vibração ligada no Perfil: gol, aquecimento (cada estação vibra 60-40-90 ms), medalha e placa do troféu. No iPhone não vibra (é esperado).

**5. Jogo instalado.** No iPhone: Safari → Compartilhar → Adicionar à Tela de Início. No Android: menu ⋮ → Instalar app. Abra pelo ícone.
- Abre sem a barra do navegador, com o topo respeitando o entalhe e a barra de baixo respeitando a linha de gestos?
- Feche e abra de novo depois de uma atualização do site: a versão nova chega?

**6. Aviso de domingo.** Só no Chrome do Android ou no iPhone com o jogo instalado, com a faixa 18+.
- Depois de uma vitória que valeu, o convite do aviso aparece? Aceite.
- No domingo às 18h chega o aviso, só com a situação da torcida, sem urgência?
- Com a triagem "menos de 16" (outro aparelho limpo), o convite nunca aparece e o sininho não oferece o aviso.

**7. Turnstile (login invisível).** Num aparelho limpo, no 4G: escolha o time e jogue uma partida. Ela vale pontos (sem o "sem valer pontos")? Se aparecer erro de verificação, anote o navegador.

**8. Samsung Internet de verdade.** Abra o site no Samsung Internet com o modo escuro do navegador ligado (ele escurece sites sozinho) e a fonte do sistema no máximo.
- Cores do time, botões amarelos e textos ficam legíveis?
- Algum texto sai da tela ou corta?

**9. Fonte grande e movimento reduzido de verdade.** No Android: Configurações → Tela → Tamanho da fonte no máximo; Acessibilidade → Remover animações. No iPhone: Tamanho do Texto e Reduzir Movimento.
- A Home, o resultado e o card cabem sem rolar para o lado?
- Com movimento reduzido: o papel picado, o pulinho, o replay e a mão do aquecimento ficam parados?

**10. Rede caindo de verdade.** No meio de uma partida, ligue o modo avião por 10 s e desligue.
- O jogo avisa e continua, ou a partida vira "sem valer pontos"? Os pontos aparecem no Perfil depois?
- Com o modo avião ligado, abra o card do último resultado: abre em até ~4 s, sem o Pôster?

**11. Celular dobrável e iPad.** No Fold, abra o jogo dobrado e desdobre no meio de uma partida. No iPad, gire de pé para deitado na Home e na partida. Nada pula para fora da tela e o chute continua respondendo?

**12. Duas abas e duas pessoas.** Abra o jogo em duas abas do mesmo navegador e jogue uma partida em cada. As duas valem? O Perfil soma as duas?

**13. O que o WebKit do simulador não abriu (iPhone e iPad).** No Safari:
- jogue 10 partidas de Lances e uma 11ª: ela vira treino e diz isso antes de começar?
- abra a Galeria, a Casa do seu time e os Termos e role até o fim: nada trava nem fica em branco?
- em Termos, "Ver meus dados" mostra os seus dados. Em "Apagar meus dados", toque em Voltar: **não confirme**.

**14. Fonte grande nas telas de S02 a S05.** No Android com a fonte no máximo, abra o Ranking, os Lances, o Time do Dia e o Crava e confira se o que a tabela descreve aparece igual.

## Como rodar de novo

Para conferir o jogo depois de uma mudança grande. Leva cerca de 1 hora com todo mundo (a máquina de hoje, com pouca memória livre).

1. Peça ao Claude: "roda o simulador de uso de novo e compara com a última rodada". Ele faz os passos abaixo.
2. `npm run simular` roda as 8 personas com os dados falsos, nos cortes de cada uma. Para uma só: `npm run simular -- --persona=ze --corte=depois`. O pacote do jogo é remontado sozinho quando algo em `src/` muda.
3. `npm run simular -- --persona=ze,duda --alvo=producao` faz a rodada curta no site no ar, só de carregamento (só GET passa).
4. `npm run simular:consolidar` junta tudo em `prints/simulacoes/<data>/consolidado.md`.
5. O Claude separa o que é do jogo do que é limite do simulador, compara com o `achados.csv` desta pasta e escreve um relatório novo em `docs/auditoria/<data>/simulacoes/`.

Se o comando parar com "rodada cancelada" ou "FUROS", nada foi enviado: a guarda achou o endereço de produção no pacote ou uma requisição que não devia passar. Não force; peça ao Claude para olhar.
