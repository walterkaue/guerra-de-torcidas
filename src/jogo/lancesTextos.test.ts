import { describe, expect, it } from 'vitest';
import {
  EMOJI_DO_LANCE,
  emojisDaPartida,
  linhaValendoHoje,
  montarMedalhas,
  ordenarVitrine,
  progressoDaMedalha,
  linhaRumo,
  linhasRumoDaPartida,
  previaDoProximoGol,
  trilhaDoLance,
  situacaoDoResultado,
  textoDaMedalhaNova,
} from './lancesTextos';

describe('emoji dos lances', () => {
  it('um emoji por lance', () => {
    expect(emojisDaPartida(['gol', 'barreira', 'trave'])).toBe('⚽🚧❌');
    expect(emojisDaPartida(['defesa', 'fora', 'gol'])).toBe('✋❌⚽');
  });

  it('só emoji antigo: sem seletor de variação e nada do bloco novo (🧱 e 🧤 ficam de fora)', () => {
    for (const e of Object.values(EMOJI_DO_LANCE)) {
      expect(e).not.toMatch(/️/);
      // O bloco dos emojis suplementares (🧱, 🧤…) começa em U+1F900.
      expect(e.codePointAt(0)!).toBeLessThan(0x1f900);
    }
  });
});

describe('texto do resultado', () => {
  const base = { fechou: true, contaNoRanking: true, sobSuspeita: false, melhorDoDia: 40 };

  it('conta no ranking: segue o fluxo da subida de posição', () => {
    expect(situacaoDoResultado(base)).toEqual({ tipo: 'ranking', texto: null });
  });

  it('não conta: a melhor do dia continua', () => {
    expect(situacaoDoResultado({ ...base, contaNoRanking: false })).toEqual({
      tipo: 'melhor_do_dia',
      texto: 'Sua melhor de hoje continua a de 40 pontos.',
    });
    expect(situacaoDoResultado({ ...base, contaNoRanking: false, melhorDoDia: null }).texto).toMatch(/ranking não muda/);
  });

  it('suspeita usa o texto dos pênaltis, mesmo que conte', () => {
    expect(situacaoDoResultado({ ...base, sobSuspeita: true, contaNoRanking: false }).texto).toBe(
      'Essa ficou fora do ranking até a gente conferir.',
    );
  });

  it('queda de conexão mostra o aviso com o código e nada de ranking', () => {
    const s = situacaoDoResultado({ ...base, fechou: false, aviso: 'Caiu a conexão (código: rede)' });
    expect(s).toEqual({ tipo: 'sem_pontos', texto: 'Caiu a conexão (código: rede)' });
  });
});

describe('valendo hoje', () => {
  it('mostra feitas e limite; sem resposta, nada', () => {
    expect(linhaValendoHoje({ feitas: 2, limite: 6 })).toBe('Valendo hoje: 2 de 6');
    expect(linhaValendoHoje({ feitas: 9, limite: 6 })).toBe('Valendo hoje: 6 de 6');
    expect(linhaValendoHoje(null)).toBeNull();
  });
  it('selo da medalha nova', () => {
    expect(textoDaMedalhaNova('prata', 'Gol de placa')).toBe('Prata no lance Gol de placa!');
  });
});

describe('progresso das medalhas', () => {
  it('conta quanto falta para a próxima', () => {
    expect(progressoDaMedalha(0, 0).texto).toBe('Faltam 5 gols pro bronze.');
    expect(progressoDaMedalha(4, 1)).toMatchObject({ medalha: null, proxima: { medalha: 'bronze', faltamGols: 1 } });
    expect(progressoDaMedalha(4, 1).texto).toBe('Faltam 1 gol pro bronze.');
    expect(progressoDaMedalha(5, 0)).toMatchObject({ medalha: 'bronze', proxima: { medalha: 'prata', faltamGols: 15 } });
    expect(progressoDaMedalha(20, 3).medalha).toBe('prata');
  });

  it('ouro pede 50 gols e 10 recriando', () => {
    expect(progressoDaMedalha(30, 4).texto).toBe('Faltam 20 gols, 6 deles recriando o lance, pro ouro.');
    // Gols de sobra, mas poucos recriados: os gols que faltam são, no mínimo, os recriados.
    expect(progressoDaMedalha(50, 6)).toMatchObject({ medalha: 'prata', proxima: { medalha: 'ouro', faltamGols: 4, faltamRecriados: 4 } });
    expect(progressoDaMedalha(50, 6).texto).toBe('Faltam 4 gols recriando o lance pro ouro.');
    expect(progressoDaMedalha(50, 10)).toMatchObject({ medalha: 'ouro', proxima: null });
  });
});

describe('suas medalhas', () => {
  const catalogo: Record<string, { titulo: string; clube: string }> = {
    a: { titulo: 'Lance A', clube: 'flamengo' },
    b: { titulo: 'Lance B', clube: 'flamengo' },
    c: { titulo: 'Lance C', clube: 'selecao' },
  };
  const ficha = (id: string) => catalogo[id];

  it('agrupa por clube e por lance, maior medalha primeiro, sem lance fora do catálogo ou sem gol', () => {
    const r = montarMedalhas(
      [
        { lance_id: 'a', gols: 5, recriados: 1, medalha: 'bronze' },
        { lance_id: 'b', gols: 22, recriados: 2, medalha: 'prata' },
        { lance_id: 'c', gols: 2, recriados: 0, medalha: null },
        { lance_id: 'sumiu', gols: 60, recriados: 20, medalha: 'ouro' },
        { lance_id: 'a2', gols: 0, recriados: 0, medalha: null },
      ],
      ficha,
    );
    expect(r.porLance.map((l) => l.lanceId)).toEqual(['b', 'a', 'c']);
    expect(r.porLance[2].progresso.texto).toBe('Faltam 3 gols pro bronze.');
    expect(r.porClube).toEqual([
      { clube: 'flamengo', bronze: 1, prata: 1, ouro: 0, lances: 2 },
      { clube: 'selecao', bronze: 0, prata: 0, ouro: 0, lances: 1 },
    ]);
  });

  it('sem linhas, tudo vazio', () => {
    expect(montarMedalhas([], ficha)).toEqual({ porClube: [], porLance: [] });
  });
});

describe('vitrine das torcidas', () => {
  it('ordena por ouro, depois prata e bronze, e tira quem não tem nada', () => {
    const v = ordenarVitrine([
      { time_id: 'b', ouro: 1, prata: 9, bronze: 9 },
      { time_id: 'a', ouro: 3, prata: 0, bronze: 0 },
      { time_id: 'z', ouro: 0, prata: 0, bronze: 0 },
      { time_id: 'c', ouro: 1, prata: 9, bronze: 10 },
    ]);
    expect(v.map((l) => l.time_id)).toEqual(['a', 'c', 'b']);
  });
});

describe('trilha de 3 medalhas (seção 14.3)', () => {
  it('23 gols: bronze e prata cheias, ouro em parte, "faltam 27"', () => {
    const t = trilhaDoLance(23, 4);
    expect(t.marcos.map((m) => m.conquistada)).toEqual([true, true, false]);
    expect(t.marcos[2].parcial).toBeCloseTo(0.1);
    expect(t.enche).toBeCloseTo(2 / 3 + 0.1 / 3);
    expect(t.rotulo).toBe('23 gols · faltam 27');
    expect(t.faltaProOuro).toBe('Faltam 27 gols, 6 recriando, pro ouro.');
    expect(t.recriadosDoOuro).toEqual({ feitos: 4, pede: 10 });
    expect(t.ouroCompleto).toBe(false);
  });

  it('zero gol: nada cheio, próxima é o bronze', () => {
    const t = trilhaDoLance(0, 0);
    expect(t.enche).toBe(0);
    expect(t.proxima).toBe('bronze');
    expect(t.rotulo).toBe('0 gols · faltam 5');
    expect(t.faltaProOuro).toBe('Faltam 50 gols, 10 recriando, pro ouro.');
  });

  it('gols de sobra, faltando recriados: a bolinha do ouro enche pelos recriados', () => {
    const t = trilhaDoLance(52, 6);
    expect(t.medalha).toBe('prata');
    expect(t.marcos[2].parcial).toBeCloseTo(0.6);
    expect(t.rotulo).toBe('52 gols · faltam 4 recriando');
    expect(t.faltaProOuro).toBe('Faltam 4 gols, 4 recriando, pro ouro.');
  });

  it('ouro completo ganha brilho e a linha toda cheia', () => {
    const t = trilhaDoLance(50, 10);
    expect(t.ouroCompleto).toBe(true);
    expect(t.enche).toBe(1);
    expect(t.rotulo).toBe('50 gols · ouro completo');
    expect(t.faltaProOuro).toBe('Ouro completo!');
  });

  it('linha do resultado', () => {
    expect(linhaRumo({ gols: 23, recriados: 4 }, { gols: 24, recriados: 4 })).toEqual({ texto: '+1 rumo ao ouro · 24/50', subiu: null });
    expect(linhaRumo({ gols: 3, recriados: 0 }, { gols: 3, recriados: 0 }).texto).toBe('Rumo ao bronze · 3/5');
    expect(linhaRumo({ gols: 18, recriados: 0 }, { gols: 20, recriados: 1 })).toEqual({ texto: '+2 rumo ao ouro · 20/50', subiu: 'prata' });
    expect(linhaRumo({ gols: 4, recriados: 0 }, { gols: 5, recriados: 0 })).toEqual({ texto: '+1 rumo à prata · 5/20', subiu: 'bronze' });
    expect(linhaRumo({ gols: 55, recriados: 6 }, { gols: 56, recriados: 7 }).texto).toBe('+1 rumo ao ouro · 7/10 recriando');
    expect(linhaRumo({ gols: 52, recriados: 9 }, { gols: 53, recriados: 10 })).toEqual({ texto: '+1 · ouro completo · 53 gols', subiu: 'ouro' });
  });

  it('uma linha por lance da partida, sem repetir, com o antes tirado da leitura de depois', () => {
    const l = linhasRumoDaPartida(
      [
        { id: 'a', gol: true, recriou: false },
        { id: 'b', gol: false, recriou: false },
        { id: 'a', gol: true, recriou: true },
      ],
      [{ lance_id: 'a', gols: 20, recriados: 2, medalha: 'prata' }],
    );
    expect(l).toEqual([
      { lanceId: 'a', linha: { texto: '+2 rumo ao ouro · 20/50', subiu: 'prata' } },
      { lanceId: 'b', linha: { texto: 'Rumo ao bronze · 0/5', subiu: null } },
    ]);
  });

  it('prévia do próximo gol na ficha', () => {
    expect(previaDoProximoGol(23, 4)).toBe('+1 rumo ao ouro · 24/50');
    expect(previaDoProximoGol(49, 9)).toBe('+1 · ouro completo · 50 gols');
  });
});
