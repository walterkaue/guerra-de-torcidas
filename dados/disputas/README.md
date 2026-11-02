# Catálogo das disputas históricas de pênaltis

Regras: `docs/jogo.md`, seção 6 ("Pênaltis dentro dos Lances"), seção 7.3 ("Catálogo") e seção 8 ("Nomes reais"). Um CSV por lote (`lote-01.csv`, …), todos validados por `npm test` (`scripts/disputas/validar.test.ts`).

Só entram disputas que o clube **venceu**. A disputa é só cenário: o adversário e a ficha mudam, mas motor, dificuldade, detecção, desafio por link e pontuação são os de sempre, e a partida conta no teto de 5 do dia.

## Colunas

| Coluna | O que vai |
|---|---|
| `id` | `clube-ano-apelido` (ex.: `athletico-pr-2018-sul-americana`). Nunca muda depois de publicado: a partida guarda esse id em `disputa_id`. |
| `clube` | id de `src/dados/times.ts` ou `selecao` |
| `titulo` | até 40 caracteres, conta o fato. **Sem nome, apelido ou número de camisa.** |
| `ficha` | até 260 caracteres, com data, ano e o placar da disputa. Aqui o nome real pode aparecer, como fato. Nada de opinião sobre pessoas. |
| `pessoas` | nomes reais citados na ficha, separados por `;` (o teste barra esses nomes no título) |
| `competicao`, `estadio` | sem nome de patrocinador: "estádio do Palmeiras", nunca o nome comercial |
| `fase` | `Final`, `Semifinal`, `Quartas de final`, `Oitavas de final`, `Quarta fase`, `Terceira fase`, `Segunda fase` ou `Primeira fase`. Vira a frase do jogo: "Final de 2018: foi 4 x 3. E hoje?" |
| `data` | AAAA-MM-DD do jogo que teve a disputa |
| `adversario` | nome igual ao de `src/dados/times.ts` ou de `src/dados/adversarios.ts` (o teste barra quem não tem cadastro) |
| `placar_disputa` | `4 x 3`, com o clube primeiro. O teste recusa derrota, empate e placar impossível. |
| `fonte`, `fonte2` | links de notícias públicas, dos domínios aceitos em `scripts/perguntas/validar.mjs` (Wikipédia só como `fonte2`) |
| `verificada_em`, `status` | `rascunho` → `revisada` (conferido) → `ativa`; `aposentada` tira do jogo |
| `observacao` | os trechos literais das fontes, entre aspas, o que ficou para conferir (marcado `CONFERIR`) e o que espera decisão do Kauê (marcado `PENDENTE`; a linha segue em `rascunho`) |

## Conferência (segunda sessão, nova)

Para cada disputa em `rascunho`:
1. Baixar a página da fonte e ler o texto bruto (o resumo do WebFetch e do WebSearch não serve de prova). Conferir data, competição, fase, adversário, estádio, placar da disputa e quem fez o quê na ficha. Fato que nenhuma fonte confirma sai da ficha.
2. Resolver cada item marcado `CONFERIR` na observação.
3. Conferir as linhas vermelhas: sem tragédia, vexame, opinião sobre pessoa ou atleta menor de idade na data; título sem nome; estádio e competição sem patrocinador. A disputa precisa celebrar o clube.
4. Conferir nome, artigo e cores do adversário em `src/dados/adversarios.ts` (só nome, artigo e cores, sem escudo).
5. Marcar `revisada` com `verificada_em`, ou apagar a linha se a disputa não se sustentar.

Depois da conferência, `npm run catalogo-disputas` atualiza `src/dados/disputas.ts`, que é o que o jogo lê (só entra disputa `revisada` ou `ativa`).
