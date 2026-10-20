// Time do Dia no servidor (docs/jogo.md, seção 7.2). O clube do dia é sorteado e guardado só aqui
// (tabela dia_sorteio, que o celular não lê). O celular manda o clube chutado e recebe a linha de
// pistas; o nome do secreto só sai quando a partida termina. Uma partida por dia por torcedor.
// Corpo: { acao, ... }
//   estado {}                       o dia de hoje: número, lista de clubes, minhas tentativas, sequência
//   tentar { dia, clube }           grava a tentativa e devolve o estado com a linha nova

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { admin, configDeteccao, ErroHttp, lerCorpo, servir, sortear, usuario } from '../_shared/comum.ts';
import {
  TENTATIVAS,
  acabou,
  diaAnterior,
  numeroDoDia,
  pontosDoDia,
  proximoClube,
  sequenciaDeDias,
  suspeitoNoDia,
  tentar as compararTentativa,
  type ClubeDoDia,
  type Cor,
  type Divisao,
  type DiaSorteado,
  type Tentativa,
} from '../_shared/jogo/timeDoDia.ts';
import { diaBrasilia } from '../_shared/tempo.ts';

/** Partida começada antes da virada aceita tentativa até 00h05 (mesma tolerância das partidas). */
const TOLERANCIA_MS = 5 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
/** Meia-noite de Brasília (UTC−3 fixo) do dia "AAAA-MM-DD". */
const inicioDoDia = (dia: string) => Date.parse(`${dia}T00:00:00-03:00`);

interface LinhaClube {
  id: string;
  nome: string;
  uf: string;
  fundacao: number;
  titulos: number;
  divisao: Divisao;
  cor1: Cor;
  cor2: Cor;
  capital: boolean;
  status: 'ativa' | 'aposentada';
}

interface Clubes {
  /** Todos, inclusive aposentados (o secreto de um dia passado pode ter saído da lista). */
  todos: Map<string, ClubeDoDia>;
  /** Só os ativos: entram na lista de chutes e no sorteio. */
  ativos: Map<string, ClubeDoDia>;
}

interface Partida {
  dia: string;
  tentativas: string[];
  acertou: boolean;
  pontos: number;
  amistoso: boolean;
  fechada_em: string | null;
  versao: number;
}

async function lerClubes(sb: SupabaseClient): Promise<Clubes> {
  const { data, error } = await sb
    .from('dia_clubes')
    .select('id, nome, uf, fundacao, titulos, divisao, cor1, cor2, capital, status');
  if (error) throw error;
  const todos = new Map<string, ClubeDoDia>();
  const ativos = new Map<string, ClubeDoDia>();
  for (const l of (data ?? []) as LinhaClube[]) {
    const c: ClubeDoDia = {
      id: l.id,
      nome: l.nome,
      uf: l.uf,
      fundacao: l.fundacao,
      titulos: l.titulos,
      divisao: l.divisao,
      cores: [l.cor1, l.cor2],
      capital: l.capital,
    };
    todos.set(c.id, c);
    if (l.status === 'ativa') ativos.set(c.id, c);
  }
  return { todos, ativos };
}

/** O clube do dia; sorteia e grava no 1º acesso (só para hoje). null = ainda não há clubes. */
async function clubeDoDia(sb: SupabaseClient, dia: string, clubes: Clubes, sortearSeFaltar: boolean): Promise<string | null> {
  const ler = async () => {
    const { data, error } = await sb.from('dia_sorteio').select('clube_id').eq('dia', dia).maybeSingle();
    if (error) throw error;
    return (data?.clube_id as string | undefined) ?? null;
  };
  const ja = await ler();
  if (ja || !sortearSeFaltar || !clubes.ativos.size) return ja;

  // Histórico mais recente primeiro; um ciclo nunca passa do número de clubes já cadastrados.
  const { data, error } = await sb
    .from('dia_sorteio')
    .select('clube_id, ciclo')
    .lt('dia', dia)
    .order('dia', { ascending: false })
    .limit(clubes.todos.size + 10);
  if (error) throw error;
  const historico: DiaSorteado[] = ((data ?? []) as { clube_id: string; ciclo: number }[])
    .reverse()
    .map((h) => ({ clube: h.clube_id, ciclo: h.ciclo }));
  const proximo = proximoClube([...clubes.ativos.keys()], historico, sortear);
  if (!proximo) return null;
  // Dois acessos ao mesmo tempo na virada: vale o primeiro que gravou.
  const { error: eIns } = await sb
    .from('dia_sorteio')
    .upsert({ dia, ciclo: proximo.ciclo, clube_id: proximo.clube }, { onConflict: 'dia', ignoreDuplicates: true });
  if (eIns) throw eIns;
  return ler();
}

async function primeiroDia(sb: SupabaseClient): Promise<string | null> {
  const { data, error } = await sb.from('dia_sorteio').select('dia').order('dia', { ascending: true }).limit(1);
  if (error) throw error;
  return (data?.[0]?.dia as string | undefined) ?? null;
}

async function minhaPartida(sb: SupabaseClient, uid: string, dia: string): Promise<Partida | null> {
  const { data, error } = await sb
    .from('dia_partidas')
    .select('dia, tentativas, acertou, pontos, amistoso, fechada_em, versao')
    .eq('torcedor_id', uid)
    .eq('dia', dia)
    .maybeSingle();
  if (error) throw error;
  return (data as Partida | null) ?? null;
}

/** Dias jogados até o fim (para a sequência e a detecção), do mais recente para trás. */
async function meusDias(sb: SupabaseClient, uid: string): Promise<{ dia: string; acertouNa: number | null }[]> {
  const { data, error } = await sb
    .from('dia_partidas')
    .select('dia, tentativas, acertou')
    .eq('torcedor_id', uid)
    .not('fechada_em', 'is', null)
    .order('dia', { ascending: false })
    .limit(400);
  if (error) throw error;
  return ((data ?? []) as { dia: string; tentativas: string[]; acertou: boolean }[]).map((p) => ({
    dia: p.dia,
    acertouNa: p.acertou ? p.tentativas.length : null,
  }));
}

function linhas(partida: Partida | null, secreto: ClubeDoDia, clubes: Clubes): Tentativa[] {
  return (partida?.tentativas ?? [])
    .map((id) => clubes.todos.get(id))
    .filter((c): c is ClubeDoDia => !!c)
    .map((c) => compararTentativa(c, secreto));
}

async function montarEstado(
  sb: SupabaseClient,
  uid: string,
  dia: string,
  secretoId: string,
  partida: Partida | null,
  clubes: Clubes,
  amistoso: boolean,
) {
  const secreto = clubes.todos.get(secretoId);
  if (!secreto) throw new Error(`clube do dia ${secretoId} não está em dia_clubes`);
  const fim = !!partida?.fechada_em;
  const primeiro = (await primeiroDia(sb)) ?? dia;
  const dias = await meusDias(sb, uid);
  return {
    pronto: true,
    dia,
    numero: numeroDoDia(primeiro, dia),
    amistoso: partida?.amistoso ?? amistoso,
    tentativas: linhas(partida, secreto, clubes),
    maxTentativas: TENTATIVAS,
    fim,
    acertou: !!partida?.acertou,
    pontos: partida?.pontos ?? 0,
    // O nome do secreto só sai quando a partida termina.
    secreto: fim ? { id: secreto.id, nome: secreto.nome } : null,
    sequencia: sequenciaDeDias(
      dias.map((d) => d.dia),
      diaBrasilia(new Date()),
    ),
    proximoEm: new Date(inicioDoDia(diaBrasilia(new Date())) + DIA_MS).toISOString(),
  };
}

async function estado(sb: SupabaseClient, uid: string, amistoso: boolean) {
  const dia = diaBrasilia(new Date());
  const clubes = await lerClubes(sb);
  const secretoId = await clubeDoDia(sb, dia, clubes, true);
  if (!secretoId) return { pronto: false };
  const partida = await minhaPartida(sb, uid, dia);
  const lista = [...clubes.ativos.values()]
    .map((c) => ({ id: c.id, nome: c.nome, uf: c.uf }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return { ...(await montarEstado(sb, uid, dia, secretoId, partida, clubes, amistoso)), clubes: lista };
}

async function tentar(sb: SupabaseClient, uid: string, corpo: Record<string, unknown>, amistoso: boolean) {
  const { dia, clube } = corpo;
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new ErroHttp(400, 'sem_dia');
  if (typeof clube !== 'string') throw new ErroHttp(400, 'clube_invalido');

  // O dia é sempre o do servidor: hoje, ou ontem até 00h05.
  const agora = Date.now();
  const hoje = diaBrasilia(new Date(agora));
  const valeOntem = dia === diaAnterior(hoje) && agora - inicioDoDia(hoje) < TOLERANCIA_MS;
  if (dia !== hoje && !valeOntem) throw new ErroHttp(409, 'dia_acabou');

  const { data: torcedor, error: eT } = await sb.from('torcedores').select('time_id').eq('id', uid).maybeSingle();
  if (eT) throw eT;
  if (!torcedor) throw new ErroHttp(409, 'sem_time');

  const clubes = await lerClubes(sb);
  const chute = clubes.ativos.get(clube);
  if (!chute) throw new ErroHttp(400, 'clube_invalido');
  const secretoId = await clubeDoDia(sb, dia, clubes, dia === hoje);
  if (!secretoId) throw new ErroHttp(503, 'sem_clubes');

  let partida = await minhaPartida(sb, uid, dia);
  if (!partida) {
    const { error } = await sb
      .from('dia_partidas')
      .upsert(
        { torcedor_id: uid, dia, time_id: torcedor.time_id, amistoso },
        { onConflict: 'torcedor_id,dia', ignoreDuplicates: true },
      );
    if (error) throw error;
    partida = await minhaPartida(sb, uid, dia);
    if (!partida) throw new Error('partida do dia não foi criada');
  }
  if (partida.fechada_em) throw new ErroHttp(409, 'dia_jogado');
  if (partida.tentativas.includes(clube)) throw new ErroHttp(409, 'clube_repetido');

  const tentativas = [...partida.tentativas, clube];
  const acertou = clube === secretoId;
  const fim = acabou(tentativas.length, acertou);
  const mudancas: Record<string, unknown> = { tentativas, versao: partida.versao + 1 };
  if (fim) {
    mudancas.acertou = acertou;
    mudancas.pontos = acertou ? pontosDoDia(tentativas.length) : 0;
    mudancas.fechada_em = new Date(agora).toISOString();
    if (acertou && tentativas.length === 1) {
      const historico = [...(await meusDias(sb, uid)), { dia, acertouNa: 1 }];
      mudancas.sob_suspeita = suspeitoNoDia(historico, dia);
    }
  }
  // Trava otimista: clique duplo ou duas abas gravam uma tentativa só.
  const { data: gravada, error: eUp } = await sb
    .from('dia_partidas')
    .update(mudancas)
    .eq('torcedor_id', uid)
    .eq('dia', dia)
    .eq('versao', partida.versao)
    .select('dia, tentativas, acertou, pontos, amistoso, fechada_em, versao')
    .maybeSingle();
  if (eUp) throw eUp;
  if (!gravada) throw new ErroHttp(409, 'conflito');

  return montarEstado(sb, uid, dia, secretoId, gravada as Partida, clubes, amistoso);
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const corpo = await lerCorpo(req);
  const cfg = await configDeteccao(sb);
  const amistoso = (cfg.dia_amistoso ?? 1) !== 0;
  switch (corpo.acao) {
    case 'estado':
      return estado(sb, uid, amistoso);
    case 'tentar':
      return tentar(sb, uid, corpo, amistoso);
    default:
      throw new ErroHttp(400, 'acao_invalida');
  }
});
