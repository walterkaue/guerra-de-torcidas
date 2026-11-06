import { defineConfig } from 'vitest/config';

// Os worktrees das sessões do Claude Code ficam em .claude/worktrees, dentro desta pasta.
// Sem isto, o `vite` (e o `vitest` em modo watch) da pasta principal vigia também as
// ~1.400 pastas deles e reage a cada edição, teste ou build feito lá.
// O caminho é absoluto (a pasta .claude ao lado deste arquivo) de propósito: um glob solto
// como `**/.claude/**` casaria com tudo quando o vite roda DE DENTRO de um worktree, e o
// HMR de lá pararia. Sem `node:url` porque o tsconfig não carrega os tipos do Node.
const pastaClaude = decodeURIComponent(new URL('./.claude', import.meta.url).pathname).replace(
  /^\/(?=[A-Za-z]:)/,
  '',
);

// Publicado na raiz de torcida.kauewalter.com.br, então base = '/'.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
  },
  server: {
    watch: {
      ignored: [`${pastaClaude}/**`],
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'supabase/testes/**/*.test.ts'],
  },
});
