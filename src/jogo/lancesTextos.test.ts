import { describe, expect, it } from 'vitest';
import {
  EMOJI_DO_LANCE,
  emojisDaPartida,
  linhaValendoHoje,
  montarMedalhas,
  ordenarVitrine,
  progressoDaMedalha,
  situacaoDoResultado,
  textoDaMedalhaNova,
  textoDeCompartilhar,
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

  it('o texto de compartilhar leva os emojis, os pontos, a medalha e o link', () => {
    const t = textoDeCompartilhar({
      desfechos: ['gol', 'defesa', 'gol'],
      pontos: 28,
      paraTime: 'pro Flamengo',
      link: 'https://x/?time=flamengo',
      medalha: 'Bronze no lance Falta de fora da área!',
    });
    expect(t).toBe(
      '⚽ Guerra de Torcidas · Lances do Jogo\n⚽✋⚽ · 28 pontos pro Flamengo\nBronze no lance Falta de fora da área!\nhttps://x/?time=flamengo',
    );
    expect(textoDeCompartilhar({ desfechos: ['fora'], pontos: 1, paraTime: null, link: 'l' })).toBe(
      '⚽ Guerra de Torcidas · Lances do Jogo\n❌ · 1 ponto\nl',
    );
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
