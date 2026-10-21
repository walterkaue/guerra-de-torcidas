# Prompt da conferência de um lote da Casa do [time]

Cole o texto abaixo numa sessão nova do Claude Code, no repositório `guerra-de-torcidas`. Troque os clubes pelo lote da vez (5 por lote, em ordem alfabética do id).

**Sem créditos no Claude Code?** Use o pacote para outra IA em `dados/casa/conferencia-outra-ia/` (prompt autônomo, dados de cada lote e script `scripts/casa/aplicar-conferencia.mjs` que aplica a resposta).

Lotes: 1 = athletico-pr, atletico-mg, bahia, botafogo, bragantino. 2 = chapecoense, corinthians, coritiba, cruzeiro, flamengo. 3 = fluminense, gremio, internacional, mirassol, palmeiras. 4 = remo, santos, sao-paulo, vasco, vitoria.

---

Você vai fazer a **conferência das fontes** dos dados da Casa do [time] dos clubes `athletico-pr, atletico-mg, bahia, botafogo, bragantino`, nos seis CSVs de `dados/casa/`. Você é a "segunda sessão" prevista em `docs/casa.md` (seção 8): quem escreveu os dados não confere o próprio trabalho.

**Antes de tudo**
1. Leia `CLAUDE.md`, `docs/casa.md` inteiro, `docs/jogo.md` (seções 7, 7.4 e 8, "Nomes reais"), `docs/casa-publicacao.md` (etapas A e B) e `dados/casa/RELATORIO.md` (cobertura e dúvidas conhecidas).
2. Comece a sua branch a partir da branch dos dados: `git fetch origin claude/intelligent-euler-p44s4r && git checkout -B <sua branch> origin/claude/intelligent-euler-p44s4r`. (Se o PR dessa branch já tiver sido mergeado, parta do `main`.)
3. Teste se a rede abre as fontes: `curl -sS -o /dev/null -w "%{http_code}\n" https://trivela.com.br/`. Se não der 200, pare e me avise.

**Para cada linha do lote com status `rascunho`** (nos arquivos `clubes`, `estadios`, `titulos`, `recordes`, `goleadas`, `mantos`)
1. Abra a `fonte` (e `fonte_capacidade` e `fonte_recorde`, no estádio) e confira o fato: número, data, nome, placar, ano. Fato que nenhuma fonte confirma **sai** (melhor um buraco do que um chute). Não reaproveite nada de memória.
2. Resolva cada "conferir", "DIVERGÊNCIA" e "EM DÚVIDA" da `observacao`: abra as outras fontes citadas e decida. O que continuar em dúvida fica dito na observação, com as fontes dos dois lados.
3. Conferência cruzada obrigatória:
   - Títulos: soma por competição bate com o que o clube e a entidade contam (Brasileiro contra `dados/clubes-do-dia.csv`); ids de competição são os da seção 6 do `docs/casa.md`; estadual com o nome oficial sem patrocinador.
   - Recordes: posições 1 a 3 em ordem decrescente; `data_referencia` é a data da fonte, não a de hoje.
   - Estádio: recorde é o maior público **do clube** ali (não o do estádio); tipo `pagante` ou `presente` bate com a fonte; capacidade só com número de fonte aceita.
   - Mantos: padrão (`lisa`, `listras-v`, `aros`, `faixa-diagonal`, `faixa-peito`) bate com o que a fonte descreve; sem escudo, cruz, estrela, número, patrocínio ou fornecedor na `descricao`.
4. Linhas vermelhas: sem tragédia, morte ou acidente; sem vexame, rebaixamento ou goleada sofrida; sem opinião sobre pessoa; nenhum atleta menor de idade; nada de marca de patrocinador, de fornecedor ou de casa de aposta; nenhuma palavra proibida da seção 7 do `docs/jogo.md` (inclui "red" no Bragantino). Origem de apelido que passa por tema fora: o apelido fica sem a história.
5. Marque `revisada` com `verificada_em` (data de hoje, AAAA-MM-DD) e reescreva a `observacao` dizendo o que cada fonte confirmou. Linha que não se sustenta: apague e diga por quê no resumo.
6. Onde houver lacuna (campo vazio, clube sem recordes ou goleadas), tente achar fonte nos domínios aceitos. Não achou, deixe vazio.

**Decisões do Kauê (21/10), já valem**
- Estaduais: vale Lance/Trivela/Goal quando a federação não abre; deixe "conferir" na observação (o Kauê checa no navegador).
- Jogos e gols: valem os números do clube, mesmo com amistosos (o rodapé terá o rótulo "contagem do clube"). Anote na observação qual contagem a fonte usa.
- Título que o clube reivindica e a entidade não lista (`oficial = não`): **fica**, com nota neutra. Na Casa do clube ele conta no total.
- Competição sem id (Copa Master, Recopa de 1968/69, Copa dos Campeões, Mercosul, Rio-São Paulo): fica de fora.
- Quando a fonte oficial (federação, página do clube) contradiz o fato contado por imprensa e pela súmula, vale o fato; registre os dois lados na observação.

**Regras**
- Fontes: só os domínios de `DOMINIOS_ACEITOS` (`scripts/perguntas/validar.mjs` e `scripts/clubes/validar.mjs`). Wikipédia só como apoio de decisão, nunca como `fonte`. Os domínios `bemparana.com.br`, `umdoisesportes.com.br` e `band.com.br` estão aprovados pelo Kauê **se abrirem** na sua rede: nesse caso acrescente em `DOMINIOS_ACEITOS` (`scripts/perguntas/validar.mjs`, único arquivo fora de `dados/casa/` que você pode tocar) e diga no resumo. Qualquer outro domínio: não acrescente por conta própria, liste no resumo.
- Mexa só em `dados/casa/*.csv` e em `dados/casa/RELATORIO.md` (atualize cobertura e dúvidas do lote), mais a exceção dos domínios acima. Não toque em `src/` nem em `supabase/`.
- Rode `npm test` antes do commit. Commit em português, no formato `fix: conferência do lote N da Casa do time`. Faça push para a sua branch. Não abra PR.
- No fim, me mande uma tabela: clube, linha, o que mudou, status final e as fontes usadas (links), mais a lista do que continua em dúvida.
