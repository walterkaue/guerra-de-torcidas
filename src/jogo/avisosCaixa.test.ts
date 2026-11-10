import { describe, expect, it } from 'vitest';
import {
  arrumar,
  avisosDaCaixa,
  CAIXA_VAZIA,
  dispensar,
  idDaPeca,
  idDoDesafio,
  idDoMes,
  idDoTermos,
  idDoTrofeu,
  lerEstado,
  marcarVistos,
  numeroDoSininho,
  registrar,
  resolver,
  rotuloDoSininho,
  TEXTOS,
  TIPOS,
  type EntradaDaCaixa,
  type EstadoDosAvisos,
} from './avisosCaixa';

const HOJE = '2026-11-09';
const base: EntradaDaCaixa = { hoje: HOJE, termos: { atual: 'v2', vista: 'v2' } };
const tipos = (c: { novos: { tipo: string }[]; vistos: { tipo: string }[] }) => ({ novos: c.novos.map((a) => a.tipo), vistos: c.vistos.map((a) => a.tipo) });
const maisDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe('sininho', () => {
  it('rótulo e número só com novos', () => {
    expect(rotuloDoSininho(0)).toBe('Avisos');
    expect(rotuloDoSininho(1)).toBe('Avisos, 1 novo');
    expect(rotuloDoSininho(3)).toBe('Avisos, 3 novos');
    expect(numeroDoSininho(0)).toBeNull();
    expect(numeroDoSininho(4)).toBe('4');
    expect(numeroDoSininho(12)).toBe('9+');
  });
});

describe('avisos por estado', () => {
  it('caixa vazia sem nada de pé', () => {
    expect(tipos(avisosDaCaixa({}, base))).toEqual({ novos: [], vistos: [] });
  });

  it('cidade: só quando a Home sabe que falta (já jogou, sem cidade, sessão válida)', () => {
    expect(tipos(avisosDaCaixa({}, { ...base, semCidade: true })).novos).toEqual(['cidade']);
    expect(tipos(avisosDaCaixa({}, { ...base, semCidade: false })).novos).toEqual([]);
    expect(tipos(avisosDaCaixa({}, { ...base, semCidade: undefined })).novos).toEqual([]);
  });

  it('cidade dispensada volta depois de uma semana, como nova', () => {
    const entrada = { ...base, semCidade: true };
    let e = marcarVistos({}, avisosDaCaixa({}, entrada).novos, HOJE);
    e = dispensar(e, avisosDaCaixa(e, entrada).vistos[0], HOJE);
    expect(tipos(avisosDaCaixa(e, entrada))).toEqual({ novos: [], vistos: [] });
    expect(tipos(avisosDaCaixa(e, { ...entrada, hoje: maisDias(HOJE, 6) }))).toEqual({ novos: [], vistos: [] });
    expect(tipos(avisosDaCaixa(e, { ...entrada, hoje: maisDias(HOJE, 7) }))).toEqual({ novos: ['cidade'], vistos: [] });
  });

  it('aquecimento: o card de quem veio por desafio, até abrir ou dispensar', () => {
    expect(tipos(avisosDaCaixa({}, { ...base, aquecimento: { cardNaHome: true } })).novos).toEqual(['aquecimento']);
    expect(tipos(avisosDaCaixa({}, { ...base, aquecimento: { cardNaHome: true, visto: true } })).novos).toEqual([]);
    expect(tipos(avisosDaCaixa({}, { ...base, aquecimento: { visto: false } })).novos).toEqual([]);
    const a = avisosDaCaixa({}, { ...base, aquecimento: { cardNaHome: true } }).novos[0];
    const e = dispensar({}, a, HOJE);
    expect(tipos(avisosDaCaixa(e, { ...base, hoje: maisDias(HOJE, 60), aquecimento: { cardNaHome: true } })).novos).toEqual([]);
  });
});

describe('avisos por registro', () => {
  it('Termos: entra depois que a vaga mostrou, sai ao abrir #termos', () => {
    const entrada = { ...base, termos: { atual: 'v2', vista: 'v1' } };
    expect(avisosDaCaixa({}, entrada).novos).toEqual([]); // a vaga ainda não mostrou
    const e = registrar({}, [idDoTermos('v2')], HOJE);
    expect(tipos(avisosDaCaixa(e, entrada)).novos).toEqual(['termos']);
    const lido = { ...entrada, termos: { atual: 'v2', vista: 'v2' } };
    expect(avisosDaCaixa(e, lido).novos).toEqual([]);
    expect(arrumar(e, lido).datas).toEqual({});
  });

  it('Termos de uma versão antiga não aparecem', () => {
    const e = registrar({}, [idDoTermos('v1')], HOJE);
    expect(avisosDaCaixa(e, { ...base, termos: { atual: 'v2', vista: 'v0' } }).novos).toEqual([]);
  });

  it('troféus e peças juntam vários ids num aviso só', () => {
    let e = registrar({}, [idDoTrofeu('campeao_semana|2026-W45||flamengo'), idDoTrofeu('maior_torcida|2026-W45||flamengo')], HOJE);
    e = registrar(e, [idDaPeca('apito'), idDaPeca('pose_bracos')], HOJE);
    const c = avisosDaCaixa(e, base);
    expect(tipos(c).novos).toEqual(['trofeu', 'peca']);
    expect(c.novos[0].ids).toHaveLength(2);
    expect(c.novos[1].ids).toHaveLength(2);
  });

  it('peça nova depois de ver a outra deixa o aviso novo de novo', () => {
    let e = registrar({}, [idDaPeca('apito')], HOJE);
    e = marcarVistos(e, avisosDaCaixa(e, base).novos, HOJE);
    expect(tipos(avisosDaCaixa(e, base))).toEqual({ novos: [], vistos: ['peca'] });
    e = registrar(e, [idDaPeca('fundo_tunel')], HOJE);
    expect(tipos(avisosDaCaixa(e, base))).toEqual({ novos: ['peca'], vistos: [] });
  });

  it('resolver por prefixo tira todas as peças (abriu o vestiário)', () => {
    let e = registrar({}, [idDaPeca('apito'), idDaPeca('pose_bracos'), idDoTrofeu('x')], HOJE);
    e = resolver(e, ['peca:']);
    expect(tipos(avisosDaCaixa(e, base)).novos).toEqual(['trofeu']);
  });

  it('placa do mês: um aviso só, com o mês mais recente', () => {
    const e = registrar({}, [idDoMes('2026-10-01'), idDoMes('2026-09')], HOJE);
    const c = avisosDaCaixa(e, base);
    expect(tipos(c).novos).toEqual(['mes']);
    expect(c.novos[0].mes).toBe('2026-10');
  });

  it('desafio: um por código, com o destino, e some depois de 7 dias da abertura', () => {
    const e = registrar({}, [idDoDesafio('lances', 'abc123'), idDoDesafio('penaltis', 'xyz')], HOJE);
    const c = avisosDaCaixa(e, base);
    expect(c.novos.map((a) => a.desafio)).toEqual([
      { tipo: 'lances', codigo: 'abc123' },
      { tipo: 'penaltis', codigo: 'xyz' },
    ]);
    expect(avisosDaCaixa(e, { ...base, hoje: maisDias(HOJE, 6) }).novos).toHaveLength(2);
    expect(avisosDaCaixa(e, { ...base, hoje: maisDias(HOJE, 7) }).novos).toHaveLength(0);
    expect(arrumar(e, { ...base, hoje: maisDias(HOJE, 7) }).datas).toEqual({});
  });

  it('registrar de novo guarda o primeiro dia; dispensado não volta', () => {
    let e = registrar({}, [idDoDesafio('prova', 'p1')], HOJE);
    e = registrar(e, [idDoDesafio('prova', 'p1')], maisDias(HOJE, 3));
    expect(e.datas).toEqual({ 'desafio:prova:p1': HOJE });
    e = dispensar(e, avisosDaCaixa(e, base).novos[0], HOJE);
    e = registrar(e, [idDoDesafio('prova', 'p1')], maisDias(HOJE, 1));
    expect(avisosDaCaixa(e, base).novos).toEqual([]);
  });

  it('ids inválidos não entram (o aparelho guarda só ids limpos)', () => {
    const e = registrar({}, ['desafio:outro:abc', 'desafio:prova:<b>', 'peca:', 'mes:outubro', 'qualquer:coisa', 'trofeu:a b'], HOJE);
    expect(e).toEqual({});
  });
});

describe('ordem e vistos', () => {
  it('novos em cima, já vistos embaixo, cada grupo na ordem dos tipos', () => {
    let e = registrar({}, [idDaPeca('apito'), idDoDesafio('lances', 'a1')], HOJE);
    e = marcarVistos(e, avisosDaCaixa(e, base).novos, HOJE);
    e = registrar(e, [idDoTrofeu('t1')], HOJE);
    expect(tipos(avisosDaCaixa(e, { ...base, semCidade: true }))).toEqual({ novos: ['trofeu', 'cidade'], vistos: ['desafio', 'peca'] });
  });

  it('a ordem dos tipos cobre todos os textos', () => {
    expect(Object.keys(TEXTOS).sort()).toEqual([...TIPOS].sort());
  });
});

describe('estado no aparelho', () => {
  it('lerEstado descarta lixo', () => {
    expect(lerEstado(null)).toEqual({ vistos: {}, dispensados: {}, datas: {} });
    expect(lerEstado({ vistos: { cidade: HOJE, x: HOJE, peca: 'ontem' }, datas: [1], dispensados: 'a' })).toEqual({
      vistos: { cidade: HOJE },
      dispensados: {},
      datas: {},
    });
  });

  it('arrumar devolve o mesmo objeto quando nada muda', () => {
    const e: EstadoDosAvisos = registrar({}, [idDaPeca('apito')], HOJE);
    expect(arrumar(e, base)).toBe(e);
  });

  it('arrumar esquece dispensas velhas de avisos por registro e guarda a da cidade', () => {
    const e: EstadoDosAvisos = { dispensados: { 'peca:apito': '2026-01-01', cidade: '2026-01-01' } };
    expect(arrumar(e, base).dispensados).toEqual({ cidade: '2026-01-01' });
  });

  it('o aparelho cresce até um teto', () => {
    let e: EstadoDosAvisos = {};
    for (let i = 0; i < 100; i++) e = registrar(e, [idDaPeca(`p${i}`)], maisDias(HOJE, i));
    expect(Object.keys(e.datas ?? {}).length).toBeLessThanOrEqual(40);
    expect(e.datas?.['peca:p99']).toBeDefined();
  });
});

describe('tom (jogo.md, seção 7)', () => {
  const todos = [...Object.values(TEXTOS).flatMap((t) => [t.titulo, t.linha, t.acao]), CAIXA_VAZIA.titulo, CAIXA_VAZIA.linha].join(' | ');
  it('sem urgência, prazo, contagem ou "não perca"', () => {
    expect(todos).not.toMatch(/corr[ea]|n[aã]o perca|[uú]ltima chance|s[oó] hoje|expira|acaba|termina|prazo|\d+\s*(dias?|h|horas?)\b|aviso de domingo/i);
  });
  it('botões de 1 a 3 palavras', () => {
    for (const t of Object.values(TEXTOS)) expect(t.acao.split(/\s+/).length).toBeLessThanOrEqual(3);
  });
});
