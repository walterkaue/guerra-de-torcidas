# Próximos passos

> **Só a fila viva.** Regras: `docs/jogo.md` e `docs/jogos/`. Ideias sem decisão: `docs/backlog.md`. Histórico: `docs/decisoes.md` e os PRs.
> **Como manter:** ao fechar um item, **tire daqui** no mesmo PR. Se ele mudou uma regra, a regra vai para o doc do módulo e a data para `docs/decisoes.md`; se foi só trabalho, o PR já guarda a história. Este arquivo não passa de ~15 KB (um teste confere).
> Para começar uma tarefa, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos (09/11/2026)

| Área | Estado |
|---|---|
| Código | `main` com o PR #172: resultado em duas camadas (B02, C02, B05), prazo de 7 dias dos desafios (C10), funil do desafio (C01) que volta o lote à fila quando falta rede; depois dele, o E01 (link do desafio mais leve na 1ª visita). 2.678 testes passando, `tsc` limpo. |
| Publicação | Site da `main` `6828130` (PR #172) no ar desde 09/11, 15h (GitHub Pages). 52 migrações, a última `20261109100000_boneco_barra.sql`, e as 15 funções iguais à `main` (`npm run publicar:conferir`, 09/11). |
| Regra em vigor | Lances unificados desde domingo 08/11, 0h: tela única, 10 partidas de Lances por dia, 3 melhores de Lances e 3 da Prova. A semana de 02/11 fecha com as duas regras somadas (aceito: pré-temporada). |
| Tamanho | `index-*.js` de ~47 kB gzip (09/11), limite ~300 KB. No Zé (`npm run simular:entradas`), o link do desafio chega ao convite em 3,2 a 3,4 s com 68 a 83 kB de JS (eram 7,6 s e 285 kB); Home e escolha do time em 2,4 a 2,9 s. |
| Conteúdo | Casa com os 20 clubes e os 808 títulos revisados; 64 disputas históricas de pênaltis; 328 perguntas no ar (meta do lançamento: 800). |
| Uso | Retrato de 04/11: 18 pessoas jogaram. Desde 08/11, 0h: 16 partidas, 0 X1 aceitos. Amostra pequena. O Kauê testa com amigos a partir de 08/11. |

**Cuidado:** não volte as funções `lances`, `nova-partida`, `lance-penalti` e `fechar-partida` para versões de antes de 08/11: já há partidas com a faixa gravada e a regra nova.

## Conferir (com data)

Nada disso tem lembrete automático.

1. **Segunda 09/11 (conferido à tarde, só leitura; nada a corrigir):** a semana de 02/11 travou às 12h e entrou na temporada (torcida sem ninguém jogando com 0 pontos); os Lances unificados batem com a regra (ninguém acima de 10 partidas por dia, teto de 3 + 3, faixa gravada, pênaltis sempre com disputa, sem `penaltis:livre`); `ranking_52_semanas()` bate com as 4 semanas travadas. Falta só o celular: o bloco das divisões na Home (1 de 5 semanas, série única).
   - **Sem prova de uso real:** nenhum X1 foi aceito desde 08/11 (pênaltis, Lances ou Prova), então "X1 criado antes do corte aceito depois" (tem de ser 0) e o X1 entre duas contas seguem por testar no celular.
   - **Cidades:** nenhuma cidade nem estado chegou a 5 pessoas na semana de 02/11; os rankings ficam vazios de propósito.
2. **Segunda 07/12, depois das 12h01:** novembro fechado e dezembro aberto com 10 times em cada série; no celular, a placa de fim de novembro e o card de fim de temporada. Só leitura:
   ```sql
   select mes, serie, count(*) from public.temporada_serie group by 1, 2 order by 1, 2;
   select * from public.classificacao_temporada where mes = '2026-11-01' order by posicao;
   ```
3. **Prova com três erros e fora:** jogar uma partida real errando de propósito (3º erro encerra e leva 75%).

## No celular (o Kauê, junto com os testes dos amigos)

- **Lances (tela única):** abrir uma ficha e apertar o voltar do Android (fecha a ficha, não sai da tela); jogar uma falta (3 tentativas) e uma disputa de pênaltis ("rumo ao bronze" no resultado); mandar o desafio de pênaltis para outra conta e aceitar (joga a mesma disputa); "Seus 3 melhores de hoje" e o Lance do Dia na Home; "Mandar esse lance" na ficha.
- **Resultado:** "3 gols · +21" nos pênaltis e a barra de baixo opaca; com a fonte do sistema grande, "Termos e privacidade" tocável no fim da Home.
- **Partida:** deitar o celular no meio da defesa dos pênaltis (a partida espera); no computador ou iPad, o campo maior com a mira certa.
- **Boneco em campo:** 60 fps, replay de golaço, o interruptor "Meu boneco em campo", desafio entre duas contas.
- **Acessibilidade (G3):** fonte do sistema no máximo na Tabela, Lances, Palpite da Rodada e Time do Dia (nada sai da tela); TalkBack numa linha da Tabela (posição, time e pontos antes do "abrir a Casa").
- **Cards:** Salvar imagem no Android e no iPhone; o Pôster no Stories e no Quadrado; o card do troféu pela ficha e pela placa da Galeria.
- **Link do desafio no 4G fraco (E01):** num aparelho limpo, abrir um link de cada tipo (pênaltis, Lances e Prova) pelo WhatsApp: o convite aparece antes do placar e dos palpites, e o "abriu" conta no `npm run metricas`.
- **Home nova (HOME2):** em 360×740 com a fonte grande, o "Jogar agora" e o 1º card sem rolar; a barra do time no pé da arquibancada (a posição certa e o toque abrindo a aba certa da Tabela), sem encostar na tarja do time nem no "trocar"; em modo avião, o aviso na barra sem nada pular; um aviso só logo abaixo do "Jogar agora".
- **Primeiro acesso:** num aparelho limpo, a escolha do time como 1ª tela, o "Pular" do aquecimento indo à Home e um link de desafio entrando direto.
- **Aquecimento:** de ponta a ponta num aparelho limpo; o palpite da estação 5 em Palpites e os +20 XP; não testadas à mão: as dicas de morte súbita, cavadinha pega no meio, altura errada e 3 cobranças sem efeito.
- **Cidade:** escolher pelo convite do resultado e pelo Perfil; tocar duas vezes no lembrete da central de avisos; a aba Cidades.
- **Troféus:** papel picado e vibração ao subir de medalha; a ⭐ continua depois de fechar o site.

## Só o Kauê faz

- **Supabase Pro** quando o banco passar de 250 MB, ou ~150 pessoas jogarem por dia, ou antes da divulgação pública (o que vier primeiro); os testes com amigos seguem no Free. O Free pausa depois de 1 semana sem uso; hoje um agendamento evita.
- **Robôs do Gemini:** ficam os 5 crons, sem cobrança (decidido em 07/11). Ajuste de cron só se os 429 crescerem: de 06 a 09/11 a auditoria teve 33 erros 429 e 5 erros 503 (a geração, 3 erros 503); as falhas por dia caíram de 28 (06/11) para 1 (09/11).
- **Advogado:** pontos 4 (triagem autodeclarada × art. 9º do ECA Digital) e 5 (DPO × alto risco) dos Termos, a frase do código do torcedor, a da cidade, a do boneco em campo e a da contagem de uso (`docs/termos-x-jogo.md`). O parecer de 02/11 veio sem OAB.
- **Data do zerar da pré-temporada:** até 06/12, para estrear em dezembro; o balanço (`npm run balanco`) roda antes.
- **Perguntas:** importar as 2 de `dados/perguntas/lote-02.csv` e dizer se tema de guerra entra na lista de proibidos (`dados/perguntas/piloto-lote-02.md`).
- **`#admin`:** apagar o apelido já gravado que bate com a lista de jogadores famosos (1 em 06/11).
- **Funil do desafio:** decidir as propostas que sobraram de `docs/propostas/funil-do-desafio.md` (o C01 conta o funil e o C06 já encurtou o caminho).
- **Link do desafio com menos toques (C06):** num aparelho limpo, abrir um link de cada tipo pelo WhatsApp: o convite com as duas faixas aparece, um toque no time leva à triagem e ao jogo; conferir também o link vencido, o de quem chamou com "Outro time" e quem já joga.

## Em andamento

- **Perguntas até 800:** perguntas nascidas de páginas reais, pelo pipeline do Gemini com revisão (`docs/orquestracao.md`, seção 6).

## Próximo ciclo

A ordem está no `docs/backlog.md`, seção 2: o que falta para divulgar, o link do desafio com menos toques, o replay do gol compartilhável, o card animado e o som novo. Ela será refeita com o que os testes com amigos mostrarem.

## Antes de divulgar

- [x] CAPTCHA ligado
- [x] Limpeza de anônimos no ar
- [x] Ranking de minuto em minuto
- [ ] Plano do Supabase decidido
- [ ] Termos e jogo batendo, com revisão do advogado
- [ ] Prova calibrada (com as partidas de 20 s)
- [x] Funil do desafio medido (backlog C01; conta desde a publicação da função `funil`)
- [ ] Balanço rodado e pré-temporada zerada
