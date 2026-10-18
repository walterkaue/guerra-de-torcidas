import { describe, expect, it } from 'vitest';
import { criarAleatorio, misturar } from './aleatorio';
import {
  COBRANCAS,
  PONTOS,
  type GestoCobranca,
  type Gestos,
  dificuldadePorDia,
  normalizarCobranca,
  normalizarDefesa,
  planejarDefesa,
  resolverCobranca,
  resolverDefesa,
  simularPartida,
  totalizar,
  zonaDoPonto,
} from './penaltis';

function gestosAleatorios(semente: number): Gestos {
  const r = criarAleatorio(semente);
  const cobrancas: GestoCobranca[] = [];
  const defesas: number[] = [];
  for (let i = 0; i < COBRANCAS; i++) {
    cobrancas.push({ dir: r() * 200 - 100, forca: r() * 100, efeito: r() * 200 - 100 });
    defesas.push(Math.floor(r() * 7) - 1);
  }
  return { cobrancas, defesas };
}

describe('aleatório', () => {
  it('repete a sequência para a mesma semente', () => {
    const a = criarAleatorio(42);
    const b = criarAleatorio(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('gera valores em [0, 1)', () => {
    const r = criarAleatorio(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('mistura sementes diferentes em valores diferentes', () => {
    expect(misturar(1, 2)).not.toBe(misturar(2, 1));
    expect(misturar(1, 2)).toBe(misturar(1, 2));
  });

  it('tem um valor fixo para uma semente conhecida (trava contra mudança acidental)', () => {
    expect(criarAleatorio(12345)()).toMatchInlineSnapshot(`0.9797282677609473`);
  });
});

describe('determinismo da partida', () => {
  it('mesma semente + mesmos gestos = mesmo resultado', () => {
    for (let s = 1; s <= 200; s++) {
      const semente = misturar(s);
      const gestos = gestosAleatorios(s);
      expect(simularPartida(semente, gestos, 0.5)).toEqual(simularPartida(semente, gestos, 0.5));
    }
  });

  it('a defesa não depende das cobranças (o plano pode ser mostrado antes)', () => {
    const semente = 999;
    const a = gestosAleatorios(1);
    const b = { ...gestosAleatorios(2), defesas: a.defesas };
    expect(simularPartida(semente, a, 0.3).defesas).toEqual(simularPartida(semente, b, 0.3).defesas);
  });

  it('cobrança jogada ao vivo bate com a simulação completa', () => {
    const semente = 2024;
    const gestos = gestosAleatorios(5);
    const aoVivo = totalizar(
      gestos.cobrancas.map((g, i) => resolverCobranca(semente, i, g, 0.4)),
      gestos.defesas.map((z, i) => resolverDefesa(semente, i, z, 0.4)),
    );
    expect(aoVivo).toEqual(simularPartida(semente, gestos, 0.4));
  });

  it('recusa partida com número errado de gestos', () => {
    expect(() => simularPartida(1, { cobrancas: [], defesas: [] }, 0)).toThrow();
  });
});

describe('gestos', () => {
  it('quantiza e limita os valores', () => {
    expect(normalizarCobranca({ dir: 150.4, forca: -3, efeito: 33.6 })).toEqual({ dir: 100, forca: 0, efeito: 34 });
    expect(normalizarDefesa(9)).toBe(-1);
    expect(normalizarDefesa(2.2)).toBe(2);
  });

  it('gesto não normalizado dá o mesmo resultado do normalizado', () => {
    const g = { dir: 40.3, forca: 70.2, efeito: -10.4 };
    expect(resolverCobranca(5, 0, g, 0.5)).toEqual(resolverCobranca(5, 0, normalizarCobranca(g), 0.5));
  });
});

describe('física da cobrança', () => {
  it('força demais vai por cima', () => {
    for (let s = 0; s < 50; s++) {
      const r = resolverCobranca(s, 0, { dir: 0, forca: 100, efeito: 0 }, 0);
      expect(['fora', 'trave']).toContain(r.desfecho);
    }
  });

  it('bola fraca é marcada como fraca e defendida quando o goleiro acerta o lado', () => {
    for (let s = 0; s < 200; s++) {
      const r = resolverCobranca(s, 0, { dir: 80, forca: 28, efeito: 0 }, 1);
      expect(r.fraca).toBe(true);
      if (r.zonaGoleiro % 3 === 2) expect(r.desfecho).toBe('defesa');
    }
  });

  it('cavadinha só é defendida com o goleiro parado no meio', () => {
    for (let s = 0; s < 200; s++) {
      const r = resolverCobranca(s, 0, { dir: 0, forca: 15, efeito: 0 }, 0.5);
      expect(r.cavadinha).toBe(true);
      expect(r.desfecho === 'defesa').toBe(r.zonaGoleiro % 3 === 1);
      if (r.desfecho === 'gol') expect(r.pontos).toBe(PONTOS.gol + PONTOS.cavadinha);
    }
  });

  it('o efeito desloca a bola para o lado da curva', () => {
    const reta = resolverCobranca(3, 0, { dir: 0, forca: 60, efeito: 0 }, 0);
    const curva = resolverCobranca(3, 0, { dir: 0, forca: 60, efeito: 100 }, 0);
    expect(curva.x).toBeGreaterThan(reta.x);
  });

  it('gol no ângulo vale 15', () => {
    let achou = false;
    for (let s = 0; s < 500 && !achou; s++) {
      const r = resolverCobranca(s, 0, { dir: 82, forca: 84, efeito: 0 }, 0);
      if (r.desfecho === 'gol' && r.angulo) {
        expect(r.pontos).toBe(PONTOS.gol + PONTOS.angulo);
        achou = true;
      }
    }
    expect(achou).toBe(true);
  });

  it('dificuldade maior faz o goleiro pegar mais', () => {
    const contar = (d: number) => {
      let defesas = 0;
      for (let s = 0; s < 2000; s++) {
        if (resolverCobranca(s, 0, { dir: -60, forca: 55, efeito: 0 }, d).desfecho === 'defesa') defesas++;
      }
      return defesas;
    };
    expect(contar(1)).toBeGreaterThan(contar(0));
  });
});

describe('defesa', () => {
  it('pular na zona do alvo sempre defende (se a máquina não errou)', () => {
    for (let s = 0; s < 200; s++) {
      const plano = planejarDefesa(s, 0, 0.5);
      const r = resolverDefesa(s, 0, plano.alvo, 0.5);
      expect(r.desfecho).toBe(plano.erra ? 'fora' : 'defesa');
    }
  });

  it('não pular nunca defende', () => {
    for (let s = 0; s < 200; s++) expect(resolverDefesa(s, 0, -1, 0.5).desfecho).not.toBe('defesa');
  });

  it('a dica é honesta na maioria das vezes no começo da semana', () => {
    let honestas = 0;
    for (let s = 0; s < 1000; s++) {
      const p = planejarDefesa(s, 0, 0);
      if (p.dica === p.alvo % 3) honestas++;
    }
    expect(honestas).toBeGreaterThan(750);
  });
});

describe('pontuação', () => {
  const gol = (extra: Partial<ReturnType<typeof resolverCobranca>> = {}) => ({
    desfecho: 'gol' as const, x: 0, y: 0.3, zonaBola: 1, zonaGoleiro: 0, angulo: false, cavadinha: false, fraca: false,
    pontos: 10, ...extra,
  });
  const defendida = () => ({ ...gol(), desfecho: 'defesa' as const, pontos: 0 });
  const defesa = () => ({ desfecho: 'defesa' as const, alvo: 0, zonaGoleiro: 0, pontos: 10 });
  const sofrido = () => ({ desfecho: 'gol' as const, alvo: 0, zonaGoleiro: 2, pontos: 0 });

  it('5 de 5 nos dois lados com vitória', () => {
    const r = totalizar(Array.from({ length: 5 }, () => gol()), Array.from({ length: 5 }, defesa));
    expect(r.venceu).toBe(true);
    expect(r.pontos.total).toBe(50 + 50 + 20 + 25 + 25);
  });

  it('soma ângulo e cavadinha só quando é gol', () => {
    const r = totalizar(
      [gol({ angulo: true }), gol({ cavadinha: true }), { ...defendida(), angulo: true }, defendida(), defendida()],
      [sofrido(), sofrido(), sofrido(), defesa(), defesa()],
    );
    expect(r.pontos).toMatchObject({ gols: 20, angulos: 5, cavadinhas: 10, defesas: 20, vitoria: 0, cincoDeCinco: 0 });
    expect(r.golsJogador).toBe(2);
    expect(r.golsMaquina).toBe(3);
    expect(r.pontos.total).toBe(55);
  });

  it('empate não dá bônus de vitória', () => {
    const r = totalizar([gol(), defendida(), defendida(), defendida(), defendida()], [sofrido(), defesa(), defesa(), defesa(), defesa()]);
    expect(r.empate).toBe(true);
    expect(r.pontos.vitoria).toBe(0);
  });
});

describe('auxiliares', () => {
  it('mapeia pontos para as 6 zonas', () => {
    expect(zonaDoPonto(-0.9, 0.1)).toBe(0);
    expect(zonaDoPonto(0, 0.1)).toBe(1);
    expect(zonaDoPonto(0.9, 0.9)).toBe(5);
  });

  it('dificuldade vai de 0 na segunda a 1 no domingo', () => {
    expect(dificuldadePorDia(1)).toBe(0);
    expect(dificuldadePorDia(0)).toBe(1);
  });
});
