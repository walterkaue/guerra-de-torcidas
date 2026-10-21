# Prompt da conferência de um lote de lances

Cole o texto abaixo numa sessão nova do Claude Code, no repositório `guerra-de-torcidas`. Troque `lote-01` pelo lote da vez.

---

Você vai fazer a **conferência das fontes** do lote `dados/lances/lote-01.csv` dos Lances do Jogo. Você é a "segunda sessão" prevista no `docs/jogo.md`: quem escreveu o lote não confere o próprio trabalho.

**Antes de tudo**
1. Leia `CLAUDE.md`, `docs/jogo.md` (seções 7.3 e 8, "Nomes reais") e `dados/lances/README.md` (formato e checklist).
2. O lote está na branch `claude/kind-galileo-oxwqfg`. Comece a sua branch a partir dela: `git fetch origin claude/kind-galileo-oxwqfg && git checkout -B <sua branch> origin/claude/kind-galileo-oxwqfg`.
3. Teste se a rede abre as fontes: `curl -sS -o /dev/null -w "%{http_code}\n" https://trivela.com.br/`. Se não der 200, pare e me avise: sem abrir as páginas não há conferência.

**Para cada lance com status `rascunho`**
1. Abra `fonte` e `fonte2` (WebFetch) e confira cada fato da `ficha`: data, competição, adversário, estádio, minuto, placar e quem fez o quê. Se precisar, busque mais fontes nos domínios aceitos (`DOMINIOS_ACEITOS` em `scripts/perguntas/validar.mjs`) e troque ou acrescente o link. Fato que nenhuma fonte confirma sai da ficha.
2. Confira os detalhes físicos que a observação marca como **ESTIMADO**: lado e distância da bola, barreira, saída do goleiro e o `canto` onde o gol entrou, sempre **visto de trás de quem bate** ("canto direito do goleiro" = esquerda de quem bate). Use relatos de jogo e descrições de vídeo. O que for confirmado sai do "ESTIMADO"; o que não der para confirmar fica como estimativa razoável, dito na observação.
3. Linhas vermelhas: sem tragédia, morte ou acidente; sem vexame; sem opinião sobre pessoa ("vacilo", "erro de fulano"); nenhum atleta menor de idade na data do lance; título sem nome, apelido ou número de camisa; competição e estádio sem nome de patrocinador.
4. Se mexer em `bola_x`, `bola_z`, `barreira`, `barreira_mira_x` ou `goleiro_saida`, rode `npm test`: o teste do catálogo diz a faixa que o robô calcula. Atualize a coluna `faixa` com ela.
5. Marque `revisada` com `verificada_em` (data de hoje, AAAA-MM-DD) e reescreva a `observacao` dizendo o que cada fonte confirmou. Se o lance não se sustentar (fato errado sem conserto, só uma fonte fraca), apague a linha e diga por quê no resumo.

**Regras**
- Mexa só em `dados/lances/lote-01.csv` (e no `src/dados/lances.ts` gerado). Se precisar aceitar um domínio novo de imprensa esportiva confiável, acrescente em `DOMINIOS_ACEITOS` e explique no resumo.
- Depois de marcar os lances, rode `npm run catalogo-lances` (atualiza `src/dados/lances.ts`, que o jogo lê) e inclua o arquivo no commit.
- Rode `npm test` antes do commit. Commit em português, no formato `fix: conferência do lote 1 dos Lances`. Faça push para a sua branch. Não abra PR.
- No fim, me mande uma tabela: lance, o que mudou, status final e as fontes usadas (links).
