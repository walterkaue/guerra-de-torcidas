import { describe, expect, it } from 'vitest';
import {
  BARRAS,
  BRACOS,
  CABECAS,
  CAMISAS,
  CHUTEIRAS,
  comFormato,
  conferirFormato,
  FUNDOS,
  MOLDURAS,
  novasPecas,
  PADRAO,
  PECAS,
  PESCOCOS,
  pecasLiberadas,
  POSES,
  proximaPeca,
  PEITOS,
  PUNHOS,
  sortearComPecas,
  sortearDoComeco,
  textoDaCondicao,
  TAMANHO_MAXIMO,
  TOTAL_DE_PECAS,
  validar,
  type CampoDaPeca,
  type EstadoDoVestiario,
  type MedalhaDoItem,
} from './vestiario.ts';
import { medalhaDoLance } from './lances.ts';
import { medalhaDaDisputa } from './regraLances.ts';
import { trilhaDaDisputa, trilhaDoLance } from './lancesTextos.ts';

const lance = (gols: number, recriados = 0, daSelecao = false): MedalhaDoItem => ({ tipo: 'lance', gols, recriados, vitorias: 0, daSelecao });
const disputa = (gols: number, vitorias = 0, daSelecao = false): MedalhaDoItem => ({ tipo: 'disputa', gols, recriados: 0, vitorias, daSelecao });
const estado = (parcial: Partial<EstadoDoVestiario> = {}): EstadoDoVestiario => ({ nivel: 0, medalhas: [], aquecido: false, ...parcial });
const tem = (e: EstadoDoVestiario, id: string) => pecasLiberadas(e).includes(id);
const ids = (e: EstadoDoVestiario) => pecasLiberadas(e);

/** Gerador simples e determinístico em [0, 1). */
function semente(n: number): () => number {
  let s = n >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const LISTAS: Record<CampoDaPeca, readonly string[]> = {
  camisa: CAMISAS,
  cabeca: CABECAS,
  punho: PUNHOS,
  braco: BRACOS,
  peito: PEITOS,
  pescoco: PESCOCOS,
  chuteira: CHUTEIRAS,
  pose: POSES,
  fundo: FUNDOS,
  moldura: MOLDURAS,
};

describe('catálogo', () => {
  it('tem 26 peças com ids únicos e 7 do começo', () => {
    expect(PECAS).toHaveLength(26);
    expect(TOTAL_DE_PECAS).toBe(26);
    expect(new Set(PECAS.map((p) => p.id)).size).toBe(26);
    expect(PECAS.filter((p) => p.condicao.tipo === 'comeco').map((p) => p.id)).toEqual([
      'uni1',
      'uni2',
      'testeira',
      'munhequeira',
      'fundo_gramado',
      'fundo_arquibancada',
      'fundo_estadio_noite',
    ]);
  });

  it('cada valor está na lista do campo; valor não padrão tem uma peça e o padrão nenhuma (fora camisa e fundo)', () => {
    for (const p of PECAS) expect(LISTAS[p.campo]).toContain(p.valor);
    for (const [campo, lista] of Object.entries(LISTAS)) {
      for (const valor of lista) {
        const pecas = PECAS.filter((p) => p.campo === campo && p.valor === valor);
        const ehPadrao = PADRAO[campo as CampoDaPeca] === valor;
        if (ehPadrao && campo !== 'camisa' && campo !== 'fundo') expect(pecas).toHaveLength(0);
        else expect(pecas).toHaveLength(1);
      }
    }
  });
});

describe('pecasLiberadas', () => {
  it('Estreante sem nada só tem as do começo, na ordem de PECAS', () => {
    const comeco = PECAS.filter((p) => p.condicao.tipo === 'comeco').map((p) => p.id);
    expect(ids(estado())).toEqual(comeco);
  });

  it('níveis na fronteira', () => {
    const porNivel = (n: number) => ids(estado({ nivel: n }));
    expect(tem(estado({ nivel: 0 }), 'colete')).toBe(false);
    expect(tem(estado({ nivel: 0 }), 'fundo_banco')).toBe(false);
    for (const [n, esperadas] of [
      [1, ['colete', 'fundo_banco']],
      [2, ['chuteira_time', 'pose_bracos', 'fundo_tunel']],
      [3, ['bracadeira', 'fundo_holofotes']],
      [4, ['faixa', 'fundo_papel_picado']],
      [5, ['moldura_dourada', 'fundo_telao']],
    ] as const) {
      for (const id of esperadas) {
        expect(porNivel(n - 1)).not.toContain(id);
        expect(porNivel(n)).toContain(id);
      }
    }
    expect(porNivel(5)).toHaveLength(7 + 2 + 3 + 2 + 2 + 2);
  });

  it('1º bronze: 4 gols não, 5 sim', () => {
    expect(tem(estado({ medalhas: [lance(4)] }), 'munhequeira_bronze')).toBe(false);
    expect(tem(estado({ medalhas: [lance(5)] }), 'munhequeira_bronze')).toBe(true);
    expect(tem(estado({ medalhas: [disputa(9)] }), 'munhequeira_bronze')).toBe(false);
    expect(tem(estado({ medalhas: [disputa(10)] }), 'munhequeira_bronze')).toBe(true);
  });

  it('1ª prata: 19 não, 20 sim; disputa 49 não, 50 sim', () => {
    expect(tem(estado({ medalhas: [lance(19)] }), 'fundo_barreira')).toBe(false);
    expect(tem(estado({ medalhas: [lance(20)] }), 'fundo_barreira')).toBe(true);
    expect(tem(estado({ medalhas: [disputa(49)] }), 'fundo_barreira')).toBe(false);
    expect(tem(estado({ medalhas: [disputa(50)] }), 'fundo_barreira')).toBe(true);
    // ouro também vale como "prata ou maior"
    expect(tem(estado({ medalhas: [lance(50, 10)] }), 'fundo_barreira')).toBe(true);
  });

  it('1º ouro de lance: 49 gols com 10 recriados não, 50 com 9 não, 50 com 10 sim', () => {
    for (const [m, esperado] of [
      [lance(49, 10), false],
      [lance(50, 9), false],
      [lance(50, 10), true],
    ] as const) {
      const e = estado({ medalhas: [m] });
      expect(tem(e, 'chuteira_dourada')).toBe(esperado);
      expect(tem(e, 'fundo_rede')).toBe(esperado);
    }
  });

  it('1º ouro de disputa: 100 gols com 9 vitórias não, com 10 sim; 99 gols com 10 não', () => {
    expect(tem(estado({ medalhas: [disputa(100, 9)] }), 'chuteira_dourada')).toBe(false);
    expect(tem(estado({ medalhas: [disputa(99, 10)] }), 'chuteira_dourada')).toBe(false);
    expect(tem(estado({ medalhas: [disputa(100, 10)] }), 'chuteira_dourada')).toBe(true);
  });

  it('uniforme de goleiro: ouro de lance não libera, ouro de disputa libera', () => {
    expect(tem(estado({ medalhas: [lance(50, 10)] }), 'goleiro')).toBe(false);
    expect(tem(estado({ medalhas: [disputa(100, 9)] }), 'goleiro')).toBe(false);
    expect(tem(estado({ medalhas: [disputa(100, 10)] }), 'goleiro')).toBe(true);
  });

  it('ouro da Seleção: só item da Seleção com ouro', () => {
    expect(tem(estado({ medalhas: [lance(50, 10, true)] }), 'fundo_verde_amarelo')).toBe(true);
    expect(tem(estado({ medalhas: [disputa(100, 10, true)] }), 'fundo_verde_amarelo')).toBe(true);
    expect(tem(estado({ medalhas: [lance(20, 0, true)] }), 'fundo_verde_amarelo')).toBe(false);
    expect(tem(estado({ medalhas: [lance(50, 10, false)] }), 'fundo_verde_amarelo')).toBe(false);
    // ouro de outro clube + prata da Seleção em itens diferentes não basta
    expect(tem(estado({ medalhas: [lance(50, 10, false), lance(20, 0, true)] }), 'fundo_verde_amarelo')).toBe(false);
  });

  it('moldura Galeria: 4 ouros não, 5 ouros sim', () => {
    const ouros = (n: number) => Array.from({ length: n }, () => lance(50, 10));
    expect(tem(estado({ medalhas: ouros(4) }), 'moldura_galeria')).toBe(false);
    expect(tem(estado({ medalhas: ouros(5) }), 'moldura_galeria')).toBe(true);
    expect(tem(estado({ medalhas: [...ouros(2), ...Array.from({ length: 3 }, () => disputa(100, 10))] }), 'moldura_galeria')).toBe(true);
  });

  it('apito: só com o Aquecimento completo', () => {
    expect(tem(estado(), 'apito')).toBe(false);
    expect(tem(estado({ aquecido: true }), 'apito')).toBe(true);
  });

  it('número ruim conta como 0', () => {
    const e = estado({ nivel: Number.NaN, medalhas: [lance(-5, -1), lance(Number.NaN, 2.5)] });
    expect(ids(e)).toEqual(ids(estado()));
    expect(tem(estado({ nivel: -3 }), 'colete')).toBe(false);
    expect(tem(estado({ nivel: 1.5 }), 'colete')).toBe(false);
  });
});

describe('mesma régua da trilha', () => {
  it('a medalha do vestiário é a da trilha', () => {
    const gols = [0, 1, 4, 5, 9, 10, 19, 20, 49, 50, 99, 100, 200];
    const outros = [0, 1, 5, 9, 10, 11, 50];
    for (const g of gols)
      for (const r of outros) {
        expect(medalhaDoLance(g, r)).toBe(trilhaDoLance(g, r).medalha);
        expect(medalhaDaDisputa(g, r)).toBe(trilhaDaDisputa(g, r).medalha);
      }
  });
});

describe('validar', () => {
  const tudo = PECAS.map((p) => p.id);
  const base = () => ({ ...PADRAO });

  it('peça trancada vira padrão', () => {
    const v = { ...base(), peito: 'colete', camisa: 'goleiro', fundo: 'telao', pose: 'bracos' };
    const r = validar(v, []);
    expect(r.peito).toBe('nenhum');
    expect(r.camisa).toBe('uni1');
    expect(r.fundo).toBe('gramado');
    expect(r.pose).toBe('parado');
    // casos individuais com o nível errado
    expect(validar({ ...base(), peito: 'colete' }, ids(estado({ nivel: 0 }))).peito).toBe('nenhum');
    expect(validar({ ...base(), camisa: 'goleiro' }, ids(estado({ medalhas: [lance(50, 10)] }))).camisa).toBe('uni1');
    expect(validar({ ...base(), fundo: 'telao' }, ids(estado({ nivel: 4 }))).fundo).toBe('gramado');
    expect(validar({ ...base(), pose: 'bracos' }, ids(estado({ nivel: 1 }))).pose).toBe('parado');
  });

  it('peça liberada fica', () => {
    const v = { ...base(), peito: 'colete', camisa: 'goleiro', fundo: 'telao', pose: 'bracos', moldura: 'galeria' };
    expect(validar(v, tudo)).toEqual(v);
    expect(validar({ ...base(), peito: 'colete' }, ids(estado({ nivel: 1 }))).peito).toBe('colete');
    expect(validar({ ...base(), pose: 'bracos' }, ids(estado({ nivel: 2 }))).pose).toBe('bracos');
  });

  it('peça do começo vale mesmo com liberadas vazio', () => {
    const v = { ...base(), camisa: 'uni2', cabeca: 'testeira', punho: 'munhequeira', fundo: 'estadio_noite' };
    expect(validar(v, [])).toEqual(v);
  });

  it('chave a mais some e a saída tem só as chaves da Vestimenta', () => {
    const r = validar({ ...base(), cor: '#fff', extra: 1 }, tudo);
    expect(Object.keys(r).sort()).toEqual(Object.keys(PADRAO).sort());
    expect(r).toEqual(PADRAO);
  });

  it('número', () => {
    for (const ruim of ['100', '-1', 'a1', '7 ', '', 7, undefined, null, ['7']]) expect(validar({ ...base(), numero: ruim }, tudo).numero).toBeNull();
    for (const bom of ['7', '07', '0', '00', '99']) expect(validar({ ...base(), numero: bom }, tudo).numero).toBe(bom);
    expect(validar({ ...base(), numero: '7' }, tudo).numero).not.toBe(validar({ ...base(), numero: '07' }, tudo).numero);
  });

  it('pele e cor do cabelo só inteiro da lista', () => {
    for (const ruim of [6, -1, '3', 2.5, null, undefined]) {
      expect(validar({ ...base(), pele: ruim }, tudo).pele).toBe(0);
      expect(validar({ ...base(), corCabelo: ruim }, tudo).corCabelo).toBe(0);
    }
    expect(validar({ ...base(), pele: 5, corCabelo: 3 }, tudo)).toMatchObject({ pele: 5, corCabelo: 3 });
  });

  it('cabelo, corpo e fundo desconhecidos viram padrão', () => {
    const r = validar({ ...base(), cabelo: 'moicano', corpo: 'x', fundo: 'lua', moldura: 'ouro', chuteira: 'prata' }, tudo);
    expect(r).toEqual(PADRAO);
    expect(validar({ ...base(), cabelo: 'trancas', corpo: 'm' }, tudo)).toMatchObject({ cabelo: 'trancas', corpo: 'm' });
  });

  it('v diferente de 1 e entradas que não são objeto viram o padrão (cópia)', () => {
    for (const ruim of [{ ...base(), v: 2, pele: 3 }, { ...base(), v: '1' }, null, undefined, 'texto', 5, [], [1]]) {
      const r = validar(ruim, tudo);
      expect(r).toEqual(PADRAO);
      expect(r).not.toBe(PADRAO);
    }
  });

  it('não muda a entrada e devolve objeto novo', () => {
    const v = { ...base(), peito: 'colete', numero: '100', extra: 1 };
    const copia = JSON.parse(JSON.stringify(v));
    const r = validar(v, []);
    expect(v).toEqual(copia);
    expect(r).not.toBe(v);
    const ok = base();
    expect(validar(ok, tudo)).not.toBe(ok);
  });
});

describe('sorteio', () => {
  const comeco = PECAS.filter((p) => p.condicao.tipo === 'comeco');
  const idsDoComeco = new Set(comeco.map((p) => p.id));

  it('sortearDoComeco usa só peças do começo e a pose parada', () => {
    for (let n = 1; n <= 400; n++) {
      const v = sortearDoComeco(semente(n));
      expect(v.pose).toBe('parado');
      for (const [campo] of Object.entries(LISTAS)) {
        const valor = v[campo as CampoDaPeca];
        if (valor === PADRAO[campo as CampoDaPeca]) continue;
        const peca = PECAS.find((p) => p.campo === campo && p.valor === valor);
        expect(peca && idsDoComeco.has(peca.id)).toBe(true);
      }
      expect(validar(v, [])).toEqual(v);
    }
  });

  it('é determinístico para o mesmo sortear', () => {
    expect(sortearComPecas(PECAS.map((p) => p.id), semente(42))).toEqual(sortearComPecas(PECAS.map((p) => p.id), semente(42)));
    expect(sortearDoComeco(semente(7))).toEqual(sortearDoComeco(semente(7)));
  });

  it('com tudo liberado passa no validar e alcança peças fora do começo', () => {
    const tudo = PECAS.map((p) => p.id);
    const vistos = new Set<string>();
    let comNumero = 0;
    let semNumero = 0;
    let doisDigitos = 0;
    for (let n = 1; n <= 3000; n++) {
      const v = sortearComPecas(tudo, semente(n));
      expect(validar(v, tudo)).toEqual(v);
      expect(v.pose).toBe('parado');
      for (const p of PECAS) if (v[p.campo] === p.valor) vistos.add(p.id);
      if (v.numero === null) semNumero++;
      else {
        comNumero++;
        if (v.numero.length === 2) doisDigitos++;
      }
    }
    for (const p of PECAS) if (p.id !== 'pose_bracos') expect(vistos.has(p.id), p.id).toBe(true);
    expect(vistos.has('pose_bracos')).toBe(false);
    expect(semNumero / 3000).toBeGreaterThan(0.18);
    expect(semNumero / 3000).toBeLessThan(0.32);
    expect(doisDigitos / comNumero).toBeGreaterThan(0.4);
    expect(doisDigitos / comNumero).toBeLessThan(0.6);
  });

  it('aceita sortear extremo (0 e quase 1) sem sair da lista', () => {
    const tudo = PECAS.map((p) => p.id);
    for (const x of [0, 0.999999999]) {
      const v = sortearComPecas(tudo, () => x);
      expect(validar(v, tudo)).toEqual(v);
    }
  });
});

describe('novasPecas', () => {
  it('devolve o que entrou, na ordem de PECAS, ignorando ids desconhecidos', () => {
    const antes = ids(estado());
    const depois = ids(estado({ nivel: 2 }));
    expect(novasPecas(antes, depois).map((p) => p.id)).toEqual(['colete', 'chuteira_time', 'pose_bracos', 'fundo_banco', 'fundo_tunel'].sort((a, b) => PECAS.findIndex((p) => p.id === a) - PECAS.findIndex((p) => p.id === b)));
    expect(novasPecas(depois, antes)).toEqual([]);
    expect(novasPecas(antes, ['fantasma', ...depois]).map((p) => p.id)).not.toContain('fantasma');
    expect(novasPecas([], [])).toEqual([]);
  });
});

describe('proximaPeca', () => {
  it('Estreante: colete no Reserva', () => {
    const r = proximaPeca(estado());
    expect(r?.peca.id).toBe('colete');
    expect(r?.condicao).toBe('Libera no Reserva');
  });

  it('com nível, pega o menor nível acima, na ordem de PECAS', () => {
    expect(proximaPeca(estado({ nivel: 1 }))?.peca.id).toBe('chuteira_time');
    expect(proximaPeca(estado({ nivel: 3 }))?.peca.id).toBe('faixa');
    expect(proximaPeca(estado({ nivel: 4 }))?.peca.condicao).toEqual({ tipo: 'nivel', nivel: 5 });
  });

  it('Lenda sem medalha: a mais fácil primeiro (apito, depois bronze, prata, ouro)', () => {
    expect(proximaPeca(estado({ nivel: 5 }))?.peca.id).toBe('apito');
    const r = proximaPeca(estado({ nivel: 5, aquecido: true }));
    expect(r?.peca.id).toBe('munhequeira_bronze');
    expect(r?.condicao).toBe('Libera no 1º bronze');
    expect(proximaPeca(estado({ nivel: 5, aquecido: true, medalhas: [lance(20, 0)] }))?.peca.id).toBe('chuteira_dourada');
    expect(proximaPeca(estado({ nivel: 5, aquecido: true, medalhas: [lance(50, 10)] }))?.peca.id).toBe('goleiro');
  });

  it('tudo liberado: null', () => {
    const e = estado({ nivel: 5, aquecido: true, medalhas: [disputa(100, 10, true), ...Array.from({ length: 4 }, () => lance(50, 10))] });
    expect(pecasLiberadas(e)).toHaveLength(26);
    expect(proximaPeca(e)).toBeNull();
  });
});

describe('textoDaCondicao', () => {
  const texto = (id: string) => textoDaCondicao(PECAS.find((p) => p.id === id)!);
  it('um texto por condição', () => {
    expect(texto('uni1')).toBe('Do começo');
    expect(texto('colete')).toBe('Libera no Reserva');
    expect(texto('chuteira_time')).toBe('Libera no Titular');
    expect(texto('bracadeira')).toBe('Libera no Craque');
    expect(texto('faixa')).toBe('Libera no Ídolo');
    expect(texto('fundo_telao')).toBe('Libera no Lenda');
    expect(texto('munhequeira_bronze')).toBe('Libera no 1º bronze');
    expect(texto('fundo_barreira')).toBe('Libera na 1ª prata');
    expect(texto('fundo_rede')).toBe('Libera no 1º ouro');
    expect(texto('goleiro')).toBe('Libera com um ouro nos pênaltis');
    expect(texto('fundo_verde_amarelo')).toBe('Libera com um ouro da Seleção');
    expect(texto('moldura_galeria')).toBe('Libera com 5 ouros');
    expect(texto('apito')).toBe('Libera com o Aquecimento completo');
  });
});

describe('conferirFormato (o que o servidor recusa)', () => {
  const cheia = { ...PADRAO, numero: '07', camisa: 'goleiro', fundo: 'verde_amarelo', moldura: 'galeria' };
  it('aceita o PADRAO, o sorteio e peça trancada (quem troca é o validar)', () => {
    expect(conferirFormato({ ...PADRAO })).toBe(true);
    expect(conferirFormato(cheia)).toBe(true);
    for (let i = 0; i < 50; i++) expect(conferirFormato(sortearComPecas(PECAS.map((p) => p.id), semente(i + 1)))).toBe(true);
  });
  it('recusa o que não é vestimenta', () => {
    for (const x of [null, undefined, 'x', 7, [], [PADRAO], { ...PADRAO, v: 2 }, { ...PADRAO, v: '1' }]) expect(conferirFormato(x)).toBe(false);
  });
  it('recusa chave a mais ou faltando', () => {
    expect(conferirFormato({ ...PADRAO, cor: '#fff' })).toBe(false);
    const { moldura: _m, ...sem } = PADRAO;
    expect(conferirFormato(sem)).toBe(false);
    expect(conferirFormato(JSON.parse(JSON.stringify(PADRAO).replace('{', '{"__proto__":{"x":1},')))).toBe(false);
  });
  it('recusa valor fora do catálogo', () => {
    expect(conferirFormato({ ...PADRAO, pele: 6 })).toBe(false);
    expect(conferirFormato({ ...PADRAO, pele: '0' })).toBe(false);
    expect(conferirFormato({ ...PADRAO, corpo: 'mulher' })).toBe(false);
    expect(conferirFormato({ ...PADRAO, fundo: 'arco_iris' })).toBe(false);
    expect(conferirFormato({ ...PADRAO, camisa: null })).toBe(false);
  });
  it('recusa número fora do formato', () => {
    for (const numero of ['100', '', ' 7', '7a', 7, '٣']) expect(conferirFormato({ ...PADRAO, numero })).toBe(false);
    for (const numero of ['0', '00', '7', '07', '99', null]) expect(conferirFormato({ ...PADRAO, numero })).toBe(true);
  });
  it('a maior vestimenta possível cabe no teto', () => {
    expect(JSON.stringify(cheia).length).toBeLessThan(TAMANHO_MAXIMO);
  });
});

describe('camisa por fora ou por dentro (barra, H03b)', () => {
  const { barra: _b, ...semBarra } = PADRAO;
  const tudo = PECAS.map((p) => p.id);

  it('não é peça: fica fora das 26 e vale para todo mundo, sem nada liberado', () => {
    expect(BARRAS).toEqual(['fora', 'dentro']);
    expect(PADRAO.barra).toBe('fora');
    expect(TOTAL_DE_PECAS).toBe(26);
    expect(PECAS.some((p) => (p.campo as string) === 'barra')).toBe(false);
    for (const barra of BARRAS) expect(validar({ ...PADRAO, barra }, []).barra).toBe(barra);
  });

  it('validar: inválida ou ausente vira fora', () => {
    for (const barra of ['Dentro', 'meio', '', null, true, 1, ['dentro'], undefined]) expect(validar({ ...PADRAO, barra }, tudo).barra).toBe('fora');
    expect(validar(semBarra, tudo)).toEqual(PADRAO);
  });

  it('conferirFormato aceita com ou sem barra (o formato de antes), nunca barra torta', () => {
    expect(conferirFormato(semBarra)).toBe(true);
    expect(conferirFormato({ ...PADRAO, barra: 'dentro' })).toBe(true);
    for (const barra of ['Dentro', 'meio', null, undefined, true]) expect(conferirFormato({ ...PADRAO, barra })).toBe(false);
    // Sem barra continua exigindo todas as outras chaves.
    const { moldura: _m, ...semMolduraNemBarra } = semBarra;
    expect(conferirFormato(semMolduraNemBarra)).toBe(false);
  });

  it('comFormato completa a barra que falta e recusa o que o conferirFormato recusa', () => {
    expect(comFormato(semBarra)).toEqual(PADRAO);
    const dentro = { ...PADRAO, barra: 'dentro' as const };
    expect(comFormato(dentro)).toEqual(dentro);
    expect(comFormato({ ...PADRAO, barra: 'meio' })).toBeNull();
    expect(comFormato(null)).toBeNull();
  });

  it('o Sortear sorteia as duas; a conta nova começa sempre por fora', () => {
    const vistas = new Set<string>();
    for (let n = 1; n <= 200; n++) {
      vistas.add(sortearComPecas(tudo, semente(n)).barra);
      expect(sortearDoComeco(semente(n)).barra).toBe('fora');
    }
    expect(vistas).toEqual(new Set(BARRAS));
  });

  it('a barra é sorteada por último: o resto sai igual com a mesma sequência', () => {
    for (let n = 1; n <= 50; n++) {
      const { barra: _x, ...a } = sortearComPecas(tudo, semente(n));
      const { barra: _y, ...b } = sortearDoComeco(semente(n));
      const { barra: _z, ...c } = sortearComPecas([], semente(n));
      expect(b).toEqual(c);
      expect(Object.keys(a).sort()).toEqual(Object.keys(semBarra).sort());
    }
  });
});
