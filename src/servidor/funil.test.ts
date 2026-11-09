import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O módulo registra ouvintes no topo se existir `document`: aqui o ambiente é Node, então simulamos o navegador
// com stubs globais e importamos o módulo de novo a cada teste (vi.resetModules).

type Ouvinte = () => void;

let beacons: { url: string; corpo: { t?: string; e: { ev: string }[] } }[];
let fetches: { url: string; corpo: { e: { ev: string }[] } }[];
let visibilidade: Ouvinte;
let doc: { hidden: boolean; addEventListener: (n: string, f: Ouvinte) => void };

async function carregar() {
  vi.resetModules();
  return import('./funil');
}

function sumir(): void {
  doc.hidden = true;
  visibilidade();
}
function voltarPraTela(): void {
  doc.hidden = false;
  visibilidade();
}
/** Espera o import() do envio e as promessas dele. */
async function pronto(): Promise<void> {
  await vi.dynamicImportSettled();
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
const eventos = (lista: typeof beacons | typeof fetches) => lista.flatMap((x) => x.corpo.e.map((e) => e.ev));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdef.supabase.co');
  beacons = [];
  fetches = [];
  doc = {
    hidden: false,
    addEventListener: (nome, f) => {
      if (nome === 'visibilitychange') visibilidade = f;
    },
  };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ access_token: 'tok' }) });
  vi.stubGlobal('navigator', {
    sendBeacon: (url: string, corpo: string) => {
      beacons.push({ url, corpo: JSON.parse(corpo) });
      return true;
    },
  });
  vi.stubGlobal('fetch', (url: string, init: { body: string }) => {
    fetches.push({ url, corpo: JSON.parse(init.body) });
    return Promise.resolve(new Response(null));
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const abriu = { ev: 'abriu', tipo: 'lance' } as const;

describe('funil: envio em lote', () => {
  it('junta os eventos e manda tudo junto em 3 s, com o token da sessão no corpo', async () => {
    const { contar } = await carregar();
    contar(abriu);
    contar({ ev: 'abriu', tipo: 'disputa' });
    vi.advanceTimersByTime(2900);
    await pronto();
    expect(fetches).toHaveLength(0);
    vi.advanceTimersByTime(200);
    await pronto();
    expect(fetches).toHaveLength(1);
    expect(fetches[0].url).toBe('https://abcdef.supabase.co/functions/v1/funil');
    expect(fetches[0].corpo.e).toHaveLength(2);
    expect((fetches[0].corpo as unknown as { t: string }).t).toBe('tok');
    expect(beacons).toHaveLength(0);
  });

  it('mais de 20 eventos viram 2 envios', async () => {
    const { contar } = await carregar();
    for (let i = 0; i < 25; i++) contar(abriu);
    vi.advanceTimersByTime(3000);
    await pronto();
    expect(fetches.map((f) => f.corpo.e.length)).toEqual([20, 5]);
  });
});

describe('funil: desistência por etapa', () => {
  it('sumir (hidden) com etapa manda `desistiu` por sendBeacon', async () => {
    const { etapa } = await carregar();
    etapa({ tipo: 'triagem' });
    sumir();
    await pronto();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].corpo.e).toEqual([{ ev: 'desistiu', tipo: 'triagem' }]);
  });

  it('voltar à mesma etapa manda `voltou`', async () => {
    const { etapa } = await carregar();
    etapa({ tipo: 'partida', jogo: 'lances' });
    sumir();
    voltarPraTela();
    vi.advanceTimersByTime(3000);
    await pronto();
    expect(eventos(beacons)).toEqual(['desistiu']);
    expect(eventos(fetches)).toEqual(['voltou']);
    expect(fetches[0].corpo.e[0]).toEqual({ ev: 'voltou', tipo: 'partida', jogo: 'lances' });
  });

  it('voltar já em outra etapa não manda `voltou`', async () => {
    const { etapa } = await carregar();
    etapa({ tipo: 'triagem' });
    sumir();
    etapa({ tipo: 'aquecimento' });
    voltarPraTela();
    vi.advanceTimersByTime(3000);
    await pronto();
    expect(eventos(fetches)).toEqual([]);
  });

  it('sumir duas vezes sem voltar (hidden e depois a página fechando) conta uma vez', async () => {
    const { etapa } = await carregar();
    etapa({ tipo: 'escolha_time' });
    sumir();
    sumir();
    await pronto();
    expect(eventos(beacons)).toEqual(['desistiu']);
  });

  it('ir pro fundo, voltar e ir de novo conta desistiu, voltou, desistiu', async () => {
    const { etapa } = await carregar();
    etapa({ tipo: 'partida', jogo: 'lances' });
    sumir();
    voltarPraTela();
    sumir();
    await pronto();
    expect([...eventos(beacons), ...eventos(fetches)].sort()).toEqual(['desistiu', 'desistiu', 'voltou']);
  });

  it('voltar do cache sem aviso de volta e sair da etapa não conta desistiu duas vezes', async () => {
    const { etapa, sairDaEtapa } = await carregar();
    etapa({ tipo: 'triagem' });
    sumir();
    sairDaEtapa();
    vi.advanceTimersByTime(3000);
    await pronto();
    expect([...eventos(beacons), ...eventos(fetches)]).toEqual(['desistiu']);
  });

  it('sairDaEtapa sem etapa não conta nada', async () => {
    const { sairDaEtapa } = await carregar();
    sairDaEtapa();
    vi.advanceTimersByTime(3000);
    await pronto();
    expect(beacons).toHaveLength(0);
    expect(fetches).toHaveLength(0);
  });

  it('sairDaEtapa com etapa conta `desistiu` e limpa a etapa', async () => {
    const { etapa, sairDaEtapa } = await carregar();
    etapa({ tipo: 'triagem', x1: 'abcd1234' });
    sairDaEtapa();
    sairDaEtapa();
    vi.advanceTimersByTime(3000);
    await pronto();
    expect(fetches).toHaveLength(1);
    expect(fetches[0].corpo.e).toEqual([{ ev: 'desistiu', tipo: 'triagem', x1: 'abcd1234' }]);
  });

  it('etapa(null) e depois sumir não conta', async () => {
    const { etapa } = await carregar();
    etapa({ tipo: 'triagem' });
    etapa(null);
    sumir();
    await pronto();
    expect(beacons).toHaveLength(0);
    expect(fetches).toHaveLength(0);
  });
});

describe('funil: módulo de envio que não baixa (sem rede)', () => {
  let falhas: number;
  let lotes: string[][];
  async function comImportQueFalha(vezes: number) {
    falhas = vezes;
    lotes = [];
    vi.doMock('./funilEnvio', () => {
      if (falhas-- > 0) throw new Error('Failed to fetch dynamically imported module');
      return { mandar: (l: { ev: string }[]) => void lotes.push(l.map((e) => e.ev)) };
    });
    return carregar();
  }
  afterEach(() => vi.doUnmock('./funilEnvio'));

  it('falha uma vez: sem exceção, e o lote sai inteiro, uma vez só, no envio seguinte', async () => {
    const { contar, enviar } = await comImportQueFalha(1);
    const soltas: unknown[] = [];
    const ouvir = (r: unknown) => soltas.push(r);
    process.on('unhandledRejection', ouvir);
    contar({ ev: 'abriu', tipo: 'lance' });
    contar({ ev: 'abriu', tipo: 'disputa' });
    vi.advanceTimersByTime(3000);
    await pronto();
    expect(lotes).toEqual([]);
    enviar();
    await pronto();
    enviar();
    await pronto();
    process.off('unhandledRejection', ouvir);
    expect(soltas).toEqual([]);
    expect(lotes).toEqual([['abriu', 'abriu']]);
  });

  it('falha sempre: a fila não passa do teto e, quando a rede volta, sai só o teto', async () => {
    const { contar, enviar } = await comImportQueFalha(1000);
    for (let i = 0; i < 150; i++) contar(abriu);
    vi.advanceTimersByTime(3000);
    await pronto();
    enviar();
    await pronto();
    falhas = 0;
    enviar();
    await pronto();
    expect(lotes.flat()).toHaveLength(100);
    expect(lotes).toHaveLength(1);
  });
});
