import { describe, expect, it } from 'vitest';
import { criarAleatorio, inteiro } from './aleatorio';
import {
  BONUS_PERFEITA,
  DEGRAU_DA_POSICAO,
  GERAL,
  calcularPontos,
  escadaEmoji,
  escolherPergunta,
  fimDosPassos,
  levar,
  montarEscada,
  motivoSuspeitaProva,
  porcentagens,
  precisaDecidir,
  quantasTirar,
  resumoDaProva,
  type Passo,
} from './prova';

const certa: Passo = { desfecho: 'acertou', ajuda: false };
const certas = (n: number): Passo[] => Array.from({ length: n }, () => certa);

/** Sorteio previsível para os testes (o mesmo gerador com semente dos pênaltis). */
function sorteioDe(semente: number) {
  const rnd = criarAleatorio(semente);
  return (n: number) => inteiro(rnd, n);
}

describe('pontuação da Prova de Boleiro', () => {
  it('degraus valem 8/12/18/25', () => {
    expect(levar(1)).toBe(8);
    expect(levar(2)).toBe(16);
    expect(levar(3)).toBe(28);
    expect(levar(4)).toBe(40);
    expect(levar(5)).toBe(58);
    expect(levar(6)).toBe(76);
    expect(levar(7)).toBe(101);
    expect(levar(8)).toBe(126);
  });

  it('8 de 8 ganha +24: máximo 150', () => {
    const p = calcularPontos(certas(8));
    expect(p).toEqual({ acertos: 8, base: 126, bonus: BONUS_PERFEITA, total: 150 });
  });

  it('parar leva tudo o que acumulou', () => {
    expect(calcularPontos(certas(5)).total).toBe(58);
  });

  it('errar leva metade, arredondada para cima', () => {
    // 5 certas (58) e erro na 6ª: 29
    expect(calcularPontos([...certas(5), { desfecho: 'errou', ajuda: false }]).total).toBe(29);
    // 7 certas (101) e tempo esgotado na 8ª: 50,5 → 51
    expect(calcularPontos([...certas(7), { desfecho: 'tempo', ajuda: true }]).total).toBe(51);
    // erro na 1ª: 0
    expect(calcularPontos([{ desfecho: 'errou', ajuda: false }]).total).toBe(0);
  });

  it('recusa passo depois do erro e passos demais', () => {
    expect(() => calcularPontos([{ desfecho: 'errou', ajuda: false }, certa])).toThrow();
    expect(() => calcularPontos(certas(9))).toThrow();
  });

  it('fim da partida pelos passos', () => {
    expect(fimDosPassos(certas(3))).toBeNull();
    expect(fimDosPassos(certas(8))).toBe('perfeita');
    expect(fimDosPassos([...certas(2), { desfecho: 'tempo', ajuda: false }])).toBe('tempo');
    expect(fimDosPassos([{ desfecho: 'errou', ajuda: false }])).toBe('errou');
  });

  it('parar ou seguir só a partir da 3ª pergunta', () => {
    expect([0, 1, 2, 3, 7, 8].map(precisaDecidir)).toEqual([false, false, true, true, true, false]);
  });
});

describe('card em emoji', () => {
  it('✅ acertou, 💡 acertou com ajuda, ❌ errou, ✋ parou', () => {
    const passos: Passo[] = [...certas(3), { desfecho: 'acertou', ajuda: true }, certa];
    expect(escadaEmoji(passos, 'parou')).toBe('✅✅✅💡✅✋');
    expect(escadaEmoji([...certas(2), { desfecho: 'errou', ajuda: true }], 'errou')).toBe('✅✅❌');
  });

  it('resumo sem o texto das perguntas', () => {
    expect(resumoDaProva(certas(5), 'parou')).toBe('cheguei na 6ª e parei');
    expect(resumoDaProva([...certas(4), { desfecho: 'errou', ajuda: false }], 'errou')).toBe('errei na 5ª');
    expect(resumoDaProva([...certas(2), { desfecho: 'tempo', ajuda: false }], 'tempo')).toBe('o tempo acabou na 3ª');
    expect(resumoDaProva(certas(8), 'perfeita')).toBe('fiz 8 de 8');
  });
});

describe('sorteio da escada', () => {
  const clubes = Array.from({ length: 20 }, (_, i) => `clube-${i}`);

  it('4 clubes diferentes e 4 gerais, um de cada em cada degrau', () => {
    for (let s = 1; s < 50; s++) {
      const e = montarEscada(clubes, sorteioDe(s));
      expect(e.map((v) => v.degrau)).toEqual(DEGRAU_DA_POSICAO);
      expect(e.filter((v) => v.origem === GERAL)).toHaveLength(4);
      const doClube = e.filter((v) => v.origem !== GERAL).map((v) => v.origem);
      expect(new Set(doClube).size).toBe(4);
      for (const d of [1, 2, 3, 4]) {
        const doDegrau = e.filter((v) => v.degrau === d);
        expect(doDegrau.filter((v) => v.origem === GERAL)).toHaveLength(1);
      }
    }
  });

  it('todo clube tem a mesma chance (uniforme entre os 20)', () => {
    const contagem = new Map<string, number>();
    const sortear = sorteioDe(7);
    const N = 20000;
    for (let i = 0; i < N; i++) {
      for (const v of montarEscada(clubes, sortear)) {
        if (v.origem !== GERAL) contagem.set(v.origem, (contagem.get(v.origem) ?? 0) + 1);
      }
    }
    const esperado = (N * 4) / 20;
    for (const c of clubes) expect(Math.abs((contagem.get(c) ?? 0) - esperado) / esperado).toBeLessThan(0.05);
  });

  it('prefere pergunta não vista em 30 dias; esgotou, volta a mais antiga', () => {
    const agora = Date.UTC(2026, 9, 20);
    const dia = 86_400_000;
    const sortear = sorteioDe(3);
    const candidatas = [
      { id: 'a', vistaEm: agora - 2 * dia },
      { id: 'b', vistaEm: null },
      { id: 'c', vistaEm: agora - 40 * dia },
    ];
    for (let i = 0; i < 20; i++) expect(['b', 'c']).toContain(escolherPergunta(candidatas, new Set(), agora, 30, sortear));
    expect(escolherPergunta(candidatas, new Set(['b', 'c']), agora, 30, sortear)).toBe('a');
    const todasVistas = [
      { id: 'x', vistaEm: agora - 3 * dia },
      { id: 'y', vistaEm: agora - 9 * dia },
      { id: 'z', vistaEm: agora - dia },
    ];
    expect(escolherPergunta(todasVistas, new Set(), agora, 30, sortear)).toBe('y');
    expect(escolherPergunta(todasVistas, new Set(['x', 'y', 'z']), agora, 30, sortear)).toBeNull();
  });
});

describe('ajudas', () => {
  it('nunca deixam menos de 2 alternativas', () => {
    expect(quantasTirar(2, 4)).toBe(2);
    expect(quantasTirar(2, 3)).toBe(1);
    expect(quantasTirar(1, 2)).toBe(0);
  });

  it('porcentagens da Arquibancada somam 100', () => {
    expect(porcentagens([1, 1, 1])).toEqual([34, 33, 33]);
    expect(porcentagens([30, 10, 0, 0])).toEqual([75, 25, 0, 0]);
    expect(porcentagens([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
    expect(porcentagens([7, 5, 3, 2]).reduce((a, b) => a + b)).toBe(100);
  });
});

describe('detecção', () => {
  const resp = (acertou: boolean, ms: number, degrau = 3) => ({ degrau, acertou, ms });

  it('marca 90% de acerto com média abaixo de 2,5 s em 40 difíceis/craque', () => {
    const lista = [...Array(37).fill(resp(true, 1800)), ...Array(3).fill(resp(false, 1800))];
    expect(motivoSuspeitaProva(lista)).toMatch(/prova: 93%/);
  });

  it('não marca quem responde devagar, quem erra, ou com menos de 40', () => {
    expect(motivoSuspeitaProva(Array(40).fill(resp(true, 6000)))).toBeNull();
    expect(motivoSuspeitaProva([...Array(30).fill(resp(true, 1500)), ...Array(10).fill(resp(false, 1500))])).toBeNull();
    expect(motivoSuspeitaProva(Array(39).fill(resp(true, 1000)))).toBeNull();
  });

  it('só olha as difíceis e de craque', () => {
    const faceis = Array(100).fill(resp(true, 900, 1));
    expect(motivoSuspeitaProva(faceis)).toBeNull();
  });
});
