// Conversa com o Supabase: login anônimo, torcedor, partidas, desafios e ranking.
// O supabase-js só é baixado quando precisa (a tela inicial abre sem esperar por ele).
// Sem internet ou com o Supabase fora do ar, tudo aqui falha rápido e o jogo segue "sem valer pontos".

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { opcoesComCaptcha, tokenCaptcha } from './captcha';
import { prefs } from '../estado';
import type { GestoCobranca, Gestos, ResultadoCobranca, ResultadoDefesa, ResultadoPartida } from '../jogo/penaltis.ts';
import type { Lance, Passo as PassoPenalti } from '../jogo/penaltisLance.ts';
import type { Ajuda, Degrau, Desfecho, Fim, Passo, PontosProva } from '../jogo/prova.ts';
import type { Desempenho, PosicaoSemana } from '../jogo/posicao.ts';
import type { Tentativa } from '../jogo/timeDoDia.ts';
import type { Carreira } from '../jogo/carreira.ts';
import type { FaixaEtaria } from '../jogo/faixaEtaria.ts';

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
// Folga para a função "acordar" depois de um tempo parada (partida fria) em rede de celular.
const TEMPO_LIMITE_MS = 15000;

let cliente: Promise<SupabaseClient> | null = null;

export class ErroServidor extends Error {
  constructor(public codigo: string) {
    super(codigo);
  }
}

export function comTempoLimite<T>(p: PromiseLike<T>, ms = TEMPO_LIMITE_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, falha) => setTimeout(() => falha(new ErroServidor('tempo_esgotado')), ms)),
  ]);
}

export async function supabase(): Promise<SupabaseClient> {
  if (!URL_SUPABASE || !CHAVE_PUBLICA) throw new ErroServidor('sem_configuracao');
  cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_SUPABASE, CHAVE_PUBLICA, { auth: { persistSession: true, autoRefreshToken: true } }),
  );
  return cliente;
}

let sessaoConferida: Promise<string> | null = null;

/**
 * Garante uma sessão (login anônimo na primeira vez; depois a sessão fica salva no aparelho).
 * Uma vez por carregamento confere no servidor se o usuário ainda existe: se ele foi apagado
 * (limpeza de testes, usuários anônimos inativos), sai e faz um login anônimo novo.
 */
export function garantirSessao(): Promise<string> {
  sessaoConferida ??= (async () => {
    const sb = await supabase();
    const { data } = await comTempoLimite(sb.auth.getSession());
    if (data.session) {
      const { data: atual, error } = await comTempoLimite(sb.auth.getUser());
      if (!error && atual.user) return atual.user.id;
      // Sessão salva de um usuário que não existe mais: limpa e entra de novo.
      if (error && error.status && error.status >= 400 && error.status < 500) {
        await sb.auth.signOut({ scope: 'local' });
        prefs.set({ sincronizado: undefined, faixaSincronizada: undefined });
      } else {
        throw new ErroServidor('sem_conexao');
      }
    }
    // CAPTCHA (desligado sem a chave do site): só aqui, no primeiro login do aparelho.
    let token: string | undefined;
    try {
      token = await tokenCaptcha();
    } catch {
      throw new ErroServidor('captcha');
    }
    const { data: novo, error } = await comTempoLimite(sb.auth.signInAnonymously({ options: opcoesComCaptcha(token) }));
    if (error || !novo.user) throw new ErroServidor(error?.code ?? 'login_falhou');
    return novo.user.id;
  })().catch((e) => {
    sessaoConferida = null; // tenta de novo na próxima chamada (ex.: voltou a internet)
    throw e;
  });
  return sessaoConferida;
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

/** Grava a faixa da triagem. False quando o torcedor ainda não existe (falta escolher o time). */
export async function salvarFaixaEtaria(faixa: FaixaEtaria): Promise<boolean> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('salvar_faixa_etaria', { p_faixa: faixa }));
  if (error) throw new ErroServidor('falha');
  return data === true;
}

/**
 * Apaga o usuário anônimo e tudo ligado a ele (docs/jogo.md, seção 13). Sem sessão no aparelho não há
 * nada no servidor, e não cria login só para isso. A limpeza do aparelho fica com a tela.
 */
export async function apagarMeusDados(): Promise<void> {
  const sb = await supabase();
  const { data } = await comTempoLimite(sb.auth.getSession());
  if (data.session) {
    const { error } = await comTempoLimite(sb.rpc('apagar_meus_dados'));
    if (error) throw new ErroServidor(error.message.includes('conta_nao_anonima') ? 'conta_nao_anonima' : 'falha');
    await sb.auth.signOut({ scope: 'local' });
  }
  sessaoConferida = null;
}

/** Conta um clique no "Seja sócio", sem login e sem esperar resposta: nunca segura a saída para o site. */
export function contarCliqueSocio(clube: string): void {
  supabase()
    .then((sb) => comTempoLimite(sb.rpc('contar_clique_socio', { p_clube: clube })))
    .catch(() => undefined);
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
  /** Só do servidor antigo: no lance a lance as cobranças gravadas ficam no servidor. */
  cobrancas?: GestoCobranca[];
}

export interface PartidaDoServidor {
  partidaId: string;
  /** Servidor antigo (antes do lance a lance): a semente vinha para o celular. */
  semente?: number;
  /** Lance a lance: cada lance vai para lancePenalti e o resultado volta de lá. */
  lanceALance?: boolean;
  proximo?: PassoPenalti;
  dificuldade: number;
  expiraEm: string;
  desafio: DesafioRecebido | null;
}

/** `disputa`: id da disputa histórica escolhida; só marca a partida, não muda nada do jogo. */
export function novaPartida(desafio?: string, disputa?: string): Promise<PartidaDoServidor> {
  return chamar('nova-partida', { ...(desafio ? { desafio } : {}), ...(disputa ? { disputa } : {}) });
}

export interface LanceDoServidor {
  cobranca: ResultadoCobranca | null;
  defesa: ResultadoDefesa | null;
  proximo: PassoPenalti;
}

/** Um lance dos pênaltis: o servidor resolve com a semente que só ele conhece. */
export function lancePenalti(partidaId: string, lance: Lance): Promise<LanceDoServidor> {
  return chamar('lance-penalti', { partidaId, lance: lance as unknown as Record<string, unknown> });
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
  /** Posição nos pênaltis na semana e recorde pessoal (null se o servidor não conseguiu ler). */
  desempenho: Desempenho | null;
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

// ---------------------------------------------------------------------------
// Prova de Boleiro: uma pergunta por vez, pela função "prova" (docs/jogo.md, seção 7.1).
// ---------------------------------------------------------------------------

export interface PerguntaProva {
  numero: number;
  degrau: Degrau;
  /** Id do clube da pergunta ou "geral". */
  clube: string;
  texto: string;
  alternativas: { id: string; texto: string }[];
  segundos: number;
  /** Pontos garantidos antes desta pergunta. */
  levar: number;
  /** Erros e tempos esgotados até aqui (o 3º encerra). */
  erros: number;
  ajudasUsadas: Ajuda[];
}

export interface DesafioProvaRecebido {
  id: string;
  timeId: string;
  apelido: string | null;
  pontos: number;
  escada: string;
  resumo: string;
}

export interface FimProva {
  fim: Fim;
  pontos: PontosProva;
  escada: string;
  resumo: string;
  passos: Passo[];
  contaNoRanking: boolean;
  sobSuspeita: boolean;
  semana: string;
  desempenho: Desempenho | null;
  desafio: { codigo: string } | null;
  comparacao: {
    desafiante: string | null;
    pontosDesafiante: number;
    escadaDesafiante: string;
    resumoDesafiante: string;
    venceu: boolean;
  } | null;
}

export interface RespostaProva {
  desfecho: Desfecho;
  certa: string;
  escolhida: string | null;
  levar: number;
  erros: number;
  proxima: { numero: number; decidir: boolean } | null;
  fim: FimProva | null;
}

export interface AjudaProva {
  tipo: Ajuda;
  removidas?: string[];
  tiraUma?: boolean;
  porcentagens?: Record<string, number>;
  respostas?: number;
  pergunta?: PerguntaProva;
}

export function novaProva(desafio?: string): Promise<{
  partidaId: string;
  total: number;
  desafio: DesafioProvaRecebido | null;
  pergunta: PerguntaProva;
}> {
  return chamar('prova', desafio ? { acao: 'nova', desafio } : { acao: 'nova' });
}

export function proximaPergunta(
  partidaId: string,
  decisao?: 'seguir' | 'parar',
): Promise<{ pergunta?: PerguntaProva; fim?: FimProva }> {
  return chamar('prova', { acao: 'proxima', partidaId, decisao });
}

/** `alternativa` null = o tempo acabou no celular. */
export function responderPergunta(partidaId: string, alternativa: string | null): Promise<RespostaProva> {
  return chamar('prova', { acao: 'responder', partidaId, alternativa });
}

export function pedirAjuda(partidaId: string, tipo: Ajuda): Promise<AjudaProva> {
  return chamar('prova', { acao: 'ajuda', partidaId, tipo });
}

export interface ResumoDesafioProva {
  id: string;
  time_id: string;
  apelido: string | null;
  pontos: number;
  escada: string;
  resumo: string;
}

/** Resumo do desafio da prova para a tela inicial (sem as perguntas). */
export async function verDesafioProva(id: string): Promise<ResumoDesafioProva | null> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('ver_prova_desafio', { p_id: id }));
  if (error) throw new ErroServidor('falha');
  return ((data as ResumoDesafioProva[] | null) ?? [])[0] ?? null;
}

// ---------- Time do Dia (função time-do-dia) ----------

export interface ClubeDaLista {
  id: string;
  nome: string;
  uf: string;
}

export interface EstadoDoDia {
  pronto: true;
  dia: string;
  numero: number;
  tentativas: Tentativa[];
  maxTentativas: number;
  fim: boolean;
  acertou: boolean;
  pontos: number;
  /** Só quando a partida terminou. */
  secreto: { id: string; nome: string } | null;
  /** Posição no Time do Dia daquele dia e recorde pessoal; só depois do fim. */
  desempenho: Desempenho | null;
  /** Hora (ISO) em que entra o próximo clube. */
  proximoEm: string;
  /** Só na ação "estado". */
  clubes?: ClubeDaLista[];
}

export type RespostaDoDia = EstadoDoDia | { pronto: false };

export function estadoDoDia(): Promise<RespostaDoDia> {
  return chamar('time-do-dia', { acao: 'estado' });
}

export function tentarClube(dia: string, clube: string): Promise<EstadoDoDia> {
  return chamar('time-do-dia', { acao: 'tentar', dia, clube });
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

/** Minha posição geral na semana, somando todos os jogos e todos os times ("3º de 14"). */
export async function minhaPosicaoSemana(semana: string): Promise<PosicaoSemana | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('minha_posicao_semana', { p_semana: semana }));
  if (error) throw new ErroServidor('falha');
  return ((data ?? []) as PosicaoSemana[])[0] ?? null;
}

export type MinigameDoRecorde = 'penaltis' | 'prova' | 'dia' | 'crava';

/** Meus recordes pessoais, um por minigame (null antes da primeira partida que vale). */
export async function meusRecordes(): Promise<Partial<Record<MinigameDoRecorde, number | null>>> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('meus_recordes'));
  if (error) throw new ErroServidor('falha');
  return Object.fromEntries(((data ?? []) as { minigame: MinigameDoRecorde; recorde: number | null }[]).map((l) => [l.minigame, l.recorde]));
}

/** Minha posição num minigame: pênaltis e Prova na semana de hoje, Time do Dia no dia de hoje. */
export async function minhaPosicaoMinigame(minigame: 'penaltis' | 'prova' | 'dia'): Promise<PosicaoSemana | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('minha_posicao_minigame', { p_minigame: minigame }));
  if (error) throw new ErroServidor('falha');
  return ((data ?? []) as PosicaoSemana[])[0] ?? null;
}

/** Minha carreira (XP, partidas de hoje e bônus recente). Só a própria. */
export async function minhaCarreira(): Promise<Carreira | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('minha_carreira'));
  if (error) throw new ErroServidor('falha');
  const l = ((data ?? []) as {
    xp: number;
    partidas_hoje: number;
    bonus_tipo: 'dia' | 'semana' | null;
    bonus_referencia: string | null;
  }[])[0];
  if (!l) return null;
  return {
    xp: l.xp,
    partidasHoje: l.partidas_hoje,
    bonus: l.bonus_tipo && l.bonus_referencia ? { tipo: l.bonus_tipo, referencia: l.bonus_referencia } : null,
  };
}

/** Quantas partidas fechei hoje, somando os minigames de partida (para o "hoje contam mais N partidas"). */
export async function partidasFechadasHoje(dia: string): Promise<number> {
  await garantirSessao();
  const sb = await supabase();
  // Teto somado entre os minigames de partida; amistoso não ocupa vaga.
  const { count, error } = await comTempoLimite(
    sb
      .from('partidas')
      .select('id', { count: 'exact', head: true })
      .eq('dia', dia)
      .eq('amistoso', false)
      .not('fechada_em', 'is', null),
  );
  if (error) throw new ErroServidor('falha');
  return count ?? 0;
}

export type TipoFeedback = 'bug' | 'ideia' | 'outro';

/** Feedback ou relato de bug. Só administradores leem; até 5 por hora. */
export async function enviarFeedback(tipo: TipoFeedback, texto: string, tela: string): Promise<void> {
  await garantirSessao();
  const sb = await supabase();
  const { error } = await comTempoLimite(
    sb.from('feedbacks').insert({ tipo, texto: texto.trim(), tela, aparelho: navigator.userAgent.slice(0, 300) }),
  );
  if (error) throw new ErroServidor(error.code === '42501' ? 'muitos' : 'falha');
}
