# Catálogo dos Lances do Jogo

Regras: `docs/jogo.md`, seção 7.3 ("Catálogo") e seção 8 ("Nomes reais"). Um CSV por lote (`lote-01.csv`, …), todos validados por `npm test` (`scripts/lances/validar.test.ts`).

## Colunas

| Coluna | O que vai |
|---|---|
| `id` | `clube-ano-apelido` (ex.: `sao-paulo-2011-gol-100`). Nunca muda depois de publicado: as medalhas apontam para ele. |
| `clube` | id de `src/dados/times.ts` ou `selecao` |
| `tipo` | `falta` ou `finalizacao` (cara a cara) |
| `titulo` | até 40 caracteres, conta o fato. **Sem nome, apelido ou número de camisa.** |
| `ficha` | até 260 caracteres, com data e ano. Aqui o nome real pode aparecer, como fato. Nada de opinião sobre pessoas ("vacilo do zagueiro"). |
| `pessoas` | nomes reais citados na ficha, separados por `;` (o teste barra esses nomes no título) |
| `competicao`, `data`, `adversario`, `estadio` | estádio e competição sem nome de patrocinador |
| `bola_x`, `bola_z` | onde a bola estava, em metros: x a partir do meio do gol (positivo = direita de quem bate), z até a linha do gol |
| `barreira`, `barreira_mira_x` | só na falta: jogadores (2 a 6) e o ponto da linha do gol que a barreira tapa (m) |
| `goleiro_saida` | só no cara a cara: quantos metros o goleiro saiu |
| `canto` | onde entrou o gol de verdade, visto de trás de quem bate: `alto-esquerda`, `alto-meio`, `alto-direita`, `baixo-esquerda`, `baixo-meio`, `baixo-direita` (gol aí = "Recriou o lance") |
| `chegada`, `chegada_de` | só no cara a cara: "A jogada", como a bola chegou (até 90 caracteres, **sem nome**), e de onde ela vem: `tras` (passe ou lançamento de trás), `esquerda`, `direita` ou `rebote` |
| `faixa` | a que o robô de calibragem calcula (o teste avisa se não bater) |
| `fonte`, `fonte2` | links de notícias públicas, dos domínios aceitos em `scripts/perguntas/validar.mjs` (Wikipédia só como `fonte2`) |
| `verificada_em`, `status` | `rascunho` → `revisada` (conferido) → `ativa`; `aposentada` tira do jogo |
| `observacao` | o que cada fonte diz e o que foi **estimado** |

**Atenção ao lado:** "canto direito do goleiro" é a **esquerda** de quem bate.

## Conferência (segunda sessão, nova)

Para cada lance em `rascunho`:
1. Abrir as fontes e conferir data, competição, adversário, estádio, minuto e quem fez o quê na ficha. Fato que nenhuma fonte confirma sai da ficha.
2. Conferir o lado da bola, a distância e o canto onde entrou (fontes ou vídeo do lance). O que for confirmado sai da lista de "ESTIMADO" na observação.
3. Conferir as linhas vermelhas: sem tragédia, vexame, opinião sobre pessoa ou atleta menor de idade na data; título sem nome.
4. Se mudar a posição, a barreira ou o goleiro, rodar `npm test` e atualizar a `faixa` com o que o robô disser.
5. Marcar `revisada` com `verificada_em`, ou apagar a linha se o lance não se sustentar.

Depois da conferência, `npm run catalogo-lances` atualiza `src/dados/lances.ts`, que é o que o jogo lê, e `src/dados/lancesResumo.ts`, com as contagens do card da Home (só entra lance `revisada` ou `ativa`).
