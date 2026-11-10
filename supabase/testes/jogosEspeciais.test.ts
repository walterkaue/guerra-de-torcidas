// Jogos especiais do Palpite (20261111000000): só a chave secreta cria, edita e apaga (a função jogos-especiais confere
// os administradores); o celular não escreve em jogos nem rodadas; palpite fecha no início; sem certeza; confirmar
// duas vezes não duplica; pontos ×2 na semana do jogo; modo ensaio; fora do Palpiteiro do Brasileirão. SQL de verdade.

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { alvosDaRodada, semanaDosPontos } from '../../src/jogo/crava';
import { bancoDeTeste } from './banco';

const TEMPO = 60_000;
let db: PGlite;
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

async function servidor<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec('set role service_role');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

async function como<T>(papel: 'anon' | 'authenticated', uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', '', false)`, [uid ?? '']);
  await db.exec(`set role ${papel}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}
const celular = <T>(uid: string, sql: string, params: unknown[] = []) => como<T>('authenticated', uid, sql, params);

async function torcedor(time: string): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query('insert into public.torcedores (id, time_id) values ($1, $2)', [id, time]);
  return id;
}

const daquiA = (horas: number) => new Date(Date.now() + horas * 3600_000).toISOString();

interface Lado {
  id?: string;
  fora?: string;
}
async function criar(o: { competicao?: string; fase?: string | null; m?: Lado; v?: Lado; inicio?: string } = {}): Promise<string> {
  const m = o.m ?? { id: 'gremio' };
  const v = o.v ?? { id: 'palmeiras' };
  const [r] = await servidor<{ id: string }>('select public.especial_criar($1, $2, $3, $4, $5, $6, $7) as id', [
    o.competicao ?? 'Final da Copa do Brasil',
    o.fase ?? null,
    m.id ?? null,
    m.fora ?? null,
    v.id ?? null,
    v.fora ?? null,
    o.inicio ?? daquiA(48),
  ]);
  return r.id;
}

const motivo = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'passou';
  } catch (e) {
    return (e as Error).message;
  }
};

const rodadaDe = async (jogo: string) =>
  (await db.query<{ rodada: number }>('select rodada from public.jogos where id = $1', [jogo])).rows[0].rodada;

/** Como a confirmar-placar: grava o placar e distribui com o mesmo crava.ts do servidor. */
async function confirmar(jogo: string, m: number, v: number): Promise<number> {
  await db.query(
    `update public.jogos set gols_mandante = $2, gols_visitante = $3, anulado = false,
       confirmado_em = coalesce(confirmado_em, now()), atualizado_em = now() where id = $1`,
    [jogo, m, v],
  );
  return distribuir(await rodadaDe(jogo));
}

async function distribuir(rodada: number): Promise<number> {
  const jogos = (
    await db.query<{ id: string; inicio: Date; confirmado_em: Date | null; gols_mandante: number | null; gols_visitante: number | null; anulado: boolean }>(
      'select id, inicio, confirmado_em, gols_mandante, gols_visitante, anulado from public.jogos where rodada = $1',
      [rodada],
    )
  ).rows;
  const palpites = (
    await db.query<{ torcedor_id: string; jogo_id: string; gols_mandante: number; gols_visitante: number }>(
      'select torcedor_id, jogo_id, gols_mandante, gols_visitante from public.palpites where jogo_id = any ($1::uuid[])',
      [jogos.map((j) => j.id)],
    )
  ).rows;
  const certezas = (await db.query<{ torcedor_id: string; jogo_id: string }>('select torcedor_id, jogo_id from public.certezas where rodada = $1', [rodada])).rows;
  const inicio = new Map(jogos.map((j) => [j.id, new Date(j.inicio)]));
  const alvos = alvosDaRodada(
    jogos.map((j) => ({
      id: j.id,
      confirmadoEm: j.confirmado_em ? new Date(j.confirmado_em).toISOString() : null,
      placar: j.gols_mandante === null ? null : { m: j.gols_mandante, v: j.gols_visitante! },
      anulado: j.anulado,
    })),
    palpites.map((p) => ({ torcedorId: p.torcedor_id, jogoId: p.jogo_id, placar: { m: p.gols_mandante, v: p.gols_visitante } })),
    new Map(certezas.map((c) => [c.torcedor_id, c.jogo_id])),
  ).map((a) => ({ ...a, semana: semanaDosPontos(inicio.get(a.jogoId)!, new Date()) }));
  const [r] = await servidor<{ n: number }>('select public.aplicar_pontos_crava($1, $2::jsonb) as n', [rodada, JSON.stringify(alvos)]);
  return r.n;
}

const palpitar = (uid: string, jogo: string, m: number, v: number) =>
  celular(uid, 'insert into public.palpites (jogo_id, gols_mandante, gols_visitante) values ($1, $2, $3)', [jogo, m, v]);

/** O jogo começa: só o servidor mexe no horário para trás (o especial_editar não deixa). */
const comecar = (jogo: string, horasAtras = 1) =>
  db.query(`update public.jogos set inicio = now() - make_interval(hours => $2) where id = $1`, [jogo, horasAtras]);

const valendoDesde = (n: number) => db.query(`update public.config_crava set valor = $1 where chave = 'valendo_desde_rodada'`, [n]);

beforeAll(async () => {
  db = await bancoDeTeste();
  await valendoDesde(32);
}, TEMPO);

describe('formato', () => {
  it('especial nasce numa rodada própria a partir de 1001, aberto e sem trava da certeza', async () => {
    const j = await criar({ m: { id: 'gremio' }, v: { fora: '  Mamelodi   Sundowns ' } });
    const [l] = (
      await db.query<{ rodada: number; especial: boolean; trava_certeza: string | null; visitante_fora: string; visitante_id: string | null; api_id: string | null }>(
        `select j.rodada, r.especial, r.trava_certeza, j.visitante_fora, j.visitante_id, j.api_id
         from public.jogos j join public.rodadas r on r.numero = j.rodada where j.id = $1`,
        [j],
      )
    ).rows;
    expect(l.rodada).toBeGreaterThanOrEqual(1001);
    expect(l).toMatchObject({ especial: true, trava_certeza: null, visitante_fora: 'Mamelodi Sundowns', visitante_id: null, api_id: null });
    await servidor('select public.atualizar_travas()');
    expect((await db.query<{ t: string | null }>('select trava_certeza as t from public.rodadas where numero = $1', [l.rodada])).rows[0].t).toBeNull();
    expect((await db.query<{ a: boolean }>('select public.jogo_aberto($1) as a', [j])).rows[0].a).toBe(true);
  });

  it('a faixa de rodadas separa Brasileirão e especial', async () => {
    expect(await motivo(db.query('insert into public.rodadas (numero) values (1500)'))).toMatch(/rodadas_numero_check/);
    expect(await motivo(db.query('insert into public.rodadas (numero, especial) values (20, true)'))).toMatch(/rodadas_numero_check/);
  });

  it('recusa o que não é jogo especial de verdade', async () => {
    expect(await motivo(criar({ m: { fora: 'Toluca' }, v: { fora: 'PSG' } }))).toBe('sem_time_dos_20');
    expect(await motivo(criar({ m: { id: 'outro' } }))).toBe('time_invalido');
    expect(await motivo(criar({ m: { id: 'gremio' }, v: { id: 'gremio' } }))).toBe('mesmo_time');
    expect(await motivo(criar({ v: { fora: 'São  Paulo' } }))).toBe('fora_e_dos_20');
    expect(await motivo(criar({ v: { fora: 'x'.repeat(31) } }))).toBe('nome_longo');
    expect(await motivo(criar({ competicao: 'y'.repeat(41) }))).toBe('titulo_longo');
    expect(await motivo(criar({ competicao: '   ' }))).toBe('sem_titulo');
    expect(await motivo(criar({ inicio: daquiA(-1) }))).toBe('inicio_no_passado');
  });

  it('recusa as palavras proibidas no texto livre (com acento e caixa alta)', async () => {
    expect(await motivo(criar({ competicao: 'Copa da Cotação' }))).toBe('texto_proibido');
    expect(await motivo(criar({ fase: 'Final valendo' }))).toBe('texto_proibido');
    expect(await motivo(criar({ v: { fora: 'BET Clube' } }))).toBe('texto_proibido');
    expect(await motivo(criar({ competicao: 'Supercopa Rei', fase: 'Final' }))).toBe('passou');
  });

  it('a trava do banco segura a sincronização e o Brasileirão', async () => {
    const j = await criar();
    const r = await rodadaDe(j);
    expect(await motivo(db.query('update public.jogos set api_id = 999 where id = $1', [j]))).toBe('especial_com_api');
    expect(
      await motivo(
        db.query(`insert into public.jogos (rodada, mandante_id, visitante_id, inicio, competicao) values ($1, 'santos', 'remo', now(), 'Outra')`, [r]),
      ),
    ).toBe('especial_um_jogo');
    expect(
      await motivo(db.query(`insert into public.jogos (rodada, mandante_id, mandante_fora, visitante_id, inicio) values (38, null, 'Toluca', 'remo', now())`)),
    ).toBe('brasileirao_so_com_os_20');
  });
});

describe('quem escreve', () => {
  it('anon e authenticated não criam, editam nem apagam, nem escrevem nas tabelas', async () => {
    const a = await torcedor('gremio');
    const j = await criar();
    const r = await rodadaDe(j);
    const tentativas = [
      `select public.especial_criar('Copa', null, 'gremio', null, 'palmeiras', null, now() + interval '2 days')`,
      `select public.especial_editar('${j}', 'Copa', null, 'gremio', null, 'palmeiras', null, now() + interval '2 days')`,
      `select public.especial_apagar('${j}')`,
      `insert into public.rodadas (numero, especial) values (1999, true)`,
      `update public.rodadas set especial = false where numero = ${r}`,
      `insert into public.jogos (rodada, mandante_id, visitante_id, inicio, competicao) values (${r}, 'gremio', 'santos', now(), 'X')`,
      `update public.jogos set gols_mandante = 1, gols_visitante = 0, confirmado_em = now() where id = '${j}'`,
      `delete from public.jogos where id = '${j}'`,
      `select nextval('public.rodadas_especiais')`,
    ];
    for (const sql of tentativas) {
      expect(await motivo(como('anon', null, sql)), `anon: ${sql}`).toMatch(/permission denied/);
      expect(await motivo(celular(a, sql)), `authenticated: ${sql}`).toMatch(/permission denied/);
    }
    expect((await db.query<{ n: number }>('select count(*)::int as n from public.jogos where id = $1 and confirmado_em is null', [j])).rows[0].n).toBe(1);
  });

  it('o celular lê os jogos especiais com o título e o time de fora', async () => {
    const a = await torcedor('palmeiras');
    const j = await criar({ competicao: 'Copa Intercontinental', fase: 'Quartas', m: { fora: 'Toluca' }, v: { id: 'palmeiras' } });
    const [l] = await celular<{ competicao: string; fase: string; mandante_fora: string }>(
      a,
      'select competicao, fase, mandante_fora from public.jogos where id = $1',
      [j],
    );
    expect(l).toEqual({ competicao: 'Copa Intercontinental', fase: 'Quartas', mandante_fora: 'Toluca' });
  });
});

describe('editar e apagar', () => {
  it('antes do início muda tudo; com palpite, os times não mudam; depois do início, só o horário (adiado)', async () => {
    const a = await torcedor('gremio');
    const j = await criar();
    const editar = (o: { competicao?: string; m?: string; inicio?: string }) =>
      servidor('select public.especial_editar($1, $2, null, $3, null, $4, null, $5)', [
        j,
        o.competicao ?? 'Final da Copa do Brasil',
        o.m ?? 'gremio',
        'palmeiras',
        o.inicio ?? daquiA(72),
      ]);
    expect(await motivo(editar({ m: 'internacional' }))).toBe('passou');
    expect(await motivo(editar({ m: 'gremio' }))).toBe('passou');
    await palpitar(a, j, 2, 1);
    expect(await motivo(editar({ m: 'internacional' }))).toBe('tem_palpite');
    expect(await motivo(editar({ competicao: 'Copa do Brasil', inicio: daquiA(96) }))).toBe('passou');

    await comecar(j);
    expect(await motivo(editar({ competicao: 'Copa do Brasil · Final' }))).toBe('ja_comecou');
    expect(await motivo(editar({ competicao: 'Copa do Brasil', inicio: daquiA(-0.5) }))).toBe('inicio_no_passado');
    // Adiado: o palpite reabre até o novo início.
    expect(await motivo(palpitar(a, j, 3, 3).then(() => 0))).toMatch(/duplicate|row-level security/);
    expect(await motivo(editar({ competicao: 'Copa do Brasil', inicio: daquiA(24) }))).toBe('passou');
    expect((await db.query<{ a: boolean }>('select public.jogo_aberto($1) as a', [j])).rows[0].a).toBe(true);
    await celular(a, 'update public.palpites set gols_mandante = 0 where jogo_id = $1', [j]);
    expect((await db.query<{ m: number }>('select gols_mandante as m from public.palpites where jogo_id = $1', [j])).rows[0].m).toBe(0);

    await db.query('update public.jogos set gols_mandante = 1, gols_visitante = 0, confirmado_em = now() where id = $1', [j]);
    expect(await motivo(editar({ competicao: 'Copa do Brasil' }))).toBe('jogo_fechado');
  });

  it('apaga só sem palpite, e leva a rodada junto', async () => {
    const a = await torcedor('palmeiras');
    const sem = await criar();
    const r = await rodadaDe(sem);
    await servidor('select public.especial_apagar($1)', [sem]);
    expect((await db.query('select 1 from public.rodadas where numero = $1', [r])).rows).toHaveLength(0);

    const com = await criar();
    await palpitar(a, com, 1, 1);
    expect(await motivo(servidor('select public.especial_apagar($1)', [com]))).toBe('tem_palpite');
    expect(await motivo(servidor(`select public.especial_apagar('10000000-0000-4000-8000-000000000999')`))).toBe('especial_nao_encontrado');
  });

  it('não edita nem apaga jogo do Brasileirão por aqui', async () => {
    await db.query(`insert into public.jogos (id, rodada, mandante_id, visitante_id, inicio)
      values ('20000000-0000-4000-8000-000000000001', 38, 'santos', 'remo', now() + interval '3 days')`);
    expect(await motivo(servidor(`select public.especial_apagar('20000000-0000-4000-8000-000000000001')`))).toBe('especial_nao_encontrado');
    expect(
      await motivo(
        servidor(`select public.especial_editar('20000000-0000-4000-8000-000000000001', 'X', null, 'santos', null, 'remo', null, now() + interval '1 day')`),
      ),
    ).toBe('especial_nao_encontrado');
  });
});

describe('palpite, pontos e rankings', () => {
  let ana: string;
  let beto: string;
  let jogo: string;
  let rodada: number;

  beforeAll(async () => {
    ana = await torcedor('gremio');
    beto = await torcedor('outro');
    jogo = await criar();
    rodada = await rodadaDe(jogo);
    await palpitar(ana, jogo, 2, 1);
    await palpitar(beto, jogo, 0, 0);
  });

  it('sem jogo da certeza no especial', async () => {
    expect(await motivo(celular(ana, 'insert into public.certezas (rodada, jogo_id) values ($1, $2)', [rodada, jogo]))).toMatch(/row-level security/);
  });

  it('conta 1 partida na Carreira, pela rodada do especial', async () => {
    const { rows } = await db.query<{ referencia: string }>(
      `select referencia from public.carreira_partidas where torcedor_id = $1 and origem = 'crava'`,
      [ana],
    );
    expect(rows.map((r) => r.referencia)).toEqual([String(rodada)]);
  });

  it('palpite depois do início é recusado', async () => {
    await comecar(jogo);
    const caio = await torcedor('palmeiras');
    expect(await motivo(palpitar(caio, jogo, 1, 0))).toMatch(/row-level security/);
    expect(await motivo(celular(ana, 'update public.palpites set gols_mandante = 5 where jogo_id = $1 returning 1', [jogo]))).toBe('passou');
    expect((await db.query<{ m: number }>('select gols_mandante as m from public.palpites where torcedor_id = $1 and jogo_id = $2', [ana, jogo])).rows[0].m).toBe(2);
  });

  it('confirmar duas vezes não duplica; ×2 na semana do início do jogo', async () => {
    expect(await confirmar(jogo, 2, 1)).toBe(1); // só a Ana pontua; o 0 x 0 do Beto dá zero
    expect(await confirmar(jogo, 2, 1)).toBe(0);
    const semana = semanaDosPontos(new Date(Date.now() - 3600_000), new Date());
    const { rows } = await db.query<{ pontos: number; semana: Date; time_id: string }>(
      'select pontos, semana, time_id from public.crava_pontos where jogo_id = $1',
      [jogo],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].pontos).toBe(20);
    expect(rows[0].time_id).toBe('gremio');
    expect(new Date(rows[0].semana).toISOString().slice(0, 10)).toBe(semana);

    // Corrigir grava só o ajuste.
    expect(await confirmar(jogo, 3, 1)).toBe(1);
    const total = await db.query<{ s: number }>('select sum(pontos)::int as s from public.crava_pontos where jogo_id = $1', [jogo]);
    expect(total.rows[0].s).toBe(10); // 2 x 1 contra 3 x 1: só o vencedor (5), ×2
    await confirmar(jogo, 2, 1);
  });

  it('soma na semana do jogo, por fora do teto, e respeita o modo ensaio', async () => {
    const semana = semanaDosPontos(new Date(Date.now() - 3600_000), new Date());
    const crava = async () =>
      (
        await db.query<{ s: number | null }>(
          `select sum(pontos)::int as s from public.pontos_semana($1) where minigame = 'crava' and torcedor_id = $2`,
          [semana, ana],
        )
      ).rows[0].s;
    expect(await crava()).toBe(20);
    await valendoDesde(38);
    expect(await crava()).toBe(20);
    await valendoDesde(99); // ensaio ligado: nada soma, nem o especial
    expect(await crava()).toBeNull();
    await valendoDesde(32);
    await servidor('select public.recalcular_ranking($1)', [semana]);
    const r = await db.query<{ soma: number }>(`select soma from public.ranking_semana where semana = $1 and time_id = 'gremio'`, [semana]);
    expect(r.rows[0].soma).toBe(20);
  });

  it('fica fora do Palpiteiro do Brasileirão, mas tem o ranking da própria rodada', async () => {
    await db.query(`insert into public.jogos (id, rodada, mandante_id, visitante_id, inicio, gols_mandante, gols_visitante, confirmado_em)
      values ('30000000-0000-4000-8000-000000000001', 37, 'gremio', 'remo', now() - interval '2 days', 1, 0, now())`);
    await db.query(`insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante)
      values ($1, '30000000-0000-4000-8000-000000000001', 1, 0)`, [ana]);
    await distribuir(37);
    const totais = async (r: number | null) =>
      (await servidor<{ total: number }>('select total from public.crava_totais($1) where torcedor_id = $2', [r, ana])).map((l) => l.total);
    expect(await totais(null)).toEqual([20]); // só a 37ª
    expect(await totais(rodada)).toEqual([20]); // só o especial
    const pos = await celular<{ pontos: number }>(ana, 'select pontos from public.minha_posicao_crava(null)');
    expect(pos[0].pontos).toBe(20);
    const ranking = await como<{ time_id: string; palpiteiros: number }>('anon', null, 'select time_id, palpiteiros from public.ranking_crava($1) where palpiteiros > 0', [rodada]);
    expect(ranking).toEqual([{ time_id: 'gremio', palpiteiros: 1 }]);
  });

  it('anulado: sem pontos', async () => {
    await db.query('update public.jogos set anulado = true where id = $1', [jogo]);
    await distribuir(rodada);
    const total = await db.query<{ s: number }>('select coalesce(sum(pontos), 0)::int as s from public.crava_pontos where jogo_id = $1', [jogo]);
    expect(total.rows[0].s).toBe(0);
  });
});
