import { describe, expect, it } from 'vitest';
import { CENA_DA_FALTA, GESTO_DA_FALTA, sementeDaDefesa, sementeDaFalta, sementeDoPenalti, sementeQueServe } from './aquecimentoCena';
import { criarAleatorio } from './aleatorio';
import { validarCena, resolverLance } from './lances';
import { coluna, planejarDefesa, resolverCobranca, resolverDefesa } from './penaltis';

const sorteios = (base: number) => criarAleatorio(base);

describe('cenas do aquecimento', () => {
  it('a falta é uma cena válida do motor dos Lances', () => {
    expect(validarCena(CENA_DA_FALTA)).toEqual([]);
  });

  it('o chute do tutorial entra em quase toda semente; reto na barreira não entra', () => {
    let gols = 0;
    let barreira = 0;
    for (let s = 1; s <= 400; s++) {
      if (resolverLance(s * 7919, 0, CENA_DA_FALTA, GESTO_DA_FALTA).desfecho === 'gol') gols++;
      if (resolverLance(s * 7919, 0, CENA_DA_FALTA, { dir: 0, forca: 95, efeito: 0 }).desfecho === 'barreira') barreira++;
    }
    expect(gols / 400).toBeGreaterThan(0.85);
    expect(barreira).toBeGreaterThan(300);
  });

  it('as sementes escolhidas servem ao gesto do tutorial', () => {
    for (let k = 1; k <= 20; k++) {
      const rnd = sorteios(k);
      const sp = sementeDoPenalti(rnd);
      for (const dir of [-60, 0, 60]) expect(resolverCobranca(sp, 0, { dir, forca: 70, efeito: 0 }, 0).desfecho).toBe('gol');
      const sd = sementeDaDefesa(rnd);
      const plano = planejarDefesa(sd, 0, 0);
      expect(plano.erra).toBe(false);
      expect(plano.dica).toBe(coluna(plano.alvo));
      expect(resolverDefesa(sd, 0, plano.alvo, 0).desfecho).toBe('defesa');
      const sf = sementeDaFalta(rnd);
      expect(resolverLance(sf, 0, CENA_DA_FALTA, GESTO_DA_FALTA).desfecho).toBe('gol');
    }
  });

  it('sem semente que sirva, devolve a primeira sorteada', () => {
    expect(sementeQueServe(() => 0.5, () => false, 5)).toBe(Math.floor(0.5 * 0xffffffff));
  });
});
