// Chamadas do ranking de cidades e estados (parte A da Cidade; docs/jogo.md, seção 5).
// As três de ranking valem para anônimo e logado; só `minhaCidadeSemana` precisa de sessão.

import { ErroServidor, comTempoLimite, garantirSessao, meusAparelhos, supabase } from './api';
import type { LinhaCidade, LinhaEstado, MinhaCidade } from '../jogo/rankingCidades';

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc(nome, args));
  if (error) throw new ErroServidor('falha');
  return (data ?? []) as T[];
}

/** Minha cidade na semana; null se a pessoa ainda não escolheu cidade. */
export async function minhaCidadeSemana(semana: string): Promise<MinhaCidade | null> {
  await garantirSessao();
  return (await rpc<MinhaCidade>('minha_cidade_semana', { p_semana: semana }))[0] ?? null;
}

/**
 * A sessão deste aparelho ainda vale no servidor? Quem foi desconectado em outro aparelho recebe `sem cidade`
 * das funções de leitura, igual a quem nunca escolheu: só `meus_aparelhos` diz a diferença. Erro de rede lança.
 */
export async function sessaoValida(): Promise<boolean> {
  try {
    await meusAparelhos();
    return true;
  } catch (e) {
    if (e instanceof ErroServidor && e.codigo === 'sessao_encerrada') return false;
    throw e;
  }
}

export const rankingCidades = (semana: string, uf: string): Promise<LinhaCidade[]> =>
  rpc<LinhaCidade>('ranking_cidades', { p_semana: semana, p_uf: uf });

export const rankingCidadesTop = (semana: string): Promise<LinhaCidade[]> =>
  rpc<LinhaCidade>('ranking_cidades_top', { p_semana: semana });

export const rankingEstados = (semana: string): Promise<LinhaEstado[]> =>
  rpc<LinhaEstado>('ranking_estados', { p_semana: semana });
