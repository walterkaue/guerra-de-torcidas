import { describe, expect, it } from 'vitest';
import { TIMES, ID_OUTRO } from '../dados/times';
import { FRASES_DA_GALERIA, fraseDaGaleria, preencherFraseDaGaleria } from '../narrador/galeria';
import {
  DIAS_DE_NOVIDADE,
  MAX_ANUNCIADOS,
  chaveDoTrofeu,
  fracaoDaBarra,
  fraseSobeDesce,
  galeriaEmPreTemporada,
  ganhoEm,
  guardarAnunciados,
  linhaEmCampo,
  montarEstante,
  numerosDaFicha,
  periodoDoTrofeu,
  placaDoTime,
  resumirCampeas,
  serieDoTrofeu,
  textoDaJanela,
  textoDeMandarTrofeu,
  textoDoTotal,
  textoDosOutros,
  top3,
  trofeuParaAnunciar,
  type Linha52,
  type Trofeu,
} from './galeria';

const semana = (s: string, extra: Partial<Trofeu> = {}): Trofeu => ({
  trofeu: 'campeao_semana',
  prateleira: 'trofeus',
  time_id: 'flamengo',
  semana: s,
  mes: null,
  serie: 'a',
  ...extra,
});
const doMes = (trofeu: Trofeu['trofeu'], mes: string, extra: Partial<Trofeu> = {}): Trofeu => ({
  trofeu,
  prateleira: 'trofeus',
  time_id: 'flamengo',
  semana: null,
  mes,
  serie: 'a',
  ...extra,
});
const vitrine = (s: string): Trofeu => semana(s, { trofeu: 'maior_torcida', prateleira: 'vitrine', serie: null });

const nomes: Record<string, { nome: string; artigo: 'o' | 'a' }> = {
  flamengo: { nome: 'Flamengo', artigo: 'o' },
  palmeiras: { nome: 'Palmeiras', artigo: 'o' },
  chapecoense: { nome: 'Chapecoense', artigo: 'a' },
};
const nomeDe = (id: string) => nomes[id] ?? { nome: id, artigo: 'o' as const };

describe('estante', () => {
  it('vazia: três taças tracejadas, sem flâmula nem vitrine', () => {
    const e = montarEstante([]);
    expect(e.total).toBe(0);
    expect(e.tacas.map((t) => [t.tipo, t.vezes, t.multiplo])).toEqual([
      ['campeao_estreia', 0, null],
      ['campeao_temporada', 0, null],
      ['campeao_serie_b', 0, null],
    ]);
    expect(e.flamulas).toEqual([]);
    expect(e.vitrine).toEqual({ vezes: 0, multiplo: null, ultimo: null });
    expect(textoDoTotal(0)).toBe('Nenhum troféu ainda');
  });

  it('conta ×N só quando repete e guarda o mais novo de cada taça', () => {
    const e = montarEstante([
      doMes('campeao_temporada', '2027-03-01'),
      doMes('campeao_temporada', '2027-05-01'),
      doMes('campeao_temporada', '2027-04-01'),
      doMes('campeao_estreia', '2027-01-01', { serie: 'unica' }),
    ]);
    const [estreia, temporada, b] = e.tacas;
    expect(estreia.multiplo).toBeNull();
    expect(estreia.vezes).toBe(1);
    expect(temporada.multiplo).toBe('×3');
    expect(temporada.ultimo?.mes).toBe('2027-05-01');
    expect(b.vezes).toBe(0);
  });

  it('flâmulas da mais nova à mais antiga, com data e selo da Série B', () => {
    const e = montarEstante([semana('2027-02-01'), semana('2027-03-08', { serie: 'b' }), semana('2027-01-04', { serie: 'unica' })]);
    expect(e.flamulas.map((f) => [f.data, f.serieB])).toEqual([
      ['08/03/2027', true],
      ['01/02/2027', false],
      ['04/01/2027', false],
    ]);
  });

  it('vitrine com ×N e total só com o que está na estante (sem acesso e queda)', () => {
    const e = montarEstante([
      vitrine('2027-01-04'),
      vitrine('2027-01-11'),
      semana('2027-01-11'),
      doMes('rebaixamento', '2027-04-01'),
      doMes('acesso', '2027-02-01', { serie: 'b' }),
    ]);
    expect(e.vitrine.multiplo).toBe('×2');
    expect(e.total).toBe(3);
    expect(textoDoTotal(3)).toBe('3 troféus');
    expect(textoDoTotal(1)).toBe('1 troféu');
  });
});

describe('sobe e desce', () => {
  it('nulo sem Série A e B (pré-temporada e estreia)', () => {
    expect(fraseSobeDesce([])).toBeNull();
    expect(fraseSobeDesce([{ mes: '2027-01-01', serie: 'unica' }])).toBeNull();
  });

  it('estreia que manda pra A não conta como acesso', () => {
    expect(
      fraseSobeDesce([
        { mes: '2027-01-01', serie: 'unica' },
        { mes: '2027-02-01', serie: 'a' },
        { mes: '2027-03-01', serie: 'a' },
      ]),
    ).toBe('Na Série A desde fev/2027 · nunca caiu');
  });

  it('conta quedas na A e acessos na B, e o "desde" é o começo da fase atual', () => {
    const h = [
      { mes: '2027-02-01', serie: 'a' as const },
      { mes: '2027-03-01', serie: 'b' as const },
      { mes: '2027-04-01', serie: 'a' as const },
      { mes: '2027-05-01', serie: 'a' as const },
    ];
    expect(fraseSobeDesce(h)).toBe('Na Série A desde abr/2027 · caiu 1 vez');
    expect(fraseSobeDesce([...h, { mes: '2027-06-01', serie: 'b' }])).toBe('Na Série B desde jun/2027 · subiu 1 vez');
    expect(fraseSobeDesce([{ mes: '2027-02-01', serie: 'b' }])).toBe('Na Série B desde fev/2027 · ainda sem acesso');
  });

  it('ordena o histórico fora de ordem', () => {
    expect(
      fraseSobeDesce([
        { mes: '2027-04-01', serie: 'b' },
        { mes: '2027-02-01', serie: 'a' },
        { mes: '2027-03-01', serie: 'b' },
      ]),
    ).toBe('Na Série B desde mar/2027 · ainda sem acesso');
  });
});

describe('ficha', () => {
  const linhas = [
    { time_id: 'flamengo', ativos: 40, soma: 9000, media30: 120.5, posicao_campeao: 2, posicao_soma: 1 },
    { time_id: 'palmeiras', ativos: 35, soma: 8000, media30: 130, posicao_campeao: 1, posicao_soma: 2 },
    { time_id: 'chapecoense', ativos: 1, soma: 50, media30: 100.25, posicao_campeao: 3, posicao_soma: 3 },
  ];

  it('semana: média, quantos jogaram e vantagem sobre o 2º da mesma série', () => {
    const series = new Map([
      ['flamengo', 'b' as const],
      ['palmeiras', 'a' as const],
      ['chapecoense', 'b' as const],
    ]);
    expect(numerosDaFicha(semana('2027-03-08', { serie: 'b' }), { semana: linhas, series })).toEqual([
      { valor: '120,5', rotulo: 'média dos 30' },
      { valor: '40', rotulo: 'jogaram' },
      { valor: '+20,3', rotulo: 'sobre o 2º' },
    ]);
  });

  it('vitrine: soma e vantagem na soma', () => {
    expect(numerosDaFicha(vitrine('2027-03-08'), { semana: linhas })).toEqual([
      { valor: '9.000', rotulo: 'pontos somados' },
      { valor: '40', rotulo: 'jogaram' },
      { valor: '+1.000', rotulo: 'sobre o 2º' },
    ]);
  });

  it('mês: pontos, vitórias e posição; sem linha, sem números', () => {
    const mes = [{ time_id: 'flamengo', serie: 'a' as const, posicao: 1, pontos: 86, vitorias: 1 }];
    expect(numerosDaFicha(doMes('campeao_temporada', '2027-03-01'), { mes })).toEqual([
      { valor: '86', rotulo: 'pontos' },
      { valor: '1', rotulo: 'vitória de semana' },
      { valor: '1º', rotulo: 'posição' },
    ]);
    expect(numerosDaFicha(doMes('campeao_temporada', '2027-03-01'), { mes: [] })).toEqual([]);
  });

  it('série e período', () => {
    expect(serieDoTrofeu(semana('2027-03-08', { serie: 'b' }))).toBe('Série B');
    expect(serieDoTrofeu(semana('2027-01-04', { serie: 'unica' }))).toBe('Série única');
    expect(serieDoTrofeu(vitrine('2027-01-04'))).toBeNull();
    expect(periodoDoTrofeu(semana('2026-12-28'))).toBe('Semana de 28/12 a 03/01/2027');
    expect(periodoDoTrofeu(doMes('campeao_temporada', '2027-03-01'))).toBe('Março de 2027');
  });

  it('"Você tava em campo" só na semana, no próprio time e para quem somou', () => {
    const t = semana('2027-03-08');
    expect(linhaEmCampo(t, 'flamengo', 340)).toBe('Você tava em campo: 340 pontos nessa semana');
    expect(linhaEmCampo(t, 'flamengo', 1)).toBe('Você tava em campo: 1 ponto nessa semana');
    expect(linhaEmCampo(t, 'flamengo', 0)).toBeNull();
    expect(linhaEmCampo(t, 'flamengo', null)).toBeNull();
    expect(linhaEmCampo(t, 'palmeiras', 340)).toBeNull();
    expect(linhaEmCampo(doMes('campeao_temporada', '2027-03-01'), 'flamengo', 340)).toBeNull();
  });

  it('texto de mandar no grupo, com emoji antigo', () => {
    const fla = nomeDe('flamengo');
    expect(textoDeMandarTrofeu(semana('2027-03-08'), fla)).toBe('🏆 Flamengo campeão da semana na Série A do Guerra de Torcidas!');
    expect(textoDeMandarTrofeu(semana('2027-01-04', { serie: 'unica' }), fla)).toBe('🏆 Flamengo campeão da semana do Guerra de Torcidas!');
    expect(textoDeMandarTrofeu(doMes('campeao_temporada', '2027-03-01'), fla)).toBe(
      '🏆 Flamengo campeão da temporada de março no Guerra de Torcidas!',
    );
    expect(textoDeMandarTrofeu(vitrine('2027-01-04'), fla)).toContain('maior torcida da semana');
  });
});

describe('Home: o que anunciar', () => {
  const hoje = '2027-03-16';

  it('só do time do coração, sem rebaixamento, e o mais novo primeiro', () => {
    const a = trofeuParaAnunciar(
      [
        semana('2027-03-08'),
        vitrine('2027-03-08'),
        semana('2027-03-01'),
        semana('2027-03-08', { time_id: 'palmeiras' }),
        doMes('rebaixamento', '2027-02-01'),
      ],
      { meuTime: 'flamengo', anunciados: [], hoje },
    );
    expect(a?.trofeu.semana).toBe('2027-03-08');
    expect(a?.outros).toBe(2);
    expect(a?.chaves).toHaveLength(3);
    expect(a?.chaves.some((c) => c.startsWith('rebaixamento'))).toBe(false);
    expect(textosDosOutros()).toEqual([null, '+1 troféu novo', '+2 troféus novos']);
  });

  it('no empate de data, a flâmula vem antes do megafone', () => {
    const a = trofeuParaAnunciar([vitrine('2027-03-08'), semana('2027-03-08')], { meuTime: 'flamengo', anunciados: [], hoje });
    expect(a?.trofeu.trofeu).toBe('campeao_semana');
    const b = trofeuParaAnunciar([semana('2027-03-08'), vitrine('2027-03-08')], { meuTime: 'flamengo', anunciados: [], hoje });
    expect(b?.trofeu.trofeu).toBe('campeao_semana');
  });

  it('uma vez por aparelho: o que já foi anunciado não volta', () => {
    const lista = [semana('2027-03-08')];
    const primeira = trofeuParaAnunciar(lista, { meuTime: 'flamengo', anunciados: [], hoje })!;
    const guardados = guardarAnunciados([], primeira.chaves);
    expect(trofeuParaAnunciar(lista, { meuTime: 'flamengo', anunciados: guardados, hoje })).toBeNull();
  });

  it('troféu velho não é novo (aparelho novo de quem já jogava)', () => {
    const velho = semana('2027-01-04');
    expect(ganhoEm(velho)).toBe('2027-01-11');
    expect(trofeuParaAnunciar([velho], { meuTime: 'flamengo', anunciados: [], hoje })).toBeNull();
    const limite = semana('2027-02-16');
    expect(ganhoEm(limite)).toBe('2027-02-23');
    expect(trofeuParaAnunciar([limite], { meuTime: 'flamengo', anunciados: [], hoje })).not.toBeNull();
    expect(DIAS_DE_NOVIDADE).toBe(21);
  });

  it('troféu do mês é ganho no 1º dia do mês seguinte', () => {
    expect(ganhoEm(doMes('campeao_temporada', '2027-12-01'))).toBe('2028-01-01');
  });

  it('os troféus do mês saem pela placa de fim do mês, não pela "Troféu novo"', () => {
    const doMesTodos = [
      doMes('campeao_temporada', '2027-02-01'),
      doMes('campeao_serie_b', '2027-02-01', { serie: 'b' }),
      doMes('acesso', '2027-02-01', { serie: 'b' }),
      doMes('campeao_estreia', '2027-02-01', { serie: 'unica' }),
    ];
    expect(trofeuParaAnunciar(doMesTodos, { meuTime: 'flamengo', anunciados: [], hoje: '2027-03-02' })).toBeNull();
    const a = trofeuParaAnunciar([...doMesTodos, semana('2027-02-22')], { meuTime: 'flamengo', anunciados: [], hoje: '2027-03-02' });
    expect(a?.trofeu.trofeu).toBe('campeao_semana');
    expect(a?.outros).toBe(0);
  });

  it('sem time ou de "Outro time": nada', () => {
    expect(trofeuParaAnunciar([semana('2027-03-08')], { meuTime: undefined, anunciados: [], hoje })).toBeNull();
    expect(trofeuParaAnunciar([semana('2027-03-08')], { meuTime: ID_OUTRO, anunciados: [], hoje })).toBeNull();
  });

  it('guarda sem repetir e só as mais recentes', () => {
    expect(guardarAnunciados(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    const muitas = Array.from({ length: MAX_ANUNCIADOS + 5 }, (_, i) => `k${i}`);
    const g = guardarAnunciados(muitas, ['nova']);
    expect(g).toHaveLength(MAX_ANUNCIADOS);
    expect(g.at(-1)).toBe('nova');
    expect(chaveDoTrofeu(semana('2027-03-08'))).toBe('campeao_semana|2027-03-08|a|flamengo');
  });
});

function textosDosOutros() {
  return [textoDosOutros(0), textoDosOutros(1), textoDosOutros(2)];
}

describe('52 semanas', () => {
  const linha = (time_id: string, posicao: number, pontos: number, vitorias = 0): Linha52 => ({
    posicao,
    time_id,
    pontos,
    vitorias,
    ultima_posicao: posicao,
    semanas: 10,
    desde: '2027-01-04',
    ate: '2027-03-08',
  });

  it('janela vai da segunda da primeira ao domingo da última', () => {
    expect(textoDaJanela(linha('flamengo', 1, 10))).toBe('10 de 52 semanas · 04/01 a 14/03/2027');
    expect(textoDaJanela({ semanas: 3, desde: '2026-12-21', ate: '2027-01-04' })).toBe('3 de 52 semanas · 21/12/2026 a 10/01/2027');
    expect(textoDaJanela({ semanas: 0, desde: null, ate: null })).toBeNull();
    expect(textoDaJanela(undefined)).toBeNull();
  });

  it('placa: distância para o da frente, líder e empate', () => {
    const linhas = [linha('palmeiras', 1, 200, 4), linha('flamengo', 2, 195, 3), linha('chapecoense', 3, 195, 2)];
    expect(placaDoTime(linhas, 'flamengo', nomeDe)).toEqual({ posicao: 2, pontos: 195, vitorias: 3, distancia: 'A 5 pontos do Palmeiras' });
    expect(placaDoTime(linhas, 'palmeiras', nomeDe)?.distancia).toBe('Líder, 5 pontos na frente');
    expect(placaDoTime(linhas, 'chapecoense', nomeDe)?.distancia).toBe('Empatado com o Flamengo, atrás no desempate');
    expect(placaDoTime([linha('chapecoense', 1, 0), linha('flamengo', 2, 0)], 'chapecoense', nomeDe)?.distancia).toBe(
      'Líder, empatado nos pontos',
    );
    expect(placaDoTime(linhas, ID_OUTRO, nomeDe)).toBeNull();
  });

  it('barrinha proporcional ao líder', () => {
    expect(fracaoDaBarra(50, 200)).toBe(0.25);
    expect(fracaoDaBarra(0, 0)).toBe(0);
    expect(fracaoDaBarra(300, 200)).toBe(1);
  });

  it('top 3 sem quem não pontuou', () => {
    expect(top3([linha('a', 2, 10), linha('b', 1, 20), linha('c', 3, 0), linha('d', 4, 0)]).map((l) => l.time_id)).toEqual(['b', 'a']);
  });

  it('pré-temporada: sem temporada ou a mais nova marcada', () => {
    expect(galeriaEmPreTemporada([])).toBe(true);
    expect(galeriaEmPreTemporada([{ mes: '2026-11-01', pre_temporada: true }])).toBe(true);
    expect(
      galeriaEmPreTemporada([
        { mes: '2026-12-01', pre_temporada: true },
        { mes: '2027-01-01', pre_temporada: false },
      ]),
    ).toBe(false);
  });
});

describe('campeãs de estado', () => {
  const l = (semana: string, codigo: number, nome: string) => ({ semana, uf: 'SP', codigo, nome });
  const linhas = [l('2027-01-04', 1, 'Santos'), l('2027-01-11', 2, 'Campinas'), l('2027-01-18', 1, 'Santos'), l('2027-01-25', 2, 'Campinas'), l('2027-02-01', 3, 'Bauru')];

  it('mais vezes (com empate), sua cidade só se ganhou, lista da mais nova', () => {
    const c = resumirCampeas(linhas, 3);
    expect(c.maisVezes.map((x) => [x.nome, x.vezes])).toEqual([
      ['Campinas', 2],
      ['Santos', 2],
    ]);
    expect(c.minha).toEqual({ nome: 'Bauru', vezes: 1 });
    expect(c.semanas[0]).toEqual({ semana: '2027-02-01', data: 'Semana de 01/02/2027', codigo: 3, nome: 'Bauru' });
    expect(resumirCampeas(linhas, 99).minha).toBeNull();
    expect(resumirCampeas(linhas, null).minha).toBeNull();
    expect(resumirCampeas([], null)).toEqual({ maisVezes: [], minha: null, semanas: [] });
  });

  it('sua cidade em "mais vezes campeã" não repete na linha dela (nem no empate)', () => {
    expect(resumirCampeas(linhas, 1).minha).toBeNull(); // empatada no topo
    expect(resumirCampeas(linhas, 2).minha).toBeNull();
    const sozinha = [l('2027-01-04', 1, 'Santos'), l('2027-01-11', 1, 'Santos'), l('2027-01-18', 2, 'Campinas')];
    expect(resumirCampeas(sozinha, 1).minha).toBeNull();
    expect(resumirCampeas(sozinha, 2).minha).toEqual({ nome: 'Campinas', vezes: 1 });
  });
});

describe('narrador da Galeria', () => {
  it('cada tipo com 3 a 4 frases, até 75 letras com qualquer time e sem urgência (as palavras proibidas ficam no teste geral)', () => {
    for (const [tipo, frases] of Object.entries(FRASES_DA_GALERIA)) {
      expect(frases!.length, tipo).toBeGreaterThanOrEqual(3);
      expect(frases!.length, tipo).toBeLessThanOrEqual(4);
      for (const f of frases!) {
        for (const t of TIMES.filter((x) => x.id !== ID_OUTRO)) {
          const texto = preencherFraseDaGaleria(f, t);
          expect(texto.length, texto).toBeLessThanOrEqual(75);
          expect(texto).not.toMatch(/\{/);
          expect(texto.charAt(0)).toBe(texto.charAt(0).toUpperCase());
        }
        expect(f).not.toMatch(/volt[ae]|amanhã|seguid|sequência|corre|rápido|não perde/i);
      }
    }
  });

  it('artigo certo e rebaixamento sem frase', () => {
    const chape = nomeDe('chapecoense');
    expect(fraseDaGaleria('campeao_semana', chape, () => 0)).toBe('Semana fechada e a flâmula ficou com a Chapecoense. Tá pendurada!');
    expect(fraseDaGaleria('campeao_semana', chape, () => 0.99)).toBe('A Chapecoense levou a semana. O resto da tabela que lute.');
    expect(fraseDaGaleria('rebaixamento', chape)).toBeNull();
  });
});
