import { describe, expect, it } from 'vitest';
import {
  abreSozinho,
  estacoesDoAquecimento,
  fecharAbandonado,
  GRITO_ACERTOU,
  GRITO_ERROU,
  gritoDaEstacao,
  guardarPendente,
  limparPendente,
  jogoDoTimeParaCravar,
  numeroDaEstacao,
  PERGUNTA_AQUECIMENTO,
  progresso,
  TEXTO_DA_ESTACAO,
  tituloDoFim,
  type JogoParaAquecer,
} from './aquecimento';

const jogo = (id: string, m: string, v: string, inicio: string, extra: Partial<JogoParaAquecer> = {}): JogoParaAquecer => ({
  id,
  mandante_id: m,
  visitante_id: v,
  inicio,
  confirmado_em: null,
  anulado: false,
  ...extra,
});

describe('aquecimento', () => {
  it('5 estações; sem jogo do time, o Crava some e a barrinha vai até 4', () => {
    expect(estacoesDoAquecimento(true)).toEqual(['penalti', 'defesa', 'falta', 'prova', 'crava']);
    const sem = estacoesDoAquecimento(false);
    expect(sem).toEqual(['penalti', 'defesa', 'falta', 'prova']);
    expect(progresso(sem, 'prova')).toBe('4/4');
    expect(progresso(estacoesDoAquecimento(true), 'penalti')).toBe('1/5');
    expect(numeroDaEstacao('crava')).toBe(5);
  });

  it('frases da mão animada, como decidido', () => {
    expect(TEXTO_DA_ESTACAO.penalti.frase).toBe('Arraste da bola pro gol.');
    expect(TEXTO_DA_ESTACAO.defesa.frase).toBe('Olhe o pé amarelo e toque onde pular.');
    expect(TEXTO_DA_ESTACAO.falta.frase).toBe('Passe por cima ou ao lado da barreira.');
    expect(TEXTO_DA_ESTACAO.prova.frase).toBe('Toque na resposta antes do tempo.');
    expect(TEXTO_DA_ESTACAO.crava.frase).toBe('Use − e + e toque em Cravar.');
  });

  it('jogo do Crava: o próximo do time ainda aberto', () => {
    const agora = new Date('2026-11-05T12:00:00Z');
    const jogos = [
      jogo('a', 'flamengo', 'santos', '2026-11-05T10:00:00Z'), // já começou
      jogo('b', 'palmeiras', 'flamengo', '2026-11-07T22:00:00Z'),
      jogo('c', 'flamengo', 'gremio', '2026-11-06T22:00:00Z', { anulado: true }),
      jogo('d', 'vasco', 'bahia', '2026-11-06T20:00:00Z'),
    ];
    expect(jogoDoTimeParaCravar(jogos, 'flamengo', agora)?.id).toBe('b');
    expect(jogoDoTimeParaCravar(jogos, 'outro', agora)).toBeNull();
    expect(jogoDoTimeParaCravar(jogos, 'santos', agora)).toBeNull();
  });

  it('pergunta própria: 4 alternativas, a certa dentro, com fonte', () => {
    expect(PERGUNTA_AQUECIMENTO.tempo).toBe(20);
    expect(PERGUNTA_AQUECIMENTO.alternativas).toHaveLength(4);
    expect(PERGUNTA_AQUECIMENTO.alternativas[PERGUNTA_AQUECIMENTO.certa]).toBe('11');
    expect(PERGUNTA_AQUECIMENTO.fonte).toMatch(/^https:\/\//);
  });

  it('gritos curtos (até 75); na Prova e no Crava, sem "valendo" (narrador, seções 9 e 10); erro diz "Quase!"', () => {
    const todos = [...Object.values(GRITO_ACERTOU), ...Object.values(GRITO_ERROU)].flat();
    for (const g of todos) expect(g.length).toBeLessThanOrEqual(75);
    for (const g of [...GRITO_ACERTOU.prova, ...GRITO_ERROU.prova, ...GRITO_ACERTOU.crava, ...GRITO_ERROU.crava]) {
      expect(g.toLowerCase()).not.toMatch(/valendo|prêmio|milhão|lucro/);
    }
    expect(gritoDaEstacao('penalti', false, 0)).toBe('Quase! No jogo valendo você acerta.');
    expect(gritoDaEstacao('prova', true, 0.99)).toBe(GRITO_ACERTOU.prova[1]);
  });

  it('título do fim com o artigo do time', () => {
    expect(tituloDoFim('pro Flamengo')).toBe('Aquecido! Agora vale ponto pro Flamengo');
    expect(tituloDoFim(null)).toBe('Aquecido! Agora vale ponto de verdade');
  });

  it('abre sozinho só na primeira vez e fora do desafio', () => {
    expect(abreSozinho({}, false)).toBe(true);
    expect(abreSozinho({}, true)).toBe(false);
    expect(abreSozinho({ visto: true }, false)).toBe(false);
  });

  it('fechou no meio: vira "parou" naquela estação na abertura seguinte', () => {
    expect(fecharAbandonado({ visto: true })).toBeNull();
    expect(fecharAbandonado({ emAndamento: 3 })).toEqual({ visto: true, pendente: { desfecho: 'parou', estacao: 3 } });
  });

  it('pendente: completou nunca é trocado; só some o que acabou de chegar', () => {
    const c = { desfecho: 'completou' as const, estacao: null };
    const p = { desfecho: 'pulou' as const, estacao: 2 };
    expect(guardarPendente(c, p)).toEqual(c);
    expect(guardarPendente(p, c)).toEqual(c);
    expect(guardarPendente(undefined, p)).toEqual(p);
    expect(limparPendente(c, p)).toEqual(c);
    expect(limparPendente(c, { desfecho: 'completou', estacao: null })).toBeUndefined();
    expect(limparPendente(undefined, p)).toBeUndefined();
  });
});
