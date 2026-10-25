// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Texto do aviso de domingo (notificação push, docs/jogo.md seção 8: "Faltam 6 horas e o [rival]
// tá encostando"). Módulo puro: copiado para supabase/functions/_shared/jogo por `npm run compartilhar`
// e usado pela função enviar-push. Zoeira só com o time e a situação, nunca com a pessoa.

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

const TITULO = 'A semana fecha à meia-noite';
const com = (t: Time) => `${t.artigo === 'a' ? 'a' : 'o'} ${t.nome}`;
const Com = (t: Time) => `${t.artigo === 'a' ? 'A' : 'O'} ${t.nome}`;
const pontos = (n: number) => {
  const v = Math.round(Math.abs(n));
  return `${v.toLocaleString('pt-BR')} ${v === 1 ? 'ponto' : 'pontos'}`;
};

/** Rival da semana: o clássico; sem clássico, o vizinho de cima no ranking (ou o de baixo, para o líder). */
export function rivalDoAviso(t: Time, ranking: readonly LinhaAviso[]): Time | undefined {
  if (t.rival) return timePorId(t.rival);
  const minha = ranking.find((l) => l.time_id === t.id);
  if (!minha) return undefined;
  const alvo = minha.posicao_campeao === 1 ? 2 : minha.posicao_campeao - 1;
  return timePorId(ranking.find((l) => l.posicao_campeao === alvo)?.time_id);
}

/**
 * O aviso de domingo para quem torce por `timeId`, a `horas` do fim da semana.
 * Perto do rival (menos de 10% da média) é disputa; longe, é chamada para somar.
 */
export function avisoDeDomingo(timeId: string, ranking: readonly LinhaAviso[], horas = 6): Aviso {
  const h = `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const t = timePorId(timeId);
  if (!t || t.id === ID_OUTRO) return { titulo: TITULO, corpo: `Faltam ${h} pra semana fechar. Bora somar mais umas partidas?` };
  const eu = ranking.find((l) => l.time_id === t.id);
  if (!eu || eu.ativos === 0) {
    return { titulo: TITULO, corpo: `Faltam ${h} e ${com(t)} ainda não pontuou nesta semana. Bora estrear?` };
  }
  const rival = rivalDoAviso(t, ranking);
  const r = rival ? ranking.find((l) => l.time_id === rival.id) : undefined;
  if (rival && r && r.ativos > 0) {
    const dif = eu.media30 - r.media30;
    const perto = Math.abs(dif) <= Math.max(1, eu.media30 * 0.1);
    if (dif < 0) {
      return {
        titulo: TITULO,
        corpo: perto
          ? `Faltam ${h} e ${com(rival)} tá só ${pontos(dif)} na frente ${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}. Dá pra virar!`
          : `Faltam ${h} e ${com(rival)} tá ${pontos(dif)} na frente. Vai deixar barato?`,
      };
    }
    if (perto) return { titulo: TITULO, corpo: `Faltam ${h} e ${com(rival)} tá encostando: ${pontos(dif)} atrás. Segura essa!` };
  }
  return {
    titulo: TITULO,
    corpo: `Faltam ${h} pra semana fechar. ${Com(t)} tá em ${eu.posicao_campeao}º. Bora fechar a semana bem?`,
  };
}
