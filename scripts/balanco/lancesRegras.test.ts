import { describe, expect, it } from 'vitest';
import { lerRegraArg, montarBalanco } from './balanco.mjs';
import {
  TETO_LANCES_ANTES,
  TETO_PENALTIS_ANTES,
  TETO_UNIFICADO,
  classificarPartida,
  pesoNaSemanaPorRegra,
  regraDaPartida,
  tipoDoLance,
  unidadesLances,
} from './estatisticas.mjs';

const FALTA = 'flamengo-2001-falta-do-tri';
const CARA = 'flamengo-1981-toquio';
const ANTES = '2026-11-07T20:00:00Z';
const DEPOIS = '2026-11-08T03:00:00Z';

type P = { minigame: string; pessoa: string; pontos: number; criada: string; lanceId?: string };
const lote = (n: number, base: Omit<P, 'pessoa' | 'pontos'>, pontos = 60): P[] =>
  Array.from({ length: n }, (_, i) => ({ ...base, pessoa: `p${i % 7}`, pontos: pontos + (i % 3) }));
const dados = (partidas: P[], semana: object[] = []) => ({ partidas, dias: [], palpites: [], semana });
const valor = (csv: { item: string; metrica: string; valor: unknown }[], item: string, metrica: string) =>
  csv.find((l) => l.item === item && l.metrica === metrica)?.valor;

describe('regra e tipo da partida', () => {
  it('a regra sai da criada_em, com o corte às 3h UTC de 08/11', () => {
    expect(regraDaPartida('2026-11-08T02:59:59Z')).toBe('antes');
    expect(regraDaPartida(DEPOIS)).toBe('nova');
    expect(regraDaPartida(undefined)).toBe('antes');
  });

  it('o tipo vem do catálogo pelo lanceId; fora do catálogo é desconhecido', () => {
    expect(tipoDoLance(FALTA)).toBe('falta');
    expect(tipoDoLance(CARA)).toBe('cara_a_cara');
    expect(tipoDoLance('nao-existe')).toBe('desconhecido');
    expect(classificarPartida({ minigame: 'lances', lanceId: CARA, criada: DEPOIS })).toMatchObject({ regra: 'nova', tipo: 'cara_a_cara' });
    expect(classificarPartida({ minigame: 'penaltis', criada: ANTES })).toMatchObject({ regra: 'antes', tipo: 'penaltis' });
  });
});

describe('linhas por regra', () => {
  it('tetos: antes = pênaltis 150 e Lances 120; depois = 150 nos três tipos e no grupo', () => {
    expect([TETO_PENALTIS_ANTES, TETO_LANCES_ANTES, TETO_UNIFICADO]).toEqual([150, 120, 150]);
    const antes = Object.fromEntries(unidadesLances('antes').map((u) => [u.base, u.teto]));
    expect(antes).toEqual({ lances: 120, penaltis: 150, faltas: 120, cara_a_cara: 120 });
    const nova = Object.fromEntries(unidadesLances('nova').map((u) => [u.base, u.teto]));
    expect(nova).toEqual({ lances: 150, penaltis: 150, faltas: 150, cara_a_cara: 150 });
  });
});

describe('montarBalanco com as duas regras', () => {
  const partidas = [
    ...lote(20, { minigame: 'penaltis', criada: ANTES }, 50),
    ...lote(20, { minigame: 'lances', criada: ANTES, lanceId: FALTA }, 30),
    ...lote(20, { minigame: 'lances', criada: ANTES, lanceId: CARA }, 70),
    ...lote(20, { minigame: 'penaltis', criada: DEPOIS }, 100),
    ...lote(20, { minigame: 'lances', criada: DEPOIS, lanceId: FALTA }, 20),
    ...lote(20, { minigame: 'lances', criada: DEPOIS, lanceId: CARA }, 148),
  ];

  it('não mistura regras: cada linha só tem partidas da sua regra', () => {
    const { csv } = montarBalanco(dados(partidas));
    expect(valor(csv, 'penaltis_antes', 'quantidade')).toBe(20);
    expect(valor(csv, 'penaltis_nova', 'quantidade')).toBe(20);
    expect(valor(csv, 'penaltis_antes', 'mediana')).toBeLessThan(55);
    expect(valor(csv, 'penaltis_nova', 'mediana')).toBeGreaterThan(95);
    // Lances antes = faltas + cara a cara (40); nova = os três tipos (60).
    expect(valor(csv, 'lances_antes', 'quantidade')).toBe(40);
    expect(valor(csv, 'lances_nova', 'quantidade')).toBe(60);
    expect(valor(csv, 'faltas_antes', 'quantidade')).toBe(20);
    expect(valor(csv, 'cara_a_cara_nova', 'quantidade')).toBe(20);
  });

  it('teto por regra e alerta de faixa', () => {
    const { csv, texto } = montarBalanco(dados(partidas));
    expect(valor(csv, 'lances_antes', 'teto')).toBe(120);
    expect(valor(csv, 'penaltis_antes', 'teto')).toBe(150);
    expect(valor(csv, 'lances_nova', 'teto')).toBe(150);
    expect(valor(csv, 'cara_a_cara_nova', 'teto')).toBe(150);
    expect(valor(csv, 'cara_a_cara_nova', 'no_teto')).toBe(6); // 148 + (0..2): os de 150 batem o teto de 150
    expect(csv).toContainEqual({ secao: 'pontos', item: 'faltas_nova', metrica: 'alerta', valor: 'mediana fora de 45–75' });
    expect(texto).toContain('Lances (pênaltis + faltas + cara a cara) [a partir de 08/11]');
    expect(texto).toContain('Cara a cara [antes de 08/11]');
  });

  it('o id antigo (penaltis, lances) fica com a regra mais recente', () => {
    const { csv } = montarBalanco(dados(partidas));
    expect(valor(csv, 'penaltis', 'regra')).toBe('nova');
    expect(valor(csv, 'lances', 'quantidade')).toBe(60);
    const so = montarBalanco(dados(partidas.filter((p) => p.criada === ANTES)));
    expect(valor(so.csv, 'lances', 'quantidade')).toBe(40);
    expect(valor(so.csv, 'penaltis', 'regra')).toBe('antes');
  });

  it('--regra mostra só uma das regras', () => {
    const nova = montarBalanco(dados(partidas), { regra: 'nova' });
    expect(valor(nova.csv, 'penaltis_antes', 'quantidade')).toBeUndefined();
    expect(valor(nova.csv, 'penaltis_nova', 'quantidade')).toBe(20);
    const antes = montarBalanco(dados(partidas), { regra: 'antes' });
    expect(valor(antes.csv, 'lances_nova', 'quantidade')).toBeUndefined();
    expect(valor(antes.csv, 'lances_antes', 'quantidade')).toBe(40);
  });

  it('lance fora do catálogo ganha linha própria, só se existir', () => {
    const extra = lote(3, { minigame: 'lances', criada: DEPOIS, lanceId: 'sumiu' });
    expect(montarBalanco(dados([...partidas, ...extra])).csv.some((l) => l.item === 'desconhecido_nova')).toBe(true);
    expect(montarBalanco(dados(partidas)).csv.some((l) => l.item === 'desconhecido_nova')).toBe(false);
    // E o grupo Lances da regra nova conta as três.
    expect(valor(montarBalanco(dados([...partidas, ...extra])).csv, 'lances_nova', 'quantidade')).toBe(63);
  });

  it('--regra lê a opção da linha de comando', () => {
    expect(lerRegraArg(['node', 'x'])).toBeNull();
    expect(lerRegraArg(['node', 'x', '--regra', 'nova'])).toBe('nova');
    expect(lerRegraArg(['node', 'x', '--regra=antes'])).toBe('antes');
    expect(() => lerRegraArg(['node', 'x', '--regra', 'zzz'])).toThrow();
  });
});

describe('peso na semana', () => {
  const semana = [
    { semana: '2026-11-02', pessoa: 'a', minigame: 'penaltis', pontos: 100 },
    { semana: '2026-11-02', pessoa: 'a', minigame: 'lances', pontos: 50 },
    { semana: '2026-11-09', pessoa: 'a', minigame: 'penaltis', pontos: 100 },
    { semana: '2026-11-09', pessoa: 'a', minigame: 'lances', pontos: 50 },
    { semana: '2026-11-09', pessoa: 'a', minigame: 'prova', pontos: 50 },
  ];

  it('a partir do corte, penaltis e lances viram "Lances"; antes ficam separados', () => {
    const r = pesoNaSemanaPorRegra(semana);
    expect(r.map((x) => x.regra)).toEqual(['antes', 'nova']);
    const pontos = (regra: string) => Object.fromEntries(r.find((x) => x.regra === regra)!.peso.map((p) => [p.minigame, p.pontos]));
    expect(pontos('antes')).toMatchObject({ penaltis: 100, lances: 50 });
    expect(pontos('nova')).toEqual({ lances: 150, prova: 50, dia: 0, crava: 0 });
  });

  it('montarBalanco grava o peso por regra e filtra com --regra', () => {
    const { csv } = montarBalanco(dados([], semana));
    expect(valor(csv, 'lances_nova', 'pontos')).toBe(150);
    expect(valor(csv, 'penaltis_antes', 'pontos')).toBe(100);
    expect(valor(csv, 'lances', 'pontos')).toBe(150); // id antigo = regra mais recente
    const so = montarBalanco(dados([], semana), { regra: 'antes' });
    expect(so.csv.some((l) => l.item === 'lances_nova' && l.secao === 'peso_semana')).toBe(false);
  });
});
