import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_AGE_CORS, ORIGENS, cabecalhosCors, origemPermitida } from '../../supabase/functions/_shared/cors.ts';

const ler = (caminho: string) => readFileSync(new URL(`../../supabase/functions/${caminho}`, import.meta.url), 'utf8');

describe('CORS das funções', () => {
  it('o navegador guarda o OPTIONS por 2 h (não repete a cada lance)', () => {
    expect(MAX_AGE_CORS).toBe(7200);
    expect(cabecalhosCors('https://torcida.kauewalter.com.br')['Access-Control-Max-Age']).toBe('7200');
  });

  it('só devolve as nossas origens', () => {
    expect(origemPermitida('http://localhost:5173')).toBe('http://localhost:5173');
    expect(origemPermitida('https://site-qualquer.com')).toBe(ORIGENS[0]);
    expect(origemPermitida(null)).toBe(ORIGENS[0]);
    expect(cabecalhosCors('https://site-qualquer.com')['Access-Control-Allow-Origin']).toBe(ORIGENS[0]);
  });

  it('as funções com JSON (servir) e o funil usam os cabeçalhos com Max-Age', () => {
    expect(ler('_shared/comum.ts')).toContain('cabecalhosCors(');
    const funil = ler('funil/index.ts');
    expect(funil).toContain("'Access-Control-Max-Age': String(MAX_AGE_CORS)");
    expect(funil).not.toContain("const ORIGENS");
  });
});
