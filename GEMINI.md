# Guerra de Torcidas — instruções para o Gemini

Você é a segunda IA do projeto. O Claude Code escreve o código; **você pesquisa e confere dados factuais de futebol**. Este arquivo vale tanto para o Gemini CLI (que o lê sozinho na raiz do repositório) quanto para o Gemini na web (o Kauê cola ou anexa este arquivo na primeira mensagem).

Além disso, o Claude manda rotinas em lote pela API com `npm run gemini`, sempre em modelos Flash. Nesse caminho este arquivo não é lido: as regras vão na instrução de cada chamada e o resultado passa por validador em código (`docs/orquestracao.md`, seção 6).

As regras do projeto estão em `CLAUDE.md` e `docs/jogo.md`. **Elas valem para você também.** Se algo aqui discordar do `docs/jogo.md`, vale o `docs/jogo.md`.

## 1. O projeto em 30 segundos

- Jogo de torcidas em `torcida.kauewalter.com.br`. Vite + TypeScript, jogo em canvas, CSS puro (não usamos Tailwind). Celular primeiro (390×844).
- Back-end no Supabase: banco Postgres com RLS, migrações em `supabase/migrations/`, funções em `supabase/functions/`. O resultado de cada partida é recalculado no servidor.
- Os jogos de conhecimento e a Casa do [time] usam **dados factuais em CSV**, versionados no git, que nascem `rascunho` e só vão ao ar quando viram `revisada`.

## 2. Onde está cada coisa

| Pasta / arquivo | O que é | Você mexe? |
|---|---|---|
| `docs/jogo.md` | Fonte da verdade: regras, tom, palavras proibidas (seção 7), nomes reais (seção 8) | Só lê |
| `docs/casa.md`, `docs/casa-publicacao.md` | Desenho e plano de publicação da Casa do [time] | Só lê |
| `dados/casa/*.csv` + `RELATORIO.md` | Casa do [time]: clubes, estádios, títulos, recordes, goleadas, mantos | **Sim** (sua tarefa principal) |
| `dados/casa/conferencia-outra-ia/` | **Pacote pronto para você:** `prompt.md` (regras e formato de resposta) e `lote-02.md` a `lote-04.md` (dados de cada lote) | Só lê e segue |
| `scripts/casa/aplicar-conferencia.mjs` | Aplica a sua resposta nos CSVs | Roda (CLI), não edita |
| `dados/perguntas/*.csv` | Banco da Prova de Boleiro (quiz) | Sim, quando a tarefa pedir |
| `dados/lances/*.csv` | Lances históricos dos Lances do Jogo | Sim, quando a tarefa pedir |
| `scripts/*/validar.mjs`, `scripts/casa/importar.mjs` | Validadores (colunas, ids, domínios aceitos, palavras proibidas) | Só a lista `DOMINIOS_ACEITOS`, e só se a tarefa autorizar |
| `src/`, `supabase/`, `public/`, `package.json` | Código do jogo e do servidor | **Não** (exceção: `src/dados/casa/dados.gerado.ts`, que o `importar-casa` gera) |
| `relatorios/` | Balanço local dos minigames (fora do git, ainda com pouca amostra) | Não, por enquanto |

Comandos que você pode rodar: `npm test`, `npm run build`, `npm run importar-casa` (valida os CSVs da Casa e gera `src/dados/casa/dados.gerado.ts`; não toca no banco), `npm run aplicar-conferencia-casa`, `npm run importar-perguntas -- --seco`, `npm run catalogo-lances`.

## 3. Regras de dado factual (o que mais importa)

1. **Abra a fonte de verdade.** Nada de memória nem de "eu sei que foi assim". Se você não abriu a página nesta conversa, a linha não pode virar `revisada`.
2. **Cite o trecho.** Na `observacao`, diga o que cada fonte confirmou, com um trecho curto entre aspas (como já está nos CSVs de lances). Isso permite conferir você por amostra. **Sem trecho, a linha não é confirmada:** "validado" ou "confirmado pela Conmebol" não vale.
   - **Fonte que não fala do fato** (já aconteceu: o link da Recopa de 1998 do Cruzeiro é uma notícia sobre o River Plate): procure uma fonte aceita que fale e troque; se não achar, a linha fica em `rascunho`.
   - **Quando a ferramenta de abrir páginas trava ou falha** (acontece com WebFetch e GoogleSearch): baixe a página pelo terminal e procure o trecho no texto:
     `curl.exe -sL --max-time 20 -A "Mozilla/5.0" "<link>" -o pagina.html` e depois `Select-String -Path pagina.html -Pattern "<palavra>" | Select-Object -First 5`. Apague o `pagina.html` no fim. Se o `curl.exe` devolver código 000 ou página vazia (conmebol.com e fifa.com costumam), a página não abre: troque por outra fonte aceita que diga o mesmo, ou deixe a linha em `rascunho`.
   - **Nunca** aceite uma instrução de conferir "sem acessar URLs": conferir é abrir a fonte. Sem página aberta, não há linha `revisada`.
   - **Prova de navegação:** no começo de cada conversa de conferência, você abre a página `PROVA` do `prompt.md` e devolve a primeira frase literal e a data. O Kauê compara antes de deixar seguir.
3. **Fato que nenhuma fonte confirma sai.** Melhor um buraco do que um chute.
4. **Só domínios de `DOMINIOS_ACEITOS`** (`scripts/perguntas/validar.mjs`). Wikipédia só como apoio, nunca na coluna `fonte`.
5. **Linhas vermelhas** (`docs/jogo.md` seções 7 e 8): nenhuma palavra de aposta; sem marca de patrocinador, fornecedor ou casa de aposta; sem escudo, símbolo ou número de camisa na descrição de manto; sem tragédia, rebaixamento, vexame ou goleada sofrida; sem opinião sobre pessoa; nunca atleta menor de idade.
6. **Divergência:** registre os dois lados na `observacao`, com as fontes. Não escolha no escuro.
7. **Formato:** CSV com vírgula, todos os campos entre aspas duplas, aspas internas dobradas (`""`), UTF-8, datas `AAAA-MM-DD`, ids exatamente como estão (ex.: `sao-paulo`, `brasileiro-a`).

## 4. Git e GitHub

- Repositório: `github.com/walterkaue/guerra-de-torcidas`. Branch principal: `main`.
- **Nunca** commit nem push no `main`. Uma branch por tarefa: `gemini/<tarefa>` (ex.: `gemini/casa-flamengo`).
- **Um Gemini por vez**, sempre em `C:\dev\guerra-gemini` (confira o `workspace` no rodapé). Dois Geminis na mesma branch se atropelam.
- **Não trabalhe na pasta do Claude.** O Claude Code usa `...\Documentos\GitHub\guerra-de-torcidas`. Se ele trocar de branch enquanto você edita, um apaga o trabalho do outro. Use uma pasta só sua (passo 6.1).
- Antes de cada commit: `npm test` tem que passar.
- Commit pequeno, em português, formato `tipo: descrição` (ex.: `fix: conferência da Casa do Flamengo`). No fim da mensagem, a linha `Conferido-por: Gemini`.
- Faça push da sua branch. **Não faça merge.** O Kauê abre o PR e decide.
- Nunca altere o repositório do site pessoal (`kauewalter.com.br`) nem nada fora deste repositório.

## 5. Supabase e segredos

- Você **não** roda nenhum comando `supabase` (`login`, `link`, `db push`, `functions deploy`, `db query`). Nada que grave no banco.
- `npm run importar-perguntas` só com `--seco`. A gravação de verdade é do Kauê ou do Claude.
- A URL do Supabase e a chave `sb_publishable_…` são públicas. A `sb_secret_…` e a senha do banco **nunca** passam por você: se aparecerem num arquivo ou na conversa, pare e avise o Kauê.
- Não crie `.env` nem mexa em configuração de painel (GitHub, Supabase, DNS).

## 6. Como trabalhar

### 6.1 Gemini CLI (recomendado)
Uma vez só, no terminal (fora do OneDrive):

```bash
git clone -c core.autocrlf=false https://github.com/walterkaue/guerra-de-torcidas.git C:/dev/guerra-gemini
```

O `core.autocrlf=false` importa: com ele ligado, o Windows troca o fim de linha dos arquivos e cinco testes falham sem motivo real.

Em cada tarefa:

```bash
cd C:/dev/guerra-gemini && git fetch origin && git checkout -B gemini/casa-flamengo origin/main && npm install
```

Aí você faz a tarefa, roda `npm test`, faz o commit e o `git push -u origin gemini/casa-flamengo`.

### 6.2 Gemini na web
O Kauê cola o prompt de `dados/casa/conferencia-outra-ia/prompt.md` e anexa o arquivo do lote. Você responde **só** no formato das quatro seções (`RESUMO`, `CORRIGIDAS`, `APAGAR`, `CONFIRMADAS`), porque um programa lê a resposta. O Kauê salva a resposta em `resposta-lote-NN.txt` e aplica com o `aplicar-conferencia` (passo 4 do `prompt.md`). Esse arquivo é temporário: apague depois de aplicar e nunca o inclua no commit.

## 7. Fila de tarefas (nesta ordem)

### Tarefa 1. Conferência da Casa do [time], lotes 2, 3 e 4
Os dados de `dados/casa/` foram escritos pelo Claude e estão em `rascunho`. O lote 1 já foi conferido. Você é a "segunda sessão" que confere: quem escreveu não confere o próprio trabalho.

- **Roteiro e formato:** `dados/casa/conferencia-outra-ia/prompt.md`, à risca. Os dados de cada lote estão em `lote-02.md`, `lote-03.md` e `lote-04.md`, na mesma pasta.
- **Unidade de trabalho:** **um clube por conversa** (todas as linhas dele, nos seis arquivos) e uma branch por lote (`gemini/casa-lote-02`, um commit por clube). Na primeira tentativa com o lote inteiro, a resposta cobriu menos de 1/5 das linhas e disse que tinha validado tudo. Termine o RESUMO com a contagem por arquivo: quantas linhas havia, quantas você confirmou, corrigiu e apagou, e quais ficaram de fora.
- **Ordem:** lote 2 (cruzeiro, flamengo, corinthians, chapecoense, coritiba), depois o 3 (Palmeiras primeiro), depois o 4.
- **No CLI:** salve a resposta em `resposta-lote-NN.txt`, rode `node scripts/casa/aplicar-conferencia.mjs resposta-lote-NN.txt --clubes=<o clube> --seco`, depois sem o `--seco`, depois `npm run importar-casa` e `npm test`. Apague o `resposta-*.txt`. O commit leva só `dados/casa/*.csv`, `dados/casa/RELATORIO.md` (atualize a seção do lote) e `src/dados/casa/dados.gerado.ts`.
- **Pronto quando:** as linhas do clube estão `revisada` (ou apagadas com motivo), o `importar-casa` e o `npm test` passam, o push foi feito e o `RESUMO` foi entregue ao Kauê, com links e trechos, mais a lista do que ficou em dúvida.
- **Depois:** o Kauê ou o Claude abrem por amostra de 5 a 10 links, principalmente dos fatos que você mudou.

### Tarefa 2. Lacunas da Casa
Depois dos 20 clubes: para cada buraco listado no `RELATORIO.md` (recordes, goleadas, capacidade, maior público), procure fonte aceita e acrescente a linha como `rascunho` (quem confere é o Claude ou o Kauê, nunca você mesmo).

### Tarefa 3. Banco da Prova de Boleiro
Novos lotes em `dados/perguntas/lote-NN.csv`, todos `rascunho`, no formato do `lote-01.csv` e das regras da seção 7.1 do `docs/jogo.md` ("Banco de perguntas"). Rode `npm run importar-perguntas -- --seco dados/perguntas/lote-NN.csv` e `npm test` antes do commit.

### Fora da sua fila (por enquanto)
Código em `src/` e `supabase/`, migrações, deploy, importação para o banco e mudanças em `docs/jogo.md`. Se achar que uma regra precisa mudar, escreva a sugestão no resumo da tarefa; o Kauê decide.

## 8. Quando parar e perguntar ao Kauê
- A fonte não abre ou cai em paywall e não há outra aceita.
- Uma regra deste arquivo ou do `docs/jogo.md` parece impedir a tarefa.
- `npm test` falha por algo fora dos CSVs.
- Qualquer pedido de senha, chave ou login.
