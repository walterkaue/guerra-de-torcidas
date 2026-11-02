import { describe, expect, it } from 'vitest';
import { ehOpera, explicacaoDoAviso, podeConvidar } from './convitePush';

const DIA = 24 * 3600_000;

describe('convite para o aviso de domingo', () => {
  it('só convida quem ainda não respondeu ao navegador e não viu o convite nos últimos 14 dias', () => {
    const agora = 100 * DIA;
    expect(podeConvidar(agora, 0, 'default')).toBe(true);
    expect(podeConvidar(agora, agora - 13 * DIA, 'default')).toBe(false);
    expect(podeConvidar(agora, agora - 14 * DIA, 'default')).toBe(true);
    expect(podeConvidar(agora, 0, 'denied')).toBe(false); // recusou: nunca mais insiste
    expect(podeConvidar(agora, 0, 'granted')).toBe(false); // já liberou
  });

  it('explica o bloqueio no Android pelas duas portas (site e app do navegador)', () => {
    expect(explicacaoDoAviso('bloqueado', false, true)).toMatch(/Configurações → Apps/);
    expect(explicacaoDoAviso('bloqueado', false, false)).not.toMatch(/Configurações/);
  });

  it('app instalado por navegador sem push: reinstalar pelo Chrome', () => {
    expect(explicacaoDoAviso('sem-suporte', true)).toMatch(/Instalar app/);
    expect(explicacaoDoAviso('sem-suporte', false)).toMatch(/Abrir no Chrome/);
  });

  it('reconhece o Opera (inclusive GX) e não confunde com o Chrome', () => {
    expect(ehOpera('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0 (Edition GX)')).toBe(true);
    expect(ehOpera('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')).toBe(false);
  });
});
