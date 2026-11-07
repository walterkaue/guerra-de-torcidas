// Boneco montável (docs/jogo.md, seção 14.5): onde fica guardado.
//   { acao: 'meu_boneco' }                  a vestimenta da pessoa, o que ela tem liberado e a próxima peça
//   { acao: 'salvar_boneco', vestimenta }   confere o formato e as peças liberadas, grava e devolve o que gravou
//   { acao: 'em_campo', ligado }            o interruptor "Meu boneco em campo" (vale para o X1 também)
// O caminho está em fluxo.ts e a leitura do pedido em pedido.ts. Aqui só a ligação com o Auth e o banco.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, ErroHttp, servir, usuario } from '../_shared/comum.ts';
import { ErroBoneco, ligarEmCampo, meuBoneco, salvarBoneco, type Servicos } from './fluxo.ts';
import { conferirTamanho, lerPedido, sessaoDoPasse } from './pedido.ts';

function servicos(sb: SupabaseClient): Servicos {
  return {
    async rpc(nome, args) {
      const { data, error } = await sb.rpc(nome, args);
      return { data, error };
    },
    sortear: () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000,
  };
}

servir(async (req) => {
  try {
    conferirTamanho(req.headers.get('Content-Length'));
    const sb = admin();
    const uid = await usuario(req, sb);
    const sessao = sessaoDoPasse(req.headers.get('Authorization'));
    const corpo = lerPedido(await req.text());
    if (corpo.acao === 'meu_boneco') return await meuBoneco(servicos(sb), uid, sessao);
    if (corpo.acao === 'salvar_boneco') return await salvarBoneco(servicos(sb), uid, sessao, corpo);
    if (corpo.acao === 'em_campo') return await ligarEmCampo(servicos(sb), uid, sessao, corpo);
  } catch (e) {
    if (e instanceof ErroBoneco) throw new ErroHttp(e.status, e.codigo);
    throw e;
  }
  throw new ErroHttp(400, 'acao_invalida');
});
