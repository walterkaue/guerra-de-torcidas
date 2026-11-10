# Palpite da Rodada (palpites)

> Regra em vigor em 10/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

Inspirado na rotina de rodada do Cartola e no prode argentino, **sem jogador real e sem nenhuma relação com aposta**. Nome provisório.

## Regra

### Como joga
- A cada rodada do Brasileirão Série A, a pessoa crava o placar dos jogos que quiser (pode pular jogos). De 0 a 9 gols para cada lado; edita até o início do jogo.
- Grátis, sem dinheiro e sem prêmio em dinheiro: o que se ganha é ponto para a torcida, posição no ranking e zoeira. Só clubes e placares, nada de escalar jogador real.
- Todo mundo palpita, em qualquer jogo da rodada, inclusive de time que não é o seu. Quem é de "Outro time" soma no ranking pessoal (e na cidade). Palpitar contra o próprio time vale, e o narrador zoa.
- Cada palpite fecha no início do jogo (hora do servidor) e fica escondido até lá. Depois, todo mundo vê como a torcida palpitou.
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

## Entressafra e jogos especiais

O Brasileirão 2026 acaba na 38ª (quarta 02/12) e a Série A 2027 começa em 27/01/2027. Entre uma temporada e outra, o Palpite fecha o Brasileirão com um encerramento e abre só os **jogos especiais com time brasileiro**, cadastrados à mão no `#admin`, um por vez.

### Encerramento do Brasileirão
- Vale quando a 38ª está toda confirmada ou anulada e a rodada em foco (abaixo) não tem jogo aberto nem rolando.
- Card da Home e topo da aba Palpites: "Brasileirão encerrado", a posição da pessoa no Palpiteiro do Brasileirão ("Você foi o 37º de 412") e a torcida que mais pontuou (a 1ª do ranking das torcidas no Brasileirão). Embaixo, o próximo jogo especial ("Próximo: Final da Copa do Brasil · dom 06/12 · 16h") ou, sem nenhum, "Sem jogo para cravar agora. Volta em janeiro." O histórico das rodadas segue navegável.
- **Card "Resultado do Brasileirão"** (mesma família do "Resultado da rodada", pela tela SEU CARD): pontos {pro_time} no Brasileirão, rodadas palpitadas, a contagem de 🎯 ✅ 👍 e a posição; aviso fixo; texto de WhatsApp em 1ª pessoa, até 2 linhas antes do link. Apelido como nos outros cards.
- Quem nunca palpitou no Brasileirão vê só o encerramento e o próximo jogo, sem posição nem card.

### Rodada em foco
- "Bola rolando" só quando há jogo da rodada entre o início e a confirmação do placar. Rodada toda confirmada ou anulada mostra o fim dela ("34ª rodada · encerrada").
- A rodada em foco é a primeira (pela data típica dos jogos) que não ficou mais de 36 h para trás. Um jogo especial só entra na conta quando faltam até 7 dias para ele: assim o encerramento aparece logo depois da 38ª, e o especial distante (a Supercopa, vista de dezembro) fica como "Próximo".

### Jogos especiais
- **Quais:** só jogo com pelo menos um dos 20 times e que o país inteiro acompanha. Nesta entressafra: a final da Copa do Brasil (06/12), os jogos do campeão da Libertadores na Copa Intercontinental (09/12 e, se avançar, 12/12 e 16/12) e a Supercopa Rei (24/01/2027). O Kauê cadastra cada um quando os times e o horário estão definidos.
- **Como uma rodada de um jogo só:** abre ao ser cadastrado, fecha no início (hora do servidor), fica escondido até lá; porcentagem da torcida depois do início, com o mesmo mínimo; mesma tabela (10, 7, 5, 0); pontos ×2 na torcida, na semana do início do jogo e por fora do teto diário; 1 partida na Carreira; respeita o modo ensaio. Soma no ranking da semana e do mês e tem ranking da própria rodada; **não** entra no Palpiteiro do Brasileirão. **Sem jogo da certeza.**
- **Placar:** vale o do tempo normal, com os acréscimos. Aviso curto na tela do jogo: "Vale o placar dos 90 minutos. Prorrogação e pênaltis não contam."
- **Time de fora** (Toluca, PSG): só o nome, numa faixa neutra, sem as cores do clube e sem escudo. Os 20 seguem com a faixa de placar de sempre. Qualquer torcida palpita; os pontos vão para a torcida de quem palpitou.
- **Título** na tela e no card: competição e, se houver, a fase, sem patrocinador ("Final da Copa do Brasil", "Copa Intercontinental · Quartas"). O minigame continua "Palpite da Rodada".
- **Home:** o especial em foco aparece como uma rodada ("Final da Copa do Brasil · fecha em 2 dias", "Palpite salvo ✓"); o "Jogar agora" segue a regra de sempre. Nenhum aviso novo na central de avisos nem no push.
- **Adiado:** o Kauê troca o horário e o palpite reabre até o novo início. **Não disputado:** o Kauê anula, sem pontos.
- **Narrador:** as frases da seção 9 do `narrador.md`; com time de fora, a frase não usa o artigo dele.

### No `#admin` (seção "Jogos especiais")
- Criar: competição (até 40 caracteres), fase (opcional, até 40), mandante e visitante (um dos 20 ou "time de fora" com o nome, até 30), dia e hora de Brasília. Pelo menos um lado é um dos 20; o time de fora não pode ser um dos 20 escrito à mão.
- Editar até o início (os times, só sem palpite); depois do início, só o horário (jogo adiado). Apagar só sem palpite; com palpite, anular. Confirmar e corrigir o placar como nas rodadas, com o mesmo cálculo e as mesmas garantias contra pontos em dobro.
- O texto livre recusa as palavras proibidas (seção 3 do `jogo.md`, mais "valendo", "prêmio" e "lucro") e sai sempre escapado na tela e no card.

### Linha vermelha: nada que pareça aposta
- **Aviso fixo** no topo da tela e no card: **"Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca."**
- Palavras proibidas em todo o jogo: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red". Só duas exceções nomeiam a aposta para negá-la: o aviso fixo e os Termos (`src/dados/termos.md`).
- Nenhum anúncio, link ou patrocínio de casa de aposta; se um dia houver anúncio, a categoria apostas fica bloqueada.

## Como está no código
- Lógica pura: `src/jogo/crava.ts` (`PESO_TORCIDA` 2, `TETO_RODADA` 300, `GOLS_MAX` 9, rodadas 32 a 38), `cravaTela.ts`, `cardCrava.ts`, `footballData.ts`.
- Calendário e placares vêm do football-data.org (plano grátis cobre a Série A, com placar atrasado, o que serve). A chave da API é segredo da função no servidor, nunca no front-end nem no repositório; o plano permite 10 chamadas por minuto, então só o servidor consulta (poucas vezes por rodada) e guarda os jogos no banco.
- **Painel do administrador:** `#admin`, login por e-mail, só para quem está na tabela de administradores (o Kauê). Ele confirma ou corrige o placar; os pontos só são distribuídos na confirmação.
- Soma no ranking desde a 32ª rodada, como o resto da pré-temporada (zera antes do lançamento público).
- **Jogos especiais** (`20261111000000_jogos_especiais.sql`): cada um é uma linha de `rodadas` com `especial` e número a partir de 1001 (sequência `rodadas_especiais`), com um jogo só. `jogos` ganhou `competicao`, `fase`, `mandante_fora` e `visitante_fora` (o `mandante_id`/`visitante_id` fica vazio só do lado de fora); a trava `jogo_conferir_formato` garante título, um jogo, nenhum `api_id` (a sincronização nunca toca) e pelo menos um dos 20. `certeza_aberta` recusa o especial; `crava_totais(null)` (Palpiteiro do Brasileirão) deixa ele de fora; em `pontos_semana`, o especial soma quando `valendo_desde_rodada` é até 38. Criar, editar e apagar: `especial_criar`, `especial_editar` e `especial_apagar`, só da chave secreta, pela função `jogos-especiais` (confere `administradores`); confirmar, corrigir e anular: `confirmar-placar`. Na tela: `src/jogo/cravaTela.ts` (rodada em foco, título) e `statusJogos.ts`; no `#admin`, `src/telas/adminEspeciais.ts`. A temporada 2027 do Brasileirão entra depois sem mexer nisso.
