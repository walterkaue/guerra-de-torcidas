# Casa do [time] — a página de história de cada clube

> Versão 1.0 · 21/10/2026 · Desenho aprovado em 21/10/2026, a partir da proposta "Galeria dos Clubes".
> **Tela construída em 25/10/2026** (`src/telas/casa/`, `#casa` e `#casa/<id>`), com ganchos na Home e no Ranking. Só aparecem os clubes com a linha de clube revisada; os outros ficam "em breve" no índice. Ordem de publicação: `docs/casa-publicacao.md`.
> Se algo aqui discordar do `docs/jogo.md`, vale o `jogo.md`.

## 1. O que é

Uma página por clube, com o nome personalizado pelo artigo: **"Casa do Flamengo"**, **"Casa da Chapecoense"**. Mostra a história do clube em fatos com fonte: estádio, troféus, recordes e cores. É vitrine, não minigame: **não dá pontos, XP nem selo** (pilar 7, justiça).

Por que existe: os minigames dão motivo para jogar 30 segundos; a Casa dá orgulho de clube e um lugar para o torcedor "morar" no jogo entre uma partida e outra (pilar 2, tribal).

## 2. Decisões (21/10/2026)

| Tema | Decisão |
|---|---|
| Nome | **Casa do [time]**, com o artigo do `src/dados/times.ts`. O nome "Galeria" fica para a **Galeria de Troféus** da torcida no jogo (`jogo.md` seção 5), que já existia no plano |
| Clubes | **Só os 20 da Série A 2026.** Para 2027, atualização completa (clubes que sobem e descem, títulos de 2026) |
| Nomes reais | **Liberados nas fichas factuais da Casa** (artilheiros, recordistas), só nome + número + fonte. Regra de nomes reais ampliada no `jogo.md` seção 8 |
| Competições | **Nome real, sem patrocinador**, padronizado pela entidade organizadora (FIFA, CONMEBOL, CBF, federação). Nada de "Taça Nacional" (seção 6) |
| Títulos que geram discussão | **Na Casa do clube, vale o lado da torcida** (decidido em 21/10): o título que o clube reivindica aparece na prateleira normal e conta no total daquele clube, com nota neutra dizendo o que a entidade reconhece (seção 6). Fora da Casa, vale a lista oficial |
| Manto | **O mais perto do real sem ferir direito autoral:** padrão de cores tradicional numa silhueta nossa, sem escudo, símbolo, patrocínio ou fornecedor. Exceção explícita à regra da faixa de placar, só dentro da Casa (seção 5) |
| Ligação com o jogo | **Só ganchos de navegação** (seção 3). Nenhum ponto, nenhuma recompensa por visitar |
| Quando | Liberada em 21/10/2026, com o upgrade dos pênaltis fechado (Lances do Jogo no ar). Ordem e etapas: `docs/casa-publicacao.md` |

## 3. Onde entra

- **Rota:** `#casa/<id do time>` (ex.: `#casa/sao-paulo`), com os mesmos ids do `src/dados/times.ts`.
- **Índice:** grade dos 20 clubes com o card "faixa de placar" (`#casa`).
- **Ganchos (só navegação):**
  - **Home:** tocar no bloco do seu time abre a sua Casa.
  - **Ranking:** tocar numa torcida abre a Casa dela.
  - **Time do Dia:** depois que o dia termina (acertou ou não), "Conheça a Casa do [clube]" quando o clube secreto for da Série A. Nunca antes, para não dar pista.
  - **Prova de Boleiro (depois):** no resultado, link para a Casa dos clubes que caíram na partida. O texto das perguntas continua sem aparecer.
- **Barra de navegação:** não ganha item novo (Jogar, Palpites, Ranking, Carreira ficam). O índice entra pela Home ("Casa dos clubes") e pelo Ranking.
- "Outro time" não tem Casa.

## 4. Conteúdo da página

Cabeçalho na **faixa de placar** do time: "CASA DO FLAMENGO", fundação e cidade. Abaixo, blocos recolhíveis (só o primeiro aberto), em 390×844 sem rolagem horizontal.

### A. Estádio
- O estádio onde o clube manda a maioria dos jogos em 2026. Estádio compartilhado (Maracanã, Mineirão) aparece nas duas Casas.
- **Nome:** nome oficial sem patrocínio + nome popular entre parênteses ("Estádio Cícero Pompeu de Toledo (Morumbi)"). Se só existir nome com patrocínio, usa "Arena do [time]" ou o nome popular sem marca.
- Inauguração, capacidade (de preferência pelo cadastro de estádios da CBF), dimensões do gramado (só com fonte; sem fonte, não aparece).
- **Recorde de público do clube no estádio:** o maior público num jogo **daquele clube** ali (não o recorde geral do estádio, que pode ser de outro time). Com público pagante ou presente (dizendo qual), partida e data.
- Ilustração: silhueta genérica em SVG por formato (`oval`, `retangular`, `ferradura`), vista de cima, nas cores do time. Nunca foto, maquete, fachada ou desenho fiel do estádio.
- **Fora:** "maior artilheiro do estádio" (quase nunca tem fonte confiável).

### B. Sala de Troféus
- Duas prateleiras:
  - **"Na história":** títulos reais, agrupados por competição (seção 6), com contador e a lista de anos (toque abre).
  - **"Aqui no jogo":** títulos da torcida na Galeria de Troféus (semanas, temporadas, acessos). Entra quando a Galeria de Troféus existir (fase 1.5); até lá, a prateleira não aparece.
- Taça: **um único desenho genérico** em SVG, em ouro (títulos internacionais e nacionais), prata (copas nacionais e regionais) ou bronze (divisões de acesso e estaduais), com fita nas cores do time. **Nunca** o desenho de uma taça real.
- Ordem: mundiais, continentais, nacionais, regionais, estaduais.

### C. Livro de Recordes
- Top 3 artilheiros (nome e gols) e top 3 em jogos (nome e jogos), com a data de referência ("até 30/11/2026").
- Até 3 maiores goleadas **aplicadas** (placar, adversário, data, competição). Nunca goleada sofrida, rebaixamento ou vexame (mesma regra do quiz).
- Tabela em Barlow Condensed, caixa alta, números em Anton.

### D. Cores e manto
- Texto curto (até ~400 caracteres) sobre a origem das cores, e os **apelidos** do clube.
- O manto tradicional desenhado (seção 5) e, quando houver fonte, um "varal" com 2 a 4 padrões históricos (ex.: Santos de listras azuis e brancas em 1912).
- Apelido aparece como texto (Galo, Raposa, Peixe). **Mascote nunca vira desenho.**

### Rodapé
- "Dados até DD/MM/AAAA" e fontes ("ver fontes" abre a lista de links).
- Nota curta: **"Projeto independente e gratuito, sem vínculo com clubes, atletas ou entidades. Nomes e números são fatos históricos, com fonte. Marcas e símbolos oficiais pertencem aos donos."** Um toque em "nota completa" mostra o texto longo da proposta original (seção 10).

## 5. O manto: até onde vamos

Critério (decidido em 21/10): **padrão de cores sim, identidade gráfica não.** Listras, aros, faixas e cores combinadas são padrões genéricos, usados por centenas de clubes há mais de um século; o que é protegido é o escudo (marca registrada), os símbolos, as marcas de patrocinador e fornecedor e o desenho de cada modelo lançado.

**Pode:**
- Silhueta de camisa **desenhada por nós**, com o mesmo corte para os 20 clubes (gola redonda simples, manga curta).
- O **padrão tradicional do uniforme 1**: lisa, listras verticais, aros horizontais, faixa diagonal, faixa(s) horizontal(is) no peito, com as cores em proporções aproximadas.
- Cor diferente em gola e punho, se for parte da tradição.
- Padrões históricos com fonte, no varal.

**Não pode:**
- Escudo, nem nada que o lembre.
- **Símbolos do clube**, mesmo soltos: cruz (Vasco), estrela solitária (Botafogo), estrelas de título, coroa e similares.
- Número, nome, patrocínio, marca ou grafismo de fornecedor (inclusive faixas de marca na manga).
- Detalhes do modelo de um ano específico (recortes, gradientes, grafismos de coleção) e qualquer foto ou cópia de camisa.

**Onde a exceção vale:** só no bloco D da Casa. Card do time, bonecos e cards de compartilhamento continuam com a faixa de placar e a camiseta lisa (`jogo.md` seção 3).

Padrão no dado: `lisa`, `listras-v`, `aros`, `faixa-diagonal`, `faixa-peito`, mais as cores (hex) na ordem do desenho e o número aproximado de listras.

## 6. Competições e títulos

Lista fechada no código (`src/dados/competicoes.ts`), com o nome da entidade organizadora, **sem patrocinador**:

| id | Nome | Entidade | Taça |
|---|---|---|---|
| `mundial-clubes` | Copa do Mundo de Clubes da FIFA | FIFA | ouro |
| `intercontinental` | Copa Intercontinental (reconhecida pela FIFA como título mundial) | FIFA | ouro |
| `libertadores` | CONMEBOL Libertadores | CONMEBOL | ouro |
| `sul-americana` | CONMEBOL Sul-Americana | CONMEBOL | ouro |
| `recopa` | CONMEBOL Recopa | CONMEBOL | ouro |
| `copa-conmebol` | Copa CONMEBOL (1992–1999) | CONMEBOL | ouro |
| `supercopa-libertadores` | Supercopa Libertadores (1988–1997) | CONMEBOL | ouro |
| `brasileiro-a` | Campeonato Brasileiro Série A (com Taça Brasil e Robertão, unificados pela CBF em 2010) | CBF | ouro |
| `copa-do-brasil` | Copa do Brasil | CBF | prata |
| `supercopa-do-brasil` | Supercopa do Brasil | CBF | prata |
| `copa-do-nordeste` | Copa do Nordeste | CBF | prata |
| `copa-verde` | Copa Verde | CBF | prata |
| `brasileiro-b` / `-c` / `-d` | Campeonato Brasileiro Série B / C / D | CBF | bronze |
| `estadual` | Nome oficial do estadual sem patrocínio (ex.: "Campeonato Paulista") | Federação | bronze |

- **Estaduais entram** (decisão da proposta, 21/10): dão às Casas de Mirassol, Remo, Bragantino e Chapecoense a mesma riqueza das outras. Fonte: federação estadual.
- **Ids e nomes fechados:** o dado aponta para o id, nunca escreve o nome à mão. Os nomes saem da página oficial da entidade (FIFA, CONMEBOL, CBF); onde a entidade usa o nome com patrocinador (ex.: Brasileirão e estaduais com marca de casa de aposta), fica só a parte sem marca.
- **Títulos que geram discussão (decidido em 21/10):** na Casa do clube, **vale o lado da torcida**: o título que o clube reivindica e a entidade não lista entra na prateleira normal e **conta no total daquele clube**, com **nota neutra** do que a entidade reconhece. Exemplos: Copa Rio de 1951 (Palmeiras: "o clube considera título mundial; a FIFA não lista entre os campeões mundiais"); Brasileiro de 1987 (Flamengo: "a CBF reconhece o Sport como campeão"). A coluna `oficial = não` guarda o fato. **Fora da Casa** (Time do Dia, `clubes-do-dia.csv`) segue valendo a lista oficial da CBF.
- **Outras competições** (Rio-São Paulo, Copa dos Campeões, Copa Norte) ficam para depois; entram com id próprio, nunca como texto livre.

## 7. Regras de conteúdo

- Tudo das seções 7 e 8 do `jogo.md` vale aqui: zero aposta (palavras proibidas, nenhum patrocinador de aposta), nomes reais só como fato com fonte, nada de zoeira com pessoa.
- **Nome do clube:** o nome do `times.ts`. Nome oficial completo só quando não tiver marca (o do Bragantino tem marca e, de quebra, "red", palavra proibida; a Casa usa "Bragantino" e conta a fundação como Clube Atlético Bragantino, 1928).
- **Nenhuma marca de terceiros:** patrocinador de estádio, de competição, de camisa ou fornecedor. Lista de marcas proibidas no validador (seção 8).
- **Temas fora**, como no quiz: tragédias, mortes, acidentes, raça, religião, política, polêmica, vida pessoal, atleta menor de idade. **Se a origem de um apelido passa por um desses temas, o apelido aparece sem a história** (ex.: "Pó de Arroz" sem a origem; o texto da Chapecoense não cita 2016 fora da lista de títulos).
- **Textos celebram o clube.** A zoeira continua sendo do narrador, nunca da Casa.
- Datas fechadas: "até 30/11/2026", nunca "atual" sem data.

## 8. Dados

### Formato
CSV em `dados/casa/`, uma linha por fato, para revisar fato a fato (mesmo espírito do `dados/perguntas/`):

| Arquivo | Uma linha por | Colunas principais |
|---|---|---|
| `clubes.csv` | clube | id, fundacao (data), cidade, apelidos (separados por `\|`), historia_cores, fonte, fonte2 |
| `estadios.csv` | clube | clube, nome, nome_popular, inauguracao, capacidade, formato, gramado, recorde_publico, recorde_tipo (pagante/presente), recorde_partida, recorde_data, fonte, fonte_recorde |
| `titulos.csv` | título | clube, competicao (id da seção 6), ano, oficial (sim/não), nota, fonte |
| `recordes.csv` | jogador por lista | clube, lista (gols/jogos), posicao, nome, valor, data_referencia, fonte |
| `goleadas.csv` | goleada | clube, placar, adversario, data, competicao, fonte |
| `mantos.csv` | padrão | clube, ordem, periodo, padrao, cores, listras, descricao, fonte |

Todas com `verificada_em`, `status` (rascunho, revisada, aposentada) e `observacao`. **A quantidade de títulos nunca é digitada:** sai da contagem de linhas.

### Como os dados nascem (igual ao quiz)
1. **Sessão de escrita** (Code com busca na web): preenche os CSVs dos 20 clubes, status `rascunho`, sempre com fonte. Pode partir da proposta "Galeria dos Clubes" (21/10) só como roteiro: os números dela **não valem**, porque têm erros conferidos (títulos parados em 2024, Botafogo sem os títulos de 2024, recorde do Morumbi de um jogo do Corinthians, contexto de goleada errado, rankings fora de ordem, gramados todos iguais, nomes sem fonte).
2. **Sessão de revisão** (nova, sem o contexto da primeira): confere cada fonte e marca `revisada` ou descarta.
3. **Importação:** `npm run importar-casa` valida e gera `src/dados/casa/dados.gerado.ts` só com as linhas revisadas.

**Fontes aceitas:** as do quiz (CBF, FIFA, CONMEBOL, federações, site oficial do clube, imprensa esportiva, ogol.com.br), mais o cadastro de estádios da CBF. Wikipédia só como `fonte2`.

### Validador (`scripts/casa/validar.mjs`, testado no `npm test`; importador: `npm run importar-casa`)
- Colunas, ids de clube (os 20 do `times.ts`) e de competição (seção 6), datas e números válidos.
- Toda linha revisada tem fonte de domínio aceito.
- Recordes: posições 1–3 sem buraco e valores em ordem decrescente (empate repete a posição: 1, 2, 3, 3).
- Títulos: sem ano repetido na mesma competição (salvo os dois Brasileiros de 1967 do Palmeiras, Taça Brasil e Robertão, marcados na nota).
- **Cruzamento com `dados/clubes-do-dia.csv`:** Brasileiros oficiais e ano de fundação têm que bater.
- **Palavras proibidas** (seção 7 do `jogo.md`) e **marcas proibidas** (patrocinadores de estádio, competição e camisa, fornecedores e casas de aposta) em todo texto.
- Textos dentro do limite de caracteres.

### Atualização
- **Dezembro de 2026:** depois das finais (Libertadores, Copa do Brasil, Brasileirão até 2/12), uma rodada de escrita + revisão com os títulos de 2026; o rodapé passa a "Dados até 31/12/2026".
- **2027:** atualização completa com a nova Série A.

## 9. Técnica

- **Sem servidor:** é conteúdo estático, sem pontos e sem segredo. Nenhuma migração.
- **Fora do bundle inicial:** a tela e os dados entram por `import()` dinâmico (o Vite separa o arquivo). Estimativa: ~20 KB gzip para os 20 clubes.
- Tela em `src/telas/casa.ts`, CSS próprio em `src/estilos/casa.css`, desenhos (estádio, taça, manto) como SVG gerado em código, sem imagem.
- Tipos em `src/dados/casa/tipos.ts`; competições em `src/dados/competicoes.ts`; cores do clube vêm do `times.ts` (nunca duplicadas).
- Para não conflitar com a sessão dos pênaltis: nenhum arquivo de partida é tocado; os pontos de contato são o registro da rota no `app.ts` e os ganchos em `inicio.ts`, `ranking.ts` e `timeDoDia.ts`.

## 10. Ordem de construção

1. **Dados:** sessão de escrita → sessão de revisão (pode correr antes do upgrade dos pênaltis).
2. **Importador e validador** com testes (`npm run importar-casa`).
3. **Tela da Casa** (blocos A a D, rodapé) e índice, testados em 390×844.
4. **Ganchos:** Home, Ranking, Time do Dia; depois, Prova de Boleiro.
5. **Depois:** prateleira "Aqui no jogo" (quando a Galeria de Troféus existir), comparação lado a lado com o rival, card da sala de troféus para compartilhar.
6. **Backlog:** campanha por ano (vitórias, empates, derrotas e artilheiro de cada título), marcos de gols do clube (1.000º, 5.000º…).

### Nota completa (texto da proposta original, mostrado em "nota completa")
"Este é um projeto gratuito desenvolvido de forma independente para fins estatísticos, históricos e de entretenimento. Este site não possui vínculo oficial, patrocínio ou associação comercial com os clubes de futebol citados, atletas ou suas respectivas federações organizadoras. Todas as marcas e identidades visuais oficiais pertencem aos seus respectivos proprietários."
