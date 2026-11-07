# Card de fim de temporada ("tabela final no telão") na tela SEU CARD (06/11/2026)

Imagens geradas (1080 × 1920 e 1080 × 1080) de `/dev/cards.html?personalizados&so=temporada&times=flamengo&luz=noite` e prints da tela em 390 × 844 e 360 × 740 (dpr 2), tirados com Playwright e Chromium headless contra `npx vite --port 5182`, sem Supabase (`.env.development.local` apontando para uma porta que não responde, fora do Git), time Flamengo, apelido "Zé da Geral" e nível ligado. Dados dos modos falsos de dev (`?cardFalso&tipo=temporada`, `?temporadaFalsa=ab`, `?temporadaFalsa=fechada`). Aprovação do Kauê pendente antes do merge.

| arquivo | o que mostra |
|---|---|
| `60-card-subiu-telao-stories.png` | Telão, Stories: "SUBIU!" inclinado com papel picado, faixa do Flamengo, pedaço da tabela final (linha do time na cor do time, tracejado verde "SOBEM"), 3 números, frase e "Zé da Geral tava na arquibancada" |
| `61-card-subiu-placar-stories.png` | Placar seco, Stories: "SUBIU PRA SÉRIE A" como destaque, linha do fim, os 3 números numa linha pequena, quem, frase e link |
| `62-card-subiu-poster-stories.png` | Pôster, Stories: faixa "FIM DE DEZEMBRO · 2º NA SÉRIE B"; na placa, o emblema do destino (seta verde) no lugar da medalha, o destino em Anton e "Flamengo · Série B" |
| `63-card-subiu-telao-quadrado.png`, `64-card-subiu-placar-quadrado.png`, `65-card-subiu-poster-quadrado.png` | Os mesmos três estilos no Quadrado (no Telão, selo e faixa do time na primeira linha; tabela e números embaixo) |
| `66-card-caiu-telao-stories.png` | "Caiu": selo cinza, tracejado vermelho "CAEM", sem papel picado e sem linha de quem (não somou); frase neutra |
| `67-card-campeao-telao-stories.png` | "Campeão": selo dourado, papel picado, o time em 1º (sem tracejado: o corte da Série A cai fora da fatia) |
| `68-card-unica-a-telao-stories.png` | Mês da série única, "SÉRIE A!" (10º, tracejado "SOBEM" entre o 10º e o 11º) |
| `69-card-pre-temporada-telao-stories.png` | Pré-temporada: "TESTE DAS DIVISÕES" dentro do selo; nada de troféu |
| `70-card-subiu-telao-stories-tudo-desligado.png` | Tudo desligado: sem tabela (os 3 números ficam), sem frase, sem apelido ("Eu tava na arquibancada"), sem link e sem nível |
| `71-card-subiu-sem-soma-telao-stories.png` | A pessoa não somou no mês: a linha "tava na arquibancada" some |
| `72-card-subiu-telao-stories-busto.png` | Telão com "Meu boneco" ligado (busto ao lado da linha de quem) |
| `73-card-tela-390x844.png`, `74-card-tela-360x740.png` | Tela SEU CARD com o card do mês (`?cardFalso&tipo=temporada`): quadradinho "Tabela final", sem rolagem horizontal nas duas larguras |
| `75-card-aba-temporada-botao-390x844.png` | Ranking > Temporada > "Mês passado" (`?temporadaFalsa=ab`): o botão "Card do mês" (secundário, sem amarelo) no mês fechado |
| `76-card-aba-temporada-card-aberto-390x844.png` | O toque no botão: a tela SEU CARD com o card de novembro (pré-temporada, "Teste das divisões") |
| `77-card-aba-temporada-este-mes-sem-botao-390x844.png` | "Este mês" (aberto): sem botão |

Rolagem horizontal conferida por script (`scrollWidth <= clientWidth`) na tela SEU CARD (390 e 360) e nas abas: sem rolagem em nenhuma. Nenhuma chamada saiu para o Supabase: todas as requisições foram bloqueadas na porta de mentira.
