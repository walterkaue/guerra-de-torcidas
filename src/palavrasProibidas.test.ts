// Zero aposta (docs/jogo.md, seção 7): nenhuma palavra proibida em nenhum texto do jogo.
// Varre todo o código do navegador (telas, frases, cards), o index.html e as funções do servidor.
// A única exceção é o aviso fixo do Crava, que nomeia a aposta justamente para negá-la.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AVISO_RESENHA } from './jogo/cravaTela';
import { FRASES, type Frase } from './narrador/frases';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

/** Seção 7 do jogo.md: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red". */
const PROIBIDAS = ['aposta', 'apostas', 'apostar', 'bet', 'bets', 'odd', 'odds', 'cotacao', 'cotacoes', 'banca', 'bolao valendo', 'green', 'red'];
/** Narrador, seção 9: no Crava também nada de "valendo", "prêmio" ou "lucro". */
const PROIBIDAS_NO_CRAVA = ['valendo', 'premio', 'premios', 'lucro'];
/** Narrador, seção 10 e jogo.md 7.1: na Prova de Boleiro nada de "prêmio", "milhão" ou "valendo". */
const PROIBIDAS_NA_PROVA = ['valendo', 'premio', 'premios', 'milhao', 'milhoes'];

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function achar(texto: string, palavras: readonly string[]): string[] {
  const t = normalizar(texto.split(AVISO_RESENHA).join(' '));
  return palavras.filter((p) => new RegExp(`(^|[^a-z0-9])${p.replace(' ', '\\s+')}($|[^a-z0-9])`).test(t));
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|css|html)$/.test(nome) && !nome.endsWith('.test.ts') ? [caminho] : [];
  });
}

describe('palavras proibidas (zero aposta)', () => {
  const lista = [...arquivos(join(RAIZ, 'src')), ...arquivos(join(RAIZ, 'supabase/functions')), join(RAIZ, 'index.html')];

  it('acha a palavra proibida (o teste funciona)', () => {
    expect(achar('Faz sua aposta aqui', PROIBIDAS)).toEqual(['aposta']);
    expect(achar('Melhor COTAÇÃO', PROIBIDAS)).toEqual(['cotacao']);
    expect(achar('bolão  valendo', PROIBIDAS)).toEqual(['bolao valendo']);
    expect(achar('deu green', PROIBIDAS)).toEqual(['green']);
    expect(achar('alfabeto, apostila, redondo, bancada', PROIBIDAS)).toEqual([]);
    expect(achar(AVISO_RESENHA, PROIBIDAS)).toEqual([]);
  });

  it(`nenhum arquivo do jogo usa as palavras proibidas (${lista.length} arquivos)`, () => {
    const achados = lista.flatMap((a) =>
      achar(readFileSync(a, 'utf8'), PROIBIDAS).map((p) => `${relative(RAIZ, a)}: "${p}"`),
    );
    expect(achados).toEqual([]);
  });

  it('frases do Crava sem "valendo", "prêmio" ou "lucro"', () => {
    const achados = Object.entries(FRASES)
      .filter(([ev]) => ev.startsWith('crava_'))
      .flatMap(([ev, l]) => (l as readonly Frase[]).flatMap((f) => achar(f.t, PROIBIDAS_NO_CRAVA).map((p) => `${ev}: "${p}" em "${f.t}"`)));
    expect(achados).toEqual([]);
  });

  it('textos da aba Palpites sem "valendo", "prêmio" ou "lucro"', () => {
    const telas = ['src/telas/palpites.ts', 'src/jogo/cravaTela.ts', 'src/jogo/cardCrava.ts'];
    const achados = telas.flatMap((a) =>
      achar(readFileSync(join(RAIZ, a), 'utf8'), PROIBIDAS_NO_CRAVA).map((p) => `${a}: "${p}"`),
    );
    expect(achados).toEqual([]);
  });

  it('Prova de Boleiro sem "prêmio", "milhão" ou "valendo" (frases e telas)', () => {
    const frases = Object.entries(FRASES)
      .filter(([ev]) => ev.startsWith('prova_'))
      .flatMap(([ev, l]) => (l as readonly Frase[]).flatMap((f) => achar(f.t, PROIBIDAS_NA_PROVA).map((p) => `${ev}: "${p}" em "${f.t}"`)));
    const telas = ['src/telas/prova.ts', 'src/telas/provaResultado.ts', 'src/jogo/cardProva.ts', 'src/jogo/prova.ts'];
    const achados = telas.flatMap((a) =>
      achar(readFileSync(join(RAIZ, a), 'utf8'), PROIBIDAS_NA_PROVA).map((p) => `${a}: "${p}"`),
    );
    expect([...frases, ...achados]).toEqual([]);
  });
});
