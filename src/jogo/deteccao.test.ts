import { describe, expect, it } from 'vitest';
import { criarAleatorio, misturar } from './aleatorio';
import { motivoSuspeita, noLadoDoGoleiro } from './deteccao';
import {
  COBRANCAS,
  coluna,
  planejarDefesa,
  resolverCobranca,
  resolverCobrancaGoleiro,
  resolverDefesa,
  type GestoCobranca,
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

  it('resultado da Prova no histórico não quebra a conta e não muda o veredito', () => {
    const prova = { fim: 'errou', escada: '🟥', passos: [] } as never;
    expect(motivoSuspeita([prova, ...historico(3, 5, 0, true)])).toBeNull();
    const ladrao = historico(12, 1, 0.5, true);
    expect(motivoSuspeita(ladrao)).not.toBeNull();
    expect(motivoSuspeita([prova, ...ladrao, prova])).toBe(motivoSuspeita(ladrao));
  });

  it('coluna da dica e alvo usam a mesma convenção do motor', () => {
    const p = planejarDefesa(1, 0, 0);
    expect(coluna(p.alvo)).toBeGreaterThanOrEqual(0);
  });
});

describe('detecção no motor 2 (goleiro com alcance): vale o lado do mergulho', () => {
  /** Cobrança que o goleiro não leu: motor 1 (só zonas) ou motor 2 (com goleiroX). */
  const cobranca = (zonaBola: number, zonaGoleiro: number, motor2: boolean) => ({
    goleiroLeu: false,
    zonaBola,
    zonaGoleiro,
    ...(motor2 ? { goleiroX: (coluna(zonaGoleiro) - 1) * 0.6 } : {}),
  });
  const partida = (cobrancas: ReturnType<typeof cobranca>[]) => ({ cobrancas, defesas: [] });

  it('no motor 2, a coluna certa com a altura errada conta como "onde ele foi"', () => {
    // Bola no canto esquerdo baixo (0), goleiro no esquerdo alto (3): mesma coluna, zonas diferentes.
    expect(noLadoDoGoleiro(cobranca(0, 3, true))).toBe(true);
    expect(noLadoDoGoleiro(cobranca(0, 3, false))).toBe(false);
    expect(noLadoDoGoleiro(cobranca(0, 2, true))).toBe(false);
    expect(motivoSuspeita([partida(Array.from({ length: 40 }, () => cobranca(0, 3, false)))])).not.toBeNull();
    expect(motivoSuspeita([partida(Array.from({ length: 40 }, () => cobranca(0, 3, true)))])).toBeNull();
  });

  it('a janela de 40 mistura os dois motores', () => {
    const antigas = Array.from({ length: 20 }, () => cobranca(0, 3, false)); // motor 1: zona diferente, não foi lá
    const novas = Array.from({ length: 20 }, () => cobranca(0, 2, true)); // motor 2: outro lado
    // Mais recente primeiro: as do motor 2 vieram depois.
    expect(motivoSuspeita([partida(novas), partida(antigas)])).toBe('cobranças: nenhuma no canto do goleiro em 40');
    // Uma só do motor 2 no lado do goleiro já tira a suspeita.
    const umaNoLado = [...novas.slice(0, 19), cobranca(0, 3, true)];
    expect(motivoSuspeita([partida(umaNoLado), partida(antigas)])).toBeNull();
    // E uma do motor 1 na zona do goleiro também.
    expect(motivoSuspeita([partida(novas), partida([...antigas.slice(0, 19), cobranca(4, 4, false)])])).toBeNull();
  });

  /** 16 partidas de 5 cobranças no motor 2 (enche a janela até no domingo). Quem lê a semente foge do lado do goleiro. */
  function cobrancasDoMotor2(sal: number, d: number, chute: (rng: () => number) => GestoCobranca, trapaceia: boolean) {
    const rng = criarAleatorio(sal);
    return Array.from({ length: 16 }, (_, k) => {
      const semente = misturar(sal, k, 2);
      const cobrancas = Array.from({ length: COBRANCAS }, (_, i) => {
        let g = chute(rng);
        if (trapaceia) {
          const outro = { ...g, dir: -g.dir };
          if (noLadoDoGoleiro(resolverCobrancaGoleiro(semente, i, g, d))) g = outro;
        }
        return resolverCobrancaGoleiro(semente, i, g, d);
      });
      return { cobrancas, defesas: [] };
    }).reverse();
  }
  const noAngulo = (rng: () => number): GestoCobranca => ({ dir: (rng() < 0.5 ? -1 : 1) * (74 + Math.floor(rng() * 7)), forca: 80 + Math.floor(rng() * 5), efeito: 0 });

  it('quem lê a semente e foge do lado do goleiro é marcado', () => {
    for (const d of [0, 0.5, 1]) expect(motivoSuspeita(cobrancasDoMotor2(77, d, noAngulo, true))).not.toBeNull();
  });

  it('2.000 jogadores honestos mirando no ângulo: nenhum marcado', () => {
    let marcados = 0;
    let noLado = 0;
    let semLer = 0;
    for (let k = 0; k < 2000; k++) {
      const h = cobrancasDoMotor2(50_000 + k, (k % 7) / 6, noAngulo, false);
      for (const p of h) for (const c of p.cobrancas) if (!c.goleiroLeu) {
        semLer++;
        if (noLadoDoGoleiro(c)) noLado++;
      }
      if (motivoSuspeita(h)) marcados++;
    }
    expect(marcados).toBe(0);
    // O honesto cai no lado do goleiro em 20% a 40% das cobranças sem leitura (no ângulo, ~40%).
    expect(noLado / semLer).toBeGreaterThan(0.3);
    expect(noLado / semLer).toBeLessThan(0.45);
  });
});
