// Apelido só 16+ (20261109200000_apelido_16.sql; docs/jogo.md, seções 4 e 7): o servidor grava o time e descarta o
// apelido de quem não é 16+, a faixa menos_16 apaga o apelido do torcedor e o dos desafios dele (triagem e junção do
// código), desafio novo só leva apelido de quem é 16+, e a limpeza única guarda só quando e quantos. Roda o SQL de
// verdade (PGlite).

import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracao, bancoDeTeste } from './banco';

const MIGRACAO = '20261109200000_apelido_16.sql';
const TEMPO = 120_000;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const impressao = (codigo: string) => createHash('sha256').update(codigo).digest('hex');

async function usuario(db: PGlite): Promise<string> {
  const id = uuid();
  await db.query('insert into auth.users (id, is_anonymous) values ($1, true)', [id]);
  return id;
}

async function torcedor(db: PGlite, faixa: string | null, apelido: string | null = 'Ana Gol'): Promise<string> {
  const id = await usuario(db);
  await db.query('insert into public.torcedores (id, time_id, apelido, faixa_etaria) values ($1, $2, $3, $4)', [
    id,
    'bahia',
    apelido,
    faixa,
  ]);
  return id;
}

async function celular<T>(db: PGlite, uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('teste.uid', $1, false), set_config('teste.sessao', '', false)`, [uid]);
  await db.exec('set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

async function servidor<T>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec('set role service_role');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

/** Uma partida fechada e um desafio em cada tabela, com o apelido escrito direto (como o fechamento grava). */
async function desafios(db: PGlite, quem: string, apelido: string | null, sufixo: string): Promise<void> {
  const partida = async () =>
    (
      await db.query<{ id: string }>(
        `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
         values ($1, 'normal', 1, 0.5, now() + interval '15 minutes') returning id`,
        [quem],
      )
    ).rows[0].id;
  await db.query(
    `insert into public.desafios (id, partida_id, torcedor_id, time_id, apelido, cobrancas, gols_jogador, gols_maquina, pontos)
     values ($1, $2, $3, 'bahia', $4, '[]', 3, 2, 80)`,
    [`pen${sufixo}`, await partida(), quem, apelido],
  );
  await db.query(
    `insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, apelido, perguntas, pontos, escada, resumo)
     values ($1, $2, $3, 'bahia', $4, array['a','b','c','d','e','f','g','h'], 70, 'x', 'parei na 6ª')`,
    [`pro${sufixo}`, await partida(), quem, apelido],
  );
  await db.query(
    `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, apelido, lance_id, pontos, gols, recriados, faixa)
     values ($1, $2, $3, 'bahia', $4, 'gol-100', 90, 2, 0, 'media')`,
    [`lan${sufixo}`, await partida(), quem, apelido],
  );
}

async function apelidosDosDesafios(db: PGlite, quem: string): Promise<(string | null)[]> {
  const { rows } = await db.query<{ apelido: string | null }>(
    `select apelido from public.desafios where torcedor_id = $1
     union all select apelido from public.prova_desafios where torcedor_id = $1
     union all select apelido from public.lances_desafios where torcedor_id = $1`,
    [quem],
  );
  return rows.map((r) => r.apelido);
}

const apelidoDe = async (db: PGlite, quem: string) =>
  (await db.query<{ apelido: string | null }>('select apelido from public.torcedores where id = $1', [quem])).rows[0]?.apelido;

describe('apelido só 16+', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await bancoDeTeste();
  }, TEMPO);

  describe('salvar_torcedor', () => {
    const salvar = (uid: string, apelido: string | null) =>
      celular<{ time_id: string; apelido: string | null }>(db, uid, 'select time_id, apelido from public.salvar_torcedor($1, $2)', [
        'remo',
        apelido,
      ]);

    it('16+ grava o apelido', async () => {
      for (const faixa of ['16_17', '18_mais']) {
        const eu = await torcedor(db, faixa, null);
        expect(await salvar(eu, 'Rei do Gol')).toEqual([{ time_id: 'remo', apelido: 'Rei do Gol' }]);
        expect(await apelidoDe(db, eu)).toBe('Rei do Gol');
      }
    }, TEMPO);

    it('menos de 16 e sem resposta: grava o time e descarta o apelido, sem erro', async () => {
      for (const faixa of ['menos_16', null]) {
        const eu = await torcedor(db, faixa, null);
        expect(await salvar(eu, 'Rei do Gol')).toEqual([{ time_id: 'remo', apelido: null }]);
        expect(await apelidoDe(db, eu)).toBeNull();
      }
    }, TEMPO);

    it('torcedor novo (sem linha ainda) entra com o time e sem apelido', async () => {
      const eu = await usuario(db);
      expect(await salvar(eu, 'Rei do Gol')).toEqual([{ time_id: 'remo', apelido: null }]);
      expect(await apelidoDe(db, eu)).toBeNull();
    }, TEMPO);

    it('o filtro e o tamanho continuam valendo antes da idade', async () => {
      const eu = await torcedor(db, 'menos_16', null);
      await expect(salvar(eu, 'x'.repeat(21))).rejects.toThrow(/apelido_longo/);
      const { rows } = await db.query<{ termo: string }>('select palavra as termo from public.palavras_bloqueadas limit 1');
      if (rows[0]) await expect(salvar(eu, rows[0].termo)).rejects.toThrow(/apelido_bloqueado/);
    }, TEMPO);
  });

  describe('a faixa gravada só fica mais protetora', () => {
    const faixa = (uid: string, f: string) => celular<{ ok: boolean }>(db, uid, 'select public.salvar_faixa_etaria($1) as ok', [f]);
    const faixaDe = async (uid: string) =>
      (await db.query<{ f: string | null }>('select faixa_etaria as f from public.torcedores where id = $1', [uid])).rows[0]?.f;

    it('menos de 16 não sobe por chamada direta: o apelido e o push continuam fechados', async () => {
      const eu = await torcedor(db, 'menos_16', null);
      for (const f of ['18_mais', '16_17']) {
        expect(await faixa(eu, f)).toEqual([{ ok: true }]);
        expect(await faixaDe(eu)).toBe('menos_16');
      }
      expect(await celular(db, eu, 'select apelido from public.salvar_torcedor($1, $2)', ['remo', 'Rei do Gol'])).toEqual([{ apelido: null }]);
      expect(await apelidoDe(db, eu)).toBeNull();
      await expect(
        celular(db, eu, 'select public.salvar_inscricao_push($1, $2, $3)', ['https://fcm.googleapis.com/fcm/send/x', 'B'.repeat(87), 'a'.repeat(22)]),
      ).rejects.toThrow(/so_18_mais/);
    }, TEMPO);

    it('16 ou 17 não vira 18+; descer sempre vale; a primeira resposta vale qualquer faixa', async () => {
      const eu = await torcedor(db, null, null);
      await faixa(eu, '18_mais');
      expect(await faixaDe(eu)).toBe('18_mais');
      await faixa(eu, '16_17');
      expect(await faixaDe(eu)).toBe('16_17');
      await faixa(eu, '18_mais');
      expect(await faixaDe(eu)).toBe('16_17');
      await faixa(eu, 'menos_16');
      expect(await faixaDe(eu)).toBe('menos_16');
    }, TEMPO);

    it('sem torcedor ainda devolve false, como antes', async () => {
      expect(await faixa(await usuario(db), '16_17')).toEqual([{ ok: false }]);
    }, TEMPO);
  });

  describe('a faixa vira menos_16', () => {
    it('pela triagem: o apelido e o dos desafios somem; os pontos não mudam', async () => {
      const eu = await torcedor(db, '18_mais');
      await desafios(db, eu, 'Ana Gol', 'tri00');
      const outro = await torcedor(db, '18_mais');
      await desafios(db, outro, 'Ana Gol', 'tri01');
      const pontos = async () =>
        (await db.query<{ p: number }>('select coalesce(sum(pontos), 0)::integer as p from public.desafios where torcedor_id = $1', [eu])).rows[0].p;
      const antes = await pontos();

      expect(await celular<{ ok: boolean }>(db, eu, 'select public.salvar_faixa_etaria($1) as ok', ['menos_16'])).toEqual([{ ok: true }]);
      expect(await apelidoDe(db, eu)).toBeNull();
      expect(await apelidosDosDesafios(db, eu)).toEqual([null, null, null]);
      expect(await pontos()).toBe(antes);
      // Os de outra pessoa ficam.
      expect(await apelidosDosDesafios(db, outro)).toEqual(['Ana Gol', 'Ana Gol', 'Ana Gol']);
    }, TEMPO);

    it('de 18+ para 16 ou 17 o apelido fica', async () => {
      const eu = await torcedor(db, '18_mais');
      await desafios(db, eu, 'Ana Gol', 'tri02');
      await celular(db, eu, 'select public.salvar_faixa_etaria($1)', ['16_17']);
      expect(await apelidoDe(db, eu)).toBe('Ana Gol');
      expect(await apelidosDosDesafios(db, eu)).toEqual(['Ana Gol', 'Ana Gol', 'Ana Gol']);
    }, TEMPO);

    it('nenhum caminho grava apelido em quem tem menos de 16', async () => {
      const eu = await torcedor(db, 'menos_16', 'Ana Gol');
      expect(await apelidoDe(db, eu)).toBeNull();
      await db.query(`update public.torcedores set apelido = 'Ana Gol' where id = $1`, [eu]);
      expect(await apelidoDe(db, eu)).toBeNull();
    }, TEMPO);

    it('pela junção do código: a faixa mais protetora ganha e leva o apelido junto', async () => {
      const dono = await torcedor(db, '18_mais', 'Ana Gol');
      await desafios(db, dono, 'Ana Gol', 'jun00');
      const origem = await torcedor(db, 'menos_16', null);
      await servidor(db, 'select public.codigo_gerar($1, $2)', [dono, impressao('JJJJ2222')]);
      await servidor(db, 'select * from public.codigo_conferir($1, $2)', [origem, impressao('JJJJ2222')]);
      const r = await servidor<{ time_id: string; apelido: string | null; faixa_etaria: string }>(
        db,
        'select * from public.juntar_torcedores($1, $2, null)',
        [impressao('JJJJ2222'), origem],
      );
      expect(r).toEqual([{ time_id: 'bahia', apelido: null, faixa_etaria: 'menos_16' }]);
      expect(await apelidoDe(db, dono)).toBeNull();
      expect(await apelidosDosDesafios(db, dono)).toEqual([null, null, null]);
    }, TEMPO);

    it('junção entre dois 16+ mantém o apelido', async () => {
      const dono = await torcedor(db, '18_mais', null);
      const origem = await torcedor(db, '16_17', 'Bia Gol');
      await servidor(db, 'select public.codigo_gerar($1, $2)', [dono, impressao('KKKK2222')]);
      await servidor(db, 'select * from public.codigo_conferir($1, $2)', [origem, impressao('KKKK2222')]);
      const r = await servidor<{ apelido: string | null; faixa_etaria: string }>(
        db,
        'select apelido, faixa_etaria from public.juntar_torcedores($1, $2, null)',
        [impressao('KKKK2222'), origem],
      );
      expect(r).toEqual([{ apelido: 'Bia Gol', faixa_etaria: '16_17' }]);
    }, TEMPO);

    it('junção com o dono menos de 16: o apelido da conta 16+ que entrou não passa', async () => {
      const dono = await torcedor(db, 'menos_16', null);
      const origem = await torcedor(db, '16_17', 'Bia Gol');
      await servidor(db, 'select public.codigo_gerar($1, $2)', [dono, impressao('NNNN2222')]);
      await servidor(db, 'select * from public.codigo_conferir($1, $2)', [origem, impressao('NNNN2222')]);
      const r = await servidor<{ apelido: string | null; faixa_etaria: string }>(
        db,
        'select apelido, faixa_etaria from public.juntar_torcedores($1, $2, null)',
        [impressao('NNNN2222'), origem],
      );
      expect(r).toEqual([{ apelido: null, faixa_etaria: 'menos_16' }]);
      expect(await apelidoDe(db, dono)).toBeNull();
    }, TEMPO);

    it('junção de uma conta sem resposta com uma menos de 16: fica menos de 16, sem apelido', async () => {
      const dono = await torcedor(db, null, 'Cau Gol'); // apelido de antes da regra
      await desafios(db, dono, 'Cau Gol', 'jun01');
      const origem = await torcedor(db, 'menos_16', null);
      await servidor(db, 'select public.codigo_gerar($1, $2)', [dono, impressao('PPPP2222')]);
      await servidor(db, 'select * from public.codigo_conferir($1, $2)', [origem, impressao('PPPP2222')]);
      const r = await servidor<{ apelido: string | null; faixa_etaria: string }>(
        db,
        'select apelido, faixa_etaria from public.juntar_torcedores($1, $2, null)',
        [impressao('PPPP2222'), origem],
      );
      expect(r).toEqual([{ apelido: null, faixa_etaria: 'menos_16' }]);
      expect(await apelidosDosDesafios(db, dono)).toEqual([null, null, null]);
    }, TEMPO);
  });

  describe('desafio novo', () => {
    it('só leva apelido de quem é 16+', async () => {
      const maior = await torcedor(db, '16_17');
      await desafios(db, maior, 'Ana Gol', 'nov00');
      expect(await apelidosDosDesafios(db, maior)).toEqual(['Ana Gol', 'Ana Gol', 'Ana Gol']);

      const semResposta = await torcedor(db, null);
      await desafios(db, semResposta, 'Ana Gol', 'nov01');
      expect(await apelidosDosDesafios(db, semResposta)).toEqual([null, null, null]);

      // Mudar o apelido direto também passa pela regra.
      await db.query(`update public.desafios set apelido = 'Outro' where torcedor_id = $1`, [semResposta]);
      expect(await apelidosDosDesafios(db, semResposta)).toEqual([null, null, null]);
    }, TEMPO);

    it('o fechamento de verdade grava o desafio sem apelido de quem não respondeu a triagem', async () => {
      const eu = await torcedor(db, null, 'Ana Gol'); // apelido de antes da regra, sem faixa no servidor
      const { rows } = await db.query<{ id: string }>(
        `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
         values ($1, 'normal', 1, 0.5, now() + interval '15 minutes') returning id`,
        [eu],
      );
      await db.query('select * from public.fechar_partida($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', [
        rows[0].id,
        eu,
        'bahia',
        '{}',
        '{}',
        50,
        '2026-10-20',
        '2026-10-19',
        '2026-10-20T12:00:00-03:00',
        null,
        JSON.stringify({ cobrancas: [], gols_jogador: 3, gols_maquina: 2 }),
        ['fech2345'],
      ]);
      expect(await apelidosDosDesafios(db, eu)).toEqual([null]);
    }, TEMPO);
  });

  it('as funções de gatilho não são chamáveis pelo celular', async () => {
    const { rows } = await db.query<{ f: string; pode: boolean }>(
      `select f, has_function_privilege('authenticated', f, 'execute') as pode
       from unnest(array['public.torcedor_sem_apelido_menos_16()', 'public.desafios_sem_apelido_menos_16()',
                         'public.desafio_apelido_so_16()']) f`,
    );
    expect(rows.every((r) => !r.pode)).toBe(true);
  }, TEMPO);

  it('quem pode chamar salvar_torcedor e salvar_faixa_etaria continua o mesmo: só o celular com login', async () => {
    const { rows } = await db.query<{ papel: string; f: string; pode: boolean }>(
      `select papel, f, has_function_privilege(papel, f, 'execute') as pode
       from unnest(array['anon', 'authenticated']) papel,
            unnest(array['public.salvar_torcedor(text, text)', 'public.salvar_faixa_etaria(text)']) f`,
    );
    for (const r of rows) expect(r.pode, `${r.papel} ${r.f}`).toBe(r.papel === 'authenticated');
    // Todas as funções novas ou mudadas fixam o search_path (as security definer não podem ser enganadas por um schema).
    const { rows: funcoes } = await db.query<{ f: string; config: string[] | null }>(
      `select p.proname as f, p.proconfig as config from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.proname in ('salvar_torcedor', 'salvar_faixa_etaria',
         'desafios_sem_apelido_menos_16', 'desafio_apelido_so_16', 'torcedor_sem_apelido_menos_16')`,
    );
    expect(funcoes).toHaveLength(5);
    for (const r of funcoes) expect(r.config, r.f).toContain('search_path=""');
  }, TEMPO);
});

describe('limpeza única', () => {
  it('menos_16 e os desafios deles ficam sem apelido; guarda só quando e quantos', async () => {
    const db = await bancoDeTeste(MIGRACAO);
    const menor = await torcedor(db, 'menos_16', 'Ana Gol');
    await desafios(db, menor, 'Ana Gol', 'lim00');
    // Já tirou o apelido do perfil, mas os desafios antigos ainda o mostram.
    const menorSemApelido = await torcedor(db, 'menos_16', null);
    await desafios(db, menorSemApelido, 'Bia Gol', 'lim01');
    const menorLimpo = await torcedor(db, 'menos_16', null);
    const maior = await torcedor(db, '16_17', 'Cau Gol');
    await desafios(db, maior, 'Cau Gol', 'lim02');
    const semResposta = await torcedor(db, null, 'Dani Gol');
    await desafios(db, semResposta, 'Dani Gol', 'lim03');

    await aplicarMigracao(db, MIGRACAO);

    expect(await apelidoDe(db, menor)).toBeNull();
    expect(await apelidosDosDesafios(db, menor)).toEqual([null, null, null]);
    expect(await apelidosDosDesafios(db, menorSemApelido)).toEqual([null, null, null]);
    expect(await apelidoDe(db, menorLimpo)).toBeNull();
    expect(await apelidoDe(db, maior)).toBe('Cau Gol');
    expect(await apelidosDosDesafios(db, maior)).toEqual(['Cau Gol', 'Cau Gol', 'Cau Gol']);
    // Sem resposta da triagem: o desafio (que qualquer um com o link vê) perde o apelido; o do perfil fica, só ela vê.
    expect(await apelidosDosDesafios(db, semResposta)).toEqual([null, null, null]);
    expect(await apelidoDe(db, semResposta)).toBe('Dani Gol');

    const { rows } = await db.query<Record<string, unknown>>('select * from public.apelidos_apagados');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ torcedores: 3, motivo: 'idade' });
    expect(Object.keys(rows[0]).sort()).toEqual(['apagado_em', 'id', 'motivo', 'torcedores']);
    expect(JSON.stringify(rows)).not.toMatch(/Gol/);

    // Rodar de novo não acha ninguém nem registra nada.
    await aplicarMigracao(db, MIGRACAO);
    expect((await db.query('select * from public.apelidos_apagados')).rows).toHaveLength(1);
    await db.close();
  }, TEMPO);
});
