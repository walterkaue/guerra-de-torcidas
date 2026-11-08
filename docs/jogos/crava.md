# Crava a Rodada (palpites)

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

Inspirado na rotina de rodada do Cartola e no prode argentino, **sem jogador real e sem nenhuma relação com aposta**. Nome provisório.

## Regra

### Como joga
- A cada rodada do Brasileirão Série A, a pessoa crava o placar dos jogos que quiser (pode pular jogos). De 0 a 9 gols para cada lado; edita até o início do jogo.
- Grátis, sem dinheiro e sem prêmio em dinheiro: o que se ganha é ponto para a torcida, posição no ranking e zoeira. Só clubes e placares, nada de escalar jogador real.
- Todo mundo palpita, em qualquer jogo da rodada, inclusive de time que não é o seu. Quem é de "Outro time" soma no ranking pessoal (e na cidade). Palpitar contra o próprio time vale, e o narrador zoa.
- Cada palpite fecha no início do jogo (hora do servidor) e fica escondido até lá. Depois, todo mundo vê como a torcida cravou.
- **Jogo da certeza:** 1 por rodada, marcado e trocado até o início do primeiro jogo da rodada; depois trava.
- **Jogo adiado:** o palpite fica guardado e reabre até o novo horário. Jogo não disputado até o fim da 38ª rodada é anulado, sem pontos (se era o da certeza, o dobro se perde).
- **Porcentagem da torcida** ("71% cravou vitória do mandante"): só depois do início do jogo e com pelo menos 20 palpites nele; abaixo disso, "pouca gente cravou esse". Nunca aparece como "cotação".

### Pontuação
| Acerto | Pontos |
|---|---|
| Placar exato | 10 |
| Vencedor e saldo de gols certos (ou empate com outro placar) | 7 |
| Só o vencedor (ou só o empate) | 5 |
| Errou | 0 |
| **Jogo da certeza** | ×2 |

- **Peso na torcida:** os pontos entram ×2, com teto de **300 por rodada**, aplicado na ordem em que os jogos são confirmados. Rodada que atravessa duas semanas reparte os pontos pela data de cada jogo.
- Soma no ranking da semana **por fora do teto diário** de minigames. Não passa pelo amistoso de 2 semanas (o peso já é limitado pela regra própria). Sem bônus "Contra a maré" (ideia no backlog).
- **Em que semana entram:** a do início do jogo (Brasília). Jogo de domingo à noite é confirmado depois da virada, por isso o campeão da semana só é confirmado segunda às 12h (até lá, "provisória"). Placar confirmado depois disso (raro) entra na semana atual: semana fechada não reabre.
- Rankings próprios: da rodada, do mês e do Brasileirão (Palpiteiro do Brasileirão). Sem apelido (MVP): a tela mostra o ranking das torcidas no palpite (média dos 30 melhores palpiteiros de cada time na rodada, vagas vazias a 80% como na semana) e, de cada pessoa, só a própria posição ("você é o 37º de 412 na rodada"). Ligas entre amigos e ranking individual público ficam para a fase 2, com moderação.
- Carreira: cada rodada palpitada conta como 1 partida (XP no dia do 1º palpite); ver `jogos/rankings.md`.

### Cards
- "Meus palpites" (antes): só os placares e o jogo da certeza, sem porcentagem.
- "Resultado da rodada" (depois): pontos {pro_time} e uma linha de emoji por jogo palpitado: 🎯 exato, ✅ saldo, 👍 vencedor, ❌ errou, com ⭐ logo depois do jogo da certeza.
- Os dois levam o aviso fixo "Aqui é só resenha". Frases do narrador: `docs/narrador.md`, seção 9.

### Linha vermelha: nada que pareça aposta
- **Aviso fixo** no topo da tela e no card: **"Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."**
- Palavras proibidas em todo o jogo: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red". Só duas exceções nomeiam a aposta para negá-la: o aviso fixo e os Termos (`src/dados/termos.md`).
- Nenhum anúncio, link ou patrocínio de casa de aposta; se um dia houver anúncio, a categoria apostas fica bloqueada.

## Como está no código
- Lógica pura: `src/jogo/crava.ts` (`PESO_TORCIDA` 2, `TETO_RODADA` 300, `GOLS_MAX` 9, rodadas 32 a 38), `cravaTela.ts`, `cardCrava.ts`, `footballData.ts`.
- Calendário e placares vêm do football-data.org (plano grátis cobre a Série A, com placar atrasado, o que serve). A chave da API é segredo da função no servidor, nunca no front-end nem no repositório; o plano permite 10 chamadas por minuto, então só o servidor consulta (poucas vezes por rodada) e guarda os jogos no banco.
- **Painel do administrador:** `#admin`, login por e-mail, só para quem está na tabela de administradores (o Kauê). Ele confirma ou corrige o placar; os pontos só são distribuídos na confirmação.
- Soma no ranking desde a 32ª rodada, como o resto da pré-temporada (zera antes do lançamento público).
