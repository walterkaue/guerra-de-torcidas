// Só em desenvolvimento (npm run dev): imita o servidor da aba Temporada do Ranking, para conferir as telas
// sem banco nem login. Nunca entra no build de produção (import atrás de import.meta.env.DEV).
// ?temporadaFalsa= unica (novembro, 2 semanas fechadas) | ab (dezembro A/B + novembro fechado) |
// vazia (novembro sem semana) | fechada (mês fechado com destinos) | erro (falha de rede).

import { ID_OUTRO, TIMES } from '../dados/times';
import type { LinhaTemporada, Temporada } from '../jogo/temporada';

const cenario = new URLSearchParams(location.search).get('temporadaFalsa') ?? 'unica';
const espera = <T>(v: T) =>
  new Promise<T>((ok, falha) => setTimeout(() => (cenario === 'erro' ? falha(new Error('falha')) : ok(v)), 150));

const IDS = TIMES.filter((t) => t.id !== ID_OUTRO).map((t) => t.id);
const NOV = '2026-11-01';
const DEZ = '2026-12-01';

const mes = (m: string, extra: Partial<Temporada> = {}): Temporada => ({
  mes: m,
  pre_temporada: true,
  fechada_em: null,
  campeao_estreia_id: null,
  ...extra,
});

const NOV_FECHADO = mes(NOV, { fechada_em: '2026-12-01T15:01:00Z' });

export function temporadasRecentes(): Promise<Temporada[]> {
  switch (cenario) {
    case 'ab':
      return espera([mes(DEZ), NOV_FECHADO]);
    case 'fechada':
      return espera([mes(NOV, { pre_temporada: false, fechada_em: '2026-12-01T15:01:00Z', campeao_estreia_id: IDS[0] })]);
    default:
      return espera([mes(NOV)]);
  }
}

/** Pontos decrescentes e variados; as duas primeiras torcidas têm uma vitória de semana. */
function emSerie(ids: string[], serie: 'unica' | 'a' | 'b', semana: boolean, fim: boolean): LinhaTemporada[] {
  return ids.map((id, i) => {
    const posicao = i + 1;
    const destino = fim ? (serie === 'unica' ? (posicao <= 10 ? 'a' : 'b') : serie === 'a' ? (posicao <= 8 ? 'a' : 'b') : posicao <= 2 ? 'a' : 'b') : null;
    return {
      time_id: id,
      serie,
      posicao,
      pontos: semana ? Math.max(0, 50 - i * 3 - (i % 2)) : 0,
      vitorias: semana && i < 2 ? 1 : 0,
      ultima_posicao: semana ? ((i * 7) % ids.length) + 1 : null,
      posicao_final: fim ? posicao : null,
      destino,
    };
  });
}

export function classificacaoDoMes(m: string): Promise<LinhaTemporada[]> {
  if (cenario === 'ab' && m === DEZ) {
    return espera([...emSerie(IDS.slice(0, 10), 'a', true, false), ...emSerie(IDS.slice(10), 'b', true, false)]);
  }
  if (cenario === 'ab' || cenario === 'fechada') return espera(emSerie(IDS, 'unica', true, true));
  return espera(emSerie(IDS, 'unica', cenario !== 'vazia', false));
}

export function semanasFechadasDoMes(m: string): Promise<number> {
  if (cenario === 'vazia') return espera(0);
  if (cenario === 'ab') return espera(m === DEZ ? 1 : 5);
  if (cenario === 'fechada') return espera(5);
  return espera(2);
}
