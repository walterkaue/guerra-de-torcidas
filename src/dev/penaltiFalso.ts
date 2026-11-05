// Só em desenvolvimento (npm run dev, com ?penaltiFalso na URL): imita nova-partida, lance-penalti e
// fechar-partida no próprio navegador, lance a lance, para conferir a tela sem banco nem login.
// ?caiNoLance=3 faz o 3º lance falhar (confere o aviso de conexão caída).
// &limite: depois do corte (?corte=depois), o servidor responde 429 limite_do_dia (a partida vira treino).
// &x1Expirado (com ?d=): o X1 responde 410 desafio_expirado (partida normal, com o aviso na abertura).
// Depois do corte o fechamento traz melhoresDoDia e restantesHoje, e a tabela é a de 09/11.
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { sementeNova } from '../jogo/aleatorio';
import { PONTOS, PONTOS_UNIFICADOS, simularPartida, sortearSementes, type Gestos, type SementesPorLance } from '../jogo/penaltis';
import { jogarLance, type Lance } from '../jogo/penaltisLance';
import { lancesUnificados } from '../telas/corte';
import { ErroServidor, type FechamentoDoServidor, type LanceDoServidor, type PartidaDoServidor } from '../servidor/api';

// ?latencia=800 imita o servidor real, que costuma demorar mais que o pé para chegar na bola.
const latencia = Number(new URLSearchParams(location.search).get('latencia')) || 180;
const espera = () => new Promise((ok) => setTimeout(ok, latencia));
const caiNoLance = Number(new URLSearchParams(location.search).get('caiNoLance')) || 0;
// ?d=abcdefgh&x1JaJogado: o X1 responde "desafio_ja_jogado" (confere a partida normal com o aviso na abertura).
const x1JaJogado = new URLSearchParams(location.search).has('x1JaJogado');
const x1Expirado = new URLSearchParams(location.search).has('x1Expirado');
const limite = new URLSearchParams(location.search).has('limite');
const tabela = () => (lancesUnificados() ? PONTOS_UNIFICADOS : PONTOS);

let estado: { semente: SementesPorLance; dificuldade: number; gestos: Gestos; lances: number } | null = null;

export async function novaPartida(codigo?: string): Promise<PartidaDoServidor> {
  await espera();
  if (codigo && x1JaJogado) throw new ErroServidor('desafio_ja_jogado');
  if (codigo && x1Expirado) throw new ErroServidor('desafio_expirado');
  if (limite && lancesUnificados()) throw new ErroServidor('limite_do_dia');
  estado = { semente: sortearSementes(sementeNova), dificuldade: 0.5, gestos: { cobrancas: [], defesas: [] }, lances: 0 };
  return {
    partidaId: 'falsa',
    lanceALance: true,
    proximo: { tipo: 'cobranca', i: 0 },
    dificuldade: 0.5,
    expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
    desafio: null,
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
  return {
    resultado,
    numeroNarrador: resultado.parOuImpar?.numeroNarrador ?? null,
    semana: '2026-10-26',
    contaNoRanking: true,
    sobSuspeita: false,
    ranking: { antes: null, depois: null },
    desempenho: null,
    desafio: { codigo: 'falso123' },
    comparacao: null,
    ...(lancesUnificados() ? { melhoresDoDia: [Math.max(resultado.pontos.total, 96), 72, 54], restantesHoje: 6 } : {}),
  };
}
