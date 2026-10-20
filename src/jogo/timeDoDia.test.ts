import { describe, expect, it } from 'vitest';
import {
  acabou,
  compararClubes,
  diaAnterior,
  gradeEmoji,
  linhaDoCard,
  linhaEmoji,
  normalizarBusca,
  numeroDoDia,
  placarDoDia,
  pontosDoDia,
  proximoClube,
  quantasCertas,
  REGIAO_DA_UF,
  sequenciaDeDias,
  suspeitoNoDia,
  tentar,
  type ClubeDoDia,
  type DiaSorteado,
} from './timeDoDia';

// Clubes de mentira (os dados de verdade vêm do CSV conferido).
const base: ClubeDoDia = {
  id: 'secreto',
  nome: 'Secreto',
  uf: 'SP',
  fundacao: 1920,
  titulos: 4,
  divisao: 'B',
  cores: ['verde', 'branco'],
  capital: false,
};
const clube = (o: Partial<ClubeDoDia>): ClubeDoDia => ({ ...base, id: 'chute', nome: 'Chute', ...o });

describe('pistas', () => {
  it('o próprio clube é tudo 🟢 e acerta', () => {
    const t = tentar(base, base);
    expect(t.acertou).toBe(true);
    expect(linhaEmoji(t.pistas)).toBe('🟢🟢🟢🟢🟢🟢');
    expect(quantasCertas(t.pistas)).toBe(6);
  });

  it('clube com os mesmos dados mas outro id não acerta', () => {
    expect(tentar(clube({}), base).acertou).toBe(false);
  });

  it('estado: mesmo estado, mesma região, outra região', () => {
    expect(compararClubes(clube({ uf: 'SP' }), base).estado.tom).toBe('certo');
    expect(compararClubes(clube({ uf: 'RJ' }), base).estado.tom).toBe('perto');
    expect(compararClubes(clube({ uf: 'RS' }), base).estado.tom).toBe('longe');
    expect(compararClubes(clube({ uf: 'XX' }), clube({ uf: 'YY' })).estado.tom).toBe('longe');
  });

  it('fundação: mesmo ano, até 10 anos (inclusive) e mais longe, com seta', () => {
    expect(compararClubes(clube({ fundacao: 1920 }), base).fundacao).toEqual({ tom: 'certo' });
    expect(compararClubes(clube({ fundacao: 1910 }), base).fundacao).toEqual({ tom: 'perto', seta: 'acima' });
    expect(compararClubes(clube({ fundacao: 1930 }), base).fundacao).toEqual({ tom: 'perto', seta: 'abaixo' });
    expect(compararClubes(clube({ fundacao: 1909 }), base).fundacao).toEqual({ tom: 'longe', seta: 'acima' });
    expect(compararClubes(clube({ fundacao: 1931 }), base).fundacao).toEqual({ tom: 'longe', seta: 'abaixo' });
  });

  it('títulos: mesmo número, até 2 de diferença e mais longe, com seta', () => {
    expect(compararClubes(clube({ titulos: 4 }), base).titulos).toEqual({ tom: 'certo' });
    expect(compararClubes(clube({ titulos: 2 }), base).titulos).toEqual({ tom: 'perto', seta: 'acima' });
    expect(compararClubes(clube({ titulos: 6 }), base).titulos).toEqual({ tom: 'perto', seta: 'abaixo' });
    expect(compararClubes(clube({ titulos: 1 }), base).titulos).toEqual({ tom: 'longe', seta: 'acima' });
    expect(compararClubes(clube({ titulos: 7 }), base).titulos).toEqual({ tom: 'longe', seta: 'abaixo' });
  });

  it('divisão: mesma, vizinha (A↔B, B↔C) e outra (A↔C)', () => {
    expect(compararClubes(clube({ divisao: 'B' }), base).divisao.tom).toBe('certo');
    expect(compararClubes(clube({ divisao: 'A' }), base).divisao.tom).toBe('perto');
    expect(compararClubes(clube({ divisao: 'C' }), base).divisao.tom).toBe('perto');
    expect(compararClubes(clube({ divisao: 'C' }), clube({ divisao: 'A' })).divisao.tom).toBe('longe');
  });

  it('cores: as duas (em qualquer ordem), uma ou nenhuma', () => {
    expect(compararClubes(clube({ cores: ['branco', 'verde'] }), base).cores.tom).toBe('certo');
    expect(compararClubes(clube({ cores: ['verde', 'preto'] }), base).cores.tom).toBe('perto');
    expect(compararClubes(clube({ cores: ['preto', 'branco'] }), base).cores.tom).toBe('perto');
    expect(compararClubes(clube({ cores: ['azul', 'vermelho'] }), base).cores.tom).toBe('longe');
  });

  it('capital ou interior: igual ou diferente (sem 🟡)', () => {
    expect(compararClubes(clube({ capital: false }), base).capital.tom).toBe('certo');
    expect(compararClubes(clube({ capital: true }), base).capital.tom).toBe('longe');
  });

  it('todas as UFs têm região', () => {
    expect(Object.keys(REGIAO_DA_UF)).toHaveLength(27);
  });
});

describe('pontos e card', () => {
  it('tabela 100/85/70/55/40/25/0', () => {
    expect([1, 2, 3, 4, 5, 6].map(pontosDoDia)).toEqual([100, 85, 70, 55, 40, 25]);
    expect(pontosDoDia(null)).toBe(0);
    expect(pontosDoDia(0)).toBe(0);
    expect(pontosDoDia(7)).toBe(0);
  });

  it('acaba ao acertar ou na 6ª', () => {
    expect(acabou(1, true)).toBe(true);
    expect(acabou(5, false)).toBe(false);
    expect(acabou(6, false)).toBe(true);
  });

  it('grade sem nome de clube, uma linha por tentativa', () => {
    const linhas = [
      compararClubes(clube({ uf: 'RS', fundacao: 1800, titulos: 20, divisao: 'A', cores: ['azul', 'preto'], capital: true }), base),
      compararClubes(clube({ uf: 'RJ' }), base),
      compararClubes(base, base),
    ];
    expect(gradeEmoji(linhas)).toBe('⚪⚪⚪🟡⚪⚪\n🟡🟢🟢🟢🟢🟢\n🟢🟢🟢🟢🟢🟢');
  });

  it('linha do card', () => {
    expect(placarDoDia(4, true)).toBe('4/6');
    expect(placarDoDia(6, false)).toBe('X/6');
    expect(linhaDoCard(34, '4/6', 5)).toBe('Time do Dia #34 · 4/6 · 🔥 5 dias');
    expect(linhaDoCard(1, 'X/6', 1)).toBe('Time do Dia #1 · X/6');
    expect(linhaDoCard(2, '2/6', 2, true)).toBe('Time do Dia #2 · 2/6 · 🔥 2 dias · NOVO RECORDE!');
  });
});

describe('busca', () => {
  it('ignora acento, maiúscula e hífen', () => {
    expect(normalizarBusca('São Paulo')).toBe('sao paulo');
    expect(normalizarBusca('Atlético-GO')).toBe('atletico go');
    expect(normalizarBusca('  GRÊMIO ')).toBe('gremio');
    expect(normalizarBusca('Atlético-GO').startsWith(normalizarBusca('atletico g'))).toBe(true);
    expect(normalizarBusca('Athletico-PR').startsWith(normalizarBusca('atletico'))).toBe(true);
    expect(normalizarBusca('Athletic').startsWith(normalizarBusca('athle'))).toBe(true);
  });
});

describe('dias', () => {
  it('número do dia e dia anterior (virada de mês e de ano)', () => {
    expect(numeroDoDia('2026-10-21', '2026-10-21')).toBe(1);
    expect(numeroDoDia('2026-10-21', '2026-11-23')).toBe(34);
    expect(diaAnterior('2026-11-01')).toBe('2026-10-31');
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
  });

  it('sequência conta dias jogados seguidos, até hoje ou até ontem', () => {
    const jogados = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];
    expect(sequenciaDeDias(jogados, '2026-10-21')).toBe(4);
    expect(sequenciaDeDias(jogados, '2026-10-22')).toBe(4);
    expect(sequenciaDeDias(jogados, '2026-10-23')).toBe(0);
    expect(sequenciaDeDias(['2026-10-15', '2026-10-17'], '2026-10-17')).toBe(1);
    expect(sequenciaDeDias([], '2026-10-17')).toBe(0);
  });
});

describe('sorteio do clube do dia', () => {
  const ativos = Array.from({ length: 60 }, (_, i) => `c${String(i).padStart(2, '0')}`);
  // Gerador simples e determinístico para o teste.
  const gerador = (semente: number) => {
    let s = semente;
    return (n: number) => {
      s = (s * 1103515245 + 12345) % 2 ** 31;
      return s % n;
    };
  };

  function simular(dias: number, semente: number, lista = ativos): DiaSorteado[] {
    const sorteio = gerador(semente);
    const h: DiaSorteado[] = [];
    for (let d = 0; d < dias; d++) h.push(proximoClube(lista, h, sorteio)!);
    return h;
  }

  it('não repete clube até passar pela lista inteira', () => {
    for (const semente of [1, 7, 42, 2026]) {
      const h = simular(180, semente);
      for (let ciclo = 1; ciclo <= 3; ciclo++) {
        const doCiclo = h.filter((x) => x.ciclo === ciclo).map((x) => x.clube);
        expect(doCiclo).toHaveLength(60);
        expect(new Set(doCiclo).size).toBe(60);
      }
      // Nunca o mesmo clube em dois dias seguidos, nem na virada do ciclo.
      for (let i = 1; i < h.length; i++) expect(h[i].clube).not.toBe(h[i - 1].clube);
    }
  });

  it('clube que sai da lista no meio do ciclo não é sorteado; o que entra, entra no ciclo atual', () => {
    const h = simular(10, 3);
    const novaLista = [...ativos.filter((c) => c !== 'c59'), 'novo'];
    const sorteio = gerador(9);
    for (let d = 0; d < 51; d++) h.push(proximoClube(novaLista, h, sorteio)!);
    const ciclo1 = h.filter((x) => x.ciclo === 1).map((x) => x.clube);
    expect(ciclo1).toContain('novo');
    expect(h.slice(10).map((x) => x.clube)).not.toContain('c59');
  });

  it('lista vazia não sorteia; lista de 1 repete o único clube', () => {
    expect(proximoClube([], [], () => 0)).toBeNull();
    expect(proximoClube(['so'], [{ clube: 'so', ciclo: 1 }], () => 0)).toEqual({ clube: 'so', ciclo: 2 });
  });

  it('sorteio fora do intervalo não quebra', () => {
    expect(proximoClube(['a', 'b'], [], () => 99)?.clube).toBe('b');
    expect(proximoClube(['a', 'b'], [], () => -3)?.clube).toBe('a');
  });
});

describe('detecção', () => {
  const voltar = (dia: string, n: number) => {
    let d = dia;
    for (let i = 0; i < n; i++) d = diaAnterior(d);
    return d;
  };
  /** Um dia por item, o último é 27/10. */
  const dias = (acertos: (number | null)[]) =>
    acertos.map((a, i) => ({ dia: voltar('2026-10-27', acertos.length - 1 - i), acertouNa: a }));

  it('5 acertos de primeira em 7 dias = suspeito', () => {
    expect(suspeitoNoDia(dias([1, 1, 3, 1, null, 1, 1]), '2026-10-27')).toBe(true);
  });

  it('4 de primeira em 7 dias, ou 5 espalhados em mais de 7, não é', () => {
    expect(suspeitoNoDia(dias([1, 1, 3, 1, null, 2, 1]), '2026-10-27')).toBe(false);
    expect(suspeitoNoDia(dias([1, 1, 2, 2, 2, 1, 1, 1]), '2026-10-27')).toBe(false);
  });
});
