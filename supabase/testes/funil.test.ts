// Funil do X1 (20261108000000): o fluxo da função `funil` (fluxo.ts) contra o SQL de verdade (PGlite). Lista fechada
// conferida dos dois lados, nada de pessoa nas tabelas, impressão do código, limites por aparelho e geral,
// gerados contados uma vez (pronto para o D8 apagar X1 antigos), limpeza dos 30 dias e o celular sem acesso.

import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bancoDeTeste } from './banco';
import { processar, type EventoParaGravar, type Servicos } from '../functions/funil/fluxo';
import { impressaoDoX1 } from '../functions/_shared/jogo/funil';

const SEGREDO = 'segredo-de-teste';
const TEMPO = 120_000;
const TOKEN_BOM = 'token-bom';

let db: PGlite;

async function comoServico<T>(fn: () => Promise<T>): Promise<T> {
  await db.exec('set role service_role');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

/** A função de verdade, com o banco de verdade; só o Auth é de mentira (token-bom → sessão s-<n>). */
function servicos(sessao = 's-1'): Servicos {
  return {
    async sessaoDoToken(t) {
      return t === TOKEN_BOM ? sessao : null;
    },
    registrar: (chave: string, eventos: EventoParaGravar[], semSessao: boolean) =>
      comoServico(async () => {
        const { rows } = await db.query<{ n: number }>('select public.funil_registrar($1, $2::jsonb, $3) as n', [
          chave,
          JSON.stringify(eventos),
          semSessao,
        ]);
        return rows[0].n;
      }),
    segredo: SEGREDO,
  };
}

const lote = (e: unknown[], t?: string) => JSON.stringify({ t, e });

async function contagem(): Promise<Record<string, number>> {
  const { rows } = await db.query<{ k: string; n: number }>(
    `select concat_ws('/', evento, tipo, nullif(meio, ''), nullif(jogo, ''), case when x1 then 'x1' end) as k, n
     from public.funil_contagem where evento <> 'gerou'`,
  );
  return Object.fromEntries(rows.map((r) => [r.k, r.n]));
}

/** Cria um X1 de verdade (o funil só grava linha de X1 que existe). */
async function criarX1(tabela: 'desafios' | 'lances_desafios' | 'prova_desafios', id: string): Promise<void> {
  const dono = '00000000-0000-4000-8000-0000000f0009';
  const { rows } = await db.query<{ id: string }>(
    `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
     values ($1, 'normal', 1, 0.5, now()) returning id`,
    [dono],
  );
  const sql = {
    desafios: `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos)
      values ($1, $2, $3, 'flamengo', '[]', 3, 2, 50)`,
    lances_desafios: `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, lance_id, pontos, gols, recriados, faixa)
      values ($1, $2, $3, 'flamengo', 'lance-1', 40, 2, 0, 'media')`,
    prova_desafios: `insert into public.prova_desafios (id, partida_id, torcedor_id, time_id, perguntas, pontos, escada, resumo)
      values ($1, $2, $3, 'flamengo', array['a','b','c','d','e','f','g','h'], 70, 'x', 'parei na 6ª')`,
  }[tabela];
  await db.query(sql, [id, rows[0].id, dono]);
}

beforeAll(async () => {
  db = await bancoDeTeste();
  await db.exec(`
    insert into auth.users (id) values ('00000000-0000-4000-8000-0000000f0009');
    insert into public.torcedores (id, time_id) values ('00000000-0000-4000-8000-0000000f0009', 'flamengo');
  `);
  for (const id of ['abcd2345', 'abcd23a2', 'abcd23a3']) await criarX1('desafios', id);
  await criarX1('lances_desafios', 'lanc2345');
  for (const id of ['abcd2345', 'abcd2346']) await criarX1('prova_desafios', id);
}, TEMPO);

beforeEach(async () => {
  await db.exec('truncate public.funil_contagem, public.funil_eventos, public.funil_limite');
});

describe('funil do X1: gravação', () => {
  it('conta o funil de um X1 e liga os eventos só pela impressão do código', async () => {
    const x1 = 'abcd2345';
    const n = await processar(
      servicos(),
      lote(
        [
          { ev: 'compartilhou', tipo: 'x1_penaltis', meio: 'grupo', x1 },
          { ev: 'abriu', tipo: 'x1_penaltis', x1 },
          { ev: 'aceitou', tipo: 'x1_penaltis', x1 },
          { ev: 'primeiro_chute', tipo: 'x1_penaltis', x1 },
          { ev: 'terminou', tipo: 'x1_penaltis', x1 },
          { ev: 'revanche', tipo: 'x1_penaltis', x1 },
          { ev: 'compartilhou', tipo: 'resultado', meio: 'emoji', jogo: 'time_do_dia' },
          { ev: 'abriu', tipo: 'lance' },
        ],
        TOKEN_BOM,
      ),
      null,
    );
    expect(n).toBe(8);
    expect(await contagem()).toEqual({
      'compartilhou/x1_penaltis/grupo/x1': 1,
      'abriu/x1_penaltis/x1': 1,
      'aceitou/x1_penaltis/x1': 1,
      'primeiro_chute/x1_penaltis/x1': 1,
      'terminou/x1_penaltis/x1': 1,
      'revanche/x1_penaltis/x1': 1,
      'compartilhou/resultado/emoji/time_do_dia': 1,
      'abriu/lance': 1,
    });

    // Linha por evento só nos 6 que têm X1, todos com a mesma impressão, e o código não aparece em lugar nenhum.
    const { rows } = await db.query<{ impressao: string; n: number }>(
      'select impressao, count(*)::int as n from public.funil_eventos group by impressao',
    );
    expect(rows).toEqual([{ impressao: await impressaoDoX1(x1, SEGREDO), n: 6 }]);
    const tudo = await db.query<{ t: string }>(
      `select (select coalesce(string_agg(e::text, ','), '') from public.funil_eventos e)
           || (select coalesce(string_agg(c::text, ','), '') from public.funil_contagem c)
           || (select coalesce(string_agg(l::text, ','), '') from public.funil_limite l) as t`,
    );
    expect(tudo.rows[0].t).not.toContain(x1);
    expect(tudo.rows[0].t).not.toContain('s-1');
  });

  it('nenhuma tabela tem coluna de pessoa, IP ou código', async () => {
    const { rows } = await db.query<{ coluna: string }>(
      `select table_name || '.' || column_name as coluna from information_schema.columns
       where table_schema = 'public' and table_name like 'funil\\_%'`,
    );
    const colunas = rows.map((r) => r.coluna).sort();
    expect(colunas).toEqual(
      [
        'funil_contagem.dia', 'funil_contagem.evento', 'funil_contagem.jogo', 'funil_contagem.meio', 'funil_contagem.n',
        'funil_contagem.tipo', 'funil_contagem.x1', 'funil_eventos.criado_em', 'funil_eventos.dia', 'funil_eventos.evento',
        'funil_eventos.id', 'funil_eventos.impressao', 'funil_eventos.jogo', 'funil_eventos.meio', 'funil_eventos.tipo',
        'funil_limite.chave', 'funil_limite.minuto', 'funil_limite.n',
      ].sort(),
    );
  });

  it('desistência: soma por etapa e jogo, e marca quando o fluxo era de X1', async () => {
    await processar(
      servicos(),
      lote([
        { ev: 'desistiu', tipo: 'triagem', x1: 'abcd2345' },
        { ev: 'desistiu', tipo: 'triagem' },
        { ev: 'desistiu', tipo: 'partida', jogo: 'prova' },
        { ev: 'voltou', tipo: 'partida', jogo: 'prova' },
      ]),
      '203.0.113.9',
    );
    expect(await contagem()).toEqual({
      'desistiu/triagem/x1': 1,
      'desistiu/triagem': 1,
      'desistiu/partida/prova': 1,
      'voltou/partida/prova': 1,
    });
  });

  it('X1 inventado não vira linha: o evento de X1 cai, e a desistência conta sem X1', async () => {
    const n = await processar(
      servicos(),
      lote(
        [
          { ev: 'abriu', tipo: 'x1_penaltis', x1: 'zzzz9999' },
          { ev: 'aceitou', tipo: 'x1_lances', x1: 'abcd2345' }, // existe, mas é de pênaltis e Prova, não dos Lances
          { ev: 'aceitou', tipo: 'x1_lances', x1: 'lanc2345' },
          { ev: 'desistiu', tipo: 'triagem', x1: 'zzzz9999' },
          { ev: 'desistiu', tipo: 'partida', jogo: 'lances', x1: 'lanc2345' },
        ],
        TOKEN_BOM,
      ),
      null,
    );
    expect(n).toBe(3);
    expect(await contagem()).toEqual({ 'aceitou/x1_lances/x1': 1, 'desistiu/triagem': 1, 'desistiu/partida/lances/x1': 1 });
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.funil_eventos');
    expect(rows[0].n).toBe(2);
  });

  it('uma linha por X1 e evento: abrir o mesmo link de novo só soma na contagem', async () => {
    const abriu = { ev: 'abriu', tipo: 'x1_penaltis', x1: 'abcd2345' };
    await processar(servicos(), lote([abriu, abriu], TOKEN_BOM), null);
    await processar(servicos(), lote([abriu], TOKEN_BOM), null);
    expect((await contagem())['abriu/x1_penaltis/x1']).toBe(3);
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.funil_eventos where evento = 'abriu'");
    expect(rows[0].n).toBe(1);
  });

  it('descarta o que está fora da lista, nos dois lados', async () => {
    // Pelo fluxo: a lista do celular nem chega ao banco.
    expect(await processar(servicos(), lote([{ ev: 'gerou', tipo: 'x1_penaltis', x1: 'abcd2345' }, { ev: 'abriu', tipo: 'x' }]), '203.0.113.9')).toBe(0);
    // Direto no banco (a função já conferiu, o banco confere de novo): 'gerou', combinação errada, impressão torta.
    const n = await comoServico(async () => {
      const { rows } = await db.query<{ n: number }>("select public.funil_registrar(repeat('a', 32), $1::jsonb) as n", [
        JSON.stringify([
          { evento: 'gerou', tipo: 'x1_penaltis', meio: '', jogo: '', impressao: 'b'.repeat(32), codigo: 'abcd2345' },
          { evento: 'aceitou', tipo: 'x1_penaltis', meio: '', jogo: '', impressao: null, codigo: null },
          { evento: 'abriu', tipo: 'lance', meio: '', jogo: '', impressao: 'b'.repeat(32), codigo: 'abcd2345' },
          { evento: 'aceitou', tipo: 'x1_penaltis', meio: '', jogo: '', impressao: 'nao-e-hex', codigo: 'abcd2345' },
          { evento: 'aceitou', tipo: 'x1_penaltis', meio: '', jogo: '', impressao: 'b'.repeat(32), codigo: null },
          { evento: 'aceitou', tipo: 'x1_penaltis', meio: '', jogo: '', impressao: 'b'.repeat(32), codigo: 'ABCD-234' },
          'texto solto',
          { evento: 'abriu', tipo: 'lance', meio: '', jogo: '', impressao: null, codigo: null },
        ]),
      ]);
      return rows[0].n;
    });
    expect(n).toBe(1);
    expect(await contagem()).toEqual({ 'abriu/lance': 1 });
  });

  it('corpo estranho, grande ou sem como limitar não grava nada', async () => {
    const s = servicos();
    expect(await processar(s, 'não é json', '203.0.113.9')).toBe(0);
    expect(await processar(s, lote([{ ev: 'abriu', tipo: 'lance', sobra: 'x'.repeat(9000) }]), '203.0.113.9')).toBe(0);
    // Token inválido e sem IP: sem chave para o limite.
    expect(await processar(s, lote([{ ev: 'abriu', tipo: 'lance' }], 'token-ruim'), null)).toBe(0);
    expect(await contagem()).toEqual({});
  });
});

describe('funil do X1: limites', () => {
  const abriu = { ev: 'abriu', tipo: 'lance' };

  it('40 por minuto por aparelho; a sessão vale mais que o IP, e outro aparelho tem o seu', async () => {
    const s = servicos('s-limite');
    let total = 0;
    for (let i = 0; i < 3; i++) total += await processar(s, lote(Array(20).fill(abriu), TOKEN_BOM), '203.0.113.9');
    expect(total).toBe(40);
    // Mesmo IP, sem sessão: é outra chave.
    expect(await processar(s, lote([abriu]), '203.0.113.9')).toBe(1);
    // Outra sessão no mesmo IP também.
    expect(await processar(servicos('s-outra'), lote([abriu], TOKEN_BOM), '203.0.113.9')).toBe(1);
    expect((await contagem())['abriu/lance']).toBe(42);
  });

  it('no minuto seguinte o aparelho volta a contar, e o minuto velho sai pela limpeza do cron', async () => {
    const s = servicos('s-minuto');
    for (let i = 0; i < 2; i++) await processar(s, lote(Array(20).fill(abriu), TOKEN_BOM), null);
    expect(await processar(s, lote([abriu], TOKEN_BOM), null)).toBe(0);
    await db.exec("update public.funil_limite set minuto = minuto - interval '1 minute'");
    expect(await processar(s, lote([abriu], TOKEN_BOM), null)).toBe(1);
    // A gravação não apaga nada; a limpeza do cron tira só os minutos que passaram.
    await db.exec("insert into public.funil_limite (chave, minuto, n) values (repeat('c', 32), date_trunc('minute', now()) - interval '2 minutes', 5)");
    await comoServico(() => db.query('select public.funil_limpar_limite()'));
    const { rows } = await db.query<{ velhos: number; atuais: number }>(
      `select count(*) filter (where minuto < date_trunc('minute', now()))::int as velhos,
              count(*) filter (where minuto = date_trunc('minute', now()))::int as atuais from public.funil_limite`,
    );
    expect(rows[0]).toEqual({ velhos: 0, atuais: 2 });
  });

  it('sem sessão: 1000 por minuto somando todos os IPs, e quem tem sessão continua contando', async () => {
    await db.exec("insert into public.funil_limite (chave, minuto, n) values ('*s', date_trunc('minute', now()), 998)");
    expect(await processar(servicos(), lote(Array(5).fill(abriu)), '203.0.113.20')).toBe(2);
    expect(await processar(servicos(), lote([abriu]), '203.0.113.21')).toBe(0);
    expect(await processar(servicos('s-com-sessao'), lote([abriu], TOKEN_BOM), '203.0.113.21')).toBe(1);
    // Teto estourado: o IP novo nem ganha linha no limite.
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.funil_limite where chave not in ('*', '*s')");
    expect(rows[0].n).toBe(2);
  });

  it('teto geral de 3000 por minuto', async () => {
    await db.exec("insert into public.funil_limite (chave, minuto, n) values ('*', date_trunc('minute', now()), 2995)");
    expect(await processar(servicos('s-geral'), lote(Array(10).fill(abriu), TOKEN_BOM), null)).toBe(5);
    expect(await processar(servicos('s-geral-2'), lote([abriu], TOKEN_BOM), null)).toBe(0);
  });
});

describe('funil do X1: gerados, 30 dias e acesso', () => {
  it('conta os gerados por dia e tipo uma vez só: apagar o X1 depois (D8) não muda a contagem', async () => {
    await db.exec(`
      insert into auth.users (id) values ('00000000-0000-4000-8000-0000000f0001');
      insert into public.torcedores (id, time_id) values ('00000000-0000-4000-8000-0000000f0001', 'flamengo');
    `);
    const partida = async () => {
      const { rows } = await db.query<{ id: string }>(
        `insert into public.partidas (torcedor_id, modo, semente, dificuldade, expira_em)
         values ('00000000-0000-4000-8000-0000000f0001', 'normal', 1, 0.5, now()) returning id`,
      );
      return rows[0].id;
    };
    const ontem = "(now() - interval '1 day')";
    for (const [id, quando] of [['gerado01', ontem], ['gerado02', ontem], ['gerado03', 'now()']]) {
      await db.query(
        `insert into public.desafios (id, partida_id, torcedor_id, time_id, cobrancas, gols_jogador, gols_maquina, pontos, criado_em)
         values ($1, $2, '00000000-0000-4000-8000-0000000f0001', 'flamengo', '[]', 3, 2, 50, ${quando})`,
        [id, await partida()],
      );
    }
    await db.query(
      `insert into public.lances_desafios (id, partida_id, torcedor_id, time_id, lance_id, pontos, gols, recriados, faixa, criado_em)
       values ('gerado04', $1, '00000000-0000-4000-8000-0000000f0001', 'flamengo', 'lance-1', 40, 2, 0, 'media', ${ontem})`,
      [await partida()],
    );

    const contar = () => comoServico(() => db.query('select public.funil_contar_gerados()'));
    const gerados = async () =>
      (
        await db.query<{ tipo: string; n: number }>(
          "select tipo, n from public.funil_contagem where evento = 'gerou' and dia = public.hoje_brasilia() - 1 order by tipo",
        )
      ).rows;

    await contar();
    expect(await gerados()).toEqual([
      { tipo: 'x1_lances', n: 1 },
      { tipo: 'x1_penaltis', n: 2 },
    ]);
    // Hoje fica de fora: a rotina conta até ontem.
    const hoje = await db.query("select 1 from public.funil_contagem where evento = 'gerou' and dia = public.hoje_brasilia()");
    expect(hoje.rows).toHaveLength(0);

    // Pedir até hoje (ou depois) não conta o dia em andamento: ele ficaria congelado incompleto.
    await comoServico(() => db.query("select public.funil_contar_gerados(public.hoje_brasilia() + 3)"));
    const congelado = await db.query("select 1 from public.funil_contagem where evento = 'gerou' and dia >= public.hoje_brasilia()");
    expect(congelado.rows).toHaveLength(0);

    // O D8 apaga o X1 antigo depois de contar: a contagem de ontem continua 2.
    await db.exec("delete from public.desafios where id = 'gerado01'");
    await contar();
    expect(await gerados()).toEqual([
      { tipo: 'x1_lances', n: 1 },
      { tipo: 'x1_penaltis', n: 2 },
    ]);
  });

  it('a rotina diária apaga as linhas por evento com mais de 30 dias e guarda a contagem', async () => {
    await processar(servicos(), lote([{ ev: 'abriu', tipo: 'x1_prova', x1: 'abcd2345' }, { ev: 'abriu', tipo: 'x1_prova', x1: 'abcd2346' }], TOKEN_BOM), null);
    await db.exec("update public.funil_eventos set criado_em = now() - interval '31 days' where id = (select min(id) from public.funil_eventos)");
    await comoServico(() => db.query('select public.funil_rotina_diaria()'));
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.funil_eventos');
    expect(rows[0].n).toBe(1);
    expect((await contagem())['abriu/x1_prova/x1']).toBe(2);
  });

  it('o celular (anon e authenticated) não lê, não grava e não chama as funções', async () => {
    await processar(servicos(), lote([{ ev: 'abriu', tipo: 'lance' }], TOKEN_BOM), null);
    for (const papel of ['anon', 'authenticated']) {
      await db.exec(`set role ${papel}`);
      try {
        for (const t of ['funil_contagem', 'funil_eventos', 'funil_limite']) {
          await expect(db.query(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
        }
        await expect(db.query("select public.funil_registrar(repeat('a', 32), '[]')")).rejects.toThrow(/permission denied/);
        await expect(db.query("select public.funil_evento_valido('abriu', 'lance', '', '', false)")).rejects.toThrow(/permission denied/);
        await expect(db.query('select public.funil_contar_gerados()')).rejects.toThrow(/permission denied/);
        await expect(db.query('select public.funil_limpar()')).rejects.toThrow(/permission denied/);
        await expect(db.query('select public.funil_limpar_limite()')).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec('reset role');
      }
    }
  });

  it('a rotina diária está agendada (o esboço do cron não grava a tabela: confere o texto da migração)', () => {
    const sql = readFileSync(join(import.meta.dirname, '..', 'migrations', '20261108000000_funil_x1.sql'), 'utf8');
    expect(sql).toMatch(/cron\.schedule\('funil-diario', '15 6 \* \* \*', 'select public\.funil_rotina_diaria\(\)'\)/);
    expect(sql).toMatch(/cron\.schedule\('funil-limite', '\* \* \* \* \*', 'select public\.funil_limpar_limite\(\)'\)/);
  });
});

describe('funil do X1: npm run metricas', () => {
  it('as seções do funil rodam no SQL de verdade e somam certo', async () => {
    const { secoesDoFunil } = await import('../../scripts/metricas.mjs');
    const x1 = (n: number) => `abcd23${String(n).padStart(2, '0')}`.replace(/[01]/g, 'a');
    // Dois X1 de pênaltis compartilhados; um aberto e aceitado; uma desistência na triagem que voltou e outra não.
    await processar(
      servicos(),
      lote([
        { ev: 'compartilhou', tipo: 'x1_penaltis', meio: 'card', x1: x1(2) },
        { ev: 'compartilhou', tipo: 'x1_penaltis', meio: 'link', x1: x1(2) },
        { ev: 'compartilhou', tipo: 'x1_penaltis', meio: 'grupo', x1: x1(3) },
        { ev: 'abriu', tipo: 'x1_penaltis', x1: x1(2) },
        { ev: 'aceitou', tipo: 'x1_penaltis', x1: x1(2) },
        { ev: 'desistiu', tipo: 'triagem', x1: x1(2) },
        { ev: 'voltou', tipo: 'triagem', x1: x1(2) },
        { ev: 'desistiu', tipo: 'triagem' },
        { ev: 'compartilhou', tipo: 'resultado', meio: 'emoji', jogo: 'time_do_dia' },
      ], TOKEN_BOM),
      null,
    );
    const [porTipo, porDia, ligado, meios, abriu, desiste] = secoesDoFunil() as [string, string][];
    const linhas = async (s: [string, string]) => (await db.query<Record<string, unknown>>(s[1])).rows;
    const num = (r: Record<string, unknown>, k: string) => Number(r[k]);

    const pen = (await linhas(porTipo)).find((r) => r.tipo === 'x1_penaltis')!;
    expect([num(pen, 'compartilhados'), num(pen, 'abertos'), num(pen, 'aceitos'), num(pen, 'terminados')]).toEqual([3, 1, 1, 0]);
    expect((await linhas(porDia)).some((r) => r.tipo === 'x1_penaltis' && num(r, 'compartilhados') === 3)).toBe(true);

    const lig = (await linhas(ligado)).find((r) => r.tipo === 'x1_penaltis')!;
    expect([num(lig, 'compartilhados'), num(lig, 'abertos'), num(lig, 'aceitos')]).toEqual([2, 1, 1]);

    const m = await linhas(meios);
    expect(m.find((r) => r.tipo === 'x1_penaltis')).toMatchObject({ card: 1, link: 1, grupo: 1, total: 3 });
    expect(m.find((r) => r.tipo === 'resultado')).toMatchObject({ jogo: 'time_do_dia', emoji: 1 });
    expect(await linhas(abriu)).toEqual([{ tipo: 'x1_penaltis', aberturas: 1 }]);

    const d = await linhas(desiste);
    expect(d.find((r) => r.fluxo === 'X1')).toMatchObject({ etapa: 'triagem', saiu: 1, voltou: 1, desistiu: 0 });
    expect(d.find((r) => r.fluxo === '')).toMatchObject({ etapa: 'triagem', saiu: 1, voltou: 0, desistiu: 1 });
  });
});
