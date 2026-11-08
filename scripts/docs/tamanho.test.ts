// Teto de tamanho dos docs que toda conversa lê (decidido em 08/11/2026, docs/decisoes.md): o jogo.md antigo chegou a
// 230 KB e cada tarefa gastava ~60 mil tokens só para se situar. Se um teto estourar, enxugue o doc (a história vai
// para docs/decisoes.md ou fica no git) em vez de subir o número.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const KB = 1024;
const TETOS: Record<string, number> = {
  'CLAUDE.md': 8 * KB,
  'docs/jogo.md': 30 * KB,
  'docs/proximos-passos.md': 15 * KB,
  'docs/backlog.md': 45 * KB,
};
/** Cada doc de módulo é lido só quando a tarefa é dele. */
const TETO_MODULO = 35 * KB;

const modulos = readdirSync('docs/jogos').filter((f) => f.endsWith('.md') && !f.startsWith('_'));

describe('tamanho dos docs', () => {
  for (const [arquivo, teto] of Object.entries(TETOS)) {
    it(`${arquivo} até ${teto / KB} KB`, () => {
      expect(statSync(arquivo).size).toBeLessThanOrEqual(teto);
    });
  }
  for (const m of modulos) {
    it(`docs/jogos/${m} até ${TETO_MODULO / KB} KB`, () => {
      expect(statSync(`docs/jogos/${m}`).size).toBeLessThanOrEqual(TETO_MODULO);
    });
  }
});

describe('links entre os docs', () => {
  const lidos = ['CLAUDE.md', 'docs/jogo.md', 'docs/proximos-passos.md', ...modulos.map((m) => `docs/jogos/${m}`)];
  for (const arquivo of lidos) {
    it(`${arquivo}: todo doc citado existe`, () => {
      const texto = readFileSync(arquivo, 'utf8');
      const citados = [...texto.matchAll(/`((?:docs\/)?(?:jogos\/)?[\w-]+\.md)`/g)].map((m) => m[1]);
      const faltando = citados.filter((c) => {
        const candidatos = c.startsWith('docs/') ? [c] : c.startsWith('jogos/') ? [`docs/${c}`] : [`docs/${c}`, `docs/jogos/${c}`, c];
        return !candidatos.some((x) => existsSync(x));
      });
      expect(faltando).toEqual([]);
    });
  }
});
