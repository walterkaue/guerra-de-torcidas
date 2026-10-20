import { defineConfig } from 'vitest/config';

// Publicado na raiz de torcida.kauewalter.com.br, então base = '/'.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'supabase/testes/**/*.test.ts'],
  },
});
