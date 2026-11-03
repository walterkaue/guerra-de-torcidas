// Lances do Jogo valendo (docs/jogo.md, seção 7.3), lance a lance como os pênaltis (seção 6, "Anti-trapaça"):
// as sementes nunca saem daqui. Duas ações:
//   { acao: 'nova', lances: [id, id, id] }        começa a partida (até 6 por dia, contadas aqui)
//   { acao: 'lance', partidaId, i, gesto }         resolve o lance i; no 3º, fecha e grava a partida
// A cena vem do catálogo do servidor (_shared/dados/lances.ts), pelo id: o celular nunca manda a cena.
// Uma semente por lance (lancesPartida.ts): achar a de um lance já jogado não adianta para o próximo.
// O treino não passa por aqui.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, configDeteccao, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import { LANCES } from '../_shared/dados/lances.ts';
import { LANCES_POR_PARTIDA, type Lance } from '../_shared/jogo/lances.ts';
import {
  DETECCAO_LANCES_PADRAO,
  fecharPartidaLances,
  goleiroParaOCelular,
  jogarLanceDoJogo,
  LANCES_PARTIDAS_POR_DIA,
  LanceForaDeOrdem,
  motivoSuspeitaLances,
  type DesempenhoLances,
  type FechamentoLances,
  type GestosLances,
  type MedalhaNova,
  type RespostaLanceDoJogo,
  type RespostaNovaLances,
  type ResultadoPartidaLancesServidor,
} from '../_shared/jogo/lancesPartida.ts';
import type { GestoCobranca } from '../_shared/jogo/penaltis.ts';
import { periodoDaPartida } from '../_shared/tempo.ts';

const PORTE: Record<string, number> = { bronze: 1, prata: 2, ouro: 3 };
const POR_ID = new Map(LANCES.map((l) => [l.id, l]));
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function cenasDosIds(ids: unknown): Lance[] {
  if (!Array.isArray(ids) || ids.length !== LANCES_POR_PARTIDA) throw new ErroHttp(400, 'lances_invalidos');
  return ids.map((id) => {
    const l = typeof id === 'string' ? POR_ID.get(id) : undefined;
    if (!l) throw new ErroHttp(400, 'lances_invalidos');
    return l;
  });
}

async function lancesHoje(sb: SupabaseClient, uid: string): Promise<{ feitas: number; limite: number; melhor: number | null }> {
  const { data, error } = await sb.rpc('lances_hoje', { p_torcedor: uid });
  if (error) throw error;
  const l = (data as { feitas: number; limite: number; melhor: number | null }[] | null)?.[0];
  return { feitas: l?.feitas ?? 0, limite: l?.limite ?? LANCES_PARTIDAS_POR_DIA, melhor: l?.melhor ?? null };
}

async function nova(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>): Promise<RespostaNovaLances> {
  const cenas = cenasDosIds(corpo.lances);

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('id').eq('id', uid).maybeSingle();
  if (eT) throw eT;
  if (!torcedor) throw new ErroHttp(409, 'sem_time');

  const cfg = await configDeteccao(sb);
  const sementes = cenas.map(() => sortear(0x1_0000_0000));
  const expiraEm = new Date(Date.now() + (cfg.minutos_validade_semente ?? 15) * 60_000);
  const segredo: GestosLances = { lances: cenas.map((c) => c.id), sementes, cobrancas: [] };

  // Limite do dia (contado ao começar: abandonar uma partida ruim gasta a vaga), limite por minuto e as duas
  // linhas da partida numa transação só, com trava por torcedor.
  const { data, error } = await sb.rpc('lances_comecar', {
    p_torcedor: uid,
    p_semente: sementes[0],
    p_expira_em: expiraEm.toISOString(),
    p_segredo: segredo,
  });
  if (error) {
    if (error.message?.includes('limite_do_dia')) throw new ErroHttp(429, 'limite_do_dia');
    if (error.message?.includes('muitas_partidas')) throw new ErroHttp(429, 'muitas_partidas');
    throw error;
  }
  const comecou = (data as { partida_id: string; feitas: number; limite: number }[] | null)?.[0];
  if (!comecou) throw new Error('lances_comecar sem resposta');

  return {
    partidaId: comecou.partida_id,
    expiraEm: expiraEm.toISOString(),
    goleiroX: goleiroParaOCelular(sementes[0], 0, cenas[0]),
    restantesHoje: Math.max(0, comecou.limite - comecou.feitas),
  };
}

function lerGesto(v: unknown): GestoCobranca {
  const g = v as Partial<GestoCobranca> | null;
  if (!g || !numero(g.dir) || !numero(g.forca) || !numero(g.efeito)) throw new ErroHttp(400, 'lance_invalido');
  return { dir: g.dir, forca: g.forca, efeito: g.efeito };
}

async function medalhas(sb: SupabaseClient, uid: string, ids: string[]): Promise<Map<string, string | null>> {
  const { data, error } = await sb.rpc('medalhas_de', { p_torcedor: uid });
  if (error) throw error;
  const m = new Map<string, string | null>();
  for (const l of (data ?? []) as { lance_id: string; medalha: string | null }[]) if (ids.includes(l.lance_id)) m.set(l.lance_id, l.medalha);
  return m;
}

interface PartidaLida {
  id: string;
  criada_em: string;
  expira_em: string;
  fechada_em: string | null;
  minigame: string;
  resultado: ResultadoPartidaLancesServidor | null;
  semana: string | null;
  conta_no_teto: boolean;
  sob_suspeita: boolean;
  time_id: string | null;
}

async function lance(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>): Promise<RespostaLanceDoJogo> {
  if (typeof corpo.partidaId !== 'string') throw new ErroHttp(400, 'sem_partida');
  const i = corpo.i;
  if (typeof i !== 'number' || !Number.isInteger(i)) throw new ErroHttp(400, 'lance_invalido');
  const gestoBruto = lerGesto(corpo.gesto);

  const { data, error: eP } = await sb
    .from('partidas')
    .select('id, criada_em, expira_em, fechada_em, minigame, resultado, semana, conta_no_teto, sob_suspeita, time_id')
    .eq('id', corpo.partidaId)
    .eq('torcedor_id', uid)
    .maybeSingle();
  if (eP) throw eP;
  const partida = data as PartidaLida | null;
  if (!partida || partida.minigame !== 'lances') throw new ErroHttp(404, 'partida_nao_encontrada');

  // Reenvio do 3º lance depois que a partida já fechou (a resposta se perdeu): devolve o que foi gravado.
  if (partida.fechada_em) {
    if (i !== LANCES_POR_PARTIDA - 1 || !partida.resultado?.lances) throw new ErroHttp(409, 'partida_ja_fechada');
    const fim = await jaGravado(sb, uid, partida);
    return { lance: fim.resultado.lances[i], goleiroProximo: null, fim };
  }
  if (new Date() > new Date(partida.expira_em)) throw new ErroHttp(410, 'partida_expirada');

  const { data: segredo, error: eS } = await sb
    .from('partidas_segredo')
    .select('gestos, lances')
    .eq('partida_id', partida.id)
    .single();
  if (eS) throw eS;
  const guardados = segredo.gestos as GestosLances;
  const cenas = cenasDosIds(guardados.lances);

  // O 3º lance já está guardado, mas o fechamento falhou (queda no meio): o reenvio só fecha, com o gesto
  // guardado (o novo é ignorado).
  if (guardados.cobrancas?.length === LANCES_POR_PARTIDA && i === LANCES_POR_PARTIDA - 1) {
    const fim = await fechar(sb, uid, partida, cenas, guardados);
    return { lance: fim.resultado.lances[i], goleiroProximo: null, fim };
  }

  let jogada;
  try {
    jogada = jogarLanceDoJogo(cenas, { lances: guardados.lances, sementes: guardados.sementes ?? [], cobrancas: guardados.cobrancas ?? [] }, i, gestoBruto);
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

  const fim = jogada.gestos.cobrancas.length === LANCES_POR_PARTIDA
    ? await fechar(sb, uid, partida, cenas, jogada.gestos)
    : null;
  return { lance: jogada.lance, goleiroProximo: jogada.goleiroProximo, fim };
}

async function posicaoDoTime(sb: SupabaseClient, semana: string, time: string) {
  const { data } = await sb
    .from('ranking_semana')
    .select('posicao_campeao, posicao_soma, media30, soma')
    .eq('semana', semana)
    .eq('time_id', time)
    .maybeSingle();
  return data;
}

async function lerDesempenhoLances(sb: SupabaseClient, partidaId: string): Promise<DesempenhoLances | null> {
  const { data, error } = await sb.rpc('desempenho_partida', { p_partida: partidaId });
  if (error) {
    console.error(error);
    return null;
  }
  return ((data ?? []) as DesempenhoLances[])[0] ?? null;
}

async function fechar(
  sb: SupabaseClient,
  uid: string,
  partida: { id: string; criada_em: string },
  cenas: Lance[],
  gestos: GestosLances,
): Promise<FechamentoLances> {
  const { data: torcedor, error: eT } = await sb.from('torcedores').select('time_id').eq('id', uid).single();
  if (eT) throw eT;

  // Vale o que está guardado no servidor, recalculado do zero.
  let resultado: ResultadoPartidaLancesServidor;
  try {
    resultado = fecharPartidaLances(gestos.sementes ?? [], cenas, gestos.cobrancas);
  } catch (e) {
    if (e instanceof LanceForaDeOrdem) throw new ErroHttp(409, 'lance_fora_de_ordem');
    throw e;
  }
  const agora = new Date();
  const { dia, semana } = periodoDaPartida(new Date(partida.criada_em), agora);
  const rankingAntes = await posicaoDoTime(sb, semana, torcedor.time_id);

  // Detecção: tentativas valendo do torcedor, com esta partida na frente (seção 7.3, "Anti-trapaça").
  const cfg = await configDeteccao(sb);
  const { data: recentes, error: eR } = await sb
    .from('partidas')
    .select('resultado')
    .eq('torcedor_id', uid)
    .eq('minigame', 'lances')
    .not('fechada_em', 'is', null)
    .order('fechada_em', { ascending: false })
    .limit(60);
  if (eR) throw eR;
  const motivo = motivoSuspeitaLances(
    [resultado, ...(recentes ?? []).map((r) => r.resultado as ResultadoPartidaLancesServidor)],
    {
      janelaGesto: cfg.lances_janela_gesto ?? DETECCAO_LANCES_PADRAO.janelaGesto,
      espalhamentoMax: cfg.lances_espalhamento_max ?? DETECCAO_LANCES_PADRAO.espalhamentoMax,
      janelaGols: cfg.lances_janela_gols ?? DETECCAO_LANCES_PADRAO.janelaGols,
      minGols: cfg.lances_min_gols ?? DETECCAO_LANCES_PADRAO.minGols,
    },
  );

  const ids = [...new Set(gestos.lances)];
  const antes = await medalhas(sb, uid, ids);

  // Grava, refaz o teto (a melhor dos Lances no dia) e anota o ranking numa transação só. O gatilho
  // lances_gols anota os gols das medalhas na mesma transação. Nenhuma linha = alguém fechou antes.
  // As sementes ficam só em partidas_segredo: partidas.gestos o celular lê.
  const { data: fechamento, error: eF } = await sb.rpc('fechar_partida', {
    p_partida: partida.id,
    p_torcedor: uid,
    p_time: torcedor.time_id,
    p_gestos: { lances: gestos.lances, cobrancas: gestos.cobrancas },
    p_resultado: resultado,
    p_pontos: resultado.pontos,
    p_dia: dia,
    p_semana: semana,
    p_fechada_em: agora.toISOString(),
    p_motivo_suspeita: motivo,
    p_desafio: null,
    p_codigos: [],
  });
  if (eF) throw eF;
  const estado = (fechamento as { teto: boolean; suspeita: boolean }[] | null)?.[0];
  if (!estado) throw new ErroHttp(409, 'partida_ja_fechada');

  // Daqui para baixo a partida já está gravada: leitura que falhar só tira o bloco da tela.
  const confirmadaEm = new Date().toISOString();
  const rankingDepois = await posicaoDoTime(sb, semana, torcedor.time_id);
  const desempenho = await lerDesempenhoLances(sb, partida.id);

  let novas: MedalhaNova[] = [];
  let hoje = { feitas: 0, limite: LANCES_PARTIDAS_POR_DIA, melhor: null as number | null };
  try {
    const depois = await medalhas(sb, uid, ids);
    novas = ids.flatMap((id) => {
      const m = depois.get(id);
      return m && PORTE[m] > (PORTE[antes.get(id) ?? ''] ?? 0) ? [{ lanceId: id, medalha: m as MedalhaNova['medalha'] }] : [];
    });
    hoje = await lancesHoje(sb, uid);
  } catch (e) {
    console.error(e);
  }

  return {
    resultado,
    semana,
    contaNoRanking: estado.teto && !estado.suspeita,
    sobSuspeita: estado.suspeita,
    melhorDoDia: hoje.melhor,
    ranking: { antes: rankingAntes, depois: rankingDepois },
    confirmadaEm,
    desempenho,
    medalhas: novas,
    restantesHoje: Math.max(0, hoje.limite - hoje.feitas),
  };
}

/** O fechamento de uma partida que já estava gravada (reenvio): sem ranking de antes nem medalhas novas. */
async function jaGravado(sb: SupabaseClient, uid: string, partida: PartidaLida): Promise<FechamentoLances> {
  const semana = partida.semana ?? '';
  const ranking = partida.time_id && semana ? await posicaoDoTime(sb, semana, partida.time_id) : null;
  let hoje = { feitas: 0, limite: LANCES_PARTIDAS_POR_DIA, melhor: null as number | null };
  try {
    hoje = await lancesHoje(sb, uid);
  } catch (e) {
    console.error(e);
  }
  return {
    resultado: partida.resultado as ResultadoPartidaLancesServidor,
    semana,
    contaNoRanking: partida.conta_no_teto && !partida.sob_suspeita,
    sobSuspeita: partida.sob_suspeita,
    melhorDoDia: hoje.melhor,
    ranking: { antes: ranking, depois: ranking },
    confirmadaEm: new Date().toISOString(),
    desempenho: await lerDesempenhoLances(sb, partida.id),
    medalhas: [],
    restantesHoje: Math.max(0, hoje.limite - hoje.feitas),
  };
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  if (corpo.acao === 'nova') return await nova(sb, uid, corpo);
  if (corpo.acao === 'lance') return await lance(sb, uid, corpo);
  throw new ErroHttp(400, 'acao_desconhecida');
});
