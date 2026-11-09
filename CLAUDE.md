# Guerra de Torcidas — instruções para o Claude Code

Leia `docs/jogo.md` antes de qualquer tarefa: é curto e traz as regras de hoje, o tom e o escopo. Depois, **só o doc do módulo da tarefa**, pela tabela "Onde está cada coisa" no topo dele: `docs/jogos/` (rankings, lances, pênaltis, conhecimento, crava, contas, aquecimento, boneco-montavel, cards), `docs/narrador.md`, `docs/visual.md` ou `docs/casa.md`. Se um deles discordar do `jogo.md`, vale o `jogo.md`. Exceção: quem recebe uma parte já planejada, com brief, lê só o que o brief cita.
Para saber onde o projeto está e o que vem a seguir, leia `docs/proximos-passos.md` (só a fila). Ideias sem decisão: `docs/backlog.md`. Datas e histórico: `docs/decisoes.md`, só quando a história importar.

## Divisão de trabalho (primordial)

- **Primeira ação de toda tarefa nova:** avaliar a complexidade do todo. Tarefa complexa usa a skill `planejar-tarefa` antes de qualquer outra coisa. O que cabe em cerca de 10 chamadas de ferramenta é feito direto, sem plano.
- Em tarefa complexa, o Kauê abre a conversa no Opus mais recente em intensidade alta. Essa conversa planeja, distribui e confere; a execução vai para modelos e intensidades mais econômicos, sem perder qualidade.
- **Plano aprovado autoriza criar as sub-conversas**, cada uma com o modelo e a intensidade da sua parte. Não pergunte de novo.
- **Rotina repetitiva vai primeiro ao Gemini Flash** (skill `rotina-gemini`), sempre com validador em código ou revisão.
- Tabela, critérios e modelo de brief: `docs/orquestracao.md`.

## Limites do projeto (importante)

- Este repositório é **só** o jogo, publicado em `torcida.kauewalter.com.br`.
- **Nunca** altere, faça commit ou abra PR no repositório do site pessoal (`kauewalter.com.br`) nem em nenhuma outra pasta fora deste repositório.
- Se uma tarefa parecer exigir mudar o site principal (link no menu, por exemplo), pare e avise. O Kauê faz isso numa sessão separada, na pasta do site.
- DNS no Hostgator e configurações nos painéis do GitHub e do Supabase são feitos pelo Kauê. Diga exatamente o que ele precisa clicar ou preencher.

## Segredos

- A URL do Supabase e a **publishable key** (`sb_publishable_…`) são públicas e podem ir no front-end.
- A **secret key** (`sb_secret_…`) e a senha do banco **nunca** entram no repositório, em log ou em código do navegador. A secret key só existe como segredo das funções do Supabase.
- Não use as chaves antigas `anon` e `service_role` (a Supabase está descontinuando até o fim de 2026).
- Comandos que pedem login ou senha (`supabase login`, `supabase link`) quem roda é o Kauê no terminal. Diga o comando e espere.
- Nada de `.env` com segredos no commit. Mantenha um `.env.example`.

## Produto

- Interface em português do Brasil, tom de resenha e zoeira (ver "Tom e zoeira" no `docs/jogo.md`).
- **Celular primeiro.** Teste sempre em 390×844. Toque, nunca hover. Nada de rolagem horizontal.
- **Sem marcas de clubes:** nada de escudo, uniforme oficial, mascote, hino ou foto de jogador real. Só nome, cores e artigo. Batedores usam camiseta lisa nas cores do time (uniforme 1 ou 2); goleiros, um tom forte de contraste. Nenhum boneco imita jogador real.
- Zoeira só com o time e a situação. Nunca com raça, orientação, gênero, religião, origem, corpo, deficiência ou pessoa real. Narrador neutro de gênero.
- **Nomes reais** de jogadores e técnicos só em perguntas factuais dos jogos de conhecimento (quiz, desafios diários), nas fichas factuais da Casa do [time] e na ficha factual dos lances históricos (Lances do Jogo), com fonte guardada junto. Nunca no título, card, narrador ou boneco de um lance (nem apelido ou número da camisa). Nunca imagem, voz, zoeira, vida pessoal ou atleta menor de idade. Regra completa: "Nomes reais" no `docs/jogo.md`.
- **Zero aposta:** nenhuma das palavras proibidas da seção "Zero aposta" do `docs/jogo.md` em nenhum texto do jogo.
- Nunca peça dados pessoais obrigatórios. Login anônimo por padrão. Apelido nunca aparece em ranking público no MVP.

## Técnica

- Vite + TypeScript. Jogo em canvas. Dependências só quando fazem muito trabalho; o bundle inicial deve ficar abaixo de ~300 KB gzip.
- O resultado de uma partida é sempre **recalculado no servidor** a partir dos gestos e da semente (ver "Anti-trapaça" em `docs/jogos/penaltis.md` e `docs/jogos/lances.md`). O cliente nunca grava pontos direto na tabela.
- Banco: migrações SQL versionadas em `supabase/migrations/`. Toda tabela com Row Level Security ligada e política explícita.
- **Antes de qualquer migração que apague ou renomeie coluna ou tabela, pergunte.**
- Lógica de jogo (física, pontuação) em módulos puros, testáveis, compartilhados entre o navegador e a função do servidor.
- Testes: `npm run test:rapido` (lógica pura, ~20 s) enquanto trabalha; `npm test` (rápido + `test:banco`, o SQL no PGlite, ~2 min) antes de cada commit que toque `supabase/`, e antes de abrir o PR.
- Publicação: depois do merge de PR com função ou migração, rode `npm run publicar:conferir` (só leitura: compara cada função e migração no ar com a `main`; ~1 min). `-- --local` compara com a pasta atual, antes do merge.

## Fluxo de trabalho

- Commits pequenos, mensagem em português, no formato `tipo: descrição` (ex.: `feat: desafio por link`, `fix: card cortado no iPhone`).
- Ao terminar uma tarefa: diga o que mudou, como testar no celular e o que ficou pendente.
- Quando uma decisão de produto mudar durante o trabalho, atualize no mesmo commit a regra no `docs/jogo.md` ou no doc do módulo (dizendo só como é agora, sem "até tal dia era…") e ponha uma linha com a data no topo de `docs/decisoes.md`.
- Ao fechar um item da fila, tire-o do `docs/proximos-passos.md` no mesmo PR.
- Os docs têm teto de tamanho (`scripts/docs/tamanho.test.ts`). Se estourar, enxugue em vez de subir o teto.
