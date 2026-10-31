# Funil do desafio por link (diagnóstico de 31/10/2026)

Leitura só de consulta no banco e do fluxo em 390×844. Nada foi gravado.

## O que os números querem dizer

- **"49 desafios enviados" não é 49 envios.** O desafio nasce sozinho a cada partida de pênaltis fechada (`desafios.partida_id` é único). O banco não sabe se alguém tocou em "Chamar no X1", e muito menos se o link foi aberto. Os 49 são só "partidas que geraram link".
- **Quem gerou:** 7 pessoas. Duas geraram 34 dos 49 (20 e 14). As outras cinco geraram 15.
- **Quem aceitou:** as 4 partidas aceitas são **todas entre as mesmas duas pessoas**, as duas que mais jogam (os testadores). Uma aceitou 2 desafios da outra; a outra aceitou 2 da primeira. Nenhum desafio foi aceito por alguém de fora do grupo de teste.
- **Conclusão do dado:** a conversão de desafio vinda de fora é **0 de um número desconhecido de envios**. Com 7 jogadores, não dá para chamar isso de baixa conversão: ainda não existe amostra de gente de fora recebendo o link.
- **Onde há sinal real:** 37 torcedores abriram o jogo, 7 fecharam partida. Os 30 que nunca fecharam uma partida se cadastram assim: 1 no dia 19, 4 no dia 20, 3 no 21, **15 no dia 26** e 7 no dia 31. O dia 26 (15 de 16 novos nunca jogaram) é provavelmente um link ou uma divulgação que abriu o jogo e não segurou ninguém. Não dá para saber quantos vieram por `?d=`, porque o link não deixa rastro.

## O caminho de quem recebe o link (390×844)

1. Abre `/?d=código`: cai na home normal. O convite só aparecia depois da resposta do servidor; antes disso a tela era a home sem nada que explicasse o convite, com o botão dourado "Jogar agora" no topo (e todos os outros jogos embaixo). Quando o convite chegava, empurrava o resto para baixo.
2. O convite dizia "Kauê te chamou no X1: 55 pontos, 3 x 4 contra a máquina". Não dizia o que o recebedor faz (defende as cobranças do outro e bate as suas).
3. "Jogar agora" **ignorava o convite**: abria o Time do Dia ou os Lances. Quem tocou no botão grande, em vez do menor do convite, nunca jogou o X1.
4. Aceitar leva a: triagem de idade, depois escolha de time (20 cartões e apelido), depois a partida. São 3 telas antes de jogar, e a escolha de time não lembrava que o X1 esperava.

## O que foi corrigido neste PR

- O convite aparece na hora, com "Buscando o desafio…", e some se o código não existir. Sem salto de layout.
- O convite explica o que fazer: "Você defende as cobranças dele e bate as suas. Quem fizer mais pontos ganha."
- Com o convite carregado, "Jogar agora" aceita o X1 (a linha do botão passa a dizer "Aceitar o X1 que te mandaram").
- A escolha de time diz "É só escolher o time: o X1 que te mandaram começa em seguida."
- `npm run metricas` ganhou três seções: desafios por pessoa, aceites de quem já jogava x de quem chegou novo, e quem abriu o jogo e nunca fechou partida.

A triagem de idade continua intacta.

## Propostas para o Kauê (mudam fluxo ou regra)

1. **Contar de verdade o funil.** Duas colunas ou uma tabela de eventos mínimos: toque em "Chamar no X1" (link compartilhado) e abertura do `?d=` (sem identificar ninguém). Sem isso, nenhuma taxa é confiável. É a mudança que mais vale antes de divulgar.
2. **Tirar a triagem do meio do desafio?** Não pode sair, mas poderia vir depois do aceite com uma linha de contexto ("antes do X1: só uma pergunta"). Hoje ela é a tela mais seca do caminho. Decisão de texto e fluxo, do Kauê.
3. **Sugerir o time de quem desafiou.** O link do desafio não carrega o time (só o `?time=` carrega). Pré-selecionar o time do desafiante cortaria a escolha de 20 cartões, mas coloca um time no recebedor sem ele pedir. Decisão de produto.
4. **Esperar gente de fora para concluir.** Antes de mexer mais, vale mandar o link a 10 a 20 pessoas que nunca viram o jogo e repetir `npm run metricas`.
