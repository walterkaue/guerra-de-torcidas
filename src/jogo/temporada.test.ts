import { describe, expect, it } from 'vitest';
import {
  fraseDoMeuTime,
  mensagemSemSemana,
  mesSeguinte,
  nomeDoMes,
  ordenarLinhas,
  primeiraTrava,
  segundasDoMes,
  seloDoDestino,
  semSemanaFechada,
  textoContagem,
  textoDivisor,
  textoDoSelo,
  textoExplica,
  zonaDaLinha,
  type LinhaTemporada,
  type Serie,
  type Temporada,
} from './temporada';

const NOV = '2026-11-01';
const pal = { nome: 'Palmeiras', artigo: 'o' as const };
const cha = { nome: 'Chapecoense', artigo: 'a' as const };

function linha(id: string, serie: Serie, posicao: number, pts: number, extra: Partial<LinhaTemporada> = {}): LinhaTemporada {
  return { time_id: id, serie, posicao, pontos: pts, vitorias: 0, ultima_posicao: posicao, posicao_final: null, destino: null, ...extra };
}
/** Série com `n` times: pontos caem de 50 em 50 - 3 * i por padrão. */
function serie(s: Serie, n: number, pts: (i: number) => number = (i) => 50 - 3 * i): LinhaTemporada[] {
  return Array.from({ length: n }, (_, i) => linha(`t${i + 1}`, s, i + 1, pts(i)));
}
const frase = (daSerie: LinhaTemporada[], posicao: number, time = pal, mes = NOV, fechada = false) =>
  fraseDoMeuTime({ time, outro: false, linha: daSerie[posicao - 1], daSerie, mes, fechada });

describe('meses e semanas', () => {
  it('nomes e mês seguinte', () => {
    expect(nomeDoMes(NOV)).toBe('Novembro de 2026');
    expect(mesSeguinte(NOV)).toBe('2026-12-01');
    expect(mesSeguinte('2026-12-01')).toBe('2027-01-01');
  });
  it('segundas de novembro e dezembro de 2026', () => {
    expect(segundasDoMes(NOV)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    expect(segundasDoMes('2026-12-01')).toEqual(['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28']);
  });
  it('primeira trava: segunda 9/11 às 12h de Brasília', () => {
    expect(primeiraTrava(NOV).toISOString()).toBe('2026-11-09T15:00:00.000Z');
  });
  it('contagem de semanas', () => {
    expect(textoContagem(2, 5)).toBe('2 de 5 semanas fechadas');
    expect(textoContagem(0, 4)).toBe('0 de 4 semanas fechadas');
  });
  it('mensagem sem semana fechada', () => {
    expect(mensagemSemSemana(NOV, new Date('2026-11-03T12:00:00Z'))).toBe(
      'Nenhuma semana fechou ainda. A primeira fecha na segunda, 9/11, às 12h.',
    );
    expect(mensagemSemSemana(NOV, new Date('2026-11-09T16:00:00Z'))).toBe('A primeira semana do mês ainda está fechando.');
  });
});

describe('ordenação', () => {
  const bagunca = [linha('c', 'unica', 3, 10), linha('a', 'unica', 1, 30), linha('b', 'unica', 2, 20)];
  it('em andamento: pela posição do servidor', () => {
    expect(ordenarLinhas(bagunca, { fechado: false, semSemana: false }).map((l) => l.time_id)).toEqual(['a', 'b', 'c']);
  });
  it('sem semana fechada: alfabética pelo nome', () => {
    const nomes: Record<string, string> = { a: 'Zeta', b: 'Ágata', c: 'Bola' };
    const ordem = ordenarLinhas(bagunca, { fechado: false, semSemana: true, nomeDe: (id) => nomes[id] });
    expect(ordem.map((l) => l.time_id)).toEqual(['b', 'c', 'a']);
  });
  it('mês fechado: posição final', () => {
    const f = [linha('a', 'unica', 1, 30, { posicao_final: 2 }), linha('b', 'unica', 2, 20, { posicao_final: 1 })];
    expect(ordenarLinhas(f, { fechado: true, semSemana: false }).map((l) => l.time_id)).toEqual(['b', 'a']);
  });
  it('detecta mês sem semana fechada', () => {
    expect(semSemanaFechada([linha('a', 'unica', 1, 0, { ultima_posicao: null })])).toBe(true);
    expect(semSemanaFechada(serie('unica', 2))).toBe(false);
  });
});

describe('zonas e selos', () => {
  it('zonas', () => {
    expect(zonaDaLinha('a', 8)).toBeNull();
    expect(zonaDaLinha('a', 9)).toBe('queda');
    expect(zonaDaLinha('a', 10)).toBe('queda');
    expect(zonaDaLinha('b', 1)).toBe('acesso');
    expect(zonaDaLinha('b', 2)).toBe('acesso');
    expect(zonaDaLinha('b', 3)).toBeNull();
    expect(zonaDaLinha('unica', 1)).toBeNull();
  });
  it('selos de destino', () => {
    expect(seloDoDestino('a', 'b')).toBe('Caiu');
    expect(seloDoDestino('a', 'a')).toBe('Fica');
    expect(seloDoDestino('b', 'a')).toBe('Subiu');
    expect(seloDoDestino('b', 'b')).toBe('Fica');
    expect(seloDoDestino('unica', 'a')).toBe('Série A');
    expect(seloDoDestino('unica', 'b')).toBe('Série B');
    expect(seloDoDestino('a', null)).toBeNull();
  });
  it('divisor da série única', () => {
    expect(textoDivisor(NOV)).toBe('Daqui pra cima, Série A em dezembro');
  });
});

describe('frase do meu time', () => {
  it('nenhuma semana fechada', () => {
    const zero = serie('unica', 20).map((l) => ({ ...l, ultima_posicao: null }));
    expect(frase(zero, 1)).toBe('O Palmeiras está na série única de novembro.');
    const b = serie('b', 10).map((l) => ({ ...l, ultima_posicao: null }));
    expect(frase(b, 3, cha, '2026-12-01')).toBe('A Chapecoense está na Série B de dezembro.');
  });
  it('líder, com plural e singular', () => {
    expect(frase(serie('a', 10), 1)).toBe('O Palmeiras lidera a Série A, 3 pontos à frente do 2º.');
    expect(frase(serie('a', 10, (i) => 50 - i), 1)).toBe('O Palmeiras lidera a Série A, 1 ponto à frente do 2º.');
  });
  it('empate no topo', () => {
    expect(frase(serie('a', 10, () => 40), 1)).toBe('O Palmeiras lidera a Série A no desempate.');
  });
  it('líder da B fica na zona de acesso', () => {
    expect(frase(serie('b', 10), 1)).toBe('O Palmeiras lidera a Série B, 3 pontos à frente do 2º, na zona de acesso.');
  });
  it('meio da tabela', () => {
    const a = serie('a', 10, (i) => 50 - (i === 2 ? 4 : i * 2));
    expect(frase(a, 3)).toBe('O Palmeiras está em 3º na Série A, 4 pontos atrás do líder.');
  });
  it('zona de queda', () => {
    const a = serie('a', 10, (i) => (i < 8 ? 50 - i : i === 8 ? 40 : 30));
    expect(a[7].pontos).toBe(43);
    expect(frase(a, 9)).toBe('O Palmeiras está em 9º na Série A, na zona de queda, 3 pontos atrás do 8º.');
  });
  it('empate com a referência, sem flexão de gênero', () => {
    const a = serie('a', 10, (i) => (i < 8 ? 50 - i : 43));
    expect(frase(a, 9, cha)).toBe('A Chapecoense está em 9º na Série A, na zona de queda, com os mesmos pontos do 8º.');
    expect(frase(serie('a', 10, (i) => (i === 0 || i === 2 ? 40 : 45 - i)), 3)).toBe(
      'O Palmeiras está em 3º na Série A, com os mesmos pontos do líder.',
    );
  });
  it('zona de acesso', () => {
    expect(frase(serie('b', 10), 2, cha)).toBe('A Chapecoense está em 2º na Série B, na zona de acesso.');
  });
  it('série única: acima e abaixo do 10º', () => {
    const u = serie('unica', 20, (i) => 60 - i * 2);
    expect(frase(u, 7)).toBe('O Palmeiras está em 7º: por enquanto vai pra Série A em dezembro.');
    expect(frase(u, 10)).toBe('O Palmeiras está em 10º: por enquanto vai pra Série A em dezembro.');
    const u2 = serie('unica', 20, (i) => (i < 10 ? 60 - i : 40 - (i - 10) * 5));
    expect(u2[9].pontos).toBe(51);
    expect(u2[11].pontos).toBe(35);
    expect(frase(u2, 12)).toBe('O Palmeiras está em 12º, 16 pontos atrás do 10º, a última vaga da Série A.');
    const u3 = serie('unica', 20, (i) => (i < 10 ? 60 - i : i === 11 ? 50 : 10));
    expect(frase(u3, 12)).toBe('O Palmeiras está em 12º, 1 ponto atrás do 10º, a última vaga da Série A.');
  });
  it('mês fechado', () => {
    const fim = (s: Serie, pf: number, d: 'a' | 'b') => [linha('t1', s, 1, 10, { posicao_final: pf, destino: d })];
    const f = (l: LinhaTemporada[]) => fraseDoMeuTime({ time: pal, outro: false, linha: l[0], daSerie: l, mes: NOV, fechada: true });
    expect(f(fim('a', 3, 'a'))).toBe('O Palmeiras terminou em 3º e fica na Série A.');
    expect(f(fim('a', 9, 'b'))).toBe('O Palmeiras terminou em 9º e caiu pra Série B.');
    expect(f(fim('b', 1, 'a'))).toBe('O Palmeiras terminou em 1º e subiu pra Série A.');
    expect(f(fim('b', 6, 'b'))).toBe('O Palmeiras terminou em 6º e fica na Série B.');
    expect(f(fim('unica', 4, 'a'))).toBe('O Palmeiras terminou em 4º e vai pra Série A.');
    expect(f(fim('unica', 14, 'b'))).toBe('O Palmeiras terminou em 14º e vai pra Série B.');
  });
  it('Outro time e sem time', () => {
    const base = { time: null, linha: undefined, daSerie: [], mes: NOV, fechada: false };
    expect(fraseDoMeuTime({ ...base, outro: true })).toBe('Quem joga por Outro time fica fora das divisões.');
    expect(fraseDoMeuTime({ ...base, outro: false })).toBeNull();
  });
});

describe('selo e explicação', () => {
  const t = (extra: Partial<Temporada> = {}): Temporada => ({ mes: NOV, pre_temporada: false, fechada_em: null, campeao_estreia_id: null, ...extra });
  it('pré-temporada: aviso e sem troféu', () => {
    const s = textoDoSelo(t({ pre_temporada: true }), 'unica', null);
    expect(s.cabecalho).toBe('Novembro de 2026 · Série única');
    expect(s.pre).toContain('Pré-temporada');
    expect(s.pre).toContain('Teste das divisões: sem troféu.');
    expect(s.trofeu).toBeNull();
  });
  it('troféu fora da pré-temporada', () => {
    expect(textoDoSelo(t(), 'unica', null).trofeu).toBe('O 1º leva o troféu Campeão da estreia.');
    const ab = textoDoSelo(t({ mes: '2026-12-01' }), 'ab', null);
    expect(ab.cabecalho).toBe('Dezembro de 2026 · Séries A e B');
    expect(ab.trofeu).toBe('O campeão da Série A é o campeão da temporada.');
  });
  it('mês fechado com campeão da estreia', () => {
    expect(textoDoSelo(t({ fechada_em: 'x', campeao_estreia_id: 'cha' }), 'unica', cha).trofeu).toBe('Campeão da estreia: a Chapecoense.');
  });
  it('explica', () => {
    expect(textoExplica('unica')).toContain('entre os 20: 25, 20, 17, 15, 14');
    expect(textoExplica('ab')).toContain('na série: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1');
  });
});
