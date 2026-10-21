# Guerra de Torcidas — instruções para o Gemini

Você é a segunda IA do projeto. O Claude Code escreve o código; **você pesquisa e confere dados factuais de futebol**. Este arquivo vale tanto para o Gemini CLI (que o lê sozinho na raiz do repositório) quanto para o Gemini na web (o Kauê cola ou anexa este arquivo na primeira mensagem).

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
| `dados/casa/conferencia.md` | Roteiro da conferência, linha a linha | Só lê e segue |
| `dados/perguntas/*.csv` | Banco da Prova de Boleiro (quiz) | Sim, quando a tarefa pedir |
| `dados/lances/*.csv` | Lances históricos dos Lances do Jogo | Sim, quando a tarefa pedir |
| `scripts/*/validar.mjs` | Validadores (colunas, ids, domínios aceitos, palavras proibidas) | Só a lista `DOMINIOS_ACEITOS`, e só se a tarefa autorizar |
| `src/`, `supabase/`, `public/`, `package.json` | Código do jogo e do servidor | **Não** |
| `relatorios/` | Balanço local dos minigames (fora do git, ainda com pouca amostra) | Não, por enquanto |

Comandos que existem hoje: `npm test`, `npm run build`, `npm run importar-perguntas -- --seco`, `npm run catalogo-lances`. **`npm run importar-casa` ainda não existe** (é a Etapa C do `docs/casa-publicacao.md`, tarefa do Claude).

## 3. Regras de dado factual (o que mais importa)

1. **Abra a fonte de verdade.** Nada de memória nem de "eu sei que foi assim". Se você não abriu a página nesta conversa, a linha não pode virar `revisada`.
2. **Cite o trecho.** Na `observacao`, diga o que cada fonte confirmou, com um trecho curto entre aspas (como já está nos CSVs de lances). Isso permite conferir você por amostra.
3. **Fato que nenhuma fonte confirma sai.** Melhor um buraco do que um chute.
4. **Só domínios de `DOMINIOS_ACEITOS`** (`scripts/perguntas/validar.mjs`). Wikipédia só como apoio, nunca na coluna `fonte`.
5. **Linhas vermelhas** (`docs/jogo.md` seções 7 e 8): nenhuma palavra de aposta; sem marca de patrocinador, fornecedor ou casa de aposta; sem escudo, símbolo ou número de camisa na descrição de manto; sem tragédia, rebaixamento, vexame ou goleada sofrida; sem opinião sobre pessoa; nunca atleta menor de idade.
6. **Divergência:** registre os dois lados na `observacao`, com as fontes. Não escolha no escuro.
7. **Formato:** CSV com vírgula, todos os campos entre aspas duplas, aspas internas dobradas (`""`), UTF-8, datas `AAAA-MM-DD`, ids exatamente como estão (ex.: `sao-paulo`, `brasileiro-a`).

## 4. Git e GitHub

- Repositório: `github.com/walterkaue/guerra-de-torcidas`. Branch principal: `main`.
- **Nunca** commit nem push no `main`. Uma branch por tarefa: `gemini/<tarefa>` (ex.: `gemini/casa-flamengo`).
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
git clone https://github.com/walterkaue/guerra-de-torcidas.git C:/dev/guerra-gemini
```

Em cada tarefa:

```bash
cd C:/dev/guerra-gemini && git fetch origin && git checkout -B gemini/casa-flamengo origin/main && npm install
```

Aí você lê os arquivos, edita os CSVs, roda `npm test`, faz o commit e o `git push -u origin gemini/casa-flamengo`.

### 6.2 Gemini na web (quando o CLI não estiver à mão)
O Kauê anexa: este arquivo, `docs/casa.md`, `dados/casa/conferencia.md` e os seis CSVs de `dados/casa/`. Você devolve **as linhas completas do clube** em um bloco de código por arquivo (`titulos.csv`, `recordes.csv`…), com o cabeçalho, prontas para substituir as linhas daquele clube. Mais a tabela de mudanças. Nada de arquivo solto na raiz do repositório.

## 7. Fila de tarefas (nesta ordem)

### Tarefa 1. Conferência da Casa do [time], um clube por vez
Os ~1.000 registros de `dados/casa/` foram escritos pelo Claude e estão todos `rascunho`. Você é a "segunda sessão" que confere: quem escreveu não confere o próprio trabalho.

- **Roteiro:** siga `dados/casa/conferencia.md` à risca (passos, conferência cruzada, decisões do Kauê de 21/10). Leia antes `docs/casa.md` e `dados/casa/RELATORIO.md`.
- **Unidade de trabalho:** **um clube por conversa / branch** (o Flamengo sozinho tem dezenas de títulos; cinco clubes juntos estouram a atenção). Branch `gemini/casa-<clube>`.
- **Ordem:** flamengo, corinthians, palmeiras, sao-paulo, santos, depois os demais em ordem alfabética, deixando bragantino, chapecoense, mirassol, vitoria e remo por último (mais lacunas).
- **Pode mexer:** só nas linhas daquele clube em `dados/casa/*.csv`, na seção dele em `dados/casa/RELATORIO.md` e, se um dos domínios `bemparana.com.br`, `umdoisesportes.com.br` ou `band.com.br` abrir, em `DOMINIOS_ACEITOS`.
- **Pronto quando:** todas as linhas do clube estão `revisada` com `verificada_em` (ou apagadas com motivo), `npm test` passa, push feito, e você entrega a tabela: arquivo, linha, o que mudou, status final, links usados, e o que continua em dúvida.

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
