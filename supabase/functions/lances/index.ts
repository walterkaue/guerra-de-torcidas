// Lances do Jogo valendo (docs/jogo.md, seções 7.3 e 14.7), lance a lance como os pênaltis (seção 6, "Anti-trapaça"):
// as sementes nunca saem daqui. Duas ações:
//   { acao: 'nova', lance: id }                    começa a partida: 3 tentativas do mesmo lance
//   { acao: 'nova', desafio: código }              X1 recebido: o lance de quem desafiou, com sementes novas
//   { acao: 'nova', lances: [id, id, id] }         formato antigo (3 lances escolhidos): só antes de 08/11/2026
//   { acao: 'lance', partidaId, i, gesto }         resolve o lance i; no 3º, fecha e grava a partida
// A regra (tabela, limite do dia, faixa) sai da hora em que a partida foi criada (regraLances.ts).
// A cena vem do catálogo do servidor (_shared/dados/lances.ts), pelo id: o celular nunca manda a cena.
// Uma semente por lance (lancesPartida.ts): achar a de um lance já jogado não adianta para o próximo.
// O treino não passa por aqui.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, codigoDesafio, configDeteccao, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import { LANCES } from '../_shared/dados/lances.ts';
import { LANCES_POR_PARTIDA, type Faixa, type Lance } from '../_shared/jogo/lances.ts';
import {
  cenasComFaixa,
  DETECCAO_LANCES_PADRAO,
  ehLanceRepetido,
  fecharPartidaLances,
  goleiroParaOCelular,
  jogarLanceDoJogo,
  LANCES_PARTIDAS_POR_DIA,
  LanceForaDeOrdem,
  motivoSuspeitaLances,
  tentativasDoLance,
  type DesempenhoLances,
  type FechamentoLances,
  type GestosLances,
  type MedalhaNova,
  type RespostaLanceDoJogo,
  type RespostaNovaLances,
  type ResultadoPartidaLancesServidor,
} from '../_shared/jogo/lancesPartida.ts';
import type { GestoCobranca } from '../_shared/jogo/penaltis.ts';
import {
  desafioNaFaixa,
  ehUnificada,
  faixaCorrigida,
  faixaDaPartida,
  LANCES_PARTIDAS_POR_DIA_UNIFICADO,
  periodoNoCorte,
  tabelaLancesDaPartida,
} from '../_shared/jogo/regraLances.ts';
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

interface Hoje {
  feitas: number;
  limite: number;
  melhor: number | null;
  /** Regra nova: as 3 melhores partidas de Lances que contam hoje. */
  melhores: number[];
}

async function lancesHoje(sb: SupabaseClient, uid: string): Promise<Hoje> {
  const { data, error } = await sb.rpc('lances_hoje', { p_torcedor: uid });
  if (error) throw error;
  const l = (data as Hoje[] | null)?.[0];
  return { feitas: l?.feitas ?? 0, limite: l?.limite ?? limitePadrao(), melhor: l?.melhor ?? null, melhores: l?.melhores ?? [] };
}

/** Limite do dia de agora, para quando a leitura do banco falhar. */
const limitePadrao = () => (ehUnificada(new Date()) ? LANCES_PARTIDAS_POR_DIA_UNIFICADO : LANCES_PARTIDAS_POR_DIA);
const hojeVazio = (): Hoje => ({ feitas: 0, limite: limitePadrao(), melhor: null, melhores: [] });

interface DesafioLances {
  id: string;
  partida_id: string;
  torcedor_id: string;
  time_id: string;
  apelido: string | null;
  lance_id: string;
  pontos: number;
  faixa: Faixa;
}

async function lerDesafio(sb: SupabaseClient, codigo: string): Promise<DesafioLances | null> {
  if (!/^[a-z0-9]{8}$/i.test(codigo)) return null;
  const { data, error } = await sb
    .from('lances_desafios')
    .select('id, partida_id, torcedor_id, time_id, apelido, lance_id, pontos, faixa')
    .eq('id', codigo.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as DesafioLances | null;
}

/** A faixa com que a partida nova joga o lance (regra nova: corrigida pela taxa real, a partir de 30 tentativas de 8 pessoas). */
async function faixaParaAPartida(sb: SupabaseClient, lance: Lance, agora: Date): Promise<Faixa> {
  if (!ehUnificada(agora)) return lance.faixa;
  const { data, error } = await sb.rpc('lances_taxa', { p_lance: lance.id });
  if (error) throw error;
  const t = (data as { tentativas: number; gols: number; pessoas: number }[] | null)?.[0];
  return faixaDaPartida(lance, agora, t ? faixaCorrigida(t.gols, t.tentativas, t.pessoas) : null);
}

/** Hora em que a partida de um desafio foi criada (decide a tabela de pontos dele), ou null se ela sumiu. */
async function criadaDaPartida(sb: SupabaseClient, partidaId: string): Promise<string | null> {
  const { data, error } = await sb.from('partidas').select('criada_em').eq('id', partidaId).maybeSingle();
  if (error) throw error;
  return (data?.criada_em as string | undefined) ?? null;
}

async function nova(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>): Promise<RespostaNovaLances> {
  const agora = new Date();
  const unificada = ehUnificada(agora);

  // Qual lance: X1 recebido, um lance (regra nova) ou, só antes do corte, a lista antiga de 3.
  let desafio: DesafioLances | null = null;
  let cenas: Lance[];
  if (typeof corpo.desafio === 'string' && corpo.desafio) {
    // O X1 dos Lances é da regra nova: antes do corte não existe.
    if (!unificada) throw new ErroHttp(404, 'desafio_nao_encontrado');
    desafio = await lerDesafio(sb, corpo.desafio);
    if (!desafio) throw new ErroHttp(404, 'desafio_nao_encontrado');
    if (desafio.torcedor_id === uid) throw new ErroHttp(409, 'proprio_desafio');
    const lance = POR_ID.get(desafio.lance_id);
    // Lance que saiu do catálogo, ou partida do desafio criada antes do corte (outra tabela de pontos, mesmo que
    // tenha fechado depois): não dá mais para aceitar.
    const criada = await criadaDaPartida(sb, desafio.partida_id);
    if (!lance || !criada || !ehUnificada(criada)) throw new ErroHttp(410, 'desafio_expirado');
    // O lance desceu de faixa depois do X1: o código antigo não pode servir para jogar na faixa que pagava mais.
    if (!desafioNaFaixa(desafio.faixa, await faixaParaAPartida(sb, lance, agora))) throw new ErroHttp(410, 'desafio_expirado');
    cenas = cenasDosIds(tentativasDoLance(lance.id));
  } else if (typeof corpo.lance === 'string') {
    cenas = cenasDosIds(tentativasDoLance(corpo.lance));
  } else if (corpo.lances !== undefined) {
    if (unificada) throw new ErroHttp(426, 'atualize_o_app');
    cenas = cenasDosIds(corpo.lances);
  } else {
    throw new ErroHttp(400, 'lances_invalidos');
  }

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('id').eq('id', uid).maybeSingle();
  if (eT) throw eT;
  if (!torcedor) throw new ErroHttp(409, 'sem_time');

  const cfg = await configDeteccao(sb);
  const sementes = cenas.map(() => sortear(0x1_0000_0000));
  const expiraEm = new Date(agora.getTime() + (cfg.minutos_validade_semente ?? 15) * 60_000);
  // Regra nova: a faixa fica gravada na partida (a corrigida pela taxa real, senão a do catálogo recalibrado).
  // As 3 tentativas são do mesmo lance, então a conta é uma só.
  // No X1, a faixa de quem desafiou: os dois jogam o mesmo lance com a mesma tabela, mesmo que a faixa suba depois
  // (se ela desceu, o X1 já expirou acima).
  const faixas = unificada
    ? (Array(cenas.length).fill(desafio ? desafio.faixa : await faixaParaAPartida(sb, cenas[0], agora)) as Faixa[])
    : undefined;
  if (faixas && !ehLanceRepetido(cenas.map((c) => c.id))) throw new ErroHttp(400, 'lances_invalidos');
  const segredo: GestosLances = { lances: cenas.map((c) => c.id), sementes, cobrancas: [], ...(faixas ? { faixas } : {}) };

  // Limite do dia (contado ao começar: abandonar uma partida ruim gasta a vaga; na regra nova soma os pênaltis e
  // conta o X1 recebido), limite por minuto e as duas linhas da partida numa transação só, com trava por torcedor.
  const { data, error } = await sb.rpc('lances_comecar', {
    p_torcedor: uid,
    p_semente: sementes[0],
    p_expira_em: expiraEm.toISOString(),
    p_segredo: segredo,
    p_modo: desafio ? 'desafio' : 'normal',
    p_desafio: desafio?.id ?? null,
    p_criada_em: agora.toISOString(),
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
    lances: segredo.lances,
    faixas: faixas ?? cenas.map((c) => c.faixa),
    desafio: desafio && { codigo: desafio.id, timeId: desafio.time_id, apelido: desafio.apelido, pontos: desafio.pontos },
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
  modo: string;
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

/** As cenas guardadas da partida, com a faixa gravada ao começar (regra nova). */
function cenasDaPartida(guardados: GestosLances): Lance[] {
  try {
    return cenasComFaixa(cenasDosIds(guardados.lances), guardados.faixas);
  } catch (e) {
    if (e instanceof LanceForaDeOrdem) throw new ErroHttp(409, 'lance_fora_de_ordem');
    throw e;
  }
}

async function lance(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>): Promise<RespostaLanceDoJogo> {
  if (typeof corpo.partidaId !== 'string') throw new ErroHttp(400, 'sem_partida');
  const i = corpo.i;
  if (typeof i !== 'number' || !Number.isInteger(i)) throw new ErroHttp(400, 'lance_invalido');
  const gestoBruto = lerGesto(corpo.gesto);

  const { data, error: eP } = await sb
    .from('partidas')
    .select('id, modo, criada_em, expira_em, fechada_em, minigame, resultado, semana, conta_no_teto, sob_suspeita, time_id')
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
  const cenas = cenasDaPartida(guardados);

  // O 3º lance já está guardado, mas o fechamento falhou (queda no meio): o reenvio só fecha, com o gesto
  // guardado (o novo é ignorado).
  if (guardados.cobrancas?.length === LANCES_POR_PARTIDA && i === LANCES_POR_PARTIDA - 1) {
    const fim = await fechar(sb, uid, partida, cenas, guardados);
    return { lance: fim.resultado.lances[i], goleiroProximo: null, fim };
  }

  let jogada;
  try {
    jogada = jogarLanceDoJogo(
      cenas,
      { ...guardados, sementes: guardados.sementes ?? [], cobrancas: guardados.cobrancas ?? [] },
      i,
      gestoBruto,
      tabelaLancesDaPartida(partida.criada_em),
    );
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
  partida: { id: string; criada_em: string; modo: string },
  cenas: Lance[],
  gestos: GestosLances,
): Promise<FechamentoLances> {
  const { data: torcedor, error: eT } = await sb.from('torcedores').select('time_id').eq('id', uid).single();
  if (eT) throw eT;

  // Vale o que está guardado no servidor, recalculado do zero, com a tabela da hora em que a partida começou.
  let resultado: ResultadoPartidaLancesServidor;
  try {
    resultado = fecharPartidaLances(gestos.sementes ?? [], cenas, gestos.cobrancas, tabelaLancesDaPartida(partida.criada_em));
  } catch (e) {
    if (e instanceof LanceForaDeOrdem) throw new ErroHttp(409, 'lance_fora_de_ordem');
    throw e;
  }
  const agora = new Date();
  // Partida criada antes do corte e fechada depois das 00h05 do dia seguinte conta no dia em que começou.
  const { dia, semana } = periodoNoCorte(partida.criada_em, periodoDaPartida(new Date(partida.criada_em), agora));
  const rankingAntes = await posicaoDoTime(sb, semana, torcedor.time_id);

  // X1 recebido: o placar de quem desafiou, lido antes de gravar (o desafio some se a conta de quem fez sumir).
  const desafio = partida.modo === 'desafio' && gestos.desafio ? await lerDesafio(sb, gestos.desafio) : null;

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

  // Grava, refaz o teto (regra nova: as 3 melhores de Lances no dia) e anota o ranking numa transação só. Os
  // gatilhos anotam os gols das medalhas e as tentativas da faixa na mesma transação. Nenhuma linha = alguém fechou
  // antes. As sementes e o código do X1 recebido ficam só em partidas_segredo: partidas.gestos o celular lê.
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
    // Regra nova: toda partida normal vira um X1 (o X1 recebido não gera outro), com a faixa usada.
    p_desafio:
      partida.modo === 'normal' && ehUnificada(partida.criada_em) && ehLanceRepetido(gestos.lances)
        ? { lance_id: gestos.lances[0], gols: resultado.gols, recriados: resultado.recriados, faixa: cenas[0].faixa }
        : null,
    p_codigos: [codigoDesafio(), codigoDesafio(), codigoDesafio()],
  });
  if (eF) throw eF;
  const estado = (fechamento as { teto: boolean; suspeita: boolean; codigo: string | null }[] | null)?.[0];
  if (!estado) throw new ErroHttp(409, 'partida_ja_fechada');

  // Daqui para baixo a partida já está gravada: leitura que falhar só tira o bloco da tela.
  const confirmadaEm = new Date().toISOString();
  const rankingDepois = await posicaoDoTime(sb, semana, torcedor.time_id);
  const desempenho = await lerDesempenhoLances(sb, partida.id);

  let novas: MedalhaNova[] = [];
  let hoje = hojeVazio();
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
    melhoresDoDia: hoje.melhores,
    desafio: estado.codigo ? { codigo: estado.codigo } : null,
    // Mais pontos vence; empate fica com quem desafiou (chegou primeiro).
    comparacao: desafio && { desafiante: desafio.apelido, pontosDesafiante: desafio.pontos, venceu: resultado.pontos > desafio.pontos },
  };
}

/** O fechamento de uma partida que já estava gravada (reenvio): sem ranking de antes nem medalhas novas. */
async function jaGravado(sb: SupabaseClient, uid: string, partida: PartidaLida): Promise<FechamentoLances> {
  const semana = partida.semana ?? '';
  const ranking = partida.time_id && semana ? await posicaoDoTime(sb, semana, partida.time_id) : null;
  let hoje = hojeVazio();
  let codigo: string | null = null;
  try {
    hoje = await lancesHoje(sb, uid);
    // O código do X1 que esta partida gerou (a primeira resposta pode ter se perdido).
    const { data } = await sb.from('lances_desafios').select('id').eq('partida_id', partida.id).maybeSingle();
    codigo = (data?.id as string | undefined) ?? null;
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
    melhoresDoDia: hoje.melhores,
    desafio: codigo ? { codigo } : null,
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
