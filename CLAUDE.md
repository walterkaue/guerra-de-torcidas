# Guerra de Torcidas — instruções para o Claude Code

Leia `docs/jogo.md` antes de qualquer tarefa. Ele é a fonte da verdade sobre regras, tom e escopo.

## Limites do projeto (importante)

- Este repositório é **só** o jogo, publicado em `torcida.kauewalter.com.br`.
- **Nunca** altere, faça commit ou abra PR no repositório do site pessoal (`kauewalter.com.br`) nem em nenhuma outra pasta fora deste repositório.
- Se uma tarefa parecer exigir mudar o site principal (link no menu, por exemplo), pare e avise. O Kauê faz isso numa sessão separada, na pasta do site.
- DNS no Hostgator e configurações nos painéis do GitHub e do Supabase são feitos pelo Kauê. Diga exatamente o que ele precisa clicar ou preencher.

## Segredos

- A URL do Supabase e a chave `anon` são públicas e podem ir no front-end.
- A chave `service_role` **nunca** entra no repositório, em log ou em código do navegador. Só em variáveis de ambiente das funções do Supabase.
- Nada de `.env` com segredos no commit. Mantenha um `.env.example`.

## Produto

- Interface em português do Brasil, tom de resenha e zoeira (ver seção 7 do `docs/jogo.md`).
- **Celular primeiro.** Teste sempre em 390×844. Toque, nunca hover. Nada de rolagem horizontal.
- **Sem marcas de clubes:** nada de escudo, uniforme, mascote, hino ou foto de jogador real. Só nome e cores.
- Zoeira só com o time e a situação. Nunca com raça, orientação, religião, origem, corpo ou pessoa real.
- Nunca peça dados pessoais obrigatórios. Login anônimo por padrão.

## Técnica

- Vite + TypeScript. Jogo em canvas. Dependências só quando fazem muito trabalho; o bundle inicial deve ficar abaixo de ~300 KB gzip.
- O resultado de uma partida é sempre **recalculado no servidor** a partir dos gestos e da semente (ver "Anti-trapaça" no `docs/jogo.md`). O cliente nunca grava pontos direto na tabela.
- Banco: migrações SQL versionadas em `supabase/migrations/`. Toda tabela com Row Level Security ligada e política explícita.
- **Antes de qualquer migração que apague ou renomeie coluna ou tabela, pergunte.**
- Lógica de jogo (física, pontuação) em módulos puros, testáveis, compartilhados entre o navegador e a função do servidor.
- Testes: `npm test` para a lógica pura; rode antes de cada commit.

## Fluxo de trabalho

- Commits pequenos, mensagem em português, no formato `tipo: descrição` (ex.: `feat: desafio por link`, `fix: card cortado no iPhone`).
- Ao terminar uma tarefa: diga o que mudou, como testar no celular e o que ficou pendente.
- Quando uma decisão de produto mudar durante o trabalho, atualize o `docs/jogo.md` no mesmo commit.
