import { beforeEach, describe, expect, it, vi } from 'vitest';

const salvarTorcedor = vi.fn();
const salvarFaixaEtaria = vi.fn();
const meuTorcedor = vi.fn();
const ordem: string[] = [];

vi.mock('./api', () => ({
  ErroServidor: class extends Error {
    constructor(public codigo: string) {
      super(codigo);
    }
  },
  salvarTorcedor: (...a: unknown[]) => salvarTorcedor(...a),
  salvarFaixaEtaria: (...a: unknown[]) => salvarFaixaEtaria(...a),
  meuTorcedor: () => meuTorcedor(),
  entrarNaConta: vi.fn(),
  pedirEntrada: vi.fn(),
}));

function armazenamentoFalso() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

async function carregar() {
  vi.resetModules();
  vi.stubGlobal('localStorage', armazenamentoFalso());
  const estado = await import('./../estado');
  const torcedor = await import('./torcedor');
  return { ...estado, ...torcedor };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  ordem.length = 0;
  salvarTorcedor.mockReset().mockImplementation(async (_t: string, a?: string) => {
    ordem.push('apelido');
    return { apelidoRecusado: false, _a: a };
  });
  salvarFaixaEtaria.mockReset().mockImplementation(async () => {
    ordem.push('faixa');
    return true;
  });
  meuTorcedor.mockReset().mockResolvedValue(null);
});

describe('sincronizarTorcedor e o apelido 16+', () => {
  it('menos de 16 apaga o apelido local e não o manda', async () => {
    const t = await carregar();
    t.prefs.set({ time: 'flamengo', apelido: 'Zé' });
    t.guardarFaixa('menos_16');
    t.prefs.set({ apelido: 'Zé' }); // sobra de antes
    await t.sincronizarTorcedor();
    expect(salvarTorcedor).toHaveBeenCalledWith('flamengo', undefined);
    expect(t.prefs.get().apelido).toBeUndefined();
  });

  it('servidor descartou por idade: fica pendente e não vira conferido', async () => {
    const t = await carregar();
    t.prefs.set({ time: 'flamengo', apelido: 'Zé' });
    salvarTorcedor.mockResolvedValue({ apelidoRecusado: true });
    await t.sincronizarTorcedor();
    const p = t.prefs.get();
    expect(p.apelido).toBe('Zé');
    expect(p.apelidoConferido).toBe(false);
    expect(p.sincronizado).toBe(t.marcaDe('flamengo', undefined));
    expect(t.apelidoDoCard()).toBeUndefined();
    // outra rodada: continua pendente, nunca marca conferido
    await t.sincronizarTorcedor();
    expect(t.prefs.get().apelidoConferido).toBe(false);
  });

  it('torcedor que já existe sobe a faixa antes do apelido', async () => {
    const t = await carregar();
    t.guardarFaixa('18_mais');
    t.prefs.set({ time: 'flamengo', apelido: 'Zé', sincronizado: 'flamengo|' });
    await t.sincronizarTorcedor();
    expect(ordem.slice(0, 2)).toEqual(['faixa', 'apelido']);
    expect(t.prefs.get().sincronizado).toBe(t.marcaDe('flamengo', 'Zé'));
  });

  it('torcedor novo com triagem já respondida: tenta o apelido de novo depois da faixa', async () => {
    const t = await carregar();
    t.guardarFaixa('16_17');
    t.prefs.set({ time: 'flamengo', apelido: 'Zé' });
    salvarTorcedor.mockResolvedValueOnce({ apelidoRecusado: true }).mockResolvedValueOnce({ apelidoRecusado: false });
    await t.sincronizarTorcedor();
    expect(salvarTorcedor).toHaveBeenCalledTimes(2);
    expect(t.prefs.get().sincronizado).toBe(t.marcaDe('flamengo', 'Zé'));
    expect(t.prefs.get().apelidoConferido).toBeUndefined();
    expect(t.apelidoDoCard()).toBe('Zé');
  });

  it('faixa já no servidor e apelido recusado (outro aparelho mudou a faixa): não repete o envio', async () => {
    const t = await carregar();
    t.guardarFaixa('16_17');
    t.prefs.set({ time: 'flamengo', apelido: 'Zé', sincronizado: 'flamengo|', faixaSincronizada: '16_17' });
    salvarTorcedor.mockResolvedValue({ apelidoRecusado: true });
    await t.sincronizarTorcedor();
    expect(salvarTorcedor).toHaveBeenCalledTimes(1);
    expect(t.apelidoDoCard()).toBeUndefined();
  });

  it('faixa menos_16 vinda do servidor apaga o apelido e não fica subindo', async () => {
    const t = await carregar();
    t.guardarFaixa('18_mais');
    t.prefs.set({ time: 'flamengo', apelido: 'Zé', sincronizado: 'flamengo|Zé', faixaSincronizada: '18_mais' });
    meuTorcedor.mockResolvedValue({ time_id: 'flamengo', apelido: null, faixa_etaria: 'menos_16' });
    await t.sincronizarTorcedor();
    expect(t.prefs.get().apelido).toBeUndefined();
    expect(t.faixaDoAparelho()).toBe('menos_16');
    expect(salvarTorcedor).not.toHaveBeenCalled();
  });
});
