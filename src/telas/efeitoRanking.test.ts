// Efeito no ranking do resultado (telas/efeitoRanking.ts), que desde 05/11/2026 serve aos Lances e aos Pênaltis:
// o selo "No ranking em 1 min" vira "Subiu de 5º pra 3º" (e a nota) quando chega a primeira tabela calculada depois
// da partida; sem tabela nova até o fim da espera, só "Contou pro ranking".

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ligarEfeitoNoRanking, type Leitores } from './efeitoRanking';
import { ESPERA_RANKING_MS } from '../jogo/rankingMinuto';
import type { LinhaRanking } from '../servidor/api';

/** O mínimo de um elemento que o efeito mexe (o teste roda sem DOM). */
const elemento = () => ({ className: 'selo', innerHTML: 'No ranking em 1 min', textContent: '', hidden: true }) as unknown as HTMLElement;

const linha = (time_id: string, posicao: number, media30: number): LinhaRanking => ({
  time_id,
  ativos: 10,
  soma: media30 * 10,
  media30,
  posicao_campeao: posicao,
  posicao_soma: posicao,
});

const PARTIDA = '2026-11-05T15:00:00.000Z';
const DEPOIS = '2026-11-05T15:00:30.000Z';
const ANTES = '2026-11-05T14:59:00.000Z';

function leitores(calculadoEm: string | null, linhas: LinhaRanking[]): Leitores {
  return {
    rankingCalculadoEm: vi.fn(async () => calculadoEm),
    rankingDaSemana: vi.fn(async () => linhas),
    ouvirRanking: vi.fn(async () => () => {}),
  } as unknown as Leitores;
}

/** Deixa as leituras (promessas já resolvidas) chegarem; o setTimeout está fingido nestes testes. */
const esperarPromessas = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('efeito no ranking do resultado', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('tabela calculada depois da partida: "Subiu de 5º pra 3º" e quanto falta para passar quem está acima', async () => {
    const alvo = { selo: elemento(), nota: elemento() };
    const tabela = [linha('palmeiras', 1, 250), linha('corinthians', 2, 230), linha('flamengo', 3, 226)];
    ligarEfeitoNoRanking(alvo, { timeId: 'flamengo', semana: '2026-11-02', confirmadaEm: PARTIDA, antes: { posicao_campeao: 5, posicao_soma: 5, media30: 200, soma: 2000 } }, leitores(DEPOIS, tabela));
    await vi.waitFor(() => expect(alvo.selo!.innerHTML).toContain('Subiu de 5º pra 3º'));
    expect(alvo.selo!.className).toBe('selo subiu');
    expect(alvo.nota.textContent).toBe('Mais 4 de média e passa o Corinthians (2º).');
    expect(alvo.nota.hidden).toBe(false);
  });

  it('na liderança: a nota diz a vantagem sobre o 2º', async () => {
    const alvo = { selo: elemento(), nota: elemento() };
    ligarEfeitoNoRanking(
      alvo,
      { timeId: 'flamengo', semana: 's', confirmadaEm: PARTIDA, antes: { posicao_campeao: 1, posicao_soma: 1, media30: 240, soma: 1 } },
      leitores(DEPOIS, [linha('flamengo', 1, 250), linha('palmeiras', 2, 249)]),
    );
    await vi.waitFor(() => expect(alvo.selo!.innerHTML).toBe('Segue em 1º na semana'));
    expect(alvo.nota.textContent).toBe('Na liderança, 1 ponto de média na frente do Palmeiras.');
  });

  it('sem média antes: "Entrou em Nº na semana"', async () => {
    const alvo = { selo: elemento(), nota: elemento() };
    ligarEfeitoNoRanking(alvo, { timeId: 'flamengo', semana: 's', confirmadaEm: PARTIDA, antes: null }, leitores(DEPOIS, [linha('flamengo', 7, 10)]));
    await vi.waitFor(() => expect(alvo.selo!.innerHTML).toBe('Entrou em 7º na semana'));
  });

  it('tabela de antes da partida não conta; passada a espera, só "Contou pro ranking"', async () => {
    const alvo = { selo: elemento(), nota: elemento() };
    ligarEfeitoNoRanking(alvo, { timeId: 'flamengo', semana: 's', confirmadaEm: PARTIDA, antes: null }, leitores(ANTES, [linha('flamengo', 2, 10)]));
    await esperarPromessas();
    expect(alvo.selo!.innerHTML).toBe('No ranking em 1 min');
    vi.advanceTimersByTime(ESPERA_RANKING_MS);
    expect(alvo.selo!.innerHTML).toBe('Contou pro ranking');
    expect(alvo.nota.hidden).toBe(true);
  });

  it('saiu da tela: nada muda depois', async () => {
    const alvo = { selo: elemento(), nota: elemento() };
    const parar = ligarEfeitoNoRanking(alvo, { timeId: 'flamengo', semana: 's', confirmadaEm: PARTIDA, antes: null }, leitores(ANTES, []));
    parar();
    vi.advanceTimersByTime(ESPERA_RANKING_MS);
    expect(alvo.selo!.innerHTML).toBe('No ranking em 1 min');
  });
});
