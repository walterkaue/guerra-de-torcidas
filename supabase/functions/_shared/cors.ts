// CORS das funções do servidor. Sem import de Deno nem de npm: o teste (src/servidor/cors.test.ts) lê direto daqui.

export const ORIGENS = ['https://torcida.kauewalter.com.br', 'http://localhost:5173', 'http://127.0.0.1:5173'];

/**
 * Por quanto tempo o navegador guarda a resposta do OPTIONS (s). Sem isso, cada lance dos pênaltis vinha com um
 * OPTIONS antes do POST (uma ida e volta a mais). 7200 é o teto do Chrome; o Firefox aceita até 86400.
 */
export const MAX_AGE_CORS = 7200;

/** A origem que volta no Access-Control-Allow-Origin: a do pedido, se for uma das nossas; senão, a do site. */
export function origemPermitida(origem: string | null): string {
  return origem && ORIGENS.includes(origem) ? origem : ORIGENS[0];
}

/** Cabeçalhos de CORS das funções com JSON (as que passam por `servir`, em comum.ts). */
export function cabecalhosCors(origem: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origemPermitida(origem),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': String(MAX_AGE_CORS),
    Vary: 'Origin',
  };
}
