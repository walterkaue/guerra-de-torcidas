# Como enxugar um doc de módulo (fase 2 da divisão de 08/11/2026)

Arquivo temporário: sai no fim da reorganização.

## Objetivo

Cada arquivo em `docs/jogos/` nasceu de um pedaço do `jogo.md` antigo, copiado sem mudança. Agora ele vira o doc do módulo: **como é hoje**, curto, sem história. Alvo: metade do tamanho ou menos, **sem perder nenhuma regra em vigor**.

## Formato

```
# <Nome do módulo>

> Regra em vigor em <data de hoje>. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

## Regra
(como joga, pontos, limites, desempate, anti-trapaça, card, textos fixos que aparecem na tela)

## Como está no código
(arquivos, funções, tabelas, RPCs, ordem de publicação quando ela ainda importa, riscos aceitos)

## Em desenvolvimento
(flags de dev, como `?lancesFalsos`)

## Pendências conhecidas
(só se houver; uma linha cada)
```

Subtítulos dentro de "Regra" e "Como está no código" são livres. Use listas curtas e tabelas onde já havia tabela.

## O que fica (obrigatório)

- Toda regra em vigor: números (pontos, limites, tetos, faixas, tempos, porcentagens), textos de tela entre aspas, códigos de erro (`limite_do_dia`, 426 `atualize_o_app`…), nomes de função, tabela, RPC e arquivo, regras de ECA, nomes reais e "zero aposta".
- Riscos aceitos e notas de segurança ("risco que fica", "só desce").
- Ordem de publicação que ainda vale para mudanças futuras (ex.: "catálogo novo de disputas: publicar a `nova-partida` antes do site").
- Referências cruzadas: troque "seção 7.3" por `jogos/lances.md`, "seção 5" por `jogos/rankings.md` etc. Use o mapa do topo de `docs/decisoes.md`.

## O que sai

- Transições vencidas: "até 07/11…", "antes do corte…", "desde 08/11…" (diga só como é), versões de construção (D5a, D5b, lote G3…), "no ar desde", números de PR e "prints aprovados", quando não forem necessários para entender a regra.
- "Decidido em DD/MM" no meio do texto: a data vai para o registro (abaixo) e o texto fica só com a regra.
- Repetições: a mesma regra dita em dois lugares fica num só.

## Registro das decisões

Cada decisão datada que você tirar do texto e **que ainda não estiver** em `docs/decisoes.md` vira uma linha em `docs/jogos/_decisoes-<módulo>.md` (arquivo seu, não edite o `decisoes.md`), no formato `| DD/MM/AAAA | frase curta (doc) |`.

## Conferência antes de entregar

Rode, para cada arquivo seu, o conferidor de números e nomes:

```bash
node docs/jogos/_conferir.mjs docs/jogos/<módulo>.md
```

Ele compara com a versão da fase 1 (`git show f38102a:docs/jogos/<módulo>.md`) e lista os números e os nomes entre crases que sumiram. Cada um da lista precisa ser **histórico** (pode sair) ou **voltar** para o texto. No relatório, diga o que sumiu e por quê, em uma linha por grupo.

Confira também que todo caminho de arquivo citado em "Como está no código" existe (Glob). Caminho que não existe mais: corrija ou tire e avise.
