import { describe, expect, it } from 'vitest';
import {
  ALFABETO,
  chanceDeAcertar,
  CODIGOS_POSSIVEIS,
  codigoDoEndereco,
  ehEmailTecnico,
  emailTecnicoDe,
  formatarCodigo,
  impressaoDoCodigo,
  limparDigitado,
  linkDoCodigo,
  normalizarCodigo,
  sortearCodigo,
} from './codigoTorcedor';

describe('código do torcedor', () => {
  it('alfabeto sem os símbolos que se confundem, sem repetir', () => {
    expect(ALFABETO).toHaveLength(31);
    expect(new Set(ALFABETO).size).toBe(31);
    for (const c of '01ILO') expect(ALFABETO).not.toContain(c);
    expect(CODIGOS_POSSIVEIS).toBe(31 ** 8);
  });

  it('sorteia 8 símbolos do alfabeto, usando todo o alfabeto', () => {
    let i = 0;
    const codigo = sortearCodigo((n) => i++ % n);
    expect(codigo).toBe('23456789');
    const vistos = new Set<string>();
    for (let k = 0; k < 40; k++) for (const c of sortearCodigo((n) => (i++ * 7) % n)) vistos.add(c);
    expect(vistos.size).toBe(31);
  });

  it('normaliza o que foi digitado: minúscula, espaço e traço', () => {
    expect(normalizarCodigo('abcd-2345')).toBe('ABCD2345');
    expect(normalizarCodigo(' ab cd 23 45 ')).toBe('ABCD2345');
    expect(normalizarCodigo('ABCD234')).toBeNull();
    expect(normalizarCodigo('ABCD23456')).toBeNull();
    expect(normalizarCodigo('ABCD-1O0I')).toBeNull();
    expect(normalizarCodigo(12345678)).toBeNull();
    expect(normalizarCodigo('A'.repeat(41))).toBeNull();
  });

  it('o campo de digitar tira o que não existe e para em 8', () => {
    expect(limparDigitado('ab-cd 1o2345xyz')).toBe('ABCD2345');
    expect(limparDigitado('k7qm')).toBe('K7QM');
  });

  it('mostra em dois blocos', () => {
    expect(formatarCodigo('K7QM4XPA')).toBe('K7QM-4XPA');
    expect(formatarCodigo('K7Q')).toBe('K7Q');
  });

  it('link do QR no hash, e lido de volta', () => {
    const link = linkDoCodigo('https://torcida.kauewalter.com.br/', 'K7QM4XPA');
    expect(link).toBe('https://torcida.kauewalter.com.br/#entrar/K7QM4XPA');
    expect(codigoDoEndereco(new URL(link).hash)).toBe('K7QM4XPA');
    expect(codigoDoEndereco('#entrar/k7qm-4xpa')).toBe('K7QM4XPA');
    expect(codigoDoEndereco('#entrar')).toBeNull();
    expect(codigoDoEndereco('#casa/flamengo')).toBeNull();
    expect(codigoDoEndereco('#entrar/K7QM4XP0')).toBeNull();
  });

  it('impressão digital HMAC-SHA256 em hexadecimal: muda com o código e com o segredo, e não é o SHA-256 puro', async () => {
    const a = await impressaoDoCodigo('K7QM4XPA', 'segredo');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await impressaoDoCodigo('K7QM4XPB', 'segredo')).not.toBe(a);
    expect(await impressaoDoCodigo('K7QM4XPA', 'outro')).not.toBe(a);
    expect(await impressaoDoCodigo('K7QM4XPA', 'segredo')).toBe(a);
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('K7QM4XPA')))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(a).not.toBe(sha);
  });

  it('e-mail técnico no domínio reservado, o mesmo para a mesma conta, reconhecido só no formato exato', async () => {
    const email = await emailTecnicoDe('conta-1', 'segredo');
    expect(email).toMatch(/^t\.[0-9a-f]{32}@torcedor\.invalid$/);
    expect(await emailTecnicoDe('conta-1', 'segredo')).toBe(email);
    expect(await emailTecnicoDe('conta-2', 'segredo')).not.toBe(email);
    expect(ehEmailTecnico(email)).toBe(true);
    expect(ehEmailTecnico('kaue@exemplo.com.br')).toBe(false);
    expect(ehEmailTecnico(`${email}.br`)).toBe(false);
    expect(ehEmailTecnico(null)).toBe(false);
  });

  it('força bruta: com o freio geral no limite o dia todo e 100 códigos ativos, ~1 chance em 300 mil por dia', () => {
    const porDia = (200 * 6 * 24); // 200 erros a cada 10 minutos
    const chance = chanceDeAcertar(porDia, 100);
    expect(chance).toBeLessThan(1 / 250_000);
    expect(chance).toBeGreaterThan(1 / 350_000);
    // Um aparelho sozinho (20 erros por dia) contra 100 códigos: ~1 em 400 milhões.
    expect(chanceDeAcertar(20, 100)).toBeLessThan(1 / 400_000_000);
  });
});
