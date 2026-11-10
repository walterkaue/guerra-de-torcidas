# Aquecimento e tutoriais no gesto

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.

## Regra

### Aquecimento
- Ordem do primeiro acesso: escolher o time, triagem de idade (`docs/jogo.md`, proteção de menores), aquecimento. A estação 5 é palpite valendo, por isso a triagem vem antes.
- 5 estações de um toque (~1 min), com barrinha 1/5…5/5 e 'Pular' sempre visível. Em cada uma, a mão animada faz o gesto uma vez com a frase, e a pessoa repete:
  1. Pênalti: 'Arraste da bola pro gol.'
  2. Defesa: 'Olhe o pé de apoio, marcado em amarelo, e toque onde pular.'
  3. Falta com barreira: 'Passe por cima ou ao lado da barreira.'
  4. Prova: 1 pergunta fácil própria do aquecimento (fora do banco), 'Toque na resposta antes do tempo.' É regra do jogo, fato fechado, com fonte na Regra 3 da IFAB: "Quantos jogadores cada time põe em campo no começo de uma partida?" (11).
  5. Palpite da Rodada o próximo jogo do seu time, VALENDO de verdade, 'Use − e + e toque em Salvar palpite.' Sem jogo do time na rodada, a estação some.
- Só a estação 2 (Defesa) espera o 1º toque: a mão repete o gesto (a cada ~2,5 s) até a pessoa tocar, e só então o chute sai, sem prazo. Com movimento reduzido, a seta parada fica até o toque. A Prova tem relógio; o ✓ e a comemoração de toda estação ficam como estão (quem não toca na Prova passa do mesmo jeito).
- Toda estação comemora, acertando ou não: papel picado nas cores do time, vibração e um grito curto do narrador ('Quase! No jogo valendo você acerta'; na Prova, 'Quase! Na Prova de verdade você acerta.'). Respeita movimento reduzido (a mão vira seta parada) e o botão Vibração. Gritos em `docs/narrador.md`, seção 14.
- Fim: 'Aquecido! Agora vale ponto pro [time]', as 5 estações marcadas, o palpite feito, selo 'Aquecido' no Perfil e +20 XP de Carreira uma vez só (não mexe no ranking), botão 'Jogar agora' (abre os Lances do Jogo no filtro Pênaltis).
- Quem chega por link de desafio vai direto ao desafio; o aquecimento aparece depois, como aviso na central de avisos ('Conheça os outros jogos', botão 'Abrir'). Uma vez por aparelho; 'Rever aquecimento' no Perfil. Nada conta ponto, exceto o palpite do Palpite da Rodada. Roda no aparelho, como o treino.
- Métrica no `npm run metricas`: quantos completam, pulam e em qual estação param (só contagem).

### Tutoriais no gesto
- Não há quadros 'Como jogar' nem 'Como palpitar', nem listas de regras da Prova e do Time do Dia, nem 'Não exibir novamente'. No lugar, dicas curtas na faixa de instrução, na hora do erro, no máximo 2 vezes cada dica por aparelho e 1 por lance.
- O botão '?' de cada jogo guarda as regras completas e a tabela de pontos, no visual do Grafismo de TV. Nos pênaltis só abre na mira ou antes do apito; na Prova, só antes de começar.
- O "1º" de cada dica é o 1º daquele tipo na partida (ou na rodada, no Palpite da Rodada). A da morte súbita aparece sempre.
- O resultado da Prova mostra uma frase só do narrador: `prova_perfeita` no 8 de 8, `prova_fim` nos outros casos.

### Dicas (quando aparece → frase)
- **Pênaltis:** arraste que não vira chute → "Arraste pra cima, na direção do gol." · chute por cima por força demais → "Forte demais vai por cima. Arraste mais curto." · chute fraco que o goleiro pegou → "Fraquinho, o goleiro pega. Arraste mais longo." · 3 cobranças seguidas sem efeito → "Curve o fim do arraste pra bola fazer curva." · 1ª cobrança da 2ª partida → "Arraste curtinho e reto é cavadinha." · cavadinha pega por goleiro parado no meio → "Cavadinha não engana goleiro parado no meio." · tempo da defesa acabou sem toque → "Toque no gol antes do chute sair." · lado certo, altura errada → "Lado certo! Agora acerte a altura." · começo da morte súbita (sempre) → "Empatou! Morte súbita: um de cada." · 1º par ou ímpar → "Escolha par ou ímpar e um número."
- **Faltas e cara a cara:** bola na barreira → "Na barreira! Mire no canto ou suba a bola." · 2ª na barreira (outra partida) → "Força média faz a bola subir e cair." · goleiro pegou chute no meio → "Goleiro tava ali. Mire nos cantos." · 1º cara a cara, depois de A jogada → "Escolha o canto ou tente a cavadinha." · 1ª vez com goleiro saindo 3 m+ → "Goleiro saiu do gol: cavadinha encobre." · cavadinha pega por goleiro que não saiu → "Cavadinha só encobre goleiro que saiu." · 1º gol que não carimbou (mostra a zona do gol de verdade e pula o replay daquele lance) → "Acerte a área marcada e carimbe o lance: +8." · já jogou as 10 valendo → "Hoje as 10 valendo já foram. Treine à vontade." (também nos pênaltis).
- **Prova:** 1º Parar ou seguir, no quadro → "Parar leva tudo o que juntou. Seguir arrisca." · 1º erro → "Errou, mas a prova segue. Restam 2 vidas." · 1ª vez na última vida → "Última vida: errou, acaba e leva 75%." · 1ª difícil sem ajuda usada → "Travou? Use uma ajuda. O relógio não para." · 1º tempo esgotado → "Acabou o tempo: conta como erro." · Arquibancada com menos de 30 respostas → "Pouca gente respondeu: vale como Tira uma."
- **Time do Dia:** 1ª vez (linha de exemplo inventada se pintando; parada com movimento reduzido) → "Adivinhe o clube secreto em 6 chutes." (uma legenda fixa fica sob a grade: "Verde = igual · Amarelo = perto · ↑ ↓ = o secreto é maior ou menor") · depois do 1º chute → "Verde é igual. Amarelo é perto." · 1ª seta → "↑ o secreto é maior; ↓ é menor." · 1ª vez cores em amarelo → "Cores em amarelo: uma bate." · 3º chute errado sem nenhum verde → "Comece fechando o estado e a série." · busca sem resultado → "Só clubes das Séries A, B e C de 2026."
- **Palpite da Rodada:** 1º palpite salvo → "Dá pra mudar até a bola rolar." · 1ª rodada antes do 1º jogo (aponta a estrela e destaca o botão até a certeza ser escolhida) → "A estrela dobra os pontos de 1 jogo." · 1ª certeza travada → "A certeza travou: a rodada já começou." · 1ª vez com V/E/D → "Posição, pontos e os últimos 5 jogos." · 1º jogo com bola rolando → "Bola rolando: veja como a torcida palpitou." · 1ª rodada encerrada → "Rodada fechada! Mande o resultado no grupo." A faixa "Aqui é só resenha" continua fixa.

## Como está no código
- **Puro:** `src/jogo/aquecimento.ts` (estações, frases, pergunta, gritos, jogo do Palpite da Rodada, estado no aparelho) e `src/jogo/dicas.ts` (as 36 dicas, 2 por aparelho, 1 por lance, contadores que atravessam partidas). No aparelho, `gdt:prefs.aquecimento` e `gdt:prefs.dicas`.
- **Gatilhos das dicas:** `src/jogo/dicasGatilhos.ts`, com teste. Quando duas caem no mesmo lance vale a mais específica; se ela já esgotou no aparelho, entra a seguinte. As telas usam `src/telas/dicas.ts`.
- **Telas:** `src/telas/aquecimento.ts` (e `src/telas/aquecimento/` com uma cena por estação) e `src/telas/regras.ts` (folha do "?", com os números lidos do código).
- **Servidor** (migração `20261104100000_aquecimento.sql`): `aquecimento_registrar(desfecho, estacao)` recebe `completou`, `pulou` (estação onde tocou Pular) ou `parou` (fechou o app no meio; vai na abertura seguinte). Conta só o 1º desfecho de cada pessoa em `aquecimento_contagem`, que não guarda quem foi (`aquecimento_contados` guarda só que a conta já entrou, e some com ela). Ao completar, `carreira_bonus` ganha a linha `aquecimento` de 20 XP, uma por torcedor (índice único; a junção de contas fica com uma só). O "bônus recente" da Carreira continua só de dia e semana.
- **Desfecho sem rede:** fica em `pendente` no aparelho e a Home manda de novo em silêncio. Um `completou` guardado nunca é trocado por outro desfecho, para o XP não se perder.
- **Vibração:** toda estação vibra no padrão de gol (60-40-90 ms), acertando ou não. Como no resto do jogo, só no Android: o iPhone não tem vibração no navegador.
- **Riscos aceitos:** o +20 XP é de confiança: o servidor não refaz o aquecimento (roda no aparelho), e quem chamar a função sem jogar ganha os 20 uma vez por conta (XP de Carreira não entra no ranking). Na junção de contas (`jogos/contas.md`), o dono herda o bônus, mas não a marca de "já contado": se ele refizer o aquecimento, a métrica pode contar a mesma pessoa duas vezes. Só a métrica muda.
