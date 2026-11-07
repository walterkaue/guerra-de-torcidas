# Home: bloco das divisões e placa de fim do mês (prints para aprovar)

Cada situação tem dois prints: `-390.png` (390×844) e `-360.png` (360×740). Todos saem da Home em modo falso
(`?homeFalsa&temporadaFalsa=...`, só em desenvolvimento), com o Flamengo como time do coração, Chromium headless e o
Playwright contra `npx vite --port 5181 --strictPort`. Nenhum print tem rolagem horizontal
(`document.documentElement.scrollWidth <= innerWidth`, conferido em cada um). Nada vai para o Supabase.

Os prints do bloco (01 a 10) são o topo da Home, sem rolar: mostram a dobra de verdade. Os da placa (11 a 21) rolam até ela.

**Bloco compacto (ajuste da conversa principal, 07/11/2026):** a primeira versão tinha 172 px, com o adesivo do narrador
dentro, e empurrava o "Jogar agora" para baixo da barra em 390×844. Agora o bloco tem 88 px (102 px quando a projeção
quebra em 3 linhas em 360) e **a frase do mês vai no adesivo do cabo de guerra**: ela entra no lugar da frase do duelo
quando o time é líder, está no acesso ou na zona de queda (ou quando o duelo não tem frase); a virada sobre o rival
("passou"/"foi passado") continua com a frase do duelo. Medido com Playwright:

| tamanho | "Jogar agora" (topo → fundo) | topo da barra de baixo | à vista? |
| --- | --- | --- | --- |
| 390×844 | 693 → 768 | 775 | sim, inteiro |
| 360×740 | 697 → 772 (711 → 786 com a projeção em 3 linhas) | 671 | não: fica abaixo da dobra |

Em 360×740, antes do bloco, o botão já ficava rente à dobra (topo em ~601, fundo em ~676, barra em 671): o cabo de guerra
ocupa quase toda a primeira tela. **Decisão do Kauê:** manter o bloco logo abaixo do cabo (como está) ou movê-lo para
baixo do "Jogar agora" em telas baixas.

## Bloco das divisões (logo abaixo do cabo de guerra)

| arquivo | o que mostra | URL de dev |
| --- | --- | --- |
| `01-home-bloco-lider-*.png` | Líder da Série A: "1º", vantagem em pontos, projeção; frase de líder no adesivo do cabo | `temporadaFalsa=ab&serie=a&pos=1&pre=0&mes=atual` |
| `02-home-bloco-meio-serie-a-*.png` | Meio da Série A: "5º", pontos acima da zona | `ab&serie=a&pos=5&pre=0&mes=atual` |
| `03-home-bloco-zona-de-queda-*.png` | Zona de queda da A: "9º", distância do 8º; no cabo, a frase da zona | `ab&serie=a&pos=9&pre=0&mes=atual` |
| `04-home-bloco-zona-de-acesso-serie-b-*.png` | Zona de acesso da B: "2º"; no cabo, a frase de acesso | `ab&serie=b&pos=2&pre=0&mes=atual` |
| `05-home-bloco-serie-b-fora-das-zonas-*.png` | Série B fora das zonas: "6º", pontos do acesso | `ab&serie=b&pos=6&pre=0&mes=atual` |
| `06-home-bloco-unica-dentro-das-10-*.png` | Série única dentro das 10: "por enquanto vai pra Série A" | `unica&pos=4&pre=0&mes=atual` |
| `07-home-bloco-unica-fora-das-10-*.png` | Série única fora das 10: pontos da última vaga da Série A | `unica&pos=15&pre=0&mes=atual` |
| `08-home-bloco-sem-semana-travada-*.png` | Mês sem semana travada: "–", "a 1ª semana trava segunda, 12h", sem projeção; o cabo fica com a frase do duelo | `vazia&pos=6&pre=0&mes=atual` |
| `09-home-bloco-pre-temporada-*.png` | Pré-temporada: o selo único "Pré" no canto, nada além dele | `ab&serie=a&pos=5&mes=atual` |
| `10-home-bloco-sem-conexao-*.png` | Leitura falhou: "Tabela do mês: sem conexão agora." no mesmo espaço | `erro` |

## Placa de fim do mês (abaixo do "Jogar agora")

| arquivo | o que mostra | URL de dev |
| --- | --- | --- |
| `11-home-placa-subiu-*.png` | Subiu pra Série A (2º da B): seta verde, "Ver na Galeria" (o acesso é troféu) | `fim-subiu&pos=2` |
| `12-home-placa-campeao-*.png` | Campeão da temporada (1º da A): seta verde, "Ver na Galeria" | `fim-campeao` |
| `13-home-placa-campeao-serie-b-*.png` | Campeão da Série B (1º da B): seta verde, "Ver na Galeria" | `fim-subiu&pos=1` |
| `14-home-placa-fica-na-serie-a-*.png` | Fica na Série A (5º): traço neutro, sem festa, "Ver a tabela" | `fim-campeao&pos=5` |
| `15-home-placa-fica-na-serie-b-*.png` | Fica na Série B (6º): traço neutro, sem festa, "Ver a tabela" | `fim-subiu&pos=6` |
| `16-home-placa-caiu-*.png` | Caiu pra Série B (9º da A): seta cinza pra baixo, sem festa | `fim-caiu` |
| `17-home-placa-vai-pra-serie-a-*.png` | Série única: 3º, vai pra Série A (sem pré-temporada) | `fim-unica&pos=3&pre=0` |
| `18-home-placa-comeca-na-serie-b-*.png` | Série única: 15º, começa na Série B, traço neutro | `fim-unica&pos=15&pre=0` |
| `19-home-placa-campeao-da-estreia-*.png` | Campeão da estreia (1º da série única, fora da pré-temporada) | `fim-unica&pos=1&estreia=1` |
| `20-home-placa-pre-temporada-*.png` | Pré-temporada: selo "Teste das divisões" e nunca "Ver na Galeria" | `fim-unica&pos=3` |
| `21-home-placa-fica-na-serie-a-rival-caiu-*.png` | Fica na A com o clássico caído: frase da zoeira com o rival | `fim-campeao&pos=5&rival=caiu` |

Os cenários de dev e os parâmetros (`serie`, `pos`, `pre`, `mes=atual`, `estreia`, `rival=caiu`) estão descritos no topo de
`src/dev/temporadaFalsa.ts`. Os prints do bloco usam `mes=atual` porque a projeção só sai quando a semana de agora é do
mês aberto. Os de placa mostram o bloco também (o mês aberto do cenário), porque as duas coisas ficam na mesma Home.
