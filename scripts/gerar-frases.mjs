// Gera src/narrador/frases.ts a partir de docs/narrador.md.
// Uso: npm run frases   (rode sempre que mudar o narrador.md; o teste avisa se esquecer)

import { readFileSync, writeFileSync } from 'node:fs';

const md = readFileSync(new URL('../docs/narrador.md', import.meta.url), 'utf8');

/** Mesmo formato lido pelo teste de sincronia em src/narrador/narrador.test.ts. */
function lerBanco(texto) {
  const banco = {};
  let atual = null;
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    const titulo = linha.match(/^### `(\w+)`/);
    if (titulo) {
      atual = titulo[1];
      banco[atual] = [];
    } else if (linha.startsWith('## ') || linha.startsWith('### ')) {
      atual = null;
    } else if (atual && linha.startsWith('- ')) {
      let t = linha.slice(2).trim();
      const rara = t.startsWith('⭐');
      if (rara) t = t.replace(/^⭐\s*/, '');
      banco[atual].push(rara ? { t, rara: true } : { t });
    }
  }
  return banco;
}

const banco = lerBanco(md);
const corpo = Object.entries(banco)
  .map(([evento, frases]) => {
    const itens = frases
      .map((f) => `    { t: ${JSON.stringify(f.t)}${f.rara ? ', rara: true' : ''} },`)
      .join('\n');
    return `  ${evento}: [\n${itens}\n  ],`;
  })
  .join('\n');

const saida = `// GERADO por scripts/gerar-frases.mjs a partir de docs/narrador.md. Não edite à mão:
// mude o narrador.md e rode \`npm run frases\`.

export interface Frase {
  /** Texto com variáveis entre chaves, ex.: "GOL! Mais dez pontinhos na conta {do_time}!" */
  t: string;
  /** Frase rara (⭐): sai com peso 1/10. */
  rara?: true;
}

export const FRASES = {
${corpo}
} satisfies Record<string, readonly Frase[]>;

export type EventoNarrador = keyof typeof FRASES;
`;

writeFileSync(new URL('../src/narrador/frases.ts', import.meta.url), saida);
const total = Object.values(banco).reduce((n, l) => n + l.length, 0);
console.log(`frases.ts gerado: ${total} frases em ${Object.keys(banco).length} situações.`);
