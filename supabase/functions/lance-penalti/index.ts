// Um lance dos pênaltis: recebe o gesto de uma cobrança ou a zona de uma defesa, resolve com a semente
// (que só o servidor conhece) e devolve o resultado daquele lance, mais a dica da próxima defesa.
// Os gestos ficam guardados em partidas_segredo; o fechar-partida recalcula a partida a partir deles.
// Corpo: { partidaId: string, lance: { tipo: 'cobranca', gesto: { dir, forca, efeito } } | { tipo: 'defesa', zona } }

import { admin, ErroHttp, lerCorpo, servir, usuario } from '../_shared/comum.ts';
import type { GestoCobranca, Gestos } from '../_shared/jogo/penaltis.ts';
import { jogarLance, LanceForaDeOrdem, type Lance } from '../_shared/jogo/penaltisLance.ts';

const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function lerLance(v: unknown): Lance {
  const l = v as { tipo?: unknown; gesto?: Partial<GestoCobranca>; zona?: unknown } | null;
  if (l?.tipo === 'cobranca') {
    const g = l.gesto;
    if (!g || !numero(g.dir) || !numero(g.forca) || !numero(g.efeito)) throw new ErroHttp(400, 'lance_invalido');
    return { tipo: 'cobranca', gesto: { dir: g.dir, forca: g.forca, efeito: g.efeito } };
  }
  if (l?.tipo === 'defesa' && numero(l.zona)) return { tipo: 'defesa', zona: l.zona };
  throw new ErroHttp(400, 'lance_invalido');
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  if (typeof corpo.partidaId !== 'string') throw new ErroHttp(400, 'sem_partida');
  const lance = lerLance(corpo.lance);

  const { data: partida, error: eP } = await sb
    .from('partidas')
    .select('id, modo, desafio_id, semente, dificuldade, expira_em, fechada_em, minigame')
    .eq('id', corpo.partidaId)
    .eq('torcedor_id', uid)
    .maybeSingle();
  if (eP) throw eP;
  if (!partida || partida.minigame !== 'penaltis') throw new ErroHttp(404, 'partida_nao_encontrada');
  if (partida.fechada_em) throw new ErroHttp(409, 'partida_ja_fechada');
  if (new Date() > new Date(partida.expira_em)) throw new ErroHttp(410, 'partida_expirada');

  const { data: segredo, error: eS } = await sb
    .from('partidas_segredo')
    .select('lance_a_lance, gestos, lances')
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
    jogada = jogarLance(Number(partida.semente), segredo.gestos as Gestos, lance, Number(partida.dificuldade), gravadas);
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
