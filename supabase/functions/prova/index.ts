// Prova de Boleiro no servidor (docs/jogo.md, seção 7.1). Uma pergunta por vez: o celular recebe o
// texto e 4 alternativas com ids embaralhados por partida, e a certa só depois da escolha.
// O tempo é medido aqui, a partir da hora em que a pergunta saiu (15 s + 2 s de tolerância).
// Corpo: { acao, ... }
//   nova      { desafio?: string }                        cria a partida e manda a 1ª pergunta
//   proxima   { partidaId, decisao?: 'seguir' | 'parar' }  da 3ª em diante, decide antes de ver
//   responder { partidaId, alternativa: string | null }    null = o tempo acabou no celular
//   ajuda     { partidaId, tipo: 'tira_duas' | 'arquibancada' | 'troca' }

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, configDeteccao, ErroHttp, lerCorpo, lerDesempenho, servir, sortear, usuario } from '../_shared/comum.ts';
import {
  AJUDAS,
  GERAL,
  PERGUNTAS,
  SEGUNDOS,
  TOLERANCIA_SEGUNDOS,
  calcularPontos,
  contarErros,
  embaralhar,
  escadaEmoji,
  escolherPergunta,
  fimDosPassos,
  montarEscada,
  motivoSuspeitaProva,
  pontosDosPassos,
  porcentagens,
  precisaDecidir,
  quantasTirar,
  resumoDaProva,
  type Ajuda,
  type Degrau,
  type Desfecho,
  type Fim,
} from '../_shared/jogo/prova.ts';
import { periodoDaPartida } from '../_shared/tempo.ts';

interface VagaServidor {
  degrau: Degrau;
  origem: string;
  perguntaId: string;
  trocadaDe?: string;
}

interface PassoServidor {
  degrau: Degrau;
  desfecho: Desfecho;
  ajuda: boolean;
  ms: number;
}

interface Estado {
  partida_id: string;
  desafio_id: string | null;
  escada: VagaServidor[];
  atual: number;
  fase: 'aguardando' | 'respondendo' | 'fim';
  enviada_em: string | null;
  alternativas: { id: string; idx: number }[] | null;
  removidas: string[];
  ajudas: Partial<Record<Ajuda, number>>;
  ajuda_na_atual: boolean;
  passos: PassoServidor[];
  versao: number;
}

interface Partida {
  id: string;
  criada_em: string;
  expira_em: string;
  fechada_em: string | null;
  amistoso: boolean;
}

type Cfg = ReturnType<typeof lerConfig>;

function lerConfig(c: Record<string, number>) {
  return {
    amistoso: (c.prova_amistoso ?? 1) !== 0,
    segundos: c.prova_segundos ?? SEGUNDOS,
    limiteMs: ((c.prova_segundos ?? SEGUNDOS) + (c.prova_tolerancia ?? TOLERANCIA_SEGUNDOS)) * 1000,
    dias: c.prova_dias_sem_repetir ?? 30,
    minArquibancada: c.prova_min_arquibancada ?? 30,
    deteccao: {
      janela: c.prova_janela ?? 40,
      minAcerto: c.prova_min_acerto ?? 0.9,
      tempoMedioMs: c.prova_tempo_medio_ms ?? 2500,
    },
    porMinuto: c.partidas_por_minuto ?? 3,
    validadeMin: c.minutos_validade_semente ?? 15,
  };
}

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
const codigo = (n: number) => Array.from({ length: n }, () => ALFABETO[sortear(ALFABETO.length)]).join('');
const sorteio = (n: number) => sortear(n);

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------

async function sortearPergunta(
  sb: SupabaseClient,
  uid: string,
  degrau: Degrau,
  origem: string,
  jaNaPartida: ReadonlySet<string>,
  cfg: Cfg,
): Promise<string | null> {
  const { data, error } = await sb.rpc('prova_candidatas', {
    p_torcedor: uid,
    p_degrau: degrau,
    p_clube: origem === GERAL ? null : origem,
  });
  if (error) throw error;
  const candidatas = ((data ?? []) as { id: string; vista_em: string | null }[]).map((c) => ({
    id: c.id,
    vistaEm: c.vista_em ? new Date(c.vista_em).getTime() : null,
  }));
  return escolherPergunta(candidatas, jaNaPartida, Date.now(), cfg.dias, sorteio);
}

/** Grava só se ninguém mexeu antes (clique duplo, duas abas). */
async function salvar(sb: SupabaseClient, est: Estado, mudancas: Partial<Estado>): Promise<void> {
  const { data, error } = await sb
    .from('prova_estado')
    .update({ ...mudancas, versao: est.versao + 1 })
    .eq('partida_id', est.partida_id)
    .eq('versao', est.versao)
    .select('partida_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroHttp(409, 'conflito');
  Object.assign(est, mudancas, { versao: est.versao + 1 });
}

/** Prepara a pergunta da vez: embaralha, dá ids novos e marca a hora de saída. */
async function enviar(sb: SupabaseClient, uid: string, est: Estado, cfg: Cfg, extra: Partial<Estado> = {}) {
  const vaga = est.escada[est.atual];
  const { data: p, error } = await sb
    .from('perguntas')
    .select('id, clube, texto, certa, errada1, errada2, errada3')
    .eq('id', vaga.perguntaId)
    .single();
  if (error) throw error;
  const textos = [p.certa, p.errada1, p.errada2, p.errada3] as string[];
  const ids = new Set<string>();
  while (ids.size < 4) ids.add(codigo(6));
  const alternativas = embaralhar([0, 1, 2, 3], sorteio).map((idx, k) => ({ id: [...ids][k], idx }));
  const agora = new Date().toISOString();

  const { error: eV } = await sb
    .from('prova_vistas')
    .upsert({ torcedor_id: uid, pergunta_id: p.id, vista_em: agora }, { onConflict: 'torcedor_id,pergunta_id' });
  if (eV) throw eV;

  await salvar(sb, est, {
    fase: 'respondendo',
    enviada_em: agora,
    alternativas,
    removidas: [],
    ajuda_na_atual: false,
    ...extra,
  });

  return {
    numero: est.atual + 1,
    degrau: vaga.degrau,
    clube: p.clube ?? GERAL,
    texto: p.texto as string,
    alternativas: alternativas.map((a) => ({ id: a.id, texto: textos[a.idx] })),
    segundos: cfg.segundos,
    levar: pontosDosPassos(est.passos),
    erros: contarErros(est.passos),
    ajudasUsadas: AJUDAS.filter((a) => est.ajudas[a] !== undefined),
  };
}

// ---------------------------------------------------------------------------
// Fechamento: pontos pelo módulo puro, detecção, teto e o desafio por link.
// O estado já precisa estar em fase "fim" (trancado) antes de chamar.
// ---------------------------------------------------------------------------

async function fechar(sb: SupabaseClient, uid: string, partida: Partida, est: Estado, fimPedido: Fim | null, cfg: Cfg) {
  const passos = est.passos.map(({ desfecho, ajuda }) => ({ desfecho, ajuda }));
  const fim: Fim = fimDosPassos(passos) ?? fimPedido ?? 'parou';
  const pontos = calcularPontos(passos);
  const escada = escadaEmoji(passos, fim);
  const resumo = resumoDaProva(passos, fim);
  const agora = new Date();

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('time_id').eq('id', uid).single();
  if (eT) throw eT;
  const { dia, semana } = periodoDaPartida(new Date(partida.criada_em), agora);

  // Detecção antes de gravar: últimas respostas difíceis e de craque do torcedor.
  const { data: respostas, error: eR } = await sb
    .from('prova_respostas')
    .select('degrau, acertou, ms')
    .eq('torcedor_id', uid)
    .gte('degrau', 3)
    .order('respondida_em', { ascending: false })
    .limit(cfg.deteccao.janela);
  if (eR) throw eR;
  const motivo = motivoSuspeitaProva(respostas ?? [], cfg.deteccao);

  // Grava, refaz o teto e o ranking e cria o desafio com as mesmas 8 perguntas (toda partida que não
  // é de desafio vira um) numa transação só. Nenhuma linha = alguém fechou antes.
  const { data: fechamento, error: eF } = await sb.rpc('fechar_partida', {
    p_partida: partida.id,
    p_torcedor: uid,
    p_time: torcedor.time_id,
    p_gestos: null,
    p_resultado: { fim, passos: est.passos, pontos, escada, resumo },
    p_pontos: pontos.total,
    p_dia: dia,
    p_semana: semana,
    p_fechada_em: agora.toISOString(),
    p_motivo_suspeita: motivo,
    p_desafio: est.desafio_id ? null : { perguntas: est.escada.map((v) => v.perguntaId), escada, resumo },
    p_codigos: [codigo(8), codigo(8), codigo(8)],
  });
  if (eF) throw eF;
  const e = (fechamento as { teto: boolean; suspeita: boolean; codigo: string | null }[] | null)?.[0];
  if (!e) throw new ErroHttp(409, 'partida_ja_fechada');
  const contaNoRanking = !partida.amistoso && e.teto && !e.suspeita;
  const desafio = e.codigo ? { codigo: e.codigo } : null;
  const desempenho = await lerDesempenho(sb, 'desempenho_partida', { p_partida: partida.id });

  let comparacao = null;
  if (est.desafio_id) {
    const { data: d, error } = await sb
      .from('prova_desafios')
      .select('apelido, pontos, escada, resumo')
      .eq('id', est.desafio_id)
      .maybeSingle();
    // A partida já está gravada: sem a comparação, a tela mostra só o resultado.
    if (error) console.error(error);
    // Mais pontos vence; empate fica com quem desafiou (chegou primeiro).
    if (d) comparacao = { desafiante: d.apelido, pontosDesafiante: d.pontos, escadaDesafiante: d.escada, resumoDesafiante: d.resumo, venceu: pontos.total > d.pontos };
  }

  return {
    fim,
    pontos,
    escada,
    resumo,
    passos,
    amistoso: partida.amistoso,
    contaNoRanking,
    sobSuspeita: Boolean(motivo),
    semana,
    desempenho,
    desafio,
    comparacao,
  };
}

/** Partida largada (app fechado, expirou): no meio da pergunta conta como tempo esgotado; antes dela, como parar. */
async function encerrarLargada(sb: SupabaseClient, uid: string, partida: Partida, est: Estado, cfg: Cfg) {
  if (est.fase === 'respondendo') {
    const vaga = est.escada[est.atual];
    const comTempo = [...est.passos, { degrau: vaga.degrau, desfecho: 'tempo' as const, ajuda: est.ajuda_na_atual, ms: cfg.limiteMs }];
    // Só vira erro se for o 3º; antes disso a pessoa simplesmente parou na pergunta anterior.
    await salvar(sb, est, {
      fase: 'fim',
      alternativas: null,
      passos: fimDosPassos(comTempo) ? comTempo : est.passos,
    });
  } else if (est.fase === 'aguardando') {
    await salvar(sb, est, { fase: 'fim' });
  }
  return fechar(sb, uid, partida, est, 'parou', cfg);
}

async function carregar(sb: SupabaseClient, uid: string, partidaId: unknown): Promise<{ partida: Partida; est: Estado }> {
  if (typeof partidaId !== 'string') throw new ErroHttp(400, 'sem_partida');
  const { data: partida, error } = await sb
    .from('partidas')
    .select('id, criada_em, expira_em, fechada_em, amistoso')
    .eq('id', partidaId)
    .eq('torcedor_id', uid)
    .eq('minigame', 'prova')
    .maybeSingle();
  if (error) throw error;
  if (!partida) throw new ErroHttp(404, 'partida_nao_encontrada');
  if (partida.fechada_em) throw new ErroHttp(409, 'partida_ja_fechada');
  const { data: est, error: eE } = await sb.from('prova_estado').select('*').eq('partida_id', partidaId).single();
  if (eE) throw eE;
  return { partida, est: est as Estado };
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

async function nova(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>, cfg: Cfg) {
  const { data: torcedor, error: eT } = await sb.from('torcedores').select('id').eq('id', uid).maybeSingle();
  if (eT) throw eT;
  if (!torcedor) throw new ErroHttp(409, 'sem_time');

  const umMinutoAtras = new Date(Date.now() - 60_000).toISOString();
  const { count, error: eC } = await sb
    .from('partidas')
    .select('id', { count: 'exact', head: true })
    .eq('torcedor_id', uid)
    .gte('criada_em', umMinutoAtras);
  if (eC) throw eC;
  if ((count ?? 0) >= cfg.porMinuto) throw new ErroHttp(429, 'muitas_partidas');

  // Prova largada aberta (app fechado no meio): fecha antes de começar outra.
  const { data: abertas, error: eA } = await sb
    .from('partidas')
    .select('id')
    .eq('torcedor_id', uid)
    .eq('minigame', 'prova')
    .is('fechada_em', null);
  if (eA) throw eA;
  for (const a of abertas ?? []) {
    try {
      const { partida, est } = await carregar(sb, uid, a.id);
      await encerrarLargada(sb, uid, partida, est, cfg);
    } catch (e) {
      console.error('fechar prova largada', a.id, e);
    }
  }

  let desafio: { id: string; time_id: string; apelido: string | null; pontos: number; escada: string; resumo: string; perguntas: string[] } | null = null;
  if (typeof corpo.desafio === 'string' && corpo.desafio) {
    const { data, error } = await sb
      .from('prova_desafios')
      .select('id, torcedor_id, time_id, apelido, pontos, escada, resumo, perguntas')
      .eq('id', corpo.desafio.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ErroHttp(404, 'desafio_nao_encontrado');
    if (data.torcedor_id === uid) throw new ErroHttp(409, 'proprio_desafio');
    // Cada desafio da prova vale uma vez por pessoa: na segunda, as perguntas já seriam conhecidas.
    const { data: jogadas, error: eJ } = await sb
      .from('prova_estado')
      .select('partida_id, partidas!inner(torcedor_id)')
      .eq('desafio_id', data.id)
      .eq('partidas.torcedor_id', uid)
      .limit(1);
    if (eJ) throw eJ;
    if (jogadas?.length) throw new ErroHttp(409, 'desafio_ja_jogado');
    desafio = data;
  }

  let escada: VagaServidor[];
  if (desafio) {
    // Mesmas 8 perguntas, na mesma ordem (a regra dos 30 dias não vale no desafio).
    const { data, error } = await sb.from('perguntas').select('id, clube, degrau').in('id', desafio.perguntas);
    if (error) throw error;
    const porId = new Map((data ?? []).map((p) => [p.id, p]));
    escada = desafio.perguntas.map((id) => {
      const p = porId.get(id);
      if (!p) throw new ErroHttp(410, 'desafio_sem_perguntas');
      return { degrau: p.degrau as Degrau, origem: p.clube ?? GERAL, perguntaId: id };
    });
    // O degrau da escada é o da posição, mesmo que a pergunta tenha sido recalibrada depois.
    escada.forEach((v, i) => (v.degrau = ([1, 1, 2, 2, 3, 3, 4, 4] as const)[i]));
  } else {
    const { data: times, error } = await sb.from('times').select('id').eq('oficial', true);
    if (error) throw error;
    const clubes = (times ?? []).map((t) => t.id as string);
    const vagas = montarEscada(clubes, sorteio);
    const usadas = new Set<string>();
    const clubesNaEscada = new Set(vagas.filter((v) => v.origem !== GERAL).map((v) => v.origem));
    // Cada vaga tem um par (degrau, origem) único: dá para sortear as 8 de uma vez.
    const primeiras = await Promise.all(vagas.map((v) => sortearPergunta(sb, uid, v.degrau, v.origem, usadas, cfg)));
    escada = [];
    for (const [i, v] of vagas.entries()) {
      let id = primeiras[i];
      let origem = v.origem;
      // Clube sem pergunta neste degrau (banco ainda incompleto): outro clube, depois uma geral.
      if (!id && v.origem !== GERAL) {
        for (const c of embaralhar(clubes.filter((c) => !clubesNaEscada.has(c)), sorteio)) {
          id = await sortearPergunta(sb, uid, v.degrau, c, usadas, cfg);
          if (id) {
            origem = c;
            clubesNaEscada.add(c);
            break;
          }
        }
      }
      if (!id) {
        id = await sortearPergunta(sb, uid, v.degrau, GERAL, usadas, cfg);
        origem = GERAL;
      }
      if (!id) throw new ErroHttp(503, 'sem_perguntas');
      usadas.add(id);
      escada.push({ degrau: v.degrau, origem, perguntaId: id });
    }
  }

  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + cfg.validadeMin * 60_000);
  const { data: partida, error: eP } = await sb
    .from('partidas')
    .insert({
      torcedor_id: uid,
      minigame: 'prova',
      amistoso: cfg.amistoso,
      modo: desafio ? 'desafio' : 'normal',
      // A prova não usa semente nem dificuldade (as colunas são dos pênaltis).
      semente: sortear(0x1_0000_0000),
      dificuldade: 0,
      criada_em: agora.toISOString(),
      expira_em: expiraEm.toISOString(),
    })
    .select('id, criada_em, expira_em, fechada_em, amistoso')
    .single();
  if (eP) throw eP;

  const { data: est, error: eE } = await sb
    .from('prova_estado')
    .insert({ partida_id: partida.id, desafio_id: desafio?.id ?? null, escada, fase: 'aguardando' })
    .select('*')
    .single();
  if (eE) throw eE;

  const pergunta = await enviar(sb, uid, est as Estado, cfg);
  return {
    partidaId: partida.id,
    amistoso: partida.amistoso,
    total: PERGUNTAS,
    desafio: desafio && {
      id: desafio.id,
      timeId: desafio.time_id,
      apelido: desafio.apelido,
      pontos: desafio.pontos,
      escada: desafio.escada,
      resumo: desafio.resumo,
    },
    pergunta,
  };
}

async function proxima(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>, cfg: Cfg) {
  const { partida, est } = await carregar(sb, uid, corpo.partidaId);
  if (new Date() > new Date(partida.expira_em)) return { fim: await encerrarLargada(sb, uid, partida, est, cfg) };
  if (est.fase !== 'aguardando') throw new ErroHttp(409, 'fora_de_hora');
  // Parar ou seguir é decidido antes de a pergunta ser enviada.
  if (precisaDecidir(est.atual)) {
    if (corpo.decisao === 'parar') {
      await salvar(sb, est, { fase: 'fim' });
      return { fim: await fechar(sb, uid, partida, est, 'parou', cfg) };
    }
    if (corpo.decisao !== 'seguir') throw new ErroHttp(400, 'falta_decisao');
  }
  return { pergunta: await enviar(sb, uid, est, cfg) };
}

async function responder(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>, cfg: Cfg) {
  const { partida, est } = await carregar(sb, uid, corpo.partidaId);
  if (est.fase !== 'respondendo' || !est.alternativas || !est.enviada_em) throw new ErroHttp(409, 'fora_de_hora');
  const ms = Math.max(0, Date.now() - new Date(est.enviada_em).getTime());

  let escolha: number | null = null;
  if (corpo.alternativa !== null && corpo.alternativa !== undefined) {
    const alt = est.alternativas.find((a) => a.id === corpo.alternativa);
    if (!alt) throw new ErroHttp(400, 'alternativa_invalida');
    escolha = alt.idx;
  }
  const tempo = escolha === null || ms > cfg.limiteMs;
  const acertou = !tempo && escolha === 0;
  const desfecho: Desfecho = tempo ? 'tempo' : acertou ? 'acertou' : 'errou';
  const vaga = est.escada[est.atual];
  const passos = [...est.passos, { degrau: vaga.degrau, desfecho, ajuda: est.ajuda_na_atual, ms: Math.min(ms, cfg.limiteMs) }];
  // Acaba no 3º erro (ou tempo) ou depois da 8ª pergunta; um erro só não encerra.
  const acabou = fimDosPassos(passos) !== null;
  const certa = est.alternativas.find((a) => a.idx === 0)!.id;
  const ajuda = est.ajuda_na_atual;

  await salvar(sb, est, {
    passos,
    fase: acabou ? 'fim' : 'aguardando',
    atual: acabou ? est.atual : est.atual + 1,
    alternativas: null,
    removidas: [],
    ajuda_na_atual: false,
  });

  const { error: eR } = await sb.from('prova_respostas').insert({
    pergunta_id: vaga.perguntaId,
    torcedor_id: uid,
    partida_id: partida.id,
    degrau: vaga.degrau,
    escolha,
    acertou,
    ms: Math.min(ms, 600_000),
    ajuda,
  });
  if (eR) throw eR;

  return {
    desfecho,
    certa,
    escolhida: typeof corpo.alternativa === 'string' ? corpo.alternativa : null,
    levar: pontosDosPassos(passos),
    erros: contarErros(passos),
    proxima: acabou ? null : { numero: est.atual + 1, decidir: precisaDecidir(est.atual) },
    fim: acabou ? await fechar(sb, uid, partida, est, null, cfg) : null,
  };
}

async function ajuda(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>, cfg: Cfg) {
  const { est } = await carregar(sb, uid, corpo.partidaId);
  const tipo = corpo.tipo as Ajuda;
  if (!AJUDAS.includes(tipo)) throw new ErroHttp(400, 'ajuda_invalida');
  if (est.fase !== 'respondendo' || !est.alternativas || !est.enviada_em) throw new ErroHttp(409, 'fora_de_hora');
  if (est.ajudas[tipo] !== undefined) throw new ErroHttp(409, 'ajuda_usada');
  if (Date.now() - new Date(est.enviada_em).getTime() > cfg.limiteMs) throw new ErroHttp(409, 'tempo_esgotado');
  const usadas = { ...est.ajudas, [tipo]: est.atual };

  const tirar = async (quantas: number) => {
    const restantes = est.alternativas!.filter((a) => !est.removidas.includes(a.id));
    const n = quantasTirar(quantas, restantes.length);
    if (!n) throw new ErroHttp(409, 'ajuda_indisponivel');
    const erradas = embaralhar(restantes.filter((a) => a.idx !== 0), sorteio).slice(0, n).map((a) => a.id);
    await salvar(sb, est, { removidas: [...est.removidas, ...erradas], ajudas: usadas, ajuda_na_atual: true });
    return erradas;
  };

  if (tipo === 'tira_duas') return { tipo, removidas: await tirar(2) };

  if (tipo === 'arquibancada') {
    const vaga = est.escada[est.atual];
    const { data, error } = await sb.rpc('prova_arquibancada', { p_pergunta: vaga.perguntaId });
    if (error) throw error;
    const contagens = [0, 0, 0, 0];
    for (const l of (data ?? []) as { escolha: number; n: number }[]) contagens[l.escolha] = l.n;
    const total = contagens.reduce((a, b) => a + b, 0);
    // Com pouca gente, a Arquibancada vira "tira uma".
    if (total < cfg.minArquibancada) return { tipo, removidas: await tirar(1), tiraUma: true };
    const pct = porcentagens(contagens);
    await salvar(sb, est, { ajudas: usadas, ajuda_na_atual: true });
    return { tipo, porcentagens: Object.fromEntries(est.alternativas.map((a) => [a.id, pct[a.idx]])), respostas: total };
  }

  // Troca: outra pergunta do mesmo degrau (do mesmo clube, ou geral), com 15 s cheios.
  const vaga = est.escada[est.atual];
  const naPartida = new Set(est.escada.flatMap((v) => [v.perguntaId, v.trocadaDe ?? '']));
  let novaId = await sortearPergunta(sb, uid, vaga.degrau, vaga.origem, naPartida, cfg);
  if (!novaId && vaga.origem !== GERAL) novaId = await sortearPergunta(sb, uid, vaga.degrau, GERAL, naPartida, cfg);
  if (!novaId) throw new ErroHttp(409, 'ajuda_indisponivel');
  const escada = est.escada.map((v, i) => (i === est.atual ? { ...v, perguntaId: novaId!, trocadaDe: v.perguntaId } : v));
  est.escada = escada;
  return { tipo, pergunta: await enviar(sb, uid, est, cfg, { escada, ajudas: usadas, ajuda_na_atual: true }) };
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  const cfg = lerConfig(await configDeteccao(sb));
  switch (corpo.acao) {
    case 'nova':
      return nova(sb, uid, corpo, cfg);
    case 'proxima':
      return proxima(sb, uid, corpo, cfg);
    case 'responder':
      return responder(sb, uid, corpo, cfg);
    case 'ajuda':
      return ajuda(sb, uid, corpo, cfg);
    default:
      throw new ErroHttp(400, 'acao_invalida');
  }
});
