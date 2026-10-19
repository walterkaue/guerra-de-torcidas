import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import { CONTRASTE_ENTRE_TIMES, CORES_DA_MAQUINA, CORES_DE_GOLEIRO, diferencaDeCor, uniformesDaPartida } from './bonecos';

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
