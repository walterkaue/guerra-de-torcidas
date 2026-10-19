import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { acharPalavras, gerarSql, lerCsv, lerPerguntas, validarConjunto, validarPergunta } from './validar.mjs';

const CAB = 'id,clube,degrau,tema,pergunta,certa,errada1,errada2,errada3,fonte,fonte2,verificada_em,status,observacao';

const boa = {
  id: 'flamengo-f-01',
  clube: 'flamengo',
  degrau: 'facil',
  tema: 'titulos',
  pergunta: 'Em 2019, qual torneio continental o Flamengo venceu em Lima?',
  certa: 'Libertadores',
  errada1: 'Sul-Americana',
  errada2: 'Recopa',
  errada3: 'Copa do Brasil',
  fonte: 'https://ge.globo.com/futebol/libertadores/noticia/2019/11/23/exemplo.ghtml',
  fonte2: '',
  verificada_em: '2026-10-19',
  status: 'revisada',
  observacao: '',
};

describe('CSV', () => {
  it('lê aspas, aspas dobradas, vírgula e quebra de linha dentro do campo', () => {
    const t = '﻿a,b,c\r\n"1, um","diz ""oi""","linha\ndois"\n';
    expect(lerCsv(t)).toEqual([
      ['a', 'b', 'c'],
      ['1, um', 'diz "oi"', 'linha\ndois'],
    ]);
  });

  it('acusa coluna faltando', () => {
    expect(() => lerPerguntas('id,clube\nx,y')).toThrow(/faltam colunas/);
  });

  it('devolve objetos com o número da linha', () => {
    const [p] = lerPerguntas(`${CAB}\n"flamengo-f-01","flamengo","facil","titulos","Em 2019, qual?","a","b","c","d","https://ge.globo.com/x","","2026-10-19","rascunho",""`);
    expect(p.id).toBe('flamengo-f-01');
    expect(p._linha).toBe(2);
  });
});

describe('regras de conteúdo', () => {
  it('pergunta certinha passa', () => {
    expect(validarPergunta(boa)).toEqual([]);
  });

  it('exige ano, "?" e tamanho', () => {
    const e = validarPergunta({ ...boa, pergunta: 'Qual torneio o Flamengo venceu em Lima' });
    expect(e.join(' ')).toMatch(/sem ano/);
    expect(e.join(' ')).toMatch(/não termina/);
    expect(validarPergunta({ ...boa, pergunta: `Em 2019, ${'x'.repeat(140)}?` }).join(' ')).toMatch(/caracteres/);
  });

  it('fonte: domínio aceito; Wikipédia só como fonte2', () => {
    expect(validarPergunta({ ...boa, fonte: 'https://pt.wikipedia.org/wiki/Flamengo' }).join(' ')).toMatch(/Wikipédia/);
    expect(validarPergunta({ ...boa, fonte2: 'https://pt.wikipedia.org/wiki/Flamengo' })).toEqual([]);
    expect(validarPergunta({ ...boa, fonte: 'https://blogqualquer.com/x' }).join(' ')).toMatch(/não aceito/);
    expect(validarPergunta({ ...boa, fonte: 'https://www.cbf.com.br/x' })).toEqual([]);
    expect(validarPergunta({ ...boa, fonte: '' }).join(' ')).toMatch(/sem link/);
  });

  it('palavras proibidas e temas fora da regra', () => {
    expect(validarPergunta({ ...boa, pergunta: 'Em 2019, qual time a Red Bull comprou?' }).join(' ')).toMatch(/"red"/);
    expect(validarPergunta({ ...boa, pergunta: 'Em 2019, qual prêmio o clube ganhou?' }).join(' ')).toMatch(/"premio"/);
    expect(validarPergunta({ ...boa, pergunta: 'Em 2019, qual time foi rebaixado?' }).join(' ')).toMatch(/rebaixa/);
    expect(validarPergunta({ ...boa, pergunta: 'Em 2015, quem foi o mais jovem a marcar?' }).join(' ')).toMatch(/mais jovem/);
    // "morte súbita" é regra do jogo; "redondo" não é "red".
    expect(validarPergunta({ ...boa, pergunta: 'Desde 2016, a morte súbita vale em que fase do redondo torneio?' })).toEqual([]);
  });

  it('id bate com clube e degrau; alternativas diferentes e curtas', () => {
    expect(validarPergunta({ ...boa, id: 'flamengo-c-01' }).join(' ')).toMatch(/não bate/);
    expect(validarPergunta({ ...boa, clube: 'outro' }).join(' ')).toMatch(/não é um dos 20/);
    expect(validarPergunta({ ...boa, errada1: 'libertadores' }).join(' ')).toMatch(/repetidas/);
    expect(validarPergunta({ ...boa, errada2: 'x'.repeat(41) }).join(' ')).toMatch(/máx/);
  });

  it('acha ids e perguntas repetidos entre arquivos', () => {
    const e = validarConjunto([
      { ...boa, _arquivo: 'a.csv', _linha: 2 },
      { ...boa, _arquivo: 'b.csv', _linha: 5 },
    ]);
    expect(e.map((x) => x.erro).join(' ')).toMatch(/id repetido/);
    expect(e.map((x) => x.erro).join(' ')).toMatch(/pergunta repetida/);
  });
});

describe('SQL do import', () => {
  it('revisada vira ativa, aposentada só muda status, rascunho não entra', () => {
    const sql = gerarSql([
      { ...boa, pergunta: "Em 2019, quem é o 'Mengão'?", _lote: 'lote-01' },
      { ...boa, id: 'flamengo-f-02', status: 'aposentada' },
      { ...boa, id: 'flamengo-f-03', status: 'rascunho' },
    ]);
    expect(sql).toMatch(/insert into public\.perguntas/);
    expect(sql).toContain("'Em 2019, quem é o ''Mengão''?'");
    expect(sql).toContain("status = 'aposentada'");
    expect(sql).not.toContain('flamengo-f-03');
    expect(sql.startsWith('begin;')).toBe(true);
  });
});

describe('CSVs do repositório (dados/perguntas)', () => {
  const pasta = fileURLToPath(new URL('../../dados/perguntas/', import.meta.url));
  const csvs = existsSync(pasta) ? readdirSync(pasta).filter((n) => n.endsWith('.csv')) : [];

  it.each(csvs.length ? csvs : ['(nenhum)'])('%s abre e não tem palavra proibida (zero aposta)', (nome) => {
    if (nome === '(nenhum)') return;
    const perguntas = lerPerguntas(readFileSync(join(pasta, nome), 'utf8'));
    const achados = perguntas.flatMap((p) =>
      acharPalavras([p.tema, p.pergunta, p.certa, p.errada1, p.errada2, p.errada3].join(' | ')).map((w) => `${p.id}: "${w}"`),
    );
    expect(achados).toEqual([]);
  });
});
