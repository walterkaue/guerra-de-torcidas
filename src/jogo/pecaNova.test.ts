import { describe, expect, it } from 'vitest';
import {
  gruposDaPecaNova,
  itemDaSelecao,
  itensDasMedalhas,
  linhaDaProxima,
  linhasAntesDaPartida,
  paraAnunciar,
  pecaParaVestir,
  pecasDaPartida,
  vestirAsNovas,
  type LinhaDeMedalha,
} from './pecaNova';
import { PADRAO, pecaPorId, proximaPeca, type Peca } from './vestiario';

const ids = (ps: readonly Peca[]) => ps.map((p) => p.id);
const peca = (id: string) => pecaPorId(id)!;

describe('próxima peça (bloco do Perfil)', () => {
  it('Estreante: a do Reserva; Reserva: a chuteira do Titular', () => {
    expect(proximaPeca({ nivel: 0, medalhas: [], aquecido: false })?.condicao).toBe('Libera no Reserva');
    const p = proximaPeca({ nivel: 1, medalhas: [], aquecido: false })!;
    expect(p.peca.id).toBe('chuteira_time');
    expect(linhaDaProxima(p)).toBe('Próxima: chuteira nas cores do time, no Titular');
    expect(linhaDaProxima(proximaPeca({ nivel: 5, medalhas: [], aquecido: false }))).toBe('Próxima: apito no pescoço, com o Aquecimento completo');
    expect(linhaDaProxima(null)).toBeNull();
  });

  it('na Lenda, a mais fácil das outras; com tudo, nenhuma', () => {
    expect(proximaPeca({ nivel: 5, medalhas: [], aquecido: false })?.peca.id).toBe('apito');
    const ouro = { tipo: 'lance' as const, gols: 50, recriados: 10, vitorias: 0, daSelecao: true };
    const disputa = { tipo: 'disputa' as const, gols: 100, recriados: 0, vitorias: 10, daSelecao: false };
    expect(proximaPeca({ nivel: 5, medalhas: [ouro, ouro, ouro, ouro, disputa], aquecido: true })).toBeNull();
  });
});

describe('antes da partida', () => {
  it('tira o que a partida somou em cada item, nunca abaixo de zero', () => {
    const depois: LinhaDeMedalha[] = [
      { lance_id: 'a', gols: 6, recriados: 1 },
      { lance_id: 'penaltis:d', gols: 12, recriados: 0, vitorias: 3 },
      { lance_id: 'b', gols: 2, recriados: 0 },
    ];
    expect(
      linhasAntesDaPartida(depois, [
        { item: 'a', gols: 1, recriados: 1, vitorias: 0 },
        { item: 'a', gols: 1, recriados: 0, vitorias: 0 },
        { item: 'penaltis:d', gols: 5, recriados: 0, vitorias: 1 },
        { item: 'b', gols: 9, recriados: 0, vitorias: 0 },
      ]),
    ).toEqual([
      { lance_id: 'a', gols: 4, recriados: 0, vitorias: 0 },
      { lance_id: 'penaltis:d', gols: 7, recriados: 0, vitorias: 2 },
      { lance_id: 'b', gols: 0, recriados: 0, vitorias: 0 },
    ]);
  });

  it('item de pênaltis vira disputa; a Seleção vem do catálogo', () => {
    expect([itemDaSelecao('selecao-1994-x'), itemDaSelecao('penaltis:selecao-2016'), itemDaSelecao('flamengo-2019'), itemDaSelecao('selecao')]).toEqual([true, true, false, false]);
    const itens = itensDasMedalhas([{ lance_id: 'penaltis:x', gols: 1, recriados: 0 }, { lance_id: 'selecao-1', gols: 1, recriados: 0 }]);
    expect(itens.map((i) => [i.tipo, i.daSelecao])).toEqual([
      ['disputa', false],
      ['lance', true],
    ]);
  });
});

describe('peças da partida (só peça nova de verdade)', () => {
  it('subir pra Titular libera chuteira, pose e Túnel', () => {
    expect(ids(pecasDaPartida({ xpAntes: 990, xpDepois: 1_010, medalhasDepois: [], jogadas: [] }))).toEqual([
      'chuteira_time',
      'pose_bracos',
      'fundo_tunel',
    ]);
  });

  it('XP sem trocar de nível não libera nada', () => {
    expect(pecasDaPartida({ xpAntes: 200, xpDepois: 230, medalhasDepois: [], jogadas: [] })).toEqual([]);
  });

  it('sem XP visto antes, o nível não anuncia (não dá para saber o que mudou)', () => {
    expect(pecasDaPartida({ xpAntes: null, xpDepois: 1_010, medalhasDepois: [], jogadas: [] })).toEqual([]);
  });

  it('1º bronze no lance jogado libera a munhequeira bronze', () => {
    const r = pecasDaPartida({
      xpAntes: 300,
      xpDepois: 320,
      medalhasDepois: [{ lance_id: 'l1', gols: 5, recriados: 0 }],
      jogadas: [{ item: 'l1', gols: 1, recriados: 0, vitorias: 0 }],
    });
    expect(ids(r)).toEqual(['munhequeira_bronze']);
  });

  it('bronze que já existia em outro item não é novo', () => {
    const r = pecasDaPartida({
      xpAntes: 300,
      xpDepois: 320,
      medalhasDepois: [
        { lance_id: 'velho', gols: 7, recriados: 0 },
        { lance_id: 'l1', gols: 5, recriados: 0 },
      ],
      jogadas: [{ item: 'l1', gols: 1, recriados: 0, vitorias: 0 }],
    });
    expect(r).toEqual([]);
  });

  it('ouro na disputa: 1º ouro e ouro nos pênaltis juntos', () => {
    const r = pecasDaPartida({
      xpAntes: 300,
      xpDepois: 320,
      medalhasDepois: [{ lance_id: 'penaltis:d', gols: 120, recriados: 0, vitorias: 10 }],
      jogadas: [{ item: 'penaltis:d', gols: 5, recriados: 0, vitorias: 1 }],
    });
    expect(ids(r)).toEqual(['goleiro', 'chuteira_dourada', 'fundo_rede']);
  });

  it('o apito nunca sai no resultado', () => {
    const r = pecasDaPartida({ xpAntes: 0, xpDepois: 120, medalhasDepois: [], jogadas: [] });
    expect(ids(r)).toEqual(['colete', 'fundo_banco']);
  });

  it('XP de antes maior que o de depois não inventa nada', () => {
    expect(pecasDaPartida({ xpAntes: 5_000, xpDepois: 1_200, medalhasDepois: [], jogadas: [] })).toEqual([]);
  });
});

describe('anunciada uma vez por aparelho', () => {
  it('tira as que o aparelho já viu', () => {
    const novas = [peca('chuteira_time'), peca('pose_bracos'), peca('fundo_tunel')];
    expect(ids(paraAnunciar(novas, new Set(['pose_bracos'])))).toEqual(['chuteira_time', 'fundo_tunel']);
    expect(paraAnunciar(novas, new Set(ids(novas)))).toEqual([]);
  });
});

describe('o bloco', () => {
  it('agrupa pela conquista', () => {
    const g = gruposDaPecaNova([peca('fundo_tunel'), peca('munhequeira_bronze'), peca('chuteira_time')]);
    expect(g).toEqual([
      { titulo: 'Subiu pra Titular!', pecas: [peca('chuteira_time'), peca('fundo_tunel')] },
      { titulo: 'Primeiro bronze!', pecas: [peca('munhequeira_bronze')] },
    ]);
  });

  it('"Vestir agora" escolhe a primeira que aparece no vestiário (a pose é só do card)', () => {
    expect(pecaParaVestir([peca('pose_bracos'), peca('fundo_tunel')])?.id).toBe('fundo_tunel');
    expect(pecaParaVestir([peca('pose_bracos')])?.id).toBe('pose_bracos');
    expect(pecaParaVestir([])).toBeNull();
  });

  it('o boneco do bloco veste todas as novas', () => {
    const v = vestirAsNovas(PADRAO, [peca('chuteira_time'), peca('pose_bracos'), peca('fundo_tunel')]);
    expect([v.chuteira, v.pose, v.fundo]).toEqual(['time', 'bracos', 'tunel']);
    expect(PADRAO.fundo).toBe('gramado');
  });
});
