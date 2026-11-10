import { describe, expect, it } from 'vitest';
import {
  BOTAO_PROXIMO_GOL,
  BOTAO_VER_DE_NOVO,
  botaoDoQuadroParado,
  botaoVerOsGols,
  casaDaFita,
  legendaDoTelao,
  linhaDosGolsContinuam,
  linhaNenhumGol,
  modoDoTelao,
  quadrosParados,
  quemChamou,
  rotuloDaFaixa,
  rotuloDaFitaDele,
  rotuloDoTelao,
  sementeDoCodigo,
  sequenciaDeGols,
  tarjaDoReplay,
  type TentativaVista,
} from './golsDoDesafio';
import { TABELA_LANCES_UNIFICADA, FAIXAS } from './lances';

const gol = (pontos: number, recriou = false): TentativaVista => ({ desfecho: 'gol', recriou, pontos });
const sem = (desfecho: 'defesa' | 'barreira' | 'trave' | 'fora'): TentativaVista => ({ desfecho, recriou: false, pontos: 0 });

describe('casa da fita', () => {
  it('gol carimbado: ícone de bola, palavra Carimbou e pontos com +', () => {
    expect(casaDaFita(gol(50, true), 0)).toEqual({
      gol: true,
      carimbou: true,
      icone: 'bola',
      palavra: 'Carimbou',
      pontos: '+50',
      rotulo: '1ª tentativa: carimbou o lance, 50 pontos',
    });
  });

  it('gol sem carimbo é casa de gol com a palavra Gol', () => {
    const c = casaDaFita(gol(42), 2);
    expect(c).toMatchObject({ gol: true, carimbou: false, icone: 'bola', palavra: 'Gol', pontos: '+42' });
    expect(c.rotulo).toBe('3ª tentativa: gol, 42 pontos');
  });

  it('cada desfecho sem gol tem ícone, palavra e frase próprios, e 0 ponto', () => {
    expect(casaDaFita(sem('defesa'), 1)).toMatchObject({ gol: false, icone: 'mao', palavra: 'Pegou', pontos: '0', rotulo: '2ª tentativa: o goleiro pegou, 0 pontos' });
    expect(casaDaFita(sem('barreira'), 0)).toMatchObject({ icone: 'barreira', palavra: 'Barreira', rotulo: '1ª tentativa: bateu na barreira, 0 pontos' });
    // Trave e fora usam o mesmo ícone, e a palavra diz a diferença.
    expect(casaDaFita(sem('trave'), 0)).toMatchObject({ icone: 'xis', palavra: 'Trave', rotulo: '1ª tentativa: bateu na trave, 0 pontos' });
    expect(casaDaFita(sem('fora'), 0)).toMatchObject({ icone: 'xis', palavra: 'Fora', rotulo: '1ª tentativa: chutou pra fora, 0 pontos' });
  });

  it('1 ponto no singular', () => {
    expect(casaDaFita(gol(1), 0).rotulo).toBe('1ª tentativa: gol, 1 ponto');
  });
});

describe('telão', () => {
  it('a sequência tem só os gols, na ordem, com o índice da tentativa de cada um', () => {
    const seq = sequenciaDeGols([gol(50, true), sem('defesa'), gol(36)]);
    expect(seq.map((g) => g.indice)).toEqual([0, 2]);
    expect(seq.map((g) => g.tentativa.pontos)).toEqual([50, 36]);
    // A do meio é a única que dá gol: o índice continua o da fita.
    expect(sequenciaDeGols([sem('fora'), gol(30), sem('trave')]).map((g) => g.indice)).toEqual([1]);
  });

  it('sem gol, ou sem tentativas, a sequência é vazia (e o telão não aparece)', () => {
    expect(sequenciaDeGols([sem('defesa'), sem('barreira'), sem('fora')])).toEqual([]);
    expect(sequenciaDeGols(null)).toEqual([]);
    expect(sequenciaDeGols(undefined)).toEqual([]);
  });

  it('tarja: "REPLAY · 2ª TENTATIVA"', () => {
    expect(tarjaDoReplay(0)).toBe('REPLAY · 1ª TENTATIVA');
    expect(tarjaDoReplay(1)).toBe('REPLAY · 2ª TENTATIVA');
    expect(tarjaDoReplay(2)).toBe('REPLAY · 3ª TENTATIVA');
  });

  it('legenda: carimbou ou gol, com os pontos', () => {
    expect(legendaDoTelao(gol(50, true))).toBe('Carimbou o lance! +50');
    expect(legendaDoTelao(gol(42))).toBe('Gol +42');
  });

  it('rótulo do canvas, com e sem apelido', () => {
    expect(rotuloDoTelao('Camisa10', 'Gol de falta')).toBe('Replay dos gols de Camisa10 no lance Gol de falta');
    expect(rotuloDoTelao(null, 'Gol de falta')).toBe('Replay dos gols de quem te chamou no lance Gol de falta');
    expect(rotuloDoTelao('  ', 'Gol de falta')).toBe('Replay dos gols de quem te chamou no lance Gol de falta');
  });
});

describe('textos de quem chamou', () => {
  it('com e sem apelido, e nunca "do" ou "da" antes do apelido', () => {
    expect(linhaDosGolsContinuam('Camisa10')).toBe('Os gols de Camisa10 continuam aqui pra você ver.');
    expect(linhaDosGolsContinuam(null)).toBe('Os gols de quem te chamou continuam aqui pra você ver.');
    expect(botaoVerOsGols('Camisa10')).toBe('Ver os gols de Camisa10');
    expect(botaoVerOsGols(undefined)).toBe('Ver os gols de quem te chamou');
    expect(rotuloDaFitaDele('Camisa10')).toBe('Camisa10');
    expect(rotuloDaFitaDele(null)).toBe('Quem te chamou');
    expect(quemChamou(' Zé ')).toBe('Zé');

    const todos = [
      linhaDosGolsContinuam('Camisa10'),
      linhaDosGolsContinuam(null),
      botaoVerOsGols('Camisa10'),
      botaoVerOsGols(null),
      rotuloDoTelao('Camisa10', 'X'),
      rotuloDoTelao(null, 'X'),
    ];
    for (const t of todos) expect(t).not.toMatch(/\b(do|da|dos|das)\s+(Camisa10|quem)/i);
  });

  it('nenhum texto novo usa as palavras proibidas de aposta', () => {
    const proibidas = /\b(aposta|apostar|bet|odd|odds|cotação|banca|green|red)\b/i;
    const textos = [
      linhaNenhumGol('craque', 42),
      linhaDosGolsContinuam('Zé'),
      botaoVerOsGols('Zé'),
      legendaDoTelao(gol(50, true)),
      tarjaDoReplay(0),
      BOTAO_PROXIMO_GOL,
      BOTAO_VER_DE_NOVO,
      ...[gol(50, true), gol(30), sem('defesa'), sem('barreira'), sem('trave'), sem('fora')].map((t) => casaDaFita(t, 0).rotulo),
    ];
    for (const t of textos) expect(t).not.toMatch(proibidas);
  });
});

describe('nenhum gol nas 3', () => {
  it('a linha traz a faixa e o valor do gol', () => {
    expect(linhaNenhumGol('dificil', 36)).toBe('Nenhum gol nas 3. Mesmo lance, mesma faixa: Difícil, gol vale 36.');
    expect(linhaNenhumGol('facil', 24)).toBe('Nenhum gol nas 3. Mesmo lance, mesma faixa: Fácil, gol vale 24.');
  });

  it('os quatro rótulos de faixa e os pontos da tabela de hoje', () => {
    expect(FAIXAS.map((f) => rotuloDaFaixa(f))).toEqual(['Fácil', 'Média', 'Difícil', 'Craque']);
    for (const f of FAIXAS) {
      const linha = linhaNenhumGol(f, TABELA_LANCES_UNIFICADA.faixa[f]);
      expect(linha).toContain(`gol vale ${TABELA_LANCES_UNIFICADA.faixa[f]}.`);
    }
  });

  it('faixa desconhecida: a linha perde o pedaço que falta, sem inventar', () => {
    expect(linhaNenhumGol('lenda', 50)).toBe('Nenhum gol nas 3. Mesmo lance, mesma faixa.');
    expect(linhaNenhumGol('media')).toBe('Nenhum gol nas 3. Mesmo lance, mesma faixa: Média.');
  });
});

describe('sem movimento', () => {
  it('vários gols: um quadro final por gol, e o botão diz Próximo gol até o último', () => {
    const q = quadrosParados(2);
    expect(q).toEqual([{ gol: 0, momento: 'fim' }, { gol: 1, momento: 'fim' }]);
    expect(botaoDoQuadroParado(q, 0)).toBe('Próximo gol');
    expect(botaoDoQuadroParado(q, 1)).toBe('Ver de novo');
  });

  it('um gol só: "Ver de novo" alterna o quadro final e o do começo', () => {
    const q = quadrosParados(1);
    expect(q).toEqual([{ gol: 0, momento: 'fim' }, { gol: 0, momento: 'inicio' }]);
    expect(botaoDoQuadroParado(q, 0)).toBe('Ver de novo');
    expect(botaoDoQuadroParado(q, 1)).toBe('Ver de novo');
  });

  it('sem gols, sem quadros', () => {
    expect(quadrosParados(0)).toEqual([]);
  });

  it('o modo: movimento reduzido baixa e para; economia de dados e qualidade Leve só baixam no toque; senão roda', () => {
    const base = { reduzido: false, economiaDeDados: false, qualidadeLeve: false };
    expect(modoDoTelao(base)).toBe('movimento');
    expect(modoDoTelao({ ...base, reduzido: true })).toBe('parado');
    expect(modoDoTelao({ ...base, economiaDeDados: true })).toBe('sob_demanda');
    expect(modoDoTelao({ ...base, qualidadeLeve: true })).toBe('parado');
    expect(modoDoTelao({ reduzido: true, economiaDeDados: true, qualidadeLeve: true })).toBe('sob_demanda');
  });
});

describe('semente do código', () => {
  it('o mesmo código dá sempre a mesma semente, e códigos diferentes dão sementes diferentes', () => {
    expect(sementeDoCodigo('ABCD2345')).toBe(sementeDoCodigo('ABCD2345'));
    expect(sementeDoCodigo('ABCD2345')).not.toBe(sementeDoCodigo('ABCD2346'));
    expect(sementeDoCodigo('abcdefgh')).toBeGreaterThanOrEqual(0);
    expect(sementeDoCodigo('abcdefgh')).toBeLessThan(2 ** 32);
    expect(Number.isInteger(sementeDoCodigo(''))).toBe(true);
  });
});
