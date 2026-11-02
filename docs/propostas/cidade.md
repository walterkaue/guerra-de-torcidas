# Cidade como segunda camisa: proposta para decisão

> **Decidido em 26/10/2026: o Kauê aceitou todas as recomendações** (já passadas para o `docs/jogo.md`). Nada construído ainda. Texto original da proposta abaixo. A regra-base já está no `docs/jogo.md` (seção 3, "Cidade") e no `docs/rankings.md` (seção 3); aqui ficam só os pontos em aberto. Hoje o jogo ainda não guarda cidade nenhuma.

## 1. O que já está decidido

- Cidade **opcional**, de uma **lista fechada do IBGE** (nome + UF), com busca. Sem texto livre.
- Cada partida conta para o **time, a cidade e o estado**, em rankings separados.
- Cidade: média das **30 melhores** pessoas; estado: das **100 melhores**; vagas vazias a 80%.
- Ranking de cidades **por estado**, mais um top nacional. A campeã do estado na semana ganha troféu na Galeria.
- "Outro time" joga só pela cidade e pelo estado.
- Rival da cidade: a de cima no ranking do estado. Zoeira só de posição, nunca de sotaque ou "cidade pequena".

## 2. Regras que não pode quebrar

| Regra | Na prática |
|---|---|
| **Dados mínimos (LGPD)** | Cidade opcional, sempre com "pular". Nunca rua, bairro, CEP ou localização do aparelho. |
| **Sem apelido em ranking público** | A cidade **nunca** aparece ao lado do apelido, nem no card. Só somada. |
| **Justo** (pilar 7) | Cidade grande não ganha por tamanho: média dos 30 melhores, igual aos times. |
| **Zero aposta** | Troféu de cidade é só Galeria e zoeira. |

## 3. O que falta decidir

### 3.1 Quando perguntar a cidade

| Opção | Prós | Contras | Esforço |
|---|---|---|---|
| **A. Na escolha do time** (mesma tela, com "pular") | Todo mundo vê na estreia. | Mais um passo antes da 1ª partida: o link do WhatsApp demora mais a virar jogo. | Baixo |
| **B. Depois da 1ª partida** ("Defende sua cidade também?") | Não atrasa a estreia. Pede num momento bom. | Quem joga 1 vez e some nunca escolhe. | Baixo |
| **C. Só no perfil** | Zero atrito. | Quase ninguém acha: ranking de cidades vazio. | Muito baixo |

**Recomendo B**, com um lembrete na Home para quem pulou (no máximo 1 vez por semana).

### 3.2 Privacidade de cidade pequena

Uma cidade com **1 jogador** mostra no ranking exatamente a pontuação dele. Em cidade pequena, os amigos sabem quem é.

| Opção | Prós | Contras | Esforço |
|---|---|---|---|
| **A. Cidade só aparece com 5+ jogadores na semana** (abaixo disso, conta só para o estado) | Ninguém é identificado. Protege menores. | Cidade pequena demora a aparecer. | Baixo |
| **B. Mínimo de 3** | Aparece mais cedo. | Com 3, ainda dá para adivinhar. | Baixo |
| **C. Sem mínimo** | Toda cidade aparece. | Expõe quem joga sozinho na cidade. | Nenhum |

**Recomendo A.** Os pontos da pessoa nunca se perdem: contam para o estado e, quando a cidade chegar a 5, para ela também. O jogo avisa: "Faltam 2 pra sua cidade entrar no ranking. Chama a galera."

### 3.3 Detalhes

| Ponto | Proposta |
|---|---|
| **Pontos de antes de escolher** | Não contam para a cidade. Vale dali em diante, como na troca de time. |
| **Troca de cidade** | Livre, como o time (`jogo.md`, seção 3). Pontos ficam onde foram feitos. |
| **Lista do IBGE** | ~5.570 municípios num arquivo estático, carregado só na tela de escolha (fora do bundle inicial). |
| **Estado sem 100 jogadores** | Vagas a 80%, igual aos times. |
| **Onde aparece** | Aba **Cidades** no Ranking: seu estado + top nacional + estados. Home: "Sua cidade está em 3º em SP." |

## 4. Etapas

| Etapa | O quê |
|---|---|
| 1 | Guardar a cidade (código IBGE) no torcedor e em cada partida. Tela de escolha com busca. |
| 2 | Rankings de cidade e estado, com o mínimo de jogadores. |
| 3 | Aba Cidades, linha na Home, rival da cidade e frases do narrador. |
| 4 | Troféu de estado na Galeria (depende da proposta de Galeria). |

Precisa do **fechamento da semana** da proposta de Série A e B (seção 4 de lá) só para o troféu; os rankings ao vivo saem antes.

## 5. Perguntas para o Kauê

1. **Quando perguntar:** B (depois da 1ª partida) ou A (na escolha do time)?
2. **Mínimo para a cidade aparecer:** 5 jogadores (recomendado) ou 3?
3. **Pontos de antes de escolher a cidade** ficam de fora? Sim/Não
4. **Lembrete na Home** para quem pulou, no máximo 1 vez por semana? Sim/Não
5. **Ligar já na pré-temporada** (zera junto), para os amigos testarem? Sim/Não
