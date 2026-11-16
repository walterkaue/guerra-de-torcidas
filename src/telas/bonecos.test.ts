import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import {
  AJEITARES,
  CONTRASTE_ENTRE_TIMES,
  CORES_DA_MAQUINA,
  CORES_DE_GOLEIRO,
  DUR_AJEITAR,
  diferencaDeCor,
  novaPose,
  poseAjeitando,
  poseParado,
  sortearAjeitar,
  uniformesDaPartida,
  type VarianteAjeitar,
} from './bonecos';

// Dois times de cores parecidas nunca entram em campo quase iguais (docs/bonecos.md, seção 2).
const adversarios: [string, readonly [string, string] | null][] = [['máquina', null], ...TIMES.map((t) => [t.nome, t.cores] as [string, readonly [string, string]])];

describe('uniformes da partida', () => {
  for (const jogador of TIMES) {
    for (const [nome, cores] of adversarios) {
      for (const preferido of [0, 1] as const) {
        it(`${jogador.nome} (uniforme ${preferido + 1}) x ${nome}`, () => {
          const u = uniformesDaPartida(jogador.cores, cores, preferido);
          // Camisetas dos dois times bem diferentes.
          expect(diferencaDeCor(u.jogador.camisa, u.adversario.camisa)).toBeGreaterThanOrEqual(CONTRASTE_ENTRE_TIMES);
          // Goleiro destaca do batedor que ele enfrenta, do próprio time e do outro goleiro.
          expect(diferencaDeCor(u.goleiroJogador.camisa, u.adversario.camisa)).toBeGreaterThan(100);
          expect(diferencaDeCor(u.goleiroJogador.camisa, u.jogador.camisa)).toBeGreaterThan(100);
          expect(diferencaDeCor(u.goleiroAdversario.camisa, u.jogador.camisa)).toBeGreaterThan(100);
          expect(diferencaDeCor(u.goleiroAdversario.camisa, u.adversario.camisa)).toBeGreaterThan(100);
          expect(u.goleiroAdversario.camisa).not.toBe(u.goleiroJogador.camisa);
          // Goleiro só usa os tons de goleiro, com luvas na cor da camiseta.
          expect(CORES_DE_GOLEIRO).toContain(u.goleiroJogador.camisa);
          expect(u.goleiroJogador.luva).toBe(u.goleiroJogador.camisa);
        });
      }
    }
  }

  it('respeita o uniforme sorteado de quem joga quando não há conflito', () => {
    const flamengo = TIMES.find((t) => t.id === 'flamengo')!;
    expect(uniformesDaPartida(flamengo.cores, null, 0).jogador.camisa).toBe(flamengo.cores[0]);
    expect(uniformesDaPartida(flamengo.cores, null, 1).jogador.camisa).toBe(flamengo.cores[1]);
  });

  it('o adversário troca de uniforme antes de quem joga', () => {
    const flamengo = TIMES.find((t) => t.id === 'flamengo')!;
    const inter = TIMES.find((t) => t.id === 'internacional')!;
    const u = uniformesDaPartida(flamengo.cores, inter.cores, 0);
    expect(u.jogador.camisa).toBe(flamengo.cores[0]);
    expect(u.adversario.camisa).toBe(inter.cores[1]);
  });

  it('a máquina joga de laranja e preto', () => {
    const remo = TIMES.find((t) => t.id === 'remo')!;
    expect(uniformesDaPartida(remo.cores, null, 0).adversario.camisa).toBe(CORES_DA_MAQUINA[0]);
  });
});

describe('variações do ajeitar a bola', () => {
  const nomes = Object.keys(AJEITARES) as VarianteAjeitar[];

  it('a "ajeita" é a de hoje', () => {
    expect(AJEITARES.ajeita.dur).toBe(DUR_AJEITAR);
    const a = novaPose();
    const b = novaPose();
    for (const ms of [0, 100, 400, 700, 900]) {
      expect(Array.from(AJEITARES.ajeita.pose(ms, a))).toEqual(Array.from(poseAjeitando(ms, b)));
    }
  });

  for (const nome of nomes) {
    it(`${nome}: dura de 800 a 1300 ms e termina no lugar, sem pulo`, () => {
      const v = AJEITARES[nome];
      expect(v.dur).toBeGreaterThanOrEqual(800);
      expect(v.dur).toBeLessThanOrEqual(1300);
      expect(v.perto(v.dur)).toBe(0);
      const fim = v.pose(v.dur, novaPose());
      const parado = poseParado(v.dur, novaPose());
      for (let i = 0; i < fim.length; i++) expect(Math.abs(fim[i] - parado[i])).toBeLessThan(1e-4);
      // Quase no fim, a pose já está perto da final (sem salto no último trecho).
      const antes = v.pose(v.dur - 16, novaPose());
      for (let i = 0; i < fim.length; i++) expect(Math.abs(antes[i] - fim[i])).toBeLessThan(0.25);
    });

    it(`${nome}: perto fica entre 0 e 1`, () => {
      for (let ms = 0; ms <= AJEITARES[nome].dur; ms += 20) {
        const p = AJEITARES[nome].perto(ms);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    });
  }

  it('sortearAjeitar nunca repete a anterior e cobre todas as faixas do sorteio', () => {
    for (const anterior of nomes) {
      const vistos = new Set<VarianteAjeitar>();
      for (let r = 0; r < 1; r += 0.01) {
        const v = sortearAjeitar(anterior, r);
        expect(v).not.toBe(anterior);
        vistos.add(v);
      }
      expect(vistos.size).toBe(nomes.length - 1);
    }
    expect(nomes).toContain(sortearAjeitar());
  });
});
