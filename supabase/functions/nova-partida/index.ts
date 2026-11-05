// Nova partida: sorteia uma semente por lance (valem uma partida só e expiram), guarda a dificuldade do dia
// pelo relógio do servidor e o número secreto do narrador para um eventual par ou ímpar.
// As sementes e as cobranças gravadas do desafio NÃO saem daqui: a partida é jogada lance a lance
// pela função lance-penalti (anti-trapaça antes de divulgar; jogo.md, seção 6).
// Lances unificados (seção 14.7, desde 09/11/2026): os pênaltis entram no limite do dia junto com faltas e cara a
// cara (10, contados ao começar, inclusive o X1 recebido). Passou do limite: 429 'limite_do_dia', e o celular joga
// a partida como treino. A partida começa numa transação só no banco (penaltis_comecar), com a mesma trava por
// torcedor da função lances.
// X1 uma vez por pessoa (05/11/2026): quem já começou uma partida com o código recebe 409 'desafio_ja_jogado' (na
// segunda vez, as zonas das cobranças gravadas já seriam conhecidas), e o celular abre uma partida normal. A
// conferência é da penaltis_comecar, dentro da trava, para dois pedidos ao mesmo tempo não abrirem duas partidas.
// Sem Disputa livre a partir do corte (decisão do Kauê em 05/11/2026, seção 14.7): partida de pênaltis valendo sem
// disputa do catálogo é recusada com 400 'disputa_obrigatoria'. Antes do corte, nada muda (id fora do catálogo vira
// partida livre, sem erro). No X1 recebido, a partida grava a disputa da partida de quem chamou (a medalha vai para a
// mesma disputa) e a resposta devolve o id, para o celular montar o cenário dela. A penaltis_comecar confere de novo.
// Catálogo novo de disputas: publicar a nova-partida ANTES do site, senão a disputa nova é recusada depois do corte.
// Corpo: { desafio?: string, disputa?: string }  (código do desafio por link; id da disputa histórica)

import { admin, configDeteccao, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import { sortearSementes } from '../_shared/jogo/penaltis.ts';
import { ehUnificada } from '../_shared/jogo/regraLances.ts';
import { dificuldadeAgora } from '../_shared/tempo.ts';
import { DISPUTAS } from '../_shared/dados/disputas.ts';

const IDS_DISPUTAS = new Set(DISPUTAS.map((d) => d.id));

/**
 * Disputa histórica é só cenário (jogo.md, seção 6): só vale id do catálogo (uma disputa inventada abriria medalhas
 * sem fim na vitrine). Fora dele, null: antes do corte vira partida livre; depois, 'disputa_obrigatoria'.
 */
const disputaDoCorpo = (v: unknown): string | null => (typeof v === 'string' && IDS_DISPUTAS.has(v) ? v : null);

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  const agora = new Date();

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('id').eq('id', uid).maybeSingle();
  if (eT) throw eT;
  if (!torcedor) throw new ErroHttp(409, 'sem_time');

  let desafio = null;
  if (typeof corpo.desafio === 'string' && corpo.desafio) {
    const { data, error } = await sb
      .from('desafios')
      .select('id, partida_id, torcedor_id, time_id, apelido, gols_jogador, gols_maquina, pontos')
      .eq('id', corpo.desafio.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ErroHttp(404, 'desafio_nao_encontrado');
    if (data.torcedor_id === uid) throw new ErroHttp(409, 'proprio_desafio');
    // X1 de uma partida criada antes dos Lances unificados tem os pontos da tabela antiga (mesmo que tenha fechado
    // depois do corte): não dá para comparar com a nova. Decide pela hora de criação da partida do desafio.
    const { data: origem, error: eO } = await sb.from('partidas').select('criada_em, disputa_id').eq('id', data.partida_id).maybeSingle();
    if (eO) throw eO;
    if (!origem || ehUnificada(origem.criada_em) !== ehUnificada(agora)) throw new ErroHttp(410, 'desafio_expirado');
    desafio = { ...data, disputa_id: (origem.disputa_id as string | null) ?? null };
  }

  // No X1, a disputa de quem chamou; senão, a do corpo (só do catálogo).
  const disputa = desafio ? desafio.disputa_id : disputaDoCorpo(corpo.disputa);
  if (ehUnificada(agora) && !disputa) {
    // Depois do corte toda partida de pênaltis é de uma disputa; um X1 sem disputa não existe (o de antes expira).
    if (desafio) throw new ErroHttp(410, 'desafio_expirado');
    throw new ErroHttp(400, 'disputa_obrigatoria');
  }

  const cfg = await configDeteccao(sb);
  // partidas.semente é obrigatória, mas as partidas novas não a usam: valem as sementes por lance, guardadas
  // em partidas_segredo (uma semente só na partida deixava prever os lances seguintes; jogo.md, seção 6).
  const semente = sortear(0x1_0000_0000);
  const sementes = sortearSementes(sortear);
  const dificuldade = dificuldadeAgora(agora);
  const expiraEm = new Date(agora.getTime() + (cfg.minutos_validade_semente ?? 15) * 60_000);

  // Limite por minuto, limite do dia (só na regra nova) e as duas linhas da partida numa transação só.
  const { data, error } = await sb.rpc('penaltis_comecar', {
    p_torcedor: uid,
    p_semente: semente,
    p_dificuldade: dificuldade,
    p_expira_em: expiraEm.toISOString(),
    p_modo: desafio ? 'desafio' : 'normal',
    p_desafio: desafio?.id ?? null,
    p_disputa: disputa,
    p_numero_narrador: sortear(6),
    p_sementes: sementes,
    p_criada_em: agora.toISOString(),
  });
  if (error) {
    if (error.message?.includes('desafio_ja_jogado')) throw new ErroHttp(409, 'desafio_ja_jogado');
    if (error.message?.includes('disputa_obrigatoria')) throw new ErroHttp(400, 'disputa_obrigatoria');
    if (error.message?.includes('desafio_expirado')) throw new ErroHttp(410, 'desafio_expirado');
    if (error.message?.includes('limite_do_dia')) throw new ErroHttp(429, 'limite_do_dia');
    if (error.message?.includes('muitas_partidas')) throw new ErroHttp(429, 'muitas_partidas');
    throw error;
  }
  const comecou = (data as { partida_id: string; feitas: number; limite: number }[] | null)?.[0];
  if (!comecou) throw new Error('penaltis_comecar sem resposta');

  return {
    partidaId: comecou.partida_id,
    lanceALance: true,
    proximo: { tipo: 'cobranca', i: 0 },
    dificuldade,
    expiraEm: expiraEm.toISOString(),
    // Só na regra nova: partidas de Lances valendo que ainda dá para começar hoje, já contando esta.
    restantesHoje: ehUnificada(agora) ? Math.max(0, comecou.limite - comecou.feitas) : null,
    desafio: desafio && {
      id: desafio.id,
      timeId: desafio.time_id,
      apelido: desafio.apelido,
      golsJogador: desafio.gols_jogador,
      golsMaquina: desafio.gols_maquina,
      pontos: desafio.pontos,
      // A disputa de quem chamou (null no X1 livre de antes do corte): o celular monta o cenário dela.
      disputaId: desafio.disputa_id,
    },
  };
});
