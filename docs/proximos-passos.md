# Próximos passos

> Retrato do projeto em 01/11/2026, para retomar em qualquer conversa. Regras e decisões continuam no `docs/jogo.md`; aqui só fica o que vem a seguir.
> Ao fechar um item, atualize este arquivo no mesmo PR. Para começar, siga a divisão de trabalho do `CLAUDE.md`.

## Onde estamos

| Área | Estado em 01/11/2026 |
|---|---|
| Código | `main` limpa, sem PR aberto, testes e build passando |
| Publicação | Site no ar, 25 migrações aplicadas (falta a da temporada), 11 funções publicadas |
| Rotinas | Sem falhas em 7 dias; `carreira-fechar` rodou com sucesso em 01/11 |
| Tamanho | 216 KB gzip somando todo o JS e CSS (limite do bundle inicial: ~300 KB) |
| Conteúdo | Casa com 20 clubes revisados, faltam 35 de 808 títulos; 280 perguntas no ar (meta do lançamento: 800) |
| Uso | 7 jogadores, 4 na semana, 87 partidas. Pênaltis trazem 82% dos pontos. Amostra pequena |

## Em andamento

Nenhuma sessão aberta. As conversas e branches sem pendência foram fechadas em 01/11/2026.

## Conferir primeiro

Nada disso tem lembrete automático: para retomar, abra uma conversa depois de 02/11 às 12h e peça "confira o fechamento da semana e retome as divisões".

**1. Fechamento da semana:** em 02/11, depois das 12h, confira as rotinas `fechar-semana-virada` e `fechar-semana-confirma` e se a semana passada tem 20 linhas travadas. A consulta é só leitura.

```sql
select semana, count(*), count(confirmada_em) as travadas from public.fechamento_semana group by 1 order by 1 desc;
```

**2. Migração da temporada:** com o fechamento certo, o Kauê roda na pasta principal, com a `main` atualizada, o comando abaixo. A simulação mostrou só `20261101000000_temporada.sql`. Depois, conferir no banco. Até lá nada muda no site, as semanas travadas contam do mesmo jeito e o `zerar-pre-temporada` falha sem apagar nada. Tem de entrar antes de 07/12, quando novembro fecha.

```bash
npx.cmd supabase db push --linked --yes
```

**3. Prova de Boleiro com três erros e fora:** no ar desde 01/11/2026, com as frases novas do narrador (PRs #69 e #71). Falta jogar uma partida real errando de propósito. O balanço conta a partir de 02/11: depois de 20 partidas novas, rode `npm run balanco` (ele já filtra a Prova pela data da regra nova; `-- --prova-antes` mostra a antiga). Se a mediana ficar abaixo de 45, a próxima alavanca é `ERROS_QUE_ENCERRAM = 4`.

**4. Fechamento do mês:** em 09/11, depois das 12h, a semana de 02/11 tem de aparecer nos pontos. Em 07/12, depois das 12h01, novembro tem de estar fechado e dezembro aberto com 10 times em cada série. Só leitura.

```sql
select mes, serie, count(*) from public.temporada_serie group by 1, 2 order by 1, 2;
select * from public.classificacao_temporada where mes = '2026-11-01' order by posicao;
```

## Pode começar já

1. **Telas das divisões:** em sessão própria, depois da migração da temporada. As telas leem `temporada_serie` e `classificacao_temporada`.
2. **Ranking incremental:** `fechamento_semana` copia `ranking_semana`, e as duas tabelas têm de continuar batendo.

## Feito em 31/10/2026

| Frente | Executor | Resultado esperado |
|---|---|---|
| ~~Funil do desafio por link~~ | Feito | Diagnóstico em `docs/propostas/funil-do-desafio.md`: os 4 aceites são entre os 2 testadores, nenhum de fora; "enviado" é só "gerou link". Correções pequenas no convite; falta contar compartilhamento e abertura do link |
| ~~Calibragem da Prova~~ | feita em 31/10 | Proposta em `docs/propostas/calibragem-prova.md`; o Kauê escolheu a opção B em 01/11 |

**Termos × jogo (feito em 31/10/2026):** a lista está em `docs/termos-x-jogo.md`, para o Kauê e o advogado. Além das divergências já vistas (cidades, Cloudflare, contas paradas, aviso de mudança, "só você lê os seus", o que fica ao apagar), achou: "ver meus dados" não existe, "zerar pontos de trapaceiro" e "apagar apelido" não têm ação no `#admin`, o aviso de saída não cobre o WhatsApp e o feedback leva tela e navegador sem o texto dizer. Cada item traz as saídas (mudar o jogo ou o texto). Falta o Kauê decidir; o texto só muda com ele.

## Só o Kauê faz

**Ligar o CAPTCHA (o código já está pronto), nesta ordem:**
1. ~~Criar o site na Cloudflare Turnstile para `torcida.kauewalter.com.br`, no modo invisível.~~ Feito.
2. ~~Passar a chave **pública** para `VITE_TURNSTILE_SITE_KEY` no `.env.production`, em um PR. Esperar a publicação.~~ Feito em 01/11/2026 (PR #68).
3. **Falta confirmar:** ligar o CAPTCHA no painel do Supabase com a chave **secreta**, que fica só no painel.

**Decisões:**
- **Fáceis de clube:** passar ou não 27 das 60 para média (`docs/propostas/faceis-de-clube-prova.md`, sugestão sem aplicar, mantendo a cota por clube).
- **Data do zerar da pré-temporada:** até 06/12 para estrear em dezembro. A Crava termina em 2/12, e o balanço roda antes de zerar.
- **Torcida sem ninguém nas 52 semanas:** na temporada já vale 0 ponto (decidido em 01/11). Decidir antes da tela das 52 semanas se a regra vale lá também.
- Prazo para apagar contas anônimas paradas.
- Itens de `docs/termos-x-jogo.md` (mudar o jogo ou o texto, um por um).
- Supabase Pro antes de divulgar.
- Texto final dos Termos, com o advogado.
- Importar as 2 perguntas de `dados/perguntas/lote-02.csv` e dizer se tema de guerra entra na lista de proibidos (`dados/perguntas/piloto-lote-02.md`).
- Propostas de `docs/propostas/funil-do-desafio.md`.
- **Três branches guardadas:** têm conteúdo que não está na `main`. Olhar antes de apagar: `claude/wizardly-noether-zic2d2` (rascunho do lote 3 dos Lances, sem PR), `gemini/casa-lote-02` (conferência da Casa do Cruzeiro, sem PR) e `claude/intelligent-euler-p44s4r` (último ajuste do importador da conferência da Casa, depois do PR #7).

## Depois

1. **Cidade, Galeria e 52 semanas:** nessa ordem, depois das telas das divisões.
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
