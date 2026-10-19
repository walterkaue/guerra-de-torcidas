// Painel do administrador: confirma, corrige ou anula o placar de um jogo e distribui os pontos
// do Crava a Rodada da rodada inteira (o teto de 300 depende da ordem de confirmação).
// Os pontos são calculados pelo mesmo módulo puro do celular (crava.ts) e gravados como diferença
// do que cada pessoa já recebeu: confirmar de novo não duplica, corrigir grava só o ajuste.
// Corpo: { jogoId: string, acao: 'confirmar' | 'anular', golsMandante?: number, golsVisitante?: number }

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, ErroHttp, lerCorpo, servir, usuario } from '../_shared/comum.ts';
import { alvosDaRodada, semanaDosPontos, type JogoDaRodada, type PalpiteDeAlguem } from '../_shared/jogo/crava.ts';

const gols = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 30 ? (v as number) : null);
const PAGINA = 1000;

/** Lê tudo, de mil em mil (o limite de linhas por resposta do Supabase). */
async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw error;
    linhas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return linhas;
  }
}

async function distribuir(sb: SupabaseClient, rodada: number): Promise<number> {
  const { data: jogos, error: eJ } = await sb
    .from('jogos')
    .select('id, inicio, confirmado_em, gols_mandante, gols_visitante, anulado')
    .eq('rodada', rodada);
  if (eJ) throw eJ;
  const ids = (jogos ?? []).map((j) => j.id);
  if (!ids.length) return 0;

  const palpites = await todas<{ torcedor_id: string; jogo_id: string; gols_mandante: number; gols_visitante: number }>(
    (de, ate) =>
      sb
        .from('palpites')
        .select('torcedor_id, jogo_id, gols_mandante, gols_visitante')
        .in('jogo_id', ids)
        .order('torcedor_id')
        .order('jogo_id')
        .range(de, ate),
  );
  const certezas = await todas<{ torcedor_id: string; jogo_id: string }>((de, ate) =>
    sb.from('certezas').select('torcedor_id, jogo_id').eq('rodada', rodada).order('torcedor_id').range(de, ate),
  );

  const daRodada: JogoDaRodada[] = (jogos ?? []).map((j) => ({
    id: j.id,
    confirmadoEm: j.confirmado_em,
    placar: j.gols_mandante === null ? null : { m: j.gols_mandante, v: j.gols_visitante },
    anulado: j.anulado,
  }));
  const deAlguem: PalpiteDeAlguem[] = palpites.map((p) => ({
    torcedorId: p.torcedor_id,
    jogoId: p.jogo_id,
    placar: { m: p.gols_mandante, v: p.gols_visitante },
  }));
  const agora = new Date();
  const inicio = new Map((jogos ?? []).map((j) => [j.id, new Date(j.inicio)]));
  const alvos = alvosDaRodada(daRodada, deAlguem, new Map(certezas.map((c) => [c.torcedor_id, c.jogo_id]))).map((a) => ({
    ...a,
    semana: semanaDosPontos(inicio.get(a.jogoId)!, agora),
  }));

  const { data, error } = await sb.rpc('aplicar_pontos_crava', { p_rodada: rodada, p_alvos: alvos });
  if (error) throw error;
  return data as number;
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const { data: adm, error: eA } = await sb.from('administradores').select('usuario_id').eq('usuario_id', uid).maybeSingle();
  if (eA) throw eA;
  if (!adm) throw new ErroHttp(403, 'nao_admin');

  const corpo = await lerCorpo(req);
  if (typeof corpo.jogoId !== 'string') throw new ErroHttp(400, 'sem_jogo');
  const { data: jogo, error: eJ } = await sb
    .from('jogos')
    .select('id, rodada, inicio, confirmado_em')
    .eq('id', corpo.jogoId)
    .maybeSingle();
  if (eJ) throw eJ;
  if (!jogo) throw new ErroHttp(404, 'jogo_nao_encontrado');

  const agora = new Date().toISOString();
  let mudanca: Record<string, unknown>;
  if (corpo.acao === 'anular') {
    mudanca = { anulado: true, atualizado_em: agora };
  } else if (corpo.acao === 'confirmar') {
    const m = gols(corpo.golsMandante);
    const v = gols(corpo.golsVisitante);
    if (m === null || v === null) throw new ErroHttp(400, 'placar_invalido');
    if (Date.parse(jogo.inicio) > Date.now()) throw new ErroHttp(409, 'jogo_nao_comecou');
    mudanca = {
      gols_mandante: m,
      gols_visitante: v,
      anulado: false,
      // A primeira confirmação fica: é ela que decide a ordem do teto da rodada.
      confirmado_em: jogo.confirmado_em ?? agora,
      corrigido_em: jogo.confirmado_em ? agora : null,
      atualizado_em: agora,
    };
  } else {
    throw new ErroHttp(400, 'acao_invalida');
  }

  const { error: eU } = await sb.from('jogos').update(mudanca).eq('id', jogo.id);
  if (eU) throw eU;
  const gravados = await distribuir(sb, jogo.rodada);
  return { ok: true, gravados };
});
