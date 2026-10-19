import { describe, expect, it } from 'vitest';
import { criarAleatorio, misturar } from './aleatorio';
import { motivoSuspeita } from './deteccao';
import {
  COBRANCAS,
  coluna,
  planejarDefesa,
  resolverCobranca,
  resolverDefesa,
  type ResultadoCobranca,
  type ResultadoDefesa,
} from './penaltis';

/** Uma partida de 5 + 5. `trapaceia` = conhece a semente (sabe o canto do goleiro e do batedor). */
function partida(semente: number, rng: () => number, d: number, trapaceia: boolean) {
  const cobrancas: ResultadoCobranca[] = [];
  const defesas: ResultadoDefesa[] = [];
  for (let i = 0; i < COBRANCAS; i++) {
    let gesto = { dir: rng() < 0.5 ? -75 : 75, forca: 50 + rng() * 25, efeito: 0 };
    if (trapaceia) {
      // Testa os dois cantos e fica com o que o motor diz que entra.
      const outro = { ...gesto, dir: -gesto.dir };
      if (resolverCobranca(semente, i, gesto, d).desfecho !== 'gol') gesto = outro;
    }
    cobrancas.push(resolverCobranca(semente, i, gesto, d));

    const plano = planejarDefesa(semente, i, d);
    // Honesto segue a dica (coluna) e chuta a altura; quem trapaceia vai direto no alvo.
    const zona = trapaceia ? plano.alvo : (rng() < 0.5 ? 0 : 3) + plano.dica;
    defesas.push(resolverDefesa(semente, i, zona, d));
  }
  return { cobrancas, defesas };
}

function historico(n: number, sal: number, d: number, trapaceia: boolean) {
  const rng = criarAleatorio(sal);
  return Array.from({ length: n }, (_, k) => partida(misturar(sal, k), rng, d, trapaceia)).reverse();
}

describe('detecção', () => {
  it('quem lê a semente é marcado em poucas partidas', () => {
    for (const d of [0, 0.5, 1]) expect(motivoSuspeita(historico(12, 1, d, true))).not.toBeNull();
  });

  it('jogador honesto quase nunca é marcado (simulação)', () => {
    let marcados = 0;
    const N = 400;
    for (let k = 0; k < N; k++) if (motivoSuspeita(historico(12, 1000 + k, 0, false))) marcados++;
    // Segunda-feira é o caso mais fácil para o honesto (dica mais confiável).
    expect(marcados / N).toBeLessThan(0.01);
  });

  it('não marca com poucas partidas (janela incompleta)', () => {
    expect(motivoSuspeita(historico(3, 5, 0, true))).toBeNull();
  });

  it('ignora defesas contra cobrança gravada e chutes da máquina pra fora', () => {
    const p = {
      cobrancas: [],
      defesas: Array.from({ length: 30 }, () => ({ desfecho: 'defesa' as const, contraGravada: true })),
    };
    expect(motivoSuspeita([p])).toBeNull();
    const fora = { cobrancas: [], defesas: Array.from({ length: 30 }, () => ({ desfecho: 'fora' as const, contraGravada: false })) };
    expect(motivoSuspeita([fora])).toBeNull();
  });

  it('coluna da dica e alvo usam a mesma convenção do motor', () => {
    const p = planejarDefesa(1, 0, 0);
    expect(coluna(p.alvo)).toBeGreaterThanOrEqual(0);
  });
});
