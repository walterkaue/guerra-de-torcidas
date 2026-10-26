# Monetização: proposta para decisão

> Rascunho de 26/10/2026, para o Kauê decidir. **Nada aqui está decidido nem construído.** Quando houver decisão, ela vai para o `docs/jogo.md` (pilares e seção 7) e só depois vira código.

## 1. As regras que a monetização não pode quebrar

Saem dos pilares do `docs/jogo.md` e do `CLAUDE.md`:

| Regra | O que proíbe na prática |
|---|---|
| **Zero aposta** (pilar 6, seção 7) | Anúncio, patrocínio ou link de casa de aposta, mesmo "regulamentada". Prêmio em dinheiro. Qualquer coisa com cara de odd ou banca. |
| **Justo** (pilar 7) | Pagar por pontos, vidas, partidas extras, dicas na Prova ou qualquer vantagem no ranking. |
| **Sem marca de clube** | Vender escudo, uniforme oficial, mascote, hino ou "manto licenciado" sem licença; usar nome de jogador real para vender. |
| **Dados mínimos (LGPD)** | Exigir cadastro; anúncio que rastreia a pessoa (precisa de banner de consentimento e contraria o login anônimo). |
| **Feito para WhatsApp** (pilar 4) | Paywall, anúncio que interrompe a partida, tela cheia antes de jogar. |

Duas consequências diretas:
- **Prêmio por competição está fora.** Além de parecer aposta, sorteio ou concurso com prêmio é "promoção comercial" e precisa de autorização do governo (Lei 5.768/71). O "desafio patrocinado com camisa oficial de prêmio" da proposta do Gemini cai aqui.
- **Rede de anúncios comum (AdSense e similares) é ruim para nós.** Ela rastreia, pede consentimento de cookies, e não dá para garantir que nunca vai aparecer aposta, a categoria que mais compra anúncio de futebol no Brasil hoje.

## 2. Opções, da mais compatível à menos

| # | Opção | Combina com as regras? | Esforço | Receita esperada | Comentário |
|---|---|---|---|---|---|
| 1 | **Apoio da torcida** (Pix "pague um café", apoio mensal no Apoia.se ou Catarse) | Total | Baixo (link + página "Apoie") | Baixa e estável | Bom primeiro passo: custa quase nada e mede quem gosta do jogo. Sem recompensa que dê vantagem. |
| 2 | **"Oferecido por"** de marca que não seja aposta (loja de material esportivo, bar de futebol, mídia esportiva), num selo discreto no rodapé ou no card | Alta, com lista de categorias proibidas | Médio (venda direta, sem rede de anúncios) | Média, depende de audiência | Sem rastreio; a marca paga por exposição. Precisa de regra escrita: nunca aposta, nunca dentro da partida, nunca no card do resultado sem o texto "oferecido por". |
| 3 | **Cosméticos sem marca** (moldura e fundo do card, efeito de comemoração, cor do apelido), pagos uma vez | Alta, se for só visual | Alto (pagamento via Pix, conta, entrega) | Média | Não dá pontos nem vantagem. Exige pagamento e, na prática, alguma conta: conflita com o login anônimo. Deixar para depois de ter audiência. |
| 4 | **Produto próprio** (camiseta do jogo, "Eu jogo pela minha torcida", sem escudo de clube) via loja sob demanda | Alta | Baixo (loja terceirizada) | Baixa | Mais divulgação do que receita. |
| 5 | **B2B / licença do motor** (quiz e "Time do Dia" para rádio, criador de conteúdo ou mídia esportiva, com a marca deles) | Alta | Alto (versão personalizável) | Pode ser a maior | Faz sentido com tração: o conteúdo conferido (Casa, perguntas) é o ativo. |
| 6 | **Parceria oficial com clube** | Muda o pilar "sem marca de clube" | Muito alto | Incerta | Decisão de rumo, não de implementação: precisaria de licença e quebraria a neutralidade entre torcidas. |
| ✖ | Anúncio de aposta "regulamentada" | **Não** (pilar 6) | | | Proibido pelo jogo.md. |
| ✖ | Prêmio real em evento ou ranking | **Não** (pilar 6 e lei de promoções) | | | |
| ✖ | Pagar por vantagem (vidas, partidas, dicas) | **Não** (pilar 7) | | | |
| ✖ | Rede de anúncios com rastreio | Conflita com LGPD e zero aposta | | | |

## 3. Proposta em etapas

| Etapa | Quando | O quê |
|---|---|---|
| **1. Agora** (pré-temporada e lançamento) | Já | Nada pago. Página **"Apoie o jogo"** com Pix e link de apoio mensal, sem recompensa que dê vantagem (no máximo um "obrigado" no rodapé, opcional e sem nome público, porque apelido não aparece em ranking no MVP). |
| **2. Com audiência** (ex.: 5 a 10 mil pessoas por semana) | Depois do lançamento | **"Oferecido por"** com 1 ou 2 marcas não-aposta, vendido direto. Regra escrita de categorias proibidas. Card de convite para criadores de conteúdo (sem nome de pessoa real no material do jogo). |
| **3. Com tração** | Fase 2 | Cosméticos sem marca (se o login anônimo puder virar conta opcional) e B2B do motor para mídia esportiva. |

## 4. O que o Kauê precisa decidir

- [ ] **Apoio da torcida agora?** Se sim: chave Pix (de qual CNPJ ou CPF) e qual plataforma de apoio mensal.
- [ ] **"Oferecido por":** aceita marca no rodapé? Lista de categorias proibidas além de aposta (bebida alcoólica? bets disfarçadas de "fantasy"? política?).
- [ ] **Cosméticos:** aceitar conta opcional (e-mail) só para quem compra? Isso muda o pilar de dados mínimos.
- [ ] **Clube:** manter a neutralidade (recomendado) ou abrir conversa com clubes?
- [ ] Confirmar que **prêmio em dinheiro ou produto continua fora** de qualquer evento.

Quando decidir, eu passo para o `docs/jogo.md` (pilares 6 e 7 e seção 7) e faço só o que estiver liberado, começando pela página "Apoie o jogo".
