// Boneco montável no servidor (20261106300000, docs/jogo.md seção 14.5): o fluxo da função `boneco` rodando contra o
// SQL de verdade (PGlite). Formato recusado, peça trancada trocada pela padrão, liberação lida do banco (XP, medalhas,
// Seleção pelo catálogo, aquecimento), limite por hora, sessão desconectada, RLS, junção, apagar, contas paradas e o
// zerar da pré-temporada.

import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste, cortarLancesNoFuturo } from './banco';
import { ErroBoneco, meuBoneco, salvarBoneco, type Servicos } from '../functions/boneco/fluxo';
import { conferirTamanho, lerPedido, sessaoDoPasse, TAMANHO_DO_PEDIDO } from '../functions/boneco/pedido';
import { CORPOS, PADRAO, PECAS, type Vestimenta } from '../../src/jogo/vestiario';

const TEMPO = 120_000;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
let db: PGlite;

/** Como a função `boneco`: chave secreta, chamando as funções do banco pelo nome dos parâmetros. */
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
    let s = 7;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })(),
};

async function torcedor(time: string | null = 'flamengo'): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  if (time) await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

/** A sessão de nascença tem o id do usuário (supabase/testes/banco.ts). */
const ler = (uid: string, sessao = uid) => meuBoneco(servicos, uid, sessao);
const salvar = (uid: string, vestimenta: unknown, sessao = uid) => salvarBoneco(servicos, uid, sessao, { vestimenta });
const guardada = async (uid: string) =>
  (await db.query<{ vestimenta: Vestimenta }>('select vestimenta from public.torcedor_boneco where torcedor_id = $1', [uid])).rows[0]?.vestimenta;

async function erroDe(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroBoneco) return e.codigo;
    throw e;
  }
  return 'sem erro';
}

async function xp(uid: string, quanto: number): Promise<void> {
  await db.query(`insert into public.carreira_bonus (torcedor_id, tipo, referencia, xp) values ($1, 'semana', $2, $3)`, [
    uid,
    `2026-${String(1 + (seq % 12)).padStart(2, '0')}-${String(1 + (++seq % 28)).padStart(2, '0')}`,
    quanto,
  ]);
}

/** `gols` gols num lance (os primeiros `recriados` recriando), cada um numa partida. */
async function golsNoLance(uid: string, lance: string, gols: number, recriados = 0): Promise<void> {
  for (let k = 0; k < gols; k++) {
    await db.query('insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou) values ($1, 0, $2, $3, $4)', [
      uuid(),
      uid,
      lance,
      k < recriados,
    ]);
  }
}

/** Gols e vitórias numa disputa de pênaltis (item 'penaltis:<id>'). */
async function golsNaDisputa(uid: string, disputa: string, gols: number, vitorias: number): Promise<void> {
  const item = `penaltis:${disputa}`;
  for (let k = 0; k < gols; k++) {
    await db.query('insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou) values ($1, 0, $2, $3, false)', [uuid(), uid, item]);
  }
  for (let k = 0; k < vitorias; k++) {
    await db.query(
      'insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou, vitoria) values ($1, 8, $2, $3, false, true)',
      [uuid(), uid, item],
    );
  }
}

const LANCE_DO_TIME = 'flamengo-1981-toquio';
const LANCE_DA_SELECAO = 'selecao-2002-falta-de-shizuoka';
const DISPUTA_DO_TIME = 'athletico-pr-2018-sul-americana';
const DISPUTA_DA_SELECAO = 'selecao-1994-copa-do-mundo';
const OUTROS_LANCES = ['flamengo-2001-falta-do-tri', 'flamengo-2019-virada-em-lima'];

const vestindo = (campo: keyof Vestimenta, valor: unknown) => ({ ...PADRAO, [campo]: valor });
const peca = (id: string) => PECAS.find((p) => p.id === id)!;
const vestindoPeca = (id: string) => vestindo(peca(id).campo, peca(id).valor);

beforeAll(async () => {
  db = await bancoDeTeste();
  await cortarLancesNoFuturo(db);
}, TEMPO);

describe('primeira leitura', () => {
  it('conta sem boneco ganha um sorteado só com peças do começo, e ele fica gravado', async () => {
    const eu = await torcedor();
    expect(await guardada(eu)).toBeUndefined();
    const r = await ler(eu);
    expect(await guardada(eu)).toEqual(r.vestimenta);
    const doComeco = new Set(PECAS.filter((p) => p.condicao.tipo === 'comeco').map((p) => p.id));
    expect(new Set(r.liberadas)).toEqual(doComeco);
    for (const p of PECAS) {
      if (!doComeco.has(p.id) && p.valor !== String(PADRAO[p.campo])) expect(r.vestimenta[p.campo]).not.toBe(p.valor);
    }
    expect(r.proxima).toEqual({ id: 'colete', condicao: 'Libera no Reserva' });
    // Ler de novo não sorteia outro.
    expect((await ler(eu)).vestimenta).toEqual(r.vestimenta);
  });

  it('o sorteio não conta no limite de gravações', async () => {
    const eu = await torcedor();
    await ler(eu);
    const { rows } = await db.query<{ gravacoes: number }>('select gravacoes from public.torcedor_boneco where torcedor_id = $1', [eu]);
    expect(rows[0].gravacoes).toBe(0);
  });

  // O PGlite tem uma conexão só: isto prova duas leituras em sequência. A corrida de verdade fica para o D5b-seg.
  it('duas leituras seguidas ficam com o mesmo boneco', async () => {
    const eu = await torcedor();
    const [a, b] = await Promise.all([ler(eu), ler(eu)]);
    expect(a.vestimenta).toEqual(b.vestimenta);
    expect(await guardada(eu)).toEqual(a.vestimenta);
  });

  it('sem time escolhido não há torcedor nem boneco', async () => {
    const eu = await torcedor(null);
    expect(await erroDe(ler(eu))).toBe('sem_torcedor');
    expect(await erroDe(salvar(eu, PADRAO))).toBe('sem_torcedor');
  });
});

describe('formato', () => {
  it('recusa o que não é vestimenta do catálogo, sem gravar', async () => {
    const eu = await torcedor();
    const antes = (await ler(eu)).vestimenta;
    const ruins: unknown[] = [
      null,
      'PADRAO',
      [PADRAO],
      { ...PADRAO, v: 2 },
      { ...PADRAO, cor: '#ff0000' },
      { ...PADRAO, pele: 9 },
      { ...PADRAO, corpo: 'mulher' },
      { ...PADRAO, fundo: 'bandeira' },
      { ...PADRAO, numero: '100' },
      { ...PADRAO, numero: 10 },
      Object.fromEntries(Object.entries(PADRAO).filter(([k]) => k !== 'moldura')),
    ];
    for (const x of ruins) expect(await erroDe(salvar(eu, x))).toBe('formato');
    expect(await guardada(eu)).toEqual(antes);
  });

  it('o banco recusa vestimenta grande ou que não é objeto, mesmo com a chave secreta', async () => {
    const eu = await torcedor();
    const grande = { ...PADRAO, lixo: 'x'.repeat(2000) };
    const r = await servicos.rpc('boneco_gravar', { p_torcedor: eu, p_sessao: eu, p_vestimenta: grande });
    expect(r.error?.message).toMatch(/check/);
    const lista = await servicos.rpc('boneco_criar', { p_torcedor: eu, p_sessao: eu, p_vestimenta: [1, 2] });
    expect(lista.error?.message).toMatch(/check/);
  });

  it('aceita os dois corpos, todos os números e "sem número"', async () => {
    const eu = await torcedor();
    for (const corpo of CORPOS) expect((await salvar(eu, vestindo('corpo', corpo))).vestimenta.corpo).toBe(corpo);
    for (const numero of ['0', '00', '7', '07', '99', null]) expect((await salvar(eu, vestindo('numero', numero))).vestimenta.numero).toBe(numero);
  });
});

describe('camisa por fora ou por dentro (H03b)', () => {
  const semBarra = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'barra'));

  it('conta nova começa com a camisa por fora', async () => {
    for (let i = 0; i < 8; i++) {
      const eu = await torcedor();
      expect((await ler(eu)).vestimenta.barra).toBe('fora');
    }
  });

  it('grava as duas, sem troca e sem conta de peça', async () => {
    const eu = await torcedor();
    const dentro = await salvar(eu, vestindo('barra', 'dentro'));
    expect(dentro.trocou).toBe(false);
    expect(dentro.vestimenta.barra).toBe('dentro');
    expect((await guardada(eu)).barra).toBe('dentro');
    expect((await ler(eu)).vestimenta.barra).toBe('dentro');
    expect(dentro.liberadas).not.toContain('dentro');
    const fora = await salvar(eu, vestindo('barra', 'fora'));
    expect(fora.trocou).toBe(false);
    expect((await guardada(eu)).barra).toBe('fora');
  });

  it('recusa barra fora da lista ou de outro tipo, sem gravar', async () => {
    const eu = await torcedor();
    const antes = (await ler(eu)).vestimenta;
    for (const barra of ['Dentro', 'meio', '', null, true, 1, ['dentro'], { lado: 'dentro' }]) {
      expect(await erroDe(salvar(eu, vestindo('barra', barra))), JSON.stringify(barra)).toBe('formato');
    }
    expect(await guardada(eu)).toEqual(antes);
  });

  it('site antigo salva sem barra: fica a barra já gravada, sem dizer que trocou peça', async () => {
    const eu = await torcedor();
    await salvar(eu, vestindo('barra', 'dentro'));
    const r = await salvar(eu, semBarra({ ...PADRAO, numero: '8' }));
    expect(r.trocou).toBe(false);
    expect(r.vestimenta).toEqual({ ...PADRAO, numero: '8', barra: 'dentro' });
    expect(await guardada(eu)).toEqual(r.vestimenta);
  });

  it('site antigo sem boneco gravado: por fora', async () => {
    const eu = await torcedor();
    const r = await salvar(eu, semBarra({ ...PADRAO, numero: '3' }));
    expect(r.trocou).toBe(false);
    expect(r.vestimenta).toEqual({ ...PADRAO, numero: '3', barra: 'fora' });
  });

  it('site antigo sem barra e com peça trancada: troca a peça e diz que trocou', async () => {
    const eu = await torcedor();
    await salvar(eu, vestindo('barra', 'dentro'));
    const r = await salvar(eu, semBarra({ ...PADRAO, moldura: 'dourada' }));
    expect(r.trocou).toBe(true);
    expect(r.vestimenta).toEqual({ ...PADRAO, barra: 'dentro' });
  });

  it('vestimenta gravada antes da barra é lida com a camisa por fora', async () => {
    const eu = await torcedor();
    await ler(eu);
    await db.query(`update public.torcedor_boneco set vestimenta = $2 where torcedor_id = $1`, [eu, JSON.stringify(semBarra({ ...PADRAO, cabelo: 'coque' }))]);
    const r = await ler(eu);
    expect(r.vestimenta).toEqual({ ...PADRAO, cabelo: 'coque', barra: 'fora' });
  });

  it('barra torta gravada por fora da função sai por fora na leitura', async () => {
    const eu = await torcedor();
    await ler(eu);
    await db.query(`update public.torcedor_boneco set vestimenta = $2 where torcedor_id = $1`, [eu, JSON.stringify({ ...PADRAO, barra: 'avesso' })]);
    expect((await ler(eu)).vestimenta.barra).toBe('fora');
  });
});

describe('peça trancada', () => {
  it('volta à padrão, sem erro, e grava o resto do pedido', async () => {
    const eu = await torcedor();
    const pedido = { ...PADRAO, corpo: 'm', pele: 3, cabelo: 'trancas', numero: '10', camisa: 'goleiro', fundo: 'telao', moldura: 'dourada', peito: 'colete' };
    const r = await salvar(eu, pedido);
    expect(r.trocou).toBe(true);
    expect(r.vestimenta).toEqual({ ...PADRAO, corpo: 'm', pele: 3, cabelo: 'trancas', numero: '10' });
    expect(await guardada(eu)).toEqual(r.vestimenta);
  });

  it('do começo passa sem troca', async () => {
    const eu = await torcedor();
    const r = await salvar(eu, { ...PADRAO, camisa: 'uni2', cabeca: 'testeira', punho: 'munhequeira', fundo: 'estadio_noite' });
    expect(r.trocou).toBe(false);
    expect(r.vestimenta.fundo).toBe('estadio_noite');
  });
});

describe('liberação lida do banco', () => {
  /** Salva a peça e diz se ficou (true) ou voltou à padrão (false). */
  const fica = async (uid: string, id: string) => (await salvar(uid, vestindoPeca(id))).vestimenta[peca(id).campo] === peca(id).valor;

  it('nível da Carreira pelo XP (carreira_bonus e carreira_partidas)', async () => {
    const eu = await torcedor();
    expect(await fica(eu, 'colete')).toBe(false);
    // 9 partidas no mesmo dia = 5×10 + 4×5 = 70 XP; mais 30 de bônus = 100 (Reserva).
    for (let k = 0; k < 9; k++) {
      await db.query(`insert into public.carreira_partidas (torcedor_id, origem, referencia, dia) values ($1, 'partida', $2, '2026-10-20')`, [eu, uuid()]);
    }
    expect(await fica(eu, 'colete')).toBe(false);
    await xp(eu, 30);
    expect(await fica(eu, 'colete')).toBe(true);
    expect(await fica(eu, 'fundo_banco')).toBe(true);
    expect(await fica(eu, 'chuteira_time')).toBe(false);
    await xp(eu, 900); // 1.000: Titular
    expect(await fica(eu, 'chuteira_time')).toBe(true);
    expect(await fica(eu, 'pose_bracos')).toBe(true);
    expect(await fica(eu, 'bracadeira')).toBe(false);
    await xp(eu, 4000); // Craque
    expect(await fica(eu, 'bracadeira')).toBe(true);
    await xp(eu, 10000); // Ídolo
    expect(await fica(eu, 'faixa')).toBe(true);
    expect(await fica(eu, 'moldura_dourada')).toBe(false);
    await xp(eu, 15000); // Lenda
    expect(await fica(eu, 'moldura_dourada')).toBe(true);
    expect(await fica(eu, 'fundo_telao')).toBe(true);
    expect((await ler(eu)).proxima?.id).toBe('apito');
  });

  it('medalhas por item em lances_gols (bronze, prata, ouro com recriados)', async () => {
    const eu = await torcedor();
    await golsNoLance(eu, LANCE_DO_TIME, 4);
    expect(await fica(eu, 'munhequeira_bronze')).toBe(false);
    await golsNoLance(eu, LANCE_DO_TIME, 1);
    expect(await fica(eu, 'munhequeira_bronze')).toBe(true);
    expect(await fica(eu, 'fundo_barreira')).toBe(false);
    await golsNoLance(eu, LANCE_DO_TIME, 15);
    expect(await fica(eu, 'fundo_barreira')).toBe(true);
    // 50 gols sem 10 recriados: ainda prata.
    await golsNoLance(eu, LANCE_DO_TIME, 30);
    expect(await fica(eu, 'chuteira_dourada')).toBe(false);
    await golsNoLance(eu, LANCE_DO_TIME, 10, 10);
    expect(await fica(eu, 'chuteira_dourada')).toBe(true);
    expect(await fica(eu, 'fundo_rede')).toBe(true);
    // Ouro de clube não é da Seleção nem de pênaltis.
    expect(await fica(eu, 'fundo_verde_amarelo')).toBe(false);
    expect(await fica(eu, 'goleiro')).toBe(false);
  });

  it('ouro numa disputa de pênaltis (gols e vitórias)', async () => {
    const eu = await torcedor();
    await golsNaDisputa(eu, DISPUTA_DO_TIME, 100, 9);
    expect(await fica(eu, 'goleiro')).toBe(false);
    await golsNaDisputa(eu, DISPUTA_DO_TIME, 0, 1);
    expect(await fica(eu, 'goleiro')).toBe(true);
    expect(await fica(eu, 'fundo_verde_amarelo')).toBe(false);
  });

  it('ouro da Seleção pelo catálogo do servidor, lance ou disputa', async () => {
    const lance = await torcedor();
    await golsNoLance(lance, LANCE_DA_SELECAO, 50, 10);
    expect(await fica(lance, 'fundo_verde_amarelo')).toBe(true);
    const disputa = await torcedor();
    await golsNaDisputa(disputa, DISPUTA_DA_SELECAO, 100, 10);
    expect(await fica(disputa, 'fundo_verde_amarelo')).toBe(true);
    expect(await fica(disputa, 'goleiro')).toBe(true);
    // Prata da Seleção não libera.
    const prata = await torcedor();
    await golsNoLance(prata, LANCE_DA_SELECAO, 49, 10);
    expect(await fica(prata, 'fundo_verde_amarelo')).toBe(false);
  });

  it('5 ouros em itens diferentes', async () => {
    const eu = await torcedor();
    for (const lance of [LANCE_DO_TIME, ...OUTROS_LANCES, LANCE_DA_SELECAO]) await golsNoLance(eu, lance, 50, 10);
    expect(await fica(eu, 'moldura_galeria')).toBe(false);
    await golsNaDisputa(eu, DISPUTA_DO_TIME, 100, 10);
    expect(await fica(eu, 'moldura_galeria')).toBe(true);
  });

  it('Aquecimento pela linha aquecimento de carreira_bonus', async () => {
    const eu = await torcedor();
    expect(await fica(eu, 'apito')).toBe(false);
    expect((await ler(eu)).proxima?.id).toBe('colete');
    await db.query(`insert into public.carreira_bonus (torcedor_id, tipo, referencia, xp) values ($1, 'aquecimento', '2026-11-05', 20)`, [eu]);
    expect(await fica(eu, 'apito')).toBe(true);
    expect((await ler(eu)).liberadas).toContain('apito');
  });

  it('o que o aparelho diz que tem não conta: só o pedido de vestir chega ao servidor', async () => {
    const eu = await torcedor();
    const r = await salvarBoneco(servicos, eu, eu, { vestimenta: vestindoPeca('moldura_dourada'), liberadas: PECAS.map((p) => p.id), xp: 99999 });
    expect(r.vestimenta.moldura).toBe('nenhuma');
  });

  it('a leitura revalida o que está gravado', async () => {
    const eu = await torcedor();
    await ler(eu);
    await db.query(`update public.torcedor_boneco set vestimenta = $2 where torcedor_id = $1`, [eu, JSON.stringify(vestindoPeca('moldura_dourada'))]);
    expect((await ler(eu)).vestimenta.moldura).toBe('nenhuma');
  });
});

describe('limite por hora', () => {
  it('30 gravações por hora; a 31ª não grava; depois de 1 hora volta', async () => {
    const eu = await torcedor();
    for (let k = 0; k < 30; k++) await salvar(eu, vestindo('numero', String(k)));
    expect(await erroDe(salvar(eu, vestindo('numero', '99')))).toBe('limite');
    expect((await guardada(eu)).numero).toBe('29');
    await db.query(`update public.torcedor_boneco set janela_desde = now() - interval '61 minutes' where torcedor_id = $1`, [eu]);
    expect((await salvar(eu, vestindo('numero', '99'))).vestimenta.numero).toBe('99');
    const { rows } = await db.query<{ gravacoes: number }>('select gravacoes from public.torcedor_boneco where torcedor_id = $1', [eu]);
    expect(rows[0].gravacoes).toBe(1);
  });

  it('o limite é de cada torcedor', async () => {
    const a = await torcedor();
    const b = await torcedor();
    for (let k = 0; k < 30; k++) await salvar(a, PADRAO);
    expect(await erroDe(salvar(a, PADRAO))).toBe('limite');
    expect((await salvar(b, PADRAO)).vestimenta).toEqual(PADRAO);
  });
});

describe('sessão', () => {
  it('sessão desconectada não lê, não sorteia e não grava', async () => {
    const eu = await torcedor();
    const outra = uuid();
    await db.query('insert into auth.sessions (id, user_id) values ($1, $2)', [outra, eu]);
    await db.query('delete from auth.sessions where id = $1', [outra]);
    expect(await erroDe(ler(eu, outra))).toBe('sessao');
    expect(await guardada(eu)).toBeUndefined();
    expect(await erroDe(salvar(eu, PADRAO, outra))).toBe('sessao');
    expect(await guardada(eu)).toBeUndefined();
  });

  it('sessão de outra pessoa não serve', async () => {
    const eu = await torcedor();
    const outro = await torcedor();
    expect(await erroDe(salvar(eu, PADRAO, outro))).toBe('sessao');
  });

  it('sessão vencida (not_after) não grava', async () => {
    const eu = await torcedor();
    await db.query(`update auth.sessions set not_after = now() - interval '1 minute' where id = $1`, [eu]);
    expect(await erroDe(salvar(eu, PADRAO))).toBe('sessao');
  });
});

describe('o celular não chega na tabela', () => {
  async function celular(uid: string, sql: string, params: unknown[] = []) {
    await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', '', false)`, [uid]);
    await db.exec('set role authenticated');
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec('reset role');
    }
  }

  it('sem leitura, escrita nem as funções internas', async () => {
    const eu = await torcedor();
    await ler(eu);
    await expect(celular(eu, 'select * from public.torcedor_boneco')).rejects.toThrow(/permission denied/);
    await expect(celular(eu, `insert into public.torcedor_boneco (torcedor_id, vestimenta) values ($1, '{}')`, [eu])).rejects.toThrow(/permission denied/);
    // Mesmo com permissão de tabela (os privilégios padrão da Supabase dão), a política restritiva barra tudo.
    await db.exec('grant select, insert, update, delete on public.torcedor_boneco to authenticated');
    try {
      expect((await celular(eu, 'select * from public.torcedor_boneco')).rows).toHaveLength(0);
      await expect(celular(eu, `insert into public.torcedor_boneco (torcedor_id, vestimenta) values ($1, '{}')`, [eu])).rejects.toThrow(/row-level security/);
      expect((await celular(eu, `update public.torcedor_boneco set vestimenta = '{}' where torcedor_id = $1 returning 1`, [eu])).rows).toHaveLength(0);
      expect((await celular(eu, `delete from public.torcedor_boneco where torcedor_id = $1 returning 1`, [eu])).rows).toHaveLength(0);
    } finally {
      await db.exec('revoke select, insert, update, delete on public.torcedor_boneco from authenticated');
    }
    expect(await guardada(eu)).toBeDefined();
    for (const f of [
      `public.boneco_estado('${eu}', '${eu}')`,
      `public.boneco_criar('${eu}', '${eu}', '{}')`,
      `public.boneco_gravar('${eu}', '${eu}', '{}')`,
      `public.boneco_sessao('${eu}', '${eu}')`,
    ]) {
      await expect(celular(eu, `select ${f}`)).rejects.toThrow(/permission denied/);
    }
  });

  it('"Ver meus dados" diz se há boneco, sem mostrar a vestimenta', async () => {
    const eu = await torcedor();
    const antes = (await celular(eu, 'select public.ver_meus_dados() as d')).rows[0] as { d: Record<string, unknown> };
    expect(antes.d.boneco).toBe(false);
    await ler(eu);
    const depois = (await celular(eu, 'select public.ver_meus_dados() as d')).rows[0] as { d: Record<string, unknown> };
    expect(depois.d.boneco).toBe(true);
    expect(JSON.stringify(depois.d)).not.toContain('vestimenta');
  });
});

describe('a conta some, o boneco some junto', () => {
  it('Apagar meus dados', async () => {
    const eu = await torcedor();
    await ler(eu);
    await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', '', false)`, [eu]);
    await db.exec('set role authenticated');
    try {
      await db.query('select public.apagar_meus_dados()');
    } finally {
      await db.exec('reset role');
    }
    expect(await guardada(eu)).toBeUndefined();
  });

  it('contas paradas há mais de 6 meses', async () => {
    const parada = uuid();
    await db.query(`insert into auth.users (id, created_at) values ($1, now() - interval '8 months')`, [parada]);
    await db.query(`insert into public.torcedores (id, time_id, criado_em) values ($1, 'flamengo', now() - interval '8 months')`, [parada]);
    await ler(parada);
    const ativa = await torcedor();
    await ler(ativa);
    await db.query(`insert into public.carreira_partidas (torcedor_id, origem, referencia, dia) values ($1, 'partida', $2, public.hoje_brasilia())`, [ativa, uuid()]);
    await db.query('select public.apagar_contas_paradas(6, now())');
    expect(await guardada(parada)).toBeUndefined();
    expect(await guardada(ativa)).toBeDefined();
  });
});

describe('junção de contas pelo código', () => {
  const impressao = (codigo: string) => createHash('sha256').update(codigo).digest('hex');
  async function juntar(dono: string, origem: string): Promise<void> {
    const codigo = `C${++seq}`;
    await db.exec('set role service_role');
    try {
      await db.query('select public.codigo_gerar($1, $2)', [dono, impressao(codigo)]);
      await db.query('select * from public.codigo_conferir($1, $2)', [origem, impressao(codigo)]);
      await db.query('select * from public.juntar_torcedores($1, $2, null)', [impressao(codigo), origem]);
    } finally {
      await db.exec('reset role');
    }
  }

  it('fica o boneco do dono', async () => {
    const dono = await torcedor();
    const origem = await torcedor();
    await salvar(dono, vestindo('numero', '1'));
    await salvar(origem, vestindo('numero', '2'));
    await juntar(dono, origem);
    expect((await guardada(dono)).numero).toBe('1');
    expect(await guardada(origem)).toBeUndefined();
  });

  it('dono sem boneco fica com o da conta que entrou, com as peças que ela liberou', async () => {
    const dono = await torcedor();
    const origem = await torcedor();
    await golsNoLance(origem, LANCE_DO_TIME, 5);
    await salvar(origem, { ...vestindoPeca('munhequeira_bronze'), numero: '2' });
    await juntar(dono, origem);
    expect((await guardada(dono)).numero).toBe('2');
    const r = await ler(dono);
    expect(r.vestimenta.punho).toBe('munhequeira_bronze');
  });

  it('nenhum dos dois com boneco: o dono ganha o sorteado na leitura seguinte', async () => {
    const dono = await torcedor();
    const origem = await torcedor();
    await juntar(dono, origem);
    expect(await guardada(dono)).toBeUndefined();
    await ler(dono);
    expect(await guardada(dono)).toBeDefined();
  });
});

describe('zerar da pré-temporada', () => {
  it('preserva os bonecos', async () => {
    const eu = await torcedor();
    const r = await salvar(eu, vestindo('numero', '77'));
    await db.exec(readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8'));
    expect(await guardada(eu)).toEqual(r.vestimenta);
  });
});

describe('o que não lê a tabela', () => {
  it('npm run metricas e o balanço não citam torcedor_boneco', () => {
    const raiz = join(import.meta.dirname, '..', '..');
    for (const arquivo of ['scripts/metricas.mjs', 'scripts/balanco/balanco.mjs']) {
      expect(readFileSync(join(raiz, arquivo), 'utf8')).not.toMatch(/boneco/);
    }
  });
});

describe('pedido da função (pedido.ts)', () => {
  const passe = (payload: unknown) => `Bearer cabeca.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.assinatura`;
  const SESSAO = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const codigo = (f: () => unknown) => {
    try {
      f();
    } catch (e) {
      if (e instanceof ErroBoneco) return `${e.status} ${e.codigo}`;
      throw e;
    }
    return 'sem erro';
  };

  it('lê o session_id do passe, em base64url sem preenchimento', () => {
    expect(sessaoDoPasse(passe({ sub: 'x', session_id: SESSAO }))).toBe(SESSAO);
    expect(sessaoDoPasse(passe({ session_id: SESSAO, nome: 'ção?>~' }))).toBe(SESSAO);
  });

  it('passe sem sessão, com sessão malformada ou ilegível é 401', () => {
    for (const a of [null, '', 'Bearer', 'Bearer abc', passe({ sub: 'x' }), passe({ session_id: 7 }), passe({ session_id: 'nao-e-uuid' }),
      passe({ session_id: `${SESSAO}' or 1=1` }), 'Bearer a.%%%.b']) {
      expect(codigo(() => sessaoDoPasse(a))).toBe('401 sem_login');
    }
  });

  it('pedido grande é 413 antes e depois de ler', () => {
    expect(codigo(() => conferirTamanho(String(TAMANHO_DO_PEDIDO + 1)))).toBe('413 formato');
    expect(codigo(() => conferirTamanho(String(TAMANHO_DO_PEDIDO)))).toBe('sem erro');
    expect(codigo(() => conferirTamanho(null))).toBe('sem erro');
    expect(codigo(() => lerPedido('x'.repeat(TAMANHO_DO_PEDIDO + 1)))).toBe('413 formato');
  });

  it('JSON inválido ou que não é objeto vira {} (acao_invalida)', () => {
    for (const t of ['', '{', 'null', '[]', '7', '"meu_boneco"']) expect(lerPedido(t)).toEqual({});
    expect(lerPedido(JSON.stringify({ acao: 'meu_boneco' }))).toEqual({ acao: 'meu_boneco' });
  });
});
