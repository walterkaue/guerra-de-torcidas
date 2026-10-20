// Crava a Rodada no Supabase: jogos, os próprios palpites e a própria certeza (o RLS só deixa
// gravar antes do início, pela hora do servidor), os próprios pontos e as leituras agregadas.

import type { Placar } from '../jogo/crava';
import type { Resultado } from '../jogo/tabela';
import { comTempoLimite, ErroServidor, garantirSessao, supabase } from './api';

export interface Jogo {
  id: string;
  rodada: number;
  mandante_id: string;
  visitante_id: string;
  inicio: string;
  status_api: string;
  gols_api_mandante: number | null;
  gols_api_visitante: number | null;
  gols_mandante: number | null;
  gols_visitante: number | null;
  confirmado_em: string | null;
  corrigido_em: string | null;
  anulado: boolean;
}

export interface Rodada {
  numero: number;
  trava_certeza: string | null;
}

export interface ComoCravaram {
  jogo_id: string;
  /** Null quando tem menos palpites que o mínimo (20). */
  total: number | null;
  pct_mandante: number | null;
  pct_empate: number | null;
  pct_visitante: number | null;
}

export interface LinhaRankingCrava {
  time_id: string;
  palpiteiros: number;
  media30: number;
  posicao: number;
}

export interface MinhaPosicao {
  posicao: number;
  total: number;
  pontos: number;
}

const CAMPOS_JOGO =
  'id, rodada, mandante_id, visitante_id, inicio, status_api, gols_api_mandante, gols_api_visitante, gols_mandante, gols_visitante, confirmado_em, corrigido_em, anulado';

function falhou(error: { code?: string; message?: string } | null): never {
  // 42501 = RLS recusou (o jogo começou ou a certeza travou). 23514 = placar fora de 0 a 9.
  if (error?.code === '42501') throw new ErroServidor('fechado');
  throw new ErroServidor(error?.code ?? 'falha');
}

export async function jogosDoCrava(): Promise<Jogo[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.from('jogos').select(CAMPOS_JOGO).order('inicio'));
  if (error) falhou(error);
  return (data ?? []) as Jogo[];
}

export async function rodadasDoCrava(): Promise<Rodada[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.from('rodadas').select('numero, trava_certeza').order('numero'));
  if (error) falhou(error);
  return (data ?? []) as Rodada[];
}

export interface MeusDados {
  palpites: Map<string, Placar>;
  /** Jogo da certeza por rodada. */
  certezas: Map<number, string>;
  /** Pontos que já foram pra torcida, por jogo (peso e teto aplicados). */
  pontos: Map<string, number>;
}

export async function meusDadosDoCrava(): Promise<MeusDados> {
  await garantirSessao();
  const sb = await supabase();
  const [p, c, k] = await comTempoLimite(
    Promise.all([
      sb.from('palpites').select('jogo_id, gols_mandante, gols_visitante'),
      sb.from('certezas').select('rodada, jogo_id'),
      sb.from('crava_pontos').select('jogo_id, pontos'),
    ]),
  );
  if (p.error) falhou(p.error);
  if (c.error) falhou(c.error);
  if (k.error) falhou(k.error);
  const pontos = new Map<string, number>();
  for (const l of k.data ?? []) pontos.set(l.jogo_id, (pontos.get(l.jogo_id) ?? 0) + l.pontos);
  return {
    palpites: new Map((p.data ?? []).map((l) => [l.jogo_id, { m: l.gols_mandante, v: l.gols_visitante }])),
    certezas: new Map((c.data ?? []).map((l) => [l.rodada, l.jogo_id])),
    pontos,
  };
}

export async function cravar(jogoId: string, placar: Placar): Promise<void> {
  await garantirSessao();
  const sb = await supabase();
  const { error } = await comTempoLimite(
    sb
      .from('palpites')
      .upsert(
        { jogo_id: jogoId, gols_mandante: placar.m, gols_visitante: placar.v },
        { onConflict: 'torcedor_id,jogo_id', defaultToNull: false },
      ),
  );
  if (error) falhou(error);
}

export async function marcarCerteza(rodada: number, jogoId: string | null): Promise<void> {
  await garantirSessao();
  const sb = await supabase();
  const { error } = await comTempoLimite(
    jogoId
      ? sb.from('certezas').upsert({ rodada, jogo_id: jogoId }, { onConflict: 'torcedor_id,rodada', defaultToNull: false })
      : sb.from('certezas').delete().eq('rodada', rodada),
  );
  if (error) falhou(error);
}

export async function comoCravaram(rodada: number): Promise<ComoCravaram[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('crava_rodada', { p_rodada: rodada }));
  if (error) falhou(error);
  return (data ?? []) as ComoCravaram[];
}

/** Ranking das torcidas no palpite: da rodada, ou do Brasileirão inteiro (rodada null). */
export async function rankingCrava(rodada: number | null): Promise<LinhaRankingCrava[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('ranking_crava', { p_rodada: rodada }));
  if (error) falhou(error);
  return ((data ?? []) as LinhaRankingCrava[]).map((l) => ({ ...l, media30: Number(l.media30) }));
}

export async function minhaPosicaoCrava(rodada: number | null): Promise<MinhaPosicao | null> {
  await garantirSessao();
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc('minha_posicao_crava', { p_rodada: rodada }));
  if (error) falhou(error);
  return ((data ?? []) as MinhaPosicao[])[0] ?? null;
}

/** Resultados da temporada inteira (placar da API), para a tabela e os indicadores dos cartões. */
export async function resultadosDaTemporada(): Promise<Resultado[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(
    sb.from('resultados_temporada').select('rodada, mandante_id, visitante_id, inicio, gols_mandante, gols_visitante').order('inicio'),
  );
  if (error) falhou(error);
  return (data ?? []) as Resultado[];
}
