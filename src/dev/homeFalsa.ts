// Só em desenvolvimento (npm run dev, com ?homeFalsa na URL): imita o servidor da Home e do Perfil no próprio
// navegador, para conferir as telas sem banco nem login. Nunca entra no build de produção (import atrás de
// import.meta.env.DEV).
// ?cenario= escolhe o "Jogar agora": crava (rodada fecha em 5 h sem palpite), dia (ainda não jogou, é o padrão),
// chutes (2 chutes usados), lances (Time do Dia feito), prova (nada mais conta hoje) ou cravado (tudo feito).

import { ID_OUTRO, TIMES } from '../dados/times';
import { NOMES_PISTAS, type Pistas, type Tentativa, type Tom } from '../jogo/timeDoDia';
import type { Carreira } from '../jogo/carreira';
import type { PosicaoSemana } from '../jogo/posicao';
import type { LinhaRanking, MinigameDoRecorde, RespostaDoDia } from '../servidor/api';
import type { Jogo, MeusDados, MinhaPosicao } from '../servidor/crava';

const params = new URLSearchParams(location.search);
const cenario = params.get('cenario') ?? 'dia';
const espera = <T>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 120));

export function rankingDaSemana(): Promise<LinhaRanking[]> {
  // ?semRanking: semana sem ninguém jogando.
  const times = TIMES.filter((t) => t.id !== ID_OUTRO);
  return espera(
    times.map((t, i) => ({
      time_id: t.id,
      ativos: params.has('semRanking') ? 0 : 12,
      soma: 0,
      media30: params.has('semRanking') ? 0 : 240 - i * 12 - (i % 3),
      posicao_campeao: i + 1,
      posicao_soma: i + 1,
    })),
  );
}

export const minhaPosicaoSemana = (): Promise<PosicaoSemana | null> =>
  espera(params.has('semRanking') ? { posicao: null, total: 0, pontos: 0 } : { posicao: 3, total: 4, pontos: 230 });

export const partidasFechadasHoje = () => espera(cenario === 'prova' || cenario === 'cravado' ? 5 : 2);

const tons: Tom[][] = [
  ['longe', 'perto', 'longe', 'certo', 'longe', 'perto'],
  ['perto', 'certo', 'longe', 'certo', 'perto', 'certo'],
  ['certo', 'certo', 'certo', 'certo', 'certo', 'certo'],
];
const tentativa = (linha: Tom[]) =>
  ({ pistas: Object.fromEntries(NOMES_PISTAS.map((n, i) => [n, { tom: linha[i] }])) as Pistas, acertou: false }) as Tentativa;

export function estadoDoDia(): Promise<RespostaDoDia> {
  const feito = cenario !== 'dia' && cenario !== 'chutes' && cenario !== 'crava';
  const chutes = feito ? 3 : cenario === 'chutes' ? 2 : 0;
  return espera({
    pronto: true,
    dia: '2026-10-31',
    numero: 34,
    tentativas: tons.slice(0, chutes).map(tentativa),
    maxTentativas: 6,
    fim: feito,
    acertou: feito,
    pontos: feito ? 70 : 0,
    secreto: null,
    desempenho: null,
    proximoEm: new Date(Date.now() + 5.2 * 3600_000).toISOString(),
  });
}

const jogo = (id: string, rodada: number, horas: number): Jogo => ({
  id,
  rodada,
  mandante_id: 'flamengo',
  visitante_id: 'palmeiras',
  inicio: new Date(Date.now() + horas * 3600_000).toISOString(),
  status_api: 'TIMED',
  gols_api_mandante: null,
  gols_api_visitante: null,
  gols_mandante: null,
  gols_visitante: null,
  confirmado_em: null,
  corrigido_em: null,
  anulado: false,
});

export const jogosDoCrava = () => espera([jogo('a', 33, cenario === 'crava' ? 5 : 30), jogo('b', 33, 32), jogo('c', 33, 34)]);

export const meusDadosDoCrava = (): Promise<MeusDados> =>
  espera({
    palpites: new Map(cenario === 'cravado' ? [['a', { m: 2, v: 1 }], ['b', { m: 0, v: 0 }], ['c', { m: 1, v: 1 }]] : []),
    certezas: new Map(),
    pontos: new Map(),
  });

export const meusRecordes = (): Promise<Partial<Record<MinigameDoRecorde, number | null>>> =>
  espera(params.has('semRanking') ? { penaltis: null, prova: null, dia: null, crava: null } : { penaltis: 85, prova: 58, dia: 70, crava: 44 });

export const minhaCarreira = (): Promise<Carreira> => espera({ xp: 770, partidasHoje: 3, bonus: null });

export const minhaPosicaoMinigame = (minigame: 'penaltis' | 'prova' | 'dia'): Promise<PosicaoSemana | null> =>
  espera({ penaltis: { posicao: 2, total: 9, pontos: 85 }, prova: { posicao: null, total: 6, pontos: 0 }, dia: { posicao: 1, total: 5, pontos: 70 } }[minigame]);

export const minhaPosicaoCrava = (): Promise<MinhaPosicao | null> => espera({ posicao: 37, total: 412, pontos: 44 });
