// Resto das divisões (docs/jogo.md seção 5, "Telas do resto das divisões"): bloco da Home, projeção da semana,
// destino do fim do mês, placa, card e frases do narrador (docs/narrador.md seção 16).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID_OUTRO, TIMES } from '../dados/times';
import { EVENTO_DO_DESTINO, FRASES_DA_TEMPORADA, eventoDoFim, fraseDaTemporada, preencherFraseDaTemporada } from '../narrador/temporada';
import { chaveDoTrofeu } from './galeria';
import {
  DIAS_DA_PLACA_DO_MES,
  SELO_DO_DESTINO,
  TITULO_DO_DESTINO,
  blocoDasDivisoes,
  caiuNoMes,
  destinoDoMes,
  emblemaDoDestino,
  fatiaDaTabela,
  linhaDaProjecao,
  linhaDoFim,
  mesParaAnunciar,
  pontosDeCampeonato,
  projetarSemana,
  semanaNaSerie,
  temFesta,
  textoDeMandarTemporada,
  topoDaPlaca,
  topoDoCardDoMes,
  trofeusDoMes,
  type DestinoDoMes,
  type LinhaDaSemanaAoVivo,
  type LinhaTemporada,
  type Serie,
  type Temporada,
} from './temporada';

const DEZ = '2026-12-01';
const cru = { nome: 'Cruzeiro', artigo: 'o' as const };
const cha = { nome: 'Chapecoense', artigo: 'a' as const };

function linha(id: string, serie: Serie, posicao: number, pts: number, extra: Partial<LinhaTemporada> = {}): LinhaTemporada {
  return { time_id: id, serie, posicao, pontos: pts, vitorias: 0, ultima_posicao: posicao, posicao_final: null, destino: null, ...extra };
}
/** Série de `n` times t1..tn, já na ordem do mês. */
const serie = (s: Serie, pts: readonly number[], prefixo = 't'): LinhaTemporada[] => pts.map((p, i) => linha(`${prefixo}${i + 1}`, s, i + 1, p));
/** Ranking da semana: a ordem geral dada, todos com gente jogando (menos os de `vazios`). */
const aoVivo = (ordem: readonly string[], vazios: readonly string[] = []): LinhaDaSemanaAoVivo[] =>
  ordem.map((id, i) => ({ time_id: id, posicao_campeao: i + 1, ativos: vazios.includes(id) ? 0 : 3 }));

describe('pontos de campeonato', () => {
  it('iguais à função do banco (public.pontos_campeonato)', () => {
    const sql = readFileSync('supabase/migrations/20261101000000_temporada.sql', 'utf8');
    const arrays = [...sql.matchAll(/array\[([\d, ]+)\]/g)].map((m) => m[1].split(',').map((n) => Number(n.trim())));
    expect(arrays[0]).toEqual([25, 20, 17, 15, 14]);
    expect(arrays[1]).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
    expect(sql).toContain('greatest(19 - p_posicao, 0)');
    expect(Array.from({ length: 20 }, (_, i) => pontosDeCampeonato('unica', i + 1))).toEqual([
      25, 20, 17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0,
    ]);
    expect(Array.from({ length: 11 }, (_, i) => pontosDeCampeonato('a', i + 1))).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0]);
    expect(pontosDeCampeonato('b', 0)).toBe(0);
  });
});

describe('semana ao vivo dentro da série', () => {
  const a = serie('a', [40, 30, 20]);
  it('a posição sai da ordem geral, só entre os da série', () => {
    const s = semanaNaSerie(a, aoVivo(['b1', 't3', 'b2', 't1', 't2']));
    expect(s.get('t3')).toEqual({ posicao: 1, pontos: 25, vitoria: true, ativos: 3 });
    expect(s.get('t1')?.posicao).toBe(2);
    expect(s.get('t2')).toMatchObject({ posicao: 3, pontos: 15 });
  });
  it('ninguém jogando: 0 ponto e nenhuma vitória, mesmo em 1º (docs/jogo.md seção 5)', () => {
    const s = semanaNaSerie(a, aoVivo(['t1', 't2', 't3'], ['t1']));
    expect(s.get('t1')).toEqual({ posicao: 1, pontos: 0, vitoria: false, ativos: 0 });
    expect(s.get('t2')?.pontos).toBe(18);
  });
  it('time fora do ranking fica no fim, sem ninguém jogando', () => {
    const s = semanaNaSerie(a, aoVivo(['t2', 't1']));
    expect(s.get('t3')).toEqual({ posicao: 3, pontos: 0, vitoria: false, ativos: 0 });
  });
});

describe('se a semana fechasse agora', () => {
  // 8º com 4 pts acima da zona; 4º na semana (+12) passa o 7º e o 6º.
  const a = serie('a', [70, 60, 50, 40, 35, 31, 30, 29, 25, 20]);
  const ordemDaSemana = ['t1', 't2', 't3', 't8', 't4', 't5', 't6', 't7', 't9', 't10'];

  it('soma a posição de agora e reordena: 8º → 6º', () => {
    const p = projetarSemana(a, aoVivo(ordemDaSemana), 't8')!;
    expect(p.semana).toMatchObject({ posicao: 4, pontos: 12 });
    expect(p).toMatchObject({ agora: 8, depois: 6, seta: 'sobe' });
    expect(linhaDaProjecao(p, 'a', cru)).toBe('Se a semana fechasse agora: 4º na série esta semana, +12 · subia pro 6º');
  });

  it('desce e fica', () => {
    const desce = projetarSemana(a, aoVivo(['t9', 't10', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']), 't8')!;
    expect(desce.seta).toBe('desce');
    expect(linhaDaProjecao(desce, 'a', cru)).toBe('Se a semana fechasse agora: 10º na série esta semana, +1 · descia pro 10º');
    const fica = projetarSemana(a, aoVivo(['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10']), 't1')!;
    expect(fica).toMatchObject({ agora: 1, depois: 1, seta: null });
    expect(linhaDaProjecao(fica, 'a', cru)).toBe('Se a semana fechasse agora: 1º na série esta semana, +25 · ficava em 1º');
  });

  it('empate nos pontos: mais vitórias de semana, depois a semana de agora', () => {
    // t1 e t2 empatam em 43; t2 ganha a semana (vitória) e passa.
    const dois = [linha('t1', 'a', 1, 25, { vitorias: 1 }), linha('t2', 'a', 2, 18)];
    const p = projetarSemana(dois, aoVivo(['t2', 't1']), 't2')!;
    expect(p).toMatchObject({ agora: 2, depois: 1, seta: 'sobe' });
    // Empate em pontos e vitórias: decide a melhor posição nesta semana (a "última semana" passa a ser esta).
    const iguais = [linha('t1', 'a', 1, 30, { vitorias: 1 }), linha('t2', 'a', 2, 30, { vitorias: 1 })];
    const semNinguem = aoVivo(['t2', 't1'], ['t1', 't2']);
    expect(projetarSemana(iguais, semNinguem, 't2')).toMatchObject({ depois: 1, seta: 'sobe' });
  });

  it('semana sem ninguém jogando: +0, com a frase de ninguém', () => {
    const p = projetarSemana(a, aoVivo(['t9', 't1', 't2', 't3', 't8', 't4', 't5', 't6', 't7', 't10'], ['t8']), 't8')!;
    expect(p.semana.pontos).toBe(0);
    expect(p.seta).toBe('desce');
    expect(linhaDaProjecao(p, 'a', cru)).toBe('Se a semana fechasse agora: ninguém jogou pelo Cruzeiro esta semana, +0 · descia pro 9º');
    expect(linhaDaProjecao(p, 'a', cha)).toContain('ninguém jogou pela Chapecoense');
  });

  it('série única fala "entre os 20"; sem semana travada, sem o rumo', () => {
    const unica = serie('unica', Array(20).fill(0)).map((l) => ({ ...l, ultima_posicao: null }));
    const ids = unica.map((l) => l.time_id);
    const p = projetarSemana(unica, aoVivo([...ids.slice(3), ...ids.slice(0, 3)]), 't4')!;
    expect(p).toMatchObject({ agora: null, depois: 1, seta: null });
    expect(linhaDaProjecao(p, 'unica', cru)).toBe('Se a semana fechasse agora: 1º entre os 20 esta semana, +25');
  });

  it('time fora da série: sem projeção', () => {
    expect(projetarSemana(a, aoVivo(ordemDaSemana), 'outro')).toBeNull();
  });
});

describe('bloco das divisões', () => {
  const agora = new Date('2026-12-16T15:00:00Z');
  const bloco = (daSerie: LinhaTemporada[], pos: number, fechadas = 2) =>
    blocoDasDivisoes({ linha: daSerie[pos - 1], daSerie, mes: DEZ, fechadas, agora });
  const a = serie('a', [70, 60, 50, 40, 35, 31, 30, 29, 25, 20]);
  const b = serie('b', [60, 54, 50, 40, 36, 30, 20, 10, 5, 0]);

  it('meio da Série A: "8º · Na Série A · dezembro · 4 pts acima da zona · 2 de 4 semanas" (dezembro de 2026 tem 4 segundas)', () => {
    expect(bloco(a, 8)).toEqual({
      posicao: '8º',
      serie: 'Na Série A · dezembro',
      situacao: '4 pts acima da zona · 2 de 4 semanas',
      resumo: '8º na Série A · 4 pts acima da zona',
      evento: 'temporada_meio',
      dif: null,
    });
  });
  it('líder, zona de queda, zona de acesso e fora das zonas na B', () => {
    expect(bloco(a, 1).resumo).toBe('1º na Série A · 10 pts à frente');
    expect(bloco(a, 1).evento).toBe('temporada_lider');
    expect(bloco(a, 9)).toMatchObject({ resumo: '9º na Série A · na zona, 4 pts do 8º', evento: 'temporada_queda', dif: '4 pontos' });
    expect(bloco(b, 2)).toMatchObject({ resumo: '2º na Série B · na zona de acesso', evento: 'temporada_acesso' });
    expect(bloco(b, 5)).toMatchObject({ resumo: '5º na Série B · 18 pts do acesso', evento: 'temporada_meio' });
    expect(bloco(b, 1).resumo).toBe('1º na Série B · 6 pts à frente');
  });
  it('empates: sem número zero na frase', () => {
    const empate = serie('a', [30, 30, 20, 20, 20, 20, 20, 10, 10, 9]);
    expect(bloco(empate, 1).resumo).toBe('1º na Série A · na ponta no desempate');
    expect(bloco(empate, 8).resumo).toBe('8º na Série A · acima da zona no desempate');
    expect(bloco(empate, 9)).toMatchObject({ resumo: '9º na Série A · na zona, com os pontos do 8º', dif: null });
    const bEmpate = serie('b', [30, 20, 20]);
    expect(bloco(bEmpate, 3).resumo).toBe('3º na Série B · com os pontos do 2º');
  });
  it('1 pt no singular', () => {
    expect(bloco(serie('a', [30, 29]), 1).resumo).toBe('1º na Série A · 1 pt à frente');
  });
  it('série única: dentro e fora das 10 vagas', () => {
    const u = serie('unica', Array.from({ length: 20 }, (_, i) => 60 - 2 * i));
    const nov = (pos: number) => blocoDasDivisoes({ linha: u[pos - 1], daSerie: u, mes: '2026-11-01', fechadas: 3, agora });
    expect(nov(6)).toMatchObject({ resumo: '6º · por enquanto vai pra Série A', serie: 'Na série única · novembro', evento: 'temporada_acesso' });
    expect(nov(6).situacao).toBe('por enquanto vai pra Série A · 3 de 5 semanas');
    expect(nov(12)).toMatchObject({ resumo: '12º · 4 pts da última vaga da Série A', evento: 'temporada_meio' });
    expect(nov(1).resumo).toBe('1º · 2 pts à frente');
  });
  it('sem semana travada: "Série A de dezembro · a 1ª semana trava segunda, 12h"', () => {
    const vazia = serie('a', Array(10).fill(0)).map((l) => ({ ...l, ultima_posicao: null }));
    const antes = blocoDasDivisoes({ linha: vazia[3], daSerie: vazia, mes: DEZ, fechadas: 0, agora: new Date('2026-12-08T12:00:00Z') });
    expect(antes).toMatchObject({ posicao: '–', serie: 'Série A de dezembro', situacao: 'A 1ª semana trava segunda, 12h', evento: null });
    expect(antes.resumo).toBe('Série A de dezembro · a 1ª semana trava segunda, 12h');
    const depois = blocoDasDivisoes({ linha: vazia[3], daSerie: vazia, mes: DEZ, fechadas: 0, agora: new Date('2026-12-14T15:30:00Z') });
    expect(depois.situacao).toBe('A 1ª semana tá travando');
  });
});

describe('fim do mês: destino', () => {
  const t = (extra: Partial<Temporada> = {}): Temporada => ({ mes: DEZ, pre_temporada: false, fechada_em: '2027-01-04T15:01:00Z', campeao_estreia_id: null, ...extra });
  const fim = (s: Serie, pos: number, destino: 'a' | 'b', extra: Partial<LinhaTemporada> = {}) =>
    linha('cruzeiro', s, pos, 61, { posicao_final: pos, destino, vitorias: 2, ...extra });

  it('cada destino', () => {
    const casos: [LinhaTemporada, DestinoDoMes][] = [
      [fim('a', 1, 'a'), 'campeao'],
      [fim('a', 5, 'a'), 'fica_a'],
      [fim('a', 9, 'b'), 'caiu'],
      [fim('b', 1, 'a'), 'campeao_b'],
      [fim('b', 2, 'a'), 'subiu'],
      [fim('b', 3, 'b'), 'fica_b'],
      [fim('unica', 4, 'a'), 'unica_a'],
      [fim('unica', 14, 'b'), 'unica_b'],
    ];
    for (const [l, d] of casos) expect(destinoDoMes(l, t()), d).toBe(d);
    expect(destinoDoMes(fim('unica', 1, 'a'), t({ campeao_estreia_id: 'cruzeiro' }))).toBe('estreia');
    // Na pré-temporada não há Campeão da estreia: o 1º só vai pra Série A.
    expect(destinoDoMes(fim('unica', 1, 'a'), t({ pre_temporada: true, campeao_estreia_id: 'cruzeiro' }))).toBe('unica_a');
    expect(destinoDoMes(linha('x', 'a', 3, 10), t())).toBeNull();
  });

  it('título, selo, emblema e festa', () => {
    expect(TITULO_DO_DESTINO.subiu).toBe('SUBIU PRA SÉRIE A');
    expect(TITULO_DO_DESTINO.unica_b).toBe('COMEÇA NA SÉRIE B');
    expect(SELO_DO_DESTINO.subiu).toBe('SUBIU!');
    expect(emblemaDoDestino('subiu')).toBe('sobe');
    expect(emblemaDoDestino('caiu')).toBe('desce');
    expect(emblemaDoDestino('fica_a')).toBe('fica');
    const festa = (Object.keys(TITULO_DO_DESTINO) as DestinoDoMes[]).filter(temFesta);
    expect(festa.sort()).toEqual(['campeao', 'campeao_b', 'estreia', 'subiu', 'unica_a']);
  });

  it('textos da placa', () => {
    expect(topoDaPlaca(DEZ)).toBe('Fim de dezembro · temporada fechada');
    expect(topoDoCardDoMes(DEZ)).toBe('FIM DE DEZEMBRO');
    expect(linhaDoFim(fim('b', 2, 'a'), cru)).toBe('O Cruzeiro terminou em 2º na Série B · 61 pts · 2 vitórias de semana');
    expect(linhaDoFim(fim('unica', 6, 'a', { vitorias: 0 }), cha)).toBe('A Chapecoense terminou em 6º na série única · 61 pts');
  });

  it('troféus do mês iguais aos de galeria_trofeus; pré-temporada não dá troféu', () => {
    const chaves = (l: LinhaTemporada, tt = t()) => trofeusDoMes(l, tt).map(chaveDoTrofeu);
    expect(chaves(fim('a', 1, 'a'))).toEqual(['campeao_temporada||a|cruzeiro'.replace('||', `|${DEZ}|`)]);
    expect(chaves(fim('b', 1, 'a'))).toEqual([`campeao_serie_b|${DEZ}|b|cruzeiro`, `acesso|${DEZ}|b|cruzeiro`]);
    expect(chaves(fim('b', 2, 'a'))).toEqual([`acesso|${DEZ}|b|cruzeiro`]);
    expect(chaves(fim('unica', 1, 'a'), t({ campeao_estreia_id: 'cruzeiro' }))).toEqual([`campeao_estreia|${DEZ}|unica|cruzeiro`]);
    expect(chaves(fim('a', 9, 'b'))).toEqual([]);
    expect(chaves(fim('a', 1, 'a'), t({ pre_temporada: true }))).toEqual([]);
  });

  it('o rival caiu', () => {
    const linhas = [fim('a', 9, 'b', { time_id: 'atletico-mg' }), fim('a', 4, 'a')];
    expect(caiuNoMes(linhas, 'atletico-mg')).toBe(true);
    expect(caiuNoMes(linhas, 'cruzeiro')).toBe(false);
    expect(caiuNoMes(linhas, undefined)).toBe(false);
  });

  it('texto de mandar no grupo, emoji antigo e sem link', () => {
    expect(textoDeMandarTemporada('subiu', cru, DEZ, true)).toBe('⬆️ Cruzeiro subiu pra Série A no Guerra de Torcidas! Eu tava na arquibancada.');
    expect(textoDeMandarTemporada('campeao', cru, DEZ, false)).toBe('🏆 Cruzeiro campeão da temporada no Guerra de Torcidas!');
    expect(textoDeMandarTemporada('caiu', cru, DEZ, true)).toBe('⬇️ Cruzeiro caiu pra Série B. Em janeiro tem volta.');
    for (const d of Object.keys(TITULO_DO_DESTINO) as DestinoDoMes[]) {
      expect(textoDeMandarTemporada(d, cha, DEZ, true)).not.toContain('http');
    }
  });
});

describe('placa: qual mês anunciar', () => {
  const t = (mes: string, fechada_em: string | null, pre = true): Temporada => ({ mes, pre_temporada: pre, fechada_em, campeao_estreia_id: null });
  const lista = [t(DEZ, null), t('2026-11-01', '2026-12-07T15:01:00Z')];
  it('o mais recente fechado, a partir do dia do fechamento', () => {
    expect(mesParaAnunciar(lista, undefined, '2026-12-07')?.mes).toBe('2026-11-01');
    expect(mesParaAnunciar(lista, undefined, '2026-12-06')).toBeNull();
  });
  it('uma vez por aparelho e só por 21 dias', () => {
    expect(mesParaAnunciar(lista, '2026-11-01', '2026-12-08')).toBeNull();
    expect(DIAS_DA_PLACA_DO_MES).toBe(21);
    expect(mesParaAnunciar(lista, undefined, '2026-12-28')?.mes).toBe('2026-11-01');
    expect(mesParaAnunciar(lista, undefined, '2026-12-29')).toBeNull();
  });
  it('fechamento perto da meia-noite usa o dia de Brasília', () => {
    expect(mesParaAnunciar([t('2026-11-01', '2026-12-08T02:30:00Z')], undefined, '2026-12-07')?.mes).toBe('2026-11-01');
  });
  it('nenhum mês fechado', () => {
    expect(mesParaAnunciar([t(DEZ, null)], undefined, '2026-12-20')).toBeNull();
  });
});

describe('card: pedaço da tabela final', () => {
  const comFim = (s: Serie, n: number) => serie(s, Array.from({ length: n }, (_, i) => 60 - i)).map((l) => ({ ...l, posicao_final: l.posicao }));
  it('o meu time no meio e a linha de quem cai na A', () => {
    const f = fatiaDaTabela(comFim('a', 10), 't8');
    expect(f.linhas.map((l) => l.time_id)).toEqual(['t6', 't7', 't8', 't9', 't10']);
    expect(f.corte).toEqual({ depoisDe: 8, tipo: 'caem' });
  });
  it('na B, sobem; longe do corte, sem tracejado', () => {
    expect(fatiaDaTabela(comFim('b', 10), 't1')).toMatchObject({ corte: { depoisDe: 2, tipo: 'sobem' } });
    expect(fatiaDaTabela(comFim('b', 10), 't1').linhas[0].time_id).toBe('t1');
    expect(fatiaDaTabela(comFim('b', 10), 't8').corte).toBeNull();
  });
  it('série única: corte depois do 10º', () => {
    expect(fatiaDaTabela(comFim('unica', 20), 't11')).toMatchObject({ corte: { depoisDe: 10, tipo: 'sobem' } });
  });
});

describe('narrador das divisões (docs/narrador.md seção 16)', () => {
  const times = TIMES.filter((t) => t.id !== ID_OUTRO);
  const URGENCIA = /volte|amanh|corr[ae]|não perde|últim[oa]s? (hora|dia|chance)|agora ou nunca|sequência/i;

  it('até 75 caracteres com qualquer time, rival, série e mês, e sem urgência', () => {
    for (const [evento, frases] of Object.entries(FRASES_DA_TEMPORADA)) {
      expect(frases.length, evento).toBeGreaterThanOrEqual(2);
      for (const f of frases) {
        for (const time of times) {
          for (const serieNome of ['Série A', 'Série B', 'série única']) {
            const texto = preencherFraseDaTemporada(f, {
              time,
              serie: serieNome,
              dif: '10 pontos',
              mes: 'fevereiro',
              rival: times.reduce((maior, t) => (t.nome.length > maior.nome.length ? t : maior)),
            })!;
            expect(texto, f).not.toMatch(/\{/);
            expect(texto.length, texto).toBeLessThanOrEqual(75);
            expect(texto, texto).not.toMatch(URGENCIA);
          }
        }
      }
    }
  });

  it('frase sem a variável que pede fica de fora', () => {
    expect(preencherFraseDaTemporada('Na zona por {dif}. Uma semana boa resolve.', { time: cru, dif: null })).toBeNull();
    const zona = new Set<string>();
    for (let i = 0; i < 30; i++) zona.add(fraseDaTemporada('temporada_queda', { time: cru }, () => i / 30)!);
    expect([...zona].some((f) => f.includes('Na zona por'))).toBe(false);
    expect(fraseDaTemporada('temporada_queda', { time: cru, dif: '3 pontos' }, () => 0.5)).toBe('Na zona por 3 pontos. Uma semana boa resolve.');
  });

  it('artigo e contração certos', () => {
    expect(fraseDaTemporada('temporada_subiu', { time: cha }, () => 0)).toBe('Subiu! A Série B ficou pequena pra Chapecoense.');
    expect(fraseDaTemporada('temporada_rival_caiu', { time: cru, rival: { nome: 'Atlético-MG', artigo: 'o' } }, () => 0)).toBe(
      'O Atlético-MG caiu pra Série B. A torcida do Cruzeiro agradece.',
    );
  });

  it('todo destino tem frase; rival só quando o meu time ficou na série', () => {
    for (const evento of Object.values(EVENTO_DO_DESTINO)) expect(FRASES_DA_TEMPORADA[evento].length, evento).toBeGreaterThan(0);
    expect(eventoDoFim('fica_a', true)).toBe('temporada_rival_caiu');
    expect(eventoDoFim('fica_b', true)).toBe('temporada_rival_caiu');
    expect(eventoDoFim('subiu', true)).toBe('temporada_subiu');
    expect(eventoDoFim('caiu', true)).toBe('temporada_caiu');
    expect(eventoDoFim('fica_a', false)).toBe('temporada_fica_a');
  });
});
