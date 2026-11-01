# Próximos passos

> Retrato do projeto em 01/11/2026, para retomar em qualquer conversa. Regras e decisões continuam no `docs/jogo.md`; aqui só fica o que vem a seguir.
> Ao fechar um item, atualize este arquivo no mesmo PR. Para começar, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos

| Área | Estado em 31/10/2026 |
|---|---|
| Código | `main` limpa, sem PR ou issue abertos, testes e build passando |
| Publicação | Site no ar, 24 migrações sincronizadas, 11 funções publicadas |
| Rotinas | Sem falhas em 7 dias; `carreira-fechar` rodou com sucesso em 01/11 |
| Tamanho | 216 KB gzip somando todo o JS e CSS (limite do bundle inicial: ~300 KB) |
| Conteúdo | Casa com 20 clubes revisados, faltam 35 de 808 títulos; 280 perguntas no ar (meta do lançamento: 800) |
| Uso | 7 jogadores, 4 na semana, 87 partidas. Pênaltis trazem 82% dos pontos. Amostra pequena |

## Em andamento

**Servidor das divisões:** em PR, com a migração `20261101000000_temporada.sql` ainda sem `db push`. Tem de entrar antes de 07/12, quando novembro fecha; quanto antes entrar, antes a `classificacao_temporada` fica disponível para as telas. As semanas travadas antes do push contam do mesmo jeito.

## Conferir primeiro

**Prova de Boleiro com três erros e fora (decidido em 01/11/2026, PR da calibragem):** a função `prova` e o site saem juntos na virada de 02/11 (`npm run deploy:funcoes`, depois o merge). Sem migração. Depois de 20 partidas novas, rode `npm run balanco` (ele já filtra a Prova pela data da regra nova; `-- --prova-antes` mostra a antiga). Se a mediana ficar abaixo de 45, a próxima alavanca é `ERROS_QUE_ENCERRAM = 4`. Pendente: rever as fáceis de clube (`docs/propostas/faceis-de-clube-prova.md`, sugestão sem aplicar).

**Fechamento da semana:** a migração `20261031300000_fechamento_semana.sql` foi aplicada em 01/11/2026. Em 02/11, depois das 12h, confira as rotinas `fechar-semana-virada` e `fechar-semana-confirma` e se a semana passada tem 20 linhas travadas. A consulta é só leitura.

```sql
select semana, count(*), count(confirmada_em) as travadas from public.fechamento_semana group by 1 order by 1 desc;
```

**Fechamento do mês:** em 09/11, depois das 12h, a semana de 02/11 tem de aparecer nos pontos. Em 07/12, depois das 12h01, novembro tem de estar fechado e dezembro aberto com 10 times em cada série. Só leitura.

```sql
select mes, serie, count(*) from public.temporada_serie group by 1, 2 order by 1, 2;
select * from public.classificacao_temporada where mes = '2026-11-01' order by posicao;
```

## Pode começar já

1. **Ranking incremental:** `fechamento_semana` copia `ranking_semana`, e as duas tabelas têm de continuar batendo.

## Feito em 31/10/2026

| Frente | Executor | Resultado esperado |
|---|---|---|
| ~~Funil do desafio por link~~ | Feito | Diagnóstico em `docs/propostas/funil-do-desafio.md`: os 4 aceites são entre os 2 testadores, nenhum de fora; "enviado" é só "gerou link". Correções pequenas no convite; falta contar compartilhamento e abertura do link |
| ~~Calibragem da Prova~~ | feita em 31/10 | Proposta com três opções em `docs/propostas/calibragem-prova.md`; falta o Kauê decidir (abaixo) |

**Termos × jogo (feito em 31/10/2026):** a lista está em `docs/termos-x-jogo.md`, para o Kauê e o advogado. Além das divergências já vistas (cidades, Cloudflare, contas paradas, aviso de mudança, "só você lê os seus", o que fica ao apagar), achou: "ver meus dados" não existe, "zerar pontos de trapaceiro" e "apagar apelido" não têm ação no `#admin`, o aviso de saída não cobre o WhatsApp e o feedback leva tela e navegador sem o texto dizer. Cada item traz as saídas (mudar o jogo ou o texto). Falta o Kauê decidir; o texto só muda com ele.

## Só o Kauê faz

**Ligar o CAPTCHA (o código já está pronto), nesta ordem:**
1. ~~Criar o site na Cloudflare Turnstile para `torcida.kauewalter.com.br`, no modo invisível.~~ Feito.
2. ~~Passar a chave **pública** para `VITE_TURNSTILE_SITE_KEY` no `.env.production`, em um PR. Esperar a publicação.~~ Feito em 01/11/2026 (passo 2 de 3); falta só a publicação no ar.
3. **Falta:** ligar o CAPTCHA no painel do Supabase com a chave **secreta**, que fica só no painel.

**Decisões:**
- **Calibragem da Prova** (mediana de 4 contra alvo de 45 a 75; 31 de 33 partidas acabam em erro): escolher entre A (segunda chance), B (três erros e fora, **recomendada**) e C (prova inteira), e dizer se o alvo de 45 a 75 vale para a Prova. A causa é a regra do primeiro erro, não a tabela. Detalhes e contas em `docs/propostas/calibragem-prova.md` (`npm run calibragem-prova`). Depois da escolha: implementar na virada da semana e rodar o balanço com 20 partidas novas; rever em paralelo as perguntas fáceis de clube (43% de acerto).
- **Torcida sem ninguém na temporada:** semana com `ativos` 0 vale 0 ponto de campeonato, mesmo com posição. Foi decisão da sessão do servidor, para ninguém ser campeão sem jogar (`docs/jogo.md`, seção 5). Vetar é mudar uma linha da view, e dá para mudar até novembro fechar. Se a regra vale também para as 52 semanas fica para decidir antes da tela delas.
- Prazo para apagar contas anônimas paradas.
- Itens de `docs/termos-x-jogo.md` (mudar o jogo ou o texto, um por um).
- Supabase Pro antes de divulgar.
- Data do zerar da pré-temporada. A Crava termina em 2/12, e o balanço roda antes de zerar.
- Texto final dos Termos, com o advogado.
- Importar as 2 perguntas de `dados/perguntas/lote-02.csv` e dizer se tema de guerra entra na lista de proibidos (`dados/perguntas/piloto-lote-02.md`).
- Propostas de `docs/propostas/funil-do-desafio.md`.

## Depois

1. **Telas das divisões, cidade, Galeria e 52 semanas:** nessa ordem, depois do servidor das divisões. As telas leem `temporada_serie` e `classificacao_temporada`.
2. **Perguntas:** o piloto recomendou parar nas 529 sem fonte do staging. A meta de 800 precisa de perguntas nascidas de páginas reais. A importação continua com o Kauê.
3. **Limpeza de anônimos:** depois do prazo decidido. Tem de guardar os pontos da semana aberta em `pontos_apagados`.

## Antes de divulgar

- [ ] CAPTCHA ligado
- [ ] Limpeza de anônimos no ar
- [ ] Ranking incremental
- [ ] Plano do Supabase decidido
- [ ] Termos e jogo batendo, com revisão do advogado
- [ ] Prova calibrada
- [x] Funil do desafio entendido (mas falta medir envio e abertura do link; ver a proposta)
- [ ] Balanço rodado e pré-temporada zerada
