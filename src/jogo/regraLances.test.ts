import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANCES } from '../dados/lances.ts';
import { calibrar, resolverLance, TABELA_LANCES_ANTES, TABELA_LANCES_UNIFICADA, type CenaLance, type Lance } from './lances.ts';
import { cenasComFaixa, ehLanceRepetido, fecharPartidaLances, LanceForaDeOrdem, tentativasDoLance } from './lancesPartida.ts';
import { PONTOS, PONTOS_UNIFICADOS, simularPartida, totalizar, type GestoCobranca, type TabelaPenaltis } from './penaltis.ts';
import {
  desafioNaFaixa,
  DIA_DO_CORTE,
  ehUnificada,
  faixaCorrigida,
  faixaDaPartida,
  itemPenaltis,
  LANCES_UNIFICADOS_DESDE,
  disputaDaPartida,
  lanceDoDia,
  medalhaDaDisputa,
  periodoNoCorte,
  tabelaLancesDaPartida,
  tabelaPenaltisDaPartida,
} from './regraLances.ts';

// O corte mora na migração mais nova que o redefine (20261105300000 antecipou para 09/11); as medalhas, na de 14.7.
const MIGRACAO = readFileSync(new URL('../../supabase/migrations/20261105300000_lances_sem_livre.sql', import.meta.url), 'utf8');
const MIGRACAO_MEDALHAS = readFileSync(new URL('../../supabase/migrations/20261105100000_lances_unificados.sql', import.meta.url), 'utf8');

describe('data de corte', () => {
  it('é segunda 09/11/2026, 0h de Brasília, igual no banco', () => {
    expect(LANCES_UNIFICADOS_DESDE.toISOString()).toBe('2026-11-09T03:00:00.000Z');
    expect(new Date(`${DIA_DO_CORTE}T12:00:00Z`).getUTCDay()).toBe(1);
    expect(MIGRACAO).toContain(`timestamptz '2026-11-09 00:00:00-03'`);
    expect(MIGRACAO).toContain(`date '${DIA_DO_CORTE}'`);
  });

  it('a regra sai da hora de criação', () => {
    expect(ehUnificada('2026-11-09T02:59:59.999Z')).toBe(false);
    expect(ehUnificada('2026-11-09T03:00:00.000Z')).toBe(true);
    expect(tabelaPenaltisDaPartida('2026-11-08T23:00:00-03:00')).toBe(PONTOS);
    expect(tabelaPenaltisDaPartida('2026-11-09T00:00:01-03:00')).toBe(PONTOS_UNIFICADOS);
    expect(tabelaLancesDaPartida('2026-11-03T12:00:00Z')).toBe(TABELA_LANCES_ANTES);
    expect(tabelaLancesDaPartida('2026-12-01T12:00:00Z')).toBe(TABELA_LANCES_UNIFICADA);
  });

  it('partida criada antes do corte e fechada depois das 00h05 conta no dia em que começou', () => {
    const domingo = { dia: '2026-11-08', semana: '2026-11-02' };
    const segunda = { dia: '2026-11-09', semana: '2026-11-09' };
    expect(periodoNoCorte('2026-11-08T23:58:00-03:00', segunda)).toEqual(domingo);
    expect(periodoNoCorte('2026-11-08T23:58:00-03:00', domingo)).toEqual(domingo);
    expect(periodoNoCorte('2026-11-09T00:01:00-03:00', segunda)).toEqual(segunda);
    expect(periodoNoCorte('2026-11-13T10:00:00-03:00', { dia: '2026-11-13', semana: '2026-11-09' })).toEqual({ dia: '2026-11-13', semana: '2026-11-09' });
  });
});

describe('pênaltis: tabela "mais baixa"', () => {
  it('7 · +4 · +6 · 7 · +15 · +10, com guarda de 150', () => {
    expect(PONTOS_UNIFICADOS).toEqual({ gol: 7, angulo: 4, cavadinha: 6, defesa: 7, vitoria: 15, cincoDeCinco: 10, teto: 150 });
    // O maior caminho: 5 cavadinhas + 5 defesas + vitória + os dois 5 de 5 = 136; com morte súbita, 8 cavadinhas + 1 defesa + 1 5 de 5 + vitória = 136.
    const t = PONTOS_UNIFICADOS;
    expect(Math.max(5 * (t.gol + t.cavadinha) + 5 * t.defesa + t.vitoria + 2 * t.cincoDeCinco, 8 * (t.gol + t.cavadinha) + t.defesa + t.cincoDeCinco + t.vitoria)).toBe(136);
  });

  it('a partida de antes não muda; a mesma partida na tabela nova soma pelos valores novos', () => {
    const gestos = { cobrancas: Array(5).fill({ dir: -80, forca: 75, efeito: 0 }), defesas: [0, 1, 2, 3, 4] };
    const antes = simularPartida(12345, gestos, 0.3, 2);
    const nova = simularPartida(12345, gestos, 0.3, 2, undefined, PONTOS_UNIFICADOS);
    // Mesmos lances (a tabela não muda a física).
    expect(nova.cobrancas.map((c) => c.desfecho)).toEqual(antes.cobrancas.map((c) => c.desfecho));
    expect(nova.venceu).toBe(antes.venceu);
    const esperado = (t: TabelaPenaltis, r: typeof antes) =>
      r.golsJogador * t.gol +
      r.cobrancas.filter((c) => c.desfecho === 'gol' && c.angulo).length * t.angulo +
      r.cobrancas.filter((c) => c.desfecho === 'gol' && c.cavadinha).length * t.cavadinha +
      r.defesas.filter((d) => d.desfecho === 'defesa').length * t.defesa +
      (r.venceu ? t.vitoria : 0) +
      ((r.cincoCobrancas ? 1 : 0) + (r.cincoDefesas ? 1 : 0)) * t.cincoDeCinco;
    expect(antes.pontos.total).toBe(esperado(PONTOS, antes));
    expect(nova.pontos.total).toBe(esperado(PONTOS_UNIFICADOS, nova));
    for (const c of nova.cobrancas) if (c.desfecho === 'gol') expect(c.pontos).toBeLessThanOrEqual(PONTOS_UNIFICADOS.gol + PONTOS_UNIFICADOS.cavadinha);
  });

  it('a guarda segura o total no teto da tabela', () => {
    const gestos = { cobrancas: Array(5).fill({ dir: 80, forca: 70, efeito: 0 }), defesas: [0, 0, 0, 0, 0] };
    const r = simularPartida(7, gestos, 0, 0);
    const apertada: TabelaPenaltis = { ...PONTOS, teto: 5 };
    const t = totalizar(r.cobrancas, r.defesas, r.parOuImpar, apertada);
    expect(t.pontos.total).toBe(Math.min(5, r.pontos.total));
  });
});

describe('faltas e cara a cara: 3 tentativas do mesmo lance', () => {
  const lance = LANCES.find((l) => l.tipo === 'falta')!;

  it('tabela B: 24 / 30 / 36 / 42 e +8, teto 150', () => {
    expect(TABELA_LANCES_UNIFICADA).toEqual({ faixa: { facil: 24, media: 30, dificil: 36, craque: 42 }, recriou: 8, teto: 150 });
    expect(3 * (TABELA_LANCES_UNIFICADA.faixa.craque + TABELA_LANCES_UNIFICADA.recriou)).toBe(150);
  });

  it('o gol vale pela faixa gravada na partida e pela tabela da partida', () => {
    const cena: CenaLance = { ...lance, faixa: 'craque' };
    const melhor = calibrar(lance, 4, 50).melhor;
    for (let s = 0; s < 400; s++) {
      const r = resolverLance(s, 0, cena, melhor, TABELA_LANCES_UNIFICADA);
      if (r.desfecho !== 'gol') continue;
      expect(r.pontos).toBe(42 + (r.recriou ? 8 : 0));
      const antes = resolverLance(s, 0, cena, melhor);
      expect(antes.pontos).toBe(34 + (antes.recriou ? 6 : 0));
      return;
    }
    throw new Error('nenhum gol em 400 sementes');
  });

  it('a partida da regra nova repete o lance 3 vezes e grava a faixa', () => {
    const ids = tentativasDoLance(lance.id);
    expect(ids).toEqual([lance.id, lance.id, lance.id]);
    expect(ehLanceRepetido(ids)).toBe(true);
    expect(ehLanceRepetido([lance.id, lance.id, 'outro'])).toBe(false);
    const cenas = cenasComFaixa([lance, lance, lance], ['craque', 'craque', 'craque']);
    expect(cenas.map((c) => c.faixa)).toEqual(['craque', 'craque', 'craque']);
    expect(() => cenasComFaixa([lance, lance, lance], ['craque', 'xx' as never, 'craque'])).toThrow(LanceForaDeOrdem);
    const gesto: GestoCobranca = { dir: 30, forca: 65, efeito: 20 };
    const r = fecharPartidaLances([1, 2, 3], cenas, [gesto, gesto, gesto], TABELA_LANCES_UNIFICADA);
    expect(r.pontos).toBe(r.lances.reduce((s, l) => s + l.pontos, 0));
    expect(r.pontos).toBeLessThanOrEqual(150);
    expect(r.lances.every((l) => l.faixa === 'craque' && l.lanceId === lance.id)).toBe(true);
  });
});

describe('faixa da partida', () => {
  const lance: Pick<Lance, 'faixa' | 'faixaUnificada'> = { faixa: 'facil', faixaUnificada: 'dificil' };

  it('antes do corte, a do catálogo; depois, a recalibrada (senão a do catálogo), ou a corrigida se pagar menos', () => {
    expect(faixaDaPartida(lance, '2026-11-08T12:00:00-03:00', 'craque')).toBe('facil');
    expect(faixaDaPartida(lance, '2026-11-09T12:00:00-03:00', null)).toBe('dificil');
    expect(faixaDaPartida(lance, '2026-11-09T12:00:00-03:00', 'media')).toBe('media');
    expect(faixaDaPartida(lance, '2026-11-09T12:00:00-03:00', 'facil')).toBe('facil');
    expect(faixaDaPartida({ faixa: 'media' }, '2026-11-09T12:00:00-03:00')).toBe('media');
  });

  it('a taxa real nunca sobe a faixa: errar de propósito não leva um lance a Craque', () => {
    expect(faixaDaPartida(lance, '2026-11-09T12:00:00-03:00', 'craque')).toBe('dificil');
    expect(faixaDaPartida(lance, '2026-11-09T12:00:00-03:00', 'dificil')).toBe('dificil');
    expect(faixaDaPartida({ faixa: 'facil' }, '2026-11-09T12:00:00-03:00', 'media')).toBe('facil');
    // Contas que só erram: 8 pessoas, 80 tentativas, nenhum gol. A faixa fica a do catálogo.
    expect(faixaDaPartida(lance, '2026-11-09T12:00:00-03:00', faixaCorrigida(0, 80, 8))).toBe('dificil');
  });

  it('o X1 só vale enquanto a faixa gravada nele não pagar mais que a de agora', () => {
    expect(desafioNaFaixa('dificil', 'dificil')).toBe(true);
    expect(desafioNaFaixa('media', 'dificil')).toBe(true);
    expect(desafioNaFaixa('dificil', 'media')).toBe(false);
    expect(desafioNaFaixa('craque', 'facil')).toBe(false);
  });

  it('corrige a partir de 30 tentativas de pelo menos 8 pessoas, pelas faixas de sempre', () => {
    expect(faixaCorrigida(29, 29, 10)).toBeNull();
    expect(faixaCorrigida(23, 30, 8)).toBe('facil');
    expect(faixaCorrigida(15, 30, 8)).toBe('media');
    expect(faixaCorrigida(9, 30, 8)).toBe('dificil');
    expect(faixaCorrigida(8, 30, 8)).toBe('craque');
    expect(faixaCorrigida(31, 30, 8)).toBeNull();
    // 3 contas errando 10 vezes cada não mudam a faixa.
    expect(faixaCorrigida(0, 30, 3)).toBeNull();
    expect(faixaCorrigida(0, 30, 7)).toBeNull();
  });
});

describe('medalhas dos pênaltis', () => {
  it('10 · 50 · 100 gols; o ouro pede 10 vitórias', () => {
    expect(medalhaDaDisputa(9, 50)).toBeNull();
    expect(medalhaDaDisputa(10, 0)).toBe('bronze');
    expect(medalhaDaDisputa(50, 0)).toBe('prata');
    expect(medalhaDaDisputa(150, 9)).toBe('prata');
    expect(medalhaDaDisputa(100, 10)).toBe('ouro');
    expect(itemPenaltis(null)).toBe('penaltis:livre');
    expect(itemPenaltis('final-2018')).toBe('penaltis:final-2018');
  });

  it('os números batem com o banco (medalha_do_item)', () => {
    expect(MIGRACAO_MEDALHAS).toMatch(/p_gols >= 100 and p_vitorias >= 10 then 'ouro'/);
    expect(MIGRACAO_MEDALHAS).toMatch(/p_gols >= 50 then 'prata'/);
    expect(MIGRACAO_MEDALHAS).toMatch(/p_gols >= 10 then 'bronze'/);
  });
});

describe('disputa da partida de pênaltis (sem Disputa livre desde o corte)', () => {
  const catalogo = new Set(['flamengo-2022-copa-do-brasil', 'selecao-2016-olimpiada']);
  const antes = '2026-11-08T23:59:59-03:00';
  const depois = '2026-11-09T00:00:00-03:00';

  it('antes do corte: id do catálogo vale; sem id ou fora do catálogo vira partida livre', () => {
    expect(disputaDaPartida({ agora: antes, pedida: 'flamengo-2022-copa-do-brasil', catalogo })).toEqual({ disputa: 'flamengo-2022-copa-do-brasil' });
    expect(disputaDaPartida({ agora: antes, pedida: undefined, catalogo })).toEqual({ disputa: null });
    expect(disputaDaPartida({ agora: antes, pedida: 'inventada-2099', catalogo })).toEqual({ disputa: null });
    expect(disputaDaPartida({ agora: antes, pedida: 42, catalogo })).toEqual({ disputa: null });
  });

  it('a partir do corte (09/11, 0h de Brasília): sem disputa do catálogo, 400 disputa_obrigatoria', () => {
    expect(disputaDaPartida({ agora: depois, pedida: 'selecao-2016-olimpiada', catalogo })).toEqual({ disputa: 'selecao-2016-olimpiada' });
    expect(disputaDaPartida({ agora: depois, pedida: undefined, catalogo })).toEqual({ erro: { status: 400, codigo: 'disputa_obrigatoria' } });
    expect(disputaDaPartida({ agora: depois, pedida: 'inventada-2099', catalogo })).toEqual({ erro: { status: 400, codigo: 'disputa_obrigatoria' } });
  });

  it('X1: vale a disputa de quem chamou, seja qual for a pedida; sem ela, depois do corte, o X1 expira', () => {
    const desafio = { disputaId: 'flamengo-2022-copa-do-brasil' };
    expect(disputaDaPartida({ agora: depois, pedida: 'selecao-2016-olimpiada', catalogo, desafio })).toEqual({ disputa: 'flamengo-2022-copa-do-brasil' });
    expect(disputaDaPartida({ agora: antes, pedida: undefined, catalogo, desafio: { disputaId: null } })).toEqual({ disputa: null });
    expect(disputaDaPartida({ agora: depois, pedida: 'selecao-2016-olimpiada', catalogo, desafio: { disputaId: null } })).toEqual({
      erro: { status: 410, codigo: 'desafio_expirado' },
    });
  });
});

describe('Lance do Dia', () => {
  const ids = LANCES.map((l) => l.id);

  it('é o mesmo para todos no mesmo dia e não depende da ordem do catálogo', () => {
    const a = lanceDoDia('2026-11-09', ids);
    expect(a).not.toBeNull();
    expect(ids).toContain(a);
    expect(lanceDoDia('2026-11-09', [...ids].reverse())).toBe(a);
    expect(lanceDoDia('09/11/2026', ids)).toBeNull();
    expect(lanceDoDia('2026-11-09', [])).toBeNull();
  });

  it('muda ao longo do mês', () => {
    const doMes = new Set(Array.from({ length: 30 }, (_, k) => lanceDoDia(`2026-11-${String(k + 1).padStart(2, '0')}`, ids)));
    expect(doMes.size).toBeGreaterThan(15);
  });
});
