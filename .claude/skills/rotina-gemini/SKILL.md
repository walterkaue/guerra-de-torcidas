---
name: rotina-gemini
description: Manda lote repetitivo ao Gemini Flash com `npm run gemini` e confere o resultado por código, para poupar tokens do Claude. Use em rascunhos em lote, conferência de fonte, classificação, extração, deduplicação ou resumo de texto longo no Guerra de Torcidas. Não use em código, migração, regra de jogo ou texto final.
---

# Rotina no Gemini

Confira antes se o trabalho cabe na lista de `docs/orquestracao.md`, seção 6. Para conferir a Casa, use `npm run conferir-casa` (ver `docs/casa-publicacao.md`, Etapa B), que já prova o trecho literal.

## 1. Prepare

- Escreva a instrução e a entrada em arquivos no diretório temporário da sessão, fora do repositório.
- A instrução leva as regras que importam: o Gemini não lê `CLAUDE.md` nem `GEMINI.md` por esse caminho. Cite proibições das seções 7 e 8 do `docs/jogo.md` quando o texto for ao ar.
- **Lote pequeno:** um clube ou um tema por chamada. Lote grande já voltou incompleto dizendo que estava completo.
- Peça JSON com `--esquema` sempre que houver estrutura.
- Nada de segredo ou dado de jogador na entrada.

## 2. Rode

```bash
npm run gemini -- --instrucao=<arquivo> --entrada=<arquivo> --saida=<arquivo> --esquema=<arquivo.json> --seco
```

Sem `--seco`, faz a chamada de verdade. O comando mostra só um resumo. Entre chamadas em sequência, espere cerca de 5 segundos para caber na cota gratuita.

## 3. Valide

Passe a saída pelo validador em código antes de usar:

| Dado | Validador |
|---|---|
| Perguntas | `npm run importar-perguntas -- --seco <arquivo>` |
| Casa | `npm run importar-casa` |
| Lances | `npm run catalogo-lances` |
| Clubes do dia | `npm run importar-clubes-do-dia -- --seco` |

Sem validador, a saída é rascunho. Revise por amostra de 5 a 10 itens e conte se todos os itens da entrada voltaram.

## 4. Depois

- Dado factual nasce `rascunho`. Quem escreveu não confere (ver a seção 3 de `docs/orquestracao.md`).
- Se o Gemini errar em padrão, corrija a instrução ou devolva a parte para um Claude. Não conserte item por item.
- Falha de cota ou 503 repetido: pare e diga. Não troque para Pro.
