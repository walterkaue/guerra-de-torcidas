// Filtro da frase própria (docs/jogo.md 14.6): o mesmo do apelido, no aparelho, e o limite de 60 letras.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FRASE_MAX,
  PALAVRAS_BLOQUEADAS,
  PALAVRAS_INTEIRAS,
  TEXTOS_DA_FRASE,
  conferirFrasePropria,
  fraseBloqueada,
  letrasDaFrase,
  normalizarFrase,
} from './filtroDeFrase';

const MIGRACAO = fileURLToPath(new URL('../../supabase/migrations/20261019000000_base.sql', import.meta.url));

/** As palavras do `insert into public.palavras_bloqueadas` da migração. */
function palavrasDaMigracao(): string[] {
  const sql = readFileSync(MIGRACAO, 'utf8');
  const bloco = sql.split('insert into public.palavras_bloqueadas (palavra) values')[1].split(';')[0];
  return [...bloco.matchAll(/\('([^']+)'\)/g)].map((m) => m[1]);
}

describe('lista de palavras', () => {
  it('é a mesma da migração do apelido, palavra por palavra', () => {
    expect([...PALAVRAS_BLOQUEADAS].sort()).toEqual(palavrasDaMigracao().sort());
  });

  it('as da seção 7 que faltam no apelido entram como palavra inteira', () => {
    expect(PALAVRAS_INTEIRAS).toEqual(expect.arrayContaining(['apostas', 'bets', 'cotacoes', 'banca', 'bolao valendo', 'green', 'red']));
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
