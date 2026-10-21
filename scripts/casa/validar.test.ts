import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IDS_COMPETICAO } from '../../src/dados/competicoes';
import { TIMES } from '../../src/dados/times';
import { gerarModulo, lerEntradas, montarCasas } from './importar.mjs';
import { idsDeTimes, validarCasa } from './validar.mjs';

type Linha = Record<string, string>;
const copia = () => structuredClone(lerEntradas());
const erros = (e: ReturnType<typeof copia>) => validarCasa(e.tabelas, e.ctx).erros;
const linha = (e: ReturnType<typeof copia>, arq: string, f: (l: Linha) => boolean) => {
  const l = (e.tabelas[arq].linhas as Linha[]).find(f);
  if (!l) throw new Error('linha de teste não achada');
  return l;
};

describe('dados/casa/', () => {
  it('os CSVs passam no validador', () => {
    const e = lerEntradas();
    expect(validarCasa(e.tabelas, e.ctx).erros).toEqual([]);
  });

  it('os ids de times e de competições lidos dos arquivos batem com os módulos', () => {
    const e = lerEntradas();
    expect(e.ctx.times).toEqual(TIMES.filter((t) => t.id !== 'outro').map((t) => t.id));
    expect(e.ctx.idsCompeticao).toEqual([...IDS_COMPETICAO]);
    expect(e.ctx.times).toHaveLength(20);
  });

  it('src/dados/casa/dados.gerado.ts está em dia com os CSVs (rode npm run importar-casa)', () => {
    const gerado = readFileSync(new URL('../../src/dados/casa/dados.gerado.ts', import.meta.url), 'utf8');
    expect(gerado).toBe(gerarModulo(lerEntradas().tabelas));
  });

  it('só entra no módulo o clube e a linha revisada ou ativa', () => {
    const e = copia();
    const casas = montarCasas(e.tabelas);
    const publicados = (e.tabelas.clubes.linhas as Linha[]).filter((l) => l.status === 'revisada' || l.status === 'ativa').map((l) => l.id);
    expect(Object.keys(casas).sort()).toEqual([...publicados].sort());
    // um clube em rascunho nunca aparece; ao revisar só o texto, vem sem títulos
    const clubes = { ...e.tabelas.clubes, linhas: (e.tabelas.clubes.linhas as Linha[]).map((l) => (l.id === 'flamengo' ? { ...l, status: 'revisada' } : l)) };
    const flamengo = montarCasas({ ...e.tabelas, clubes }).flamengo;
    expect(flamengo.titulos).toHaveLength(0);
    expect(flamengo.historiaCores).not.toBe('');
  });
});

describe('validarCasa', () => {
  it('lê os ids do times.ts', () => {
    expect(idsDeTimes("{ id: 'a-b', nome: 'A' }, { id: 'outro', nome: 'O' }")).toEqual(['a-b']);
  });

  it('barra domínio fora da lista e Wikipédia em fonte', () => {
    const e = copia();
    linha(e, 'titulos', (l) => l.clube === 'flamengo' && l.ano === '1981').fonte = 'https://blogdotorcedor.example/x';
    linha(e, 'goleadas', (l) => l.clube === 'flamengo').fonte = 'https://pt.wikipedia.org/wiki/Flamengo';
    linha(e, 'goleadas', (l) => l.clube === 'corinthians').fonte = 'https://www.lance.com.br/bet-do-dia.html';
    const r = erros(e).join('\n');
    expect(r).toMatch(/domínio fora da lista/);
    expect(r).toMatch(/Wikipédia só em fonte2/);
    expect(r).toMatch(/link de aposta/);
  });

  it('barra palavra proibida e marca de terceiros', () => {
    const e = copia();
    linha(e, 'clubes', (l) => l.id === 'flamengo').historia_cores = 'O clube fez a aposta do século na Ligga Arena.';
    const r = erros(e).join('\n');
    expect(r).toMatch(/palavra proibida/);
    expect(r).toMatch(/marca de terceiros "ligga"/);
  });

  it('barra competição fora da lista, estadual sem nota e título repetido', () => {
    const e = copia();
    linha(e, 'titulos', (l) => l.clube === 'flamengo' && l.competicao === 'estadual').nota = '';
    linha(e, 'titulos', (l) => l.clube === 'flamengo' && l.competicao === 'libertadores').competicao = 'taca-nacional';
    (e.tabelas.titulos.linhas as Linha[]).push({ ...linha(e, 'titulos', (l) => l.clube === 'palmeiras' && l.competicao === 'libertadores') });
    const r = erros(e).join('\n');
    expect(r).toMatch(/competição fora da lista: taca-nacional/);
    expect(r).toMatch(/estadual precisa do nome oficial/);
    expect(r).toMatch(/título repetido/);
  });

  it('cruza os Brasileiros com clubes-do-dia.csv', () => {
    const e = copia();
    e.tabelas.titulos.linhas = (e.tabelas.titulos.linhas as Linha[]).filter((l) => !(l.clube === 'palmeiras' && l.competicao === 'brasileiro-a' && l.ano === '2023'));
    expect(erros(e).join('\n')).toMatch(/palmeiras: \d+ Brasileiros oficiais, clubes-do-dia.csv diz \d+/);
  });

  it('exige a ordem dos recordes pelo valor, aceitando empate na mesma posição', () => {
    const e = copia();
    const gols = (e.tabelas.recordes.linhas as Linha[]).filter((l) => l.clube === 'corinthians' && l.lista === 'gols');
    const [primeiro, segundo] = gols;
    segundo.valor = String(Number(primeiro.valor) + 1);
    expect(erros(e).join('\n')).toMatch(/posição 2, mas pelo valor seria 1/);
    segundo.valor = primeiro.valor;
    segundo.posicao = '1';
    const terceiro = gols[2];
    terceiro.posicao = '3';
    expect(erros(e).filter((x) => x.startsWith('recordes'))).toEqual([]); // empate em 1º, o seguinte é 3º
  });

  it('goleada precisa ser aplicada, com saldo de 3 ou mais e no máximo 3 por clube', () => {
    const e = copia();
    linha(e, 'goleadas', (l) => l.clube === 'flamengo').placar = '2 x 8';
    const base = linha(e, 'goleadas', (l) => l.clube === 'corinthians');
    (e.tabelas.goleadas.linhas as Linha[]).push(...[1, 2, 3].map((i) => ({ ...base, adversario: `X${i}` })));
    const r = erros(e).join('\n');
    expect(r).toMatch(/placar deve ser/);
    expect(r).toMatch(/corinthians: \d+ goleadas \(máximo 3\)/);
  });

  it('manto: padrão, hex e palavras que o desenho não pode citar', () => {
    const e = copia();
    const m = linha(e, 'mantos', (l) => l.clube === 'flamengo' && l.ordem === '1');
    m.padrao = 'xadrez';
    m.cores = 'vermelho|preto';
    m.descricao = 'Camisa com a estrela e o escudo do clube.';
    const r = erros(e).join('\n');
    expect(r).toMatch(/padrão inválido/);
    expect(r).toMatch(/cores devem ser hex/);
    expect(r).toMatch(/cita "escudo"/);
    expect(r).toMatch(/cita "estrela"/);
  });

  it('estádio: formato, gramado e recorde incompleto', () => {
    const e = copia();
    const s = linha(e, 'estadios', (l) => l.clube === 'flamengo');
    s.formato = 'redondo';
    s.gramado = '105m';
    s.recorde_tipo = '';
    const r = erros(e).join('\n');
    expect(r).toMatch(/formato inválido/);
    expect(r).toMatch(/gramado deve ser/);
    expect(r).toMatch(/recorde_tipo deve ser pagante ou presente/);
  });

  it('a fundação tem que bater com clubes-do-dia.csv', () => {
    const e = copia();
    linha(e, 'clubes', (l) => l.id === 'santos').fundacao = '1913-04-14';
    expect(erros(e).join('\n')).toMatch(/fundação 1913-04-14 não bate/);
  });
});
