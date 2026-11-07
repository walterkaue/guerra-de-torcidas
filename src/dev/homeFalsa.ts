// Só em desenvolvimento (npm run dev, com ?homeFalsa na URL): imita o servidor da Home e do Perfil no próprio
// navegador, para conferir as telas sem banco nem login. Nunca entra no build de produção (import atrás de
// import.meta.env.DEV).
// ?cenario= escolhe o "Jogar agora": crava (rodada fecha em 5 h sem palpite), dia (ainda não jogou, é o padrão),
// chutes (2 chutes usados), lances (Time do Dia feito), prova (nada mais conta hoje) ou cravado (tudo feito).
// Com ?corte=depois: meusLancesHoje falso (4 de 10; prova e cravado esgotam as 10; ?semMelhores zera o dia) e ?l=codigo (X1 dos Lances).

import { ID_OUTRO, TIMES } from '../dados/times';
import { bonecoFalsoDeQuemChamou, timeFalsoDeQuemChamou } from './bonecoDeCampoFalso'; // o boneco falso em campo (&boneco=, &semBoneco, &emCampo=0, &chamouBoneco=, &chamouSemBoneco)
import { NOMES_PISTAS, type Pistas, type Tentativa, type Tom } from '../jogo/timeDoDia';
import type { Carreira } from '../jogo/carreira';
import type { PosicaoSemana } from '../jogo/posicao';
import { ErroServidor, type LancesHoje, type LinhaRanking, type MinigameDoRecorde, type RespostaDoDia, type ResumoDesafioLances } from '../servidor/api';
import type { Jogo, MeusDados, MinhaPosicao } from '../servidor/crava';
import { estadoFalso } from '../telas/vestiario/fonteFalsa';

const params = new URLSearchParams(location.search);
const cenario = params.get('cenario') ?? 'dia';
const espera = <T>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 120));

export function rankingDaSemana(): Promise<LinhaRanking[]> {
  // ?semRanking: semana sem ninguém jogando. ?rankingErro: sem conexão. ?rankingDemora: fica carregando.
  if (params.has('rankingErro')) return new Promise((_, falha) => setTimeout(() => falha(new Error('rede')), 120));
  if (params.has('rankingDemora')) return new Promise(() => {});
  const times = TIMES.filter((t) => t.id !== ID_OUTRO);
  const vazio = params.has('semRanking');
  const linhas = times.map((t, i) => ({
    time_id: t.id,
    ativos: vazio ? 0 : 10 + ((i * 7) % 5),
    // A soma não segue a média (é vitrine), mas a posição dela sempre segue a soma, como no servidor.
    soma: vazio ? 0 : 600 + ((i * 7919) % 1200),
    media30: vazio ? 0 : 240 - i * 12 - (i % 3),
    posicao_campeao: i + 1,
    posicao_soma: 0,
  }));
  [...linhas].sort((a, b) => b.soma - a.soma).forEach((l, i) => (l.posicao_soma = i + 1));
  return espera(linhas);
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
  espera(params.has('semRanking') ? { penaltis: null, prova: null, dia: null, crava: null, lances: null } : { penaltis: 85, prova: 58, dia: 70, crava: 44, lances: 62 });

// Com &nivel= (o mesmo do boneco falso), o XP acompanha o nível; sem ele, 770 (Reserva).
export const minhaCarreira = (): Promise<Carreira> =>
  espera({ xp: params.has('nivel') ? estadoFalso(params).xp : 770, partidasHoje: 3, bonus: null });

export const minhaPosicaoMinigame = (minigame: 'penaltis' | 'prova' | 'dia' | 'lances'): Promise<PosicaoSemana | null> =>
  espera({ penaltis: { posicao: 2, total: 9, pontos: 85 }, prova: { posicao: null, total: 6, pontos: 0 }, dia: { posicao: 1, total: 5, pontos: 70 }, lances: { posicao: 4, total: 9, pontos: 62 } }[minigame]);

export const minhaPosicaoCrava = (): Promise<MinhaPosicao | null> => espera({ posicao: 37, total: 412, pontos: 44 });

// Regra de 09/11/2026 (use ?corte=depois): as partidas valendo de hoje dos Lances. ?cenario=prova ou cravado esgota as 10.
// ?semMelhores mostra o dia sem nenhuma partida ainda.
export const meusLancesHoje = (): Promise<LancesHoje | null> => {
  if (params.has('semMelhores')) return espera({ feitas: 0, limite: 10, melhor: null, melhores: [] });
  const esgotado = cenario === 'prova' || cenario === 'cravado';
  return espera({ feitas: esgotado ? 10 : 4, limite: 10, melhor: 96, melhores: [96, 72, 54] });
};

// ?l=qualquercodigo: o X1 dos Lances de mentira (o lance é o primeiro do catálogo). ?l=naoexiste não acha nada.
export async function verDesafioLances(id: string): Promise<ResumoDesafioLances | null> {
  if (id === 'naoexiste') return espera(null);
  const { LANCES } = await import('../dados/lances');
  return espera({ id, time_id: timeFalsoDeQuemChamou('flamengo'), apelido: 'Zé da Geral', lance_id: LANCES[0].id, pontos: 96, gols: 3, recriados: 1, faixa: 'dificil', boneco: bonecoFalsoDeQuemChamou() });
}

/** "Meu boneco em campo" do Perfil. &emCampoFalha faz o servidor recusar (confere a volta do interruptor e o aviso). */
export async function salvarEmCampo(ligado: boolean): Promise<{ emCampo: boolean }> {
  await new Promise((ok) => setTimeout(ok, 300));
  if (params.has('emCampoFalha')) throw new ErroServidor('limite');
  return { emCampo: ligado };
}
