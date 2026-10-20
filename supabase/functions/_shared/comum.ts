// Utilidades das funções do servidor: CORS, respostas, cliente com a secret key e usuário da sessão.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ORIGENS = ['https://torcida.kauewalter.com.br', 'http://localhost:5173', 'http://127.0.0.1:5173'];

export class ErroHttp extends Error {
  constructor(
    public status: number,
    public codigo: string,
  ) {
    super(codigo);
  }
}

function cors(req: Request): Record<string, string> {
  const origem = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Envolve o handler com CORS e tratamento de erro (sem vazar detalhes internos). */
export function servir(handler: (req: Request) => Promise<unknown>): void {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
    if (req.method !== 'POST') return json(req, 405, { erro: 'metodo' });
    try {
      return json(req, 200, await handler(req));
    } catch (e) {
      if (e instanceof ErroHttp) return json(req, e.status, { erro: e.codigo });
      console.error(e);
      return json(req, 500, { erro: 'interno' });
    }
  });
}

/**
 * Cliente com a secret key (ignora RLS). A Supabase injeta SUPABASE_SECRET_KEYS nas funções
 * como um JSON { nome: chave }; usamos a "default". As chaves antigas (service_role) não são usadas.
 */
export function admin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const bruto = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!url || !bruto) throw new Error('Faltam SUPABASE_URL ou SUPABASE_SECRET_KEYS no ambiente da função.');
  const chaves = JSON.parse(bruto) as Record<string, string>;
  const chave = chaves.default ?? Object.values(chaves)[0];
  if (!chave) throw new Error('SUPABASE_SECRET_KEYS sem nenhuma chave.');
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Id do usuário da sessão (login anônimo conta). A plataforma já validou o JWT antes
 * (verify_jwt ligado); aqui confirmamos com o Auth e pegamos o id.
 */
export async function usuario(req: Request, sb: SupabaseClient): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ErroHttp(401, 'sem_login');
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new ErroHttp(401, 'sem_login');
  return data.user.id;
}

export async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  try {
    const corpo = await req.json();
    return corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function configDeteccao(sb: SupabaseClient): Promise<Record<string, number>> {
  const { data, error } = await sb.from('config_deteccao').select('chave, valor');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((l) => [l.chave, Number(l.valor)]));
}

/** Inteiro sem viés em [0, n). */
export function sortear(n: number): number {
  const limite = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limite);
  return buf[0] % n;
}

/** Posição da pessoa naquele minigame e recorde pessoal, para a tela de resultado (seção 5 do jogo.md). */
export interface Desempenho {
  /** Nula quando a partida não entra (sob suspeita). */
  posicao: number | null;
  total: number;
  recorde: number | null;
  novoRecorde: boolean;
}

/**
 * Lê `desempenho_partida` ou `desempenho_dia`. A partida já está gravada quando isto roda, então uma
 * falha aqui só tira o bloco de posição da tela (não derruba o fechamento).
 */
export async function lerDesempenho(
  sb: SupabaseClient,
  funcao: 'desempenho_partida' | 'desempenho_dia',
  args: Record<string, unknown>,
): Promise<Desempenho | null> {
  const { data, error } = await sb.rpc(funcao, args);
  if (error) {
    console.error(error);
    return null;
  }
  const l = ((data ?? []) as { posicao: number | null; total: number; recorde: number | null; novo_recorde: boolean }[])[0];
  return l ? { posicao: l.posicao, total: l.total, recorde: l.recorde, novoRecorde: !!l.novo_recorde } : null;
}
