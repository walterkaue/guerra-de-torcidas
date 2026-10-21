# Casa do time: relatório dos dados (rascunho, 21/10/2026, revisado à noite)

Os seis CSVs estão em `dados/casa/` (20 clubes, tudo `status = rascunho`). Cada fato tem a página de onde saiu na coluna `fonte*` e as dúvidas na coluna `observacao`.

## 1. Cobertura por clube

Títulos = linhas em `titulos.csv`. Gols e jogos = posições preenchidas (de 3). "Vazio" em `estadios.csv` = campo sem fonte aberta.

| Clube | Títulos | Gols | Jogos | Goleadas | Mantos | Vazio em estadios.csv |
|---|---|---|---|---|---|---|
| athletico-pr | 33 | 3 | 3 | 3 | 1 | gramado |
| atletico-mg | 61 | 3 | 3 | 3 | 1 | gramado |
| bahia | 59 | 3 | **0** | 2 | 2 | gramado |
| botafogo | 28 | 3 | 3 | 1 | 2 | gramado |
| bragantino | 4 | **0** | **0** | **0** | **0** | gramado, recorde (público e partida) |
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

1. **Paranaense 2000 (resolvido, conferir):** a página da FPF lista 2000 como do Coritiba, mas a final de 17/07/2000 (Atlético 1 x 1 Coritiba, gol do título do Atlético) está contada pela Gazeta do Povo e pela Banda B. Fica com o Athletico (28 títulos); o Coritiba perde a linha (39). A página da FPF parece errada.
2. **Paraense 2000 do Remo (resolvido, conferir):** a página de títulos do clube lista 49 anos, mas O Liberal conta 48 títulos até 2025 e a Wikipédia (só apoio) dá 2000 ao Paysandu sobre o Castanhal. Linha removida (Remo com 48).
3. **Atlético-MG, Brasileiro 1937**: Torneio dos Campeões equiparado pela CBF; bate com `clubes-do-dia.csv` (3 Brasileiros).
4. **Bahia, Baiano 1998**: fora da lista do clube, mas necessário para fechar os 52 títulos; Lance dá ao Bahia.
5. **Vitória**: Lance (abril/2024) lista 30 Baianos; 2025 e 2026 foram do Bahia. Copa do Nordeste 2026 entrou (Gazeta, 06/06/2026).
6. **Estádios compartilhados**: Maracanã (Flamengo e Fluminense, mesmos dados), Mineirão (Cruzeiro).
7. **Athletico-PR**: ficou o nome que o clube usa (Arena da Baixada). Só o Lance fala em mudança do nome oficial em 2024.
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

| Clube | Competição | Ano | Nota |
|---|---|---|---|
| flamengo | brasileiro-a | 1987 | O clube se considera campeão de 1987; a CBF reconhece o Sport. |
| palmeiras | mundial-clubes | 1951 | Copa Rio de 1951: o clube a considera título mundial; a lista da FIFA no site começa em 2000 e não a inclui. |

Não registrei o Fluminense na Copa Rio de 1952 (sem fonte aberta).

## 4. Avisos

- `docs/casa.md` não existia neste branch; trouxe por cherry-pick do commit `abe7360` de outro branch. Nenhuma coluna mudou.
- Domínios que valeria aceitar na lista: `bemparana.com.br`, `umdoisesportes.com.br` e `band.com.br` (esse último só como `band.uol.com.br` está na lista hoje).
- Sites que não abriram: CBF, FPF-SP, FERJ, FMF, ogol (403), ESPN, FIFA (SPA vazia), vasco.com.br (404), partes do ecvitoria.com.br.
- Formato de estádio (`oval`, `retangular`, `ferradura`) é avaliação visual em todos os clubes.
- Como validar: `npm test` (lógica do repositório). A conferência dos CSVs (contagem de Brasileiros contra `clubes-do-dia.csv`, ids de competição, palavras proibidas, tamanhos de campo) rodou com um script meu, fora do repositório.
