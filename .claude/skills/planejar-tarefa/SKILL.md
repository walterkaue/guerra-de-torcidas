---
name: planejar-tarefa
description: Avalia a complexidade de uma tarefa nova e a quebra em partes com executor, modelo e intensidade, para economizar tokens sem perder qualidade. Use como primeira ação em tarefa complexa do Guerra de Torcidas, como feature nova, mudança em vários arquivos, servidor, migração, lote grande ou pedido com várias frentes. Não use em ajuste que cabe em cerca de 10 chamadas de ferramenta.
---

# Planejar tarefa

Leia `docs/orquestracao.md` e `docs/jogo.md` antes de planejar.

## 1. Avalie o todo

- Cabe em cerca de 10 chamadas de ferramenta: faça direto e pare de seguir esta skill.
- É complexa e a conversa não está em Opus de intensidade alta: diga isso em uma linha e siga.

## 2. Quebre em partes

Cada parte tem resultado próprio e não divide arquivos com outra. Para cada uma, escolha o executor pela tabela de `docs/orquestracao.md`, seção 3. Lote repetitivo vai primeiro ao Gemini, se houver validador.

Junte partes que dariam menos trabalho juntas: dividir tem custo.

## 3. Apresente o plano

Uma tabela, sem texto sobrando:

| Parte | Executor | Modelo | Intensidade | Arquivos | Pronto quando |
|---|---|---|---|---|---|

Depois dela, diga a ordem, o que depende do quê, o que fica no Opus e o que precisa do Kauê. Espere a aprovação.

## 4. Crie as sub-conversas

A aprovação do plano já autoriza isso. Escreva cada brief pelo modelo de `docs/orquestracao.md`, seção 5.

- **Sessão:** `start_session` com `initiation: "user_asked"`, `context: "fresh"`, `model`, `effort` e `use_worktree: true` se escrever código. Se a ferramenta não existir (terminal), use subagente.
- **Subagente:** `Agent` com `subagent_type` `executor`, `mecanico` ou `revisor`. O modelo e a intensidade vêm do perfil.
- **Gemini:** siga a skill `rotina-gemini`.

Faça aqui o que é de arquitetura e decisão, sem esperar as sessões.

## 5. Confira

- Não acompanhe sessão por sessão: espere o aviso de cada uma.
- O aviso é um relato, não prova. Confira o diff e os testes antes de dizer que terminou.
- Prove em worktree novo: pasta fora do git que sobrou no worktree do executor pode esconder falha.
- Parte de servidor, ranking ou pontuação passa pelo `revisor`.
- Ao fechar, compare o uso com o início e ajuste `docs/orquestracao.md` se uma faixa deu retrabalho.
