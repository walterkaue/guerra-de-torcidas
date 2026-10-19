import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_OUTRO, TIMES, rivalDe } from '../dados/times';
import { APELIDO_MAX } from '../estado';
import { criarAleatorio } from '../jogo/aleatorio';
import {
  MAX_CARACTERES,
  escolherFrase,
  preencher,
  temLimite,
  variaveisDa,
  VARIAVEIS,
  type ContextoNarrador,
  type TimeNarrado,
} from './escolher';
import { FRASES, type EventoNarrador, type Frase } from './frases';
import { eventoDaCobranca } from './lance';
import type { ResultadoCobranca } from '../jogo/penaltis';

const TODAS = Object.entries(FRASES) as [EventoNarrador, readonly Frase[]][];

/** Mesmo parser do scripts/gerar-frases.mjs: garante que frases.ts está em dia com o .md. */
function lerBanco(texto: string): Record<string, Frase[]> {
  const banco: Record<string, Frase[]> = {};
  let atual: string | null = null;
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

// Pior caso de tamanho: o time de nome mais longo da lista (fora "Outro time") e, como rival,
// o segundo mais longo (o rival nunca é o próprio time; pelo ranking pode ser qualquer outro).
const oficiais = TIMES.filter((t) => t.id !== ID_OUTRO);
const porTamanho = [...oficiais].sort((a, b) => b.nome.length - a.nome.length);
const maisLongo = porTamanho[0];
// "da"/"pra"/"na" têm o mesmo tamanho de "do"/"pro"/"no".
const longo: TimeNarrado = { nome: maisLongo.nome, artigo: 'o' };
const rivalLongo: TimeNarrado = { nome: porTamanho[1].nome, artigo: 'o' };
// Apelido de tamanho típico. Com o máximo (20), "A torcida {do_time} grita: {apelido}! {apelido}!"
// e uma de desafio passam de 75: o escolherFrase pula essas (teste mais abaixo).
const apelidoTipico = 'W'.repeat(12);
const apelidoMax = 'W'.repeat(APELIDO_MAX);
const CONTEXTO_LONGO: ContextoNarrador = {
  time: longo,
  rival: rivalLongo,
  apelido: apelidoTipico,
  desafiante: apelidoTipico,
  placar: '10 x 10',
  pontos: 225,
  dif: '1.000 pontos',
  horas: '23 horas',
  posicao: '20º',
  numero: 5,
};

// Pedido do Kauê: lance, fim de partida, desempate e desafio cabem em 75 caracteres.
// Ranking e cidade ficam de fora (aparecem em blocos maiores da tela inicial e do ranking).
const LIMITADOS: EventoNarrador[] = [
  'abertura', 'gol', 'gol_angulo', 'cavadinha', 'cavadinha_falhou', 'trave_gol', 'trave',
  'fora_cima', 'fora_lado', 'goleiro_pegou', 'defesa', 'sofreu_gol', 'decisiva',
  'morte_subita', 'par_ou_impar_escolha', 'par_ou_impar_ganhou', 'par_ou_impar_perdeu',
  'vitoria', 'derrota', 'cinco_cobrancas', 'cinco_defesas',
  'desafio_convite', 'desafio_vitoria', 'desafio_derrota',
];

describe('banco de frases', () => {
  it('frases.ts está em dia com docs/narrador.md (rode npm run frases)', () => {
    const md = readFileSync(new URL('../../docs/narrador.md', import.meta.url), 'utf8');
    expect(lerBanco(md)).toEqual(FRASES);
  });

  it('toda frase usa só variáveis conhecidas', () => {
    const conhecidas = new Set<string>(VARIAVEIS);
    const desconhecidas = TODAS.flatMap(([ev, l]) =>
      l.flatMap((f) => variaveisDa(f.t).filter((v) => !conhecidas.has(v)).map((v) => `${ev}: {${v}} em "${f.t}"`)),
    );
    expect(desconhecidas).toEqual([]);
  });

  it(`lance, fim, desempate e desafio: até ${MAX_CARACTERES} caracteres com ${maisLongo.nome} e apelido de 12`, () => {
    const longas = TODAS.filter(([ev]) => LIMITADOS.includes(ev)).flatMap(([ev, l]) =>
      l
        .map((f) => preencher(f.t, CONTEXTO_LONGO)!)
        .filter((t) => t.length > MAX_CARACTERES)
        .map((t) => `${ev} (${t.length}): ${t}`),
    );
    expect(longas).toEqual([]);
  });

  it(`com apelido de ${APELIDO_MAX}, nenhuma frase acima de ${MAX_CARACTERES} chega à tela`, () => {
    const rng = criarAleatorio(77);
    const ctx = { ...CONTEXTO_LONGO, apelido: apelidoMax, desafiante: apelidoMax };
    for (const ev of LIMITADOS) {
      expect(temLimite(ev), ev).toBe(true);
      for (let i = 0; i < 200; i++) {
        const f = escolherFrase(ev, ctx, rng);
        expect(f, ev).not.toBeNull();
        expect(f!.texto.length, f!.texto).toBeLessThanOrEqual(MAX_CARACTERES);
      }
    }
  });

  it('toda situação da lista de limitados existe no banco', () => {
    for (const ev of LIMITADOS) expect(FRASES[ev], ev).toBeDefined();
    expect(FRASES).not.toHaveProperty('empate');
  });

  it('nenhuma frase escreve nome de clube direto (só variáveis)', () => {
    // "Vitória" também é palavra comum ("Vitória!"), então fica de fora da busca.
    const nomes = oficiais.filter((t) => t.id !== 'vitoria').map((t) => t.nome.toLowerCase());
    const comNome = TODAS.flatMap(([, l]) => l.filter((f) => nomes.some((n) => f.t.toLowerCase().includes(n))));
    expect(comNome).toEqual([]);
  });
});

describe('troca de variáveis', () => {
  const fla: TimeNarrado = { nome: 'Flamengo', artigo: 'o' };
  const chape: TimeNarrado = { nome: 'Chapecoense', artigo: 'a' };

  it('usa o artigo do time', () => {
    const f = '{o_time} {do_time} {pro_time} {no_time}';
    expect(preencher(f, { time: fla })).toBe('O Flamengo do Flamengo pro Flamengo no Flamengo');
    expect(preencher(f, { time: chape })).toBe('A Chapecoense da Chapecoense pra Chapecoense na Chapecoense');
  });

  it('põe maiúscula na variável que abre frase, inclusive depois de ponto', () => {
    expect(preencher('PASSOU! {o_time} deixou {o_rival} pra trás!', { time: fla, rival: chape })).toBe(
      'PASSOU! O Flamengo deixou a Chapecoense pra trás!',
    );
    expect(preencher('{apelido} te desafiou', { apelido: 'zé' })).toBe('Zé te desafiou');
  });

  it('não mexe em minúscula depois de reticências do próprio texto', () => {
    expect(preencher('A bola subiu, subiu... e não voltou.', {})).toBe('A bola subiu, subiu... e não voltou.');
  });

  it('devolve null quando falta variável', () => {
    expect(preencher('Atrás {do_rival}?', { time: fla })).toBeNull();
    expect(preencher('Ganhou de {desafiante}!', { time: fla })).toBeNull();
  });

  it('sem time ("Outro time") não sai rival, mesmo se vier no contexto', () => {
    expect(preencher('{o_rival} tá na frente.', { rival: fla })).toBeNull();
  });
});

describe('escolherFrase', () => {
  const ctxFla: ContextoNarrador = { time: { nome: 'Flamengo', artigo: 'o' }, rival: { nome: 'Fluminense', artigo: 'o' } };

  it('não repete frase na mesma partida enquanto houver opção', () => {
    const rng = criarAleatorio(1);
    const usadas = new Set<string>();
    const total = FRASES.gol.length;
    for (let i = 0; i < total; i++) {
      const f = escolherFrase('gol', { ...ctxFla, usadas }, rng)!;
      expect(usadas.has(f.id)).toBe(false);
      usadas.add(f.id);
    }
    expect(usadas.size).toBe(total);
  });

  it('evita as recentes do aparelho, mas usa se não sobrar outra', () => {
    const rng = criarAleatorio(2);
    const todas = FRASES.trave_gol.map((f) => f.t);
    const recentes = todas.slice(0, -1);
    for (let i = 0; i < 50; i++) expect(escolherFrase('trave_gol', { ...ctxFla, recentes }, rng)!.id).toBe(todas.at(-1));
    expect(escolherFrase('trave_gol', { ...ctxFla, recentes: todas }, rng)).not.toBeNull();
  });

  it('frase rara sai bem menos (peso 1/10)', () => {
    const rng = criarAleatorio(3);
    const raras = new Set(FRASES.gol.filter((f) => f.rara).map((f) => f.t));
    const comuns = FRASES.gol.length - raras.size;
    let nRaras = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (raras.has(escolherFrase('gol', ctxFla, rng)!.id)) nRaras++;
    const esperado = (0.1 * raras.size) / (comuns + 0.1 * raras.size);
    expect(nRaras / N).toBeGreaterThan(esperado * 0.7);
    expect(nRaras / N).toBeLessThan(esperado * 1.3);
  });

  it('"Outro time" nunca recebe frase com variável de time ou rival', () => {
    const rng = criarAleatorio(4);
    const deTime = /\{(o|do|pro|no)_(time|rival)\}/;
    for (const [ev] of TODAS) {
      for (let i = 0; i < 30; i++) {
        const f = escolherFrase(ev, { apelido: 'Zé', placar: '3 x 2', pontos: 40 }, rng);
        if (f) expect(f.id).not.toMatch(deTime);
      }
    }
  });

  it('pula frases com variável faltando e devolve null se nada servir', () => {
    const rng = criarAleatorio(5);
    // Sem desafiante, nenhuma frase de desafio_vitoria serve.
    expect(escolherFrase('desafio_vitoria', ctxFla, rng)).toBeNull();
    for (let i = 0; i < 50; i++) expect(escolherFrase('vitoria', { time: ctxFla.time }, rng)!.id).not.toMatch(/rival|placar/);
  });

  it('todo time oficial com rival cadastrado aponta para um time da lista', () => {
    for (const t of oficiais) if (t.rival) expect(rivalDe(t), t.nome).toBeDefined();
  });
});

describe('situação do lance', () => {
  const base: ResultadoCobranca = {
    desfecho: 'gol', x: 0.5, y: 0.5, zonaBola: 5, zonaGoleiro: 0, angulo: false, raspouTrave: false,
    cavadinha: false, fraca: false, pontos: 10,
  };

  it('prioridade: cavadinha > trave e gol > ângulo > gol', () => {
    expect(eventoDaCobranca({ ...base, cavadinha: true, raspouTrave: true, angulo: true })).toBe('cavadinha');
    expect(eventoDaCobranca({ ...base, raspouTrave: true, angulo: true })).toBe('trave_gol');
    expect(eventoDaCobranca({ ...base, angulo: true })).toBe('gol_angulo');
    expect(eventoDaCobranca(base)).toBe('gol');
  });

  it('erros viram a situação certa', () => {
    expect(eventoDaCobranca({ ...base, desfecho: 'defesa', cavadinha: true })).toBe('cavadinha_falhou');
    expect(eventoDaCobranca({ ...base, desfecho: 'defesa' })).toBe('goleiro_pegou');
    expect(eventoDaCobranca({ ...base, desfecho: 'trave' })).toBe('trave');
    expect(eventoDaCobranca({ ...base, desfecho: 'fora', y: 1.3 })).toBe('fora_cima');
    expect(eventoDaCobranca({ ...base, desfecho: 'fora', x: 1.3, y: 0.4 })).toBe('fora_lado');
  });
});
