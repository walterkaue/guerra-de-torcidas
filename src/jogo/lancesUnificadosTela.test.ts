// Conta pura das telas dos Lances unificados (docs/jogo.md, seção 14.7): medalhas das disputas de pênaltis,
// ordem da tela única, textos das 3 melhores do dia e do limite.
import { describe, expect, it } from 'vitest';
import { DICAS } from './dicas';
import {
  AVISO_LIMITE_DO_DIA,
  faixaNaTela,
  golsDaDisputa,
  linhaMelhoresDoDia,
  linhaRumoDisputa,
  montarMedalhas,
  ordenarTelaUnica,
  progressoDaDisputa,
  progressoDoItem,
  situacaoDoResultado,
  textoForaDasMelhores,
  trilhaDaDisputa,
  trilhaDoItem,
  trilhaDoLance,
} from './lancesTextos';
import { itemPenaltis } from './regraLances';

describe('medalhas das disputas de pênaltis (10 · 50 · 100, ouro com 10 vitórias)', () => {
  it('progresso: gols até a prata, e gols e vitórias no ouro', () => {
    expect(progressoDaDisputa(0, 0)).toMatchObject({ medalha: null, texto: 'Faltam 10 gols pro bronze.' });
    expect(progressoDaDisputa(10, 0)).toMatchObject({ medalha: 'bronze', proxima: { medalha: 'prata', faltamGols: 40 } });
    expect(progressoDaDisputa(60, 3).texto).toBe('Faltam 40 gols e 7 vitórias pro ouro.');
    expect(progressoDaDisputa(120, 9)).toMatchObject({ medalha: 'prata', proxima: { medalha: 'ouro', faltamGols: 0, faltamVitorias: 1 } });
    expect(progressoDaDisputa(120, 9).texto).toBe('Faltam 1 vitória pro ouro.');
    expect(progressoDaDisputa(100, 10)).toMatchObject({ medalha: 'ouro', proxima: null, texto: 'Ouro conquistado.' });
  });

  it('trilha: marcos 10, 50 e 100, barra de vitórias no lugar dos recriados', () => {
    const t = trilhaDaDisputa(30, 2);
    expect(t.marcos.map((m) => m.gols)).toEqual([10, 50, 100]);
    expect(t.marcos.map((m) => m.conquistada)).toEqual([true, false, false]);
    expect(t.marcos[1].parcial).toBeCloseTo(0.5);
    expect(t.enche).toBeCloseTo((1 + 0.5) / 3);
    expect(t.rotulo).toBe('30 gols · faltam 20');
    expect(t.extraDoOuro).toEqual({ rotulo: 'Vitórias', feitos: 2, pede: 10 });
    expect(t.recriadosDoOuro).toEqual({ feitos: 2, pede: 10 });
    expect(t.faltaProOuro).toBe('Faltam 70 gols e 8 vitórias pro ouro.');
  });

  it('gols de sobra e faltando vitórias: o rótulo pede vitórias', () => {
    const t = trilhaDaDisputa(130, 7);
    expect(t.medalha).toBe('prata');
    expect(t.rotulo).toBe('130 gols · faltam 3 vitórias');
    expect(t.faltaProOuro).toBe('Faltam 3 vitórias pro ouro.');
    expect(t.marcos[2].parcial).toBeCloseTo(0.7);
  });

  it('ouro completo', () => {
    const t = trilhaDaDisputa(100, 12);
    expect(t.ouroCompleto).toBe(true);
    expect(t.rotulo).toBe('100 gols · ouro completo');
    expect(t.extraDoOuro.feitos).toBe(10);
  });

  it('pelo id: penaltis:… segue a régua dos pênaltis; lance, a de sempre', () => {
    expect(progressoDoItem('penaltis:x', { gols: 5, recriados: 0, vitorias: 0 }).medalha).toBeNull();
    expect(progressoDoItem('algum-lance', { gols: 5, recriados: 0 }).medalha).toBe('bronze');
    expect(trilhaDoItem('penaltis:x', { gols: 12, recriados: 0, vitorias: 1 }).extraDoOuro.rotulo).toBe('Vitórias');
    expect(trilhaDoItem('algum-lance', { gols: 12, recriados: 1 })).toEqual(trilhaDoLance(12, 1));
    expect(trilhaDoLance(12, 1).extraDoOuro).toEqual({ rotulo: 'Recriados', feitos: 1, pede: 10 });
  });

  it('Conquistas: pênaltis entram só quando a ficha os conhece', () => {
    const linhas = [
      { lance_id: 'lance-a', gols: 6, recriados: 1, medalha: 'bronze' as const },
      { lance_id: itemPenaltis('fla-2022'), gols: 12, recriados: 0, vitorias: 2, medalha: 'bronze' as const },
      { lance_id: itemPenaltis('fla-1999'), gols: 55, recriados: 0, vitorias: 4, medalha: 'prata' as const },
    ];
    const semPenaltis = montarMedalhas(linhas, (id) => (id === 'lance-a' ? { titulo: 'A', clube: 'flamengo' } : undefined));
    expect(semPenaltis.porLance.map((l) => l.lanceId)).toEqual(['lance-a']);
    const com = montarMedalhas(linhas, (id) =>
      id === 'lance-a'
        ? { titulo: 'A', clube: 'flamengo' }
        : { titulo: 'Disputa', clube: 'flamengo' },
    );
    expect(com.porLance.map((l) => [l.lanceId, l.penaltis, l.vitorias, l.progresso.medalha])).toEqual([
      [itemPenaltis('fla-1999'), true, 4, 'prata'],
      [itemPenaltis('fla-2022'), true, 2, 'bronze'],
      ['lance-a', false, 0, 'bronze'],
    ]);
    expect(com.porClube).toEqual([{ clube: 'flamengo', bronze: 2, prata: 1, ouro: 0, lances: 3 }]);
  });
});

describe('tela única: favoritos, seu time, Seleção e outros', () => {
  const itens = [
    { id: 'outro-1', clube: 'santos' },
    { id: 'sel-1', clube: 'selecao' },
    { id: 'meu-1', clube: 'flamengo' },
    { id: itemPenaltis('disputa-fla'), clube: 'flamengo' },
    { id: itemPenaltis('disputa-fla2'), clube: 'flamengo' },
    { id: 'outro-2', clube: 'bahia' },
  ];
  type Numeros = { gols: number; recriados: number; vitorias?: number };
  const ids = (filtro: 'todos' | 'meus' | 'perto', medalhas = new Map<string, Numeros>(), favs: string[] = []) =>
    ordenarTelaUnica(itens, medalhas, filtro, new Set(favs), 'flamengo').map((i) => i.id);

  it('Todos', () => {
    expect(ids('todos')).toEqual(['meu-1', itemPenaltis('disputa-fla'), itemPenaltis('disputa-fla2'), 'sel-1', 'outro-1', 'outro-2']);
    expect(ids('todos', new Map(), ['outro-2'])).toEqual(['outro-2', 'meu-1', itemPenaltis('disputa-fla'), itemPenaltis('disputa-fla2'), 'sel-1', 'outro-1']);
  });

  it('Meus troféus: só com medalha, cada item pela régua dele', () => {
    const m = new Map<string, Numeros>([
      ['outro-1', { gols: 5, recriados: 0 }],
      [itemPenaltis('disputa-fla'), { gols: 10, recriados: 0, vitorias: 0 }],
    ]);
    expect(ids('meus', m)).toEqual([itemPenaltis('disputa-fla'), 'outro-1']);
  });

  it('Perto do próximo: pelo que falta; ouro completo no fim; favoritos no topo', () => {
    const m = new Map<string, Numeros>([
      ['outro-1', { gols: 4, recriados: 0 }], // falta 1 pro bronze
      [itemPenaltis('disputa-fla2'), { gols: 7, recriados: 0, vitorias: 0 }], // faltam 3
      ['sel-1', { gols: 50, recriados: 10 }], // ouro completo
      [itemPenaltis('disputa-fla'), { gols: 100, recriados: 0, vitorias: 8 }], // faltam 2 vitórias
    ]);
    expect(ids('perto', m)).toEqual(['outro-1', itemPenaltis('disputa-fla'), itemPenaltis('disputa-fla2'), 'meu-1', 'outro-2', 'sel-1']);
    expect(ids('perto', m, ['sel-1'])[0]).toBe('sel-1');
  });
});

describe('textos da regra nova', () => {
  it('limite do dia: 10 somando pênaltis e Lances, e a partida vira treino', () => {
    expect(AVISO_LIMITE_DO_DIA).toBe('Hoje já deu: 10 partidas valendo. Essa vai de treino: sem ponto nem medalha.');
    expect(DICAS.lan_dez_valendo).toBe('Hoje as 10 valendo já foram. Treine à vontade.');
    expect(DICAS.lan_recriar_oito).toContain('+8');
  });

  it('Suas 3 melhores de hoje', () => {
    expect(linhaMelhoresDoDia(null)).toBeNull();
    expect(linhaMelhoresDoDia([])).toBe('Suas 3 melhores do dia contam');
    expect(linhaMelhoresDoDia([96])).toBe('Sua melhor hoje: 96');
    expect(linhaMelhoresDoDia([96, 72])).toBe('Suas melhores hoje: 96 · 72');
    expect(linhaMelhoresDoDia([96, 72, 54, 10])).toBe('Suas 3 melhores hoje: 96 · 72 · 54');
  });

  it('fora das 3 melhores', () => {
    expect(textoForaDasMelhores()).toBe('Não superou suas 3 melhores de hoje: o ranking não muda.');
    expect(textoForaDasMelhores([96, 72, 54])).toBe('Não entrou nas suas 3 melhores de hoje: 96 · 72 · 54.');
    const base = { fechou: true, contaNoRanking: false, sobSuspeita: false, melhorDoDia: 96 };
    expect(situacaoDoResultado({ ...base, melhoresDoDia: [96, 72, 54] })).toEqual({
      tipo: 'melhor_do_dia',
      texto: 'Não entrou nas suas 3 melhores de hoje: 96 · 72 · 54.',
    });
    // Sem o campo (servidor de antes ou regra de antes): o texto de sempre.
    expect(situacaoDoResultado(base).texto).toBe('Sua melhor de hoje continua a de 96 pontos.');
    expect(situacaoDoResultado({ ...base, contaNoRanking: true, melhoresDoDia: [96] })).toEqual({ tipo: 'ranking', texto: null });
  });

  it('faixa na tela: a do catálogo recalibrado com a tabela nova', () => {
    expect(faixaNaTela({ faixa: 'facil', faixaUnificada: 'dificil' })).toEqual({ faixa: 'dificil', pontos: 36 });
    expect(faixaNaTela({ faixa: 'media' })).toEqual({ faixa: 'media', pontos: 30 });
  });
});

describe('linha do resultado da disputa (rumo à medalha)', () => {
  it('conta os gols das 8 primeiras cobranças', () => {
    const c = (...d: string[]) => d.map((desfecho) => ({ desfecho }));
    expect(golsDaDisputa(c('gol', 'defesa', 'gol', 'trave', 'gol'))).toBe(3);
    expect(golsDaDisputa(c(...Array(10).fill('gol')))).toBe(8);
  });

  it('+N rumo ao bronze, com a conta dos gols', () => {
    expect(linhaRumoDisputa({ gols: 5, vitorias: 0 }, { gols: 8, vitorias: 0 })).toEqual({ texto: '+3 rumo ao bronze · 8/10', subiu: null });
  });

  it('sobe de medalha: bronze nos 10 gols, prata nos 50', () => {
    expect(linhaRumoDisputa({ gols: 8, vitorias: 0 }, { gols: 11, vitorias: 1 })).toEqual({ texto: '+3 rumo à prata · 11/50', subiu: 'bronze' });
    expect(linhaRumoDisputa({ gols: 48, vitorias: 3 }, { gols: 52, vitorias: 4 }).subiu).toBe('prata');
  });

  it('gols de sobra: falta vencer; ouro só com as vitórias', () => {
    expect(linhaRumoDisputa({ gols: 98, vitorias: 8 }, { gols: 103, vitorias: 9 })).toEqual({ texto: '+5 rumo ao ouro · 9/10 vitórias', subiu: null });
    expect(linhaRumoDisputa({ gols: 103, vitorias: 9 }, { gols: 106, vitorias: 10 })).toEqual({ texto: '+3 · ouro completo · 106 gols', subiu: 'ouro' });
  });

  it('partida sem gol: "Rumo ao bronze"', () => {
    expect(linhaRumoDisputa({ gols: 4, vitorias: 0 }, { gols: 4, vitorias: 0 }).texto).toBe('Rumo ao bronze · 4/10');
  });
});
