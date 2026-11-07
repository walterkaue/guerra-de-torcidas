# Boneco em campo: prints 390x844

Tirados em 07/11/2026 com Playwright (Chromium, 390x844, escala 2, toque), no dev do worktree da entrega.
Servidores falsos de `src/dev/` (nada vai ao Supabase). Parâmetros do boneco falso: topo de `src/dev/bonecoDeCampoFalso.ts`.
Base das URLs de pênaltis: `http://localhost:5173/?penaltiFalso&lancesFalsos&corte=antes&uniforme=1`, entrando por Lances do Jogo,
Pênaltis, "Bater a disputa livre" (`irParaPartida`). Time do coração: Palmeiras, salvo onde diz outro (`prefs.time`).
`&uniforme=1|2` (só dev) força o uniforme sorteado. `&replayFalso` (só dev) dispara o replay em qualquer gol.

| # | Print | O que mostra | URL (depois da base) |
|---|-------|--------------|----------------------|
| 01 | 01-penalti-uniforme1.png | Pênalti, cena de TV, uniforme 1 (camisa verde, número claro) | base |
| 02 | 02-penalti-uniforme2.png | Pênalti, uniforme 2 (camisa branca, número escuro) | base com `&uniforme=2` |
| 03 | 03-disputa-selecao.png | Disputa da Seleção (O primeiro ouro olímpico): camisa da Seleção, peças nas cores do Palmeiras | base, Pênaltis, card "O primeiro ouro olímpico", "Jogar essa disputa" |
| 04 | 04-falta-outro-clube.png | Falta de outro clube (Flamengo, falta do tri), time do coração Palmeiras | `/?lancesFalsos&corte=depois#lance/flamengo-2001-falta-do-tri`, Jogar |
| 05 | 05-cara-a-cara-outro-clube.png | Cara a cara de outro clube (Flamengo, Tóquio) | `/?lancesFalsos&corte=depois#lance/flamengo-1981-toquio`, Jogar |
| 06 | 06-gol100-goleiro.png | Gol 100: batedor de goleiro (camisa dourada, calção preto) com o boneco | `/?lancesFalsos&corte=depois#lance/sao-paulo-2011-gol-100`, Jogar |
| 07 | 07-replay-de-frente.png | Replay de TV do golaço: batedor de frente, rosto liso, número no peito | base com `&replayFalso&lento=2&boneco=coque-pele4-n10` (prefs `qualidade: alta`) |
| 07b | 07b-replay-de-frente-zoom.png | Recorte ampliado do 07 | idem |
| 08 | 08-sem-boneco.png | Sem boneco guardado: batedor sorteado como antes | base com `&semBoneco` |
| 09 | 09-interruptor-desligado.png | "Meu boneco em campo" desligado: batedor sorteado | base com `&emCampo=0` |
| 10 | 10-cabelo-coque.png | Cabelo de costas: coque | base com `&boneco=coque` |
| 11 | 11-cabelo-trancas.png | Cabelo de costas: tranças | base com `&boneco=trancas-pele4` |
| 12 | 12-cabelo-rabo.png | Cabelo de costas: rabo | base com `&boneco=rabo-pele1-cor2` |
| 13 | 13-cabelo-crespo.png | Cabelo de costas: crespo | base com `&boneco=crespo-pele5` |
| 14 | 14-numero-camisa-clara.png | Número escuro em camisa clara (Santos, uniforme 1) | base com `&boneco=n9`, time Santos |
| 15 | 15-numero-camisa-escura.png | Número claro em camisa escura (Botafogo, uniforme 1) | base com `&boneco=n23`, time Botafogo |
| 16 | 16-x1-boneco-de-quem-chamou-batendo.png | X1 de pênaltis: quem chamou (Flamengo, coque, n7) bate nas cores dele e a pessoa defende | base com `&x1Livre&d=abcdefgh&chamouTime=flamengo&chamouBoneco=coque-pele5-n7&boneco=n10`, Aceitar o X1, chutar e esperar a defesa |
| 17 | 17-x1-resultado-penaltis-dois-bustos.png | Resultado do X1 de pênaltis com o busto dos dois ao lado do apelido | mesma URL do 16, jogar até o fim |
| 18 | 18-x1-resultado-penaltis-sem-boneco-de-quem-chamou.png | Resultado sem o busto de quem chamou (só o seu, os dois nomes alinhados) | base com `&x1Livre&d=abcdefgh&chamouTime=flamengo&chamouSemBoneco` |
| 19 | 19-x1-resultado-lances-dois-bustos.png | Resultado do X1 dos Lances com os dois bustos | `/?homeFalsa&lancesFalsos&corte=depois&l=abc12345&chamouTime=flamengo&chamouBoneco=rabo-pele2-n9&boneco=n10`, Aceitar o X1, jogar as 3 |
| 20 | 20-x1-resultado-lances-sem-boneco-de-quem-chamou.png | Resultado do X1 dos Lances sem o busto de quem chamou | mesma URL do 19 com `&chamouSemBoneco` |
| 21 | 21-home-convite-x1-penaltis-com-busto.png | Convite do X1 na Home com o busto de quem chamou | base com `&x1Livre&d=abcdefgh&chamouTime=flamengo&chamouBoneco=coque-pele5-n7` |
| 22 | 22-home-convite-x1-penaltis-sem-boneco.png | Convite sem boneco (como antes) | idem com `&chamouSemBoneco` |
| 23 | 23-home-convite-x1-lances-com-busto.png | Convite do X1 dos Lances com o busto | `/?homeFalsa&lancesFalsos&corte=depois&l=abc12345&chamouTime=flamengo&chamouBoneco=rabo-pele2-n9` |
| 24 | 24-perfil-interruptor-meu-boneco-em-campo.png | Perfil, Ajustes: "Meu boneco em campo" ligado | `/?homeFalsa&boneco=coque-pele4-n7`, Perfil |
| 25 | 25-antes-depois-penalti.png | Antes (origin/main, porta 5180) e depois, no mesmo pênalti | base (o uniforme do "antes" é sorteado: saiu o 1) |
| 26 | 26-antes-depois-gol100.png | Antes e depois no Gol 100 | mesma URL do 06 |
| 27 | 27-home-divisoes-e-boneco-360.png | Home em 360 com o bloco das divisões (D4) e o boneco (avatar e busto no convite do X1), sem sobrepor | `/?homeFalsa&temporadaFalsa=unica&d=abcd1234&boneco=coque-pele4-n7` (barra de baixo solta só no print da página inteira) |
| 28 | 28-home-divisoes-e-boneco-430.png | O mesmo em 430 | mesma URL do 27 |

Os 25 e 26 têm o "antes" tirado de um worktree temporário da main (já removido), com o mesmo servidor falso.
