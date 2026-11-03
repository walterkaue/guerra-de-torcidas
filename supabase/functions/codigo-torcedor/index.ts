// Código do torcedor (docs/jogo.md, seção 14.1): uma carreira em vários aparelhos, sem login e sem dado pessoal.
//   { acao: 'gerar' }                            sorteia o código deste aparelho (vale 10 min, uma vez só)
//   { acao: 'entrar', codigo, captcha, time? }   confere o código digitado em outro aparelho e junta as contas
// O caminho e a ordem estão em fluxo.ts. Aqui só a ligação com o Auth da Supabase e o Turnstile da Cloudflare.
// Nada aqui imprime o corpo do pedido: o código e o passe nunca vão para o log.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, chaveSecreta, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import { entrar, ErroCodigo, gerar, type Servicos } from './fluxo.ts';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function servicos(sb: SupabaseClient): Servicos {
  return {
    // A mesma chave secreta do CAPTCHA do login (Auth → Attack Protection), guardada também nos segredos das funções.
    async captcha(token) {
      const segredo = Deno.env.get('TURNSTILE_SECRET_KEY');
      if (!segredo) return 'sem_chave';
      if (typeof token !== 'string' || !token || token.length > 2048) return false;
      try {
        const r = await fetch(SITEVERIFY, {
          method: 'POST',
          body: new URLSearchParams({ secret: segredo, response: token }),
          signal: AbortSignal.timeout(8000),
        });
        return r.ok && ((await r.json()) as { success?: boolean }).success === true;
      } catch {
        return false;
      }
    },
    async rpc(nome, args) {
      const { data, error } = await sb.rpc(nome, args);
      return { data, error };
    },
    async emailDe(uid) {
      const { data, error } = await sb.auth.admin.getUserById(uid);
      if (error || !data.user) throw new Error('dono do código não encontrado');
      return data.user.email || null;
    },
    async darEmail(uid, email) {
      const { error } = await sb.auth.admin.updateUserById(uid, { email, email_confirm: true });
      if (error) throw new Error(`e-mail técnico recusado: ${error.code ?? error.status}`);
    },
    async passe(email, dono) {
      const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email });
      const token = data?.properties?.hashed_token;
      if (error || !token) throw new Error(`passe não gerado: ${error?.code ?? error?.status ?? 'sem token'}`);
      if (data.user?.id !== dono) throw new Error('passe de outra conta');
      return token;
    },
    sortear,
    segredo: chaveSecreta(),
  };
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  try {
    if (corpo.acao === 'gerar') return await gerar(servicos(sb), uid);
    if (corpo.acao === 'entrar') return await entrar(servicos(sb), uid, corpo);
  } catch (e) {
    if (e instanceof ErroCodigo) throw new ErroHttp(e.status, e.codigo);
    throw e;
  }
  throw new ErroHttp(400, 'acao_invalida');
});
