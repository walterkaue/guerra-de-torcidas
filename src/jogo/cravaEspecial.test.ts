// Jogos especiais (rodada de um jogo só) e o encerramento do Brasileirão: título, time de fora, rodada em foco e o
// resumo do card "Resultado do Brasileirão".

import { describe, expect, it } from 'vitest';
import type { Placar } from './crava';
import {
  AVISO_RESENHA,
  FAIXA_DE_FORA,
  ladoDoJogo,
  linhaAcertosDoBrasileirao,
  linhaPosicaoFinal,
  nomeDaRodada,
  palpiteContraNoJogo,
  resumoDoBrasileirao,
  rodadaEmFoco,
  rodadasNoTempo,
  textoMeusPalpites,
  textoResultadoBrasileirao,
  textoResultadoRodada,
  tituloDaRodadaEspecial,
  tituloDoEspecial,
  torcidaQueMaisPontuou,
  type JogoComPlacar,
} from './cravaTela';

const utc = (s: string) => new Date(`${s}Z`);
const agora = utc('2026-12-10T12:00:00');
const dia = (n: number) => new Date(agora.getTime() + n * 24 * 3600_000).toISOString();
const bras = (rodada: number, inicio: string) => ({ rodada, inicio });
const esp = (rodada: number, inicio: string) => ({ rodada, inicio, competicao: 'Copa do Brasil' });

describe('título do jogo especial', () => {
  it('com e sem fase', () => {
    expect(tituloDoEspecial('Copa do Brasil', 'Final')).toBe('Copa do Brasil · Final');
    expect(tituloDoEspecial('Copa Intercontinental', 'Quartas')).toBe('Copa Intercontinental · Quartas');
    expect(tituloDoEspecial('Supercopa', null)).toBe('Supercopa');
    expect(tituloDoEspecial('Supercopa', '  ')).toBe('Supercopa');
  });

  it('nome da rodada: o título do especial, nunca "1001ª rodada"', () => {
    const jogos = [{ rodada: 33 }, { rodada: 1001, competicao: 'Copa do Brasil', fase: 'Final' }];
    expect(nomeDaRodada(jogos, 33)).toBe('33ª rodada');
    expect(nomeDaRodada(jogos, 1001)).toBe('Copa do Brasil · Final');
    expect(tituloDaRodadaEspecial(jogos, 33)).toBeNull();
  });
});

describe('time de fora', () => {
  const nomeDoTime = (id: string) => `Time ${id}`;

  it('um dos 20 usa o nome do time; o de fora, só o nome vindo do servidor', () => {
    const j = { mandante_id: 'flamengo', visitante_id: null, mandante_fora: null, visitante_fora: 'Estrela do Norte' };
    expect(ladoDoJogo(j, 'm', nomeDoTime)).toEqual({ id: 'flamengo', nome: 'Time flamengo', fora: false });
    expect(ladoDoJogo(j, 'v', nomeDoTime)).toEqual({ id: null, nome: 'Estrela do Norte', fora: true });
  });

  it('o lado de fora não tem id (sem cor nem escudo de clube) e sem nome cai num rótulo neutro', () => {
    const j = { mandante_id: null, visitante_id: 'bahia', mandante_fora: '  ', visitante_fora: null };
    expect(ladoDoJogo(j, 'm', nomeDoTime)).toEqual({ id: null, nome: 'Time de fora', fora: true });
  });

  it('a faixa neutra tem contraste de pelo menos 4,5:1', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [a, b] = [lum(FAIXA_DE_FORA.fundo), lum(FAIXA_DE_FORA.texto)].sort((x, y) => y - x);
    expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it('palpite contra o próprio time só vale com o seu time no jogo', () => {
    const p: Placar = { m: 0, v: 1 };
    expect(palpiteContraNoJogo(p, { mandante_id: 'flamengo', visitante_id: null }, 'flamengo')).toBe(true);
    expect(palpiteContraNoJogo(p, { mandante_id: 'bahia', visitante_id: null }, 'flamengo')).toBe(false);
    expect(palpiteContraNoJogo(p, { mandante_id: null, visitante_id: null }, null)).toBe(false);
    expect(palpiteContraNoJogo({ m: 1, v: 0 }, { mandante_id: null, visitante_id: 'flamengo' }, 'flamengo')).toBe(true);
  });
});

describe('rodada em foco com jogo especial', () => {
  const brasileirao = [bras(37, dia(-14)), bras(38, dia(-7))];

  it('especial a menos de 7 dias entra na ordem do tempo e vira o foco', () => {
    expect(rodadaEmFoco([...brasileirao, esp(1001, dia(6))], agora)).toBe(1001);
    expect(rodadaEmFoco([...brasileirao, esp(1001, dia(7))], agora)).toBe(1001);
  });

  it('especial a mais de 7 dias não conta: o foco segue na última do Brasileirão', () => {
    expect(rodadaEmFoco([...brasileirao, esp(1001, dia(8))], agora)).toBe(38);
  });

  it('especial já jogado (mais de 36 h) deixa o foco na última candidata', () => {
    expect(rodadaEmFoco([...brasileirao, esp(1001, dia(-2))], agora)).toBe(1001);
    expect(rodadaEmFoco([...brasileirao, esp(1001, dia(-9))], agora)).toBe(38); // o especial foi antes da 38ª: a última candidata é a 38ª
    expect(rodadaEmFoco([...brasileirao, esp(1001, dia(-9)), bras(1, dia(-100))], agora)).toBe(38);
  });

  it('especial entre duas rodadas do Brasileirão: vale a ordem do tempo, não o número', () => {
    const jogos = [bras(33, dia(-1)), bras(34, dia(3)), esp(1001, dia(1))];
    expect(rodadasNoTempo(jogos)).toEqual([33, 1001, 34]);
    // 33 passou há 24 h (<36 h): segue em foco; passadas 36 h, vai para o especial e depois a 34
    expect(rodadaEmFoco(jogos, agora)).toBe(33);
    expect(rodadaEmFoco(jogos, new Date(agora.getTime() + 20 * 3600_000))).toBe(1001);
    expect(rodadaEmFoco(jogos, new Date(agora.getTime() + 4 * 24 * 3600_000))).toBe(34);
  });

  it('empate de mediana desempata pelo número; sem jogos, null', () => {
    expect(rodadasNoTempo([esp(1002, dia(2)), esp(1001, dia(2))])).toEqual([1001, 1002]);
    expect(rodadaEmFoco([], agora)).toBeNull();
    expect(rodadaEmFoco([esp(1001, dia(30))], agora)).toBeNull();
  });
});

describe('textos do jogo especial', () => {
  it('meus palpites e resultado levam o título do especial', () => {
    const linhas = [{ mandante: 'Flamengo', visitante: 'Estrela do Norte', placar: { m: 2, v: 1 }, certeza: false }];
    const meus = textoMeusPalpites('Copa do Brasil · Final', linhas, 'x');
    expect(meus).toContain('Meus palpites, Copa do Brasil · Final:');
    expect(meus).toContain('Flamengo 2 x 1 Estrela do Norte');
    expect(meus).not.toContain('⭐');
    const res = textoResultadoRodada('Copa do Brasil · Final', 40, 'pro Flamengo', [{ acerto: 'exato', certeza: false }], 'x');
    expect(res).toContain('Palpite da Rodada, Copa do Brasil · Final: 40 pontos pro Flamengo');
    expect(res).toContain(AVISO_RESENHA);
  });
});

describe('Resultado do Brasileirão', () => {
  const j = (id: string, rodada: number, gols: [number, number] | null, extra: Partial<JogoComPlacar> = {}): JogoComPlacar => ({
    id,
    rodada,
    inicio: dia(-10),
    status_api: 'FINISHED',
    confirmado_em: gols ? dia(-9) : null,
    anulado: false,
    gols_mandante: gols?.[0] ?? null,
    gols_visitante: gols?.[1] ?? null,
    ...extra,
  });
  const jogos = [
    j('a', 37, [1, 0]),
    j('b', 37, [2, 2]),
    j('c', 38, [2, 1]),
    j('d', 38, [0, 0]),
    j('e', 38, [3, 0]),
    j('f', 38, null, { anulado: true }),
    j('g', 39, null), // sem resultado: a rodada não conta
    j('esp', 1001, [1, 0], { competicao: 'Copa do Brasil' }),
  ];
  const palpites = new Map<string, Placar>([
    ['a', { m: 1, v: 0 }], // exato
    ['b', { m: 1, v: 1 }], // empate com outro placar: saldo
    ['c', { m: 3, v: 0 }], // só o vencedor
    ['d', { m: 1, v: 0 }], // errou
    ['f', { m: 1, v: 0 }], // anulado: não conta
    ['g', { m: 1, v: 0 }],
    ['esp', { m: 1, v: 0 }], // especial fica fora
  ]);
  const pos = { posicao: 37, total: 412, pontos: 74 };

  it('conta as rodadas palpitadas e 🎯 ✅ 👍, só do Brasileirão, e usa a posição do servidor', () => {
    const r = resumoDoBrasileirao(jogos, palpites, new Map([[37, 'a']]), pos)!;
    expect(r).toEqual({ pontos: 74, rodadas: 2, exatos: 1, saldos: 1, vencedores: 1, posicao: 37, total: 412 });
    expect(linhaAcertosDoBrasileirao(r)).toBe('🎯 1 ✅ 1 👍 1');
  });

  it('quem nunca palpitou no Brasileirão (sem posição) não tem card', () => {
    expect(resumoDoBrasileirao(jogos, new Map(), new Map(), null)).toBeNull();
  });

  it('texto de WhatsApp em 1ª pessoa, 2 linhas, com o aviso fixo e sem palavra de aposta', () => {
    const r = resumoDoBrasileirao(jogos, palpites, new Map(), pos)!;
    const t = textoResultadoBrasileirao(r, 'pro Flamengo', 'link');
    const linhas = t.split('\n');
    expect(linhas[0]).toBe('Fechei o Palpite da Rodada no Brasileirão: 74 pontos pro Flamengo');
    expect(linhas[1]).toBe('🎯 1 ✅ 1 👍 1 · 37º de 412');
    expect(linhas[2]).toBe('');
    expect(t).toContain(AVISO_RESENHA);
    expect(linhas.slice(0, 2).join(' ')).not.toMatch(/valendo|prêmio|lucro|cravar|placar exato/i);
    expect(textoResultadoBrasileirao(r, null, 'link')).toContain('74 pontos\n');
  });

  it('posição final e torcida que mais pontuou', () => {
    expect(linhaPosicaoFinal(pos)).toBe('Você foi o 37º de 412');
    const ranking = [
      { time_id: 'bahia', palpiteiros: 0, posicao: 1 },
      { time_id: 'flamengo', palpiteiros: 30, posicao: 3 },
      { time_id: 'vasco', palpiteiros: 25, posicao: 2 },
    ];
    expect(torcidaQueMaisPontuou(ranking)).toBe('vasco');
    expect(torcidaQueMaisPontuou([{ time_id: 'bahia', palpiteiros: 0, posicao: 1 }])).toBeNull();
    expect(torcidaQueMaisPontuou([])).toBeNull();
  });
});
