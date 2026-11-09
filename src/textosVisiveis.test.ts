// Glossário de 08/11/2026: os termos antigos não podem voltar ao texto que a pessoa lê (nem ao que o leitor de tela lê).
// Varre as strings (aspas simples, duplas e templates) dos .ts de src/telas, src/jogo e src/narrador, sem os
// .test.ts, sem comentários e sem o painel do admin. Para não acusar o que é interno (ids, chaves, rotas, classes):
//   1. string de uma palavra só, sem espaço e só com minúsculas, números e símbolos de seletor
//      ('x1_lances', 'crava', 'jogo-x1', '../jogo/rankingTextos', '[data-ranking]') é chave, não texto;
//   2. dentro das demais, saem `data-...`, `class="..."`, `id="..."`, `href="#..."` e `x1="..."` do SVG;
//   3. nas templates só vale o texto entre as `${...}`; o que está dentro de uma expressão é código, e as strings
//      dentro dela entram pela regra 1 e 2 como qualquer outra.
// Além disso, `titulo: 'Ranking'` (cabecalhoTela) e `rotulo: 'Ranking'` (abas do rodapé) são conferidos no código.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

/** Trechos de texto das strings e templates, sem comentários; recursivo nas expressões `${...}`. */
export function trechosDeTexto(src: string): { linha: number; texto: string }[] {
  const out: { linha: number; texto: string }[] = [];
  const n = src.length;
  const linhaDe = (pos: number) => src.slice(0, pos).split('\n').length;

  function codigo(inicio: number, dentroDeExpressao: boolean): number {
    let i = inicio;
    let fundo = 0;
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && d === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      if (c === "'" || c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') {
          if (src[j] === '\\') j++;
          j++;
        }
        out.push({ linha: linhaDe(i), texto: src.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
      if (c === '`') {
        i = template(i + 1);
        continue;
      }
      if (dentroDeExpressao) {
        if (c === '{') fundo++;
        else if (c === '}') {
          if (fundo === 0) return i;
          fundo--;
        }
      }
      i++;
    }
    return i;
  }

  function template(inicio: number): number {
    let i = inicio;
    let ini = inicio;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') {
        i += 2;
        continue;
      }
      if (src[i] === '$' && src[i + 1] === '{') {
        out.push({ linha: linhaDe(ini), texto: src.slice(ini, i) });
        i = codigo(i + 2, true) + 1;
        ini = i;
        continue;
      }
      i++;
    }
    out.push({ linha: linhaDe(ini), texto: src.slice(ini, i) });
    return i + 1;
  }

  codigo(0, false);
  return out;
}

/** Regra 1: chave interna (uma palavra só, em minúsculas, sem espaço). */
export const ehChaveInterna = (t: string): boolean => !/\s/.test(t) && /^[a-z0-9_.\/#:[\]="'@*>,\-~$]*$/.test(t);

/** Regra 2: tira do trecho o que é atributo interno do HTML/SVG. */
export const semAtributosInternos = (t: string): string =>
  t
    .replace(/\bdata-[\w-]+(="[^"]*"|='[^']*')?/g, ' ')
    .replace(/\b(class|id|for)="[^"]*("|$)/g, ' ')
    .replace(/\bhref="#[^"]*"/g, ' ')
    .replace(/\b[xy][12]="[^"]*"/g, ' ');

/** O que não pode voltar a aparecer. */
export const PROIBIDOS: readonly { nome: string; re: RegExp }[] = [
  { nome: 'X1', re: /\bx1\b/i },
  { nome: 'Crava a Rodada', re: /Crava a Rodada/i },
  { nome: 'cravar/cravou/cravado', re: /\bcrav(?:ar|ou|ado|ados|ada|adas|ando|aram|e)\b/i },
  { nome: 'Crava', re: /(?<![\w\-.#])Crava(?![\w\-])/ },
  { nome: 'crava (texto)', re: /(?<![\w\-.#])crava(?![\w\-])/ },
  { nome: 'Bate Contra Mim', re: /Bate Contra Mim/i },
  { nome: 'Feedback ou bug', re: /Feedback ou bug/i },
  { nome: 'Revanche', re: /\bRevanche\b/ },
  { nome: 'Contou pro ranking / No ranking em', re: /Contou pro ranking|No ranking em/i },
  { nome: 'Placar seco', re: /Placar seco/i },
  { nome: 'Recriar/recriou/recriados', re: /\bRecri\w+|\brecri(?:ando|ados|ado|ou|ar|e)\b/ },
  { nome: 'Torcida mais braba', re: /[Tt]orcida (?:mais )?braba|Mais Braba|Mais Brabas/ },
  { nome: 'exato', re: /\bexatos?\b/i },
  { nome: 'placar exato / palpite certeiro', re: /placar exato|palpite certeiro/i },
];

const SO_NO_CODIGO: readonly { nome: string; re: RegExp }[] = [
  { nome: "titulo: 'Ranking'", re: /cabecalhoTela\(\{\s*titulo:\s*['"`]Ranking['"`]/ },
  { nome: "rotulo: 'Ranking'", re: /rotulo:\s*['"`]Ranking['"`]/ },
];

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return nome.endsWith('.ts') && !nome.endsWith('.test.ts') && !/admin/i.test(nome) ? [caminho] : [];
  });
}

function acusados(pastas: readonly string[]): string[] {
  const achados: string[] = [];
  for (const pasta of pastas) {
    for (const arq of arquivos(join(RAIZ, pasta))) {
      const nome = relative(RAIZ, arq).replace(/\\/g, '/');
      const src = readFileSync(arq, 'utf8');
      for (const { linha, texto } of trechosDeTexto(src)) {
        if (ehChaveInterna(texto)) continue;
        const t = semAtributosInternos(texto);
        for (const { nome: termo, re } of PROIBIDOS) if (re.test(t)) achados.push(`${nome}:${linha} [${termo}] ${t.replace(/\s+/g, ' ').trim().slice(0, 90)}`);
      }
      const semComentarios = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const { nome: termo, re } of SO_NO_CODIGO) if (re.test(semComentarios)) achados.push(`${nome} [${termo}]`);
    }
  }
  return achados;
}

describe('trechosDeTexto e regras', () => {
  it('acha strings e templates, sem comentários, e recursa nas expressões', () => {
    const src = ["// 'X1' num comentário", "const a = 'oi'; /* 'X1' */", 'const b = `um ${f(\'dois\')} três`;'].join('\n');
    expect(trechosDeTexto(src).map((t) => t.texto)).toEqual(['oi', 'um ', 'dois', ' três']);
  });

  it('chaves e atributos internos não contam', () => {
    expect(ehChaveInterna('x1_lances')).toBe(true);
    expect(ehChaveInterna('[data-acao="cravar"]')).toBe(true);
    expect(ehChaveInterna('Ranking')).toBe(false);
    expect(ehChaveInterna('Aceitar o X1')).toBe(false);
    const html = '<button class="cravar feito" data-acao="cravar" data-cravar>Salvar palpite</button><line x1="0"/>';
    expect(PROIBIDOS.some(({ re }) => re.test(semAtributosInternos(html)))).toBe(false);
  });

  it('acusa os termos antigos', () => {
    const acusa = (t: string) => PROIBIDOS.some(({ re }) => re.test(semAtributosInternos(t)));
    for (const t of ['Aceitar o X1', 'Crava a Rodada', 'Cravar', 'Você cravou!', 'Cravado ✓', 'Crave o placar', 'Bate Contra Mim', 'Feedback ou bug? Conta pra gente', 'Recriou o lance!'])
      expect(acusa(t), t).toBe(true);
    for (const t of ['Encarar o desafio', 'Palpite da Rodada', 'Salvar palpite', 'Disputa de pênaltis', 'Carimbou o lance!']) expect(acusa(t), t).toBe(false);
  });
});

describe('texto visível sem os termos do glossário de 08/11/2026', () => {
  it('src/telas e src/jogo', () => {
    expect(acusados(['src/telas', 'src/jogo'])).toEqual([]);
  });

  // As frases do narrador são trocadas em outra frente; este teste só passa quando ela termina.
  it('src/narrador', () => {
    expect(acusados(['src/narrador'])).toEqual([]);
  });
});
