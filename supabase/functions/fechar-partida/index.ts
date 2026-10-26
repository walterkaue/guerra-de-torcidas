// Fechar partida: recebe só os gestos, recalcula com o mesmo motor do celular e só então grava os pontos.
// Se a disputa chegou ao par ou ímpar, revela o número do narrador (sorteado no nova-partida, que o
// celular não conhece) depois de receber a escolha do jogador.
// Partida lance a lance (lance-penalti): os gestos que valem são os guardados no servidor; do corpo
// só se aproveita a escolha do par ou ímpar.
// Corpo: { partidaId: string, gestos: Gestos }

import { admin, configDeteccao, ErroHttp, lerCorpo, lerDesempenho, servir, sortear, usuario } from '../_shared/comum.ts';
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
  const enviados = lerGestos(corpo.gestos);

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

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('time_id').eq('id', uid).single();
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
    .select('numero_narrador, lance_a_lance, gestos')
    .eq('partida_id', partida.id)
    .single();
  if (eS) throw eS;
  const gestos: Gestos = segredo.lance_a_lance
    ? {
        ...(segredo.gestos as Gestos),
        ...(enviados.parOuImpar ? { parOuImpar: enviados.parOuImpar } : {}),
      }
    : enviados;

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

  // Detecção antes de gravar: histórico recente de pênaltis do torcedor, com esta partida na frente
  // (a Prova tem outro formato de resultado e fica de fora). No desafio, a defesa é contra cobrança
  // gravada e o próprio módulo tira da conta.
  const cfg = await configDeteccao(sb);
  const { data: recentes, error: eR } = await sb
    .from('partidas')
    .select('resultado')
    .eq('torcedor_id', uid)
    .eq('minigame', 'penaltis')
    .not('fechada_em', 'is', null)
    .order('fechada_em', { ascending: false })
    .limit(39);
  if (eR) throw eR;
  const motivo = motivoSuspeita(
    [resultado, ...(recentes ?? []).map((r) => r.resultado as ResultadoPartida)],
    {
      janelaDefesas: cfg.janela_defesas ?? 30,
      minDefesas: cfg.min_defesas ?? 27,
      janelaCobrancas: cfg.janela_cobrancas ?? 40,
    },
  );

  // Grava, refaz o teto e o ranking e cria o X1 (toda partida normal vira um desafio por link com as
  // cobranças gravadas) numa transação só: ou entra tudo, ou a partida continua aberta.
  // Nenhuma linha = alguém fechou antes (duas abas, clique duplo).
  const { data: fechamento, error: eF } = await sb.rpc('fechar_partida', {
    p_partida: partida.id,
    p_torcedor: uid,
    p_time: torcedor.time_id,
    p_gestos: gestos,
    p_resultado: resultado,
    p_pontos: resultado.pontos.total,
    p_dia: dia,
    p_semana: semana,
    p_fechada_em: agora.toISOString(),
    p_motivo_suspeita: motivo,
    p_desafio:
      partida.modo === 'normal'
        ? { cobrancas: gestos.cobrancas, gols_jogador: resultado.golsJogador, gols_maquina: resultado.golsMaquina }
        : null,
    p_codigos: [codigoDesafio(), codigoDesafio(), codigoDesafio()],
  });
  if (eF) throw eF;
  const estado = (fechamento as { teto: boolean; suspeita: boolean; codigo: string | null }[] | null)?.[0];
  if (!estado) throw new ErroHttp(409, 'partida_ja_fechada');
  const codigo = estado.codigo;

  // Daqui para baixo a partida já está gravada: leitura que falhar só tira o bloco da tela.
  const rankingDepois = await posicao();
  const desempenho = await lerDesempenho(sb, 'desempenho_partida', { p_partida: partida.id });

  return {
    resultado,
    numeroNarrador: resultado.parOuImpar?.numeroNarrador ?? null,
    semana,
    contaNoRanking: estado.teto && !estado.suspeita,
    sobSuspeita: estado.suspeita,
    ranking: { antes: rankingAntes, depois: rankingDepois },
    desempenho,
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
