// Filtro de apelido contra nomes de jogadores famosos (docs/jogo.md, seção 4, "Apelido").
// A lista mora nas migrações (20261106100000 acrescenta, 20261110100000 marca cada entrada como palavra ou nome); aqui
// conferimos o formato, a marcação e que ela não bloqueia palavra comum, nome de cidade nem nome próprio comum.
// A função do banco (apelido_bloqueado) é reproduzida abaixo, igual à da migração do sobrenome.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const lerMigracao = (nome: string) => readFileSync(`${RAIZ}supabase/migrations/${nome}`, 'utf8');

const NOVA = lerMigracao('20261106100000_apelidos_famosos.sql');
const BASE = lerMigracao('20261019000000_base.sql');

/** Lê os ('palavra') dos inserts de palavras_bloqueadas, ignorando comentários. */
function palavrasDoInsert(sql: string): string[] {
  const semComentario = sql
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');
  const bloco = semComentario.slice(semComentario.indexOf('insert into public.palavras_bloqueadas'));
  const fim = bloco.search(/;/);
  return [...bloco.slice(0, fim).matchAll(/\('([^']*)'\)/g)].map((m) => m[1]);
}

const SOBRENOME = lerMigracao('20261110100000_apelido_sobrenome.sql');

type Famoso = 'palavra' | 'nome';

/** Lê os "update ... set famoso = 'x' where palavra in (...)" da migração do sobrenome, ignorando comentários. */
function famosoDosUpdates(sql: string): [string, Famoso][] {
  const semComentario = sql
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');
  const blocos = [
    ...semComentario.matchAll(/update public\.palavras_bloqueadas set famoso = '(palavra|nome)' where palavra in \(([^)]*)\);/g),
  ];
  return blocos.flatMap((b) => [...b[2].matchAll(/'([^']*)'/g)].map((m): [string, Famoso] => [m[1], b[1] as Famoso]));
}

const NOVAS = palavrasDoInsert(NOVA);
const ANTIGAS = palavrasDoInsert(BASE);
const MARCADAS = famosoDosUpdates(SOBRENOME);
const FAMOSO = new Map(MARCADAS);

// normalizar_apelido: minúsculas, sem acento, números comuns viram letras, o resto vira espaço.
const MAPA_NUMEROS: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
function normalizar(p: string): string {
  const sem = p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return [...sem].map((c) => MAPA_NUMEROS[c] ?? c).join('').replace(/[^a-z ]/g, ' ');
}
// apelido_bloqueado (20261110100000_apelido_sobrenome.sql). Ofensa: até 4 letras só como palavra inteira; mais longa
// em qualquer lugar, ignorando espaços. Jogador 'nome': em qualquer lugar, ignorando espaços. Jogador 'palavra': só
// quando o apelido inteiro, sem espaços (com ou sem os números), é a palavra.
function bloqueado(apelido: string, lista: readonly string[]): boolean {
  const texto = normalizar(apelido);
  const comEspacos = ' ' + texto.replace(/ +/g, ' ') + ' ';
  const junto = texto.replace(/ /g, '');
  const juntoSemNumero = normalizar(apelido.replace(/[0-9]/g, '')).replace(/ /g, '');
  return lista.some((b) => {
    const f = FAMOSO.get(b);
    if (f === 'palavra') return b === junto || b === juntoSemNumero;
    if (f === 'nome') return junto.includes(b);
    return b.length <= 4 ? comEspacos.includes(' ' + b + ' ') : junto.includes(b);
  });
}

const TUDO = [...ANTIGAS, ...NOVAS];

describe('lista de apelidos de jogadores famosos', () => {
  it('lê uma lista grande o bastante', () => {
    expect(NOVAS.length).toBeGreaterThan(200);
    expect(ANTIGAS.length).toBeGreaterThan(30);
  });

  it('só tem letras a-z, sem espaço, acento, número ou maiúscula', () => {
    const ruins = NOVAS.filter((p) => !/^[a-z]+$/.test(p));
    expect(ruins).toEqual([]);
  });

  it('já está na forma normalizada (o que o filtro compara)', () => {
    expect(NOVAS.filter((p) => normalizar(p) !== p)).toEqual([]);
  });

  it('não repete palavra, nem as que já estavam na base', () => {
    expect(new Set(NOVAS).size).toBe(NOVAS.length);
    expect(NOVAS.filter((p) => ANTIGAS.includes(p))).toEqual([]);
  });

  it('não tem entrada curtíssima (até 2 letras) nem palavra que vira ofensa ao pegar em qualquer lugar', () => {
    expect(NOVAS.filter((p) => p.length < 4)).toEqual([]);
  });

  it('usa on conflict do nothing, para poder rodar de novo', () => {
    expect(NOVA).toMatch(/on conflict \(palavra\) do nothing/);
  });

  it('toda entrada de jogador tem famoso marcado, uma vez só, e nenhuma ofensa foi marcada', () => {
    const marcadas = MARCADAS.map(([p]) => p);
    expect(MARCADAS.length).toBeGreaterThan(200);
    expect(NOVAS.filter((p) => !FAMOSO.has(p))).toEqual([]);
    expect(marcadas.filter((p, i) => marcadas.indexOf(p) !== i)).toEqual([]);
    expect(marcadas.filter((p) => !NOVAS.includes(p))).toEqual([]);
    expect(ANTIGAS.filter((p) => FAMOSO.has(p))).toEqual([]);
  });

  it('a coluna famoso só aceita palavra ou nome (null é ofensa)', () => {
    expect(SOBRENOME).toMatch(/add column famoso text null check \(famoso in \('palavra', 'nome'\)\)/);
  });

  it('bloqueia o apelido que é só o nome do jogador, com ou sem espaço, acento ou número', () => {
    const deveBloquear = [
      'Neymar',
      'n3ymar',
      'Pelé',
      'Gabigol',
      'g a b i g o l',
      'Zico',
      'Raphinha 10',
      'Arrascaeta',
      'Ceni',
      'CENI',
      'ceni 01',
      'C3ni',
      'ceni!!',
      'Ceni10',
    ];
    for (const a of deveBloquear) expect(bloqueado(a, TUDO), a).toBe(true);
  });

  it('bloqueia o apelido que traz o nome completo do jogador, em qualquer lugar', () => {
    const deveBloquear = [
      'NEYMAR JR',
      'Gabriel Barbosa',
      'gabriel  barbosa',
      'Ronaldo Fenômeno',
      'Vini Jr',
      'Vinícius Júnior',
      'Lucas Paquetá',
      'Roberto Carlos',
      'Rogério Ceni',
      'rogerio ceni 10',
      'RogérioCeni',
      'rogerioceni10',
      'Zé Rogério Ceni',
    ];
    for (const a of deveBloquear) expect(bloqueado(a, TUDO), a).toBe(true);
  });

  it('deixa passar sobrenome ou apelido de jogador junto com outro nome', () => {
    const passa = ['Kauê Ceni', 'Ceni do Kauê', 'Zé Gabigol', 'Pedro Calleri', 'Ana Zico', 'Cris Garrincha', 'KauêCeni', 'Neymar da Vila'];
    for (const a of passa) expect(bloqueado(a, TUDO), a).toBe(false);
  });

  it('palavra ofensa continua barrada colada em outro nome', () => {
    const ofensas = ANTIGAS.filter((p) => p.length > 4);
    for (const p of ofensas) expect(bloqueado(`Kaue${p}`, TUDO), p).toBe(true);
    for (const p of ANTIGAS) expect(bloqueado(`Kauê ${p}`, TUDO), p).toBe(true);
  });

  it('deixa passar nome comum de gente comum, sozinho', () => {
    const naoPodeBloquear = [
      'Gabriel',
      'Lucas',
      'João',
      'Pedro',
      'Bruno',
      'Thiago',
      'Matheus',
      'Rafael',
      'Marcos',
      'Ronaldo',
      'Alisson',
      'Ederson',
      'Danilo',
      'Wesley',
      'Marquinhos',
      'Weverton',
      'Fabinho',
      'Rayan',
      'Vinícius',
      'Diego',
      'Luciano',
      'Alex',
      'Hulk',
      'Fred',
      'Dida',
      'Neto',
      'Marta',
      'Silva',
      'Santos',
      'Souza',
      'Gabriel Silva',
      'Lucas Santos',
      'Pedro Souza',
      'Bruno Lima',
    ];
    for (const a of naoPodeBloquear) expect(bloqueado(a, NOVAS), a).toBe(false);
  });

  it('deixa passar palavras comuns do português e apelidos de torcedor', () => {
    const comuns = [
      'Mestre do Gol', 'Craque da Torcida', 'Rei da Resenha', 'Zagueiro Fominha', 'Camisa Dez', 'Coxa Roxa',
      'Fiel Torcedor', 'Tricolor', 'Mengão', 'Gavião', 'Leão do Norte', 'Raposa', 'Galo Doido', 'Verdão',
      'Urubu', 'Massa', 'Pato Donald', 'Careca', 'Tostão', 'Pinga', 'Ganso', 'Cebolinha', 'Mosquito',
      'Catimba', 'Maravilha', 'Imperador', 'Fenômeno', 'Cartola', 'Torcedor', 'Brasileirão', 'Libertadores',
      'Escanteio', 'Impedimento', 'Pênalti', 'Goleiro', 'Artilheiro', 'Meia Armador', 'Volante', 'Lateral',
      'Capitão', 'Campeão', 'Mundial', 'Estádio', 'Arquibancada', 'Geral', 'Baile', 'Cravada', 'Boleiro',
      'Pelego', 'Pelada', 'Peleja', 'Pelotas', 'Cafuzo', 'Cafundó', 'Zicão', 'Kakareco', 'Cenário', 'Ceniza',
      'Mestre Jedi', 'Marcelo', 'Felipe', 'Rodrigo', 'Eduardo', 'Gustavo', 'Henrique', 'Leonardo', 'Murilo',
      'Messias', 'Kendrick Lamar', 'Maria', 'Ana Clara', 'Beatriz', 'Julia', 'Larissa', 'Camila', 'Fernanda',
    ];
    expect(comuns.filter((a) => bloqueado(a, NOVAS))).toEqual([]);
  });

  it('não bloqueia nenhum dos 5.570 municípios', () => {
    const sql = lerMigracao('20261105000100_municipios.sql');
    const cidades = [...sql.matchAll(/^\(\d+, '((?:[^']|'')*)', '[A-Z]{2}'\)/gm)].map((m) => m[1].replace(/''/g, "'"));
    expect(cidades.length).toBeGreaterThan(5000);
    const barradas = cidades.filter((c) => bloqueado(c, NOVAS));
    expect(barradas).toEqual([]);
  });

  it('não bloqueia o nome dos 20 clubes', () => {
    const times = readFileSync(`${RAIZ}src/dados/times.ts`, 'utf8');
    const nomes = [...times.matchAll(/nome: '([^']+)'/g)].map((m) => m[1]);
    expect(nomes.length).toBeGreaterThanOrEqual(20);
    expect(nomes.filter((n) => bloqueado(n, NOVAS))).toEqual([]);
  });
});
