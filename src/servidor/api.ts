// Conversa com o Supabase: login anônimo, torcedor, partidas, desafios e ranking.
// O supabase-js só é baixado quando precisa (a tela inicial abre sem esperar por ele).
// Sem internet ou com o Supabase fora do ar, tudo aqui falha rápido e o jogo segue "sem valer pontos".

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { opcoesComCaptcha, tokenCaptcha } from './captcha';
import { codigoDaFuncao } from './motivo';
import { esquecerTorcedor, prefs } from '../estado';
import type { Aparelho } from '../jogo/aparelhos.ts';
import type { GestoCobranca, Gestos, ResultadoCobranca, ResultadoDefesa, ResultadoPartida } from '../jogo/penaltis.ts';
import type { Lance, Passo as PassoPenalti } from '../jogo/penaltisLance.ts';
import type { Ajuda, Degrau, Desfecho, Fim, Passo, PontosProva } from '../jogo/prova.ts';
import type { Desempenho, PosicaoSemana } from '../jogo/posicao.ts';
import type { Tentativa } from '../jogo/timeDoDia.ts';
import type { VestimentaDeCampo } from '../telas/bonecoEmCampo';
import type { RespostaLanceDoJogo, RespostaNovaLances } from '../jogo/lancesPartida.ts';
import type { Medalha } from '../jogo/lances.ts';
import type { Carreira } from '../jogo/carreira.ts';
import type { FaixaEtaria } from '../jogo/faixaEtaria.ts';
import type { MeusDados } from '../jogo/meusDados.ts';
import { mesSeguinte, type LinhaTemporada, type Temporada } from '../jogo/temporada.ts';

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
  cliente ??= import('@supabase/supabase-js').then(({ createClient }) => {
    const sb = createClient(URL_SUPABASE, CHAVE_PUBLICA, { auth: { persistSession: true, autoRefreshToken: true } });
    // Sessão encerrada com o jogo aberto (desconectado em outro aparelho, renovação recusada): a próxima chamada
    // confere de novo, em vez de seguir com o id guardado. A saída feita pelo próprio garantirSessao não conta:
    // senão outra chamada no meio começaria um segundo login anônimo.
    sb.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT' && !saindoPorDentro) sessaoConferida = null;
    });
    return sb;
  });
  return cliente;
}

let sessaoConferida: Promise<string> | null = null;
let saindoPorDentro = false;
let aoSairDaConta: (() => void) | null = null;

/** Sessão ou conta que não existe mais (session_not_found, user_not_found); 408 e 429 são passageiros. */
const sessaoSumiu = (status: number | undefined) => status === 401 || status === 403 || status === 404;

async function sairLocal(sb: SupabaseClient): Promise<void> {
  saindoPorDentro = true;
  try {
    await sb.auth.signOut({ scope: 'local' });
  } finally {
    saindoPorDentro = false;
  }
}

/** A tela avisa e volta para a escolha do time quando este aparelho perde a conta (jogo.md, seção 14.1). */
export function quandoSairDaConta(fn: () => void): void {
  aoSairDaConta = fn;
}

/**
 * Este aparelho era um torcedor e perdeu a conta: desconectado em outro aparelho, "Apagar meus dados" em outro
 * aparelho ou conta parada há 6 meses (jogo.md, seções 13 e 14.1). Volta a ser aparelho novo, com aviso, em vez
 * de criar outra conta sozinho com o time e o apelido de antes.
 */
function sairDaConta(): never {
  esquecerTorcedor();
  prefs.set({ saiuDaConta: true });
  aoSairDaConta?.();
  throw new ErroServidor('saiu_da_conta');
}

/**
 * Garante uma sessão (login anônimo na primeira vez; depois a sessão fica salva no aparelho).
 * Uma vez por carregamento confere no servidor se a sessão ainda vale. Se a conta ou a sessão sumiu
 * (desconectado, apagada, parada), o aparelho que já tinha torcedor sai da conta; o que nunca teve
 * entra de novo como anônimo.
 */
export function garantirSessao(): Promise<string> {
  sessaoConferida ??= (async () => {
    const sb = await supabase();
    const { data, error: erroSessao } = await comTempoLimite(sb.auth.getSession());
    // Renovação que falhou por rede: a sessão continua guardada, então não é "saiu da conta".
    if (!data.session && erroSessao && !(erroSessao.status && erroSessao.status >= 400 && erroSessao.status < 500)) {
      throw new ErroServidor('sem_conexao');
    }
    if (data.session) {
      const { data: atual, error } = await comTempoLimite(sb.auth.getUser());
      if (!error && atual.user) return atual.user.id;
      // Sessão salva de um usuário ou sessão que não existe mais (session_not_found, user_not_found).
      if (error && sessaoSumiu(error.status)) {
        await sairLocal(sb);
        if (prefs.get().sincronizado) sairDaConta();
        prefs.set({ sincronizado: undefined, faixaSincronizada: undefined });
      } else {
        throw new ErroServidor('sem_conexao');
      }
    } else if (prefs.get().sincronizado) {
      // O supabase-js já tirou a sessão (a renovação foi recusada), mas o aparelho tinha torcedor no servidor.
      sairDaConta();
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

/**
 * "Ver meus dados" (docs/jogo.md, seção 13): o que o servidor guarda de quem chama. Sem sessão no aparelho
 * não há nada no servidor (null), e não cria login só para isso.
 */
export async function verMeusDados(): Promise<MeusDados | null> {
  const sb = await supabase();
  const { data } = await comTempoLimite(sb.auth.getSession());
  if (!data.session) return null;
  const { data: dados, error } = await comTempoLimite(sb.rpc('ver_meus_dados'));
  if (error) throw new ErroServidor('falha');
  return dados as MeusDados | null;
}

// ---------------------------------------------------------------------------
// Código do torcedor (docs/jogo.md, seção 14.1): uma carreira em vários aparelhos. O código só passa pela
// função codigo-torcedor, no corpo do pedido; nunca em endereço, log ou armazenamento do aparelho.
// ---------------------------------------------------------------------------

export interface CodigoGerado {
  codigo: string;
  expiraEm: string;
}

/** Sorteia o código deste aparelho (vale 10 min, uma vez só; gerar outro mata o anterior). */
export function gerarCodigo(): Promise<CodigoGerado> {
  return chamar('codigo-torcedor', { acao: 'gerar' });
}

export interface TorcedorNoServidor {
  time_id: string;
  apelido: string | null;
  faixa_etaria: FaixaEtaria | null;
}

export type RespostaEntrar =
  | { etapa: 'escolher_time'; timeDono: string; timeSeu: string }
  | { etapa: 'pronto'; tokenHash: string; torcedor: TorcedorNoServidor | null };

/**
 * Manda o código digitado no outro aparelho, com um CAPTCHA novo a cada tentativa. Se os times forem diferentes,
 * volta pedindo a escolha, e a segunda chamada leva `time`. No "pronto", a conta antiga deste aparelho já foi
 * juntada e apagada no servidor: falta só `entrarNaConta`.
 */
export async function pedirEntrada(codigo: string, time?: string): Promise<RespostaEntrar> {
  await garantirSessao();
  let captcha: string | undefined;
  try {
    captcha = await tokenCaptcha();
  } catch {
    throw new ErroServidor('captcha');
  }
  return chamar('codigo-torcedor', { acao: 'entrar', codigo, ...(captcha ? { captcha } : {}), ...(time ? { time } : {}) });
}

/**
 * Troca o passe de uso único por uma sessão da conta do outro aparelho. Tenta de novo só em falha de rede: passe
 * usado ou vencido não volta. Se não entrar, o aparelho fica sem conta e pede um código novo ('entrada_falhou').
 */
export async function entrarNaConta(tokenHash: string): Promise<void> {
  const sb = await supabase();
  let entrou = false;
  for (let tentativa = 0; tentativa < 3 && !entrou; tentativa++) {
    try {
      const { data, error } = await comTempoLimite(sb.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' }));
      entrou = !error && !!data.session;
      if (error?.status && error.status >= 400 && error.status < 500) break;
    } catch {
      // sem rede: tenta de novo
    }
  }
  sessaoConferida = null;
  if (!entrou) {
    await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
    esquecerTorcedor();
    throw new ErroServidor('entrada_falhou');
  }
}

/** Time, apelido e faixa da conta, como estão no servidor (null antes de escolher o time). */
export async function meuTorcedor(): Promise<TorcedorNoServidor | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.from('torcedores').select('time_id, apelido, faixa_etaria').maybeSingle());
  if (error) throw new ErroServidor('falha');
  return (data as TorcedorNoServidor | null) ?? null;
}

export type StatusDoCodigo = 'ativo' | 'usado' | 'vencido' | null;

/** O último código deste torcedor: a tela do código fica de olho para dizer "o outro aparelho entrou". */
export async function statusDoCodigo(): Promise<StatusDoCodigo> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('meu_codigo_status'));
  if (error) throw new ErroServidor('falha');
  return (data as StatusDoCodigo) ?? null;
}

/** Os aparelhos (sessões) ligados à conta, este primeiro. */
export async function meusAparelhos(): Promise<Aparelho[]> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('meus_aparelhos'));
  if (error) throw new ErroServidor(error.message.includes('sessao_encerrada') ? 'sessao_encerrada' : 'falha');
  return (data ?? []) as Aparelho[];
}

/** Encerra a sessão de outro aparelho da conta: ele não renova mais o acesso e volta a ser aparelho novo. */
export async function desconectarAparelho(id: string): Promise<void> {
  await garantirSessao();
  const sb = await supabase();
  const { error } = await comTempoLimite(sb.rpc('desconectar_aparelho', { p_sessao: id }));
  if (error) {
    const codigo = ['este_aparelho', 'sessao_encerrada', 'nao_encontrado'].find((c) => error.message.includes(c));
    throw new ErroServidor(codigo ?? 'falha');
  }
}

/** Conta um clique no "Seja sócio", sem login e sem esperar resposta: nunca segura a saída para o site. */
export function contarCliqueSocio(clube: string): void {
  supabase()
    .then((sb) => comTempoLimite(sb.rpc('contar_clique_socio', { p_clube: clube })))
    .catch(() => undefined);
}

export async function chamar<T>(funcao: string, corpo: Record<string, unknown>): Promise<T> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.functions.invoke(funcao, { body: corpo }));
  if (error) throw new ErroServidor(await codigoDaFuncao(error));
  return data as T;
}

export interface DesafioRecebido {
  id: string;
  timeId: string;
  apelido: string | null;
  golsJogador: number;
  golsMaquina: number;
  pontos: number;
  /**
   * A disputa histórica de quem chamou (seção 14.7): a partida joga o cenário dela e a medalha vai para ela. Null no
   * X1 livre de antes do corte; ausente na nova-partida de antes deste campo.
   */
  disputaId?: string | null;
  /** Só do servidor antigo: no lance a lance as cobranças gravadas ficam no servidor. */
  cobrancas?: GestoCobranca[];
  /** Só do celular: o `boneco` do resumo do desafio, para o placar do resultado (a nova-partida não traz). */
  boneco?: VestimentaDeCampo | null;
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
  /** Regra nova (desde 09/11/2026): partidas de Lances valendo que ainda dá para começar hoje, já contando esta. */
  restantesHoje?: number | null;
}

/**
 * `disputa`: id da disputa histórica escolhida; só marca a partida, não muda nada do jogo. Desde o corte (09/11/2026)
 * é obrigatória fora do X1: sem ela, 400 `disputa_obrigatoria` (a Disputa livre saiu, seção 14.7).
 */
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
  /** Hora do servidor logo depois de gravar (o ranking da semana sai na rotina do minuto). */
  confirmadaEm?: string;
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
  /** Regra nova (desde 09/11/2026): as 3 melhores partidas de Lances de hoje (pênaltis, faltas e cara a cara). */
  melhoresDoDia?: number[];
  /** Regra nova: partidas de Lances valendo que ainda dá para começar hoje (null antes do corte). */
  restantesHoje?: number | null;
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
  /** A disputa histórica do X1 (desde 20261105400000; null no X1 livre de antes do corte). */
  disputa_id?: string | null;
  /**
   * O boneco de quem chamou, só o que vai a campo (docs/jogo.md 14.5, "Boneco em campo"). null: sem boneco ou com o
   * interruptor dele desligado. Ausente: servidor antigo (trate como sem boneco).
   */
  boneco?: VestimentaDeCampo | null;
}

/** Resumo do desafio para a tela inicial (sem as cobranças). */
export async function verDesafio(id: string): Promise<ResumoDesafio | null> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('ver_desafio', { p_id: id }));
  if (error) throw new ErroServidor('falha');
  return ((data as ResumoDesafio[] | null) ?? [])[0] ?? null;
}

// ---------------------------------------------------------------------------
// Lances do Jogo valendo (função "lances", docs/jogo.md, seção 7.3): lance a lance, como os pênaltis.
// ---------------------------------------------------------------------------

/**
 * O que começar (docs/jogo.md, seção 14.7):
 * - `{ lance }`: regra nova, 3 tentativas do mesmo lance (antes do corte o servidor aceita, com a tabela antiga);
 * - `{ desafio }`: X1 dos Lances recebido (só na regra nova; 404, 409 ou 410 se não der);
 * - `{ lances }` (ou a lista pura): formato antigo de 3 lances escolhidos; depois do corte responde 426 `atualize_o_app`.
 */
export type PedidoLances = { lance: string } | { desafio: string } | { lances: string[] };

/** Começa uma partida valendo. A lista pura de ids é o formato antigo, como `{ lances }`. */
export function novaPartidaLances(pedido: PedidoLances | string[]): Promise<RespostaNovaLances> {
  return chamar('lances', { acao: 'nova', ...(Array.isArray(pedido) ? { lances: pedido } : pedido) });
}

export interface ResumoDesafioLances {
  id: string;
  time_id: string;
  apelido: string | null;
  lance_id: string;
  pontos: number;
  gols: number;
  recriados: number;
  faixa: string;
  /** O boneco de quem chamou (mesma regra de `ResumoDesafio.boneco`). */
  boneco?: VestimentaDeCampo | null;
}

/** Resumo do X1 dos Lances para quem abre o link (?l=): quem chamou, o lance e os pontos a bater. */
export async function verDesafioLances(id: string): Promise<ResumoDesafioLances | null> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('ver_desafio_lances', { p_id: id }));
  if (error) throw new ErroServidor('falha');
  return ((data as ResumoDesafioLances[] | null) ?? [])[0] ?? null;
}

/** Um lance: o celular manda só o gesto; o servidor resolve com a semente que só ele conhece. */
export function lanceDoJogo(partidaId: string, i: number, gesto: GestoCobranca): Promise<RespostaLanceDoJogo> {
  return chamar('lances', {
    acao: 'lance',
    partidaId,
    i,
    gesto: { dir: gesto.dir, forca: gesto.forca, efeito: gesto.efeito },
  });
}

export interface LancesHoje {
  feitas: number;
  limite: number;
  melhor: number | null;
  /** Regra nova: as 3 que contam hoje, em pontos (pênaltis, faltas e cara a cara). Antes do corte, só faltas e cara a cara. */
  melhores?: number[];
}

/**
 * Partidas valendo começadas hoje (Brasília), o limite do dia e a melhor do dia. Null sem resposta.
 * Desde 09/11/2026 conta pênaltis, faltas e cara a cara juntos (limite 10).
 */
export async function meusLancesHoje(): Promise<LancesHoje | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('meus_lances_hoje'));
  if (error) throw new ErroServidor('falha');
  return ((data ?? []) as LancesHoje[])[0] ?? null;
}

export interface MedalhaDoLance {
  /** Id do lance, ou `penaltis:<disputa>` nas disputas de pênaltis (a `penaltis:livre` saiu em 05/11/2026) (desde a migração do PR #108). */
  lance_id: string;
  gols: number;
  recriados: number;
  /** Vitórias nas disputas de pênaltis (0 nos lances). */
  vitorias?: number;
  medalha: Medalha | null;
}

/** Minhas medalhas e o progresso em cada lance que já joguei valendo. Só a própria pessoa. */
export async function minhasMedalhas(): Promise<MedalhaDoLance[]> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('minhas_medalhas'));
  if (error) throw new ErroServidor('falha');
  return (data ?? []) as MedalhaDoLance[];
}

export interface VitrineDoTime {
  time_id: string;
  bronze: number;
  prata: number;
  ouro: number;
}

/** Medalhas somadas por torcida, sem ninguém identificado. */
export async function vitrineMedalhas(): Promise<VitrineDoTime[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('vitrine_medalhas'));
  if (error) throw new ErroServidor('falha');
  return (data ?? []) as VitrineDoTime[];
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

/** Os dois meses mais recentes da temporada (o primeiro é o "este mês"). Só leitura. */
export async function temporadasRecentes(): Promise<Temporada[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(
    sb.from('temporada').select('mes, pre_temporada, fechada_em, campeao_estreia_id').order('mes', { ascending: false }).limit(2),
  );
  if (error) throw new ErroServidor('falha');
  return (data ?? []) as Temporada[];
}

/** Classificação do mês: pontos e posição (view) com a posição final e o destino (fechamento). */
export async function classificacaoDoMes(mes: string): Promise<LinhaTemporada[]> {
  const sb = await supabase();
  const [classificacao, series] = await Promise.all([
    comTempoLimite(
      sb.from('classificacao_temporada').select('time_id, serie, posicao, pontos, vitorias, ultima_posicao').eq('mes', mes),
    ),
    comTempoLimite(sb.from('temporada_serie').select('time_id, posicao_final, destino').eq('mes', mes)),
  ]);
  if (classificacao.error || series.error) throw new ErroServidor('falha');
  const fim = new Map(
    ((series.data ?? []) as { time_id: string; posicao_final: number | null; destino: 'a' | 'b' | null }[]).map((s) => [s.time_id, s]),
  );
  return ((classificacao.data ?? []) as Omit<LinhaTemporada, 'posicao_final' | 'destino'>[]).map((l) => ({
    ...l,
    posicao_final: fim.get(l.time_id)?.posicao_final ?? null,
    destino: fim.get(l.time_id)?.destino ?? null,
  }));
}

/** Quantas semanas do mês já travaram (as `semana` distintas confirmadas em fechamento_semana). */
export async function semanasFechadasDoMes(mes: string): Promise<number> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(
    sb.from('fechamento_semana').select('semana').gte('semana', mes).lt('semana', mesSeguinte(mes)).not('confirmada_em', 'is', null),
  );
  if (error) throw new ErroServidor('falha');
  return new Set(((data ?? []) as { semana: string }[]).map((l) => l.semana)).size;
}

/**
 * Avisa quando o ranking da semana muda (Realtime). O servidor refaz o ranking a cada minuto e manda
 * um aviso só (ranking_aviso), não um por time. Devolve a função para parar de ouvir.
 * `nome`: telas abertas ao mesmo tempo (abas Semana e Cidades) precisam de canais distintos, porque o
 * Realtime devolve o canal que já existe com o mesmo nome e recusa um segundo ouvinte nele.
 */
export async function ouvirRanking(
  semana: string,
  aoMudar: () => void,
  aoEntrar?: () => void,
  nome = 'ranking',
): Promise<() => void> {
  const sb = await supabase();
  const canal: RealtimeChannel = sb
    .channel(`${nome}-${semana}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_aviso', filter: `semana=eq.${semana}` }, aoMudar)
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') aoEntrar?.();
    });
  return () => void sb.removeChannel(canal);
}

/** Quando o ranking da semana foi recalculado pela última vez (null antes da primeira conta). */
export async function rankingCalculadoEm(semana: string): Promise<string | null> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(
    sb.from('ranking_aviso').select('atualizado_em').eq('semana', semana).maybeSingle(),
  );
  if (error) throw new ErroServidor('falha');
  return (data as { atualizado_em: string } | null)?.atualizado_em ?? null;
}

/** Minha posição geral na semana, somando todos os jogos e todos os times ("3º de 14"). */
export async function minhaPosicaoSemana(semana: string): Promise<PosicaoSemana | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('minha_posicao_semana', { p_semana: semana }));
  if (error) throw new ErroServidor('falha');
  return ((data ?? []) as PosicaoSemana[])[0] ?? null;
}

export type MinigameDoRecorde = 'penaltis' | 'prova' | 'dia' | 'crava' | 'lances';

/** Meus recordes pessoais, um por minigame (null antes da primeira partida que vale). */
export async function meusRecordes(): Promise<Partial<Record<MinigameDoRecorde, number | null>>> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('meus_recordes'));
  if (error) throw new ErroServidor('falha');
  return Object.fromEntries(((data ?? []) as { minigame: MinigameDoRecorde; recorde: number | null }[]).map((l) => [l.minigame, l.recorde]));
}

/** Minha posição num minigame: pênaltis e Prova na semana de hoje, Time do Dia no dia de hoje. */
export async function minhaPosicaoMinigame(minigame: 'penaltis' | 'prova' | 'dia' | 'lances'): Promise<PosicaoSemana | null> {
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
      // Os Lances do Jogo ficam por fora do teto (jogo.md, 7.3): têm limite próprio de partidas por dia.
      .neq('minigame', 'lances')
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

/**
 * Aquecimento (jogo.md, 14.4): manda o desfecho (completou, pulou ou parou na estação N) e devolve o XP ganho
 * agora (20 na primeira vez que completa; 0 depois). 'sem_torcedor': o time ainda não chegou ao servidor.
 */
export async function registrarAquecimento(desfecho: 'completou' | 'pulou' | 'parou', estacao: number | null): Promise<number> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('aquecimento_registrar', { p_desfecho: desfecho, p_estacao: estacao }));
  if (error) throw new ErroServidor(error.message === 'sem_torcedor' ? 'sem_torcedor' : 'falha');
  return typeof data === 'number' ? data : 0;
}
