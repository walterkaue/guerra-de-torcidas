# Faixas dos Lances unificados: antes e depois

> Gerado em 05/11/2026 por `node scripts/lances/recalibrar.mjs` (decisão do Kauê, `docs/jogo.md` seção 14.7: "o catálogo inteiro é recalibrado pelo acerto real das pessoas"). Vale só para partidas criadas a partir de 16/11/2026. A faixa de antes continua no CSV e nas partidas até 15/11. O resultado fica em `dados/lances/faixas-unificadas.json` e entra no catálogo como `faixaUnificada` (`npm run catalogo-lances`).

## Como foi feito

- **Chance do robô:** a de sempre, `calibrar` em `src/jogo/lances.ts` (mira no melhor gesto com o erro de mão típico), no catálogo atual, já com a correção do goleiro dos 9 lances (PR #106).
- **Fator humano:** 9 gols das pessoas em 30 tentativas valendo; o robô faria 21,5 nos mesmos lances. **Fator 0,418.** A proposta tinha dado 0,45, com o catálogo antes do PR #106. Uma consulta nova ao banco, em 05/11 às 01h27, achou as mesmas 30 tentativas.
- **Chance da pessoa** = chance do robô × 0,418. A faixa sai das mesmas linhas de corte: fácil ≥ 75%, média 50% a 75%, difícil 30% a 50%, craque < 30%.

## Resumo

| Faixa | Antes | Depois |
|---|---|---|
| Fácil (24 pontos por gol na regra nova) | 29 | 0 |
| Média (30) | 16 | 0 |
| Difícil (36) | 4 | 31 |
| Craque (42) | 2 | 20 |

- **Por que ninguém fica em fácil ou média:** o lance mais fácil do catálogo dá 96% para o robô. Com o fator 0,418, isso vira 40% para uma pessoa, abaixo dos 50% da média. Na prática, todo fácil vira difícil e todo médio vira craque (dois médios com 73% e 74% para o robô ficam em difícil).
- **Efeito nos pontos:** com a pontaria de hoje, cada gol passa a valer 36 ou 42. É a linha "faixas corrigidas" da proposta, que dava mediana ~36 com a tabela B e o fator 0,45.
- **Isso muda sozinho com o tempo:** a partir de 30 tentativas valendo de pelo menos 8 pessoas, cada lance passa a usar a própria taxa (`faixaCorrigida`). Conforme as pessoas aprenderem, os lances mais fáceis voltam a média ou fácil, só para as partidas novas.
- **A amostra é pequena:** 30 tentativas de 5 pessoas, nos 2 primeiros dias. Para refazer com um retrato novo do banco:

```bash
node scripts/lances/recalibrar.mjs --tentativas retrato.json
```

## Lista

| Lance | Antes | Depois | Chance do robô | Chance da pessoa |
|---|---|---|---|---|
| flamengo-1981-toquio | facil | dificil ← | 77% | 32% |
| flamengo-2001-falta-do-tri | dificil | craque ← | 40% | 17% |
| flamengo-2019-virada-em-lima | facil | dificil ← | 87% | 36% |
| vasco-1998-falta-no-monumental | craque | craque | 26% | 11% |
| vasco-2000-virada-do-seculo | facil | dificil ← | 96% | 40% |
| sao-paulo-2011-gol-100 | media | craque ← | 65% | 27% |
| sao-paulo-1992-falta-de-toquio | media | craque ← | 67% | 28% |
| sao-paulo-2005-gol-do-tri | facil | dificil ← | 75% | 32% |
| corinthians-1977-fim-do-jejum | facil | dificil ← | 82% | 34% |
| corinthians-1995-falta-da-copa | media | craque ← | 53% | 22% |
| corinthians-2012-gol-da-america | media | dificil ← | 73% | 31% |
| palmeiras-2021-tri-da-america | facil | dificil ← | 87% | 37% |
| palmeiras-2022-falta-da-recopa | media | craque ← | 67% | 28% |
| fluminense-2023-bomba-da-meia-lua | dificil | craque ← | 45% | 19% |
| fluminense-2023-o-artilheiro-abre | facil | dificil ← | 82% | 34% |
| fluminense-1984-o-gol-do-bi | facil | dificil ← | 76% | 32% |
| botafogo-2024-com-um-a-menos | facil | dificil ← | 90% | 38% |
| botafogo-2024-fecha-a-conta | facil | dificil ← | 83% | 35% |
| botafogo-1989-gol-da-libertacao | facil | dificil ← | 86% | 36% |
| santos-1961-gol-de-placa | facil | dificil ← | 81% | 34% |
| santos-2011-o-chute-do-tri | media | craque ← | 65% | 27% |
| gremio-2017-a-cobertura | facil | dificil ← | 78% | 33% |
| gremio-1983-quase-sem-angulo | media | craque ← | 70% | 29% |
| gremio-1995-o-rebote-do-olimpico | facil | dificil ← | 95% | 40% |
| internacional-2006-o-toque-do-mundo | facil | dificil ← | 77% | 32% |
| internacional-1975-gol-iluminado | facil | dificil ← | 91% | 38% |
| internacional-2010-a-arrancada | facil | dificil ← | 79% | 33% |
| palmeiras-2021-a-cabecada-do-bi | facil | dificil ← | 84% | 35% |
| selecao-2002-falta-de-shizuoka | media | craque ← | 58% | 24% |
| selecao-1997-a-curva-da-falta | craque | craque | 26% | 11% |
| selecao-1970-o-quarto-gol-do-tri | media | craque ← | 55% | 23% |
| cruzeiro-1976-falta-de-santiago | media | craque ← | 54% | 23% |
| cruzeiro-1997-o-rebote-do-bi | dificil | craque ← | 41% | 17% |
| atletico-mg-1971-a-cabecada-do-titulo | facil | dificil ← | 84% | 35% |
| atletico-mg-2013-a-cabecada-dos-penaltis | facil | dificil ← | 86% | 36% |
| bahia-1989-a-cabecada-do-empate | facil | dificil ← | 82% | 34% |
| bahia-1989-a-virada-na-fonte-nova | facil | dificil ← | 89% | 37% |
| coritiba-1985-a-falta-do-titulo | media | craque ← | 56% | 23% |
| coritiba-2013-a-virada-do-tetra | facil | dificil ← | 82% | 34% |
| athletico-pr-2021-o-voleio-do-bi | media | craque ← | 54% | 23% |
| athletico-pr-2019-o-gol-da-copa | facil | dificil ← | 79% | 33% |
| bragantino-1990-o-gol-da-final-caipira | media | craque ← | 67% | 28% |
| bragantino-2021-a-vaga-na-final | facil | dificil ← | 80% | 34% |
| vitoria-2026-o-golaco-do-empate | media | craque ← | 61% | 25% |
| vitoria-2026-o-contra-ataque-do-titulo | facil | dificil ← | 77% | 32% |
| mirassol-2025-o-drible-da-libertadores | facil | dificil ← | 89% | 37% |
| mirassol-2025-o-gol-relampago | facil | dificil ← | 86% | 36% |
| remo-2025-o-chute-do-empate | dificil | craque ← | 45% | 19% |
| remo-2025-a-cabecada-do-acesso | facil | dificil ← | 84% | 35% |
| chapecoense-2016-a-virada-no-confronto | media | craque ← | 71% | 30% |
| chapecoense-2016-o-gol-em-buenos-aires | media | dificil ← | 74% | 31% |
