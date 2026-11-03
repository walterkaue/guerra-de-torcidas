// Código do torcedor (20261103400000, docs/jogo.md seção 14.1): limites contra força bruta, código vencido, usado
// e reservado, a junção numa transação com o ranking igual antes e depois, aparelhos e desconectar, e a conta
// ligada (e-mail técnico, não anônima) que continua se apagando. Roda o SQL de verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';

const SEMANA = '2026-10-19'; // segunda
const DIA = '2026-10-20';
const OUTRO_DIA = '2026-10-21';
const SEMANA_PASSADA = '2026-10-12';
const TEMPO = 120_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const impressao = (codigo: string) => createHash('sha256').update(codigo).digest('hex');
const emailTecnico = () => `t.${uuid().replace(/-/g, '')}@torcedor.invalid`;

let db: PGlite;

async function torcedor(
  time: string | null,
  o: { faixa?: string | null; apelido?: string; anonima?: boolean; email?: string; criada?: string } = {},
): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous, email, created_at) values ($1, $2, $3, $4)', [
    id,
    o.anonima ?? true,
    o.email ?? null,
    o.criada ?? new Date().toISOString(),
  ]);
  if (time) {
    await db.query('insert into public.torcedores (id, time_id, apelido, faixa_etaria) values ($1, $2, $3, $4)', [
      id,
      time,
      o.apelido ?? null,
      o.faixa === undefined ? '18_mais' : o.faixa,
    ]);
  }
  return id;
}

async function partida(quem: string, pontos: number, o: { dia?: string; semana?: string } = {}): Promise<string> {
  const dia = o.dia ?? DIA;
  const { rows } = await db.query<{ id: string; time_id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 1, 0.5, now() + interval '15 minutes')
     returning id, (select time_id from public.torcedores where id = $1) as time_id`,
    [quem],
  );
  await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
    rows[0].id,
    quem,
    rows[0].time_id,
    '{}',
    '{}',
    pontos,
    dia,
    o.semana ?? SEMANA,
    `${dia}T12:00:00-03:00`,
    null,
    null,
    null,
  ]);
  return rows[0].id;
}

/** Como a função codigo-torcedor: chave secreta. */
async function servidor<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec('set role service_role');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

/** Como o celular: sessão de `uid` (a de nascença, ou `sessao`). */
async function celular<T>(uid: string | null, sql: string, params: unknown[] = [], sessao?: string): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', $2, false)`, [uid ?? '', sessao ?? '']);
  await db.exec('set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

const gerar = async (dono: string, codigo: string) =>
  (await servidor<{ expira: string }>('select public.codigo_gerar($1, $2) as expira', [dono, impressao(codigo)]))[0].expira;
const conferir = async (quem: string, codigo: string) =>
  (await servidor<{ situacao: string; dono: string | null; time_dono: string | null; time_seu: string | null }>(
    'select * from public.codigo_conferir($1, $2)',
    [quem, impressao(codigo)],
  ))[0];
const juntar = (codigo: string, origem: string, time: string | null = null) =>
  servidor<{ time_id: string; apelido: string | null; faixa_etaria: string | null }>(
    'select * from public.juntar_torcedores($1, $2, $3)',
    [impressao(codigo), origem, time],
  );
const n = async (sql: string, params: unknown[] = []) => (await db.query<{ n: number }>(sql, params)).rows[0].n;

async function placar(semana = SEMANA) {
  await db.query('select public.recalcular_ranking($1)', [semana]);
  const { rows } = await db.query(
    `select time_id, ativos, soma, media30, posicao_campeao from public.ranking_semana where semana = $1 and ativos > 0 order by time_id`,
    [semana],
  );
  return rows;
}

beforeAll(async () => {
  db = await bancoDeTeste();
}, TEMPO);

describe('gerar código', () => {
  it('um ativo por vez: gerar outro cancela o anterior', async () => {
    const dono = await torcedor('bahia');
    const quem = await torcedor(null);
    await gerar(dono, 'AAAA2222');
    await gerar(dono, 'AAAA3333');
    expect((await conferir(quem, 'AAAA2222')).situacao).toBe('codigo_invalido');
    expect((await conferir(quem, 'AAAA3333')).situacao).toBe('valido');
  }, TEMPO);

  it('vale 10 minutos', async () => {
    const dono = await torcedor('bahia');
    const expira = Date.parse(await gerar(dono, 'BBBB2222'));
    expect(expira - Date.now()).toBeGreaterThan(9.9 * 60_000);
    expect(expira - Date.now()).toBeLessThanOrEqual(10 * 60_000);
  }, TEMPO);

  it('até 5 por hora: o 6º é recusado', async () => {
    const dono = await torcedor('bahia');
    for (let i = 0; i < 5; i++) await gerar(dono, `CCCC222${i + 2}`);
    await expect(gerar(dono, 'CCCC2229')).rejects.toThrow(/muitos_codigos/);
  }, TEMPO);

  it('precisa ter time, e administrador não gera', async () => {
    await expect(gerar(await torcedor(null), 'DDDD2222')).rejects.toThrow(/sem_time/);
    const admin = await torcedor('bahia');
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
    await expect(gerar(admin, 'DDDD3333')).rejects.toThrow(/conta_nao_anonima/);
    await expect(gerar(await torcedor('bahia', { anonima: false, email: 'kaue@exemplo.com.br' }), 'DDDD4444')).rejects.toThrow(
      /conta_nao_anonima/,
    );
  }, TEMPO);

  it('o banco guarda só a impressão digital, nunca o código', async () => {
    const dono = await torcedor('bahia');
    await gerar(dono, 'EEEE2222');
    const { rows } = await db.query<Record<string, unknown>>('select * from public.codigos_torcedor where dono = $1', [dono]);
    expect(rows[0].impressao).toBe(impressao('EEEE2222'));
    expect(JSON.stringify(rows)).not.toContain('EEEE2222');
  }, TEMPO);
});

describe('conferir código (força bruta e código vencido)', () => {
  it('código vencido não vale e conta como erro', async () => {
    const dono = await torcedor('bahia');
    const quem = await torcedor(null);
    await gerar(dono, 'FFFF2222');
    await db.query(`update public.codigos_torcedor set expira_em = now() - interval '1 second' where dono = $1`, [dono]);
    expect((await conferir(quem, 'FFFF2222')).situacao).toBe('codigo_invalido');
    expect(await n('select count(*)::integer as n from public.codigo_tentativas where usuario_id = $1 and not acertou', [quem])).toBe(1);
  }, TEMPO);

  it('5 erros em 15 minutos travam o aparelho, mesmo com o código certo depois', async () => {
    const dono = await torcedor('bahia');
    const quem = await torcedor(null);
    await gerar(dono, 'GGGG2222');
    for (let i = 0; i < 5; i++) expect((await conferir(quem, `HHHH222${i + 2}`)).situacao).toBe('codigo_invalido');
    expect((await conferir(quem, 'GGGG2222')).situacao).toBe('muitas_tentativas');
    // Travado não conta mais tentativa (nem descobre nada).
    expect(await n('select count(*)::integer as n from public.codigo_tentativas where usuario_id = $1', [quem])).toBe(5);
    // Outro aparelho segue entrando.
    expect((await conferir(await torcedor(null), 'GGGG2222')).situacao).toBe('valido');
  }, TEMPO);

  it('20 erros no dia travam, mesmo espalhados', async () => {
    const quem = await torcedor(null);
    await db.query(
      `insert into public.codigo_tentativas (usuario_id, em, acertou)
       select $1, now() - make_interval(mins => 20 + g * 30), false from generate_series(1, 20) g`,
      [quem],
    );
    expect((await conferir(quem, 'JJJJ2222')).situacao).toBe('muitas_tentativas');
  }, TEMPO);

  it('freio geral: 200 erros em 10 minutos, de qualquer aparelho, pausam a entrada de todo mundo', async () => {
    const dono = await torcedor('bahia');
    await gerar(dono, 'KKKK2222');
    await db.query(
      `insert into public.codigo_tentativas (usuario_id, acertou)
       select gen_random_uuid(), false from generate_series(1, 200)`,
    );
    expect((await conferir(await torcedor(null), 'KKKK2222')).situacao).toBe('pausa_geral');
    await db.query(`update public.codigo_tentativas set em = now() - interval '11 minutes' where em > now() - interval '10 minutes'`);
    expect((await conferir(await torcedor(null), 'KKKK2222')).situacao).toBe('valido');
  }, TEMPO);

  it('apagar a conta não zera o limite: a tentativa fica sem a conta, até a faxina de 2 dias', async () => {
    const quem = await torcedor('remo');
    for (let i = 0; i < 3; i++) await conferir(quem, `MMMM222${i + 2}`);
    await celular(quem, 'select public.apagar_meus_dados()');
    expect(await n('select count(*)::integer as n from public.codigo_tentativas where usuario_id = $1', [quem])).toBe(3);
    await db.query(`update public.codigo_tentativas set em = now() - interval '3 days' where usuario_id = $1`, [quem]);
    await conferir(await torcedor(null), 'MMMM2229');
    expect(await n('select count(*)::integer as n from public.codigo_tentativas where usuario_id = $1', [quem])).toBe(0);
  }, TEMPO);

  it('código reservado por um aparelho não vale para outro', async () => {
    const dono = await torcedor('bahia');
    await gerar(dono, 'NNNN2222');
    expect((await conferir(await torcedor('remo'), 'NNNN2222')).situacao).toBe('valido');
    expect((await conferir(await torcedor(null), 'NNNN2222')).situacao).toBe('codigo_invalido');
  }, TEMPO);

  it('o próprio código não junta a conta com ela mesma', async () => {
    const dono = await torcedor('bahia');
    await gerar(dono, 'PPPP2222');
    expect((await conferir(dono, 'PPPP2222')).situacao).toBe('proprio');
  }, TEMPO);

  it('administrador não entra por código', async () => {
    const admin = await torcedor(null);
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
    expect((await conferir(admin, 'QQQQ2222')).situacao).toBe('conta_nao_anonima');
  }, TEMPO);

  it('o celular não chama gerar, conferir nem juntar, e não lê as tabelas', async () => {
    const eu = await torcedor('bahia');
    for (const sql of [
      `select public.codigo_gerar('${eu}', '${impressao('RRRR2222')}')`,
      `select * from public.codigo_conferir('${eu}', '${impressao('RRRR2222')}')`,
      `select * from public.juntar_torcedores('${impressao('RRRR2222')}', '${eu}', null)`,
      'select * from public.codigos_torcedor',
      'select * from public.codigo_tentativas',
      'select * from public.recordes_herdados',
      'select * from public.contas_juntadas',
      `select public.conta_de_torcedor('${eu}')`,
    ]) {
      await expect(celular(eu, sql), sql).rejects.toThrow(/permission denied/);
    }
  }, TEMPO);
});

describe('juntar as contas', () => {
  let dono: string;
  let origem: string;
  let antes: unknown[];
  let antesPassada: unknown[];
  let fechamentoAntes: unknown[];
  let xpDono: number;
  let resposta: { time_id: string; apelido: string | null; faixa_etaria: string | null }[];

  beforeAll(async () => {
    dono = await torcedor('bahia', { faixa: '18_mais' });
    origem = await torcedor('remo', { faixa: '16_17', apelido: 'Zagueirão' });
    for (let i = 0; i < 5; i++) await partida(dono, 50);
    for (let i = 0; i < 5; i++) await partida(origem, 60);
    await partida(origem, 70, { dia: OUTRO_DIA });
    await partida(origem, 45, { dia: '2026-10-13', semana: SEMANA_PASSADA });
    xpDono = (await db.query<{ xp: number }>('select xp from public.carreira_de($1)', [dono])).rows[0].xp;

    // Medalhas: 2 gols do dono e 3 da origem no mesmo lance.
    await db.query(
      `insert into public.lances_gols (partida_id, i, torcedor_id, lance_id, recriou)
       select gen_random_uuid(), 0, q, 'sao-paulo-gol-100', false from unnest($1::uuid[]) q`,
      [[dono, dono, origem, origem, origem]],
    );
    await db.query(
      `insert into public.carreira_bonus (torcedor_id, tipo, referencia, time_id, xp) values ($1, 'semana', $2, 'remo', 200)`,
      [origem, SEMANA_PASSADA],
    );

    // Crava: a 34 só a origem palpitou e nenhum jogo deu ponto (passa); a 33 já deu ponto à origem (fica).
    const jogo = async (rodada: number) =>
      (await db.query<{ id: string }>(
        `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values ($1, 'bahia', 'remo', now() + interval '1 day') returning id`,
        [rodada],
      )).rows[0].id;
    const j34 = await jogo(34);
    const j33 = await jogo(33);
    await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 2, 1)', [origem, j34]);
    await db.query('insert into public.certezas (torcedor_id, rodada, jogo_id) values ($1, 34, $2)', [origem, j34]);
    await db.query('insert into public.palpites (torcedor_id, jogo_id, gols_mandante, gols_visitante) values ($1, $2, 0, 0)', [origem, j33]);
    await db.query(
      `insert into public.crava_pontos (torcedor_id, jogo_id, rodada, time_id, semana, pontos) values ($1, $2, 33, 'remo', $3, 20)`,
      [origem, j33, SEMANA],
    );

    await db.query(`insert into public.feedbacks (usuario_id, tipo, texto) values ($1, 'ideia', 'do celular')`, [origem]);
    await db.query(
      `insert into public.push_inscricoes (endpoint, p256dh, auth, torcedor_id) values ('https://fcm.googleapis.com/b', $1, $2, $3)`,
      ['B'.repeat(87), 'a'.repeat(22), origem],
    );

    // A semana passada está travada: o fechamento não pode mudar.
    await db.query('select public.fechar_semana($1, $2)', [SEMANA_PASSADA, '2026-10-20T12:00:00-03:00']);
    fechamentoAntes = (await db.query('select * from public.fechamento_semana order by semana, time_id')).rows;
    antes = await placar();
    antesPassada = await placar(SEMANA_PASSADA);

    await gerar(dono, 'SSSS2222');
    const c = await conferir(origem, 'SSSS2222');
    expect(c).toEqual({ situacao: 'valido', dono, time_dono: 'bahia', time_seu: 'remo' });
  }, TEMPO);

  it('time diferente sem escolha: recusa e nada muda (o código continua reservado)', async () => {
    await expect(juntar('SSSS2222', origem)).rejects.toThrow(/escolher_time/);
    await expect(juntar('SSSS2222', origem, 'flamengo')).rejects.toThrow(/escolher_time/);
    expect(await n('select count(*)::integer as n from auth.users where id = $1', [origem])).toBe(1);
    expect(await n('select count(*)::integer as n from public.codigos_torcedor where dono = $1 and usado_em is null', [dono])).toBe(1);
    expect(await n('select count(*)::integer as n from public.recordes_herdados where torcedor_id = $1', [dono])).toBe(0);
  }, TEMPO);

  it('outro aparelho não junta com o código reservado', async () => {
    await expect(juntar('SSSS2222', await torcedor('remo'), 'remo')).rejects.toThrow(/codigo_invalido/);
  }, TEMPO);

  it('junta, fica com o time escolhido e devolve o torcedor', async () => {
    resposta = await juntar('SSSS2222', origem, 'remo');
    expect(resposta).toEqual([{ time_id: 'remo', apelido: 'Zagueirão', faixa_etaria: '16_17' }]);
  }, TEMPO);

  it('a conta antiga some inteira, com as sessões', async () => {
    expect(await n('select count(*)::integer as n from auth.users where id = $1', [origem])).toBe(0);
    expect(await n('select count(*)::integer as n from auth.sessions where user_id = $1', [origem])).toBe(0);
    expect(await n('select count(*)::integer as n from public.partidas where torcedor_id = $1', [origem])).toBe(0);
  }, TEMPO);

  it('pontos que já entraram no ranking não mudam, nem a semana travada', async () => {
    expect(await placar()).toEqual(antes);
    expect(await placar(SEMANA_PASSADA)).toEqual(antesPassada);
    expect((await db.query('select * from public.fechamento_semana order by semana, time_id')).rows).toEqual(fechamentoAntes);
  }, TEMPO);

  it('XP recalculado pela mesma regra por dia (5 + 5 no mesmo dia dão 75, não 100) e bônus da semana', async () => {
    const xp = (await db.query<{ xp: number }>('select xp from public.carreira_de($1)', [dono])).rows[0].xp;
    // Dono: 50 XP (5 partidas em DIA). Juntos: 10 em DIA = 75, 1 em OUTRO_DIA = 10, 1 na semana passada = 10,
    // as duas rodadas do Crava palpitadas hoje pela origem = 20, e o bônus da semana = 200.
    expect(xpDono).toBe(50);
    expect(xp).toBe(75 + 10 + 10 + 20 + 200);
  }, TEMPO);

  it('medalhas somam os gols por lance', async () => {
    expect(
      await n(`select count(*)::integer as n from public.lances_gols where torcedor_id = $1 and lance_id = 'sao-paulo-gol-100'`, [dono]),
    ).toBe(5);
  }, TEMPO);

  it('recordes ficam com o maior', async () => {
    const recorde = async (m: string) =>
      (await db.query<{ r: number | null }>('select public.recorde_pessoal($1, $2) as r', [dono, m])).rows[0].r;
    expect(await recorde('penaltis')).toBe(70);
    expect(await recorde('crava')).toBe(20);
    // Partida do dono depois da junção: o recorde de antes dela já conta o herdado.
    await partida(dono, 65, { dia: OUTRO_DIA });
    const { rows } = await db.query<{ r: number }>(
      `select public.recorde_pessoal($1, 'penaltis', now()) as r`,
      [dono],
    );
    expect(rows[0].r).toBe(70);
  }, TEMPO);

  it('apelido do dono, ou o da origem; faixa a mais protetora; sem aviso de domingo fora do 18+', async () => {
    const { rows } = await db.query('select time_id, apelido, faixa_etaria from public.torcedores where id = $1', [dono]);
    expect(rows).toEqual([{ time_id: 'remo', apelido: 'Zagueirão', faixa_etaria: '16_17' }]);
    expect(await n('select count(*)::integer as n from public.push_inscricoes where torcedor_id = $1', [dono])).toBe(0);
  }, TEMPO);

  it('Crava: a rodada sem ponto passa inteira, com a certeza; a que já deu ponto fica no placar', async () => {
    const { rows } = await db.query<{ rodada: number; time_id: string }>(
      `select j.rodada, p.time_id from public.palpites p join public.jogos j on j.id = p.jogo_id where p.torcedor_id = $1`,
      [dono],
    );
    expect(rows).toEqual([{ rodada: 34, time_id: 'remo' }]);
    expect(await n('select count(*)::integer as n from public.certezas where torcedor_id = $1 and rodada = 34', [dono])).toBe(1);
  }, TEMPO);

  it('mensagens do "Achei um erro" passam para a conta', async () => {
    expect(await n(`select count(*)::integer as n from public.feedbacks where usuario_id = $1 and texto = 'do celular'`, [dono])).toBe(1);
  }, TEMPO);

  it('o código foi usado: não vale de novo, e o status diz "usado"', async () => {
    expect((await conferir(await torcedor(null), 'SSSS2222')).situacao).toBe('codigo_invalido');
    expect((await celular<{ s: string }>(dono, 'select public.meu_codigo_status() as s'))[0].s).toBe('usado');
    expect(await n('select count(*)::integer as n from public.contas_juntadas where tinha_dados')).toBe(1);
  }, TEMPO);

  it('aparelho novo (sem torcedor) só entra: fica tudo do dono', async () => {
    const novo = await torcedor(null);
    await gerar(dono, 'TTTT2222');
    expect((await conferir(novo, 'TTTT2222')).situacao).toBe('valido');
    expect(await juntar('TTTT2222', novo)).toEqual([{ time_id: 'remo', apelido: 'Zagueirão', faixa_etaria: '16_17' }]);
    expect(await n('select count(*)::integer as n from auth.users where id = $1', [novo])).toBe(0);
    expect(await n('select count(*)::integer as n from public.contas_juntadas where not tinha_dados')).toBe(1);
  }, TEMPO);

  it('código vencido entre conferir e juntar: recusa e a conta antiga fica', async () => {
    const outro = await torcedor('bahia');
    await gerar(dono, 'UUUU2222');
    expect((await conferir(outro, 'UUUU2222')).situacao).toBe('valido');
    await db.query(`update public.codigos_torcedor set expira_em = now() - interval '1 second' where dono = $1 and usado_em is null`, [dono]);
    await expect(juntar('UUUU2222', outro, 'bahia')).rejects.toThrow(/codigo_invalido/);
    expect(await n('select count(*)::integer as n from public.torcedores where id = $1', [outro])).toBe(1);
  }, TEMPO);

  it('o zerar da pré-temporada leva os recordes herdados junto', async () => {
    const copia = await bancoDeTeste();
    try {
      const a = uuid();
      await copia.query('insert into auth.users (id) values ($1)', [a]);
      await copia.query(`insert into public.torcedores (id, time_id) values ($1, 'bahia')`, [a]);
      await copia.query(`insert into public.recordes_herdados (torcedor_id, minigame, recorde) values ($1, 'penaltis', 90)`, [a]);
      await copia.exec(readFileSync(join(import.meta.dirname, '..', '..', 'scripts', 'zerar-pre-temporada.sql'), 'utf8'));
      expect((await copia.query<{ n: number }>('select count(*)::integer as n from public.recordes_herdados')).rows[0].n).toBe(0);
    } finally {
      await copia.close();
    }
  }, TEMPO);
});

describe('aparelhos ligados e desconectar', () => {
  let eu: string;
  let celularNovo: string;
  let outraPessoa: string;

  beforeAll(async () => {
    eu = await torcedor('bahia');
    celularNovo = uuid();
    await db.query(
      `insert into auth.sessions (id, user_id, user_agent, refreshed_at) values ($1, $2, 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', now() at time zone 'UTC')`,
      [celularNovo, eu],
    );
    outraPessoa = await torcedor('remo');
  }, TEMPO);

  it('lista só as sessões da conta, este aparelho primeiro', async () => {
    const lista = await celular<{ id: string; este: boolean; user_agent: string | null }>(eu, 'select * from public.meus_aparelhos()');
    expect(lista.map((a) => [a.id, a.este])).toEqual([
      [eu, true],
      [celularNovo, false],
    ]);
    expect(Object.keys(lista[0])).not.toContain('ip');
    expect((await celular<{ d: { aparelhos: number } }>(eu, 'select public.ver_meus_dados() as d'))[0].d.aparelhos).toBe(2);
  }, TEMPO);

  it('não desconecta o próprio aparelho nem o de outra pessoa', async () => {
    await expect(celular(eu, 'select public.desconectar_aparelho($1)', [eu])).rejects.toThrow(/este_aparelho/);
    await expect(celular(eu, 'select public.desconectar_aparelho($1)', [outraPessoa])).rejects.toThrow(/nao_encontrado/);
    expect(await n('select count(*)::integer as n from auth.sessions where id = $1', [outraPessoa])).toBe(1);
  }, TEMPO);

  it('desconectar apaga a sessão do outro aparelho', async () => {
    await celular(eu, 'select public.desconectar_aparelho($1)', [celularNovo]);
    expect(await n('select count(*)::integer as n from auth.sessions where id = $1', [celularNovo])).toBe(0);
  }, TEMPO);

  it('o aparelho desconectado, com o passe que ainda tem, não apaga a conta, não lista e não desconecta ninguém', async () => {
    await expect(celular(eu, 'select public.apagar_meus_dados()', [], celularNovo)).rejects.toThrow(/sessao_encerrada/);
    await expect(celular(eu, 'select * from public.meus_aparelhos()', [], celularNovo)).rejects.toThrow(/sessao_encerrada/);
    await expect(celular(eu, 'select public.desconectar_aparelho($1)', [eu], celularNovo)).rejects.toThrow(/sessao_encerrada/);
    expect(await n('select count(*)::integer as n from auth.users where id = $1', [eu])).toBe(1);
  }, TEMPO);

  it('o aparelho desconectado também não grava time, faixa, palpite, certeza nem mensagem, e não lê os dados', async () => {
    const { rows: jogo } = await db.query<{ id: string }>(
      `insert into public.jogos (rodada, mandante_id, visitante_id, inicio) values (35, 'bahia', 'remo', now() + interval '1 day') returning id`,
    );
    const j = jogo[0].id;
    // A certeza da 35 está aberta: o que barra o aparelho desconectado é só a sessão.
    await db.query(`update public.rodadas set trava_certeza = now() + interval '1 day' where numero = 35`);
    const tentativas: [string, unknown[]][] = [
      [`select public.salvar_torcedor('remo', 'Outro')`, []],
      [`select public.salvar_faixa_etaria('18_mais')`, []],
      [`select public.salvar_inscricao_push('https://fcm.googleapis.com/x', '${'B'.repeat(87)}', '${'a'.repeat(22)}')`, []],
      ['insert into public.palpites (jogo_id, gols_mandante, gols_visitante) values ($1, 1, 1)', [j]],
      ['insert into public.certezas (rodada, jogo_id) values (35, $1)', [j]],
      [`insert into public.feedbacks (tipo, texto) values ('ideia', 'do aparelho desconectado')`, []],
    ];
    for (const [sql, params] of tentativas) {
      await expect(celular(eu, sql, params, celularNovo), sql).rejects.toThrow(/sessao_encerrada|row-level security/);
    }
    expect((await celular<{ d: unknown }>(eu, 'select public.ver_meus_dados() as d', [], celularNovo))[0].d).toBeNull();
    expect((await celular<{ s: string | null }>(eu, 'select public.meu_codigo_status() as s', [], celularNovo))[0].s).toBeNull();
    // Com a sessão de verdade, as mesmas escritas passam.
    await celular(eu, `select public.salvar_torcedor('bahia', 'Tricolor')`);
    await celular(eu, 'insert into public.palpites (jogo_id, gols_mandante, gols_visitante) values ($1, 1, 1)', [j]);
    await celular(eu, 'insert into public.certezas (rodada, jogo_id) values (35, $1)', [j]);
    await celular(eu, `insert into public.feedbacks (tipo, texto) values ('ideia', 'da sessão ativa')`);
    expect(await n('select count(*)::integer as n from public.palpites where torcedor_id = $1', [eu])).toBe(1);
    expect((await celular<{ ok: boolean }>(eu, 'select public.sessao_ativa() as ok'))[0].ok).toBe(true);
  }, TEMPO);

  it('sem login, nada', async () => {
    await expect(celular(null, 'select * from public.meus_aparelhos()')).rejects.toThrow(/sessao_encerrada/);
    await expect(celular(null, `select public.desconectar_aparelho('${eu}')`)).rejects.toThrow(/sem_login/);
  }, TEMPO);
});

describe('conta ligada pelo código (e-mail técnico, não anônima)', () => {
  it('"Apagar meus dados" apaga, e conta com e-mail de verdade continua recusada', async () => {
    const ligada = await torcedor('bahia', { anonima: false, email: emailTecnico() });
    await celular(ligada, 'select public.apagar_meus_dados()');
    expect(await n('select count(*)::integer as n from auth.users where id = $1', [ligada])).toBe(0);

    const real = await torcedor('bahia', { anonima: false, email: 't.kaue@torcedor.invalid.com' });
    await expect(celular(real, 'select public.apagar_meus_dados()')).rejects.toThrow(/conta_nao_anonima/);
  }, TEMPO);

  it('a limpeza de contas paradas também leva a conta ligada, e nunca a de e-mail de verdade ou de administrador', async () => {
    const antiga = '2025-01-01T00:00:00Z';
    const ligada = await torcedor('bahia', { anonima: false, email: emailTecnico(), criada: antiga });
    const real = await torcedor('bahia', { anonima: false, email: 'alguem@exemplo.com.br', criada: antiga });
    const admin = await torcedor('bahia', { criada: antiga });
    await db.query('insert into public.administradores (usuario_id) values ($1)', [admin]);
    await db.query('select public.apagar_contas_paradas(6, now())');
    expect(await n('select count(*)::integer as n from auth.users where id = $1', [ligada])).toBe(0);
    expect(await n('select count(*)::integer as n from auth.users where id in ($1, $2)', [real, admin])).toBe(2);
  }, TEMPO);
});
