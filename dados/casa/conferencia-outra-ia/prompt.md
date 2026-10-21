# Conferência da Casa do [time] em outra IA

Para rodar a conferência de um lote fora do Claude Code (por exemplo, numa IA com busca na web e upload de arquivo).

## Como usar
1. Abra uma conversa nova numa IA que **navega na web** (busca e abre páginas).
2. Cole o texto de "O prompt" abaixo, **anexe (ou cole) o arquivo do lote** (`lote-02.md`, `lote-03.md` ou `lote-04.md` desta pasta; o lote 1 já foi conferido) e escreva na mesma mensagem **qual clube** conferir: **um clube por conversa** (ex.: "Clube desta conversa: cruzeiro"). No lote inteiro de uma vez, a IA cobre uma parte e diz que validou tudo.
3. **Confira a prova de navegação** antes de seguir: a IA começa respondendo a primeira frase e a data de uma página de teste. Abra o link de `PROVA` (abaixo, no prompt) no seu navegador e compare. Se não bater, a IA não está abrindo páginas: pare e use outra (o Gemini CLI baixa a página de verdade).
4. Salve a resposta inteira num arquivo de texto (ex.: `resposta-lote-02.txt`) na raiz do repositório.
5. Aplique no repositório (simulação primeiro, depois de verdade):
   ```
   node scripts/casa/aplicar-conferencia.mjs resposta-lote-02.txt --clubes=cruzeiro --seco
   node scripts/casa/aplicar-conferencia.mjs resposta-lote-02.txt --clubes=cruzeiro
   npm run importar-casa
   npm test
   git diff dados/casa
   ```
   `npm run importar-casa` valida os CSVs (domínios, ids, palavras proibidas, ordem dos recordes, Brasileiros contra o `clubes-do-dia.csv`…) e atualiza `src/dados/casa/dados.gerado.ts`; se ele reclamar, o dado da IA tem erro. O script de aplicar mostra quantas linhas foram corrigidas, apagadas e confirmadas, avisa o que não achou e lista o que ficou em `rascunho`. Linha de clube fora do `--clubes` é recusada.
6. **Confira por amostra**: abra no navegador 5 a 10 links da resposta, principalmente dos fatos que a IA mudou, e veja se o trecho citado está lá. Apague o `resposta-*.txt` depois de aplicar; ele nunca vai no commit. IA sem acesso real à web inventa confirmação; por isso o prompt exige o link aberto e o trecho que prova.

Lotes: 2 = chapecoense, corinthians, coritiba, cruzeiro, flamengo. 3 = fluminense, gremio, internacional, mirassol, palmeiras. 4 = remo, santos, sao-paulo, vasco, vitoria.

---

## O prompt (copie daqui até o fim do arquivo)

Você vai fazer a **conferência das fontes** de dados históricos de clubes de futebol brasileiros para uma página chamada "Casa do [time]" de um jogo gratuito e independente (sem vínculo com clubes, atletas ou entidades). Quem escreveu os dados não pode conferir o próprio trabalho: você é a segunda sessão. O arquivo anexo traz seis blocos CSV (clubes, estádios, títulos, recordes, goleadas, mantos) de 5 clubes, todos em `rascunho`. **Confira só o clube indicado na mensagem**, em todos os seis blocos, e ignore os outros quatro.

**Pré-condição.** Você precisa conseguir abrir páginas da web de verdade. Se não consegue, responda só `SEM ACESSO À WEB` e pare. Não confirme nada de memória: o ponto da tarefa é abrir a fonte.

**Prova de navegação (antes de tudo).** Abra a página abaixo e responda, numa mensagem só com isso, a **primeira frase do texto da notícia, copiada literalmente**, e a **data de publicação** que aparece na página. Não deduza pelo endereço: quem confere vai abrir a mesma página e comparar. Espere o "pode seguir" antes de começar a conferência.
PROVA: https://www.conmebol.com/noticias/river-plate-derroto-1-0-san-lorenzo-y-gano-su-primera-recopa-santander-sudamericana/

**Sem trecho, sem confirmação.** Cada linha que você confirmar ou corrigir precisa, no RESUMO, do link que você abriu e de um trecho curto copiado da página que prova o fato. Observação genérica ("validado", "confirmado pela Conmebol") não vale. Se a página da `fonte` não fala do fato (já aconteceu: link de outro clube), procure uma fonte aceita que fale e mande a linha corrigida; se não achar, deixe a linha fora de todas as seções.

**Cubra o clube inteiro ou diga o que faltou.** No fim do RESUMO, conte: quantas linhas do clube havia em cada arquivo, quantas você confirmou, corrigiu e apagou, e quais ficaram de fora e por quê. Nunca escreva que "todas foram validadas" se alguma ficou de fora.

### O que fazer em cada linha
1. Abra a página do campo `fonte` (no estádio, também `fonte_capacidade` e `fonte_recorde`) e confira o fato: número, data, nome, placar, ano.
2. Fato que nenhuma fonte confirma **sai** (melhor um buraco do que um chute). Se o fato está certo mas a fonte é fraca, procure uma melhor (domínios aceitos abaixo) e troque o link.
3. Leia a coluna `observacao`: ela traz dúvidas conhecidas ("conferir", "DIVERGÊNCIA", "EM DÚVIDA"). Resolva cada uma abrindo as fontes citadas. O que continuar em dúvida fica dito na observação, com os dois lados e os links.
4. Onde houver campo vazio ou clube sem recordes/goleadas, tente achar fonte. Não achou, deixe vazio.
5. Reescreva a `observacao` das linhas que você corrigir dizendo o que cada fonte confirmou.

### Verificações cruzadas
- **Títulos:** os anos de cada competição batem com o que o clube e a entidade contam; `competicao` usa só os ids abaixo; o estadual vai com o nome oficial sem patrocinador (campo `nota`, ex.: "Campeonato Paulista"). Brasileiro Série A conta Taça Brasil e Robertão (unificados pela CBF em 2010) e o Torneio dos Campeões de 1937 (Atlético-MG, reconhecido pela CBF em 2023).
- **Recordes:** posições 1, 2 e 3 em ordem decrescente de `valor` (empate: duas linhas na mesma posição); `data_referencia` é a data da fonte (AAAA-MM-DD), não a de hoje. Vale a contagem do clube mesmo com amistosos; diga na observação qual contagem a fonte usa.
- **Estádio:** `recorde_publico` é o maior público de jogo **daquele clube** no estádio (não o recorde geral do estádio, que pode ser de outro time); `recorde_tipo` é `pagante` ou `presente`, como a fonte diz; capacidade só com número de fonte aceita; `formato` é `oval`, `retangular` ou `ferradura` (avaliação visual, deixe como está).
- **Goleadas:** só **aplicadas** pelo clube, até 3; placar com o clube primeiro; `data` pode ser AAAA, AAAA-MM ou AAAA-MM-DD.
- **Mantos:** `padrao` é `lisa`, `listras-v`, `aros`, `faixa-diagonal` ou `faixa-peito` e tem que bater com o que a fonte descreve; a `descricao` (até 160 caracteres) não cita escudo, cruz, estrela, número, patrocínio, fornecedor nem detalhe de um modelo específico; `cores` em hex, na ordem do desenho.
- **`historia_cores`:** até 400 caracteres; só fatos da fonte; se a origem de um apelido passa por tema proibido (abaixo), o apelido fica sem a história.

### Linhas vermelhas (nenhum texto pode ter)
- Tragédia, morte, acidente, rebaixamento, vexame, goleada **sofrida**, polêmica, doping, prisão, processo, briga, vida pessoal.
- Opinião ou zoeira sobre pessoa; atleta menor de idade; raça, religião, política, orientação, origem, corpo.
- Marca de terceiros: patrocinador de estádio, de competição ou de camisa, fornecedor de material esportivo, casa de aposta (use "Brasileirão" sem marca e o nome do estádio sem patrocínio).
- Palavras proibidas, como palavra inteira: aposta, apostar, bet, odd, cotação, banca, bolão valendo, green, **red** (no Bragantino, escreva só "Bragantino"), prêmio, milhão, valendo.

### Fontes aceitas
Só estes domínios podem ir nos campos `fonte*`:
- Entidades: cbf.com.br, fifa.com, conmebol.com, e as federações (fpf.org.br, ferj.com.br, fmf.com.br, fgf.com.br, fbf.org.br, federacaopr.com.br, fcf.com.br, fpfpara.com.br, fpf.com.br).
- Sites oficiais dos clubes (athletico.com.br, atletico.com.br, esporteclubebahia.com.br, botafogo.com.br, chapecoense.com, corinthians.com.br, coritiba.com.br, cruzeiro.com.br, flamengo.com.br, fluminense.com.br, gremio.net, internacional.com.br, mirassolfc.com.br, palmeiras.com.br, clubedoremo.com.br, santosfc.com.br, saopaulofc.net, vasco.com.br, ecvitoria.com.br).
- Imprensa e estatística: globo.com (ge), lance.com.br, espn.com.br, uol.com.br, gazetaesportiva.com, placar.com.br, terra.com.br, estadao.com.br, folha.uol.com.br, cnnbrasil.com.br, r7.com, band.uol.com.br, metropoles.com, trivela.com.br, goal.com, gauchazh.clicrbs.com.br, otempo.com.br, em.com.br, correiobraziliense.com.br, correio24horas.com.br, oliberal.com, diariodepernambuco.com.br, nsctotal.com.br, gazetadopovo.com.br, sportv.globo.com, jovempan.com.br, itatiaia.com.br, opovo.com.br, tribunapr.com.br, bahianoticias.com.br, bandab.com.br, superesportes.com.br, umdoisesportes.com.br, ogol.com.br.
- **Wikipédia nunca** vai no campo `fonte`; pode ajudar você a decidir, mas ache a fonte aceita que diz a mesma coisa.

### Ids de competição (campo `competicao` dos títulos)
`mundial-clubes`, `intercontinental`, `libertadores`, `sul-americana`, `recopa`, `copa-conmebol`, `supercopa-libertadores`, `brasileiro-a`, `copa-do-brasil`, `supercopa-do-brasil`, `copa-do-nordeste`, `copa-verde`, `brasileiro-b`, `brasileiro-c`, `brasileiro-d`, `estadual`. Competição sem id (Copa Master da Conmebol, Recopa de 1968/69, Copa dos Campeões, Mercosul, Rio-São Paulo) **fica de fora**. Título que o clube reivindica e a entidade não lista fica com `oficial` = `não` e nota neutra.

### Decisões já tomadas (valem)
- Estadual cuja federação não abre: vale Lance, Trivela ou Goal, com "conferir" na observação (o responsável confere no site da federação).
- Quando a fonte oficial contradiz o fato contado pela imprensa e pela súmula, vale o fato; registre os dois lados na observação.

### Como responder (formato obrigatório)
Responda **só** com estas quatro seções, nesta ordem, com estes títulos exatos. Um programa lê a resposta.

```
=== RESUMO ===
Tabela em texto livre: clube | arquivo | linha | o que mudou | link que você ABRIU | trecho copiado da página que prova.
Uma linha da tabela para cada linha confirmada ou corrigida (títulos podem ser agrupados por competição quando a mesma página prova todos os anos, com o trecho da lista).
Depois: a decisão de cada "conferir", "DIVERGÊNCIA" ou "EM DÚVIDA" da observação, com os dois lados e os links.
Por fim: a contagem por arquivo (havia, confirmadas, corrigidas, apagadas, de fora).

=== CORRIGIDAS ===
#### titulos.csv
"clube","competicao","ano","oficial","nota","fonte","verificada_em","status","observacao"
"flamengo","estadual","1914","sim","Campeonato Carioca","https://...","2026-10-22","revisada","O que a fonte confirma."
#### mantos.csv
...

=== APAGAR ===
titulos.csv | clube | competicao | ano
goleadas.csv | clube | adversario
recordes.csv | clube | lista | posição
mantos.csv | clube | ordem

=== CONFIRMADAS ===
clubes.csv | clube
estadios.csv | clube
titulos.csv | clube | competicao | anos separados por espaço
recordes.csv | clube | lista | posições separadas por espaço
goleadas.csv | clube | adversario
mantos.csv | clube | ordens separadas por espaço
```

Regras do formato:
- Em `CORRIGIDAS`, cada bloco começa com `#### nome.csv` (o nome do arquivo daquelas linhas, sem crases), depois o **cabeçalho exatamente como no arquivo anexo** e as linhas completas (todas as colunas, todos os campos entre aspas, aspas internas dobradas). Linha nova (fato que você acrescentou) também vai aqui. Use `status` = `revisada` e `verificada_em` = a data de hoje.
- Em `APAGAR`, uma linha por fato que sai (explique no RESUMO).
- Linha que você só confirmou, sem mudar nada, vai em `CONFIRMADAS`, não em `CORRIGIDAS`.
- Em `CONFIRMADAS` e `APAGAR`, uma chave por linha, sem marcadores, crases nem texto livre.
- Em `CONFIRMADAS`, as linhas que você abriu a fonte e **não precisaram mudar**. Agrupe títulos por clube e competição (`titulos.csv | flamengo | libertadores | 1981 2019 2022 2025`).
- Linha que você não conseguiu conferir não aparece em nenhuma seção (fica em rascunho). Melhor deixar de fora do que confirmar sem abrir a fonte.
- Não mude `formato` do estádio nem invente campo. Nada fora das quatro seções.
