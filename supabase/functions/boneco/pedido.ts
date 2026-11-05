// Leitura do pedido da função `boneco`, sem Deno nem Supabase, para o teste (supabase/testes/boneco.test.ts).

import { ErroBoneco } from './fluxo.ts';

/** Pedido maior que isto é recusado: a maior vestimenta tem cerca de 230 caracteres. */
export const TAMANHO_DO_PEDIDO = 2048;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sessão (aparelho) do passe, pelo cabeçalho Authorization. A plataforma já conferiu a assinatura (verify_jwt) e o
 * Auth, a conta e a sessão (getUser); o banco confere de novo que a sessão existe antes de ler ou gravar.
 */
export function sessaoDoPasse(autorizacao: string | null): string {
  const token = autorizacao?.replace(/^Bearer\s+/i, '') ?? '';
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const sessao = (JSON.parse(atob(parte)) as { session_id?: unknown }).session_id;
    if (typeof sessao === 'string' && UUID.test(sessao)) return sessao;
  } catch {
    // passe sem sessão legível: cai no erro abaixo
  }
  throw new ErroBoneco(401, 'sem_login');
}

/** Tamanho declarado acima do teto: recusa antes de ler o corpo. */
export function conferirTamanho(contentLength: string | null): void {
  if (contentLength !== null && Number(contentLength) > TAMANHO_DO_PEDIDO) throw new ErroBoneco(413, 'formato');
}

/** O corpo já lido. Acima do teto, 413; JSON inválido ou que não é objeto vira {} (cai em acao_invalida). */
export function lerPedido(texto: string): Record<string, unknown> {
  if (texto.length > TAMANHO_DO_PEDIDO) throw new ErroBoneco(413, 'formato');
  try {
    const corpo = JSON.parse(texto);
    return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
