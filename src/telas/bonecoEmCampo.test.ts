import { describe, expect, it } from 'vitest';
import { TIMES, corDeTexto } from '../dados/times';
import { PADRAO, type Vestimenta } from '../jogo/vestiario';
import { batedorEmCampo, vestimentaDeCampo } from './bonecoEmCampo';
import { CORES_DE_CABELO, JUNTA, TONS_DE_PELE, diferencaDeCor, novaPose, uniformeDeLinha, uniformesDaPartida, type Uniforme } from './bonecos';
import { camadasDeCampo } from './bonecoMontavel';

const CORAÇÃO = ['#c8102e', '#111111'] as const;
const roupa = (): Uniforme => uniformeDeLinha(['#ffffff', '#1d4ed8']);
const vest = (o: Partial<Vestimenta> = {}): Vestimenta => ({ ...PADRAO, ...o });
const em = (v: unknown, ligado = true, r: Uniforme = roupa(), cores: readonly [string, string] = CORAÇÃO) => batedorEmCampo(v, ligado, r, cores);

describe('boneco em campo: quando cai no sorteio', () => {
  it('sem vestimenta, vestimenta inválida ou interruptor desligado, devolve null', () => {
    expect(em(null)).toBeNull();
    expect(em(undefined)).toBeNull();
    expect(em('batedor')).toBeNull();
    expect(em({ ...vest(), v: 2 })).toBeNull();
    expect(em({ ...vest(), pele: 9 })).toBeNull();
    expect(em({ ...vest(), numero: '123' })).toBeNull();
    expect(em({ v: 1, corpo: 'h' })).toBeNull();
    expect(em(vest({ numero: '10' }), false)).toBeNull();
  });
});

describe('boneco em campo: o que entra e o que fica de fora', () => {
  it('corpo, pele, cabelo e cor de cabelo vêm da vestimenta', () => {
    const b = em(vest({ corpo: 'm', pele: 4, cabelo: 'coque', corCabelo: 3 }))!;
    expect(b.aparencia).toEqual({ pele: TONS_DE_PELE[4], cabelo: 'coque', corCabelo: CORES_DE_CABELO[3], mulher: true, barra: 'fora' });
    expect(em(vest({ corpo: 'h' }))!.aparencia.mulher).toBe(false);
  });

  it('colete, faixa, apito, pose, fundo e moldura nunca entram', () => {
    const limpa = em(vest({ numero: '7' }))!;
    const cheia = em(vest({ numero: '7', peito: 'colete', pescoco: 'apito', pose: 'bracos', fundo: 'estadio_noite', moldura: 'galeria' }))!;
    const faixa = em(vest({ numero: '7', peito: 'faixa' }))!;
    expect(cheia).toEqual(limpa);
    expect(faixa).toEqual(limpa);
    // O número continua lá, nada cobre.
    expect(cheia.pecas.numero).toBe('7');
    expect(Object.keys(cheia.pecas).sort()).toEqual(['bracadeira', 'chuteiraDourada', 'corDoNumero', 'numero', 'punho', 'testeira']);
  });

  it('o campo "camisa" da vestimenta é ignorado: a roupa é a da cena', () => {
    const cena = roupa();
    const uni1 = em(vest({ camisa: 'uni1' }), true, cena)!;
    for (const camisa of ['uni2', 'goleiro'] as const) {
      const b = em(vest({ camisa }), true, cena)!;
      expect(b).toEqual(uni1);
      expect(b.uniforme).toEqual(cena);
    }
  });

  it('a roupa da cena vale em qualquer cena (clube do lance, adversário trocado, goleiro do Gol 100)', () => {
    const u = uniformesDaPartida(['#006437', '#ffffff'], ['#c8102e', '#111111'], 1);
    for (const cena of [u.jogador, u.adversario, u.goleiroJogador]) {
      expect(em(vest(), true, cena)!.uniforme).toEqual(cena);
    }
  });
});

describe('boneco em campo: número', () => {
  it('sem número, camisa lisa', () => {
    const b = em(vest({ numero: null }))!;
    expect(b.pecas.numero).toBeNull();
    expect(b.pecas.corDoNumero).toBeNull();
  });

  it('camisa clara leva número escuro e camisa escura leva número claro', () => {
    const clara = em(vest({ numero: '10' }), true, uniformeDeLinha(['#ffffff', '#111111']))!;
    expect(clara.pecas.numero).toBe('10');
    expect(clara.pecas.corDoNumero).toBe('#111111');
    const escura = em(vest({ numero: '9' }), true, uniformeDeLinha(['#111111', '#ffffff']))!;
    expect(escura.pecas.corDoNumero).toBe('#ffffff');
  });

  it('a cor do número segue a camisa da cena, não a do time do coração', () => {
    const b = em(vest({ numero: '5' }), true, uniformeDeLinha(['#ffd23f', '#111111']), ['#111111', '#111111'])!;
    expect(b.pecas.corDoNumero).toBe(corDeTexto('#ffd23f'));
  });
});

describe('boneco em campo: peças com as cores do time do coração', () => {
  const lance = uniformeDeLinha(['#006437', '#ffffff']); // clube do lance, diferente do coração

  it('chuteira "time" usa as cores do coração mesmo num lance de outro clube', () => {
    const b = em(vest({ chuteira: 'time' }), true, lance)!;
    expect(CORAÇÃO).toContain(b.uniforme.chuteira);
    // A que mais se afasta do meião da cena.
    const longe = diferencaDeCor(CORAÇÃO[0], lance.meiao) >= diferencaDeCor(CORAÇÃO[1], lance.meiao) ? CORAÇÃO[0] : CORAÇÃO[1];
    expect(b.uniforme.chuteira).toBe(longe);
    expect(b.uniforme.camisa).toBe(lance.camisa);
    expect(b.pecas.chuteiraDourada).toBe(false);
  });

  it('chuteira dourada vale e leva o brilho', () => {
    const b = em(vest({ chuteira: 'dourada' }), true, lance)!;
    expect(b.uniforme.chuteira).toBe('#d4a017');
    expect(b.pecas.chuteiraDourada).toBe(true);
  });

  it('chuteira neutra deixa a da cena', () => {
    expect(em(vest({ chuteira: 'neutra' }), true, lance)!.uniforme.chuteira).toBe(lance.chuteira);
  });

  it('munhequeira nas cores do coração (a que mais contrasta com a pele) ou bronze', () => {
    const b = em(vest({ punho: 'munhequeira', pele: 0 }), true, lance)!;
    expect(b.pecas.punho).not.toBeNull();
    expect(CORAÇÃO).toContain(b.pecas.punho!.principal);
    expect(CORAÇÃO).toContain(b.pecas.punho!.filete);
    expect(em(vest({ punho: 'munhequeira_bronze' }), true, lance)!.pecas.punho).toEqual({ principal: '#b87333', filete: '#e0a26a' });
    expect(em(vest({ punho: 'nenhum' }))!.pecas.punho).toBeNull();
  });

  it('testeira nas cores do coração, com contraste contra o cabelo e a pele', () => {
    for (const t of TIMES) {
      const b = em(vest({ cabeca: 'testeira', pele: 3, cabelo: 'curto', corCabelo: 0 }), true, lance, t.cores)!;
      const cor = b.pecas.testeira!;
      expect(cor).toBeTruthy();
      expect(Math.min(diferencaDeCor(cor, CORES_DE_CABELO[0]), diferencaDeCor(cor, TONS_DE_PELE[3]))).toBeGreaterThanOrEqual(90);
    }
    expect(em(vest({ cabeca: 'nenhum' }))!.pecas.testeira).toBeNull();
  });

  it('braçadeira', () => {
    expect(em(vest({ braco: 'bracadeira' }))!.pecas.bracadeira).toBe(true);
    expect(em(vest({ braco: 'nenhum' }))!.pecas.bracadeira).toBe(false);
  });
});

describe('camadas de campo: costas e replay espelhado', () => {
  const pecas = (o = {}) => ({ numero: '10', corDoNumero: '#fff', testeira: null, punho: null, bracadeira: false, chuteiraDourada: false, ...o });
  /** Contexto de mentira que anota as chamadas. */
  const gravador = () => {
    const chamadas: [string, ...number[]][] = [];
    const c = new Proxy({} as Record<string, unknown>, {
      get: (_, nome: string) => (...args: number[]) => {
        chamadas.push([nome, ...args.filter((a) => typeof a === 'number')]);
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    return { c, chamadas };
  };
  // Juntas distintas para saber de que ombro vem cada translate (pelve 0-1, ombros em 2/3 e 4/5 por J_OMBRO).
  const boneco = () => ({ j: Float32Array.from({ length: 30 }, (_, i) => 100 + i) }) as unknown as import('./bonecos').Boneco;

  it('o número é desvirado (scale -1) só quando a câmera espelha, e fica legível', () => {
    const sprite = { img: {} as HTMLCanvasElement };
    for (const [espelhado, esperado] of [[true, true], [false, false]] as const) {
      const { c, chamadas } = gravador();
      camadasDeCampo(pecas(), sprite, 0, espelhado).tronco!(c, boneco(), novaPose());
      expect(chamadas.some(([n, a, b]) => n === 'scale' && a === -1 && b === 1)).toBe(esperado);
      expect(chamadas.some(([n]) => n === 'drawImage')).toBe(true);
    }
  });

  it('sem sprite (Anton ainda carregando) não desenha número nem quebra', () => {
    const { c, chamadas } = gravador();
    const camadas = camadasDeCampo(pecas(), { img: null }, 0, false);
    camadas.tronco!(c, boneco(), novaPose());
    expect(chamadas.length).toBe(0);
  });

  it('a braçadeira cai no osso pedido: esquerda da tela de costas e no replay espelhado, direita de frente sem espelho', () => {
    const b = boneco();
    const ombro = (lado: 0 | 1) => [b.j[JUNTA.OMBRO + lado * 2], b.j[JUNTA.OMBRO + lado * 2 + 1]];
    for (const lado of [0, 1] as const) {
      const { c, chamadas } = gravador();
      camadasDeCampo(pecas({ bracadeira: true }), null, lado, false).fim!(c, b, novaPose());
      const t = chamadas.filter(([n]) => n === 'translate').map(([, x, y]) => [x, y]);
      expect(t).toContainEqual(ombro(lado));
      expect(t).not.toContainEqual(ombro(lado ? 0 : 1));
    }
  });
});

describe('boneco de quem chamou o X1: do servidor para a Vestimenta', () => {
  const doServidor = { corpo: 'm', pele: 5, cabelo: 'coque', corCabelo: 3, numero: '7', cabeca: 'testeira', punho: 'munhequeira_bronze', braco: 'bracadeira', chuteira: 'dourada' };

  it('null, ausente ou não-objeto: null (sem boneco)', () => {
    expect(vestimentaDeCampo(null)).toBeNull();
    expect(vestimentaDeCampo(undefined)).toBeNull();
    expect(vestimentaDeCampo('boneco')).toBeNull();
    expect(vestimentaDeCampo([])).toBeNull();
  });

  it('monta a Vestimenta completa: as 10 chaves entram, o resto é o PADRAO', () => {
    const v = vestimentaDeCampo(doServidor)!;
    expect(v).toEqual({ ...PADRAO, ...doServidor });
    expect(v.camisa).toBe(PADRAO.camisa);
    expect(v.peito).toBe('nenhum');
    expect(v.pescoco).toBe('nenhum');
    expect(v.pose).toBe(PADRAO.pose);
  });

  it('chave a mais é ignorada (nada de colete, camisa ou id vindo de fora)', () => {
    const v = vestimentaDeCampo({ ...doServidor, peito: 'colete', pescoco: 'apito', camisa: 'goleiro', pose: 'bracos', fundo: 'estadio_noite', moldura: 'galeria', torcedor_id: 'x' })!;
    expect(v).toEqual({ ...PADRAO, ...doServidor });
  });

  it('objeto torto cai no padrão, campo a campo', () => {
    const v = vestimentaDeCampo({ ...doServidor, pele: 9, cabelo: 'moicano', numero: '123', chuteira: 7 })!;
    expect(v.pele).toBe(PADRAO.pele);
    expect(v.cabelo).toBe(PADRAO.cabelo);
    expect(v.numero).toBeNull();
    expect(v.chuteira).toBe(PADRAO.chuteira);
    expect(v.corpo).toBe('m');
    expect(vestimentaDeCampo({})).toBeNull(); // sem nenhuma peça de campo não é boneco
    expect(vestimentaDeCampo({ fundo: 'estadio_noite', torcedor_id: 'x' })).toBeNull();
    expect(vestimentaDeCampo({ cabelo: 'coque' })).toEqual({ ...PADRAO, cabelo: 'coque' });
  });

  it('a barra vem do servidor; servidor antigo, sem barra, vale por fora; só a barra não é boneco', () => {
    expect(vestimentaDeCampo({ ...doServidor, barra: 'dentro' })!.barra).toBe('dentro');
    expect(vestimentaDeCampo(doServidor)!.barra).toBe('fora');
    expect(vestimentaDeCampo({ ...doServidor, barra: 'solta' })!.barra).toBe('fora');
    expect(vestimentaDeCampo({ barra: 'dentro' })).toBeNull();
  });

  it('a barra chega ao boneco do batedor; cópia antiga sem barra desenha por fora', () => {
    expect(em({ ...PADRAO, barra: 'dentro' })!.aparencia.barra).toBe('dentro');
    const { barra: _b, ...antiga } = PADRAO;
    expect(em(antiga)!.aparencia.barra).toBe('fora');
  });

  it('o resultado passa no batedorEmCampo (forma da Vestimenta completa)', () => {
    expect(em(vestimentaDeCampo(doServidor))).not.toBeNull();
  });
});
