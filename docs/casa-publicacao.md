# Casa do [time]: plano de publicação

> Plano de 21/10/2026, depois de os dados em rascunho (`dados/casa/`) entrarem no `main`. Desenho e regras: `docs/casa.md`. Este arquivo só diz **em que ordem** publicar, **quem faz** o quê e **quando a Casa pode ir ao ar**.

## 1. Onde estamos

| Peça | Estado |
|---|---|
| Desenho e regras (`docs/casa.md`, `jogo.md` 7.4) | Pronto |
| Dados: 6 CSVs, 20 clubes (`dados/casa/`) | **Rascunho completo**, com buracos e dúvidas em `dados/casa/RELATORIO.md` |
| Conferência dos dados (segunda sessão) | **Não começou** |
| Importador, validador e competições (`scripts/casa/`, `src/dados/competicoes.ts`) | Não existe |
| Tela, índice e desenhos (`src/telas/casa.ts`) | Não existe |
| Ganchos (Home, Ranking, Time do Dia) | Não existe |

O upgrade dos pênaltis que travava a Casa fechou (Lances do Jogo no `main`), então **nada impede de começar**.

## 2. Regra de ouro da publicação

**Só vai ao ar linha `revisada`.** O importador ignora `rascunho`. A tela nunca quebra por falta de dado: bloco sem linha revisada **some** (ex.: Vitória sem recordes mostra Estádio, Troféus e Cores, e não o Livro de Recordes). Isso deixa publicar clube a clube sem esperar os 20.

## 3. Etapas, em ordem

### Etapa A. Decisões do Kauê (fechadas em 21/10/2026)
1. **Estaduais sem federação aberta:** vale Lance/Trivela/Goal, com "conferir" na observação. O Kauê checa as listas nos sites das federações, no navegador.
2. **Jogos e gols:** valem os números que o clube divulga, mesmo com amistosos. O rodapé do Livro de Recordes traz o rótulo **"contagem do clube"**.
3. **Títulos reivindicados** (Flamengo 1987, Palmeiras Copa Rio 1951): **na Casa do clube, vale o lado da torcida.** O título aparece na prateleira normal e conta no total daquele clube, com a nota neutra ("a CBF reconhece o Sport", "a FIFA não lista entre os campeões mundiais"). Em outras telas (Time do Dia, Brasileiros do `clubes-do-dia.csv`) continua valendo a lista oficial da entidade. No dado, a coluna `oficial = não` segue registrando o fato; a tela é que decide mostrar.
4. **Competições sem id** (Copa Master da Conmebol, Recopa de 1968/69 do Santos, Copa dos Campeões, Mercosul, Rio-São Paulo): ficam de fora por enquanto e entram depois, com id próprio.
5. **Erros das fontes oficiais** (Paranaense 2000 na FPF; Paraense 2000 na página do Remo): vale o fato, como no rascunho. O Kauê confere nas federações.
6. **Mais domínios aceitos** em `DOMINIOS_ACEITOS` (`bemparana.com.br`, `umdoisesportes.com.br`, `band.com.br`): sim, se abrirem.
7. **Canal de erro:** botão "Achou um erro? Conta pra gente" com link de e-mail para **contato@kauewalter.com.br**, sem pedir dado pessoal.

### Etapa B. Conferência dos dados (sessão nova, sem o contexto da escrita)
- **Quem:** sessões de Claude Code, uma por **lote de 5 clubes** (ordem alfabética do id, os mesmos lotes da escrita). Prompt pronto em `dados/casa/conferencia.md`.
- **O que faz:** abre cada fonte, confere o fato, corrige ou apaga, marca `revisada` com data. Resolve ou escala cada "conferir" da observação. Nas lacunas, tenta achar fonte; se não achar, deixa vazio.
- **Cuidado:** os CSVs são por tipo e têm todos os clubes. Duas sessões em paralelo mexem nos mesmos arquivos; as linhas são ordenadas por clube, então o merge costuma ser limpo, mas **faça um lote por vez** ou junte as branches com merge conferido.
- **Pronto quando:** os 5 clubes do lote têm todas as linhas `revisada` (ou apagadas com motivo), `npm test` passa e a tabela de mudanças vem no resumo.
- **Ordem sugerida:** começar pelos clubes mais completos e de maior audiência, para a Casa nascer com o melhor conteúdo (Flamengo, Corinthians, Palmeiras, São Paulo, Santos), e deixar os clubes com mais buracos (Bragantino, Chapecoense, Mirassol, Vitória, Remo) por último, com a pesquisa de lacunas.

### Etapa C. Importador, validador e competições (feita em 22/10/2026)
Pode rodar **em paralelo** com a Etapa B, porque só lê os CSVs.
- `src/dados/competicoes.ts` com os ids e nomes da seção 6 do `docs/casa.md`.
- `scripts/casa/validar.mjs` + teste: colunas, ids de clube e de competição, datas e números, domínios aceitos, posições 1 a 3 em ordem decrescente, ano repetido na mesma competição, cruzamento com `dados/clubes-do-dia.csv` (Brasileiros e fundação), palavras e marcas proibidas, limites de caracteres.
- `scripts/importar-casa.mjs` → `npm run importar-casa` gera `src/dados/casa/dados.gerado.ts` só com `revisada` e `ativa`, no mesmo molde de `npm run catalogo-lances`. Teste que avisa se esquecer de rodar.
- `src/dados/casa/tipos.ts`.
- **Pronto quando:** `npm test` passa com o `dados.gerado.ts` vazio e também com um clube de teste revisado.

### Etapa D. Tela, índice e desenhos (sessão de código)
- Rota `#casa` (índice) e `#casa/<id>` em `src/app.ts`; tela em `src/telas/casa.ts`; CSS em `src/estilos/casa.css`; **import dinâmico**, fora do bundle inicial (meta: ~20 KB gzip a mais, carregados só quando abre).
- Blocos A a D e rodapé, como em `docs/casa.md` seção 4; SVGs gerados em código: silhueta do estádio por formato, taça genérica ouro/prata/bronze, manto por padrão (`lisa`, `listras-v`, `aros`, `faixa-diagonal`, `faixa-peito`).
- Tolerância a buracos (seção 2 deste plano) e título reivindicado na prateleira normal e no total do próprio clube, com a nota neutra (decisão 3).
- Rodapé: "Dados até DD/MM/AAAA", lista de fontes, nota de independência e o botão de erro (link `mailto:` para contato@kauewalter.com.br, decisão 7).
- **Testes:** unitário do que for lógica (ordem dos troféus, agrupamento, data de referência) e conferência visual em **390×844** por captura de tela, sem rolagem horizontal, nos clubes extremos: um completo (Flamengo), um com buracos (Vitória) e um com título reivindicado (Palmeiras).
- **Pronto quando:** `npm test` e `npm run build` passam e as capturas dos três clubes foram vistas.

### Etapa E. Ganchos de navegação
Arquivos de contato: `inicio.ts` (bloco do time), `ranking.ts` (torcida), `timeDoDia.ts` (só depois que o dia termina). **Coordenar com a sessão que estiver mexendo nesses arquivos** (hoje, os Lances). Prova de Boleiro fica para depois.
- Nenhum ponto, XP ou selo por visitar (pilar 7).
- **Pronto quando:** cada gancho abre a Casa certa e o Time do Dia não dá pista antes de terminar.

### Etapa F. Publicação
1. **Soft launch:** Casa no ar só pelo bloco do time na Home e pelo Ranking, sem anúncio, com os clubes já revisados. Clube sem revisão fica fora do índice (ou com "em breve", decisão de tela).
2. **Conferência humana por amostra:** o Kauê abre as Casas dos clubes que mais conhece no celular e confere de olho dois ou três fatos.
3. **Divulgação** só quando os 20 estiverem revisados: card/stories da sala de troféus fica para depois (item 5 da ordem de construção do `docs/casa.md`).
4. **Medir:** se o `scripts/metricas.mjs` já conta aberturas de tela, registrar aberturas por Casa; se não, só entra se for barato (a Casa não tem servidor).
- **Pronto quando:** `main` com a Casa, deploy normal do projeto, sem migração nem segredo.

### Etapa G. Manutenção
| Quando | O que |
|---|---|
| **Dezembro de 2026** | Rodada de escrita + conferência com os títulos de 2026 (Libertadores, Copa do Brasil, Brasileirão até 2/12, estaduais de 2026 já entraram) e recordes que mudam (ex.: jogos do Cássio, gols dos jogadores em atividade). Rodapé passa a "Dados até 31/12/2026". |
| **2027** | Atualização completa com a nova Série A (clubes que sobem e descem). |
| **Sempre** | Erro apontado pelo botão: corrige no CSV, marca nova `verificada_em`, rodar `npm run importar-casa`. |

## 4. Quem faz o quê

| Quem | O quê |
|---|---|
| **Kauê** | Etapa A; merge dos PRs; olhar as Casas no celular (Etapa F); checar no navegador as listas das federações que o Claude não abre; definir o canal de erro. **Não há DNS, Supabase nem segredo nesta entrega.** |
| **Sessão de conferência** (Claude, nova a cada lote) | Etapa B |
| **Sessão de código** (Claude) | Etapas C, D e E, uma por vez, cada uma com `npm test` e commit pequeno em português |

## 5. Ordem e paralelismo

```
A (decisões) ──► B (conferência, lote a lote) ─────────────┐
            └──► C (importador) ──► D (tela) ──► E (ganchos) ├─► F (soft launch) ──► G
```

- B e C andam juntas. D só precisa de C pronta e de **um** clube revisado para testar.
- F pode começar com poucos clubes revisados; a divulgação espera os 20.

## 6. Riscos e como tratamos

| Risco | Tratamento |
|---|---|
| **Fato errado publicado** (o que mais pesa: o rascunho antigo tinha muitos erros) | Só `revisada` vai ao ar; fonte em cada linha e "ver fontes" na tela; botão de erro; data de referência visível |
| **Direito autoral e marcas** | Manto só com padrão e cores, sem escudo, símbolo (cruz, estrela), patrocínio ou fornecedor; taça e estádio genéricos; nota de independência no rodapé |
| **Nomes reais** | Só artilheiros e recordistas, com nome, número, data e fonte; nunca atleta menor de idade; sem opinião nem vida pessoal |
| **Zoeira e temas fora** | Casa celebra o clube (zoeira é do narrador); sem tragédia, rebaixamento, vexame, goleada sofrida; validador barra palavras proibidas |
| **Marca de aposta** | Nenhum patrocinador de estádio, competição ou camisa nos textos; validador barra a lista de marcas |
| **Fonte que muda ou sai do ar** | Cada linha guarda o link e a data; a revisão de dezembro reabre as fontes |
| **Conflito com a sessão dos Lances** | Etapa E só depois de combinar quem mexe em `inicio.ts` e `ranking.ts` |

## 7. Pronto para publicar (checklist final)

- [ ] Todas as linhas dos clubes que vão ao ar estão `revisada` e com `verificada_em`.
- [ ] `npm test` e `npm run build` passam; `dados.gerado.ts` atualizado e no commit.
- [ ] Bundle inicial segue abaixo de ~300 KB gzip (a Casa é `import()` dinâmico).
- [ ] Capturas em 390×844 de pelo menos três Casas vistas, sem rolagem horizontal.
- [ ] Nenhuma palavra proibida, marca de terceiro, escudo, símbolo ou número de camisa na tela.
- [ ] Rodapé com data, fontes, nota de independência e canal de erro.
- [ ] `docs/jogo.md` 7.4 e `docs/casa.md` refletem o que foi feito.
