// Filtro da frase própria (docs/jogo.md 14.6): o mesmo do apelido, no aparelho, e o limite de 60 letras.
// Nenhuma palavra da lista fica escrita aqui: o teste lê as migrações.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FRASE_MAX,
  MARCAS_BLOQUEADAS,
  MARCAS_INTEIRAS,
  TEXTOS_DA_FRASE,
  conferirFrasePropria,
  fraseBloqueada,
  letrasDaFrase,
  marca,
  normalizarFrase,
} from './filtroDeFrase';

const MIGRACOES = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));

/** As palavras de todo `insert into public.palavras_bloqueadas` das migrações, por arquivo. */
function palavrasDasMigracoes(): Map<string, string[]> {
  const porArquivo = new Map<string, string[]>();
  for (const f of readdirSync(MIGRACOES).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(`${MIGRACOES}${f}`, 'utf8');
    expect(sql, `${f} apaga palavra da lista: o filtro do aparelho precisa saber`).not.toMatch(/delete\s+from\s+public\.palavras_bloqueadas/i);
    const partes = sql.split('insert into public.palavras_bloqueadas (palavra) values').slice(1);
    const palavras = partes.flatMap((parte) => [...parte.split(';')[0].replace(/--[^\n]*/g, '').matchAll(/\('([^']+)'\)/g)].map((m) => m[1]));
    if (palavras.length) porArquivo.set(f, palavras);
  }
  return porArquivo;
}

describe('lista de palavras', () => {
  const porArquivo = palavrasDasMigracoes();
  const todas = [...new Set([...porArquivo.values()].flat())];

  it('lê as duas migrações da lista (palavrão, ofensa, aposta e os jogadores famosos)', () => {
    expect(porArquivo.size).toBeGreaterThanOrEqual(2);
    expect(todas.length).toBeGreaterThan(250);
  });

  it('tem a marca de cada palavra das migrações, e nada além delas', () => {
    expect([...MARCAS_BLOQUEADAS].sort()).toEqual(todas.map(marca).sort());
  });

  it('marcas sem colisão e as da seção 7 fora da lista do apelido', () => {
    expect(new Set(todas.map(marca)).size).toBe(todas.length);
    for (const m of MARCAS_INTEIRAS) expect(MARCAS_BLOQUEADAS.has(m)).toBe(false);
    expect([...MARCAS_INTEIRAS].sort()).toEqual(['apostas', 'bets', 'cotacoes', 'banca', 'bolao valendo', 'green', 'red'].map(marca).sort());
  });

  it('cada palavra da lista barra, sozinha e dentro de uma frase', () => {
    for (const p of todas) {
      expect(fraseBloqueada(p), p).toBe(true);
      expect(fraseBloqueada(`hoje ${p} de novo`), p).toBe(true);
    }
  });

  it('nome de jogador famoso barra, até com espaço ou maiúscula', () => {
    const famosos = porArquivo.get([...porArquivo.keys()].find((f) => f.includes('apelidos_famosos'))!)!;
    const longo = famosos.find((p) => p.length >= 8)!;
    const separado = `${longo.slice(0, 4)} ${longo.slice(4)}`.toUpperCase();
    expect(fraseBloqueada(`Golaço do ${separado}`)).toBe(true);
  });
});

describe('normalizar (igual a normalizar_apelido)', () => {
  it('tira acento, troca número por letra e o resto vira espaço', () => {
    expect(normalizarFrase('Cotação')).toBe('cotacao');
    expect(normalizarFrase('p0rr4')).toBe('porra');
    expect(normalizarFrase('$@nto!')).toBe('santo ');
    expect(normalizarFrase('Gol ⚽')).toBe('gol  ');
  });
});

describe('frase bloqueada', () => {
  it('pega palavrão, mesmo disfarçado', () => {
    expect(fraseBloqueada('que porra de jogo')).toBe(true);
    expect(fraseBloqueada('P0RR4 de goleiro')).toBe(true);
    expect(fraseBloqueada('p o r r a, que gol')).toBe(true);
    expect(fraseBloqueada('Caralhooo')).toBe(true);
  });

  it('palavra curta só bloqueia inteira', () => {
    expect(fraseBloqueada('vai cu')).toBe(true);
    expect(fraseBloqueada('Curitiba na cabeça')).toBe(false);
    expect(fraseBloqueada('a rola rolou')).toBe(true);
    expect(fraseBloqueada('rolou bola')).toBe(false);
  });

  it('barra aposta, como no apelido e na seção 7', () => {
    expect(fraseBloqueada('Faz sua aposta')).toBe(true);
    expect(fraseBloqueada('melhor cotação')).toBe(true);
    expect(fraseBloqueada('Deu green')).toBe(true);
    expect(fraseBloqueada('bolão valendo')).toBe(true);
    expect(fraseBloqueada('quebra a banca')).toBe(true);
  });

  it('as da seção 7 não pegam palavra parecida', () => {
    expect(fraseBloqueada('A bancada inteira cantou')).toBe(false);
    expect(fraseBloqueada('bola redonda no ângulo')).toBe(false);
    expect(fraseBloqueada('Greenwich não joga')).toBe(false);
  });

  it('deixa passar frase de resenha', () => {
    expect(fraseBloqueada('Hoje o Mengão não perdoou!')).toBe(false);
    expect(fraseBloqueada('Na gaveta, de novo 🔥')).toBe(false);
    expect(fraseBloqueada('Bateu no ângulo e saiu pro abraço')).toBe(false);
  });
});

describe('frase própria', () => {
  it('até 60 letras; emoji conta uma', () => {
    expect(FRASE_MAX).toBe(60);
    expect(letrasDaFrase('gol')).toBe(3);
    expect(letrasDaFrase('⚽⚽')).toBe(2);
    expect(letrasDaFrase('Ação')).toBe(4);
    expect(conferirFrasePropria('a'.repeat(60))).toEqual({ ok: true, frase: 'a'.repeat(60) });
    expect(conferirFrasePropria('a'.repeat(61))).toEqual({ ok: false, motivo: 'longa' });
  });

  it('limpa os espaços antes de contar', () => {
    expect(conferirFrasePropria('  que   golaço  ')).toEqual({ ok: true, frase: 'que golaço' });
    expect(conferirFrasePropria(`${'a'.repeat(60)}   `)).toEqual({ ok: true, frase: 'a'.repeat(60) });
  });

  it('vazia ou barrada não entra', () => {
    expect(conferirFrasePropria('   ')).toEqual({ ok: false, motivo: 'vazia' });
    expect(conferirFrasePropria('que merda de zaga')).toEqual({ ok: false, motivo: 'filtro' });
  });

  it('textos da folha como aprovados', () => {
    expect(TEXTOS_DA_FRASE.regra).toBe('Sem palavrão nem nome de pessoa');
    expect(TEXTOS_DA_FRASE.privacidade).toBe('Fica só no seu aparelho. O jogo não guarda nem mostra pra ninguém: só quem receber o card vê.');
    expect(TEXTOS_DA_FRASE.barrada).toBe('Essa frase não passou no filtro. Tenta outra, falando do time ou do lance.');
  });
});
