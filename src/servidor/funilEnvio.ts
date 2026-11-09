// Envio do funil (src/servidor/funil.ts): fora do JS inicial, baixado no 1º evento por import(). Manda sem esperar
// resposta, em text/plain (sem preflight de CORS), com o token da sessão no corpo, porque o sendBeacon não manda
// cabeçalho. Sem sessão vai sem token: a função conta igual, com o limite por minuto pelo IP.

import type { EventoFunil } from '../jogo/funil';

const BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function token(): string | undefined {
  try {
    // Onde o supabase-js guarda a sessão (sb-<ref>-auth-token): lido sem baixar o supabase-js.
    const ref = new URL(BASE as string).hostname.split('.')[0];
    return JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) ?? '{}').access_token;
  } catch {
    return undefined;
  }
}

/** Manda os eventos em lotes de 20. `saindo`: a página está indo embora, vai por sendBeacon. */
export function mandar(eventos: EventoFunil[], saindo?: boolean): void {
  if (!BASE) return;
  const url = `${BASE}/functions/v1/funil`;
  for (let i = 0; i < eventos.length; i += 20) {
    const body = JSON.stringify({ t: token(), e: eventos.slice(i, i + 20) });
    try {
      if (!(saindo && navigator.sendBeacon(url, body)))
        fetch(url, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => undefined);
    } catch {
      // Sem beacon nem fetch: o evento se perde (nada fica guardado no aparelho).
    }
  }
}
