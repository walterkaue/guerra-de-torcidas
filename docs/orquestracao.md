# Divisão de trabalho entre modelos

> Como quebrar uma tarefa para gastar menos tokens sem perder qualidade. Decidido pelo Kauê em 31/10/2026.
> O processo passo a passo está nas skills `planejar-tarefa` e `rotina-gemini`.

## 1. A regra

Tarefa complexa começa no Opus mais recente, em intensidade alta. Essa conversa avalia o todo, quebra em partes, escolhe quem executa cada uma e confere o resultado. Depois do plano aprovado, cada parte vai para o executor mais barato que mantém a qualidade.

## 2. Quando dividir

Dividir tem custo. Em 31/10/2026, uma sessão nasceu com cerca de 77 mil tokens de ferramentas e instruções, e o `docs/jogo.md` soma mais 19 mil.

- **Não divida** o que cabe em cerca de 10 chamadas de ferramenta, nem partes que precisam das mesmas alterações ao mesmo tempo.
- **Divida** quando a parte tem resultado próprio, escopo fechado e dá para escrever "pronto quando" em uma frase.
- **Dois executores nunca mexem nos mesmos arquivos.** Se isso for necessário, a parte é uma só, ou a segunda espera a primeira.

## 3. Quem faz o quê

| Trabalho | Executor | Modelo | Intensidade |
|---|---|---|---|
| Plano, arquitetura, anti-trapaça, física e pontuação, migração, decisão com risco | Conversa principal | Opus | alta |
| Feature ou tela com escopo claro, testes | Sessão própria com PR | Sonnet | média |
| Revisão de diff de servidor, ranking e pontuação | Subagente `revisor` | Sonnet | alta |
| Parte de execução que volta para a conversa | Subagente `executor` | Sonnet | média |
| Ajuste mecânico, texto, busca no código | Subagente `mecanico` | Haiku | baixa |
| Lote repetitivo (seção 6) | `npm run gemini` | Gemini Flash | não se aplica |

- Em dúvida entre dois níveis, comece pelo mais barato só se o erro for fácil de notar. Erro em servidor, pontuação, migração ou dado factual não é fácil de notar: fique com o nível de cima.
- **Quem escreveu não confere o próprio trabalho.** Isso vale para Claude e para Gemini.
- Identificadores de hoje para `start_session`: `claude-sonnet-5-5` e `claude-haiku-5-5`. Atualize aqui quando sair modelo novo.

## 4. Sessão ou subagente

- **Sessão** (`start_session`): a parte termina em branch ou PR próprio, ou o Kauê pode querer abrir e acompanhar. Sempre em worktree próprio se escrever código.
- **Subagente** (`Agent`): o resultado volta para a conversa no mesmo turno, como busca, teste, revisão ou ajuste pequeno.
- **Script** (`npm run gemini`): não vira sub-conversa. Quem chama é uma sessão Claude, que lê só o resumo.

## 5. Modelo de brief

O executor não viu a conversa, e cada linha de brief poupa leitura.

```
Tarefa: o que fazer, em uma ou duas frases.
Arquivos: onde mexer, e onde não mexer.
Leia: seções exatas dos docs (ex.: docs/jogo.md seção 7).
Decisões já tomadas: o que não deve ser rediscutido.
Pronto quando: resultado verificável.
Entrega: branch ou PR, ou o que devolver.
```

Quem planeja cita as seções dos docs; quem executa lê só elas. As regras de produto do `CLAUDE.md` chegam a toda sessão sozinhas.

## 6. Gemini

**Chave:** `GEMINI_API_KEY`, no nível gratuito. **Só Flash**, por decisão do Kauê em 31/10/2026: os modelos Pro respondem 429 (sem cota) nessa chave, e rotina não precisa deles. Para usar Pro seria preciso ligar a cobrança no Google AI Studio. Os modelos dos scripts locais ficam em `scripts/ia/modelos.mjs`.

**Vai para o Gemini:**
- Rascunhos em lote que passam por validador (perguntas, lances a partir de página real).
- Conferência de fonte com trecho literal (`npm run conferir-casa` já faz isso para a Casa).
- Classificação, deduplicação e extração em lote.
- Resumo de texto longo que só precisa orientar, sem virar dado publicado.

**Não vai para o Gemini:**
- Código em `src/` e `supabase/`, migrações, regras de jogo.
- Texto final com tom de resenha, que passa pelo narrador e por revisão.
- Fato escrito de memória: dado factual nasce de página aberta, com trecho citado.
- Segredo ou dado de jogador. No nível gratuito, o Google pode usar o que recebe.

**Por que tanto controle:** na primeira conferência em lote, a resposta cobriu menos de 1/5 das linhas e disse que tinha validado tudo. Dos 114 lances do staging, nenhum entrou, e 26 tinham link inventado (`dados/lances/staging-descartados.md`). No projeto, quem decide é o código, não o modelo. Sem validador, a saída é rascunho e alguém revisa.

## 7. Limites

- Uma conversa não troca o próprio modelo. Por isso, depois do plano, a conversa em Opus espera os avisos em vez de acompanhar passo a passo.
- Sessão criada só pode usar modelo e intensidade iguais ou mais baratos que os da conversa que a criou.
- Estas regras orientam o Claude, mas não travam nada. Escolha errada se corrige na revisão.

## 8. Medir

Compare o uso do plano antes e depois de uma tarefa (`get_usage`). O consumo do Gemini fica em `relatorios/ia-uso.csv`. Se uma faixa da tabela der retrabalho, suba um nível e registre aqui. Se sobrar qualidade, desça.

## 9. O que o piloto ensinou

Piloto de 31/10/2026 com as perguntas do staging: 105 perguntas, 56 chamadas ao Gemini (cerca de 110 mil tokens de entrada, de graça), 7 pontos da semana do Claude e 2 perguntas aproveitadas. Relatório em `dados/perguntas/piloto-lote-02.md`.

- **Meça o funil antes de chamar o modelo.** Uma rodada só com código mostrou que 493 das 634 perguntas não tinham fonte, e isso mudou a amostra. Das 105, 89 caíram sem gastar token.
- **Filtro de graça vem primeiro.** Regra, repetição e link morto saem por código, e o Gemini só vê o que pode passar.
- **Status do staging não prova nada.** `revisada` lá dentro é só um rótulo: o que vale é a página aberta.
- **Trecho literal e resposta às cegas não bastam.** Provam que a página diz aquilo, mas não enxergam fato repetido com outras palavras nem tema sensível. Dos 6 aprovados pelo código, 4 caíram na leitura de um Claude. Mantenha uma leitura curta antes de `rascunho` virar lote.
- **Gemini Flash reescreve bem a partir do trecho.** O código aceitou 7 de 7 reescritas, e todas passaram às cegas. Reescrita com validador segue no Gemini.
- **Teste o relatório antes de gastar cota.** Um erro no fim do script perdeu 29 chamadas. Script que paga por rede grava o resultado antes de formatar, ou tem teste da parte final.
- **O grosso do gasto do Claude é montar a rotina, não rodá-la.** O piloto mediu a montagem. Para comparar de verdade, meça a segunda rodada do mesmo script.
