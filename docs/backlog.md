# Backlog — novembro de 2026

> Montado em 08/11/2026, com o jogo no ar depois do corte dos Lances unificados, para os dias de teste com amigos.
> Junta três origens: **K** (pontos do Kauê), **P** (já previsto no `docs/proximos-passos.md`, nos relatórios das jornadas e do simulador e nas propostas) e **C** (análise e propostas do Claude).
> Regras e decisões continuam no `docs/jogo.md`. Este arquivo é a fila de ideias. Um item sai daqui quando vira decisão no `jogo.md` ou trabalho no `proximos-passos.md`.
> Os códigos de antes de 08/11 (M, R, S, D, I, V, T, X, G, do backlog de pesquisa do projeto do Chat) são outra lista; aqui valem só os IDs desta página.

**Como ler:**
- **Prioridade:** **P0** antes de divulgar · **P1** próximo ciclo · **P2** quando der · **P3** ideia guardada.
- **Tamanho:** **P** cabe numa sessão · **M** 2 ou 3 sessões ou passa pelo servidor · **G** vários dias, desenho no Chat e servidor.
- **Quem:** **Chat** (desenho e decisão) · **Claude** (construção) · **Kauê** (painéis, advogado, celular).

---

## 1. Análise crítica (o que vejo hoje)

1. **O jogo cresceu mais rápido que a hierarquia das telas.** O resultado dos pênaltis empilha até 14 blocos: placar, pontos, parcelas, desafio, rumo às medalhas, frase, 3 melhores, selos, peça nova, Carreira, Mandar no grupo, Card/Stories/Emoji/Link e o convite da cidade. A Home soma faixa da pré-temporada, aquecimento, placa do troféu, lembrete da cidade, Termos mudaram, sininho e card das divisões. Cada peça faz sentido sozinha, mas juntas viram texto demais. É o ponto 1 do Kauê e, para mim, **o maior risco de produto hoje**: quem chega por link não entende o que importa.
2. **O desafio é o motor de crescimento e está escondido.** Ele mora dentro do "Mandar no grupo" e do "Link", sem botão próprio. Quem recebe não vê o que o outro fez. E o funil continua sem medida: "enviado" ainda quer dizer "gerado" (proposta de 31/10, item 1, nunca feita). Sem isso, os testes com amigos não respondem se o desafio funciona.
3. **Compartilhar é forte no papel e fraco no movimento.** Card estático, medalha e lance já existem. O que mais emociona no jogo, o gol com replay e o boneco comemorando, não sai do celular. Os pontos 2 e 3 do Kauê atacam exatamente isso.
4. **Muita regra mudou em pouco tempo.** Corte antecipado duas vezes, tabelas novas, faixas recalibradas, 3 melhores. O jogo ensina pela dica na hora do erro, mas não existe um "o que mudou" para quem já jogava. Para a turma dos testes, vale uma nota curta na Home, uma vez.
5. **Não há olho na produção.** Erro de tela só aparece se alguém mandar print com o código do motivo. Não há registro de exceção do navegador nem contagem de eventos (abriu link, compartilhou, desistiu na triagem). Com amigos testando, metade dos problemas vai passar sem ninguém ver.
6. **O iPhone está pouco coberto.** O WebKit do simulador trava no Windows (Lances, Galeria, Casa, Termos), então todo teste de iOS depende do celular de alguém.
7. **A documentação virou gargalo.** O `jogo.md` tem ~1.200 linhas, e a linha "Última atualização" passa de 5 mil caracteres. O `proximos-passos.md` mistura histórico com fila. Cada conversa nova gasta muito para se situar.
8. **Pontos fortes que valem proteger:** anti-trapaça sério (semente por lance, servidor recalcula), regras de ECA e de "zero aposta" levadas a sério, simulador de personas, revisão de segurança antes de publicar. Nenhuma proposta abaixo pode afrouxar isso.

---

## 2. Ordem sugerida para depois dos testes

0. **Agora, durante os testes:** A10 e H01a. O C01 (com o I03) está no ar desde 09/11.
1. **Semana de 09/11:** A06 (conferências de 09/11, 12h); a central de avisos (B01) e o HOME2 (nova ordem da Home, que levou o B03) já estão feitos.
2. **Semana de 16/11:** C03 + C08 (ver o gol de quem chamou, redesenhado no aparelho de quem abre); E04 (roteiro de iPhone); D07 (Palpite da Rodada na entressafra).
3. **Depois:** C04 (com a prova de conceito antes), C05, H01b e H02, F01 e A08 (e a personalização do Perfil, com o que os amigos disserem).
4. **Antes da divulgação pública:** A01 a A05.

---

## 3. Itens por tema

### A. Antes de divulgar

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| A01 | Plano do Supabase decidido (Pro) | P | Pro quando o banco passar de 250 MB, ou ~150 pessoas jogarem por dia, ou antes da divulgação pública (o que vier primeiro); os testes com amigos seguem no Free. Limites do plano grátis, pausa por inatividade e backups. | P0 | P | Kauê |
| A02 | Termos com o advogado (pontos 4 e 5, código do torcedor, cidade, boneco em campo, contagem de uso) | P | O parecer veio sem OAB, e a página tem valor legal (ECA Digital). | P0 | M | Kauê |
| A03 | Balanço rodado e pré-temporada zerada (até 06/12) | P | O balanço tem de rodar antes de zerar. A semana de 02/11 já soma as duas regras. | P0 | P | Kauê + Claude |
| A04 | Prova calibrada com as partidas de 20 s | P | A mediana e os 4 erros usam só partidas desde 06/11, 16h47. | P0 | P | Claude + Kauê decide |
| A05 | Funil do desafio medido (ver C01) | P | Feito no C01 e no ar desde 09/11: falta esperar dias de teste com o link indo para gente de fora. | P0 | P | Kauê |
| A06 | Conferências marcadas: bloco 8 (09/11, 12h), fechamento do mês (07/12) | P | Só leitura, sem lembrete automático. | P0 | P | Kauê + Claude |
| A07 | Testes no celular que ficaram para trás (aquecimento, troféus, G3 com TalkBack, boneco em campo, limpeza dos Lances) | P | Lista na seção "No celular" do `proximos-passos.md`. Dá para fazer junto com os amigos. | P0 | P | Kauê |
| A08 | Perguntas até 800 (hoje 328) | P | Perguntas nascidas de páginas reais; os 5 crons do Gemini ficam como estão (decidido em 07/11). | P1 | G | Claude + Gemini |
| A09 | Auditor do Gemini com falhas 429 | P/C | Decidido em 07/11: ficam os 5 crons. Espaçar a auditoria se os 429 crescerem (a coluna `codigos` separa 429 de 503). | P3 | P | Claude |
| A10 | **Acompanhamento diário dos testes** | C | O Chat lê, só leitura: partidas, desafios gerados e aceitos, partidas sem valer por motivo, mensagens do "Achei um erro" e erros das funções, até o F01 existir. Os amigos usam o "Achei um erro" para relatar. | P0 | P | Chat |

### B. Clareza das telas (ponto 1 do Kauê)

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| B01 | ~~Central de avisos (o sininho vira caixa de entrada)~~ **feito em 09/11/2026** | K | O sininho é a caixa de avisos para todo mundo: Termos, cidade, aquecimento, peça nova, troféu e placa do mês, desafio aberto; o push (18+) vira um bloco no fim. `docs/visual.md`, "Central de avisos". | — | — | — |
| B02 | ~~Resultado em duas camadas~~ **feito em 09/11/2026** | C | Primeira dobra: placar, pontos, um destaque, a prévia da mensagem e "Desafiar a galera". O resto em "Ver detalhes da partida", na mesma tela. `docs/visual.md`, 4.6. | — | — | — |
| B03 | ~~Regra de "um aviso por vez" na Home~~ **feito em 09/11/2026, dentro do HOME2** | C | A vaga do momento, logo abaixo do "Jogar agora": fim do mês, depois Troféu novo, depois Termos (`jogo/vagaDoMomento.ts`); o resto espera a próxima abertura até a central (B01). | — | — | — |
| B04 | "O que mudou" para quem já jogava | C | Uma placa, uma vez, depois de mudança de regra (ex.: 3 tentativas do mesmo lance, 3 melhores). Também vai para a central. | P2 | P | Claude |
| B05 | ~~Nome longo no placar grande do resultado~~ **feito em 09/11/2026** | P | Quebra em duas linhas, sem reticências ("JUNIOR BARRANQUILLA" a 360 px com fonte 130%). | — | — | — |
| B06 | Barra de navegação opaca, como a do resultado | C | Hoje é 96% opaca, e dá para ver um pouco do que rola atrás. | P3 | P | Claude |
| B07 | Dois amarelos na tela "Seu card" e no vestiário (Salvar duplo) | P | O simulador acusou na rodada de 07/11. | P2 | P | Claude |

### C. Compartilhar, desafio e crescimento (pontos 2 e 3 do Kauê)

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| C01 | ~~Contar o funil do desafio~~ **feito em 08/11/2026** | P | Compartilhou (por tipo e meio), abriu, aceitou, 1º chute, terminou e jogo de volta, sem identificar ninguém; "Funil do desafio" no `npm run metricas`. Regra em `jogos/contas.md`, "Contagem de uso". Conta desde a publicação da função `funil`. | — | — | — |
| C02 | ~~Botão "Desafiar" no resultado (Lances e pênaltis)~~ **feito em 09/11/2026** | K/C | "Desafiar a galera" é ação própria, verde, no lugar do "Mandar no grupo" quando há código de desafio. `docs/visual.md`, 4.6. | — | — | — |
| C03 | **Ver as tentativas de quem chamou** antes de jogar o desafio dos Lances | K | Hoje quem aceita vê só "Camisa10 fez 96". Mostrar os 3 desfechos (e, com C04, o replay dos gols). Precisa do `ver_desafio_lances` devolver os desfechos. **Lances:** quem aceita joga com sementes novas, então dá para mostrar antes. **Pênaltis:** as cobranças gravadas de quem chamou são o alvo das defesas de quem aceita; só podem aparecer depois que o desafio termina. | P1 | M | Chat → Claude (servidor) |
| C04 | **Replay do gol compartilhável** | K | Detalhe na seção 4.3. No resultado: "Compartilhar o replay do gol N". Vídeo curto: a cobrança de trás do batedor e o replay. **Antes do G, uma prova de conceito P:** gravar 3 s do replay e mandar pelo WhatsApp no Android e no iPhone, conferindo se o formato é aceito. | P1 | G | Chat → Claude |
| C05 | **Card animado** (vídeo curto para Stories e WhatsApp) | K | Detalhe na seção 4.2. O card de hoje com confete, o número contando, o boneco comemorando e o fundo do vestiário mexendo. | P2 | G | Chat → Claude |
| C06 | ~~Link do desafio com menos toques (J41)~~ **feito em 09/11/2026** | P | O link abre a tela do convite com as torcidas (a de quem chamou e o rival): 2 toques até o 1º chute para quem é novo, 1 para quem já joga. O apelido ficou só no Perfil. Regra em `jogos/contas.md` ("Primeiro acesso"). | P1 | M | Claude |
| C11 | Prévia do link do desafio no WhatsApp | C | Hoje o link chega com a prévia genérica do site (título "Guerra de Torcidas", sem imagem); estudar uma prévia por desafio, com o placar a bater. | P2 | M | Claude |
| C07 | Placar acumulado do desafio entre duas pessoas (J42) | P | "Zé 2 x 1 Camisa10" na série de jogos de volta, sem apelido público. Primeiro passo do ranking entre amigos. | P2 | M | Chat → Claude |
| C08 | Link de replay que roda no celular de quem abre | C | Em vez de vídeo, o link leva só o gesto e a cena, e o jogo redesenha o gol no aparelho de quem abre. Leve e bom para o WhatsApp. O vídeo (C04) fica para o Stories. Nos pênaltis, as cobranças gravadas de quem chamou só aparecem depois que o desafio termina (ver C03); nos Lances, quem aceita joga com sementes novas, então dá para mostrar antes. | P2 | M | Claude |
| C09 | Prévia bonita do link (Open Graph) por tipo | C | Quem recebe o link no WhatsApp vê hoje a mesma prévia para tudo. Uma imagem por tipo (desafio, lance, medalha) aumenta o clique. Como o site é estático, uma por tipo, não por partida. | P2 | P | Claude |
| C10 | ~~Prazo de validade dos desafios~~ **feito em 09/11/2026** | C | Link vale 7 dias, desafio apagado com 30, chamando `funil_contar_gerados()` antes (`jogos/penaltis.md`, "Desafio por link"; `jogos/contas.md`). No ar desde 09/11. | — | — | — |

### D. Jogo e conteúdo

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| D01 | Pênalti com teclado no PC (J46) | P | Setas miram e Espaço segura e solta a força. A Prova já aceita 1 a 4. | P3 | M | Claude |
| D02 | "Outro time" com clube do interior (J44) | P | Antes dos times criados (fase 2): deixar escrever o clube e mostrar a Seleção como casa. | P2 | M | Chat |
| D03 | Tabela de todos os tempos na Casa (J48) | P | A Casa é a tela que mais prende os mais velhos. | P3 | G | Chat → dados |
| D04 | Ligas do Palpite da Rodada com amigos e cidade (J47) | P | Fase 2 (comunidade). | P3 | G | Chat |
| D05 | Embaixadinha e os jogos da fase 4 | P | Roadmap; só depois do balanço. | P3 | G | Chat |
| D06 | Lance do Dia com algo a mais que o destaque | C | Hoje ele não dá bônus (decidido). Sem mexer em pontos, pode ganhar card próprio ("Fiz o Lance do Dia") ou um selo na Galeria. | P3 | P | Chat |
| D07 | **Palpite da Rodada na entressafra** | C | O Brasileirão acaba em 02/12. Decidir o que o card do Palpite da Rodada e o "Jogar agora" mostram de dezembro a janeiro (ver V09 do backlog de pesquisa do Chat: Prova e Time do Dia seguram o ritmo). | P1 | P | Chat |

### E. Acessibilidade e desempenho

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| E01 | ~~1ª visita em 4G ruim (S20)~~ **feito em 09/11/2026** | P | No Zé (360×740, CPU 6×, 4G ruim), o link do desafio chega ao convite em 3,2 a 3,4 s com 68 a 83 kB de JS (eram 7,6 s e 285 kB): o resumo sai do `index.html` sem o supabase-js, e o resto da Home e o preaquecer esperam o convite. Home e escolha do time em 2,4 a 2,9 s. Medido por `npm run simular:entradas`. O próximo corte é o `index` (~47 kB gzip; o maior pedaço são as frases do narrador) e o supabase-js por partes (auth, Realtime e storage). | — | — | — |
| E02 | Movimento reduzido no aquecimento (S19) | P | A cena continua mudando sozinha. | P2 | P | Claude |
| E03 | Fontes pré-carregadas sem uso no Safari (S21) | P | Conferir no iPhone de verdade antes de mexer. | P3 | P | Kauê + Claude |
| E04 | Plano de teste no iPhone de verdade | C | O WebKit do simulador trava no Windows. Uma lista curta por tela para o Kauê ou um amigo com iPhone, ou um serviço de aparelhos reais por um mês. | P1 | P | Kauê |

### F. Engenharia e operação

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| F01 | **Registro de erros na produção** | C | Uma função que recebe exceções do navegador: mensagem, tela, versão do bundle e código do motivo, sem dado pessoal, com limite por minuto. Uma aba no `#admin`. Entra nos Termos. | P1 | M | Claude + Kauê (Termos) |
| F02 | ~~Documentação mais leve~~ **feito em 08/11/2026** | C | `jogo.md` curto (23 KB, era 230), um doc por módulo em `docs/jogos/`, `docs/decisoes.md` com as datas e o `proximos-passos.md` só com a fila; teto de tamanho e links conferidos por `scripts/docs/tamanho.test.ts`. | — | — | — |
| F03 | ~~Testes mais rápidos e um teste instável~~ **feito em 08/11/2026** | C | `test:rapido` (lógica pura, ~20 s) e `test:banco` (PGlite, ~2 min); `npm test` roda os dois. O estouro do `temporada.test.ts` vinha de reaplicar as 49 migrações a cada banco novo (10 vezes no arquivo, com CPU disputada); agora o banco é montado uma vez por arquivo e copiado (arquivo de 50 s para 9 s). | — | — | — |
| F04 | ~~Ordem de publicação dentro do PR~~ **feito em 08/11/2026** | C | `npm run publicar:conferir` (só leitura): baixa cada função publicada e compara com a `main`; lista igual, diferente (com a data do último commit) ou não publicada; faz o mesmo com as migrações. | — | — | — |
| F05 | Limpezas pequenas | P | `.admin-tabela` e `.conq-falta` sem uso, limite por IP no Código do torcedor, cidade na junção de contas. | P3 | P | Claude |

### G. Comunidade (fase 2, só depois do balanço)

| ID | Item | Origem | Por quê | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| G01 | Times criados pelos jogadores, com moderação | P | `docs/jogo.md` seção 3. A moderação vem antes de liberar. | P3 | G | Chat |
| G02 | Ligas e campeonatos combinados (ranking entre amigos com apelido) | P | Seção 4. Começa pelo C07. | P3 | G | Chat |

### H. Som e bonecos (pontos do Kauê, 08/11/2026)

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| H01a | **Apito mais curto e mais grave e chute com estalo médio** | K | Detalhe na seção 4.4. O apito de hoje é um tom de 2.900 Hz com trinado: agudo e cansativo, toca em toda partida. O chute desce a 45 Hz, grave que o alto-falante do celular nem reproduz. Ajuste direto, já. | P1 | P | Claude |
| H01b | **Assinatura sonora e sons que faltam** | K | Detalhe na seção 4.4. Uma assinatura sonora curta e própria, com variação (I04). Desenho no Chat com página de teste. | P1 | M | Chat (desenho) → Claude |
| H02 | Sons que faltam (MVP de áudio) | C | Hoje só existem 4 sons: chute, trave, torcida e apito. Faltam toque de botão, defesa do goleiro, rede balançando, barreira, recorde, medalha e vitória. Lista na seção 4.4. | P2 | M | Claude |
| H03 | ~~Revitalização dos bonecos~~ | K | **Entregue em 09/11/2026:** estilo "Silhueta premium Plus" (`docs/bonecos.md`). A cintura e o calção foram refeitos; a personalização no Perfil segue com o feedback dos amigos. | — | — | — |
| H03b | ~~Camisa por fora ou por dentro no vestiário~~ | K | **Entregue em 09/11/2026:** par "Camisa por fora" / "Camisa por dentro" na aba Camisa, campo `barra` na `Vestimenta` (não é peça), em todo lugar onde o boneco aparece (`jogos/boneco-montavel.md`). | — | — | — |

### I. Lições dos jogos Flash (material do Kauê, 08/11/2026)

| ID | Item | Origem | Por quê / o que fazer | Prioridade | Tamanho | Quem |
|---|---|---|---|---|---|---|
| I01 | **Momento do jogo escolhido sozinho** | K | O jogo escolhe o melhor lance da partida para o replay compartilhável (C04), sem a pessoa pedir: golaço no ângulo, cavadinha, defesa da última cobrança, vitória no par ou ímpar. Uma pontuação simples, sem IA: o jogo já guarda gesto e semente de cada lance. | P1 | P | Claude (junto do C04) |
| I02 | Vídeo vertical 9:16 com câmera lenta e a frase do narrador | K | Entra na especificação do C04 e do C05: corte vertical, câmera lenta no gol e a frase que o narrador falou como legenda. | P1 | — | (dentro do C04) |
| I03 | ~~Onde a pessoa desiste~~ **feito em 08/11/2026, com o C01** | K | Escolha do time, triagem, aquecimento e partida (por jogo, com e sem desafio), saiu − voltou; "Onde desiste" no `npm run metricas`. Os erros ficam com o F01. | — | — | — |
| I04 | Som com variação e "combo" | K | Cada som toca com o tom ±10% e o volume variando um pouco. Gols seguidos sobem o tom. A torcida abaixa meio segundo quando o narrador ou o apito entram. Entra no H01. | P2 | — | (dentro do H01) |
| I05 | **Passada de "sensação de jogo"** | C | O que fazia os jogos Flash grudarem: do fim da partida ao próximo chute em 1 toque e menos de 2 s; uma pequena pausa e tremida no gol (com movimento reduzido, sem tremida); recorde sempre à vista. Medir o tempo do "Mais uma" até o 1º chute, nos pênaltis e nos Lances. | P2 | M | Claude |
| I06 | Estudar jogos curtos de navegador (sem copiar) | K | Olhar o que dava certo nos jogos de navegador de futebol e de habilidade: reinício instantâneo, uma mecânica só, desafio a um amigo, placar de recordes. Anotar as lições, nunca reproduzir um jogo específico (nome, arte, fases). | P3 | P | Chat |

---

## 4. As três propostas do Kauê, em detalhe

### 4.1 Central de avisos (B01)

**Feito em 09/11/2026.** A regra está em `docs/visual.md` ("Central de avisos") e `docs/jogo.md` (seção 7). O "O que mudou" (B04) entra depois como mais um tipo da caixa (`src/jogo/avisosCaixa.ts`).

### 4.2 Card animado (C05)

**Ideia:** os mesmos estilos do card de hoje (Telão, Só o placar, Pôster), em vídeo de 3 a 5 s:
- o número contando até os pontos;
- confete nas cores do time;
- o boneco fazendo a pose de comemoração;
- a arquibancada ou o fundo do vestiário mexendo um pouco;
- o selo ("NOVO RECORDE!", medalha) entrando com mola.

**Como fazer sem dependência pesada:**
- O card já é desenhado em canvas. O navegador grava o canvas em vídeo (`MediaRecorder` com `captureStream`), quadro a quadro, sem biblioteca.
- O Android grava WebM, e alguns grupos e o Stories pedem MP4. O iPhone grava MP4. Testar o que o WhatsApp e o Instagram aceitam em cada um antes de decidir.
- Compartilhar com `navigator.share({ files: [vídeo] })`. Sem suporte, cai no card estático de hoje.

**Custos e riscos:**
- Gerar o vídeo leva alguns segundos e esquenta celular fraco. Mostrar "Montando o vídeo…" com cancelar e respeitar a qualidade gráfica automática (Leve = só estático).
- Tamanho: manter abaixo de ~2 MB (720 × 1280, 30 quadros por segundo, 4 s).
- Movimento reduzido: oferecer o estático primeiro.
- Bundle: o código do vídeo entra por `import()`, só quando a pessoa pede.

**Ordem:** depois do C04, que monta o mesmo motor de gravação com um caso mais simples.

### 4.3 Replay do gol compartilhável (C04)

**Ideia:** no resultado, quando houve gol com replay (todo gol dos Lances; golaço nos pênaltis), aparece "Compartilhar o replay do gol 2". O vídeo tem duas partes:
1. a cobrança na câmera da partida, de trás do batedor;
2. o replay de TV, de trás do gol, em câmera lenta.

No fim, uma tela com o título do lance, o placar, "Guerra de Torcidas" e o link.

**Por que é viável:**
- O gol já foi resolvido (gesto + semente). O desenho do replay (`criarReplay`) é só visual e roda a partir do caminho da bola.
- Dá para redesenhar a jogada fora da tela, num canvas escondido, e gravar com o mesmo motor do C05.
- Para guardar a jogada até o resultado, a partida guarda os gestos e os resultados de cada tentativa, como já faz.

**Regras:**
- **Boneco:** o batedor é o boneco da pessoa (se "Meu boneco em campo" estiver ligado), nas cores do lance.
- **Nomes reais:** só o título do lance, nunca nome de jogador (`docs/jogo.md` seção 6).
- **Anti-trapaça:** nada muda. O replay é desenho de algo que o servidor já fechou.
- **Partida sem valer:** o replay pode sair também do treino que vira partida sem valer? Proposta: sim, com a marca "Treino" no vídeo. Decisão do Kauê.

**Variante leve (C08):** em vez de vídeo, um link que redesenha o gol no aparelho de quem abre (só gesto e cena). Para o WhatsApp é melhor, porque abre o jogo. Para o Stories, só vídeo serve.

### 4.4 Som e marca sonora (H01, H02, I04)

**Como está hoje** (`src/jogo/som.ts`, tudo sintetizado com Web Audio, nenhum arquivo):
- **Apito:** tom de 2.900 Hz com trinado de 28 Hz. É agudo e fino, toca no começo e no fim de toda partida e cansa rápido.
- **Chute:** desce de 140 Hz para 45 Hz. No alto-falante do celular quase não se ouve: o celular não reproduz abaixo de ~100 Hz.
- **Torcida:** ruído filtrado ("festa" e "uuuh").
- **Trave:** tom metálico.

**Proposta:**
1. **Assinatura sonora** de 1 a 2 s, tocada na abertura e na vitória. Algo que fique na cabeça e seja nosso, como um bumbo de arquibancada, duas palmas e um "ôô" curto de torcida. Nunca hino, cântico de clube real ou som de narrador famoso.
2. **Apito novo:** duas notas curtas, mais graves (por volta de 1,5 a 2 kHz) e com os agudos cortados. Só no começo e no fim; o meio da partida fica sem apito.
3. **Faixa certa para o celular:** os sons ficam entre 500 Hz e 4 kHz. Para o chute ter "peso", um estalo médio no lugar do grave que some.
4. **Variação:** o tom ±10% a cada toque, gols seguidos subindo o tom e a torcida abaixando quando o narrador fala (I04).
5. **Sons que faltam (H02):** toque de botão, defesa, rede, barreira, recorde, medalha e vitória. Curtos (0,05 a 0,4 s), sem silêncio no começo e sem eco longo.

**De onde tirar:**
- Seguir sintetizando o que dá (é leve e já funciona).
- Para o que pede som real (torcida, bumbo, rede), usar bancos com licença **CC0**, sem atribuição obrigatória: Kenney, Sonniss GDC e Freesound filtrado por CC0. A licença de cada arquivo fica anotada num `LICENCAS.md` junto dos sons.
- Ajustar (tom, corte, mistura) antes de usar. Arquivos em Opus ou OGG, mono, carregados só depois da 1ª tela, para não pesar a entrada.

**Regras que valem:**
- O botão Som (mudo) e a escolha de cada pessoa continuam.
- Nada de som de cobrança ou urgência (`docs/jogo.md` seção 7).
- O peso de áudio entra no orçamento do bundle, fora do pacote inicial.

**Desenho no Chat:** ouvir 3 opções de assinatura e 2 de apito antes de construir (dá para gerar uma página de teste com os sons tocando).

### 4.5 O que aproveitar do material sobre jogos Flash

O material traz boas ideias, mas boa parte é para jogo nativo de loja: Godot/Unity, ECS, encoder do sistema, IA rodando no chip do celular. O Guerra de Torcidas é um site leve, aberto pelo WhatsApp, com orçamento de ~300 KB. O filtro ficou assim:

| Ideia do material | Fica? | Como entra aqui |
|---|---|---|
| Replay determinístico (guardar entradas, não pixels) | Já temos | Gesto + semente refazem qualquer lance. É a base do C04 e do C08. |
| Detector de "momento viral" | Sim | I01, com regra simples (golaço, ângulo, defesa decisiva), sem modelo de IA. |
| Vídeo vertical, câmera lenta, legenda automática | Sim | I02, com a frase do narrador já escrita. |
| Encoder de vídeo do sistema e compartilhar nativo | Sim, na versão web | `MediaRecorder` do navegador e `navigator.share` com arquivo (C04, C05). |
| Telemetria de onde a pessoa desiste | Sim | I03, dentro do C01 e do F01, sem dado pessoal. |
| Pitch aleatório, combos ascendentes, ducking | Sim | I04 e H01. |
| Faixa de frequência do celular, sons curtos, Opus/OGG mono | Sim | H01 e H02. |
| Bancos CC0 (Kenney, Sonniss, Freesound CC0) | Sim | H01, com a licença anotada. |
| IA rodando no celular (modelos de 300 MB) | **Não** | Pesa mais que o jogo inteiro e não roda bem no navegador de celular simples. O conteúdo novo já vem do pipeline do Gemini, com revisão. |
| Dificuldade que se ajusta a cada jogador (aprendizado por reforço) | **Não** | Quebra a regra de justiça: a dificuldade é igual para todos no mesmo dia (seção 6), senão o ranking não compara ninguém. |
| Godot/Unity, ECS, física em thread separada | **Não** | O jogo desenha poucos elementos por quadro num canvas, e a qualidade gráfica automática já cuida do celular fraco. Trocar de motor jogaria fora o motor puro que o servidor usa para recalcular a partida (anti-trapaça). |
| Gestão térmica | Em parte | Vale para o vídeo (C04/C05): gerar só no resultado, com cancelar, e só estático no modo Leve. |

---

## 5. Para os dias de teste com amigos

**O que observar (sem explicar nada antes):**
1. Quem recebeu um desafio chegou ao 1º chute? Onde parou (time, idade, Jogar)?
2. Depois da 1ª partida, a pessoa achou sozinha como chamar alguém?
3. No resultado, o que ela leu e o que ela pulou? (Pedir para contar em voz alta o que entendeu.)
4. Ela entendeu que só as 3 melhores do dia contam?
5. Algo travou, demorou ou mostrou "código: …"? Pedir o print.
6. Quem é de iPhone: o jogo abriu pelo WhatsApp? O card e os Stories saíram?
7. Alguém pediu para "ver o gol de novo" ou mandar o gol? (Isso confirma o C04.)
8. O som: alguém abaixou o volume ou desligou? O que acharam do apito? (H01)
9. O boneco: o que querem mudar, o que acharam do corpo e da cintura, que peça pediram? (H03)

**Como registrar:** uma linha por observação, com o ID deste backlog quando bater (ex.: "C02: a Ana não achou o desafio") ou "novo" quando não bater. Na volta, a gente reordena a seção 2 com o que os testes mostrarem.
