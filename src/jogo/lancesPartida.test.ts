import { describe, expect, it } from 'vitest';
import { LANCES } from '../dados/lances';
import { calibrar, resolverLance, TETO_PARTIDA, type Lance } from './lances';
import {
  DETECCAO_LANCES_PADRAO,
  fecharPartidaLances,
  goleiroParaOCelular,
  jogarLanceDoJogo,
  LanceForaDeOrdem,
  motivoSuspeitaLances,
  type GestosLances,
  type LanceJogado,
} from './lancesPartida';
import { goleiroAntesDoChute } from './lances';
import { misturar } from './aleatorio';

const faltas = LANCES.filter((l) => l.tipo === 'falta');
const cenas: Lance[] = [faltas[0], LANCES.find((l) => l.tipo === 'finalizacao')!, faltas[0]];
const SEMENTES = [123456789, 987654321, 55555];
const vazio: GestosLances = { lances: cenas.map((c) => c.id), sementes: SEMENTES, cobrancas: [] };
const g = (dir: number, forca: number, efeito = 0) => ({ dir, forca, efeito });

describe('lance a lance dos Lances do Jogo', () => {
  it('joga os 3 lances em ordem e o fechamento bate com o lance a lance', () => {
    const gestos = [g(30.4, 62.6, 20), g(-12, 55), g(70, 80, -40)];
    let estado = vazio;
    const jogados: LanceJogado[] = [];
    for (let i = 0; i < 3; i++) {
      const j = jogarLanceDoJogo(cenas, estado, i, gestos[i]);
      estado = j.gestos;
      jogados.push(j.lance);
      expect(j.goleiroProximo === null).toBe(i === 2);
    }
    const fim = fecharPartidaLances(SEMENTES, cenas, estado.cobrancas);
    expect(fim.lances).toEqual(jogados);
    expect(fim.pontos).toBe(jogados.reduce((s, l) => s + l.pontos, 0));
    expect(fim.pontos).toBeLessThanOrEqual(TETO_PARTIDA);
    // O gesto guardado é o normalizado (inteiros), e o resultado é o do motor de sempre.
    expect(estado.cobrancas[0]).toEqual(g(30, 63, 20));
    // Cada lance usa a própria semente: o resultado de um não diz nada da do próximo.
    for (let i = 0; i < 3; i++) expect(jogados[i]).toMatchObject(resolverLance(SEMENTES[i], i, cenas[i], gestos[i]));
    expect(jogados[0]).toMatchObject({ lanceId: cenas[0].id, faixa: cenas[0].faixa });
  });

  it('recusa lance repetido, fora de ordem e depois do 3º', () => {
    const um = jogarLanceDoJogo(cenas, vazio, 0, g(0, 60));
    expect(() => jogarLanceDoJogo(cenas, um.gestos, 0, g(0, 60))).toThrow(LanceForaDeOrdem);
    expect(() => jogarLanceDoJogo(cenas, um.gestos, 2, g(0, 60))).toThrow(LanceForaDeOrdem);
    expect(() => jogarLanceDoJogo(cenas, vazio, 1.5, g(0, 60))).toThrow(LanceForaDeOrdem);
    const dois = jogarLanceDoJogo(cenas, um.gestos, 1, g(0, 60));
    const tres = jogarLanceDoJogo(cenas, dois.gestos, 2, g(0, 60));
    expect(() => jogarLanceDoJogo(cenas, tres.gestos, 3, g(0, 60))).toThrow(LanceForaDeOrdem);
    expect(() => fecharPartidaLances(SEMENTES, cenas, dois.gestos.cobrancas)).toThrow(LanceForaDeOrdem);
    expect(() => jogarLanceDoJogo(cenas, { ...vazio, sementes: [1, 2] }, 0, g(0, 60))).toThrow(LanceForaDeOrdem);
  });

  it('o goleiro vai para o celular arredondado em centésimos e no máximo 0,005 longe do de verdade', () => {
    for (let k = 0; k < 200; k++) {
      const s = misturar(7, k);
      const x = goleiroParaOCelular(s, 1, cenas[1]);
      expect(Math.round(x * 100)).toBeCloseTo(x * 100, 9);
      expect(Math.abs(x - goleiroAntesDoChute(s, 1, cenas[1]))).toBeLessThanOrEqual(0.005 + 1e-12);
    }
  });
});

describe('detecção dos Lances', () => {
  const tentativa = (lanceId: string, faixa: Lance['faixa'], dir: number, forca: number, desfecho: LanceJogado['desfecho']) =>
    ({ lanceId, faixa, gesto: g(dir, forca), desfecho });

  it('marca o mesmo gesto repetido 15 vezes no mesmo lance', () => {
    const robo = Array.from({ length: 5 }, (_, k) => ({
      lances: [0, 1, 2].map((j) => tentativa('a', 'media', 40 + ((k + j) % 2), 70, 'gol')),
    }));
    expect(motivoSuspeitaLances(robo)).toMatch(/gesto repetido/);
  });

  it('não marca uma pessoa com o erro de mão de sempre, nem janela incompleta', () => {
    const pessoa = Array.from({ length: 10 }, (_, k) => ({
      lances: [0, 1, 2].map((j) => tentativa('a', 'media', 40 + ((k * 3 + j) % 9) - 4, 70 + ((k + j) % 7) - 3, 'gol')),
    }));
    expect(motivoSuspeitaLances(pessoa)).toBeNull();
    const pouco = Array.from({ length: 4 }, () => ({ lances: [0, 1, 2].map(() => tentativa('a', 'media', 40, 70, 'gol')) }));
    expect(motivoSuspeitaLances(pouco)).toBeNull();
  });

  it('marca 27 gols em 30 lances difíceis e não marca 26', () => {
    const partidas = (gols: number) =>
      Array.from({ length: 10 }, (_, k) => ({
        lances: [0, 1, 2].map((j) => tentativa(`l${(k * 3 + j) % 7}`, j % 2 ? 'craque' : 'dificil', (k * 7 + j * 13) % 60, 50 + ((k + j) % 20), k * 3 + j < gols ? 'gol' : 'defesa')),
      }));
    expect(motivoSuspeitaLances(partidas(27))).toMatch(/lances difíceis: 27 gols em 30/);
    expect(motivoSuspeitaLances(partidas(26))).toBeNull();
  });

  it('ignora resultado de outro formato (pênaltis, Prova)', () => {
    expect(motivoSuspeitaLances([{} as never, { lances: undefined }])).toBeNull();
  });

  it('nem a mira perfeita passa do limite de gols nos lances difíceis do catálogo', () => {
    // O motivo 2 só pega o impossível: semente vazada ou erro no servidor. Mira perfeita = melhor gesto da
    // calibragem, sem erro de mão; a chance dela fica bem abaixo de 27/30 (90%).
    for (const l of LANCES.filter((x) => x.faixa === 'dificil' || x.faixa === 'craque')) {
      const { melhor } = calibrar(l, 8, 50);
      let gols = 0;
      for (let k = 0; k < 400; k++) if (resolverLance(misturar(0xd1f, k), 0, l, melhor).desfecho === 'gol') gols++;
      expect(gols / 400, l.id).toBeLessThan(DETECCAO_LANCES_PADRAO.minGols / DETECCAO_LANCES_PADRAO.janelaGols - 0.1);
    }
  });
});
