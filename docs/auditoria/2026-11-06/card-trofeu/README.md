# Card do troféu na tela SEU CARD (06/11/2026)

Prints em 390 × 844 (dpr 2, 780 × 1688) tirados no dev (`npm run dev`) com Edge headless, sem Supabase (`.env.development.local` vazio, fora do Git), time Flamengo, apelido "Zé da Geral" e nível ligado. Os de "img" são as imagens geradas (1080 × 1920 e 1080 × 1080) de `/dev/cards.html?personalizados&times=flamengo`. Aprovação do Kauê pendente antes do merge.

| Arquivo | O que mostra |
|---|---|
| `01-tela-telao-stories.png`, `01-tela-telao-quadrado.png` | Tela SEU CARD no Telão, Campeão da semana (`?cardFalso&tipo=trofeu`) |
| `02-tela-placar-stories.png`, `02-tela-placar-quadrado.png` | O mesmo no Placar seco |
| `03-tela-poster-stories.png`, `03-tela-poster-quadrado.png` | O mesmo no Pôster (boneco, troféu e nome na placa) |
| `04-tela-mes-telao.png` | Troféu de mês (Campeão da temporada), sem soma: quadradinho "Números do mês" e sem linha de quem |
| `05-tela-outro-time-telao.png` | Troféu de outro time (`&outroTime=1`): cores do time do troféu, sem Pôster, "Meu boneco" apagado ("Boneco só no card do seu time") |
| `07-home-placa-flamula.png` | Placa "Troféu novo" da Home com a flâmula do Flamengo (cor 2 preta) com contorno claro |
| `09-campeas-minha-cidade-mais-vezes.png` | Campeãs: a sua cidade (Campinas) é a mais vezes campeã e a linha "Sua cidade…" não repete |
| `10-cidades-subabas-390.png`, `11-cidades-subabas-360.png` | Sub-abas de Cidades iguais, na largura toda, sem rolagem horizontal (87 px cada em 390; 79 px em 360) |
| `12` a `17` | Imagens geradas, Campeão da semana: Telão, Placar seco e Pôster em Stories e Quadrado |
| `18-img-mes-telao-stories.png`, `19-img-mes-placar-stories.png` | Troféu de mês nas imagens geradas |
| `20-img-telao-stories-busto.png` | Telão com "Meu boneco" ligado |
| `21-img-telao-stories-desligado.png`, `22-img-placar-stories-desligado.png` | Tudo desligado: só o essencial |
| `23-img-vitrine-telao-stories.png` | Vitrine (megafone), sem série |
| `24-img-mes-telao-stories-posicao.png` | Troféu de mês no Telão, imagem gerada 1080 × 1920: a posição "1º" com o º menor (em Anton parecia "10") |

Não há print do Pôster com troféu de outro time porque ele não existe (sem boneco, o card vira Telão).
