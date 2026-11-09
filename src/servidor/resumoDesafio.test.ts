import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Os resumos de desafio por link (?d=, ?l=, ?p=) saem por fetch, sem o supabase-js (E01).
const rpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc, auth: { onAuthStateChange: () => {} } }),
}));

const URL_FALSA = 'https://exemplo-teste.supabase.co';

async function carregarApi() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', URL_FALSA);
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste');
  return import('./api');
}

const resposta = (status: number, corpo: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => corpo }) as Response;

describe('resumo de desafio sem o supabase-js', () => {
  const fetchFalso = vi.fn();
  beforeEach(() => {
    rpc.mockReset();
    fetchFalso.mockReset();
    vi.stubGlobal('fetch', fetchFalso);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('lê pela RPC com a chave pública e devolve a 1ª linha', async () => {
    const api = await carregarApi();
    fetchFalso.mockResolvedValue(resposta(200, [{ id: 'abcdefgh', pontos: 96 }]));
    expect(await api.verDesafio('abcdefgh')).toEqual({ id: 'abcdefgh', pontos: 96 });
    const [url, pedido] = fetchFalso.mock.calls[0];
    expect(url).toBe(`${URL_FALSA}/rest/v1/rpc/ver_desafio`);
    expect(pedido.method).toBe('POST');
    expect(pedido.headers).toEqual({ apikey: 'sb_publishable_teste', 'Content-Type': 'application/json' });
    expect(JSON.parse(pedido.body)).toEqual({ p_id: 'abcdefgh' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('código que não existe: null', async () => {
    const api = await carregarApi();
    fetchFalso.mockResolvedValue(resposta(200, []));
    expect(await api.verDesafioLances('zz000000')).toBeNull();
    expect(fetchFalso.mock.calls[0][0]).toBe(`${URL_FALSA}/rest/v1/rpc/ver_desafio_lances`);
  });

  it('sem rede: falha sem baixar o supabase-js', async () => {
    const api = await carregarApi();
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.verDesafioProva('abcdefgh')).rejects.toMatchObject({ codigo: 'falha' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('aproveita uma vez o pedido que o index.html já fez para o link', async () => {
    const api = await carregarApi();
    const pagina = globalThis as { __resumoDoLink?: unknown };
    pagina.__resumoDoLink = { rpc: 'ver_desafio', id: 'abcdefgh', resposta: Promise.resolve(resposta(200, [{ id: 'abcdefgh', pontos: 7 }])) };
    fetchFalso.mockResolvedValue(resposta(200, [{ id: 'abcdefgh', pontos: 96 }]));
    expect(await api.verDesafio('abcdefgh')).toEqual({ id: 'abcdefgh', pontos: 7 });
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(pagina.__resumoDoLink).toBeUndefined();
    expect(await api.verDesafio('abcdefgh')).toEqual({ id: 'abcdefgh', pontos: 96 }); // a 2ª vez pede de novo
  });

  it('pedido do index.html de outro código ou que falhou: pede de novo', async () => {
    const api = await carregarApi();
    const pagina = globalThis as { __resumoDoLink?: unknown };
    pagina.__resumoDoLink = { rpc: 'ver_desafio_lances', id: 'abcdefgh', resposta: Promise.resolve(resposta(200, [{ id: 'outro' }])) };
    fetchFalso.mockResolvedValue(resposta(200, [{ id: 'abcdefgh' }]));
    expect(await api.verDesafio('abcdefgh')).toEqual({ id: 'abcdefgh' });
    pagina.__resumoDoLink = { rpc: 'ver_desafio', id: 'abcdefgh', resposta: Promise.reject(new TypeError('rede')) };
    expect(await api.verDesafio('abcdefgh')).toEqual({ id: 'abcdefgh' });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    pagina.__resumoDoLink = undefined;
  });

  it('atalho com erro: tenta pelo cliente de sempre', async () => {
    const api = await carregarApi();
    fetchFalso.mockResolvedValue(resposta(401, { message: 'não' }));
    rpc.mockResolvedValue({ data: [{ id: 'abcdefgh' }], error: null });
    expect(await api.verDesafioProva('abcdefgh')).toEqual({ id: 'abcdefgh' });
    expect(rpc).toHaveBeenCalledWith('ver_prova_desafio', { p_id: 'abcdefgh' });
  });
});

// O index.html pede o resumo antes do JS: mesma regra do código (app.ts, x1DoLink) e as mesmas RPCs de lerResumo.
describe('pedido do resumo no index.html', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1];

  function rodar(busca: string) {
    const pedidos: { url: string; corpo: unknown; cabecalhos: unknown }[] = [];
    const janela: { __resumoDoLink?: { rpc: string; id: string } } = {};
    const fetchFalso = (url: string, o: { body: string; headers: unknown }) => {
      pedidos.push({ url, corpo: JSON.parse(o.body), cabecalhos: o.headers });
      return Promise.resolve();
    };
    runInNewContext(script, { window: janela, location: { search: busca }, URLSearchParams, fetch: fetchFalso, JSON });
    return { pedidos, guardado: janela.__resumoDoLink };
  }

  it('usa as variáveis do build (o Vite troca no index.html)', () => {
    expect(script).toContain("'%VITE_SUPABASE_URL%/rest/v1/rpc/'");
    expect(script).toContain("apikey: '%VITE_SUPABASE_PUBLISHABLE_KEY%'");
    expect(html.indexOf('__resumoDoLink')).toBeLessThan(html.indexOf('type="module"'));
  });

  it('cada link pede a sua RPC, com o código em minúsculas', () => {
    expect(rodar('?d=ABCdefgh').guardado).toMatchObject({ rpc: 'ver_desafio', id: 'abcdefgh' });
    expect(rodar('?l=abcdefgh').guardado).toMatchObject({ rpc: 'ver_desafio_lances', id: 'abcdefgh' });
    const { pedidos, guardado } = rodar('?time=flamengo&p=abcdefgh');
    expect(guardado).toMatchObject({ rpc: 'ver_prova_desafio', id: 'abcdefgh' });
    expect(pedidos).toEqual([
      { url: '%VITE_SUPABASE_URL%/rest/v1/rpc/ver_prova_desafio', corpo: { p_id: 'abcdefgh' }, cabecalhos: { apikey: '%VITE_SUPABASE_PUBLISHABLE_KEY%', 'Content-Type': 'application/json' } },
    ]);
  });

  it('a ordem é a do x1DoLink (pênaltis, Lances, Prova), e código fora do formato não pede nada', () => {
    expect(rodar('?p=abcdefgh&l=abcdefgh&d=abcdefgh').guardado?.rpc).toBe('ver_desafio');
    expect(rodar('?d=curto&l=abcdefgh').guardado?.rpc).toBe('ver_desafio_lances');
    expect(rodar('?d=abc-efgh').pedidos).toEqual([]);
    expect(rodar('').pedidos).toEqual([]);
  });
});
