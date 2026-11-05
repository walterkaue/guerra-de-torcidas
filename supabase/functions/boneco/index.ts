// Boneco montável (docs/jogo.md, seção 14.5): onde fica guardado.
//   { acao: 'meu_boneco' }                  a vestimenta da pessoa, o que ela tem liberado e a próxima peça
//   { acao: 'salvar_boneco', vestimenta }   confere o formato e as peças liberadas, grava e devolve o que gravou
// O caminho está em fluxo.ts. Aqui só a ligação com o Auth (quem é e de que sessão) e o tamanho do pedido.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, ErroHttp, servir, usuario } from '../_shared/comum.ts';
import { ErroBoneco, meuBoneco, salvarBoneco, type Servicos } from './fluxo.ts';

/** Pedido maior que isto nem é lido: a maior vestimenta tem cerca de 230 caracteres. */
const TAMANHO_DO_PEDIDO = 2048;

function servicos(sb: SupabaseClient): Servicos {
  return {
    async rpc(nome, args) {
      const { data, error } = await sb.rpc(nome, args);
      return { data, error };
    },
    sortear: () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000,
  };
}

/**
 * Sessão (aparelho) do passe. A plataforma já conferiu a assinatura (verify_jwt) e o Auth a conta e a sessão
 * (getUser, em `usuario`); o banco confere de novo que a sessão existe antes de gravar.
 */
function sessaoDoPasse(req: Request): string {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const sessao = (JSON.parse(atob(parte)) as { session_id?: unknown }).session_id;
    if (typeof sessao === 'string' && /^[0-9a-f-]{36}$/i.test(sessao)) return sessao;
  } catch {
    // passe sem sessão: cai no erro abaixo
  }
  throw new ErroHttp(401, 'sem_login');
}

async function lerPedido(req: Request): Promise<Record<string, unknown>> {
  const texto = await req.text();
  if (texto.length > TAMANHO_DO_PEDIDO) throw new ErroHttp(413, 'formato');
  try {
    const corpo = JSON.parse(texto);
    return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const sessao = sessaoDoPasse(req);
  const corpo = await lerPedido(req);
  try {
    if (corpo.acao === 'meu_boneco') return await meuBoneco(servicos(sb), uid, sessao);
    if (corpo.acao === 'salvar_boneco') return await salvarBoneco(servicos(sb), uid, sessao, corpo);
  } catch (e) {
    if (e instanceof ErroBoneco) throw new ErroHttp(e.status, e.codigo);
    throw e;
  }
  throw new ErroHttp(400, 'acao_invalida');
});
