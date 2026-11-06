// Leitura da Galeria de Troféus, das 52 semanas e das Campeãs de estado (docs/jogo.md, seção 5, "Longo prazo").
// Só leitura, nada gravado. As três funções do servidor (galeria_trofeus, ranking_52_semanas, galeria_cidades) dizem
// quem ganhou; os números da ficha e o sobe e desce vêm de tabelas que já têm leitura pública (fechamento_semana,
// temporada_serie, classificacao_temporada). "Você tava em campo" lê minha_posicao_semana só se já há sessão:
// olhar a Galeria nunca cria login.
// Em desenvolvimento, ?galeriaFalsa=cheia|pre|vazia|erro troca tudo por um servidor de mentira (dev/galeriaFalsa.ts).

import { ErroServidor, comTempoLimite, supabase } from './api';
import { minhaCidade } from './cidade';
import type {
  CampeaDeEstado,
  Linha52,
  LinhaDaSemana,
  LinhaDoMes,
  SerieDoMes,
  Trofeu,
} from '../jogo/galeria';
import type { Serie } from '../jogo/temporada';

export interface DadosDaFicha {
  semana?: LinhaDaSemana[];
  series?: Map<string, Serie>;
  mes?: LinhaDoMes[];
  /** Pontos da pessoa na semana do troféu (nulo sem sessão, sem pontos ou em troféu de mês). */
  meusPontos: number | null;
}

export interface ServidorDaGaleria {
  trofeusDoTime(timeId: string): Promise<Trofeu[]>;
  ranking52(): Promise<Linha52[]>;
  campeasDoEstado(uf: string): Promise<CampeaDeEstado[]>;
  /** Meses de temporada (o mais novo primeiro), para saber se é pré-temporada. */
  temporadas(): Promise<{ mes: string; pre_temporada: boolean }[]>;
  /** A série do time em cada mês fora da pré-temporada. */
  historicoDeSeries(timeId: string): Promise<SerieDoMes[]>;
  dadosDaFicha(t: Trofeu): Promise<DadosDaFicha>;
  /** Cidade da pessoa (código e UF) para abrir as Campeãs no estado dela. */
  minhaCidade(): Promise<{ codigo: number; uf: string } | null>;
}

const FALSA = import.meta.env.DEV ? new URLSearchParams(location.search).get('galeriaFalsa') : null;
export const galeriaFalsaLigada = (): boolean => FALSA !== null;

async function rpc<T>(funcao: string, args: Record<string, unknown> = {}): Promise<T[]> {
  const sb = await supabase();
  const { data, error } = await comTempoLimite(sb.rpc(funcao, args));
  if (error) throw new ErroServidor('falha');
  return (data ?? []) as T[];
}

const mesDaSemana = (semana: string) => `${semana.slice(0, 7)}-01`;

const real: ServidorDaGaleria = {
  trofeusDoTime: (timeId) => rpc<Trofeu>('galeria_trofeus', { p_time_id: timeId }),

  ranking52: () => rpc<Linha52>('ranking_52_semanas'),

  campeasDoEstado: (uf) => rpc<CampeaDeEstado>('galeria_cidades', { p_uf: uf }),

  async temporadas() {
    const sb = await supabase();
    const { data, error } = await comTempoLimite(sb.from('temporada').select('mes, pre_temporada').order('mes', { ascending: false }));
    if (error) throw new ErroServidor('falha');
    return (data ?? []) as { mes: string; pre_temporada: boolean }[];
  },

  async historicoDeSeries(timeId) {
    const sb = await supabase();
    const [series, meses] = await Promise.all([
      comTempoLimite(sb.from('temporada_serie').select('mes, serie').eq('time_id', timeId)),
      comTempoLimite(sb.from('temporada').select('mes, pre_temporada')),
    ]);
    if (series.error || meses.error) throw new ErroServidor('falha');
    const pre = new Set(((meses.data ?? []) as { mes: string; pre_temporada: boolean }[]).filter((m) => m.pre_temporada).map((m) => m.mes));
    return ((series.data ?? []) as SerieDoMes[]).filter((s) => !pre.has(s.mes));
  },

  async dadosDaFicha(t) {
    const sb = await supabase();
    if (t.semana) {
      const [semana, series, meusPontos] = await Promise.all([
        comTempoLimite(
          sb
            .from('fechamento_semana')
            .select('time_id, ativos, soma, media30, posicao_campeao, posicao_soma')
            .eq('semana', t.semana)
            .not('confirmada_em', 'is', null),
        ),
        comTempoLimite(sb.from('temporada_serie').select('time_id, serie').eq('mes', mesDaSemana(t.semana))),
        meusPontosNaSemana(t.semana),
      ]);
      if (semana.error || series.error) throw new ErroServidor('falha');
      return {
        semana: ((semana.data ?? []) as LinhaDaSemana[]).map((l) => ({ ...l, media30: Number(l.media30) })),
        series: new Map(((series.data ?? []) as { time_id: string; serie: Serie }[]).map((s) => [s.time_id, s.serie])),
        meusPontos,
      };
    }
    const { data, error } = await comTempoLimite(
      sb.from('classificacao_temporada').select('time_id, serie, posicao, pontos, vitorias').eq('mes', t.mes ?? ''),
    );
    if (error) throw new ErroServidor('falha');
    return { mes: (data ?? []) as LinhaDoMes[], meusPontos: null };
  },

  async minhaCidade() {
    const c = await minhaCidade();
    return c ? { codigo: c.codigo, uf: c.uf } : null;
  },
};

/** Pontos da pessoa na semana; nulo sem sessão (não cria login) ou se a leitura falhar. */
async function meusPontosNaSemana(semana: string): Promise<number | null> {
  try {
    const sb = await supabase();
    const { data: sessao } = await comTempoLimite(sb.auth.getSession());
    if (!sessao.session) return null;
    const linhas = await rpc<{ pontos: number }>('minha_posicao_semana', { p_semana: semana });
    return linhas[0]?.pontos ?? null;
  } catch {
    return null;
  }
}

/** O servidor da Galeria (o de mentira, em dev com ?galeriaFalsa). */
export async function servidorDaGaleria(): Promise<ServidorDaGaleria> {
  if (FALSA !== null) return (await import('../dev/galeriaFalsa')).servidorFalso(FALSA);
  return real;
}
