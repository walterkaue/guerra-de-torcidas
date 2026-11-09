# Termos × jogo

> Levantamento de 31/10/2026 para o Kauê e o advogado. Compara cada promessa de `src/dados/termos.md` com o que o jogo faz de verdade (código e migrações; banco só pelo que as migrações definem). **Não é parecer jurídico** e não altera os Termos. Para cada divergência há duas saídas: mudar o jogo ou mudar o texto. Quem escolhe é o Kauê.
>
> **Atualizado em 02/11/2026** com as decisões do Kauê de 01/11 (mudar o jogo): aviso de mudança, "Ver meus dados", apagar o texto das mensagens, apagar apelido no `#admin` e "Seja sócio" só para 18+. As linhas marcadas **Passou a cumprir** mudaram no código; o texto dos Termos não mudou aqui.

## Resumo

- A maioria das promessas de jogo cumpre. As divergências estão na tabela abaixo; o que o jogo faz e o texto não diz está na penúltima seção.

### As divergências, por ordem de peso

| # | Divergência | Situação | Saídas |
|---|---|---|---|
| 1 | Apagar contas paradas | **Passou a cumprir** (02/11/2026, PR do parecer) | Feito: rotina mensal de 6 meses e prazo no texto |
| 2 | Aviso de mudança na tela inicial | **Passou a cumprir** (02/11/2026) | Feito: faixa na Home |
| 3 | Ranking de cidades | **Volta a valer com a cidade** (04/11/2026) | A linha "Sua cidade" voltou à Política junto com a tela de escolha (`#cidade`). Só cumpre de verdade depois que a migração da cidade (parte A) estiver aplicada e o ranking de cidades no ar |
| 4 | Checagem da Cloudflare | **Cumpre** (CAPTCHA ligado e conferido em 02/11/2026) | O texto fica |
| 5 | "Só você lê os seus" | **Resolvido no texto** (02/11/2026) | O texto diz o que o administrador lê |
| 6 | Depois de "Apagar meus dados" | **Resolvido no texto** (02/11/2026) | O texto diz que ficam só totais anônimos |
| 7 | Direito de "ver" os dados | **Passou a cumprir** (02/11/2026) | Feito: "Ver meus dados" na `#termos` |
| 8 | Trapaça "pode ter os pontos zerados" | **Resolvido no texto** (02/11/2026) | O texto diz só que a partida fica fora do ranking |
| 9 | Apelido ofensivo "apagado" | **Passou a cumprir** (02/11/2026) | Feito: "Apagar apelido" no `#admin` |
| 10 | "Antes de sair, o jogo avisa" | **Resolvido no texto** (02/11/2026) | O texto diz a exceção do botão de compartilhar |

**Parecer jurídico de 02/11/2026:** as respostas aos 12 pontos do [documento para o advogado](https://claude.ai/artifact/LLy4urtae5AGABECQ13d5P) foram aplicadas na versão de 02/11/2026 de `src/dados/termos.md`. Também entraram: controlador sem encarregado, serviços que recebem o IP (com a transferência para fora do país), o feedback com tela e navegador e o link de sócio como informativo. **A confirmar antes de divulgar:**
- **Ponto 4:** o parecer cita o ECA Digital como a Lei 8.069/1990 e não analisa o art. 9º da Lei 15.211/2025. Esse artigo proíbe a autodeclaração para conteúdo impróprio a menores.
- **Ponto 5:** o parecer não trata a exceção de alto risco (art. 3º da Res. CD/ANPD 2/2022), que pesa com dados de menores em larga escala.
- **Ponto novo (05/11/2026), boneco montável:** o servidor guarda a escolha de **tom de pele e corpo** do avatar (`docs/jogo.md`, seção 14.5), e isso pode ser lido como dado sensível (origem racial, art. 5º, II, da LGPD). Defesa proposta: é escolha estética do desenho, sem pergunta de identidade; guarda só um código (0 a 5 e h/m), sem rótulo de cor ou de gênero; o jogo sorteia um no começo; nunca entra em métrica, ranking ou lista de outras pessoas; some com "Apagar meus dados". Linha nova na Política desde a versão de 05/11/2026.
- **Ponto novo (06/11/2026), boneco em campo e no X1:** o boneco (com a escolha de **tom de pele e corpo**) passa a ser visto por **quem recebe um desafio** da pessoa: o batedor do X1 de pênaltis é o boneco de quem chamou, e o resultado e o convite mostram o busto dele (`docs/jogo.md`, seções 6 e 14.5). Antes, ele só aparecia nos aparelhos da própria pessoa. O que sai é só o desenho (corpo, pele, cabelo, número e as peças de campo), nunca o id, a carreira ou outra peça; vale também para quem tem menos de 18, como o apelido no desafio. Interruptor "Meu boneco em campo" no Perfil, ligado por padrão; desligado, quem recebe vê batedores sorteados e nenhum busto. Frase nova na Política e `DATA_DA_VERSAO` em 07/11/2026. O Kauê decidiu em 07/11/2026 que o padrão ligado vale também para os bonecos que já existiam (quem aceitou a versão de 05/11, que dizia "para nada mais"); o aviso é a faixa "Os Termos mudaram". **Para o advogado:** o padrão ligado basta, ou deveria nascer desligado (ou desligado para menores de 18)?
- **Ponto novo (08/11/2026), contagem de uso:** o jogo passa a contar o funil do X1 e onde as pessoas desistem (`docs/jogos/contas.md`, "Contagem de uso"): toques em compartilhar, links abertos, desafios aceitos, começados e terminados, revanche e a etapa em que a pessoa sai. Nenhuma tabela guarda torcedor, apelido, IP ou o código do desafio. Para ligar o envio à abertura do mesmo desafio, guarda por 30 dias uma impressão do código (HMAC com um segredo do servidor: de fora, não volta ao código nem leva à pessoa; quem administra o servidor, com o segredo, consegue ligar a impressão ao X1 e a quem o criou enquanto o X1 existir); depois fica só a contagem por dia. Para limitar envios repetidos, uma impressão da sessão ou, sem sessão, do IP fica no máximo um minuto numa tabela separada. Vale para todas as idades, sem opção de desligar. Frase nova na Política ("Contagem de uso": a impressão "só o servidor do jogo consegue ligar ao desafio, e só enquanto ele existe"; a da sessão ou do IP fica um minuto) e `DATA_DA_VERSAO` em 08/11/2026. Só X1 que existe vira linha, uma por X1 e evento (revisão C01-seg). **Para o advogado:** contagem anônima com impressão por 30 dias precisa de consentimento ou opção de recusar, inclusive para menores de 18, ou basta a frase na Política (legítimo interesse, dado anonimizado)? A impressão do IP por um minuto, só para o limite, precisa aparecer na tabela "O que o jogo guarda"?

## Resumo em 30 segundos

| Promessa | Situação | Prova e comentário |
|---|---|---|
| De graça, sem aposta, anúncio nem compra | **Cumpre** | Não há código de anúncio nem de venda. O único dinheiro é o apoio opcional (`src/telas/apoio.ts`) e o link de sócio, ambos links para fora. Ver item 9 dos Termos. |
| Não precisa de nome, e-mail ou telefone | **Cumpre** | Login anônimo: `src/servidor/api.ts:47`. Nenhum campo desses na `torcedores` (`supabase/migrations/20261019000000_base.sql:35`). |
| "Ninguém te vê no ranking: só a sua torcida aparece" | **Cumpre** | `ranking_semana` é por time (`20261019000000_base.sql:248`). A posição pessoal é só a própria (`20261020300000_pre_temporada.sql:3-6`). Nenhuma tela lista pessoas. Ver nota abaixo sobre o desafio por link. |
| Não tem chat | **Cumpre** | Não há tabela nem tela de mensagem entre jogadores. O texto livre que existe é o "Achei um erro", que só o administrador lê. |
| Zoeira com o time, nunca com pessoas | **Cumpre** (regra de conteúdo) | Regra do `docs/jogo.md` seção 8 e `docs/narrador.md`. Não é verificável por código além do teste de palavras proibidas (`src/palavrasProibidas.test.ts`). |
| Os pontos são conferidos; trapaça tira a partida do ranking | **Cumpre** | O resultado é recalculado no servidor. Partida suspeita fica fora do ranking: `20261019000000_base.sql:163,171,282` (`not p.sob_suspeita`). |
| Pode pedir para apagar os dados | **Cumpre em parte** | Botão e função existem (`src/telas/termos.ts`, `20261031100200_apagar_meus_dados.sql`; desde 02/11, `20261102000100_termos_x_jogo.sql` apaga também as mensagens). Ver item 6. |

## Termos de Uso, item por item

| # | Afirmação | Situação | Prova e comentário |
|---|---|---|---|
| 1 | Jogo independente, sem ligação com clubes | **Cumpre** | Sem escudo, uniforme oficial nem imagem de jogador (regra no `CLAUDE.md`; bonecos em `docs/bonecos.md`). |
| 2 | "Por dia, só algumas partidas contam pontos" | **Cumpre** | Teto de 5 partidas por dia: `20261020200000_time_do_dia.sql:4` (comentário "teto diário das 5 partidas") e `src/jogo/statusJogos.ts:7`. Vale também para o Crava (teto de 300 por rodada, `src/jogo/crava.ts:15`). |
| 3 | Nada é vendido; ninguém compra pontos, vidas ou vantagem | **Cumpre** | Não existe loja. O apoio "não dá vantagem" (`docs/jogo.md` seção 7). |
| 4 | Zero aposta; palpites valem só pontos | **Cumpre** | `palpites` e `crava_pontos` guardam só pontos (`20261019200000_crava.sql`). Teste de palavras proibidas cobre o texto. |
| 5 | "Apelido ofensivo é bloqueado ou apagado" | **Passou a cumprir** (02/11/2026) | **Bloqueado:** sim, ao salvar (`20261019000000_base.sql:79-121`, `apelido_bloqueado`). **Apagado:** seção "Apagar apelido" no `#admin` (`src/telas/adminApelido.ts`; `apelido_contar` e `apelido_apagar` em `20261102000100_termos_x_jogo.sql`): busca o apelido exato, mostra quantos usam e limpa dos torcedores e dos desafios, com confirmação. O registro guarda só quando e quantos. **Limite:** o aparelho da pessoa ainda tem o apelido e o manda de novo se ela trocar de time ou o login for refeito; para impedir de vez, pôr a palavra em `palavras_bloqueadas`. |
| 6 | "O servidor confere todas as partidas" | **Cumpre** | Pênaltis, Prova e Time do Dia são fechados por funções do servidor (`supabase/functions/fechar-partida`, `prova`, `time-do-dia`). |
| 6b | Partida suspeita fica fora até ser revisada | **Cumpre** | Fila e revisão: `20261027000200_revisao_suspeitas.sql`. |
| 6c | "Quem insistir em trapacear pode ter os pontos zerados" | **Não cumpre** | O administrador só pode **liberar** ou **manter fora** uma partida (mesma migração). Não existe ação de zerar os pontos de uma pessoa. Saídas: criar a ação (e o registro do motivo); ou trocar por "ter as partidas suspeitas mantidas fora do ranking". |
| 7 | Perguntas, lances e Casa contam fatos **com fonte** | **Cumpre** | Fonte obrigatória nas tabelas (`fonte ~ '^https?://'`, `20261020200000_time_do_dia.sql:23-25`) e nas fichas da Casa (`docs/casa.md`). Conferência dos 808 títulos da Casa fechada em 07/11/2026 (todos `revisada`, `dados/casa/RELATORIO.md` seção 6); seguem fora do ar, em rascunho, 3 recordes e 2 goleadas. Estaduais revistos em 07/11/2026: listas oficiais da FPF e da FCF, páginas anuais da FGF e, onde a federação não publica lista (FERJ, FMF, FBF), duas ou três listas independentes por título. |
| 7b | Bonecos inventados; sem escudo nem uniforme oficial | **Cumpre** | Regra de produto; ver `docs/bonecos.md`. |
| 8 | Botões para sites oficiais; "antes de sair, o jogo avisa" | **Cumpre em parte** | Aviso único em `src/telas/saida.ts:30-41`. Ficam sem aviso, com `data-sem-aviso`: os botões do WhatsApp (`src/telas/resultado.ts:194`, `provaResultado.ts:83`, `timeDoDia.ts:351`), as fontes do `#admin` e o "Seja sócio" (esse tem folha própria, `casa/tela.ts:114`). O WhatsApp **não é** site de clube, mas o texto diz "antes de sair". Saídas: avisar também no WhatsApp; ou escrever "exceto o botão de compartilhar". |
| 9 | Apoio financeiro só 18+, sem vantagem | **Cumpre** | `podeVerApoio` (`src/jogo/faixaEtaria.ts:21`, usado em `src/telas/apoio.ts:22`) e barreira "Sou maior de 18 ou responsável" (`docs/jogo.md` seção 13). **Limite:** a faixa é declarada pela própria pessoa, sem prova. O texto não promete verificação, mas o advogado deve saber. |
| 9b | "Seja sócio" não aparece nos Termos | Ver "O que o texto não diz". |
| 10 | Pré-temporada: pontos e rankings podem zerar | **Cumpre** | `npm run zerar-pre-temporada` (`docs/jogo.md` seção 12). |
| 11 | "Quando a mudança for importante, o jogo avisa" | **Passou a cumprir** (02/11/2026) | O aparelho guarda a versão vista (`termosVistos` em `gdt:prefs`). Quando `DATA_DA_VERSAO` (`src/jogo/termos.ts`) muda, a Home mostra a faixa "Os Termos mudaram · Ler" até a pessoa abrir `#termos`; não bloqueia o jogo (`avisoDosTermos`, `src/telas/inicio.ts`). Aparelho que nunca guardou versão guarda a atual sem aviso. **Atenção:** o aviso só sai se alguém mudar a data ao mudar o texto. Limpar os dados do site também apaga a versão vista. |

## Política de Privacidade, item por item

### Tabela "O que o jogo guarda"

| Linha | Situação | Prova e comentário |
|---|---|---|
| Código aleatório do aparelho | **Cumpre** | Id do login anônimo (`src/servidor/api.ts:47`). |
| Seu time | **Cumpre** | `torcedores.time_id`. |
| Partidas, respostas e palpites | **Cumpre** | `partidas`, `prova_respostas`, `palpites`. |
| Faixa de idade | **Cumpre** | Coluna `faixa_etaria` (`20261031100000_faixa_etaria.sql`); só a pessoa lê a sua (`base.sql:41`). Nas métricas, só a contagem por faixa. |
| Apelido: "aparecer só para quem você manda um desafio" | **Cumpre** | O desafio devolve o apelido a quem abre o link (`base.sql:213`, `prova.sql:58`). Atenção: o apelido também fica salvo no desafio e na tela de quem recebe (`src/telas/inicio.ts:362`). |
| Sua cidade: "somar no ranking de cidades e estados, nunca com seu apelido" | **Cumpre ao aplicar a migração da cidade** (04/11/2026) | A linha voltou ao texto. Tela de escolha em `src/telas/cidade.ts` (`#cidade`), chamadas `escolher_cidade` e `minha_cidade` em `src/servidor/cidade.ts`, lista do IBGE em `public/dados/municipios.json`. "Ver meus dados" mostra a cidade. A cidade não aparece junto do apelido em nenhum ranking nem tela pública (só a própria pessoa vê as duas, no Perfil e em "Ver meus dados"). Enquanto o servidor da parte A não estiver publicado, a escolha falha com aviso e a linha não é verdade. `DATA_DA_VERSAO` mudou para 04/11/2026 (aviso "Os Termos mudaram"). |
| Endereço do navegador, 1 aviso por semana, só 18+ | **Cumpre** | `salvar_inscricao_push` recusa quem não é 18+ (`20261031100000_faixa_etaria.sql`); o envio desinscreve outras faixas (`supabase/functions/enviar-push/index.ts:47-58`); um aviso por domingo às 18h (`20261026000300_push.sql`, cron `0 21 * * 0`). "Se você pedir": o convite é opcional (`src/telas/convitePush.ts`). |
| Boneco do avatar: corpo, tom de pele, cabelo, número e peças | **Cumpre ao publicar o servidor do boneco** (05/11/2026) | Tabela `torcedor_boneco`, só códigos curtos (`20261106300000_boneco.sql`), lida e gravada só pela função `boneco`. "Ver meus dados" mostra que há boneco, sem a vestimenta. Some com a conta (apagar, contas paradas, junção), não entra no `npm run metricas` nem no balanço. Tom de pele e corpo estão nos pontos a confirmar com o advogado (Resumo). `DATA_DA_VERSAO` mudou para 05/11/2026. **Desde 07/11/2026** (`20261107000000_boneco_em_campo.sql`): quem recebe um desafio vê as peças de campo do boneco de quem chamou (`ver_desafio` e `ver_desafio_lances`, conferidas por `boneco_para_campo`), só com o interruptor "Meu boneco em campo" ligado; a Política diz isso na linha do boneco, e "Ver meus dados" mostra o interruptor. |
| Contagem de uso ("sem guardar quem foi") | **Cumpre ao publicar a função `funil`** (08/11/2026) | Tabelas `funil_contagem`, `funil_eventos` (30 dias) e `funil_limite` (`20261108000000_funil_x1.sql`), sem coluna de pessoa, IP ou código (o teste `supabase/testes/funil.test.ts` confere as colunas). Não entra em "Ver meus dados" nem em "Apagar meus dados", porque nada liga a linha à conta. Ponto para o advogado no Resumo. |
| Mensagem do "Achei um erro" | **Cumpre em parte** | A mensagem é guardada (`20261019220000_feedback.sql`). Mas junto vão a **tela** em que a pessoa estava e o **navegador/aparelho** (até 300 caracteres do `userAgent`, `src/servidor/api.ts:476`). O texto só cita a mensagem. Saídas: dizer "mais a tela e o tipo de aparelho"; ou parar de enviar o navegador. |

### O resto da Política

| Afirmação | Situação | Prova e comentário |
|---|---|---|
| "Não pede nome, e-mail, telefone, foto, data de nascimento, endereço ou localização" | **Cumpre** | Nenhum campo desses. O `#admin` usa e-mail, mas é conta do dono, não de jogador. |
| Dados no Supabase, em São Paulo | **Cumpre** | Região registrada em `docs/jogo.md` seção 12 (projeto `ybfeqykdnqmnufrgtnoc`). Não conferi no painel; é só leitura de documento. |
| "**Só você lê os seus**" | **Cumpre em parte** | As tabelas do jogador têm RLS "cada um lê o seu" (`base.sql:41,174,205`; `crava.sql:144,189,222`; `carreira.sql:31,49`). Mas: (a) o administrador lê **todos os feedbacks** (`feedback.sql:36`, `sou_admin()`); (b) lê a **fila de suspeitas**, com o começo do id, time, pontos e histórico (`revisao_suspeitas.sql:25-60`), sem o apelido; (c) as funções do servidor (secret key) e o dono do projeto Supabase leem tudo. Saídas: escrever "só você lê os seus dados de jogo; o administrador lê o que você manda em 'Achei um erro' e partidas marcadas como suspeitas"; ou mudar o jogo (muito mais difícil para a fila de suspeitas). |
| O site é servido pelo GitHub Pages | **Cumpre** | `public/CNAME`, `docs/jogo.md` seção 12. |
| "Uma checagem invisível da Cloudflare confere que você não é um robô" | **Não cumpre hoje** | O código está pronto (`src/servidor/captcha.ts`, usado em `src/servidor/api.ts:69`), mas `VITE_TURNSTILE_SITE_KEY` está vazia em `.env.production` e o CAPTCHA não está ligado no painel do Supabase. Sem a chave, nenhuma requisição à Cloudflare é feita. Saídas: ligar (3 passos do Kauê em `docs/proximos-passos.md`) antes de divulgar; ou tirar a frase até ligar. Ao ligar, a Cloudflare passa a receber o acesso de quem joga pela primeira vez. |
| O aviso semanal passa pelo serviço do navegador | **Cumpre** | Web Push; o endereço do navegador é de Google, Apple ou Mozilla (`enviar-push/index.ts:62`, loga o domínio do endpoint). |
| Ninguém compra nem recebe os dados para anúncio | **Cumpre** | Sem integração de anúncio. Sem Google Analytics, pixel nem fonte externa (busca por `gtag`, `fonts.googleapis` e `cdn.` no `index.html` e `src`: nada). |
| Sem rastreio: não segue em outros sites, sem perfil | **Cumpre em parte** | Sem rastreador de terceiros. Mas o jogo guarda carreira (XP), histórico de partidas e a contagem de cliques do "Seja sócio" (esta sem id de pessoa, `20261031000000_cliques_socio.sql`). O link de sócio leva `utm_source=guerradetorcidas` (`casa/socio.ts:7`), então o **site do clube** sabe que a visita veio do jogo. Isso não é perfil, mas é rastro para fora. Sugestão: dizer isso. |
| Escolhas guardadas só no aparelho | **Cumpre** | Chaves `gdt:*` em `localStorage`: prefs, qualidade gráfica, apoio, narrador, carreira, posições, cliques de sócio. Todas locais. |
| "**Por quanto tempo:** enquanto você jogar. Contas paradas por muito tempo são apagadas." | **Não cumpre** | **Não existe a rotina.** Os crons do banco são só `crava-sincronizar`, `carreira-fechar`, `job_aviso_domingo` (e os de conteúdo). Nenhum apaga usuário anônimo. Só há menção a "limpeza de usuários anônimos inativos" como tarefa futura (`docs/jogo.md` seção 12, "Antes de divulgar") e comentário em `src/servidor/api.ts:49`. Falta também o prazo (decisão do Kauê). Saídas: criar o cron com um prazo (por exemplo, 12 meses sem jogar; antes de apagar, guardar o total de pontos como no "Apagar meus dados"); ou tirar a frase e dizer "até você pedir para apagar". |
| "Você, ou seu responsável, pode pedir para **ver** ou apagar seus dados" | **Passou a cumprir** (ver, 02/11/2026) / **Cumpre em parte** (apagar) | **Apagar:** botão em `#termos` chama `apagar_meus_dados` (`20261031100200_apagar_meus_dados.sql`, refeita em `20261102000100_termos_x_jogo.sql`). **Ver:** botão "Ver meus dados" na `#termos` chama `ver_meus_dados` (só leitura, só de quem chama) e mostra time, apelido, faixa, partidas, Time do Dia, desafios, palpites, XP, aviso de domingo e as mensagens com a tela e o navegador. **Antes de 02/11:** não existia tela nem função de "ver meus dados". O pedido por e-mail também esbarra em outra coisa: sem login, o jogo não sabe quem é a pessoa, e o texto diz "o pedido é feito pelo próprio aparelho", mas só o apagar roda no aparelho. Saídas: criar "Ver meus dados" (mostrar o que a tabela de cima lista); ou escrever que o pedido de cópia é feito por e-mail e o Kauê responde manualmente (e explicar como identificar o aparelho). Para o **responsável**: não há como um responsável agir sem o aparelho da criança. |
| Pais: sem chat, perfil público, compra ou anúncio | **Cumpre** | Ver acima. |
| Pais: menores não recebem push nem veem apoio | **Cumpre** | `soPara18Mais` (`src/jogo/faixaEtaria.ts`), push recusado no servidor. **Quem ainda não respondeu a triagem:** não recebe (`enviar-push/index.ts`, `destinoDaInscricao`), mas o convite de push fica oculto até responder. |
| Contato por e-mail | **Cumpre** | Endereço fixo no texto e no `VAPID_SUBJECT`. Não verifiquei se a caixa existe; é com o Kauê. |
| Leis: ECA Digital e LGPD | Sem verificação | Juízo do advogado. |

## O que acontece depois de "Apagar meus dados"

Promessa: "pode pedir para apagar seus dados quando quiser".

**O que some** (cascata ao apagar o usuário anônimo, `20261031100200_apagar_meus_dados.sql:118` e o comentário no topo): torcedor (time, apelido, faixa), partidas, desafios, palpites, Time do Dia, Prova, carreira e inscrições de push. O aparelho é limpo (`src/telas/termos.ts:79-80`).

**O que fica** (desde 02/11/2026, só os itens 1, 3 e 4):

1. **Total de pontos por semana e por time**, sem id da pessoa, na tabela `pontos_apagados`, somado ao ranking como "um torcedor anônimo" (mesmo arquivo, linhas 8-20 e 28-40). A tela avisa disso (`AVISO_APAGAR`, `src/telas/termos.ts:10-11`), mas a **Política não diz**. Como não há id, o total não identifica ninguém; o advogado decide se isso basta como "apagar".
2. ~~**Os feedbacks**~~ **Resolvido em 02/11/2026:** `apagar_meus_dados` apaga as mensagens do "Achei um erro", texto e tudo, antes do usuário (`20261102000100_termos_x_jogo.sql`). Antes, a linha ficava sem o `usuario_id`, com o texto livre.
3. **Cliques do "Seja sócio"** e **respostas da Prova** (calibragem) não têm id de pessoa e ficam. Contagem de cliques: sem dado pessoal. Respostas: ver `prova.sql:109`.
4. **Anulação para conta de verdade** (`#admin`): recusada.

Saídas gerais: (a) dizer tudo isso na Política, em "Seus direitos"; ou (b) mudar o jogo para apagar também o texto do feedback (feito em 02/11/2026). Falta (a): o total de pontos da semana continua em `pontos_apagados`, por decisão.

## Proposta para o advogado: código do torcedor (03/11/2026)

O jogo passou a ligar uma carreira em vários aparelhos por um código de 8 caracteres (`docs/jogo.md`, seção 14.1). **O texto de `src/dados/termos.md` não mudou.** Estas são as frases propostas para levar ao advogado:

**Termos de Uso, item novo ("Jogar em outro aparelho"):**
> No Perfil, "Jogar em outro aparelho" mostra um código de 8 caracteres e um QR, que valem por 10 minutos e uma vez só. Quem digitar ou escanear esse código passa a ser o mesmo torcedor que você, com a mesma carreira, time e pontos, e pode fazer tudo o que você faz, inclusive desconectar aparelhos e apagar a conta. Por isso, não mande o código para ninguém. Se aparecer em "Aparelhos ligados" um aparelho que você não reconhece, toque em "Desconectar". Se o aparelho que entra já tinha carreira, ela é juntada com a da conta: XP, medalhas e recordes passam, e os pontos que já contaram para a torcida ficam onde estão.

**Política de Privacidade, linhas novas na tabela "O que o jogo guarda sobre você":**
> | Os aparelhos ligados à sua conta: quando cada um entrou, quando foi usado pela última vez e o tipo de navegador e aparelho | Mostrar em "Aparelhos ligados" e deixar você desconectar um deles | Não, é automático |
> | As tentativas de digitar um código: o código aleatório do aparelho e a hora (nunca o que foi digitado) | Barrar quem tenta adivinhar códigos | Não, é automático. Apagadas em 2 dias |

**Política de Privacidade, depois da tabela:**
> O código de 8 caracteres não fica guardado: o servidor guarda só uma impressão digital dele, que deixa de valer em 10 minutos e é apagada em 2 dias. Para ligar aparelhos, a conta ganha um identificador interno no formato de e-mail, sorteado, que não recebe mensagens. Ele não é o seu e-mail e não aparece em lugar nenhum.

**Política de Privacidade, "Seus direitos", frase nova:**
> Se a sua conta está em mais de um aparelho, ver e apagar os dados funciona em qualquer um deles, e apagar tira a conta de todos.

**Pontos para o advogado olhar:**
- **IP e navegador de cada sessão:** a Supabase já guardava os dois em cada sessão antes do código. O jogo mostra só o navegador, nunca o IP. A tabela da Política não cita esse registro do Auth.
- **Quem tem o código vira dono da conta:** um menor pode passar o código a outra pessoa. A tela avisa, e a lista de aparelhos permite desconectar.
- **Identificador interno em formato de e-mail:** ele não é dado pessoal da pessoa, mas está na tabela de usuários do Auth. Convém confirmar que a frase acima basta.

## Mudança de redação (06/11/2026, J35 das jornadas simuladas)

Em "Seus direitos" (Termos e Política), "Ao apagar, saem o código do aparelho, o seu histórico e as suas mensagens" passou a dizer "…e as suas mensagens do Achei um erro". Motivo: a página diz que o jogo não tem chat, e a frase solta deixava a dúvida de quais mensagens. O sentido jurídico é o mesmo (o texto do feedback some junto, ver "O que acontece depois de Apagar meus dados"). `DATA_DA_VERSAO` foi para 06/11/2026, então todo mundo vê a faixa "Os Termos mudaram · Ler"; o Kauê aceitou isso. Levar esta troca na lista da revisão do advogado.

Nos itens do código do torcedor abaixo, o botão do Perfil agora se chama "Outro aparelho" e abre duas opções ("Levar minha conta pra outro aparelho" e "Entrar com o código de outro aparelho"); o texto proposto continua valendo, só o nome do botão mudou.

## O que o jogo faz e o texto não diz

1. **Feedback leva a tela e o navegador** (`src/servidor/api.ts:476`; `feedback.sql:10-11`).
2. **Total de pontos fica depois de apagar** (acima).
3. ~~**O texto do feedback fica depois de apagar**~~ Resolvido em 02/11/2026: some junto.
4. **"Seja sócio"**: o bloco da Casa leva a sites de programas de sócio (pagos), com `utm_source=guerradetorcidas`; clicar é contado no servidor, sem id de pessoa (`20261031000000_cliques_socio.sql`). **Desde 02/11/2026 só para 18+**, com a mesma regra do apoio (`podeVerSocio`); quem não respondeu a triagem não vê. O texto dos Termos ainda não cita o bloco: o item 9 só trata do "apoio ao jogo".
5. **O que o administrador vê** (feedbacks, fila de suspeitas) e que existe um painel `#admin` com login de verdade.
6. **A Cloudflare só passa a existir quando ligar** o CAPTCHA, e aí vê o acesso no primeiro login.
7. **Triagem de idade é autodeclarada**, sem verificação, e guarda só a faixa (`docs/jogo.md` seção 13). Também vale pelo aparelho: limpar os dados do site faz a pergunta voltar.
8. **Provedores de infraestrutura** que veem o acesso: Supabase, GitHub Pages (IP e navegador), e o serviço de push do navegador. O texto cita os três; não diz que o IP chega a eles.
9. **Código do torcedor** (desde 03/11/2026): aparelhos ligados, tentativas de código e o identificador interno. Texto proposto na seção acima, ainda não aplicado.

Fora do alcance desta lista: logs do Supabase (IP, user agent) e prazo de retenção deles, que dependem do plano e do painel.

## Decisões que ficam com o Kauê

1. **Contas paradas:** que prazo? E o total de pontos guarda como no apagar?
2. **Cidade:** tirar do texto agora, ou construir antes de divulgar?
3. **CAPTCHA:** ligar antes de divulgar (então o texto fica), ou sem CAPTCHA (então tirar a frase).
4. ~~**Aviso de mudança:**~~ construído (01/11/2026).
5. ~~**"Ver meus dados":**~~ construído (01/11/2026).
6. **Zerar pontos de trapaceiro:** criar a ação ou ajustar o texto. ~~Apagar apelido~~: construído (01/11/2026).
7. **O que fica ao apagar:** o texto das mensagens passou a sumir (01/11/2026); o total de pontos fica, e o texto precisa dizer isso.

Este documento não substitui a revisão do advogado. Cada linha acima usa o que o código faz **hoje**; se o código mudar, a linha muda.
