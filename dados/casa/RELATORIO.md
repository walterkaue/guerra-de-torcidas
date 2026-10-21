# Casa do time: relatório dos dados (rascunho, 21/10/2026, revisado à noite)

Os seis CSVs estão em `dados/casa/` (20 clubes). **Lote 1 conferido em 21/10/2026** (athletico-pr, atletico-mg, bahia, botafogo, bragantino: todas as linhas `revisada`, ver seção 5); os outros 15 clubes seguem `rascunho`. Cada fato tem a página de onde saiu na coluna `fonte*` e as dúvidas na coluna `observacao`.

## 1. Cobertura por clube

Títulos = linhas em `titulos.csv`. Gols e jogos = posições preenchidas (de 3). "Vazio" em `estadios.csv` = campo sem fonte aberta.

| Clube | Títulos | Gols | Jogos | Goleadas | Mantos | Vazio em estadios.csv |
|---|---|---|---|---|---|---|
| athletico-pr (revisado) | 33 | 3 | 3 | 3 | 1 | gramado |
| atletico-mg (revisado) | 61 | 3 | 3 | 3 | 1 | gramado |
| bahia (revisado) | 59 | 3 | **0** | 2 | 3 | gramado |
| botafogo (revisado) | 28 | 3 | 3 (4 linhas: empate em 3º) | 2 | 2 | gramado |
| bragantino (revisado) | 4 | **0** | **0** | **0** | 1 | gramado, recorde (público e partida) |
| chapecoense | 9 | **0** | **0** | **0** | 1 | gramado |
| corinthians | 49 | 3 | 3 | 3 | 2 | gramado |
| coritiba | 43 | 1 | **0** | **0** | **0** | capacidade, gramado (e `historia_cores` vazia) |
| cruzeiro | 55 | 3 | 3 | 2 | 1 | gramado |
| flamengo | 63 | 3 | 3 | 3 | 3 | gramado |
| fluminense | 40 | 3 | 3 | 3 | 2 | gramado |
| gremio | 59 | 3 | 3 | 2 | 2 | (completo) |
| internacional | 56 | 3 | 3 | 3 | 2 | gramado |
| mirassol | 2 | **0** | **0** | 1 | **0** | gramado, inauguração, recorde (público e partida) |
| palmeiras | 51 | 3 | 3 | 3 | 1 | (completo) |
| remo | 50 | 3 | **0** | **0** | **0** | capacidade, gramado |
| santos | 38 | 3 | 3 | 3 | 2 | gramado, partida do recorde |
| sao-paulo | 41 | 3 | 3 | 3 | 2 | gramado |
| vasco | 31 | 3 | 3 | 3 | 1 | gramado |
| vitoria | 36 | **0** | **0** | **0** | 1 | gramado |

Lacunas por falta de fonte aceita aberta:

- **Vitória**: recordes de gols e jogos (só achei listas em blogs e sites de torcida, fora das fontes aceitas, e que discordam entre si: Juvenal, Dendê, Dida...) e goleadas (um 8 x 1 no América-RN em 1980 só apareceu em resumo de busca).
- **Remo, Bragantino, Chapecoense, Coritiba, Mirassol**: sites oficiais em SPA ou bloqueados; ficaram poucos recordes, goleadas e mantos. O Remo ganhou o top 3 de gols (O Liberal, 17/05/2020), mas segue sem jogos.
- **Gramado** só entra no Grêmio e no Palmeiras.
- **Todos os mantos**: `listras` está vazio, o hex das cores é aproximado e o padrão (lisa, listrada...) segue o que a fonte descreve; onde a fonte não diz a orientação, a observação avisa.
- **Jogos do Bahia**: sem lista com fonte aceita.

## 2. Dúvidas e divergências para a revisão olhar primeiro

Estaduais conferidos só por Lance/Trivela/Goal (as federações FPF-SP, FERJ, FMF, FGF, FBF, FCF não abriram): todos os `estadual` têm "conferir" na observação.

1. **Paranaense 2000 (conferido no lote 1; o Kauê confere na FPF):** a página da FPF lista 2000 como do Coritiba, mas a final de 17/07/2000 (Atlético 1 x 1 Coritiba, gol do título do Atlético) está contada pela Gazeta do Povo e pela Banda B. Fica com o Athletico (28 títulos); o Coritiba perde a linha (39). A página da FPF parece errada.
2. **Paraense 2000 do Remo (resolvido, conferir):** a página de títulos do clube lista 49 anos, mas O Liberal conta 48 títulos até 2025 e a Wikipédia (só apoio) dá 2000 ao Paysandu sobre o Castanhal. Linha removida (Remo com 48).
3. **Atlético-MG, Brasileiro 1937 (resolvido no lote 1):** reconhecido pela CBF em 25/08/2023 (Itatiaia); o Jornal de Brasília mistura com a resolução de 2010. Bate com `clubes-do-dia.csv` (3 Brasileiros).
4. **Bahia, Baiano 1998 (conferido no lote 1):** fora da lista de anos do clube, mas necessário para fechar os 52 títulos que o clube e a FBF contam; o Lance dá ao Bahia. Conferir na FBF.
5. **Vitória**: Lance (abril/2024) lista 30 Baianos; 2025 e 2026 foram do Bahia. Copa do Nordeste 2026 entrou (Gazeta, 06/06/2026).
6. **Estádios compartilhados**: Maracanã (Flamengo e Fluminense, mesmos dados), Mineirão (Cruzeiro).
7. **Athletico-PR (conferido no lote 1):** ficou o nome que o clube usa (Arena da Baixada). Só o Lance fala em mudança do nome oficial em 2024.
8. **Capacidades**: Botafogo, Mirassol e Cruzeiro divergem entre fontes; Coritiba ("38 mil" x "40 mil") e Remo ficaram vazias. Bahia (48.661) e Santos (16.068) agora estão preenchidas. O cadastro de estádios da CBF segue sem abrir.
9. **Santos** (capacidade 16.068 pela Terra, 12/10/2023; Copa Conmebol 1998 com página do clube): o recorde da Vila (31.662 pagantes, 15/02/1976, contra o Palmeiras) foi mantido sem placar nem competição, porque a competição diverge (Torneio Governador do Estado x Paulista) e foi derrota em casa. O jogo de 1964 (32.986 ingressos) o clube diz que não foi oficializado. Pepe: 403 gols (clube/Lance) x 405 (Goal) e 750 jogos (Lance/Goal) x 741 (Diário do Litoral).
10. **Santos, Recopa 1968/69**: a página do clube lista "Recopa" mundial de 1968 e 1969; não é a Recopa Sul-Americana atual e ficou de fora (não há id para ela).
11. **Santos, cores**: Lance e Gazeta dizem que a primeira camisa (1912) foi azul e branca; o clube diz que nunca foi usada. Texto segue o clube.
12. **São Paulo (resolvido):** Recopa 1993/1994, Supercopa Libertadores 1993 e Copa Conmebol 1994 agora têm a página de títulos do clube como fonte (o 1992/1993 de um resumo de busca estava errado). A Copa Master da Conmebol de 1996 não tem id e ficou de fora. Recorde do Morumbi: 122.209 na final do Paulista de 1980 (Lance); o maior público do estádio (146 mil) não é jogo do São Paulo.
13. **Vasco**: o recorde de São Januário é uma bagunça: Lance dá 40.279 (11/08/2023) e 40.209 (12/11/2024) para Vasco x Londrina em 19/02/1978 e lista estimativas de 60 mil (1949, 1928). Entrou 40.279. Jogos de Dinamite: 1.110 (clube e imprensa, com amistosos) x 1.025 (página "Ídolos" do clube, time principal) x 1.022; ele é 1º em qualquer contagem. `vasco.com.br` segue dando 404 ao acesso automático. A goleada de 14 x 1 (1947) e a de 9 x 0 (1984) vêm do mesmo veículo e ele se contradiz sobre qual é a maior em São Januário. A goleada de 1931 sobre o Flamengo tem só o ano.
14. **Corinthians**: a maior goleada (11 x 0 x 12 x 2) diverge entre o Lance e o site do clube; é contra um rival.
15. **Fluminense (resolvido):** o 10 x 1 foi em 26/05/2022 (Gazeta, Lance, Terra e site do clube).
16. **Flamengo**: goleadas divergem entre Lance e o clube (maior goleada).

## 3. Títulos "não oficiais" registrados (`oficial = não`)

Decisão de 21/10: na Casa do próprio clube eles entram na prateleira normal e contam no total, com a nota neutra; a coluna só guarda o fato.

| Clube | Competição | Ano | Nota |
|---|---|---|---|
| flamengo | brasileiro-a | 1987 | O clube se considera campeão de 1987; a CBF reconhece o Sport. |
| palmeiras | mundial-clubes | 1951 | Copa Rio de 1951: o clube a considera título mundial; a lista da FIFA no site começa em 2000 e não a inclui. |

Não registrei o Fluminense na Copa Rio de 1952 (sem fonte aberta).

## 4. Avisos

- `docs/casa.md` não existia neste branch; trouxe por cherry-pick do commit `abe7360` de outro branch. Nenhuma coluna mudou.
- Domínios novos (lote 1, 21/10/2026): `umdoisesportes.com.br` abriu e entrou em `DOMINIOS_ACEITOS`. `bemparana.com.br` e `band.com.br` responderam 403 (desafio do Cloudflare) e ficaram de fora. `fferj.com.br` (site atual da FERJ) abre, mas não está na lista (só `ferj.com.br`) e não publica lista de campeões.
- Sites que não abriram: CBF, FPF-SP, FERJ, FMF, ogol (403), ESPN, FIFA (SPA vazia), vasco.com.br (404), partes do ecvitoria.com.br.
- Formato de estádio (`oval`, `retangular`, `ferradura`) é avaliação visual em todos os clubes.
- Como validar: `npm test` (lógica do repositório). A conferência dos CSVs (contagem de Brasileiros contra `clubes-do-dia.csv`, ids de competição, palavras proibidas, tamanhos de campo) rodou com um script meu, fora do repositório.

## 5. Conferência do lote 1 (21/10/2026)

Segunda sessão (`docs/casa.md`, seção 8), com o prompt de `dados/casa/conferencia.md`. Todas as linhas dos 5 clubes estão `revisada`, com `verificada_em = 2026-10-21` e a observação dizendo o que cada fonte confirmou.

**Mudanças de fato**
- **Atlético-MG:** saiu a frase do mascote em `historia_cores` (origem em rinhas, tema fora); URL da história corrigida (a antiga dava 404); 1937 com a nota do reconhecimento de 2023 e fonte da Itatiaia; Recopa 2014 com a página do clube (a da CONMEBOL dava 504); 9 x 2 de 1927 com a matéria de O Tempo que nomeia o torneio (Campeonato da Cidade, que o clube conta como Mineiro).
- **Bahia:** cores definidas em dezembro de 1930, não na fundação; manto 1 virou a camisa branca (o rascunho tinha a tricolor com aros); a tricolor entrou como ordem 3, com **listras verticais**; recorde de público com a ficha do Correio (28/10/2022); **saiu** o 10 x 1 no Vitória (amistoso, e a página do Lance citada não fala dele); **entrou** o 10 x 2 no Confiança (Copa do Nordeste 2002, Bahia Notícias, só o ano).
- **Botafogo:** partida do recorde corrigida para "Fluminense 1 x 2 Botafogo" (como na fonte); Waltencir entrou empatado com Jefferson em 3º nos jogos (457); **entrou** o 9 x 2 no Flamengo (Carioca de 1927, Placar, só o ano).
- **Bragantino:** `historia_cores` reescrito (o texto antigo só tinha a Wikipédia: preto e branco em 1928, vermelho desde 2019); agora conta as camisas de 2019 (Goal); manto 1 com a camisa branca lisa de 2019; fundação com a notícia de aniversário do clube; Paulista de 1990 com a Terra (26/08/1990).
- **Athletico-PR:** sem mudança de fato; só observações.

**Estaduais de 2026:** Mineiro do Cruzeiro, Carioca do Flamengo, Baiano do Bahia (já na lista), Paulista do Palmeiras, Paranaense do Operário. Nenhum muda o lote além do Bahia.

**Continua em dúvida (o Kauê confere)**
- Paranaense 2000 (FPF dá ao Coritiba; imprensa dá ao Athletico) e a lista da FPF com 2002 repetido.
- Baiano 1998 (fora da lista de anos do clube; Lance dá ao Bahia) e Baiano 1999 (Lance lista Bahia e Vitória). Lista da FBF não abriu.
- Mineiros (FMF sem lista), Cariocas (FERJ sem lista; 1907, 1912 e 1935 com dois campeões na Trivela) e Paulista de 1990 do Bragantino (FPF-SP não abriu).
- Série C 2007 do Bragantino: só Goal; lista da CBF não abriu.
- Capacidades: Atlético-MG (44.892 x "aproximadamente 45 mil"), Bahia (48.661 x 48.902), Botafogo (46.831 x 44.661 liberados). Cadastro da CBF não abriu.
- Recorde do Botafogo no Nilton Santos: lista do Lance de 2024; 2026 sem lista em fonte aceita.
- Artilheiros do Bahia: página do clube sem data (data_referencia = dia da leitura) e Goal com outros números.
- Jogos do João Leite (684): só o Lance.
- Lacunas que seguem: Athletico sem manto 1 (as fontes alternam listras verticais e diagonais); Bahia sem jogos (o próprio clube diz que não consegue comprovar); Bragantino sem recordes, goleadas e recorde de público; gramado de todos; data exata de 3 goleadas (11 x 0 em 1991, 10 x 2 em 2002, 9 x 2 em 1927).

**Para o validador (Etapa C):** os recordes agora podem ter empate (duas linhas na mesma posição, Botafogo jogos 3º); a regra "posições 1 a 3 sem buraco e em ordem decrescente" precisa aceitar valores iguais na mesma posição. Goleadas podem ter `data` só com o ano (AAAA).
