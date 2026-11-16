import { describe, expect, it } from 'vitest';
import { criarAleatorio, misturar } from './aleatorio';
import { motivoSuspeita, noLadoDoGoleiro } from './deteccao';
import {
  COBRANCAS,
  PONTOS_GOLEIRO,
  cavadinhasAntes,
  coluna,
  normalizarCobranca,
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

describe('detecção no motor 2: nenhuma defendida (quem lucra com a semente não precisa fugir do lado)', () => {
  /** O que quem conhece a semente testa antes de mandar: cavadinha, os dois ângulos, cantos rasteiros, colocados e meio. */
  const CANDIDATOS: GestoCobranca[] = [
    { dir: 0, forca: 16, efeito: 0 },
    { dir: 77, forca: 82, efeito: 0 },
    { dir: -77, forca: 82, efeito: 0 },
    { dir: 82, forca: 42, efeito: 0 },
    { dir: -82, forca: 42, efeito: 0 },
    { dir: 55, forca: 60, efeito: 0 },
    { dir: -55, forca: 60, efeito: 0 },
    { dir: 0, forca: 60, efeito: 0 },
  ];
  type Ver = (g: GestoCobranca) => ResultadoCobranca;
  type Escolher = (ver: Ver, rng: () => number, i: number) => GestoCobranca;
  const entre = (rng: () => number, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const lado = (rng: () => number) => (rng() < 0.5 ? -1 : 1);

  /**
   * `n` partidas de 5 cobranças no motor 2, cada cobrança com a semente dela, da mais recente para a mais antiga.
   * `escolher` recebe `ver` (o resultado que um gesto teria: só quem conhece a semente usa) e o sorteio do jogador.
   */
  function jogar(sal: number, d: number, n: number, escolher: Escolher) {
    const rng = criarAleatorio(sal);
    return Array.from({ length: n }, (_, k) => {
      const gestos: GestoCobranca[] = [];
      const cobrancas = Array.from({ length: COBRANCAS }, (_, i) => {
        const ver: Ver = (g) => resolverCobrancaGoleiro(misturar(sal, k, i, 7), i, g, d, PONTOS_GOLEIRO, cavadinhasAntes(gestos, i));
        const g = normalizarCobranca(escolher(ver, rng, i));
        gestos.push(g);
        return ver(g);
      });
      return { cobrancas, defesas: [] };
    }).reverse();
  }
  const semLer = (h: ReturnType<typeof jogar>) => h.flatMap((p) => [...p.cobrancas].reverse()).filter((c) => !c.goleiroLeu);

  // Honestos (o gesto não depende da semente):
  const colocado: Escolher = (_, rng) => ({ dir: lado(rng) * entre(rng, 45, 60), forca: entre(rng, 50, 70), efeito: 0 });
  const noMeio: Escolher = (_, rng) => ({ dir: entre(rng, -10, 10), forca: entre(rng, 50, 70), efeito: 0 });
  const noAngulo: Escolher = (_, rng) => ({ dir: lado(rng) * entre(rng, 74, 80), forca: entre(rng, 80, 84), efeito: 0 });
  const cantoRasteiro: Escolher = (_, rng) => ({ dir: lado(rng) * entre(rng, 78, 86), forca: entre(rng, 36, 46), efeito: 0 });
  const soCavadinha: Escolher = (_, rng) => ({ dir: entre(rng, -10, 10), forca: entre(rng, 12, 20), efeito: 0 });
  const umaCavadinhaPorPartida: Escolher = (ver, rng, i) => (i === 0 ? soCavadinha(ver, rng, i) : noMeio(ver, rng, i));
  // Quem conhece a semente:
  const maisPontos: Escolher = (ver) => CANDIDATOS.reduce((a, b) => (ver(b).pontos > ver(a).pontos ? b : a));
  const cavadinhaQuandoEntra: Escolher = (ver, rng, i) => (ver(CANDIDATOS[0]).desfecho === 'gol' ? CANDIDATOS[0] : colocado(ver, rng, i));
  const colocadoOndeNaoChega: Escolher = (ver) => (ver(CANDIDATOS[5]).desfecho === 'gol' ? CANDIDATOS[5] : CANDIDATOS[6]);

  it('quem manda o chute que mais rende é marcado, mesmo caindo no lado do goleiro de vez em quando', () => {
    for (const d of [0, 0.5, 1]) {
      const h = jogar(31, d, 12, maisPontos);
      // Não foge do lado (faz gol nele, fora do alcance): a regra do lado sozinha não pegaria.
      expect(semLer(h).slice(0, 40).some(noLadoDoGoleiro)).toBe(true);
      expect(motivoSuspeita(h)).toMatch(/^cobranças: nenhuma defendida pelo goleiro em \d+$/);
    }
  });

  it('quem só usa a semente para chutar colocado onde o goleiro não chega, ou só na cavadinha, também', () => {
    for (const d of [0, 0.5, 1]) {
      expect(motivoSuspeita(jogar(32, d, 20, colocadoOndeNaoChega))).not.toBeNull();
      // Cavadinha só quando entra e o resto honesto: as defesas do resto zeram a conta de vez em quando, então a marca
      // demora mais. Fecha partida por partida, como o servidor.
      let marcados = 0;
      for (let k = 0; k < 20; k++) {
        const h = jogar(500 + k, d, 40, cavadinhaQuandoEntra);
        if (h.some((_, i) => motivoSuspeita(h.slice(i)))) marcados++;
      }
      expect(marcados).toBeGreaterThanOrEqual(10);
    }
  });

  it('honestos de todo jeito: quem mira no ângulo nunca é marcado, e os outros quase nunca', () => {
    const marcados = (escolher: Escolher, sal: number, jogadores: number) => {
      let n = 0;
      for (let k = 0; k < jogadores; k++) if (motivoSuspeita(jogar(sal + k, (k % 7) / 6, 40, escolher))) n++;
      return n;
    };
    // 200 cobranças no ângulo sem nenhuma defesa ainda ficam longe do limite: a bola no ângulo quase não pesa.
    expect(marcados(noAngulo, 10_000, 300)).toBe(0);
    expect(marcados(cantoRasteiro, 20_000, 300)).toBe(0);
    for (const [k, estilo] of [colocado, noMeio, soCavadinha, umaCavadinhaPorPartida].entries()) expect(marcados(estilo, 30_000 + 1000 * k, 300)).toBeLessThanOrEqual(1);
  });

  // Cobranças feitas à mão: três cavadinhas lidas (não entram na conta, mas o goleiro aprende) e uma sem leitura no fim.
  const cavadinha = (leu: boolean, desfecho: 'gol' | 'defesa') => ({ goleiroLeu: leu, zonaBola: 4, zonaGoleiro: leu ? 1 : 0, goleiroX: leu ? 0 : -0.6, x: 0, y: 0.8, cavadinha: true, fraca: false, desfecho });
  const quartaCavadinha = (desfecho: 'gol' | 'defesa') => ({ cobrancas: [cavadinha(true, 'defesa'), cavadinha(true, 'defesa'), cavadinha(true, 'defesa'), cavadinha(false, desfecho)], defesas: [] });

  it('pesa pela chance: três "quartas cavadinhas" que entram (5% cada) já passam do limite; duas, não', () => {
    // O limite é 0,8^40 ≈ 0,000133; 0,05² = 0,0025 e 0,05³ = 0,000125.
    expect(motivoSuspeita([quartaCavadinha('gol'), quartaCavadinha('gol')])).toBeNull();
    expect(motivoSuspeita([quartaCavadinha('gol'), quartaCavadinha('gol'), quartaCavadinha('gol')])).toBe('cobranças: nenhuma defendida pelo goleiro em 3');
  });

  it('uma defesa no caminho zera a conta', () => {
    expect(motivoSuspeita([quartaCavadinha('gol'), quartaCavadinha('gol'), quartaCavadinha('defesa'), quartaCavadinha('gol'), quartaCavadinha('gol')])).toBeNull();
    // Defesa mais antiga que o trecho que já encheu a conta não salva.
    expect(motivoSuspeita([quartaCavadinha('gol'), quartaCavadinha('gol'), quartaCavadinha('gol'), quartaCavadinha('defesa')])).not.toBeNull();
  });

  it('a certeza sai de janelaCobrancas, o mesmo número da regra do lado', () => {
    const cfg = (janelaCobrancas: number) => ({ janelaDefesas: 30, minDefesas: 27, janelaCobrancas });
    // 0,8^10 ≈ 0,11: uma "quarta cavadinha" que entra (0,05) já passa. 0,8^60 ≈ 0,0000015: quatro (0,00000625) não, cinco sim.
    expect(motivoSuspeita([quartaCavadinha('gol')], cfg(10))).toBe('cobranças: nenhuma defendida pelo goleiro em 1');
    const seguidas = (k: number) => Array.from({ length: k }, () => quartaCavadinha('gol'));
    expect(motivoSuspeita(seguidas(4), cfg(60))).toBeNull();
    expect(motivoSuspeita(seguidas(5), cfg(60))).toBe('cobranças: nenhuma defendida pelo goleiro em 5');
  });

  it('cobrança do motor 2 sem a posição da bola (resultado incompleto) não pesa nem quebra', () => {
    const semPosicao = { goleiroLeu: false, zonaBola: 4, zonaGoleiro: 4, goleiroX: 0 };
    expect(motivoSuspeita([{ cobrancas: Array.from({ length: 60 }, () => semPosicao), defesas: [] }])).toBeNull();
  });

  it('janela misturada: cada uma do motor 1 fora da zona do goleiro pesa 5/6 e soma com as do motor 2', () => {
    const antiga = { goleiroLeu: false, zonaBola: 0, zonaGoleiro: 3 };
    const antigas = (n: number) => ({ cobrancas: Array.from({ length: n }, () => antiga), defesas: [] });
    // 36 antigas sozinhas não enchem nenhuma das duas contas (a do lado pede 40). Com uma "quarta cavadinha" que entrou
    // depois delas (0,05), a conta passa de 0,8^40 na 33ª antiga: 0,05 x (5/6)^33 ≈ 0,000122.
    expect(motivoSuspeita([antigas(36)])).toBeNull();
    expect(motivoSuspeita([quartaCavadinha('gol'), antigas(32)])).toBeNull();
    expect(motivoSuspeita([quartaCavadinha('gol'), antigas(36)])).toBe('cobranças: nenhuma defendida pelo goleiro em 34');
    // Uma antiga na zona do goleiro, mais recente que as outras, zera.
    const naZona = { cobrancas: [{ goleiroLeu: false, zonaBola: 2, zonaGoleiro: 2 }], defesas: [] };
    expect(motivoSuspeita([quartaCavadinha('gol'), naZona, antigas(36)])).toBeNull();
  });

  it('só com partidas do motor 1 o veredito é o de sempre, igualzinho', () => {
    /** A regra como era antes do motor 2: as defesas, e 40 cobranças sem leitura com nenhuma na zona do goleiro. */
    const deSempre = (todas: ReturnType<typeof historico>) => {
      const defesas = todas.flatMap((p) => [...p.defesas].reverse()).filter((d) => !d.contraGravada && d.desfecho !== 'fora').slice(0, 30);
      const pegas = defesas.filter((d) => d.desfecho === 'defesa').length;
      if (defesas.length === 30 && pegas >= 27) return `defesas: ${pegas} de 30`;
      const cobrancas = todas.flatMap((p) => [...p.cobrancas].reverse()).filter((c) => !c.goleiroLeu).slice(0, 40);
      return cobrancas.length === 40 && cobrancas.every((c) => c.zonaBola !== c.zonaGoleiro) ? 'cobranças: nenhuma no canto do goleiro em 40' : null;
    };
    let marcadas = 0;
    for (let k = 0; k < 1500; k++) {
      const h = historico(1 + (k % 16), 70_000 + k, (k % 7) / 6, k % 3 === 0);
      const motivo = motivoSuspeita(h);
      expect(motivo).toBe(deSempre(h));
      if (motivo) marcadas++;
    }
    expect(marcadas).toBeGreaterThan(100);
  });
});
