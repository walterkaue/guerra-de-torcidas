// Motor 2 dos pênaltis: goleiro com alcance (decidido em 15/11/2026; docs/jogos/penaltis.md, "Gesto e física").
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criarAleatorio, misturar } from './aleatorio';
import {
  GOLEIRO,
  PONTOS,
  PONTOS_GOLEIRO,
  PONTOS_UNIFICADOS,
  RODADAS_MAX,
  cavadinhasAntes,
  chanceDoMeio,
  desfechoDoGoleiro,
  ehGestoDeCavadinha,
  faixaDoGol,
  resolverCobranca,
  resolverCobrancaDaRegra,
  resolverCobrancaGoleiro,
  simularPartida,
  sortearGoleiro,
  totalizar,
  trajetoria,
  type GestoCobranca,
  type Gestos,
  type SementesPartida,
  type SorteiosDoGoleiro,
} from './penaltis';
import { jogarLance, LanceInvalido, lerLance, passoAtual, type Lance } from './penaltisLance';
import { GOLEIRO_COM_ALCANCE_DESDE, tabelaPenaltisDaPartida, temGoleiroComAlcance } from './regraLances';

const SAL_COBRANCA = 0xc0b;
/** Sorteios neutros: o goleiro não lê (leitura 0,99), vai para a esquerda, no meio do lado e à meia altura. */
const S: SorteiosDoGoleiro = { tremX: 0, tremY: 0, leitura: 0.99, lado: 0, posX: 0.5, posY: 0.5, erroX: 0, erroY: 0, toque: 0.5 };
const bola = (x: number, y: number, extra: { cavadinha?: boolean; fraca?: boolean } = {}) => ({ x, y, cavadinha: false, fraca: false, ...extra });
const VAZIO: Gestos = { cobrancas: [], defesas: [] };
const CAVADINHA: GestoCobranca = { dir: 0, forca: 15, efeito: 0 };
const NORMAL: GestoCobranca = { dir: 60, forca: 70, efeito: 0 };

describe('motor 1 continua igual (partidas antigas)', () => {
  // Gerado com o penaltis.ts da main antes do motor 2: sementes, gestos, regra pela data e o hash do resultado inteiro.
  const antigas = JSON.parse(readFileSync(new URL('./dadosDeTeste/penaltis-motor1.json', import.meta.url), 'utf8')) as {
    criadaEm: string;
    sementes: SementesPartida;
    dificuldade: number;
    gestos: Gestos;
    gravadas?: GestoCobranca[];
    numeroNarrador?: number;
    total: number;
    hash: string;
  }[];

  it('refaz cada partida guardada exatamente como antes, ponto por ponto', () => {
    expect(antigas.length).toBeGreaterThan(40);
    for (const p of antigas) {
      const regra = tabelaPenaltisDaPartida(p.criadaEm);
      expect(regra).not.toBe(PONTOS_GOLEIRO);
      const r = simularPartida(p.sementes, p.gestos, p.dificuldade, p.numeroNarrador, p.gravadas, regra);
      expect(r.pontos.total).toBe(p.total);
      expect(createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0, 16)).toBe(p.hash);
    }
  });

  it('a regra do motor 1 não manda os campos do motor 2', () => {
    const r = resolverCobrancaDaRegra(5, 0, NORMAL, 0.5, PONTOS_UNIFICADOS, []);
    expect(r).toEqual(resolverCobranca(5, 0, NORMAL, 0.5, PONTOS_UNIFICADOS));
    expect('goleiroX' in r || 'jeito' in r || 'faixa' in r).toBe(false);
  });
});

describe('data de corte do motor 2', () => {
  it('segunda 23/11/2026, 0h de Brasília, numa constante só', () => {
    expect(GOLEIRO_COM_ALCANCE_DESDE.toISOString()).toBe('2026-11-23T03:00:00.000Z');
    expect(temGoleiroComAlcance('2026-11-22T23:59:59.999-03:00')).toBe(false);
    expect(temGoleiroComAlcance('2026-11-23T00:00:00.000-03:00')).toBe(true);
    expect(tabelaPenaltisDaPartida('2026-11-22T23:59:59-03:00')).toBe(PONTOS_UNIFICADOS);
    expect(tabelaPenaltisDaPartida('2026-11-23T00:00:01-03:00')).toBe(PONTOS_GOLEIRO);
    expect(tabelaPenaltisDaPartida('2026-11-07T12:00:00-03:00')).toBe(PONTOS);
  });
});

describe('sorteios do motor 2', () => {
  it('são 15, sempre na mesma ordem: tremor, leitura, lado, posição, 4 + 4 do erro, toque', () => {
    let n = 0;
    const valores = Array.from({ length: 20 }, (_, k) => (k + 1) / 21);
    const s = sortearGoleiro(() => valores[n++]);
    expect(n).toBe(15);
    expect(s.tremX).toBeCloseTo((valores[0] - 0.5) * 0.12);
    expect(s.tremY).toBeCloseTo((valores[1] - 0.5) * 0.12);
    expect([s.leitura, s.lado, s.posX, s.posY]).toEqual(valores.slice(2, 6));
    const soma = (a: number[]) => (a[0] + a[1] + a[2] + a[3] - 2) * 1.7320508075688772;
    expect(s.erroX).toBe(soma(valores.slice(6, 10)));
    expect(s.erroY).toBe(soma(valores.slice(10, 14)));
    expect(s.toque).toBe(valores[14]);
  });

  it('o erro de quem leu tem desvio 1 e média 0', () => {
    const rnd = criarAleatorio(7);
    let soma = 0;
    let soma2 = 0;
    const N = 40_000;
    for (let k = 0; k < N; k++) {
      const e = sortearGoleiro(rnd).erroX;
      soma += e;
      soma2 += e * e;
    }
    expect(Math.abs(soma / N)).toBeLessThan(0.02);
    expect(Math.sqrt(soma2 / N)).toBeCloseTo(1, 1);
  });

  it('o mesmo lance com e sem leitura consome os mesmos sorteios', () => {
    // Acha sementes em que o goleiro lê no domingo e não lê na segunda: a bola e o resto dos sorteios são os mesmos.
    let achou = 0;
    for (let semente = 1; achou < 20 && semente < 5000; semente++) {
      const s = sortearGoleiro(criarAleatorio(misturar(semente, SAL_COBRANCA, 0)));
      if (!(s.leitura >= 0.12 && s.leitura < 0.36)) continue;
      achou++;
      const leu = resolverCobrancaGoleiro(semente, 0, NORMAL, 1);
      const naoLeu = resolverCobrancaGoleiro(semente, 0, NORMAL, 0);
      expect(leu.goleiroLeu).toBe(true);
      expect(naoLeu.goleiroLeu).toBe(false);
      const t = trajetoria(NORMAL, s.tremX, s.tremY);
      expect([leu.x, leu.y]).toEqual([t.x, t.y]);
      expect([naoLeu.x, naoLeu.y]).toEqual([t.x, t.y]);
      expect(leu.goleiroX).toBe(t.x + 0.12 * s.erroX);
      expect(naoLeu.goleiroY).toBe(0.1 + 0.75 * s.posY);
      expect(leu).toEqual(desfechoDoGoleiro(t, s, 1));
      expect(naoLeu).toEqual(desfechoDoGoleiro(t, s, 0));
    }
    expect(achou).toBe(20);
  });

  it('é determinístico: mesma semente e mesmo gesto, mesmo resultado', () => {
    for (let s = 0; s < 50; s++) expect(resolverCobrancaGoleiro(s, s % 8, NORMAL, 0.5)).toEqual(resolverCobrancaGoleiro(s, s % 8, NORMAL, 0.5));
  });
});

describe('cada jeito do motor 2', () => {
  it('encaixou: quem leu e chegou em cheio defende', () => {
    const r = desfechoDoGoleiro(bola(0.5, 0.5), { ...S, leitura: 0 }, 0.5);
    expect(r).toMatchObject({ desfecho: 'defesa', jeito: 'encaixou', goleiroLeu: true, goleiroX: 0.5, goleiroY: 0.5, pontos: 0 });
  });

  it('espalmou e tocou: a luva chegou; entra ou não pelo sorteio do toque', () => {
    // Erro de 1,5 desvio em x: d² = (0,18 / 0,3)² = 0,36; chance de entrar (0,36 − 0,3) / 0,64 ≈ 9%.
    const s = { ...S, leitura: 0, erroX: 1.5 };
    expect(desfechoDoGoleiro(bola(0.5, 0.5), { ...s, toque: 0.5 }, 0.5)).toMatchObject({ desfecho: 'defesa', jeito: 'espalmou' });
    const tocou = desfechoDoGoleiro(bola(0.5, 0.5), { ...s, toque: 0.05 }, 0.5);
    expect(tocou).toMatchObject({ desfecho: 'gol', jeito: 'tocou', faixa: 'colocado', pontos: 6 });
  });

  it('raspou na ponta do dedo quase sempre entra; pegou em cheio quase nunca', () => {
    // d² perto de 1: (0,97 − 0,3) / 0,64 > 1, entra com qualquer toque.
    const longe = { ...S, leitura: 0, erroX: (0.3 * Math.sqrt(0.97)) / 0.12, toque: 0.999 };
    expect(desfechoDoGoleiro(bola(0, 0.5), longe, 0.5).jeito).toBe('tocou');
    // d² logo acima de 0,30: só entra com toque perto de 0.
    const perto = { ...S, leitura: 0, erroX: (0.3 * Math.sqrt(0.31)) / 0.12, toque: 0.05 };
    expect(desfechoDoGoleiro(bola(0, 0.5), perto, 0.5).jeito).toBe('espalmou');
  });

  it('contrapé: o goleiro mergulhou para o outro lado e a bola foi longe do meio', () => {
    const r = desfechoDoGoleiro(bola(0.8, 0.4), { ...S, lado: 0 }, 0.5);
    expect(r).toMatchObject({ desfecho: 'gol', jeito: 'contrape', faixa: 'canto', pontos: 8 });
    expect(r.goleiroX!).toBeLessThanOrEqual(-GOLEIRO.ladoMinimo);
    // Bola perto do meio (|x| até 0,3) com o goleiro do outro lado é gol limpo, não contrapé.
    expect(desfechoDoGoleiro(bola(0.25, 0.4), { ...S, lado: 0 }, 0.5)).toMatchObject({ desfecho: 'gol', jeito: 'limpo', faixa: 'meio', pontos: 4 });
  });

  it('limpo: gol do mesmo lado do goleiro, sem a luva chegar', () => {
    // Goleiro à direita, no fim do lado (x 0,85), alto; bola à direita, rasteira e colocada.
    const r = desfechoDoGoleiro(bola(0.5, 0.1), { ...S, lado: 0.99, posX: 1, posY: 1 }, 0.5);
    expect(r).toMatchObject({ desfecho: 'gol', jeito: 'limpo', faixa: 'colocado', pontos: 6 });
  });

  it('ângulo vale o canto mais o bônus; no ângulo o alcance encolhe', () => {
    const r = desfechoDoGoleiro(bola(0.9, 0.9), { ...S, lado: 0 }, 0.5);
    expect(r).toMatchObject({ desfecho: 'gol', angulo: true, faixa: 'angulo', pontos: 12 });
    // Quem leu com erro de 1,9 desvio em x (0,23): no meio do gol (alcance 0,3) espalma; no ângulo (alcance 0,21), não chega.
    const s = { ...S, leitura: 0, erroX: 1.9, toque: 0.99 };
    expect(desfechoDoGoleiro(bola(0.5, 0.5), s, 0.5).desfecho).toBe('defesa');
    expect(desfechoDoGoleiro(bola(0.9, 0.9), s, 0.5).desfecho).toBe('gol');
  });

  it('bola fraca dá mais alcance; no canto, os dois fatores juntos', () => {
    // Goleiro sem ler na esquerda baixa (x −0,6; y 0,1) e bola fraca no canto esquerdo (x −0,9; y 0,05):
    // distância 0,304; alcance 0,3 × 1,6 × 0,7 = 0,336 → d² ≈ 0,82, a luva chega.
    const s = { ...S, lado: 0, posX: 0.5, posY: 0, toque: 0.99 };
    expect(desfechoDoGoleiro(bola(-0.9, 0.05, { fraca: true }), s, 0.5).jeito).toBe('espalmou');
    expect(desfechoDoGoleiro(bola(-0.9, 0.05), s, 0.5).desfecho).toBe('gol');
  });

  it('o ponto do mergulho não é preso no gol (quem leu rente à trave pode cair fora dela)', () => {
    const r = desfechoDoGoleiro(bola(0.97, 0.5), { ...S, leitura: 0, erroX: 1 }, 0.5);
    expect(r.goleiroX).toBeGreaterThan(1);
  });

  it('trave e pra fora como no motor 1, sem jeito nem faixa', () => {
    expect(desfechoDoGoleiro(bola(1.03, 0.5), S, 0.5)).toMatchObject({ desfecho: 'trave', jeito: null, faixa: null, pontos: 0 });
    expect(desfechoDoGoleiro(bola(0.2, 1.3), S, 0.5)).toMatchObject({ desfecho: 'fora', jeito: null, faixa: null, pontos: 0 });
  });

  it('faixas: meio abaixo de 0,4, colocado até 0,75, canto daí pra frente', () => {
    expect([0, 0.39, 0.4, 0.74, 0.75, 1].map((x) => faixaDoGol(x, 0.5, false))).toEqual(['meio', 'meio', 'colocado', 'colocado', 'canto', 'canto']);
    expect(faixaDoGol(-0.8, 0.8, false)).toBe('angulo');
    expect(faixaDoGol(0.79, 0.8, true)).toBe('canto');
  });
});

describe('cavadinha no motor 2', () => {
  const cav = bola(0, 0.8, { cavadinha: true });

  it('morre se o goleiro leu ou ficou no meio; entra se ele foi para um lado', () => {
    expect(desfechoDoGoleiro(cav, { ...S, leitura: 0 }, 0.5)).toMatchObject({ desfecho: 'defesa', jeito: 'encaixou', zonaGoleiro: 1 });
    expect(desfechoDoGoleiro(cav, { ...S, lado: 0.5 }, 0.5)).toMatchObject({ desfecho: 'defesa', jeito: 'encaixou' });
    expect(desfechoDoGoleiro(cav, { ...S, lado: 0 }, 0.5)).toMatchObject({ desfecho: 'gol', jeito: 'limpo', pontos: 13, angulo: false });
  });

  it('o goleiro aprende: 20%, 45%, 70% e 95% de ficar no meio', () => {
    [0.2, 0.45, 0.7, 0.95, 0.95, 0.95].forEach((pm, k) => expect(chanceDoMeio(true, [0, 1, 2, 3, 4, 9][k])).toBeCloseTo(pm, 12));
    expect(chanceDoMeio(false, 3)).toBe(0.2);
    // Lado a 0,2 do meio: na 1ª cavadinha (0,1 de cada lado) ele foi para um lado; na 2ª (0,225), esperou no meio.
    const s = { ...S, lado: 0.7 };
    expect(desfechoDoGoleiro(cav, s, 0.5, PONTOS_GOLEIRO, 0).desfecho).toBe('gol');
    expect(desfechoDoGoleiro(cav, s, 0.5, PONTOS_GOLEIRO, 1).desfecho).toBe('defesa');
    // Contra chute normal a chance do meio é sempre 20%, com qualquer número de cavadinhas antes.
    expect(desfechoDoGoleiro(bola(0, 0.5), s, 0.5, PONTOS_GOLEIRO, 3).goleiroX).toBeGreaterThanOrEqual(GOLEIRO.ladoMinimo);
  });

  it('conta as cavadinhas pelo gesto normalizado, tenha entrado ou não', () => {
    expect(ehGestoDeCavadinha({ dir: 30.4, forca: 24.4, efeito: 50 })).toBe(true);
    expect(ehGestoDeCavadinha({ dir: 31, forca: 15, efeito: 0 })).toBe(false);
    expect(ehGestoDeCavadinha({ dir: 0, forca: 25, efeito: 0 })).toBe(false);
    const gestos = [CAVADINHA, NORMAL, CAVADINHA, CAVADINHA, NORMAL, CAVADINHA];
    expect(gestos.map((_, i) => cavadinhasAntes(gestos, i))).toEqual([0, 1, 1, 2, 3, 3]);
  });

  it('a lance-penalti ignora qualquer contagem mandada pelo celular', () => {
    const corpo = { tipo: 'cobranca', gesto: { dir: 0, forca: 15, efeito: 0, cavadinhasAntes: 3 }, cavadinhasAntes: 3, antes: 3 };
    expect(lerLance(corpo)).toEqual({ tipo: 'cobranca', gesto: { dir: 0, forca: 15, efeito: 0 } });
    expect(lerLance({ tipo: 'defesa', zona: 2, cavadinhasAntes: 3 })).toEqual({ tipo: 'defesa', zona: 2 });
    expect(() => lerLance({ tipo: 'cobranca', gesto: { dir: '0', forca: 15, efeito: 0 } })).toThrow(LanceInvalido);
    expect(() => lerLance({ tipo: 'outro' })).toThrow(LanceInvalido);
    // Primeira cobrança da partida: com o que vier do celular, o goleiro conta zero cavadinhas antes.
    for (let s = 1; s < 200; s++) {
      const r = jogarLance(s, VAZIO, lerLance(corpo), 0.5, undefined, PONTOS_GOLEIRO).cobranca!;
      expect(r).toEqual(resolverCobrancaGoleiro(s, 0, CAVADINHA, 0.5, PONTOS_GOLEIRO, 0));
    }
  });

  it('a 2ª cavadinha da partida usa 45% no meio (simularPartida conta ao longo da partida)', () => {
    // Semente da cobrança 2 com o goleiro sem ler e o lado entre 0,1 e 0,225 do meio: a 2ª cavadinha morre; a 1ª entraria.
    let semente = 0;
    for (let s = 1; s < 20000; s++) {
      const x = sortearGoleiro(criarAleatorio(misturar(s, SAL_COBRANCA, 1)));
      const d = Math.abs(x.lado - 0.5);
      if (x.leitura > 0.5 && d >= 0.1 && d < 0.225) {
        semente = s;
        break;
      }
    }
    expect(semente).toBeGreaterThan(0);
    const sementes = { cobrancas: Array.from({ length: RODADAS_MAX }, () => semente), defesas: Array.from({ length: RODADAS_MAX }, () => 1) };
    // Servidor: a lance-penalti conta nos gestos guardados (a 1ª cobrança já está em partidas_segredo).
    const servidor = (primeira: GestoCobranca) => {
      const um = jogarLance(sementes, VAZIO, { tipo: 'cobranca', gesto: primeira }, 0.5, undefined, PONTOS_GOLEIRO);
      const def = jogarLance(sementes, um.gestos, { tipo: 'defesa', zona: 0 }, 0.5, undefined, PONTOS_GOLEIRO);
      return jogarLance(sementes, def.gestos, { tipo: 'cobranca', gesto: CAVADINHA }, 0.5, undefined, PONTOS_GOLEIRO).cobranca!;
    };
    expect(servidor(CAVADINHA).desfecho).toBe('defesa');
    expect(servidor(NORMAL)).toMatchObject({ desfecho: 'gol', pontos: 13 });
    // Fechamento: a partida inteira refeita dá o mesmo que lance a lance.
    for (const primeira of [CAVADINHA, NORMAL]) {
      const { gestos, passo, lances } = jogarComGestos(sementes, [primeira, CAVADINHA, NORMAL], 0.5);
      const parOuImpar = passo.tipo === 'par_ou_impar' ? { escolha: 'par' as const, numero: 0 } : undefined;
      const final = simularPartida(sementes, { ...gestos, ...(parOuImpar ? { parOuImpar } : {}) }, 0.5, 1, undefined, PONTOS_GOLEIRO);
      expect(final.cobrancas[1].desfecho).toBe(primeira === CAVADINHA ? 'defesa' : 'gol');
      expect(lances.filter((l) => l.cobranca).map((l) => l.cobranca)).toEqual(final.cobrancas);
    }
  });
});

/** Joga a partida inteira lance a lance com as cobranças dadas (a última se repete) e a defesa na zona 0. */
function jogarComGestos(sementes: SementesPartida, cobrancas: GestoCobranca[], dificuldade: number) {
  let gestos = VAZIO;
  let passo = passoAtual(sementes, gestos, dificuldade, undefined, PONTOS_GOLEIRO);
  const lances = [];
  while (passo.tipo === 'cobranca' || passo.tipo === 'defesa') {
    const lance: Lance =
      passo.tipo === 'cobranca' ? { tipo: 'cobranca', gesto: cobrancas[Math.min(passo.i, cobrancas.length - 1)] } : { tipo: 'defesa', zona: 0 };
    const j = jogarLance(sementes, gestos, lance, dificuldade, undefined, PONTOS_GOLEIRO);
    lances.push(j);
    gestos = j.gestos;
    passo = j.proximo;
  }
  return { gestos, passo, lances };
}

/** Joga a partida inteira lance a lance, como o servidor faz com os gestos do celular. */
function jogarTudo(sementes: SementesPartida, sal: number, dificuldade: number) {
  const r = criarAleatorio(sal);
  let gestos = VAZIO;
  let passo = passoAtual(sementes, gestos, dificuldade, undefined, PONTOS_GOLEIRO);
  const lances = [];
  while (passo.tipo === 'cobranca' || passo.tipo === 'defesa') {
    const lance: Lance =
      passo.tipo === 'cobranca'
        ? { tipo: 'cobranca', gesto: r() < 0.4 ? { dir: r() * 60 - 30, forca: 8 + r() * 16, efeito: 0 } : { dir: r() * 200 - 100, forca: r() * 100, efeito: r() * 200 - 100 } }
        : { tipo: 'defesa', zona: Math.floor(r() * 7) - 1 };
    const j = jogarLance(sementes, gestos, lance, dificuldade, undefined, PONTOS_GOLEIRO);
    lances.push(j);
    gestos = j.gestos;
    passo = j.proximo;
  }
  return { gestos, passo, lances };
}

describe('partida do motor 2', () => {
  it('lance a lance dá o mesmo que a partida refeita no fechamento', () => {
    for (let s = 1; s <= 200; s++) {
      const sementes = { cobrancas: Array.from({ length: RODADAS_MAX }, (_, i) => misturar(s, i)), defesas: Array.from({ length: RODADAS_MAX }, (_, i) => misturar(s, i, 9)) };
      const d = (s % 7) / 6;
      const { gestos, passo, lances } = jogarTudo(sementes, s, d);
      const parOuImpar = passo.tipo === 'par_ou_impar' ? { escolha: 'par' as const, numero: 2 } : undefined;
      const final = simularPartida(sementes, { ...gestos, ...(parOuImpar ? { parOuImpar } : {}) }, d, 3, undefined, PONTOS_GOLEIRO);
      expect(lances.filter((l) => l.cobranca).map((l) => l.cobranca)).toEqual(final.cobrancas);
      expect(lances.filter((l) => l.defesa).map((l) => l.defesa)).toEqual(final.defesas);
      for (const c of final.cobrancas) expect(typeof c.goleiroX).toBe('number');
    }
  });

  it('a soma bate com os pontos de cada cobrança, e o máximo possível é 135', () => {
    for (let s = 1; s <= 100; s++) {
      const sementes = { cobrancas: Array.from({ length: RODADAS_MAX }, (_, i) => misturar(s, i, 3)), defesas: Array.from({ length: RODADAS_MAX }, (_, i) => misturar(s, i, 4)) };
      const { gestos, passo } = jogarTudo(sementes, s + 1000, 0.3);
      const parOuImpar = passo.tipo === 'par_ou_impar' ? { escolha: 'impar' as const, numero: 1 } : undefined;
      const r = simularPartida(sementes, { ...gestos, ...(parOuImpar ? { parOuImpar } : {}) }, 0.3, 4, undefined, PONTOS_GOLEIRO);
      const p = r.pontos;
      expect(p.gols + p.angulos + p.cavadinhas).toBe(r.cobrancas.reduce((t, c) => t + c.pontos, 0));
    }
    // 5 cavadinhas que entram, 5 defesas, vitória e os dois 5 de 5 (o caminho que mais paga).
    const t = PONTOS_GOLEIRO;
    expect(5 * Math.max(t.cavadinha, t.canto + t.angulo) + 5 * t.defesa + t.vitoria + 2 * t.cincoDeCinco).toBe(135);
    const gols = Array.from({ length: 5 }, () => desfechoDoGoleiro(bola(0, 0.8, { cavadinha: true }), { ...S, lado: 0 }, 0));
    const defesas = Array.from({ length: 5 }, () => ({ desfecho: 'defesa' as const, alvo: 0, zonaGoleiro: 0, contraGravada: false, pontos: t.defesa }));
    expect(totalizar(gols, defesas, undefined, t).pontos.total).toBe(135);
  });
});
