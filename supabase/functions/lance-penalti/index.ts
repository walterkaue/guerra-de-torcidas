// Um lance dos pênaltis: recebe o gesto de uma cobrança ou a zona de uma defesa, resolve com a semente
// do lance (que só o servidor conhece) e devolve o resultado daquele lance, mais a dica da próxima defesa.
// Os gestos ficam guardados em partidas_segredo; o fechar-partida recalcula a partida a partir deles.
// Corpo: { partidaId: string, lance: { tipo: 'cobranca', gesto: { dir, forca, efeito } } | { tipo: 'defesa', zona } }

import { admin, ErroHttp, lerCorpo, servir, usuario } from '../_shared/comum.ts';
import { lerSementes, type GestoCobranca, type Gestos } from '../_shared/jogo/penaltis.ts';
import { jogarLance, LanceForaDeOrdem, LanceInvalido, lerLance, type Lance } from '../_shared/jogo/penaltisLance.ts';
import { tabelaPenaltisDaPartida } from '../_shared/jogo/regraLances.ts';

/** Só o tipo e o gesto (ou a zona) do corpo: o resto é ignorado (penaltisLance.ts). */
function lanceDoCorpo(v: unknown): Lance {
  try {
    return lerLance(v);
  } catch (e) {
    if (e instanceof LanceInvalido) throw new ErroHttp(400, 'lance_invalido');
    throw e;
  }
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  if (typeof corpo.partidaId !== 'string') throw new ErroHttp(400, 'sem_partida');
  const lance = lanceDoCorpo(corpo.lance);

  const { data: partida, error: eP } = await sb
    .from('partidas')
    .select('id, modo, desafio_id, semente, dificuldade, criada_em, expira_em, fechada_em, minigame')
    .eq('id', corpo.partidaId)
    .eq('torcedor_id', uid)
    .maybeSingle();
  if (eP) throw eP;
  if (!partida || partida.minigame !== 'penaltis') throw new ErroHttp(404, 'partida_nao_encontrada');
  if (partida.fechada_em) throw new ErroHttp(409, 'partida_ja_fechada');
  if (new Date() > new Date(partida.expira_em)) throw new ErroHttp(410, 'partida_expirada');

  const { data: segredo, error: eS } = await sb
    .from('partidas_segredo')
    .select('lance_a_lance, gestos, lances, sementes')
    .eq('partida_id', partida.id)
    .single();
  if (eS) throw eS;
  if (!segredo.lance_a_lance) throw new ErroHttp(409, 'partida_sem_lance_a_lance');

  let gravadas: GestoCobranca[] | undefined;
  if (partida.modo === 'desafio' && partida.desafio_id) {
    const { data, error } = await sb.from('desafios').select('cobrancas').eq('id', partida.desafio_id).single();
    if (error) throw error;
    gravadas = data.cobrancas as GestoCobranca[];
  }

  let jogada;
  try {
    // Sem sementes por lance é partida criada antes de 03/11/2026: segue com a semente única da partida.
    const sementes = lerSementes(segredo.sementes, Number(partida.semente));
    // A regra sai da hora em que a partida foi criada: a tabela de pontos (Lances unificados, seção 14.7) e o goleiro
    // (motor 2, goleiro com alcance, desde 23/11/2026). As cavadinhas anteriores saem dos gestos guardados no segredo.
    jogada = jogarLance(sementes, segredo.gestos as Gestos, lance, Number(partida.dificuldade), gravadas, tabelaPenaltisDaPartida(partida.criada_em));
  } catch (e) {
    if (e instanceof LanceForaDeOrdem) throw new ErroHttp(409, 'lance_fora_de_ordem');
    throw e;
  }

  // Trava: só grava se ninguém gravou este lance antes (duas abas, toque duplo, reenvio).
  const { data: gravou, error: eG } = await sb
    .from('partidas_segredo')
    .update({ gestos: jogada.gestos, lances: segredo.lances + 1 })
    .eq('partida_id', partida.id)
    .eq('lances', segredo.lances)
    .select('partida_id');
  if (eG) throw eG;
  if (!gravou?.length) throw new ErroHttp(409, 'lance_fora_de_ordem');

  return { cobranca: jogada.cobranca ?? null, defesa: jogada.defesa ?? null, proximo: jogada.proximo };
});
