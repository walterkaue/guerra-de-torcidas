// Conversa com o Supabase: login anônimo, torcedor, partidas, desafios e ranking.
// O supabase-js só é baixado quando precisa (a tela inicial abre sem esperar por ele).
// Sem internet ou com o Supabase fora do ar, tudo aqui falha rápido e o jogo segue "sem valer pontos".

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { GestoCobranca, Gestos, ResultadoPartida } from '../jogo/penaltis.ts';

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const TEMPO_LIMITE_MS = 8000;

let cliente: Promise<SupabaseClient> | null = null;

export class ErroServidor extends Error {
  constructor(public codigo: string) {
    super(codigo);
  }
}

function comTempoLimite<T>(p: PromiseLike<T>, ms = TEMPO_LIMITE_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, falha) => setTimeout(() => falha(new ErroServidor('tempo_esgotado')), ms)),
  ]);
}

async function supabase(): Promise<SupabaseClient> {
  if (!URL_SUPABASE || !CHAVE_PUBLICA) throw new ErroServidor('sem_configuracao');
  cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_SUPABASE, CHAVE_PUBLICA, { auth: { persistSession: true, autoRefreshToken: true } }),
  );
  return cliente;
}

/** Garante uma sessão (login anônimo na primeira vez; depois a sessão fica salva no aparelho). */
export async function garantirSessao(): Promise<string> {
  const sb = await supabase();
  const { data } = await comTempoLimite(sb.auth.getSession());
  if (data.session) return data.session.user.id;
  const { data: novo, error } = await comTempoLimite(sb.auth.signInAnonymously());
  if (error || !novo.user) throw new ErroServidor(error?.code ?? 'login_falhou');
  return novo.user.id;
}

/** Grava time e apelido no servidor (o filtro de palavras roda lá). */
export async function salvarTorcedor(timeId: string, apelido?: string): Promise<void> {
  await garantirSessao();
  const sb = await supabase();
  const { error } = await comTempoLimite(sb.rpc('salvar_torcedor', { p_time: timeId, p_apelido: apelido ?? null }));
  if (error) {
    const codigo = ['apelido_bloqueado', 'apelido_longo', 'time_invalido'].find((c) => error.message.includes(c));
    throw new ErroServidor(codigo ?? 'falha');
  }
}

async function chamar<T>(funcao: string, corpo: Record<string, unknown>): Promise<T> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.functions.invoke(funcao, { body: corpo }));
  if (error) {
    let codigo = 'falha';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) codigo = ((await ctx.json()) as { erro?: string }).erro ?? codigo;
    } catch {
      // resposta sem corpo
    }
    throw new ErroServidor(codigo);
  }
  return data as T;
}

export interface DesafioRecebido {
  id: string;
  timeId: string;
  apelido: string | null;
  golsJogador: number;
  golsMaquina: number;
  pontos: number;
  cobrancas: GestoCobranca[];
}

export interface PartidaDoServidor {
  partidaId: string;
  semente: number;
  dificuldade: number;
  expiraEm: string;
  desafio: DesafioRecebido | null;
}

export function novaPartida(desafio?: string): Promise<PartidaDoServidor> {
  return chamar('nova-partida', desafio ? { desafio } : {});
}

export interface PosicaoRanking {
  posicao_campeao: number;
  posicao_soma: number;
  media30: number;
  soma: number;
}

export interface FechamentoDoServidor {
  resultado: ResultadoPartida;
  numeroNarrador: number | null;
  semana: string;
  contaNoRanking: boolean;
  sobSuspeita: boolean;
  ranking: { antes: PosicaoRanking | null; depois: PosicaoRanking | null };
  desafio: { codigo: string } | null;
  comparacao: {
    desafiante: string | null;
    pontosDesafiante: number;
    golsJogadorDesafiante: number;
    golsMaquinaDesafiante: number;
    venceu: boolean;
  } | null;
}

export function fecharPartida(partidaId: string, gestos: Gestos): Promise<FechamentoDoServidor> {
  return chamar('fechar-partida', { partidaId, gestos: gestos as unknown as Record<string, unknown> });
}

export interface ResumoDesafio {
  id: string;
  time_id: string;
  apelido: string | null;
  gols_jogador: number;
  gols_maquina: number;
  pontos: number;
}

/** Resumo do desafio para a tela inicial (sem as cobranças). */
export async function verDesafio(id: string): Promise<ResumoDesafio | null> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('ver_desafio', { p_id: id }));
  if (error) throw new ErroServidor('falha');
  return ((data as ResumoDesafio[] | null) ?? [])[0] ?? null;
}

export interface LinhaRanking {
  time_id: string;
  ativos: number;
  soma: number;
  media30: number;
  posicao_campeao: number;
  posicao_soma: number;
}

export async function rankingDaSemana(semana: string): Promise<LinhaRanking[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(
    sb
      .from('ranking_semana')
      .select('time_id, ativos, soma, media30, posicao_campeao, posicao_soma')
      .eq('semana', semana)
      .order('posicao_campeao'),
  );
  if (error) throw new ErroServidor('falha');
  return ((data ?? []) as LinhaRanking[]).map((l) => ({ ...l, media30: Number(l.media30) }));
}

/** Avisa quando o ranking da semana muda (Realtime). Devolve a função para parar de ouvir. */
export async function ouvirRanking(semana: string, aoMudar: () => void): Promise<() => void> {
  const sb = await supabase();
  const canal: RealtimeChannel = sb
    .channel(`ranking-${semana}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_semana', filter: `semana=eq.${semana}` }, aoMudar)
    .subscribe();
  return () => void sb.removeChannel(canal);
}

/** Quantas partidas fechei hoje (para o "hoje contam mais N partidas"). */
export async function partidasFechadasHoje(dia: string): Promise<number> {
  await garantirSessao();
  const sb = await supabase();
  const { count, error } = await comTempoLimite(
    sb.from('partidas').select('id', { count: 'exact', head: true }).eq('dia', dia).not('fechada_em', 'is', null),
  );
  if (error) throw new ErroServidor('falha');
  return count ?? 0;
}
