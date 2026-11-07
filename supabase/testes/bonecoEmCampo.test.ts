// Boneco em campo e no X1 (20261107000000, docs/jogo.md seções 6 e 14.5): o interruptor "Meu boneco em campo", as
// peças que saem para quem recebe o desafio (conferidas contra o catálogo de src/jogo/vestiario.ts) e o que nunca
// sai. Roda contra o SQL de verdade (PGlite), com o fluxo da função `boneco`.

import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste, cortarLancesNoFuturo } from './banco';
import { ErroBoneco, ligarEmCampo, meuBoneco, salvarBoneco, type Servicos } from '../functions/boneco/fluxo';
import {
  BRACOS,
  CABECAS,
  CABELOS,
  CHUTEIRAS,
  CORES_DE_CABELO,
  CORPOS,
  FORMATO_DO_NUMERO,
  PADRAO,
  PECAS,
  PELES,
  PUNHOS,
  type Vestimenta,
} from '../../src/jogo/vestiario';

const TEMPO = 120_000;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
let db: PGlite;

const servicos: Servicos = {
  async rpc(nome, args) {
    const nomes = Object.keys(args);
    const sql = `select public.${nome}(${nomes.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`;
    const valores = nomes.map((k) => (typeof args[k] === 'object' && args[k] !== null ? JSON.stringify(args[k]) : args[k]));
    await db.exec('set role service_role');
    try {
      return { data: (await db.query<{ r: unknown }>(sql, valores)).rows[0].r, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    } finally {
      await db.exec('reset role');
    }
  },
  sortear: (() => {
    let s = 11;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })(),
};

/** As peças que vão a campo, na ordem do retorno de boneco_para_campo. */
const CAMPO = {
  corpo: CORPOS,
  pele: PELES,
  cabelo: CABELOS,
  corCabelo: CORES_DE_CABELO,
  cabeca: CABECAS,
  punho: PUNHOS,
  braco: BRACOS,
  chuteira: CHUTEIRAS,
} as const;
const CHAVES_DE_CAMPO = [...Object.keys(CAMPO), 'numero'].sort();
const padraoDeCampo = () => Object.fromEntries(CHAVES_DE_CAMPO.map((k) => [k, PADRAO[k as keyof Vestimenta]]));

async function torcedor(time = 'flamengo'): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

const ler = (uid: string, sessao = uid) => meuBoneco(servicos, uid, sessao);
const salvar = (uid: string, v: unknown) => salvarBoneco(servicos, uid, uid, { vestimenta: v });
const ligar = (uid: string, ligado: unknown, sessao = uid) => ligarEmCampo(servicos, uid, sessao, { ligado });

async function erroDe(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroBoneco) return e.codigo;
    throw e;
  }
  return 'sem erro';
}

/** Desafio de pênaltis e do Lances de quem chamou; devolve os dois ids. */
async function desafios(quem: string): Promise<{ penaltis: string; lances: string }> {
  const nova = async () =>
    (
      await db.query<{ id: string }>(
        `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
         values ($1, 'normal', 1, 0.5, now() + interval '15 minutes') returning id`,
        [quem],
      )
    ).rows[0].id;
  const penaltis = `p${String(++seq).padStart(7, '0')}`;
  const lances = `l${String(++seq).padStart(7, '0')}`;
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos)
     values ($1, $2, $3, 'flamengo', '[]', 3, 2, 80)`,
    [penaltis, await nova(), quem],
  );
  await db.query(
    `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, lance_id, pontos, gols, recriados, faixa)
     values ($1, $2, $3, 'flamengo', 'flamengo-1981-toquio', 120, 2, 1, 'media')`,
    [lances, await nova(), quem],
  );
  return { penaltis, lances };
}

/** Quem recebe o link: anônimo (sem login) ou outra conta. */
async function comoCelular<T>(papel: 'anon' | 'authenticated', uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', '', false)`, [uid ?? '']);
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

interface LinhaComBoneco {
  boneco: Record<string, unknown> | null;
  [k: string]: unknown;
}
const verPenaltis = async (id: string, papel: 'anon' | 'authenticated' = 'anon', uid: string | null = null) =>
  (await comoCelular<LinhaComBoneco>(papel, uid, 'select * from public.ver_desafio($1)', [id]))[0];
const verLances = async (id: string, papel: 'anon' | 'authenticated' = 'anon', uid: string | null = null) =>
  (await comoCelular<LinhaComBoneco>(papel, uid, 'select * from public.ver_desafio_lances($1)', [id]))[0];

/** O que boneco_para_campo devolve para uma vestimenta qualquer (como o banco faz dentro do ver_desafio). */
async function paraCampo(v: unknown): Promise<Record<string, unknown> | null> {
  return (await db.query<{ r: Record<string, unknown> | null }>('select public.boneco_para_campo($1::jsonb) as r', [JSON.stringify(v)])).rows[0].r;
}

beforeAll(async () => {
  db = await bancoDeTeste();
  await cortarLancesNoFuturo(db);
}, TEMPO);

describe('as peças de campo batem com o catálogo', () => {
  it('todo valor do catálogo passa, em cada peça de campo', async () => {
    for (const [campo, valores] of Object.entries(CAMPO)) {
      for (const valor of valores) {
        const r = await paraCampo({ ...PADRAO, [campo]: valor });
        expect(r?.[campo], `${campo} = ${String(valor)}`).toEqual(valor);
      }
    }
    for (const numero of ['0', '00', '7', '07', '10', '99', null]) {
      expect((await paraCampo({ ...PADRAO, numero }))?.numero).toEqual(numero);
    }
  });

  it('as listas do SQL são exatamente as do catálogo (nos dois sentidos)', () => {
    const sql = readFileSync(join(import.meta.dirname, '..', 'migrations', '20261107000000_boneco_em_campo.sql'), 'utf8');
    const corpo = sql.slice(sql.indexOf('create or replace function public.boneco_para_campo'), sql.indexOf('create or replace function public.boneco_do_desafiante'));
    for (const [campo, valores] of Object.entries(CAMPO)) {
      const m = new RegExp(`'${campo}', case[\\s\\S]*?p ->> '${campo}' in \\(([^)]*)\\)`).exec(corpo);
      expect(m, campo).not.toBeNull();
      const doSql = [...m![1].matchAll(/'([^']*)'/g)].map((x) => x[1]).sort();
      expect(doSql, campo).toEqual(valores.map(String).sort());
    }
    expect(corpo).toContain(`p ->> 'numero' ~ '${FORMATO_DO_NUMERO.source}'`);
  });

  it('tipos e formas estranhas voltam ao padrão', async () => {
    // jsonb guarda 3.0 com o ponto: o texto "3.0" não está na lista, volta a 0 (o aparelho nunca manda assim).
    const comPonto = await db.query<{ r: Record<string, unknown> }>(`select public.boneco_para_campo('{"pele": 3.0}'::jsonb) as r`);
    expect(comPonto.rows[0].r.pele).toBe(0);
    const casos: [string, unknown, unknown][] = [
      ['pele', true, 0],
      ['pele', null, 0],
      ['corCabelo', 6, 0],
      ['corpo', 'H', 'h'],
      ['cabelo', 'Coque', 'raspado'],
      ['numero', '7\n', null],
      ['numero', ' 7', null],
      ['numero', '٧', null],
      ['cabeca', null, 'nenhum'],
      ['braco', { a: 1 }, 'nenhum'],
    ];
    for (const [campo, valor, esperado] of casos) {
      const r = await paraCampo({ ...PADRAO, [campo]: valor });
      expect(r?.[campo], `${campo} = ${JSON.stringify(valor)}`).toEqual(esperado);
    }
  });

  it('só as 9 peças de campo saem: camisa, colete, faixa, apito, pose, fundo e moldura nunca', async () => {
    const tudo: Vestimenta = {
      ...PADRAO,
      camisa: 'goleiro',
      peito: 'colete',
      pescoco: 'apito',
      pose: 'bracos',
      fundo: PECAS.find((p) => p.campo === 'fundo')!.valor as Vestimenta['fundo'],
      moldura: 'galeria',
    };
    const r = await paraCampo({ ...tudo, torcedor_id: uuid(), extra: 'x' });
    expect(Object.keys(r!).sort()).toEqual(CHAVES_DE_CAMPO);
  });

  it('valor fora do catálogo ou de tipo errado volta ao padrão, campo a campo', async () => {
    const r = await paraCampo({
      v: 1,
      corpo: 'x',
      pele: '3', // texto no lugar de número
      cabelo: 'careca',
      corCabelo: 9,
      numero: '123',
      cabeca: ['testeira'],
      punho: 'munhequeira_prata',
      braco: true,
      chuteira: { cor: 'time' },
    });
    expect(r).toEqual(padraoDeCampo());
    expect(await paraCampo({ cabelo: 'coque' })).toEqual({ ...padraoDeCampo(), cabelo: 'coque' });
    expect(await paraCampo({ numero: 7 })).toEqual(padraoDeCampo()); // número da camisa é texto
    expect(await paraCampo([])).toBeNull();
    expect(await paraCampo('coque')).toBeNull();
  });
});

describe('o boneco de quem chamou no resumo do desafio', () => {
  it('interruptor ligado: as peças de campo de quem chamou, nos dois X1', async () => {
    const quem = await torcedor();
    await salvar(quem, { ...PADRAO, cabelo: 'trancas', pele: 4, numero: '10', camisa: 'uni2' });
    const d = await desafios(quem);
    const esperado = { ...padraoDeCampo(), cabelo: 'trancas', pele: 4, numero: '10' };
    expect((await verPenaltis(d.penaltis)).boneco).toEqual(esperado);
    expect((await verLances(d.lances)).boneco).toEqual(esperado);
    // Outra conta logada também vê; o retorno nunca traz o id de quem chamou.
    const outro = await torcedor();
    const linha = await verPenaltis(d.penaltis, 'authenticated', outro);
    expect(linha.boneco).toEqual(esperado);
    expect(Object.keys(linha)).not.toContain('torcedor_id');
    expect(JSON.stringify(linha)).not.toContain(quem);
    expect(JSON.stringify(await verLances(d.lances))).not.toContain(quem);
  });

  it('interruptor desligado não devolve vestimenta; ligado de novo, volta (buscada na hora)', async () => {
    const quem = await torcedor();
    await salvar(quem, { ...PADRAO, numero: '9' });
    const d = await desafios(quem);
    expect(await ligar(quem, false)).toEqual({ emCampo: false });
    expect((await verPenaltis(d.penaltis)).boneco).toBeNull();
    expect((await verLances(d.lances)).boneco).toBeNull();
    // O resto do resumo continua igual.
    expect((await verPenaltis(d.penaltis)).pontos).toBe(80);
    expect(await ligar(quem, true)).toEqual({ emCampo: true });
    expect((await verPenaltis(d.penaltis)).boneco?.numero).toBe('9');
    // Mudou o boneco depois do desafio: quem recebe vê o de agora (nada é gravado por desafio).
    await salvar(quem, { ...PADRAO, numero: '11' });
    expect((await verLances(d.lances)).boneco?.numero).toBe('11');
  });

  it('vestimenta inválida no banco sai validada', async () => {
    const quem = await torcedor();
    await ler(quem);
    // Gravada por fora da função (a chave secreta pode tudo): o resumo nunca devolve o que está fora do catálogo.
    await db.query(`update public.torcedor_boneco set vestimenta = $2 where torcedor_id = $1`, [
      quem,
      JSON.stringify({ corpo: 'm', pele: 99, cabelo: '<script>', numero: 'DEZ', punho: 'munhequeira_bronze', peito: 'faixa', fundo: 'estadio', segredo: 'x' }),
    ]);
    const d = await desafios(quem);
    const r = (await verPenaltis(d.penaltis)).boneco;
    expect(r).toEqual({ ...padraoDeCampo(), corpo: 'm', punho: 'munhequeira_bronze' });
    expect((await verLances(d.lances)).boneco).toEqual(r);
  });

  it('desafio de conta sem boneco devolve vazio', async () => {
    const quem = await torcedor();
    const d = await desafios(quem);
    expect((await verPenaltis(d.penaltis)).boneco).toBeNull();
    expect((await verLances(d.lances)).boneco).toBeNull();
  });

  it('conta apagada: o desafio some junto (cascata), com o boneco', async () => {
    const quem = await torcedor();
    await ler(quem);
    const d = await desafios(quem);
    expect(await verPenaltis(d.penaltis)).toBeDefined();
    await comoCelular('authenticated', quem, 'select public.apagar_meus_dados()');
    expect(await verPenaltis(d.penaltis)).toBeUndefined();
    expect(await verLances(d.lances)).toBeUndefined();
  });

  it('o celular não chama as funções internas', async () => {
    const eu = await torcedor();
    for (const f of [
      `public.boneco_para_campo('{}')`,
      `public.boneco_do_desafiante('${eu}')`,
      `public.boneco_em_campo('${eu}', '${eu}', false)`,
    ]) {
      await expect(comoCelular('anon', null, `select ${f}`)).rejects.toThrow(/permission denied/);
      await expect(comoCelular('authenticated', eu, `select ${f}`)).rejects.toThrow(/permission denied/);
    }
  });
});

describe('o interruptor na função boneco', () => {
  it('nasce ligado e a leitura devolve como está', async () => {
    const eu = await torcedor();
    expect((await ler(eu)).emCampo).toBe(true);
    await ligar(eu, false);
    expect((await ler(eu)).emCampo).toBe(false);
    // Salvar a vestimenta não mexe no interruptor.
    expect((await salvar(eu, { ...PADRAO, numero: '3' })).emCampo).toBe(false);
  });

  it('conta sem boneco ganha o sorteado e o interruptor fica gravado', async () => {
    const eu = await torcedor();
    expect(await ligar(eu, false)).toEqual({ emCampo: false });
    const r = await ler(eu);
    expect(r.emCampo).toBe(false);
    expect(r.vestimenta).toBeDefined();
  });

  it('recusa o que não é sim ou não', async () => {
    const eu = await torcedor();
    for (const x of [undefined, null, 'false', 0, 1, {}]) expect(await erroDe(ligar(eu, x))).toBe('formato');
  });

  it('conta no mesmo limite por hora do salvar', async () => {
    const eu = await torcedor();
    await ler(eu);
    for (let k = 0; k < 15; k++) await salvar(eu, { ...PADRAO, numero: String(k) });
    for (let k = 0; k < 15; k++) await ligar(eu, k % 2 === 0);
    expect((await ler(eu)).emCampo).toBe(true); // a 30ª gravação (k = 14, ligar) ficou
    expect(await erroDe(ligar(eu, true))).toBe('limite');
    expect(await erroDe(salvar(eu, PADRAO))).toBe('limite');
    await db.query(`update public.torcedor_boneco set janela_desde = now() - interval '61 minutes' where torcedor_id = $1`, [eu]);
    expect(await ligar(eu, true)).toEqual({ emCampo: true });
  });

  it('desligar passa mesmo no limite, sem somar gravação; ligar de novo espera a janela', async () => {
    const eu = await torcedor();
    await ler(eu);
    for (let k = 0; k < 30; k++) await salvar(eu, { ...PADRAO, numero: String(k) });
    expect(await erroDe(salvar(eu, PADRAO))).toBe('limite');
    for (let k = 0; k < 3; k++) expect(await ligar(eu, false)).toEqual({ emCampo: false });
    const d = await desafios(eu);
    expect((await verPenaltis(d.penaltis)).boneco).toBeNull();
    expect((await db.query<{ g: number }>('select gravacoes as g from public.torcedor_boneco where torcedor_id = $1', [eu])).rows[0].g).toBe(30);
    expect(await erroDe(ligar(eu, true))).toBe('limite');
  });

  it('sessão desconectada ou de outra pessoa não grava', async () => {
    const eu = await torcedor();
    const outro = await torcedor();
    await ler(eu);
    expect(await erroDe(ligar(eu, false, outro))).toBe('sessao');
    expect(await erroDe(ligar(eu, false, uuid()))).toBe('sessao');
    expect((await ler(eu)).emCampo).toBe(true);
  });
});

describe('"Ver meus dados" e a junção de contas', () => {
  it('"Ver meus dados" mostra o interruptor (null sem boneco), sem a vestimenta', async () => {
    const eu = await torcedor();
    const dados = async () => (await comoCelular<{ d: Record<string, unknown> }>('authenticated', eu, 'select public.ver_meus_dados() as d'))[0].d;
    expect((await dados()).boneco_em_campo).toBeNull();
    await ler(eu);
    expect((await dados()).boneco_em_campo).toBe(true);
    await ligar(eu, false);
    const d = await dados();
    expect(d.boneco_em_campo).toBe(false);
    expect(JSON.stringify(d)).not.toContain('vestimenta');
  });

  describe('junção', () => {
    const impressao = (codigo: string) => createHash('sha256').update(codigo).digest('hex');
    async function juntar(dono: string, origem: string): Promise<void> {
      const codigo = `E${++seq}`;
      await db.exec('set role service_role');
      try {
        await db.query('select public.codigo_gerar($1, $2)', [dono, impressao(codigo)]);
        await db.query('select * from public.codigo_conferir($1, $2)', [origem, impressao(codigo)]);
        await db.query('select * from public.juntar_torcedores($1, $2, null)', [impressao(codigo), origem]);
      } finally {
        await db.exec('reset role');
      }
    }
    const emCampo = async (uid: string) =>
      (await db.query<{ em_campo: boolean }>('select em_campo from public.torcedor_boneco where torcedor_id = $1', [uid])).rows[0]?.em_campo;

    it('desligado em qualquer das duas contas, fica desligado; o boneco é o do dono', async () => {
      for (const [d, o, esperado] of [
        [true, true, true],
        [false, true, false],
        [true, false, false],
        [false, false, false],
      ] as const) {
        const dono = await torcedor();
        const origem = await torcedor();
        await salvar(dono, { ...PADRAO, numero: '1' });
        await salvar(origem, { ...PADRAO, numero: '2' });
        await ligar(dono, d);
        await ligar(origem, o);
        await juntar(dono, origem);
        expect(await emCampo(dono), `dono ${d}, origem ${o}`).toBe(esperado);
        expect((await ler(dono)).vestimenta.numero).toBe('1');
      }
    });

    it('dono sem boneco fica com o da conta que entrou, com o interruptor dela', async () => {
      const dono = await torcedor();
      const origem = await torcedor();
      await salvar(origem, { ...PADRAO, numero: '5' });
      await ligar(origem, false);
      await juntar(dono, origem);
      expect(await emCampo(dono)).toBe(false);
      expect((await ler(dono)).vestimenta.numero).toBe('5');
    });
  });
});
