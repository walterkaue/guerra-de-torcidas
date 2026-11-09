# Jogos de conhecimento (Prova de Boleiro e Time do Dia)

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

## Regras comuns
- Os dois somam no ranking (a Prova dentro do teto diário; o Time do Dia por fora). A calibragem sai do balanço da pré-temporada (`jogos/rankings.md`).
- Nomes reais só como fato, com fonte (seção "Nomes reais" do `docs/jogo.md`). O Time do Dia usa só clubes; "Jogador do Dia" (pistas factuais, sem foto) fica no backlog (D07).
- Frases do narrador: `docs/narrador.md`, seções 10 e 11.

## Prova de Boleiro (quiz)

Inspirada no formato de escada e "parar ou seguir" dos programas de perguntas da TV, **sem usar nome, marca, vinheta ou visual de nenhum programa** e sem "prêmio", "milhão" ou "valendo".

### Regra
- **8 perguntas**, 4 alternativas, **20 s** cada (igual para todos, pelo pilar Justo). Escada de 4 degraus: 2 fáceis, 2 médias, 2 difíceis, 2 de craque.
- A partir da 3ª pergunta, antes de ela aparecer: **"Parar e levar X"** ou **"Seguir"**. Parar leva tudo o que acumulou.
- **Três erros e fora:** pergunta errada ou com tempo estourado vale 0 e a partida segue; o **3º erro** encerra e leva **75%** dos pontos acumulados (arredondado para cima). A tela mostra as 3 vidas.
- **3 ajudas**, uma de cada por partida, sem custo em pontos (o relógio não para):
  - **Tira duas:** some com duas alternativas erradas.
  - **Arquibancada:** mostra como quem já respondeu aquela pergunta escolheu; com menos de 30 respostas, vira "tira uma".
  - **Troca:** troca a pergunta por outra do mesmo degrau.
- **Desafio por link:** quem aceita recebe as mesmas 8 perguntas, na mesma ordem (alternativas embaralhadas de novo). Vence quem fizer mais pontos; empate fica com quem desafiou. O desafio vale 7 dias e vencido vira prova normal, com o aviso (`jogos/penaltis.md`, "Desafio por link").

| Degrau | Perguntas | Pontos cada |
|---|---|---|
| Fácil | 1 e 2 | 8 |
| Média | 3 e 4 | 12 |
| Difícil | 5 e 6 | 18 |
| Craque | 7 e 8 | 25 |
| **8 de 8 (sem nenhum erro)** | | **+24** |

- Máximo por partida: 150. Alvo da pessoa mediana: 45 a 75 (estimativa ~35 hoje; se o balanço com 20 partidas novas ficar abaixo, a próxima alavanca é 4 erros).
- **Teto do dia:** valem as 3 melhores partidas da Prova do dia (até 450), só delas. Os Lances têm as 3 deles (`jogos/lances.md`).
- **Card:** "Prova de Boleiro: cheguei na 6ª e parei, 58 {pro_time}" + a escada em emoji: ✅ acertou, ❌ errou, ✋ parou, 💡 usou ajuda (ex.: ✅✅✅💡✅✋). **Nunca mostra o texto das perguntas**, porque o desafio por link usa as mesmas.

### Anti-trapaça
- Perguntas e respostas ficam em tabelas que o celular **não lê** (RLS sem leitura; só funções do servidor).
- **Uma pergunta por vez:** o servidor manda o texto e as 4 alternativas com ids embaralhados por partida. A resposta certa nunca chega ao celular antes da escolha.
- **Tempo medido no servidor** desde a hora em que a pergunta saiu. Resposta depois de 20 s + 2 s de tolerância conta como tempo esgotado.
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
- **Não pode:** além do que "Nomes reais" proíbe (vida pessoal, polêmica, processo, crime, saúde, religião, política, menores de idade): **tragédias, mortes e acidentes**; **guerra**, nem como contexto (o validador barra "guerra", "bombardeio", "ditadura", "óbito" e "assassinato"; "Guerra de Torcidas" passa por ser o nome do jogo, e apelido de jogo de futebol, como "Batalha dos Aflitos", não é tema de guerra); rebaixamentos, goleadas sofridas e vexames (a pergunta celebra o clube; a zoeira é do narrador); qualquer tema de aposta.
- **Equilíbrio entre os 20 clubes:**
  - **Mesma cota para todos.** Meta do lançamento público: 30 por clube (9 fáceis, 9 médias, 6 difíceis, 6 de craque) + 200 gerais = **800**, depois ~100 novas por semana, sempre repondo por igual. Pergunta válida não é aposentada por um clube ter mais que a cota.
  - **Cada partida:** 4 perguntas de 4 clubes diferentes, sorteados de forma uniforme entre os 20 (nunca pelo tamanho da torcida), e 4 gerais.
  - Clubes com menos história nacional (Mirassol, Remo, Bragantino, Chapecoense) têm a mesma cota; as difíceis podem vir de campanhas recentes, estádio, fundação e acessos.
  - **Fácil de clube** não pede final antiga, estádio, nome de fundação, ano do título anterior nem artilheiro de campanha (isso é média); cada clube mantém 3 fáceis.
  - **Painel de cobertura** (consulta no banco): perguntas ativas por clube × degrau e acerto médio por clube. Clube com acerto muito fora da média tem as perguntas recalibradas.
- **Dificuldade calibrada pelos dados:** com 50 ou mais respostas, o degrau é corrigido: fácil ≥ 75% de acerto, média 50–75%, difícil 30–50%, craque < 30%.
- **Como o banco nasce:** lotes escritos numa sessão do Code com busca na web, sempre com fonte, em CSV (status rascunho). **Uma segunda sessão, nova, confere cada fonte** e marca revisada ou descarta (não há revisão manual). Só entra no jogo, via `npm run importar-perguntas`, pergunta revisada e com fonte. O lote 1 é `dados/perguntas/lote-01.csv`.
- **Pipeline com Gemini:** cinco crons por dia (6h, 9h, 12h, 15h e 18h de Brasília) rodam a função `gerar-conteudo` no modo reposição: ela calcula o clube × degrau que mais falta para a cota (contando as pendentes; clube acima da cota em um degrau fica por último nele) e baixa até 3 páginas de fonte aceita desse clube (`staging_gt.fontes_semente`); o Gemini propõe perguntas só com o que está nela; o código aceita apenas as que passam no validador do CSV, trazem o trecho literal da página e têm a resposta certa dentro do trecho. Uma hora depois de cada geração, a `auditar-conteudo` (até 20 por execução) dá cada uma a **outro modelo, sem dizer qual é a certa**; passa a `pre_aprovada` só se ele escolhe a certa com trecho da página. A IA **nunca** publica nem aprova de memória: **a revisão final é no painel `#admin`**, onde cada `pre_aprovada` aparece com o trecho e o link da fonte; o administrador corrige se precisar (mesmo validador dos CSVs) e aprova, e a pergunta entra direto em `public.perguntas` como ativa (lote `gemini-AAAA-MM`), ou reprova com o motivo.

## Time do Dia (desafio diário, estilo Wordle)

### Regra
- **Um clube secreto por dia, o mesmo para todo mundo.** Troca às 00h de Brasília. Uma partida por dia por torcedor.
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
- Sem sequência de dias (regra de ECA Digital do `docs/jogo.md`).

| Acertou na | 1ª | 2ª | 3ª | 4ª | 5ª | 6ª | Não acertou |
|---|---|---|---|---|---|---|---|
| Pontos | 100 | 85 | 70 | 55 | 40 | 25 | 0 |

- Mediana esperada entre a 3ª e a 4ª (~60); teto 100. **Fora do teto diário:** é uma por dia, igual para todos, e soma por cima no ranking da semana.
- **Card:** "Time do Dia #34 · 4/6" + a grade de emoji (uma linha por tentativa), **sem nome de clube** (nada de spoiler) e com o link para jogar.

### Anti-trapaça
- O clube do dia fica só no servidor. O celular manda a tentativa e recebe a linha de pistas; a resposta só aparece quando a partida termina.
- As tentativas ficam gravadas no servidor (apagar o app não recomeça o dia).
- Risco: criar conta anônima nova para "estudar" o dia. Mitigação: CAPTCHA no login anônimo e detecção (acerto na 1ª tentativa em 5 de 7 dias → sob suspeita).

## Como está no código
- Prova: `src/jogo/prova.ts` (`PERGUNTAS` 8, `SEGUNDOS` 20, `TOLERANCIA_SEGUNDOS` 2, `ERROS_QUE_ENCERRAM` 3, `FRACAO_AO_ERRAR` 0,75, `BONUS_PERFEITA` 24, `DETECCAO_PROVA_PADRAO`), `src/jogo/cardProva.ts`.
- Time do Dia: `src/jogo/timeDoDia.ts` (`TENTATIVAS` 6, `PONTOS`, `PERTO_ANOS` 10, `PERTO_TITULOS` 2, suspeita 5 de 7 dias), `src/jogo/cardDia.ts`.
- Funções do servidor: `gerar-conteudo`, `auditar-conteudo`; importação: `npm run importar-perguntas`.
