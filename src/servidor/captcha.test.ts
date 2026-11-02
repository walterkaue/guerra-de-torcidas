import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { captchaLigado, opcoesComCaptcha, tokenCaptcha } from './captcha';

describe('CAPTCHA no login', () => {
  it('desligado com a chave do site vazia', async () => {
    expect(captchaLigado('')).toBe(false);
    expect(captchaLigado('0x4AAAAAAAexemplo')).toBe(true);
    // Nos testes a chave não existe: nada de script nem token.
    expect(await tokenCaptcha()).toBeUndefined();
  });

  it('só manda o token quando existe', () => {
    expect(opcoesComCaptcha(undefined)).toEqual({});
    expect(opcoesComCaptcha('tok')).toEqual({ captchaToken: 'tok' });
  });

  it('nenhuma chave secreta da Cloudflare nos arquivos de ambiente versionados', () => {
    for (const arq of ['.env.production', '.env.development', '.env.example']) {
      let texto = '';
      try {
        texto = readFileSync(new URL(`../../${arq}`, import.meta.url), 'utf8');
      } catch {
        continue;
      }
      // Chave secreta do Turnstile: 0x4AAAA... com "secret" no nome da variável.
      expect(texto).not.toMatch(/TURNSTILE_SECRET|SECRET_KEY\s*=\s*\S/i);
    }
  });
});
