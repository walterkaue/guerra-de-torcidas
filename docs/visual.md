# Revisão gráfica — direção "Transmissão de domingo"

> Versão 1.2 · 18/10/2026 · **Direção aprovada em 18/10/2026.** Mockups no canvas "Guerra de Torcidas — revisão gráfica" (Início, Partida, Resultado, Ranking, Crava a Rodada).
> Base: o jogo publicado em 18/10/2026 (commit b492b99), testado em 390×844.
> Mudanças da 1.2: o que muda no MVP antes das divisões e das abas novas (seção 3), ajustes de código passados para o prompt da etapa 3 (seção 5).

## 1. O que vi no jogo hoje

- A base é boa: verde-gramado, amarelo de placar, botões grandes e "afundáveis". Mantemos.
- **Início estático:** um ranking de exemplo com "?" e muito espaço vazio. Não dá vontade de voltar amanhã.
- **Partida achatada:** o gol fica pequeno no topo e 60% da tela é gramado vazio. Não há perspectiva, a bola é pequena e o gol comemorado é só um texto.
- **Resultado:** o card é bom, mas os pontos aparecem como lista e não mostram o efeito no ranking da torcida, que é o motivo de jogar.
- **Tipografia de sistema:** funciona, mas não tem cara de futebol.

## 2. Direção

Placar de TV, grito de narrador e arquibancada. Tudo puxa a cor do time de quem joga.

| Item | Proposta |
|---|---|
| Fundo | Gramado listrado, como hoje (`#0b3d1f` e `#0e4625`) |
| Destaque | Amarelo de placar `#ffd23f` (botão principal, números, alertas bons) |
| Cor do time | `--c1` do time escolhido em faixas inclinadas, no grito do narrador, na arquibancada, no card e na **camiseta lisa** dos batedores (uniforme 1 ou 2; o goleiro usa um tom forte de contraste, ver `docs/bonecos.md`) |
| Subiu / caiu | Verde `#3ddc84` e vermelho `#ff5a3c`, sempre com seta ou ícone, nunca só a cor |
| Números e gritos | **Anton** (condensada, de placar) |
| Rótulos | **Barlow Condensed** em caixa alta |
| Texto | **Barlow** |
| Assinatura visual | Faixas inclinadas (−8°) como as tarjas de transmissão, "AO VIVO" piscando, adesivo do narrador levemente torto |

As fontes entram auto-hospedadas e só com os caracteres do português (~60 KB no total), dentro do limite de 300 KB do `CLAUDE.md`.

## 3. Tela a tela

### Início
- Tarja "AO VIVO" e **contagem regressiva** até zerar a semana.
- Bloco do time nas cores dele, com a cidade embaixo (segunda camisa).
- **Cabo de guerra contra o rival:** barra dividida nas duas cores, com a frase do narrador do momento (`rival_colado` etc.).
- Mini tabela da Série A com a sua torcida destacada e a seta de subida ou queda.
- **Grade 2×2 com os 4 jogos** (20/10, ver "Home" na seção 9 do `jogo.md`): cards iguais com tarja inclinada nas cores do time, nome em Anton, selo de status e o teto diário à vista no card dos Pênaltis ("faltam 2 partidas que contam hoje"). O mini ranking vem depois da grade.
- Barra de navegação: Jogar, Ranking, Palpites, Carreira.

### Partida
- **Perspectiva:** gol maior e mais baixo, linhas da área convergindo, marca do pênalti com a bola grande perto do dedo.
- Placar estilo TV inclinado, com bolinhas verdes (gol), pretas (erro) e amarela (ângulo ou cavadinha).
- Arquibancada nas cores do time atrás do gol, que faz "ola" a cada gol.
- **Grito do narrador como adesivo:** caixa na cor do time, borda branca, entra com um "pop", e a frase complementar logo abaixo.
- **Rastro da bola** amarelo seguindo o arraste do dedo; "+15" subindo do ponto do gol.
- Gol: tremida curta da tela (120 ms), rede balançando e vibração no Android (`navigator.vibrate`).
- Cavadinha: câmera lenta de 0,5 s antes de entrar.
- **Bonecos (Silhueta premium, `docs/bonecos.md`):** esqueleto por rotações com poses-chave interpoladas. Batedor: ajeita a bola agachado e recua, mãos na cintura, chute em 4 tempos (pé de apoio, puxada, contato, finalização), cavadinha de toque curto, comemora o gol ou põe as mãos na cabeça. Máquina: corrida de 3 passos e crava o pé de apoio. Goleiro: balança na linha, pulo baixo ou alto para cada lado, de pé no meio, cai no chão depois do pulo, com a bola encaixada no peito quando defende. Bola com gomos girando e rastro de borrão.
- **Dica da defesa no corpo:** a partir de 55% da corrida aparece no chão, em amarelo, a pegada de onde o pé de apoio vai cravar, com a seta do canto; quando o batedor chega, a chuteira do pé de apoio fica amarela e continua assim no chute.
- **Desempenho:** grama, linhas, rede e 3 quadros da torcida ficam pré-desenhados; a cada quadro só bonecos, bola, traves e efeitos são desenhados ao vivo. Na ola, a torcida é redesenhada agrupada por cor (um preenchimento por cor). Medido em 19/10 com CPU 4× mais lenta (perfil de celular médio do Chrome), 390×844: 1,2 ms de trabalho por quadro em média, 99% dos quadros abaixo de 10 ms.
- Contraste: texto sobre a cor do time usa sempre `corDeTexto` (escuro em time de cor clara, branco no resto).

### Resultado
- Placar gigante, "VITÓRIA" ou "DERROTA", confete nas cores do time quando vence.
- **"+85 PRO [TIME]"** contando de 0 até o total, com os bônus em etiquetas (com o artigo certo: "pra Chapecoense").
- **O efeito na torcida:** "subiu de 5º pra 3º na Série A" com barra enchendo, e quanto falta para o próximo.
- Botões: "Chamar no X1" (WhatsApp, o maior), Stories, Placar em emoji, Copiar link, e "Revanche" como ação principal.

### Ranking
- Abas: Semana, Temporada, 52 semanas, Cidades.
- Tabela da Série A com faixa amarela no líder e vermelha na zona de rebaixamento, sua torcida destacada.
- Explicação curta de como conta, no rodapé.

### Crava a Rodada
- **Aviso fixo** "Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."
- Cartão por jogo com placar ajustável (− e +), "Jogo da certeza" destacado, e jogo fechado mostrando como a torcida cravou.

### No MVP (até a fase 1.5 chegar)
- **Sem divisões ainda:** onde está "Série A", mostrar o ranking geral da semana com os 20 times (Campeão da semana, com a Maior torcida como segunda aba). Sem faixa de rebaixamento.
- **Sem cidade ainda:** o bloco do time não mostra cidade.
- **Abas Palpites e Carreira:** aparecem com selo "em breve", sem tela vazia. Ranking mostra só a aba Semana.
- **Ranking público só de torcidas:** nenhum apelido aparece em ranking.

### Bonecos
- Estilo "Silhueta premium", aprovado em 19/10: ver `docs/bonecos.md`.

## 4. Movimento (regras)

- Tudo curto: 150 a 400 ms; só o grito do narrador e o confete passam disso.
- Respeitar `prefers-reduced-motion`: sem tremida, sem confete, sem câmera lenta.
- Nada pisca mais de 3 vezes por segundo.

## 5. Ajustes encontrados no código

Os três ajustes abaixo entraram no prompt da etapa 3 (bloco A), junto com o desempate:
- **Artigo do time:** o card e a tela de resultado escrevem "pro {nome}" fixo. Com time feminino sai errado ("pro Chapecoense"). `src/dados/times.ts` ainda não tem o campo `artigo` nem o `rival`.
- **`CLAUDE.md` e `.env.example` desatualizados:** ainda falam da chave `anon` e da `service_role`.
- **Frases do narrador:** `src/jogo/narrador.ts` ainda tem as frases provisórias da etapa 2 (com "goleiro do {time}" se referindo a quem joga e "torcida do {time}" sem artigo). Precisa da versão 1.1.

## 6. Ordem sugerida no Claude Code

1. Ajustes da seção 5 + desempate + Supabase (etapa 3) — **opusplan, Alta**.
2. Fontes, cores e tela de Início — **opusplan, Alta**.
3. Partida em perspectiva + efeitos de gol — **opusplan, Alta**.
4. Resultado com efeito no ranking — **opusplan, Alta** (depende do ranking existir no servidor).
