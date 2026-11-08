## 7. Minigame 2 — "Crava a Rodada" (palpites)

> Nome provisório. Inspirado na rotina de rodada do Cartola e no prode argentino, **sem jogador real e sem nenhuma relação com aposta**.
> **Estreia: ainda nas últimas rodadas do Brasileirão 2026.**

### Como joga
- A cada rodada do Brasileirão Série A, o jogador crava o placar dos jogos que quiser (pode pular jogos).
- Grátis, sem dinheiro e sem prêmio em dinheiro. O que se ganha é ponto para a torcida, posição no ranking e zoeira.
- Só clubes e placares. Nada de escalar jogador real.
- Cada palpite fecha no horário de início do jogo (hora do servidor). Os palpites ficam escondidos até o jogo começar; depois, todo mundo vê como a torcida cravou ("71% cravou vitória do mandante").
- Ranking da torcida e geral na estreia; ligas entre amigos ficam para a fase 2 (ver decisões abaixo).

### Pontuação
| Acerto | Pontos |
|---|---|
| Placar exato | 10 |
| Vencedor e saldo de gols certos (ou empate com outro placar) | 7 |
| Só o vencedor (ou só o empate) | 5 |
| Errou | 0 |
| **Jogo da certeza:** 1 jogo por rodada, escolhido antes do primeiro jogo da rodada | ×2 |

- **Peso na torcida:** os pontos de palpite entram multiplicados por 2, com teto de **300 por rodada** (o mesmo que um dia de minigames).
- Rankings próprios: da rodada, do mês e do Brasileirão inteiro (Palpiteiro do Brasileirão). No MVP, sem apelido: ver decisões abaixo.
- Palpitar contra o próprio time vale normalmente, e o narrador zoa.
- **Sem bônus "Contra a maré" na estreia** (decidido em 18/10): simplifica a regra e, com pouca gente palpitando, a porcentagem não seria confiável. A ideia fica no backlog.

### Decisões para a estreia (19/10/2026)
- **Sem ligas entre amigos na estreia.** Entram na fase 2, junto com as ligas da seção 4.
- **Rankings sem apelido (regra do MVP):** a tela mostra o ranking das torcidas no palpite (média dos 30 melhores palpiteiros de cada time na rodada, com as vagas vazias a 80% como na semana) e, para cada pessoa, só a própria posição ("você é o 37º de 412 na rodada"). Ranking individual público só depois da moderação.
- **Em que semana os pontos entram:** na semana em que o jogo começou (horário de Brasília). Como jogo de domingo à noite é confirmado depois da virada, o **Campeão da semana é confirmado segunda às 12h**; até lá, a semana que fechou aparece como "provisória". Placar confirmado depois disso (raro) entra na semana atual: semana fechada não reabre.
- **Soma no ranking:** os pontos de palpite (×2) somam ao total da semana da pessoa, por fora do teto diário de minigames. O teto de 300 por rodada é aplicado na ordem em que os jogos são confirmados; rodada que atravessa duas semanas reparte os pontos pela data de cada jogo.
- **Fora do amistoso:** o Crava não passa pelas 2 semanas de amistoso; o peso dele já é limitado pela regra própria e o Brasileirão acaba em 2/12.
- **Sem ensaio (mudado em 20/10):** o modo ensaio foi desligado; o Crava **soma no ranking desde a 32ª rodada (23 a 26/10)**, junto com o teste com amigos, como todo o resto da pré-temporada (seção 5). Os pontos da pré-temporada zeram antes do lançamento público.
- **Quem palpita:** todo mundo, em qualquer jogo da rodada, inclusive de time que não é o seu. Quem é de "Outro time" soma no ranking pessoal (e na cidade, quando ela existir).
- **Palpite:** de 0 a 9 gols para cada lado; pode editar até o início do jogo. **Jogo da certeza** pode ser marcado e trocado até o início do primeiro jogo da rodada; depois trava.
- **Jogo adiado:** o palpite fica guardado e reabre até o novo horário. Jogo não disputado até o fim da 38ª rodada é anulado, sem pontos; se era o jogo da certeza, o dobro se perde.
- **Painel do administrador:** página `#admin` com login por e-mail, liberada só para quem está na tabela de administradores (o Kauê). O placar vem do football-data.org e o admin confirma ou corrige; os pontos só são distribuídos na confirmação.
- **Porcentagem da torcida:** aparece depois do início do jogo e só com pelo menos 20 palpites naquele jogo (abaixo disso: "pouca gente cravou esse").
- **Cards:**
  - "Meus palpites" (antes): só os placares cravados e o jogo da certeza, sem porcentagem.
  - "Resultado da rodada" (depois): pontos {pro_time} e uma linha de emoji, um por jogo palpitado: 🎯 exato, ✅ saldo, 👍 vencedor, ❌ errou, com ⭐ logo depois do jogo da certeza.
  - Os dois levam o aviso fixo "Aqui é só resenha".
- **Frases do narrador:** `docs/narrador.md`, seção 9 (versão 1.3).

### Linha vermelha: nada que pareça aposta
- **Aviso fixo** no topo da tela do minigame e no card: **"Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."**
- Palavras proibidas em todo o jogo: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red" (gírias de aposta). Só duas exceções nomeiam a aposta para negá-la: o aviso fixo acima e os Termos (`src/dados/termos.md`, seção 13), que é o texto legal.
- Nenhum anúncio, link ou patrocínio de casa de aposta em nenhuma tela. Se um dia houver anúncio, a categoria apostas fica bloqueada.
- A porcentagem da torcida aparece só depois que o palpite fecha, nunca como "cotação".

### Dados dos jogos
- Calendário e placares de uma fonte externa (o plano grátis do football-data.org cobre a Série A, com placar atrasado, o que serve, porque o palpite fecha no início do jogo).
- O administrador confirma o placar final no painel antes de distribuir os pontos.
- A chave da API do football-data.org é segredo: fica só como segredo da função no servidor, nunca no front-end nem no repositório. O plano grátis permite 10 chamadas por minuto, então só o servidor consulta a API (poucas vezes por rodada) e guarda os jogos no banco.

