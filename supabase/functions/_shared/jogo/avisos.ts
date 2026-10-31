// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Texto do aviso de domingo (notificação push, docs/jogo.md seção 13 e docs/narrador.md seção 13).
// Só informa a situação da torcida e do rival na semana: sem contagem de horas, sem chamada e sem
// pressão para voltar. Módulo puro: copiado para supabase/functions/_shared/jogo por
// `npm run compartilhar` e usado pela função enviar-push.

import { ID_OUTRO, timePorId, type Time } from '../dados/times.ts';

export interface LinhaAviso {
  time_id: string;
  ativos: number;
  /** Média dos 30 melhores (Campeão da semana). */
  media30: number;
  posicao_campeao: number;
}

export interface Aviso {
  titulo: string;
  corpo: string;
}

const TITULO = 'Sua torcida na semana';
const com = (t: Time) => `${t.artigo === 'a' ? 'a' : 'o'} ${t.nome}`;
const Com = (t: Time) => `${t.artigo === 'a' ? 'A' : 'O'} ${t.nome}`;
const dele = (t: Time) => `${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}`;
const pontos = (v: number) => `${v.toLocaleString('pt-BR')} ${v === 1 ? 'ponto' : 'pontos'}`;

/** Rival da semana: o clássico; sem clássico, o vizinho de cima no ranking (ou o de baixo, para o líder). */
export function rivalDoAviso(t: Time, ranking: readonly LinhaAviso[]): Time | undefined {
  if (t.rival) return timePorId(t.rival);
  const minha = ranking.find((l) => l.time_id === t.id);
  if (!minha) return undefined;
  const alvo = minha.posicao_campeao === 1 ? 2 : minha.posicao_campeao - 1;
  return timePorId(ranking.find((l) => l.posicao_campeao === alvo)?.time_id);
}

/** O aviso de domingo para quem torce por `timeId`. */
export function avisoDeDomingo(timeId: string, ranking: readonly LinhaAviso[]): Aviso {
  const t = timePorId(timeId);
  if (!t || t.id === ID_OUTRO) return { titulo: TITULO, corpo: 'O placar da semana tá atualizado no jogo.' };
  const eu = ranking.find((l) => l.time_id === t.id);
  if (!eu || eu.ativos === 0) return { titulo: TITULO, corpo: `${Com(t)} ainda não pontuou nesta semana.` };

  const situacao = `${Com(t)} tá em ${eu.posicao_campeao}º na semana`;
  const rival = rivalDoAviso(t, ranking);
  const r = rival ? ranking.find((l) => l.time_id === rival.id) : undefined;
  if (!rival || !r || r.ativos === 0) return { titulo: TITULO, corpo: `${situacao}.` };

  const dif = Math.round(eu.media30 - r.media30);
  if (dif === 0) return { titulo: TITULO, corpo: `${situacao}, no empate com ${com(rival)}.` };
  return { titulo: TITULO, corpo: `${situacao}, ${pontos(Math.abs(dif))} ${dif < 0 ? 'atrás' : 'na frente'} ${dele(rival)}.` };
}
