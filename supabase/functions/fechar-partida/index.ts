// Fechar partida: recebe só os gestos, recalcula com o mesmo motor do celular e só então grava os pontos.
// Se a disputa chegou ao par ou ímpar, revela o número do narrador (sorteado no nova-partida, que o
// celular não conhece) depois de receber a escolha do jogador.
// Corpo: { partidaId: string, gestos: Gestos }

import { admin, configDeteccao, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import { motivoSuspeita } from '../_shared/jogo/deteccao.ts';
import {
  RODADAS_MAX,
  simularPartida,
  type GestoCobranca,
  type Gestos,
  type ResultadoPartida,
} from '../_shared/jogo/penaltis.ts';
import { periodoDaPartida } from '../_shared/tempo.ts';

const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Confere o formato antes de entregar ao motor (o motor também recusa regra quebrada). */
function lerGestos(v: unknown): Gestos {
  const g = v as Partial<Gestos> | null;
  if (!g || !Array.isArray(g.cobrancas) || !Array.isArray(g.defesas)) throw new ErroHttp(400, 'gestos_invalidos');
  if (g.cobrancas.length > RODADAS_MAX || g.defesas.length > RODADAS_MAX) throw new ErroHttp(400, 'gestos_invalidos');
  const cobrancas: GestoCobranca[] = g.cobrancas.map((c) => {
    if (!c || !numero(c.dir) || !numero(c.forca) || !numero(c.efeito)) throw new ErroHttp(400, 'gestos_invalidos');
    return { dir: c.dir, forca: c.forca, efeito: c.efeito };
  });
  const defesas = g.defesas.map((z) => {
    if (!numero(z)) throw new ErroHttp(400, 'gestos_invalidos');
    return z;
  });
  const lidos: Gestos = { cobrancas, defesas };
  if (g.parOuImpar) {
    const p = g.parOuImpar;
    if ((p.escolha !== 'par' && p.escolha !== 'impar') || !numero(p.numero)) throw new ErroHttp(400, 'gestos_invalidos');
    lidos.parOuImpar = { escolha: p.escolha, numero: p.numero };
  }
  return lidos;
}

/** Código do desafio: 8 letras/números minúsculos, sem caracteres que confundem. */
function codigoDesafio(): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => alfabeto[sortear(alfabeto.length)]).join('');
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  if (typeof corpo.partidaId !== 'string') throw new ErroHttp(400, 'sem_partida');
  const gestos = lerGestos(corpo.gestos);

  const { data: partida, error: eP } = await sb
    .from('partidas')
    .select('id, modo, desafio_id, semente, dificuldade, criada_em, expira_em, fechada_em')
    .eq('id', corpo.partidaId)
    .eq('torcedor_id', uid)
    .maybeSingle();
  if (eP) throw eP;
  if (!partida) throw new ErroHttp(404, 'partida_nao_encontrada');
  if (partida.fechada_em) throw new ErroHttp(409, 'partida_ja_fechada');
  const agora = new Date();
  if (agora > new Date(partida.expira_em)) throw new ErroHttp(410, 'partida_expirada');

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('time_id, apelido').eq('id', uid).single();
  if (eT) throw eT;

  let desafio: { apelido: string | null; cobrancas: GestoCobranca[]; pontos: number; gols_jogador: number; gols_maquina: number } | null = null;
  if (partida.modo === 'desafio' && partida.desafio_id) {
    const { data, error } = await sb
      .from('desafios')
      .select('apelido, cobrancas, pontos, gols_jogador, gols_maquina')
      .eq('id', partida.desafio_id)
      .single();
    if (error) throw error;
    desafio = data;
  }

  const { data: segredo, error: eS } = await sb
    .from('partidas_segredo')
    .select('numero_narrador')
    .eq('partida_id', partida.id)
    .single();
  if (eS) throw eS;

  let resultado: ResultadoPartida;
  try {
    resultado = simularPartida(
      Number(partida.semente),
      gestos,
      Number(partida.dificuldade),
      segredo.numero_narrador,
      desafio?.cobrancas,
    );
  } catch {
    throw new ErroHttp(400, 'gestos_invalidos');
  }

  const { dia, semana } = periodoDaPartida(new Date(partida.criada_em), agora);

  const posicao = async () => {
    const { data } = await sb
      .from('ranking_semana')
      .select('posicao_campeao, posicao_soma, media30, soma')
      .eq('semana', semana)
      .eq('time_id', torcedor.time_id)
      .maybeSingle();
    return data;
  };
  const rankingAntes = await posicao();

  // Grava só se ninguém fechou antes (duas abas, clique duplo).
  const { data: fechada, error: eF } = await sb
    .from('partidas')
    .update({
      fechada_em: agora.toISOString(),
      time_id: torcedor.time_id,
      gestos,
      resultado,
      pontos: resultado.pontos.total,
      dia,
      semana,
    })
    .eq('id', partida.id)
    .is('fechada_em', null)
    .select('id')
    .maybeSingle();
  if (eF) throw eF;
  if (!fechada) throw new ErroHttp(409, 'partida_ja_fechada');

  // Detecção: histórico recente do torcedor (só partidas normais entram na conta das defesas,
  // porque no desafio a defesa é contra cobrança gravada).
  const cfg = await configDeteccao(sb);
  const { data: recentes, error: eR } = await sb
    .from('partidas')
    .select('resultado')
    .eq('torcedor_id', uid)
    .not('fechada_em', 'is', null)
    .order('fechada_em', { ascending: false })
    .limit(40);
  if (eR) throw eR;
  const motivo = motivoSuspeita(
    (recentes ?? []).map((r) => r.resultado as ResultadoPartida),
    {
      janelaDefesas: cfg.janela_defesas ?? 30,
      minDefesas: cfg.min_defesas ?? 27,
      janelaCobrancas: cfg.janela_cobrancas ?? 40,
    },
  );
  if (motivo) {
    const { error } = await sb.from('partidas').update({ sob_suspeita: true, motivo_suspeita: motivo }).eq('id', partida.id);
    if (error) throw error;
  }

  const { error: eTeto } = await sb.rpc('atualizar_teto', { p_torcedor: uid, p_dia: dia });
  if (eTeto) throw eTeto;
  const { error: eRank } = await sb.rpc('recalcular_ranking', { p_semana: semana });
  if (eRank) throw eRank;
  const rankingDepois = await posicao();

  const { data: estado, error: eE } = await sb
    .from('partidas')
    .select('conta_no_teto, sob_suspeita')
    .eq('id', partida.id)
    .single();
  if (eE) throw eE;

  // Toda partida normal vira um desafio "duvido você me vencer" com as cobranças gravadas.
  let codigo: string | null = null;
  if (partida.modo === 'normal') {
    for (let tentativa = 0; tentativa < 3 && !codigo; tentativa++) {
      const id = codigoDesafio();
      const { error } = await sb.from('desafios').insert({
        id,
        partida_id: partida.id,
        torcedor_id: uid,
        time_id: torcedor.time_id,
        apelido: torcedor.apelido,
        cobrancas: gestos.cobrancas,
        gols_jogador: resultado.golsJogador,
        gols_maquina: resultado.golsMaquina,
        pontos: resultado.pontos.total,
      });
      if (!error) codigo = id;
      else if (error.code !== '23505') throw error; // 23505 = código repetido, tenta outro
    }
  }

  return {
    resultado,
    numeroNarrador: resultado.parOuImpar?.numeroNarrador ?? null,
    semana,
    contaNoRanking: estado.conta_no_teto && !estado.sob_suspeita,
    sobSuspeita: estado.sob_suspeita,
    ranking: { antes: rankingAntes, depois: rankingDepois },
    desafio: codigo ? { codigo } : null,
    // Desafio: mais pontos vence; empate em pontos fica com quem desafiou (chegou primeiro).
    comparacao: desafio && {
      desafiante: desafio.apelido,
      pontosDesafiante: desafio.pontos,
      golsJogadorDesafiante: desafio.gols_jogador,
      golsMaquinaDesafiante: desafio.gols_maquina,
      venceu: resultado.pontos.total > desafio.pontos,
    },
  };
});
