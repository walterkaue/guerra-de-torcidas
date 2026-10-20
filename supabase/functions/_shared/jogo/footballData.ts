// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Leitura dos jogos da API v4 do football-data.org (competição BSA). Puro: a função
// sincronizar-jogos usa uma cópia deste arquivo; o teste garante que nenhum time fica sem par.

import { PRIMEIRA_RODADA, ULTIMA_RODADA } from './crava.ts';

/**
 * Palavras que identificam cada time no nome da API (sem acento, minúsculas).
 * Um nome casa com um time se contém todas as palavras de alguma das opções, e só de um time.
 * "atletico" sozinho não serve (Athletico-PR e Atlético-MG).
 */
export const CHAVES_API: Record<string, readonly string[][]> = {
  'athletico-pr': [['paranaense'], ['athletico']],
  'atletico-mg': [['mineiro'], ['atletico', 'mg']],
  bahia: [['bahia']],
  botafogo: [['botafogo']],
  bragantino: [['bragantino']],
  chapecoense: [['chapecoense']],
  corinthians: [['corinthians']],
  coritiba: [['coritiba']],
  cruzeiro: [['cruzeiro']],
  flamengo: [['flamengo']],
  fluminense: [['fluminense']],
  gremio: [['gremio']],
  internacional: [['internacional']],
  mirassol: [['mirassol']],
  palmeiras: [['palmeiras']],
  remo: [['remo']],
  santos: [['santos']],
  'sao-paulo': [['sao', 'paulo']],
  vasco: [['vasco']],
  vitoria: [['vitoria']],
};

export function palavras(nome: string): string[] {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Id do time (src/dados/times.ts) para um nome da API, ou null se não casar com exatamente um. */
export function timeDoNome(nome: string): string | null {
  const ps = new Set(palavras(nome));
  const achados = Object.entries(CHAVES_API)
    .filter(([, opcoes]) => opcoes.some((op) => op.every((p) => ps.has(p))))
    .map(([id]) => id);
  return achados.length === 1 ? achados[0] : null;
}

export interface TimeApi {
  id?: number;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
}

/** Tenta o nome completo e depois o curto. */
export function timeDaApi(t: TimeApi): string | null {
  for (const n of [t.name, t.shortName]) {
    const id = n ? timeDoNome(n) : null;
    if (id) return id;
  }
  return null;
}

export interface PartidaApi {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: TimeApi;
  awayTeam: TimeApi;
  score?: { fullTime?: { home: number | null; away: number | null } | null } | null;
}

export interface JogoSincronizado {
  api_id: number;
  rodada: number;
  mandante_id: string;
  visitante_id: string;
  inicio: string;
  status_api: string;
  gols_api_mandante: number | null;
  gols_api_visitante: number | null;
}

export interface LeituraDaApi {
  jogos: JogoSincronizado[];
  /** Nomes da API que não casaram com nenhum time (ou com mais de um). */
  semPar: string[];
}

/** Converte as partidas da API nos jogos das rodadas 32 a 38. Jogo com time sem par fica de fora. */
export function lerPartidas(partidas: readonly PartidaApi[]): LeituraDaApi {
  const jogos: JogoSincronizado[] = [];
  const semPar = new Set<string>();
  for (const p of partidas) {
    const rodada = p.matchday ?? 0;
    if (rodada < PRIMEIRA_RODADA || rodada > ULTIMA_RODADA) continue;
    const mandante = timeDaApi(p.homeTeam);
    const visitante = timeDaApi(p.awayTeam);
    if (!mandante) semPar.add(p.homeTeam.name ?? p.homeTeam.shortName ?? `id ${p.homeTeam.id}`);
    if (!visitante) semPar.add(p.awayTeam.name ?? p.awayTeam.shortName ?? `id ${p.awayTeam.id}`);
    if (!mandante || !visitante || Number.isNaN(Date.parse(p.utcDate))) continue;
    const gols = p.score?.fullTime;
    jogos.push({
      api_id: p.id,
      rodada,
      mandante_id: mandante,
      visitante_id: visitante,
      inicio: new Date(p.utcDate).toISOString(),
      status_api: p.status,
      gols_api_mandante: gols?.home ?? null,
      gols_api_visitante: gols?.away ?? null,
    });
  }
  return { jogos, semPar: [...semPar].sort() };
}

/** Status da API em que o jogo não acontece no horário marcado. */
export const STATUS_ADIADO = ['POSTPONED', 'SUSPENDED', 'CANCELLED'];

export interface ResultadoTemporada {
  api_id: number;
  rodada: number;
  mandante_id: string;
  visitante_id: string;
  inicio: string;
  gols_mandante: number;
  gols_visitante: number;
}

/** Jogos já terminados da temporada inteira (qualquer rodada), para a tabela e os indicadores. */
export function lerResultados(partidas: readonly PartidaApi[]): ResultadoTemporada[] {
  const lista: ResultadoTemporada[] = [];
  for (const p of partidas) {
    const gols = p.score?.fullTime;
    if ((p.status !== 'FINISHED' && p.status !== 'AWARDED') || gols?.home == null || gols?.away == null) continue;
    const mandante = timeDaApi(p.homeTeam);
    const visitante = timeDaApi(p.awayTeam);
    if (!mandante || !visitante || !p.matchday || Number.isNaN(Date.parse(p.utcDate))) continue;
    lista.push({
      api_id: p.id,
      rodada: p.matchday,
      mandante_id: mandante,
      visitante_id: visitante,
      inicio: new Date(p.utcDate).toISOString(),
      gols_mandante: gols.home,
      gols_visitante: gols.away,
    });
  }
  return lista;
}
