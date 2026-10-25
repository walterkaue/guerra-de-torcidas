// Porta das funções chamadas só por cron (sem usuário): exige uma secret key do projeto no header
// `apikey` ou em `Authorization: Bearer`. A Supabase injeta as secret keys em SUPABASE_SECRET_KEYS
// como um JSON { nome: chave }. Sem a variável, ninguém entra (falha fechada).

async function resumo(texto: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

/** Compara pelo hash, em tempo constante, para não vazar a chave pelo tempo de resposta. */
async function iguais(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([resumo(a), resumo(b)]);
  let dif = 0;
  for (let i = 0; i < ha.length; i++) dif |= ha[i] ^ hb[i];
  return dif === 0;
}

export async function temSegredo(req: Request): Promise<boolean> {
  const bruto = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!bruto) return false;
  let chaves: string[];
  try {
    chaves = Object.values(JSON.parse(bruto) as Record<string, string>).filter((c) => typeof c === 'string' && c);
  } catch {
    return false;
  }
  const recebidas = [
    req.headers.get('apikey') ?? '',
    req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '',
  ].filter(Boolean);
  for (const r of recebidas) for (const c of chaves) if (await iguais(r, c)) return true;
  return false;
}

export function negado(): Response {
  return new Response(JSON.stringify({ erro: 'sem_permissao' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
