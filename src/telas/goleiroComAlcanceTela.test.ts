// O que a tela, o narrador, as dicas e o "?" mostram no motor 2 dos pênaltis (goleiro com alcance).
import { describe, expect, it } from 'vitest';
import { criarDicas, DICAS, type EstadoDasDicas } from '../jogo/dicas';
import { cavadinhaPegaNoMeio, cavadinhaRepetidaEsperada } from '../jogo/dicasGatilhos';
import { legendaDaCobranca } from '../jogo/legendaDaCobranca';
import {
  PONTOS_GOLEIRO,
  PONTOS_UNIFICADOS,
  desfechoDoGoleiro,
  resolverCobranca,
  type GestoCobranca,
  type ResultadoCobranca,
  type SorteiosDoGoleiro,
} from '../jogo/penaltis';
import { pontosDosPenaltis } from '../jogo/regrasUnificadas';
import { eventoDaCobranca } from '../narrador/lance';
import { DENTRO_DO_GOL, RASPA, alvoDoGoleiro, bolaDepoisDoLance } from './mergulho';
import { htmlDasRegras } from './regras';

const S: SorteiosDoGoleiro = { tremX: 0, tremY: 0, leitura: 0.99, lado: 0, posX: 0.5, posY: 0.5, erroX: 0, erroY: 0, toque: 0.5 };
const lance = (x: number, y: number, s: Partial<SorteiosDoGoleiro> = {}, extra: { cavadinha?: boolean; fraca?: boolean } = {}, antes = 0) =>
  desfechoDoGoleiro({ x, y, cavadinha: false, fraca: false, ...extra }, { ...S, ...s }, 0.5, PONTOS_GOLEIRO, antes);
const encaixou = lance(0.5, 0.5, { leitura: 0 });
const espalmou = lance(0.5, 0.5, { leitura: 0, erroX: 1.5, toque: 0.5 });
const tocou = lance(0.5, 0.5, { leitura: 0, erroX: 1.5, toque: 0.05 });
const contrape = lance(0.8, 0.4);
const cavadinhaEsperada = lance(0, 0.8, { lado: 0.5 }, { cavadinha: true }, 1);
const CAV: GestoCobranca = { dir: 0, forca: 15, efeito: 0 };
const NORMAL: GestoCobranca = { dir: 60, forca: 70, efeito: 0 };

describe('legenda do resultado do lance', () => {
  it('motor 2: a colocação com os pontos, e o jeito da defesa', () => {
    expect(legendaDaCobranca(lance(0.1, 0.5, { lado: 0.99 }))).toBe('No meio · +4');
    expect(legendaDaCobranca(tocou)).toBe('Colocado · +6');
    expect(legendaDaCobranca(contrape)).toBe('No canto · +8');
    expect(legendaDaCobranca(lance(0.9, 0.9))).toBe('No ângulo · +12');
    expect(legendaDaCobranca(lance(0, 0.8, {}, { cavadinha: true }))).toBe('Cavadinha · +13');
    expect(legendaDaCobranca(encaixou)).toBe('Encaixou');
    expect(legendaDaCobranca(espalmou)).toBe('Espalmou');
    expect(legendaDaCobranca(lance(1.03, 0.5))).toBe('Na trave');
    expect(legendaDaCobranca(lance(0.2, 1.3))).toBe('Pra fora');
  });

  it('motor 1 continua como era', () => {
    const r = resolverCobranca(3, 0, { dir: 0, forca: 60, efeito: 0 }, 0, PONTOS_UNIFICADOS);
    const esperado = r.desfecho === 'gol' ? `Gol · +${r.pontos}` : r.desfecho === 'defesa' ? 'O goleiro pegou' : r.desfecho === 'trave' ? 'Na trave' : 'Pra fora';
    expect(legendaDaCobranca(r)).toBe(esperado);
  });
});

describe('narrador no motor 2', () => {
  it('cada jeito tem a sua situação, na prioridade do narrador.md', () => {
    expect(eventoDaCobranca(encaixou)).toBe('goleiro_encaixou');
    expect(eventoDaCobranca(espalmou)).toBe('goleiro_espalmou');
    expect(eventoDaCobranca(tocou)).toBe('gol_tocou');
    expect(eventoDaCobranca(contrape)).toBe('gol_contrape');
    expect(eventoDaCobranca(lance(0.8, 0.4, { lado: 0.99, posY: 0 }))).toBe('gol_cantinho');
    expect(eventoDaCobranca(lance(0.9, 0.9))).toBe('gol_angulo');
    expect(eventoDaCobranca(lance(0.97, 0.5))).toBe('trave_gol');
    expect(eventoDaCobranca(lance(0.2, 0.5, { lado: 0.99 }))).toBe('gol');
  });

  it('a cavadinha repetida que o goleiro esperou tem frase própria; a 1ª, não', () => {
    expect(eventoDaCobranca(cavadinhaEsperada, 1)).toBe('cavadinha_esperou');
    expect(eventoDaCobranca(cavadinhaEsperada, 0)).toBe('cavadinha_falhou');
    expect(eventoDaCobranca(lance(0, 0.8, {}, { cavadinha: true }), 1)).toBe('cavadinha');
  });
});

describe('dica do goleiro que aprende a cavadinha', () => {
  it('sai quando a 2ª cavadinha da partida morre com o goleiro esperando', () => {
    expect(cavadinhaRepetidaEsperada(cavadinhaEsperada, [CAV, CAV])).toBe(true);
    expect(cavadinhaRepetidaEsperada(cavadinhaEsperada, [NORMAL, CAV])).toBe(false);
    expect(cavadinhaRepetidaEsperada(cavadinhaEsperada, [CAV, CAV, CAV])).toBe(false);
    expect(cavadinhaRepetidaEsperada(lance(0, 0.8, {}, { cavadinha: true }), [CAV, CAV])).toBe(false);
    // Motor 1 nunca dispara (não tem goleiro que aprende); a dica antiga continua.
    const m1: ResultadoCobranca = { ...cavadinhaEsperada, goleiroX: undefined, goleiroY: undefined, jeito: undefined, faixa: undefined };
    expect(cavadinhaRepetidaEsperada(m1, [CAV, CAV])).toBe(false);
    expect(cavadinhaPegaNoMeio(cavadinhaEsperada)).toBe(true);
  });

  it('é o texto pedido e aparece uma vez só por aparelho', () => {
    expect(DICAS.pen_cavadinha_aprende).toBe('O goleiro aprende: cavadinha repetida ele espera no meio.');
    let estado: EstadoDasDicas = {};
    const d = criarDicas(() => estado, (e) => (estado = e));
    expect(d.pedir('pen_cavadinha_aprende')).toBe(DICAS.pen_cavadinha_aprende);
    d.novoLance();
    expect(d.pedir('pen_cavadinha_aprende')).toBeNull();
    // As outras seguem com 2 vezes.
    expect(d.pedir('pen_fraco')).not.toBeNull();
    d.novoLance();
    expect(d.pedir('pen_fraco')).not.toBeNull();
  });
});

describe('"?" das regras dos pênaltis', () => {
  it('motor 2: a tabela pela colocação e o goleiro que aprende a cavadinha', () => {
    expect(pontosDosPenaltis(PONTOS_GOLEIRO)).toEqual([
      ['Gol no meio', '4'],
      ['Gol colocado', '6'],
      ['Gol no canto', '8'],
      ['Gol no ângulo', '12'],
      ['Cavadinha que entra', '13'],
      ['Defesa', '7'],
      ['Vitória na disputa', '+15'],
      ['5 de 5 (cobranças ou defesas)', '+10'],
    ]);
    const html = htmlDasRegras('penaltis', null, PONTOS_GOLEIRO);
    expect(html).toContain('O goleiro aprende: cavadinha repetida ele espera no meio.');
    expect(html).toContain('O goleiro tem alcance.');
    expect(html).toContain('150');
  });

  it('motor 1: a tabela e o texto de sempre', () => {
    const html = htmlDasRegras('penaltis', null, PONTOS_UNIFICADOS);
    expect(html).not.toContain('O goleiro aprende');
    expect(html).not.toContain('O goleiro tem alcance.');
    expect(Object.fromEntries(pontosDosPenaltis(PONTOS_UNIFICADOS))['Gol']).toBe('7');
  });
});

describe('mergulho na tela (motor 2)', () => {
  it('motor 1 não tem alvo: pulo para a zona, como sempre', () => {
    expect(alvoDoGoleiro(resolverCobranca(1, 0, NORMAL, 0.5, PONTOS_UNIFICADOS))).toBeNull();
  });

  it('pegou: as luvas vão na bola; espalmou sai das mãos, encaixou fica', () => {
    expect(alvoDoGoleiro(encaixou)!.ponto).toEqual({ x: 0.5, y: 0.5 });
    expect(alvoDoGoleiro(espalmou)!.ponto).toEqual({ x: 0.5, y: 0.5 });
    expect(bolaDepoisDoLance(encaixou)).toBe('maos');
    expect(bolaDepoisDoLance(espalmou)).toBe('espalmada');
    expect(bolaDepoisDoLance(tocou)).toBe('rede');
  });

  it('tocou e entrou: a ponta da luva fica raspando na bola', () => {
    const p = alvoDoGoleiro(tocou)!.ponto!;
    expect(Math.hypot(p.x - tocou.x, p.y - tocou.y)).toBeCloseTo(RASPA, 6);
    // Do lado do goleiro: ele vinha da direita da bola (x 0,68).
    expect(p.x).toBeGreaterThan(tocou.x);
  });

  it('contrapé: as luvas vão ao ponto do mergulho, do outro lado', () => {
    const a = alvoDoGoleiro(contrape)!;
    expect(a.ponto).toEqual({ x: contrape.goleiroX, y: contrape.goleiroY });
    expect(a.zona % 3).toBe(0);
  });

  it('o desenho prende o ponto dentro do gol', () => {
    const fora = lance(0.97, 0.5, { leitura: 0, erroX: 1 });
    expect(fora.goleiroX).toBeGreaterThan(1);
    const p = alvoDoGoleiro({ ...fora, desfecho: 'gol', jeito: 'limpo' })!.ponto!;
    expect(p.x).toBe(DENTRO_DO_GOL.x);
  });

  it('a cavadinha que ele esperou: parado no meio, sem mergulho', () => {
    expect(alvoDoGoleiro(cavadinhaEsperada)).toEqual({ zona: 1, ponto: null });
  });
});
