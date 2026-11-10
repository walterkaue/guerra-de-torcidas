// Só em desenvolvimento (npm run dev, com ?homeFalsa na URL): imita o servidor do Crava a Rodada no próprio
// navegador, para conferir a tela sem banco nem login. Nunca entra no build de produção (o import fica atrás
// de import.meta.env.DEV).
//   ?crava=aberta      (padrão) 5 jogos ainda abertos, 2 palpites e a certeza marcada
//   ?crava=encerrada   rodada com resultados confirmados, um jogo rolando e os palpites já pontuados
//   ?crava=vazia       sem jogos ("ainda não chegaram")
//   ?crava=erro        sem conexão (mostra "Tentar de novo")
// Fim do Brasileirão e jogos especiais (valem na Home e na aba Palpites, sempre com ?homeFalsa):
//   ?crava=confirmada            rodada toda confirmada, ainda na janela de 36 h: "33ª rodada · encerrada" (nunca "bola rolando")
//   ?crava=entressafra           38ª confirmada e nenhum especial marcado: bloco "Brasileirão encerrado" e "Volta em janeiro"
//   ?crava=entressafra-especial  igual, com a final da Copa do Brasil daqui a 9 dias (fora dos 7 dias): linha "Próximo: …"
//   ?crava=especial              final da Copa do Brasil aberta, daqui a ~50 h, com time de fora (a tela abre nela)
//   ?crava=especial-rolando      a mesma, com a bola rolando
//   &semPosicao                  (nos de entressafra) quem nunca palpitou no Brasileirão: sem posição e sem botão de card

import type { Placar } from '../jogo/crava';
import { ID_OUTRO, TIMES } from '../dados/times';
import type { Resultado } from '../jogo/tabela';
import type { ComoCravaram, Jogo, LinhaRankingCrava, MeusDados, MinhaPosicao, Rodada } from '../servidor/crava';

const params = new URLSearchParams(location.search);
const cenario = params.get('crava') ?? 'aberta';
const espera = <T>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 120));
const falha = () => new Promise<never>((_, no) => setTimeout(() => no(new Error('rede')), 120));
const h = (horas: number) => new Date(Date.now() + horas * 3600_000).toISOString();

const PARES: [string, string][] = [
  ['flamengo', 'palmeiras'],
  ['corinthians', 'santos'],
  ['bahia', 'vasco'],
  ['gremio', 'cruzeiro'],
  ['fluminense', 'botafogo'],
];

const jogoBase = { mandante_fora: null, visitante_fora: null, competicao: null, fase: null };

function jogo(i: number, horas: number, gols: [number, number] | null, extra: Partial<Jogo> = {}): Jogo {
  return {
    ...jogoBase,
    id: `j${i}`,
    rodada: 33,
    mandante_id: PARES[i][0],
    visitante_id: PARES[i][1],
    inicio: h(horas),
    status_api: gols ? 'FINISHED' : 'TIMED',
    gols_api_mandante: gols?.[0] ?? null,
    gols_api_visitante: gols?.[1] ?? null,
    gols_mandante: gols?.[0] ?? null,
    gols_visitante: gols?.[1] ?? null,
    confirmado_em: gols ? h(horas + 2) : null,
    corrigido_em: null,
    anulado: false,
    ...extra,
  };
}

/** 38ª rodada toda confirmada há 4 dias, mais a 37ª (para ter mais de uma rodada palpitada). */
function fimDoBrasileirao(): Jogo[] {
  const rodada = (n: number, dias: number, gols: [number, number][]) =>
    gols.map((g, i) => jogo(i, -24 * dias, g, { id: `r${n}-${i}`, rodada: n }));
  return [
    ...rodada(37, 11, [[1, 0], [2, 2], [0, 1]]),
    ...rodada(38, 4, [[2, 1], [0, 0], [1, 3], [2, 2], [3, 1]]),
  ];
}

/** O jogo especial: final da Copa do Brasil, o Flamengo contra um time de fora. */
const especial = (horas: number): Jogo => ({
  ...jogoBase,
  id: 'esp',
  rodada: 1001,
  mandante_id: 'flamengo',
  visitante_id: null,
  visitante_fora: 'Estrela do Norte',
  competicao: 'Copa do Brasil',
  fase: 'Final',
  inicio: h(horas),
  status_api: 'TIMED',
  gols_api_mandante: null,
  gols_api_visitante: null,
  gols_mandante: null,
  gols_visitante: null,
  confirmado_em: null,
  corrigido_em: null,
  anulado: false,
});

const noFim = ['entressafra', 'entressafra-especial', 'especial', 'especial-rolando'].includes(cenario);

export async function jogosDoCrava(): Promise<Jogo[]> {
  if (cenario === 'erro') return falha();
  if (cenario === 'vazia') return espera([]);
  if (cenario === 'confirmada') {
    return espera([
      ...[0, 1, 2, 3].map((i) => jogo(i, -20 + i, [i, 1])),
      jogo(4, -18, [2, 0]),
      jogo(0, 24 * 6, null, { id: 'p0', rodada: 34 }),
    ]);
  }
  if (cenario === 'entressafra') return espera(fimDoBrasileirao());
  if (cenario === 'entressafra-especial') return espera([...fimDoBrasileirao(), especial(24 * 9)]);
  if (cenario === 'especial') return espera([...fimDoBrasileirao(), especial(50)]);
  if (cenario === 'especial-rolando') return espera([...fimDoBrasileirao(), especial(-1)]);
  if (cenario === 'encerrada') {
    return espera([
      jogo(0, -75, [2, 1]),
      jogo(1, -74, [0, 0]),
      jogo(2, -50, [1, 3]),
      jogo(3, -49, [2, 2]),
      jogo(4, -1, null),
    ]);
  }
  return espera([jogo(0, 30, null), jogo(1, 31, null), jogo(2, 32, null), jogo(3, 54, null), jogo(4, 55, null)]);
}

export const rodadasDoCrava = (): Promise<Rodada[]> =>
  espera(
    noFim
      ? [
          { numero: 37, trava_certeza: h(-24 * 11), especial: false },
          { numero: 38, trava_certeza: h(-24 * 4), especial: false },
          ...(cenario === 'entressafra' ? [] : [{ numero: 1001, trava_certeza: null, especial: true }]),
        ]
      : [
          { numero: 33, trava_certeza: h(cenario === 'encerrada' ? -76 : 29), especial: false },
          ...(cenario === 'confirmada' ? [{ numero: 34, trava_certeza: h(24 * 6), especial: false }] : []),
        ],
  );

export function meusDadosDoCrava(): Promise<MeusDados> {
  if (noFim) {
    const palpites = new Map<string, Placar>([
      ['r37-0', { m: 1, v: 0 }],
      ['r37-1', { m: 1, v: 1 }],
      ['r38-0', { m: 2, v: 1 }],
      ['r38-1', { m: 1, v: 0 }],
      ['r38-2', { m: 0, v: 2 }],
      ['r38-3', { m: 2, v: 2 }],
    ]);
    const pontos = new Map([['r37-0', 20], ['r37-1', 14], ['r38-0', 40], ['r38-2', 14], ['r38-3', 20]]);
    return espera({ palpites, certezas: new Map([[38, 'r38-0']]), pontos });
  }
  if (cenario === 'confirmada') {
    return espera({ palpites: new Map([['j0', { m: 0, v: 1 }]]), certezas: new Map(), pontos: new Map([['j0', 10]]) });
  }
  if (cenario === 'encerrada') {
    const palpites = new Map<string, Placar>([
      ['j0', { m: 2, v: 1 }],
      ['j1', { m: 1, v: 0 }],
      ['j2', { m: 0, v: 2 }],
      ['j3', { m: 2, v: 2 }],
    ]);
    return espera({ palpites, certezas: new Map([[33, 'j0']]), pontos: new Map([['j0', 40], ['j1', 0], ['j2', 14], ['j3', 20]]) });
  }
  if (cenario === 'aberta') {
    return espera({ palpites: new Map([['j0', { m: 2, v: 1 }]]), certezas: new Map([[33, 'j0']]), pontos: new Map() });
  }
  return espera({ palpites: new Map(), certezas: new Map(), pontos: new Map() });
}

export const cravar = (_jogoId: string, _placar: Placar): Promise<void> => espera(undefined);
export const marcarCerteza = (_rodada: number, _jogoId: string | null): Promise<void> => espera(undefined);
export const sincronizarTorcedor = (): Promise<void> => espera(undefined);

export const comoCravaram = (_rodada: number): Promise<ComoCravaram[]> =>
  espera([
    { jogo_id: 'j0', total: 84, pct_mandante: 50, pct_empate: 20, pct_visitante: 30 },
    { jogo_id: 'j1', total: 95, pct_mandante: 46, pct_empate: 21, pct_visitante: 33 },
    { jogo_id: 'j2', total: null, pct_mandante: null, pct_empate: null, pct_visitante: null },
    { jogo_id: 'j3', total: 117, pct_mandante: 38, pct_empate: 23, pct_visitante: 39 },
    { jogo_id: 'j4', total: 128, pct_mandante: 34, pct_empate: 24, pct_visitante: 42 },
    { jogo_id: 'esp', total: 61, pct_mandante: 58, pct_empate: 17, pct_visitante: 25 },
  ]);

export function rankingCrava(rodada: number | null): Promise<LinhaRankingCrava[]> {
  if (params.has('rankingErro')) return falha();
  const times = OFICIAIS_DA_TABELA;
  return espera(
    times.map((t, i) => ({ time_id: t, palpiteiros: 21 + ((i * 5) % 17), media30: (rodada === null ? 190 : 28) - i * (rodada === null ? 6 : 1), posicao: i + 1 })),
  );
}

export const minhaPosicaoCrava = (rodada: number | null): Promise<MinhaPosicao | null> =>
  espera(cenario === 'aberta' || params.has('semPosicao') ? null : rodada === null ? { posicao: 12, total: 412, pontos: 74 } : { posicao: 37, total: 412, pontos: 74 });

const OFICIAIS_DA_TABELA = TIMES.filter((t) => t.id !== ID_OUTRO).map((t) => t.id);

/** 10 rodadas de resultados sem graça, só para a aba Tabela e os indicadores dos cartões. */
export function resultadosDaTemporada(): Promise<Resultado[]> {
  const ids = OFICIAIS_DA_TABELA;
  const lista: Resultado[] = [];
  for (let r = 1; r <= 10; r++) {
    for (let k = 0; k < ids.length / 2; k++) {
      const a = (k + r * 3) % ids.length;
      const b = (ids.length - 1 - k + r * 5) % ids.length;
      if (a === b) continue;
      lista.push({
        rodada: r,
        mandante_id: ids[a],
        visitante_id: ids[b],
        inicio: h(-24 * (40 - r * 3)),
        gols_mandante: (a + r * 2 + k) % 4,
        gols_visitante: (b + r + k) % 3,
      });
    }
  }
  return espera(lista);
}
