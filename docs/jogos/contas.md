# Contas, aparelhos e proteção de menores

> Regra em vigor em 08/11/2026. Quando discordar do `docs/jogo.md`, vale o `jogo.md`. Datas e histórico: `docs/decisoes.md`.
> A regra de proteção de menores (ECA Digital) está no `docs/jogo.md`; aqui ficam as partes que moram no código e nos Termos, o Código do torcedor e o Primeiro acesso.

## Regra

### Triagem de idade e 18+
- A triagem de faixa etária é autodeclarada. Vem depois de escolher o time e antes do 1º jogo: Pênaltis/Lances, Prova, Time do Dia e Crava, inclusive vindo de link de desafio. Quem já tinha time responde ao abrir o jogo.
- Só 18+ (`18_mais`) vê ou recebe: aviso de domingo (push), apoio ao projeto, "oferecido por" (ainda sem uso) e o bloco "Seja sócio" da Casa. Outra faixa é desinscrita do push (na triagem e no envio). Quem se inscreveu antes da triagem e ainda não respondeu fica sem receber, mas não é desinscrito: se responder 18+, volta a receber sem ligar de novo.
- Barreira do apoio: a `#apoie` só mostra o texto, o Pix e o link depois de "Confirmar" em "Sou maior de 18 ou responsável". Vale 30 dias por aparelho; sem armazenamento, pergunta de novo a cada visita.
- A tela não oferece trocar a faixa. Vale pelo aparelho: limpar os dados do site ou "Apagar meus dados" faz a triagem voltar.
- A faixa só aparece na tela "Ver meus dados" (a da própria pessoa). Nas métricas (`npm run metricas`), só a contagem por faixa.
- Aviso de saída: um só, pega o toque em qualquer link para outro site. Ficam de fora (`data-sem-aviso`): compartilhar no WhatsApp (é o compartilhar do próprio jogador, como o Stories, e fica no caminho do desafio), as fontes do painel `#admin` e o "Seja sócio", que já tem folha própria.

### Termos (`#termos`)
- Página com "Versão em revisão" e a data no topo. Link no rodapé da Home e na triagem. O texto não pode ter os trechos para o advogado (um teste recusa "Para o advogado revisar" e "a definir").
- O texto diz: quem é o controlador e que não há encarregado (DPO); quem lê o quê (administrador: "Achei um erro" e suspeitas); os serviços que recebem o IP; o prazo de 6 meses das contas paradas; o que fica depois de apagar; a exceção do botão de compartilhar; o link de sócio como informativo; o ranking de cidades e estados. Em "Seus direitos", "as suas mensagens do Achei um erro" (o jogo não tem chat).
- Aviso de mudança: mudar `DATA_DA_VERSAO` (hoje 07/11/2026) mostra a faixa "Os Termos mudaram · Ler" no topo da Home de quem já tinha visto outra versão, até a pessoa abrir `#termos`. Aparelho novo guarda a versão de agora sem aviso.
- Qualquer troca no texto entra na lista do advogado em `docs/termos-x-jogo.md`.

### Ver meus dados
- Botão na `#termos`, ao lado do "Apagar meus dados". Mostra em linguagem simples: time, apelido, faixa de idade, desde quando, partidas por jogo, dias de Time do Dia, desafios criados, palpites, XP da carreira, aviso de domingo (em quantos navegadores), aparelhos ligados e as mensagens do "Achei um erro" com a tela e o navegador que foram junto. Sem sessão ou sem time: "O servidor não guarda nada deste aparelho."

### Apagar meus dados
- Botão na `#termos`, com confirmação. Apaga o usuário anônimo e, em cascata, torcedor, partidas, desafios, palpites, Time do Dia, Prova, carreira e push; as mensagens do "Achei um erro" saem junto, texto e tudo. Depois limpa o aparelho (chaves `gdt` e a sessão) e volta à escolha do time.
- **Os pontos ficam no placar:** como o ranking é recalculado das partidas, antes de apagar o total de cada semana e time vai para `pontos_apagados`, sem id da pessoa, e o ranking soma essas linhas como um torcedor anônimo (o zerar da pré-temporada leva junto).
- Conta com login de verdade, como a do `#admin`, é recusada. Com o código do torcedor, a conta ligada também se apaga, em todos os aparelhos de uma vez; aparelho desconectado não apaga a conta.

### Contas paradas
- Conta anônima sem jogar há mais de **6 meses** é apagada no dia 1º de cada mês, às 4h. "Jogar" = partida (Pênaltis e Lances), Time do Dia, resposta da Prova ou palpite; abrir o site não conta. 6 meses, e não 3, para não apagar quem só joga durante o Brasileirão.
- Antes de apagar, os pontos vão para `pontos_apagados`, como no "Apagar meus dados", e as mensagens do "Achei um erro" saem junto. Conta com login de verdade e administrador nunca entram; a conta ligada pelo código do torcedor (e-mail técnico) entra como as anônimas.

### Apagar apelido (`#admin`)
- A seção "Apagar apelido" abre com a lista dos apelidos já gravados que o filtro de hoje barraria (até 200, mais usados primeiro); tocar num deles faz a busca. A busca é pelo apelido exato (só ajeita os espaços, como o salvar; maiúsculas contam), mostra quantos torcedores usam e, depois de confirmar, limpa o apelido deles e dos desafios já criados.
- `apelidos_apagados` guarda só quando e quantos torcedores, nunca o apelido. O aparelho busca o servidor uma vez por abertura e adota o apelido apagado; para impedir de vez, a palavra vai para `palavras_bloqueadas`.

### Código do torcedor (uma carreira em vários aparelhos)
- Sem login e sem dado pessoal. No Perfil há **um botão só**, "Outro aparelho", que abre uma folha com duas opções do mesmo tamanho: "Levar minha conta pra outro aparelho" (mostra um QR e um código de 8 caracteres, válido por 10 minutos e de uso único) e "Entrar com o código de outro aparelho". Quem ainda não tem time vê só a segunda. A lista "Aparelhos ligados", com "desconectar", fica no mesmo bloco, acima do botão. Digitar ou escanear o código faz do outro aparelho o mesmo torcedor: mesma carreira, medalhas, recordes, time e faixa de idade.
- Gerado e conferido só no servidor, com limite de tentativas e CAPTCHA.
- Quem tem o código vira dono da conta, com o mesmo poder (inclusive desconectar aparelhos e apagar a conta). A tela avisa: "Não mande esse código pra ninguém. Quem tiver ele entra na sua conta."
- **Juntar perfis que já têm dados:** XP recalculado pelo servidor a partir das partidas dos dois (mesma regra por dia), medalhas somam os gols por lance, recordes ficam com o maior; time diferente nos dois → a pessoa escolhe qual fica. Pontos que já entraram no ranking não mudam. Faixa de idade diferente: fica a mais protetora (a mais nova); se só uma respondeu a triagem, vale a resposta dela.
- Aparelho desconectado, ou cuja conta foi apagada em outro aparelho ou parada por 6 meses: esquece time, apelido e faixa e volta à escolha do time, com aviso.
- Desafio por link de quem juntou a conta deixa de abrir: quem abre o link cai na Home, sem erro, e só perde a indicação do desafio.
- Login com Google ou e-mail fica para depois, só para 18+ e depois do advogado com OAB.

### Primeiro acesso
- **A escolha do time é a primeira tela de quem é novo** (sem time no aparelho antes da visita). Tem a dica "Sem cadastro: escolha o time e já entra jogando. O apelido é opcional.", não tem o voltar e o botão é "Bora pro jogo". O apelido continua opcional, com o filtro de sempre. "Já jogo em outro aparelho" continua ali.
- Depois dela: a triagem de idade e o aquecimento (`jogos/aquecimento.md`, com o "Pular" de sempre). Só então a Home.
- **Quem chega por link entra direto:** desafio (`?d=`, `?p=`, `?l=`) abre a Home com o convite do X1 (o time é pedido ao aceitar, e o aquecimento vira card na Home). O Time do Dia (`?dia`) e o lance (`#lance/…`) já pedem o time e seguem para o jogo, sem aquecimento (vira card na Home); o item do lance atravessa a escolha e a triagem e a ficha abre no fim. Termos, código e `#admin` abrem como sempre.
- **Quem já joga** abre a Home direto. O `?time=` de um link só deixa o time marcado na escolha; quem fechou sem confirmar entra na próxima visita com esse time.
- **Home sem time** (quem veio por desafio): a faixa "Qual é a sua torcida?" inteira é o botão, com "Escolher meu time ›" em pílula clara, e tocar na arquibancada também leva à escolha.

## Como está no código

### Menores, Termos e dados
- **Triagem:** tela `src/telas/triagem.ts`, disparada em `irPara` (`src/app.ts`). Coluna `torcedores.faixa_etaria` (null = não respondeu), gravada por `salvar_faixa_etaria`; no aparelho, em `gdt:prefs`. Só existe torcedor depois de escolher o time, então a faixa sobe na sincronização seguinte (`src/servidor/torcedor.ts`).
- **Regra 18+:** uma só, `soPara18Mais` em `src/jogo/faixaEtaria.ts`, com `podeVerPush`, `podeVerApoio`, `podeVerOferecidoPor` (já pronta para o selo) e `podeVerSocio` (o bloco da Casa, por `socioParaMostrar` em `src/telas/casa/socio.ts`). No servidor, `salvar_inscricao_push` recusa quem não é `18_mais`.
- **Aviso de saída:** `src/telas/saida.ts`. **Apoio:** `src/jogo/apoio.ts` (confirmação em `gdt:apoio-confirmado`). **Termos:** `src/telas/termos.ts` (só baixa quando abre; a tabela da Política vira fichas, para caber em 390×844 sem rolar para o lado); texto em `src/dados/termos.md`; versão `DATA_DA_VERSAO` e `avisoDosTermos` em `src/jogo/termos.ts`; o aparelho guarda a versão vista em `gdt:prefs` (`termosVistos`).
- **Ver meus dados:** `ver_meus_dados` (função no banco, só leitura, sempre de `auth.uid()`), texto em `src/jogo/meusDados.ts`. É função, e não leitura direta das tabelas, porque a inscrição do aviso e as mensagens não têm leitura pelo celular, e abrir essas tabelas daria mais do que o necessário.
- **Apagar meus dados:** `apagar_meus_dados` (função no banco, numa transação).
- **Contas paradas:** `apagar_contas_paradas`, cron `apagar-contas-paradas`. Só o cron chama, nem o celular nem a chave secreta das funções, e a função recusa prazo menor que 6 meses ou data no futuro (migração `20261103000100_travas_limpeza_e_fechamento.sql`). O registro `contas_paradas_apagadas` guarda só quando e quantas.
- **Apagar apelido:** `src/telas/adminApelido.ts`; `apelidos_filtrados` (só administrador), `apelido_contar` e `apelido_apagar` (só administrador).
- **Pendências dos Termos com advogado:** triagem autodeclarada × art. 9º do ECA Digital, e dispensa de DPO × exceção de alto risco da Res. CD/ANPD 2/2022, a confirmar antes de divulgar.

### Código do torcedor
- **Como o segundo aparelho entra na mesma conta:** a Supabase só cria sessão para uma conta que já existe por um link mágico de uso único, e o link pede e-mail. Na primeira vez, a conta ganha um **e-mail técnico** `t.<32 hexadecimais>@torcedor.invalid` (domínio reservado, que não existe e não recebe e-mail), sem senha, e nenhum e-mail é enviado. Os 32 hexadecimais saem de um HMAC do id da conta com o segredo das funções: é sempre o mesmo para a mesma conta (duas entradas ao mesmo tempo não brigam) e ninguém de fora calcula. O passe só sai se o link for da conta do dono, porque com e-mail que não existe o Auth cria uma conta nova em vez de dar erro. A função gera o link e entrega ao aparelho novo só o passe (`hashed_token`), que ele troca por sessão com `verifyOtp` (tipo `magiclink`). A troca sai do próprio aparelho, então o limite de verificações por IP do Auth é o dele. Com o e-mail confirmado, a Supabase marca a conta como não anônima; por isso "Apagar meus dados" e a limpeza de contas paradas reconhecem a conta de torcedor por `conta_de_torcedor`: anônima ou com e-mail técnico, nunca administrador. Migração `20261103400000_codigo_torcedor.sql`, função `codigo-torcedor`.
- **Código:** 8 símbolos de `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (sem 0, 1, I, L e O), cerca de 853 bilhões de códigos, sorteados no servidor sem viés (`src/jogo/codigoTorcedor.ts`, compartilhado). O banco guarda só a impressão HMAC-SHA256, com o segredo das funções: com SHA-256 puro, quem lesse a tabela acharia um código ativo por força bruta em minutos. Há um ativo por conta, e gerar outro mata o anterior; até 5 por hora e 10 por dia. Vale 10 minutos e uma vez só. O aparelho que acerta fica com ele reservado até vencer, para escolher o time.
- **Limites (`codigo_conferir`):**
  - **CAPTCHA a cada tentativa, antes de contar:** Turnstile, com a mesma chave do login, conferido com o segredo `TURNSTILE_SECRET_KEY`. Sem o segredo, a entrada responde `captcha_indisponivel`.
  - **Por aparelho:** 5 erros em 15 min ou 20 em 24 h. "Aparelho" é a conta anônima dele: limpar os dados do site dá uma conta nova, que custa outro CAPTCHA no login (e a Supabase limita 30 logins anônimos por hora por IP). Por isso quem segura a força bruta é o freio geral.
  - **Freio geral:** 200 erros em 10 min no jogo todo pausam a entrada de todo mundo, com trava única para rajadas ao mesmo tempo não passarem juntas. Risco aceito: um ataque pode pausar a entrada por código por alguns minutos.
  - **O que fica guardado:** a tentativa guarda só o aparelho e a hora, sem chave para a conta, então apagar a conta não zera o limite. Some em 2 dias.
  - **Chance de acertar no chute:** com o freio no limite o dia todo e 100 códigos ativos, cerca de 1 em 300 mil por dia.
- **Ordem na função (`supabase/functions/codigo-torcedor/fluxo.ts`):** CAPTCHA → conferir → e-mail técnico (só na primeira vez) → passe → junção.
  - Se o passe falhar, nada foi juntado.
  - Se a junção falhar, o passe não sai da função e vence sozinho.
  - Se a resposta se perder depois da junção, os dados já estão na conta do dono e o aparelho pede um código novo (`entrada_falhou`).
- **Junção (`juntar_torcedores`, numa transação só):**
  - **Pontos:** os da conta que entrou vão para `pontos_apagados`, como no "Apagar meus dados", e o ranking fica idêntico. Semana travada, temporada e fechamento não mudam.
  - **Carreira:** `carreira_partidas` e `carreira_bonus` passam, e o XP sai da mesma conta por dia (5 + 5 partidas no mesmo dia dão 75). Time do Dia ou rodada do Crava repetidos no mesmo dia contam uma vez.
  - **Medalhas:** `lances_gols` passa.
  - **Recordes:** vão para `recordes_herdados`, vale o maior e zeram com a pré-temporada.
  - **Crava:** a rodada inteira passa, com a certeza, se nenhum jogo dela deu ponto à conta que entrou e o dono não palpitou nela.
  - **Também passam:** as perguntas já vistas da Prova, o aviso de domingo (só se a faixa final for 18+, e no máximo 5 navegadores, como no `salvar_inscricao_push`) e o "Achei um erro".
  - **Apelido:** fica o do dono, ou o da conta que entrou.
  - **Somem:** as partidas antigas, os desafios por link e o Time do Dia ou a Prova em andamento da conta que entrou.
  - **Registro:** `contas_juntadas` guarda só a data e se a conta que entrou tinha dados.
  - Na junção, o dono herda o bônus do aquecimento (`jogos/aquecimento.md`).
- **Aparelhos:**
  - **O que conta como aparelho:** cada sessão do Auth.
  - **A lista:** `meus_aparelhos()` mostra quando o aparelho entrou, quando foi usado e o navegador (nunca o IP).
  - **Desconectar:** `desconectar_aparelho` apaga a sessão de outro aparelho da conta. O passe (JWT) que esse aparelho já tem vale até 1 hora, mas não grava nada:
    - as funções do servidor (partidas, Prova, Time do Dia, Lances, código, boneco) conferem a sessão pelo Auth (`getUser`); a do boneco confere de novo no banco, pelo `session_id` do passe (`boneco_sessao`, `jogos/boneco-montavel.md`);
    - `salvar_torcedor`, `salvar_faixa_etaria`, `salvar_inscricao_push`, `remover_inscricao_push`, `apagar_meus_dados`, `meus_aparelhos` e `desconectar_aparelho` conferem `sessao_ativa()`;
    - palpites, certezas e "Achei um erro" têm políticas restritivas com `sessao_ativa()`;
    - `ver_meus_dados` e o status do código não respondem.
    - Risco que fica: ler o próprio placar, a carreira e as medalhas até o passe vencer.
  - **Apagar a conta:** "Apagar meus dados" apaga a conta em todos os aparelhos.
  - **Aparelho fantasma:** se a troca do passe chegou ao Auth mas a resposta se perdeu, o aparelho mostra `entrada_falhou` e a sessão nova aparece na lista sem ninguém usando. Basta desconectá-la.
- **Sincronização (`src/servidor/torcedor.ts`):** o aparelho manda time, apelido e faixa ao servidor e busca uma vez por abertura (`puxarTorcedor`), adotando o que outro aparelho mudou, se ele mesmo não tiver mudança por subir. A faixa do servidor ganha sempre que for a mais protetora. A tela do código busca de novo quando o outro aparelho entra, porque a pessoa pode ter ficado com o time dele.
- **Saiu da conta (`garantirSessao`):** sessão ou conta que sumiu (401, 403 ou 404 do Auth: `session_not_found`, `user_not_found`; ou a renovação recusada), num aparelho que já tinha torcedor, leva à escolha do time com aviso. Também limpa o que o aparelho guardou da conta de antes (XP visto, posições). 408 e 429 são passageiros e não contam.
- **Telas:** Perfil (`src/telas/perfil.ts`: "Aparelhos ligados" e o botão "Outro aparelho"); `src/telas/outroAparelho.ts` (QR, código, contador e aviso; consulta o status a cada 5 s com a tela visível); `src/telas/entrarComCodigo.ts` (digitar ou colar, aviso de juntar, "Qual time fica?" e "Pronto!"); link "Já jogo em outro aparelho" na escolha do time de aparelho novo.
- **QR:** biblioteca `uqr` 0.1.3, baixada só na tela do código. O link é `#entrar/CÓDIGO`: o que vem depois do `#` nunca chega ao servidor, e a tela troca o endereço por `#entrar` na hora.

### Primeiro acesso
- Regra pura `comecaPelaEscolha` em `src/jogo/primeiroAcesso.ts`, com teste; entrada em `src/main.ts`; rota `{ tela: 'times', primeira: true }` em `src/telas/times.ts` (a volta do "Já jogo em outro aparelho" mantém o modo para quem ainda não tem time, em `entrarComCodigo.ts`); faixa em `src/telas/inicio.ts` e `src/estilos/inicio.css`. O destino do lance depois do time é `destinoDepoisDoTime`.

## Em desenvolvimento
- `?apoioFalso`: apoio com dados de mentira.
- `?codigoFalso` (`src/dev/codigoFalso.ts`), com `&cenario=escolher|pronto|erro=<código>`.
