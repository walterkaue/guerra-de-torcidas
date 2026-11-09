// Funil do X1 e onde a pessoa desiste (docs/jogos/contas.md, "Contagem de uso"). Recebe do celular, em segundo
// plano, um lote de eventos da lista fechada (src/jogo/funil.ts). Sem verify_jwt: o sendBeacon não manda cabeçalho,
// então o corpo vem como text/plain, com o token da sessão dentro (quando há sessão).
// Responde sempre 204, sem dizer o que contou. Nada aqui imprime o corpo nem o IP: o código do X1 nunca vai ao log.

import { admin, chaveSecreta } from '../_shared/comum.ts';
import { MAX_BYTES, processar, type Servicos } from './fluxo.ts';

const ORIGENS = ['https://torcida.kauewalter.com.br', 'http://localhost:5173', 'http://127.0.0.1:5173'];

function vazio(req: Request): Response {
  const origem = req.headers.get('Origin') ?? '';
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0], Vary: 'Origin' },
  });
}

/** Lê o corpo até MAX_BYTES (com ou sem Content-Length); maior que isso, null sem ler o resto. */
async function lerCorpo(req: Request): Promise<string | null> {
  if (Number(req.headers.get('Content-Length') ?? 0) > MAX_BYTES || !req.body) return null;
  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await leitor.cancel();
      return null;
    }
    partes.push(value);
  }
  const tudo = new Uint8Array(total);
  let i = 0;
  for (const p of partes) tudo.set(p, (i += p.length) - p.length);
  return new TextDecoder().decode(tudo);
}

/**
 * IP do aparelho, só para a impressão do limite. Primeiro os cabeçalhos que a borda escreve por cima (o do
 * x-forwarded-for o próprio cliente pode mandar); sem eles, o primeiro do x-forwarded-for.
 */
function ipDo(req: Request): string | null {
  const h = req.headers;
  return h.get('cf-connecting-ip')?.trim() || h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',')[0].trim() || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return vazio(req);
  try {
    const texto = await lerCorpo(req);
    if (texto === null) return vazio(req);
    const sb = admin();
    const s: Servicos = {
      async sessaoDoToken(token) {
        const { data, error } = await sb.auth.getClaims(token);
        const c = data?.claims as { role?: string; session_id?: string } | undefined;
        return !error && c?.role === 'authenticated' && typeof c.session_id === 'string' ? c.session_id : null;
      },
      async registrar(chave, eventos, semSessao) {
        const { data, error } = await sb.rpc('funil_registrar', { p_chave: chave, p_eventos: eventos, p_sem_sessao: semSessao });
        if (error) throw new Error(`funil_registrar: ${error.code ?? 'erro'}`);
        return Number(data ?? 0);
      },
      segredo: chaveSecreta(),
    };
    await processar(s, texto, ipDo(req));
  } catch (e) {
    console.error(e instanceof Error ? e.message : 'erro');
  }
  return vazio(req);
});
