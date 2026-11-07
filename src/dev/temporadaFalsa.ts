// Só em desenvolvimento (npm run dev): imita o servidor da aba Temporada do Ranking e da Home (bloco das divisões e
// placa de fim do mês), para conferir as telas sem banco nem login. Nunca entra no build de produção (import atrás
// de import.meta.env.DEV). Nada daqui vai para o Supabase.
// ?temporadaFalsa= unica (novembro, 2 semanas fechadas) | ab (dezembro A/B + novembro fechado) |
// vazia (novembro sem semana) | fechada (mês fechado com destinos) | erro (falha de rede) |
// fim-subiu | fim-caiu | fim-campeao | fim-unica (Home: um mês aberto e um mês fechado hoje, com o time do coração
// na posição que dá o destino).
// Parâmetros extras (Home): &serie=a|b|unica e &pos=N (série e posição do time do coração, em unica, ab e fim-*);
// &pre=0 tira a pré-temporada (1 põe); &mes=atual põe o mês aberto no mês de hoje (projeção da Home); &estreia=1 faz do time o Campeão da estreia (fim-unica); &rival=caiu põe o
// clássico em 9º na Série A, caído (fim-*). Sem esses parâmetros, os cenários antigos ficam como eram.

import { ID_OUTRO, TIMES, rivalDe, timePorId } from '../dados/times';
import { prefs } from '../estado';
import type { LinhaTemporada, Serie, Temporada } from '../jogo/temporada';
import { diaBrasilia } from '../servidor/tempo';

const params = new URLSearchParams(location.search);
const cenario = params.get('temporadaFalsa') || 'unica';
const espera = <T>(v: T) =>
  new Promise<T>((ok, falha) => setTimeout(() => (cenario === 'erro' ? falha(new Error('falha')) : ok(v)), 150));

const IDS = TIMES.filter((t) => t.id !== ID_OUTRO).map((t) => t.id);

const fim = cenario.startsWith('fim-');
/** O time do coração deste aparelho (o primeiro da lista se não houver). */
const meuId = (() => {
  const t = prefs.get().time;
  return t && IDS.includes(t) ? t : IDS[0];
})();
const rivalId = rivalDe(timePorId(meuId)!)?.id;
const numeroDoParametro = (nome: string) => {
  const n = Number(params.get(nome));
  return Number.isInteger(n) && n >= 1 ? n : null;
};
const pos = numeroDoParametro('pos');
const serieDoParametro = ((s) => (s === 'a' || s === 'b' || s === 'unica' ? s : null))(params.get('serie'));
const pre = params.get('pre');

// Meses do fim: o mês passado fechou hoje e o atual está aberto.
const hoje = diaBrasilia();
const MES_ABERTO = `${hoje.slice(0, 7)}-01`;
const MES_FECHADO = (() => {
  const [a, m] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  return m === 1 ? `${a - 1}-12-01` : `${a}-${String(m - 1).padStart(2, '0')}-01`;
})();

// &mes=atual põe o mês aberto no mês de hoje (a projeção da Home só sai se a semana de agora é do mês aberto).
const ATUAL = params.get('mes') === 'atual';
const NOV = ATUAL ? MES_ABERTO : '2026-11-01'; // o mês aberto de unica e vazia, ou o fechado de ab
const DEZ = ATUAL ? MES_ABERTO : '2026-12-01'; // o mês aberto de ab
const NOV_FECHADO_AB = ATUAL ? MES_FECHADO : '2026-11-01';

const mes = (m: string, extra: Partial<Temporada> = {}): Temporada => ({
  mes: m,
  pre_temporada: true,
  fechada_em: null,
  campeao_estreia_id: null,
  ...extra,
});

const NOV_FECHADO = mes(NOV_FECHADO_AB, { fechada_em: '2026-12-01T15:01:00Z' });
const semPre = pre === '0';

const FIM_PADRAO: Record<string, { serie: Serie; pos: number }> = {
  'fim-subiu': { serie: 'b', pos: 2 },
  'fim-caiu': { serie: 'a', pos: 9 },
  'fim-campeao': { serie: 'a', pos: 1 },
  'fim-unica': { serie: 'unica', pos: 3 },
};

/** A temporada fechada do cenário fim-*: pré-temporada só na série única (ou com ?pre=1); estreia tira a pré. */
function mesFechadoDoFim(): Temporada {
  const estreia = params.get('estreia') === '1';
  const unica = (serieDoParametro ?? FIM_PADRAO[cenario]?.serie) === 'unica';
  return mes(MES_FECHADO, {
    pre_temporada: estreia || pre === '0' ? false : pre === '1' || unica,
    fechada_em: new Date().toISOString(),
    campeao_estreia_id: estreia ? meuId : null,
  });
}

export function temporadasRecentes(): Promise<Temporada[]> {
  if (fim) return espera([mes(MES_ABERTO, { pre_temporada: false }), mesFechadoDoFim()]);
  switch (cenario) {
    case 'ab':
      return espera([mes(DEZ, { pre_temporada: !semPre }), NOV_FECHADO]);
    case 'fechada':
      return espera([mes(NOV, { pre_temporada: false, fechada_em: '2026-12-01T15:01:00Z', campeao_estreia_id: IDS[0] })]);
    default:
      return espera([mes(NOV, { pre_temporada: !semPre })]);
  }
}

/** Põe `id` na posição `p` (1 a n) da lista, sem repetir. */
function colocar(ids: readonly string[], id: string, p: number): string[] {
  const resto = ids.filter((x) => x !== id);
  resto.splice(Math.min(p, ids.length) - 1, 0, id);
  return resto;
}

/** As séries A e B (10 times cada) com o meu time em `serie`, na posição `p`; o clássico em 9º na A se pedido. */
function dividirEmAB(serie: 'a' | 'b', p: number, rivalNoNono: boolean): { a: string[]; b: string[] } {
  const a: (string | null)[] = Array(10).fill(null);
  const b: (string | null)[] = Array(10).fill(null);
  (serie === 'a' ? a : b)[p - 1] = meuId;
  if (rivalNoNono && rivalId && rivalId !== meuId && a[8] === null) a[8] = rivalId;
  const usados = new Set([...a, ...b].filter(Boolean));
  const resto = IDS.filter((id) => !usados.has(id));
  for (const lista of [a, b]) for (let i = 0; i < 10; i++) if (lista[i] === null) lista[i] = resto.shift()!;
  return { a: a as string[], b: b as string[] };
}

/** Pontos decrescentes e variados; as duas primeiras torcidas têm uma vitória de semana. */
function emSerie(ids: string[], serie: 'unica' | 'a' | 'b', semana: boolean, fecha: boolean): LinhaTemporada[] {
  return ids.map((id, i) => {
    const posicao = i + 1;
    const destino = fecha ? (serie === 'unica' ? (posicao <= 10 ? 'a' : 'b') : serie === 'a' ? (posicao <= 8 ? 'a' : 'b') : posicao <= 2 ? 'a' : 'b') : null;
    return {
      time_id: id,
      serie,
      posicao,
      pontos: semana ? Math.max(0, 50 - i * 3 - (i % 2)) : 0,
      vitorias: semana && i < 2 ? 1 : 0,
      ultima_posicao: semana ? ((i * 7) % ids.length) + 1 : null,
      posicao_final: fecha ? posicao : null,
      destino,
    };
  });
}

/** A tabela de dois mundos (A e B) com o meu time onde o cenário pede. */
function emAB(serie: 'a' | 'b', p: number, semana: boolean, fecha: boolean, rivalNoNono = false): LinhaTemporada[] {
  const { a, b } = dividirEmAB(serie, p, rivalNoNono);
  return [...emSerie(a, 'a', semana, fecha), ...emSerie(b, 'b', semana, fecha)];
}

/** A tabela de um mês para o cenário e os parâmetros de agora. */
function linhasDoMes(m: string): LinhaTemporada[] {
  if (fim) {
    if (m === MES_ABERTO) return emAB('a', 5, true, false);
    const padrao = FIM_PADRAO[cenario];
    const serie = serieDoParametro ?? padrao.serie;
    const p = pos ?? padrao.pos;
    if (serie === 'unica') return emSerie(colocar(IDS, meuId, p), 'unica', true, true);
    return emAB(serie, p, true, true, params.get('rival') === 'caiu');
  }
  const serie = serieDoParametro;
  if (cenario === 'ab' && m === DEZ) {
    if (serie === 'a' || serie === 'b') return emAB(serie, pos ?? 5, true, false);
    return [...emSerie(IDS.slice(0, 10), 'a', true, false), ...emSerie(IDS.slice(10), 'b', true, false)];
  }
  if (cenario === 'ab' || cenario === 'fechada') return emSerie(IDS, 'unica', true, true);
  return emSerie(pos ? colocar(IDS, meuId, pos) : IDS, 'unica', cenario !== 'vazia', false);
}

export function classificacaoDoMes(m: string): Promise<LinhaTemporada[]> {
  return espera(linhasDoMes(m));
}

export function semanasFechadasDoMes(m: string): Promise<number> {
  if (fim) return espera(m === MES_ABERTO ? 1 : 5);
  if (cenario === 'vazia') return espera(0);
  if (cenario === 'ab') return espera(m === DEZ ? 1 : 5);
  if (cenario === 'fechada') return espera(5);
  return espera(2);
}
