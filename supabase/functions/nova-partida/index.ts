// Nova partida: sorteia a semente (vale uma partida só e expira), guarda a dificuldade do dia
// pelo relógio do servidor e o número secreto do narrador para um eventual par ou ímpar.
// A semente e as cobranças gravadas do desafio NÃO saem daqui: a partida é jogada lance a lance
// pela função lance-penalti (anti-trapaça antes de divulgar; jogo.md, seção 6).
// Corpo: { desafio?: string }  (código do desafio por link)

import { admin, configDeteccao, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import { dificuldadeAgora } from '../_shared/tempo.ts';

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('id').eq('id', uid).maybeSingle();
  if (eT) throw eT;
  if (!torcedor) throw new ErroHttp(409, 'sem_time');

  const cfg = await configDeteccao(sb);
  const umMinutoAtras = new Date(Date.now() - 60_000).toISOString();
  const { count, error: eC } = await sb
    .from('partidas')
    .select('id', { count: 'exact', head: true })
    .eq('torcedor_id', uid)
    .gte('criada_em', umMinutoAtras);
  if (eC) throw eC;
  if ((count ?? 0) >= (cfg.partidas_por_minuto ?? 3)) throw new ErroHttp(429, 'muitas_partidas');

  let desafio = null;
  if (typeof corpo.desafio === 'string' && corpo.desafio) {
    const { data, error } = await sb
      .from('desafios')
      .select('id, torcedor_id, time_id, apelido, gols_jogador, gols_maquina, pontos')
      .eq('id', corpo.desafio.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ErroHttp(404, 'desafio_nao_encontrado');
    if (data.torcedor_id === uid) throw new ErroHttp(409, 'proprio_desafio');
    desafio = data;
  }

  const agora = new Date();
  const semente = sortear(0x1_0000_0000);
  const dificuldade = dificuldadeAgora(agora);
  const expiraEm = new Date(agora.getTime() + (cfg.minutos_validade_semente ?? 15) * 60_000);

  const { data: partida, error: eP } = await sb
    .from('partidas')
    .insert({
      torcedor_id: uid,
      modo: desafio ? 'desafio' : 'normal',
      desafio_id: desafio?.id ?? null,
      semente,
      dificuldade,
      criada_em: agora.toISOString(),
      expira_em: expiraEm.toISOString(),
    })
    .select('id')
    .single();
  if (eP) throw eP;

  const { error: eS } = await sb
    .from('partidas_segredo')
    .insert({ partida_id: partida.id, numero_narrador: sortear(6), lance_a_lance: true });
  if (eS) throw eS;

  return {
    partidaId: partida.id,
    lanceALance: true,
    proximo: { tipo: 'cobranca', i: 0 },
    dificuldade,
    expiraEm: expiraEm.toISOString(),
    desafio: desafio && {
      id: desafio.id,
      timeId: desafio.time_id,
      apelido: desafio.apelido,
      golsJogador: desafio.gols_jogador,
      golsMaquina: desafio.gols_maquina,
      pontos: desafio.pontos,
    },
  };
});
