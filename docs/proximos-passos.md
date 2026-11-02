# Próximos passos

> Retrato do projeto em 01/11/2026, para retomar em qualquer conversa. Regras e decisões continuam no `docs/jogo.md`; aqui só fica o que vem a seguir.
> Ao fechar um item, atualize este arquivo no mesmo PR. Para começar, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos

| Área | Estado em 01/11/2026 |
|---|---|
| Código | `main` limpa, sem PR aberto, testes e build passando |
| Publicação | Site no ar, as 28 migrações aplicadas (02/11), 11 funções publicadas |
| Rotinas | Sem falhas em 7 dias; `carreira-fechar` rodou com sucesso em 01/11 |
| Tamanho | 216 KB gzip somando todo o JS e CSS (limite do bundle inicial: ~300 KB) |
| Conteúdo | Casa com 20 clubes revisados, faltam 35 de 808 títulos; 280 perguntas no ar (meta do lançamento: 800) |
| Uso | 7 jogadores, 4 na semana, 87 partidas. Pênaltis trazem 82% dos pontos. Amostra pequena |

## Em andamento

Nenhuma sessão aberta. As conversas e branches sem pendência foram fechadas em 01/11/2026.

## Conferir primeiro

Nada disso tem lembrete automático.

**1. ~~Fechamento da semana~~:** conferido em 02/11/2026. A `fechar-semana-virada` rodou à 0h05 e a `fechar-semana-confirma` às 12h00: a semana de 26/10 tem 20 linhas, todas travadas. As de 12/10 e 19/10 também. A semana de 26/10 bate com a `ranking_semana` time a time (ativos, soma, média 30 e posição), nos 20 times. Só São Paulo (4 ativos, 1019) e Flamengo (1, 80) pontuaram.

**2. ~~Migração da temporada~~:** aplicada pelo Kauê em 02/11/2026, depois da trava, e conferida no banco. A `termos_x_jogo` (`20261102000100`) entrou antes, à mão, com `migration repair`. Novembro está aberto como pré-temporada, com 20 times na série única. `classificacao_temporada` responde com 20 times e 0 ponto, o esperado até a semana de 02/11 fechar. A rotina `fechar-temporada` (12h01 todo dia) e o RLS das duas tabelas estão ligados. Nenhuma migração pendente.

**3. Prova de Boleiro com três erros e fora:** no ar desde 01/11/2026, com as frases novas do narrador (PRs #69 e #71). Falta jogar uma partida real errando de propósito. O balanço conta a partir de 02/11: depois de 20 partidas novas, rode `npm run balanco` (ele já filtra a Prova pela data da regra nova; `-- --prova-antes` mostra a antiga). Se a mediana ficar abaixo de 45, a próxima alavanca é `ERROS_QUE_ENCERRAM = 4`.

**4. ~~Disputa histórica~~:** conferida em 02/11/2026.
- Às 12h44 o Kauê jogou no celular a disputa `selecao-2016-olimpiada`, pelo São Paulo. Ela fechou às 12h45 com `disputa_id`, 110 pontos e sem suspeita.
- A tentativa das 9h17, numa janela anônima pelo Bragantino, não gravou partida. A conta nasceu e passou pelo CAPTCHA, mas a `nova-partida` não recebeu nenhuma chamada nas 24 horas dos logs.
- Não deu para repetir: o CAPTCHA recusa o navegador do Claude (erro 600010).
- Se voltar a acontecer, a pista é a janela anônima. O site joga "sem valer pontos" quando o pedido falha antes de chegar ao servidor, e o motivo fica só no console do navegador.

**5. Fechamento do mês:** em 09/11, depois das 12h, a semana de 02/11 tem de aparecer nos pontos. Em 07/12, depois das 12h01, novembro tem de estar fechado e dezembro aberto com 10 times em cada série. Só leitura.

```sql
select mes, serie, count(*) from public.temporada_serie group by 1, 2 order by 1, 2;
select * from public.classificacao_temporada where mes = '2026-11-01' order by posicao;
```

## Pode começar já

1. ~~**Telas das divisões:**~~ feito em 02/11/2026: aba Temporada no Ranking (só leitura de `temporada`, `classificacao_temporada`, `temporada_serie` e `fechamento_semana`). Ficaram para depois: a linha na Home ("9º na Série A, 4 pontos da zona"), as frases do narrador no fechamento do mês e o card de fim de temporada. Conferir no celular em 09/11 depois das 12h (1ª semana de novembro com pontos) e em 07/12 (dezembro com A e B, novembro em "Mês passado").
2. ~~**Ranking incremental:**~~ feito em 02/11/2026 (migração `20261102100000_ranking_por_minuto`): fila + rotina `ranking-minuto`. Falta o Kauê aplicar a migração, publicar a `fechar-partida` e o site (PR #82).

## Feito em 31/10/2026

| Frente | Executor | Resultado esperado |
|---|---|---|
| ~~Funil do desafio por link~~ | Feito | Diagnóstico em `docs/propostas/funil-do-desafio.md`: os 4 aceites são entre os 2 testadores, nenhum de fora; "enviado" é só "gerou link". Correções pequenas no convite; falta contar compartilhamento e abertura do link |
| ~~Calibragem da Prova~~ | feita em 31/10 | Proposta em `docs/propostas/calibragem-prova.md`; o Kauê escolheu a opção B em 01/11 |

**Termos × jogo (feito em 31/10/2026):** a lista está em `docs/termos-x-jogo.md`, para o Kauê e o advogado. Além das divergências já vistas (cidades, Cloudflare, contas paradas, aviso de mudança, "só você lê os seus", o que fica ao apagar), achou: "ver meus dados" não existe, "zerar pontos de trapaceiro" e "apagar apelido" não têm ação no `#admin`, o aviso de saída não cobre o WhatsApp e o feedback leva tela e navegador sem o texto dizer. Cada item traz as saídas (mudar o jogo ou o texto). Falta o Kauê decidir; o texto só muda com ele.

**6. Reavaliar os robôs do Gemini (domingo 08/11/2026, 17h):** os 5 crons por dia de `gerar-conteudo` e de `auditar-conteudo` (decidido em 02/11, `docs/propostas/robos-gemini-perguntas.md`) já têm medida em `staging_gt.uso_gemini`. Olhar chamadas, tokens e erros 429/503 por dia e por função, quantos rascunhos nasceram, quantos passaram na auditoria e quantas das 9 fáceis já foram preenchidas. Decidir: manter 5, subir ou descer `paginas` e `quantidade`, ou ligar a cobrança do Google AI Studio. Consulta:

```sql
select criada_em::date dia, funcao, sum(chamadas) chamadas, sum(falhas) falhas, sum(entrada) entrada, sum(saida) saida
from staging_gt.uso_gemini group by 1, 2 order by 1, 2;
select status, count(*) from staging_gt.rascunhos_perguntas where criada_em > '2026-11-03' group by 1;
```

## Só o Kauê faz

**Robôs do Gemini: publicados em 02/11/2026** (funções `gerar-conteudo` e `auditar-conteudo`, tabela `uso_gemini` e os 5+5 crons; o PR dos robôs, #75, já entrou). A migração `20261102000000` foi aplicada à mão e registrada com `migration repair`, para não arrastar a da temporada. A `termos_x_jogo` do PR #74 tinha o mesmo número `20261102000000` e foi renumerada para `20261102000100` (PR #76). As duas e a da temporada estão no banco desde 02/11.

**Ligar o CAPTCHA (o código já está pronto), nesta ordem:**
1. ~~Criar o site na Cloudflare Turnstile para `torcida.kauewalter.com.br`, no modo invisível.~~ Feito.
2. ~~Passar a chave **pública** para `VITE_TURNSTILE_SITE_KEY` no `.env.production`, em um PR. Esperar a publicação.~~ Feito em 01/11/2026 (PR #68).
3. ~~Ligar o CAPTCHA no painel do Supabase com a chave **secreta**, que fica só no painel.~~ Conferido em 02/11/2026 pelos prints do Kauê:
   - Em Authentication → Attack Protection, "Enable Captcha protection" está ligado, com o Turnstile e o secret preenchido.
   - Em Logs → Auth, o `/signup` anônimo das 9h17min53s respondeu 200, e não houve nenhum 4xx ou 5xx em 24 horas. Ou seja, o token passou pela checagem.

**Decisões:**
- ~~**Fáceis de clube:**~~ decidido e aplicado em 02/11/2026: 27 rebaixadas para média, 18 médias subiram a fácil (CSV e banco, só `degrau`, partidas fechadas intactas). **Faltam 9 fáceis novas** para o pipeline do Gemini: athletico-pr 2, chapecoense 2, bahia 1, bragantino 1, coritiba 1, remo 1, vasco 1 (com fonte e revisão no `#admin`). Até lá esses clubes têm 1 ou 2 fáceis e sobra de média; quando cada fácil nova for aprovada no `#admin`, aposentar a média que sobra desse clube (a de menor acerto ou a mais parecida com outra), para manter 3 fáceis, 3 médias, 2 difíceis e 2 de craque (decidido em 02/11/2026). O id guarda o degrau de nascimento (o validador só exige o clube no começo).
- **Data do zerar da pré-temporada:** até 06/12 para estrear em dezembro. A Crava termina em 2/12, e o balanço roda antes de zerar.
- ~~**Torcida sem ninguém nas 52 semanas:**~~ decidido em 02/11/2026: vale 0 ponto também lá. Implementar na tela das 52 semanas.
- Prazo para apagar contas anônimas paradas.
- Itens de `docs/termos-x-jogo.md` (mudar o jogo ou o texto, um por um).
- Supabase Pro antes de divulgar.
- Texto final dos Termos, com o advogado.
- Importar as 2 perguntas de `dados/perguntas/lote-02.csv` e dizer se tema de guerra entra na lista de proibidos (`dados/perguntas/piloto-lote-02.md`).
- Propostas de `docs/propostas/funil-do-desafio.md`.

## Depois

1. **Cidade, Galeria e 52 semanas:** nessa ordem, depois das telas das divisões.
2. **Perguntas:** o piloto recomendou parar nas 529 sem fonte do staging. A meta de 800 precisa de perguntas nascidas de páginas reais. A importação continua com o Kauê.
3. **Limpeza de anônimos:** depois do prazo decidido. Tem de guardar os pontos da semana aberta em `pontos_apagados`.

## Antes de divulgar

- [x] CAPTCHA ligado (conferido em 02/11/2026)
- [ ] Limpeza de anônimos no ar
- [x] Ranking de minuto em minuto (falta aplicar no banco)
- [ ] Plano do Supabase decidido
- [ ] Termos e jogo batendo, com revisão do advogado
- [ ] Prova calibrada
- [x] Funil do desafio entendido (mas falta medir envio e abertura do link; ver a proposta)
- [ ] Balanço rodado e pré-temporada zerada
