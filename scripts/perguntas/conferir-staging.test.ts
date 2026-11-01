import { describe, expect, it } from 'vitest';
import {
  clubeDoStaging, csvDoLote, linhaDoStaging, motivoDaFonte, motivoDaReescrita, motivoDeRegra, motivoDoTexto, motivoDoTrecho,
  proximosIds, quaseIgual, relatorioMd, sortear, tetoDoDegrau, textoTemConserto,
} from './conferir-staging.mjs';
import { lerPerguntas, validarPergunta } from './validar.mjs';

const r = {
  id: 'Q1', clube: 'Sao Paulo', degrau: 'media', tema: 'titulos', correta: 'B', fonte: 'https://www.saopaulofc.net/noticias/mundial-de-1992',
  texto: 'Em 1992, o São Paulo venceu qual clube na final do Mundial?""',
  alternativa_a: 'Milan', alternativa_b: 'Barcelona', alternativa_c: 'Ajax', alternativa_d: 'Porto',
};
const l = linhaDoStaging(r);
const PAGINA = 'Em dezembro de 1992, o São Paulo venceu o Barcelona por 2 a 1 em Tóquio, com dois gols de Raí, e foi campeão do mundo.';

describe('perguntas do staging: leitura', () => {
  it('acerta o clube em qualquer grafia', () => {
    for (const nome of ['Atlético Mineiro', 'Atletico Mineiro', 'Atletico-MG']) expect(clubeDoStaging(nome)).toBe('atletico-mg');
    expect(clubeDoStaging('Sao Paulo')).toBe('sao-paulo');
    expect(clubeDoStaging('São Paulo')).toBe('sao-paulo');
    expect(clubeDoStaging('Grêmio')).toBe('gremio');
    expect(clubeDoStaging('Ibis')).toBeNull();
  });

  it('tira as aspas sobrando, resolve a certa pela letra e o nome do Bragantino', () => {
    expect(l.pergunta).toBe('Em 1992, o São Paulo venceu qual clube na final do Mundial?');
    expect(l.certa).toBe('Barcelona');
    expect([l.errada1, l.errada2, l.errada3]).toEqual(['Milan', 'Ajax', 'Porto']);
    expect(linhaDoStaging({ ...r, clube: 'Bragantino', texto: 'Em 1990, o Red Bull Bragantino ganhou?' }).pergunta).toBe('Em 1990, o Bragantino ganhou?');
  });
});

describe('perguntas do staging: fonte', () => {
  const comFonte = (fonte) => motivoDaFonte({ ...l, fonte });
  it('link de verdade passa', () => expect(comFonte(l.fonte)).toBeNull());
  it('recusa o que não pode provar', () => {
    expect(comFonte('https://fifa.com#sem-link')).toContain('sem link');
    expect(comFonte('http://saopaulofc.net')).toContain('página inicial');
    expect(comFonte('https://www.lance.com.br/futebol')).toContain('seção');
    expect(comFonte('https://pt.wikipedia.org/wiki/Pelé')).toContain('Wikipédia');
    expect(comFonte('https://aventurasnahistoria.com.br/a/b')).toContain('domínio não aceito');
    expect(comFonte('')).toContain('sem link');
  });
});

describe('perguntas do staging: regras e texto', () => {
  it('linha vermelha não tem conserto', () => {
    expect(motivoDeRegra(l)).toBeNull();
    expect(motivoDeRegra({ ...l, clube: null })).toContain('clube');
    expect(motivoDeRegra({ ...l, pergunta: 'Em 2016, qual foi o rebaixamento do time?' })).toContain('tema');
    expect(motivoDeRegra({ ...l, pergunta: 'Em 2010, qual era o mascote do clube?' })).toContain('assunto');
    expect(motivoDeRegra({ ...l, errada1: 'Allianz Parque' })).toContain('marca');
    expect(motivoDeRegra({ ...l, pergunta: 'Em 2020, quem é o técnico atual do clube?' })).toContain('muda com o tempo');
  });

  it('longa ou sem ano tem conserto; alternativa longa não', () => {
    expect(motivoDoTexto(l)).toBeNull();
    const longa = motivoDoTexto({ ...l, pergunta: `Em 1992, ${'muito '.repeat(30)}qual clube?` });
    expect(textoTemConserto(longa)).toBe(true);
    expect(textoTemConserto(motivoDoTexto({ ...l, pergunta: 'Qual clube o São Paulo venceu na final do Mundial?' }))).toBe(true);
    expect(textoTemConserto(motivoDoTexto({ ...l, certa: 'x'.repeat(41) }))).toBe(false);
  });

  it('acha a mesma pergunta com outra redação, só com a mesma resposta', () => {
    const b = { pergunta: 'Na final do Mundial de 1992, o São Paulo venceu qual clube?', certa: 'Barcelona' };
    expect(quaseIgual(l, b)).toBe(true);
    expect(quaseIgual(l, { ...b, certa: 'Milan' })).toBe(false);
    expect(quaseIgual(l, { pergunta: 'Em 1950, quem o Barcelona contratou?', certa: 'Barcelona' })).toBe(false);
    const raiA = { clube: 'sao-paulo', pergunta: 'No Mundial de 1992, quem fez os dois gols do São Paulo na virada sobre o Barcelona?', certa: 'Raí' };
    const raiB = { clube: 'sao-paulo', pergunta: 'Em 1992, quem marcou os dois gols na vitória por 2 a 1?', certa: 'Raí' };
    expect(quaseIgual(raiA, raiB)).toBe(true); // mesmo fato, palavras diferentes
    expect(quaseIgual(raiA, { ...raiB, pergunta: 'Em 1994, quem foi o capitão do time?' })).toBe(false);
  });

  it('teto do degrau soma a meta do lançamento', () => {
    const graus = ['facil', 'media', 'dificil', 'craque'];
    expect(graus.reduce((t, d) => t + tetoDoDegrau('vasco', d), 0)).toBe(30);
    expect(graus.reduce((t, d) => t + tetoDoDegrau('geral', d), 0)).toBe(200);
  });
});

describe('perguntas do staging: trecho e reescrita', () => {
  it('só aceita trecho literal com a resposta, o ano e o clube', () => {
    expect(motivoDoTrecho(l, 'Em dezembro de 1992, o São Paulo venceu o Barcelona por 2 a 1', PAGINA)).toBeNull();
    expect(motivoDoTrecho(l, 'Em dezembro de 1992, o São Paulo venceu o Milan por 2 a 1', PAGINA)).toContain('não está na página');
    expect(motivoDoTrecho(l, 'por 2 a 1 em Tóquio, com dois gols de Raí', PAGINA)).toContain('resposta certa');
    expect(motivoDoTrecho(l, 'o São Paulo venceu o Barcelona por 2 a 1', PAGINA)).toContain('ano 1992');
    const semClube = { ...l, fonte: 'https://ge.globo.com/x/y', clube: 'vasco' };
    expect(motivoDoTrecho(semClube, 'Em dezembro de 1992, o São Paulo venceu o Barcelona', PAGINA)).toContain('não cita o clube');
  });

  const trecho = 'Em dezembro de 1992, o São Paulo venceu o Barcelona por 2 a 1';
  it('reescrita boa passa', () => expect(motivoDaReescrita(l, 'Em 1992, o São Paulo venceu qual clube em Tóquio?', `${trecho} em Tóquio`)).toBeNull());
  it('reescrita ruim cai', () => {
    expect(motivoDaReescrita(l, 'Em 1992, o São Paulo venceu o Barcelona ou o Milan?', trecho)).toContain('entrega a resposta');
    expect(motivoDaReescrita(l, 'Em 1993, o São Paulo venceu qual clube?', trecho)).toContain('número novo');
    expect(motivoDaReescrita(l, 'Em 1992, o técnico Santana viu o São Paulo vencer qual clube?', trecho)).toContain('nome novo');
    expect(motivoDaReescrita(l, 'O São Paulo venceu qual clube no Mundial?', trecho)).toContain('sem ano');
  });
});

describe('perguntas do staging: lote e relatório', () => {
  it('numera depois do último id de cada clube e degrau', () => {
    const proximo = proximosIds(['vasco-f-03', 'vasco-f-10', 'geral-c-07']);
    expect(proximo('vasco', 'facil')).toBe('vasco-f-11');
    expect(proximo('vasco', 'facil')).toBe('vasco-f-12');
    expect(proximo('geral', 'craque')).toBe('geral-c-08');
    expect(proximo('santos', 'media')).toBe('santos-m-01');
  });

  it('o CSV volta igual pelo leitor e passa no validador', () => {
    const linha = { ...l, id: 'sao-paulo-m-40', fonte2: '', verificada_em: '2026-10-31', status: 'rascunho', observacao: 'Trecho: "dois gols, de Raí".' };
    const [lida] = lerPerguntas(csvDoLote([linha]));
    expect(lida.observacao).toBe(linha.observacao);
    expect(validarPergunta(lida)).toEqual([]);
  });

  it('a amostra é a mesma com a mesma semente', () => {
    const lista = Array.from({ length: 50 }, (_, i) => i);
    expect(sortear(lista, 5, 7)).toEqual(sortear(lista, 5, 7));
    expect(new Set(sortear(lista, 50, 7)).size).toBe(50);
  });

  it('o relatório separa aprovadas e reprovadas com o motivo', () => {
    const boa = { l, linha: { id: 'sao-paulo-m-40' }, trecho: 'trecho' };
    const ruim = { l: { ...l, staging: 'Q2' }, motivo: null, motivoFonte: 'link só para a página inicial do site' };
    const md = relatorioMd({
      escolhidas: [boa, ruim], aprovadas: [boa], num: '02', hoje: '2026-10-31', clube: 'sao-paulo', gerais: 0, semente: 7, totalGerais: 211,
      paginas: 1, extras: [], uso: { chamadas: 2, entrada: 100, saida: 10, porModelo: { 'gemini-3.5-flash-lite': 2 } },
    });
    expect(md).toContain('| sao-paulo | 2 | 1 | 50% |');
    expect(md).toContain('| link só para a página inicial do site | 1 |');
    expect(md).toContain('## Aprovadas (1)');
    expect(md).toContain('## Reprovadas (1)');
  });
});
