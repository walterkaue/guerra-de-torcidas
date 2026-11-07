// Só em desenvolvimento (npm run dev, com ?penaltiFalso na URL): imita nova-partida, lance-penalti e
// fechar-partida no próprio navegador, lance a lance, para conferir a tela sem banco nem login.
// ?caiNoLance=3 faz o 3º lance falhar (confere o aviso de conexão caída).
// &limite: depois do corte (?corte=depois), o servidor responde 429 limite_do_dia (a partida vira treino).
// &x1Expirado (com ?d=): o X1 responde 410 desafio_expirado (partida normal, com o aviso na abertura).
// ?d=abcdefgh&disputa=<id da disputa> mostra o X1 recebido com a disputa de quem chamou (sem &disputa, a primeira do
// catálogo; &x1Livre imita o X1 sem disputa, de antes do corte). Dá para entrar pelo convite da Home (?penaltiFalso&d=...).
// A disputa que a partida joga ganha medalhas de mentira: 8 gols e 2 vitórias, perto do bronze (10 gols); minhasMedalhas()
// devolve o que a partida somou, então a linha "+N rumo ao bronze" e o selo aparecem de verdade no resultado.
// Depois do corte o fechamento traz melhoresDoDia e restantesHoje, e a tabela é a de 08/11.
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { sementeNova } from '../jogo/aleatorio';
import { bonecoFalsoDeQuemChamou, timeFalsoDeQuemChamou } from './bonecoDeCampoFalso'; // o boneco falso em campo (&boneco=, &semBoneco, &emCampo=0, &chamouBoneco=, &chamouSemBoneco)
import { PONTOS, PONTOS_UNIFICADOS, simularPartida, sortearSementes, type Gestos, type SementesPorLance } from '../jogo/penaltis';
import { jogarLance, type Lance } from '../jogo/penaltisLance';
import { DISPUTAS } from '../dados/disputas';
import { golsDaDisputa } from '../jogo/lancesTextos';
import { itemPenaltis, medalhaDaDisputa } from '../jogo/regraLances';
import { lancesUnificados } from '../telas/corte';
import { ErroServidor, type FechamentoDoServidor, type LanceDoServidor, type MedalhaDoLance, type PartidaDoServidor, type ResumoDesafio } from '../servidor/api';

// ?latencia=800 imita o servidor real, que costuma demorar mais que o pé para chegar na bola.
const latencia = Number(new URLSearchParams(location.search).get('latencia')) || 180;
const espera = () => new Promise((ok) => setTimeout(ok, latencia));
const caiNoLance = Number(new URLSearchParams(location.search).get('caiNoLance')) || 0;
// ?d=abcdefgh&x1JaJogado: o X1 responde "desafio_ja_jogado" (confere a partida normal com o aviso na abertura).
const x1JaJogado = new URLSearchParams(location.search).has('x1JaJogado');
const x1Expirado = new URLSearchParams(location.search).has('x1Expirado');
const limite = new URLSearchParams(location.search).has('limite');
const x1Livre = new URLSearchParams(location.search).has('x1Livre');
/** A disputa do X1 falso: a do ?disputa=, senão a primeira do catálogo (null no X1 livre). */
const disputaDoX1 = (): string | null => (x1Livre ? null : (new URLSearchParams(location.search).get('disputa') ?? DISPUTAS[0]?.id ?? null));
const tabela = () => (lancesUnificados() ? PONTOS_UNIFICADOS : PONTOS);

let estado: { semente: SementesPorLance; dificuldade: number; gestos: Gestos; lances: number; disputa: string | null; x1: boolean } | null = null;
const medalhas = new Map<string, { gols: number; vitorias: number }>();

/** O convite do X1 como `ver_desafio` o devolve, com a disputa de quem chamou. */
export async function verDesafio(id: string): Promise<ResumoDesafio | null> {
  await espera();
  return { id, time_id: timeFalsoDeQuemChamou('palmeiras'), apelido: 'Camisa10', gols_jogador: 3, gols_maquina: 2, pontos: 96, disputa_id: disputaDoX1(), boneco: bonecoFalsoDeQuemChamou() };
}

export async function minhasMedalhas(): Promise<MedalhaDoLance[]> {
  await espera();
  return [...medalhas].map(([lance_id, n]) => ({ lance_id, gols: n.gols, recriados: 0, vitorias: n.vitorias, medalha: medalhaDaDisputa(n.gols, n.vitorias) }));
}

export async function novaPartida(codigo?: string, disputa?: string): Promise<PartidaDoServidor> {
  await espera();
  if (codigo && x1JaJogado) throw new ErroServidor('desafio_ja_jogado');
  if (codigo && x1Expirado) throw new ErroServidor('desafio_expirado');
  if (limite && lancesUnificados()) throw new ErroServidor('limite_do_dia');
  const daPartida = codigo ? disputaDoX1() : (disputa ?? null);
  estado = { semente: sortearSementes(sementeNova), dificuldade: 0.5, gestos: { cobrancas: [], defesas: [] }, lances: 0, disputa: daPartida, x1: !!codigo };
  if (daPartida && !medalhas.has(itemPenaltis(daPartida))) medalhas.set(itemPenaltis(daPartida), { gols: 8, vitorias: 2 });
  return {
    partidaId: 'falsa',
    lanceALance: true,
    proximo: { tipo: 'cobranca', i: 0 },
    dificuldade: 0.5,
    expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
    desafio: codigo ? { id: codigo, timeId: timeFalsoDeQuemChamou('palmeiras'), apelido: 'Camisa10', golsJogador: 3, golsMaquina: 2, pontos: 96, disputaId: disputaDoX1() } : null,
    ...(lancesUnificados() ? { restantesHoje: 7 } : {}),
  };
}

export async function lancePenalti(_id: string, lance: Lance): Promise<LanceDoServidor> {
  await espera();
  const e = estado!;
  if (++e.lances === caiNoLance) throw new ErroServidor('tempo_esgotado');
  const j = jogarLance(e.semente, e.gestos, lance, e.dificuldade, undefined, tabela());
  e.gestos = j.gestos;
  return { cobranca: j.cobranca ?? null, defesa: j.defesa ?? null, proximo: j.proximo };
}

export async function fecharPartida(_id: string, gestos: Gestos): Promise<FechamentoDoServidor> {
  await espera();
  const e = estado!;
  const resultado = simularPartida(e.semente, { ...e.gestos, ...(gestos.parOuImpar ? { parOuImpar: gestos.parOuImpar } : {}) }, e.dificuldade, 3, undefined, tabela());
  if (e.disputa) {
    const antes = medalhas.get(itemPenaltis(e.disputa)) ?? { gols: 0, vitorias: 0 };
    medalhas.set(itemPenaltis(e.disputa), { gols: antes.gols + golsDaDisputa(resultado.cobrancas), vitorias: antes.vitorias + (resultado.venceu ? 1 : 0) });
  }
  return {
    resultado,
    numeroNarrador: resultado.parOuImpar?.numeroNarrador ?? null,
    semana: '2026-10-26',
    contaNoRanking: true,
    sobSuspeita: false,
    ranking: { antes: null, depois: null },
    desempenho: null,
    desafio: { codigo: 'falso123' },
    comparacao: e.x1 ? { desafiante: 'Camisa10', pontosDesafiante: 96, golsJogadorDesafiante: 3, golsMaquinaDesafiante: 2, venceu: resultado.pontos.total > 96 } : null,
    ...(lancesUnificados() ? { melhoresDoDia: [Math.max(resultado.pontos.total, 96), 72, 54], restantesHoje: 6 } : {}),
  };
}
