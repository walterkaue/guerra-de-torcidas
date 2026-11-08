## 7.1 Minigame 3 — "Prova de Boleiro" (quiz)

> Nome escolhido em 19/10. Inspirado no formato de escada e "parar ou seguir" dos programas de perguntas da TV, **sem usar nome, marca, vinheta ou visual de nenhum programa** e sem "prêmio", "milhão" ou "valendo".
> Desenho aprovado em 19/10/2026. Construído junto com o Crava para entrar no teste com amigos. **Soma no ranking desde já, na pré-temporada (decidido em 20/10)**, dentro do teto diário.

### Como joga
- **8 perguntas**, 4 alternativas, **20 s** cada (cerca de 1 minuto e meio por partida; eram 15 s até 06/11/2026, quando as jornadas simuladas e amigos do Kauê mostraram que quem lê devagar ou com fonte grande perdia vidas sem terminar a pergunta; o tempo é igual para todos, pelo pilar Justo).
- Escada de 4 degraus: 2 fáceis, 2 médias, 2 difíceis, 2 de craque.
- A partir da 3ª pergunta, antes de ela aparecer: **"Parar e levar X"** ou **"Seguir"**.
- **Três erros e fora (decidido em 01/11/2026, opção B de `docs/propostas/calibragem-prova.md`):** pergunta errada ou com tempo estourado vale 0 e a partida **segue**; o **3º erro** encerra a partida, que leva **75%** dos pontos acumulados (arredondado para cima). A tela mostra as 3 vidas. Parar continua levando tudo o que acumulou. Vale a partir da semana de 02/11; partidas já fechadas não mudam.
- **3 ajudas**, uma de cada por partida, sem custo em pontos (o relógio não para):
  - **Tira duas:** some com duas alternativas erradas.
  - **Arquibancada:** mostra como quem já respondeu aquela pergunta escolheu; com menos de 30 respostas, vira "tira uma".
  - **Troca:** troca a pergunta por outra do mesmo degrau.
- **Desafio por link:** quem aceita recebe as mesmas 8 perguntas, na mesma ordem (alternativas embaralhadas de novo). Vence quem fizer mais pontos; empate fica com quem desafiou.

### Pontuação
| Degrau | Perguntas | Pontos cada |
|---|---|---|
| Fácil | 1 e 2 | 8 |
| Média | 3 e 4 | 12 |
| Difícil | 5 e 6 | 18 |
| Craque | 7 e 8 | 25 |
| **8 de 8 (sem nenhum erro)** | | **+24** |

- Máximo: 150. Pessoa mediana: estimativa ~29 com o banco de hoje, ~35 com as fáceis recalibradas e ~57 para quem manda bem; alvo continua 45 a 75; se o balanço com 20 partidas novas ficar abaixo, a próxima alavanca é 4 erros.
- **Teto do dia (desde 08/11/2026, seção 14.7):** valem as 3 melhores partidas da Prova do dia (até 450), só delas. Até 07/11, a Prova dividia as 5 melhores do dia com os pênaltis. A tabela e o teto de 150 por partida não mudam.

### Anti-trapaça
- Perguntas e respostas ficam em tabelas que o celular **não lê** (RLS sem leitura; só funções do servidor acessam).
- **Uma pergunta por vez:** o servidor manda o texto e as 4 alternativas com ids embaralhados por partida. A resposta certa nunca chega ao celular antes da escolha.
- **Tempo medido no servidor**, a partir da hora em que a pergunta saiu. Resposta depois de 20 s + 2 s de tolerância conta como tempo esgotado.
- Parar ou seguir é decidido antes de a pergunta ser enviada.
- Limite de 3 partidas criadas por minuto (mesma `config_deteccao` dos pênaltis).
- Ninguém recebe a mesma pergunta duas vezes em 30 dias (se o degrau esgotar, volta a mais antiga).
- **Detecção:** nas últimas 40 perguntas difíceis e de craque, 90% ou mais de acerto com tempo médio abaixo de 2,5 s → partida sob suspeita, fora do ranking até revisão.
- Risco aceito: busca no Google em outro aparelho. Defesa: 20 s, perguntas que não se resolvem com uma busca simples, banco grande e sem repetição.

### Banco de perguntas
- **Cada pergunta guarda:** texto, 4 alternativas, a certa, degrau, clube (um dos 20 ou "geral"), tema, **fonte (link)**, data da verificação, status (rascunho, revisada, ativa, aposentada).
- **Fontes aceitas:** CBF, site oficial do clube ou da federação, veículo de imprensa esportiva, ogol.com.br. Wikipédia só junto com outra fonte.
- **Fatos fechados:** sempre com data ("Em 2019, quem…"). Nada que muda com o tempo ("quem é o técnico atual?").
- **Pode:** títulos, gols, artilheiros, recordes, estádios, fundação, apelidos de clubes, transferências, escalações históricas, regras do jogo.
- **Não pode:** além do que a seção 8 proíbe com nomes reais (vida pessoal, polêmica, processo, crime, saúde, religião, política, menores de idade): **tragédias, mortes e acidentes**; **guerra** (decidido em 02/11/2026: nem como contexto, como a troca de nome do Palestra Itália em 1942; o validador barra "guerra", "bombardeio", "ditadura", "óbito" e "assassinato", e "Guerra de Torcidas" passa por ser o nome do jogo; apelido de jogo de futebol, como "Batalha dos Aflitos", não é tema de guerra); rebaixamentos, goleadas sofridas e vexames (a pergunta celebra o clube; a zoeira é papel do narrador); qualquer tema de aposta.
- **Equilíbrio entre os 20 clubes:**
  - **Mesma cota para todos.** A pré-temporada começa com **10 por clube** (3 fáceis, 3 médias, 2 difíceis, 2 de craque) + **60 gerais** = 260; a meta para o lançamento público é 30 por clube + 200 gerais = **800**. Depois, ~100 novas por semana, sempre repondo por igual.
  - **Cada partida:** 4 perguntas de 4 clubes diferentes, sorteados de forma uniforme entre os 20 (nunca pelo tamanho da torcida), e 4 gerais. Todo mundo tem a mesma chance de pegar pergunta do próprio clube.
  - **Decidido em 06/11/2026:** pergunta válida não é aposentada por um clube ter mais que a cota; o equilíbrio vem do sorteio uniforme entre clubes e da reposição do robô, que mira 30 por clube (9/9/6/6).
  - Clubes com menos história nacional (Mirassol, Remo, Bragantino, Chapecoense) têm a mesma cota; as difíceis podem vir de campanhas recentes, estádio, fundação e acessos.
  - **Fáceis de clube (decidido em 02/11/2026, `docs/propostas/faceis-de-clube-prova.md`):** 27 das 60 fáceis de clube passam para média (as que pedem final antiga, estádio, nome de fundação, ano do título anterior ou artilheiro de campanha). Cada rebaixe vem com uma troca, para manter 3 fáceis por clube: primeiro sobe uma média do mesmo clube, mais conhecida; o que faltar o pipeline do Gemini escreve, com fonte e revisão no `#admin`.
  - **Painel de cobertura** (consulta no banco): perguntas ativas por clube × degrau e acerto médio por clube. Clube com acerto muito fora da média tem as perguntas recalibradas.
- **Dificuldade calibrada pelos dados:** cada pergunta acumula respostas; com 50 ou mais, o degrau é corrigido: fácil ≥ 75% de acerto, média 50–75%, difícil 30–50%, craque < 30%.
- **Como o banco nasce:** lotes escritos numa sessão do Code com busca na web, sempre com fonte, em CSV (status rascunho). **Uma segunda sessão, nova, confere cada fonte** e marca revisada ou descarta (decidido em 19/10: não há revisão manual). Só entra no jogo, via `npm run importar-perguntas`, pergunta revisada e com fonte.
- **Pipeline com Gemini (desde 26/10/2026):** cinco crons por dia (6h, 9h, 12h, 15h e 18h de Brasília, decidido em 02/11/2026) rodam a função `gerar-conteudo` no modo reposição: ela calcula o clube × degrau que mais falta para a cota (9 fáceis, 9 médias, 6 difíceis e 6 de craque por clube, contando as pendentes; clube acima da cota em um degrau fica por último nele) e baixa até 3 páginas de fonte aceita desse clube (`staging_gt.fontes_semente`), o Gemini propõe perguntas só com o que está nela, e o código aceita apenas as que passam no validador do CSV, trazem o trecho literal da página e têm a resposta certa dentro do trecho. Uma hora depois de cada geração, a `auditar-conteudo` (até 20 por execução) dá cada uma a **outro modelo, sem dizer qual é a certa**; passa a `pre_aprovada` só se ele escolhe a certa com trecho da página. A IA **nunca** publica nem aprova de memória: **a revisão final é no painel `#admin`** (decidido em 26/10/2026, sem CSV). Cada `pre_aprovada` aparece com o trecho e o link da fonte; o administrador corrige se precisar (o texto passa pelo mesmo validador dos CSVs) e aprova, e a pergunta entra direto em `public.perguntas` como ativa (lote `gemini-AAAA-MM`), ou reprova com o motivo. O lote 1 continua no CSV `dados/perguntas/lote-01.csv`.

### Card
- "Prova de Boleiro: cheguei na 6ª e parei, 58 {pro_time}" + a escada em emoji: ✅ acertou, ❌ errou, ✋ parou, 💡 usou ajuda (ex.: ✅✅✅💡✅✋).
- **Nunca mostra o texto das perguntas**, porque o desafio por link usa as mesmas.

## 7.2 Desafio diário — "Time do Dia"

> Nome escolhido em 19/10 (é o D01 do backlog), estilo Wordle. Desenho aprovado em 19/10/2026. Construído junto com o Crava e o quiz para entrar no teste com amigos. **Soma no ranking desde já, na pré-temporada (decidido em 20/10)**, por fora do teto diário.

### Como joga
- **Um clube secreto por dia, o mesmo para todo mundo.** Troca às 00h de Brasília.
- **6 tentativas.** Cada tentativa é um clube escolhido numa lista com busca (sem texto livre).
- A cada tentativa, o servidor devolve uma linha de pistas comparando com o clube secreto:

| Pista | 🟢 | 🟡 | ⚪ |
|---|---|---|---|
| Estado | mesmo estado | mesma região | outra região |
| Fundação | mesmo ano | até 10 anos de diferença | mais longe |
| Títulos do Brasileirão | mesmo número | até 2 de diferença | mais longe |
| Divisão em 2026 | mesma | vizinha | outra |
| Cores | as duas iguais | uma igual | nenhuma |
| Capital ou interior | igual | — | diferente |

- Fundação e títulos mostram também ⬆️ ou ⬇️ (o secreto é mais novo/velho, tem mais/menos títulos).
- **Lista:** clubes das Séries A, B e C de 2026 (60). O sorteio não repete clube até passar pela lista inteira.
- Dados factuais com fonte (CBF e sites oficiais), conferidos pela mesma segunda sessão que revisa as perguntas, antes de entrar. Títulos do Brasileirão pela lista oficial da CBF.
- Uma partida por dia por torcedor.

### Pontuação
| Acertou na | 1ª | 2ª | 3ª | 4ª | 5ª | 6ª | Não acertou |
|---|---|---|---|---|---|---|---|
| Pontos | 100 | 85 | 70 | 55 | 40 | 25 | 0 |

- Mediana esperada entre a 3ª e a 4ª (~60); teto 100.
- **Fora do teto diário das 5 partidas:** é uma por dia, igual para todos, e soma por cima no ranking da semana.

### Anti-trapaça
- O clube do dia fica só no servidor. O celular manda a tentativa e recebe a linha de pistas; a resposta só aparece quando a partida termina.
- As tentativas ficam gravadas no servidor (apagar o app não recomeça o dia).
- Risco: criar conta anônima nova para "estudar" o dia. Mitigação: CAPTCHA no login anônimo (seção 12) e detecção (acerto na 1ª tentativa em 5 de 7 dias → sob suspeita).
- Sem sequência de dias (seção 13).

### Card
- "Time do Dia #34 · 4/6" + a grade de emoji (uma linha por tentativa), **sem nome de clube** (nada de spoiler) e com o link para jogar.

### Regras comuns aos jogos de conhecimento
- Na pré-temporada, os dois **somam no ranking** (decidido em 20/10); a calibragem sai do balanço da pré-temporada (seção 11), não de um amistoso.
- Nomes reais só como fato, com fonte (seção 8). Na estreia, o Time do Dia usa só clubes; "Jogador do Dia", com pistas factuais e sem foto, fica no backlog (D07).
- Frases do narrador: `docs/narrador.md`, seções 10 e 11.

