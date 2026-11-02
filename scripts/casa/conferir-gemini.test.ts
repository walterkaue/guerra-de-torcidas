import { describe, expect, it } from 'vitest';
import { anosNaPagina, classificarLink, dataPorExtenso, fatoDe, linksAceitos, linksMd, motivoCampo, motivoChave, numerosDe, observacaoConfirmada, textoDaPagina, trechoNaPagina } from './conferir-gemini.mjs';

describe('conferir-gemini (partes puras)', () => {
  it('tira tags e decodifica entidades da página', () => {
    const html = '<html><script>x=1</script><p>Cruzeiro&nbsp;&#8211; 6 t&iacute;tulos</p><style>p{}</style></html>';
    expect(textoDaPagina(html)).toBe('Cruzeiro – 6 títulos');
    expect(textoDaPagina('Gr&ecirc;mio, S&atilde;o Paulo, Gr&Ecirc;MIO, Con&ccedil;&atilde;o')).toBe('Grêmio, São Paulo, GrÊMIO, Conção');
    expect(textoDaPagina('<b>S&atilde;o</b> &#225;')).toContain('á');
  });

  it('lê números sem separador de milhar', () => {
    expect(numerosDe('Fábio – 976 jogos; 1.012 no total')).toEqual([976, 1012]);
    expect(numerosDe('14 x 0')).toEqual([14, 0]);
  });

  it('só aceita trecho que está na página (ignorando acento e pontuação)', () => {
    const pagina = 'Lista: 1998 Cruzeiro (Brasil) River Plate (Argentina). Fim.';
    expect(trechoNaPagina('1998 Cruzeiro (Brasil) River Plate', pagina)).toBe(true);
    expect(trechoNaPagina('1998 CRUZEIRO brasil river plate', pagina)).toBe(true);
    expect(trechoNaPagina('1999 Cruzeiro (Brasil) River Plate', pagina)).toBe(false);
    expect(trechoNaPagina('1998', pagina)).toBe(false); // curto demais para provar algo
  });

  it('título: o trecho precisa do ano e do clube (ou ser o site do próprio clube)', () => {
    const l = { clube: 'cruzeiro', competicao: 'copa-do-brasil', ano: '2017' };
    expect(motivoChave('titulos', l, 'Cruzeiro: 6 títulos (1993, 1996, 2000, 2003, 2017 e 2018)', 'trivela.com.br')).toBeNull();
    expect(motivoChave('titulos', l, 'Cruzeiro: 1993, 1996, 2000', 'trivela.com.br')).toMatch(/ano 2017/);
    expect(motivoChave('titulos', l, 'Campeão em 2017 e 2018', 'trivela.com.br')).toMatch(/clube/);
    expect(motivoChave('titulos', l, 'Campeão em 2017 e 2018', 'cruzeiro.com.br')).toBeNull();
    expect(motivoChave('titulos', { ...l, clube: 'sao-paulo' }, 'São Paulo campeão em 2017', 'ge.globo.com')).toBeNull();
  });

  it('recorde: número e nome da pessoa no trecho', () => {
    const l = { clube: 'cruzeiro', lista: 'jogos', posicao: '1', nome: 'Fábio', valor: '976' };
    expect(motivoChave('recordes', l, '1. Fábio – 976 jogos', 'lance.com.br')).toBeNull();
    expect(motivoChave('recordes', l, '1. Fábio – 975 jogos', 'lance.com.br')).toMatch(/976/);
    expect(motivoChave('recordes', { ...l, nome: 'Dirceu Lopes', valor: '610' }, 'Dirceu Lopes – 610 jogos', 'lance.com.br')).toBeNull();
    expect(motivoChave('recordes', { ...l, nome: 'Dirceu Lopes', valor: '610' }, 'Zé Carlos – 610 jogos', 'lance.com.br')).toMatch(/Dirceu/);
  });

  it('goleada: placar e adversário no trecho', () => {
    const l = { clube: 'cruzeiro', placar: '14 x 0', adversario: 'Alves Nogueira' };
    expect(motivoChave('goleadas', l, 'goleou Alves Nogueira por 14 a 0', 'lance.com.br')).toBeNull();
    expect(motivoChave('goleadas', l, 'goleou Alves Nogueira por 10 a 0', 'lance.com.br')).toMatch(/placar/);
    expect(motivoChave('goleadas', l, 'goleou por 14 a 0', 'lance.com.br')).toMatch(/Alves/);
  });

  it('busca: colhe só links de domínio aceito que não são a página inicial', () => {
    const html = [
      '<a href="https://www.saopaulofc.net/spfcpedia/conquistas/">a</a>',
      '<a href="https://www.lance.com.br/">home</a>',
      '<a href="https://blog.qualquer.com/lista">fora</a>',
      '<a href="https://ge.globo.com/futebol/lista.ghtml?x=1&amp;y=2#topo">ge</a>',
    ].join('');
    expect(linksAceitos(html)).toEqual(['https://www.saopaulofc.net/spfcpedia/conquistas/', 'https://ge.globo.com/futebol/lista.ghtml?x=1&y=2']);
  });

  it('busca: conta os anos que aparecem soltos na página', () => {
    expect(anosNaPagina('Santos: 1935, 1955 e 1956. Placar 2019x1', ['1935', '1956', '1958', '2019'])).toBe(2);
  });

  it('campos: data com ano e dia, cidade pelo nome, número sem separador', () => {
    expect(dataPorExtenso('1921-01-02')).toBe('2 de janeiro de 1921');
    expect(dataPorExtenso('2014')).toBe('2014');
    const c = { fundacao: '1921-01-02', cidade: 'Belo Horizonte', capacidade: '61927' };
    expect(motivoCampo('fundacao', c, 'em 2 de janeiro de 1921, nascia o Palestra')).toBeNull();
    expect(motivoCampo('fundacao', c, 'fundado em 02/01/1921')).toBeNull();
    expect(motivoCampo('fundacao', c, 'fundado em 1921')).toMatch(/dia 2/);
    expect(motivoCampo('fundacao', c, 'em 2 de janeiro de 1922')).toMatch(/1921/);
    expect(motivoCampo('cidade', c, 'o clube de Belo Horizonte')).toBeNull();
    expect(motivoCampo('cidade', c, 'o clube mineiro')).toMatch(/Belo Horizonte/);
    expect(motivoCampo('capacidade', c, 'cabem até 61.927 torcedores')).toBeNull();
    expect(motivoCampo('inauguracao', { inauguracao: '2014' }, 'inaugurado em 2014')).toBeNull();
  });

  it('monta o fato e a observação', () => {
    expect(fatoDe('titulos', { clube: 'cruzeiro', competicao: 'estadual', nota: 'Campeonato Mineiro', ano: '1928' })).toBe(
      'O cruzeiro foi campeão de Campeonato Mineiro em 1928.',
    );
    const obs = observacaoConfirmada('Lista do Lance.', 'Cruzeiro "38" 1928', 'lance.com.br', 'gemini-3.5-flash-lite', '2026-10-25');
    expect(obs).toBe(`Lista do Lance. Conferido em 25/10/2026 por script (gemini-3.5-flash-lite, trecho literal em lance.com.br): "Cruzeiro '38' 1928".`);
  });
});

describe('conferir-casa --links', () => {
  const url = 'https://sociorei.com/';

  it('separa página que abre, quebrada e bloqueio de robô', () => {
    expect(classificarLink(url, { status: 200, final: url }, 'santos').estado).toBe('ok');
    expect(classificarLink(url, { status: 404, final: url }, 'santos')).toEqual({ estado: 'quebrado', motivo: 'HTTP 404' });
    expect(classificarLink(url, { status: 500, final: url }, 'santos').estado).toBe('quebrado');
    expect(classificarLink(url, { erro: 'ENOTFOUND' }, 'santos')).toEqual({ estado: 'quebrado', motivo: 'não abriu (ENOTFOUND)' });
    expect(classificarLink(url, { status: 403, final: url }, 'santos').estado).toBe('conferir');
    expect(classificarLink(url, { erro: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' }, 'santos').estado).toBe('conferir');
  });

  it('avisa quando a página troca de domínio ou cai na home do clube', () => {
    expect(classificarLink(url, { status: 200, final: 'https://outro.com.br/' }, 'santos').estado).toBe('mudou');
    expect(classificarLink(url, { status: 200, final: 'https://www.santosfc.com.br/' }, 'santos')).toEqual({
      estado: 'mudou',
      motivo: 'caiu na home do clube (https://www.santosfc.com.br/)',
    });
    expect(classificarLink('https://socios.chapecoense.com/', { status: 200, final: 'https://socios.chapecoense.com/Login.aspx' }, 'chapecoense').estado).toBe('ok');
  });

  it('monta o relatório', () => {
    const md = linksMd([{ id: 'santos', url, estado: 'ok', motivo: 'HTTP 200' }, { id: 'mirassol', url: '', estado: 'sem link', motivo: 'linha sem url' }], '2026-10-31');
    expect(md).toContain('Rodada de 31/10/2026');
    expect(md).toContain(`| santos | ok | ${url} | HTTP 200 |`);
    expect(md).toContain('| mirassol | sem link | — | linha sem url |');
  });
});
