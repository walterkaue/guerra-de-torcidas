import { describe, expect, it } from 'vitest';
import { criarDicas, DICAS, type EstadoDasDicas } from './dicas';
import {
  bolaNaBarreira,
  cantosDaZona,
  cavadinhaPegaNoMeio,
  cavadinhaPegaSemSair,
  chuteFracoPego,
  chutePorCimaPorForca,
  coresEmAmarelo,
  defesaSemToque,
  goleiroPegouNoMeio,
  goleiroSaiu,
  golSemRecriar,
  ladoCertoAlturaErrada,
  primeiraDica,
  semEfeitoSeguido,
  temSeta,
  terceiroChuteSemVerde,
} from './dicasGatilhos';
import type { ResultadoLance } from './lances';
import { resolverCobranca, resolverDefesa, type GestoCobranca, type ResultadoCobranca, type ResultadoDefesa } from './penaltis';
import type { Pistas, Tom } from './timeDoDia';

const cobranca = (o: Partial<ResultadoCobranca>): ResultadoCobranca => ({
  desfecho: 'gol',
  x: 0,
  y: 0.5,
  zonaBola: 1,
  zonaGoleiro: 0,
  angulo: false,
  raspouTrave: false,
  cavadinha: false,
  fraca: false,
  goleiroLeu: false,
  pontos: 10,
  ...o,
});
const lance = (o: Partial<ResultadoLance>): ResultadoLance => ({
  desfecho: 'gol',
  x: 0,
  y: 0.5,
  zonaBola: 1,
  cavadinha: false,
  angulo: false,
  raspouTrave: false,
  recriou: false,
  goleiroX: 0,
  tFim: 1,
  pontos: 10,
  ...o,
});
const gesto = (o: Partial<GestoCobranca>): GestoCobranca => ({ dir: 40, forca: 60, efeito: 0, ...o });
const defesa = (o: Partial<ResultadoDefesa>): ResultadoDefesa => ({
  desfecho: 'gol',
  alvo: 0,
  zonaGoleiro: 3,
  contraGravada: false,
  pontos: 0,
  ...o,
});

describe('dicas dos pênaltis', () => {
  it('chute por cima por força demais: fora com altura acima do travessão, dentro das traves', () => {
    expect(chutePorCimaPorForca(cobranca({ desfecho: 'fora', y: 1.3, x: 0.2 }))).toBe(true);
    expect(chutePorCimaPorForca(cobranca({ desfecho: 'fora', y: 0.5, x: 1.3 }))).toBe(false);
    expect(chutePorCimaPorForca(cobranca({ desfecho: 'fora', y: 1.4, x: 1.3 }))).toBe(false);
    expect(chutePorCimaPorForca(cobranca({ desfecho: 'trave', y: 1.02 }))).toBe(false);
    expect(chutePorCimaPorForca(cobranca({ desfecho: 'gol' }))).toBe(false);
  });

  it('com o motor: força 100 reta vai por cima', () => {
    const r = resolverCobranca(7, 0, gesto({ dir: 0, forca: 100 }), 0.5);
    expect(chutePorCimaPorForca(r)).toBe(true);
  });

  it('chute fraco que o goleiro pegou', () => {
    expect(chuteFracoPego(cobranca({ desfecho: 'defesa', fraca: true }))).toBe(true);
    expect(chuteFracoPego(cobranca({ desfecho: 'defesa', fraca: false }))).toBe(false);
    expect(chuteFracoPego(cobranca({ desfecho: 'gol', fraca: true }))).toBe(false);
  });

  it('cavadinha pega só quando o goleiro ficou parado no meio', () => {
    expect(cavadinhaPegaNoMeio(cobranca({ desfecho: 'defesa', cavadinha: true, zonaGoleiro: 1 }))).toBe(true);
    expect(cavadinhaPegaNoMeio(cobranca({ desfecho: 'defesa', cavadinha: true, zonaGoleiro: 4 }))).toBe(true);
    expect(cavadinhaPegaNoMeio(cobranca({ desfecho: 'defesa', cavadinha: false, zonaGoleiro: 1 }))).toBe(false);
    expect(cavadinhaPegaNoMeio(cobranca({ desfecho: 'gol', cavadinha: true, zonaGoleiro: 0 }))).toBe(false);
  });

  it('3 cobranças seguidas sem efeito', () => {
    const reta = gesto({ efeito: 0 });
    const curva = gesto({ efeito: 60 });
    expect(semEfeitoSeguido([reta, reta])).toBe(false);
    expect(semEfeitoSeguido([reta, reta, reta])).toBe(true);
    expect(semEfeitoSeguido([curva, reta, reta, reta])).toBe(true);
    expect(semEfeitoSeguido([reta, reta, curva])).toBe(false);
    expect(semEfeitoSeguido([reta, curva, reta, reta])).toBe(false);
  });

  it('cavadinha não conta como "sem efeito"', () => {
    const reta = gesto({ efeito: 0 });
    const cav = gesto({ dir: 0, forca: 16, efeito: 0 });
    expect(semEfeitoSeguido([reta, reta, cav])).toBe(false);
    expect(semEfeitoSeguido([cav, cav, cav])).toBe(false);
  });

  it('defesa sem toque e lado certo com altura errada', () => {
    expect(defesaSemToque(defesa({ zonaGoleiro: -1 }))).toBe(true);
    expect(defesaSemToque(defesa({ zonaGoleiro: 2 }))).toBe(false);
    expect(ladoCertoAlturaErrada(defesa({ alvo: 0, zonaGoleiro: 3 }))).toBe(true);
    expect(ladoCertoAlturaErrada(defesa({ alvo: 5, zonaGoleiro: 2 }))).toBe(true);
    expect(ladoCertoAlturaErrada(defesa({ alvo: 0, zonaGoleiro: 4 }))).toBe(false);
    expect(ladoCertoAlturaErrada(defesa({ alvo: 0, zonaGoleiro: 0, desfecho: 'defesa' }))).toBe(false);
    expect(ladoCertoAlturaErrada(defesa({ alvo: 0, zonaGoleiro: -1 }))).toBe(false);
  });

  it('com o motor: a condição bate com o que a defesa resolve', () => {
    let achou = 0;
    for (let s = 1; s < 400; s++) {
      const r = resolverDefesa(s, 0, 3, 0.5);
      if (r.desfecho === 'gol' && r.alvo === 0) {
        expect(ladoCertoAlturaErrada(r)).toBe(true);
        achou++;
      }
      if (r.desfecho === 'defesa') expect(ladoCertoAlturaErrada(r)).toBe(false);
    }
    expect(achou).toBeGreaterThan(0);
  });
});

describe('dicas das faltas e do cara a cara', () => {
  it('goleiro saiu 3 m ou mais', () => {
    expect(goleiroSaiu({ goleiroSaida: 3 })).toBe(true);
    expect(goleiroSaiu({ goleiroSaida: 2.9 })).toBe(false);
    expect(goleiroSaiu({})).toBe(false);
  });

  it('cavadinha pega por goleiro que não saiu', () => {
    const r = lance({ desfecho: 'defesa', cavadinha: true });
    expect(cavadinhaPegaSemSair(r, { goleiroSaida: 1 })).toBe(true);
    expect(cavadinhaPegaSemSair(r, {})).toBe(true);
    expect(cavadinhaPegaSemSair(r, { goleiroSaida: 4 })).toBe(false);
    expect(cavadinhaPegaSemSair(lance({ desfecho: 'defesa' }), {})).toBe(false);
    expect(cavadinhaPegaSemSair(lance({ cavadinha: true }), {})).toBe(false);
  });

  it('goleiro pegou chute no meio', () => {
    expect(goleiroPegouNoMeio(lance({ desfecho: 'defesa', zonaBola: 1 }))).toBe(true);
    expect(goleiroPegouNoMeio(lance({ desfecho: 'defesa', zonaBola: 4 }))).toBe(true);
    expect(goleiroPegouNoMeio(lance({ desfecho: 'defesa', zonaBola: 0 }))).toBe(false);
    expect(goleiroPegouNoMeio(lance({ desfecho: 'defesa', zonaBola: 1, cavadinha: true }))).toBe(false);
    expect(goleiroPegouNoMeio(lance({ desfecho: 'gol', zonaBola: 1 }))).toBe(false);
  });

  it('gol que não recriou e bola na barreira', () => {
    expect(golSemRecriar(lance({ recriou: false }))).toBe(true);
    expect(golSemRecriar(lance({ recriou: true }))).toBe(false);
    expect(golSemRecriar(lance({ desfecho: 'defesa' }))).toBe(false);
    expect(bolaNaBarreira(lance({ desfecho: 'barreira' }))).toBe(true);
    expect(bolaNaBarreira(lance({ desfecho: 'fora' }))).toBe(false);
  });

  it('cantos da zona no plano do gol', () => {
    expect(cantosDaZona(0, 3, 2)).toEqual({ x0: -3, x1: -1, y0: 0, y1: 1 });
    expect(cantosDaZona(5, 3, 2)).toEqual({ x0: 1, x1: 3, y0: 1, y1: 2 });
    const meio = cantosDaZona(1);
    expect(meio.x0).toBeCloseTo(-meio.x1);
  });
});

const nomes = ['estado', 'fundacao', 'titulos', 'divisao', 'cores', 'capital'] as const;
const pistas = (tons: Partial<Record<(typeof nomes)[number], Tom>>, setas: (typeof nomes)[number][] = []): Pistas =>
  Object.fromEntries(nomes.map((n) => [n, { tom: tons[n] ?? 'longe', ...(setas.includes(n) ? { seta: 'acima' } : {}) }])) as unknown as Pistas;

describe('dicas do Time do Dia', () => {
  it('3º chute errado sem nenhum verde', () => {
    const sem = { pistas: pistas({ estado: 'perto', cores: 'perto' }) };
    const com = { pistas: pistas({ estado: 'certo' }) };
    expect(terceiroChuteSemVerde([sem, sem, sem])).toBe(true);
    expect(terceiroChuteSemVerde([sem, com, sem])).toBe(false);
    expect(terceiroChuteSemVerde([sem, sem])).toBe(false);
    expect(terceiroChuteSemVerde([sem, sem, sem, sem])).toBe(false);
    expect(terceiroChuteSemVerde([sem, sem, sem], true)).toBe(false);
  });

  it('seta e cores em amarelo', () => {
    expect(temSeta({ pistas: pistas({}, ['fundacao']) })).toBe(true);
    expect(temSeta({ pistas: pistas({}) })).toBe(false);
    expect(coresEmAmarelo({ pistas: pistas({ cores: 'perto' }) })).toBe(true);
    expect(coresEmAmarelo({ pistas: pistas({ cores: 'certo' }) })).toBe(false);
  });
});

describe('primeiraDica', () => {
  function memoria() {
    let estado: EstadoDasDicas = {};
    return criarDicas(
      () => estado,
      (e) => {
        estado = e;
      },
    );
  }

  it('pega o primeiro que vale e ainda pode aparecer', () => {
    const d = memoria();
    expect(primeiraDica(d, [[false, 'pen_fraco'], [true, 'pen_sem_efeito'], [true, 'pen_cavadinha']])).toBe(DICAS.pen_sem_efeito);
    expect(primeiraDica(d, [[true, 'pen_cavadinha']])).toBeNull();
  });

  it('se o primeiro já esgotou no aparelho, cai para o seguinte', () => {
    const d = memoria();
    for (let i = 0; i < 2; i++) {
      expect(primeiraDica(d, [[true, 'pen_fraco']])).toBe(DICAS.pen_fraco);
      d.novoLance();
    }
    expect(primeiraDica(d, [[true, 'pen_fraco'], [true, 'pen_sem_efeito']])).toBe(DICAS.pen_sem_efeito);
  });

  it('nada vale: nada aparece e o lance segue livre', () => {
    const d = memoria();
    expect(primeiraDica(d, [[false, 'pen_fraco']])).toBeNull();
    expect(d.pedir('pen_fraco')).toBe(DICAS.pen_fraco);
  });
});
