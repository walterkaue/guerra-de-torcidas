# Próximos passos

> **Só a fila viva.** Regras: `docs/jogo.md` e `docs/jogos/`. Ideias sem decisão: `docs/backlog.md`. Histórico: `docs/decisoes.md` e os PRs.
> **Como manter:** ao fechar um item, **tire daqui** no mesmo PR. Se ele mudou uma regra, a regra vai para o doc do módulo e a data para `docs/decisoes.md`; se foi só trabalho, o PR já guarda a história. Este arquivo não passa de ~15 KB (um teste confere).
> Para começar uma tarefa, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos (08/11/2026)

| Área | Estado |
|---|---|
| Código | `main` com o PR #156 (limpeza dos Lances depois do corte + lote A4). 2.507 testes passando, `tsc` limpo. |
| Publicação | Site da `main` `b7790e5` no ar desde 08/11, 8h10 (GitHub Pages). 49 migrações, a última `20261107200000_lances_corte_domingo.sql` (local = remoto em 07/11). Funções: `lances` v8 (08/11), `nova-partida` v25, `lance-penalti` v11, `fechar-partida` v26, `boneco` v4 (07/11). |
| Regra em vigor | Lances unificados desde domingo 08/11, 0h: tela única, 10 partidas de Lances por dia, 3 melhores de Lances e 3 da Prova. A semana de 02/11 fecha com as duas regras somadas (aceito: pré-temporada). |
| Tamanho | `index-*.js` de ~46,6 kB gzip (06/11), limite ~300 KB. |
| Conteúdo | Casa com os 20 clubes e os 808 títulos revisados; 64 disputas históricas de pênaltis; ~280 perguntas no ar (meta do lançamento: 800). |
| Uso | Retrato de 04/11: 18 pessoas jogaram. Amostra pequena. O Kauê testa com amigos a partir de 08/11. |

**Cuidado:** não volte as funções `lances`, `nova-partida`, `lance-penalti` e `fechar-partida` para versões de antes de 08/11: já há partidas com a faixa gravada e a regra nova.

## Conferir (com data)

Nada disso tem lembrete automático.

1. **Domingo 08/11, 17h: robôs do Gemini.** Decidir se mantém os 5 crons de `gerar-conteudo` e de `auditar-conteudo` (o auditor falhou em 51% das chamadas de 02 a 06/11). Proposta e medida em `docs/propostas/robos-gemini-perguntas.md`, seção 8. Só leitura:
   ```sql
   select criada_em::date dia, funcao, sum(chamadas) chamadas, sum(falhas) falhas, sum(entrada) entrada, sum(saida) saida
   from staging_gt.uso_gemini group by 1, 2 order by 1, 2;
   select criada_em::date, funcao, codigos, count(*) from staging_gt.uso_gemini where codigos is not null group by 1,2,3 order by 1,2;
   select status, count(*) from staging_gt.rascunhos_perguntas where criada_em > '2026-11-03' group by 1;
   ```
2. **Segunda 09/11, 12h (a semana de 02/11 trava):**
   - a conferência só de leitura do PR #108 (bloco 8, com o corte em 08/11) e as consultas da Disputa livre na descrição do PR #116; cada consulta traz o esperado;
   - a semana de 02/11 aparece nos pontos da temporada;
   - no celular: o bloco das divisões na Home (1ª semana de novembro travada).
3. **Segunda 07/12, depois das 12h01:** novembro fechado e dezembro aberto com 10 times em cada série; no celular, a placa de fim de novembro e o card de fim de temporada. Só leitura:
   ```sql
   select mes, serie, count(*) from public.temporada_serie group by 1, 2 order by 1, 2;
   select * from public.classificacao_temporada where mes = '2026-11-01' order by posicao;
   ```
4. **Prova com três erros e fora:** jogar uma partida real errando de propósito (3º erro encerra e leva 75%).

## No celular (o Kauê, junto com os testes dos amigos)

- **Lances (tela única):** abrir uma ficha e apertar o voltar do Android (fecha a ficha, não sai da tela); jogar uma falta (3 tentativas) e uma disputa de pênaltis ("rumo ao bronze" no resultado); mandar o X1 de pênaltis para outra conta e aceitar (joga a mesma disputa); "Seus 3 melhores de hoje" e o Lance do Dia na Home; "Mandar esse lance" na ficha.
- **Resultado:** "3 gols · +21" nos pênaltis e a barra de baixo opaca; com a fonte do sistema grande, "Termos e privacidade" tocável no fim da Home.
- **Partida:** deitar o celular no meio da defesa dos pênaltis (a partida espera); no computador ou iPad, o campo maior com a mira certa.
- **Boneco em campo:** 60 fps, replay de golaço, o interruptor "Meu boneco em campo", X1 entre duas contas.
- **Acessibilidade (G3):** fonte do sistema no máximo em Ranking, Lances, Crava e Time do Dia (nada sai da tela); TalkBack numa linha do Ranking (posição, time e pontos antes do "abrir a Casa").
- **Cards:** Salvar imagem no Android e no iPhone; o Pôster no Stories e no Quadrado; o card do troféu pela ficha e pela placa da Galeria.
- **Primeiro acesso:** num aparelho limpo, a escolha do time como 1ª tela, o "Pular" do aquecimento indo à Home e um link de desafio entrando direto.
- **Aquecimento:** de ponta a ponta num aparelho limpo; o palpite da estação 5 em Palpites e os +20 XP; não testadas à mão: as dicas de morte súbita, cavadinha pega no meio, altura errada e 3 cobranças sem efeito.
- **Cidade:** escolher pelo convite do resultado e pelo Perfil; tocar duas vezes no lembrete da Home; a aba Cidades.
- **Troféus:** papel picado e vibração ao subir de medalha; a ⭐ continua depois de fechar o site.

## Só o Kauê faz

- **Supabase Pro** antes de divulgar (o Free pausa depois de 1 semana sem uso; hoje um agendamento evita).
- **Advogado:** pontos 4 (triagem autodeclarada × art. 9º do ECA Digital) e 5 (DPO × alto risco) dos Termos, a frase do código do torcedor, a da cidade, a do boneco em campo e a da contagem de uso (`docs/termos-x-jogo.md`). O parecer de 02/11 veio sem OAB.
- **Data do zerar da pré-temporada:** até 06/12, para estrear em dezembro; o balanço (`npm run balanco`) roda antes.
- **Perguntas:** importar as 2 de `dados/perguntas/lote-02.csv` e dizer se tema de guerra entra na lista de proibidos (`dados/perguntas/piloto-lote-02.md`).
- **`#admin`:** apagar o apelido já gravado que bate com a lista de jogadores famosos (1 em 06/11).
- **Funil do desafio:** decidir as propostas que sobraram de `docs/propostas/funil-do-desafio.md` (item C06 do backlog; o C01 já conta o funil).

## Em andamento

- **Perguntas até 800:** perguntas nascidas de páginas reais, pelo pipeline do Gemini com revisão (`docs/orquestracao.md`, seção 6).

## Próximo ciclo

A ordem está no `docs/backlog.md`, seção 2: o que falta para divulgar, o funil e o botão do X1, a central de avisos e o resultado em duas camadas, o replay do gol compartilhável, o card animado, o som novo e o desempenho da 1ª visita. Ela será refeita com o que os testes com amigos mostrarem.

## Antes de divulgar

- [x] CAPTCHA ligado
- [x] Limpeza de anônimos no ar
- [x] Ranking de minuto em minuto
- [ ] Plano do Supabase decidido
- [ ] Termos e jogo batendo, com revisão do advogado
- [ ] Prova calibrada (com as partidas de 20 s)
- [x] Funil do desafio medido (backlog C01; conta desde a publicação da função `funil`)
- [ ] Balanço rodado e pré-temporada zerada
