# Termos × jogo

> Levantamento de 31/10/2026 para o Kauê e o advogado. Compara cada promessa de `src/dados/termos.md` com o que o jogo faz de verdade (código e migrações; banco só pelo que as migrações definem). **Não é parecer jurídico** e não altera os Termos. Para cada divergência há duas saídas: mudar o jogo ou mudar o texto. Quem escolhe é o Kauê.

## Resumo

- A maioria das promessas de jogo cumpre. As divergências estão na tabela abaixo; o que o jogo faz e o texto não diz está na penúltima seção.

### As divergências, por ordem de peso

| # | Divergência | Situação | Saídas |
|---|---|---|---|
| 1 | Apagar contas paradas | Não cumpre | Criar a rotina, ou tirar a frase |
| 2 | Aviso de mudança na tela inicial | Não cumpre | Criar o aviso, ou dizer onde a mudança fica |
| 3 | Ranking de cidades | Não cumpre | Tirar a cidade do texto agora, ou construir a cidade |
| 4 | Checagem da Cloudflare | Não cumpre hoje (passo 2 de 3 feito em 01/11: chave pública no site; falta ligar no painel do Supabase) | Ligar o CAPTCHA (passo 3 do Kauê), ou tirar a frase |
| 5 | "Só você lê os seus" | Cumpre em parte | Reescrever a frase, ou separar o que o administrador lê |
| 6 | Depois de "Apagar meus dados" | Cumpre em parte | Dizer o que fica, ou mudar o que fica |
| 7 | Direito de "ver" os dados | Não cumpre | Criar um "ver meus dados", ou dizer que só existe apagar |
| 8 | Trapaça "pode ter os pontos zerados" | Não cumpre | Criar a ação no `#admin`, ou mudar a frase |
| 9 | Apelido ofensivo "apagado" | Cumpre em parte | Criar a ação no `#admin`, ou dizer só "bloqueado" |
| 10 | "Antes de sair, o jogo avisa" | Cumpre em parte | Avisar também no WhatsApp, ou dizer a exceção |

## Resumo em 30 segundos

| Promessa | Situação | Prova e comentário |
|---|---|---|
| De graça, sem aposta, anúncio nem compra | **Cumpre** | Não há código de anúncio nem de venda. O único dinheiro é o apoio opcional (`src/telas/apoio.ts`) e o link de sócio, ambos links para fora. Ver item 9 dos Termos. |
| Não precisa de nome, e-mail ou telefone | **Cumpre** | Login anônimo: `src/servidor/api.ts:47`. Nenhum campo desses na `torcedores` (`supabase/migrations/20261019000000_base.sql:35`). |
| "Ninguém te vê no ranking: só a sua torcida aparece" | **Cumpre** | `ranking_semana` é por time (`20261019000000_base.sql:248`). A posição pessoal é só a própria (`20261020300000_pre_temporada.sql:3-6`). Nenhuma tela lista pessoas. Ver nota abaixo sobre o desafio por link. |
| Não tem chat | **Cumpre** | Não há tabela nem tela de mensagem entre jogadores. O texto livre que existe é o "Achei um erro", que só o administrador lê. |
| Zoeira com o time, nunca com pessoas | **Cumpre** (regra de conteúdo) | Regra do `docs/jogo.md` seção 8 e `docs/narrador.md`. Não é verificável por código além do teste de palavras proibidas (`src/palavrasProibidas.test.ts`). |
| Os pontos são conferidos; trapaça tira a partida do ranking | **Cumpre** | O resultado é recalculado no servidor. Partida suspeita fica fora do ranking: `20261019000000_base.sql:163,171,282` (`not p.sob_suspeita`). |
| Pode pedir para apagar os dados | **Cumpre em parte** | Botão e função existem (`src/telas/termos.ts`, `20261031100200_apagar_meus_dados.sql`). Ver item 6. |

## Termos de Uso, item por item

| # | Afirmação | Situação | Prova e comentário |
|---|---|---|---|
| 1 | Jogo independente, sem ligação com clubes | **Cumpre** | Sem escudo, uniforme oficial nem imagem de jogador (regra no `CLAUDE.md`; bonecos em `docs/bonecos.md`). |
| 2 | "Por dia, só algumas partidas contam pontos" | **Cumpre** | Teto de 5 partidas por dia: `20261020200000_time_do_dia.sql:4` (comentário "teto diário das 5 partidas") e `src/jogo/statusJogos.ts:7`. Vale também para o Crava (teto de 300 por rodada, `src/jogo/crava.ts:15`). |
| 3 | Nada é vendido; ninguém compra pontos, vidas ou vantagem | **Cumpre** | Não existe loja. O apoio "não dá vantagem" (`docs/jogo.md` seção 7). |
| 4 | Zero aposta; palpites valem só pontos | **Cumpre** | `palpites` e `crava_pontos` guardam só pontos (`20261019200000_crava.sql`). Teste de palavras proibidas cobre o texto. |
| 5 | "Apelido ofensivo é bloqueado ou apagado" | **Cumpre em parte** | **Bloqueado:** sim, ao salvar (`20261019000000_base.sql:79-121`, `apelido_bloqueado`). **Apagado:** não há ferramenta no `#admin` para apagar o apelido de alguém que já passou pelo filtro. Só dá para o administrador mexer direto no banco. Saídas: criar a ação no `#admin`; ou o texto dizer só "bloqueado". |
| 6 | "O servidor confere todas as partidas" | **Cumpre** | Pênaltis, Prova e Time do Dia são fechados por funções do servidor (`supabase/functions/fechar-partida`, `prova`, `time-do-dia`). |
| 6b | Partida suspeita fica fora até ser revisada | **Cumpre** | Fila e revisão: `20261027000200_revisao_suspeitas.sql`. |
| 6c | "Quem insistir em trapacear pode ter os pontos zerados" | **Não cumpre** | O administrador só pode **liberar** ou **manter fora** uma partida (mesma migração). Não existe ação de zerar os pontos de uma pessoa. Saídas: criar a ação (e o registro do motivo); ou trocar por "ter as partidas suspeitas mantidas fora do ranking". |
| 7 | Perguntas, lances e Casa contam fatos **com fonte** | **Cumpre** | Fonte obrigatória nas tabelas (`fonte ~ '^https?://'`, `20261020200000_time_do_dia.sql:23-25`) e nas fichas da Casa (`docs/casa.md`). Conferência humana ainda em andamento (35 de 808 títulos pendentes, `docs/proximos-passos.md`). Conferir isso antes de divulgar. |
| 7b | Bonecos inventados; sem escudo nem uniforme oficial | **Cumpre** | Regra de produto; ver `docs/bonecos.md`. |
| 8 | Botões para sites oficiais; "antes de sair, o jogo avisa" | **Cumpre em parte** | Aviso único em `src/telas/saida.ts:30-41`. Ficam sem aviso, com `data-sem-aviso`: os botões do WhatsApp (`src/telas/resultado.ts:194`, `provaResultado.ts:83`, `timeDoDia.ts:351`), as fontes do `#admin` e o "Seja sócio" (esse tem folha própria, `casa/tela.ts:114`). O WhatsApp **não é** site de clube, mas o texto diz "antes de sair". Saídas: avisar também no WhatsApp; ou escrever "exceto o botão de compartilhar". |
| 9 | Apoio financeiro só 18+, sem vantagem | **Cumpre** | `podeVerApoio` (`src/jogo/faixaEtaria.ts:21`, usado em `src/telas/apoio.ts:22`) e barreira "Sou maior de 18 ou responsável" (`docs/jogo.md` seção 13). **Limite:** a faixa é declarada pela própria pessoa, sem prova. O texto não promete verificação, mas o advogado deve saber. |
| 9b | "Seja sócio" não aparece nos Termos | Ver "O que o texto não diz". |
| 10 | Pré-temporada: pontos e rankings podem zerar | **Cumpre** | `npm run zerar-pre-temporada` (`docs/jogo.md` seção 12). |
| 11 | "Quando a mudança for importante, o jogo avisa" | **Não cumpre** | Não existe aviso de mudança. A tela `#termos` só mostra "Versão em revisão · 31/10/2026" (`src/telas/termos.ts:24`), e a data é uma constante manual (`src/jogo/termos.ts:4`). Nada na Home compara a versão que a pessoa viu. Saídas: criar o aviso (guardar a versão vista no aparelho e mostrar uma faixa na Home quando mudar); ou o texto dizer só "a versão e a data ficam na página de Termos". |

## Política de Privacidade, item por item

### Tabela "O que o jogo guarda"

| Linha | Situação | Prova e comentário |
|---|---|---|
| Código aleatório do aparelho | **Cumpre** | Id do login anônimo (`src/servidor/api.ts:47`). |
| Seu time | **Cumpre** | `torcedores.time_id`. |
| Partidas, respostas e palpites | **Cumpre** | `partidas`, `prova_respostas`, `palpites`. |
| Faixa de idade | **Cumpre** | Coluna `faixa_etaria` (`20261031100000_faixa_etaria.sql`); só a pessoa lê a sua (`base.sql:41`). Nas métricas, só a contagem por faixa. |
| Apelido: "aparecer só para quem você manda um desafio" | **Cumpre** | O desafio devolve o apelido a quem abre o link (`base.sql:213`, `prova.sql:58`). Atenção: o apelido também fica salvo no desafio e na tela de quem recebe (`src/telas/inicio.ts:362`). |
| Sua cidade: "somar no ranking de cidades, nunca com seu apelido" | **Não cumpre** | **Não existe campo de cidade.** Nenhuma coluna `cidade` em `torcedores`, nenhuma tela de escolha, nenhum ranking de cidades (só aparece no `docs/jogo.md` seções 3 e 5, como plano). A única `cidade` do banco é a do clube do Time do Dia (`20261020200000_time_do_dia.sql:14`). Saídas: tirar a linha do texto até a cidade existir; ou construir a cidade. Se construir, o texto acompanha: mínimo de 5 jogadores por cidade já está decidido. |
| Endereço do navegador, 1 aviso por semana, só 18+ | **Cumpre** | `salvar_inscricao_push` recusa quem não é 18+ (`20261031100000_faixa_etaria.sql`); o envio desinscreve outras faixas (`supabase/functions/enviar-push/index.ts:47-58`); um aviso por domingo às 18h (`20261026000300_push.sql`, cron `0 21 * * 0`). "Se você pedir": o convite é opcional (`src/telas/convitePush.ts`). |
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
| "Você, ou seu responsável, pode pedir para **ver** ou apagar seus dados" | **Não cumpre** (ver) / **Cumpre em parte** (apagar) | **Apagar:** botão em `#termos` chama `apagar_meus_dados` (`20261031100200_apagar_meus_dados.sql`). **Ver:** não existe tela nem função de "ver meus dados". O pedido por e-mail também esbarra em outra coisa: sem login, o jogo não sabe quem é a pessoa, e o texto diz "o pedido é feito pelo próprio aparelho", mas só o apagar roda no aparelho. Saídas: criar "Ver meus dados" (mostrar o que a tabela de cima lista); ou escrever que o pedido de cópia é feito por e-mail e o Kauê responde manualmente (e explicar como identificar o aparelho). Para o **responsável**: não há como um responsável agir sem o aparelho da criança. |
| Pais: sem chat, perfil público, compra ou anúncio | **Cumpre** | Ver acima. |
| Pais: menores não recebem push nem veem apoio | **Cumpre** | `soPara18Mais` (`src/jogo/faixaEtaria.ts`), push recusado no servidor. **Quem ainda não respondeu a triagem:** não recebe (`enviar-push/index.ts`, `destinoDaInscricao`), mas o convite de push fica oculto até responder. |
| Contato por e-mail | **Cumpre** | Endereço fixo no texto e no `VAPID_SUBJECT`. Não verifiquei se a caixa existe; é com o Kauê. |
| Leis: ECA Digital e LGPD | Sem verificação | Juízo do advogado. |

## O que acontece depois de "Apagar meus dados"

Promessa: "pode pedir para apagar seus dados quando quiser".

**O que some** (cascata ao apagar o usuário anônimo, `20261031100200_apagar_meus_dados.sql:118` e o comentário no topo): torcedor (time, apelido, faixa), partidas, desafios, palpites, Time do Dia, Prova, carreira e inscrições de push. O aparelho é limpo (`src/telas/termos.ts:79-80`).

**O que fica:**

1. **Total de pontos por semana e por time**, sem id da pessoa, na tabela `pontos_apagados`, somado ao ranking como "um torcedor anônimo" (mesmo arquivo, linhas 8-20 e 28-40). A tela avisa disso (`AVISO_APAGAR`, `src/telas/termos.ts:10-11`), mas a **Política não diz**. Como não há id, o total não identifica ninguém; o advogado decide se isso basta como "apagar".
2. **Os feedbacks**: a linha fica, só sem o `usuario_id` (`on delete set null`, `20261019220000_feedback.sql:9`). **O texto livre continua lá**, e a pessoa pode ter escrito algo que a identifique. Saídas: apagar o texto também (mudar o jogo), ou dizer que a mensagem fica sem o vínculo.
3. **Cliques do "Seja sócio"** e **respostas da Prova** (calibragem) não têm id de pessoa e ficam. Contagem de cliques: sem dado pessoal. Respostas: ver `prova.sql:109`.
4. **Anulação para conta de verdade** (`#admin`): recusada.

Saídas gerais: (a) dizer tudo isso na Política, em "Seus direitos"; ou (b) mudar o jogo para apagar também o texto do feedback.

## O que o jogo faz e o texto não diz

1. **Feedback leva a tela e o navegador** (`src/servidor/api.ts:476`; `feedback.sql:10-11`).
2. **Total de pontos fica depois de apagar** (acima).
3. **O texto do feedback fica depois de apagar** (acima).
4. **"Seja sócio"**: o bloco da Casa leva a sites de programas de sócio (pagos) para **qualquer idade**, com `utm_source=guerradetorcidas`; clicar é contado no servidor, sem id de pessoa (`20261031000000_cliques_socio.sql`). O item 9 só trata do "apoio ao jogo". O bloco "Seja sócio" pode ser lido como compra para menores: decisão de produto.
5. **O que o administrador vê** (feedbacks, fila de suspeitas) e que existe um painel `#admin` com login de verdade.
6. **A Cloudflare só passa a existir quando ligar** o CAPTCHA, e aí vê o acesso no primeiro login.
7. **Triagem de idade é autodeclarada**, sem verificação, e guarda só a faixa (`docs/jogo.md` seção 13). Também vale pelo aparelho: limpar os dados do site faz a pergunta voltar.
8. **Provedores de infraestrutura** que veem o acesso: Supabase, GitHub Pages (IP e navegador), e o serviço de push do navegador. O texto cita os três; não diz que o IP chega a eles.

Fora do alcance desta lista: logs do Supabase (IP, user agent) e prazo de retenção deles, que dependem do plano e do painel.

## Decisões que ficam com o Kauê

1. **Contas paradas:** que prazo? E o total de pontos guarda como no apagar?
2. **Cidade:** tirar do texto agora, ou construir antes de divulgar?
3. **CAPTCHA:** ligar antes de divulgar (então o texto fica), ou sem CAPTCHA (então tirar a frase).
4. **Aviso de mudança:** construir ou reescrever a frase.
5. **"Ver meus dados":** construir ou mudar o texto.
6. **Zerar pontos de trapaceiro e apagar apelido:** criar as ações ou ajustar o texto.
7. **O que fica ao apagar:** dizer no texto, ou apagar mais.

Este documento não substitui a revisão do advogado. Cada linha acima usa o que o código faz **hoje**; se o código mudar, a linha muda.
