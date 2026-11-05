import { describe, expect, it } from 'vitest';
import { PADRAO, PECAS, pecaPorId, pecasLiberadas, type EstadoDoVestiario, type Vestimenta } from './vestiario';
import {
  aoVoltar,
  folhaDaTrancada,
  gruposDaAba,
  mudou,
  pecasQueTem,
  quadrosDoNumero,
  sortearNaTela,
  teclarNumero,
  textoDoContador,
  tocarPeca,
  type EstadoDaTela,
  type TeclaDoNumero,
} from './vestiarioTela';
import { estadoFalso } from '../telas/vestiario/fonteFalsa';

const peca = (id: string) => pecaPorId(id)!;
const semNada: EstadoDaTela = { nivel: 0, xp: 0, medalhas: [], aquecido: false };
const teclar = (...teclas: TeclaDoNumero[]) => teclas.reduce<string | null>((n, t) => teclarNumero(n, t), null);

/** Gerador repetível para o sorteio. */
function semente(s: number): () => number {
  let x = s >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

describe('contador "N de 26"', () => {
  it('conta as 7 do começo sem nada liberado', () => {
    expect(pecasQueTem([])).toBe(7);
    expect(textoDoContador([])).toBe('7 de 26');
  });
  it('não conta duas vezes nem id desconhecido', () => {
    expect(pecasQueTem(['uni1', 'colete', 'colete', 'peca_que_nao_existe'])).toBe(8);
  });
  it('Lenda com tudo dá 26 de 26', () => {
    expect(textoDoContador(PECAS.map((p) => p.id))).toBe('26 de 26');
  });
  it('segue o pecasLiberadas: Titular sem medalha tem 7 + 5', () => {
    const titular: EstadoDoVestiario = { nivel: 2, medalhas: [], aquecido: false };
    expect(pecasQueTem(pecasLiberadas(titular))).toBe(12);
  });
});

describe('número', () => {
  it('"7" usa um quadro e "07" os dois', () => {
    expect(teclar('7')).toBe('7');
    expect(quadrosDoNumero('7')).toEqual({ quadros: ['7', ''], usados: 1 });
    expect(teclar('0', '7')).toBe('07');
    expect(quadrosDoNumero('07')).toEqual({ quadros: ['0', '7'], usados: 2 });
  });
  it('"0" e "00" valem e são diferentes', () => {
    expect(teclar('0')).toBe('0');
    expect(teclar('0', '0')).toBe('00');
    expect(quadrosDoNumero('0').usados).toBe(1);
    expect(quadrosDoNumero('00').usados).toBe(2);
  });
  it('com 2 dígitos, o próximo começa de novo', () => {
    expect(teclar('9', '9', '3')).toBe('3');
  });
  it('apagar tira o último; sem dígito fica sem número', () => {
    expect(teclar('0', '7', 'apagar')).toBe('0');
    expect(teclar('7', 'apagar')).toBeNull();
    expect(teclarNumero(null, 'apagar')).toBeNull();
  });
  it('sem número deixa os dois quadros vazios', () => {
    expect(quadrosDoNumero(null)).toEqual({ quadros: ['', ''], usados: 0 });
  });
  it('número fora do formato é tratado como sem número', () => {
    expect(quadrosDoNumero('123').usados).toBe(0);
    expect(teclarNumero('abc', '5')).toBe('5');
  });
});

describe('sair sem salvar', () => {
  const gravada: Vestimenta = { ...PADRAO, numero: '7' };
  it('sem mudança sai direto', () => {
    expect(mudou(gravada, { ...gravada })).toBe(false);
    expect(aoVoltar(gravada, { ...gravada })).toBe('sair');
  });
  it('qualquer campo diferente pergunta', () => {
    expect(aoVoltar(gravada, { ...gravada, numero: '07' })).toBe('perguntar');
    expect(aoVoltar(gravada, { ...gravada, numero: null })).toBe('perguntar');
    expect(aoVoltar(gravada, { ...gravada, fundo: 'arquibancada' })).toBe('perguntar');
    expect(aoVoltar(gravada, { ...gravada, pele: 3 })).toBe('perguntar');
  });
  it('voltar ao que estava gravado também sai direto', () => {
    const trocou = { ...gravada, camisa: 'uni2' as const };
    expect(aoVoltar(gravada, { ...trocou, camisa: 'uni1' })).toBe('sair');
  });
});

describe('toque numa peça', () => {
  const livres = new Set<string>(['colete']);
  it('trancada abre a folha e não veste', () => {
    expect(tocarPeca(PADRAO, peca('bracadeira'), livres)).toEqual({ tipo: 'trancada', peca: peca('bracadeira') });
  });
  it('liberada veste; tocar de novo num acessório tira', () => {
    const r = tocarPeca(PADRAO, peca('colete'), livres);
    expect(r.tipo === 'vestiu' && r.vestimenta.peito).toBe('colete');
    const v = r.tipo === 'vestiu' ? r.vestimenta : PADRAO;
    const de = tocarPeca(v, peca('colete'), livres);
    expect(de.tipo === 'vestiu' && de.vestimenta.peito).toBe('nenhum');
  });
  it('camisa e fundo não ficam vazios', () => {
    const r = tocarPeca(PADRAO, peca('uni1'), livres);
    expect(r.tipo === 'vestiu' && r.vestimenta.camisa).toBe('uni1');
    const f = tocarPeca(PADRAO, peca('fundo_gramado'), livres);
    expect(f.tipo === 'vestiu' && f.vestimenta.fundo).toBe('gramado');
  });
});

describe('abas', () => {
  it('as grades de Camisa, Acessório e Fundo somam as 26 peças, cada uma uma vez', () => {
    const ids = (['camisa', 'acessorio', 'fundo'] as const).flatMap((a) => gruposDaAba(a).flatMap((g) => g.pecas.map((p) => p.id)));
    expect(ids.length).toBe(26);
    expect(new Set(ids).size).toBe(26);
  });
});

describe('folha da peça trancada', () => {
  it('peça de nível: barra de XP, "Você" e "Faltam", e o que libera junto', () => {
    const titular: EstadoDaTela = { nivel: 2, xp: 1_770, medalhas: [], aquecido: false };
    const f = folhaDaTrancada(peca('bracadeira'), titular);
    expect(f.nome).toBe('Braçadeira de capitão');
    expect(f.condicao).toBe('Libera no Craque');
    expect(f.barra).toEqual({ fracao: 1_770 / 5_000, voce: 'Você: Titular · 1.770 XP', faltam: 'Faltam 3.230 XP' });
    expect(f.junto).toEqual(['Holofotes']);
    expect(f.falta).toBeUndefined();
  });
  it('Titular libera três peças juntas', () => {
    expect(folhaDaTrancada(peca('fundo_tunel'), semNada).junto).toEqual(['Chuteira nas cores do time', 'Braços pra cima']);
  });
  it('Lenda junta moldura dourada e Telão', () => {
    const f = folhaDaTrancada(peca('moldura_dourada'), { ...semNada, xp: 21_000, nivel: 4 });
    expect(f.junto).toEqual(['Telão']);
    expect(f.barra?.faltam).toBe('Faltam 9.000 XP');
  });
  it('peça de medalha: a regra e quanto falta no item mais perto, sem barra de XP', () => {
    const estado: EstadoDaTela = {
      ...semNada,
      medalhas: [
        { tipo: 'lance', gols: 3, recriados: 0, vitorias: 0, daSelecao: false },
        { tipo: 'disputa', gols: 4, recriados: 0, vitorias: 0, daSelecao: false },
      ],
    };
    const f = folhaDaTrancada(peca('munhequeira_bronze'), estado);
    expect(f.condicao).toBe('Libera no 1º bronze');
    expect(f.barra).toBeUndefined();
    expect(f.falta).toEqual(['O bronze sai com 5 gols num mesmo lance ou 10 gols numa mesma disputa de pênaltis.', 'Faltam 2 gols no lance mais perto.']);
    expect(f.junto).toEqual([]);
  });
  it('1º ouro pede gols e recriando; junta chuteira dourada e Rede', () => {
    const f = folhaDaTrancada(peca('chuteira_dourada'), {
      ...semNada,
      medalhas: [{ tipo: 'lance', gols: 49, recriados: 8, vitorias: 0, daSelecao: false }],
    });
    expect(f.falta?.[1]).toBe('Faltam 1 gol e 2 recriando no lance mais perto.');
    expect(f.junto).toEqual(['Rede balançando']);
  });
  it('um só que falta usa "Falta"', () => {
    const f = folhaDaTrancada(peca('fundo_barreira'), {
      ...semNada,
      medalhas: [{ tipo: 'lance', gols: 19, recriados: 0, vitorias: 0, daSelecao: false }],
    });
    expect(f.falta?.[1]).toBe('Falta 1 gol no lance mais perto.');
  });
  it('sem nada jogado diz que ainda não tem gol valendo', () => {
    expect(folhaDaTrancada(peca('munhequeira_bronze'), semNada).falta?.[1]).toBe('Ainda sem gol valendo em lance ou disputa.');
  });
  it('ouro nos pênaltis só olha as disputas', () => {
    const f = folhaDaTrancada(peca('goleiro'), {
      ...semNada,
      medalhas: [
        { tipo: 'lance', gols: 49, recriados: 10, vitorias: 0, daSelecao: false },
        { tipo: 'disputa', gols: 60, recriados: 0, vitorias: 3, daSelecao: false },
      ],
    });
    expect(f.falta).toEqual(['O ouro sai com 100 gols e 10 vitórias numa mesma disputa de pênaltis.', 'Faltam 40 gols e 7 vitórias na disputa mais perto.']);
  });
  it('5 ouros conta quantos já tem', () => {
    const ouro = { tipo: 'lance' as const, gols: 50, recriados: 10, vitorias: 0, daSelecao: false };
    expect(folhaDaTrancada(peca('moldura_galeria'), { ...semNada, medalhas: [ouro, ouro] }).falta?.[1]).toBe('Você tem 2 de 5.');
  });
  it('apito pede o Aquecimento', () => {
    expect(folhaDaTrancada(peca('apito'), semNada).falta).toEqual(['Complete as 5 estações do Aquecimento, no Perfil.']);
  });
  it('nenhum texto da folha fala de compra, sorteio ou prazo', () => {
    const textos = PECAS.filter((p) => p.condicao.tipo !== 'comeco').flatMap((p) => {
      const f = folhaDaTrancada(p, semNada);
      return [f.nome, f.condicao, ...(f.falta ?? []), f.barra?.voce ?? '', f.barra?.faltam ?? '', ...f.junto];
    });
    for (const t of textos) expect(t).not.toMatch(/compr|pag|R\$|sorte|hoje|prazo|expira|aposta/i);
  });
});

describe('Sortear', () => {
  it('só usa peças liberadas (Estreante: nada trancado aparece)', () => {
    const livres = pecasLiberadas({ nivel: 0, medalhas: [], aquecido: false });
    const sorteio = semente(7);
    for (let i = 0; i < 300; i++) {
      const v = sortearNaTela(PADRAO, livres, sorteio);
      for (const p of PECAS) if (v[p.campo] === p.valor && p.condicao.tipo !== 'comeco') throw new Error(`sorteou trancada: ${p.id}`);
      expect(v.pose).toBe('parado');
    }
  });
  it('com tudo liberado, chega a sortear peças que liberam', () => {
    const livres = PECAS.map((p) => p.id);
    const sorteio = semente(3);
    const vistos = new Set<string>();
    for (let i = 0; i < 300; i++) vistos.add(sortearNaTela(PADRAO, livres, sorteio).fundo);
    expect(vistos.has('telao')).toBe(true);
  });
  it('tenta não repetir a vestimenta da tela', () => {
    let chamadas = 0;
    const fixo = () => {
      chamadas++;
      return 0;
    };
    sortearNaTela({ ...PADRAO }, [], fixo);
    expect(chamadas).toBeGreaterThan(20); // sorteou de novo (o gerador fixo sempre repete)
  });
});

describe('fonte falsa (dev)', () => {
  it('nivel=titular dá 1.770 XP e libera as peças do Titular', () => {
    const e = estadoFalso(new URLSearchParams('nivel=titular'));
    expect(e.nivel).toBe(2);
    expect(e.xp).toBe(1_770);
    expect(pecasLiberadas(e)).toContain('fundo_tunel');
  });
  it('&ouros=5&aquecido libera Galeria e apito', () => {
    const e = estadoFalso(new URLSearchParams('nivel=lenda&ouros=5&aquecido'));
    expect(pecasQueTem(pecasLiberadas(e))).toBe(24); // sem goleiro e verde e amarelo
  });
});
