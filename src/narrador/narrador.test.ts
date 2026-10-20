import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_OUTRO, TIMES, rivalDe } from '../dados/times';
import { APELIDO_MAX } from '../estado';
import { criarAleatorio } from '../jogo/aleatorio';
import {
  ETIQUETAS,
  MAX_CARACTERES,
  PESO_ETIQUETA,
  PESO_RARA,
  escolherFrase,
  preencher,
  temLimite,
  variaveisDa,
  VARIAVEIS,
  type ContextoNarrador,
  type Etiqueta,
  type TimeNarrado,
} from './escolher';
import { FRASES, type EventoNarrador, type Frase } from './frases';
import { etiquetasDaCobranca, etiquetasDaDefesa, eventoDaCobranca, eventoDaDefesa } from './lance';
import {
  coluna,
  planejarDefesa,
  resolverCobranca,
  resolverDefesa,
  type ResultadoCobranca,
  type ResultadoDefesa,
} from '../jogo/penaltis';

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
      const e: string[] = [];
      let m: RegExpMatchArray | null;
      while ((m = t.match(/\s*\[(\w+)\]$/))) {
        e.unshift(m[1]);
        t = t.slice(0, m.index).trim();
      }
      const f: Frase = { t };
      if (rara) f.rara = true;
      if (e.length) f.e = e;
      banco[atual].push(f);
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

// Pedido do Kauê: lance, fim de partida, desempate e X1 cabem em 75 caracteres.
// Ranking e cidade ficam de fora (aparecem em blocos maiores da tela inicial e do ranking).
const LIMITADOS: EventoNarrador[] = [
  'abertura', 'gol', 'gol_angulo', 'cavadinha', 'cavadinha_falhou', 'trave_gol', 'trave',
  'fora_cima', 'fora_lado', 'goleiro_pegou', 'defesa', 'sofreu_gol', 'decisiva',
  'morte_subita', 'par_ou_impar_escolha', 'par_ou_impar_ganhou', 'par_ou_impar_perdeu',
  'maquina_fora', 'vitoria', 'derrota', 'cinco_cobrancas', 'cinco_defesas',
  'desafio_vitoria', 'desafio_derrota',
];

// Etiquetas que cada situação de lance pode receber (tabela "Etiquetas de lance" do narrador.md).
const LUGAR: Etiqueta[] = ['canto', 'meio', 'alto', 'baixo'];
const DA_COBRANCA: Etiqueta[] = [...LUGAR, 'fraca', 'goleiro_outro_lado', 'travessao'];
const DA_DEFESA: Etiqueta[] = [...LUGAR, 'pulou_outro_lado', 'mesma_coluna', 'nao_pulou', 'dica_honesta'];
const ETIQUETAS_POR_EVENTO: Partial<Record<EventoNarrador, Etiqueta[]>> = {
  gol: DA_COBRANCA, gol_angulo: DA_COBRANCA, cavadinha: DA_COBRANCA, cavadinha_falhou: DA_COBRANCA,
  trave_gol: DA_COBRANCA, trave: DA_COBRANCA, fora_cima: DA_COBRANCA, fora_lado: DA_COBRANCA,
  goleiro_pegou: DA_COBRANCA,
  defesa: DA_DEFESA, sofreu_gol: DA_DEFESA, maquina_fora: DA_DEFESA,
  decisiva: ['cobranca', 'defesa'],
  // Crava a Rodada (narrador.md, seção 9).
  crava_exato: ['contra'], crava_saldo: ['empate', 'contra'], crava_vencedor: ['empate', 'contra'],
  crava_errou: ['contra'],
  // Prova de Boleiro (narrador.md, seção 10).
  prova_ajuda: ['tira_duas', 'arquibancada', 'troca'],
};
const DE_LANCE = Object.keys(ETIQUETAS_POR_EVENTO) as EventoNarrador[];
const fraseDe = (ev: EventoNarrador, id: string) => (FRASES[ev] as readonly Frase[]).find((f) => f.t === id)!;

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

  it('toda etiqueta usada existe na tabela', () => {
    const conhecidas = new Set<string>(ETIQUETAS);
    const desconhecidas = TODAS.flatMap(([ev, l]) =>
      l.flatMap((f) => (f.e ?? []).filter((e) => !conhecidas.has(e)).map((e) => `${ev}: [${e}] em "${f.t}"`)),
    );
    expect(desconhecidas).toEqual([]);
  });

  it('etiqueta só aparece em situação que pode receber ela', () => {
    const erradas = TODAS.flatMap(([ev, l]) => {
      const pode = new Set<string>(ETIQUETAS_POR_EVENTO[ev] ?? []);
      return l.flatMap((f) => (f.e ?? []).filter((e) => !pode.has(e)).map((e) => `${ev}: [${e}] em "${f.t}"`));
    });
    expect(erradas).toEqual([]);
  });

  it('todo tipo de lance tem pelo menos uma frase sem etiqueta', () => {
    for (const ev of DE_LANCE) expect((FRASES[ev] as readonly Frase[]).some((f) => !f.e), ev).toBe(true);
  });

  it('etiqueta nunca vai pra tela', () => {
    expect(TODAS.flatMap(([, l]) => l.filter((f) => /[[\]]/.test(f.t)).map((f) => f.t))).toEqual([]);
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
  // Sem etiquetas no contexto, só as frases sem etiqueta podem sair.
  const golSemEtiqueta = (FRASES.gol as readonly Frase[]).filter((f) => !f.e);

  it('não repete frase na mesma partida enquanto houver opção', () => {
    const rng = criarAleatorio(1);
    const usadas = new Set<string>();
    const total = golSemEtiqueta.length;
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
    const raras = new Set(golSemEtiqueta.filter((f) => f.rara).map((f) => f.t));
    const comuns = golSemEtiqueta.length - raras.size;
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

describe('etiquetas no sorteio', () => {
  const ctx: ContextoNarrador = { time: { nome: 'Flamengo', artigo: 'o' } };

  it('frase com etiqueta só sai se todas forem verdadeiras', () => {
    const rng = criarAleatorio(11);
    const etiquetas = new Set<Etiqueta>(['meio', 'baixo']);
    for (const ev of DE_LANCE) {
      for (let i = 0; i < 300; i++) {
        const f = escolherFrase(ev, { ...ctx, etiquetas }, rng)!;
        for (const e of fraseDe(ev, f.id).e ?? []) expect(etiquetas.has(e as Etiqueta), `${ev}: ${f.id}`).toBe(true);
      }
    }
  });

  it('sem etiqueta no lance, só saem frases sem etiqueta', () => {
    const rng = criarAleatorio(12);
    for (let i = 0; i < 300; i++) expect(fraseDe('gol', escolherFrase('gol', ctx, rng)!.id).e).toBeUndefined();
  });

  it(`frase com etiqueta que combina tem peso ${PESO_ETIQUETA}`, () => {
    const rng = criarAleatorio(13);
    const etiquetas = new Set<Etiqueta>(['fraca', 'baixo', 'canto', 'goleiro_outro_lado']);
    const opcoes = (FRASES.goleiro_pegou as readonly Frase[]).filter(
      (f) => !f.e || f.e.every((e) => etiquetas.has(e as Etiqueta)),
    );
    const peso = (f: Frase) => (f.rara ? PESO_RARA : 1) * (f.e ? PESO_ETIQUETA : 1);
    const total = opcoes.reduce((a, f) => a + peso(f), 0);
    const esperado = opcoes.filter((f) => f.e).reduce((a, f) => a + peso(f), 0) / total;
    let comEtiqueta = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      if (fraseDe('goleiro_pegou', escolherFrase('goleiro_pegou', { ...ctx, etiquetas }, rng)!.id).e) comEtiqueta++;
    }
    expect(comEtiqueta / N).toBeGreaterThan(esperado - 0.02);
    expect(comEtiqueta / N).toBeLessThan(esperado + 0.02);
  });

  it('decisiva separa cobrança e defesa', () => {
    const rng = criarAleatorio(14);
    const de = (e: Etiqueta) => fraseDe('decisiva', escolherFrase('decisiva', { ...ctx, etiquetas: new Set([e]) }, rng)!.id);
    for (let i = 0; i < 200; i++) {
      expect(de('cobranca').e ?? ['cobranca']).toEqual(['cobranca']);
      expect(de('defesa').e ?? ['defesa']).toEqual(['defesa']);
    }
  });
});

describe('etiquetas do lance', () => {
  const c = (p: Partial<ResultadoCobranca>): ResultadoCobranca => ({
    desfecho: 'gol', x: 0, y: 0.3, zonaBola: 1, zonaGoleiro: 0, angulo: false, raspouTrave: false,
    cavadinha: false, fraca: false, goleiroLeu: false, pontos: 10, ...p,
  });
  const d = (p: Partial<ResultadoDefesa>): ResultadoDefesa => ({
    desfecho: 'gol', alvo: 3, zonaGoleiro: 5, contraGravada: false, pontos: 0, ...p,
  });
  const ordenadas = (s: Set<Etiqueta>) => [...s].sort();

  it('cobrança: lugar, força, goleiro e travessão', () => {
    expect(ordenadas(etiquetasDaCobranca(c({})))).toEqual(['baixo', 'goleiro_outro_lado', 'meio']);
    expect(ordenadas(etiquetasDaCobranca(c({ zonaBola: 5, zonaGoleiro: 2, fraca: true })))).toEqual(['alto', 'canto', 'fraca']);
    expect(etiquetasDaCobranca(c({ desfecho: 'trave', y: 1.03, zonaBola: 4 })).has('travessao')).toBe(true);
    expect(etiquetasDaCobranca(c({ desfecho: 'trave', x: 1.03, y: 0.5, zonaBola: 5 })).has('travessao')).toBe(false);
  });

  it('defesa: pulo, coluna e dica', () => {
    expect(ordenadas(etiquetasDaDefesa(d({}), 0))).toEqual(['alto', 'canto', 'dica_honesta', 'pulou_outro_lado']);
    expect(ordenadas(etiquetasDaDefesa(d({ zonaGoleiro: 0 }), 1))).toEqual(['alto', 'canto', 'mesma_coluna']);
    expect(ordenadas(etiquetasDaDefesa(d({ alvo: 1, zonaGoleiro: -1 }), 1))).toEqual(['baixo', 'dica_honesta', 'meio', 'nao_pulou']);
    expect(ordenadas(etiquetasDaDefesa(d({ desfecho: 'defesa', zonaGoleiro: 3 }), 2))).toEqual(['alto', 'canto']);
  });

  it('batedor da máquina errando vira maquina_fora', () => {
    expect(eventoDaDefesa(d({ desfecho: 'fora' }))).toBe('maquina_fora');
  });

  it('em lances simulados, sempre sai uma frase', () => {
    const rng = criarAleatorio(15);
    const ctx: ContextoNarrador = { time: { nome: 'Flamengo', artigo: 'o' } };
    for (let s = 1; s <= 400; s++) {
      const gesto = { dir: ((s * 37) % 201) - 100, forca: (s * 13) % 101, efeito: ((s * 7) % 41) - 20 };
      const r = resolverCobranca(s, 0, gesto, 0.5);
      expect(escolherFrase(eventoDaCobranca(r), { ...ctx, etiquetas: etiquetasDaCobranca(r) }, rng)).not.toBeNull();
      const dr = resolverDefesa(s, 0, (s % 7) - 1, 0.5);
      const { dica } = planejarDefesa(s, 0, 0.5);
      const e = etiquetasDaDefesa(dr, dica);
      expect(e.has('dica_honesta')).toBe(coluna(dr.alvo) === dica);
      expect(escolherFrase(eventoDaDefesa(dr), { ...ctx, etiquetas: e }, rng)).not.toBeNull();
    }
  });
});

describe('situação do lance', () => {
  const base: ResultadoCobranca = {
    desfecho: 'gol', x: 0.5, y: 0.5, zonaBola: 5, zonaGoleiro: 0, angulo: false, raspouTrave: false,
    cavadinha: false, fraca: false, goleiroLeu: false, pontos: 10,
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
