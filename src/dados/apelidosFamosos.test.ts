// Filtro de apelido contra nomes de jogadores famosos (docs/jogo.md, seção 4, "Apelido").
// A lista mora nas migrações (20261106100000 acrescenta, 20261110100000 marca cada entrada como palavra ou nome); aqui
// conferimos o formato, a marcação e que ela não bloqueia palavra comum, nome de cidade nem nome próprio comum.
// A função do banco (apelido_bloqueado) é reproduzida abaixo, igual à da migração do sobrenome; os mesmos casos rodam
// no banco de verdade em supabase/testes/apelidoSobrenome.test.ts.

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
/** Nomes completos que a migração do sobrenome acrescenta (quem estava na lista só por uma palavra). */
const COMPLETOS = palavrasDoInsert(SOBRENOME);
const JOGADORES = [...NOVAS, ...COMPLETOS];
const MARCADAS = famosoDosUpdates(SOBRENOME);
const FAMOSO = new Map(MARCADAS);

// normalizar_apelido: minúsculas, sem acento, números comuns viram letras, o resto vira espaço.
const MAPA_NUMEROS: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
const semAcento = (p: string) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function normalizar(p: string): string {
  return [...semAcento(p)].map((c) => MAPA_NUMEROS[c] ?? c).join('').replace(/[^a-z ]/g, ' ');
}

// apelido_bloqueado (20261110100000_apelido_sobrenome.sql), parte de jogador. Número e sinal que parecem letra viram
// O I E A S T maiúsculos (valem pela letra ou são enfeite); o resto some.
const MARCA: Record<string, string> = { '0': 'O', '1': 'I', '3': 'E', '4': 'A', '5': 'S', '7': 'T', '@': 'A', $: 'S' };
const soLetras = (s: string) => [...s].map((c) => MARCA[c] ?? c).join('').replace(/[^a-zOIEAST]/g, '');
const ENFEITE = /(^|[^a-z0-9@$])(os|as|dos|das|do|da|de|jr|junior|[a-z])(?=[^a-z0-9@$]|$)/g;
/** Colunas padrao e esqueleto da palavra. */
function padrao(w: string): string {
  return w
    .replace(/[^a-z]/g, '')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/([a-z])/g, '$1+[OIEAST]*')
    .replaceAll('o+', '[oO]+')
    .replaceAll('i+', '[iI]+')
    .replaceAll('e+', '[eE]+')
    .replaceAll('a+', '[aA]+')
    .replaceAll('s+', '[sS]+')
    .replaceAll('t+', '[tT]+');
}
const esqueletoDaPalavra = (w: string) => w.replace(/[^a-z]/g, '').replace(/[oieast]/g, '').replace(/([a-z])\1+/g, '$1');
const esqueletoDoApelido = (j: string) => j.replace(/[oieastOIEAST]/g, '').replace(/([a-z])\1+/g, '$1');

/**
 * Reprodução de apelido_bloqueado. Ofensa: até 4 letras só como palavra inteira; mais longa em qualquer lugar,
 * ignorando espaços. Jogador 'palavra': o apelido inteiro é o padrão (uma vez ou repetido), com ou sem o enfeite (letra
 * solta, artigo, do/da/de, Jr/Júnior). Jogador 'nome': o padrão em qualquer lugar. `semFiltroBarato` pula o teste do
 * esqueleto, para conferir que ele nunca descarta o que o padrão barraria.
 */
function bloqueado(apelido: string, lista: readonly string[], semFiltroBarato = false): boolean {
  const texto = normalizar(apelido);
  const comEspacos = ' ' + texto.replace(/ +/g, ' ') + ' ';
  const junto = texto.replace(/ /g, '');
  const base = semAcento(apelido);
  const jogador = soLetras(base);
  const jogadorSemEnfeite = soLetras(base.replace(ENFEITE, '$1'));
  const esq = esqueletoDoApelido(jogador);
  const esqSemEnfeite = esqueletoDoApelido(jogadorSemEnfeite);
  return lista.some((b) => {
    const f = FAMOSO.get(b);
    if (!f) return b.length <= 4 ? comEspacos.includes(' ' + b + ' ') : junto.includes(b);
    const j = jogadorCompilado(b);
    if (!j) return false;
    if (f === 'nome') return (semFiltroBarato || esq.includes(j.esqueleto)) && j.solto.test(jogador);
    const candidata = (x: string) =>
      semFiltroBarato || j.esqueleto === '' || (x !== '' && [...x].every((c) => j.esqueleto.includes(c)));
    return (candidata(esq) && j.inteiro.test(jogador)) || (candidata(esqSemEnfeite) && j.inteiro.test(jogadorSemEnfeite));
  });
}

const COMPILADOS = new Map<string, { esqueleto: string; solto: RegExp; inteiro: RegExp } | null>();
/** O padrão de cada palavra de jogador, compilado uma vez (o Postgres guarda os compilados do mesmo jeito). */
function jogadorCompilado(b: string) {
  if (!COMPILADOS.has(b)) {
    const p = padrao(b);
    COMPILADOS.set(b, p ? { esqueleto: esqueletoDaPalavra(b), solto: new RegExp(p), inteiro: new RegExp(`^[OIEAST]*(${p})+$`) } : null);
  }
  return COMPILADOS.get(b)!;
}

const TUDO = [...ANTIGAS, ...JOGADORES];

/** O nome do jogador sozinho, com os truques de sempre. */
const SO_O_NOME = [
  'Neymar', 'n3ymar', 'NEYMAR', 'Pelé', 'Gabigol', 'g a b i g o l', 'Zico', 'Raphinha 10', 'Arrascaeta', 'Ceni', 'CENI',
  'Cení', 'ceni 01', 'C3ni', 'ceni!!', 'Ceni10', 'Ce ni', 'C e n i', 'N e y m a r', 'C3ni 01', 'C3ni01', 'N3ymar 10',
  'N3ymar10', 'N3ym4r', 'P3l3 10', 'P3l310', 'Z1co 10', 'Ceni 2026', '@neymar', '@ceni', 'neymar$', '$ceni', 'Neymarr',
  'Neymaar', 'Ceeni', 'Cenii', 'Zagalo', 'Caleri', 'Ceni Ceni', 'Neymar Neymar', 'CeniCeni', 'Romário Romário',
  'Kaká Kaká', 'O Ceni', 'A Zico', 'Ceni K', 'Neymar J.', 'Ceni Jr', 'Neymar Junior', 'Neymar Júnior', 'Neymar 10 Jr',
  'De Arrascaeta', 'Do Ceni Da', 'Ceni ⚽', '_Ceni_', 'Ce​ni', 'Gab1gol', 'G4bigol 9', 'K4k4', 'Kaká 8',
];
/** O nome completo do jogador, em qualquer lugar e com os mesmos truques. */
const NOME_COMPLETO = [
  'NEYMAR JR', 'Gabriel Barbosa', 'gabriel  barbosa', 'Gabriel 10 Barbosa', 'Ronaldo Fenômeno', 'Vini Jr', 'Vini Junior',
  'Vinícius Júnior', 'Lucas Paquetá', 'Roberto Carlos', 'Rogério Ceni', 'rogerio ceni 10', 'RogérioCeni', 'rogerioceni10',
  'Zé Rogério Ceni', 'Rogério 10 Ceni', 'R0gério 10 Ceni', 'R0gério10Ceni', 'Rogério Ceeni', 'Rei Pelé', 'Mané Garrincha',
  'Mario Zagalo', 'Roberto Rivellino', 'Giorgian de Arrascaeta', 'Rodrygo Goes', 'Walter Kannemann', 'Pablo Vegetti',
  "Andrés D'Alessandro", 'Clarence Seedorf', 'Dejan Petković',
];
/** Sobrenome ou apelido de jogador junto com outro nome (a regra de 10/11/2026). */
const COM_OUTRO_NOME = [
  'Kauê Ceni', 'Ceni do Kauê', 'Ceni e Kauê', 'Zé Gabigol', 'Ze Ceni', 'Pedro Calleri', 'Ana Zico', 'Cris Garrincha',
  'KauêCeni', 'Neymar da Vila', 'Seedorf Kauê', 'Kendrick Lamar',
];

describe('lista de apelidos de jogadores famosos', () => {
  it('lê uma lista grande o bastante', () => {
    expect(NOVAS.length).toBeGreaterThan(200);
    expect(ANTIGAS.length).toBeGreaterThan(30);
    expect(COMPLETOS.length).toBeGreaterThan(20);
  });

  it('só tem letras a-z, sem espaço, acento, número ou maiúscula', () => {
    const ruins = JOGADORES.filter((p) => !/^[a-z]+$/.test(p));
    expect(ruins).toEqual([]);
  });

  it('já está na forma normalizada (o que o filtro compara)', () => {
    expect(JOGADORES.filter((p) => normalizar(p) !== p)).toEqual([]);
  });

  it('não repete palavra, nem as que já estavam na base', () => {
    expect(new Set(JOGADORES).size).toBe(JOGADORES.length);
    expect(JOGADORES.filter((p) => ANTIGAS.includes(p))).toEqual([]);
  });

  it('não tem entrada curtíssima (até 2 letras) nem palavra que vira ofensa ao pegar em qualquer lugar', () => {
    expect(JOGADORES.filter((p) => p.length < 4)).toEqual([]);
  });

  it('usa on conflict do nothing, para poder rodar de novo', () => {
    expect(NOVA).toMatch(/on conflict \(palavra\) do nothing/);
    expect(SOBRENOME).toMatch(/on conflict \(palavra\) do nothing/);
  });

  it('toda entrada de jogador tem famoso marcado, uma vez só, e nenhuma ofensa foi marcada', () => {
    const marcadas = MARCADAS.map(([p]) => p);
    expect(MARCADAS.length).toBeGreaterThan(200);
    expect(JOGADORES.filter((p) => !FAMOSO.has(p))).toEqual([]);
    expect(marcadas.filter((p, i) => marcadas.indexOf(p) !== i)).toEqual([]);
    expect(marcadas.filter((p) => !JOGADORES.includes(p))).toEqual([]);
    expect(ANTIGAS.filter((p) => FAMOSO.has(p))).toEqual([]);
    expect(COMPLETOS.filter((p) => FAMOSO.get(p) !== 'nome')).toEqual([]);
  });

  it('a coluna famoso só aceita palavra ou nome (null é ofensa)', () => {
    expect(SOBRENOME).toMatch(/add column famoso text null check \(famoso in \('palavra', 'nome'\)\)/);
  });

  it('bloqueia o apelido que é só o nome do jogador, mesmo disfarçado', () => {
    for (const a of SO_O_NOME) expect(bloqueado(a, TUDO), a).toBe(true);
  });

  it('bloqueia o apelido que traz o nome completo do jogador, em qualquer lugar', () => {
    for (const a of NOME_COMPLETO) expect(bloqueado(a, TUDO), a).toBe(true);
  });

  it('deixa passar sobrenome ou apelido de jogador junto com outro nome', () => {
    for (const a of COM_OUTRO_NOME) expect(bloqueado(a, TUDO), a).toBe(false);
  });

  it('o teste barato do esqueleto nunca descarta o que o padrão barraria', () => {
    const disfarces = (w: string) => {
      const leet = w.replace(/e/g, '3').replace(/o/g, '0');
      return [w, `${w}10`, `10 ${w}`, `${leet} 10`, `${leet}10`, `@${w}`, `${w}$`, `${w} ${w}`, `${w}${w}`, `o ${w} jr`,
        w.split('').join(' '), w.replace(/([aeiou])/, '$1$1'), `kaue ${w}`, `${w} da vila`, `ze ${w} 9`];
    };
    const testados = [...JOGADORES.flatMap(disfarces), ...SO_O_NOME, ...NOME_COMPLETO, ...COM_OUTRO_NOME];
    const divergentes = testados.filter((a) => bloqueado(a, TUDO) !== bloqueado(a, TUDO, true));
    expect(divergentes).toEqual([]);
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
